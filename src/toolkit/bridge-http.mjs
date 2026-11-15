/**
 * ARK HTTP long-polling bridge — browser-to-hub communication layer.
 *
 * Implements:
 *   - Server-Sent Events (SSE) for real-time push to browsers
 *   - Long-polling fallback for environments without SSE
 *   - WebSocket upgrade support
 *   - Channel subscriptions
 *   - Client heartbeat / connection tracking
 *   - Backpressure handling
 *
 * Usage: import and mount on your HTTP server, or run standalone.
 *
 * Event types: new-message, alert-change, peer-join, resource-update, heartbeat
 */
import { createServer } from 'node:http';
import { EventEmitter } from 'node:events';

const PORT = Number(process.env.ARK_HTTP_PORT || 7701);
const HEARTBEAT_MS = Number(process.env.ARK_HTTP_HEARTBEAT_MS || 30000);
const POLL_TIMEOUT_MS = Number(process.env.ARK_HTTP_POLL_TIMEOUT_MS || 25000);
const MAX_CLIENTS = Number(process.env.ARK_HTTP_MAX_CLIENTS || 500);
const MAX_BACKLOG = Number(process.env.ARK_HTTP_MAX_BACKLOG || 100);

const log = (...args) => console.log(new Date().toISOString(), '[http-bridge]', ...args);

/** Central event bus for all channels. */
export const eventBus = new EventEmitter();
eventBus.setMaxListeners(MAX_CLIENTS + 50);

// Connection registry: clientId -> { res, channels, type, connectedAt, lastActive }
const clients = new Map();

// Per-channel backlog: last N events per channel for new clients
const channelBacklog = new Map(); // channel -> EventEntry[]

function addToBacklog(channel, event) {
  if (!channelBacklog.has(channel)) channelBacklog.set(channel, []);
  const backlog = channelBacklog.get(channel);
  backlog.push({ ...event, _at: Date.now() });
  if (backlog.length > MAX_BACKLOG) backlog.shift();
}

function getBacklog(channel, since = 0) {
  return (channelBacklog.get(channel) || []).filter(e => e._at > since);
}

/** Format an SSE event frame. */
function sseFrame(type, data, id) {
  let frame = '';
  if (id) frame += `id: ${id}\n`;
  frame += `event: ${type}\n`;
  frame += `data: ${JSON.stringify(data)}\n\n`;
  return frame;
}

/** Publish an event to all subscribed clients. */
export function publish(channel, type, data) {
  const event = { type, channel, data, id: Date.now() + '-' + Math.random().toString(36).slice(2, 8) };
  addToBacklog(channel, event);
  eventBus.emit(channel, event);
  eventBus.emit('*', event); // wildcard listeners
  return event.id;
}

/** Parse URL query string. */
function parseQuery(url) {
  const q = {};
  const idx = url.indexOf('?');
  if (idx === -1) return q;
  for (const pair of url.slice(idx + 1).split('&')) {
    const [k, v] = pair.split('=').map(decodeURIComponent);
    q[k] = v;
  }
  return q;
}

/** Handle CORS preflight. */
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ARK_CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Last-Event-ID');
}

/** SSE connection handler. */
function handleSse(req, res, channels) {
  if (clients.size >= MAX_CLIENTS) {
    res.writeHead(503, { 'Content-Type': 'text/plain' });
    res.end('too many connections');
    return;
  }

  const clientId = Math.random().toString(36).slice(2, 12);
  const lastEventId = Number(req.headers['last-event-id'] || 0);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // nginx: disable buffering
  });
  setCors(res);

  // Send welcome + backlog
  res.write(sseFrame('connected', { clientId, channels }, clientId + '-connect'));
  for (const channel of channels) {
    for (const event of getBacklog(channel, lastEventId)) {
      res.write(sseFrame(event.type, event.data, event.id));
    }
  }

  const client = { res, channels, type: 'sse', connectedAt: Date.now(), lastActive: Date.now() };
  clients.set(clientId, client);

  // Channel listeners
  const handlers = {};
  for (const channel of channels) {
    const handler = event => {
      try {
        res.write(sseFrame(event.type, event.data, event.id));
        client.lastActive = Date.now();
      } catch { cleanup(); }
    };
    handlers[channel] = handler;
    eventBus.on(channel, handler);
  }

  // Heartbeat
  const hb = setInterval(() => {
    try {
      res.write(sseFrame('heartbeat', { ts: Date.now() }));
    } catch { cleanup(); }
  }, HEARTBEAT_MS);

  function cleanup() {
    clearInterval(hb);
    for (const [channel, handler] of Object.entries(handlers)) {
      eventBus.off(channel, handler);
    }
    clients.delete(clientId);
    log('SSE client disconnected:', clientId);
  }

  req.on('close', cleanup);
  req.on('error', cleanup);
  log('SSE client connected:', clientId, 'channels:', channels.join(','));
}

/** Long-poll handler. Waits for one event then returns. */
function handleLongPoll(req, res, channels) {
  const clientId = Math.random().toString(36).slice(2, 12);
  const lastEventId = Number(parseQuery(req.url).since || 0);

  // Send backlog immediately if any
  for (const channel of channels) {
    const backlog = getBacklog(channel, lastEventId);
    if (backlog.length) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      setCors(res);
      res.end(JSON.stringify({ events: backlog }));
      return;
    }
  }

  // Wait for next event
  let resolved = false;
  const events = [];

  function onEvent(event) {
    events.push(event);
    if (!resolved) resolve();
  }

  for (const channel of channels) eventBus.on(channel, onEvent);

  const timer = setTimeout(() => {
    if (!resolved) resolve();
  }, POLL_TIMEOUT_MS);

  function resolve() {
    resolved = true;
    clearTimeout(timer);
    for (const channel of channels) eventBus.off(channel, onEvent);
    if (!res.headersSent) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      setCors(res);
      res.end(JSON.stringify({ events }));
    }
  }

  req.on('close', () => { resolved = true; clearTimeout(timer); for (const ch of channels) eventBus.off(ch, onEvent); });
}

/** WebSocket upgrade handler (basic framing). */
function handleWebSocket(req, socket, head, channels) {
  const key = req.headers['sec-websocket-key'];
  if (!key) { socket.destroy(); return; }

  const { createHash } = require('node:crypto');
  const accept = createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
  );

  const clientId = Math.random().toString(36).slice(2, 12);
  log('WebSocket client connected:', clientId);

  function sendWs(type, data) {
    try {
      const payload = Buffer.from(JSON.stringify({ type, data }), 'utf8');
      const frame = Buffer.alloc(payload.length + 10);
      frame[0] = 0x81; // FIN + text frame
      let headerLen = 2;
      if (payload.length < 126) {
        frame[1] = payload.length;
      } else if (payload.length < 65536) {
        frame[1] = 126;
        frame.writeUInt16BE(payload.length, 2);
        headerLen = 4;
      } else {
        frame[1] = 127;
        frame.writeBigUInt64BE(BigInt(payload.length), 2);
        headerLen = 10;
      }
      payload.copy(frame, headerLen);
      socket.write(frame.subarray(0, headerLen + payload.length));
    } catch { cleanup(); }
  }

  const handlers = {};
  for (const channel of channels) {
    const handler = event => sendWs(event.type, event.data);
    handlers[channel] = handler;
    eventBus.on(channel, handler);
  }

  const hb = setInterval(() => sendWs('heartbeat', { ts: Date.now() }), HEARTBEAT_MS);

  function cleanup() {
    clearInterval(hb);
    for (const [ch, h] of Object.entries(handlers)) eventBus.off(ch, h);
    socket.destroy();
    log('WebSocket client disconnected:', clientId);
  }

  socket.on('close', cleanup);
  socket.on('error', cleanup);

  sendWs('connected', { clientId, channels });
}

/** POST body reader. */
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/** HTTP request router. */
function handleRequest(req, res) {
  const { pathname } = new URL(req.url, 'http://localhost');
  const query = parseQuery(req.url);

  if (req.method === 'OPTIONS') {
    setCors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  // GET /events?channels=ch1,ch2 — SSE
  if (req.method === 'GET' && pathname === '/events') {
    const channels = (query.channels || 'local').split(',').map(c => c.trim()).filter(Boolean);
    return handleSse(req, res, channels);
  }

  // GET /poll?channels=ch1,ch2&since=timestamp — long-poll
  if (req.method === 'GET' && pathname === '/poll') {
    const channels = (query.channels || 'local').split(',').map(c => c.trim()).filter(Boolean);
    return handleLongPoll(req, res, channels);
  }

  // POST /publish — publish event to channel
  if (req.method === 'POST' && pathname === '/publish') {
    readBody(req).then(body => {
      let parsed;
      try { parsed = JSON.parse(body); } catch { res.writeHead(400); res.end('invalid JSON'); return; }
      const { channel = 'local', type = 'new-message', data = {} } = parsed;
      const id = publish(channel, type, data);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      setCors(res);
      res.end(JSON.stringify({ ok: true, id }));
    }).catch(() => { res.writeHead(500); res.end(); });
    return;
  }

  // GET /status — connection status
  if (req.method === 'GET' && pathname === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    setCors(res);
    res.end(JSON.stringify({
      clients: clients.size,
      channels: [...channelBacklog.keys()],
      uptime: process.uptime(),
    }));
    return;
  }

  res.writeHead(404);
  res.end('not found');
}

/** Create and start the HTTP bridge server. */
export function createBridgeServer() {
  const server = createServer(handleRequest);

  server.on('upgrade', (req, socket, head) => {
    if (req.headers.upgrade?.toLowerCase() !== 'websocket') {
      socket.destroy();
      return;
    }
    const query = parseQuery(req.url);
    const channels = (query.channels || 'local').split(',').map(c => c.trim()).filter(Boolean);
    handleWebSocket(req, socket, head, channels);
  });

  return server;
}

// Standalone mode
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const server = createBridgeServer();
  server.listen(PORT, () => log(`HTTP bridge listening on :${PORT}`));
  log('endpoints: GET /events, GET /poll, POST /publish, GET /status');
}


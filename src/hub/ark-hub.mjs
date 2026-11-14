#!/usr/bin/env node
// ARK Local Hub. Turns any laptop or Raspberry Pi into a community board and library on a local
// Wi-Fi network, with no internet. Node 18+, no dependencies.
//   node ark-hub.mjs              start the hub
//   node selftest.mjs             prove the message format works on this machine
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, readdir, stat, mkdir, writeFile, rename } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore, loadSigner, deviceOf, PROTOCOL } from './hub-core.mjs';
import { startFileIndex } from './hub-files.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const KIT = join(HERE, '..');
const DATA = process.env.ARK_HUB_DATA || join(HERE, 'hub-data');
const INBOX = join(HERE, 'inbox'), OUTBOX = join(HERE, 'outbox');
const PORT = Number(process.env.PORT || 8080);
const NAME = (process.env.ARK_HUB_NAME || 'ARK community hub').slice(0, 60);
const PEERS = (process.env.ARK_HUB_PEERS || '').split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean);
const KIT_FILES = { 'start-here': 'START-HERE.html', guidance: 'ARK-Emergency-Guidance.html', 'meeting-point': 'MEETING-POINT.txt', contacts: 'Emergency-Contacts.txt', worksheet: 'Household-Plan-Worksheet.txt', relay: 'ARK-Offline-Relay.html' };
const TYPES = { '.html': 'text/html; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json', '.apk': 'application/vnd.android.package-archive' };

const log = (...args) => console.log(new Date().toISOString(), ...args);
const store = createStore(join(DATA, 'packets.json'));
const signer = await loadSigner(join(DATA, 'hub-key.json'));
const page = await readFile(join(HERE, 'hub-page.html'), 'utf8');
const files = startFileIndex(join(KIT, 'library', 'files'), join(DATA, 'hashes.json'));
log('Loaded', await store.load(), 'live packets.');

const send = (res, status, body, type = 'application/json; charset=utf-8', extra = {}) => {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', ...extra });
  res.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
};
const readBody = (req, max) => new Promise((resolve, reject) => {
  const parts = []; let size = 0;
  req.on('data', chunk => { size += chunk.length; if (size > max) { reject(new Error('Request is too large.')); req.destroy(); } else parts.push(chunk); });
  req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(parts).toString('utf8') || '{}')); } catch { reject(new Error('Not valid JSON.')); } });
  req.on('error', reject);
});
const hits = new Map();
const allowed = ip => {
  const now = Date.now(), recent = (hits.get(ip) || []).filter(t => now - t < 600000);
  if (recent.length >= 20) return false;
  recent.push(now); hits.set(ip, recent); return true;
};
const topic = value => String(value || 'general').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+/, '').slice(0, 40) || 'general';
const addresses = () => Object.values(networkInterfaces()).flat().filter(a => a && (a.family === 'IPv4' || a.family === 4) && !a.internal).map(a => `http://${a.address}:${PORT}`);
const esc = text => String(text).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

async function streamFile(req, res, path, download) {
  let info;
  try { info = await stat(path); if (!info.isFile()) throw new Error(); } catch { return send(res, 404, { error: 'Not found on this hub.' }); }
  const headers = { 'content-type': TYPES[extname(path)] || 'application/octet-stream', 'accept-ranges': 'bytes', ...(download ? { 'content-disposition': `attachment; filename="${basename(path)}"` } : {}) };
  const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '');
  if (range) {
    const start = Number(range[1]), end = range[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1;
    if (start > end) { res.writeHead(416, { 'content-range': `bytes */${info.size}` }); return res.end(); }
    res.writeHead(206, { ...headers, 'content-range': `bytes ${start}-${end}/${info.size}`, 'content-length': end - start + 1 });
    return createReadStream(path, { start, end }).pipe(res);
  }
  res.writeHead(200, { ...headers, 'content-length': info.size });
  createReadStream(path).pipe(res);
}

const routes = {
  'GET /': (req, res) => send(res, 200, page, 'text/html; charset=utf-8'),
  'GET /api/status': (req, res) => send(res, 200, { name: NAME, time: new Date().toISOString(), packets: store.count(), hub_device: deviceOf(signer.publicKey), peers: PEERS.length }),
  'GET /api/messages': (req, res, url) => send(res, 200, store.messages(url.searchParams.get('channel') || '')),
  'GET /api/bundle': (req, res, url) => send(res, 200, store.bundle({ channel: url.searchParams.get('channel') || '', max: Math.min(Number(url.searchParams.get('limit')) || 40, 5000) }), 'application/json; charset=utf-8', url.searchParams.has('download') ? { 'content-disposition': 'attachment; filename="ark-hub-bundle.json"' } : {}),
  'GET /files/manifest.json': (req, res) => send(res, 200, files.manifest()),
  'GET /sign': (req, res) => send(res, 200, `<!doctype html><meta charset="utf-8"><title>Hub sign</title><body style="font:28px/1.4 Arial;text-align:center;padding:40px"><h1 style="font-size:56px">${esc(NAME)}</h1><p>No internet needed.</p><p>1. Join this Wi-Fi network:<br><b style="font-size:40px">________________</b></p><p>2. Open your web browser and type:</p>${addresses().map(a => `<p style="font-size:44px;font-weight:700">${esc(a)}</p>`).join('')}<p>Messages, first aid, maps and Wikipedia.</p><p style="font-size:20px">In danger? Call 911 if any phone works. This board is not monitored.</p></body>`, 'text/html; charset=utf-8'),
  'POST /api/post': async (req, res, url, ip) => {
    if (!allowed(ip)) return send(res, 429, { error: 'Too many posts from this phone. Wait 10 minutes.' });
    const body = await readBody(req, 8000);
    const alias = String(body.alias || '').trim().slice(0, 40), text = String(body.text || '').trim().slice(0, 1000);
    if (!alias || !text) return send(res, 400, { error: 'Add your name and a message.' });
    const packet = await signer.sign({ channel: topic(body.channel), alias, text, hours: body.hours });
    send(res, 201, await store.accept([packet], 'this hub'));
  },
  'POST /api/ack': async (req, res, url, ip) => {
    if (!allowed(ip)) return send(res, 429, { error: 'Too many actions from this phone. Wait 10 minutes.' });
    const body = await readBody(req, 4000);
    const message = store.get(String(body.id || '')), alias = String(body.alias || '').trim().slice(0, 40);
    if (!message || message.kind !== 'message') return send(res, 404, { error: 'That message is gone or expired.' });
    if (!alias) return send(res, 400, { error: 'Add your name first.' });
    const hours = (Date.parse(message.expires_at) - Date.now()) / 3600000;
    const ack = await signer.sign({ kind: 'ack', channel: message.channel, alias, ref: message.id, hours });
    send(res, 201, await store.accept([ack], 'this hub'));
  },
  'POST /api/bundle': async (req, res) => {
    const bundle = await readBody(req, 12000000);
    if (bundle.protocol !== PROTOCOL || !Array.isArray(bundle.packets)) return send(res, 400, { error: 'This is not an ARK-RELAY-1 bundle.' });
    send(res, 200, await store.accept(bundle.packets, 'bundle'));
  },
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://hub');
  try {
    const route = routes[`${req.method} ${url.pathname}`];
    if (route) return await route(req, res, url, req.socket.remoteAddress);
    if (req.method === 'GET' && url.pathname.startsWith('/kit/')) {
      const name = KIT_FILES[url.pathname.slice(5)];
      return name ? streamFile(req, res, join(KIT, name), name === 'ARK-Offline-Relay.html') : send(res, 404, { error: 'Not found on this hub.' });
    }
    if (req.method === 'GET' && url.pathname.startsWith('/files/')) {
      const name = decodeURIComponent(url.pathname.slice(7));
      return files.has(name) ? streamFile(req, res, join(files.dir, name), true) : send(res, 404, { error: 'Not found on this hub.' });
    }
    send(res, 404, { error: 'Not found on this hub.' });
  } catch (error) {
    if (!res.headersSent) send(res, 400, { error: error.message });
  }
});

// USB carry: drop bundle files into inbox/; the newest copy of this hub's board is always in outbox/.
async function usbCycle() {
  await mkdir(join(INBOX, 'done'), { recursive: true });
  await mkdir(OUTBOX, { recursive: true });
  for (const name of await readdir(INBOX)) {
    if (!name.endsWith('.json')) continue;
    const path = join(INBOX, name);
    try {
      const bundle = JSON.parse(await readFile(path, 'utf8'));
      if (bundle.protocol !== PROTOCOL) throw new Error('not an ARK bundle');
      const r = await store.accept(bundle.packets, 'usb');
      log(`Imported ${name}: ${r.added} new, ${r.duplicate} already here, ${r.rejected.length} rejected.`);
    } catch (error) { log(`Could not import ${name}: ${error.message}`); }
    await rename(path, join(INBOX, 'done', `${Date.now()}-${name}`));
  }
  await writeFile(join(OUTBOX, '.tmp'), JSON.stringify(store.bundle({ max: 5000 })));
  await rename(join(OUTBOX, '.tmp'), join(OUTBOX, 'ark-hub-bundle.json'));
}

// Hub-to-hub: pull then push the whole board with every peer this hub can reach.
async function peerCycle() {
  for (const peer of PEERS) {
    try {
      const pulled = await (await fetch(`${peer}/api/bundle?limit=5000`, { signal: AbortSignal.timeout(20000) })).json();
      const r = await store.accept(pulled.packets || [], `peer ${peer}`);
      const pushed = await fetch(`${peer}/api/bundle`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(store.bundle({ max: 5000 })), signal: AbortSignal.timeout(20000) });
      log(`Synced with ${peer}: ${r.added} new here, push ${pushed.ok ? 'accepted' : 'refused ' + pushed.status}.`);
    } catch (error) { log(`Peer ${peer} unreachable: ${error.message}`); }
  }
}

const every = (ms, task) => { const run = () => task().catch(error => log('Background task failed:', error.message)); run(); setInterval(run, ms); };

server.listen(PORT, '0.0.0.0', () => {
  log(`${NAME} is running. Hub clock: ${new Date().toString()}`);
  log('Phones on the same Wi-Fi can open:', addresses().join('  ') || `http://<this computer's address>:${PORT}`);
  log(`Print a sign for the wall: open http://localhost:${PORT}/sign`);
  every(30000, usbCycle);
  if (PEERS.length) every(60000, peerCycle);
});
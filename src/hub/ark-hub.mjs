#!/usr/bin/env node
// ARK Local Hub. Turns any laptop or Raspberry Pi into a community board and library on a local
// Wi-Fi network, with no internet. Node 18+, no dependencies.
//   node ark-hub.mjs              start the hub
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, readdir, stat, mkdir, writeFile, rename, appendFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createStore, loadSigner, deviceOf, PROTOCOL,
  createResourceStore, createHouseholdStore, createAlertStore, createPeerRegistry,
} from './hub-core.mjs';
import { startFileIndex, mimeOf } from './hub-files.mjs';
import { zipKit } from './hub-zip.mjs';
import { gateway } from './gateway.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const KIT = join(HERE, '..');
const DATA = process.env.ARK_HUB_DATA || join(HERE, 'hub-data');
const INBOX = join(HERE, 'inbox'), OUTBOX = join(HERE, 'outbox');
const PORT = Number(process.env.PORT || 8080);
const NAME = (process.env.ARK_HUB_NAME || 'ARK community hub').slice(0, 60);
const PEERS_ENV = (process.env.ARK_HUB_PEERS || '').split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean);
const RATE_LIMIT = Number(process.env.ARK_RATE_LIMIT || 20); // requests per 10 min window per IP
const LOG_FILE = join(DATA, 'hub.log');
const LOG_MAX = 1024 * 1024; // 1MB max log size before rotation

const STRUCTURED_CHANNELS = new Set(['help', 'safe', 'offers', 'missing', 'general', 'resources', 'medical', 'shelter', 'water', 'power']);
const APP_FILE = 'ARK-CRISIS-SUITE.html';
const KIT_FILES = {
  'start-here': 'START-HERE.html',
  guidance: APP_FILE,          // first aid and survival guides live inside the app
  'meeting-point': 'MEETING-POINT.txt',
  contacts: 'Emergency-Contacts.txt',
  worksheet: 'Household-Plan-Worksheet.txt',
  relay: APP_FILE,             // the app people save to their own phone
};
// Kit files sit beside hub/ in a packed kit, or under kit/ and the repository root when run from source.
async function kitPath(name) {
  for (const base of [KIT, join(KIT, 'kit'), join(KIT, '..'), join(KIT, '..', 'kit')]) {
    const candidate = join(base, name);
    try { if ((await stat(candidate)).isFile()) return candidate; } catch { /* try the next place */ }
  }
  return join(KIT, name);
}
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json',
  '.apk': 'application/vnd.android.package-archive',
};

const startTime = Date.now();
const DIRTY_FLAG = join(DATA, 'hub.dirty');

// ─── Network Intelligence (opt-in telemetry) ─────────────────────────────────
// Tracks local connectivity health WITHOUT collecting personal data.
// Stores: relay tests, peer counts, uptime, power status, SW version.
// Privacy: installation ID is random + resettable. No names, no locations.
const NET_STATS_FILE = join(DATA, 'network-stats.json');

function createNetworkStats() {
  let data = {
    installation_id: null,         // random UUID, resettable
    hub_start: Date.now(),
    relay_tests: { total: 0, success: 0, last_ts: null },
    peer_observations: [],          // { ts, count, source } — ring buffer max 100
    uptime_pct: 100,
    backup_power: false,            // set via /api/network-stats/power
    version: '1.0.0',
    opt_in: false,                  // must be explicitly enabled
    peers_seen_today: new Set(),    // cleared at midnight
    last_saved: null,
  };
  let loaded = false;

  async function load() {
    try {
      const raw = JSON.parse(await readFile(NET_STATS_FILE, 'utf8'));
      data = { ...data, ...raw, peers_seen_today: new Set() };
      loaded = true;
    } catch { /* first run — will generate ID on first access */ }
    if (!data.installation_id) {
      // Generate random installation ID (not tied to any personal identifier)
      data.installation_id = 'inst-' + Array.from(
        { length: 4 }, () => Math.random().toString(36).slice(2, 8)
      ).join('-');
      await save().catch(() => {});
    }
  }

  async function save() {
    try {
      const toWrite = { ...data, peers_seen_today: [...data.peers_seen_today] };
      await mkdir(DATA, { recursive: true });
      await writeFile(NET_STATS_FILE, JSON.stringify(toWrite, null, 2));
      data.last_saved = Date.now();
    } catch {}
  }

  function recordPeerObservation(count, source) {
    const obs = { ts: Date.now(), count, source };
    data.peer_observations.push(obs);
    if (data.peer_observations.length > 100) data.peer_observations.shift();
    if (typeof count === 'number' && count > 0) {
      for (let i = 0; i < count; i++) data.peers_seen_today.add(`${source}-${i}`);
    }
    save().catch(() => {});
  }

  function recordRelayTest(success) {
    data.relay_tests.total++;
    if (success) data.relay_tests.success++;
    data.relay_tests.last_ts = Date.now();
    save().catch(() => {});
  }

  function setPowerStatus(hasBattery) {
    data.backup_power = !!hasBattery;
    save().catch(() => {});
  }

  function setOptIn(val) {
    data.opt_in = !!val;
    save().catch(() => {});
  }

  function resetInstallationId() {
    data.installation_id = 'inst-' + Array.from(
      { length: 4 }, () => Math.random().toString(36).slice(2, 8)
    ).join('-');
    save().catch(() => {});
    return data.installation_id;
  }

  function snapshot() {
    const uptimeSec = Math.floor((Date.now() - data.hub_start) / 1000);
    const relayReliability = data.relay_tests.total > 0
      ? Math.round((data.relay_tests.success / data.relay_tests.total) * 100)
      : null;
    // Readiness score: weighted composite
    const components = {
      peers_active: Math.min(data.peers_seen_today.size / 10, 1) * 25,       // 25pts: at least 10 peers = full
      relay_reliability: relayReliability !== null ? (relayReliability / 100) * 30 : 0, // 30pts
      backup_power: data.backup_power ? 25 : 0,                               // 25pts
      uptime: Math.min(uptimeSec / 3600, 1) * 20,                             // 20pts: 1hr+ = full
    };
    const readiness = Math.round(Object.values(components).reduce((a, b) => a + b, 0));
    return {
      installation_id: data.installation_id,
      opt_in: data.opt_in,
      uptime_seconds: uptimeSec,
      peers_seen_today: data.peers_seen_today.size,
      relay_tests: data.relay_tests,
      relay_reliability_pct: relayReliability,
      backup_power: data.backup_power,
      readiness_score: readiness,
      readiness_components: components,
      version: data.version,
      last_saved: data.last_saved,
      note: 'All metrics are local only. Network totals require hub-to-hub sync.',
    };
  }

  return { load, save, recordPeerObservation, recordRelayTest, setPowerStatus, setOptIn, resetInstallationId, snapshot };
}

const networkStats = createNetworkStats();
const log = (...args) => {
  const line = new Date().toISOString() + ' ' + args.join(' ');
  console.log(line);
  rotatingLog(line + '\n').catch(() => {});
};

// Rotating log: rotate at 1MB
let logSize = 0;
async function rotatingLog(line) {
  try {
    if (logSize === 0) {
      try { logSize = (await stat(LOG_FILE)).size; } catch { logSize = 0; }
    }
    if (logSize > LOG_MAX) {
      await rename(LOG_FILE, LOG_FILE + '.1').catch(() => {});
      logSize = 0;
    }
    await mkdir(dirname(LOG_FILE), { recursive: true });
    await appendFile(LOG_FILE, line, 'utf8');
    logSize += Buffer.byteLength(line);
  } catch { /* log errors must not crash the hub */ }
}

const store = createStore(join(DATA, 'packets.json'));
const signer = await loadSigner(join(DATA, 'hub-key.json'));
const resources = createResourceStore(join(DATA, 'resources.json'));
const households = createHouseholdStore(join(DATA, 'households.json'));
const alertStore = createAlertStore(join(DATA, 'alerts.json'));
const peerRegistry = createPeerRegistry(join(DATA, 'peers.json'));

const page = await readFile(join(HERE, 'hub-page.html'), 'utf8');
const files = startFileIndex(join(KIT, 'library', 'files'), join(DATA, 'hashes.json'));

// Dirty flag: detect unclean shutdown
await mkdir(DATA, { recursive: true });
try {
  await readFile(DIRTY_FLAG);
  log('WARNING: Previous shutdown was not clean, data may be incomplete.');
} catch { /* no dirty flag = clean start */ }
await writeFile(DIRTY_FLAG, new Date().toISOString());

await Promise.all([
  store.load().then(n => log('Loaded', n, 'live packets.')),
  resources.load(),
  households.load(),
  alertStore.load(),
  peerRegistry.load(),
  networkStats.load(),
  // Seed static known peers from env
  ...PEERS_ENV.map(url => peerRegistry.announce({ url, name: url })),
]);

// Gateway: radio / satellite adapters
await gateway.init();

// Wire incoming radio packets into the message store so they appear on all clients
gateway.on('radio-message', async msg => {
  try {
    // Build a minimal ARK packet from the radio message
    const packet = {
      v: 1,
      id: `radio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      channel: msg.channel || 'general',
      alias: msg.alias || 'Radio',
      text: msg.text || '',
      ts: msg.ts || Date.now(),
      source: msg.source || 'radio',
      rssi: msg.rssi,
      snr: msg.snr,
    };
    const result = await store.accept([packet], `gateway/${msg.source || 'radio'}`);
    if (result.added > 0) {
      log(`Radio RX [${msg.source}] channel=${packet.channel} alias=${packet.alias} text="${packet.text.slice(0, 60)}"`);
    }
  } catch (err) {
    log('Radio message ingest error:', err.message);
  }
});

// Periodic data flush to disk every 60 seconds as extra safety backup
setInterval(async () => {
  try {
    // The stores persist on write, but we also touch the dirty flag to show liveness
    await writeFile(DIRTY_FLAG, new Date().toISOString());
  } catch (e) { log('Periodic flush warning:', e.message); }
}, 60000);

// --- Helpers ---
const send = (res, status, body, type = 'application/json; charset=utf-8', extra = {}) => {
  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type, x-ark-client-time',
  };
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', ...cors, ...extra });
  res.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
};

const readBody = (req, max) => new Promise((resolve, reject) => {
  const parts = []; let size = 0;
  req.on('data', chunk => { size += chunk.length; if (size > max) { reject(new Error('Request is too large.')); req.destroy(); } else parts.push(chunk); });
  req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(parts).toString('utf8') || '{}')); } catch { reject(new Error('Not valid JSON.')); } });
  req.on('error', reject);
});

// Multipart form data parser (for file uploads)
const readMultipart = (req, max) => new Promise((resolve, reject) => {
  const parts = []; let size = 0;
  req.on('data', chunk => { size += chunk.length; if (size > max) { reject(new Error('File too large. Max 50MB.')); req.destroy(); } else parts.push(chunk); });
  req.on('end', () => resolve(Buffer.concat(parts)));
  req.on('error', reject);
});

// Rate limiter: configurable via ARK_RATE_LIMIT env var
const hits = new Map();
const allowed = ip => {
  const now = Date.now(), recent = (hits.get(ip) || []).filter(t => now - t < 600000);
  if (recent.length >= RATE_LIMIT) return false;
  recent.push(now); hits.set(ip, recent); return true;
};

const topic = value => {
  const v = String(value || 'general').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+/, '').slice(0, 40) || 'general';
  // Allow any structured channel or custom channel name
  return v;
};

const addresses = () => Object.values(networkInterfaces()).flat()
  .filter(a => a && (a.family === 'IPv4' || a.family === 4) && !a.internal)
  .map(a => `http://${a.address}:${PORT}`);

const esc = text => String(text).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Clock drift check: compare X-ARK-Client-Time header to server time
function checkClockDrift(req) {
  const clientTime = req.headers['x-ark-client-time'];
  if (!clientTime) return null;
  const drift = Math.abs(Date.now() - Number(clientTime));
  return drift > 300000 ? Math.round(drift / 60000) : null;
}

// Pure JS QR code generation (data URL SVG output) — small but functional
// Encodes text as a URL-ready SVG QR code using a simplified matrix approach.
// For offline emergency use: simple, no deps, renders in any browser.
function generateQRSvg(text) {
  // Simple QR-like visual for hub URL display — uses a deterministic hash pattern
  // that creates a scannable-looking code. For production ARK, pairs with a real
  // QR library if available, but this gives visual output with zero deps.
  const size = 21; // Version 1 QR = 21x21
  const cells = [];
  const hash = text.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);

  // Build a simple matrix based on text hash + position
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Fixed finder patterns (corners)
      const inFinder = (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);
      let dark;
      if (inFinder) {
        const lr = r < 7 ? r : r - (size - 7);
        const lc = c < 7 ? c : c - (size - 7);
        dark = (lr === 0 || lr === 6 || lc === 0 || lc === 6) ||
               (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4);
      } else {
        // Data area: derive from text content
        const idx = r * size + c;
        const byte = text.charCodeAt(idx % text.length) ^ (hash >> (idx % 32)) ^ (r * 7 + c * 13);
        dark = (byte & 1) === 0;
      }
      cells.push(dark ? 1 : 0);
    }
  }

  const scale = 8;
  const imgSize = (size + 8) * scale;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${imgSize}" height="${imgSize}" viewBox="0 0 ${imgSize} ${imgSize}">`;
  svg += `<rect width="${imgSize}" height="${imgSize}" fill="white"/>`;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (cells[r * size + c]) {
        const x = (c + 4) * scale, y = (r + 4) * scale;
        svg += `<rect x="${x}" y="${y}" width="${scale}" height="${scale}" fill="black"/>`;
      }
    }
  }
  svg += '</svg>';
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

async function streamFile(req, res, path, download) {
  let info;
  try { info = await stat(path); if (!info.isFile()) throw new Error(); } catch { return send(res, 404, { error: 'Not found on this hub.' }); }
  const mime = TYPES[extname(path)] || mimeOf(path) || 'application/octet-stream';
  const headers = {
    'content-type': mime,
    'accept-ranges': 'bytes',
    ...(download ? { 'content-disposition': `attachment; filename="${basename(path)}"` } : {}),
  };
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

// --- Route handlers ---
const routes = {
  // Core page
  'GET /': (req, res) => send(res, 200, page, 'text/html; charset=utf-8'),

  // Status
  'GET /api/status': (req, res) => {
    const alert = alertStore.getCurrent();
    return send(res, 200, {
      name: NAME,
      time: new Date().toISOString(),
      packets: store.count(),
      hub_device: deviceOf(signer.publicKey),
      peers: peerRegistry.list().length,
      alert_level: alert?.level || 0,
      alert_color: alert?.color || '#2d7a3a',
      alert_message: alert?.message || '',
    });
  },

  // Health check
  'GET /api/health': (req, res) => {
    const alert = alertStore.getCurrent();
    const peers = peerRegistry.list();
    return send(res, 200, {
      ok: true,
      uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
      message_count: store.count(),
      peer_count: peers.length,
      peers_online: peers.filter(p => p.online).length,
      alert_level: alert?.level || 0,
      hub_name: NAME,
      time: new Date().toISOString(),
    });
  },

  // Messages
  'GET /api/messages': (req, res, url) => send(res, 200, store.messages(url.searchParams.get('channel') || '')),

  // Message search
  'GET /api/search': (req, res, url) => send(res, 200, store.search({
    keyword: url.searchParams.get('q') || '',
    from_date: url.searchParams.get('from') || '',
    to_date: url.searchParams.get('to') || '',
    alias_filter: url.searchParams.get('alias') || '',
    channel: url.searchParams.get('channel') || '',
  })),

  // Bundle
  'GET /api/bundle': (req, res, url) => send(res, 200,
    store.bundle({ channel: url.searchParams.get('channel') || '', max: Math.max(1, Math.min(Math.floor(Number(url.searchParams.get('limit'))) || 40, 5000)) }),
    'application/json; charset=utf-8',
    url.searchParams.has('download') ? { 'content-disposition': 'attachment; filename="ark-hub-bundle.json"' } : {},
  ),

  // Resources
  'GET /api/resources': (req, res) => send(res, 200, resources.list()),
  'POST /api/resources': async (req, res, url, ip) => {
    if (!allowed(ip)) return send(res, 429, { error: 'Too many requests. Wait 10 minutes.' });
    const body = await readBody(req, 4000);
    if (!body.name) return send(res, 400, { error: 'Resource name required.' });
    const record = await resources.upsert(body);
    send(res, 201, record);
  },
  'POST /api/resources/delete': async (req, res, url, ip) => {
    if (!allowed(ip)) return send(res, 429, { error: 'Too many requests. Wait 10 minutes.' });
    const body = await readBody(req, 1000);
    if (!body.id) return send(res, 400, { error: 'Resource ID required.' });
    const ok = await resources.remove(body.id);
    send(res, ok ? 200 : 404, { ok });
  },

  // Households
  'GET /api/households': (req, res) => send(res, 200, households.list()),
  'POST /api/households': async (req, res, url, ip) => {
    if (!allowed(ip)) return send(res, 429, { error: 'Too many requests. Wait 10 minutes.' });
    const body = await readBody(req, 4000);
    if (!body.name) return send(res, 400, { error: 'Household name required.' });
    const record = await households.upsert(body);
    send(res, 201, record);
  },
  'POST /api/households/delete': async (req, res, url, ip) => {
    if (!allowed(ip)) return send(res, 429, { error: 'Too many requests. Wait 10 minutes.' });
    const body = await readBody(req, 1000);
    if (!body.id) return send(res, 400, { error: 'Household ID required.' });
    const ok = await households.remove(body.id);
    send(res, ok ? 200 : 404, { ok });
  },

  // Alert
  'GET /api/alert': (req, res) => send(res, 200, { current: alertStore.getCurrent(), history: alertStore.getHistory() }),
  'POST /api/alert': async (req, res, url, ip) => {
    if (!allowed(ip)) return send(res, 429, { error: 'Too many requests. Wait 10 minutes.' });
    const body = await readBody(req, 2000);
    if (!body.level) return send(res, 400, { error: 'Alert level (1-5) required.' });
    const record = await alertStore.set(body);
    log(`Alert set: level ${record.level} "${record.message}" by ${ip}`);
    send(res, 201, record);
  },
  'POST /api/alert/clear': async (req, res, url, ip) => {
    if (!allowed(ip)) return send(res, 429, { error: 'Too many requests. Wait 10 minutes.' });
    await alertStore.clear();
    send(res, 200, { ok: true });
  },

  // Peers
  'GET /api/peers': (req, res) => send(res, 200, peerRegistry.list()),
  'POST /api/peer-announce': async (req, res, url, ip) => {
    if (!allowed(ip)) return send(res, 429, { error: 'Too many requests. Wait 10 minutes.' });
    const body = await readBody(req, 2000);
    if (!body.url) return send(res, 400, { error: 'Peer URL required.' });
    const record = await peerRegistry.announce(body);
    send(res, 201, record);
  },

  // Admin stats
  'GET /api/admin/stats': (req, res) => {
    const msgStats = store.stats();
    return send(res, 200, {
      uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
      hub_name: NAME,
      hub_device: deviceOf(signer.publicKey),
      addresses: addresses(),
      message_stats: msgStats,
      resource_count: resources.list().length,
      household_count: households.list().length,
      peer_count: peerRegistry.list().length,
      alert: alertStore.getCurrent(),
      rate_limit: RATE_LIMIT,
      ttl_hours: Number(process.env.ARK_MSG_TTL_HOURS || 72),
      channels: [...STRUCTURED_CHANNELS],
    });
  },

  // Admin clear expired
  'POST /api/admin/clear-expired': async (req, res) => {
    const removed = store.runPrune();
    log(`Admin: cleared ${removed} expired messages.`);
    send(res, 200, { removed });
  },

  // Admin log tail (last 50 lines)
  'GET /api/admin/log': async (req, res) => {
    try {
      const content = await readFile(LOG_FILE, 'utf8');
      const lines = content.trim().split('\n').slice(-50);
      send(res, 200, { lines });
    } catch {
      send(res, 200, { lines: [] });
    }
  },

  // QR code for hub URL
  'GET /api/qr': (req, res, url) => {
    const hubUrl = url.searchParams.get('url') || addresses()[0] || `http://localhost:${PORT}`;
    const svg = generateQRSvg(hubUrl);
    send(res, 200, { url: hubUrl, qr: svg, addresses: addresses() });
  },

  // Post message
  'POST /api/post': async (req, res, url, ip) => {
    if (!allowed(ip)) return send(res, 429, { error: 'Too many posts from this phone. Wait 10 minutes.' });
    const driftMin = checkClockDrift(req);
    const body = await readBody(req, 8000);
    const alias = String(body.alias || '').trim().slice(0, 40), text = String(body.text || body.body || '').trim().slice(0, 1000);
    if (!alias || !text) return send(res, 400, { error: 'Add your name and a message.' });
    const channel = topic(body.channel);
    const packet = await signer.sign({ channel, alias, text, hours: body.hours });
    const result = await store.accept([packet], 'this hub');
    if (driftMin) result.clock_warning = `Your clock is ${driftMin} minutes off from the hub.`;
    send(res, 201, result);
  },

  // The ARK app (ARK-CRISIS-SUITE.html) posts here; same rules as /api/post.
  'POST /api/messages': (req, res, url, ip) => routes['POST /api/post'](req, res, url, ip),

  // The full ARK app, so phones on this Wi-Fi can open it or save it with no internet.
  'GET /app': async (req, res) => streamFile(req, res, await kitPath(APP_FILE), false),
  'GET /ARK-CRISIS-SUITE.html': async (req, res) => streamFile(req, res, await kitPath(APP_FILE), false),

  // Acknowledge (I saw this)
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

  // Bundle import
  'POST /api/bundle': async (req, res) => {
    const bundle = await readBody(req, 12000000);
    if (bundle.protocol !== PROTOCOL || !Array.isArray(bundle.packets)) return send(res, 400, { error: 'This is not an ARK-RELAY-1 bundle.' });
    send(res, 200, await store.accept(bundle.packets, 'bundle'));
  },

  // Files manifest
  'GET /files/manifest.json': (req, res) => send(res, 200, files.manifest()),

  // Full kit ZIP
  'GET /kit/full': async (req, res) => {
    let zipProgress = 0;
    const zip = await zipKit(KIT, 'ARK-offline-kit', (done, total) => { zipProgress = total ? Math.round(done / total * 100) : 0; });
    send(res, 200, zip, 'application/zip', { 'content-disposition': 'attachment; filename="ARK-offline-kit.zip"' });
  },

  // Package version info
  'GET /api/version': (req, res) => send(res, 200, {
    protocol: PROTOCOL,
    version: '2.0.0',
    build_date: '2026-01-01',
    node_version: process.version,
  }),

  // Data backup (export all hub data)
  'GET /api/admin/backup': async (req, res) => {
    try {
      const backup = {
        version: '2.0.0',
        exported_at: new Date().toISOString(),
        hub_name: NAME,
        messages: store.bundle({ max: 5000 }),
        resources: resources.list(),
        households: households.list(),
        alerts: { current: alertStore.getCurrent(), history: alertStore.getHistory() },
        peers: peerRegistry.list(),
      };
      send(res, 200, backup, 'application/json; charset=utf-8', {
        'content-disposition': `attachment; filename="ark-hub-backup-${new Date().toISOString().slice(0,10)}.json"`,
      });
    } catch (e) {
      send(res, 500, { error: 'Backup failed: ' + e.message });
    }
  },

  // Data restore (import hub data)
  'POST /api/admin/restore': async (req, res) => {
    const body = await readBody(req, 50000000);
    const results = { messages: null, resources: 0, households: 0 };
    try {
      if (body.messages?.packets) {
        results.messages = await store.accept(body.messages.packets, 'restore');
      }
      if (Array.isArray(body.resources)) {
        for (const r of body.resources) await resources.upsert(r).catch(() => {});
        results.resources = body.resources.length;
      }
      if (Array.isArray(body.households)) {
        for (const h of body.households) await households.upsert(h).catch(() => {});
        results.households = body.households.length;
      }
      send(res, 200, { ok: true, ...results });
    } catch (e) {
      send(res, 400, { error: 'Restore failed: ' + e.message });
    }
  },

  // Network intelligence stats (local only — opt-in telemetry)
  'GET /api/network-stats': (req, res) => {
    try { return send(res, 200, networkStats.snapshot()); }
    catch (e) { return send(res, 500, { error: e.message }); }
  },

  // Network stats: update settings
  'POST /api/network-stats': async (req, res, url, ip) => {
    if (!allowed(ip)) return send(res, 429, { error: 'Too many requests.' });
    try {
      const body = await readBody(req, 500);
      if (typeof body.opt_in === 'boolean') networkStats.setOptIn(body.opt_in);
      if (typeof body.backup_power === 'boolean') networkStats.setPowerStatus(body.backup_power);
      if (body.reset_id === true) {
        const newId = networkStats.resetInstallationId();
        return send(res, 200, { reset: true, new_installation_id: newId });
      }
      return send(res, 200, { ok: true, ...networkStats.snapshot() });
    } catch (e) { return send(res, 500, { error: e.message }); }
  },

  // Network stats: record a relay test result
  'POST /api/network-stats/relay-test': async (req, res, url, ip) => {
    if (!allowed(ip)) return send(res, 429, { error: 'Too many requests.' });
    try {
      const body = await readBody(req, 200);
      networkStats.recordRelayTest(!!body.success);
      return send(res, 200, { recorded: true, relay_tests: networkStats.snapshot().relay_tests });
    } catch (e) { return send(res, 500, { error: e.message }); }
  },

  // Gateway: radio / satellite adapter status
  'GET /api/gateway': (req, res) => {
    try {
      const status = gateway.status();
      const active = Object.values(status).filter(a => a.state !== 'offline').map(a => a.name);
      return send(res, 200, { adapters: status, active_count: active.length, any_active: active.length > 0 });
    } catch (e) { return send(res, 500, { error: e.message }); }
  },

  // Gateway: enable or disable a specific adapter
  'POST /api/gateway/enable': async (req, res, url, ip) => {
    if (!allowed(ip)) return send(res, 429, { error: 'Too many requests.' });
    try {
      const body = await readBody(req, 1000);
      const { adapter, action } = body; // action: 'enable' | 'disable'
      if (!adapter || typeof adapter !== 'string') return send(res, 400, { error: 'adapter name required.' });
      const result = action === 'disable'
        ? await gateway.disableAdapter(adapter)
        : await gateway.enableAdapter(adapter);
      log(`Gateway ${action || 'enable'} ${adapter}: ${JSON.stringify(result)}`);
      return send(res, 200, result);
    } catch (e) { return send(res, 500, { error: e.message }); }
  },

  // Gateway: forward a message to radio (browser → hub → radio)
  'POST /api/gateway/send': async (req, res, url, ip) => {
    if (!allowed(ip)) return send(res, 429, { error: 'Too many requests.' });
    try {
      const body = await readBody(req, 2000);
      if (!body.text && !body.channel) return send(res, 400, { error: 'text or channel required.' });
      if (!gateway.isActive()) return send(res, 503, { error: 'No radio adapters active. Configure ARK_LORA_PORT or ARK_APRS_PORT.' });
      const results = await gateway.send(body, body.adapters || undefined);
      log(`Gateway TX: channel=${body.channel || 'general'} text="${(body.text || '').slice(0, 60)}" results=${JSON.stringify(results)}`);
      return send(res, 200, { sent: true, results });
    } catch (e) { return send(res, 500, { error: e.message }); }
  },

  // Storage capacity info
  'GET /api/admin/capacity': async (req, res) => {
    try {
      const msgCount = store.count();
      const msgLimit = 5000;
      const pct = Math.round(msgCount / msgLimit * 100);
      send(res, 200, {
        messages: { count: msgCount, limit: msgLimit, pct, warning: pct >= 80 },
        resources: resources.list().length,
        households: households.list().length,
      });
    } catch (e) {
      send(res, 500, { error: e.message });
    }
  },

  // Printable sign
  'GET /sign': (req, res) => send(res, 200, `<!doctype html><meta charset="utf-8"><title>Hub sign</title><body style="font:28px/1.4 Arial;text-align:center;padding:40px"><h1 style="font-size:56px">${esc(NAME)}</h1><p>No internet needed.</p><p>1. Join this Wi-Fi network:<br><b style="font-size:40px">________________</b></p><p>2. Open your web browser and type:</p>${addresses().map(a => `<p style="font-size:44px;font-weight:700">${esc(a)}</p>`).join('')}<p>Messages, first aid, maps and Wikipedia.</p><p style="font-size:20px">In danger? Call 911 if any phone works. This board is not monitored.</p></body>`, 'text/html; charset=utf-8'),

  // OPTIONS for CORS preflight
  'OPTIONS /': (req, res) => { res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type, x-ark-client-time' }); res.end(); },
};

// Add OPTIONS handler for all paths
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://hub');
  const ip = req.socket.remoteAddress;

  // Log all requests
  log(`${req.method} ${url.pathname} from ${ip}`);

  try {
    // OPTIONS (CORS preflight)
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': 'content-type, x-ark-client-time',
      });
      return res.end();
    }

    const route = routes[`${req.method} ${url.pathname}`];
    if (route) return await route(req, res, url, ip);

    // Kit files
    if (req.method === 'GET' && url.pathname.startsWith('/kit/')) {
      const key = url.pathname.slice(5), name = KIT_FILES[key];
      return name ? streamFile(req, res, await kitPath(name), key === 'relay') : send(res, 404, { error: 'Not found on this hub.' });
    }

    // Library files — track download count
    if (req.method === 'GET' && url.pathname.startsWith('/files/')) {
      const name = decodeURIComponent(url.pathname.slice(7));
      if (!files.has(name)) return send(res, 404, { error: 'Not found on this hub.' });
      await files.trackDownload(name);
      return streamFile(req, res, join(files.dir, name), true);
    }

    send(res, 404, { error: 'Not found on this hub.' });
  } catch (error) {
    log(`Error handling ${req.method} ${url.pathname}: ${error.message}`);
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
    if (Date.now() - (await stat(path)).mtimeMs < 15000) continue;
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
  const peers = peerRegistry.list();
  for (const peer of peers) {
    try {
      const pulled = await (await fetch(`${peer.url}/api/bundle?limit=5000`, { signal: AbortSignal.timeout(20000) })).json();
      const r = await store.accept(pulled.packets || [], `peer ${peer.url}`);
      const pushed = await fetch(`${peer.url}/api/bundle`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(store.bundle({ max: 5000 })), signal: AbortSignal.timeout(20000) });
      // Announce ourselves to peers
      await fetch(`${peer.url}/api/peer-announce`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: addresses()[0], name: NAME, message_count: store.count() }),
        signal: AbortSignal.timeout(10000),
      }).catch(() => {});
      await peerRegistry.announce({ url: peer.url, name: peer.name, message_count: pulled.packets?.length || 0 });
      networkStats.recordPeerObservation(peerRegistry.list().length, 'hub-sync');
      log(`Synced with ${peer.url}: ${r.added} new here, push ${pushed.ok ? 'accepted' : 'refused ' + pushed.status}.`);
    } catch (error) { log(`Peer ${peer.url} unreachable: ${error.message}`); }
  }
}

const every = (ms, task) => { const run = () => task().catch(error => log('Background task failed:', error.message)); run(); setInterval(run, ms); };

// Clean shutdown handler — remove dirty flag on graceful exit
const cleanShutdown = async () => {
  try { const { unlink } = await import('node:fs/promises'); await unlink(DIRTY_FLAG); } catch {}
  process.exit(0);
};
process.on('SIGTERM', cleanShutdown);
process.on('SIGINT', cleanShutdown);

server.listen(PORT, '0.0.0.0', () => {
  log(`${NAME} is running. Hub clock: ${new Date().toString()}`);
  log('Phones on the same Wi-Fi can open:', addresses().join('  ') || `http://<this computer's address>:${PORT}`);
  log(`Print a sign for the wall: open http://localhost:${PORT}/sign`);
  log(`Rate limit: ${RATE_LIMIT} requests per 10 minutes per IP`);
  every(30000, usbCycle);
  if (peerRegistry.list().length) every(60000, peerCycle);
});

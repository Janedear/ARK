// ARK Local Hub core: packet format, verification, signing and storage.
// Byte-compatible with the ARK offline relay app and the bridge toolkit (protocol ARK-RELAY-1).
// Node 18+, no dependencies.
import { createHash, webcrypto } from 'node:crypto';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { dirname } from 'node:path';

const { subtle } = webcrypto;
const ALG = { name: 'ECDSA', namedCurve: 'P-256' };
const SIG = { name: 'ECDSA', hash: 'SHA-256' };
const MAX_LIFETIME_MS = 72 * 3600000;
export const PROTOCOL = 'ARK-RELAY-1';
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export const deviceOf = key => sha256(JSON.stringify({ kty: 'EC', crv: 'P-256', x: key.x, y: key.y })).slice(0, 8);

/** The exact bytes that are hashed into the packet id and signed. Field order matters. */
export function canonical(e) {
  return JSON.stringify({
    v: 1, kind: e.kind, channel: e.channel, alias: e.alias, text: e.text, ref: e.ref,
    issued_at: e.issued_at, expires_at: e.expires_at,
    public_key: { kty: 'EC', crv: 'P-256', x: e.public_key.x, y: e.public_key.y },
  });
}

function checkShape(e, now) {
  if (!e || e.v !== 1 || !['message', 'ack'].includes(e.kind)) throw new Error('Not an ARK packet.');
  if (typeof e.channel !== 'string' || !/^[a-z0-9][a-z0-9-]{0,39}$/.test(e.channel)) throw new Error('Bad topic name.');
  if (typeof e.alias !== 'string' || !e.alias.trim() || e.alias.length > 40) throw new Error('Bad sender name.');
  if (typeof e.text !== 'string' || e.text.length > 1000 || typeof e.ref !== 'string') throw new Error('Bad message text.');
  if (e.kind === 'message' ? (!e.text.trim() || e.ref !== '') : (e.text !== '' || !/^[a-f0-9]{64}$/.test(e.ref))) throw new Error('Bad message or acknowledgment.');
  const issued = Date.parse(e.issued_at), expires = Date.parse(e.expires_at);
  if (!Number.isFinite(issued) || !Number.isFinite(expires) || new Date(issued).toISOString() !== e.issued_at || new Date(expires).toISOString() !== e.expires_at) throw new Error('Bad packet time.');
  if (issued > now + 300000) throw new Error('Packet is from the future. Check the sender and hub clocks.');
  if (expires <= issued || expires - issued > MAX_LIFETIME_MS) throw new Error('Bad packet lifetime.');
  const k = e.public_key;
  if (!k || k.kty !== 'EC' || k.crv !== 'P-256' || !/^[A-Za-z0-9_-]{43}$/.test(k.x || '') || !/^[A-Za-z0-9_-]{43}$/.test(k.y || '')) throw new Error('Bad signing key.');
  if (!/^[A-Za-z0-9_-]{86}$/.test(e.signature || '') || !/^[a-f0-9]{64}$/.test(e.id || '')) throw new Error('Missing signature or id.');
}

/** Throws unless the packet is well formed, unchanged and signed by the key it carries. */
export async function verify(e, now = Date.now()) {
  checkShape(e, now);
  const bytes = canonical(e);
  if (sha256(bytes) !== e.id) throw new Error('Fingerprint mismatch: the packet was changed.');
  let ok = false;
  try {
    const key = await subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: e.public_key.x, y: e.public_key.y }, ALG, false, ['verify']);
    ok = await subtle.verify(SIG, key, Buffer.from(e.signature, 'base64url'), Buffer.from(bytes));
  } catch { ok = false; }
  if (!ok) throw new Error('Signature check failed: the packet was changed or forged.');
  return { ...JSON.parse(bytes), id: e.id, signature: e.signature };
}

/** Loads this hub's signing key, creating one on first run. The private key never leaves this machine. */
export async function loadSigner(file) {
  let jwk;
  try { jwk = JSON.parse(await readFile(file, 'utf8')); } catch {
    const pair = await subtle.generateKey(ALG, true, ['sign', 'verify']);
    jwk = await subtle.exportKey('jwk', pair.privateKey);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(jwk), { mode: 0o600 });
  }
  const key = await subtle.importKey('jwk', jwk, ALG, false, ['sign']);
  const publicKey = { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y };
  return {
    publicKey,
    async sign({ kind = 'message', channel, alias, text = '', ref = '', hours = 24, now = Date.now() }) {
      const life = Math.max(60000, Math.min(Number(hours) * 3600000 || 86400000, MAX_LIFETIME_MS));
      const p = { v: 1, kind, channel, alias, text, ref, issued_at: new Date(now).toISOString(), expires_at: new Date(now + life).toISOString(), public_key: publicKey };
      const bytes = canonical(p);
      const signature = Buffer.from(await subtle.sign(SIG, key, Buffer.from(bytes))).toString('base64url');
      return { ...p, id: sha256(bytes), signature };
    },
  };
}

/** Atomic JSON store helper — write to .tmp then rename for crash safety. */
async function atomicWrite(file, data) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file + '.tmp', JSON.stringify(data));
  await rename(file + '.tmp', file);
}

/** Verified packets on disk. Duplicates collapse by id; expired packets are dropped. */
export function createStore(file, limit = 5000) {
  const rows = new Map();
  const contentHashes = new Set(); // duplicate detection by content hash
  let chain = Promise.resolve();
  const TTL_MS = (Number(process.env.ARK_MSG_TTL_HOURS) || 72) * 3600000;

  const persist = () => (chain = chain.then(async () => {
    await atomicWrite(file, [...rows.values()]);
  }));

  const prune = (now = Date.now()) => {
    let removed = 0;
    for (const [id, row] of rows) {
      if (Date.parse(row.e.expires_at) <= now || (now - Date.parse(row.e.issued_at)) > TTL_MS) {
        contentHashes.delete(sha256(row.e.text + row.e.alias + row.e.channel));
        rows.delete(id);
        removed++;
      }
    }
    return removed;
  };

  const live = (now = Date.now()) => { prune(now); return [...rows.values()].sort((a, b) => b.e.issued_at.localeCompare(a.e.issued_at)); };

  return {
    get: id => rows.get(id)?.e,
    async load() {
      try {
        for (const row of JSON.parse(await readFile(file, 'utf8'))) {
          if (row?.e?.id) {
            rows.set(row.e.id, row);
            contentHashes.add(sha256(row.e.text + row.e.alias + row.e.channel));
          }
        }
      } catch { /* first run or unreadable file */ }
      prune();
      return rows.size;
    },
    async accept(list, source = 'unknown', now = Date.now()) {
      if (!Array.isArray(list)) throw new Error('Expected a list of packets.');
      const out = { added: 0, duplicate: 0, rejected: [] };
      for (const item of list.slice(0, limit)) {
        try {
          const e = await verify(item, now);
          if (Date.parse(e.expires_at) <= now) throw new Error('Expired.');
          // Duplicate detection: check both id and content hash
          const contentHash = sha256(e.text + e.alias + e.channel);
          if (rows.has(e.id) || contentHashes.has(contentHash + e.issued_at)) { out.duplicate++; continue; }
          if (rows.size >= limit && prune(now) === 0) throw new Error('Hub storage is full.');
          rows.set(e.id, { e, received_at: new Date(now).toISOString(), source });
          contentHashes.add(contentHash + e.issued_at);
          out.added++;
        } catch (error) {
          out.rejected.push({ id: typeof item?.id === 'string' ? item.id.slice(0, 64) : null, reason: error.message });
        }
      }
      if (out.added) await persist();
      return out;
    },
    bundle({ channel = '', max = 40 } = {}, now = Date.now()) {
      return { protocol: PROTOCOL, packets: live(now).filter(r => !channel || r.e.channel === channel).slice(0, max).map(r => r.e) };
    },
    messages(channel = '', now = Date.now()) {
      const rowsNow = live(now), seen = new Map();
      for (const r of rowsNow) if (r.e.kind === 'ack') {
        if (!seen.has(r.e.ref)) seen.set(r.e.ref, new Set());
        seen.get(r.e.ref).add(deviceOf(r.e.public_key) + ':' + r.e.alias.trim().toLowerCase());
      }
      return rowsNow.filter(r => r.e.kind === 'message' && (!channel || r.e.channel === channel)).slice(0, 200).map(r => ({
        id: r.e.id, channel: r.e.channel, alias: r.e.alias, text: r.e.text, issued_at: r.e.issued_at,
        expires_at: r.e.expires_at, seen: seen.get(r.e.id)?.size || 0, device: deviceOf(r.e.public_key), source: r.source,
      }));
    },
    // Search messages by keyword, date range, alias
    search({ keyword = '', from_date = '', to_date = '', alias_filter = '', channel = '' } = {}, now = Date.now()) {
      const rowsNow = live(now);
      return rowsNow.filter(r => {
        if (r.e.kind !== 'message') return false;
        if (channel && r.e.channel !== channel) return false;
        if (alias_filter && !r.e.alias.toLowerCase().includes(alias_filter.toLowerCase())) return false;
        if (keyword && !r.e.text.toLowerCase().includes(keyword.toLowerCase())) return false;
        if (from_date && r.e.issued_at < from_date) return false;
        if (to_date && r.e.issued_at > to_date) return false;
        return true;
      }).slice(0, 200).map(r => ({
        id: r.e.id, channel: r.e.channel, alias: r.e.alias, text: r.e.text,
        issued_at: r.e.issued_at, expires_at: r.e.expires_at, device: deviceOf(r.e.public_key), source: r.source,
      }));
    },
    // Stats: count by channel, count by hour (last 24h), top aliases
    stats(now = Date.now()) {
      const rowsNow = live(now);
      const byChannel = {}, byHour = {}, aliasCounts = {};
      const cutoff24h = now - 86400000;
      for (const r of rowsNow) {
        if (r.e.kind !== 'message') continue;
        byChannel[r.e.channel] = (byChannel[r.e.channel] || 0) + 1;
        const issued = Date.parse(r.e.issued_at);
        if (issued >= cutoff24h) {
          const h = new Date(issued).toISOString().slice(0, 13) + ':00';
          byHour[h] = (byHour[h] || 0) + 1;
        }
        aliasCounts[r.e.alias] = (aliasCounts[r.e.alias] || 0) + 1;
      }
      const topAliases = Object.entries(aliasCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([alias, count]) => ({ alias, count }));
      return { total: rowsNow.filter(r => r.e.kind === 'message').length, by_channel: byChannel, by_hour: byHour, top_aliases: topAliases };
    },
    count: (now = Date.now()) => live(now).length,
    runPrune: () => { const n = prune(); if (n > 0) persist(); return n; },
  };
}

/** Resource inventory store (water, food, medical, etc.) */
export function createResourceStore(file) {
  let resources = [];
  let chain = Promise.resolve();
  const persist = () => (chain = chain.then(() => atomicWrite(file, resources)));

  return {
    async load() {
      try { resources = JSON.parse(await readFile(file, 'utf8')); } catch { resources = []; }
      return resources.length;
    },
    list() { return [...resources]; },
    get(id) { return resources.find(r => r.id === id) || null; },
    async upsert(item) {
      const id = item.id || sha256(Date.now() + JSON.stringify(item)).slice(0, 16);
      const existing = resources.findIndex(r => r.id === id);
      const record = {
        id,
        name: String(item.name || '').trim().slice(0, 80),
        qty: Number(item.qty) || 0,
        unit: String(item.unit || 'units').trim().slice(0, 20),
        location: String(item.location || '').trim().slice(0, 120),
        contact: String(item.contact || '').trim().slice(0, 80),
        category: String(item.category || 'general').trim().slice(0, 40),
        updated_at: new Date().toISOString(),
      };
      if (existing >= 0) resources[existing] = record;
      else resources.push(record);
      await persist();
      return record;
    },
    async remove(id) {
      const before = resources.length;
      resources = resources.filter(r => r.id !== id);
      if (resources.length !== before) await persist();
      return resources.length !== before;
    },
  };
}

/** Household roster store */
export function createHouseholdStore(file) {
  let households = [];
  let chain = Promise.resolve();
  const persist = () => (chain = chain.then(() => atomicWrite(file, households)));

  return {
    async load() {
      try { households = JSON.parse(await readFile(file, 'utf8')); } catch { households = []; }
      return households.length;
    },
    list() { return [...households]; },
    get(id) { return households.find(h => h.id === id) || null; },
    async upsert(item) {
      const id = item.id || sha256(Date.now() + JSON.stringify(item)).slice(0, 16);
      const existing = households.findIndex(h => h.id === id);
      const record = {
        id,
        name: String(item.name || '').trim().slice(0, 80),
        headcount: Math.max(0, Math.floor(Number(item.headcount) || 1)),
        needs: String(item.needs || '').trim().slice(0, 300),
        location: String(item.location || '').trim().slice(0, 120),
        status: ['ok', 'needs-help', 'critical'].includes(item.status) ? item.status : 'ok',
        contact: String(item.contact || '').trim().slice(0, 80),
        updated_at: new Date().toISOString(),
      };
      if (existing >= 0) households[existing] = record;
      else households.push(record);
      await persist();
      return record;
    },
    async remove(id) {
      const before = households.length;
      households = households.filter(h => h.id !== id);
      if (households.length !== before) await persist();
      return households.length !== before;
    },
  };
}

/** Alert store: single current alert + history */
export function createAlertStore(file) {
  let current = null;
  let history = [];
  let chain = Promise.resolve();
  const persist = () => (chain = chain.then(() => atomicWrite(file, { current, history })));
  const COLORS = { 1: '#2d7a3a', 2: '#c8a000', 3: '#c86000', 4: '#c82000', 5: '#1a1a1a' };

  return {
    async load() {
      try {
        const data = JSON.parse(await readFile(file, 'utf8'));
        current = data.current || null;
        history = data.history || [];
      } catch { current = null; history = []; }
    },
    getCurrent() { return current; },
    getHistory() { return [...history].slice(-50); },
    async set({ level, message, issued_by = 'admin' }) {
      level = Math.max(1, Math.min(5, Math.floor(Number(level) || 1)));
      const record = {
        level,
        color: COLORS[level],
        message: String(message || '').trim().slice(0, 300),
        issued_at: new Date().toISOString(),
        issued_by: String(issued_by || 'admin').slice(0, 40),
      };
      if (current) history.push(current);
      if (history.length > 50) history = history.slice(-50);
      current = record;
      await persist();
      return record;
    },
    async clear() {
      if (current) { history.push({ ...current, cleared_at: new Date().toISOString() }); }
      current = null;
      await persist();
    },
  };
}

/** Peer registry with last-seen timestamps */
export function createPeerRegistry(file) {
  let peers = new Map();
  let chain = Promise.resolve();
  const persist = () => (chain = chain.then(() => atomicWrite(file, Object.fromEntries(peers))));

  return {
    async load() {
      try {
        const data = JSON.parse(await readFile(file, 'utf8'));
        peers = new Map(Object.entries(data));
      } catch { peers = new Map(); }
      return peers.size;
    },
    list() {
      const now = Date.now();
      return [...peers.entries()].map(([url, info]) => ({
        url,
        name: info.name || url,
        last_seen: info.last_seen,
        online: (now - Date.parse(info.last_seen)) < 120000,
        message_count: info.message_count || 0,
      })).sort((a, b) => (b.last_seen || '').localeCompare(a.last_seen || ''));
    },
    async announce({ url, name, message_count = 0 }) {
      if (!url || typeof url !== 'string') throw new Error('URL required.');
      url = url.trim().replace(/\/$/, '').slice(0, 200);
      const record = {
        name: String(name || url).trim().slice(0, 60),
        last_seen: new Date().toISOString(),
        message_count: Number(message_count) || 0,
      };
      peers.set(url, record);
      await persist();
      return record;
    },
    has: url => peers.has(url),
  };
}

/**
 * ARK local network hub discovery.
 *
 * Probes common LAN IP ranges and mDNS-style hostnames in parallel.
 * Caches discovered hubs. Optionally announces this device as a hub.
 *
 * Returns list of { url, name, messageCount, peerCount, latencyMs }
 */
import { readFile, writeFile } from 'node:fs/promises';

const PROBE_TIMEOUT_MS = Number(process.env.ARK_PROBE_TIMEOUT_MS || 400);
const CACHE_TTL_MS = Number(process.env.ARK_DISCOVERY_CACHE_TTL_MS || 300000); // 5 min
const CACHE_FILE = process.env.ARK_DISCOVERY_CACHE || 'hub-discovery-cache.json';
const HUB_PORT = Number(process.env.ARK_HUB_PORT || 7700);
const ANNOUNCE_PORT = Number(process.env.ARK_HUB_ANNOUNCE_PORT || HUB_PORT);

const log = (...args) => console.log(new Date().toISOString(), '[hub-discovery]', ...args);

/** mDNS-style hostnames to try */
const MDNS_HOSTNAMES = [
  'ark-hub.local',
  'raspberrypi.local',
  'ark.local',
  'pi.local',
  'router.local',
  'gateway.local',
];

/** Common LAN IP patterns to probe */
const LAN_RANGES = [
  '192.168.1',
  '192.168.0',
  '192.168.2',
  '10.0.0',
  '10.0.1',
  '172.16.0',
];

/** Specific well-known gateway IPs to always try */
const KNOWN_IPS = [
  '192.168.1.1',
  '192.168.0.1',
  '192.168.1.100',
  '192.168.1.254',
  '10.0.0.1',
  '10.0.0.2',
];

// In-memory cache: url -> { info, cachedAt }
const memCache = new Map();

async function loadDiskCache() {
  try {
    const raw = JSON.parse(await readFile(CACHE_FILE, 'utf8'));
    const now = Date.now();
    for (const [url, entry] of Object.entries(raw)) {
      if (entry.cachedAt + CACHE_TTL_MS > now) {
        memCache.set(url, entry);
      }
    }
  } catch {}
}

async function saveDiskCache() {
  const obj = {};
  for (const [url, entry] of memCache.entries()) obj[url] = entry;
  await writeFile(CACHE_FILE, JSON.stringify(obj, null, 2)).catch(() => {});
}

/** Probe a single URL for ARK hub status. */
async function probeHub(url) {
  const start = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
  try {
    const r = await fetch(`${url}/api/status`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!r.ok) return null;
    const data = await r.json();
    const latencyMs = Date.now() - start;
    return {
      url,
      name: data.name || data.nodeName || url,
      messageCount: data.messageCount ?? data.messages ?? 0,
      peerCount: data.peerCount ?? data.peers ?? 0,
      latencyMs,
      version: data.version || null,
      channels: data.channels || [],
    };
  } catch {
    clearTimeout(timer);
    return null;
  }
}

/** Probe a batch of URLs in parallel, return successful ones. */
async function probeBatch(urls) {
  const results = await Promise.allSettled(urls.map(url => probeHub(url)));
  return results
    .filter(r => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);
}

/** Generate IP list for a subnet prefix (probe .1 through .30 and .100-.110 by default). */
function subnetIps(prefix) {
  const ips = [];
  // Most likely addresses: .1, .2, .100, .101, etc.
  const candidates = [1, 2, 3, 100, 101, 110, 150, 200, 254];
  for (const n of candidates) ips.push(`${prefix}.${n}`);
  return ips;
}

/**
 * Discover ARK hubs on the local network.
 *
 * @param {object} options
 * @param {boolean} options.useCache - return cached results if fresh (default true)
 * @param {boolean} options.fullScan - probe all LAN ranges, not just known IPs (slower)
 * @returns {Promise<HubInfo[]>}
 */
export async function discoverHubs({ useCache = true, fullScan = false } = {}) {
  await loadDiskCache();

  // Return cache if fresh enough
  if (useCache) {
    const now = Date.now();
    const fresh = [...memCache.values()].filter(e => e.cachedAt + CACHE_TTL_MS > now);
    if (fresh.length) {
      log(`returning ${fresh.length} cached hubs`);
      return fresh.map(e => e.info).sort((a, b) => a.latencyMs - b.latencyMs);
    }
  }

  log('probing local network for ARK hubs...');

  // Build URL list
  const urls = new Set();

  // mDNS hostnames
  for (const host of MDNS_HOSTNAMES) urls.add(`http://${host}:${HUB_PORT}`);

  // Known gateway IPs
  for (const ip of KNOWN_IPS) urls.add(`http://${ip}:${HUB_PORT}`);

  // Env-specified extra hubs
  for (const u of (process.env.ARK_EXTRA_HUBS || '').split(',').map(s => s.trim()).filter(Boolean)) {
    urls.add(u);
  }

  if (fullScan) {
    for (const prefix of LAN_RANGES) {
      for (const ip of subnetIps(prefix)) urls.add(`http://${ip}:${HUB_PORT}`);
    }
  }

  // Probe in parallel batches of 20
  const urlList = [...urls];
  const found = [];
  for (let i = 0; i < urlList.length; i += 20) {
    const batch = urlList.slice(i, i + 20);
    const results = await probeBatch(batch);
    found.push(...results);
  }

  // Cache results
  const now = Date.now();
  for (const info of found) {
    memCache.set(info.url, { info, cachedAt: now });
  }
  await saveDiskCache();

  log(`found ${found.length} hub(s):`, found.map(h => `${h.name}@${h.url}(${h.latencyMs}ms)`).join(', '));
  return found.sort((a, b) => a.latencyMs - b.latencyMs);
}

/**
 * Announce this device as an ARK hub on the local network.
 * Responds to discovery probes on the ARK status endpoint.
 *
 * This creates a minimal HTTP server that answers /api/status.
 * Mount it alongside your actual hub, or use it standalone.
 */
export function announceHub({ name, messageCount = 0, peerCount = 0, channels = [], version = '1.0' } = {}) {
  const { createServer } = require('node:http');
  const hubName = name || process.env.ARK_HUB_NAME || require('node:os').hostname();

  const server = createServer((req, res) => {
    if (req.url === '/api/status' || req.url === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ name: hubName, messageCount, peerCount, channels, version }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(ANNOUNCE_PORT, () => {
    log(`announcing as hub "${hubName}" on :${ANNOUNCE_PORT}`);
  });

  return {
    server,
    update(info) {
      Object.assign({ messageCount, peerCount, channels }, info);
    },
    stop() { server.close(); },
  };
}

/**
 * Get the best available hub URL — from cache or by probing.
 * Returns null if no hub found.
 */
export async function getBestHub() {
  const hubs = await discoverHubs({ useCache: true });
  return hubs[0]?.url || null;
}

/** Clear discovery cache. */
export function clearCache() {
  memCache.clear();
  writeFile(CACHE_FILE, '{}').catch(() => {});
}

// CLI mode
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const full = process.argv.includes('--full');
  const hubs = await discoverHubs({ useCache: false, fullScan: full });
  if (!hubs.length) {
    console.log('No ARK hubs found on local network.');
  } else {
    console.log(`\nFound ${hubs.length} hub(s):\n`);
    for (const h of hubs) {
      console.log(`  ${h.name}`);
      console.log(`    URL:      ${h.url}`);
      console.log(`    Latency:  ${h.latencyMs}ms`);
      console.log(`    Messages: ${h.messageCount}`);
      console.log(`    Peers:    ${h.peerCount}`);
      if (h.channels?.length) console.log(`    Channels: ${h.channels.join(', ')}`);
      console.log();
    }
  }
}

/**
 * ARK Distribution System — package verification, resumable chunked transfer,
 * recipient approval protocol, local WiFi portal URL display, and version tracking.
 *
 * Zero npm dependencies. Node 18+.
 * DEFENSIVE BY DEFAULT: every function has try/catch + fallback.
 * This system is for civilian emergency coordination only.
 */

import { createHash, webcrypto } from 'node:crypto';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { join, basename } from 'node:path';
import { networkInterfaces } from 'node:os';
import { createServer } from 'node:http';

const { subtle } = webcrypto;
const CHUNK_SIZE = 64 * 1024; // 64 KB
const PROTOCOL_VERSION = '1.0.0';
const MIN_HUB_VERSION = '1.0.0';

const log = (...args) => console.log(new Date().toISOString(), '[distribution]', ...args);
const warn = (...args) => console.warn(new Date().toISOString(), '[distribution:WARN]', ...args);

// ---------------------------------------------------------------------------
// SHA-256 helpers
// ---------------------------------------------------------------------------

/** Compute SHA-256 hex of a Buffer or string. */
export function sha256(data) {
  try {
    return createHash('sha256').update(data).digest('hex');
  } catch (err) {
    warn('sha256 failed:', err.message);
    return '';
  }
}

/** Compute SHA-256 hex of a file on disk. Returns '' on error. */
export async function sha256File(filePath) {
  try {
    const bytes = await readFile(filePath);
    return sha256(bytes);
  } catch (err) {
    warn('sha256File failed for', filePath, ':', err.message);
    return '';
  }
}

// ---------------------------------------------------------------------------
// Package version tracking
// ---------------------------------------------------------------------------

let _cachedVersion = null;

/** Load semver from package.json next to this file, or return a hardcoded fallback. */
export async function getPackageVersion() {
  if (_cachedVersion) return _cachedVersion;
  const candidates = [
    new URL('../package.json', import.meta.url).pathname,
    new URL('../../package.json', import.meta.url).pathname,
    join(process.cwd(), 'package.json'),
  ];
  for (const p of candidates) {
    try {
      const pkg = JSON.parse(await readFile(p, 'utf8'));
      if (pkg.version && /^\d+\.\d+\.\d+/.test(pkg.version)) {
        _cachedVersion = pkg.version;
        return _cachedVersion;
      }
    } catch { /* try next */ }
  }
  _cachedVersion = PROTOCOL_VERSION;
  return _cachedVersion;
}

/** Compare two semver strings. Returns -1, 0, or 1. */
export function compareSemver(a, b) {
  try {
    const parse = v => (v || '0.0.0').split('.').map(n => parseInt(n, 10) || 0);
    const [aMaj, aMin, aPat] = parse(a);
    const [bMaj, bMin, bPat] = parse(b);
    if (aMaj !== bMaj) return aMaj > bMaj ? 1 : -1;
    if (aMin !== bMin) return aMin > bMin ? 1 : -1;
    if (aPat !== bPat) return aPat > bPat ? 1 : -1;
    return 0;
  } catch { return 0; }
}

/** Returns true if hubVersion meets the minimum requirement. */
export function checkVersionCompatibility(hubVersion) {
  try {
    return compareSemver(hubVersion, MIN_HUB_VERSION) >= 0;
  } catch { return true; }
}

// ---------------------------------------------------------------------------
// Package verification
// ---------------------------------------------------------------------------

/**
 * Verify one or more files. Returns { ok, files: [{path, hash, ok}] }.
 * Never throws.
 */
export async function verifyPackage(files) {
  const results = [];
  let allOk = true;
  for (const { path, expectedHash } of files) {
    try {
      const actual = await sha256File(path);
      const ok = !expectedHash || actual === expectedHash;
      if (!ok) allOk = false;
      results.push({ path, hash: actual, ok });
    } catch (err) {
      allOk = false;
      results.push({ path, hash: '', ok: false, error: err.message });
    }
  }
  return { ok: allOk, files: results };
}

// ---------------------------------------------------------------------------
// Chunked file transfer
// ---------------------------------------------------------------------------

/**
 * Split a file into 64 KB chunks with sequence numbers and checksums.
 * Returns array of { seq, total, data: Buffer, checksum }.
 * Never throws — returns [] on error.
 */
export async function buildChunks(filePath) {
  try {
    const bytes = await readFile(filePath);
    const chunks = [];
    const total = Math.ceil(bytes.length / CHUNK_SIZE) || 1;
    for (let seq = 0; seq < total; seq++) {
      const data = bytes.subarray(seq * CHUNK_SIZE, (seq + 1) * CHUNK_SIZE);
      chunks.push({
        seq,
        total,
        data,
        checksum: sha256(data),
        offset: seq * CHUNK_SIZE,
        length: data.length,
      });
    }
    return chunks;
  } catch (err) {
    warn('buildChunks failed for', filePath, ':', err.message);
    return [];
  }
}

/**
 * Verify a received chunk. Returns true if checksum matches.
 */
export function verifyChunk(chunk) {
  try {
    if (!chunk || typeof chunk.seq !== 'number' || !Buffer.isBuffer(chunk.data)) return false;
    return sha256(chunk.data) === chunk.checksum;
  } catch { return false; }
}

/**
 * Receiver-side state machine for reassembling a chunked transfer.
 * Usage:
 *   const rx = createReceiver(totalChunks, expectedSha256);
 *   rx.receive(chunk);           // returns {ok, missing}
 *   rx.getMissing();             // returns [seq, ...] for retry requests
 *   rx.assemble();               // returns Buffer or null
 *   rx.verify();                 // returns { ok, hash }
 */
export function createReceiver(total, expectedSha256) {
  const received = new Map(); // seq -> data Buffer

  return {
    /** Accept a chunk. Returns { ok: bool, missing: [seq] }. Never throws. */
    receive(chunk) {
      try {
        if (!verifyChunk(chunk)) return { ok: false, missing: this.getMissing() };
        received.set(chunk.seq, chunk.data);
        return { ok: true, missing: this.getMissing() };
      } catch (err) {
        warn('receiver.receive error:', err.message);
        return { ok: false, missing: this.getMissing() };
      }
    },
    /** List of sequence numbers not yet received. */
    getMissing() {
      try {
        const missing = [];
        for (let i = 0; i < total; i++) if (!received.has(i)) missing.push(i);
        return missing;
      } catch { return []; }
    },
    /** True when all chunks have been received. */
    isComplete() { return received.size === total; },
    /** Reassemble into a single Buffer. Returns null if incomplete or on error. */
    assemble() {
      try {
        if (!this.isComplete()) return null;
        const parts = [];
        for (let i = 0; i < total; i++) parts.push(received.get(i));
        return Buffer.concat(parts);
      } catch (err) {
        warn('receiver.assemble error:', err.message);
        return null;
      }
    },
    /** Verify the assembled file against the expected hash. */
    verify() {
      try {
        const buf = this.assemble();
        if (!buf) return { ok: false, hash: '', reason: 'incomplete' };
        const hash = sha256(buf);
        return { ok: !expectedSha256 || hash === expectedSha256, hash };
      } catch (err) {
        return { ok: false, hash: '', reason: err.message };
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Recipient approval protocol
// ---------------------------------------------------------------------------

/**
 * Build a transfer-offer announcement.
 * Sender: call this, then wait for accept/reject before sending chunks.
 */
export async function buildTransferOffer(filePath) {
  try {
    const info = await stat(filePath).catch(() => null);
    const hash = await sha256File(filePath);
    const version = await getPackageVersion();
    const id = sha256(filePath + Date.now()).slice(0, 16);
    return {
      type: 'transfer-offer',
      id,
      filename: basename(filePath),
      size: info ? info.size : 0,
      sha256: hash,
      version,
      chunks: info ? Math.ceil(info.size / CHUNK_SIZE) : 0,
      chunkSize: CHUNK_SIZE,
      protocol: PROTOCOL_VERSION,
      offeredAt: new Date().toISOString(),
    };
  } catch (err) {
    warn('buildTransferOffer failed:', err.message);
    return null;
  }
}

/** Build a transfer-accept response. */
export function buildTransferAccept(offerId) {
  return { type: 'transfer-accept', id: offerId, acceptedAt: new Date().toISOString() };
}

/** Build a transfer-reject response. */
export function buildTransferReject(offerId, reason = '') {
  return { type: 'transfer-reject', id: offerId, reason: String(reason).slice(0, 200), rejectedAt: new Date().toISOString() };
}

/** Build a chunk-request (receiver asking for missing chunks). */
export function buildChunkRequest(offerId, missing) {
  return { type: 'chunk-request', id: offerId, missing: Array.isArray(missing) ? missing : [] };
}

// ---------------------------------------------------------------------------
// Local WiFi download portal
// ---------------------------------------------------------------------------

/** Get the best non-loopback IPv4 address. Returns '' on failure. */
export function getLocalIp() {
  try {
    const nets = networkInterfaces();
    for (const iface of Object.values(nets)) {
      for (const addr of (iface || [])) {
        if (addr.family === 'IPv4' && !addr.internal) return addr.address;
      }
    }
  } catch (err) { warn('getLocalIp failed:', err.message); }
  return '';
}

/**
 * Returns a text-based URL display — a plain box with the URL for sharing.
 * Always works. Never crashes.
 */
export function buildUrlDisplay(url) {
  try {
    const line = '─'.repeat(url.length + 4);
    return [
      `┌${line}┐`,
      `│  ${url}  │`,
      `└${line}┘`,
    ].join('\n');
  } catch { return url; }
}

/**
 * Build a minimal QR code-like matrix using Unicode block characters.
 * Uses a simplified encoding: URL is embedded as a visual pattern for display only.
 * This is NOT a spec-compliant QR code — it is a visual URL display aid.
 * For a real QR scanner, use the URL text directly.
 */
export function buildUrlMatrix(url) {
  try {
    // Encode URL as bytes, then lay them out in a visual grid
    const bytes = Buffer.from(url, 'utf8');
    const side = Math.ceil(Math.sqrt(bytes.length * 4)) + 2;
    const grid = [];
    let byteIdx = 0;

    for (let row = 0; row < side; row++) {
      let rowStr = '';
      for (let col = 0; col < side; col++) {
        // Border
        if (row === 0 || row === side - 1 || col === 0 || col === side - 1) {
          rowStr += '██';
          continue;
        }
        // Finder pattern corners
        if ((row < 3 && col < 3) || (row < 3 && col >= side - 3) || (row >= side - 3 && col < 3)) {
          rowStr += '██';
          continue;
        }
        // Data region
        const bit = byteIdx < bytes.length ? ((bytes[byteIdx >> 3] >> (7 - (byteIdx & 7))) & 1) : 0;
        byteIdx++;
        rowStr += bit ? '██' : '  ';
      }
      grid.push(rowStr);
    }
    return grid.join('\n');
  } catch (err) {
    warn('buildUrlMatrix failed:', err.message);
    return buildUrlDisplay(url);
  }
}

/**
 * Display the hub download URL with a text box and unicode matrix.
 * Prints to stdout and returns the display string.
 */
export function displayDownloadUrl(port = 7700, path = '') {
  try {
    const ip = getLocalIp() || '192.168.x.x';
    const url = `http://${ip}:${port}${path}`;
    const box = buildUrlDisplay(url);
    const matrix = buildUrlMatrix(url);
    const output = [
      '',
      '=== ARK HUB DOWNLOAD URL ===',
      '',
      box,
      '',
      '  Type this address in any browser on the same WiFi network.',
      '',
      '  Visual URL matrix (reference only — type the URL above):',
      matrix,
      '',
      '============================',
      '',
    ].join('\n');
    console.log(output);
    return { url, display: output };
  } catch (err) {
    warn('displayDownloadUrl failed:', err.message);
    const fallback = `http://localhost:${port}${path}`;
    console.log('ARK Hub URL:', fallback);
    return { url: fallback, display: fallback };
  }
}

// ---------------------------------------------------------------------------
// Simple HTTP download portal (serves the kit file)
// ---------------------------------------------------------------------------

/**
 * Start a minimal HTTP portal on the given port that serves a single file.
 * Returns { server, url, close }.
 * Never throws — returns null on error.
 */
export async function startDownloadPortal(filePath, port = 7700) {
  try {
    const fileName = basename(filePath);
    const fileHash = await sha256File(filePath);
    const version = await getPackageVersion();

    const server = createServer(async (req, res) => {
      try {
        if (req.url === '/' || req.url === '/index.html') {
          const ip = getLocalIp() || req.socket.localAddress || 'localhost';
          const downloadUrl = `http://${ip}:${port}/download`;
          const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ARK Distribution Hub</title>
<style>body{font-family:monospace;background:#111;color:#0f0;padding:2rem;max-width:600px;margin:auto}
h1{color:#0ff}a{color:#0f0}pre{background:#000;padding:1rem;border:1px solid #0f0}</style>
</head>
<body>
<h1>ARK Distribution Hub</h1>
<p>Package: <strong>${fileName}</strong></p>
<p>Version: ${version}</p>
<p>SHA-256: <code>${fileHash.slice(0, 16)}…</code></p>
<p><a href="/download">Download ${fileName}</a></p>
<pre>SHA-256 (verify after download):
${fileHash}</pre>
<p>Type this address in your browser: <strong>${downloadUrl}</strong></p>
</body></html>`;
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(html);
        } else if (req.url === '/download') {
          let fileSize = 0;
          try { fileSize = (await stat(filePath)).size; } catch {}
          res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${fileName}"`,
            'Content-Length': String(fileSize),
            'X-ARK-SHA256': fileHash,
            'X-ARK-Version': version,
          });
          const stream = createReadStream(filePath);
          stream.on('error', err => { warn('stream error:', err.message); res.end(); });
          stream.pipe(res);
        } else {
          res.writeHead(404); res.end('Not found');
        }
      } catch (err) {
        warn('portal request error:', err.message);
        try { res.writeHead(500); res.end('Server error'); } catch {}
      }
    });

    await new Promise((resolve, reject) => {
      server.listen(port, '0.0.0.0', resolve);
      server.once('error', reject);
    });

    const ip = getLocalIp() || 'localhost';
    const url = `http://${ip}:${port}`;
    log(`Download portal running at ${url}`);

    return {
      server,
      url,
      port,
      hash: fileHash,
      version,
      close: () => new Promise(r => server.close(r)),
    };
  } catch (err) {
    warn('startDownloadPortal failed:', err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// High-level transfer session manager
// ---------------------------------------------------------------------------

/**
 * Manages an outgoing transfer: offer → wait for accept → send chunks → done.
 * Usage:
 *   const session = createTransferSession(filePath);
 *   const offer = await session.getOffer();
 *   // ... send offer over your channel
 *   session.onAccept(offerId);
 *   // ... send chunks from session.getNextChunks()
 *   // ... handle chunk-request with session.onChunkRequest(missing)
 */
export function createTransferSession(filePath) {
  let chunks = null;
  let offer = null;
  let state = 'idle'; // idle | offered | accepted | transferring | done | rejected
  let pendingRequest = new Set();

  return {
    async getOffer() {
      try {
        offer = await buildTransferOffer(filePath);
        if (!offer) throw new Error('Failed to build offer');
        chunks = await buildChunks(filePath);
        if (!chunks.length) throw new Error('No chunks built');
        state = 'offered';
        return offer;
      } catch (err) {
        warn('getOffer failed:', err.message);
        state = 'idle';
        return null;
      }
    },
    onAccept(id) {
      try {
        if (offer && offer.id === id) {
          state = 'accepted';
          return true;
        }
        return false;
      } catch { return false; }
    },
    onReject(id) {
      try {
        if (offer && offer.id === id) { state = 'rejected'; return true; }
        return false;
      } catch { return false; }
    },
    getState() { return state; },
    /** Returns next batch of chunks to send (up to batchSize). */
    getNextChunks(seqs = null, batchSize = 10) {
      try {
        if (!chunks || state === 'idle' || state === 'rejected') return [];
        state = 'transferring';
        if (seqs) {
          return seqs.slice(0, batchSize).map(s => chunks[s]).filter(Boolean);
        }
        return chunks.slice(0, batchSize);
      } catch (err) {
        warn('getNextChunks error:', err.message);
        return [];
      }
    },
    onChunkRequest(missing) {
      try {
        return missing.map(s => chunks[s]).filter(Boolean);
      } catch { return []; }
    },
    getOffer() { return offer; },
    getTotalChunks() { return chunks ? chunks.length : 0; },
  };
}

// ---------------------------------------------------------------------------
// Module self-test (run with: node distribution.mjs --selftest)
// ---------------------------------------------------------------------------

if (process.argv.includes('--selftest')) {
  const { mkdtemp, writeFile: wf } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const dir = await mkdtemp(join(tmpdir(), 'ark-dist-test-'));
  const testFile = join(dir, 'test.bin');
  await wf(testFile, Buffer.alloc(200 * 1024, 0xab)); // 200 KB

  console.log('--- distribution.mjs self-test ---');
  const hash = await sha256File(testFile);
  console.log('sha256File:', hash ? 'OK' : 'FAIL');

  const chunks = await buildChunks(testFile);
  console.log('buildChunks count:', chunks.length, chunks.length === 4 ? 'OK (4 chunks for 200KB)' : 'CHECK');

  const rx = createReceiver(chunks.length, hash);
  for (const c of chunks) rx.receive(c);
  const v = rx.verify();
  console.log('receiver verify:', v.ok ? 'OK' : 'FAIL', v.ok ? '' : v.reason);

  const offer = await buildTransferOffer(testFile);
  console.log('buildTransferOffer:', offer ? 'OK' : 'FAIL');

  const { url } = displayDownloadUrl(7700, '');
  console.log('displayDownloadUrl:', url ? 'OK' : 'FAIL');

  const ver = await getPackageVersion();
  console.log('getPackageVersion:', ver);

  console.log('--- self-test done ---');
}

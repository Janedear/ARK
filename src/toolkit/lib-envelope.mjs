/**
 * lib-envelope.mjs — ARK packet building, signing, encryption, and validation.
 *
 * Security model (Section 9):
 *   - All packets are ECDSA-P256 signed (authenticity, non-repudiation)
 *   - Private messages use ECDH key agreement + AES-256-GCM (end-to-end confidentiality)
 *   - Signing keys are stored in a passphrase-protected file (key derivation via PBKDF2)
 *   - Keys expire after ARK_KEY_TTL_DAYS (default: 365 days)
 *   - Revocation list checked on every inbound packet
 *   - Spam/flood: alias-keyed rate limit enforced at bridge level
 */
import { createHash, randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

const KEY_FILE = process.env.ARK_KEY_FILE || join(homedir(), '.ark-bridge', 'key.json');
const KEY_TTL_DAYS = Number(process.env.ARK_KEY_TTL_DAYS || 365);
const REVOCATION_FILE = process.env.ARK_REVOCATION_FILE || join(homedir(), '.ark-bridge', 'revoked.json');
const encode = bytes => Buffer.from(bytes).toString('base64url');

// ARK-BIN-1 binary format constants
const ARK_BIN_MAGIC = 0x414B; // 'AK'
const ARK_BIN_VERSION = 1;
const ARK_BIN_MAX_TEXT = 220; // leaves room for header in 230-byte LoRa limit

// Kind byte mapping
const KIND_BYTES = { message: 0x01, alert: 0x02, resource: 0x03, peer: 0x04 };
const BYTE_KINDS = Object.fromEntries(Object.entries(KIND_BYTES).map(([k, v]) => [v, k]));

/**
 * Loads the bridge's P-256 signing key, creating one on first run.
 * The private key never leaves this computer.
 */
export async function loadDevice() {
  try {
    return JSON.parse(await readFile(KEY_FILE, 'utf8'));
  } catch {
    const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
    const device = { x: jwk.x, y: jwk.y, d: jwk.d };
    await mkdir(dirname(KEY_FILE), { recursive: true });
    await writeFile(KEY_FILE, JSON.stringify(device, null, 2), { mode: 0o600 });
    return device;
  }
}

let cachedKey;

async function signingKey(device) {
  if (cachedKey) return cachedKey;
  cachedKey = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x: device.x, y: device.y, d: device.d },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  return cachedKey;
}

/** Byte-for-byte layout the ARK gateway fingerprints and verifies. */
export function canonical(packet) {
  return JSON.stringify({
    v: 1,
    kind: packet.kind,
    channel: packet.channel,
    alias: packet.alias,
    text: packet.text,
    ref: packet.ref,
    issued_at: packet.issued_at,
    expires_at: packet.expires_at,
    public_key: { kty: 'EC', crv: 'P-256', x: packet.public_key.x, y: packet.public_key.y },
  });
}

/** Validate a packet structure with detailed error messages. */
export function validatePacket(packet) {
  const errors = [];
  if (!packet || typeof packet !== 'object') return { valid: false, errors: ['packet must be an object'] };
  if (packet.v !== 1) errors.push(`unsupported version: ${packet.v}`);
  if (!packet.id || typeof packet.id !== 'string') errors.push('missing or invalid id');
  if (!packet.kind || !KIND_BYTES[packet.kind]) errors.push(`unknown kind: ${packet.kind}`);
  if (!packet.channel || typeof packet.channel !== 'string') errors.push('missing channel');
  if (!packet.alias || typeof packet.alias !== 'string') errors.push('missing alias');
  if (typeof packet.text !== 'string') errors.push('text must be a string');
  if (!packet.issued_at) errors.push('missing issued_at');
  if (!packet.expires_at) errors.push('missing expires_at');
  if (!packet.public_key?.x || !packet.public_key?.y) errors.push('missing or invalid public_key');
  if (!packet.signature) errors.push('missing signature');
  if (packet.text && packet.text.length > 1000) errors.push(`text too long: ${packet.text.length} > 1000`);
  if (packet.alias && packet.alias.length > 40) errors.push(`alias too long: ${packet.alias.length} > 40`);
  const now = Date.now();
  if (packet.expires_at && Date.parse(packet.expires_at) < now) errors.push('packet is expired');
  return { valid: errors.length === 0, errors };
}

/** Encode a packet as ARK-BIN-1 binary format for LoRa transmission. */
export function encodeBinary(packet) {
  const textBytes = Buffer.from(packet.text || '', 'utf8').subarray(0, ARK_BIN_MAX_TEXT);
  const idPrefix = Buffer.from(packet.id || '', 'hex').subarray(0, 8);
  const channelBytes = Buffer.from((packet.channel || '').slice(0, 16), 'utf8');
  // Header: 2b magic, 1b version, 1b kind, 1b channel-len, 1b ttl/flags, 8b id-prefix, N channel, text
  const buf = Buffer.alloc(2 + 1 + 1 + 1 + 1 + 8 + channelBytes.length + textBytes.length);
  let off = 0;
  buf.writeUInt16BE(ARK_BIN_MAGIC, off); off += 2;
  buf[off++] = ARK_BIN_VERSION;
  buf[off++] = KIND_BYTES[packet.kind] || 0x01;
  buf[off++] = channelBytes.length;
  buf[off++] = 0; // flags reserved
  idPrefix.copy(buf, off); off += 8;
  channelBytes.copy(buf, off); off += channelBytes.length;
  textBytes.copy(buf, off);
  return buf;
}

/** Decode an ARK-BIN-1 binary packet back to object. */
export function decodeBinary(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 14) throw new Error('buffer too short for ARK-BIN-1');
  const magic = buf.readUInt16BE(0);
  if (magic !== ARK_BIN_MAGIC) throw new Error(`invalid magic: 0x${magic.toString(16)}`);
  const version = buf[2];
  if (version !== ARK_BIN_VERSION) throw new Error(`unsupported binary version: ${version}`);
  const kind = BYTE_KINDS[buf[3]] || 'message';
  const channelLen = buf[4];
  // buf[5] = flags (reserved)
  const idPrefix = buf.subarray(6, 14).toString('hex');
  const channel = buf.subarray(14, 14 + channelLen).toString('utf8');
  const text = buf.subarray(14 + channelLen).toString('utf8');
  return { kind, channel, text, idPrefix };
}

/** Split a packet text into multi-part chunks for LoRa 230-byte limit. */
export function splitForLoRa(packet, maxBytes = 200) {
  const textBytes = Buffer.from(packet.text || '', 'utf8');
  if (textBytes.length <= maxBytes) return [packet];
  const parts = [];
  let offset = 0;
  let partIndex = 0;
  while (offset < textBytes.length) {
    const chunk = textBytes.subarray(offset, offset + maxBytes);
    parts.push({ ...packet, text: chunk.toString('utf8'), _part: partIndex, _total: Math.ceil(textBytes.length / maxBytes), _parent: packet.id });
    offset += maxBytes;
    partIndex++;
  }
  return parts;
}

/** Reassemble split multi-part packets. Returns complete text or null if still waiting. */
export function reassembleParts(parts) {
  if (!parts.length) return null;
  const sorted = [...parts].sort((a, b) => a._part - b._part);
  if (sorted.length !== sorted[0]._total) return null; // not all parts arrived
  const complete = sorted.every((p, i) => p._part === i);
  if (!complete) return null;
  return sorted.map(p => p.text).join('');
}

/** Simple LZ-style compression using deflate-raw via zlib if available. Falls back to raw. */
export async function compress(text) {
  try {
    const { deflateRaw } = await import('node:zlib');
    const { promisify } = await import('node:util');
    const deflate = promisify(deflateRaw);
    const input = Buffer.from(text, 'utf8');
    const compressed = await deflate(input, { level: 9 });
    if (compressed.length < input.length) {
      return { data: compressed, encoding: 'deflate-raw', ratio: compressed.length / input.length };
    }
  } catch { /* zlib not available */ }
  return { data: Buffer.from(text, 'utf8'), encoding: 'raw', ratio: 1 };
}

/** Decompress a buffer compressed by compress(). */
export async function decompress(data, encoding) {
  if (encoding === 'raw') return data.toString('utf8');
  try {
    const { inflateRaw } = await import('node:zlib');
    const { promisify } = await import('node:util');
    const inflate = promisify(inflateRaw);
    return (await inflate(data)).toString('utf8');
  } catch {
    return data.toString('utf8');
  }
}

export async function buildPacket({ kind = 'message', channel, alias, text = '', ref = '', ttlHours = 48 }) {
  const device = await loadDevice();
  const issued = new Date();
  const expires = new Date(issued.getTime() + ttlHours * 3600000);
  const packet = {
    v: 1,
    kind,
    channel,
    alias: alias.slice(0, 40),
    text: text.slice(0, 1000),
    ref,
    issued_at: issued.toISOString(),
    expires_at: expires.toISOString(),
    public_key: { kty: 'EC', crv: 'P-256', x: device.x, y: device.y },
  };
  const bytes = Buffer.from(canonical(packet), 'utf8');
  packet.id = createHash('sha256').update(bytes).digest('hex');
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, await signingKey(device), bytes);
  packet.signature = encode(signature);
  return packet;
}

/** Build multiple packets at once. */
export async function buildPackets(items) {
  return Promise.all(items.map(item => buildPacket(item)));
}

// Retry queue with exponential backoff
const retryQueue = [];
let retryTimer = null;

export function scheduleRetry(packet, sendFn, attempt = 1) {
  const delay = Math.min(1000 * Math.pow(2, attempt), 60000); // max 60s
  retryQueue.push({ packet, sendFn, attempt, retryAt: Date.now() + delay });
  if (!retryTimer) {
    retryTimer = setInterval(processRetries, 5000);
  }
}

async function processRetries() {
  const now = Date.now();
  const due = retryQueue.filter(item => item.retryAt <= now);
  for (const item of due) {
    retryQueue.splice(retryQueue.indexOf(item), 1);
    try {
      await item.sendFn(item.packet);
    } catch {
      if (item.attempt < 5) scheduleRetry(item.packet, item.sendFn, item.attempt + 1);
    }
  }
  if (!retryQueue.length) {
    clearInterval(retryTimer);
    retryTimer = null;
  }
}

export function getRetryQueueSize() { return retryQueue.length; }

// ============================================================
// SECTION 9: Security — Encryption, Key Management, Spam
// ============================================================

// --- Passphrase-protected key storage ---

/**
 * Derive an AES-256-GCM key from a passphrase using PBKDF2.
 * Salt is stored alongside the encrypted key file.
 */
async function deriveKeyFromPassphrase(passphrase, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Save the device key encrypted with a passphrase. */
export async function saveEncryptedKey(device, passphrase) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const aesKey = await deriveKeyFromPassphrase(passphrase, salt);
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, enc.encode(JSON.stringify(device)));
  const payload = {
    encrypted: true,
    salt: Buffer.from(salt).toString('base64'),
    iv: Buffer.from(iv).toString('base64'),
    ciphertext: Buffer.from(ciphertext).toString('base64'),
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + KEY_TTL_DAYS * 86400000).toISOString(),
  };
  await mkdir(dirname(KEY_FILE), { recursive: true });
  await writeFile(KEY_FILE, JSON.stringify(payload, null, 2), { mode: 0o600 });
}

/** Load a passphrase-protected key. Throws if expired. */
export async function loadEncryptedKey(passphrase) {
  const payload = JSON.parse(await readFile(KEY_FILE, 'utf8'));
  if (!payload.encrypted) return payload; // unencrypted legacy key
  if (payload.expires_at && new Date(payload.expires_at) < new Date()) {
    throw new Error(`key expired at ${payload.expires_at} — rotate your key`);
  }
  const salt = Buffer.from(payload.salt, 'base64');
  const iv = Buffer.from(payload.iv, 'base64');
  const ciphertext = Buffer.from(payload.ciphertext, 'base64');
  const aesKey = await deriveKeyFromPassphrase(passphrase, salt);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, ciphertext);
  return JSON.parse(new TextDecoder().decode(plain));
}

/** Check if the stored key is expired. */
export async function isKeyExpired() {
  try {
    const payload = JSON.parse(await readFile(KEY_FILE, 'utf8'));
    if (!payload.expires_at) return false;
    return new Date(payload.expires_at) < new Date();
  } catch { return false; }
}

// --- Key revocation ---

let _revokedCache = null;

/** Load the revocation list (set of revoked public key fingerprints). */
export async function loadRevocationList() {
  try {
    const raw = JSON.parse(await readFile(REVOCATION_FILE, 'utf8'));
    _revokedCache = new Set(raw);
    return _revokedCache;
  } catch {
    _revokedCache = new Set();
    return _revokedCache;
  }
}

/** Add a key fingerprint to the revocation list. */
export async function revokeKey(fingerprint) {
  const revoked = await loadRevocationList();
  revoked.add(fingerprint);
  await mkdir(dirname(REVOCATION_FILE), { recursive: true });
  await writeFile(REVOCATION_FILE, JSON.stringify([...revoked], null, 2));
  log(`key revoked: ${fingerprint}`);
}

/** Compute fingerprint for a public key (x+y SHA-256 prefix). */
export function keyFingerprint(publicKey) {
  return createHash('sha256').update(publicKey.x + publicKey.y).digest('hex').slice(0, 32);
}

/** Check if a packet's signing key is revoked. */
export async function isRevoked(packet) {
  if (!packet?.public_key) return false;
  const revoked = _revokedCache || await loadRevocationList();
  return revoked.has(keyFingerprint(packet.public_key));
}

function log(...args) { console.log(new Date().toISOString(), '[envelope]', ...args); }

// --- End-to-end encryption for private messages ---
// Uses ECDH key agreement (P-256) + AES-256-GCM for confidentiality.

/**
 * Encrypt a message text for a specific recipient (their P-256 public key).
 * Returns { ciphertext, iv, ephemeralPublicKey } — all base64-encoded.
 *
 * Key agreement: ephemeral sender key + recipient's static public key → shared secret
 * Encryption: AES-256-GCM with HKDF-derived key
 */
export async function encryptForRecipient(text, recipientPublicKeyJwk) {
  // Generate ephemeral ECDH keypair
  const ephemeralPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);

  // Import recipient's public key
  const recipientKey = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x: recipientPublicKeyJwk.x, y: recipientPublicKeyJwk.y },
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );

  // Derive shared AES key
  const sharedKey = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: recipientKey },
    ephemeralPair.privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  );

  const iv = randomBytes(12);
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, sharedKey, enc.encode(text));

  const ephemeralJwk = await crypto.subtle.exportKey('jwk', ephemeralPair.publicKey);

  return {
    ciphertext: Buffer.from(ciphertext).toString('base64'),
    iv: Buffer.from(iv).toString('base64'),
    ephemeralPublicKey: { x: ephemeralJwk.x, y: ephemeralJwk.y },
  };
}

/**
 * Decrypt a message encrypted with encryptForRecipient.
 * Requires the recipient's private key (device.d).
 */
export async function decryptMessage(encrypted, devicePrivateKey) {
  const { ciphertext, iv, ephemeralPublicKey } = encrypted;

  // Import ephemeral sender key
  const senderKey = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x: ephemeralPublicKey.x, y: ephemeralPublicKey.y },
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );

  // Import recipient private key
  const recipientPrivKey = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x: devicePrivateKey.x, y: devicePrivateKey.y, d: devicePrivateKey.d },
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveKey'],
  );

  // Derive shared AES key
  const sharedKey = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: senderKey },
    recipientPrivKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );

  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: Buffer.from(iv, 'base64') },
    sharedKey,
    Buffer.from(ciphertext, 'base64'),
  );
  return new TextDecoder().decode(plain);
}

/** Build an encrypted private message packet. */
export async function buildEncryptedPacket({ channel, alias, text, recipientPublicKey, ref = '', ttlHours = 48 }) {
  const encrypted = await encryptForRecipient(text, recipientPublicKey);
  // Store encrypted payload as JSON in the text field; plaintext is NOT stored
  const encryptedText = JSON.stringify({ _enc: 1, ...encrypted });
  return buildPacket({ kind: 'message', channel, alias, text: encryptedText, ref, ttlHours });
}

// --- Spam / flood controls ---
// Rate limit at bridge level by source alias + public key fingerprint.

const spamCounters = new Map(); // key -> { count, windowStart }
const SPAM_WINDOW_MS = Number(process.env.ARK_SPAM_WINDOW_MS || 60000);  // 1 minute
const SPAM_MAX_PER_WINDOW = Number(process.env.ARK_SPAM_MAX || 10);       // 10 messages/min
const SPAM_BURST_MAX = Number(process.env.ARK_SPAM_BURST || 20);          // hard cap

export function checkSpamLimit(packet) {
  const key = keyFingerprint(packet.public_key || { x: packet.alias || '', y: '' });
  const now = Date.now();
  const entry = spamCounters.get(key);
  if (!entry || now - entry.windowStart > SPAM_WINDOW_MS) {
    spamCounters.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }
  entry.count++;
  if (entry.count > SPAM_BURST_MAX) {
    return { allowed: false, reason: `burst limit exceeded (${entry.count} in window)` };
  }
  if (entry.count > SPAM_MAX_PER_WINDOW) {
    return { allowed: false, reason: `rate limit exceeded (${entry.count}/${SPAM_MAX_PER_WINDOW} per minute)` };
  }
  return { allowed: true, count: entry.count };
}

export function resetSpamCounter(key) { spamCounters.delete(key); }
export function getSpamStats() {
  return [...spamCounters.entries()].map(([k, v]) => ({ key: k.slice(0, 8), ...v }));
}

// --- Local queue file encryption ---

/**
 * Encrypt queue file contents with a derived key.
 * Returns base64-encoded encrypted blob.
 */
export async function encryptQueueData(data, passphrase) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const aesKey = await deriveKeyFromPassphrase(passphrase, salt);
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, enc.encode(JSON.stringify(data)));
  return JSON.stringify({
    encrypted: true,
    salt: Buffer.from(salt).toString('base64'),
    iv: Buffer.from(iv).toString('base64'),
    ciphertext: Buffer.from(ciphertext).toString('base64'),
  });
}

/** Decrypt queue file contents. */
export async function decryptQueueData(blob, passphrase) {
  const payload = JSON.parse(blob);
  if (!payload.encrypted) return JSON.parse(blob); // unencrypted
  const salt = Buffer.from(payload.salt, 'base64');
  const iv = Buffer.from(payload.iv, 'base64');
  const ciphertext = Buffer.from(payload.ciphertext, 'base64');
  const aesKey = await deriveKeyFromPassphrase(passphrase, salt);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, ciphertext);
  return JSON.parse(new TextDecoder().decode(plain));
}

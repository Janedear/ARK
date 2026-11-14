import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

const KEY_FILE = process.env.ARK_KEY_FILE || join(homedir(), '.ark-bridge', 'key.json');
const encode = bytes => Buffer.from(bytes).toString('base64url');

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
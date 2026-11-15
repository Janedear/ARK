/**
 * ARK Responder Bridge — Section 5 of BACKLOG.md
 *
 * Authorized responder identity, role-based access, cryptographically signed
 * announcements, audit logging, and authorized export.
 *
 * IMPORTANT CONSTRAINTS (non-negotiable by design):
 *   - No classified or operationally sensitive information handling
 *   - No public display of military personnel movements
 *   - No automated medical diagnosis — triage intake only
 *   - No location sharing for military roles (SEC role)
 *   - All responder actions are immutably logged
 *
 * Responder roles:
 *   IC  — Incident Commander
 *   OPS — Operations Section Chief
 *   LOG — Logistics Section Chief
 *   PIO — Public Information Officer
 *   MED — Medical Unit Leader
 *   SEC — Safety/Security Officer (location sharing disabled)
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { buildPacket, canonical, loadDevice } from './lib-envelope.mjs';
import { pushPackets } from './lib-gateway.mjs';

const log = (...args) => console.log(new Date().toISOString(), '[responder]', ...args);

const RESPONDER_DIR = process.env.ARK_RESPONDER_DIR || join(homedir(), '.ark-bridge', 'responder');
const ENROLLMENT_FILE = join(RESPONDER_DIR, 'enrolled.json');
const AUDIT_FILE = join(RESPONDER_DIR, 'audit.jsonl');
const REVOCATION_FILE = join(RESPONDER_DIR, 'revoked.json');

// --- Role definitions ---

export const Role = Object.freeze({
  IC: 'IC',   // Incident Commander — full access
  OPS: 'OPS', // Operations — operational messages
  LOG: 'LOG', // Logistics — resource/supply messages
  PIO: 'PIO', // Public Information — public announcements only
  MED: 'MED', // Medical — medical triage, no location
  SEC: 'SEC', // Security — location sharing DISABLED (safety + compliance)
});

// Channel visibility by role
const ROLE_CHANNELS = {
  [Role.IC]:  ['public', 'ops', 'log', 'med', 'coord', 'command'],
  [Role.OPS]: ['public', 'ops', 'coord'],
  [Role.LOG]: ['public', 'log', 'coord'],
  [Role.PIO]: ['public'],
  [Role.MED]: ['public', 'med'],
  [Role.SEC]: ['public', 'ops'],  // SEC cannot see/send on location channels
};

// Channels that must never be accessible to SEC (military/security/location)
const BLOCKED_FOR_SEC = new Set(['location', 'military', 'movement', 'tactical', 'classified']);

// Which roles can publish signed announcements
const CAN_ANNOUNCE = new Set([Role.IC, Role.OPS, Role.PIO]);

// Which roles can export incident data
const CAN_EXPORT = new Set([Role.IC, Role.LOG]);

// --- Key revocation ---

async function loadRevoked() {
  try { return new Set(JSON.parse(await readFile(REVOCATION_FILE, 'utf8'))); }
  catch { return new Set(); }
}

async function saveRevoked(set) {
  await mkdir(RESPONDER_DIR, { recursive: true });
  await writeFile(REVOCATION_FILE, JSON.stringify([...set], null, 2));
}

// --- Enrollment ---

/** Load enrolled responders. Format: { alias -> { role, publicKey: {x,y}, enrolledAt, enrolledBy } } */
async function loadEnrolled() {
  try { return JSON.parse(await readFile(ENROLLMENT_FILE, 'utf8')); }
  catch { return {}; }
}

async function saveEnrolled(enrolled) {
  await mkdir(RESPONDER_DIR, { recursive: true });
  await writeFile(ENROLLMENT_FILE, JSON.stringify(enrolled, null, 2), { mode: 0o600 });
}

/**
 * Enroll a new responder. Must be called by IC or OPS.
 * @param {object} param
 * @param {string} param.alias - responder's alias
 * @param {string} param.role - one of Role.*
 * @param {{x: string, y: string}} param.publicKey - responder's P-256 public key JWK components
 * @param {string} param.enrolledBy - alias of enrolling officer
 */
export async function enrollResponder({ alias, role, publicKey, enrolledBy }) {
  if (!Role[role]) throw new Error(`unknown role: ${role}`);
  if (!publicKey?.x || !publicKey?.y) throw new Error('missing public key');
  const enrolled = await loadEnrolled();
  if (enrolled[alias]) throw new Error(`${alias} already enrolled — revoke first`);
  enrolled[alias] = {
    role,
    publicKey,
    enrolledAt: new Date().toISOString(),
    enrolledBy,
    keyId: createHash('sha256').update(publicKey.x + publicKey.y).digest('hex').slice(0, 16),
  };
  await saveEnrolled(enrolled);
  await audit({ action: 'enroll', alias, role, enrolledBy });
  log(`enrolled ${alias} as ${role}`);
  return enrolled[alias];
}

/** Revoke a responder's access. */
export async function revokeResponder(alias, revokedBy) {
  const enrolled = await loadEnrolled();
  const entry = enrolled[alias];
  if (!entry) throw new Error(`${alias} not enrolled`);
  const revoked = await loadRevoked();
  revoked.add(entry.keyId);
  await saveRevoked(revoked);
  delete enrolled[alias];
  await saveEnrolled(enrolled);
  await audit({ action: 'revoke', alias, revokedBy });
  log(`revoked ${alias} (keyId ${entry.keyId})`);
}

/** Verify a responder's identity from their packet public key. */
export async function verifyResponder(packet) {
  const enrolled = await loadEnrolled();
  const revoked = await loadRevoked();
  const entry = Object.values(enrolled).find(
    e => e.publicKey.x === packet.public_key?.x && e.publicKey.y === packet.public_key?.y
  );
  if (!entry) return null;
  if (revoked.has(entry.keyId)) {
    log(`rejected revoked responder key: ${entry.keyId}`);
    return null;
  }
  return entry;
}

/** Check if a responder has access to a given channel. */
export function canAccessChannel(role, channel) {
  if (role === Role.SEC && BLOCKED_FOR_SEC.has(channel)) return false;
  const allowed = ROLE_CHANNELS[role] || ['public'];
  return allowed.includes(channel);
}

/** Check if a role can perform an action. */
export function canPerform(role, action) {
  switch (action) {
    case 'announce': return CAN_ANNOUNCE.has(role);
    case 'export':   return CAN_EXPORT.has(role);
    case 'enroll':   return role === Role.IC;
    case 'revoke':   return role === Role.IC;
    default: return false;
  }
}

// --- Cryptographically signed public announcements ---

/**
 * Build a signed responder announcement packet.
 * Announcements are marked with _responder: true and the role tier.
 * Only IC, OPS, and PIO may issue announcements.
 */
export async function buildAnnouncement({ role, alias, text, channel = 'public', urgent = false }) {
  if (!CAN_ANNOUNCE.has(role)) throw new Error(`role ${role} cannot issue announcements`);
  if (role === Role.SEC && canAccessChannel(Role.SEC, channel) === false) {
    throw new Error('SEC role cannot post to this channel');
  }
  const kind = urgent ? 'alert' : 'message';
  const packet = await buildPacket({ kind, channel, alias, text, ttlHours: 72 });
  packet._responder = true;
  packet._role = role;
  packet._announcement = true;
  await audit({ action: 'announce', alias, role, channel, text: text.slice(0, 100) });
  return packet;
}

/** Filter messages by role visibility. Removes messages a role shouldn't see. */
export function filterForRole(packets, role) {
  return packets.filter(p => {
    // Block location/military content from SEC role completely
    if (role === Role.SEC) {
      const ch = p.channel || '';
      if (BLOCKED_FOR_SEC.has(ch)) return false;
      // Also block text that looks like a grid reference or military movement
      if (/\b(MGRS|grid|movement|position|coordinates|lat|lon)\b/i.test(p.text || '')) return false;
    }
    // Channel visibility check
    return canAccessChannel(role, p.channel || 'public');
  });
}

// --- Audit log (append-only JSONL) ---

/** Write an immutable audit record. */
export async function audit(record) {
  await mkdir(RESPONDER_DIR, { recursive: true });
  const entry = { ...record, ts: new Date().toISOString(), pid: process.pid };
  await appendFile(AUDIT_FILE, JSON.stringify(entry) + '\n');
}

/** Read audit log. Returns array of records. */
export async function readAuditLog(limit = 1000) {
  try {
    const raw = await readFile(AUDIT_FILE, 'utf8');
    return raw.trim().split('\n').filter(Boolean).slice(-limit).map(l => JSON.parse(l));
  } catch { return []; }
}

// --- Authorized export interface ---

/**
 * Export incident data as structured JSON for agency handoff.
 * Only IC and LOG roles may export.
 */
export async function exportIncidentData({ role, alias, packets = [], includeAudit = true }) {
  if (!CAN_EXPORT.has(role)) throw new Error(`role ${role} is not authorized to export`);

  const auditLog = includeAudit ? await readAuditLog() : [];
  const enrolled = await loadEnrolled();

  // Sanitize packets — strip private keys and sensitive fields
  const sanitized = packets.map(p => ({
    id: p.id,
    kind: p.kind,
    channel: p.channel,
    alias: p.alias,
    text: p.text,
    issued_at: p.issued_at,
    expires_at: p.expires_at,
    _responder: p._responder || false,
    _role: p._role || null,
    // Explicitly omit: public_key, signature, d, private fields
  }));

  const exportData = {
    export_version: 1,
    exported_at: new Date().toISOString(),
    exported_by: { alias, role },
    incident: {
      messageCount: sanitized.length,
      responderCount: Object.keys(enrolled).length,
      channels: [...new Set(sanitized.map(p => p.channel))],
    },
    messages: sanitized,
    responders: Object.entries(enrolled).map(([a, e]) => ({
      alias: a,
      role: e.role,
      enrolledAt: e.enrolledAt,
      enrolledBy: e.enrolledBy,
    })),
    auditLog,
    _notice: 'This export is for authorized agency use only. No classified information is included.',
  };

  await audit({ action: 'export', alias, role, messageCount: sanitized.length });
  return exportData;
}

/** Save an incident export to disk. */
export async function saveExport(exportData, outputPath) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(exportData, null, 2));
  log(`incident data exported to ${outputPath}`);
}

// --- Responder packet receiver ---

/**
 * Process an inbound packet with responder authentication.
 * Returns the packet enriched with verified role, or null if unauthorized.
 */
export async function processResponderPacket(packet, requiredChannel) {
  const responder = await verifyResponder(packet);
  if (!responder) {
    log('received unauthenticated packet claiming responder status — ignoring _responder flag');
    packet._responder = false;
    packet._role = null;
    return packet; // still forward as civilian message
  }

  if (requiredChannel && !canAccessChannel(responder.role, requiredChannel)) {
    log(`responder ${responder.alias} (${responder.role}) denied access to channel ${requiredChannel}`);
    await audit({ action: 'access-denied', alias: responder.alias, role: responder.role, channel: requiredChannel });
    return null;
  }

  await audit({ action: 'receive', alias: responder.alias, role: responder.role, packetId: packet.id?.slice(0, 16) });
  return { ...packet, _responder: true, _role: responder.role, _verifiedAlias: responder.alias };
}

// --- CLI ---
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const [, , cmd, ...args] = process.argv;
  if (cmd === 'audit') {
    const records = await readAuditLog(100);
    if (!records.length) { console.log('No audit records.'); }
    else records.forEach(r => console.log(JSON.stringify(r)));
  } else if (cmd === 'enrolled') {
    const enrolled = await loadEnrolled();
    console.log(JSON.stringify(enrolled, null, 2));
  } else {
    console.log('commands: audit | enrolled');
    console.log('Roles:', Object.keys(Role).join(', '));
  }
}

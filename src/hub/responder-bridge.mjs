/**
 * ARK Responder Bridge — responder identity, signed announcements, triage intake,
 * audit log, access control, and ICS-compatible export.
 *
 * Zero npm dependencies. Node 18+.
 * DEFENSIVE BY DEFAULT: every function has try/catch + fallback.
 *
 * EXPLICIT NOTICE: This system is for CIVILIAN emergency coordination only.
 * It is NOT for classified, military operational, or law enforcement use.
 * No classified or operationally sensitive information should be entered here.
 */

import { webcrypto } from 'node:crypto';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';

const { subtle } = webcrypto;
const ALG = { name: 'ECDSA', namedCurve: 'P-256' };
const SIG = { name: 'ECDSA', hash: 'SHA-256' };

const KEY_DIR = process.env.ARK_BRIDGE_DIR || join(homedir(), '.ark-bridge');
const AUDIT_FILE = process.env.ARK_AUDIT_FILE || join(KEY_DIR, 'audit-log.json');

const log = (...args) => console.log(new Date().toISOString(), '[responder-bridge]', ...args);
const warn = (...args) => console.warn(new Date().toISOString(), '[responder-bridge:WARN]', ...args);

// ---------------------------------------------------------------------------
// Role definitions
// ---------------------------------------------------------------------------

/**
 * Responder roles (ICS-aligned):
 *   IC  — Incident Commander (highest authority, can read all)
 *   OPS — Operations Section Chief
 *   LOG — Logistics Section Chief
 *   PIO — Public Information Officer
 *   MED — Medical / Health (can read sensitive health data)
 *   SEC — Safety Officer
 *
 * Access levels: IC=5, OPS=4, LOG=3, MED=3, PIO=2, SEC=4
 * Sensitive data visible to MED+ roles only (level >= 3).
 */
export const ROLES = Object.freeze({
  IC: { label: 'Incident Commander', level: 5 },
  OPS: { label: 'Operations', level: 4 },
  SEC: { label: 'Safety Officer', level: 4 },
  LOG: { label: 'Logistics', level: 3 },
  MED: { label: 'Medical', level: 3 },
  PIO: { label: 'Public Information', level: 2 },
});

export const VALID_ROLES = new Set(Object.keys(ROLES));
const SENSITIVE_MIN_LEVEL = 3;

export function roleLevel(role) {
  return ROLES[role]?.level ?? 0;
}

export function canReadSensitive(role) {
  return roleLevel(role) >= SENSITIVE_MIN_LEVEL;
}

// ---------------------------------------------------------------------------
// Crypto helpers
// ---------------------------------------------------------------------------

function sha256hex(data) {
  try {
    return createHash('sha256').update(typeof data === 'string' ? data : JSON.stringify(data)).digest('hex');
  } catch (err) {
    warn('sha256hex failed:', err.message);
    return '0'.repeat(64);
  }
}

async function atomicWrite(file, data) {
  try {
    await mkdir(dirname(file), { recursive: true });
    const tmp = file + '.tmp.' + process.pid;
    await writeFile(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
    await rename(tmp, file);
  } catch (err) {
    warn('atomicWrite failed for', file, ':', err.message);
    // Fallback: direct write
    try { await writeFile(file, JSON.stringify(data, null, 2), { mode: 0o600 }); } catch {}
  }
}

// ---------------------------------------------------------------------------
// Responder key management
// ---------------------------------------------------------------------------

/**
 * Load or create a P-256 ECDSA keypair for a responder.
 * Stored in ~/.ark-bridge/responder-key.json (private key never leaves this machine).
 * Returns a signer object with { publicKey, role, sign, cert }.
 */
export async function loadResponderKey(keyFile = null, roleHint = 'PIO') {
  const file = keyFile || join(KEY_DIR, 'responder-key.json');
  let jwk, cert;
  try {
    const stored = JSON.parse(await readFile(file, 'utf8'));
    jwk = stored.jwk;
    cert = stored.cert;
  } catch {
    // Generate new keypair
    try {
      const pair = await subtle.generateKey(ALG, true, ['sign', 'verify']);
      jwk = await subtle.exportKey('jwk', pair.privateKey);
      cert = null;
    } catch (err) {
      warn('Key generation failed:', err.message);
      throw new Error('Cannot generate responder key: ' + err.message);
    }
  }

  let key;
  try {
    key = await subtle.importKey('jwk', jwk, ALG, false, ['sign']);
  } catch (err) {
    warn('Key import failed:', err.message);
    throw new Error('Cannot import responder key: ' + err.message);
  }

  const publicKey = { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y };

  // Validate role
  const role = VALID_ROLES.has(cert?.role) ? cert.role : (VALID_ROLES.has(roleHint) ? roleHint : 'PIO');

  const signer = {
    publicKey,
    role,
    cert: cert || null,
    file,

    /** Sign any payload. Returns { payload, signature, public_key }. */
    async sign(payload) {
      try {
        const bytes = JSON.stringify(payload);
        const signature = Buffer.from(await subtle.sign(SIG, key, Buffer.from(bytes))).toString('base64url');
        return { payload, signature, public_key: publicKey };
      } catch (err) {
        warn('sign failed:', err.message);
        throw err;
      }
    },

    /** Issue a role certificate for this key. */
    async issueCert({ name, role: certRole, ttlHours = 720 }) {
      try {
        const r = VALID_ROLES.has(certRole) ? certRole : role;
        const now = Date.now();
        const certPayload = {
          type: 'responder-cert',
          role: r,
          name: String(name || 'Unknown').slice(0, 60),
          issued_at: new Date(now).toISOString(),
          expiry: new Date(now + ttlHours * 3600000).toISOString(),
          public_key: publicKey,
        };
        const bytes = JSON.stringify(certPayload);
        const signature = Buffer.from(await subtle.sign(SIG, key, Buffer.from(bytes))).toString('base64url');
        const newCert = { ...certPayload, signature };
        // Save updated cert
        await atomicWrite(file, { jwk, cert: newCert });
        cert = newCert;
        signer.cert = newCert;
        signer.role = r;
        return newCert;
      } catch (err) {
        warn('issueCert failed:', err.message);
        return null;
      }
    },
  };

  // Save if newly created
  try {
    if (!cert) await atomicWrite(file, { jwk, cert: null });
  } catch {}

  return signer;
}

/**
 * Verify a responder signed envelope. Returns { ok, role, name, payload }.
 * Never throws.
 */
export async function verifyResponderSignature(envelope) {
  try {
    if (!envelope || !envelope.payload || !envelope.signature || !envelope.public_key) {
      return { ok: false, reason: 'Missing fields' };
    }
    const { payload, signature, public_key } = envelope;
    const bytes = JSON.stringify(payload);
    const keyObj = await subtle.importKey('jwk', { ...public_key, key_ops: ['verify'] }, ALG, false, ['verify'])
      .catch(() => null);
    if (!keyObj) return { ok: false, reason: 'Bad public key' };
    const ok = await subtle.verify(SIG, keyObj, Buffer.from(signature, 'base64url'), Buffer.from(bytes));
    return { ok, role: payload.role || null, name: payload.name || null, payload };
  } catch (err) {
    warn('verifyResponderSignature error:', err.message);
    return { ok: false, reason: err.message };
  }
}

// ---------------------------------------------------------------------------
// Signed public announcements
// ---------------------------------------------------------------------------

/**
 * Build a signed responder announcement.
 * Returns signed envelope marked as OFFICIAL.
 * Never throws — returns null on error.
 */
export async function buildAnnouncement(signer, { text, channel = 'general', ttlHours = 24 }) {
  try {
    if (!signer || typeof signer.sign !== 'function') throw new Error('Invalid signer');
    if (!text || typeof text !== 'string') throw new Error('text required');
    const now = Date.now();
    const payload = {
      type: 'responder-announcement',
      role: signer.role,
      text: String(text).slice(0, 2000),
      channel: String(channel).slice(0, 40),
      issued_at: new Date(now).toISOString(),
      expires_at: new Date(now + Math.min(ttlHours, 168) * 3600000).toISOString(),
      official: true, // hub should mark this OFFICIAL
    };
    const envelope = await signer.sign(payload);
    return { ...envelope, official: true };
  } catch (err) {
    warn('buildAnnouncement failed:', err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Triage intake (START triage — NOT diagnosis)
// ---------------------------------------------------------------------------

/**
 * Triage tag colors (START protocol):
 *   RED    — Immediate: life-threatening, salvageable
 *   YELLOW — Delayed: serious but stable
 *   GREEN  — Minor: ambulatory ("walking wounded")
 *   BLACK  — Deceased / expectant (do not expend resources)
 *
 * IMPORTANT: This is for field coordination only.
 * Medical decisions must be made by licensed medical personnel.
 * patientId must be an anonymous token — never PII.
 */
export const TRIAGE_TAGS = Object.freeze(['RED', 'YELLOW', 'GREEN', 'BLACK']);

/**
 * Build a triage record. Returns structured record or null on error.
 * patientId must be an anonymous token generated externally.
 */
export function buildTriageRecord({ patientId, tag, location, notes = '', responderAlias = '' }) {
  try {
    if (!patientId || typeof patientId !== 'string') throw new Error('patientId required (anonymous token)');
    if (!TRIAGE_TAGS.includes(tag)) throw new Error(`tag must be one of: ${TRIAGE_TAGS.join(', ')}`);
    // Reject anything that looks like PII in patientId
    if (/\b[A-Z][a-z]+\s[A-Z][a-z]+\b/.test(patientId) || /@/.test(patientId) || /\d{3}-\d{2}-\d{4}/.test(patientId)) {
      throw new Error('patientId must be an anonymous token, not PII');
    }
    return {
      type: 'triage-record',
      patientId: String(patientId).slice(0, 32),
      tag,
      location: String(location || '').slice(0, 120),
      notes: String(notes).slice(0, 500),
      responderAlias: String(responderAlias || 'unknown').slice(0, 40),
      recordedAt: new Date().toISOString(),
      // Sensitive: only visible to MED+ roles
      sensitive: true,
    };
  } catch (err) {
    warn('buildTriageRecord failed:', err.message);
    return null;
  }
}

/**
 * Post a triage record to the hub.
 * Returns { ok, id } or { ok: false, reason }.
 * Never throws.
 */
export async function postTriageRecord(signer, record, hubUrl = 'http://localhost:7700') {
  try {
    if (!record) return { ok: false, reason: 'No record' };
    const envelope = await signer.sign(record);
    const response = await fetch(`${hubUrl}/api/triage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
      signal: AbortSignal.timeout(10000),
    }).catch(err => { throw new Error('Network error: ' + err.message); });
    const body = await response.json().catch(() => ({}));
    return { ok: response.ok, id: body.id || null, status: response.status };
  } catch (err) {
    warn('postTriageRecord failed:', err.message);
    return { ok: false, reason: err.message };
  }
}

// ---------------------------------------------------------------------------
// Cryptographically chained audit log
// ---------------------------------------------------------------------------

/**
 * Append-only audit log where each entry hashes the previous.
 * Stored locally and pushed to hub.
 */
export function createAuditLog(logFile = AUDIT_FILE) {
  let entries = [];
  let loaded = false;

  const load = async () => {
    if (loaded) return;
    try {
      entries = JSON.parse(await readFile(logFile, 'utf8'));
      if (!Array.isArray(entries)) entries = [];
    } catch { entries = []; }
    loaded = true;
  };

  const persist = async () => {
    try { await atomicWrite(logFile, entries); } catch (err) { warn('audit persist failed:', err.message); }
  };

  const prevHash = () => {
    if (!entries.length) return '0'.repeat(64);
    return entries[entries.length - 1].hash;
  };

  return {
    async append({ role, action, target = '', meta = {} }) {
      try {
        await load();
        const entry = {
          timestamp: new Date().toISOString(),
          role: String(role || 'UNKNOWN').slice(0, 10),
          action: String(action || 'UNKNOWN').slice(0, 80),
          target: String(target).slice(0, 200),
          meta,
          prev: prevHash(),
        };
        // Hash = sha256(prev + timestamp + role + action + target)
        entry.hash = sha256hex(`${entry.prev}|${entry.timestamp}|${entry.role}|${entry.action}|${entry.target}`);
        entries.push(entry);
        await persist();
        return entry;
      } catch (err) {
        warn('audit.append failed:', err.message);
        return null;
      }
    },

    async getAll() {
      try { await load(); } catch {}
      return [...entries];
    },

    async export() {
      try {
        await load();
        return { entries: [...entries], exported_at: new Date().toISOString(), count: entries.length };
      } catch (err) {
        warn('audit.export failed:', err.message);
        return { entries: [], exported_at: new Date().toISOString(), count: 0 };
      }
    },

    /** Verify chain integrity. Returns { ok, brokenAt }. */
    async verify() {
      try {
        await load();
        let prev = '0'.repeat(64);
        for (let i = 0; i < entries.length; i++) {
          const e = entries[i];
          const expected = sha256hex(`${prev}|${e.timestamp}|${e.role}|${e.action}|${e.target}`);
          if (e.hash !== expected) return { ok: false, brokenAt: i, entry: e };
          if (e.prev !== prev) return { ok: false, brokenAt: i, reason: 'prev mismatch' };
          prev = e.hash;
        }
        return { ok: true, entries: entries.length };
      } catch (err) {
        return { ok: false, reason: err.message };
      }
    },

    /** Push log to hub. Returns { ok }. Never throws. */
    async pushToHub(hubUrl = 'http://localhost:7700') {
      try {
        await load();
        const resp = await fetch(`${hubUrl}/api/audit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entries }),
          signal: AbortSignal.timeout(15000),
        }).catch(err => { throw new Error('Network: ' + err.message); });
        return { ok: resp.ok, status: resp.status };
      } catch (err) {
        warn('audit.pushToHub failed:', err.message);
        return { ok: false, reason: err.message };
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Access control / message filtering
// ---------------------------------------------------------------------------

/**
 * Filter a list of messages based on role access.
 * - Sensitive messages only visible to MED+ roles.
 * - Location data: anonymized to zone for all roles (never raw coordinates publicly).
 * - This system is for CIVILIAN coordination only — no classified info is filtered
 *   because classified info must NEVER be entered here in the first place.
 */
export function filterMessagesForRole(messages, role) {
  try {
    const level = roleLevel(role);
    return (messages || [])
      .filter(msg => {
        if (!msg) return false;
        // Sensitive messages: only MED+ roles
        if (msg.sensitive && level < SENSITIVE_MIN_LEVEL) return false;
        return true;
      })
      .map(msg => {
        // Anonymize location data (zone only, not coordinates)
        if (msg.location && typeof msg.location === 'string') {
          const redacted = { ...msg };
          // Strip anything that looks like lat/lon coordinates
          redacted.location = msg.location.replace(/[-+]?\d+\.\d{4,}[,\s]+[-+]?\d+\.\d{4,}/g, '[LOCATION ZONE]');
          return redacted;
        }
        return msg;
      });
  } catch (err) {
    warn('filterMessagesForRole error:', err.message);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Authorized export interface (NIMS/ICS compatible)
// ---------------------------------------------------------------------------

/**
 * Export incident data in a structured format compatible with NIMS/ICS.
 * Redacts PII: aliases kept, locations anonymized to zone.
 * Returns JSON string or null on error.
 */
export async function exportIncidentData(options = {}) {
  try {
    const {
      fromTime = null,
      toTime = null,
      roles = [],
      channels = [],
      auditLog = null,
      messages = [],
      triageRecords = [],
      exporterRole = 'IC',
    } = options;

    // Only IC or OPS can export
    if (!['IC', 'OPS'].includes(exporterRole)) {
      throw new Error('Export requires IC or OPS role');
    }

    const from = fromTime ? new Date(fromTime).getTime() : 0;
    const to = toTime ? new Date(toTime).getTime() : Date.now();

    const filterByTime = items => items.filter(item => {
      const t = Date.parse(item.issued_at || item.recordedAt || item.timestamp || '');
      return !isNaN(t) && t >= from && t <= to;
    });

    const filterByRole = items => !roles.length ? items : items.filter(i => roles.includes(i.role));
    const filterByChannel = items => !channels.length ? items : items.filter(i => channels.includes(i.channel));

    // Anonymize location
    const anonymizeLocation = (loc = '') => {
      if (!loc) return '';
      return loc.replace(/[-+]?\d+\.\d{4,}[,\s]+[-+]?\d+\.\d{4,}/g, '[ZONE]');
    };

    // Redact messages: keep alias, anonymize location, strip PII patterns
    const redactMessage = msg => ({
      ...msg,
      location: anonymizeLocation(msg.location || ''),
      text: (msg.text || '').replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[PHONE]')
                            .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL]'),
    });

    const filteredMessages = filterByChannel(filterByRole(filterByTime(messages))).map(redactMessage);
    const filteredTriage = filterByTime(triageRecords); // triage already uses anon tokens

    const auditData = auditLog ? await auditLog.export().catch(() => ({ entries: [] })) : { entries: [] };
    const auditFiltered = filterByTime(auditData.entries);

    const export_ = {
      format: 'ARK-ICS-EXPORT-1',
      exported_at: new Date().toISOString(),
      exported_by_role: exporterRole,
      period: {
        from: fromTime || null,
        to: toTime || new Date().toISOString(),
      },
      filters: { roles, channels },
      incident_data: {
        messages: filteredMessages,
        triage: filteredTriage,
      },
      audit_trail: auditFiltered,
      totals: {
        messages: filteredMessages.length,
        triage: filteredTriage.length,
        audit_entries: auditFiltered.length,
      },
      disclaimer: 'CIVILIAN EMERGENCY COORDINATION DATA ONLY. Contains no classified or operationally sensitive information.',
    };

    return JSON.stringify(export_, null, 2);
  } catch (err) {
    warn('exportIncidentData failed:', err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Convenience: create a fully initialized responder session
// ---------------------------------------------------------------------------

/**
 * Initialize a responder session: load key, create audit log.
 * Returns { signer, auditLog, buildAnnouncement, buildTriageRecord, postTriageRecord, exportIncidentData }.
 */
export async function createResponderSession({ keyFile = null, role = 'PIO', name = 'Responder', hubUrl = 'http://localhost:7700' } = {}) {
  const signer = await loadResponderKey(keyFile, role).catch(err => {
    warn('Could not load responder key:', err.message);
    return null;
  });

  if (!signer) throw new Error('Responder key unavailable — cannot create session');

  const auditLog = createAuditLog();

  // Instrument sign to auto-append to audit log
  const origSign = signer.sign.bind(signer);
  signer.sign = async payload => {
    const result = await origSign(payload);
    await auditLog.append({
      role: signer.role,
      action: payload.type || 'sign',
      target: payload.channel || payload.patientId || '',
      meta: { official: payload.official || false },
    }).catch(() => {});
    return result;
  };

  return {
    signer,
    auditLog,
    role: signer.role,
    name,
    hubUrl,
    buildAnnouncement: (opts) => buildAnnouncement(signer, opts),
    buildTriageRecord,
    postTriageRecord: (record) => postTriageRecord(signer, record, hubUrl),
    filterMessagesForRole: (msgs) => filterMessagesForRole(msgs, signer.role),
    exportIncidentData: (opts) => exportIncidentData({ ...opts, auditLog, exporterRole: signer.role }),
  };
}

// ---------------------------------------------------------------------------
// Module self-test
// ---------------------------------------------------------------------------

if (process.argv.includes('--selftest')) {
  const { mkdtemp } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const dir = await mkdtemp(join(tmpdir(), 'ark-bridge-test-'));

  console.log('--- responder-bridge.mjs self-test ---');

  // Key generation
  const signer = await loadResponderKey(join(dir, 'test-key.json'), 'IC');
  console.log('loadResponderKey:', signer ? 'OK' : 'FAIL');

  // Cert issuance
  const cert = await signer.issueCert({ name: 'Test IC', role: 'IC', ttlHours: 1 });
  console.log('issueCert:', cert ? 'OK' : 'FAIL');

  // Announcement
  const ann = await buildAnnouncement(signer, { text: 'Test announcement', channel: 'general' });
  console.log('buildAnnouncement:', ann ? 'OK' : 'FAIL');

  // Verify signature
  const v = await verifyResponderSignature(ann);
  console.log('verifyResponderSignature:', v.ok ? 'OK' : 'FAIL');

  // Triage
  const triage = buildTriageRecord({ patientId: 'PT-001-ANON', tag: 'RED', location: 'Grid A3', notes: 'Conscious', responderAlias: 'MED-1' });
  console.log('buildTriageRecord:', triage ? 'OK' : 'FAIL');

  // PII rejection
  const badTriage = buildTriageRecord({ patientId: 'John Smith', tag: 'GREEN', location: 'north' });
  console.log('buildTriageRecord rejects PII name:', badTriage === null ? 'OK' : 'FAIL');

  // Audit log
  const audit = createAuditLog(join(dir, 'audit.json'));
  await audit.append({ role: 'IC', action: 'test', target: 'self' });
  await audit.append({ role: 'IC', action: 'test2', target: 'other' });
  const { ok: chainOk } = await audit.verify();
  console.log('audit chain verify:', chainOk ? 'OK' : 'FAIL');

  // Role access
  const msgs = [
    { text: 'public msg', sensitive: false },
    { text: 'sensitive medical', sensitive: true },
  ];
  const medFiltered = filterMessagesForRole(msgs, 'MED');
  const pioFiltered = filterMessagesForRole(msgs, 'PIO');
  console.log('MED sees sensitive:', medFiltered.length === 2 ? 'OK' : 'FAIL');
  console.log('PIO blocked from sensitive:', pioFiltered.length === 1 ? 'OK' : 'FAIL');

  // Export
  const exported = await exportIncidentData({ exporterRole: 'IC', messages: msgs.map(m => ({ ...m, issued_at: new Date().toISOString(), channel: 'general' })), auditLog: audit });
  console.log('exportIncidentData:', exported ? 'OK' : 'FAIL');

  console.log('--- self-test done ---');
}

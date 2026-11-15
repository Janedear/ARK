/**
 * ARK SMS bridge — multi-gateway SMS integration.
 *
 * Supports:
 *   - Android SMS Gateway (capcom6/android-sms-gateway, open source)
 *   - Twilio fallback
 *   - Local GSM modem (AT commands via serial)
 *
 * Texts received -> signed public packet -> ARK queue -> gateway
 * ARK messages   -> SMS to registered phone numbers
 *
 * ARK packets in SMS: Base64url-encoded compact JSON for efficiency.
 * Phone registry: map phone numbers to human aliases.
 */
import { buildPacket } from './lib-envelope.mjs';
import { enqueue, flush } from './lib-queue.mjs';
import { pushPackets, fetchFeed, onStatusChange, Status } from './lib-gateway.mjs';

const log = (...args) => console.log(new Date().toISOString(), ...args);

// --- Configuration ---
const arkChannel = process.env.ARK_CHANNEL || 'local';
const alias = (process.env.ARK_ALIAS || 'sms-relay').slice(0, 40);
const maxSmsChars = Number(process.env.SMS_MAX_CHARS || 300);
const pollMs = Number(process.env.ARK_POLL_MS || 60000);

// Rate limiting: max messages per phone per hour
const RATE_LIMIT = Number(process.env.SMS_RATE_LIMIT || 10);
const rateCounts = new Map(); // phone -> { count, resetAt }

function checkRateLimit(phone) {
  const now = Date.now();
  const entry = rateCounts.get(phone);
  if (!entry || entry.resetAt < now) {
    rateCounts.set(phone, { count: 1, resetAt: now + 3600000 });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// Phone number registry: map numbers to aliases
const phoneRegistry = new Map();
(process.env.SMS_PHONE_REGISTRY || '').split(',').forEach(pair => {
  const [phone, name] = pair.split('=').map(s => s.trim());
  if (phone && name) phoneRegistry.set(phone, name);
});

function phoneAlias(phone) {
  return phoneRegistry.get(phone) || phone;
}

// Delivery tracking: messageId -> { phone, text, status, sentAt }
const deliveryTracking = new Map();

// --- Android SMS Gateway ---
const androidBase = (process.env.SMS_GATEWAY_URL || '').replace(/\/$/, '');
const androidUser = process.env.SMS_GATEWAY_USER || '';
const androidPass = process.env.SMS_GATEWAY_PASSWORD || '';
const androidAuth = {
  'Content-Type': 'application/json',
  ...(androidUser ? { Authorization: 'Basic ' + Buffer.from(`${androidUser}:${androidPass}`).toString('base64') } : {}),
};

async function androidReadInbox() {
  const response = await fetch(`${androidBase}/api/v1/messages?limit=20`, { headers: androidAuth });
  if (!response.ok) throw new Error('Android SMS gateway returned ' + response.status);
  const body = await response.json();
  return body.data || body.items || [];
}

async function androidSend(phone, text) {
  const response = await fetch(`${androidBase}/api/v1/messages`, {
    method: 'POST',
    headers: androidAuth,
    body: JSON.stringify({ message: text, phoneNumbers: [phone] }),
  });
  if (!response.ok) throw new Error('Android send failed: ' + response.status);
  const result = await response.json();
  return result.id || result.messageId;
}

async function androidBroadcast(phones, text) {
  const response = await fetch(`${androidBase}/api/v1/messages`, {
    method: 'POST',
    headers: androidAuth,
    body: JSON.stringify({ message: text, phoneNumbers: phones }),
  });
  if (!response.ok) throw new Error('Android broadcast failed: ' + response.status);
  return response.json();
}

// --- Twilio Gateway ---
const twilioSid = process.env.TWILIO_SID || '';
const twilioToken = process.env.TWILIO_AUTH_TOKEN || '';
const twilioFrom = process.env.TWILIO_FROM || '';

async function twilioSend(phone, text) {
  if (!twilioSid || !twilioToken || !twilioFrom) throw new Error('Twilio not configured');
  const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
  const body = new URLSearchParams({ To: phone, From: twilioFrom, Body: text });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + auth, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error('Twilio error: ' + (err.message || response.status));
  }
  const result = await response.json();
  return result.sid;
}

// --- Gateway selector ---
async function sendSms(phone, text) {
  if (!checkRateLimit(phone)) {
    log('rate limit hit for', phone, '— message dropped');
    return null;
  }
  let msgId = null;
  if (androidBase) {
    try { msgId = await androidSend(phone, text); } catch (err) { log('Android send failed:', err.message); }
  }
  if (!msgId && twilioSid) {
    try { msgId = await twilioSend(phone, text); } catch (err) { log('Twilio send failed:', err.message); }
  }
  if (msgId) {
    deliveryTracking.set(msgId, { phone, text: text.slice(0, 80), status: 'sent', sentAt: Date.now() });
  }
  return msgId;
}

/** Broadcast an ARK text to multiple phone numbers. */
async function broadcastSms(phones, text) {
  if (androidBase && phones.length > 1) {
    try {
      const filtered = phones.filter(p => checkRateLimit(p));
      if (filtered.length) return androidBroadcast(filtered, text);
    } catch (err) { log('broadcast failed:', err.message); }
  }
  // Fallback: individual sends
  return Promise.allSettled(phones.map(p => sendSms(p, text)));
}

/** Detect if an SMS text contains an ARK packet (Base64url-encoded JSON). */
function extractArkPacket(text) {
  // ARK packets in SMS are prefixed with "ARK:" then Base64url-encoded JSON
  const match = text.match(/ARK:([A-Za-z0-9_-]{20,})/);
  if (!match) return null;
  try {
    const decoded = Buffer.from(match[1], 'base64url').toString('utf8');
    const packet = JSON.parse(decoded);
    if (packet.v && packet.kind && packet.channel) return packet;
  } catch {}
  return null;
}

/** Encode an ARK packet as SMS-safe text. */
function encodeArkPacketForSms(packet) {
  const compact = JSON.stringify({ v: packet.v, kind: packet.kind, channel: packet.channel, alias: packet.alias, text: packet.text, id: packet.id?.slice(0, 16) });
  return 'ARK:' + Buffer.from(compact).toString('base64url');
}

// Deduplication
const seen = new Set();
const sentOut = new Set();

async function pollInbox() {
  if (!androidBase) return;
  try {
    for (const message of await androidReadInbox()) {
      const rawText = (message.message || '').trim();
      const received = String(message.state || message.status || '').toLowerCase();
      if (!rawText || !received.includes('receiv')) continue;
      if (seen.has(message.id)) continue;
      seen.add(message.id);

      const fromPhone = message.phoneNumber || message.from || 'unknown';
      const fromAlias = phoneAlias(fromPhone);
      log('SMS received from', fromAlias, ':', rawText.slice(0, 60));

      // Check for embedded ARK packet
      const embeddedPacket = extractArkPacket(rawText);
      if (embeddedPacket) {
        // Forward directly to ARK hub
        try {
          await pushPackets([embeddedPacket]);
          log('forwarded embedded ARK packet from SMS:', embeddedPacket.id?.slice(0, 16));
        } catch (err) {
          log('failed to forward embedded packet:', err.message);
          await enqueue(embeddedPacket);
        }
        continue;
      }

      // Treat raw SMS text as a new ARK message
      const text = `[${fromAlias}] ${rawText}`;
      const packet = await buildPacket({ channel: arkChannel, alias, text });
      const depth = await enqueue(packet);
      log('text queued:', text.slice(0, 60), '| queue:', depth);
    }
  } catch (error) {
    log('inbox read failed:', error.message);
  }
}

async function drain() {
  try {
    const result = await flush(pushPackets);
    if (result.sent || result.expired) log('sent:', result.sent, 'waiting:', result.left, 'expired:', result.expired);
  } catch (error) {
    log('gateway push failed:', error.message);
  }
}

/** Load recipients from env + phone registry. */
function getRecipients() {
  return (process.env.SMS_TO || '').split(',').map(n => n.trim()).filter(Boolean);
}

async function sendOut() {
  const recipients = getRecipients();
  if (!androidBase && !twilioSid) return;
  if (!recipients.length) return;
  try {
    const feed = await fetchFeed(arkChannel);
    const newPackets = (feed.packets || []).filter(item => {
      const env = item.envelope;
      return env && env.kind === 'message' && !sentOut.has(env.id);
    });

    if (!newPackets.length) return;

    for (const item of newPackets) {
      const env = item.envelope;
      sentOut.add(env.id);
      const text = env.text.slice(0, maxSmsChars);

      if (recipients.length === 1) {
        const msgId = await sendSms(recipients[0], text);
        if (msgId) log('SMS sent to', phoneAlias(recipients[0]), ':', text.slice(0, 60));
        else log('SMS send failed for', recipients[0]);
      } else {
        await broadcastSms(recipients, text);
        log('SMS broadcast to', recipients.length, 'recipients:', text.slice(0, 60));
      }
    }
  } catch (error) {
    log('feed read failed:', error.message);
  }
}

/** Get delivery status for tracked messages. */
export function getDeliveryStats() {
  const all = [...deliveryTracking.values()];
  return {
    total: all.length,
    sent: all.filter(m => m.status === 'sent').length,
    failed: all.filter(m => m.status === 'failed').length,
    rateEntries: rateCounts.size,
  };
}

/** Add or update a phone number in the registry. */
export function registerPhone(phone, alias) {
  phoneRegistry.set(phone, alias);
  log('registered phone:', phone, '->', alias);
}

// ============================================================
// SECTION 6: SMS Bridge Capacity Indicators and Power Status
// ============================================================

// SMS link capacity tracking
const smsStats = {
  sentCount: 0,
  receivedCount: 0,
  failedCount: 0,
  bytesSent: 0,
  bytesReceived: 0,
  lastActivityAt: null,
  gatewayLastSeenAt: null,
  windowStart: Date.now(),
};

function recordSmsTx(text) {
  smsStats.sentCount++;
  smsStats.bytesSent += Buffer.byteLength(text, 'utf8');
  smsStats.lastActivityAt = Date.now();
  smsStats.gatewayLastSeenAt = Date.now();
}

function recordSmsRx(text) {
  smsStats.receivedCount++;
  smsStats.bytesReceived += Buffer.byteLength(text, 'utf8');
  smsStats.lastActivityAt = Date.now();
  smsStats.gatewayLastSeenAt = Date.now();
}

/** Get SMS bridge capacity stats. */
export function getSmsStats() {
  const now = Date.now();
  const windowSecs = (now - smsStats.windowStart) / 1000;
  return {
    sentCount: smsStats.sentCount,
    receivedCount: smsStats.receivedCount,
    failedCount: smsStats.failedCount,
    txBytesPerSec: windowSecs > 0 ? (smsStats.bytesSent / windowSecs).toFixed(2) : 0,
    rxBytesPerSec: windowSecs > 0 ? (smsStats.bytesReceived / windowSecs).toFixed(2) : 0,
    gatewayLastSeenMs: smsStats.gatewayLastSeenAt ? now - smsStats.gatewayLastSeenAt : null,
    gatewayStale: smsStats.gatewayLastSeenAt ? (now - smsStats.gatewayLastSeenAt > 600000) : true,
  };
}

// Bandwidth-aware message prioritization for SMS
// Same urgency ordering as radio bridge
const SMS_KIND_PRIORITY = { alert: 0, message: 1, resource: 3, peer: 2 };
function smsPriority(packet) { return SMS_KIND_PRIORITY[packet.kind] ?? 1; }

if (!androidBase && !twilioSid) log('No SMS gateway configured. Set SMS_GATEWAY_URL or TWILIO_SID.');
if (!getRecipients().length) log('SMS_TO is empty, so ARK messages will not be texted out.');

// Gateway reconnect: flush on recovery
onStatusChange(status => {
  if (status === Status.CONNECTED) drain();
});

pollInbox();
setInterval(pollInbox, pollMs);
drain();
setInterval(drain, 30000);
setInterval(sendOut, pollMs);

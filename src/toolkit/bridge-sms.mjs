/**
 * ARK SMS bridge — an open-source SMS gateway on a spare Android phone.
 *
 * Works with "SMS Gateway for Android" (capcom6/android-sms-gateway, open source,
 * no per-message fee). Any gateway with the same HTTP shape will do.
 *
 * Texts received -> signed public packet -> ARK queue -> gateway
 * ARK messages   -> SMS to the numbers you list in SMS_TO
 */
import { buildPacket } from '../lib/envelope.mjs';
import { enqueue, flush } from '../lib/queue.mjs';
import { pushPackets, fetchFeed } from '../lib/gateway.mjs';

const base = (process.env.SMS_GATEWAY_URL || '').replace(/\/$/, '');
const user = process.env.SMS_GATEWAY_USER || '';
const pass = process.env.SMS_GATEWAY_PASSWORD || '';
const arkChannel = process.env.ARK_CHANNEL || 'local';
const alias = (process.env.ARK_ALIAS || 'sms-relay').slice(0, 40);
const recipients = (process.env.SMS_TO || '').split(',').map(n => n.trim()).filter(Boolean);
const maxSmsChars = Number(process.env.SMS_MAX_CHARS || 300);

const log = (...args) => console.log(new Date().toISOString(), ...args);

const auth = {
  'Content-Type': 'application/json',
  ...(user ? { Authorization: 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64') } : {}),
};

async function readInbox() {
  const response = await fetch(`${base}/api/v1/messages?limit=20`, { headers: auth });
  if (!response.ok) throw new Error('SMS gateway returned ' + response.status);
  const body = await response.json();
  return body.data || body.items || [];
}

const seen = new Set();

async function pollInbox() {
  if (!base) return;
  try {
    for (const message of await readInbox()) {
      const text = (message.message || '').trim();
      const received = String(message.state || message.status || '').toLowerCase();
      if (!text || !received.includes('receiv')) continue;
      if (seen.has(message.id)) continue;
      seen.add(message.id);
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

const sent = new Set();

async function sendOut() {
  if (!base || !recipients.length) return;
  try {
    const feed = await fetchFeed(arkChannel);
    for (const item of feed.packets || []) {
      const env = item.envelope;
      if (!env || env.kind !== 'message' || sent.has(env.id)) continue;
      sent.add(env.id);
      const response = await fetch(`${base}/api/v1/messages`, {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ message: env.text.slice(0, maxSmsChars), phoneNumbers: recipients }),
      });
      if (!response.ok) log('SMS send failed:', response.status);
      else log('SMS handed to gateway:', env.text.slice(0, 60));
    }
  } catch (error) {
    log('feed read failed:', error.message);
  }
}

if (!base) log('SMS_GATEWAY_URL is empty, so this bridge will not run.');
if (!recipients.length) log('SMS_TO is empty, so ARK messages will not be texted out.');

pollInbox();
setInterval(pollInbox, Number(process.env.ARK_POLL_MS || 60000));
drain();
setInterval(drain, 30000);
setInterval(sendOut, Number(process.env.ARK_POLL_MS || 60000));
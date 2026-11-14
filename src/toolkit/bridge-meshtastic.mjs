/**
 * ARK radio bridge — Meshtastic (open-source firmware, open public MQTT channel).
 *
 * Radio text in  -> signed public packet -> ARK queue -> gateway
 * ARK messages   -> MQTT publish -> your Meshtastic node transmits
 *
 * Requires: a Meshtastic node connected to an MQTT broker (open-source, free).
 * Public broker default is the community one; self-host Mosquitto for anything real.
 */
import mqtt from 'mqtt';
import { buildPacket } from '../lib/envelope.mjs';
import { enqueue, flush } from '../lib/queue.mjs';
import { pushPackets, fetchFeed } from '../lib/gateway.mjs';

const root = process.env.MESH_ROOT || 'msh/US';
const channelName = process.env.MESH_CHANNEL_NAME || 'LongFast';
const channelIndex = Number(process.env.MESH_CHANNEL_INDEX || 0);
const arkChannel = process.env.ARK_CHANNEL || 'local';
const nodeId = process.env.MESH_NODE_ID || '';
const alias = (process.env.ARK_ALIAS || 'radio-relay').slice(0, 40);
const maxRadioChars = Number(process.env.MESH_MAX_CHARS || 200);

const log = (...args) => console.log(new Date().toISOString(), ...args);

const client = mqtt.connect(process.env.MESH_BROKER_URL || 'mqtts://mqtt.meshtastic.org:8883', {
  username: process.env.MESH_USERNAME || 'meshdev',
  password: process.env.MESH_PASSWORD || 'large4cats',
  clientId: 'ark-radio-' + Math.random().toString(16).slice(2, 10),
});

const listenTopic = `${root}/2/json/${channelName}/#`;

client.on('connect', () => {
  log('connected to broker; listening on', listenTopic);
  client.subscribe(listenTopic, { qos: 0 });
});

client.on('error', error => log('broker error:', error.message));

client.on('message', async (_topic, payload) => {
  try {
    const frame = JSON.parse(payload.toString());
    const text = frame?.payload?.text?.trim();
    if (frame.type !== 'text' || !text) return;
    const packet = await buildPacket({ channel: arkChannel, alias, text });
    const depth = await enqueue(packet);
    log('radio text queued:', text.slice(0, 60), '| queue:', depth);
  } catch (error) {
    log('could not read a radio frame:', error.message);
  }
});

// Inbound to ARK
async function drain() {
  try {
    const result = await flush(pushPackets);
    if (result.sent || result.expired) log('sent:', result.sent, 'waiting:', result.left, 'expired:', result.expired);
  } catch (error) {
    log('gateway push failed:', error.message);
  }
}

// Outbound to radio. Restarting may resend the most recent messages once.
const transmitted = new Set();

async function relayOut() {
  if (!nodeId) return;
  try {
    const feed = await fetchFeed(arkChannel);
    for (const item of feed.packets || []) {
      const env = item.envelope;
      if (!env || env.kind !== 'message' || transmitted.has(env.id)) continue;
      transmitted.add(env.id);
      client.publish(
        `${root}/2/json/${channelName}/${nodeId}`,
        JSON.stringify({ type: 'sendtext', payload: env.text.slice(0, maxRadioChars), channel: channelIndex }),
      );
      log('handed to radio:', env.text.slice(0, 60));
    }
  } catch (error) {
    log('feed read failed:', error.message);
  }
}

if (!nodeId) log('MESH_NODE_ID is empty, so ARK messages will not be sent out over radio.');

drain();
setInterval(drain, 30000);
setInterval(relayOut, Number(process.env.ARK_POLL_MS || 60000));
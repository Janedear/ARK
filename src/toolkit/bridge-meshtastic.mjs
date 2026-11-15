/**
 * ARK radio bridge — Meshtastic (open-source firmware, open public MQTT channel).
 *
 * Radio text in  -> signed public packet -> ARK queue -> gateway
 * ARK messages   -> MQTT publish -> your Meshtastic node transmits
 *
 * Requires: a Meshtastic node connected to an MQTT broker.
 * Public broker default is the community one; self-host Mosquitto for anything real.
 *
 * ARK-BIN-1 binary encoding for LoRa efficiency.
 * Multi-hop relay support with configurable TTL.
 */
import mqtt from 'mqtt';
import { readFile } from 'node:fs/promises';
import { buildPacket, encodeBinary, decodeBinary, splitForLoRa, validatePacket } from './lib-envelope.mjs';
import { enqueue, flush } from './lib-queue.mjs';
import { pushPackets, fetchFeed, onStatusChange, getStatus, Status } from './lib-gateway.mjs';

// Config file support
async function loadConfig() {
  try {
    return JSON.parse(await readFile('meshtastic.config.json', 'utf8'));
  } catch {
    return {};
  }
}

const cfg = await loadConfig();

const root = cfg.meshRoot || process.env.MESH_ROOT || 'msh/US';
const channelName = cfg.channelName || process.env.MESH_CHANNEL_NAME || 'LongFast';
const channelIndex = Number(cfg.channelIndex ?? process.env.MESH_CHANNEL_INDEX ?? 0);
const arkChannel = cfg.arkChannel || process.env.ARK_CHANNEL || 'local';
const nodeId = cfg.nodeId || process.env.MESH_NODE_ID || '';
const alias = (cfg.alias || process.env.ARK_ALIAS || 'radio-relay').slice(0, 40);
const maxRadioChars = Number(cfg.maxRadioChars ?? process.env.MESH_MAX_CHARS ?? 200);
const maxHops = Number(cfg.maxHops ?? process.env.MESH_MAX_HOPS ?? 3);
const useBinary = (cfg.useBinary ?? process.env.MESH_BINARY ?? 'false') === 'true' || cfg.useBinary === true;
const brokerUrl = cfg.brokerUrl || process.env.MESH_BROKER_URL || 'mqtts://mqtt.meshtastic.org:8883';

// Channel mapping: ARK channel names -> Meshtastic channel indices
const channelMap = cfg.channelMap || {};
function arkToMeshChannel(arkChan) {
  return channelMap[arkChan] ?? channelIndex;
}

// ANSI status colors for terminal LED simulation
const LED = {
  green: msg => console.log('\x1b[32m[LED-ON ]\x1b[0m', msg),
  yellow: msg => console.log('\x1b[33m[LED-YLW]\x1b[0m', msg),
  red: msg => console.log('\x1b[31m[LED-ERR]\x1b[0m', msg),
  blue: msg => console.log('\x1b[34m[LED-RX ]\x1b[0m', msg),
  cyan: msg => console.log('\x1b[36m[LED-TX ]\x1b[0m', msg),
};

const log = (...args) => console.log(new Date().toISOString(), ...args);

// Message deduplication by id prefix (tracks seen 8-byte id prefixes)
const seenIds = new Set();
const MAX_SEEN = 1000;
function markSeen(id) {
  if (seenIds.size > MAX_SEEN) {
    const first = seenIds.values().next().value;
    seenIds.delete(first);
  }
  seenIds.add(id);
}
function hasSeen(id) { return seenIds.has(id); }

// Node discovery: track nearby Meshtastic nodes
const discoveredNodes = new Map(); // nodeId -> { alias, rssi, snr, lastSeen }

function updateNode(frame) {
  const id = frame.from || frame.sender;
  if (!id) return;
  discoveredNodes.set(String(id), {
    alias: frame?.payload?.longName || frame?.payload?.shortName || String(id),
    rssi: frame.rssi ?? null,
    snr: frame.snr ?? null,
    lastSeen: Date.now(),
    channel: frame.channel ?? channelIndex,
  });
}

export function getDiscoveredNodes() {
  return [...discoveredNodes.entries()].map(([id, info]) => ({ id, ...info }));
}

// Reconnect state
let reconnectAttempt = 0;
let connected = false;

const clientOptions = {
  username: cfg.mqttUser || process.env.MESH_USERNAME || 'meshdev',
  password: cfg.mqttPassword || process.env.MESH_PASSWORD || 'large4cats',
  clientId: 'ark-radio-' + Math.random().toString(16).slice(2, 10),
  reconnectPeriod: 0, // manual reconnect for exponential backoff
};

let client;

function connect() {
  client = mqtt.connect(brokerUrl, clientOptions);

  const listenTopic = `${root}/2/json/${channelName}/#`;

  client.on('connect', () => {
    reconnectAttempt = 0;
    connected = true;
    LED.green('connected to broker; listening on ' + listenTopic);
    client.subscribe(listenTopic, { qos: 0 });
    client.subscribe(`${root}/2/json/${channelName}/nodeinfo/#`, { qos: 0 });
  });

  client.on('error', error => {
    LED.red('broker error: ' + error.message);
  });

  client.on('close', () => {
    connected = false;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), 60000);
    reconnectAttempt++;
    LED.yellow(`disconnected, reconnecting in ${delay}ms (attempt ${reconnectAttempt})`);
    setTimeout(connect, delay);
  });

  client.on('message', async (topic, payload) => {
    try {
      const frame = JSON.parse(payload.toString());
      updateNode(frame);

      // Nodeinfo / discovery frames
      if (frame.type === 'nodeinfo') {
        log('discovered node:', frame.from, frame?.payload?.longName);
        return;
      }

      // Signal strength reporting
      if (frame.rssi !== undefined || frame.snr !== undefined) {
        log(`signal: RSSI=${frame.rssi ?? 'n/a'} SNR=${frame.snr ?? 'n/a'} from=${frame.from}`);
      }

      // Multi-hop relay: check hop count
      const hopCount = frame.hopLimit ?? frame.hopStart ?? maxHops;
      if (hopCount <= 0) {
        log('dropping packet: exceeded max hops');
        return;
      }

      let text;

      if (useBinary && frame.type === 'binary') {
        // ARK-BIN-1 binary packet
        const buf = Buffer.from(frame?.payload?.data || '', 'base64');
        try {
          const decoded = decodeBinary(buf);
          if (hasSeen(decoded.idPrefix)) return;
          markSeen(decoded.idPrefix);
          text = decoded.text;
          LED.blue('received binary ARK-BIN-1 packet: ' + text.slice(0, 60));
        } catch (err) {
          log('binary decode failed:', err.message);
          return;
        }
      } else {
        // Text packet
        text = frame?.payload?.text?.trim();
        if (frame.type !== 'text' || !text) return;
        // Dedup by content hash prefix
        const idPrefix = text.slice(0, 16);
        if (hasSeen(idPrefix)) return;
        markSeen(idPrefix);
        LED.blue('received text: ' + text.slice(0, 60));
      }

      const packet = await buildPacket({ channel: arkChannel, alias, text });
      const depth = await enqueue(packet);
      log('radio text queued:', text.slice(0, 60), '| queue:', depth);
      LED.cyan('queued for ARK');
    } catch (error) {
      LED.red('could not read radio frame: ' + error.message);
    }
  });
}

connect();

// Inbound to ARK
async function drain() {
  try {
    const result = await flush(pushPackets);
    if (result.sent || result.expired) {
      log('sent:', result.sent, 'waiting:', result.left, 'expired:', result.expired);
      if (result.sent) LED.green(`flushed ${result.sent} packets to ARK`);
    }
  } catch (error) {
    log('gateway push failed:', error.message);
    LED.red('gateway push failed: ' + error.message);
  }
}

// Outbound to radio
const transmitted = new Set();

async function relayOut() {
  if (!nodeId || !connected) return;
  try {
    const feed = await fetchFeed(arkChannel);
    for (const item of feed.packets || []) {
      const env = item.envelope;
      if (!env || env.kind !== 'message' || transmitted.has(env.id)) continue;

      const { valid, errors } = validatePacket(env);
      if (!valid) { log('dropping invalid outbound packet:', errors.join(', ')); continue; }

      transmitted.add(env.id);
      const meshChannel = arkToMeshChannel(env.channel);

      if (useBinary) {
        // Send as ARK-BIN-1 binary (split if needed)
        const parts = splitForLoRa(env, maxRadioChars);
        for (const part of parts) {
          const binData = encodeBinary(part);
          client.publish(
            `${root}/2/json/${channelName}/${nodeId}`,
            JSON.stringify({ type: 'senddata', payload: { data: binData.toString('base64') }, channel: meshChannel }),
          );
        }
        LED.cyan('sent binary to radio: ' + env.text.slice(0, 60) + (parts.length > 1 ? ` (${parts.length} parts)` : ''));
      } else {
        // Send as text, split if needed
        const text = env.text.slice(0, maxRadioChars);
        client.publish(
          `${root}/2/json/${channelName}/${nodeId}`,
          JSON.stringify({ type: 'sendtext', payload: text, channel: meshChannel }),
        );
        LED.cyan('sent text to radio: ' + text.slice(0, 60));
      }
      log('handed to radio:', env.text.slice(0, 60));
    }
  } catch (error) {
    log('feed read failed:', error.message);
  }
}

// Gateway status monitoring
onStatusChange(status => {
  if (status === Status.CONNECTED) LED.green('ARK gateway: connected');
  else if (status === Status.DEGRADED) LED.yellow('ARK gateway: degraded');
  else LED.red('ARK gateway: offline');
});

// ============================================================
// SECTION 6: Radio Link Capacity, Bandwidth, Power, Satellite
// ============================================================

// Radio regulatory and licensing guidance (embedded)
// LoRa / Meshtastic operates in license-free ISM bands:
//   US:  915 MHz (902-928 MHz) — FCC Part 15 / 47 CFR 15.247
//   EU:  868 MHz (863-870 MHz) — ETSI EN 300 220
//   AU:  915 MHz (915-928 MHz) — ACMA LIPD Class License
//   JP:  920 MHz (920-928 MHz) — MIC
// Max TX power is region-dependent (US: 1W ERP, EU: 25mW/500mW depending on band).
// No license required for end-users at legal power levels.
// Do NOT relay classified or operationally sensitive information over LoRa.
// Do NOT use LoRa for large file distribution — text only.
// See https://meshtastic.org/docs/overview/radio-guidelines for official guidance.

// Bandwidth-aware message priority for radio (tightest constraint first)
// Priority order over radio: urgent > help > general > resources > status
const RADIO_KIND_PRIORITY = { alert: 0, message: 1, resource: 3, peer: 2 };
function radioPriority(packet) { return RADIO_KIND_PRIORITY[packet.kind] ?? 1; }

// Radio link capacity tracking
const radioStats = {
  bytesSent: 0,
  bytesReceived: 0,
  packetsSent: 0,
  packetsReceived: 0,
  lastResetAt: Date.now(),
  rssiHistory: [],
  snrHistory: [],
  gatewayUptimeStart: null,
  gatewayLastSeen: null,
};

function recordTx(bytes) {
  radioStats.bytesSent += bytes;
  radioStats.packetsSent++;
  radioStats.gatewayLastSeen = Date.now();
  if (!radioStats.gatewayUptimeStart) radioStats.gatewayUptimeStart = Date.now();
}

function recordRx(bytes, rssi, snr) {
  radioStats.bytesReceived += bytes;
  radioStats.packetsReceived++;
  radioStats.gatewayLastSeen = Date.now();
  if (rssi !== undefined) radioStats.rssiHistory.push(rssi);
  if (snr !== undefined) radioStats.snrHistory.push(snr);
  // Keep last 50 signal measurements
  if (radioStats.rssiHistory.length > 50) radioStats.rssiHistory.shift();
  if (radioStats.snrHistory.length > 50) radioStats.snrHistory.shift();
}

/** Get current radio link capacity stats. */
export function getRadioStats() {
  const now = Date.now();
  const windowSecs = (now - radioStats.lastResetAt) / 1000;
  const avgRssi = radioStats.rssiHistory.length
    ? radioStats.rssiHistory.reduce((a, b) => a + b, 0) / radioStats.rssiHistory.length
    : null;
  const avgSnr = radioStats.snrHistory.length
    ? radioStats.snrHistory.reduce((a, b) => a + b, 0) / radioStats.snrHistory.length
    : null;
  return {
    bytesSent: radioStats.bytesSent,
    bytesReceived: radioStats.bytesReceived,
    txBytesPerSec: windowSecs > 0 ? (radioStats.bytesSent / windowSecs).toFixed(2) : 0,
    rxBytesPerSec: windowSecs > 0 ? (radioStats.bytesReceived / windowSecs).toFixed(2) : 0,
    packetsSent: radioStats.packetsSent,
    packetsReceived: radioStats.packetsReceived,
    avgRssi: avgRssi !== null ? avgRssi.toFixed(1) : null,
    avgSnr: avgSnr !== null ? avgSnr.toFixed(1) : null,
    gatewayUptimeSecs: radioStats.gatewayUptimeStart
      ? Math.round((now - radioStats.gatewayUptimeStart) / 1000)
      : 0,
    gatewayLastSeenMs: radioStats.gatewayLastSeen
      ? now - radioStats.gatewayLastSeen
      : null,
  };
}

// Gateway power status: track last-seen and uptime
function isGatewayStale(thresholdMs = 300000) {
  if (!radioStats.gatewayLastSeen) return true;
  return Date.now() - radioStats.gatewayLastSeen > thresholdMs;
}

// Satellite/internet gateway auto-upgrade
// When ARK_SATELLITE_URL is set, the bridge will attempt to push packets
// directly over the satellite/internet link before falling back to radio relay.
const satelliteUrl = process.env.ARK_SATELLITE_URL || '';
const satelliteToken = process.env.ARK_SATELLITE_TOKEN || '';

async function pushViaSatellite(packets) {
  if (!satelliteUrl) return false;
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 10000);
    const r = await fetch(`${satelliteUrl}/api/bundle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(satelliteToken ? { Authorization: 'Bearer ' + satelliteToken } : {}),
      },
      body: JSON.stringify({ protocol: 'ARK-RELAY-1', packets }),
      signal: ctrl.signal,
    });
    if (r.ok) {
      LED.green(`satellite gateway: pushed ${packets.length} packet(s)`);
      return true;
    }
  } catch (err) {
    LED.yellow('satellite push failed: ' + err.message);
  }
  return false;
}

if (!nodeId) log('MESH_NODE_ID is empty, so ARK messages will not be sent out over radio.');

drain();
setInterval(drain, 30000);
setInterval(relayOut, Number(process.env.ARK_POLL_MS || 60000));
setInterval(() => {
  if (isGatewayStale()) LED.yellow('gateway stale — no traffic in 5+ minutes');
}, 300000);

// Flush on reconnect
onStatusChange(status => {
  if (status === Status.CONNECTED) {
    log('gateway reconnected, flushing queue...');
    drain();
  }
});


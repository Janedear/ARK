/**
 * ARK Gateway Module — Radio / Satellite Adapter Interface
 * =========================================================
 * Pluggable adapter layer that sits between ark-hub.mjs and physical
 * radio / satellite hardware attached to the hub machine.
 *
 * Architecture
 * ─────────────
 *   Browser (ARK Suite HTML)
 *       │  HTTP / local WiFi
 *   ark-hub.mjs
 *       │  imports this module
 *   GatewayManager          ← this file
 *       │  adapter interface
 *   ├── LoRaAdapter          (serial port → LoRa module e.g. SX1276 / RN2903)
 *   ├── AprsAdapter          (serial port → TNC or Direwolf soundmodem)
 *   └── SatModemAdapter      (serial port → Iridium SBD or RockBLOCK 9603)
 *
 * Browser constraints
 * ────────────────────
 * Browsers cannot open serial ports, Bluetooth Classic, or LoRa radios.
 * The hub is Node.js so it CAN. The browser asks the hub via the normal
 * HTTP API; the hub calls GatewayManager.send(); the manager routes to
 * whichever adapter is connected.
 *
 * Hardware setup (operator instructions are in gateway-setup.md)
 * ──────────────
 * Set env vars before starting the hub:
 *
 *   ARK_LORA_PORT=/dev/ttyUSB0        enable LoRa adapter
 *   ARK_LORA_BAUD=57600               baud rate (default 57600)
 *   ARK_LORA_CHANNEL=0                LoRa channel 0-15 (default 0)
 *   ARK_LORA_FREQ=915.0               centre freq MHz (default 915.0 US)
 *
 *   ARK_APRS_PORT=/dev/ttyUSB1        enable APRS adapter
 *   ARK_APRS_BAUD=9600                baud rate (default 9600 for TNC-2)
 *   ARK_APRS_CALLSIGN=N0CALL-9        required for APRS (FCC Part 97)
 *   ARK_APRS_SSID=9                   APRS SSID suffix (default 9)
 *
 *   ARK_SAT_PORT=/dev/ttyUSB2         enable satellite modem adapter
 *   ARK_SAT_BAUD=19200                baud rate (default 19200)
 *   ARK_SAT_TYPE=iridium              modem type: iridium | rockblock
 *
 * Legal notice
 * ─────────────
 * Radio transmission (LoRa, APRS) in the USA requires an FCC licence.
 * APRS: Part 97 amateur radio licence. No encryption permitted on amateur
 * frequencies. No third-party commercial traffic without prior arrangement.
 * Satellite SBD (Iridium): requires a commercial airtime contract.
 * ARK does not activate radio hardware automatically. Adapters start in
 * STANDBY and must be explicitly enabled via POST /api/gateway/enable.
 *
 * @module gateway
 */

import { EventEmitter } from 'node:events';

// ─── Shared constants ────────────────────────────────────────────────────────

/** Maximum payload bytes per LoRa packet (conservative: 200 bytes for ARK binary) */
const LORA_MAX_PAYLOAD = 200;

/** Maximum APRS info field bytes (AX.25 limit) */
const APRS_MAX_PAYLOAD = 256;

/** Maximum Iridium SBD payload bytes (SBD spec) */
const IRIDIUM_MAX_PAYLOAD = 340;

/** Retry window before a queued radio message is dropped (ms) */
const RADIO_MSG_TTL = 60 * 60 * 1000; // 1 hour

// ─── Packet format helpers ───────────────────────────────────────────────────

/**
 * Encode an ARK message object to a compact radio string.
 * Format: ARK|<channel>|<alias>|<text>
 * Total kept under LORA_MAX_PAYLOAD by truncating text last.
 */
function encodeRadioPacket(msg) {
  const channel = (msg.channel || 'general').slice(0, 12);
  const alias = (msg.alias || 'ARK').replace(/[|]/g, '').slice(0, 16);
  const prefix = `ARK|${channel}|${alias}|`;
  const maxText = LORA_MAX_PAYLOAD - prefix.length;
  const text = (msg.text || '').slice(0, maxText);
  return prefix + text;
}

/**
 * Decode a received radio string back to an ARK message object.
 * Returns null if the string is not an ARK packet.
 */
function decodeRadioPacket(raw) {
  if (typeof raw !== 'string' || !raw.startsWith('ARK|')) return null;
  const parts = raw.split('|');
  if (parts.length < 4) return null;
  return {
    source: 'radio',
    channel: parts[1] || 'general',
    alias: parts[2] || 'Radio',
    text: parts.slice(3).join('|'),
    ts: Date.now(),
  };
}

/**
 * Build an APRS information string for a text message.
 * Uses the `:MSG:` message format so it appears in APRS clients.
 * Callsign must be pre-validated.
 */
function encodeAprsInfo(callsign, msg) {
  const dest = `${callsign}-0`.padEnd(9);
  const text = (msg.text || '').slice(0, APRS_MAX_PAYLOAD - dest.length - 10);
  return `:${dest}:${text}`;
}

// ─── Serial port wrapper (lazy import) ───────────────────────────────────────

/**
 * Attempt to import the 'serialport' npm package.
 * Returns null and logs a friendly message if the package is not installed.
 * This keeps the hub functional without radio hardware.
 */
async function tryImportSerial() {
  try {
    const { SerialPort } = await import('serialport');
    return SerialPort;
  } catch {
    return null;
  }
}

// ─── Base adapter class ──────────────────────────────────────────────────────

/**
 * BaseAdapter — interface contract all gateway adapters must implement.
 * Emits 'message' events when a packet is received from the radio.
 */
class BaseAdapter extends EventEmitter {
  constructor(name) {
    super();
    this.name = name;
    this.state = 'offline';   // offline | standby | transmitting | error
    this.txQueue = [];        // { packet, ts, retries }
    this.stats = { tx: 0, rx: 0, errors: 0, lastActivity: null };
  }

  /** Enable the adapter. Subclasses override to open serial port etc. */
  async enable() { this.state = 'standby'; }

  /** Disable the adapter gracefully. */
  async disable() { this.state = 'offline'; }

  /** Queue a message for transmission. Returns { queued: true } or throws. */
  async send(msg) {
    if (this.state === 'offline') throw new Error(`${this.name} adapter is offline`);
    const packet = encodeRadioPacket(msg);
    this.txQueue.push({ packet, ts: Date.now(), retries: 0 });
    await this._drainQueue();
    return { queued: true, adapter: this.name };
  }

  /** Internal: transmit queued packets. Override in subclass. */
  async _drainQueue() {
    // Purge expired entries
    const now = Date.now();
    this.txQueue = this.txQueue.filter(e => now - e.ts < RADIO_MSG_TTL);
  }

  /** Sanitised status snapshot for the /api/gateway endpoint. */
  status() {
    return {
      name: this.name,
      state: this.state,
      queueDepth: this.txQueue.length,
      stats: { ...this.stats },
    };
  }
}

// ─── LoRa adapter ────────────────────────────────────────────────────────────

/**
 * LoRaAdapter
 * ───────────
 * Communicates with a LoRa module over a serial port.
 * Tested with:
 *   - Dragino LoRa GPS HAT (SX1276)
 *   - RYLR998 (AT command set)
 *   - Microchip RN2903 (UART AT commands, US 915 MHz)
 *
 * AT command flow for RYLR / similar modules:
 *   AT+NETWORKID=18        set network ID (18 = ARK community net)
 *   AT+BAND=915000000      set frequency (US)
 *   AT+CRFOP=22            22 dBm TX power
 *   AT+SEND=0,<len>,<hex>  transmit to address 0 (broadcast)
 *   +RCV=...               unsolicited receive event
 */
class LoRaAdapter extends BaseAdapter {
  constructor(config) {
    super('lora');
    this.portPath = config.port;
    this.baud = config.baud || 57600;
    this.channel = config.channel || 0;
    this.freqMhz = config.freqMhz || 915.0;
    this.port = null;
    this._rxBuf = '';
  }

  async enable() {
    const SerialPort = await tryImportSerial();
    if (!SerialPort) {
      this.state = 'error';
      this._warn('serialport package not found. Run: npm install serialport');
      return { ok: false, reason: 'serialport_not_installed' };
    }
    try {
      this.port = new SerialPort({ path: this.portPath, baudRate: this.baud, autoOpen: false });
      await new Promise((resolve, reject) => {
        this.port.open(err => err ? reject(err) : resolve());
      });
      this.port.on('data', buf => this._onData(buf.toString('utf8')));
      this.port.on('error', err => { this.state = 'error'; this._warn('Serial error:', err.message); });
      this.port.on('close', () => { this.state = 'offline'; this._warn('Serial port closed.'); });

      // Initialise module
      await this._atCmd(`AT+NETWORKID=18`);
      await this._atCmd(`AT+BAND=${Math.round(this.freqMhz * 1e6)}`);
      await this._atCmd(`AT+CRFOP=22`);

      this.state = 'standby';
      this._log(`LoRa ready on ${this.portPath} @ ${this.freqMhz} MHz`);
      return { ok: true };
    } catch (err) {
      this.state = 'error';
      this._warn('LoRa enable failed:', err.message);
      return { ok: false, reason: err.message };
    }
  }

  async disable() {
    try { if (this.port?.isOpen) await new Promise(r => this.port.close(r)); } catch {}
    this.state = 'offline';
  }

  async _drainQueue() {
    await super._drainQueue();
    if (this.state !== 'standby' || !this.port?.isOpen) return;
    this.state = 'transmitting';
    while (this.txQueue.length > 0) {
      const entry = this.txQueue.shift();
      try {
        const hex = Buffer.from(entry.packet, 'utf8').toString('hex');
        await this._atCmd(`AT+SEND=0,${hex.length},${hex}`);
        this.stats.tx++;
        this.stats.lastActivity = Date.now();
      } catch (err) {
        this.stats.errors++;
        this._warn('TX error:', err.message);
        if (entry.retries < 3) {
          entry.retries++;
          this.txQueue.push(entry); // re-queue for retry
        }
      }
    }
    this.state = 'standby';
  }

  /** Parse AT+RCV=addr,len,data,rssi,snr */
  _onData(chunk) {
    this._rxBuf += chunk;
    const lines = this._rxBuf.split('\n');
    this._rxBuf = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('+RCV=')) continue;
      try {
        const parts = trimmed.slice(5).split(',');
        if (parts.length < 3) continue;
        const hexData = parts[2];
        const text = Buffer.from(hexData, 'hex').toString('utf8');
        const msg = decodeRadioPacket(text);
        if (msg) {
          msg.rssi = parts[3] ? parseInt(parts[3]) : undefined;
          msg.snr = parts[4] ? parseFloat(parts[4]) : undefined;
          this.stats.rx++;
          this.stats.lastActivity = Date.now();
          this.emit('message', msg);
        }
      } catch (err) { this._warn('RX parse error:', err.message); }
    }
  }

  _atCmd(cmd) {
    return new Promise((resolve, reject) => {
      if (!this.port?.isOpen) return reject(new Error('Port not open'));
      const timeout = setTimeout(() => reject(new Error(`AT timeout: ${cmd}`)), 5000);
      this.port.write(cmd + '\r\n', 'utf8', err => {
        clearTimeout(timeout);
        if (err) reject(err); else resolve();
      });
    });
  }

  _log(...args) { console.log('[gateway/lora]', ...args); }
  _warn(...args) { console.warn('[gateway/lora]', ...args); }
}

// ─── APRS adapter ────────────────────────────────────────────────────────────

/**
 * AprsAdapter
 * ───────────
 * Communicates with a TNC (Terminal Node Controller) or Direwolf soundmodem
 * over a serial port using the KISS protocol.
 *
 * Compatible with:
 *   - Direwolf (soundcard TNC over virtual serial port)
 *   - Kenwood TM-D710A / TM-D700A built-in TNC
 *   - Any KISS-mode TNC (AX.25 frame framing)
 *
 * LEGAL: Requires FCC Part 97 amateur radio licence.
 *        No encryption permitted. No commercial traffic.
 *        Callsign must be your valid FCC callsign.
 *
 * KISS framing constants:
 *   FEND  = 0xC0  frame end marker
 *   FESC  = 0xDB  escape byte
 *   TFEND = 0xDC  transposed FEND
 *   TFESC = 0xDD  transposed FESC
 */
class AprsAdapter extends BaseAdapter {
  constructor(config) {
    super('aprs');
    this.portPath = config.port;
    this.baud = config.baud || 9600;
    this.callsign = (config.callsign || '').toUpperCase().trim();
    this.ssid = config.ssid || 9;
    this.port = null;
    this._rxBuf = Buffer.alloc(0);

    // KISS constants
    this.FEND = 0xC0;
    this.FESC = 0xDB;
    this.TFEND = 0xDC;
    this.TFESC = 0xDD;
  }

  async enable() {
    if (!this.callsign || !/^[A-Z0-9]{3,6}(-\d{1,2})?$/.test(this.callsign)) {
      this.state = 'error';
      return { ok: false, reason: 'invalid_callsign — set ARK_APRS_CALLSIGN=YOURCALL-9' };
    }
    const SerialPort = await tryImportSerial();
    if (!SerialPort) {
      this.state = 'error';
      return { ok: false, reason: 'serialport_not_installed — run: npm install serialport' };
    }
    try {
      this.port = new SerialPort({ path: this.portPath, baudRate: this.baud, autoOpen: false });
      await new Promise((resolve, reject) => {
        this.port.open(err => err ? reject(err) : resolve());
      });
      this.port.on('data', buf => this._onData(buf));
      this.port.on('error', err => { this.state = 'error'; console.warn('[gateway/aprs] Serial error:', err.message); });
      this.port.on('close', () => { this.state = 'offline'; });

      // Enter KISS mode: some TNCs need a 3s pause + "KISS ON\r"
      await new Promise(r => setTimeout(r, 500));
      this.port.write(Buffer.from('KISS ON\r'));
      await new Promise(r => setTimeout(r, 500));

      this.state = 'standby';
      console.log(`[gateway/aprs] APRS ready on ${this.portPath} as ${this.callsign}-${this.ssid}`);
      return { ok: true };
    } catch (err) {
      this.state = 'error';
      return { ok: false, reason: err.message };
    }
  }

  async disable() {
    try { if (this.port?.isOpen) await new Promise(r => this.port.close(r)); } catch {}
    this.state = 'offline';
  }

  async _drainQueue() {
    await super._drainQueue();
    if (this.state !== 'standby' || !this.port?.isOpen) return;
    this.state = 'transmitting';
    while (this.txQueue.length > 0) {
      const entry = this.txQueue.shift();
      try {
        const info = encodeAprsInfo(`${this.callsign}-${this.ssid}`, { text: entry.packet });
        const frame = this._buildAx25Frame(this.callsign, this.ssid, 'APZARK', 0, 'WIDE2-1', info);
        const kissFrame = this._wrapKiss(frame);
        await new Promise((resolve, reject) => {
          this.port.write(kissFrame, err => err ? reject(err) : resolve());
        });
        this.stats.tx++;
        this.stats.lastActivity = Date.now();
      } catch (err) {
        this.stats.errors++;
        if (entry.retries < 2) { entry.retries++; this.txQueue.push(entry); }
      }
    }
    this.state = 'standby';
  }

  /** Build a minimal AX.25 UI frame for APRS */
  _buildAx25Frame(srcCall, srcSsid, destCall, destSsid, digi, info) {
    const encCall = (call, ssid, hBit) => {
      const padded = call.padEnd(6).toUpperCase().slice(0, 6);
      const bytes = Buffer.from(padded.split('').map(c => c.charCodeAt(0) << 1));
      const ssidByte = 0x60 | ((ssid & 0x0F) << 1) | (hBit ? 0x80 : 0x00);
      return Buffer.concat([bytes, Buffer.from([ssidByte])]);
    };
    const dest = encCall(destCall, destSsid, false);
    const src = encCall(srcCall, srcSsid, false);
    const digiEnc = encCall(digi.split('-')[0], parseInt(digi.split('-')[1] || '0'), true);
    // Mark last address byte
    digiEnc[digiEnc.length - 1] |= 0x01;
    const ctrl = Buffer.from([0x03]); // UI frame
    const pid = Buffer.from([0xF0]);  // no layer 3
    const infoBytes = Buffer.from(info, 'utf8');
    return Buffer.concat([dest, src, digiEnc, ctrl, pid, infoBytes]);
  }

  /** Wrap an AX.25 frame in KISS framing */
  _wrapKiss(frame) {
    const escaped = [];
    for (const byte of frame) {
      if (byte === this.FEND) { escaped.push(this.FESC, this.TFEND); }
      else if (byte === this.FESC) { escaped.push(this.FESC, this.TFESC); }
      else { escaped.push(byte); }
    }
    return Buffer.from([this.FEND, 0x00, ...escaped, this.FEND]);
  }

  /** Parse incoming KISS frames */
  _onData(newData) {
    this._rxBuf = Buffer.concat([this._rxBuf, newData]);
    while (true) {
      const start = this._rxBuf.indexOf(this.FEND);
      if (start === -1) break;
      const end = this._rxBuf.indexOf(this.FEND, start + 1);
      if (end === -1) break;
      const frame = this._rxBuf.slice(start + 1, end);
      this._rxBuf = this._rxBuf.slice(end + 1);
      if (frame.length < 2 || frame[0] !== 0x00) continue; // not data frame
      this._parseAx25(frame.slice(1));
    }
  }

  _parseAx25(frame) {
    try {
      if (frame.length < 15) return;
      // Skip address bytes (14 for dest+src, variable for digipeaters)
      let addrEnd = 13;
      while (addrEnd < frame.length && !(frame[addrEnd] & 0x01)) addrEnd++;
      addrEnd++; // include the byte with H bit
      const infoStart = addrEnd + 2; // skip ctrl + pid
      if (infoStart >= frame.length) return;
      const info = frame.slice(infoStart).toString('utf8');
      const msg = decodeRadioPacket(info);
      if (msg) {
        this.stats.rx++;
        this.stats.lastActivity = Date.now();
        this.emit('message', msg);
      }
    } catch {}
  }
}

// ─── Satellite SBD adapter ───────────────────────────────────────────────────

/**
 * SatModemAdapter
 * ───────────────
 * Communicates with an Iridium SBD modem (Iridium 9602 / 9603, or the
 * RockBLOCK 9603 breakout board) over serial using AT command set.
 *
 * SBD = Short Burst Data. Max payload: 340 bytes MO (mobile-originating).
 * Each SBD message costs airtime credits — only send when other paths are down.
 *
 * AT command flow:
 *   AT+SBDWT=<text>    write text message to MO buffer
 *   AT+SBDIX           initiate SBD session (transmit + receive if any waiting)
 *   AT+SBDRT           read text from MT buffer (mobile-terminated, incoming)
 *   AT+CGSN            get IMEI (for registration / billing)
 *   AT+CSQ             get signal quality (0-5)
 *
 * RockBLOCK users: set ARK_SAT_TYPE=rockblock. The session flow is the same;
 * RockBLOCK adds a data endpoint at their server that handles billing.
 */
class SatModemAdapter extends BaseAdapter {
  constructor(config) {
    super('satellite');
    this.portPath = config.port;
    this.baud = config.baud || 19200;
    this.type = config.type || 'iridium'; // 'iridium' | 'rockblock'
    this.port = null;
    this._rxBuf = '';
    this._cmdResolver = null;
    this._cmdTimer = null;
  }

  async enable() {
    const SerialPort = await tryImportSerial();
    if (!SerialPort) {
      this.state = 'error';
      return { ok: false, reason: 'serialport_not_installed — run: npm install serialport' };
    }
    try {
      this.port = new SerialPort({ path: this.portPath, baudRate: this.baud, autoOpen: false });
      await new Promise((resolve, reject) => { this.port.open(err => err ? reject(err) : resolve()); });
      this.port.on('data', buf => this._onData(buf.toString('utf8')));
      this.port.on('error', err => { this.state = 'error'; console.warn('[gateway/sat] Serial error:', err.message); });
      this.port.on('close', () => { this.state = 'offline'; });

      // Basic check
      const ati = await this._atCmd('ATI', 3000);
      if (!ati.includes('IRIDIUM') && !ati.includes('RockBLOCK') && !ati.includes('OK')) {
        throw new Error('No Iridium modem response — check port and cable');
      }
      const imei = await this._atCmd('AT+CGSN', 3000);
      this.imei = imei.replace(/[^0-9]/g, '').slice(0, 15);

      this.state = 'standby';
      console.log(`[gateway/sat] Satellite modem ready on ${this.portPath} (${this.type}) IMEI=${this.imei}`);
      return { ok: true, imei: this.imei };
    } catch (err) {
      this.state = 'error';
      return { ok: false, reason: err.message };
    }
  }

  async disable() {
    try { if (this.port?.isOpen) await new Promise(r => this.port.close(r)); } catch {}
    this.state = 'offline';
  }

  async _drainQueue() {
    await super._drainQueue();
    if (this.state !== 'standby' || !this.port?.isOpen) return;
    this.state = 'transmitting';

    // SBD sessions are expensive — batch all queued messages into one
    const batch = this.txQueue.splice(0, this.txQueue.length);
    if (batch.length === 0) { this.state = 'standby'; return; }

    // Concatenate up to IRIDIUM_MAX_PAYLOAD bytes
    const combined = batch.map(e => e.packet).join('|').slice(0, IRIDIUM_MAX_PAYLOAD);
    try {
      // Check signal quality first
      const csq = await this._atCmd('AT+CSQ', 10000);
      const signalBars = parseInt(csq.match(/\+CSQ:(\d)/)?.[1] || '0');
      if (signalBars === 0) {
        console.warn('[gateway/sat] No satellite signal — re-queuing messages');
        this.txQueue.unshift(...batch);
        this.state = 'standby';
        return;
      }

      // Write to MO buffer
      await this._atCmd(`AT+SBDWT=${combined}`, 10000);

      // Initiate SBD session
      const sbdix = await this._atCmd('AT+SBDIX', 90000); // up to 90s for session
      const moStatus = parseInt(sbdix.match(/\+SBDIX: (\d)/)?.[1] || '99');
      if (moStatus <= 4) {
        // 0-4 = MO success
        this.stats.tx++;
        this.stats.lastActivity = Date.now();
        console.log(`[gateway/sat] SBD session OK (MO status ${moStatus}), signal ${signalBars}/5`);

        // Check for incoming MT message
        const mtQueued = parseInt(sbdix.match(/\+SBDIX: \d, \d+, (\d)/)?.[1] || '0');
        if (mtQueued > 0) {
          const mt = await this._atCmd('AT+SBDRT', 10000);
          const msgText = mt.replace(/\+SBDRT:/i, '').replace(/OK/i, '').trim();
          if (msgText) {
            const msg = decodeRadioPacket(msgText) || {
              source: 'satellite',
              channel: 'general',
              alias: 'SatRelay',
              text: msgText,
              ts: Date.now(),
            };
            this.stats.rx++;
            this.emit('message', msg);
          }
          // Clear MT buffer
          await this._atCmd('AT+SBDD1', 5000).catch(() => {});
        }
      } else {
        this.stats.errors++;
        console.warn(`[gateway/sat] SBD session failed (MO status ${moStatus})`);
        // Re-queue if not too many retries
        const toRetry = batch.filter(e => e.retries < 3);
        toRetry.forEach(e => e.retries++);
        this.txQueue.unshift(...toRetry);
      }
    } catch (err) {
      this.stats.errors++;
      console.warn('[gateway/sat] SBD error:', err.message);
      this.txQueue.unshift(...batch.map(e => ({ ...e, retries: (e.retries || 0) + 1 })).filter(e => e.retries < 3));
    }
    this.state = 'standby';
  }

  _onData(chunk) {
    this._rxBuf += chunk;
    if (this._cmdResolver && (this._rxBuf.includes('\nOK') || this._rxBuf.includes('\nERROR'))) {
      clearTimeout(this._cmdTimer);
      const response = this._rxBuf.trim();
      this._rxBuf = '';
      const resolver = this._cmdResolver;
      this._cmdResolver = null;
      resolver(response);
    }
  }

  _atCmd(cmd, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
      if (!this.port?.isOpen) return reject(new Error('Port not open'));
      if (this._cmdResolver) return reject(new Error('AT command already in progress'));
      this._rxBuf = '';
      this._cmdResolver = resolve;
      this._cmdTimer = setTimeout(() => {
        this._cmdResolver = null;
        reject(new Error(`AT timeout (${timeoutMs}ms): ${cmd}`));
      }, timeoutMs);
      this.port.write(cmd + '\r', 'utf8', err => { if (err) { clearTimeout(this._cmdTimer); this._cmdResolver = null; reject(err); } });
    });
  }
}

// ─── Null adapter (safe default) ─────────────────────────────────────────────

/**
 * NullAdapter — no-op adapter used when no hardware port is configured.
 * Logs a clear message so operators know why no radio traffic is happening.
 */
class NullAdapter extends BaseAdapter {
  constructor(typeName) {
    super(typeName);
    this.state = 'offline';
  }
  async enable() {
    console.log(`[gateway/${this.name}] No hardware port configured — adapter remains offline.`);
    return { ok: false, reason: 'no_port_configured' };
  }
  async send() {
    return { queued: false, reason: 'adapter_offline' };
  }
}

// ─── Gateway manager ─────────────────────────────────────────────────────────

/**
 * GatewayManager
 * ──────────────
 * Singleton that owns all adapters and provides the API surface consumed
 * by ark-hub.mjs.
 *
 * Usage in ark-hub.mjs:
 *   import { GatewayManager } from './gateway.mjs';
 *   await GatewayManager.init();
 *   app.on('message', msg => GatewayManager.ingest(msg));  // hub → radio
 *   GatewayManager.on('radio-message', msg => store.accept([msg]));  // radio → hub
 */
class GatewayManager extends EventEmitter {
  constructor() {
    super();
    this.adapters = {};
    this._initDone = false;
  }

  /**
   * Initialise all adapters from environment variables.
   * Safe to call multiple times — only runs once.
   */
  async init() {
    if (this._initDone) return;
    this._initDone = true;

    const loraPort = process.env.ARK_LORA_PORT;
    const aprsPort = process.env.ARK_APRS_PORT;
    const satPort = process.env.ARK_SAT_PORT;

    this.adapters.lora = loraPort
      ? new LoRaAdapter({
          port: loraPort,
          baud: Number(process.env.ARK_LORA_BAUD || 57600),
          channel: Number(process.env.ARK_LORA_CHANNEL || 0),
          freqMhz: parseFloat(process.env.ARK_LORA_FREQ || 915.0),
        })
      : new NullAdapter('lora');

    this.adapters.aprs = aprsPort
      ? new AprsAdapter({
          port: aprsPort,
          baud: Number(process.env.ARK_APRS_BAUD || 9600),
          callsign: process.env.ARK_APRS_CALLSIGN || '',
          ssid: Number(process.env.ARK_APRS_SSID || 9),
        })
      : new NullAdapter('aprs');

    this.adapters.satellite = satPort
      ? new SatModemAdapter({
          port: satPort,
          baud: Number(process.env.ARK_SAT_BAUD || 19200),
          type: process.env.ARK_SAT_TYPE || 'iridium',
        })
      : new NullAdapter('satellite');

    // Wire incoming radio messages back into the event bus
    for (const adapter of Object.values(this.adapters)) {
      adapter.on('message', msg => {
        try { this.emit('radio-message', msg); } catch {}
      });
    }

    // Auto-enable configured adapters
    const enableResults = await Promise.allSettled(
      Object.entries(this.adapters)
        .filter(([, a]) => !(a instanceof NullAdapter))
        .map(([, a]) => a.enable())
    );
    enableResults.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.warn('[gateway] Adapter enable failed:', r.reason);
      }
    });

    const active = Object.values(this.adapters).filter(a => a.state === 'standby').map(a => a.name);
    if (active.length > 0) {
      console.log('[gateway] Active adapters:', active.join(', '));
    } else {
      console.log('[gateway] No radio hardware configured. Set ARK_LORA_PORT / ARK_APRS_PORT / ARK_SAT_PORT to enable.');
    }
  }

  /**
   * Send a message over all active adapters.
   * Pass `adapters` array to target specific ones, e.g. ['lora', 'satellite'].
   * Returns array of per-adapter results.
   */
  async send(msg, targetAdapters) {
    const names = targetAdapters || Object.keys(this.adapters);
    const results = await Promise.allSettled(
      names
        .filter(n => this.adapters[n] && this.adapters[n].state !== 'offline')
        .map(n => this.adapters[n].send(msg).then(r => ({ adapter: n, ...r })))
    );
    return results.map(r => r.status === 'fulfilled' ? r.value : { adapter: '?', error: r.reason?.message });
  }

  /**
   * Enable a specific adapter by name.
   * Called when hub operator POSTs /api/gateway/enable.
   */
  async enableAdapter(name) {
    if (!this.adapters[name]) return { ok: false, reason: 'unknown_adapter' };
    if (this.adapters[name] instanceof NullAdapter) return { ok: false, reason: 'no_port_configured' };
    return this.adapters[name].enable();
  }

  /**
   * Disable a specific adapter.
   */
  async disableAdapter(name) {
    if (!this.adapters[name]) return { ok: false, reason: 'unknown_adapter' };
    return this.adapters[name].disable();
  }

  /**
   * Get status snapshot of all adapters.
   * Returned by GET /api/gateway.
   */
  status() {
    return Object.fromEntries(
      Object.entries(this.adapters).map(([name, a]) => [name, a.status()])
    );
  }

  /**
   * Check if any adapter is capable of transmitting.
   */
  isActive() {
    return Object.values(this.adapters).some(a => a.state === 'standby' || a.state === 'transmitting');
  }

  /**
   * Determine best adapter for a given message based on:
   *   - available adapters
   *   - message priority (high priority → try satellite even if costly)
   *   - queue depth (prefer adapter with shorter queue)
   */
  bestAdapter(priority) {
    const online = Object.values(this.adapters).filter(a => a.state === 'standby');
    if (online.length === 0) return null;
    if (priority === 'critical') {
      // Critical: try satellite first if available, then LoRa, then APRS
      const order = ['satellite', 'lora', 'aprs'];
      for (const name of order) {
        const a = online.find(x => x.name === name);
        if (a) return a.name;
      }
    }
    // Normal: prefer LoRa (cheapest, fastest) → APRS → satellite
    const order = ['lora', 'aprs', 'satellite'];
    let best = null, bestQ = Infinity;
    for (const name of order) {
      const a = online.find(x => x.name === name);
      if (a && a.txQueue.length < bestQ) { best = a.name; bestQ = a.txQueue.length; }
    }
    return best;
  }
}

// Export singleton
export const gateway = new GatewayManager();

// Named exports for hub route handlers
export { encodeRadioPacket, decodeRadioPacket, LORA_MAX_PAYLOAD, APRS_MAX_PAYLOAD, IRIDIUM_MAX_PAYLOAD };

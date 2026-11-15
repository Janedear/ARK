import { EventEmitter } from 'node:events';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Connection status
export const Status = { CONNECTED: 'connected', DEGRADED: 'degraded', OFFLINE: 'offline' };

/** Gateway client with multi-hub failover, health checks, caching, and event emission. */
class Gateway extends EventEmitter {
  constructor() {
    super();
    this.status = Status.OFFLINE;
    this._cache = new Map(); // key -> { data, expiresAt }
    this._ws = null;
    this._wsUrl = null;
    this._polling = false;
    this._pollTimer = null;
    this._hubIndex = 0;
    this._bandwidthSaver = process.env.ARK_BANDWIDTH_SAVER === '1';
  }

  /** Parse hub list from env: comma-separated URLs. */
  _hubList() {
    const env = process.env.ARK_HUB_URLS || process.env.ARK_HUB_URL || '';
    return env.split(',').map(u => u.trim().replace(/\/$/, '')).filter(Boolean);
  }

  _cloudEndpoint() {
    const url = process.env.ARK_FUNCTION_URL;
    if (!url) throw new Error('ARK_FUNCTION_URL is not set. See README step 3.');
    return url;
  }

  _setStatus(s) {
    if (this.status !== s) {
      this.status = s;
      this.emit('status', s);
    }
  }

  /** Try hub health check: GET /api/health or /api/status. Returns true if healthy. */
  async _checkHub(url) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3000);
      const r = await fetch(`${url}/api/health`, { signal: ctrl.signal });
      clearTimeout(timer);
      return r.ok;
    } catch {
      return false;
    }
  }

  /** Get the first healthy hub URL, cycling through the list. */
  async _healthyHub() {
    const hubs = this._hubList();
    if (!hubs.length) return null;
    for (let i = 0; i < hubs.length; i++) {
      const idx = (this._hubIndex + i) % hubs.length;
      if (await this._checkHub(hubs[idx])) {
        this._hubIndex = idx;
        return hubs[idx];
      }
    }
    return null;
  }

  /** Cloud gateway call with rate-limit retry. */
  async _cloudCall(body, attempt = 1) {
    const response = await fetch(this._cloudEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (process.env.ARK_TOKEN || '') },
      body: JSON.stringify(body),
    });
    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = { error: raw.slice(0, 200) }; }
    if (response.status === 429 && attempt < 3) { await sleep(60000); return this._cloudCall(body, attempt + 1); }
    if (!response.ok) throw new Error(data.error || 'Gateway returned ' + response.status);
    return data;
  }

  /** Hub call with timeout. */
  async _hubCall(hubUrl, path, body) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    try {
      const response = await fetch(hubUrl + path, body
        ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal }
        : { signal: ctrl.signal }
      );
      clearTimeout(timer);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Hub returned ' + response.status);
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  /** GET with 5-minute response cache. */
  async _cachedGet(url) {
    const cached = this._cache.get(url);
    if (cached && cached.expiresAt > Date.now()) return cached.data;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const r = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      this._cache.set(url, { data, expiresAt: Date.now() + 300000 });
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Try WebSocket connection to hub. Falls back gracefully. */
  _connectWs(hubUrl) {
    if (this._ws) return;
    const wsUrl = hubUrl.replace(/^http/, 'ws') + '/ws';
    try {
      const { WebSocket } = globalThis;
      if (!WebSocket) return; // not in browser
      const ws = new WebSocket(wsUrl);
      ws.onopen = () => { this._ws = ws; this._wsUrl = wsUrl; this.emit('ws-connected', wsUrl); };
      ws.onmessage = e => { try { this.emit('message', JSON.parse(e.data)); } catch {} };
      ws.onclose = () => { this._ws = null; this._wsUrl = null; this.emit('ws-disconnected'); };
      ws.onerror = () => {};
    } catch {}
  }

  /** Push packets to hub or cloud. */
  async pushPackets(packets) {
    const hub = await this._healthyHub();
    if (hub) {
      try {
        this._connectWs(hub);
        const result = await this._hubCall(hub, '/api/bundle', { protocol: 'ARK-RELAY-1', packets });
        result.rejected?.forEach(item => console.log('hub refused packet', item.id, item.reason));
        this._setStatus(Status.CONNECTED);
        this.emit('push', { count: packets.length });
        return { accepted: packets.map(p => ({ id: p.id })) };
      } catch (err) {
        console.error('hub push failed, falling back:', err.message);
        this._setStatus(Status.DEGRADED);
      }
    }
    // Cloud fallback
    try {
      const result = await this._cloudCall({ action: 'push', packets });
      this._setStatus(Status.CONNECTED);
      this.emit('push', { count: packets.length });
      return result;
    } catch (err) {
      this._setStatus(Status.OFFLINE);
      throw err;
    }
  }

  /** Fetch feed from hub or cloud, with caching for GET. */
  async fetchFeed(channel) {
    const hub = await this._healthyHub();
    if (hub) {
      try {
        const url = `${hub}/api/bundle?channel=${encodeURIComponent(channel)}&limit=40`;
        const bundle = await this._cachedGet(url);
        this._setStatus(Status.CONNECTED);
        return { packets: bundle.packets.map(envelope => ({ envelope })) };
      } catch (err) {
        console.error('hub feed failed, falling back:', err.message);
        this._setStatus(Status.DEGRADED);
      }
    }
    const result = await this._cloudCall({ action: 'feed', channel });
    this._setStatus(Status.CONNECTED);
    return result;
  }

  /** Start long-polling for real-time updates. */
  startPolling(channel, onPackets) {
    if (this._polling) return;
    this._polling = true;
    const interval = this._bandwidthSaver ? 120000 : 30000;
    const poll = async () => {
      try {
        const feed = await this.fetchFeed(channel);
        if (feed.packets?.length) {
          this.emit('feed', feed.packets);
          onPackets?.(feed.packets);
        }
      } catch {}
    };
    poll();
    this._pollTimer = setInterval(poll, interval);
  }

  stopPolling() {
    this._polling = false;
    if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null; }
  }

  invalidateCache(url) {
    if (url) this._cache.delete(url);
    else this._cache.clear();
  }

  setBandwidthSaver(enabled) {
    this._bandwidthSaver = enabled;
    if (this._polling) {
      this.stopPolling();
      // caller must restart
    }
  }
}

// Singleton instance
const gateway = new Gateway();

export const pushPackets = (packets) => gateway.pushPackets(packets);
export const fetchFeed = (channel) => gateway.fetchFeed(channel);
export const startPolling = (channel, cb) => gateway.startPolling(channel, cb);
export const stopPolling = () => gateway.stopPolling();
export const getStatus = () => gateway.status;
export const onStatusChange = (cb) => gateway.on('status', cb);
export const onFeed = (cb) => gateway.on('feed', cb);
export default gateway;

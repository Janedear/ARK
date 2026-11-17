// === HUB COMMUNICATION ===
const Hub = {
  _syncing: false,
  _interval: null,
  get url() { return Store.get('hub_url', ''); },
  startAutoSync() {
    if (this._interval) clearInterval(this._interval);
    let secs = parseInt(Store.get('sync_interval', 60));
    // Low-power mode: minimum 5-minute sync regardless of setting
    if (Store.get('low_power', false) && secs > 0 && secs < 300) secs = 300;
    if (secs > 0) this._interval = setInterval(() => this.sync(), secs * 1000);
  },
  async sync(manual = false) {
    if (this._syncing) return;
    if (!this.url || Store.get('offline_mode', false)) {
      if (manual) Toast.show(Store.get('offline_mode', false) ? 'Offline mode is on — turn it off in Settings to sync' : 'No hub connected yet — set one up on the Network tab', 'warning', 4000);
      return;
    }
    this._syncing = true;
    const syncBtns = BtnLoading.all('button[onclick*="Hub.sync("]');
    syncBtns.forEach(b => BtnLoading.start(b, '⏳ Syncing…'));
    document.getElementById('messages-list')?.setAttribute('aria-busy', 'true');
    this.updateConnState('syncing');
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 8000);
      const r = await fetch(this.url + '/api/messages?limit=100', {signal: ctrl.signal});
      clearTimeout(tid);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      const msgs = data.messages || data || [];
      if (Array.isArray(msgs)) {
        // Our own messages come back from the hub under the hub's id. Find the local copies
        // so each message is shown once, not twice.
        const mine = new Map();
        try {
          for (const lm of (await DB.getAll('messages')) || []) {
            if (lm && String(lm.id || '').startsWith('local_')) mine.set(String(lm.alias) + '\u0001' + Hub.wireText(lm), lm.id);
          }
        } catch(e) {}
        for (const m of msgs) {
          if (!m || m.id == null) continue;
          const text = String(m.body != null ? m.body : (m.text != null ? m.text : ''));
          const alias = String(m.alias || 'Anonymous');
          const when = [m.ts, m.issued_at, m.createdAt].find(t => typeof t === 'string' && !isNaN(Date.parse(t)));
          await DB.put('messages', {
            id: String(m.id),
            alias: alias,
            channel: String(m.channel || 'general'),
            body: text,
            location: String(m.location || ''),
            urgent: !!m.urgent,
            ts: when || new Date().toISOString()
          });
          const localId = mine.get(alias + '\u0001' + text);
          if (localId) { try { await DB.delete('messages', localId); } catch(e) {} mine.delete(alias + '\u0001' + text); }
        }
      }
      Store.set('last_sync', new Date().toISOString());
      // Determine reach state from /api/status peers count
      try {
        const statusCtrl = new AbortController();
        const statusTimer = setTimeout(() => statusCtrl.abort(), 5000);
        const sr = await fetch(this.url + '/api/status', {signal: statusCtrl.signal});
        clearTimeout(statusTimer);
        const st = sr.ok ? await sr.json() : null;
        const peerList = st?.peers || [];
        const peerCount = Array.isArray(peerList) ? peerList.length : (typeof peerList === 'number' ? peerList : 0);
        this.updateConnState(peerCount > 0 ? 'regional' : 'local');
        // Populate peers list UI
        const peersListEl = document.getElementById('peers-list');
        const peerBadge = document.getElementById('peer-count-badge');
        if (peerBadge) peerBadge.textContent = peerCount + ' peer' + (peerCount !== 1 ? 's' : '');
        // Update hero badge
        const heroPeers = document.getElementById('hero-sync-badge');
        if (heroPeers) heroPeers.textContent = peerCount + ' Peer' + (peerCount !== 1 ? 's' : '');
        if (peersListEl) {
          if (!Array.isArray(peerList) || peerList.length === 0) {
            peersListEl.innerHTML = '<div class="text-muted font-xs">No peers connected</div>';
          } else {
            peersListEl.innerHTML = peerList.map(p =>
              `<div class="peer-item"><span class="font-sm">${esc(p.alias||p.id||'Unknown')}</span><span class="badge badge-muted font-xs">${esc(p.channel||'general')}</span></div>`
            ).join('');
          }
        }
      } catch { this.updateConnState('local'); }
      this.updateSyncDisplay();
      if (UI.currentTab === 'messages') Messages.refresh();
      // Drain offline queue
      await this.drainQueue();
      if (manual) Toast.show('Synced with hub', 'success', 2500);
    } catch(e) {
      this.updateConnState(this.url ? 'error' : 'offline');
      if (Store.get('dev_mode')) console.warn('Hub sync error:', e);
      if (manual || Store.get('dev_mode')) {
        const hubAddr = this.url || 'unknown';
        if (this.blockedBySecurePage()) {
          this.explainSecurePage();
        } else {
          const why = e && e.name === 'AbortError'
            ? 'Hub at ' + hubAddr + ' timed out — is the hub device on the same Wi-Fi?'
            : 'Could not reach hub at ' + hubAddr + ' — check the address and that the hub device is on';
          Toast.show(why + ' Your messages are saved and will retry.', 'warning', 6000);
        }
      }
    } finally {
      this._syncing = false;
      syncBtns.forEach(b => BtnLoading.stop(b));
      document.getElementById('messages-list')?.setAttribute('aria-busy', 'false');
    }
  },
  // The text a hub stores for one of our messages (hubs keep alias + channel + text only).
  wireText(msg) {
    let t = String(msg && msg.body != null ? msg.body : '');
    if (msg && msg.urgent && !/^🚨/.test(t)) t = '🚨 URGENT: ' + t;
    if (msg && msg.location) t += ' 📍 ' + String(msg.location);
    return t.trim().slice(0, 1000);
  },
  // What we send to a hub. ARK hubs accept this at /api/post and sign it themselves.
  wirePayload(msg) {
    const text = this.wireText(msg);
    return JSON.stringify({ alias: String(msg.alias || 'Anonymous').slice(0, 40), channel: String(msg.channel || 'general'), text: text, body: text });
  },
  // A page loaded over https is not allowed by browsers to talk to a plain http:// hub on local Wi-Fi.
  blockedBySecurePage() {
    return location.protocol === 'https:' && /^http:\/\//i.test(this.url || '');
  },
  explainSecurePage() {
    const u = this.url || '';
    Modal.open(
      '<p style="line-height:1.6;margin-bottom:10px">You opened ARK from a secure website. Browsers do not let a secure website talk to a hub on local Wi-Fi.</p>' +
      '<p style="line-height:1.6;margin-bottom:10px"><strong>Do one of these instead:</strong></p>' +
      '<ol style="line-height:1.7;padding-left:20px;margin-bottom:12px">' +
      '<li>Join the hub\'s Wi-Fi and type this address into your browser:<br><strong style="word-break:break-all">' + esc(u) + '</strong></li>' +
      '<li>Or open the copy of ARK you saved to this device (the downloaded file), then connect to the hub from there.</li>' +
      '</ol><button class="btn btn-primary" onclick="Modal.close()">OK</button>',
      'Cannot reach the hub from this page');
  },
  _draining: false,
  async drainQueue() {
    if (this._draining) return;
    const queue = Store.get('msg_queue', []);
    if (!Array.isArray(queue) || !queue.length || !this.url) return;
    this._draining = true;
    const remaining = [];
    const sentIds = [];
    try {
    for (const msg of queue) {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 10000);
      try {
        const r = await fetch(this.url + '/api/post', {
          method: 'POST',
          headers: {'content-type':'application/json'},
          body: this.wirePayload(msg),
          signal: ctrl.signal
        });
        if (!r.ok) remaining.push(msg); else sentIds.push(msg.id);
      } catch(e) { console.warn('Hub drainQueue:', e); remaining.push(msg); }
      finally { clearTimeout(tid); }
    }
    // Messages queued while we were sending must not be lost: keep anything not in our snapshot.
    const snapshotIds = new Set(queue.map(m => m && m.id));
    const latest = Store.get('msg_queue', []);
    const added = Array.isArray(latest) ? latest.filter(m => m && !snapshotIds.has(m.id)) : [];
    Store.set('msg_queue', remaining.concat(added));
    } finally { this._draining = false; }
    for (const id of sentIds) await Messages.markSent(id);
    Messages.updateQueueBadge();
    if (sentIds.length) Messages.refresh();
  },
  // state: 'offline' | 'syncing' | 'local' | 'regional' | 'extended' | 'global' | 'error'
  updateConnState(state) {
    const pill = document.getElementById('conn-pill');
    const detail = document.getElementById('hub-status-detail');
    const labels = {
      offline:  { cls: 'conn-offline',   text: 'OFFLINE',    detail: 'Not connected to any hub.' },
      syncing:  { cls: 'conn-syncing',   text: 'SYNCING…',   detail: 'Connecting to hub…' },
      local:    { cls: 'conn-local',     text: 'CONNECTED',  detail: 'Connected to a hub on this network.' },
      regional: { cls: 'conn-regional',  text: 'REGIONAL',   detail: 'Hub has online peers nearby.' },
      extended: { cls: 'conn-extended',  text: 'EXTENDED',   detail: 'Multi-hop mesh reachable.' },
      global:   { cls: 'conn-global',    text: 'GLOBAL',     detail: 'Internet gateway available.' },
      error:    { cls: 'conn-error',     text: 'ERROR',      detail: 'Hub unreachable' + (this.url ? ' (' + this.url + ')' : '') + ' — check URL and Wi-Fi.' },
    };
    const cfg = labels[state] || labels.offline;
    if (pill) {
      pill.className = 'conn-pill ' + cfg.cls; pill.textContent = cfg.text;
      pill.title = cfg.detail + ' Tap for connection details';
      pill.setAttribute('aria-label', 'Connection: ' + cfg.text + '. Show connection details');
    }
    if (detail) detail.textContent = cfg.detail;
    // Show/hide disconnect button in Network tab
    const disconnBtn = document.getElementById('hub-disconnect-btn');
    if (disconnBtn) {
      const connected = state === 'local' || state === 'regional' || state === 'extended' || state === 'global';
      disconnBtn.style.display = connected ? '' : 'none';
    }
    // Update hero status badge
    const heroStatus = document.getElementById('hero-status-badge');
    if (heroStatus) {
      const connected = state === 'local' || state === 'regional' || state === 'extended' || state === 'global';
      if (connected) {
        heroStatus.textContent = '● Connected';
        heroStatus.className = 'tile-status active';
      } else if (state === 'syncing') {
        heroStatus.textContent = '◎ Syncing…';
        heroStatus.className = 'tile-status';
      } else if (state === 'error') {
        heroStatus.textContent = 'Cannot reach hub';
        heroStatus.className = 'tile-status';
      } else {
        // offline — neutral badge; "Offline Ready" means the app works, not that we're connected
        heroStatus.textContent = 'Not connected';
        heroStatus.className = 'tile-status';
      }
    }
    // Show/hide heartbeat row in Network tab
    const hbRow = document.getElementById('hub-heartbeat-row');
    const hbLabel = document.getElementById('hub-heartbeat-label');
    if (hbRow && hbLabel) {
      const isConnected = state === 'local' || state === 'regional' || state === 'extended' || state === 'global';
      hbRow.style.display = isConnected ? '' : 'none';
      if (isConnected) {
        const ls = Store.get('last_sync');
        hbLabel.textContent = ls ? 'Last heartbeat: ' + Hub._relativeTime(ls) : 'Hub alive';
      }
    }
    // Update wifi-status badge in Network tab
    const wifiEl = document.getElementById('wifi-status');
    if (wifiEl) {
      if (state === 'local' || state === 'regional' || state === 'extended' || state === 'global') {
        wifiEl.textContent = '✓ Connected';
        wifiEl.className = 'badge badge-green';
      } else if (state === 'error') {
        wifiEl.textContent = '✗ Error';
        wifiEl.className = 'badge badge-red';
      } else if (state === 'offline') {
        wifiEl.textContent = '✗ No Hub';
        wifiEl.className = 'badge badge-red';
      } else {
        wifiEl.textContent = 'Syncing…';
        wifiEl.className = 'badge badge-blue';
      }
    }
  },
  // Legacy shim — keep callers that still pass a color+text pair working
  updateStatusDot(color, text) {
    if (color === 'green') this.updateConnState('local');
    else if (color === 'yellow') this.updateConnState('syncing');
    else if (color === 'red') this.updateConnState('offline');
    else this.updateConnState('offline');
  },
  updateSyncDisplay() {
    const ls = Store.get('last_sync');
    const syncText = ls ? 'Last synced: ' + this._relativeTime(ls) : 'Never synced';
    const el = document.getElementById('last-sync-display');
    const urlEl = document.getElementById('hub-url-display');
    if (el) el.textContent = ls ? 'Last sync: ' + new Date(ls).toLocaleString() : 'Never synced';
    if (urlEl) urlEl.textContent = this.url ? 'Hub: ' + this.url : 'Hub: not configured';
    // Update Network tab sync/interval display
    const netSyncEl = document.getElementById('net-last-sync');
    if (netSyncEl) netSyncEl.textContent = syncText;
    const secs = parseInt(Store.get('sync_interval', 60));
    const netIntervalEl = document.getElementById('net-sync-interval');
    if (netIntervalEl) {
      netIntervalEl.textContent = secs === 0 ? 'Manual sync only' : 'Auto-sync every ' + (secs >= 60 ? Math.round(secs/60) + ' min' : secs + 's');
    }
    // Show/hide appropriate home-tab hub buttons
    const syncBtn = document.getElementById('hub-sync-btn');
    const connectBtn = document.getElementById('hub-connect-btn');
    if (syncBtn) syncBtn.style.display = this.url ? '' : 'none';
    if (connectBtn) connectBtn.style.display = this.url ? 'none' : '';
    // Update heartbeat label with fresh relative time
    const hbLabel = document.getElementById('hub-heartbeat-label');
    if (hbLabel && ls) hbLabel.textContent = 'Last heartbeat: ' + this._relativeTime(ls);
    // Update Network tab QR share card visibility
    if (typeof Network !== 'undefined' && Network._updateHubDeployUI) Network._updateHubDeployUI();
  },
  _relativeTime(isoStr) {
    const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
    if (diff < 60) return diff + 's ago';
    if (diff < 3600) return Math.floor(diff/60) + ' min ago';
    if (diff < 86400) return Math.floor(diff/3600) + ' hr ago';
    return new Date(isoStr).toLocaleString();
  },
  disconnect() {
    if (this._interval) { clearInterval(this._interval); this._interval = null; }
    Store.del('hub_url');
    this.updateConnState('offline');
    this.updateSyncDisplay();
    // Clear both hub URL inputs
    const ni = document.getElementById('hub-url-input'); if (ni) ni.value = '';
    const si = document.getElementById('set-hub-url'); if (si) si.value = '';
    Toast.show('Disconnected from hub', 'info', 2500);
  },
  async post(msg) {
    if (!this.url || Store.get('offline_mode', false)) {
      this.queueMsg(msg);
      return false;
    }
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 8000);
    try {
      const r = await fetch(this.url + '/api/post', {
        method: 'POST',
        headers: {'content-type':'application/json'},
        body: this.wirePayload(msg),
        signal: ctrl.signal
      });
      // A hub that answers with an error has NOT stored the message — keep it queued for retry.
      if (!r.ok) { this.queueMsg(msg); return false; }
      await Messages.markSent(msg.id);
      return true;
    } catch(e) {
      this.queueMsg(msg);
      return false;
    } finally {
      clearTimeout(tid);
    }
  },
  queueMsg(msg) {
    let q = Store.get('msg_queue', []);
    if (!Array.isArray(q)) q = [];
    if (msg && q.some(m => m && m.id === msg.id)) return; // already waiting
    q.push(msg);
    Store.set('msg_queue', q);
    Messages.updateQueueBadge();
  }
};


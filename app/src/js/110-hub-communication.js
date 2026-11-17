// === HUB COMMUNICATION ===
const Hub = {
  _syncing: false,
  _interval: null,
  get url() { return Store.get('hub_url', ''); },
  startAutoSync() {
    if (this._interval) clearInterval(this._interval);
    let secs = parseInt(Store.get('sync_interval', 60));
    if (isNaN(secs)) secs = 60; // a damaged setting must not switch checking off
    // Low-power mode: minimum 5-minute sync regardless of setting
    if (Store.get('low_power', false) && secs > 0 && secs < 300) secs = 300;
    if (secs > 0) this._interval = setInterval(() => this.sync(), secs * 1000);
  },
  async sync(manual = false) {
    // A check is already running. Remember that the person asked, so they still get an answer.
    if (this._syncing) { if (manual) this._manualNext = true; return; }
    if (!this.url || Store.get('offline_mode', false)) {
      if (manual) Toast.show(Store.get('offline_mode', false) ? 'Offline mode is on. Turn it off in Settings to reach a hub.' : 'You have not joined a hub yet. Open the Network tab to join one.', 'warning', 4000);
      return;
    }
    this._syncing = true;
    const syncBtns = BtnLoading.all('button[onclick*="Hub.sync("]');
    syncBtns.forEach(b => BtnLoading.start(b, 'Syncing…'));
    document.getElementById('messages-list')?.setAttribute('aria-busy', 'true');
    this.updateConnState('syncing');
    const base = this.url; // the hub this check is for
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 8000);
      const r = await fetch(base + '/api/messages?limit=100', {signal: ctrl.signal});
      clearTimeout(tid);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      // The person left or changed hub while we waited: do not show "Connected" for a hub they left.
      if (this.url !== base) { this._hubChanged(); return; }
      const msgs = (data && data.messages) || data || [];
      if (Array.isArray(msgs)) {
        // Our own messages come back from the hub under the hub's id. Find the local copies
        // so each message is shown once, not twice.
        const mine = new Map();
        const arrived = []; // ids of our own messages that the hub already holds
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
            urgent: !!m.urgent || /^🚨 URGENT:/.test(text),
            ts: when || new Date().toISOString()
          });
          const localId = mine.get(alias + '\u0001' + text);
          if (localId) {
            try { await DB.delete('messages', localId); } catch(e) {}
            mine.delete(alias + '\u0001' + text);
            arrived.push(localId);
          }
        }
        // The hub already has these, so they must not be sent a second time.
        if (arrived.length) {
          const q = Store.get('msg_queue', []);
          if (Array.isArray(q) && q.some(x => x && arrived.indexOf(x.id) !== -1)) {
            Store.set('msg_queue', q.filter(x => !(x && arrived.indexOf(x.id) !== -1)));
            Messages.updateQueueBadge();
          }
        }
      }
      if (this.url !== base) { this._hubChanged(); return; }
      Store.set('last_sync', new Date().toISOString());
      // Determine reach state from /api/status peers count
      try {
        const statusCtrl = new AbortController();
        const statusTimer = setTimeout(() => statusCtrl.abort(), 5000);
        const sr = await fetch(base + '/api/status', {signal: statusCtrl.signal});
        clearTimeout(statusTimer);
        const st = sr.ok ? await sr.json() : null;
        // "peers" are the OTHER HUBS this hub knows about (a number, or a list on older hubs).
        const peerList = st?.peers || [];
        const peerCount = Array.isArray(peerList) ? peerList.length : (typeof peerList === 'number' ? peerList : 0);
        this.updateConnState(peerCount > 0 ? 'regional' : 'local');
        this.showLinkedHubs(peerCount, peerList);
      } catch { this.updateConnState('local'); }
      this.updateSyncDisplay();
      // Always refresh: on other screens this is what lights the "new messages" dot on the bottom bar.
      Messages.refresh();
      // Drain offline queue
      await this.drainQueue();
      if (manual) {
        // Be exact: only say "up to date" when nothing is still waiting on this device.
        let left = Store.get('msg_queue', []);
        left = Array.isArray(left) ? left.length : 0;
        if (left) Toast.show('Connected to the hub, but ' + left + (left !== 1 ? ' messages are' : ' message is') + ' still waiting to send. ARK will keep trying. You can also tap Sync now.', 'warning', 7000);
        else Toast.show('Connected to the hub. Messages are up to date.', 'success', 3500);
      }
    } catch(e) {
      // The failed check was for a hub the person has since left or replaced. Do not blame the
      // new hub for it: check the new one instead.
      if (this.url !== base) { this._hubChanged(); return; }
      this.updateConnState(this.url ? 'error' : 'offline');
      if (Store.get('dev_mode')) console.warn('Hub sync error:', e);
      if (manual || Store.get('dev_mode')) {
        const hubAddr = this.url || 'unknown';
        if (this.blockedBySecurePage()) {
          this.explainSecurePage();
        } else {
          const why = e && e.name === 'AbortError'
            ? 'The hub at ' + hubAddr + ' did not answer. Check you are on the same Wi-Fi as the hub.'
            : 'Could not reach the hub at ' + hubAddr + '. Check the address, and that the hub laptop is on.';
          Toast.show(why + ' Your messages are saved on this device.', 'warning', 8000);
        }
      }
    } finally {
      this._syncing = false;
      this._manualNext = false;
      syncBtns.forEach(b => BtnLoading.stop(b));
      document.getElementById('messages-list')?.setAttribute('aria-busy', 'false');
    }
  },
  // A check was under way when the person left or switched hub. Drop its result; check the new hub next.
  _manualNext: false,
  _hubChanged() {
    const asked = this._manualNext; // the person tapped Join or Sync now while the old check ran
    this._manualNext = false;
    if (!this.url) this.updateConnState('offline');
    else setTimeout(() => this.sync(asked), 50);
  },
  // Show how many other hubs this hub is linked to (Network tab + Home tile).
  showLinkedHubs(count, list) {
    const n = Number(count) || 0;
    const badge = document.getElementById('peer-count-badge');
    if (badge) badge.textContent = n + (n === 1 ? ' hub' : ' hubs');
    const hero = document.getElementById('hero-sync-badge');
    if (hero) hero.textContent = n + (n === 1 ? ' linked hub' : ' linked hubs');
    const el = document.getElementById('peers-list');
    if (!el) return;
    if (!this.url) {
      el.innerHTML = '<div class="text-secondary font-sm">Join a hub first. Then you will see here whether it is linked to other hubs.</div>';
    } else if (!n) {
      el.innerHTML = '<div class="text-secondary font-sm">This hub is on its own for now. Messages reach everyone joined to it, and no further.</div>';
    } else if (Array.isArray(list) && list.length) {
      el.innerHTML = list.map(p => {
        const name = (p && typeof p === 'object') ? (p.name || p.alias || p.url || p.id || 'Another hub') : String(p);
        return `<div class="peer-item"><span class="font-sm" style="word-break:break-all">${esc(name)}</span></div>`;
      }).join('');
    } else {
      el.innerHTML = '<div class="text-secondary font-sm">This hub knows ' + (n === 1 ? '1 other hub' : n + ' other hubs') + '. When they are in reach, messages pass between them.</div>';
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
    const base = this.url;
    try {
    for (const msg of queue) {
      // Left or changed hub part-way through: keep the rest waiting, never send to a hub that was left.
      if (this.url !== base) { remaining.push(msg); continue; }
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 10000);
      try {
        const r = await fetch(base + '/api/post', {
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
    // NOTE: the pill text is read back by UI.showConnStatus() — keep OFFLINE / SYNCING… / CONNECTED / ERROR.
    const labels = {
      offline:  { cls: 'conn-offline',   text: 'OFFLINE',    detail: 'Not joined to a hub. Your messages stay on this device.' },
      syncing:  { cls: 'conn-syncing',   text: 'SYNCING…',   detail: 'Looking for the hub…' },
      local:    { cls: 'conn-local',     text: 'CONNECTED',  detail: 'Connected to a hub on this Wi-Fi. Everyone joined to it can see your messages.' },
      regional: { cls: 'conn-regional',  text: 'CONNECTED',  detail: 'Connected to a hub that is linked to other hubs. Messages can pass between them.' },
      extended: { cls: 'conn-extended',  text: 'CONNECTED',  detail: 'Connected to a hub that is linked to other hubs. Messages can pass between them.' },
      global:   { cls: 'conn-global',    text: 'CONNECTED',  detail: 'Connected to a hub that is linked to other hubs. Messages can pass between them.' },
      error:    { cls: 'conn-error',     text: 'ERROR',      detail: 'Cannot reach the hub' + (this.url ? ' at ' + this.url : '') + '. Check you are on the same Wi-Fi as the hub and the address is right. Your messages are saved on this device.' },
    };
    const cfg = labels[state] || labels.offline;
    if (pill) {
      pill.className = 'conn-pill ' + cfg.cls; pill.textContent = cfg.text;
      pill.title = cfg.detail + ' Tap for details.';
      pill.setAttribute('aria-label', 'Connection: ' + cfg.text + '. Show connection details');
    }
    if (detail) detail.textContent = cfg.detail;
    // Show/hide disconnect button in Network tab
    const disconnBtn = document.getElementById('hub-disconnect-btn');
    if (disconnBtn) {
      // Shown whenever a hub address is saved, also when that hub cannot be reached, so a
      // wrong or old address can always be dropped.
      disconnBtn.style.display = this.url ? '' : 'none';
    }
    // Update hero status badge
    const heroStatus = document.getElementById('hero-status-badge');
    if (heroStatus) {
      const connected = state === 'local' || state === 'regional' || state === 'extended' || state === 'global';
      if (connected) {
        heroStatus.textContent = 'Connected';
        heroStatus.className = 'tile-status active';
      } else if (state === 'syncing') {
        heroStatus.textContent = 'Checking…';
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
        hbLabel.textContent = ls ? 'Hub last answered ' + Hub._relativeTime(ls) : 'Hub is answering';
      }
    }
    // Update wifi-status badge in Network tab
    const wifiEl = document.getElementById('wifi-status');
    if (wifiEl) {
      if (state === 'local' || state === 'regional' || state === 'extended' || state === 'global') {
        wifiEl.textContent = 'Connected';
        wifiEl.className = 'badge badge-green';
      } else if (state === 'error') {
        wifiEl.textContent = 'Not found';
        wifiEl.className = 'badge badge-red';
      } else if (state === 'offline') {
        wifiEl.textContent = 'Not joined';
        wifiEl.className = 'badge badge-muted';
      } else {
        wifiEl.textContent = 'Checking…';
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
    const syncText = ls ? 'Last reached a hub ' + this._relativeTime(ls) : 'No hub reached yet';
    const el = document.getElementById('last-sync-display');
    const urlEl = document.getElementById('hub-url-display');
    if (el) el.textContent = ls ? 'Last reached a hub: ' + new Date(ls).toLocaleString() : 'No hub reached yet';
    if (urlEl) urlEl.textContent = this.url ? 'Hub: ' + this.url : 'Hub: not joined yet';
    // Update Network tab sync/interval display
    const netSyncEl = document.getElementById('net-last-sync');
    if (netSyncEl) netSyncEl.textContent = syncText;
    let secs = parseInt(Store.get('sync_interval', 60));
    if (isNaN(secs)) secs = 60;
    const netIntervalEl = document.getElementById('net-sync-interval');
    if (netIntervalEl) {
      netIntervalEl.textContent = !this.url ? 'Join a hub to share messages' : (!(secs > 0) ? 'Checks only when you tap Sync now' : 'Checks by itself every ' + (secs >= 60 ? Math.round(secs/60) + ' min' : secs + ' sec'));
    }
    // Show/hide appropriate home-tab hub buttons
    const syncBtn = document.getElementById('hub-sync-btn');
    const connectBtn = document.getElementById('hub-connect-btn');
    if (syncBtn) syncBtn.style.display = this.url ? '' : 'none';
    if (connectBtn) connectBtn.style.display = this.url ? 'none' : '';
    // "Leave hub" is there from the moment an address is saved (also right after ARK opens).
    const leaveBtn = document.getElementById('hub-disconnect-btn');
    if (leaveBtn) leaveBtn.style.display = this.url ? '' : 'none';
    // Update heartbeat label with fresh relative time
    const hbLabel = document.getElementById('hub-heartbeat-label');
    if (hbLabel && ls) hbLabel.textContent = 'Hub last answered ' + this._relativeTime(ls);
    // Update Network tab QR share card visibility
    if (typeof Network !== 'undefined' && Network._updateHubDeployUI) Network._updateHubDeployUI();
  },
  _relativeTime(isoStr) {
    const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
    if (isNaN(diff)) return 'a while ago';
    if (diff < 10) return 'just now';
    if (diff < 60) return diff + ' sec ago';
    if (diff < 3600) return Math.floor(diff/60) + ' min ago';
    if (diff < 86400) return Math.floor(diff/3600) + ' hr ago';
    return new Date(isoStr).toLocaleString();
  },
  disconnect() {
    // The auto-check timer is left running: it does nothing without a hub, and it must still
    // be there when the user joins a hub again.
    // Remember which hub was left, so ARK does not quietly join it again by itself.
    if (this.url) Store.set('hub_left', this.url);
    Store.del('hub_url');
    this.updateConnState('offline');
    this.showLinkedHubs(0);
    this.updateSyncDisplay();
    // Clear both hub URL inputs
    const ni = document.getElementById('hub-url-input'); if (ni) ni.value = '';
    const si = document.getElementById('set-hub-url'); if (si) si.value = '';
    let waiting = Store.get('msg_queue', []);
    waiting = Array.isArray(waiting) ? waiting.length : 0;
    Toast.show('You have left the hub.' + (waiting ? ' ' + waiting + (waiting !== 1 ? ' messages are' : ' message is') + ' still waiting and will send when you join a hub again.' : ''), 'info', waiting ? 6000 : 3000);
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


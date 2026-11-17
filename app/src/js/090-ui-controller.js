// === UI CONTROLLER ===
const UI = {
  currentTab: 'home',
  _inited: false,
  init() {
    if (this._inited) return;
    this._inited = true;
    // Nav click handlers
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
      // WAI-ARIA tabs pattern: arrow keys / Home / End move between tabs
      btn.addEventListener('keydown', e => {
        const all = Array.from(document.querySelectorAll('.nav-btn'));
        const i = all.indexOf(btn);
        let next = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = all[(i + 1) % all.length];
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = all[(i - 1 + all.length) % all.length];
        else if (e.key === 'Home') next = all[0];
        else if (e.key === 'End') next = all[all.length - 1];
        if (!next) return;
        e.preventDefault();
        this.switchTab(next.dataset.tab);
        next.focus();
      });
    });
    this.startClock();
    this.checkOnline();
    window.addEventListener('online', () => this.checkOnline());
    window.addEventListener('offline', () => this.checkOnline());
  },
  switchTab(tab) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
      b.setAttribute('tabindex', '-1');
    });
    const panel = document.getElementById('tab-' + tab);
    if (panel) panel.classList.add('active');
    const btn = document.querySelector(`.nav-btn[data-tab="${tab}"]`);
    if (btn) {
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      btn.setAttribute('tabindex', '0');
    }
    this.currentTab = tab;
    // Lazy init tabs
    if (tab === 'home') HomeStats.render();
    if (tab === 'survival') Guides.init();
    if (tab === 'radio') Radio.init();
    if (tab === 'map') MapTool.init();
    if (tab === 'messages') { Messages.refresh(); const ta = document.getElementById('msg-text'); if (ta) Messages._onTextInput(ta); }
    if (tab === 'resources') Resources.render();
    if (tab === 'household') Household.load();
    if (tab === 'settings') Settings.load();
    if (tab === 'medical') Medical.load();
    if (tab === 'network') {
      const el = document.getElementById('hub-url-input');
      const url = Store.get('hub_url','');
      if (el && url) el.value = url;
      Hub.updateSyncDisplay();
      // Auto-generate QR if hub URL is already set and display is empty
      if (url) {
        const qrDisplay = document.getElementById('qr-hub-display');
        if (qrDisplay && !qrDisplay.querySelector('svg')) Network.generateHubQR();
      }
    }
  },
  startClock() {
    const tick = () => {
      const now = new Date();
      const t = now.toLocaleTimeString();
      const d = now.toLocaleDateString(undefined, {weekday:'long',year:'numeric',month:'long',day:'numeric'});
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const sbTime = document.getElementById('sb-time');
      const hClock = document.getElementById('home-clock');
      const hDate = document.getElementById('home-date');
      const hTz = document.getElementById('home-tz');
      if (sbTime) sbTime.textContent = now.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
      if (hClock) hClock.textContent = t;
      if (hDate) hDate.textContent = d;
      if (hTz) hTz.textContent = 'Timezone: ' + tz;
    };
    tick();
    setInterval(tick, 1000);
  },
  checkOnline() {
    const online = navigator.onLine;
    const banner = document.getElementById('offline-banner');
    const ind = document.getElementById('offline-indicator');
    if (!online) {
      if (banner) banner.classList.add('show');
      if (ind) ind.textContent = '⚡ OFFLINE';
    } else {
      if (banner) banner.classList.remove('show');
      if (ind) ind.textContent = '';
    }
  },
  openAlertEditor() {
    const cur = Store.get('alert_level', 1);
    // Use ALERT_LEVELS as single source of truth — avoids duplicated/diverging descriptions
    const levels = [1,2,3,4,5].map(n => ({n, ...ALERT_LEVELS[n]}));
    const btns = levels.map(l => `
      <button class="btn ${l.n === cur ? 'btn-primary' : 'btn-secondary'} w-full mb-8" style="text-align:left;padding:10px 14px" onclick="UI._setAlert(${l.n})">
        <strong>Level ${l.n} — ${l.label}</strong><br>
        <span style="font-size:12px;opacity:.8">${l.desc}</span>
      </button>`).join('');
    Modal.open(`<div>${btns}<button class="btn btn-ghost btn-sm w-full" style="margin-top:4px" onclick="Modal.close()">Cancel</button></div>`, '📊 Set Alert Level');
  },
  _setAlert(level) {
    Modal.close();
    Store.set('alert_level', level);
    this.renderAlertLevel(level);
    Toast.show('Alert level set to ' + level, 'info');
  },
  renderAlertLevel(level = 1) {
    const info = ALERT_LEVELS[level] || ALERT_LEVELS[1];
    const el = document.getElementById('alert-display');
    if (!el) return;
    el.className = 'alert-banner ' + info.color;
    const numEl = document.getElementById('alert-num'); if (numEl) numEl.textContent = level;
    const titleEl = document.getElementById('alert-title'); if (titleEl) titleEl.textContent = 'Level ' + level + ' — ' + info.label;
    const descEl = document.getElementById('alert-desc'); if (descEl) descEl.textContent = info.desc;
  },
  quickPost(channel) {
    this.switchTab('messages');
    setTimeout(() => {
      const ch = document.getElementById('msg-channel');
      if (ch) ch.value = channel;
      const ta = document.getElementById('msg-text');
      if (ta) ta.focus();
    }, 100);
  },
  shareApp() { if (typeof ShareARK !== 'undefined') ShareARK.openModal(); },
  showConnStatus() {
    const pill = document.getElementById('conn-pill');
    const state = pill ? pill.textContent.trim() : 'OFFLINE';
    const hasHub = !!Hub.url;
    let icon, title, body, actionBtn = '';
    if (state === 'CONNECTED') {
      icon = '✅'; title = 'Connected — LOCAL hub';
      body = 'You are syncing with a hub on your local Wi-Fi. Messages reach everyone connected to the same hub.';
      actionBtn = `<button class="btn btn-primary mt-16 w-full" onclick="Modal.close();Hub.sync(true)">🔄 Sync Now</button>`;
    } else if (state === 'REGIONAL') {
      icon = '🌐'; title = 'REGIONAL connection';
      body = 'Your hub is connected to nearby hubs. Messages can reach a wider area.';
      actionBtn = `<button class="btn btn-primary mt-16 w-full" onclick="Modal.close();Hub.sync(true)">🔄 Sync Now</button>`;
    } else if (state === 'EXTENDED') {
      icon = '🕸️'; title = 'EXTENDED mesh';
      body = 'Multi-hop mesh is active. Messages can reach further via relay.';
      actionBtn = `<button class="btn btn-primary mt-16 w-full" onclick="Modal.close();Hub.sync(true)">🔄 Sync Now</button>`;
    } else if (state === 'GLOBAL') {
      icon = '🌍'; title = 'GLOBAL — internet available';
      body = 'An internet gateway is reachable. Messages may be relayed further.';
      actionBtn = `<button class="btn btn-primary mt-16 w-full" onclick="Modal.close();Hub.sync(true)">🔄 Sync Now</button>`;
    } else if (state === 'SYNCING…') {
      icon = '🔄'; title = 'Syncing…';
      body = 'ARK is syncing with the hub. This usually takes a few seconds.';
    } else if (state === 'ERROR') {
      icon = '⚠️'; title = 'Hub unreachable';
      body = 'ARK could not reach the hub. Make sure your phone is on the same Wi-Fi as the hub computer, then try again.';
      actionBtn = `<button class="btn btn-primary mt-16 w-full" onclick="Modal.close();Hub.sync(true)">🔄 Try Again</button>`;
    } else {
      icon = '📵'; title = hasHub ? 'Cannot reach hub' : 'No hub connected';
      body = hasHub
        ? 'Your device cannot reach the hub right now. Make sure your phone is on the same Wi-Fi as the hub computer, then tap Sync Now.'
        : 'No hub is configured. ARK works fully offline — your messages are saved right here on this device. When you want to coordinate with neighbors, connect to a community hub on the Network tab.';
      actionBtn = hasHub
        ? `<button class="btn btn-primary mt-16 w-full" onclick="Modal.close();Hub.sync(true)">🔄 Try Sync Now</button>`
        : `<button class="btn btn-primary mt-16 w-full" onclick="Modal.close();UI.switchTab('network')">📡 Set Up Hub Connection</button>`;
    }
    Modal.open(
      `<div style="text-align:center;padding:4px 0 8px">
        <div style="font-size:2.5rem">${icon}</div>
        <div class="mt-8" style="font-weight:800;font-size:1.1rem">${title}</div>
        <div style="color:var(--text-secondary);font-size:14px;margin-top:10px;line-height:1.6">${body}</div>
        ${actionBtn}
        <button class="btn btn-ghost btn-sm mt-8 w-full" onclick="Modal.close()" style="display:block">Dismiss</button>
      </div>`
    );
  }
};


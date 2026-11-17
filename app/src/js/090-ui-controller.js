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
    // An unknown section name must never leave the person looking at a blank screen.
    if (!document.getElementById('tab-' + tab)) { console.warn('UI.switchTab: no such section:', tab); return; }
    const changed = tab !== this.currentTab;
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
    // A new section always opens at its top, not wherever the last one was scrolled to.
    if (changed) { try { window.scrollTo(0, 0); } catch (e) {} }
    // Lazy init tabs. A fault in one section must not break moving between sections.
    try {
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
    } catch (e) {
      console.warn('UI.switchTab: section failed to load:', tab, e);
      try { Toast.show('Part of this screen did not load. Go to Home and open it again.', 'error', 6000); } catch (_) {}
    }
  },
  startClock() {
    const tick = () => {
      const now = new Date();
      const t = now.toLocaleTimeString();
      const d = now.toLocaleDateString(undefined, {weekday:'long',year:'numeric',month:'long',day:'numeric'});
      // Some older phones cannot name their time zone; the clock must still run.
      let tz = '';
      try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
      const sbTime = document.getElementById('sb-time');
      const hClock = document.getElementById('home-clock');
      const hDate = document.getElementById('home-date');
      const hTz = document.getElementById('home-tz');
      if (sbTime) sbTime.textContent = now.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
      if (hClock) hClock.textContent = t;
      if (hDate) hDate.textContent = d;
      if (hTz) hTz.textContent = tz ? 'Time zone: ' + tz.replace(/_/g, ' ') : '';
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
      if (ind) ind.textContent = 'No internet';
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
      <button class="btn ${l.n === cur ? 'btn-primary' : 'btn-secondary'} w-full mb-8" style="text-align:left;justify-content:flex-start;padding:10px 14px;white-space:normal" ${l.n === cur ? 'aria-pressed="true"' : 'aria-pressed="false"'} onclick="UI._setAlert(${l.n})">
        <span><strong>Level ${l.n} — ${l.label}</strong><br>
        <span style="font-size:12px;opacity:.8;font-weight:400">${l.desc}</span></span>
      </button>`).join('');
    Modal.open(`<div><p class="font-sm text-secondary mb-12">This is your own note of how serious things are. It is not an official warning and it is not sent to anyone.</p>${btns}<button class="btn btn-ghost btn-sm w-full" style="margin-top:4px" onclick="Modal.close()">Cancel</button></div>`, 'Set your alert level');
  },
  _setAlert(level) {
    Modal.close();
    Store.set('alert_level', level);
    this.renderAlertLevel(level);
    Toast.show('Alert level set to ' + level + ((ALERT_LEVELS[level] && ALERT_LEVELS[level].label) ? ' — ' + ALERT_LEVELS[level].label : ''), 'info');
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
    // Be honest before they type: with no hub joined, a call for help here reaches nobody yet.
    try {
      if (typeof Hub !== 'undefined' && !Hub.url) {
        if (channel === 'help') Toast.show('No hub joined yet, so a message here will not reach anyone yet. In danger, call 911 or your local emergency number if you can.', 'warning', 8000);
        // The same is true for "I'm safe" and offers: nobody sees them until a hub is joined.
        else Toast.show('No hub joined yet, so nobody will see this message until you join one. Open Hub to join.', 'warning', 7000);
      }
    } catch (e) {}
    // Done straight away, inside the tap: phones only open the keyboard for a focus that comes from a tap.
    try {
      const ch = document.getElementById('msg-channel');
      if (ch) ch.value = channel;
      const ta = document.getElementById('msg-text');
      if (ta) ta.focus();
    } catch (e) {}
  },
  shareApp() { if (typeof ShareARK !== 'undefined') ShareARK.openModal(); },
  showConnStatus() {
    const pill = document.getElementById('conn-pill');
    const state = pill ? pill.textContent.trim() : 'OFFLINE';
    const hasHub = !!Hub.url;
    const syncBtn = label => `<button class="btn btn-primary mt-16 w-full" onclick="Modal.close();Hub.sync(true)"><svg class="hi" aria-hidden="true"><use href="#i-refresh"/></svg> ${label}</button>`;
    let icon = 'wifi', tone = 'var(--green)', title, body, actionBtn = '';
    // The pill says CONNECTED for every joined state; its colour class says whether the hub is linked to other hubs.
    const linked = !!pill && /conn-(regional|extended|global)/.test(pill.className);
    if (linked || state === 'REGIONAL' || state === 'EXTENDED' || state === 'GLOBAL') {
      icon = 'nodes'; title = 'Connected. Your hub is linked to other hubs';
      body = 'This device is sharing messages with an ARK Hub on your Wi-Fi. That hub passes messages on to other hubs it can reach, so they can get to more people.';
      actionBtn = syncBtn('Sync now');
    } else if (state === 'CONNECTED') {
      title = 'Connected to a local hub';
      body = 'This device is sharing messages with an ARK Hub on your Wi-Fi. Your messages reach everyone who has joined the same hub.';
      actionBtn = syncBtn('Sync now');
    } else if (state === 'SYNCING…') {
      icon = 'refresh'; tone = 'var(--accent)'; title = 'Syncing…';
      body = 'ARK is talking to the hub. This usually takes a few seconds.';
    } else if (state === 'ERROR') {
      icon = 'alert'; tone = 'var(--red)'; title = 'Cannot reach the hub';
      body = 'Check that this device is on the same Wi-Fi as the hub computer, and that the hub is still running. Then try again. Your messages are safe on this device.';
      actionBtn = syncBtn('Try again');
    } else {
      icon = 'wifi-off'; tone = 'var(--text-muted)'; title = hasHub ? 'Not connected to the hub' : 'No hub joined yet';
      body = hasHub
        ? 'This device cannot reach the hub right now. Check that it is on the same Wi-Fi as the hub computer, then tap Try again. Your messages are safe on this device.'
        : 'ARK works on this device with no hub: guides, checklists and your plan. To message people nearby, join an ARK Hub. A hub is a laptop or Raspberry Pi running the ARK Hub program. A phone alone cannot be the hub.';
      actionBtn = hasHub
        ? syncBtn('Try again')
        : `<button class="btn btn-primary mt-16 w-full" onclick="Modal.close();UI.switchTab('network')"><svg class="hi" aria-hidden="true"><use href="#i-hub"/></svg> Join a hub</button>`;
    }
    Modal.open(
      `<div style="text-align:center;padding:4px 0 8px">
        <svg class="hi" aria-hidden="true" style="width:40px;height:40px;color:${tone}"><use href="#i-${icon}"/></svg>
        <div id="modal-title" class="mt-8" style="font-weight:700;font-size:1.1rem">${title}</div>
        <div class="text-secondary" style="font-size:14px;margin-top:10px;line-height:1.6">${body}</div>
        ${actionBtn}
        <button class="btn btn-ghost btn-sm mt-8 w-full" onclick="Modal.close()">Close</button>
      </div>`
    );
    // This dialog carries its own heading, so name the dialog after it.
    const box = document.getElementById('ark-modal-box');
    if (box) { box.setAttribute('aria-labelledby', 'modal-title'); box.removeAttribute('aria-label'); }
  }
};


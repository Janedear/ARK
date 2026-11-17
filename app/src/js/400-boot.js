// === GLOBAL ERROR CAPTURE for bug reports ===
window._arkErrors = window._arkErrors || []; // preserve existing buffer on script re-eval
window.addEventListener('error', e => {
  const entry = { msg: e.message, src: (e.filename || '').split('/').pop(), line: e.lineno, stack: (e.error && e.error.stack ? e.error.stack.substring(0, 500) : ''), ts: Date.now() };
  window._arkErrors.push(entry);
  if (window._arkErrors.length > 20) window._arkErrors.shift();
});
window.addEventListener('unhandledrejection', e => {
  const reason = e.reason;
  const entry = { msg: String(reason || 'Promise rejection'), stack: (reason && reason.stack ? reason.stack.substring(0, 500) : ''), ts: Date.now() };
  window._arkErrors.push(entry);
  if (window._arkErrors.length > 20) window._arkErrors.shift();
});

document.addEventListener('DOMContentLoaded', () => {
  // Every start-up step runs on its own: if one fails, the rest of the app still loads.
  const safe = (name, fn) => {
    try { return fn(); }
    catch (e) {
      console.warn('ARK start-up step failed:', name, e);
      try { window._arkErrors.push({ msg: 'boot:' + name + ': ' + (e && e.message), ts: Date.now() }); } catch (_) {}
    }
  };

  // First run is decided first, so the welcome wizard appears even if a later step fails.
  safe('onboarding', () => {
    if (!Store.get('first_run_done')) {
      // Only generate a new hh_id if one doesn't already exist (preserves imported backups)
      if (!Store.get('hh_id')) Store.set('hh_id', generateID());
      document.getElementById('set-hh-id') && (document.getElementById('set-hh-id').value = Store.get('hh_id'));
      // Slight delay so the UI finishes rendering before overlay appears
      setTimeout(() => safe('onboarding-start', () => Onboarding.start()), 300);
    }
  });

  safe('ui', () => UI.init());

  // Bottom tab bar (thumb navigation on phones)
  safe('bottom-bar', () => {
    const syncBTB = tab => document.querySelectorAll('.btb-btn').forEach(b => {
      const on = b.dataset.tab === tab;
      b.classList.toggle('active', on);
      // Tell screen readers which section is open
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    document.querySelectorAll('.btb-btn').forEach(btn => {
      btn.addEventListener('click', () => { if (btn.dataset.tab) UI.switchTab(btn.dataset.tab); });
    });
    const origSwitch = UI.switchTab;
    UI.switchTab = function(tab, ...args) {
      const result = origSwitch.call(this, tab, ...args);
      // Light the button for the section that is really open (switchTab ignores unknown names).
      // Sections with no button of their own leave the bar with nothing lit.
      syncBTB(this.currentTab || tab);
      return result;
    };
    syncBTB(UI.currentTab || 'home');
  });

  safe('checklist', () => Checklist.init());
  safe('ai', () => ARKai.init());
  safe('missing', () => { if (typeof MissingPersons !== 'undefined') MissingPersons.init(); });
  safe('hub-display', () => Hub.updateSyncDisplay());

  // Load persisted alert level
  safe('alert', () => UI.renderAlertLevel(Store.get('alert_level', 1)));

  // Pre-fill alias
  safe('alias', () => {
    const aliasInputs = document.querySelectorAll('#msg-alias');
    const savedAlias = Store.get('last_alias', '');
    aliasInputs.forEach(el => { if (savedAlias) el.value = savedAlias; });
  });

  // Apply persisted settings
  safe('settings', () => {
    const fontSize = parseInt(Store.get('font_size', 16), 10);
    if (fontSize >= 12 && fontSize <= 28) document.documentElement.style.fontSize = fontSize + 'px';
    if (Store.get('high_contrast', false)) Settings.applyContrast();
    if (Store.get('low_power', false)) document.documentElement.classList.add('low-power');
    if (Store.get('dark_mode', false)) Settings.applyDarkMode();
  });

  // Start hub sync
  safe('autosync', () => Hub.startAutoSync());

  // Share messages between ARK tabs open in this browser
  safe('softhub', () => SoftHub.init());

  // === AUTO-DISCOVERY ===
  // After a short delay (let SoftHub settle), start discovery:
  // - announce ourselves to other open ARK tabs/windows
  // - listen for nearby hubs and show a "Join →" banner if one found
  setTimeout(() => safe('discovery', () => SoftHub.startDiscovery()), 2000);

  // Register service worker
  safe('service-worker', () => registerSW());

  // Resources initial render
  safe('resources', () => Resources.render());
  safe('guides', () => Guides.init());
  safe('radio', () => Radio.init());

  // W20: Init new modules
  safe('freqlog', () => FreqLog.render());
  safe('homestats', () => HomeStats.render());
  safe('backup-reminder', () => Settings.checkBackupReminder());

  // W20: Refresh home stats every 30s so board stays current (skip when tab is hidden)
  setInterval(() => { if (!document.hidden) safe('homestats', () => HomeStats.render()); }, 30000);

  // Auto-patch check: silent check on startup, then every 2 hours
  safe('patch-check', () => Network.initPatchCheck());
});

// PWA install prompt
let _deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _deferredInstall = e;
  const banner = document.getElementById('install-banner');
  if (banner) banner.style.display = '';
  const row = document.getElementById('pwa-install-row');
  if (row) row.style.display = '';
});
// Hide the install banner once the app has been installed
window.addEventListener('appinstalled', () => {
  _deferredInstall = null;
  const banner = document.getElementById('install-banner');
  if (banner) banner.style.display = 'none';
  try { Toast.show('ARK is installed. Look for it on your home screen.', 'success', 5000); } catch (_) {}
});
function installPWA() {
  if (!_deferredInstall) {
    // Never a dead button: say what to do instead.
    try { Toast.show('This browser cannot install ARK from here. Open the browser menu and choose "Add to Home Screen".', 'info', 7000); } catch (_) {}
    return;
  }
  try {
    _deferredInstall.prompt();
    _deferredInstall.userChoice.then(() => { _deferredInstall = null; }, () => { _deferredInstall = null; });
  } catch (e) {
    _deferredInstall = null;
    try { Toast.show('Could not start the install. Open the browser menu and choose "Add to Home Screen".', 'error', 7000); } catch (_) {}
  }
  const banner = document.getElementById('install-banner');
  if (banner) banner.style.display = 'none';
}

// Handle beforeunload to save any pending data
window.addEventListener('beforeunload', () => {
  // Settings auto-save
  const alias = document.getElementById('msg-alias');
  if (alias && alias.value.trim()) Store.set('last_alias', alias.value.trim());
});

// (The bottom tab bar is wired up in the DOMContentLoaded start-up above, once it exists.)

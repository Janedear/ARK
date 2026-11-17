// === BOOT ===
/* ============================================================
   ONBOARDING WIZARD
   ============================================================ */
const Onboarding = (() => {
  let currentStep = 1;
  const TOTAL = 5;

  function updateDots(step) {
    for (let i = 1; i <= TOTAL; i++) {
      const dot = document.getElementById('ob-d' + i);
      if (!dot) continue;
      dot.className = 'ob-dot' + (i < step ? ' done' : i === step ? ' active' : '');
    }
  }

  function showStep(n) {
    for (let i = 1; i <= TOTAL; i++) {
      const el = document.getElementById('ob-step-' + i);
      if (el) el.classList.toggle('active', i === n);
    }
    updateDots(n);
    currentStep = n;
  }

  function start() {
    _finishing = false; // allow the wizard to be finished again when re-run from Settings
    try {
      const overlay = document.getElementById('onboard-overlay');
      if (overlay) {
        overlay.classList.remove('hidden');
        showStep(1);
        // Clear any stale validation state
        const nameInput = document.getElementById('ob-name');
        if (nameInput) { nameInput.style.borderColor = ''; }
        const errEl = document.getElementById('ob-name-err');
        if (errEl) errEl.style.display = 'none';
        // Pre-fill from saved data (pre-fill all fields; saveIdentity always writes current values so blank re-entry will clear)
        const savedName = Store.get('user_name', '');
        const savedRole = Store.get('user_role', '');
        const savedAddr = Store.get('user_addr', '');
        const savedHub  = Store.get('hub_url', '');
        const nameEl = document.getElementById('ob-name'); if (nameEl) nameEl.value = savedName;
        const roleEl = document.getElementById('ob-role'); if (roleEl) roleEl.value = savedRole;
        const addrEl = document.getElementById('ob-addr'); if (addrEl) addrEl.value = savedAddr;
        const hubEl  = document.getElementById('ob-hub');  if (hubEl)  hubEl.value  = savedHub;
      }
    } catch (e) { console.warn('Onboarding.start error:', e); }
  }

  function next() {
    if (currentStep < TOTAL) showStep(currentStep + 1);
  }

  function back() {
    if (currentStep > 1) showStep(currentStep - 1);
  }

  function saveIdentity() {
    try {
      const name = (document.getElementById('ob-name')?.value || '').trim();
      if (!name) {
        const nameInput = document.getElementById('ob-name');
        if (nameInput) {
          nameInput.style.borderColor = 'var(--red)';
          nameInput.focus();
        }
        const errEl = document.getElementById('ob-name-err');
        if (errEl) errEl.style.display = '';
        return;
      }
      // Clear error state
      const nameInputClear = document.getElementById('ob-name');
      if (nameInputClear) nameInputClear.style.borderColor = '';
      const errEl = document.getElementById('ob-name-err');
      if (errEl) errEl.style.display = 'none';
      const role = document.getElementById('ob-role')?.value || '';
      const addr = (document.getElementById('ob-addr')?.value || '').trim();
      Store.set('user_name', name);
      // Sync to alias fields
      document.querySelectorAll('#msg-alias').forEach(el => { if (!el.value) el.value = name; });
      Store.set('last_alias', name);
      // Always write role/addr so a blank re-entry clears the previously saved value
      Store.set('user_role', role);
      Store.set('user_addr', addr);
      // Update household name in settings
      const hhNameInput = document.getElementById('hh-name');
      if (hhNameInput && name) hhNameInput.value = name;
    } catch (e) { console.warn('Onboarding.saveIdentity error:', e); }
    next();
  }

  function saveHub() {
    try {
      let url = (document.getElementById('ob-hub')?.value || '').trim();
      if (!url) { next(); return; } // Hub is optional — skip if empty
      if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'http://' + url;
      // Basic validation — must look like an IP or hostname with optional port
      const urlPattern = /^https?:\/\/([\d.]+|localhost|[\w.-]+)(:\d+)?(\/.*)?$/;
      if (!urlPattern.test(url)) {
        Toast.show('Hub URL should be like: http://192.168.1.100:3000', 'warning');
        const hubInput = document.getElementById('ob-hub');
        if (hubInput) { hubInput.style.borderColor = 'var(--red)'; hubInput.focus(); }
        return;
      }
      const hubInput = document.getElementById('ob-hub');
      if (hubInput) hubInput.style.borderColor = '';
      Store.set('hub_url', url);
      // Sync to both hub input fields and the display label
      const settingsHubInput = document.getElementById('set-hub-url');
      if (settingsHubInput) settingsHubInput.value = url;
      const networkHubInput = document.getElementById('hub-url-input');
      if (networkHubInput) networkHubInput.value = url;
      Hub.updateSyncDisplay();
    } catch (e) { console.warn('Onboarding.saveHub error:', e); }
    next();
  }

  async function downloadARK() {
    try {
      // A clean copy: the recipient gets the setup wizard and none of this device's data
      const html = await _freshDownloadHTML();
      download('ARK-CRISIS-SUITE.html', html, 'text/html');
      Toast.show('ARK downloaded — when they open it they\'ll get the setup wizard!', 'success', 3500);
    } catch (e) {
      Toast.show('Download failed — try again', 'error', 3000);
      console.warn('Onboarding.downloadARK error:', e);
    }
  }

  let _finishing = false; // re-entry guard for double-tap
  function finish() {
    if (_finishing) return;
    _finishing = true;
    try {
      Store.set('first_run_done', true);
      const overlay = document.getElementById('onboard-overlay');
      if (overlay) overlay.classList.add('hidden');
      Toast.show('Welcome to ARK — you\'re the first line of safety.', 'success', 4000);

      // Auto-discovery: start finding nearby ARK users on this network
      setTimeout(() => {
        if (typeof SoftHub !== 'undefined') SoftHub.startDiscovery();
        // Show a "share ARK" nudge after welcome toast fully exits (toast is 4s, exit anim ~300ms)
        setTimeout(_showShareNudge, 5000);
      }, 1000);
    } catch (e) {
      console.warn('Onboarding.finish error:', e);
      const overlay = document.getElementById('onboard-overlay');
      if (overlay) overlay.style.display = 'none';
      Store.set('first_run_done', true);
    }
  }

  function _showShareNudge() {
    // Soft nudge to share ARK with the people around them
    const nudgeId = 'ark-share-nudge';
    if (document.getElementById(nudgeId)) return;

    const nudge = document.createElement('div');
    nudge.id = nudgeId;
    nudge.style.cssText = [
      'position:fixed','bottom:calc(80px + env(safe-area-inset-bottom,0px))','left:50%','transform:translateX(-50%)',
      'z-index:8500','max-width:min(400px,calc(100vw - 32px))','width:100%',
      'background:linear-gradient(135deg,rgba(139,111,62,.18) 0%,rgba(240,235,224,.97) 100%)',
      'border:1.5px solid rgba(139,111,62,.35)','border-radius:20px',
      'padding:16px 20px','box-shadow:0 8px 32px rgba(139,111,62,.18)',
      'display:flex','align-items:center','gap:14px',
      'animation:slideUpBanner .35s cubic-bezier(.34,1.56,.64,1) both'
    ].join(';');

    nudge.innerHTML = `
      <div style="flex:1;min-width:0">
        <div style="font-size:.8rem;font-weight:700;color:var(--accent,#8b6f3e);letter-spacing:.06em;text-transform:uppercase;margin-bottom:4px">🤝 Get Your People In</div>
        <div style="font-size:.82rem;color:var(--text-secondary,#555);line-height:1.35;margin-bottom:10px">ARK works best when everyone nearby has it. Send them the link now.</div>
        <div style="display:flex;gap:7px;flex-wrap:wrap">
          <button onclick="ShareARK.shareViaSMS();document.getElementById('${nudgeId}')?.remove()"
            style="background:var(--accent,#8b6f3e);color:#fff;border:none;border-radius:10px;padding:7px 13px;font-size:.78rem;font-weight:700;cursor:pointer">
            💬 SMS
          </button>
          <button onclick="ShareARK.shareViaEmail();document.getElementById('${nudgeId}')?.remove()"
            style="background:var(--accent,#8b6f3e);color:#fff;border:none;border-radius:10px;padding:7px 13px;font-size:.78rem;font-weight:700;cursor:pointer">
            ✉️ Email
          </button>
          <button onclick="ShareARK.openModal();document.getElementById('${nudgeId}')?.remove()"
            style="background:transparent;color:var(--accent,#8b6f3e);border:1.5px solid rgba(139,111,62,.35);border-radius:10px;padding:7px 13px;font-size:.78rem;font-weight:600;cursor:pointer">
            More →
          </button>
          <button onclick="document.getElementById('${nudgeId}')?.remove()"
            style="background:transparent;color:var(--text-muted,#aaa);border:none;font-size:.75rem;cursor:pointer;padding:2px 4px;margin-left:auto;align-self:center">
            ✕
          </button>
        </div>
      </div>`;

    document.body.appendChild(nudge);
    setTimeout(() => { nudge.remove(); }, 20000);
  }

  return { start, next, back, saveIdentity, saveHub, downloadARK, finish };
})();


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
    // Each step opens at its top (on a phone the last step was scrolled down to reach Continue),
    // and its heading takes focus so screen readers announce where the person now is.
    try {
      const overlay = document.getElementById('onboard-overlay');
      if (overlay) overlay.scrollTop = 0;
      const box = overlay && overlay.querySelector('.onboard-box');
      if (box) box.scrollTop = 0;
      const head = document.querySelector('#ob-step-' + n + ' h2');
      if (head && overlay && !overlay.classList.contains('hidden')) head.focus({ preventScroll: true });
    } catch (e) {}
  }

  function _hubError(msg) {
    const errEl = document.getElementById('ob-hub-err');
    if (errEl) { errEl.textContent = msg || ''; errEl.style.display = msg ? '' : 'none'; }
    const hubInput = document.getElementById('ob-hub');
    if (hubInput) hubInput.style.borderColor = msg ? 'var(--red)' : '';
  }

  // The address of the hub this page was loaded from, or '' when it was not loaded from a hub.
  // Hubs serve ARK over plain http from a local (private) network address.
  function _hubFromPage() {
    try {
      if (location.protocol !== 'http:') return '';
      const local = /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})$/;
      return local.test(location.hostname) ? location.origin : '';
    } catch (e) { return ''; }
  }

  function start() {
    _finishing = false; // allow the wizard to be finished again when re-run from Settings
    try {
      const overlay = document.getElementById('onboard-overlay');
      if (overlay) {
        overlay.style.display = ''; // undo the emergency hide in finish()'s fallback
        overlay.classList.remove('hidden');
        showStep(1);
        _hubError('');
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
        // Opened straight from a hub (for example by scanning its QR code)? Then the hub's address
        // is already known: fill it in so nobody has to type numbers in an emergency.
        const guessed = savedHub ? '' : _hubFromPage();
        if (hubEl && guessed) hubEl.value = guessed;
        const hintEl = document.getElementById('ob-hub-hint');
        if (hintEl) hintEl.style.display = guessed ? '' : 'none';
        // Keep the Tab key inside the wizard while it is open (the app behind it is covered).
        if (!overlay._trapBound) {
          overlay._trapBound = true;
          overlay.addEventListener('keydown', e => {
            if (e.key !== 'Tab') return;
            const items = Array.from(overlay.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href]'))
              .filter(el => el.offsetParent !== null);
            if (!items.length) return;
            const first = items[0], last = items[items.length - 1], act = document.activeElement;
            if (e.shiftKey && (act === first || items.indexOf(act) === -1)) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && act === last) { e.preventDefault(); first.focus(); }
          });
        }
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
      let url = (document.getElementById('ob-hub')?.value || '').replace(/\s+/g, '');
      if (!url) { _hubError(''); next(); return; } // Hub is optional — skip if empty
      if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'http://' + url;
      // Basic validation — must look like an IP or hostname with optional port
      const urlPattern = /^https?:\/\/([\d.]+|localhost|[\w.-]+)(:\d+)?(\/.*)?$/;
      if (!urlPattern.test(url)) {
        _hubError('That hub address does not look right. It should look like 192.168.1.20:8080, as shown on the hub\'s screen. Fix it, or clear the box to skip this step.');
        const hubInput = document.getElementById('ob-hub');
        if (hubInput) hubInput.focus();
        return;
      }
      _hubError('');
      Store.set('hub_url', url);
      // Sync to both hub input fields and the display label
      const settingsHubInput = document.getElementById('set-hub-url');
      if (settingsHubInput) settingsHubInput.value = url;
      const networkHubInput = document.getElementById('hub-url-input');
      if (networkHubInput) networkHubInput.value = url;
      Hub.updateSyncDisplay();
      // Start reaching the hub now, quietly, instead of waiting up to a minute for the next check.
      Promise.resolve().then(() => Hub.sync()).catch(() => {});
    } catch (e) { console.warn('Onboarding.saveHub error:', e); }
    next();
  }

  async function downloadARK() {
    // Same path as Save & Share: it ignores double taps and says "Saving…" straight away.
    if (typeof ShareARK !== 'undefined' && ShareARK.downloadFile) return ShareARK.downloadFile();
    try {
      // A clean copy: the recipient gets the setup wizard and none of this device's data
      const html = await _freshDownloadHTML();
      download('ARK-CRISIS-SUITE.html', html, 'text/html');
      Toast.show('A clean copy of ARK is saved. Look in your Downloads or Files, then send it to someone.', 'success', 6000);
    } catch (e) {
      Toast.show('Could not save a copy. Try again, or use your browser menu to save this page.', 'error', 6000);
      console.warn('Onboarding.downloadARK error:', e);
    }
  }

  let _finishing = false; // re-entry guard for double-tap
  function finish() {
    if (_finishing) return;
    _finishing = true;
    // "Skip. I need help now" leaves from step 1: that person must not be interrupted by a share reminder.
    const completed = currentStep >= TOTAL;
    try {
      Store.set('first_run_done', true);
      const overlay = document.getElementById('onboard-overlay');
      if (overlay) overlay.classList.add('hidden');
      // Put keyboard and screen-reader focus on the section now showing, not on a button that has gone.
      try {
        const panel = document.getElementById('tab-' + ((typeof UI !== 'undefined' && UI.currentTab) || 'home'));
        if (panel) panel.focus({ preventScroll: true });
      } catch (e) {}
      Toast.show(completed ? 'ARK is ready. It works with no internet.' : 'ARK is open. You can finish set-up later in Settings.', 'success', 4000);

      // Auto-discovery: start finding nearby ARK users on this network
      setTimeout(() => {
        if (typeof SoftHub !== 'undefined') SoftHub.startDiscovery();
        // Show a "share ARK" nudge after welcome toast fully exits (toast is 4s, exit anim ~300ms)
        if (completed) setTimeout(_showShareNudge, 5000);
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
    // Never on top of an open dialog
    const sm = document.getElementById('share-modal'), am = document.getElementById('ark-modal');
    if ((sm && !sm.classList.contains('hidden')) || (am && !am.classList.contains('hidden'))) return;

    const nudge = document.createElement('div');
    nudge.id = nudgeId;
    nudge.className = 'card';
    nudge.setAttribute('role', 'region');
    nudge.setAttribute('aria-label', 'Share ARK');
    nudge.style.cssText = [
      'position:fixed','bottom:calc(88px + env(safe-area-inset-bottom,0px))','left:50%','transform:translateX(-50%)',
      'z-index:8500','max-width:400px','width:calc(100vw - 32px)','margin:0',
      'animation:slideUpBanner .35s ease both'
    ].join(';');

    nudge.innerHTML = `
      <div class="kicker mb-8">Share ARK</div>
      <div class="font-sm text-secondary mb-12">ARK makes its network from the devices around you. It helps more when your neighbors have it too.</div>
      <div class="flex gap-8 wrap">
        <button class="btn btn-primary btn-sm" onclick="document.getElementById('${nudgeId}')?.remove();ShareARK.openModal()"><svg class="hi" aria-hidden="true"><use href="#i-share"/></svg> Share ARK</button>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('${nudgeId}')?.remove()">Not now</button>
      </div>`;

    document.body.appendChild(nudge);
    setTimeout(() => { nudge.remove(); }, 20000);
  }

  return { start, next, back, saveIdentity, saveHub, downloadARK, finish };
})();


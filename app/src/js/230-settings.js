// === SETTINGS ===
const Settings = {
  load() {
    const hubEl = document.getElementById('set-hub-url'); if (hubEl) hubEl.value = Store.get('hub_url', '');
    // If a stored value is not one of the choices, show the normal one instead of an empty box.
    const syncEl = document.getElementById('set-sync-interval'); if (syncEl) { syncEl.value = Store.get('sync_interval', 60); if (syncEl.selectedIndex < 0) syncEl.value = '60'; }
    const aliasEl = document.getElementById('set-alias'); if (aliasEl) aliasEl.value = Store.get('last_alias', '');
    // The household code is made once and kept, so this screen always shows the same one.
    let hhId = Store.get('hh_id', '');
    if (!hhId) { hhId = generateID(); Store.set('hh_id', hhId); }
    const hhidEl = document.getElementById('set-hh-id'); if (hhidEl) hhidEl.value = hhId;
    const offlineEl = document.getElementById('set-offline-mode'); if (offlineEl) offlineEl.checked = Store.get('offline_mode', false);
    const hcEl = document.getElementById('set-high-contrast'); if (hcEl) hcEl.checked = Store.get('high_contrast', false);
    const devEl = document.getElementById('set-dev-mode'); if (devEl) devEl.checked = Store.get('dev_mode', false);
    const fontEl = document.getElementById('set-font-size'); if (fontEl) { fontEl.value = Store.get('font_size', 16); if (fontEl.selectedIndex < 0) fontEl.value = '16'; }
    const lpEl = document.getElementById('set-low-power');
    if (lpEl) lpEl.checked = Store.get('low_power', false);
    const dmEl = document.getElementById('set-dark-mode');
    if (dmEl) dmEl.checked = Store.get('dark_mode', false);
    const lsEl = document.getElementById('set-last-save');
    if (lsEl) lsEl.textContent = Store.lastSaveLabel();
    this.updateStorageInfo();
    this.checkBackupReminder();
    this._updateNotifBtn();
    this._showPWAInstallRow();
  },

  checkBackupReminder() {
    const lastExport = Store.get('last_export_ts', null);
    const banner = document.getElementById('backup-reminder');
    const daysEl = document.getElementById('backup-days-ago');
    const lxEl = document.getElementById('set-last-export');
    if (!banner) return;
    if (!lastExport) {
      banner.style.display = '';
      if (daysEl) daysEl.textContent = 'You have not saved a backup yet. Tap Save a backup below.';
      if (lxEl) lxEl.textContent = 'Last backup: never';
      return;
    }
    const days = Math.max(0, Math.floor((Date.now() - lastExport) / 86400000));
    if (lxEl) lxEl.textContent = 'Last backup: ' + (days === 0 ? 'today' : days === 1 ? 'yesterday' : days + ' days ago');
    if (days >= 7) {
      banner.style.display = '';
      if (daysEl) daysEl.textContent = `Your last backup was ${days} days ago. Tap Save a backup below.`;
    } else {
      banner.style.display = 'none';
    }
  },

  save() {
    const hubInputEl = document.getElementById('set-hub-url');
    let hubUrl = hubInputEl ? hubInputEl.value.trim() : '';
    // Same clean-up as the Network tab: "192.168.1.5:8080" must become "http://192.168.1.5:8080"
    if (hubUrl) {
      hubUrl = hubUrl.replace(/\/+$/, '');
      if (!/^https?:\/\//i.test(hubUrl)) hubUrl = 'http://' + hubUrl;
      if (hubInputEl) hubInputEl.value = hubUrl;
    }
    let ok = Store.set('hub_url', hubUrl);
    if (hubUrl) SoftHub.yield_to_external(); // external hub configured — stop soft-hub
    // Sync hub URL to network panel (always, including when cleared)
    const netHubEl = document.getElementById('hub-url-input');
    if (netHubEl) netHubEl.value = hubUrl;
    const syncEl = document.getElementById('set-sync-interval');
    if (syncEl) Store.set('sync_interval', syncEl.value);
    const aliasEl = document.getElementById('set-alias');
    const aliasVal = aliasEl ? aliasEl.value.trim() : '';
    ok = Store.set('last_alias', aliasVal) && ok;
    // Sync alias to message panel inputs
    document.querySelectorAll('#msg-alias').forEach(el => { if (aliasVal) el.value = aliasVal; });
    const hhidEl = document.getElementById('set-hh-id');
    if (hhidEl && hhidEl.value) Store.set('hh_id', hhidEl.value);
    const offlineEl = document.getElementById('set-offline-mode');
    if (offlineEl) Store.set('offline_mode', offlineEl.checked);
    const hcEl = document.getElementById('set-high-contrast');
    if (hcEl) Store.set('high_contrast', hcEl.checked);
    const devEl = document.getElementById('set-dev-mode');
    if (devEl) Store.set('dev_mode', devEl.checked);
    const fontEl = document.getElementById('set-font-size');
    if (fontEl) Store.set('font_size', fontEl.value);
    const lpEl = document.getElementById('set-low-power');
    if (lpEl) Store.set('low_power', lpEl.checked);
    const dmEl = document.getElementById('set-dark-mode');
    if (dmEl) Store.set('dark_mode', dmEl.checked);
    Hub.startAutoSync();
    this.applyFontSize();
    this.applyContrast();
    this.applyDarkMode();
    // If saving failed, Store has already said why and what to do.
    if (ok) Toast.show('Settings saved', 'success');
    Hub.updateSyncDisplay && Hub.updateSyncDisplay();
  },

  applyFontSize() {
    const fontEl = document.getElementById('set-font-size');
    const size = fontEl ? fontEl.value : 16;
    document.documentElement.style.fontSize = size + 'px';
  },

  toggleOffline() {
    const offEl = document.getElementById('set-offline-mode');
    if (offEl) Store.set('offline_mode', offEl.checked);
    UI.checkOnline();
    if (offEl) Toast.show(offEl.checked ? 'Offline mode is on. ARK has stopped looking for a hub.' : 'Offline mode is off. ARK will look for your hub again.', 'info', 4000);
  },

  toggleContrast() {
    const hcEl = document.getElementById('set-high-contrast');
    if (hcEl) Store.set('high_contrast', hcEl.checked);
    this.applyContrast();
  },

  applyContrast() {
    const hcEl = document.getElementById('set-high-contrast');
    const on = Store.get('high_contrast', false) || (hcEl ? hcEl.checked : false);
    const root = document.documentElement;
    root.classList.toggle('high-contrast', on);
    const names = ['--text-primary', '--text-secondary', '--text-muted', '--border', '--border-strong'];
    if (on) {
      // Dark mode needs light words on the dark background; the dark-on-light set would be unreadable there.
      const dark = root.classList.contains('dark-mode');
      const vals = dark
        ? ['#ffffff', '#ece8df', '#cfcbc2', '#7d848c', '#a3a9b0']
        : ['#0a0806', '#2a221a', '#5a4a38', '#a89880', '#7a6855'];
      names.forEach((n, i) => root.style.setProperty(n, vals[i]));
    } else {
      names.forEach(n => root.style.removeProperty(n));
    }
  },

  regenHHID() {
    Modal.confirm('Make a new household code? The old code will stop being used. Only do this if you were asked to.', function() {
      const id = generateID();
      const el = document.getElementById('set-hh-id');
      if (el) el.value = id;
      if (Store.set('hh_id', id)) Toast.show('New household code made', 'success');
    }, 'Make a new code', 'Keep this code');
  },

  exportAll() {
    const data = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      settings: Store.exportAll(),
    };
    let finished = false;
    const finish = (msgs, msgsOk) => {
      if (finished) return;
      finished = true;
      data.messages = msgs;
      try {
        download('ark-backup-' + today() + '.json', JSON.stringify(data, null, 2), 'application/json');
      } catch (e) {
        console.error('Export failed', e);
        Toast.show('The backup could not be saved on this device. Free up some space, then try again.', 'error', 7000);
        return;
      }
      Store.set('last_export_ts', Date.now());
      this.checkBackupReminder();
      if (msgsOk) Toast.show('Backup saved to your downloads. Copy the file to a USB stick or another device.', 'success', 7000);
      else Toast.show('Backup saved, but your messages could not be included. Everything else is in the file.', 'warning', 8000);
    };
    // A problem reading messages must not stop the household, plan and settings from being backed up.
    // Opening the message store first means a store that cannot be opened is reported honestly,
    // not written into the file as "no messages".
    DB.open().then(() => DB.getAll('messages')).then(
      msgs => finish(Array.isArray(msgs) ? msgs : [], true),
      e => { console.error('Export: messages unreadable', e); finish([], false); }
    );
    // Never leave the person waiting for a backup: if the messages do not arrive, save the rest.
    setTimeout(() => finish([], false), 10000);
  },

  // Returns an error string if `data` is not an ARK backup, otherwise null.
  _validateBackup(data) {
    const NOT_ARK = 'That file is not an ARK backup. Choose the file whose name starts with ark-backup.';
    const DAMAGED = 'That backup file is damaged and cannot be restored. Try an older backup file.';
    if (!data || typeof data !== 'object' || Array.isArray(data)) return NOT_ARK;
    const hasSettings = data.settings && typeof data.settings === 'object' && !Array.isArray(data.settings);
    const hasMessages = Array.isArray(data.messages);
    if (!hasSettings && !hasMessages) return NOT_ARK;
    if (data.settings !== undefined && !hasSettings) return DAMAGED;
    if (data.messages !== undefined && !hasMessages) return DAMAGED;
    // Must contain at least one recognisable ARK key, so random JSON files are rejected.
    const KNOWN = ['household','hh_id','hh_members','hub_url','sync_interval','last_alias','alert_level',
      'map_markers','medications','msg_queue','resources','font_size','high_contrast','dark_mode','offline_mode','low_power','dev_mode',
      'user_name','user_role','user_addr','missing_persons','custom_checklists'];
    const sKeys = hasSettings ? Object.keys(data.settings) : [];
    const looksLikeArk = sKeys.some(k => KNOWN.includes(k) || k.startsWith('checklist_')) ||
      (typeof data.version === 'string' && typeof data.exportedAt === 'string');
    if (!looksLikeArk) return NOT_ARK;
    if (sKeys.some(k => typeof k !== 'string' || k.length > 200)) return DAMAGED;
    if (hasMessages && data.messages.some(m => !m || typeof m !== 'object' || m.id === undefined || m.id === null))
      return DAMAGED;
    return null;
  },

  importAll() {
    const input = document.getElementById('import-file');
    if (!input) { Toast.show('Restore is not available right now. Close ARK, open it again, then try once more.', 'error', 6000); return; }
    input.click();
  },

  handleImport(input) {
    const file = input.files[0];
    if (!file) return;
    input.value = ''; // allow re-selecting the same file later
    // file.text() is missing on older phones; FileReader works everywhere.
    const read = (typeof file.text === 'function') ? file.text() : new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result || ''));
      r.onerror = () => rej(r.error);
      r.readAsText(file);
    });
    read.then(txt => {
      let data;
      try { data = JSON.parse(txt); }
      catch(e) { Toast.show('That file is not an ARK backup. Choose the file whose name starts with ark-backup.', 'error', 7000); return; }
      const err = this._validateBackup(data);
      if (err) { Toast.show(err, 'error', 7000); return; }
      // Count what's in the backup so the confirmation is meaningful
      const msgCount = Array.isArray(data.messages) ? data.messages.length : 0;
      const settingsCount = data.settings ? Object.keys(data.settings).length : 0;
      const when = data.exportedAt ? new Date(data.exportedAt) : null;
      const exportDate = (when && !isNaN(when.getTime())) ? when.toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'}) : 'an unknown date';
      Modal.confirm(
        `<strong>Restore this backup?</strong><br><br>` +
        `It was saved on <strong>${esc(exportDate)}</strong>. It holds <strong>${settingsCount} saved record${settingsCount !== 1 ? 's' : ''}</strong> (your household, plan and settings) and <strong>${msgCount} message${msgCount !== 1 ? 's' : ''}</strong>.<br><br>` +
        `What is in the backup will replace what is on this device now. Messages already on this device are kept. You cannot undo this.`,
        () => Settings._doImport(data),
        'Restore backup', 'Cancel'
      );
    }).catch(e => {
      console.error('Import read failed', e);
      Toast.show('That file could not be opened. Choose it again, or try another copy of the backup.', 'error', 7000);
    });
  },

  async _doImport(data) {
    let failed = 0;
    if (data.settings) {
      const skipKeys = new Set(['last_gps','last_sync','msg_queue','hh_id']);
      Object.entries(data.settings).forEach(([k, v]) => {
        if (skipKeys.has(k)) return; // skip device-specific keys
        if (!Store.set(k, v)) failed++;
      });
    }
    if (Array.isArray(data.messages)) {
      for (const m of data.messages) {
        if (!m || typeof m !== 'object' || m.id == null) { failed++; continue; }
        try {
          await DB.put('messages', {
            ...m,
            id: String(m.id),
            alias: String(m.alias || 'Anonymous'),
            channel: String(m.channel || 'general'),
            body: String(m.body != null ? m.body : ''),
            location: String(m.location || ''),
            urgent: !!m.urgent,
            ts: (typeof m.ts === 'string' && !isNaN(Date.parse(m.ts))) ? m.ts : new Date().toISOString()
          });
        } catch(e) { failed++; }
      }
    }
    // A private window keeps nothing: reloading would throw the restored data straight away.
    if (!Store.persistent) {
      Toast.show('Your backup is showing for now, but this browser will not keep it. Open ARK in a normal window, not a private one, and restore it there.', 'warning', 12000);
      try { this.load(); } catch (e) {}
      return;
    }
    if (failed) Toast.show('Only part of the backup was restored. ' + failed + ' item' + (failed !== 1 ? 's' : '') + ' could not be saved. Free up space on this device, then restore again.', 'error', 6000);
    else Toast.show('Your backup was restored. ARK is reloading…', 'success');
    // Reload so every screen shows the restored data and nothing in memory can overwrite it.
    setTimeout(() => { try { location.reload(); } catch (e) { this.load(); } }, failed ? 5000 : 1500);
  },

  clearCache() {
    Modal.confirm('<strong>Delete the saved map?</strong><br><br>This removes the map that was saved on this device for use without internet. You will need internet to get it back.<br><br>Your markers, messages, household details and settings are kept.', function() {
      Promise.all([DB.clear('resources'), DB.clear('map_tiles')]).then(() => {
        Toast.show('The saved map was deleted. Everything else is still here.', 'success', 5000);
        Settings.updateStorageInfo();
      }).catch(() => {
        Toast.show('The saved map could not be deleted. Close ARK, open it again, then try once more.', 'error', 6000);
      });
    }, 'Delete saved map', 'Keep the map');
  },

  clearAll() {
    Modal.open(`
      <p style="margin:0 0 8px;line-height:1.6"><strong>This erases everything ARK holds on this device:</strong> your household details, your plan, all messages, map markers, the saved map and your settings.</p>
      <p class="text-secondary" style="margin:0 0 16px;line-height:1.6">You cannot undo this. If you might need any of it later, save a backup first.</p>
      <div class="flex gap-8 wrap" style="justify-content:flex-end">
        <button type="button" class="btn btn-secondary" onclick="Settings.exportAll()">Save a backup first</button>
        <button type="button" class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
        <button type="button" class="btn btn-red" onclick="Modal.close();Settings._confirmWipeFinal()">Erase everything</button>
      </div>
    `, 'Erase everything?');
  },

  // Second confirmation step before the irreversible wipe — requires typing DELETE.
  _confirmWipeFinal() {
    Modal.open(`
      <p style="margin:0 0 12px;line-height:1.6"><strong>Last check.</strong> Everything ARK holds on this device will be erased. It cannot be brought back.</p>
      <label class="form-label" for="wipe-confirm-input">Type the word DELETE to go ahead</label>
      <input id="wipe-confirm-input" class="form-input" style="width:100%;margin:6px 0 12px" placeholder="DELETE" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" oninput="document.getElementById('wipe-confirm-btn').disabled=this.value.trim().toUpperCase()!=='DELETE'">
      <div class="flex gap-8 wrap" style="justify-content:flex-end">
        <button type="button" class="btn btn-ghost" onclick="Modal.close()">Keep my data</button>
        <button type="button" id="wipe-confirm-btn" class="btn btn-red" disabled onclick="Modal.close();Settings._doWipeAll()">Erase everything</button>
      </div>
    `, 'Are you sure?');
    setTimeout(() => document.getElementById('wipe-confirm-input')?.focus(), 100);
  },

  async _doWipeAll() {
    Store.clearAll(); // only ark_ keys; works in memory-fallback mode too
    // Nothing still running (location, timers) may write erased data back before the reload.
    Store._frozen = true;
    // Finish before the reload. A failure or a stuck database must not stop the reload, or the screen would still show erased data.
    try {
      await Promise.race([
        Promise.all([DB.clear('messages'), DB.clear('resources'), DB.clear('map_tiles')]),
        new Promise(res => setTimeout(res, 5000))
      ]);
    } catch (e) { console.error('Wipe: could not clear stored messages or map', e); }
    Toast.show('Everything has been erased', 'info');
    try { location.reload(); } catch (e) { Store._frozen = false; }
  },

  _fmtBytes(b) {
    b = Number(b) || 0;
    if (b >= 1073741824) return (b / 1073741824).toFixed(1) + ' GB';
    if (b >= 1048576) return (b / 1048576).toFixed(1) + ' MB';
    return Math.max(1, Math.round(b / 1024)) + ' KB';
  },

  updateStorageInfo() {
    const el = document.getElementById('set-storage-info');
    if (!el) return;
    if (!Store.persistent) {
      el.textContent = 'This browser is not keeping your information. It will be lost when you close ARK. Open ARK in a normal window, not a private one.';
      return;
    }
    // localStorage usage
    let lsBytes = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('ark_')) {
          const v = localStorage.getItem(k);
          if (v) lsBytes += v.length * 2; // UTF-16 chars
        }
      }
    } catch(e) {}
    const basic = 'Space used on this device: about ' + this._fmtBytes(lsBytes) + '.';

    // Use Storage Quota API if available (counts the saved map and messages too)
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(est => {
        const usage = Number(est && est.usage) || 0;
        const quota = Number(est && est.quota) || 0;
        if (!quota) { el.textContent = basic; return; }
        const pct = Math.round(usage / quota * 100);
        el.textContent = `Space used on this device: ${this._fmtBytes(Math.max(usage, lsBytes))} of about ${this._fmtBytes(quota)} (${pct}%).`;
        // Show warning banner if > 80%
        const banner = document.getElementById('storage-warning-banner');
        if (banner) banner.classList.toggle('hidden', pct < 80);
      }).catch(() => {
        el.textContent = basic;
      });
    } else {
      el.textContent = basic;
    }
  },

  toggleLowPower() {
    const on = document.getElementById('set-low-power').checked;
    Store.set('low_power', on);
    document.documentElement.classList.toggle('low-power', on);
    // Apply reduced polling
    Hub.startAutoSync();
    Toast.show(on ? 'Save battery is on. ARK now checks for messages every 5 minutes.' : 'Save battery is off', 'info', 4000);
  },

  rerunWizard() {
    // Hide settings tab and show onboarding overlay
    Onboarding.start();
  },

  toggleDarkMode() {
    const on = document.getElementById('set-dark-mode').checked;
    Store.set('dark_mode', on);
    document.documentElement.classList.toggle('dark-mode', on);
    this.applyContrast(); // stronger contrast uses different colours in dark mode
    try { MapTool.draw(); } catch (e) {} // the empty-map colours follow light and dark mode
    Toast.show(on ? 'Dark mode on' : 'Dark mode off', 'info');
  },

  applyDarkMode() {
    const on = Store.get('dark_mode', false);
    document.documentElement.classList.toggle('dark-mode', on);
    const el = document.getElementById('set-dark-mode');
    if (el) el.checked = on;
    if (Store.get('high_contrast', false)) this.applyContrast();
  },

  requestNotifications() {
    if (!('Notification' in window)) {
      Toast.show('This browser cannot show pop-up alerts', 'error');
      return;
    }
    if (Notification.permission === 'granted') {
      Toast.show('Pop-up alerts are already allowed', 'success');
      this._updateNotifBtn();
      return;
    }
    if (Notification.permission === 'denied') {
      Toast.show('Pop-up alerts are blocked. Allow notifications for this page in your browser settings.', 'error', 6000);
      return;
    }
    // Older Safari takes a callback and returns nothing; newer browsers return a promise.
    let handled = false;
    const done = perm => {
      if (handled) return;
      handled = true;
      if (perm === 'granted') Toast.show('Pop-up alerts allowed', 'success');
      else Toast.show('Pop-up alerts were not allowed', 'info');
      this._updateNotifBtn();
    };
    try {
      const p = Notification.requestPermission(done);
      if (p && typeof p.then === 'function') p.then(done).catch(() => {});
    } catch (e) {
      Toast.show('This browser cannot show pop-up alerts', 'error');
    }
  },

  _updateNotifBtn() {
    const btn = document.getElementById('set-notif-btn');
    if (!btn || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      btn.textContent = 'Allowed';
      btn.disabled = true;
    } else if (Notification.permission === 'denied') {
      // Left enabled: tapping it explains how to unblock.
      btn.textContent = 'Blocked';
      btn.disabled = false;
    } else {
      btn.textContent = 'Enable';
      btn.disabled = false;
    }
  },

  _showPWAInstallRow() {
    // Show the install row if the browser has an install prompt available
    const row = document.getElementById('pwa-install-row');
    if (row) row.style.display = (typeof _deferredInstall !== 'undefined' && _deferredInstall) ? '' : 'none';
  }
};

// === SETTINGS ===
const Settings = {
  load() {
    const hubEl = document.getElementById('set-hub-url'); if (hubEl) hubEl.value = Store.get('hub_url', '');
    const syncEl = document.getElementById('set-sync-interval'); if (syncEl) syncEl.value = Store.get('sync_interval', 60);
    const aliasEl = document.getElementById('set-alias'); if (aliasEl) aliasEl.value = Store.get('last_alias', '');
    const hhidEl = document.getElementById('set-hh-id'); if (hhidEl) hhidEl.value = Store.get('hh_id', generateID());
    const offlineEl = document.getElementById('set-offline-mode'); if (offlineEl) offlineEl.checked = Store.get('offline_mode', false);
    const hcEl = document.getElementById('set-high-contrast'); if (hcEl) hcEl.checked = Store.get('high_contrast', false);
    const devEl = document.getElementById('set-dev-mode'); if (devEl) devEl.checked = Store.get('dev_mode', false);
    const fontEl = document.getElementById('set-font-size'); if (fontEl) fontEl.value = Store.get('font_size', 16);
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
      if (daysEl) daysEl.textContent = 'never';
      if (lxEl) lxEl.textContent = 'Last exported: never';
      return;
    }
    const days = Math.floor((Date.now() - lastExport) / 86400000);
    if (lxEl) lxEl.textContent = `Last exported: ${days === 0 ? 'today' : days + ' day' + (days!==1?'s':'') + ' ago'}`;
    if (days >= 7) {
      banner.style.display = '';
      if (daysEl) daysEl.textContent = `${days} days`;
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
    Store.set('hub_url', hubUrl);
    if (hubUrl) SoftHub.yield_to_external(); // external hub configured — stop soft-hub
    // Sync hub URL to network panel (always, including when cleared)
    const netHubEl = document.getElementById('hub-url-input');
    if (netHubEl) netHubEl.value = hubUrl;
    const syncEl = document.getElementById('set-sync-interval');
    if (syncEl) Store.set('sync_interval', syncEl.value);
    const aliasEl = document.getElementById('set-alias');
    const aliasVal = aliasEl ? aliasEl.value.trim() : '';
    Store.set('last_alias', aliasVal);
    // Sync alias to message panel inputs
    document.querySelectorAll('#msg-alias').forEach(el => { if (aliasVal) el.value = aliasVal; });
    const hhidEl = document.getElementById('set-hh-id');
    if (hhidEl) Store.set('hh_id', hhidEl.value);
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
    Toast.show('✅ Settings saved', 'success');
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
  },

  toggleContrast() {
    const hcEl = document.getElementById('set-high-contrast');
    if (hcEl) Store.set('high_contrast', hcEl.checked);
    this.applyContrast();
  },

  applyContrast() {
    const hcEl = document.getElementById('set-high-contrast');
    const on = Store.get('high_contrast', false) || (hcEl ? hcEl.checked : false);
    document.documentElement.classList.toggle('high-contrast', on);
    if (on) {
      document.documentElement.style.setProperty('--text-primary', '#0a0806');
      document.documentElement.style.setProperty('--text-secondary', '#2a221a');
      document.documentElement.style.setProperty('--text-muted', '#5a4a38');
      document.documentElement.style.setProperty('--border', '#a89880');
      document.documentElement.style.setProperty('--border-strong', '#7a6855');
    } else {
      document.documentElement.style.removeProperty('--text-primary');
      document.documentElement.style.removeProperty('--text-secondary');
      document.documentElement.style.removeProperty('--text-muted');
      document.documentElement.style.removeProperty('--border');
      document.documentElement.style.removeProperty('--border-strong');
    }
  },

  regenHHID() {
    const id = generateID();
    document.getElementById('set-hh-id').value = id;
    Store.set('hh_id', id);
  },

  exportAll() {
    const data = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      settings: Store.exportAll(),
    };
    DB.getAll('messages').then(msgs => {
      data.messages = msgs;
      download('ark-backup-' + new Date().toISOString().slice(0,10) + '.json', JSON.stringify(data, null, 2), 'application/json');
      Store.set('last_export_ts', Date.now());
      this.checkBackupReminder();
      Toast.show('📂 All ARK data saved to your downloads', 'success');
    }).catch(e => {
      console.error('Export failed', e);
      Toast.show('Export failed — please try again', 'error');
    });
  },

  // Returns an error string if `data` is not an ARK backup, otherwise null.
  _validateBackup(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return 'File is not an ARK backup (not a JSON object)';
    const hasSettings = data.settings && typeof data.settings === 'object' && !Array.isArray(data.settings);
    const hasMessages = Array.isArray(data.messages);
    if (!hasSettings && !hasMessages) return 'File is not an ARK backup (no settings or messages found)';
    if (data.settings !== undefined && !hasSettings) return 'Backup is damaged (settings section is invalid)';
    if (data.messages !== undefined && !hasMessages) return 'Backup is damaged (messages section is invalid)';
    // Must contain at least one recognisable ARK key, so random JSON files are rejected.
    const KNOWN = ['household','hh_id','hh_members','hub_url','sync_interval','last_alias','alert_level',
      'map_markers','medications','msg_queue','resources','font_size','high_contrast','dark_mode','offline_mode','low_power','dev_mode',
      'user_name','user_role','user_addr','missing_persons','custom_checklists'];
    const sKeys = hasSettings ? Object.keys(data.settings) : [];
    const looksLikeArk = sKeys.some(k => KNOWN.includes(k) || k.startsWith('checklist_')) ||
      (typeof data.version === 'string' && typeof data.exportedAt === 'string');
    if (!looksLikeArk) return 'File doesn\'t look like an ARK backup (no ARK data keys found)';
    if (sKeys.some(k => typeof k !== 'string' || k.length > 200)) return 'Backup is damaged (invalid key names)';
    if (hasMessages && data.messages.some(m => !m || typeof m !== 'object' || m.id === undefined || m.id === null))
      return 'Backup is damaged (a message is missing its id)';
    return null;
  },

  importAll() {
    document.getElementById('import-file').click();
  },

  handleImport(input) {
    const file = input.files[0];
    if (!file) return;
    input.value = ''; // allow re-selecting the same file later
    file.text().then(txt => {
      let data;
      try { data = JSON.parse(txt); }
      catch(e) { Toast.show('That file isn\'t valid JSON — please choose an ARK backup file', 'error'); return; }
      const err = this._validateBackup(data);
      if (err) { Toast.show(err, 'error', 5000); return; }
      // Count what's in the backup so the confirmation is meaningful
      const msgCount = Array.isArray(data.messages) ? data.messages.length : 0;
      const settingsCount = data.settings ? Object.keys(data.settings).length : 0;
      const exportDate = data.exportedAt ? new Date(data.exportedAt).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'}) : 'unknown date';
      Modal.confirm(
        `<strong>Restore this backup?</strong><br><br>` +
        `This backup is from <strong>${exportDate}</strong> and contains <strong>${settingsCount} settings</strong> and <strong>${msgCount} message${msgCount !== 1 ? 's' : ''}</strong>.<br><br>` +
        `Your current settings will be overwritten. This cannot be undone.`,
        () => Settings._doImport(data),
        'Restore Backup', 'Cancel'
      );
    }).catch(e => {
      console.error('Import read failed', e);
      Toast.show('Could not read that file', 'error');
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
    if (failed) Toast.show('⚠️ Backup partly restored — ' + failed + ' item(s) could not be saved', 'error', 5000);
    else Toast.show('✅ Your backup was restored — reloading…', 'success');
    // Reload so every screen shows the restored data and nothing in memory can overwrite it.
    setTimeout(() => { try { location.reload(); } catch (e) { this.load(); } }, failed ? 4000 : 1500);
  },

  clearCache() {
    Modal.confirm('Clear cached resource data? Your settings and messages will be kept — only downloaded resources are removed.', function() {
      DB.clear('resources');
      DB.clear('map_tiles');
      Toast.show('Temporary files cleared — your messages and settings are still safe', 'success');
    }, 'Clear Cache', 'Cancel');
  },

  clearAll() {
    Modal.open(`
      <p style="margin:0 0 8px;font-size:15px">⚠️ <strong>This will permanently delete everything</strong> — your household profile, all messages, map markers, settings, and cached data.</p>
      <p style="margin:0 0 16px;color:var(--text-secondary,#888)">This cannot be undone. Only do this if you want to start completely fresh.</p>
      <div class="flex gap-8" style="justify-content:flex-end">
        <button class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" style="background:var(--danger,#dc3545);border-color:var(--danger,#dc3545)" onclick="Modal.close();Settings._confirmWipeFinal()">Delete Everything</button>
      </div>
    `, '🗑️ Wipe All Data');
  },

  // Second confirmation step before the irreversible wipe — requires typing DELETE.
  _confirmWipeFinal() {
    Modal.open(`
      <p style="margin:0 0 8px;font-size:15px"><strong>Last chance.</strong> All ARK data on this device will be erased and cannot be recovered.</p>
      <p style="margin:0 0 12px;color:var(--text-secondary,#888)">Export a backup first if you might need it.</p>
      <p style="margin:0 0 8px;font-size:13px;font-weight:600">Type <span style="font-family:monospace;background:var(--bg-elevated,#eee);padding:1px 5px;border-radius:3px">DELETE</span> to confirm:</p>
      <input id="wipe-confirm-input" class="form-input" style="width:100%;margin-bottom:12px" placeholder="DELETE" autocomplete="off" spellcheck="false" oninput="document.getElementById('wipe-confirm-btn').disabled=this.value!=='DELETE'">
      <div class="flex gap-8" style="justify-content:flex-end">
        <button class="btn btn-ghost" onclick="Modal.close()">Keep my data</button>
        <button id="wipe-confirm-btn" class="btn btn-primary" disabled style="background:var(--danger,#dc3545);border-color:var(--danger,#dc3545)" onclick="Modal.close();Settings._doWipeAll()">Erase Everything</button>
      </div>
    `, '⚠️ Final Confirmation');
    setTimeout(() => document.getElementById('wipe-confirm-input')?.focus(), 100);
  },

  async _doWipeAll() {
    Store.clearAll(); // only ark_ keys; works in memory-fallback mode too
    await Promise.all([DB.clear('messages'), DB.clear('resources'), DB.clear('map_tiles')]); // finish before reload
    Toast.show('All ARK data has been erased', 'info');
    location.reload();
  },

  updateStorageInfo() {
    const el = document.getElementById('set-storage-info');
    if (!el) return;
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

    // Use Storage Quota API if available (shows real IndexedDB + all origins)
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(est => {
        const usedMB = (est.usage / 1048576).toFixed(1);
        const quotaMB = (est.quota / 1048576).toFixed(0);
        const pct = est.quota ? Math.round(est.usage / est.quota * 100) : 0;
        if (el) el.innerHTML = `Storage: <strong>${usedMB} MB</strong> of ~${quotaMB} MB (${pct}%) — localStorage: ~${Math.round(lsBytes / 1024)} KB`;
        // Show warning banner if > 80%
        const banner = document.getElementById('storage-warning-banner');
        if (banner) banner.classList.toggle('hidden', pct < 80);
      }).catch(() => {
        if (el) el.textContent = `localStorage: ~${Math.round(lsBytes / 1024)} KB used`;
      });
    } else {
      el.textContent = `localStorage: ~${Math.round(lsBytes / 1024)} KB used`;
    }
  },

  toggleLowPower() {
    const on = document.getElementById('set-low-power').checked;
    Store.set('low_power', on);
    document.documentElement.classList.toggle('low-power', on);
    // Apply reduced polling
    Hub.startAutoSync();
    Toast.show(on ? '🔋 Low-power mode on — sync slowed to 5 min' : 'Low-power mode off', 'info');
  },

  rerunWizard() {
    // Hide settings tab and show onboarding overlay
    Onboarding.start();
  },

  toggleDarkMode() {
    const on = document.getElementById('set-dark-mode').checked;
    Store.set('dark_mode', on);
    document.documentElement.classList.toggle('dark-mode', on);
    Toast.show(on ? '🌙 Dark mode on' : '☀️ Dark mode off', 'info');
  },

  applyDarkMode() {
    const on = Store.get('dark_mode', false);
    document.documentElement.classList.toggle('dark-mode', on);
    const el = document.getElementById('set-dark-mode');
    if (el) el.checked = on;
  },

  requestNotifications() {
    if (!('Notification' in window)) {
      Toast.show('Notifications are not supported in this browser', 'error');
      return;
    }
    if (Notification.permission === 'granted') {
      Toast.show('Notifications are already enabled', 'success');
      this._updateNotifBtn();
      return;
    }
    if (Notification.permission === 'denied') {
      Toast.show('Notifications are blocked — allow them in your browser settings', 'error');
      return;
    }
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') Toast.show('✅ Notifications enabled', 'success');
      else Toast.show('Notifications were not enabled', 'info');
      this._updateNotifBtn();
    });
  },

  _updateNotifBtn() {
    const btn = document.getElementById('set-notif-btn');
    if (!btn || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      btn.textContent = '✅ Enabled';
      btn.disabled = true;
    } else if (Notification.permission === 'denied') {
      btn.textContent = '🚫 Blocked';
      btn.disabled = true;
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


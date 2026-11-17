// === STORAGE WRAPPER ===
const Store = {
  _mem: new Map(),        // fallback when localStorage is unavailable
  lastSave: null,         // ISO timestamp of last successful Store.set() this session
  _lastErrToast: 0,       // throttle error toasts (Store.set can fire in loops)
  get persistent() { return _lsAvailable; },

  _errToast(msg) {
    const now = Date.now();
    if (now - this._lastErrToast < 10000) return;
    this._lastErrToast = now;
    try { Toast.show(msg, 'error', 5000); } catch(_) {}
  },

  // Returns true on success, false on failure.
  set(key, val) {
    let json;
    try { json = JSON.stringify(val); }
    catch(e) { console.error('Store.set: value not serializable', key, e); this._errToast('Could not save "' + key + '" — data format error'); return false; }
    if (json === undefined) json = 'null';
    if (!_lsAvailable) { this._mem.set('ark_' + key, json); this._markSaved(); return true; }
    try {
      localStorage.setItem('ark_' + key, json);
      this._markSaved();
      return true;
    } catch(e) {
      if (_isQuotaError(e)) {
        console.error('Store.set: quota exceeded', key, e);
        this._errToast('Storage full — delete old data (export a backup first)');
        const banner = document.getElementById('storage-warning-banner');
        if (banner) banner.classList.remove('hidden');
      } else {
        console.error('Store.set failed', key, e);
        this._errToast('Save failed — your last change may not be kept');
      }
      return false;
    }
  },

  _markSaved() {
    this.lastSave = new Date().toISOString();
    const el = document.getElementById('set-last-save');
    if (el) el.textContent = this.lastSaveLabel();
  },

  lastSaveLabel() {
    const mode = _lsAvailable ? '' : ' (memory only — not persisted)';
    if (!this.lastSave) return 'Last saved: nothing saved yet this session' + mode;
    return 'Last saved: ' + new Date(this.lastSave).toLocaleString() + mode;
  },

  get(key, def = null) {
    let v;
    try {
      v = _lsAvailable ? localStorage.getItem('ark_' + key) : (this._mem.has('ark_' + key) ? this._mem.get('ark_' + key) : null);
    } catch(e) { console.error('Store.get: read failed', key, e); return def; }
    if (v === null || v === undefined) return def;
    try { return JSON.parse(v); }
    catch(e) {
      // Corrupted entry: keep the raw value (no silent data loss) and fall back to default.
      console.warn('Store.get: corrupted JSON for "' + key + '", using default', e);
      return def;
    }
  },

  del(key) {
    if (!_lsAvailable) { this._mem.delete('ark_' + key); return; }
    try { localStorage.removeItem('ark_' + key); } catch(e) { console.error('Store.del failed', key, e); }
  },

  keys() {
    const ks = [];
    if (!_lsAvailable) {
      this._mem.forEach((_, k) => { if (k.startsWith('ark_')) ks.push(k.slice(4)); });
      return ks;
    }
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('ark_')) ks.push(k.slice(4));
      }
    } catch(e) { console.error('Store.keys failed', e); }
    return ks;
  },

  // Removes only ARK keys (never other apps' data on the same origin).
  clearAll() {
    this.keys().forEach(k => this.del(k));
    this._mem.clear();
  },

  exportAll() {
    const data = {};
    this.keys().forEach(k => { data[k] = this.get(k); });
    return data;
  }
};


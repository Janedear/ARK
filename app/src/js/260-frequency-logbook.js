// === PERSONAL FREQUENCY LOGBOOK ===
const FreqLog = {
  _KEY: 'freq_log',
  _TS_HINT: 'The date and time are added when you save.',
  _data() { const d = Store.get(this._KEY, []); return Array.isArray(d) ? d : []; },
  _fmtDate(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso).slice(0, 10);
      return d.toLocaleDateString(undefined, {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
    } catch(_) { return String(iso).slice(0, 10); }
  },
  render() {
    const entries = this._data();
    const tbl = document.getElementById('freq-log-table');
    const empty = document.getElementById('freq-log-empty');
    const body = document.getElementById('freq-log-body');
    if (!body) return;
    if (!entries.length) {
      if (tbl) tbl.style.display = 'none';
      if (empty) empty.style.display = '';
      body.innerHTML = '';
      return;
    }
    if (tbl) tbl.style.display = '';
    if (empty) empty.style.display = 'none';
    body.innerHTML = entries.map((e, i) => `
      <tr>
        <td class="bold">${esc(e.name)}</td>
        <td class="monospace text-accent freq-copyable" tabindex="0" role="button" onclick="Radio.copyFreq(${jsAttr(e.freq)},this)" title="Tap to copy">${esc(e.freq)}<span class="copy-hint"><svg class="hi" aria-hidden="true"><use href="#i-copy"/></svg></span></td>
        <td class="font-xs text-muted">${esc(e.notes || '')}</td>
        <td class="font-xs text-muted" style="white-space:nowrap">${esc(this._fmtDate(e.ts || ''))}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-ghost btn-xs" style="min-height:44px;min-width:44px" onclick="FreqLog.openEdit(${i})" title="Edit" aria-label="Edit ${esc(e.name)}"><svg class="hi" aria-hidden="true"><use href="#i-edit"/></svg></button>
          <button class="btn btn-ghost btn-xs" style="min-height:44px;min-width:44px" onclick="FreqLog.remove(${i})" title="Remove" aria-label="Remove ${esc(e.name)}"><svg class="hi" aria-hidden="true"><use href="#i-trash"/></svg></button>
        </td>
      </tr>`).join('');
  },
  _showForm(title, idx, e, note) {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    set('freq-log-edit-idx', String(idx));
    set('freq-log-name', e ? (e.name || '') : '');
    set('freq-log-freq', e ? (e.freq || '') : '');
    set('freq-log-notes', e ? (e.notes || '') : '');
    const t = document.getElementById('freq-log-form-title');
    if (t) t.textContent = title;
    const tsNote = document.getElementById('freq-log-ts-note');
    if (tsNote) { tsNote.textContent = note; tsNote.style.display = ''; }
    const form = document.getElementById('freq-log-form');
    if (form) {
      form.style.display = '';
      try { form.scrollIntoView({block: 'nearest'}); } catch (_) {}
    }
    const first = document.getElementById('freq-log-name');
    if (first) first.focus();
  },
  openAdd() {
    this._showForm('Add Channel', -1, null, this._TS_HINT);
  },
  openEdit(i) {
    const e = this._data()[i];
    if (!e) return;
    this._showForm('Edit Channel', i, e, e.ts ? 'Added: ' + this._fmtDate(e.ts) : this._TS_HINT);
  },
  cancelForm() {
    const form = document.getElementById('freq-log-form');
    if (form) form.style.display = 'none';
  },
  save() {
    const val = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    const name = val('freq-log-name');
    const freq = val('freq-log-freq');
    const notes = val('freq-log-notes');
    if (!name || !freq) {
      Toast.show('Type a name and a channel or frequency, then tap Save.', 'warning');
      const miss = document.getElementById(!name ? 'freq-log-name' : 'freq-log-freq');
      if (miss) miss.focus();
      return;
    }
    const entries = this._data();
    let idx = parseInt(val('freq-log-edit-idx'), 10);
    if (isNaN(idx) || idx < 0 || !entries[idx]) idx = -1; // the entry is gone: save as a new one
    const now = new Date().toISOString();
    if (idx >= 0) { entries[idx] = { name, freq, notes, ts: entries[idx].ts || now }; }
    else { entries.push({ name, freq, notes, ts: now }); }
    // If saving failed, Store has already told the user why. Keep the form open so nothing is lost.
    if (Store.set(this._KEY, entries) === false) return;
    this.cancelForm();
    this.render();
    Toast.show('Channel saved on this device', 'success');
  },
  remove(i) {
    const e = this._data()[i];
    if (!e) return;
    Modal.confirm('Remove <strong>' + esc(e.name) + '</strong> from your channels?', () => {
      const entries = this._data();
      // Only remove the entry the person was asked about, even if the list changed meanwhile.
      const cur = entries[i];
      if (!cur || cur.name !== e.name || cur.freq !== e.freq) { this.render(); return; }
      entries.splice(i, 1);
      Store.set(this._KEY, entries);
      this.cancelForm();
      this.render();
      Toast.show('Channel removed', 'info');
    }, 'Remove', 'Keep');
  },
  _download(text, type, ext) {
    try {
      const blob = new Blob([text], {type});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'ARK-FreqLog-' + new Date().toISOString().split('T')[0] + '.' + ext;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return true;
    } catch (_) {
      Toast.show('Could not save the file on this device. Write your channels down on paper instead.', 'error', 6000);
      return false;
    }
  },
  // Load channels back from a backup file made with "Save as backup file".
  importPick() {
    const el = document.getElementById('freq-log-import');
    if (el) el.click();
  },
  importFile(input) {
    const file = input && input.files && input.files[0];
    if (!file) return;
    const bad = () => Toast.show('That file is not an ARK channel backup. Pick the file that starts with ARK-FreqLog and ends in .json.', 'error', 7000);
    try {
      if (file.size > 1000000) { bad(); input.value = ''; return; }
      const r = new FileReader();
      r.onload = () => {
        let list = null;
        try { list = JSON.parse(String(r.result || '')); } catch (_) { list = null; }
        if (!Array.isArray(list)) { bad(); return; }
        const s = v => String(v == null ? '' : v).trim();
        const entries = this._data();
        let valid = 0, added = 0;
        list.slice(0, 500).forEach(e => {
          if (!e || typeof e !== 'object') return;
          const name = s(e.name).slice(0, 40), freq = s(e.freq).slice(0, 20);
          if (!name || !freq) return;
          valid++;
          if (entries.some(x => x && x.name === name && x.freq === freq)) return;
          entries.push({ name, freq, notes: s(e.notes).slice(0, 80), ts: s(e.ts) || new Date().toISOString() });
          added++;
        });
        if (!valid) { bad(); return; }
        if (!added) { Toast.show('Those channels are already in your list. Nothing was changed.', 'info', 5000); return; }
        // If saving failed, Store has already told the user why.
        if (Store.set(this._KEY, entries) === false) return;
        this.render();
        Toast.show(added === 1 ? '1 channel added from the backup file' : added + ' channels added from the backup file', 'success', 5000);
      };
      r.onerror = bad;
      r.readAsText(file);
    } catch (_) { bad(); }
    try { input.value = ''; } catch (_) {} // so the same file can be picked again
  },
  exportJSON() {
    const logs = this._data();
    if (!logs.length) { Toast.show('Nothing to save yet. Add a channel first.', 'warning'); return; }
    if (this._download(JSON.stringify(logs, null, 2), 'application/json', 'json')) {
      Toast.show('Saved. Look in your Downloads folder.', 'success');
    }
  },
  exportCSV() {
    const logs = this._data();
    if (!logs.length) { Toast.show('Nothing to save yet. Add a channel first.', 'warning'); return; }
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const header = 'Name,Frequency,Notes,Timestamp\n';
    const rows = logs.map(e => [e.name, e.freq, e.notes, e.ts].map(q).join(',')).join('\n');
    if (this._download(header + rows, 'text/csv', 'csv')) {
      Toast.show('Saved. Look in your Downloads folder.', 'success');
    }
  }
};

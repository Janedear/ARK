// === PERSONAL FREQUENCY LOGBOOK ===
const FreqLog = {
  _KEY: 'freq_log',
  _data() { return Store.get(this._KEY, []); },
  _fmtDate(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
    } catch(_) { return iso.slice(0, 10); }
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
      return;
    }
    if (tbl) tbl.style.display = '';
    if (empty) empty.style.display = 'none';
    body.innerHTML = entries.map((e, i) => `
      <tr>
        <td class="bold">${esc(e.name)}</td>
        <td class="monospace text-accent freq-copyable" onclick="Radio.copyFreq(${jsAttr(e.freq)},this)" title="Tap to copy">${esc(e.freq)}<span class="copy-hint">📋</span></td>
        <td class="font-xs text-muted">${esc(e.notes || '')}</td>
        <td class="font-xs text-muted" style="white-space:nowrap">${esc(this._fmtDate(e.ts || ''))}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-ghost btn-xs" onclick="FreqLog.openEdit(${i})" title="Edit" aria-label="Edit ${esc(e.name)}">✏️</button>
          <button class="btn btn-ghost btn-xs" onclick="FreqLog.remove(${i})" title="Delete" aria-label="Delete ${esc(e.name)}">🗑️</button>
        </td>
      </tr>`).join('');
  },
  openAdd() {
    document.getElementById('freq-log-edit-idx').value = '-1';
    document.getElementById('freq-log-form-title').textContent = 'Add Channel';
    document.getElementById('freq-log-name').value = '';
    document.getElementById('freq-log-freq').value = '';
    document.getElementById('freq-log-notes').value = '';
    const tsNote = document.getElementById('freq-log-ts-note');
    if (tsNote) tsNote.style.display = '';
    document.getElementById('freq-log-form').style.display = '';
    document.getElementById('freq-log-name').focus();
  },
  openEdit(i) {
    const entries = this._data();
    const e = entries[i];
    if (!e) return;
    document.getElementById('freq-log-edit-idx').value = i;
    document.getElementById('freq-log-form-title').textContent = 'Edit Channel';
    document.getElementById('freq-log-name').value = e.name;
    document.getElementById('freq-log-freq').value = e.freq;
    document.getElementById('freq-log-notes').value = e.notes || '';
    const tsNote = document.getElementById('freq-log-ts-note');
    if (tsNote) { tsNote.textContent = e.ts ? 'Added: ' + this._fmtDate(e.ts) : 'Timestamp auto-set on save'; tsNote.style.display = ''; }
    document.getElementById('freq-log-form').style.display = '';
    document.getElementById('freq-log-name').focus();
  },
  cancelForm() {
    document.getElementById('freq-log-form').style.display = 'none';
  },
  save() {
    const name = document.getElementById('freq-log-name').value.trim();
    const freq = document.getElementById('freq-log-freq').value.trim();
    const notes = document.getElementById('freq-log-notes').value.trim();
    if (!name || !freq) { Toast.show('Name and frequency are required', 'error'); return; }
    const entries = this._data();
    const idx = parseInt(document.getElementById('freq-log-edit-idx').value, 10);
    const ts = idx >= 0 ? (entries[idx].ts || new Date().toISOString()) : new Date().toISOString();
    if (idx >= 0) { entries[idx] = { name, freq, notes, ts }; }
    else { entries.push({ name, freq, notes, ts }); }
    Store.set(this._KEY, entries);
    this.cancelForm();
    this.render();
    Toast.show('📒 Channel saved', 'success');
  },
  remove(i) {
    Modal.confirm('Remove this channel from your logbook?', () => {
      const entries = this._data();
      entries.splice(i, 1);
      Store.set(this._KEY, entries);
      this.render();
      Toast.show('Channel removed', 'info');
    }, 'Remove', 'Keep');
  },
  exportJSON() {
    const logs = this._data();
    if (!logs.length) { Toast.show('No frequency log entries to export', 'warning'); return; }
    const blob = new Blob([JSON.stringify(logs, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ARK-FreqLog-' + new Date().toISOString().split('T')[0] + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    Toast.show('Frequency log exported', 'success');
  },
  exportCSV() {
    const logs = this._data();
    if (!logs.length) { Toast.show('No frequency log entries to export', 'warning'); return; }
    const header = 'Name,Frequency,Notes,Timestamp\n';
    const rows = logs.map(e => `"${(e.name||'').replace(/"/g,'""')}","${(e.freq||'').replace(/"/g,'""')}","${(e.notes||'').replace(/"/g,'""')}","${(e.ts||'').replace(/"/g,'""')}"`).join('\n');
    const blob = new Blob([header + rows], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ARK-FreqLog-' + new Date().toISOString().split('T')[0] + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    Toast.show('Frequency log exported as CSV', 'success');
  }
};


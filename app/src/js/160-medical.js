// === MEDICAL ===
const Medical = {
  _meds: [],

  load() {
    const saved = Store.get('medications', []);
    this._undo = null;
    this._meds = Array.isArray(saved) ? saved : [];
    this.renderMeds();
  },

  // Editing: the id of the medicine now in the form, or null when adding a new one.
  _editId: null,
  _FIELDS: ['med-person','med-name','med-sched','med-supply'],
  _clearForm() {
    this._FIELDS.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  },
  // Days of supply left today, or null when it cannot be worked out.
  _supplyLeft(m) {
    if (!m || m.supply === '' || m.supply == null) return null;
    const n = parseInt(m.supply, 10);
    const at = m.supplyAt ? new Date(m.supplyAt).getTime() : NaN;
    if (isNaN(n) || isNaN(at)) return null;
    return Math.max(0, n - Math.max(0, Math.floor((Date.now() - at) / 86400000)));
  },
  _supplyShown(m) {
    const left = this._supplyLeft(m);
    return left != null ? String(left) : (m.supply == null ? '' : String(m.supply));
  },

  // Fix a typo, change the dose or update the supply without losing the "last taken" time.
  editMed(i) {
    const m = this._meds[i];
    const f = document.getElementById('med-add-form');
    if (!m || !f) return;
    if (!m.id) m.id = generateID();
    this._editId = m.id;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v == null ? '' : v; };
    set('med-person', m.person); set('med-name', m.name); set('med-sched', m.sched);
    set('med-supply', this._supplyShown(m));
    f.classList.remove('hidden');
    try { f.scrollIntoView({block: 'nearest'}); } catch (e) {}
    const first = document.getElementById('med-name');
    if (first) first.focus();
  },

  addMed() {
    const f = document.getElementById('med-add-form');
    if (!f) return;
    if (this._editId) {
      // The form was showing another medicine. Start a clean one.
      this._editId = null;
      this._clearForm();
      f.classList.remove('hidden');
    } else {
      f.classList.toggle('hidden');
    }
    if (!f.classList.contains('hidden')) {
      try { f.scrollIntoView({block: 'nearest'}); } catch (e) {}
      const first = document.getElementById('med-person');
      if (first) first.focus();
    }
  },

  saveMed() {
    const val = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    const person = val('med-person');
    const name = val('med-name');
    const sched = val('med-sched');
    let supply = val('med-supply');
    if (!name) {
      Toast.show('Type the medicine name first, then tap Save.', 'warning');
      const el = document.getElementById('med-name');
      if (el) el.focus();
      return;
    }
    if (supply !== '') {
      const n = parseInt(supply, 10);
      if (isNaN(n) || n < 0) {
        Toast.show('Days of supply must be a number, like 30. Fix it or leave it empty.', 'warning');
        return;
      }
      supply = String(n);
    }
    const cur = this._editId ? this._meds.filter(m => m && m.id === this._editId)[0] : null;
    if (cur) {
      const old = {person: cur.person, name: cur.name, sched: cur.sched, supply: cur.supply, supplyAt: cur.supplyAt};
      // Only restart the countdown when the number was really changed.
      const supplyChanged = supply !== this._supplyShown(cur);
      cur.person = person; cur.name = name; cur.sched = sched;
      if (supplyChanged) { cur.supply = supply; cur.supplyAt = new Date().toISOString(); }
      if (Store.set('medications', this._meds) === false) {
        // Store has already told the user why. Keep the form open so nothing typed is lost.
        Object.assign(cur, old);
        return;
      }
    } else {
      this._meds.push({id: generateID(), person, name, sched, supply, supplyAt: new Date().toISOString(), lastTaken: null});
      if (Store.set('medications', this._meds) === false) {
        // Store has already told the user why. Keep the form open so nothing typed is lost.
        this._meds.pop();
        return;
      }
    }
    this._editId = null;
    this._clearForm();
    this.closeMedForm();
    this.renderMeds();
    Toast.show(cur ? 'Changes saved on this device' : 'Medicine saved on this device', 'success');
  },

  closeMedForm() {
    const f = document.getElementById('med-add-form');
    if (f) f.classList.add('hidden');
    // Leaving an edit: empty the form so the next Add does not start with someone else's medicine.
    if (this._editId) { this._editId = null; this._clearForm(); }
  },

  _fmtTaken(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleString(undefined, {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
    } catch (e) { return ''; }
  },

  // "30 days of supply" goes out of date. Count down from the day it was typed in.
  _supplyLine(m) {
    if (m.supply === '' || m.supply == null) return '';
    const left = this._supplyLeft(m);
    if (left == null) return `<div class="font-xs text-muted">${esc(m.supply)} days of supply when added</div>`;
    if (left <= 3) return `<div class="font-xs text-red bold">About ${left} ${left === 1 ? 'day' : 'days'} of supply left. Get more as soon as you can.</div>`;
    return `<div class="font-xs text-muted">About ${left} days of supply left</div>`;
  },

  renderMeds() {
    const list = document.getElementById('med-list');
    if (!list) return;
    if (!this._meds.length) {
      list.innerHTML = '<div class="text-secondary font-sm">No medicines listed yet. Tap Add to list one.</div>';
      return;
    }
    list.innerHTML = this._meds.map((m, i) => {
      const taken = this._fmtTaken(m.lastTaken);
      const sub = [m.person, m.sched].filter(Boolean).map(esc).join(' · ');
      return `
      <div class="member-item" style="flex-wrap:wrap">
        <div class="member-avatar"><svg class="hi" aria-hidden="true"><use href="#i-pill"/></svg></div>
        <div style="flex:1;min-width:120px">
          <div class="font-sm bold" style="overflow-wrap:anywhere">${esc(m.name)}</div>
          ${sub ? `<div class="font-xs text-secondary" style="overflow-wrap:anywhere">${sub}</div>` : ''}
          ${this._supplyLine(m)}
          <div class="font-xs text-muted">${taken ? 'Last taken: ' + esc(taken) : 'Not marked as taken yet'}</div>
        </div>
        ${this._undo && this._undo.m === m ? `<button class="btn btn-ghost btn-sm" style="min-height:44px" onclick="Medical.undoTaken()" aria-label="Undo: ${esc(m.name)} was not taken">Undo</button>` : ''}
        <button class="btn btn-secondary btn-sm" style="min-height:44px" onclick="Medical.markTaken(${i})" aria-label="Mark ${esc(m.name)} as taken now"><svg class="hi" aria-hidden="true"><use href="#i-check"/></svg>Taken now</button>
        <button class="btn btn-ghost btn-sm" style="min-height:44px;min-width:44px" onclick="Medical.editMed(${i})" title="Change" aria-label="Change ${esc(m.name)}"><svg class="hi" aria-hidden="true"><use href="#i-edit"/></svg></button>
        <button class="btn btn-ghost btn-sm" style="min-height:44px;min-width:44px" onclick="Medical.removeMed(${i})" title="Remove" aria-label="Remove ${esc(m.name)}"><svg class="hi" aria-hidden="true"><use href="#i-trash"/></svg></button>
      </div>`;
    }).join('');
  },

  markTaken(i) {
    const m = this._meds[i];
    if (!m) return;
    const prev = m.lastTaken;
    m.lastTaken = new Date().toISOString();
    if (Store.set('medications', this._meds) === false) { m.lastTaken = prev; return; }
    this._undo = {m, prev};
    this.renderMeds();
    Toast.show('Marked as taken just now. Tapped by mistake? Tap Undo.', 'success', 5000);
  },

  // A wrong "taken" time could make someone skip a dose, so one mistaken tap can be put back.
  _undo: null,
  undoTaken() {
    const u = this._undo;
    this._undo = null;
    if (!u || this._meds.indexOf(u.m) < 0) { this.renderMeds(); return; }
    const cur = u.m.lastTaken;
    u.m.lastTaken = u.prev || null;
    if (Store.set('medications', this._meds) === false) u.m.lastTaken = cur;
    this.renderMeds();
    Toast.show('Undone. The earlier time is back.', 'info');
  },

  removeMed(i) {
    const m = this._meds[i];
    if (!m) return;
    const doRemove = () => {
      const at = this._meds.indexOf(m);
      if (at < 0) return;
      this._meds.splice(at, 1);
      if (this._undo && this._undo.m === m) this._undo = null;
      if (this._editId && this._editId === m.id) this.closeMedForm();
      Store.set('medications', this._meds);
      this.renderMeds();
      Toast.show('Medicine removed', 'info');
    };
    if (typeof Modal !== 'undefined' && Modal.confirm) {
      Modal.confirm('Remove <strong>' + esc(m.name) + '</strong> from the list?', doRemove, 'Remove', 'Keep');
    } else {
      doRemove();
    }
  },

  generateCards() {
    const members = Store.get('hh_members', []);
    const meds = this._meds;
    const preview = document.getElementById('med-card-preview');
    if (!preview) return;
    const household = (Store.get('household', {}) || {}).name || '';
    const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
    const html = (Array.isArray(members) ? members : []).map(m => {
      const medList = meds.filter(md => same(md.person, m.name))
        .map(md => esc(md.name) + (md.sched ? ' (' + esc(md.sched) + ')' : '')).join(', ') || 'None listed';
      return `<div class="font-sm" style="border:1px solid var(--border);padding:12px;margin:8px 0;border-radius:var(--radius-md);overflow-wrap:anywhere">
        <strong>Name:</strong> ${esc(m.name)}<br>
        <strong>Blood type:</strong> ${esc(m.bloodType || 'Not known')}<br>
        <strong>Allergies:</strong> ${esc(m.allergies || 'None listed')}<br>
        ${m.conditions ? `<strong>Conditions:</strong> ${esc(m.conditions)}<br>` : ''}
        <strong>Medicines:</strong> ${medList}
        ${household ? `<br><strong>Household:</strong> ${esc(household)}` : ''}
      </div>`;
    }).join('');
    preview.innerHTML = html || '<div class="font-sm text-secondary mb-8">No people listed yet. Add the people in your home to your plan first, then come back here.</div>'
      + '<button class="btn btn-primary btn-sm" style="min-height:44px" onclick="UI.switchTab(\'household\')">Add people to my plan</button>';
  }
};

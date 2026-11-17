// === MEDICAL ===
const Medical = {
  _meds: [],

  load() {
    this._meds = Store.get('medications', []);
    this.renderMeds();
  },

  addMed() {
    const f = document.getElementById('med-add-form');
    if (f) f.classList.toggle('hidden');
  },

  saveMed() {
    const person = document.getElementById('med-person').value.trim();
    const name = document.getElementById('med-name').value.trim();
    const sched = document.getElementById('med-sched').value.trim();
    const supply = document.getElementById('med-supply').value;
    if (!name) { Toast.show('Enter a medication name', 'warn'); return; }
    this._meds.push({id: generateID(), person, name, sched, supply, lastTaken: null});
    Store.set('medications', this._meds);
    // Clear form fields
    ['med-person','med-name','med-sched','med-supply'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('med-add-form').classList.add('hidden');
    this.renderMeds();
    Toast.show('✅ Medication added', 'success');
  },

  closeMedForm() {
    document.getElementById('med-add-form').classList.add('hidden');
  },

  renderMeds() {
    const list = document.getElementById('med-list');
    if (!list) return;
    if (!this._meds.length) {
      list.innerHTML = '<div class="text-secondary font-sm">No medications tracked.</div>';
      return;
    }
    list.innerHTML = this._meds.map((m, i) => `
      <div class="member-item">
        <div class="member-avatar">💊</div>
        <div style="flex:1">
          <div class="font-sm bold">${esc(m.name)}</div>
          <div class="font-xs text-secondary">${m.person ? esc(m.person) + ' · ' : ''}${esc(m.sched||'')}</div>
          ${m.supply ? `<div class="font-xs text-muted">${esc(m.supply)} days supply</div>` : ''}
        </div>
        <button class="btn btn-ghost btn-sm" onclick="Medical.removeMed(${i})" aria-label="Remove ${esc(m.name)}">✕</button>
      </div>
    `).join('');
  },

  removeMed(i) {
    this._meds.splice(i, 1);
    Store.set('medications', this._meds);
    this.renderMeds();
  },

  generateCards() {
    const members = Store.get('hh_members', []);
    const meds = this._meds;
    const preview = document.getElementById('med-card-preview');
    if (!preview) return;
    const html = members.map(m =>
      `<div class="font-sm" style="border:1px solid var(--border);padding:12px;margin:8px 0;border-radius:8px">
        <strong>Name:</strong> ${esc(m.name)}<br>
        <strong>Medications:</strong> ${meds.filter(md => String(md.person || '').trim().toLowerCase() === String(m.name || '').trim().toLowerCase()).map(md => esc(md.name) + ' (' + esc(md.sched) + ')').join(', ') || 'None listed'}<br>
        <strong>Household:</strong> ${esc(Store.get('household', {}).name || '')}
      </div>`
    ).join('');
    preview.innerHTML = html || '<div class="font-sm text-secondary">Add household members first.</div>';
  }
};


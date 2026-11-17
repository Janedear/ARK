// === HOUSEHOLD ===
const Household = {
  _members: [],
  _loaded: false,

  // Role value (stored) -> plain label (shown). Stored values never change.
  _ROLES: [
    ['member','Member'], ['head','Head of household'], ['spouse','Spouse / partner'], ['child','Child'],
    ['elderly','Older adult'], ['pet','Pet'], ['leader','Team leader'], ['medic','Medic'],
    ['radio','Radio operator'], ['security','Security'], ['logistics','Supplies'], ['other','Other']
  ],

  _roleLabel(role) {
    const r = this._ROLES.find(x => x[0] === role);
    return r ? r[1] : (role ? String(role) : 'Member');
  },

  _roleOptions(selected) {
    return this._ROLES.map(r => `<option value="${r[0]}"${selected === r[0] ? ' selected' : ''}>${r[1]}</option>`).join('');
  },

  _bloodOptions(selected) {
    return ['','A+','A-','B+','B-','AB+','AB-','O+','O-']
      .map(b => `<option value="${b}"${(selected || '') === b ? ' selected' : ''}>${b || 'Not known'}</option>`).join('');
  },

  _getMembers() {
    const m = Store.get('hh_members', []);
    return Array.isArray(m) ? m.filter(x => x && typeof x === 'object') : [];
  },

  load() {
    // Fill the form from saved data only once. Coming back to this tab must never wipe
    // something the user typed but has not saved yet.
    if (this._loaded) { this._members = this._getMembers(); this.renderMembers(); return; }
    this._loaded = true;
    const d = Store.get('household', {}) || {};
    const hSetVal = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    hSetVal('hh-name', d.name || ''); hSetVal('hh-count', d.count || '');
    hSetVal('hh-location', d.location || '');
    const hhId = d.id || Store.get('hh_id') || generateID();
    if (!Store.get('hh_id')) Store.set('hh_id', hhId);
    hSetVal('hh-id', hhId);
    hSetVal('hh-needs', d.needs || ''); hSetVal('hh-meet1', d.meet1 || '');
    hSetVal('hh-meet2', d.meet2 || ''); hSetVal('hh-evac', d.evac || '');
    hSetVal('hh-ooa-name', d.ooaName || ''); hSetVal('hh-ooa-phone', d.ooaPhone || '');
    hSetVal('hh-ooa-rel', d.ooaRel || ''); hSetVal('hh-ooa-alt', d.ooaAlt || '');
    hSetVal('hh-veh1', d.veh1 || ''); hSetVal('hh-fuel', d.fuel || 'Half');
    hSetVal('hh-veh2', d.veh2 || ''); hSetVal('hh-fuel2', d.fuel2 || 'N/A');
    hSetVal('hh-pets', d.pets || ''); hSetVal('hh-gobag', d.gobag || '');
    this._members = this._getMembers();
    this.renderMembers();
    // Save quietly each time a field is finished, so a dead battery or a closed tab loses nothing.
    const panel = document.getElementById('tab-household');
    if (panel && !this._autoBound) {
      this._autoBound = true;
      panel.addEventListener('change', (ev) => {
        const t = ev.target;
        if (t && t.id && t.id.indexOf('hh-') === 0) { clearTimeout(Household._typeTimer); Household._dirty = false; Household.save(true); }
      });
      // Also save a moment after typing stops, and when the app is put away, so a field that
      // was never finished (phone locked, battery died) is not lost.
      panel.addEventListener('input', (ev) => {
        const t = ev.target;
        if (!t || !t.id || t.id.indexOf('hh-') !== 0) return;
        Household._dirty = true;
        clearTimeout(Household._typeTimer);
        Household._typeTimer = setTimeout(() => { Household._dirty = false; Household.save(true); }, 1500);
      });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && Household._dirty) { clearTimeout(Household._typeTimer); Household._dirty = false; Household.save(true); }
      });
    }
  },

  // silent = true: save without a pop-up message (used when a field changes)
  save(silent) {
    silent = silent === true;
    if (silent && !this._loaded) return false; // form not yet filled from saved data — a quiet save must never overwrite it with blanks
    const hGetVal = (id, def) => { const e = document.getElementById(id); return e ? e.value : (def || ''); };
    // People count: a whole number from 1 to 999, or empty. A slip like -4 or 40000 would break the supply sums.
    let count = String(hGetVal('hh-count')).trim();
    if (count !== '') { const n = parseInt(count, 10); count = isNaN(n) ? '' : String(Math.min(999, Math.max(1, n))); }
    const d = {
      name: hGetVal('hh-name').trim(),
      count: count || String(this._members.length || ''),
      location: hGetVal('hh-location').trim(),
      id: hGetVal('hh-id') || Store.get('hh_id', ''),
      needs: hGetVal('hh-needs').trim(),
      meet1: hGetVal('hh-meet1').trim(),
      meet2: hGetVal('hh-meet2').trim(),
      evac: hGetVal('hh-evac').trim(),
      ooaName: hGetVal('hh-ooa-name').trim(),
      ooaPhone: hGetVal('hh-ooa-phone').trim(),
      ooaRel: hGetVal('hh-ooa-rel').trim(),
      ooaAlt: hGetVal('hh-ooa-alt').trim(),
      veh1: hGetVal('hh-veh1').trim(),
      fuel: hGetVal('hh-fuel', 'Half'),
      veh2: hGetVal('hh-veh2').trim(),
      fuel2: hGetVal('hh-fuel2', 'N/A'),
      pets: hGetVal('hh-pets').trim(),
      gobag: hGetVal('hh-gobag').trim()
    };
    const status = document.getElementById('hh-save-status');
    if (!Store.set('household', d)) { // Store already told the user saving failed
      if (status) status.textContent = 'Not saved on this device. Print your card now so you have it on paper.';
      return false;
    }
    if (d.id) Store.set('hh_id', d.id);
    // Keep hh-count field in sync with actual saved count
    const countEl = document.getElementById('hh-count');
    if (countEl && !countEl.value && this._members.length) countEl.value = String(this._members.length);
    if (status) status.textContent = 'Saved on this device at ' + new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    if (!silent) Toast.show('Household plan saved on this device', 'success');
    return true;
  },

  _memberFields(p, m) {
    // p = id prefix ('new-member' or 'edit-member'); m = existing member or {}
    return `
      <label class="form-label" for="${p}-name">Name</label>
      <input type="text" id="${p}-name" maxlength="60" class="form-input w-full mb-12" placeholder="e.g. Maria" value="${esc(m.name || '')}" autocomplete="off">
      <label class="form-label" for="${p}-role">Role</label>
      <select id="${p}-role" class="form-input w-full mb-12">${this._roleOptions(m.role || 'member')}</select>
      <label class="form-label" for="${p}-age">Age</label>
      <input type="number" inputmode="numeric" id="${p}-age" min="0" max="120" class="form-input w-full mb-12" placeholder="e.g. 34" value="${m.age != null ? esc(m.age) : ''}">
      <label class="form-label" for="${p}-blood">Blood type</label>
      <select id="${p}-blood" class="form-input w-full mb-12">${this._bloodOptions(m.bloodType)}</select>
      <label class="form-label" for="${p}-allergies">Allergies</label>
      <input type="text" id="${p}-allergies" maxlength="200" class="form-input w-full mb-12" placeholder="e.g. Penicillin, peanuts" value="${esc(m.allergies || '')}">
      <label class="form-label" for="${p}-conditions">Medical conditions and medicines</label>
      <input type="text" id="${p}-conditions" maxlength="200" class="form-input w-full mb-12" placeholder="e.g. Diabetes, takes insulin" value="${esc(m.conditions || '')}">
      <label class="form-label" for="${p}-needs">Special needs or notes</label>
      <input type="text" id="${p}-needs" maxlength="200" class="form-input w-full" placeholder="e.g. Wheelchair, oxygen tank, special diet" value="${esc(m.needs || '')}" style="margin-bottom:16px">`;
  },

  addMember() {
    Modal.open(`
      <p class="font-sm text-secondary" style="margin:0 0 12px">Only the name is needed. Everything here is saved on this device.</p>
      ${this._memberFields('new-member', {})}
      <div class="flex gap-8 wrap" style="justify-content:flex-end">
        <button class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="Household._doAddMember(document.getElementById('new-member-name').value.trim(),document.getElementById('new-member-role').value,document.getElementById('new-member-age').value,document.getElementById('new-member-blood').value,document.getElementById('new-member-allergies').value.trim(),document.getElementById('new-member-conditions').value.trim(),document.getElementById('new-member-needs').value.trim());">Add person</button>
      </div>
    `, 'Add a person');
  },

  _doAddMember(name, role, age, bloodType, allergies, conditions, needs) {
    if (!name) {
      Toast.show('Type a name first, then tap Add person', 'error');
      const n = document.getElementById('new-member-name'); if (n) n.focus();
      return;
    }
    const ageVal = age !== '' && age !== null && age !== undefined ? parseInt(age, 10) : null;
    if (age !== '' && age !== null && age !== undefined && (isNaN(ageVal) || ageVal < 0 || ageVal > 120)) {
      Toast.show('Age must be a number from 0 to 120. Fix it or leave it empty.', 'error', 4000);
      const a = document.getElementById('new-member-age'); if (a) a.focus();
      return;
    }
    this._members.push({
      id: generateID(),
      name,
      role: role||'member',
      needs: needs || '',
      age: ageVal,
      bloodType: bloodType || '',
      allergies: allergies || '',
      conditions: conditions || ''
    });
    if (!Store.set('hh_members', this._members)) { this._members.pop(); return; } // Store told the user why; keep the form open
    this.renderMembers();
    Modal.close();
    Toast.show(name + ' added to your household', 'success');
  },

  renderMembers() {
    const list = document.getElementById('members-list');
    if (!list) return;
    const countBadge = document.getElementById('hh-member-count');
    if (!this._members.length) {
      if (countBadge) { countBadge.textContent = ''; countBadge.style.display = 'none'; }
      list.innerHTML = '<div class="text-secondary font-sm mb-12">Nobody added yet. Add each person so their age, allergies and medicines are in one place when you need them.</div><button class="btn btn-primary btn-sm" onclick="Household.addMember()"><svg class="hi" aria-hidden="true"><use href="#i-plus"/></svg> Add the first person</button>';
      return;
    }
    if (countBadge) { countBadge.textContent = String(this._members.length); countBadge.style.display = ''; }
    list.innerHTML = this._members.map((m, i) => {
      const details = [
        (m.age != null && m.age !== '') ? `Age ${esc(m.age)}` : null,
        m.bloodType ? `Blood: ${esc(m.bloodType)}` : null,
        m.allergies ? `Allergies: ${esc(m.allergies)}` : null,
        m.conditions ? `Conditions: ${esc(m.conditions)}` : null,
        m.needs ? `Needs: ${esc(m.needs)}` : null,
      ].filter(Boolean).join(' · ');
      const initial = (Array.from(String(m.name || '').trim())[0] || '?').toUpperCase();
      return `
      <div class="member-item">
        <div class="member-avatar" aria-hidden="true" style="font-weight:600;color:var(--accent)">${esc(initial)}</div>
        <div style="flex:1;min-width:0;overflow-wrap:anywhere">
          <div class="font-sm bold">${esc(m.name)}</div>
          <div class="member-role">${esc(this._roleLabel(m.role))}</div>
          ${details ? `<div class="font-xs text-secondary" style="margin-top:2px">${details}</div>` : ''}
        </div>
        <div class="flex" style="gap:4px;flex-shrink:0">
          <button class="btn btn-ghost btn-sm" onclick="Household.editMember(${jsAttr(m.id)})" aria-label="Edit ${esc(m.name)}" title="Edit"><svg class="hi" aria-hidden="true"><use href="#i-edit"/></svg></button>
          <button class="btn btn-ghost btn-sm" onclick="Household.removeMember(${i})" aria-label="Remove ${esc(m.name)}" title="Remove"><svg class="hi" aria-hidden="true"><use href="#i-trash"/></svg></button>
        </div>
      </div>`;
    }).join('');
  },

  editMember(memberId) {
    const m = this._members.find(x => x.id === memberId);
    if (!m) return;
    Modal.open(`
      <p class="font-sm text-secondary" style="margin:0 0 12px">Everything here is saved on this device.</p>
      ${this._memberFields('edit-member', m)}
      <div class="flex gap-8 wrap" style="justify-content:flex-end">
        <button class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="Household._doEditMember(${jsAttr(m.id)})">Save changes</button>
      </div>
    `, 'Edit ' + esc(m.name || 'person'));
  },

  _doEditMember(memberId) {
    const idx = this._members.findIndex(x => x.id === memberId);
    if (idx === -1) return;
    const val = id => { const e = document.getElementById(id); return e ? e.value : ''; };
    const name = val('edit-member-name').trim();
    if (!name) {
      Toast.show('Type a name first, then tap Save changes', 'error');
      const n = document.getElementById('edit-member-name'); if (n) n.focus();
      return;
    }
    const ageRaw = val('edit-member-age');
    const ageVal = ageRaw !== '' ? parseInt(ageRaw, 10) : null;
    if (ageRaw !== '' && (isNaN(ageVal) || ageVal < 0 || ageVal > 120)) {
      Toast.show('Age must be a number from 0 to 120. Fix it or leave it empty.', 'error', 4000);
      const a = document.getElementById('edit-member-age'); if (a) a.focus();
      return;
    }
    const before = this._members[idx];
    this._members[idx] = {
      ...before,
      name,
      role: val('edit-member-role') || 'member',
      age: ageVal,
      bloodType: val('edit-member-blood') || '',
      allergies: val('edit-member-allergies').trim(),
      conditions: val('edit-member-conditions').trim(),
      needs: val('edit-member-needs').trim()
    };
    if (!Store.set('hh_members', this._members)) { this._members[idx] = before; return; }
    this.renderMembers();
    Modal.close();
    Toast.show(name + ' updated', 'success');
  },

  removeMember(i) {
    const member = this._members[i];
    if (!member) return;
    const memberId = member.id;
    const memberName = member.name || 'this person';
    Modal.confirm('Remove ' + esc(memberName) + ' from your household? Their details will be deleted from this device.', function() {
      const idx = Household._members.findIndex(m => m.id === memberId);
      if (idx === -1) return;
      const removed = Household._members.splice(idx, 1)[0];
      if (!Store.set('hh_members', Household._members)) { // not saved — put the person back (Store has told the user)
        Household._members.splice(idx, 0, removed);
        Household.renderMembers();
        return;
      }
      Household.renderMembers();
      Toast.show(memberName + ' removed', 'info');
    }, 'Remove', 'Keep');
  },

  showQuickRef() {
    if (this._loaded) this.save(true); // show what is on screen, not an older saved copy
    const d = Store.get('household', {}) || {};
    const members = this._getMembers();
    const row = (label, value) => value ? `<div style="display:flex;gap:8px;padding:4px 0;border-bottom:1px solid var(--border)"><span style="font-weight:600;min-width:104px;max-width:40%;color:var(--text-muted);flex-shrink:0">${label}</span><span style="min-width:0;overflow-wrap:anywhere">${esc(value)}</span></div>` : '';
    let memberBlock = '';
    if (members.length) {
      memberBlock = `<div style="margin-top:8px"><strong>People (${members.length})</strong>`;
      memberBlock += members.map(m => {
        const tags = [
          m.bloodType ? `Blood: ${esc(m.bloodType)}` : null,
          m.allergies ? `Allergies: ${esc(m.allergies)}` : null,
          m.conditions ? esc(m.conditions) : null,
          m.needs ? `Needs: ${esc(m.needs)}` : null
        ].filter(Boolean).join(' · ');
        return `<div style="padding:4px 0 4px 10px;border-left:2px solid var(--accent);margin:6px 0;overflow-wrap:anywhere"><strong>${esc(m.name||'')}</strong> <span style="color:var(--text-muted)">${esc(this._roleLabel(m.role))}${(m.age!=null && m.age!=='')?', age '+esc(m.age):''}</span>${tags ? '<br><span style="font-size:12px;color:var(--text-secondary)">'+tags+'</span>' : ''}</div>`;
      }).join('');
      memberBlock += '</div>';
    } else {
      memberBlock = '<div style="color:var(--text-secondary);font-size:13px;padding:6px 0">No people added yet.</div>';
    }
    const ooaContact = [d.ooaName, d.ooaRel ? '('+d.ooaRel+')' : '', d.ooaPhone, d.ooaAlt].filter(Boolean).join(' · ');
    const vehInfo = [d.veh1 ? d.veh1+(d.fuel?' — fuel '+d.fuel:'') : '', d.veh2 && d.veh2 !== '' ? d.veh2+(d.fuel2 && d.fuel2!=='N/A'?' — fuel '+d.fuel2:'') : ''].filter(Boolean).join('; ');
    const html = `
      <div style="border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;background:var(--bg-secondary);font-size:13px;line-height:1.6">
        <div style="font-size:15px;font-weight:600;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--accent);overflow-wrap:anywhere">${esc(d.name||'Household')} <span style="font-weight:400;font-size:12px;color:var(--text-muted)">ID ${esc(d.id||Store.get('hh_id','?'))}</span></div>
        ${row('Area', d.location)}
        ${row('People', d.count || (members.length ? String(members.length) : null))}
        ${row('Special needs', d.needs)}
        ${row('Meet first at', d.meet1)}
        ${row('Then meet at', d.meet2)}
        ${row('If leaving, go to', d.evac)}
        ${row('Far-away contact', ooaContact)}
        ${row('Vehicles', vehInfo)}
        ${row('Pets', d.pets)}
        ${row('Go-bag', d.gobag)}
        <div style="margin-top:10px">${memberBlock}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">ARK · ${new Date().toLocaleDateString()}</div>
      </div>`;
    const card = document.getElementById('hh-qrc-card');
    const content = document.getElementById('hh-qrc-content');
    if (card && content) {
      content.innerHTML = html;
      card.style.display = 'block';
      try { card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch(e) { try { card.scrollIntoView(); } catch(_) {} }
    }
  },

  printCard() {
    if (this._loaded) this.save(true); // print what is on screen, not an older saved copy
    const d = Store.get('household', {}) || {};
    const members = this._getMembers();
    let memberRows = '';
    if (members.length) {
      memberRows = members.map(m => {
        const details = [
          (m.age != null && m.age !== '') ? `Age: ${esc(String(m.age))}` : null,
          m.bloodType ? `Blood: ${esc(m.bloodType)}` : null,
          m.allergies ? `Allergies: ${esc(m.allergies)}` : null,
          m.conditions ? `Conditions: ${esc(m.conditions)}` : null,
          m.needs ? `Needs: ${esc(m.needs)}` : null,
        ].filter(Boolean).join('<br>');
        return `<tr><td>${esc(m.name||'')}</td><td>${esc(this._roleLabel(m.role))}</td><td>${details || '—'}</td></tr>`;
      }).join('');
    } else {
      memberRows = '<tr><td colspan="3" style="color:#999;font-style:italic">No people added</td></tr>';
    }
    const memberTable = `<h3>People in this household</h3>
<table style="width:100%;border-collapse:collapse;margin:8px 0">
<thead><tr style="background:#eee"><th style="border:1px solid #ccc;padding:4px 8px;text-align:left">Name</th><th style="border:1px solid #ccc;padding:4px 8px;text-align:left">Role</th><th style="border:1px solid #ccc;padding:4px 8px;text-align:left">Age and medical details</th></tr></thead>
<tbody>${memberRows}</tbody></table>`;
    const ooaLine = [d.ooaName, d.ooaRel ? '('+d.ooaRel+')' : '', d.ooaPhone, d.ooaAlt].filter(Boolean).join(' | ');
    const veh2Line = d.veh2 ? `<div class="row"><span class="label">Vehicle 2:</span>${esc(d.veh2)}${d.fuel2 && d.fuel2 !== 'N/A' ? ' — fuel ' + esc(d.fuel2) : ''}</div>` : '';
    const html = `<h2>ARK Household Emergency Card</h2>
<div class="row"><span class="label">Household:</span>${esc(d.name||'')}</div>
<div class="row"><span class="label">Household ID:</span>${esc(d.id||Store.get('hh_id',''))}</div>
<div class="row"><span class="label">People:</span>${esc(d.count||String(members.length||''))}</div>
<div class="row"><span class="label">Area:</span>${esc(d.location||'')}</div>
<div class="row"><span class="label">Special needs:</span>${esc(d.needs||'')}</div>
<h3>Where to meet</h3>
<div class="row"><span class="label">Meet first at:</span>${esc(d.meet1||'')}</div>
<div class="row"><span class="label">Then meet at:</span>${esc(d.meet2||'')}</div>
<div class="row"><span class="label">If leaving, go to:</span>${esc(d.evac||'')}</div>
<h3>Contact outside your area</h3>
<div class="row"><span class="label">Contact:</span>${esc(ooaLine)}</div>
<h3>Vehicles &amp; Pets</h3>
<div class="row"><span class="label">Vehicle 1:</span>${esc(d.veh1||'')}${d.veh1 && d.fuel ? ' — fuel ' + esc(d.fuel) : ''}</div>
${veh2Line}
<div class="row"><span class="label">Pets:</span>${esc(d.pets||'')}</div>
<div class="row"><span class="label">Go-bag:</span>${esc(d.gobag||'')}</div>
${memberTable}
<p style="font-size:11px;margin-top:16px">ARK — printed ${new Date().toLocaleDateString()}. Keep this card somewhere dry and easy to reach.</p>`;
    const w = window.open('', '_blank');
    if (!w) {
      // Pop-ups are blocked (common in installed apps): print the card from this page instead.
      printInPage(`<!doctype html><html><head><meta charset="utf-8"><title>Household Emergency Card</title><style>body{font:14px Arial,sans-serif;padding:20px;max-width:680px}h2{font-size:16px;border-bottom:2px solid #000;padding-bottom:4px;margin-bottom:12px}h3{font-size:13px;text-transform:uppercase;letter-spacing:0.05em;margin:14px 0 4px;border-bottom:1px solid #ccc;padding-bottom:2px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:4px 8px;font-size:12px;text-align:left}.row{margin:4px 0}.label{font-weight:700;display:inline-block;min-width:120px}</style></head><body>${html}</body></html>`);
      return;
    }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Household Emergency Card</title>
<style>body{font:14px Arial,sans-serif;padding:20px;max-width:680px}h2{font-size:16px;border-bottom:2px solid #000;padding-bottom:4px;margin-bottom:12px}h3{font-size:13px;text-transform:uppercase;letter-spacing:0.05em;margin:14px 0 4px;border-bottom:1px solid #ccc;padding-bottom:2px}.row{display:flex;gap:10px;margin:4px 0}.label{font-weight:bold;min-width:120px;flex-shrink:0}td,th{border:1px solid #ccc;padding:4px 8px;font-size:12px;text-align:left}@media print{body{margin:0}button{display:none}.no-print{display:none}}</style></head><body>
${html}
<div style="text-align:center;margin:20px 0" class="no-print"><button onclick="window.print()" style="padding:10px 24px;font-size:14px;cursor:pointer;background:#333;color:#fff;border:none;border-radius:12px">Print</button></div>
</body></html>`);
    w.document.close();
    printOnce(w);
  },

  shareWithHub() {
    if (this._loaded) this.save(true);
    const d = Store.get('household', {}) || {};
    const memberCount = Math.max(parseInt(d.count, 10) || 0, this._getMembers().length) || '?';
    // An empty plan tells nobody anything — say what to fill in instead of sending "? people, not given"
    if (memberCount === '?' && !d.location && !d.needs) {
      Toast.show('Nothing to share yet. Fill in how many people and your general area, then tap Share with hub.', 'info', 5000);
      const first = document.getElementById('hh-count');
      if (first) { try { first.focus(); } catch(e) {} }
      return;
    }
    const body = `Household registered: ${memberCount} ${memberCount === 1 ? 'person' : 'people'}. Location: ${d.location||'not given'}. ${d.needs ? 'Needs: '+d.needs : ''}`.trim();
    // Show exactly what will leave this device before it goes — it can include health needs.
    Modal.confirm(
      '<strong style="color:var(--text-primary)">Send this to your ARK Hub?</strong><br>Everyone connected to that hub will be able to read it:' +
      '<div class="font-sm" style="margin-top:10px;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-secondary);color:var(--text-primary);overflow-wrap:anywhere">' + esc(body) + '</div>' +
      '<div class="font-xs text-muted" style="margin-top:8px">Names, ages and medical details of each person are not sent.</div>',
      function() {
        Hub.post({
          id: 'hh_' + Date.now(),
          alias: d.name || 'Household',
          channel: 'general',
          body: body,
          ts: new Date().toISOString()
        }).then(ok => Toast.show(ok
          ? 'Sent to your ARK Hub. People connected to it can see it.'
          : 'Not sent yet. It is saved and will go out when this device joins an ARK Hub.', ok ? 'success' : 'info', 5000))
          .catch(() => Toast.show('Could not send. Check you are joined to an ARK Hub, then try again.', 'error', 5000));
      }, 'Send', 'Do not send');
  }
};

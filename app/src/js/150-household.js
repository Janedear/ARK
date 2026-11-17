// === HOUSEHOLD ===
const Household = {
  _members: [],
  _loaded: false,

  load() {
    // Fill the form from saved data only once. Coming back to this tab must never wipe
    // something the user typed but has not saved yet.
    if (this._loaded) { this._members = Store.get('hh_members', []); this.renderMembers(); return; }
    this._loaded = true;
    const d = Store.get('household', {});
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
    this._members = Store.get('hh_members', []);
    this.renderMembers();
  },

  save() {
    const hGetVal = (id, def) => { const e = document.getElementById(id); return e ? e.value : (def || ''); };
    const d = {
      name: hGetVal('hh-name').trim(),
      count: hGetVal('hh-count') || String(this._members.length || ''),
      location: hGetVal('hh-location').trim(),
      id: hGetVal('hh-id'),
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
    if (!Store.set('household', d)) return; // Store already told the user saving failed
    Store.set('hh_id', d.id);
    // Keep hh-count field in sync with actual saved count
    const countEl = document.getElementById('hh-count');
    if (countEl && !countEl.value && this._members.length) countEl.value = String(this._members.length);
    Toast.show('✅ Household profile saved', 'success');
  },

  addMember() {
    Modal.open(`
      <p style="margin:0 0 12px">Enter details for each household member. Medical info is stored locally only.</p>
      <label class="font-sm semibold">Name</label>
      <input type="text" id="new-member-name" maxlength="60" class="form-input w-full" placeholder="e.g. Maria" style="margin:6px 0 12px">
      <label class="font-sm semibold">Role</label>
      <select id="new-member-role" class="form-input w-full" style="margin:6px 0 12px">
        <option value="member">👤 Member</option>
        <option value="head">🏠 Head of Household</option>
        <option value="spouse">💑 Spouse / Partner</option>
        <option value="child">🧒 Child</option>
        <option value="elderly">🧓 Elderly</option>
        <option value="pet">🐾 Pet</option>
        <option value="leader">👑 Team Leader</option>
        <option value="medic">🏥 Medic</option>
        <option value="radio">📻 Radio Operator</option>
        <option value="security">🛡️ Security</option>
        <option value="logistics">📦 Logistics</option>
        <option value="other">🔵 Other</option>
      </select>
      <label class="font-sm semibold">Age</label>
      <input type="number" id="new-member-age" min="0" max="120" class="form-input w-full" placeholder="e.g. 34" style="margin:6px 0 12px">
      <label class="font-sm semibold">Blood Type</label>
      <select id="new-member-blood" class="form-input w-full" style="margin:6px 0 12px">
        <option value="">Unknown</option>
        <option value="A+">A+</option>
        <option value="A-">A-</option>
        <option value="B+">B+</option>
        <option value="B-">B-</option>
        <option value="AB+">AB+</option>
        <option value="AB-">AB-</option>
        <option value="O+">O+</option>
        <option value="O-">O-</option>
      </select>
      <label class="font-sm semibold">Known Allergies</label>
      <input type="text" id="new-member-allergies" maxlength="200" class="form-input w-full" placeholder="e.g. Penicillin, peanuts" style="margin:6px 0 12px">
      <label class="font-sm semibold">Medical Conditions / Medications</label>
      <input type="text" id="new-member-conditions" maxlength="200" class="form-input w-full" placeholder="e.g. Diabetes, insulin dependent" style="margin:6px 0 12px">
      <label class="font-sm semibold">Special Needs / Notes</label>
      <input type="text" id="new-member-needs" maxlength="200" class="form-input w-full" placeholder="e.g. Wheelchair, oxygen tank, dietary restrictions" style="margin:6px 0 16px">
      <div class="flex gap-8" style="justify-content:flex-end">
        <button class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="Household._doAddMember(document.getElementById('new-member-name').value.trim(),document.getElementById('new-member-role').value,document.getElementById('new-member-age').value,document.getElementById('new-member-blood').value,document.getElementById('new-member-allergies').value.trim(),document.getElementById('new-member-conditions').value.trim(),document.getElementById('new-member-needs').value.trim());">Add Member</button>
      </div>
    `, '👥 Add Household Member');
  },

  _doAddMember(name, role, age, bloodType, allergies, conditions, needs) {
    if (!name) { Toast.show('Please enter a name', 'error'); return; }
    const ageVal = age !== '' && age !== null && age !== undefined ? parseInt(age, 10) : null;
    if (age !== '' && age !== null && age !== undefined && (isNaN(ageVal) || ageVal < 0 || ageVal > 120)) {
      Toast.show('Age must be a number between 0 and 120', 'error'); return;
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
    Store.set('hh_members', this._members);
    this.renderMembers();
    Modal.close();
    Toast.show('✅ ' + name + ' added to household', 'success');
  },

  renderMembers() {
    const list = document.getElementById('members-list');
    if (!list) return;
    if (!this._members.length) {
      const countBadge = document.getElementById('hh-member-count');
      if (countBadge) { countBadge.textContent = ''; countBadge.style.display = 'none'; }
      list.innerHTML = '<div class="text-secondary font-sm mb-12">No members added yet — add your household members for emergency planning.</div><button class="btn btn-primary btn-sm mt-8" onclick="Household.addMember()">+ Add First Member</button>';
      return;
    }
    const countBadge = document.getElementById('hh-member-count');
    if (countBadge) { countBadge.textContent = this._members.length + (this._members.length === 1 ? ' member' : ' members'); countBadge.style.display = 'inline'; }
    const roleEmoji = {leader:'👑',medic:'🏥',radio:'📻',security:'🛡️',logistics:'📦',member:'👤',head:'🏠',spouse:'💑',child:'🧒',elderly:'🧓',pet:'🐾',other:'🔵'};
    list.innerHTML = this._members.map((m, i) => {
      const details = [
        (m.age != null && m.age !== '') ? `Age ${esc(m.age)}` : null,
        m.bloodType ? `Blood: ${esc(m.bloodType)}` : null,
        m.allergies ? `Allergies: ${esc(m.allergies)}` : null,
        m.conditions ? `Conditions: ${esc(m.conditions)}` : null,
        m.needs ? `Needs: ${esc(m.needs)}` : null,
      ].filter(Boolean).join(' · ');
      return `
      <div class="member-item">
        <div class="member-avatar">${roleEmoji[m.role] || '👤'}</div>
        <div style="flex:1">
          <div class="font-sm bold">${esc(m.name)}</div>
          <div class="member-role">${esc(m.role)}</div>
          ${details ? `<div class="font-xs text-secondary" style="margin-top:2px">${details}</div>` : ''}
        </div>
        <div class="flex gap-4">
          <button class="btn btn-ghost btn-sm" onclick="Household.editMember('${m.id}')" aria-label="Edit ${esc(m.name)}" title="Edit">✏️</button>
          <button class="btn btn-ghost btn-sm" onclick="Household.removeMember(${i})" aria-label="Remove ${esc(m.name)}" title="Remove">✕</button>
        </div>
      </div>`;
    }).join('');
  },

  editMember(memberId) {
    const m = this._members.find(x => x.id === memberId);
    if (!m) return;
    const roleEmoji = {leader:'👑',medic:'🏥',radio:'📻',security:'🛡️',logistics:'📦',member:'👤',head:'🏠',spouse:'💑',child:'🧒',elderly:'🧓',pet:'🐾',other:'🔵'};
    const roleOptions = ['member','head','spouse','child','elderly','pet','leader','medic','radio','security','logistics','other']
      .map(r => `<option value="${r}"${m.role===r?' selected':''}>${roleEmoji[r]||'🔵'} ${r.charAt(0).toUpperCase()+r.slice(1)}</option>`).join('');
    const bloodOptions = ['','A+','A-','B+','B-','AB+','AB-','O+','O-']
      .map(b => `<option value="${b}"${m.bloodType===b?' selected':''}>${b||'Unknown'}</option>`).join('');
    Modal.open(`
      <p style="margin:0 0 12px">Edit household member details. Medical info is stored locally only.</p>
      <label class="font-sm semibold">Name</label>
      <input type="text" id="edit-member-name" maxlength="60" class="form-input w-full" value="${esc(m.name||'')}" style="margin:6px 0 12px">
      <label class="font-sm semibold">Role</label>
      <select id="edit-member-role" class="form-input w-full" style="margin:6px 0 12px">${roleOptions}</select>
      <label class="font-sm semibold">Age</label>
      <input type="number" id="edit-member-age" min="0" max="120" class="form-input w-full" value="${m.age!=null?m.age:''}" style="margin:6px 0 12px">
      <label class="font-sm semibold">Blood Type</label>
      <select id="edit-member-blood" class="form-input w-full" style="margin:6px 0 12px">${bloodOptions}</select>
      <label class="font-sm semibold">Known Allergies</label>
      <input type="text" id="edit-member-allergies" maxlength="200" class="form-input w-full" value="${esc(m.allergies||'')}" style="margin:6px 0 12px">
      <label class="font-sm semibold">Medical Conditions / Medications</label>
      <input type="text" id="edit-member-conditions" maxlength="200" class="form-input w-full" value="${esc(m.conditions||'')}" style="margin:6px 0 12px">
      <label class="font-sm semibold">Special Needs / Notes</label>
      <input type="text" id="edit-member-needs" maxlength="200" class="form-input w-full" value="${esc(m.needs||'')}" style="margin:6px 0 16px">
      <div class="flex gap-8" style="justify-content:flex-end">
        <button class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="Household._doEditMember('${m.id}')">Save Changes</button>
      </div>
    `, '✏️ Edit Member');
  },

  _doEditMember(memberId) {
    const idx = this._members.findIndex(x => x.id === memberId);
    if (idx === -1) return;
    const name = document.getElementById('edit-member-name').value.trim();
    if (!name) { Toast.show('Please enter a name', 'error'); return; }
    const ageRaw = document.getElementById('edit-member-age').value;
    const ageVal = ageRaw !== '' ? parseInt(ageRaw, 10) : null;
    if (ageRaw !== '' && (isNaN(ageVal) || ageVal < 0 || ageVal > 120)) {
      Toast.show('Age must be a number between 0 and 120', 'error'); return;
    }
    this._members[idx] = {
      ...this._members[idx],
      name,
      role: document.getElementById('edit-member-role').value || 'member',
      age: ageVal,
      bloodType: document.getElementById('edit-member-blood').value || '',
      allergies: document.getElementById('edit-member-allergies').value.trim(),
      conditions: document.getElementById('edit-member-conditions').value.trim(),
      needs: document.getElementById('edit-member-needs').value.trim()
    };
    Store.set('hh_members', this._members);
    this.renderMembers();
    Modal.close();
    Toast.show('✅ ' + name + ' updated', 'success');
  },

  removeMember(i) {
    const member = this._members[i];
    if (!member) return;
    const memberId = member.id;
    const memberName = member.name || 'this member';
    Modal.confirm('Remove ' + esc(memberName) + ' from your household? This cannot be undone.', function() {
      const idx = Household._members.findIndex(m => m.id === memberId);
      if (idx !== -1) Household._members.splice(idx, 1);
      Store.set('hh_members', Household._members);
      Household.renderMembers();
    }, 'Remove', 'Keep');
  },

  showQuickRef() {
    const d = Store.get('household', {});
    const members = Store.get('hh_members', []);
    const roleEmoji = {leader:'👑',medic:'🏥',radio:'📻',security:'🛡️',logistics:'📦',member:'👤',head:'🏠',spouse:'💑',child:'🧒',elderly:'🧓',pet:'🐾',other:'🔵'};
    const row = (label, value) => value ? `<div style="display:flex;gap:8px;padding:3px 0;border-bottom:1px solid var(--border)"><span style="font-weight:600;min-width:120px;color:var(--accent);flex-shrink:0">${label}</span><span>${esc(value)}</span></div>` : '';
    let memberBlock = '';
    if (members.length) {
      memberBlock = `<div style="margin-top:8px"><strong style="color:var(--accent)">👥 Members (${members.length})</strong>`;
      memberBlock += members.map(m => {
        const tags = [
          m.bloodType ? `Blood: ${esc(m.bloodType)}` : null,
          m.allergies ? `⚠️ ${esc(m.allergies)}` : null,
          m.conditions ? esc(m.conditions) : null,
          m.needs ? `🦽 ${esc(m.needs)}` : null
        ].filter(Boolean).join(' · ');
        return `<div style="padding:4px 0 4px 8px;border-left:3px solid var(--accent);margin:4px 0"><strong>${roleEmoji[m.role]||'👤'} ${esc(m.name||'')}</strong>${(m.age!=null && m.age!=='')?' age '+esc(m.age):''}${tags ? '<br><span style="font-size:12px;color:var(--text-secondary)">'+tags+'</span>' : ''}</div>`;
      }).join('');
      memberBlock += '</div>';
    } else {
      memberBlock = '<div style="color:var(--text-secondary);font-size:13px;padding:6px 0">No members added yet.</div>';
    }
    const ooaContact = [d.ooaName, d.ooaRel ? '('+d.ooaRel+')' : '', d.ooaPhone, d.ooaAlt].filter(Boolean).join(' · ');
    const vehInfo = [d.veh1 ? d.veh1+(d.fuel?' — '+d.fuel:'') : '', d.veh2 && d.veh2 !== '' ? d.veh2+(d.fuel2 && d.fuel2!=='N/A'?' — '+d.fuel2:'') : ''].filter(Boolean).join('; ');
    const html = `
      <div style="border:2px solid var(--accent);border-radius:8px;padding:12px;background:var(--bg-elevated);font-size:13px;line-height:1.6">
        <div style="font-size:15px;font-weight:700;color:var(--accent);margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid var(--accent)">🏘️ ${esc(d.name||'Household')} · ID: ${esc(d.id||Store.get('hh_id','?'))}</div>
        ${row('📍 Area', d.location)}
        ${row('🗓️ Members', d.count || (members.length ? String(members.length) : null))}
        ${row('⚠️ Special Needs', d.needs)}
        ${row('📌 Meet Point 1', d.meet1)}
        ${row('📌 Meet Point 2', d.meet2)}
        ${row('🚗 Evacuate to', d.evac)}
        ${row('📞 Out-of-Area', ooaContact)}
        ${row('🚘 Vehicle(s)', vehInfo)}
        ${row('🐾 Pets', d.pets)}
        ${row('🎒 Go-bag', d.gobag)}
        <div style="margin-top:10px">${memberBlock}</div>
        <div style="font-size:10px;color:var(--text-secondary);margin-top:8px;padding-top:6px;border-top:1px solid var(--border)">ARK Crisis Suite · ${new Date().toLocaleDateString()}</div>
      </div>`;
    const card = document.getElementById('hh-qrc-card');
    const content = document.getElementById('hh-qrc-content');
    if (card && content) {
      content.innerHTML = html;
      card.style.display = 'block';
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  },

  printCard() {
    const d = Store.get('household', {});
    const members = Store.get('hh_members', []);
    const roleEmoji = {leader:'👑',medic:'🏥',radio:'📻',security:'🛡️',logistics:'📦',member:'👤',head:'🏠',spouse:'💑',child:'🧒',elderly:'🧓',pet:'🐾',other:'🔵'};
    let memberRows = '';
    if (members.length) {
      memberRows = members.map(m => {
        const details = [
          m.age != null ? `Age: ${esc(String(m.age))}` : null,
          m.bloodType ? `Blood: ${esc(m.bloodType)}` : null,
          m.allergies ? `Allergies: ${esc(m.allergies)}` : null,
          m.conditions ? `Conditions: ${esc(m.conditions)}` : null,
          m.needs ? `Needs: ${esc(m.needs)}` : null,
        ].filter(Boolean).join('<br>');
        return `<tr><td>${roleEmoji[m.role]||'👤'} ${esc(m.name||'')}</td><td>${esc(m.role||'')}</td><td>${details || '—'}</td></tr>`;
      }).join('');
    } else {
      memberRows = '<tr><td colspan="3" style="color:#999;font-style:italic">No members added</td></tr>';
    }
    const memberTable = `<h3>Household Members</h3>
<table style="width:100%;border-collapse:collapse;margin:8px 0">
<thead><tr style="background:#eee"><th style="border:1px solid #ccc;padding:4px 8px;text-align:left">Name</th><th style="border:1px solid #ccc;padding:4px 8px;text-align:left">Role</th><th style="border:1px solid #ccc;padding:4px 8px;text-align:left">Medical Info</th></tr></thead>
<tbody>${memberRows}</tbody></table>`;
    const ooaLine = [d.ooaName, d.ooaRel ? '('+d.ooaRel+')' : '', d.ooaPhone, d.ooaAlt].filter(Boolean).join(' | ');
    const veh2Line = d.veh2 ? `<div class="row"><span class="label">Vehicle 2:</span>${esc(d.veh2)} — ${esc(d.fuel2||'')}</div>` : '';
    const html = `<h2>ARK Household Emergency Card</h2>
<div class="row"><span class="label">Household:</span>${esc(d.name||'')}</div>
<div class="row"><span class="label">HH ID:</span>${esc(d.id||Store.get('hh_id',''))}</div>
<div class="row"><span class="label">Members:</span>${esc(d.count||String(members.length||''))}</div>
<div class="row"><span class="label">Area:</span>${esc(d.location||'')}</div>
<div class="row"><span class="label">Special Needs:</span>${esc(d.needs||'')}</div>
<h3>Meeting &amp; Evacuation</h3>
<div class="row"><span class="label">Meet Point 1:</span>${esc(d.meet1||'')}</div>
<div class="row"><span class="label">Meet Point 2:</span>${esc(d.meet2||'')}</div>
<div class="row"><span class="label">Evacuate to:</span>${esc(d.evac||'')}</div>
<h3>Out-of-Area Contact</h3>
<div class="row"><span class="label">Contact:</span>${esc(ooaLine)}</div>
<h3>Vehicles &amp; Pets</h3>
<div class="row"><span class="label">Vehicle 1:</span>${esc(d.veh1||'')} — ${esc(d.fuel||'')}</div>
${veh2Line}
<div class="row"><span class="label">Pets:</span>${esc(d.pets||'')}</div>
<div class="row"><span class="label">Go-bag:</span>${esc(d.gobag||'')}</div>
${memberTable}
<p style="font-size:11px;margin-top:16px">ARK Crisis Suite — Generated ${new Date().toLocaleDateString()}</p>`;
    const w = window.open('', '_blank');
    if (!w) {
      // Pop-ups are blocked (common in installed apps): print the card from this page instead.
      printInPage(`<!doctype html><html><head><meta charset="utf-8"><title>Household Emergency Card</title><style>body{font:14px Arial,sans-serif;padding:20px;max-width:680px}h2{font-size:16px;border-bottom:2px solid #000;padding-bottom:4px;margin-bottom:12px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:4px 8px;font-size:12px;text-align:left}.row{margin:4px 0}.label{font-weight:700;display:inline-block;min-width:120px}</style></head><body>${html}</body></html>`);
      return;
    }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Household Emergency Card</title>
<style>body{font:14px Arial,sans-serif;padding:20px;max-width:680px}h2{font-size:16px;border-bottom:2px solid #000;padding-bottom:4px;margin-bottom:12px}h3{font-size:13px;text-transform:uppercase;letter-spacing:0.05em;margin:14px 0 4px;border-bottom:1px solid #ccc;padding-bottom:2px}.row{display:flex;gap:10px;margin:4px 0}.label{font-weight:bold;min-width:120px;flex-shrink:0}td,th{border:1px solid #ccc;padding:4px 8px;font-size:12px;text-align:left}@media print{body{margin:0}button{display:none}.no-print{display:none}}</style></head><body>
${html}
<div style="text-align:center;margin:20px 0" class="no-print"><button onclick="window.print()" style="padding:8px 20px;font-size:14px;cursor:pointer;background:#333;color:#fff;border:none;border-radius:4px">🖨️ Print</button></div>
</body></html>`);
    w.document.close();
    printOnce(w);
  },

  shareWithHub() {
    const d = Store.get('household', {});
    const memberCount = this._members.length || d.count || '?';
    Hub.post({
      id: 'hh_' + Date.now(),
      alias: d.name || 'Household',
      channel: 'general',
      body: `Household registered: ${memberCount} people. Location: ${d.location||'not given'}. ${d.needs ? 'Needs: '+d.needs : ''}`,
      ts: new Date().toISOString()
    }).then(ok => Toast.show(ok ? '✅ Shared with your hub community' : '💾 Saved on your device — will send when you connect to a hub', ok ? 'success' : 'info'));
  }
};


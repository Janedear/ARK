// === MISSING PERSONS ===
const MissingPersons = {
  _list: [],
  _STATUSES: ['Active Search', 'Located', 'Deceased'],

  init() {
    this._list = Store.get('missing_persons', []);
    this.render();
  },

  filterSearch() {
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => this.render(), 200);
  },

  _filtered() {
    const q = (document.getElementById('missing-search')?.value || '').trim().toLowerCase();
    if (!q) return this._list;
    return this._list.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.lastSeen || '').toLowerCase().includes(q)
    );
  },

  render() {
    const container = document.getElementById('missing-persons-list');
    if (!container) return;

    // Count badge
    const badge = document.getElementById('missing-count-badge');
    if (badge) {
      const activeCount = this._list.filter(p => p.status === 'Active Search').length;
      if (activeCount) {
        badge.textContent = activeCount + ' active report' + (activeCount !== 1 ? 's' : '');
        badge.style.display = '';
      } else if (this._list.length) {
        badge.textContent = this._list.length + ' record' + (this._list.length !== 1 ? 's' : '');
        badge.style.display = '';
      } else {
        badge.style.display = 'none';
      }
    }

    // Search row visibility
    const searchRow = document.getElementById('missing-search-row');
    if (searchRow) searchRow.style.display = this._list.length > 1 ? '' : 'none';

    if (!this._list.length) {
      container.innerHTML = '<div class="text-secondary font-sm" style="padding:8px 0">No missing persons reports — tap Add to create a report.</div>';
      return;
    }

    const visible = this._filtered();
    if (!visible.length) {
      container.innerHTML = '<div class="text-secondary font-sm" style="padding:8px 0">No records match your search.</div>';
      return;
    }

    container.innerHTML = visible.map((p) => {
      const i = this._list.indexOf(p);
      const statusColor = p.status === 'Located' ? '#1a7a1a' : p.status === 'Deceased' ? '#555' : '#cc0000';
      const photoHtml = (p.photoUrl && (/^data:image\//i.test(p.photoUrl) || /^https:\/\//i.test(p.photoUrl)))
        ? `<img src="${esc(p.photoUrl)}" alt="Photo of ${esc(p.name||'')}" style="width:48px;height:48px;object-fit:cover;border-radius:6px;border:1px solid var(--border-color,#ddd)">`
        : `<div style="width:48px;height:48px;border-radius:6px;border:2px dashed #aaa;display:flex;align-items:center;justify-content:center;font-size:20px;background:var(--surface-alt,#f5f5f5)">🔍</div>`;
      return `
      <div class="member-item" style="margin-bottom:8px;align-items:flex-start">
        <div style="flex-shrink:0">${photoHtml}</div>
        <div style="flex:1;min-width:0">
          <div class="font-sm bold">${esc(p.name||'Unknown')} <span style="color:${statusColor};font-size:11px;font-weight:600">${esc(p.status||'Active Search')}</span></div>
          <div class="member-role">Age: ${esc(String(p.age||'?'))} · Last seen: ${esc(p.lastSeen||'—')}${p.lastSeenTime ? ' at ' + esc(p.lastSeenTime) : ''}</div>
          <div class="font-xs text-secondary" style="margin-top:2px">${esc(p.description||'')}</div>
          ${p.contactInfo ? `<div class="font-xs text-secondary" style="margin-top:2px">Contact: ${esc(p.contactInfo)}</div>` : ''}
          <div class="font-xs text-muted" style="margin-top:2px">Reported: ${p.ts ? new Date(p.ts).toLocaleString() : '—'}</div>
        </div>
        <div class="flex gap-8" style="flex-direction:column;flex-shrink:0">
          <button class="btn btn-secondary btn-sm" onclick="PrintARK.missingPerson(${jsAttr(p.id||'')})" title="Print flyer">🖨️ Flyer</button>
          <button class="btn btn-primary btn-sm" onclick="MissingPersons.broadcast(${i})" title="Broadcast to network">📡 Broadcast</button>
          <button class="btn btn-secondary btn-sm" onclick="MissingPersons.updateStatus(${jsAttr(p.id||'')})" title="Update status">✏️ Status</button>
          <button class="btn btn-ghost btn-sm" onclick="MissingPersons.remove(${i})" aria-label="Remove record">✕</button>
        </div>
      </div>`;
    }).join('');
  },

  addForm() {
    Modal.open(`
      <p style="margin:0 0 12px">Record details to help locate this person. All data stays on this device.</p>
      <label class="font-sm semibold">Full Name <span style="color:#cc0000">*</span></label>
      <input type="text" id="mp-name" maxlength="80" class="form-input w-full" placeholder="e.g. James Okafor" style="margin:6px 0 2px">
      <div id="mp-name-err" class="font-xs" style="color:#cc0000;min-height:16px;margin-bottom:8px"></div>
      <label class="font-sm semibold">Age (0–120)</label>
      <input type="number" id="mp-age" min="0" max="120" class="form-input w-full" placeholder="e.g. 12" style="margin:6px 0 2px">
      <div id="mp-age-err" class="font-xs" style="color:#cc0000;min-height:16px;margin-bottom:8px"></div>
      <label class="font-sm semibold">Status</label>
      <select id="mp-status" class="form-input w-full" style="margin:6px 0 12px">
        <option value="Active Search">Active Search</option>
        <option value="Located">Located</option>
        <option value="Deceased">Deceased</option>
      </select>
      <label class="font-sm semibold">Description (clothing, hair, distinguishing features)</label>
      <textarea id="mp-description" maxlength="300" class="form-input w-full" placeholder="e.g. Blue jacket, red backpack, brown hair" style="margin:6px 0 12px;min-height:60px"></textarea>
      <label class="font-sm semibold">Last Seen Location <span style="color:#cc0000">*</span></label>
      <input type="text" id="mp-lastseen" maxlength="200" class="form-input w-full" placeholder="e.g. Main St near school" style="margin:6px 0 2px">
      <div id="mp-lastseen-err" class="font-xs" style="color:#cc0000;min-height:16px;margin-bottom:8px"></div>
      <label class="font-sm semibold">Last Seen Time (optional)</label>
      <input type="text" id="mp-lastseen-time" maxlength="50" class="form-input w-full" placeholder="e.g. 3:00 PM, this morning" style="margin:6px 0 12px">
      <label class="font-sm semibold">Contact Information (optional)</label>
      <input type="text" id="mp-contact" maxlength="150" class="form-input w-full" placeholder="e.g. Radio channel, meeting point" style="margin:6px 0 12px">
      <label class="font-sm semibold">Photo (optional)</label>
      <input type="file" id="mp-photo" accept="image/*" class="form-input w-full" style="margin:6px 0 8px" onchange="MissingPersons._previewPhoto()">
      <div id="mp-photo-preview" style="display:none;margin-bottom:12px;text-align:center">
        <img id="mp-photo-img" src="" alt="Photo preview" style="max-width:120px;max-height:120px;border-radius:6px;border:2px solid var(--border-color,#ddd)">
        <div class="font-xs text-muted" style="margin-top:4px">Photo preview</div>
      </div>
      <div class="flex gap-8" style="justify-content:flex-end">
        <button class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="if(MissingPersons._doAdd())Modal.close();">Report Missing</button>
      </div>
    `, '🔍 Report Missing Person');
  },

  _previewPhoto() {
    const input = document.getElementById('mp-photo');
    const preview = document.getElementById('mp-photo-preview');
    const img = document.getElementById('mp-photo-img');
    if (!input || !input.files || !input.files[0]) { if (preview) preview.style.display = 'none'; return; }
    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      Toast.show('Please select a valid image file (JPEG, PNG, etc.)', 'error');
      input.value = '';
      if (preview) preview.style.display = 'none';
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
      // Phone photos are several megabytes — far more than the browser lets ARK store.
      // Shrink to a small JPEG so the record can actually be saved.
      const full = e.target.result;
      const show = src => { if (img) img.src = src; if (preview) preview.style.display = ''; };
      const probe = new Image();
      probe.onload = function() {
        try {
          const max = 360;
          const scale = Math.min(1, max / Math.max(probe.width, probe.height));
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(probe.width * scale));
          c.height = Math.max(1, Math.round(probe.height * scale));
          c.getContext('2d').drawImage(probe, 0, 0, c.width, c.height);
          show(c.toDataURL('image/jpeg', 0.7));
        } catch (err) { show(full); }
      };
      probe.onerror = function() {
        Toast.show('That photo could not be read — try a different one', 'error');
        input.value = '';
        if (preview) preview.style.display = 'none';
      };
      probe.src = full;
    };
    reader.readAsDataURL(file);
  },

  _doAdd() {
    let valid = true;
    const nameEl = document.getElementById('mp-name');
    const nameErr = document.getElementById('mp-name-err');
    const ageEl = document.getElementById('mp-age');
    const ageErr = document.getElementById('mp-age-err');
    const lastSeenEl = document.getElementById('mp-lastseen');
    const lastSeenErr = document.getElementById('mp-lastseen-err');

    const name = (nameEl?.value || '').trim();
    if (!name) {
      if (nameErr) nameErr.textContent = 'Name is required.';
      if (nameEl) nameEl.focus();
      valid = false;
    } else { if (nameErr) nameErr.textContent = ''; }

    const ageRaw = (ageEl?.value || '').trim();
    if (ageRaw !== '') {
      const ageNum = Number(ageRaw);
      if (!Number.isInteger(ageNum) || ageNum < 0 || ageNum > 120) {
        if (ageErr) ageErr.textContent = 'Age must be a whole number between 0 and 120.';
        valid = false;
      } else { if (ageErr) ageErr.textContent = ''; }
    } else { if (ageErr) ageErr.textContent = ''; }

    const lastSeen = (lastSeenEl?.value || '').trim();
    if (!lastSeen) {
      if (lastSeenErr) lastSeenErr.textContent = 'Last seen location is required.';
      if (!valid || name) lastSeenEl?.focus();
      valid = false;
    } else { if (lastSeenErr) lastSeenErr.textContent = ''; }

    if (!valid) return false;

    // Resolve photo — read from preview img src (already validated as data:image/ in _previewPhoto)
    let photoUrl = '';
    const previewImg = document.getElementById('mp-photo-img');
    if (previewImg && previewImg.src && /^data:image\//i.test(previewImg.src)) {
      photoUrl = previewImg.src;
    }

    const record = {
      id: generateID(),
      name,
      age: ageRaw,
      status: document.getElementById('mp-status')?.value || 'Active Search',
      description: (document.getElementById('mp-description')?.value || '').trim(),
      lastSeen,
      lastSeenTime: (document.getElementById('mp-lastseen-time')?.value || '').trim(),
      contactInfo: (document.getElementById('mp-contact')?.value || '').trim(),
      photoUrl,
      ts: new Date().toISOString()
    };
    this._list.push(record);
    if (!Store.set('missing_persons', this._list)) {
      // Storage is full. The photo is the big part — try again without it before giving up.
      record.photoUrl = '';
      if (!Store.set('missing_persons', this._list)) {
        this._list.pop();
        this.render();
        Toast.show('Could not save — this device\'s storage for ARK is full. Delete old records or export a backup first.', 'error', 7000);
        return false;
      }
      this.render();
      Toast.show('Record saved, but the photo was too large to keep', 'warning', 6000);
      return true;
    }
    this.render();
    Toast.show('Missing person record saved', 'success');
    return true;
  },

  async broadcast(i) {
    const p = this._list[i];
    if (!p) return;
    const msg = {
      id: 'local_mp_' + Date.now() + '_' + Math.random().toString(36).slice(2),
      alias: Store.get('last_alias', 'ARK User'),
      channel: 'missing',
      body: `🚨 MISSING PERSON ALERT: ${p.name||'Unknown'}, Age: ${p.age||'?'}, Last seen: ${p.lastSeen||'unknown location'}${p.lastSeenTime ? ' at ' + p.lastSeenTime : ''}. ${p.description ? 'Description: ' + p.description + '.' : ''} ${p.contactInfo ? 'Contact: ' + p.contactInfo + '.' : ''} Reported: ${p.ts ? new Date(p.ts).toLocaleString() : '—'}`.trim(),
      urgent: true,
      ts: new Date().toISOString()
    };
    // Save locally so the alert appears in the message board even when offline
    await DB.put('messages', msg);
    Hub.post(msg).then(sent => {
      Toast.show(sent ? 'Alert broadcast to network' : 'Queued — will send when hub is reachable', sent ? 'success' : 'warning', 3000);
    }).catch(() => {
      Toast.show('Queued — will send when hub is reachable', 'warning', 3000);
    });
    if (typeof Messages !== 'undefined') Messages.refresh();
  },

  remove(i) {
    const name = this._list[i] ? this._list[i].name : 'this record';
    Modal.confirm('Remove missing person record for ' + esc(name) + '?', () => {
      MissingPersons._list.splice(i, 1);
      Store.set('missing_persons', MissingPersons._list);
      MissingPersons.render();
    }, 'Remove', 'Keep');
  },

  updateStatus(id) {
    const p = this._list.find(x => x.id === id);
    if (!p) return;
    Modal.open(`
      <p style="margin:0 0 12px">Update status for <strong>${esc(p.name||'Unknown')}</strong>.</p>
      <label class="font-sm semibold">Status</label>
      <select id="mp-update-status" class="form-input w-full" style="margin:6px 0 16px">
        <option value="Active Search"${p.status === 'Active Search' ? ' selected' : ''}>Active Search</option>
        <option value="Located"${p.status === 'Located' ? ' selected' : ''}>Located — Person found</option>
        <option value="Deceased"${p.status === 'Deceased' ? ' selected' : ''}>Deceased</option>
      </select>
      <label class="font-sm semibold">Update Note (optional)</label>
      <input type="text" id="mp-update-note" maxlength="200" class="form-input w-full" placeholder="e.g. Found at community centre" style="margin:6px 0 16px">
      <div class="flex gap-8" style="justify-content:flex-end">
        <button class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="MissingPersons._doUpdateStatus('${esc(id)}');Modal.close();">Save Status</button>
      </div>
    `, '✏️ Update Status');
  },

  _doUpdateStatus(id) {
    const p = this._list.find(x => x.id === id);
    if (!p) return;
    const newStatus = document.getElementById('mp-update-status')?.value || p.status;
    const note = (document.getElementById('mp-update-note')?.value || '').trim();
    p.status = newStatus;
    if (note) p.updateNote = note;
    p.updatedTs = new Date().toISOString();
    Store.set('missing_persons', this._list);
    this.render();
    Toast.show('Status updated to: ' + newStatus, 'success');
  }
};


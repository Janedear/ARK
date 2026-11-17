// === MISSING PERSONS ===
const MissingPersons = {
  _list: [],
  _STATUSES: ['Active Search', 'Located', 'Deceased'],

  // Stored status value -> plain words shown on screen. Stored values never change.
  _statusLabel(status) {
    if (status === 'Located') return 'Found';
    if (status === 'Deceased') return 'Deceased';
    return 'Still missing';
  },

  _statusOptions(selected) {
    return this._STATUSES.map(s => `<option value="${s}"${selected === s ? ' selected' : ''}>${this._statusLabel(s)}</option>`).join('');
  },

  init() {
    const saved = Store.get('missing_persons', []);
    this._list = Array.isArray(saved) ? saved.filter(p => p && typeof p === 'object') : [];
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
      String(p.name || '').toLowerCase().includes(q) ||
      String(p.lastSeen || '').toLowerCase().includes(q) ||
      String(p.description || '').toLowerCase().includes(q)
    );
  },

  render() {
    const container = document.getElementById('missing-persons-list');
    if (!container) return;

    // Count badge
    const badge = document.getElementById('missing-count-badge');
    if (badge) {
      const activeCount = this._list.filter(p => (p.status || 'Active Search') === 'Active Search').length;
      if (activeCount) {
        badge.textContent = activeCount + ' still missing';
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
      container.innerHTML = '<div class="text-secondary font-sm" style="padding:8px 0">Nobody recorded as missing. If someone is missing, tap <strong>Report Missing</strong> to write down their details.</div>';
      return;
    }

    const visible = this._filtered();
    if (!visible.length) {
      container.innerHTML = '<div class="text-secondary font-sm" style="padding:8px 0">No records match your search. Clear the search box to see everyone.</div>';
      return;
    }

    const icon = n => `<svg class="hi" aria-hidden="true"><use href="#i-${n}"/></svg>`;
    const queued = this._queuedIds();
    container.innerHTML = visible.map((p) => {
      const i = this._list.indexOf(p);
      const status = p.status || 'Active Search';
      const badgeClass = status === 'Located' ? 'badge-green' : status === 'Deceased' ? 'badge-muted' : 'badge-red';
      const nm = esc(p.name || 'Unknown');
      const photoHtml = (p.photoUrl && (/^data:image\//i.test(p.photoUrl) || /^https:\/\//i.test(p.photoUrl)))
        ? `<img src="${esc(p.photoUrl)}" alt="Photo of ${nm}" style="width:56px;height:56px;object-fit:cover;border-radius:var(--radius-md);border:1px solid var(--border)">`
        : `<div aria-hidden="true" style="width:56px;height:56px;border-radius:var(--radius-md);border:1px dashed var(--border);display:flex;align-items:center;justify-content:center;font-size:20px;color:var(--text-muted);background:var(--bg-card)">${icon('person-search')}</div>`;
      const hasAge = p.age != null && String(p.age) !== '';
      const updated = p.updatedTs && !isNaN(Date.parse(p.updatedTs)) ? new Date(p.updatedTs).toLocaleString() : '';
      const sendLabel = status === 'Active Search' ? 'Send to hub' : 'Send update';
      // Say plainly whether this record has gone out, so nobody has to wonder or send it twice
      let sendLine = '';
      if (p.sentState === 'sent' && p.sentTs && !isNaN(Date.parse(p.sentTs))) {
        sendLine = 'Sent to your ARK Hub ' + esc(new Date(p.sentTs).toLocaleString()) + '.' +
          (this._changedSinceSent(p) ? ' Changed since then. Tap ' + sendLabel + ' so others get the news.' : '');
      } else if (p.sentState === 'waiting' && p.sentMsgId && queued[p.sentMsgId]) {
        sendLine = 'Waiting to send. It will go out when this device joins an ARK Hub.';
      }
      return `
      <div class="member-item" style="margin-bottom:8px;align-items:flex-start;flex-wrap:wrap">
        <div style="flex-shrink:0">${photoHtml}</div>
        <div style="flex:1;min-width:0;overflow-wrap:anywhere">
          <div class="font-sm bold">${nm} <span class="badge ${badgeClass}">${esc(this._statusLabel(status))}</span></div>
          <div class="font-xs text-secondary" style="margin-top:2px">${hasAge ? 'Age ' + esc(String(p.age)) + ' · ' : ''}Last seen: ${esc(p.lastSeen||'not known')}${p.lastSeenTime ? ', ' + esc(p.lastSeenTime) : ''}</div>
          ${p.description ? `<div class="font-xs text-secondary" style="margin-top:2px">${esc(p.description)}</div>` : ''}
          ${p.contactInfo ? `<div class="font-xs text-secondary" style="margin-top:2px">If found, contact: ${esc(p.contactInfo)}</div>` : ''}
          ${p.updateNote ? `<div class="font-xs" style="margin-top:2px;color:var(--text-primary)">Update: ${esc(p.updateNote)}</div>` : ''}
          <div class="font-xs text-muted" style="margin-top:2px">Recorded ${p.ts && !isNaN(Date.parse(p.ts)) ? esc(new Date(p.ts).toLocaleString()) : 'date unknown'}${updated ? ' · updated ' + esc(updated) : ''}</div>
          ${sendLine ? `<div class="font-xs text-muted" style="margin-top:2px">${sendLine}</div>` : ''}
        </div>
        <div class="flex wrap gap-8" style="flex:1 1 100%">
          <button class="btn btn-primary btn-sm" onclick="MissingPersons.broadcast(${i})" title="Send this to your ARK Hub so people connected to it can see it">${icon('send')} ${sendLabel}</button>
          <button class="btn btn-secondary btn-sm" onclick="PrintARK.missingPerson(${jsAttr(p.id||'')})" title="Print a flyer to put up">${icon('printer')} Flyer</button>
          <button class="btn btn-secondary btn-sm" onclick="MissingPersons.updateStatus(${jsAttr(p.id||'')})" title="Mark as found, or add an update">${icon('edit')} Update</button>
          <button class="btn btn-ghost btn-sm" onclick="MissingPersons.remove(${i})" aria-label="Delete the record for ${nm}" title="Delete this record">${icon('trash')}</button>
        </div>
      </div>`;
    }).join('');
  },

  addForm() {
    Modal.open(`
      <p class="font-sm text-secondary" style="margin:0 0 10px">Write down what you know. It is saved on this device. Nobody else sees it until you tap <strong>Send to hub</strong> or print a flyer.</p>
      <div class="info-box">ARK does not alert police or rescue teams. If you can reach emergency services, report this person to them as well.</div>
      <label class="form-label" for="mp-name">Full name (needed)</label>
      <input type="text" id="mp-name" maxlength="80" class="form-input w-full" placeholder="e.g. James Okafor" aria-describedby="mp-name-err" autocomplete="off">
      <div id="mp-name-err" class="font-xs" role="alert" style="color:var(--red);min-height:16px;margin:2px 0 8px"></div>
      <label class="form-label" for="mp-age">Age</label>
      <input type="number" inputmode="numeric" id="mp-age" min="0" max="120" class="form-input w-full" placeholder="e.g. 12" aria-describedby="mp-age-err">
      <div id="mp-age-err" class="font-xs" role="alert" style="color:var(--red);min-height:16px;margin:2px 0 8px"></div>
      <label class="form-label" for="mp-lastseen">Where they were last seen (needed)</label>
      <input type="text" id="mp-lastseen" maxlength="200" class="form-input w-full" placeholder="e.g. Main St near the school" aria-describedby="mp-lastseen-err">
      <div id="mp-lastseen-err" class="font-xs" role="alert" style="color:var(--red);min-height:16px;margin:2px 0 8px"></div>
      <label class="form-label" for="mp-lastseen-time">When they were last seen</label>
      <input type="text" id="mp-lastseen-time" maxlength="50" class="form-input w-full mb-12" placeholder="e.g. 3:00 PM today, this morning">
      <label class="form-label" for="mp-description">What they look like and what they were wearing</label>
      <textarea id="mp-description" maxlength="300" class="form-input w-full mb-12" placeholder="e.g. Blue jacket, red backpack, brown hair" style="min-height:60px"></textarea>
      <label class="form-label" for="mp-contact">How to reach you if they are found</label>
      <input type="text" id="mp-contact" maxlength="150" class="form-input w-full mb-12" placeholder="e.g. Your name, radio channel, meeting point">
      <label class="form-label" for="mp-photo">Photo</label>
      <input type="file" id="mp-photo" accept="image/*" class="form-input w-full mb-8" onchange="MissingPersons._previewPhoto()">
      <div id="mp-photo-preview" style="display:none;margin-bottom:12px;text-align:center">
        <img id="mp-photo-img" src="" alt="The photo you chose" style="max-width:120px;max-height:120px;border-radius:var(--radius-md);border:1px solid var(--border)">
        <div class="font-xs text-muted" style="margin-top:4px">This photo is saved with the record and printed on the flyer. It is not sent to the hub.</div>
      </div>
      <label class="form-label" for="mp-status">Status</label>
      <select id="mp-status" class="form-input w-full" style="margin-bottom:16px">${this._statusOptions('Active Search')}</select>
      <div class="flex gap-8 wrap" style="justify-content:flex-end">
        <button class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="if(MissingPersons._doAdd())Modal.close();">Save record</button>
      </div>
    `, 'Report a missing person');
  },

  _previewPhoto() {
    const input = document.getElementById('mp-photo');
    const preview = document.getElementById('mp-photo-preview');
    const img = document.getElementById('mp-photo-img');
    if (!input || !input.files || !input.files[0]) { if (preview) preview.style.display = 'none'; if (img) img.removeAttribute('src'); return; }
    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      Toast.show('That file is not a photo. Choose a picture (JPEG or PNG).', 'error', 4000);
      input.value = '';
      if (img) img.removeAttribute('src');
      if (preview) preview.style.display = 'none';
      return;
    }
    const reader = new FileReader();
    reader.onerror = function() {
      Toast.show('That photo could not be read. Try a different one.', 'error', 4000);
      input.value = '';
    };
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
        Toast.show('That photo could not be read. Try a different one.', 'error', 4000);
        input.value = '';
        if (img) img.removeAttribute('src');
        if (preview) preview.style.display = 'none';
      };
      probe.src = full;
    };
    reader.readAsDataURL(file);
  },

  _doAdd() {
    let firstBad = null;
    const nameEl = document.getElementById('mp-name');
    const nameErr = document.getElementById('mp-name-err');
    const ageEl = document.getElementById('mp-age');
    const ageErr = document.getElementById('mp-age-err');
    const lastSeenEl = document.getElementById('mp-lastseen');
    const lastSeenErr = document.getElementById('mp-lastseen-err');

    const name = (nameEl?.value || '').trim();
    if (!name) {
      if (nameErr) nameErr.textContent = 'Type their name. If you do not know it, write a short description like "Boy in red coat".';
      firstBad = firstBad || nameEl;
    } else { if (nameErr) nameErr.textContent = ''; }

    const ageRaw = (ageEl?.value || '').trim();
    if (ageRaw !== '') {
      const ageNum = Number(ageRaw);
      if (!Number.isInteger(ageNum) || ageNum < 0 || ageNum > 120) {
        if (ageErr) ageErr.textContent = 'Age must be a whole number from 0 to 120. Fix it or leave it empty.';
        firstBad = firstBad || ageEl;
      } else { if (ageErr) ageErr.textContent = ''; }
    } else { if (ageErr) ageErr.textContent = ''; }

    const lastSeen = (lastSeenEl?.value || '').trim();
    if (!lastSeen) {
      if (lastSeenErr) lastSeenErr.textContent = 'Type where they were last seen. Write "Not known" if you are not sure.';
      firstBad = firstBad || lastSeenEl;
    } else { if (lastSeenErr) lastSeenErr.textContent = ''; }

    if (firstBad) { try { firstBad.focus(); } catch (e) {} return false; }

    // Resolve photo — read from preview img src (already validated as data:image/ in _previewPhoto)
    let photoUrl = '';
    const previewImg = document.getElementById('mp-photo-img');
    const photoSrc = previewImg ? (previewImg.getAttribute('src') || '') : '';
    if (/^data:image\//i.test(photoSrc)) photoUrl = photoSrc;

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
        Toast.show('Could not save. This device is out of space for ARK. Delete old records or messages, then tap Save record again.', 'error', 8000);
        return false;
      }
      this.render();
      Toast.show('Record saved, but the photo was too big to keep. Print the flyer and attach a photo by hand.', 'warning', 7000);
      return true;
    }
    this.render();
    Toast.show('Record saved on this device. Tap Send to hub to tell people nearby.', 'success', 5000);
    return true;
  },

  async broadcast(i) {
    const p = this._list[i];
    if (!p) return;
    // A second tap while the first is still going out must not send the alert twice
    if (this._sending) { Toast.show('Still sending. Please wait a moment.', 'info', 3000); return; }
    // Already waiting in the outbox with nothing changed: sending again would post it twice later
    if (p.sentState === 'waiting' && p.sentMsgId && this._queuedIds()[p.sentMsgId] && !this._changedSinceSent(p)) {
      Toast.show('This is already waiting to send. It will go out when this device joins an ARK Hub.', 'info', 5000);
      return;
    }
    this._sending = true;
    try { await this._send(p); } finally { this._sending = false; }
  },

  // Ids of messages still waiting in the outbox
  _queuedIds() {
    const q = Store.get('msg_queue', []);
    const ids = {};
    if (Array.isArray(q)) q.forEach(m => { if (m && m.id) ids[m.id] = true; });
    return ids;
  },

  _changedSinceSent(p) {
    return !!(p.sentTs && p.updatedTs && String(p.updatedTs) > String(p.sentTs));
  },

  // Remember on the record whether it went out, so the card can say so
  _markSent(p, msgId, sent) {
    p.sentState = sent ? 'sent' : 'waiting';
    p.sentTs = new Date().toISOString();
    p.sentMsgId = msgId;
    try { Store.set('missing_persons', this._list); } catch (e) {}
    this.render();
  },

  async _send(p) {
    const status = p.status || 'Active Search';
    const active = status === 'Active Search';
    const when = p.ts && !isNaN(Date.parse(p.ts)) ? new Date(p.ts).toLocaleString() : '';
    // A found person must never go out as a fresh "missing" alert
    const body = active
      ? `🚨 MISSING PERSON ALERT: ${p.name||'Unknown'}${p.age != null && String(p.age) !== '' ? ', Age: ' + p.age : ''}, Last seen: ${p.lastSeen||'unknown location'}${p.lastSeenTime ? ' at ' + p.lastSeenTime : ''}. ${p.description ? 'Description: ' + p.description + '.' : ''} ${p.contactInfo ? 'Contact: ' + p.contactInfo + '.' : ''}${when ? ' Reported: ' + when : ''}`
      : `UPDATE on missing person report: ${p.name||'Unknown'} — ${status === 'Located' ? 'has been FOUND' : 'status is now: ' + status}.${p.updateNote ? ' ' + p.updateNote + '.' : ''}${p.contactInfo ? ' Contact: ' + p.contactInfo + '.' : ''}`;
    const msg = {
      id: 'local_mp_' + Date.now() + '_' + Math.random().toString(36).slice(2),
      alias: Store.get('last_alias', 'ARK User'),
      channel: 'missing',
      body: body.replace(/\s+/g, ' ').trim(),
      urgent: active,
      ts: new Date().toISOString()
    };
    const waiting = 'Not sent yet. It is saved and will go out when this device joins an ARK Hub.';
    // Save locally so the alert appears in the message board even when offline
    try { await DB.put('messages', msg); } catch (e) { console.warn('MissingPersons.broadcast: local save failed', e); }
    try {
      const sent = await Hub.post(msg);
      this._markSent(p, msg.id, sent);
      Toast.show(sent ? 'Sent to your ARK Hub. People connected to it can see it.' : waiting, sent ? 'success' : 'warning', 5000);
    } catch (e) {
      Toast.show(waiting, 'warning', 5000);
    }
    try { if (typeof Messages !== 'undefined') Messages.refresh(); } catch (e) {}
  },

  remove(i) {
    const rec = this._list[i];
    if (!rec) return;
    const name = rec.name || 'this person';
    Modal.confirm('Delete the record for ' + esc(name) + ' from this device? This cannot be undone.', () => {
      const idx = MissingPersons._list.indexOf(rec);
      if (idx === -1) return;
      MissingPersons._list.splice(idx, 1);
      if (!Store.set('missing_persons', MissingPersons._list)) { // not saved — put the record back (Store has told the user)
        MissingPersons._list.splice(idx, 0, rec);
        MissingPersons.render();
        return;
      }
      MissingPersons.render();
      Toast.show('Record deleted', 'info');
    }, 'Delete', 'Keep');
  },

  updateStatus(id) {
    const p = this._list.find(x => x.id === id);
    if (!p) return;
    Modal.open(`
      <p class="font-sm text-secondary" style="margin:0 0 12px">Change the record for <strong>${esc(p.name||'Unknown')}</strong>. If you already sent this to a hub, send it again afterwards so others get the news.</p>
      <label class="form-label" for="mp-update-status">Status</label>
      <select id="mp-update-status" class="form-input w-full mb-12">${this._statusOptions(p.status || 'Active Search')}</select>
      <label class="form-label" for="mp-update-note">Note</label>
      <input type="text" id="mp-update-note" maxlength="200" class="form-input w-full mb-12" placeholder="e.g. Found safe at the community center" value="${esc(p.updateNote || '')}">
      <p class="font-xs text-muted" style="margin:0 0 8px">Fix a mistake or add what you have learned since:</p>
      <label class="form-label" for="mp-update-lastseen">Where they were last seen</label>
      <input type="text" id="mp-update-lastseen" maxlength="200" class="form-input w-full mb-12" value="${esc(p.lastSeen || '')}">
      <label class="form-label" for="mp-update-time">When they were last seen</label>
      <input type="text" id="mp-update-time" maxlength="50" class="form-input w-full mb-12" value="${esc(p.lastSeenTime || '')}">
      <label class="form-label" for="mp-update-description">What they look like and what they were wearing</label>
      <textarea id="mp-update-description" maxlength="300" class="form-input w-full mb-12" style="min-height:60px">${esc(p.description || '')}</textarea>
      <label class="form-label" for="mp-update-contact">How to reach you if they are found</label>
      <input type="text" id="mp-update-contact" maxlength="150" class="form-input w-full" value="${esc(p.contactInfo || '')}" style="margin-bottom:16px">
      <div class="flex gap-8 wrap" style="justify-content:flex-end">
        <button class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="if(MissingPersons._doUpdateStatus(${jsAttr(id)})!==false)Modal.close();">Save</button>
      </div>
    `, 'Update this record');
  },

  _doUpdateStatus(id) {
    const p = this._list.find(x => x.id === id);
    if (!p) return;
    const newStatus = document.getElementById('mp-update-status')?.value || p.status;
    const note = (document.getElementById('mp-update-note')?.value || '').trim();
    // Details can be corrected here too. A field that is missing from the form keeps its old value,
    // and "last seen" is never left empty.
    const field = (elId, old) => { const e = document.getElementById(elId); return e ? e.value.trim() : String(old || ''); };
    const details = {
      lastSeen: field('mp-update-lastseen', p.lastSeen) || String(p.lastSeen || ''),
      lastSeenTime: field('mp-update-time', p.lastSeenTime),
      description: field('mp-update-description', p.description),
      contactInfo: field('mp-update-contact', p.contactInfo)
    };
    const keys = ['status', 'updateNote', 'updatedTs', 'lastSeen', 'lastSeenTime', 'description', 'contactInfo'];
    const before = {};
    keys.forEach(k => { before[k] = p[k]; });
    const changed = (before.status || 'Active Search') !== newStatus || (before.updateNote || '') !== note ||
      Object.keys(details).some(k => String(before[k] || '') !== details[k]);
    // Nothing changed: leave the record (and its "updated" time) alone
    if (!changed) { Toast.show('Nothing was changed.', 'info'); return true; }
    p.status = newStatus;
    p.updateNote = note;
    Object.assign(p, details);
    p.updatedTs = new Date().toISOString();
    if (!Store.set('missing_persons', this._list)) {
      // Not saved (Store has told the user why): put the record back and keep the form open
      keys.forEach(k => { if (before[k] === undefined) delete p[k]; else p[k] = before[k]; });
      return false;
    }
    this.render();
    Toast.show('Saved: ' + (p.name || 'this person') + ' is now marked "' + this._statusLabel(newStatus) + '".' + (changed ? ' Tap ' + (newStatus === 'Active Search' ? 'Send to hub' : 'Send update') + ' on their record so others get the news.' : ''), 'success', 6000);
    return true;
  }
};

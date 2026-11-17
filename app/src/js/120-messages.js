// === MESSAGES ===
const Messages = {
  _channel: 'all',
  _searchTerm: '',
  _page: 0,
  _pageSize: 20,

  async post() {
    // Prevent double-send on rapid taps
    const postBtn = document.querySelector('button[onclick="Messages.post()"]');
    if (postBtn && postBtn.disabled) return;

    const alias = document.getElementById('msg-alias').value.trim() || 'Anonymous';
    const channel = document.getElementById('msg-channel').value;
    const body = document.getElementById('msg-text').value.trim();
    const location = document.getElementById('msg-location').value.trim();
    const urgent = document.getElementById('msg-urgent').checked;

    if (!body) { Toast.show('Type your message first, then press Post message', 'error'); return; }
    if (body.length < 3) { Toast.show('That message is too short. Add a few more words.', 'error'); return; }
    // Hard cap to prevent runaway pastes (HTML maxlength can be bypassed)
    if (body.length > 1000) { Toast.show('That message is too long. Shorten it to under 1000 letters.', 'error'); return; }

    BtnLoading.start(postBtn, 'Posting…');
    try {
      Store.set('last_alias', alias);
      const msg = {
        id: 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2),
        alias, channel, body, location, urgent,
        ts: new Date().toISOString()
      };

      // Save locally (with fallback warning if IDB is unavailable)
      const saved = await DB.put('messages', msg);
      if (saved === undefined) {
        // DB.put swallows IDB errors; warn but continue so the queue still carries it
        Toast.show('This device could not save the message. It will still be sent to the hub when one is in reach.', 'warning', 6000);
      }

      // Try to post to hub
      const sent = await Hub.post(msg);
      if (sent) Toast.show('Message posted. Everyone on this hub can see it.', 'success');
      else if (Hub.url && !Store.get('offline_mode', false)) Toast.show('Could not reach the hub. Your message is saved here and ARK will keep trying.', 'warning', 6000);
      else Toast.show('Saved on this device. It will send when you join a hub (Network tab).', 'info', 6000);

      const msgTextEl = document.getElementById('msg-text');
      if (msgTextEl) { msgTextEl.value = ''; msgTextEl.focus(); }
      const msgLocEl = document.getElementById('msg-location'); if (msgLocEl) msgLocEl.value = '';
      const msgUrgEl = document.getElementById('msg-urgent'); if (msgUrgEl) msgUrgEl.checked = false;
      this.refresh();
      // Scroll messages list to top so the new message is visible
      const listEl = document.getElementById('messages-list');
      if (listEl) listEl.scrollTop = 0;
    } finally {
      BtnLoading.stop(postBtn);
      // Re-sync disabled state after BtnLoading restores button (textarea is now empty)
      const ta = document.getElementById('msg-text');
      if (ta) this._onTextInput(ta);
    }
  },

  async postSafe() {
    const safeBtn = document.querySelector('button[onclick="Messages.postSafe()"]');
    if (safeBtn && safeBtn.disabled) return;
    const aliasEl = document.getElementById('msg-alias');
    const typed = aliasEl ? aliasEl.value.trim() : '';
    const remembered = String(Store.get('last_alias', '') || '');
    const alias = typed || (remembered && remembered !== 'Anonymous' ? remembered : '');
    // "Anonymous is safe" tells nobody anything. Ask for a name first.
    if (!alias) {
      Toast.show('Type your name first, so people know who is safe. Then press I\'m safe again.', 'warning', 6000);
      if (aliasEl) { aliasEl.scrollIntoView({ block: 'center' }); aliasEl.focus(); }
      return;
    }
    BtnLoading.start(safeBtn, 'Posting…');
    try {
      Store.set('last_alias', alias);
      const msg = {
        id: 'local_safe_' + Date.now() + '_' + Math.random().toString(36).slice(2),
        alias, channel: 'safe',
        body: alias + ' is safe. ' + new Date().toLocaleString(),
        location: '', urgent: false, ts: new Date().toISOString()
      };
      await DB.put('messages', msg);
      const sent = await Hub.post(msg);
      // Never tell someone their family has been told when nothing left this device.
      if (sent) Toast.show('Posted. Everyone on this hub can see that you are safe.', 'success', 4000);
      else Toast.show('Saved on this device only. Nobody else can see it yet. It will send when you join a hub.', 'warning', 7000);
      this.refresh();
    } finally {
      BtnLoading.stop(safeBtn);
    }
  },

  // Mark a locally written message as delivered so the "Pending sync" badge clears.
  async markSent(id) {
    try {
      if (id == null) return;
      const all = await DB.getAll('messages');
      const m = (all || []).find(x => x && x.id === id);
      if (m && !m.sent) { m.sent = true; await DB.put('messages', m); }
    } catch(e) {}
  },

  async refresh() {
    const all = ((await DB.getAll('messages')) || []).filter(m => m && typeof m === 'object');
    // A message with a missing or broken time must not scramble the order of the others.
    all.sort((a, b) => (Date.parse(b.ts) || 0) - (Date.parse(a.ts) || 0));

    // Update hero badge + btb badge with total message count
    const heroMsgs = document.getElementById('hero-msgs-badge');
    if (heroMsgs) heroMsgs.textContent = all.length + ' Message' + (all.length !== 1 ? 's' : '');
    // btb unread badge: messages not from self
    const myAlias = Store.get('last_alias', '');
    // The dot means "new since you last looked", so it goes away once the board has been opened.
    const others = all.filter(m => m.alias !== myAlias).length;
    const onBoard = typeof UI !== 'undefined' && UI.currentTab === 'messages';
    let seen = parseInt(Store.get('msgs_seen_n', 0), 10);
    if (isNaN(seen)) seen = 0;
    if (onBoard && seen !== others) Store.set('msgs_seen_n', others);
    const unread = Math.max(0, others - seen);
    const btbBadge = document.getElementById('btb-msg-badge');
    if (btbBadge) {
      const btn = btbBadge.closest('.btb-btn');
      if (unread > 0 && !onBoard) {
        if (btn) btn.classList.add('has-badge');
      } else {
        if (btn) btn.classList.remove('has-badge');
      }
    }

    let filtered = all;
    if (this._channel !== 'all') filtered = all.filter(m => m.channel === this._channel);
    if (this._searchTerm) {
      const q = this._searchTerm.toLowerCase();
      filtered = filtered.filter(m =>
        (m.body || '').toLowerCase().includes(q) ||
        (m.alias || '').toLowerCase().includes(q) ||
        (m.location || '').toLowerCase().includes(q) ||
        (m.channel || '').toLowerCase().includes(q)
      );
    }

    const page = filtered.slice(0, this._pageSize * (this._page + 1));
    const list = document.getElementById('messages-list');
    if (!list) return;

    // Show/hide load-more button
    const lmWrap = document.getElementById('load-more-wrap');
    if (lmWrap) lmWrap.style.display = filtered.length > page.length ? '' : 'none';

    if (!page.length) {
      // Messages exist but the chosen filter or search hides them all: say so, and offer the way back.
      if (all.length) {
        const stash = document.getElementById('msg-empty-state');
        if (stash) stash.style.display = 'none';
        list.querySelectorAll('.msg-item, .msg-none').forEach(n => n.remove());
        const none = document.createElement('div');
        none.className = 'msg-none text-secondary font-sm';
        none.style.padding = '16px 0';
        none.innerHTML = 'No messages match. <button class="btn btn-secondary btn-sm" onclick="Messages.showAll()">Show all messages</button>';
        list.appendChild(none);
        return;
      }
      // Show the rich empty state if present, else fallback text
      const emptyState = document.getElementById('msg-empty-state');
      if (emptyState) {
        list.innerHTML = '';
        list.appendChild(emptyState);
        emptyState.style.display = '';
      } else {
        list.innerHTML = '<div class="msg-none text-secondary font-sm" style="padding:16px 0;line-height:1.6">No messages yet. Write a short message above and press Post message. To see other people\'s messages, join an ARK Hub on the Network tab.</div>';
      }
      return;
    }

    // Hide the empty state if it was showing
    const emptyState = document.getElementById('msg-empty-state');
    if (emptyState) emptyState.style.display = 'none';

    list.innerHTML = page.map(m => {
      const ago = this.timeAgo(m.ts);
      const ch = m.channel || 'general';
      const chColors = {help:'red',safe:'green',offers:'blue',missing:'yellow',reunification:'yellow',general:'',resources:'blue',medical:'red',water:'blue',power:'yellow',shelter:'green'};
      const chLabel = {help:'Help',safe:'Safe',offers:'Offers',missing:'Missing',reunification:'Family',general:'General',resources:'Resources',medical:'Medical',water:'Water',power:'Power',shelter:'Shelter'};
      const cc = chColors[ch] || '';
      // Show delivery warning for locally-originated messages not yet confirmed by hub
      const isLocal = !m.sent && String(m.id || '').startsWith('local_');
      const deliveryWarn = isLocal ? '<span class="badge badge-yellow" title="Saved on this device. It will send when a hub is in reach.">Waiting to send</span>' : '';
      const acked = MsgAck.isAcked(m.id);
      const icon = n => `<svg class="hi" aria-hidden="true"><use href="#i-${n}"/></svg>`;
      return `<div class="msg-item ${m.urgent ? 'msg-urgent' : ''} ${acked ? 'msg-acked' : ''}">
        <div class="msg-header">
          <span class="msg-alias">${esc(m.alias || 'Anonymous')}</span>
          <span class="badge badge-${cc || 'orange'}">${chLabel[ch] || esc(ch)}</span>
          ${m.urgent ? '<span class="badge badge-red">Urgent</span>' : ''}
          ${deliveryWarn}
          <span class="msg-time">${ago}</span>
          ${m.location ? `<span class="font-xs text-muted">${icon('pin')} ${esc(m.location)}</span>` : ''}
        </div>
        <div class="msg-body">${esc(m.urgent ? String(m.body == null ? '' : m.body).replace(/^🚨 URGENT:\s*/, '') : (m.body == null ? '' : m.body))}</div>
        <div class="msg-actions">
          <button class="btn btn-ghost btn-sm ${acked ? 'msg-ack-active' : ''}" data-id="${esc(String(m.id))}" aria-pressed="${acked ? 'true' : 'false'}" onclick="MsgAck.toggle(this.dataset.id);Messages.refresh()" title="${acked ? 'Marked as read on this device. Tap to undo.' : 'Mark as read on this device. The sender is not told.'}">
            ${icon('check')}${acked ? 'Read' : 'Mark read'}
          </button>
          <button class="btn btn-ghost btn-sm" data-alias="${esc(String(m.alias||'Anonymous'))}" data-channel="${esc(String(m.channel||'general'))}" onclick="Messages.prefillReply(this.dataset.alias, this.dataset.channel)" title="Write a reply everyone can see">${icon('arrow-left')}Reply</button>
        </div>
      </div>`;
    }).join('');
  },

  // Clear the topic filter and any search so every message is listed again.
  showAll() {
    const inp = document.getElementById('msg-search-input');
    if (inp) inp.value = '';
    this._searchTerm = '';
    this.setChannel('all');
  },

  setChannel(ch) {
    this._channel = ch;
    this._page = 0;
    document.querySelectorAll('.ch-tab').forEach(t => {
      const isActive = t.dataset.ch === ch;
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    this.refresh();
  },

  search() {
    const bar = document.getElementById('msg-search-bar');
    if (!bar) return;
    const isHiding = !bar.classList.contains('hidden');
    bar.classList.toggle('hidden');
    const inp = document.getElementById('msg-search-input');
    if (isHiding) {
      // Closing the bar — clear any active search so results are not left filtered
      if (inp) inp.value = '';
      this._searchTerm = '';
      this.refresh();
    } else if (inp) {
      inp.focus();
    }
  },

  filterSearch() {
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => {
      const srchEl = document.getElementById('msg-search-input'); this._searchTerm = srchEl ? srchEl.value : '';
      this.refresh();
    }, 200);
  },

  loadMore() {
    this._page++;
    this.refresh();
  },

  async exportTxt() {
    try {
      const msgs = ((await DB.getAll('messages')) || []).filter(m => m && typeof m === 'object');
      if (!msgs.length) { Toast.show('There are no messages to save yet', 'info', 4000); return; }
      msgs.sort((a,b) => new Date(a.ts) - new Date(b.ts));
      const txt = msgs.map(m =>
        `[${m.ts}] [${m.channel}]${m.urgent?' [URGENT]':''} ${m.alias||'Anonymous'}: ${m.body}${m.location?' — '+m.location:''}`
      ).join('\n');
      download('ARK-messages-' + new Date().toISOString().slice(0,10) + '.txt', txt, 'text/plain');
      Toast.show('Messages saved as a text file in your downloads', 'success', 4000);
    } catch(e) {
      Toast.show('Could not save the messages file. Try again, or copy the messages you need by hand.', 'error', 6000);
    }
  },

  async exportBundle() {
    try {
      const msgs = ((await DB.getAll('messages')) || []).filter(m => m && typeof m === 'object');
      if (!msgs.length) { Toast.show('There are no messages to save yet', 'info', 4000); return; }
      const bundle = {protocol:'ARK-RELAY-1',exportedAt:new Date().toISOString(),packets:msgs};
      download('ARK-bundle-' + Date.now() + '.json', JSON.stringify(bundle,null,2), 'application/json');
      Toast.show('Saved ' + msgs.length + ' message' + (msgs.length !== 1 ? 's' : '') + ' to your downloads. Copy that file to a USB stick.', 'success', 6000);
    } catch(e) {
      Toast.show('Could not save the messages file. Free some space on this device and try again.', 'error', 6000);
    }
  },

  importBundleUI() {
    const area = document.getElementById('bundle-import-area');
    if (!area) return;
    area.classList.toggle('hidden');
    if (!area.classList.contains('hidden')) document.getElementById('bundle-paste')?.focus();
  },

  async importBundle() {
    const pasteEl = document.getElementById('bundle-paste');
    const txt = pasteEl ? pasteEl.value.trim() : '';
    if (!txt) {
      const fileEl = document.getElementById('bundle-file');
      if (fileEl) fileEl.click();
      else Toast.show('Paste the text of a messages file into the box first', 'warning', 5000);
      return;
    }
    let bundle;
    try { bundle = JSON.parse(txt); }
    catch(e) {
      Toast.show('That text is not an ARK messages file. Paste the whole file, from the first { to the last }.', 'error', 7000);
      return;
    }
    await this._applyBundle(bundle);
  },

  async handleBundleFile(input) {
    const file = input && input.files && input.files[0];
    if (!file) return;
    let bundle;
    try { bundle = JSON.parse(await file.text()); }
    catch(e) {
      Toast.show('That is not an ARK messages file. Choose the file named ARK-bundle that was saved from ARK.', 'error', 7000);
      return;
    }
    finally { try { input.value = ''; } catch(e) {} } // so the same file can be chosen again
    await this._applyBundle(bundle);
  },

  async _applyBundle(bundle) {
    const packets = Array.isArray(bundle) ? bundle : (bundle && Array.isArray(bundle.packets) ? bundle.packets : []);
    // Messages written on THIS device that are still waiting keep their "Waiting to send" mark.
    // Everything else in the file came from someone else and will not be sent from here.
    let waiting = Store.get('msg_queue', []);
    if (!Array.isArray(waiting)) waiting = [];
    const waitingIds = new Set(waiting.map(m => m && String(m.id)));
    let count = 0;
    for (const p of packets) {
      // Bundles come from other people's devices: store only known fields, coerced to safe types,
      // so one malformed packet can never break the message list.
      if (!p || typeof p !== 'object' || p.id == null) continue;
      const body = p.body != null ? p.body : p.text;
      if (body == null || body === '') continue;
      const ts = (typeof p.ts === 'string' && !isNaN(Date.parse(p.ts))) ? p.ts
               : (typeof p.issued_at === 'string' && !isNaN(Date.parse(p.issued_at))) ? p.issued_at
               : new Date().toISOString();
      await DB.put('messages', {
        id: String(p.id).slice(0, 200),
        alias: String(p.alias || 'Anonymous').slice(0, 80),
        channel: String(p.channel || 'general').slice(0, 40),
        body: String(body).slice(0, 4000),
        location: String(p.location || '').slice(0, 200),
        urgent: !!p.urgent,
        sent: !waitingIds.has(String(p.id).slice(0, 200)),
        ts
      });
      count++;
    }
    if (!count) {
      Toast.show('No messages were found in that file. Check it is the ARK-bundle file saved from ARK.', 'warning', 7000);
      return;
    }
    Toast.show(`Loaded ${count} message${count !== 1 ? 's' : ''}. They are now on the message board.`, 'success', 5000);
    const bpEl = document.getElementById('bundle-paste'); if (bpEl) bpEl.value = '';
    const biaEl = document.getElementById('bundle-import-area'); if (biaEl) biaEl.classList.add('hidden');
    this.refresh();
  },

  updateQueueBadge() {
    let q = Store.get('msg_queue', []);
    if (!Array.isArray(q)) q = [];
    const badge = document.getElementById('queue-badge');
    if (!badge) return;
    if (q.length > 0) {
      badge.textContent = q.length + ' waiting to send';
      badge.title = 'Saved on this device. ARK sends them when a hub is in reach.';
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  },

  timeAgo(iso) {
    if (!iso) return '';
    const m = Math.round((Date.now() - new Date(iso)) / 60000);
    if (isNaN(m)) return '';
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    if (m < 1440) return Math.round(m / 60) + ' hr ago';
    const d = Math.round(m / 1440);
    return d + (d === 1 ? ' day ago' : ' days ago');
  },

  prefillReply(toAlias, channel) {
    // Switch to correct channel and pre-fill alias reference in text
    const chEl = document.getElementById('msg-channel');
    if (chEl && channel) chEl.value = channel;
    const textEl = document.getElementById('msg-text');
    if (textEl) {
      // Keep anything already typed: put the name in front of it instead of wiping it.
      const draft = textEl.value.trim();
      const at = `@${toAlias} `;
      textEl.value = (draft && draft.indexOf(at.trim()) !== 0 ? at + draft : (draft ? draft + ' ' : at)).slice(0, 1000);
      this._onTextInput(textEl);
      textEl.focus();
      textEl.setSelectionRange(textEl.value.length, textEl.value.length);
    }
    // Scroll to the compose form
    document.getElementById('msg-alias')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  },

  _onTextInput(ta) {
    const len = (ta && ta.value) ? ta.value.length : 0;
    const counter = document.getElementById('msg-char-counter');
    if (counter) {
      counter.textContent = len + ' / 1000';
      counter.style.color = len > 900 ? 'var(--red)' : len > 700 ? 'var(--yellow)' : '';
    }
    const btn = document.getElementById('msg-post-btn');
    if (btn) btn.disabled = len < 1;
  },

  clearSearch() {
    const inp = document.getElementById('msg-search-input');
    if (inp) { inp.value = ''; inp.focus(); }
    this._searchTerm = '';
    this.refresh();
  }
};


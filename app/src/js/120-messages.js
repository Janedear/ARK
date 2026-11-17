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

    if (!body) { Toast.show('Please type a message before posting', 'error'); return; }
    if (body.length < 3) { Toast.show('Message is too short — add more detail', 'error'); return; }
    // Hard cap to prevent runaway pastes (HTML maxlength can be bypassed)
    if (body.length > 1000) { Toast.show('Message is too long — keep it under 1000 characters', 'error'); return; }

    BtnLoading.start(postBtn, '⏳ Posting…');
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
        Toast.show('⚠️ Local storage unavailable — message queued for hub only', 'warning', 5000);
      }

      // Try to post to hub
      const sent = await Hub.post(msg);
      if (sent) Toast.show('✅ Message posted — everyone on this hub can see it', 'success');
      else Toast.show('💾 Message saved on your device — will send when you connect to a hub', 'info', 5000);

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
    BtnLoading.start(safeBtn, '⏳ Posting…');
    try {
      const alias = document.getElementById('msg-alias').value.trim() ||
                    Store.get('last_alias', 'Anonymous');
      const msg = {
        id: 'local_safe_' + Date.now(),
        alias, channel: 'safe',
        body: alias + ' is safe. ' + new Date().toLocaleString(),
        urgent: false, ts: new Date().toISOString()
      };
      await DB.put('messages', msg);
      const sent = await Hub.post(msg);
      // Never tell someone their family has been told when nothing left this device.
      if (sent) Toast.show('✅ Safe status posted to the hub', 'success');
      else Toast.show('💾 Saved on this device only — it will send when you connect to a hub', 'warning', 6000);
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
    all.sort((a, b) => new Date(b.ts) - new Date(a.ts));

    // Update hero badge + btb badge with total message count
    const heroMsgs = document.getElementById('hero-msgs-badge');
    if (heroMsgs) heroMsgs.textContent = all.length + ' Message' + (all.length !== 1 ? 's' : '');
    // btb unread badge: messages not from self
    const myAlias = Store.get('last_alias', '');
    const unread = all.filter(m => m.alias !== myAlias).length;
    const btbBadge = document.getElementById('btb-msg-badge');
    if (btbBadge) {
      const btn = btbBadge.closest('.btb-btn');
      if (unread > 0 && UI && UI.currentTab !== 'messages') {
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
      // Show the rich empty state if present, else fallback text
      const emptyState = document.getElementById('msg-empty-state');
      if (emptyState) {
        list.innerHTML = '';
        list.appendChild(emptyState);
        emptyState.style.display = '';
      } else {
        list.innerHTML = '<div class="text-secondary font-sm" style="padding:16px 0">No messages yet. To post, type in the message box above and press Post Message. To receive community messages, connect to a hub on the Network tab and tap Sync Now.</div>';
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
      const chLabel = {help:'🆘 Help',safe:'✅ Safe',offers:'🤝 Offers',missing:'🔍 Missing',reunification:'👨‍👩‍👧 Reunification',general:'💬 General',resources:'📦 Resources',medical:'🏥 Medical',water:'💧 Water',power:'⚡ Power',shelter:'🏠 Shelter'};
      const cc = chColors[ch] || '';
      // Show delivery warning for locally-originated messages not yet confirmed by hub
      const isLocal = !m.sent && String(m.id || '').startsWith('local_');
      const deliveryWarn = isLocal ? '<span class="badge badge-yellow" title="Not yet confirmed by hub — will sync when hub is reachable">⏳ Pending sync</span>' : '';
      const acked = MsgAck.isAcked(m.id);
      const ackCount = MsgAck.getCount(m.id);
      return `<div class="msg-item ${m.urgent ? 'msg-urgent' : ''} ${acked ? 'msg-acked' : ''}">
        <div class="msg-header">
          <span class="msg-alias">${esc(m.alias || 'Anonymous')}</span>
          <span class="badge badge-${cc || 'orange'}">${chLabel[ch] || esc(ch)}</span>
          ${m.urgent ? '<span class="badge badge-red">🚨 URGENT</span>' : ''}
          ${deliveryWarn}
          <span class="msg-time">${ago}</span>
          ${m.location ? `<span class="font-xs text-muted">📍 ${esc(m.location)}</span>` : ''}
        </div>
        <div class="msg-body">${esc(m.body)}</div>
        <div class="msg-actions">
          <button class="btn btn-ghost btn-xs ${acked ? 'msg-ack-active' : ''}" data-id="${esc(String(m.id))}" onclick="MsgAck.toggle(this.dataset.id);Messages.refresh()" title="${acked ? 'Acknowledged — click to remove' : 'Acknowledge this message'}">
            ${acked ? '✅ Acked' : '👍 Ack'}${ackCount > 1 ? ` <span class="ack-count">${ackCount}</span>` : ''}
          </button>
          <button class="btn btn-ghost btn-xs" data-alias="${esc(String(m.alias||'Anonymous'))}" data-channel="${esc(String(m.channel||'general'))}" onclick="Messages.prefillReply(this.dataset.alias, this.dataset.channel)" title="Reply in channel">↩ Reply</button>
        </div>
      </div>`;
    }).join('');
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

  exportTxt() {
    DB.getAll('messages').then(msgs => {
      msgs.sort((a,b) => new Date(a.ts) - new Date(b.ts));
      const txt = msgs.map(m =>
        `[${m.ts}] [${m.channel}]${m.urgent?' [URGENT]':''} ${m.alias||'Anonymous'}: ${m.body}${m.location?' — '+m.location:''}`
      ).join('\n');
      download('ARK-messages-' + new Date().toISOString().slice(0,10) + '.txt', txt, 'text/plain');
      Toast.show('📄 Messages saved to your downloads', 'success');
    });
  },

  exportBundle() {
    DB.getAll('messages').then(msgs => {
      const bundle = {protocol:'ARK-RELAY-1',exportedAt:new Date().toISOString(),packets:msgs};
      download('ARK-bundle-' + Date.now() + '.json', JSON.stringify(bundle,null,2), 'application/json');
      Toast.show('📦 Message bundle saved — ready to share', 'success');
    });
  },

  importBundleUI() {
    const area = document.getElementById('bundle-import-area');
    if (area) area.classList.toggle('hidden');
  },

  async importBundle() {
    const txt = document.getElementById('bundle-paste').value.trim();
    if (!txt) {
      document.getElementById('bundle-file').click();
      return;
    }
    try {
      const bundle = JSON.parse(txt);
      await this._applyBundle(bundle);
    } catch(e) {
      Toast.show('That doesn\'t look like a valid message bundle — please try again', 'error');
    }
  },

  async handleBundleFile(input) {
    const file = input.files[0];
    if (!file) return;
    const txt = await file.text();
    try {
      const bundle = JSON.parse(txt);
      await this._applyBundle(bundle);
    } catch(e) {
      Toast.show('That file doesn\'t look right — please choose a valid ARK bundle', 'error');
    }
  },

  async _applyBundle(bundle) {
    const packets = bundle.packets || [];
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
        ts
      });
      count++;
    }
    Toast.show(`✅ Imported ${count} message${count !== 1 ? 's' : ''} from bundle`, 'success');
    const bpEl = document.getElementById('bundle-paste'); if (bpEl) bpEl.value = '';
    const biaEl = document.getElementById('bundle-import-area'); if (biaEl) biaEl.classList.add('hidden');
    this.refresh();
  },

  updateQueueBadge() {
    const q = Store.get('msg_queue', []);
    const badge = document.getElementById('queue-badge');
    if (!badge) return;
    if (q.length > 0) {
      badge.textContent = q.length + ' queued';
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  },

  timeAgo(iso) {
    if (!iso) return '';
    const m = Math.round((Date.now() - new Date(iso)) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + 'm ago';
    if (m < 1440) return Math.round(m / 60) + 'h ago';
    return Math.round(m / 1440) + 'd ago';
  },

  prefillReply(toAlias, channel) {
    // Switch to correct channel and pre-fill alias reference in text
    const chEl = document.getElementById('msg-channel');
    if (chEl && channel) chEl.value = channel;
    const textEl = document.getElementById('msg-text');
    if (textEl) {
      textEl.value = `@${toAlias} `;
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


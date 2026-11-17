// === HOME MESSAGE STATS ===
const HomeStats = {
  CHANNEL_LABELS: {help:'🆘 Help',safe:'✅ Safe',offers:'🤝 Offers',missing:'🔍 Missing',reunification:'👨‍👩‍👧 Reunif.',general:'💬 General',resources:'📦 Resources',medical:'🏥 Medical',water:'💧 Water',power:'⚡ Power',shelter:'🏠 Shelter'},
  render() {
    const el = document.getElementById('msg-stats-content');
    if (!el) return;
    DB.getAll('messages').then(msgs => {
      // Always keep hero badge in sync regardless of message count
      const heroMsgs = document.getElementById('hero-msgs-badge');
      const total = msgs ? msgs.length : 0;
      if (heroMsgs) heroMsgs.textContent = total + ' Message' + (total !== 1 ? 's' : '');

      if (!msgs || !msgs.length) {
        el.innerHTML = '<div class="font-xs text-muted" style="padding:4px 0">No messages yet. <button class="btn btn-ghost btn-xs" onclick="UI.switchTab(\'messages\')">Post first message →</button></div>';
        return;
      }
      // Count by channel; find urgents
      const counts = {};
      let urgent = 0;
      msgs.forEach(m => {
        if (!m) return;
        const ch = String(m.channel || 'general');
        counts[ch] = (counts[ch] || 0) + 1;
        if (m.urgent) urgent++;
      });
      // Render chips
      let html = `<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">`;
      html += `<span style="font-size:12px;color:var(--text-secondary);margin-right:4px"><strong>${total}</strong> message${total!==1?'s':''}</span>`;
      if (urgent) html += `<span style="background:rgba(220,60,60,0.15);color:var(--red);padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700">🚨 ${urgent} urgent</span>`;
      // Top channels (max 4)
      const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,4);
      sorted.forEach(([ch, n]) => {
        // Channel names arrive from hubs and imported bundles — never trust them as HTML or script.
        const lbl = this.CHANNEL_LABELS[ch] || esc(ch);
        html += `<button class="btn btn-ghost btn-xs" data-ch="${esc(ch)}" onclick="UI.switchTab('messages');Messages.setChannel(this.dataset.ch)" style="font-size:11px;padding:2px 8px">${lbl} <strong>${n}</strong></button>`;
      });
      html += `</div>`;
      el.innerHTML = html;
    }).catch(() => {
      el.innerHTML = '<div class="font-xs text-muted">Could not load stats.</div>';
    });
  }
};


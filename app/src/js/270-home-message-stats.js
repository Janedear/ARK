// === HOME MESSAGE STATS ===
const HomeStats = {
  CHANNEL_LABELS: {help:'Help',safe:'Safe',offers:'Offers',missing:'Missing',reunification:'Reunite',general:'General',resources:'Resources',medical:'Medical',water:'Water',power:'Power',shelter:'Shelter'},
  render() {
    const el = document.getElementById('msg-stats-content');
    if (!el) return;
    // Promise.resolve().then(...) so a storage fault becomes the friendly message below, never an uncaught error.
    Promise.resolve().then(() => DB.getAll('messages')).then(msgs => {
      // Always keep hero badge in sync regardless of message count
      const heroMsgs = document.getElementById('hero-msgs-badge');
      const total = Array.isArray(msgs) ? msgs.length : 0;
      if (heroMsgs) heroMsgs.textContent = total + ' Message' + (total !== 1 ? 's' : '');

      if (!total) {
        el._lastHtml = '';
        el.innerHTML = '<div class="font-sm text-muted flex gap-8 wrap" style="align-items:center">No messages yet. <button class="btn btn-secondary btn-sm" onclick="UI.switchTab(\'messages\')">Write the first message</button></div>';
        return;
      }
      // Count by channel; find urgents
      const counts = Object.create(null); // no inherited keys, whatever a channel is called
      let urgent = 0;
      msgs.forEach(m => {
        if (!m) return;
        const ch = String(m.channel || 'general');
        counts[ch] = (counts[ch] || 0) + 1;
        if (m.urgent) urgent++;
      });
      // Render chips
      let html = `<div class="flex gap-8 wrap" style="align-items:center">`;
      html += `<span class="font-sm text-secondary"><strong>${total}</strong> message${total!==1?'s':''}</span>`;
      if (urgent) html += `<span class="badge badge-red">${urgent} urgent</span>`;
      // Top channels (max 4)
      const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,4);
      sorted.forEach(([ch, n]) => {
        // Channel names arrive from hubs and imported bundles — never trust them as HTML or script.
        const lbl = Object.prototype.hasOwnProperty.call(this.CHANNEL_LABELS, ch) ? this.CHANNEL_LABELS[ch] : esc(ch);
        html += `<button class="btn btn-secondary btn-sm" data-ch="${esc(ch)}" aria-label="Show ${esc(lbl)} messages, ${n}" onclick="UI.switchTab('messages');Messages.setChannel(this.dataset.ch)">${lbl} <strong>${n}</strong></button>`;
      });
      html += `</div>`;
      // This runs every 30 seconds. Only redraw when something changed, so a button
      // being tapped or holding keyboard focus is not replaced under the person's finger.
      if (el._lastHtml === html && el.firstElementChild) return;
      el._lastHtml = html;
      el.innerHTML = html;
    }).catch(() => {
      el._lastHtml = '';
      el.innerHTML = '<div class="font-sm text-muted flex gap-8 wrap" style="align-items:center">Could not count your messages. <button class="btn btn-secondary btn-sm" onclick="UI.switchTab(\'messages\')">Open Messages</button></div>';
    });
  }
};


// === GUIDES ===
const Guides = {
  _inited: false,
  _cat: 'all',
  _bookmarks: null,

  _icon(name) {
    return `<svg class="hi" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  },

  _loadBookmarks() {
    if (!this._bookmarks) {
      const saved = Store.get('guide_bookmarks', []);
      this._bookmarks = Array.isArray(saved) ? saved : [];
    }
    return this._bookmarks;
  },

  _saveBookmarks() {
    Store.set('guide_bookmarks', this._bookmarks);
  },

  isBookmarked(slug) {
    return this._loadBookmarks().includes(slug);
  },

  toggleBookmark(slug) {
    const bm = this._loadBookmarks();
    const idx = bm.indexOf(slug);
    if (idx === -1) bm.push(slug);
    else bm.splice(idx, 1);
    this._saveBookmarks();
    this.render();
    Toast.show(idx === -1 ? 'Guide saved. Find it under "Saved".' : 'Removed from your saved guides', 'info', 2500);
  },

  printGuide(slug) {
    const g = ARK_GUIDES.find(x => x.slug === slug);
    if (!g) return;
    const steps = g.quickSteps.map(s => `<li>${esc(s)}</li>`).join('');
    const sections = (g.sections||[]).map(s => `<h4>${esc(s.heading)}</h4>${s.body.map(p=>`<p>${esc(p)}</p>`).join('')}`).join('');
    const sources = g.sources ? `<p><small>Sources: ${g.sources.map(s=>esc(s.url?`${s.label} (${s.url})`:s.label)).join(' · ')}</small></p>` : '';
    const docHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(g.title)}</title><style>body{font-family:sans-serif;max-width:600px;margin:40px auto;padding:0 16px;line-height:1.6;color:#111}h1{font-size:1.3rem}h4{margin-top:1rem}li{margin-bottom:.4rem}</style></head><body><h1>${esc(g.title)}</h1><p><em>${esc(g.summary)}</em></p><h3>Do these first:</h3><ol>${steps}</ol>${sections}${sources}<p><small>Printed from ARK${g.updated ? ' · guide last updated ' + esc(g.updated) : ''}. ARK is a guide, not an emergency service. If you can reach 911, call.</small></p></body></html>`;
    let w = null;
    try { w = window.open('','_blank','width=700,height=900'); } catch (e) { w = null; }
    if (!w) { printInPage(docHtml); return; }
    try {
      w.document.write(docHtml);
      w.document.close();
      printOnce(w);
    } catch (e) {
      try { w.close(); } catch (e2) {}
      printInPage(docHtml);
    }
  },

  shareGuide(slug) {
    const g = ARK_GUIDES.find(x => x.slug === slug);
    if (!g) return;
    const text = `📚 ARK Guide: ${g.title}\n${g.summary}\n\nKey steps:\n${g.quickSteps.map((s,i)=>`${i+1}. ${s}`).join('\n')}`;
    const showText = () => Modal.open(`<p class="font-sm text-secondary mb-8">Press and hold the text to copy it, then paste it into a message.</p><pre style="white-space:pre-wrap;font-size:13px;user-select:text;-webkit-user-select:text">${esc(text)}</pre><button class="btn btn-primary mt-8" onclick="Modal.close()">Close</button>`, 'Share this guide');
    const copy = () => {
      // navigator.clipboard does not exist on plain-http pages (e.g. a copy served by a local hub)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(()=>Toast.show('Guide copied. Paste it into a message.','success',3000)).catch(showText);
      } else showText();
    };
    if (navigator.share) {
      // AbortError = the person closed the share sheet; anything else = sharing failed, so fall back
      navigator.share({title: g.title, text}).catch(err => { if (!err || err.name !== 'AbortError') copy(); });
    } else copy();
  },

  _setCat(cat) {
    this._cat = cat;
    document.querySelectorAll('.guide-cat-btn').forEach(b => {
      const on = b.dataset.cat === cat;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  },

  init() {
    if (this._inited) return;
    this._inited = true;
    // FIX: Do NOT call Radio.initPhonetic() here — that belongs only in Radio.init()
    this.render();
    // Category nav (the chips are spans, so give them keyboard support too)
    document.querySelectorAll('.guide-cat-btn').forEach(btn => {
      const pick = () => { this._setCat(btn.dataset.cat); this.render(); };
      btn.addEventListener('click', pick);
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); }
      });
    });
  },

  // Show every guide again (used by the "nothing found" message)
  showAll() {
    const searchEl = document.getElementById('guide-search');
    if (searchEl) searchEl.value = '';
    this._setCat('all');
    this.render();
  },

  render() {
    const q = ((document.getElementById('guide-search') || {}).value || '').trim();
    const container = document.getElementById('guides-container');
    if (!container) return;
    // Remember which guides are open so re-drawing the list does not close what someone is reading
    const openIds = Array.from(container.querySelectorAll('.guide-body.open')).map(b => b.parentElement && b.parentElement.id).filter(Boolean);
    let guides = ARK_GUIDES;
    if (this._cat === '__bookmarks__') {
      const bm = this._loadBookmarks();
      guides = guides.filter(g => bm.includes(g.slug));
    } else if (this._cat !== 'all') {
      guides = guides.filter(g => g.category === this._cat);
    }
    if (q) {
      // Every word typed must appear somewhere in the guide, in any order ("baby choking", "stop bleeding")
      const words = this._words(q);
      const hit = (g) => {
        const hay = [g.title, g.summary].concat(g.quickSteps || [], (g.sections || []).flatMap(s => [s.heading].concat(s.body || []))).join(' \n ').toLowerCase();
        // The guides say "infant" and "child"; people in a hurry type "baby" and "kid"
        // ...and "broken", "allergy", "heatstroke" where the guides say "fracture", "allergic", "heat"
        const also = { baby: 'infant', babies: 'infant', kid: 'child', kids: 'child', toddler: 'child', broken: 'fracture', broke: 'fracture', allergy: 'allerg', heatstroke: 'heat', choke: 'choking', choked: 'choking', burnt: 'burn', toilets: 'toilet' };
        return words.every(w => hay.includes(w) || (also[w] && hay.includes(also[w])));
      };
      const inGroup = guides.filter(hit);
      if (!inGroup.length && this._cat !== 'all') {
        // Nothing in this group: look in every guide instead of leaving the person at a dead end
        const everywhere = ARK_GUIDES.filter(hit);
        if (everywhere.length) { this._setCat('all'); guides = everywhere; }
        else guides = inGroup;
      } else guides = inGroup;
    }
    // Update count badge — show filtered count vs total
    const badge = document.getElementById('guide-count-badge');
    if (badge) {
      if (this._cat === 'all' && !q) {
        badge.textContent = `(${ARK_GUIDES.length} guides)`;
      } else {
        badge.textContent = `(${guides.length} of ${ARK_GUIDES.length})`;
      }
    }
    if (!guides.length) {
      let msg;
      if (this._cat === '__bookmarks__' && !q) msg = 'You have no saved guides yet. Open any guide and tap Save to keep it here.';
      else if (q) msg = `No guide matches "${esc(q)}"${this._cat !== 'all' ? ' in this group' : ''}. Try one simple word, like "burn" or "water".`;
      else msg = 'There are no guides in this group.';
      container.innerHTML = `<div class="text-secondary font-sm" style="padding:24px 0;text-align:center"><div class="mb-12">${msg}</div><button class="btn btn-secondary btn-sm" onclick="Guides.showAll()">Show all guides</button></div>`;
      return;
    }
    container.innerHTML = guides.map(g => this.renderGuide(g, q)).join('');
    // Re-open what was open; if a search finds exactly one guide, open it to save a tap
    const toOpen = openIds.slice();
    if (q && guides.length === 1) toOpen.push('guide-' + guides[0].slug);
    toOpen.forEach(id => this._setOpen(document.getElementById(id), true));
  },

  _setOpen(article, open) {
    if (!article) return;
    const body = article.querySelector('.guide-body');
    const toggle = article.querySelector('.guide-toggle');
    if (body) body.classList.toggle('open', open);
    if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    // Turn the arrow here too: older phone browsers ignore the stylesheet rule that does it
    const chev = article.querySelector('.guide-toggle-chevron');
    if (chev) chev.style.transform = open ? 'rotate(180deg)' : '';
  },

  _toggle(toggleEl) {
    const article = toggleEl.parentElement;
    const body = article && article.querySelector('.guide-body');
    if (!body) return;
    this._setOpen(article, !body.classList.contains('open'));
  },

  // The separate words of a search, lower-case
  _words(q) {
    return String(q || '').toLowerCase().split(/\s+/).filter(Boolean);
  },

  _highlight(text, q) {
    text = String(text ?? '');
    const words = this._words(q);
    if (!words.length) return esc(text);
    // Find matches in the plain text, then escape each piece, so a match can never land inside "&amp;"
    const safeQ = words.sort((a, b) => b.length - a.length).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    try {
      const re = new RegExp(safeQ, 'gi');
      let out = '', last = 0, m;
      while ((m = re.exec(text))) {
        if (!m[0]) break;
        out += esc(text.slice(last, m.index)) + '<mark class="guide-search-highlight">' + esc(m[0]) + '</mark>';
        last = m.index + m[0].length;
      }
      return out + esc(text.slice(last));
    } catch(e) { return esc(text); }
  },

  renderGuide(g, q) {
    const h = (t) => this._highlight(t, q);
    const steps = g.quickSteps.map(s => `<li>${h(s)}</li>`).join('');
    const sections = (g.sections || []).map(s =>
      `<div class="guide-section"><h4>${h(s.heading)}</h4>${s.body.map(p => `<p>${h(p)}</p>`).join('')}</div>`
    ).join('');
    const sources = g.sources ? `<div class="guide-sources">Sources (these links need internet): ${g.sources.map(s => s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a>` : esc(s.label)).join(' · ')}</div>` : '';
    const isBookmarked = this.isBookmarked(g.slug);
    const bmLabel = isBookmarked ? `${this._icon('check')} Saved` : `${this._icon('plus')} Save`;
    const bmClass = isBookmarked ? ' bookmarked' : '';
    const updated = g.updated ? `<span class="guide-updated">Updated: ${esc(g.updated)}</span>` : '';
    const seeAlso = (g.seeAlso && g.seeAlso.length) ? `<div class="guide-seealso">See also: ${g.seeAlso.map(s=>{const ref=ARK_GUIDES.find(x=>x.slug===s);return ref?`<a href="#" onclick="Guides._openBySlug(${jsAttr(s)});return false">${esc(ref.title)}</a>`:'';}).filter(Boolean).join(', ')}</div>` : '';
    return `<div class="guide-article" id="guide-${esc(g.slug)}">
      <div class="guide-toggle" onclick="Guides._toggle(this)" aria-expanded="false" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){this.click();event.preventDefault()}">
        <div style="flex:1;min-width:0">
          <div class="guide-meta-row">
            <span class="guide-title">${h(g.title)}</span>
            ${updated}
          </div>
          <div class="guide-summary">${h(g.summary)}</div>
        </div>
        <span class="guide-toggle-chevron" aria-hidden="true"><svg class="hi" aria-hidden="true" style="transform:rotate(90deg)"><use href="#i-chevron"/></svg></span>
      </div>
      <div class="guide-body">
        <div class="font-sm bold text-accent mt-8 mb-8">Do these first:</div>
        <ol class="guide-steps">${steps}</ol>
        ${sections}
        ${seeAlso}
        ${sources}
        <div class="guide-actions">
          <button class="btn btn-sm${bmClass}" onclick="Guides.toggleBookmark(${jsAttr(g.slug)})" aria-pressed="${isBookmarked ? 'true' : 'false'}" title="${isBookmarked ? 'Remove from your saved guides' : 'Save this guide so it is easy to find'}">${bmLabel}</button>
          <button class="btn btn-sm" onclick="Guides.printGuide(${jsAttr(g.slug)})" title="Print this guide">${this._icon('printer')} Print</button>
          <button class="btn btn-sm" onclick="Guides.shareGuide(${jsAttr(g.slug)})" title="Share this guide">${this._icon('share')} Share</button>
        </div>
      </div>
    </div>`;
  },

  _openBySlug(slug) {
    // Switch to All, then scroll and open the guide
    this._setCat('all');
    const searchEl = document.getElementById('guide-search');
    if (searchEl) searchEl.value = '';
    this.render();
    setTimeout(() => {
      const el = document.getElementById('guide-' + slug);
      if (el) {
        this._setOpen(el, true);
        try { el.scrollIntoView({behavior:'smooth', block:'start'}); } catch (e) { el.scrollIntoView(); }
        const toggle = el.querySelector('.guide-toggle');
        if (toggle) { try { toggle.focus({preventScroll:true}); } catch (e) {} }
      }
    }, 50);
  },

  search() {
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => this.render(), 200);
  }
};

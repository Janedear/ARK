// === GUIDES ===
const Guides = {
  _inited: false,
  _cat: 'all',
  _bookmarks: null,

  _loadBookmarks() {
    if (!this._bookmarks) this._bookmarks = Store.get('guide_bookmarks', []);
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
    Toast.show(idx === -1 ? '⭐ Guide bookmarked' : 'Bookmark removed', 'info', 2000);
  },

  printGuide(slug) {
    const g = ARK_GUIDES.find(x => x.slug === slug);
    if (!g) return;
    const steps = g.quickSteps.map((s,i) => `<li>${i+1}. ${s}</li>`).join('');
    const sections = (g.sections||[]).map(s => `<h4>${s.heading}</h4>${s.body.map(p=>`<p>${p}</p>`).join('')}`).join('');
    const sources = g.sources ? `<p><small>Sources: ${g.sources.map(s=>s.url?`${s.label} (${s.url})`:s.label).join(' · ')}</small></p>` : '';
    const w = window.open('','_blank','width=700,height=900');
    if (!w) {
      printInPage(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${g.title}</title><style>body{font-family:sans-serif;max-width:600px;margin:40px auto;line-height:1.6}h1{font-size:1.3rem}h4{margin-top:1rem}li{margin-bottom:.4rem}</style></head><body><h1>${g.title}</h1><p><em>${g.summary}</em></p><h3>Key steps:</h3><ol>${steps}</ol>${sections}${sources}</body></html>`);
      return;
    }
    w.document.write(`<!DOCTYPE html><html><head><title>${g.title}</title><style>body{font-family:sans-serif;max-width:600px;margin:40px auto;line-height:1.6}h1{font-size:1.3rem}h4{margin-top:1rem}li{margin-bottom:.4rem}@media print{}</style></head><body><h1>${g.title}</h1><p><em>${g.summary}</em></p><p><strong>Last updated:</strong> ${g.updated||'2024'}</p><h3>Key steps:</h3><ol>${steps}</ol>${sections}${sources}</body></html>`);
    w.document.close();
    w.print();
  },

  shareGuide(slug) {
    const g = ARK_GUIDES.find(x => x.slug === slug);
    if (!g) return;
    const text = `📚 ARK Guide: ${g.title}\n${g.summary}\n\nKey steps:\n${g.quickSteps.map((s,i)=>`${i+1}. ${s}`).join('\n')}`;
    if (navigator.share) {
      navigator.share({title: g.title, text}).catch(()=>{});
    } else {
      const showText = () => Modal.open(`<pre style="white-space:pre-wrap;font-size:12px">${esc(text)}</pre><button class="btn btn-primary mt-8" onclick="Modal.close()">Close</button>`, 'Share Guide');
      // navigator.clipboard does not exist on plain-http pages (e.g. a copy served by a local hub)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(()=>Toast.show('📋 Guide copied to clipboard','success',2500)).catch(showText);
      } else showText();
    }
  },

  init() {
    if (this._inited) return;
    this._inited = true;
    // FIX: Do NOT call Radio.initPhonetic() here — that belongs only in Radio.init()
    this.render();
    // Category nav
    document.querySelectorAll('.guide-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._cat = btn.dataset.cat;
        document.querySelectorAll('.guide-cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.render();
      });
    });
  },

  render() {
    const q = (document.getElementById('guide-search') || {}).value || '';
    const container = document.getElementById('guides-container');
    if (!container) return;
    let guides = ARK_GUIDES;
    if (this._cat === '__bookmarks__') {
      const bm = this._loadBookmarks();
      guides = guides.filter(g => bm.includes(g.slug));
    } else if (this._cat !== 'all') {
      guides = guides.filter(g => g.category === this._cat);
    }
    if (q) {
      const ql = q.toLowerCase();
      guides = guides.filter(g =>
        g.title.toLowerCase().includes(ql) ||
        g.summary.toLowerCase().includes(ql) ||
        (g.quickSteps||[]).some(s => s.toLowerCase().includes(ql)) ||
        (g.sections||[]).some(s => s.heading.toLowerCase().includes(ql) || s.body.some(b=>b.toLowerCase().includes(ql)))
      );
    }
    // Update count badge — show filtered count vs total
    const badge = document.getElementById('guide-count-badge');
    if (badge) {
      if (this._cat === 'all' && !q) {
        badge.textContent = `(${ARK_GUIDES.length} guides)`;
      } else {
        badge.textContent = `(${guides.length} of ${ARK_GUIDES.length} guides)`;
      }
    }
    if (!guides.length) {
      const msg = q ? 'No guides match your search.' : (this._cat === '__bookmarks__' ? 'No bookmarked guides yet. Click ⭐ on any guide to bookmark it.' : 'No guides in this category.');
      container.innerHTML = `<div class="text-secondary font-sm" style="padding:24px 0;text-align:center">${msg}</div>`;
      return;
    }
    container.innerHTML = guides.map(g => this.renderGuide(g, q)).join('');
  },

  _highlight(text, q) {
    const escaped = esc(text);
    if (!q) return escaped;
    const safeQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try {
      return escaped.replace(new RegExp('(' + safeQ + ')', 'gi'),
        '<mark class="guide-search-highlight">$1</mark>');
    } catch(e) { return escaped; }
  },

  renderGuide(g, q) {
    const h = (t) => this._highlight(t, q);
    const steps = g.quickSteps.map(s => `<li>${h(s)}</li>`).join('');
    const sections = (g.sections || []).map(s =>
      `<div class="guide-section"><h4>${h(s.heading)}</h4>${s.body.map(p => `<p>${h(p)}</p>`).join('')}</div>`
    ).join('');
    const sources = g.sources ? `<div class="guide-sources">Sources: ${g.sources.map(s => s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a>` : esc(s.label)).join(' · ')}</div>` : '';
    const isBookmarked = this.isBookmarked(g.slug);
    const bmLabel = isBookmarked ? '⭐ Bookmarked' : '☆ Bookmark';
    const bmClass = isBookmarked ? 'bookmarked' : '';
    const updated = g.updated ? `<span class="guide-updated">Updated: ${esc(g.updated)}</span>` : '';
    const seeAlso = (g.seeAlso && g.seeAlso.length) ? `<div class="guide-seealso">See also: ${g.seeAlso.map(s=>{const ref=ARK_GUIDES.find(x=>x.slug===s);return ref?`<a href="#" onclick="Guides._openBySlug('${esc(s)}');return false">${esc(ref.title)}</a>`:esc(s);}).join(', ')}</div>` : '';
    return `<div class="guide-article" id="guide-${esc(g.slug)}">
      <div class="guide-toggle" onclick="const b=this.parentElement.querySelector('.guide-body');b.classList.toggle('open');this.setAttribute('aria-expanded',b.classList.contains('open'))" aria-expanded="false" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){this.click();event.preventDefault()}">
        <div style="flex:1;min-width:0">
          <div class="guide-meta-row">
            <span class="guide-title">${h(g.title)}</span>
            <span class="guide-offline-badge">✓ Offline</span>
            ${updated}
          </div>
          <div class="guide-summary">${h(g.summary)}</div>
        </div>
        <span class="guide-toggle-chevron" aria-hidden="true">▾</span>
      </div>
      <div class="guide-body">
        <div class="font-sm bold text-accent mt-8 mb-8">Do these first:</div>
        <ol class="guide-steps">${steps}</ol>
        ${sections}
        ${seeAlso}
        ${sources}
        <div class="guide-actions">
          <button class="${bmClass}" onclick="Guides.toggleBookmark(${jsAttr(g.slug)})" title="Bookmark this guide">${bmLabel}</button>
          <button onclick="Guides.printGuide(${jsAttr(g.slug)})" title="Print this guide">🖨️ Print</button>
          <button onclick="Guides.shareGuide(${jsAttr(g.slug)})" title="Share this guide">📤 Share</button>
        </div>
      </div>
    </div>`;
  },

  _openBySlug(slug) {
    // Switch to All, then scroll and open the guide
    this._cat = 'all';
    document.querySelectorAll('.guide-cat-btn').forEach(b => b.classList.remove('active'));
    const allBtn = document.querySelector('.guide-cat-btn[data-cat="all"]');
    if (allBtn) allBtn.classList.add('active');
    const searchEl = document.getElementById('guide-search');
    if (searchEl) searchEl.value = '';
    this.render();
    setTimeout(() => {
      const el = document.getElementById('guide-' + slug);
      if (el) {
        el.scrollIntoView({behavior:'smooth', block:'start'});
        const body = el.querySelector('.guide-body');
        if (body && !body.classList.contains('open')) body.classList.add('open');
      }
    }, 50);
  },

  search() {
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => this.render(), 200);
  }
};


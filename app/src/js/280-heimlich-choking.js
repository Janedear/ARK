// === HEIMLICH (choking) ===
const Heimlich = {
  show(mode) {
    ['adult','infant','self'].forEach(m => {
      const el = document.getElementById('heimlich-' + m);
      if (el) el.style.display = m === mode ? '' : 'none';
      const btn = document.getElementById('heimlich-' + m + '-btn');
      if (!btn) return;
      if (m === mode) { btn.style.background = 'var(--accent)'; btn.style.color = '#000'; btn.style.fontWeight = '700'; btn.className = 'btn btn-sm'; }
      else { btn.style.background = ''; btn.style.color = ''; btn.style.fontWeight = ''; btn.className = 'btn btn-secondary btn-sm'; }
    });
  }
};


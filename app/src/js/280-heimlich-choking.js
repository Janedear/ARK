// === HEIMLICH (choking) ===
const Heimlich = {
  show(mode) {
    if (['adult','infant','self'].indexOf(mode) < 0) return;
    ['adult','infant','self'].forEach(m => {
      const el = document.getElementById('heimlich-' + m);
      if (el) el.style.display = m === mode ? '' : 'none';
      const btn = document.getElementById('heimlich-' + m + '-btn');
      if (!btn) return;
      btn.style.background = ''; btn.style.color = ''; btn.style.fontWeight = '';
      btn.className = m === mode ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
      btn.setAttribute('aria-pressed', m === mode ? 'true' : 'false');
    });
  }
};

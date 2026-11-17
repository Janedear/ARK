// === BUTTON LOADING STATE ===
// Disables a button and swaps its label while async work runs; stop() puts the original label back.
// The label is saved as markup, so a button that holds an icon gets its icon back afterwards.
const BtnLoading = {
  start(btn, label) {
    if (!btn || btn.dataset.loading === '1') return;
    btn.dataset.loading = '1';
    btn.dataset.label = btn.innerHTML;
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    btn.classList.add('is-loading');
    btn.textContent = label || 'Working…';
  },
  stop(btn) {
    if (!btn || btn.dataset.loading !== '1') return;
    btn.innerHTML = btn.dataset.label || '';
    btn.disabled = false;
    btn.removeAttribute('aria-busy');
    btn.classList.remove('is-loading');
    delete btn.dataset.loading;
    delete btn.dataset.label;
  },
  all(selector) { return Array.from(document.querySelectorAll(selector)); }
};


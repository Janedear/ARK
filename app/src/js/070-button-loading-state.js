// === BUTTON LOADING STATE ===
// Disables a button and swaps its label while async work runs; restore() puts the original label back.
const BtnLoading = {
  start(btn, label) {
    if (!btn || btn.dataset.loading === '1') return;
    btn.dataset.loading = '1';
    btn.dataset.label = btn.textContent;
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    btn.classList.add('is-loading');
    btn.textContent = label || '⏳ …';
  },
  stop(btn) {
    if (!btn || btn.dataset.loading !== '1') return;
    btn.textContent = btn.dataset.label;
    btn.disabled = false;
    btn.removeAttribute('aria-busy');
    btn.classList.remove('is-loading');
    delete btn.dataset.loading;
    delete btn.dataset.label;
  },
  all(selector) { return Array.from(document.querySelectorAll(selector)); }
};


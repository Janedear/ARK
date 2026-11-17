// === TOAST ===
const Toast = {
  _t: null,
  _types: ['success', 'error', 'info', 'warning'],
  show(msg, type='info', dur=3000) {
    const el = document.getElementById('toast');
    if (!el) return;
    if (!this._types.includes(type)) type = 'info';
    el.textContent = msg;
    el.className = 'show toast-' + type;
    clearTimeout(this._t);
    this._t = setTimeout(() => el.className = '', dur);
  }
};


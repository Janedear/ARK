// === TOAST ===
const Toast = {
  _t: null,
  _types: ['success', 'error', 'info', 'warning'],
  show(msg, type='info', dur=3000) {
    const el = document.getElementById('toast');
    if (!el) return;
    if (!this._types.includes(type)) type = 'info';
    dur = Number(dur) > 0 ? Number(dur) : 3000;
    // Problems must stay on screen long enough for a stressed person to read them.
    if (type === 'error' || type === 'warning') dur = Math.max(dur, 5000);
    if (!this._styled) {
      this._styled = true;
      // Sit above the welcome wizard, the share dialog and pop-ups (they are layered at 8000-9000),
      // otherwise "saved" and "copied" messages are hidden behind them. Long messages wrap.
      el.style.zIndex = '10000';
      el.style.whiteSpace = 'normal';
      el.style.textAlign = 'center';
      el.style.maxWidth = 'min(520px, calc(100vw - 24px))';
      el.style.width = 'max-content';
    }
    el.textContent = String(msg == null ? '' : msg);
    el.className = 'show toast-' + type;
    clearTimeout(this._t);
    this._t = setTimeout(() => el.className = '', dur);
  }
};


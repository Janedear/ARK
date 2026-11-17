// === MODAL ===
const Modal = {
  open(html, title = '') {
    const box = document.getElementById('ark-modal-box');
    const overlay = document.getElementById('ark-modal');
    if (!box || !overlay) return;
    box.innerHTML = title ? `<div id="modal-title" class="mb-12" style="font-weight:800;font-size:1.1rem">${title}</div>${html}` : html;
    // Untitled dialogs have no #modal-title; fall back to a generic accessible name.
    if (title) { box.setAttribute('aria-labelledby', 'modal-title'); box.removeAttribute('aria-label'); }
    else { box.removeAttribute('aria-labelledby'); box.setAttribute('aria-label', 'Dialog'); }
    // Only remember the trigger when opening fresh; re-opening over an open modal keeps the original.
    if (overlay.classList.contains('hidden')) Modal._prevFocus = document.activeElement;
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    if (!Modal._trapBound) {
      overlay.addEventListener('keydown', Modal._onKeydown);
      Modal._trapBound = true;
    }
    setTimeout(() => {
      const first = box.querySelector(Modal._focusable);
      (first || box).focus();
    }, 50);
  },
  _focusable: 'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])',
  _onKeydown(e) {
    const overlay = document.getElementById('ark-modal');
    if (!overlay || overlay.classList.contains('hidden')) return;
    if (e.key === 'Escape') { e.preventDefault(); Modal._onYes = null; Modal.close(); return; }
    if (e.key !== 'Tab') return;
    const items = Array.from(document.getElementById('ark-modal-box').querySelectorAll(Modal._focusable))
      .filter(el => el.offsetParent !== null);
    if (!items.length) { e.preventDefault(); return; }
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  },
  close() {
    const overlay = document.getElementById('ark-modal');
    if (overlay) overlay.classList.add('hidden');
    document.body.style.overflow = '';
    const prev = Modal._prevFocus;
    Modal._prevFocus = null;
    if (prev && prev.isConnected && typeof prev.focus === 'function') prev.focus();
  },
  // msg may contain trusted markup; callers must esc() any user data inside it.
  // onYes is kept by reference (not stringified) so closures survive.
  confirm(msg, onYes, yesLabel = 'Confirm', noLabel = 'Cancel') {
    this._onYes = onYes;
    this.open(`
      <div style="color:var(--text-secondary);font-size:14px;line-height:1.6;margin-bottom:20px">${msg}</div>
      <div class="flex wrap" style="gap:10px">
        <button class="btn btn-primary" style="flex:1" onclick="Modal._confirmYes()">${esc(yesLabel)}</button>
        <button class="btn btn-secondary" style="flex:1" onclick="Modal._onYes=null;Modal.close()">${esc(noLabel)}</button>
      </div>`);
  },
  _confirmYes() {
    const fn = this._onYes;
    this._onYes = null;
    this.close();
    if (typeof fn !== 'function') return;
    try { fn(); } catch(e) { console.warn('Modal.confirm action:', e); Toast.show('That action failed — please try again', 'error'); }
  }
};


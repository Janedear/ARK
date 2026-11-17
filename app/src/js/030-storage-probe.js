// === STORAGE AVAILABILITY PROBE ===
// Private browsing (quota=0), disabled cookies, or sandboxed iframes make
// localStorage throw. Probe once; if it fails, Store uses an in-memory Map.
let _lsAvailable = false;
try { localStorage.setItem('__ark_test', '1'); localStorage.removeItem('__ark_test'); _lsAvailable = true; } catch(e) {}
if (!_lsAvailable) {
  document.addEventListener('DOMContentLoaded', () => {
    const b = document.getElementById('storage-unavailable-banner');
    if (b) b.classList.remove('hidden');
    try { Toast.show('This browser will not keep your information after you close ARK. Open ARK in a normal window, not a private one.', 'error', 9000); } catch (e) {}
  });
}

function _isQuotaError(e) {
  return !!e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014);
}


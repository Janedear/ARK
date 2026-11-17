// === STORAGE AVAILABILITY PROBE ===
// Private browsing (quota=0), disabled cookies, or sandboxed iframes make
// localStorage throw. Probe once; if it fails, Store uses an in-memory Map.
let _lsAvailable = false;
try { localStorage.setItem('__ark_test', '1'); localStorage.removeItem('__ark_test'); _lsAvailable = true; } catch(e) {}
if (!_lsAvailable) {
  document.addEventListener('DOMContentLoaded', () => {
    const b = document.getElementById('storage-unavailable-banner');
    if (b) b.classList.remove('hidden');
    Toast.show('⚠️ Storage unavailable — data won\'t persist between sessions', 'error', 6000);
  });
}

function _isQuotaError(e) {
  return !!e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014);
}


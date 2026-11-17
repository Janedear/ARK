// === GLOBAL ERROR BOUNDARY ===
// Catches uncaught exceptions and unhandled promise rejections so they produce
// a user-visible toast rather than dying silently in the console.
// At most one toast every 10 seconds: a fault inside a timer must not bury the screen in warnings.
let _arkLastErrorToast = 0;
function _arkErrorToast() {
  const now = Date.now();
  if (now - _arkLastErrorToast < 10000) return;
  _arkLastErrorToast = now;
  try { Toast.show('Something went wrong, but ARK is still running. Please try that again.', 'error', 6000); } catch(_) {}
}
window.addEventListener('unhandledrejection', e => {
  console.error('ARK unhandled rejection:', e.reason);
  // Avoid toast noise for intentional aborts (fetch AbortController)
  if (e.reason && e.reason.name === 'AbortError') return;
  _arkErrorToast();
});
window.onerror = (msg, src, line, col, err) => {
  console.error('ARK uncaught error:', msg, src, line, col, err);
  // Harmless browser notice, not a fault in ARK
  if (typeof msg === 'string' && msg.indexOf('ResizeObserver') !== -1) return false;
  _arkErrorToast();
  return false; // let the browser also log it
};


// === GLOBAL ERROR BOUNDARY ===
// Catches uncaught exceptions and unhandled promise rejections so they produce
// a user-visible toast rather than dying silently in the console.
window.addEventListener('unhandledrejection', e => {
  console.error('ARK unhandled rejection:', e.reason);
  // Avoid toast noise for intentional aborts (fetch AbortController)
  if (e.reason && e.reason.name === 'AbortError') return;
  try { Toast.show('An unexpected error occurred — the app is still running', 'error', 5000); } catch(_) {}
});
window.onerror = (msg, src, line, col, err) => {
  console.error('ARK uncaught error:', msg, src, line, col, err);
  try { Toast.show('An unexpected error occurred — the app is still running', 'error', 5000); } catch(_) {}
  return false; // let the browser also log it
};


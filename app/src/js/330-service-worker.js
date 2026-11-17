// === SERVICE WORKER ===
// Keeps ARK available offline when it is opened from the website. A copy opened from a saved
// file or from a local hub needs no service worker: it is already on the device / local network.
function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  if (!/^https?:$/.test(location.protocol)) return;
  navigator.serviceWorker.register('/service-worker.js', {scope: '/'})
    .then(reg => { try { reg.update(); } catch (e) {} })
    .catch(e => console.info('ARK offline cache not available here:', e && e.message));
}


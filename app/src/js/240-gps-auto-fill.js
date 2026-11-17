// === GPS AUTO-FILL ===
const GPS = {
  fillLocation(inputId, btn) {
    if (!navigator.geolocation) {
      Toast.show('GPS not available on this device', 'error');
      return;
    }
    const orig = btn ? btn.textContent : '';
    if (btn) { btn.textContent = '📍…'; btn.disabled = true; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude.toFixed(5);
        const lon = pos.coords.longitude.toFixed(5);
        const acc = Math.round(pos.coords.accuracy);
        const val = `${lat}, ${lon} (±${acc}m)`;
        const inp = document.getElementById(inputId);
        if (inp) { inp.value = val; inp.dispatchEvent(new Event('input')); }
        // Update status bar GPS dot
        const dot = document.getElementById('gps-dot');
        const st = document.getElementById('gps-status');
        if (dot) dot.className = 'status-dot dot-green';
        if (st) st.textContent = `GPS ±${acc}m`;
        if (btn) { btn.textContent = '✅'; btn.disabled = false; setTimeout(() => { btn.textContent = orig; }, 2000); }
        Toast.show(`📍 Location filled (±${acc}m accuracy)`, 'success');
      },
      err => {
        const msgs = { 1: 'Location access denied — allow in browser settings', 2: 'Position unavailable', 3: 'Location request timed out' };
        Toast.show(msgs[err.code] || 'GPS error', 'error');
        if (btn) { btn.textContent = orig; btn.disabled = false; }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }
};


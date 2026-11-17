// === GPS AUTO-FILL ===
const GPS = {
  fillLocation(inputId, btn) {
    if (!navigator.geolocation) {
      Toast.show('This device cannot find its location. Type where you are instead.', 'error', 5000);
      return;
    }
    // innerHTML, not textContent: the button may hold a line icon that must come back afterwards.
    const orig = btn ? btn.innerHTML : '';
    if (btn) { btn.textContent = 'Finding…'; btn.disabled = true; }
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
        if (btn) { btn.textContent = 'Done'; btn.disabled = false; setTimeout(() => { btn.innerHTML = orig; }, 2000); }
        Toast.show(`Your location was filled in (within ${acc} m)`, 'success');
      },
      err => {
        const msgs = {
          1: 'ARK is not allowed to see your location. Allow location for this page in your browser settings, or type where you are.',
          2: 'Your location could not be found. Go outside or near a window and try again, or type where you are.',
          3: 'Finding your location took too long. Try again, or type where you are.'
        };
        Toast.show(msgs[err && err.code] || 'Your location could not be found. Type where you are instead.', 'error', 7000);
        if (btn) { btn.innerHTML = orig; btn.disabled = false; }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }
};


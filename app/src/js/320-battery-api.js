// === BATTERY API ===
if ('getBattery' in navigator) {
  navigator.getBattery().then(batt => {
    let warned = false; // the low-battery tip is shown once, not on every 1% drop
    const update = () => {
      const pct = Math.round(batt.level * 100);
      const ch = batt.charging;
      const low = !ch && pct < 20;
      const item = document.getElementById('batt-item');
      const icon = document.getElementById('batt-icon');
      const level = document.getElementById('batt-level');
      if (item) item.style.display = 'flex';
      if (icon) {
        icon.innerHTML = '<svg class="hi" aria-hidden="true"><use href="#i-' + (ch ? 'bolt' : 'battery') + '"/></svg>';
        icon.style.color = low ? 'var(--red)' : '';
      }
      if (level) level.textContent = pct + '%';
      if (item) item.title = ch ? 'Battery ' + pct + '%, charging' : low ? 'Battery low: ' + pct + '%' : 'Battery ' + pct + '%';
      if (low && !warned && !Store.get('low_power', false)) {
        warned = true;
        try { Toast.show('Battery is low (' + pct + '%). To make it last longer, turn on Save battery in Settings.', 'warning', 8000); } catch (e) {}
      }
      if (!low) warned = false;
    };
    update();
    batt.addEventListener('levelchange', update);
    batt.addEventListener('chargingchange', update);
  }).catch(() => {});
}


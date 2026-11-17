// === BATTERY API ===
if ('getBattery' in navigator) {
  navigator.getBattery().then(batt => {
    const update = () => {
      const pct = Math.round(batt.level * 100);
      const ch = batt.charging;
      const item = document.getElementById('batt-item');
      const icon = document.getElementById('batt-icon');
      const level = document.getElementById('batt-level');
      if (item) item.style.display = 'flex';
      if (icon) icon.textContent = ch ? '🔌' : pct < 20 ? '🪫' : '🔋';
      if (level) level.textContent = pct + '%';
    };
    update();
    batt.addEventListener('levelchange', update);
    batt.addEventListener('chargingchange', update);
  }).catch(() => {});
}


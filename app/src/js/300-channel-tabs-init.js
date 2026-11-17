// === CHANNEL TABS INIT ===
document.querySelectorAll('.ch-tab').forEach(tab => {
  tab.addEventListener('click', () => Messages.setChannel(tab.dataset.ch));
});


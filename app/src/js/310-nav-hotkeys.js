// === NAV HOTKEYS ===
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
  // Don't fire tab hotkeys when a modal/dialog is open (focus is trapped there).
  // ARK uses a CSS .hidden class (not the HTML hidden attribute) on the outer overlay.
  const arkModal = document.getElementById('ark-modal');
  const shareModal = document.getElementById('share-modal');
  const onboard = document.getElementById('onboard-overlay'); // first-time setup covers the whole screen
  const modalOpen = (arkModal && !arkModal.classList.contains('hidden')) ||
                    (shareModal && !shareModal.classList.contains('hidden')) ||
                    (onboard && !onboard.classList.contains('hidden'));
  if (modalOpen) return;
  const tabs = ['home','messages','survival','resources','household','network','medical','map','radio','ai','settings'];
  if (!/^[0-9]$/.test(e.key)) return; // only the plain number keys
  const n = parseInt(e.key, 10);
  // Keys 1–9 → tabs[0]–tabs[8]; key 0 → tabs[9] (AI); settings (tabs[10]) has no single-digit hotkey.
  if (n >= 1 && n <= 9) UI.switchTab(tabs[n - 1]);
  else if (n === 0) UI.switchTab(tabs[9]);
});


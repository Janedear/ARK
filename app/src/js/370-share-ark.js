/* ============================================================
   SHARE ARK
   ============================================================ */
const ShareARK = (() => {

  function openModal() {
    try {
      const modal = document.getElementById('share-modal');
      if (modal) {
        if (modal.classList.contains('hidden')) ShareARK._prevFocus = document.activeElement;
        modal.classList.remove('hidden');
        if (!modal._a11yBound) {
          modal.addEventListener('keydown', e => {
            if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
            if (e.key !== 'Tab') return;
            const items = Array.from(modal.querySelectorAll('button:not([disabled]),input:not([disabled]),select,textarea,a[href],[tabindex]:not([tabindex="-1"])'))
              .filter(el => el.offsetParent !== null);
            if (!items.length) return;
            const first = items[0], last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
          });
          modal._a11yBound = true;
        }
        const box = modal.querySelector('.share-box');
        if (box) box.scrollTop = 0;
        setTimeout(() => {
          const first = modal.querySelector('button,input,select,textarea,[tabindex]');
          if (first) first.focus({ preventScroll: true });
        }, 50);
      }
    } catch (e) { console.warn('ShareARK.openModal error:', e); }
  }

  function closeModal() {
    try {
      const modal = document.getElementById('share-modal');
      if (modal) modal.classList.add('hidden');
      const prev = ShareARK._prevFocus;
      ShareARK._prevFocus = null;
      if (prev && prev.isConnected && typeof prev.focus === 'function') prev.focus();
    } catch (e) { console.warn('ShareARK.closeModal error:', e); }
  }

  let _saving = false; // re-entry guard for double-tap
  async function downloadFile() {
    if (_saving) return;
    _saving = true;
    Toast.show('Saving a copy of ARK…', 'info', 8000);
    try {
      const html = await _freshDownloadHTML();
      download('ARK-CRISIS-SUITE.html', html, 'text/html');
      Toast.show('A clean copy of ARK is saved. Look in your Downloads or Files, then send it to someone.', 'success', 6000);
    } catch (e) {
      Toast.show('Could not save a copy. Use your browser menu and choose "Save page" or "Download page" instead.', 'error', 7000);
      console.warn('ShareARK.downloadFile error:', e);
    } finally { _saving = false; }
  }

  // Copy text, falling back to selecting it on screen when the browser will not allow copying
  // (common when ARK is opened from a file or from a hub address).
  function _copy(text, okMsg, selectEl) {
    const fallback = () => {
      try {
        if (selectEl) {
          const range = document.createRange();
          range.selectNodeContents(selectEl);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          if (document.execCommand && document.execCommand('copy')) { Toast.show(okMsg, 'success', 3000); return; }
          Toast.show('The note is selected. Press and hold it, then choose Copy.', 'info', 5000);
          return;
        }
      } catch (e) {}
      Toast.show('Could not copy. Type the address yourself: arks.solutions', 'warning', 6000);
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => Toast.show(okMsg, 'success', 3000), fallback);
      } else fallback();
    } catch (e) { fallback(); }
  }

  function copyTemplate() {
    try {
      // The note shown on screen is the note that gets copied, so the two can never drift apart.
      const el = document.getElementById('share-template-text');
      const text = (el && el.textContent.trim()) || `I'm sending you ARK. It is a free emergency toolkit that works with no internet. Open the file in any web browser. Nothing to install. Keep it on your phone.`;
      _copy(text, 'Note copied. Paste it into your message.', el);
    } catch (e) {
      Toast.show('Could not copy. Press and hold the note, then choose Copy.', 'error', 5000);
      console.warn('ShareARK.copyTemplate error:', e);
    }
  }

  function generateQR() {
    const btn = document.querySelector('button[onclick*="ShareARK.generateQR("]');
    if (btn && btn.dataset.loading === '1') return;
    BtnLoading.start(btn, 'Making the code…');
    // Yield a frame so the loading label paints before the synchronous QR encode runs
    setTimeout(() => { try { renderQR(); } finally { BtnLoading.stop(btn); } }, 30);
  }

  function renderQR() {
    try {
      const hubUrl = Store.get('hub_url', '');
      const statusEl = document.getElementById('share-qr-status');
      const canvas = document.getElementById('share-qr-canvas');
      if (!hubUrl) {
        if (statusEl) statusEl.innerHTML = 'This device has not joined a hub yet, so there is nothing to scan. <button class="btn btn-secondary btn-sm mt-8" onclick="ShareARK.closeModal();UI.switchTab(\'network\')">Join a hub</button><br>With no hub, save a copy above and pass it phone to phone or by USB stick.';
        return;
      }
      const qrUrl = hubUrl.replace(/\/$/, '') + '/ARK-CRISIS-SUITE.html';
      // Real SVG QR code
      if (canvas) {
        // Replace canvas with SVG container
        canvas.style.display = 'none';
        let svgContainer = document.getElementById('share-qr-svg');
        if (!svgContainer) {
          svgContainer = document.createElement('div');
          svgContainer.id = 'share-qr-svg';
          svgContainer.style.cssText = 'text-align:center;margin-bottom:8px';
          canvas.parentNode.insertBefore(svgContainer, canvas);
        }
        svgContainer.innerHTML = Network.makeQRSVG ? Network.makeQRSVG(qrUrl) : ARKQr.toSVGDiv(qrUrl, 5);
      }
      if (statusEl) statusEl.innerHTML = 'Join the same Wi-Fi as the hub, then scan this code with a phone camera to get ARK.<br>Or type this address into a web browser: <code style="word-break:break-all">' + esc(qrUrl) + '</code>';
    } catch (e) {
      const statusEl = document.getElementById('share-qr-status');
      if (statusEl) statusEl.textContent = 'Could not make the code. Save a copy above and pass it phone to phone or by USB stick instead.';
      console.warn('ShareARK.generateQR error:', e);
    }
  }

  const ARK_DOWNLOAD_URL = 'https://arks.solutions/';
  const ARK_SHORT_MSG = 'I\'m sharing ARK with you. It is a free emergency toolkit. In a crisis, ARK makes its own internet from the devices around you, and it keeps working with no internet. Open it now and save it to your phone: ' + ARK_DOWNLOAD_URL;
  const ARK_EMAIL_SUBJECT = 'ARK: a free emergency toolkit that works with no internet';
  const ARK_EMAIL_BODY = `Hi,\n\nI wanted to share ARK with you. It is a free emergency toolkit. In a crisis, ARK makes its own internet from the devices around you: one laptop becomes the hub, nearby phones join it over Wi-Fi, and hubs pass messages on to each other. With no hub it still works on your own device: first aid guides, checklists and your family plan. No install or account needed. It opens in any web browser.\n\nOpen it here, then save it to your phone or computer so you have it offline: ${ARK_DOWNLOAD_URL}\n\nThe network is local and needs someone nearby to run the ARK Hub program on a laptop. ARK is not an emergency service, so call 911 or your local emergency number first if you can.\n\nStay safe.`;

  // The link needs the internet at the other end. Say so when this device already has none.
  const OFFLINE_LINK_NOTE = ' The link only opens once they have internet. With no internet, save a copy and pass the file on instead.';
  function _isOffline() { return typeof navigator !== 'undefined' && navigator.onLine === false; }

  function shareViaSMS() {
    try {
      // "sms:?&body=" is the one form that fills in the message on both iPhone and Android.
      const url = 'sms:?&body=' + encodeURIComponent(ARK_SHORT_MSG);
      window.open(url, '_self');
      if (_isOffline()) Toast.show('Opening your text messages.' + OFFLINE_LINK_NOTE, 'warning', 8000);
      else Toast.show('Opening your text messages…', 'info', 2500);
    } catch (e) {
      // Fallback: copy the message
      _copy(ARK_SHORT_MSG, 'Message copied. Paste it into a text message.', null);
    }
  }

  function shareViaEmail() {
    try {
      const url = 'mailto:?subject=' + encodeURIComponent(ARK_EMAIL_SUBJECT)
        + '&body=' + encodeURIComponent(ARK_EMAIL_BODY);
      window.open(url, '_self');
      if (_isOffline()) Toast.show('Opening your email.' + OFFLINE_LINK_NOTE, 'warning', 8000);
      else Toast.show('Opening your email…', 'info', 2500);
    } catch (e) {
      _copy(ARK_SHORT_MSG, 'Message copied. Paste it into an email.', null);
    }
  }

  function shareViaFacebook() {
    if (_isOffline()) { Toast.show('Facebook needs the internet, and this device has none right now. Save a copy and pass the file on instead.', 'warning', 7000); return; }
    try {
      const shareUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(ARK_DOWNLOAD_URL)
        + '&quote=' + encodeURIComponent('ARK is a free emergency toolkit. In a crisis, it makes its own internet from the devices around you. No install. Works with no internet.');
      window.open(shareUrl, '_blank', 'width=600,height=500,noopener,noreferrer');
    } catch (e) {
      Toast.show('Could not open Facebook. Share this address yourself: arks.solutions', 'error', 6000);
    }
  }

  function shareViaInstagram() {
    // Instagram has no web share URI. Best we can do: copy the message, then open Instagram.
    if (_isOffline()) { Toast.show('Instagram needs the internet, and this device has none right now. Save a copy and pass the file on instead.', 'warning', 7000); return; }
    try {
      const msg = 'ARK is a free emergency toolkit. In a crisis, it makes its own internet from the devices around you. No install, and it works with no internet. Get it before you need it: ' + ARK_DOWNLOAD_URL + ' #emergency #preparedness';
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(msg)
          .then(() => {
            Toast.show('Caption copied. Opening Instagram. Paste the caption into your post.', 'success', 5000);
            window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
          })
          .catch(() => {
            Toast.show('Opening Instagram. Add this address to your post: arks.solutions', 'info', 6000);
            window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
          });
      } else {
        window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
        Toast.show('Opening Instagram. Add this address to your post: arks.solutions', 'info', 6000);
      }
    } catch (e) {
      Toast.show('Open Instagram and share: ' + ARK_DOWNLOAD_URL, 'info', 5000);
    }
  }

  return { openModal, closeModal, downloadFile, copyTemplate, generateQR, shareViaSMS, shareViaEmail, shareViaFacebook, shareViaInstagram };
})();


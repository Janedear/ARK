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
        setTimeout(() => {
          const first = modal.querySelector('button,input,select,textarea,[tabindex]');
          if (first) first.focus();
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

  async function downloadFile() {
    try {
      const html = await _freshDownloadHTML();
      download('ARK-CRISIS-SUITE.html', html, 'text/html');
      Toast.show('ARK downloaded — recipient gets the setup wizard on first open!', 'success', 4000);
    } catch (e) {
      Toast.show('Download failed — try saving this page manually (Ctrl+S / ⌘+S)', 'error', 4000);
      console.warn('ShareARK.downloadFile error:', e);
    }
  }

  function copyTemplate() {
    try {
      const text = `I'm sending you ARK Crisis Suite — a free offline emergency communication app. Open the HTML file in any browser — no install needed. Works without internet. Use it to coordinate with neighbors during emergencies.`;
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(() => Toast.show('Message copied to clipboard!', 'success', 2500));
      } else {
        // Fallback: select the element text
        const el = document.getElementById('share-template-text');
        if (el) {
          const range = document.createRange();
          range.selectNodeContents(el);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
        Toast.show('Text selected — press Ctrl+C / ⌘+C to copy', 'info', 3000);
      }
    } catch (e) {
      Toast.show('Could not copy — select the text manually', 'error', 3000);
      console.warn('ShareARK.copyTemplate error:', e);
    }
  }

  function generateQR() {
    const btn = document.querySelector('button[onclick*="ShareARK.generateQR("]');
    if (btn && btn.dataset.loading === '1') return;
    BtnLoading.start(btn, '⏳ Generating…');
    // Yield a frame so the loading label paints before the synchronous QR encode runs
    setTimeout(() => { try { renderQR(); } finally { BtnLoading.stop(btn); } }, 30);
  }

  function renderQR() {
    try {
      const hubUrl = Store.get('hub_url', '');
      const statusEl = document.getElementById('share-qr-status');
      const canvas = document.getElementById('share-qr-canvas');
      if (!hubUrl) {
        if (statusEl) statusEl.textContent = 'No hub connected. Set a hub URL in Settings to generate a QR code for local distribution.';
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
      if (statusEl) statusEl.innerHTML = '📶 Hub URL: <code>' + esc(qrUrl) + '</code><br>Scan the QR code above to download ARK on another device.';
    } catch (e) {
      const statusEl = document.getElementById('share-qr-status');
      if (statusEl) statusEl.textContent = 'QR generation failed. Share the hub URL manually from Settings.';
      console.warn('ShareARK.generateQR error:', e);
    }
  }

  const ARK_DOWNLOAD_URL = 'https://arks.solutions/';
  const ARK_SHORT_MSG = 'I\'m sharing ARK with you — a free emergency app that keeps working when the internet is down. Open it now and save it to your phone: ' + ARK_DOWNLOAD_URL;
  const ARK_EMAIL_SUBJECT = 'ARK Crisis Suite — Free Offline Emergency App';
  const ARK_EMAIL_BODY = `Hi,\n\nI wanted to share ARK Crisis Suite with you — it's a free emergency app that keeps working when the internet is down. No install or account needed — it opens in any browser.\n\nOpen it here, then save it to your phone or computer so you have it offline: ${ARK_DOWNLOAD_URL}\n\nIt's useful for coordinating with neighbours and family during power outages, natural disasters, or any emergency where the internet is down.\n\nStay safe.`;

  function shareViaSMS() {
    try {
      // sms: URI — works on iOS and Android; body param prefilled
      const url = 'sms:?body=' + encodeURIComponent(ARK_SHORT_MSG);
      window.open(url, '_self');
      Toast.show('Opening Messages…', 'info', 2000);
    } catch (e) {
      // Fallback: copy the message
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(ARK_SHORT_MSG).then(() =>
          Toast.show('Message copied — paste it into your SMS app', 'success', 3500)
        );
      }
    }
  }

  function shareViaEmail() {
    try {
      const url = 'mailto:?subject=' + encodeURIComponent(ARK_EMAIL_SUBJECT)
        + '&body=' + encodeURIComponent(ARK_EMAIL_BODY);
      window.open(url, '_self');
      Toast.show('Opening email…', 'info', 2000);
    } catch (e) {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(ARK_SHORT_MSG).then(() =>
          Toast.show('Message copied — paste it into your email', 'success', 3500)
        );
      }
    }
  }

  function shareViaFacebook() {
    try {
      const shareUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(ARK_DOWNLOAD_URL)
        + '&quote=' + encodeURIComponent('ARK Crisis Suite — a free offline emergency app. No install. Works without internet.');
      window.open(shareUrl, '_blank', 'width=600,height=500,noopener,noreferrer');
    } catch (e) {
      Toast.show('Could not open Facebook — try sharing the link manually', 'error', 3000);
    }
  }

  function shareViaInstagram() {
    // Instagram has no web share URI. Best we can do: copy the message, then open Instagram.
    try {
      const msg = '🆘 ARK Crisis Suite — free offline emergency app. No install needed. Get it: ' + ARK_DOWNLOAD_URL + ' — works without internet, perfect for emergencies. Share this with everyone you know. #emergency #preparedness #offlinefirst';
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(msg)
          .then(() => {
            Toast.show('Caption copied! Opening Instagram…', 'success', 3000);
            window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
          })
          .catch(() => {
            Toast.show('Could not copy caption — open Instagram and paste manually', 'info', 4000);
            window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
          });
      } else {
        window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
        Toast.show('Open Instagram and paste your caption', 'info', 4000);
      }
    } catch (e) {
      Toast.show('Open Instagram and share: ' + ARK_DOWNLOAD_URL, 'info', 5000);
    }
  }

  return { openModal, closeModal, downloadFile, copyTemplate, generateQR, shareViaSMS, shareViaEmail, shareViaFacebook, shareViaInstagram };
})();


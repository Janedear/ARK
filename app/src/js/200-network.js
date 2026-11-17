// === NETWORK ===
const Network = {
  async connectHub() {
    const hubInputEl = document.getElementById('hub-url-input');
    let url = hubInputEl ? hubInputEl.value.trim() : '';
    if (!url) { Toast.show('Enter a hub address (e.g. 192.168.1.100:3000)', 'error'); return; }
    // Normalize: strip trailing slash, add http:// if scheme is missing
    url = url.replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(url)) url = 'http://' + url;
    if (hubInputEl) hubInputEl.value = url; // show normalized URL to user
    Store.set('hub_url', url);
    if (Hub.blockedBySecurePage()) { Hub.updateSyncDisplay(); Hub.explainSecurePage(); return; }
    SoftHub.yield_to_external(); // yield soft-hub role to the external hub
    // Keep Settings panel in sync
    const settingsEl = document.getElementById('set-hub-url');
    if (settingsEl) settingsEl.value = url;
    document.getElementById('hub-url-display') && (document.getElementById('hub-url-display').textContent = 'Hub: ' + url);
    Toast.show('Connecting to hub…', 'info');
    const btn = document.querySelector('button[onclick*="Network.connectHub("]');
    BtnLoading.start(btn, '⏳ Connecting…');
    try { await Hub.sync(true); } finally { BtnLoading.stop(btn); Hub.updateSyncDisplay(); }
  },

  async scanHub() {
    const btn = document.querySelector('button[onclick*="Network.scanHub("]');
    if (btn && btn.dataset.loading === '1') return;
    BtnLoading.start(btn, '⏳ Scanning…');
    try { await this._scanHub(); }
    catch (e) {
      console.warn('Network.scanHub error:', e);
      Toast.show('Hub scan failed — enter the hub URL manually above', 'error', 4000);
    }
    finally { BtnLoading.stop(btn); }
  },

  async _scanHub() {
    const results = document.getElementById('scan-results');
    if (location.protocol === 'https:') {
      if (results) results.innerHTML = '<div class="font-sm text-secondary">Auto-scan cannot work from a secure website. Join the hub\'s Wi-Fi and type the address shown on the hub\'s screen (for example <strong>http://10.42.0.1:8080</strong>) straight into your browser.</div>';
      return;
    }
    if (results) results.innerHTML = '<div class="font-sm text-secondary">🔍 Scanning for ARK hubs…</div>';

    const found = new Map(); // url → label

    // 1. mDNS scan via connected hub's /api/scan-local (hub does the LAN multicast)
    if (Hub.url) {
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 7000);
        try {
          const r = await fetch(Hub.url + '/api/scan-local', {signal: ctrl.signal});
          if (r.ok) {
            const data = await r.json();
            for (const h of (data.hubs || [])) found.set(h.url, h.name || h.url);
          }
        } finally { clearTimeout(tid); }
      } catch {}
    }

    // 2. Common IP sweep (parallel, 1.5 s timeout each)
    const common = ['10.42.0.1','192.168.1.1','192.168.0.1','192.168.4.1','172.16.0.1','10.0.0.1'];
    if (results) results.innerHTML = `<div class="font-sm text-secondary">🔍 Checking ${common.length} common hub addresses…</div>`;
    let checked = 0;
    await Promise.all(common.map(async ip => {
      const url = 'http://' + ip + ':8080';
      if (found.has(url)) { checked++; return; }
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 1500);
      try {
        const r = await fetch(url + '/api/status', {signal: ctrl.signal});
        if (r.ok) { const st = await r.json().catch(() => ({})); found.set(url, st.name || url); }
      } catch {}
      finally {
        clearTimeout(tid);
        checked++;
        if (results && found.size === 0) results.innerHTML = `<div class="font-sm text-secondary">🔍 Checked ${checked}/${common.length}…</div>`;
      }
    }));

    if (!results) return;
    if (found.size) {
      results.innerHTML = [...found.entries()].map(([u, label]) =>
        `<div class="font-sm mb-8"><span class="text-green">✓ </span><b>${esc(label)}</b> — <a href="#" class="text-accent" data-url="${esc(u)}" onclick="Network.useHub(this.dataset.url);return false">${esc(u)}</a></div>`
      ).join('');
    } else {
      results.innerHTML = '<div class="font-sm text-secondary">No hubs found. Enter the hub URL manually above.</div>';
    }
  },

  useHub(url) {
    const el = document.getElementById('hub-url-input'); if (el) el.value = url;
    this.connectHub();
  },

  generateHubQR() {
    const url = Store.get('hub_url', '');
    if (!url) { Toast.show('No hub URL yet — connect to a hub above first, then generate its QR code', 'warning', 4000); return; }
    const display = document.getElementById('qr-hub-display');
    const btn = document.querySelector('button[onclick*="Network.generateHubQR("]');
    if (btn && btn.dataset.loading === '1') return;
    BtnLoading.start(btn, '⏳ Generating…');
    // Yield a frame so the loading label paints before the synchronous QR encode runs
    setTimeout(() => {
      try {
        if (display) display.innerHTML = this.makeQRSVG(url);
      } catch (e) {
        console.warn('Network.generateHubQR error:', e);
        Toast.show('QR generation failed — share the hub URL as text instead', 'error', 4000);
      } finally {
        BtnLoading.stop(btn);
      }
    }, 30);
  },

  makeQRSVG(text) {
    // Real QR code generation using QR.js (embedded minimal implementation)
    try {
      const matrix = ARKQr.encode(text);
      const n = matrix.length;
      const cell = 6;
      const quiet = 4; // quiet zone in cells
      const total = (n + quiet * 2) * cell;
      let rects = '';
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (matrix[r][c]) {
            rects += `<rect x="${(c + quiet) * cell}" y="${(r + quiet) * cell}" width="${cell}" height="${cell}"/>`;
          }
        }
      }
      return `<div style="background:#fff;padding:10px;border-radius:6px;display:inline-block;text-align:center">
        <svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}" viewBox="0 0 ${total} ${total}" style="display:block">
          <rect width="${total}" height="${total}" fill="#fff"/>
          <g fill="#000">${rects}</g>
        </svg>
        <div style="font-size:10px;color:#333;margin-top:4px;max-width:${total}px;word-break:break-all;font-family:monospace">${esc(text)}</div>
      </div>`;
    } catch(e) {
      // Graceful fallback: show URL in a box if QR encoding fails
      return `<div style="background:#fff;padding:10px;border-radius:6px;display:inline-block;text-align:center">
        <div class="flex-center" style="width:128px;height:128px;background:#fff;border:2px solid #000;padding:8px">
          <div style="font-size:9px;color:#000;word-break:break-all;font-family:monospace">${esc(text)}</div>
        </div>
        <div style="font-size:10px;color:#333;margin-top:4px">Share this URL</div>
      </div>`;
    }
  },

  _qrScanTimer: null,

  async startQRScan() {
    const container = document.getElementById('qr-video-container');
    const video = document.getElementById('qr-video');
    if (!container || !video) return;

    // Check for BarcodeDetector support first
    const hasBarcodeDetector = typeof BarcodeDetector !== 'undefined';
    // Without a QR decoder (iPhone, Firefox) or camera access (plain-http pages) the camera could
    // never read a code — say so instead of running the camera for nothing.
    if (!hasBarcodeDetector || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      Toast.show('This browser cannot scan QR codes inside ARK. Use your phone\'s camera app to scan it, or type the hub address above.', 'warning', 7000);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({video: {facingMode: 'environment'}});
      video.srcObject = stream;
      container.classList.remove('hidden');

      if (hasBarcodeDetector) {
        // Use native BarcodeDetector for real QR decoding
        const detector = new BarcodeDetector({formats: ['qr_code']});
        const scanFrame = async () => {
          if (!video.srcObject) return; // stopped
          try {
            const codes = await detector.detect(video);
            if (codes.length > 0) {
              const rawValue = codes[0].rawValue;
              // Expect a URL — populate input and connect
              if (rawValue && (rawValue.startsWith('http://') || rawValue.startsWith('https://'))) {
                this.stopQRScan();
                const urlInput = document.getElementById('hub-url-input');
                if (urlInput) urlInput.value = rawValue;
                Toast.show('QR code scanned — tap Connect to join', 'success', 4000);
                return; // stop scanning
              }
            }
          } catch(e) {}
          this._qrScanTimer = setTimeout(scanFrame, 400);
        };
        video.addEventListener('loadedmetadata', () => { scanFrame(); }, {once: true});
        Toast.show('Camera started — point at a hub QR code', 'info');
      } else {
        // No BarcodeDetector — inform user it won't auto-read
        Toast.show('Camera started — your browser does not support QR decoding. Enter the address manually.', 'warning', 6000);
      }
    } catch(e) {
      Toast.show('Camera not available — ' + (e.name === 'NotAllowedError' ? 'camera permission denied' : e.message) + '. Enter the hub address manually.', 'error', 5000);
    }
  },

  stopQRScan() {
    if (this._qrScanTimer) { clearTimeout(this._qrScanTimer); this._qrScanTimer = null; }
    const video = document.getElementById('qr-video');
    const container = document.getElementById('qr-video-container');
    if (video && video.srcObject) {
      video.srcObject.getTracks().forEach(t => t.stop());
      video.srcObject = null;
    }
    if (container) container.classList.add('hidden');
  },

  // Plain-language steps for setting up a real hub (the only way to link different devices offline).
  showHubHelp() {
    Modal.open(
      '<p style="line-height:1.6;margin-bottom:10px">A phone or browser cannot be a hub by itself. One <strong>laptop or Raspberry Pi</strong> runs the free ARK Hub program, and every phone on the same Wi-Fi can then share messages — with no internet at all.</p>' +
      '<ol style="line-height:1.7;padding-left:20px;margin-bottom:12px">' +
      '<li><strong>Before an emergency</strong> (needs internet once): on the laptop, download the <strong>ARK Hub kit</strong> from <strong>arks.solutions/hub</strong> and unzip it.</li>' +
      '<li><strong>Start it:</strong> on Windows double-click <strong>start-hub.cmd</strong> in the hub folder. On Mac, Linux or Raspberry Pi run <strong>sh hub/start-hub.sh</strong>.</li>' +
      '<li>The hub window shows an address such as <strong>http://192.168.1.20:8080</strong>.</li>' +
      '<li><strong>Everyone else</strong> joins the same Wi-Fi (a router with no internet is fine) and types that address into their browser.</li>' +
      '</ol>' +
      '<p class="font-xs text-muted" style="line-height:1.5;margin-bottom:12px">Practise once while things are normal. The hub message board is public to everyone on that Wi-Fi.</p>' +
      '<button class="btn btn-primary" onclick="Modal.close()">Got it</button>',
      'How to set up a hub');
  },

  // === ONE-TAP SOFT HUB ===
  startSoftHub() {
    SoftHub.claimHubManually();
    this._updateHubDeployUI();
    // Detect IP then broadcast our hub address to any other open ARK tabs
    this.detectLocalIP().then(ip => {
      if (ip) {
        // Clear any stale QR so _updateHubDeployUI regenerates with the real IP
        const qrDeploy = document.getElementById('hub-deploy-qr');
        const qrShare2 = document.getElementById('qr-hub-display');
        if (qrDeploy) qrDeploy.innerHTML = '';
        if (qrShare2) qrShare2.innerHTML = '';
      }
      this._updateHubDeployUI();
      if (ip && SoftHub.startDiscovery) SoftHub.startDiscovery();
    });
  },

  stopSoftHub() {
    SoftHub.stop();
    this._updateHubDeployUI();
  },

  // Called from the auto-discovery "Join →" banner
  async joinFromBanner(hubUrl) {
    if (!hubUrl) return;
    Store.set('hub_url', hubUrl);
    Hub.updateSyncDisplay && Hub.updateSyncDisplay();
    SoftHub.yield_to_external && SoftHub.yield_to_external();
    Toast.show('🔗 Connecting to hub…', 'info', 3000);
    try { await Hub.sync(true); } catch(e) {}
    // Update the hub URL input if visible
    const urlInput = document.getElementById('hub-url-input');
    if (urlInput) urlInput.value = hubUrl;
    // Update Network tab display
    this._updateHubDeployUI();
    Hub.updateSyncDisplay && Hub.updateSyncDisplay();
  },

  _updateHubDeployUI() {
    const card    = document.getElementById('hub-deploy-card');
    const peer    = document.getElementById('hub-deploy-peer-state');
    const active  = document.getElementById('hub-deploy-active-state');
    const badge   = document.getElementById('hero-hub-badge');
    const homeStatus = document.getElementById('softhub-home-status');
    const qrShare = document.getElementById('hub-qr-share-card');

    // A browser tab cannot accept connections from other devices, so never present this device as a
    // hub with an address or QR code for neighbours — it would send them to an address that is not there.
    const isHub = false;
    if (card)   { card.classList.toggle('hub-is-active', isHub); }
    if (peer)   peer.style.display   = isHub ? 'none' : '';
    if (active) active.style.display = isHub ? ''     : 'none';
    if (badge)  { badge.style.display = isHub ? '' : 'none'; }
    if (homeStatus) {
      homeStatus.textContent = Hub.url ? '📡 Hub: ' + Hub.url : '📡 Not connected to a hub — messages stay on this device';
      homeStatus.style.color = Hub.url ? 'var(--accent)' : 'var(--text-muted)';
    }
    // Show QR share card when soft-hub OR connected to external hub
    const hasExternalHub = !!Hub.url;
    if (qrShare) qrShare.style.display = (isHub || hasExternalHub) ? '' : 'none';
    // Hide first-use tip once the user has taken any network action
    const tipEl = document.getElementById('network-first-use-tip');
    if (tipEl && (isHub || hasExternalHub)) tipEl.style.display = 'none';
    if (isHub) {
      const ipEl = document.getElementById('hub-ip-value');
      const ip = Store.get('softhub_detected_ip', '');
      if (ipEl) ipEl.textContent = ip || 'Detecting…';
      // Auto-generate QR if we have an IP
      if (ip) {
        const hubAddr = 'http://' + ip + ':8080';
        const qrDeploy = document.getElementById('hub-deploy-qr');
        if (qrDeploy && !qrDeploy.innerHTML) {
          try { qrDeploy.innerHTML = this.makeQRSVG(hubAddr); } catch(e) {}
        }
        // Also update the share card QR
        const qrShare2 = document.getElementById('qr-hub-display');
        if (qrShare2 && !qrShare2.querySelector('svg')) {
          try { qrShare2.innerHTML = this.makeQRSVG(hubAddr); } catch(e) {}
        }
      }
    } else if (hasExternalHub) {
      // For external hub: auto-populate share QR with the connected hub URL
      const qrShare2 = document.getElementById('qr-hub-display');
      if (qrShare2 && !qrShare2.querySelector('svg')) {
        try { qrShare2.innerHTML = this.makeQRSVG(Hub.url); } catch(e) {}
      }
    }
    // Update peer count badge
    const peerBadge = document.getElementById('hub-deploy-peer-count');
    if (peerBadge) {
      const n = SoftHub.peerCount();
      peerBadge.textContent = n + (n === 1 ? ' peer' : ' peers');
    }
  },

  async detectLocalIP() {
    // Use RTCPeerConnection trick to detect LAN IP
    return new Promise(resolve => {
      try {
        const pc = new RTCPeerConnection({iceServers: []});
        pc.createDataChannel('');
        pc.createOffer().then(o => pc.setLocalDescription(o));
        pc.onicecandidate = e => {
          if (!e || !e.candidate) { pc.close(); resolve(null); return; }
          const m = e.candidate.candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
          // Accept private-range IPs only (10.x, 172.16-31.x, 192.168.x, NOT 127.x or 169.254.x)
          if (m) {
            const ip = m[1];
            const isPrivate = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);
            if (isPrivate) {
              Store.set('softhub_detected_ip', ip);
              pc.close(); resolve(ip);
            }
          }
        };
        setTimeout(() => { pc.close(); resolve(null); }, 3000);
      } catch(e) { resolve(null); }
    });
  },

  copyHubIP() {
    const ip = Store.get('softhub_detected_ip', '');
    if (!ip) {
      Toast.show('IP not detected yet — make sure Wi-Fi is connected and try again', 'warning', 4000);
      return;
    }
    const addr = 'http://' + ip + ':8080';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(addr).then(() => Toast.show('Address copied: ' + addr, 'success', 3500));
    } else {
      // Fallback: select a temp input
      const t = document.createElement('textarea');
      t.value = addr; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); Toast.show('Address copied!', 'success'); } catch(e) {}
      document.body.removeChild(t);
    }
  },

  // === BUG REPORTING + AUTO-PATCH (hardened) ===
  PATCH_URL: 'https://arks.solutions/?patches',
  BUG_URL:   'https://arks.solutions/?bugs',
  _patchCheckInterval: null,
  _appliedPatchVersion: null, // patch applied in this page load (patches change the screen, not the file)

  // Current app version — bump this when deploying new HTML
  APP_VERSION: '1.2.0',

  _submitting: false, // in-flight guard

  async submitBugReport() {
    if (this._submitting) return; // prevent double-tap spam
    const textEl   = document.getElementById('bug-report-text');
    const statusEl = document.getElementById('bug-report-status');
    const btn      = document.querySelector('button[onclick*="submitBugReport"]');
    const text     = textEl ? textEl.value.trim() : '';
    if (!text) { Toast.show('Please describe the bug first', 'warning'); return; }
    this._submitting = true;

    // Collect useful but non-identifying diagnostic context
    const report = {
      schema: 1,
      ts: new Date().toISOString(),
      appVersion: this.APP_VERSION,
      patchLevel: Store.get('ark_patch_level', 'none'),
      // Where ARK is running — never the full address of a saved file, which would reveal folder and user names
      url: (/^https?:$/.test(location.protocol) ? location.origin + location.pathname : location.protocol).substring(0, 200),
      ua: navigator.userAgent.substring(0, 200), // cap UA length
      online: navigator.onLine,
      hubConnected: !!Hub.url,
      softHubRole: SoftHub.isHub() ? 'hub' : 'peer',
      activeTab: document.querySelector('.tab-panel.active') ? document.querySelector('.tab-panel.active').id : 'unknown',
      bug: text.substring(0, 2000), // cap report length
      // Last few console errors if captured
      recentErrors: (window._arkErrors || []).slice(-5)
    };

    BtnLoading.start(btn, '📤 Sending…');
    if (statusEl) statusEl.textContent = '📤 Submitting…';

    let sent = false;

    // 1. Try remote endpoint (internet)
    try {
      const r = await fetch(this.BUG_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(report),
        signal: timeoutSignal(8000)
      });
      if (r.ok || r.status === 201 || r.status === 204) { sent = true; }
    } catch(e) {}

    // 2. Queue locally for next-available send
    if (!sent) {
      try {
        const queue = JSON.parse(localStorage.getItem('ark_bug_queue') || '[]');
        queue.push(report);
        // Keep last 20 reports max
        if (queue.length > 20) queue.splice(0, queue.length - 20);
        localStorage.setItem('ark_bug_queue', JSON.stringify(queue));
      } catch(e) {}
    }

    BtnLoading.stop(btn);

    if (sent) {
      if (statusEl) statusEl.textContent = '✅ Sent! Thank you for the report.';
      if (textEl) textEl.value = '';
      Toast.show('Bug reported — we\'ll push a fix!', 'success', 5000);
    } else {
      // Fallback: pre-filled email — use capped report.bug (not raw text which may be huge)
      const body = encodeURIComponent(
        'ARK Bug Report\n' +
        '================\n' +
        'Issue: ' + report.bug + '\n\n' +
        'App: v' + this.APP_VERSION + '\n' +
        'Patch: ' + (Store.get('ark_patch_level','none')) + '\n' +
        'UA: ' + navigator.userAgent.substring(0, 150)
      );
      // Keep the text in the box: nothing has been sent yet.
      if (statusEl) {
        statusEl.textContent = '';
        statusEl.appendChild(document.createTextNode('💾 Saved on this device — it will be sent automatically next time ARK is online. Or '));
        const mail = document.createElement('a');
        mail.href = 'mailto:hello@halosuite.ai?subject=ARK%20Bug%20Report&body=' + body;
        mail.textContent = 'send it by email now';
        mail.style.color = 'var(--accent)';
        statusEl.appendChild(mail);
        statusEl.appendChild(document.createTextNode('.'));
      }
      Toast.show('Report saved — it will send when you are back online', 'info', 5000);
    }

    this._submitting = false;
    // Try to drain any queued reports if we're online
    if (navigator.onLine) this._drainBugQueue();
  },

  _draining: false, // concurrency guard

  // Silently drain queued bug reports when connection available
  async _drainBugQueue() {
    if (this._draining) return; // prevent concurrent drain loops
    this._draining = true;
    try {
      let queue;
      try {
        queue = JSON.parse(localStorage.getItem('ark_bug_queue') || '[]');
        if (!Array.isArray(queue)) throw new Error('not array');
      } catch(e) {
        // Corrupt queue — wipe it and bail
        localStorage.removeItem('ark_bug_queue');
        return;
      }
      if (!queue.length) return;
      const remaining = [];
      for (const report of queue) {
        try {
          const r = await fetch(this.BUG_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(report),
            signal: timeoutSignal(5000)
          });
          // 4xx means the server will never accept this report — drop it rather than retry forever.
          if (!r.ok && !(r.status >= 400 && r.status < 500 && r.status !== 429)) remaining.push(report);
        } catch(e) { remaining.push(report); break; } // stop on network error
      }
      localStorage.setItem('ark_bug_queue', JSON.stringify(remaining));
    } catch(e) {}
    finally { this._draining = false; }
  },

  // Semver compare: "1.2.3" > "1.1.0" => true
  _semverGt(a, b) {
    const pa = String(a).split('.').map(Number);
    const pb = String(b).split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      const ai = pa[i] || 0, bi = pb[i] || 0;
      if (ai > bi) return true;
      if (ai < bi) return false;
    }
    return false;
  },

  async checkForUpdates(silent = false) {
    const statusEl = document.getElementById('patch-status');
    const btn = document.querySelector('button[onclick*="checkForUpdates"]');
    if (!silent) { if (statusEl) statusEl.textContent = '🔍 Checking for updates…'; }
    if (btn && !silent) BtnLoading.start(btn, '🔍 Checking…');

    let patch = null;

    // Fixes come only from the official ARK site. A local hub is never trusted to change
    // what this app says — in a crisis, altered safety instructions could hurt someone.
    const sources = [this.PATCH_URL];

    for (const src of sources) {
      try {
        const r = await fetch(src + (src.indexOf('?') === -1 ? '?' : '&') + 'v=' + Date.now(), { // bust cache
          signal: timeoutSignal(6000),
          cache: 'no-store'
        });
        if (!r.ok) continue;
        const data = await r.json();
        // Validate structure
        if (data && typeof data.version === 'string') { patch = data; break; }
      } catch(e) {}
    }

    if (btn && !silent) BtnLoading.stop(btn);

    if (!patch) {
      if (!silent) {
        if (statusEl) statusEl.textContent = '📡 No update server reachable. ' + (navigator.onLine ? 'Try again later.' : 'You\'re offline.');
      }
      return false;
    }

    return this._applyPatch(patch, silent);
  },

  // Apply a patch object to the page. Patches change what is on screen, not the saved file, so
  // the latest one is remembered and re-applied each time ARK opens (even offline).
  _applyPatch(patch, silent = true) {
    const statusEl = document.getElementById('patch-status');
    const currentV = this.APP_VERSION;
    const hasOps = patch && typeof patch.version === 'string' && Array.isArray(patch.patches) && patch.patches.length > 0;

    if (!hasOps || !this._semverGt(patch.version, currentV)) {
      // Nothing newer than this copy of ARK: forget any remembered patch.
      Store.del('ark_patch_cache');
      if (!this._appliedPatchVersion) Store.del('ark_patch_level');
      if (!silent && statusEl) statusEl.textContent = '✅ Up to date — v' + (this._appliedPatchVersion || currentV) + '.';
      return false;
    }
    if (this._appliedPatchVersion && !this._semverGt(patch.version, this._appliedPatchVersion)) {
      if (!silent && statusEl) statusEl.textContent = '✅ Up to date — v' + this._appliedPatchVersion + '.';
      return false;
    }

    // === APPLY PATCHES ===
    // Security: validate each operation before executing. Patches may change wording, styling and
    // visibility only — never run code, insert HTML, or touch the user's saved data.
    const ALLOWED_ACTIONS = new Set(['replace_text','add_css','remove_element','show_element','hide_element','set_attr','remove_class','add_class']);
    let applied = 0, skipped = 0;
    const errors = [];

    // Validate patches is an array — a plain object or null would cause errors / silent skip
    const patchList = Array.isArray(patch.patches) ? patch.patches : [];
    for (const p of patchList) {
      if (!p || !ALLOWED_ACTIONS.has(p.action)) { skipped++; continue; }

      try {
        if (p.action === 'replace_text') {
          if (!p.selector || typeof p.value !== 'string') { skipped++; continue; }
          document.querySelectorAll(p.selector).forEach(el => { el.textContent = p.value; applied++; });
        }
        else if (p.action === 'replace_html') {
          if (!p.selector || typeof p.value !== 'string') { skipped++; continue; }
          // Sanitize patched HTML: strip scripts, event handlers, javascript: URIs, iframes
          const _sanitizePatchHtml = (html) => {
            const tpl = document.createElement('template');
            tpl.innerHTML = html
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')  // script blocks
              .replace(/<script[^>]*\/?>/gi, '');                  // self-closing or open script tags
            tpl.content.querySelectorAll('*').forEach(el => {
              [...el.attributes].forEach(attr => {
                if (/^on/i.test(attr.name) ||
                    /^javascript:/i.test(attr.value) ||
                    /^data:/i.test(attr.value)) {
                  el.removeAttribute(attr.name);
                }
              });
            });
            tpl.content.querySelectorAll('iframe,object,embed,script,base,link[rel=import]').forEach(el => el.remove());
            // Also strip svg <use> elements that can load external resources
            tpl.content.querySelectorAll('use').forEach(el => {
              if ((el.getAttribute('href') || el.getAttribute('xlink:href') || '').includes(':')) el.remove();
            });
            const div = document.createElement('div');
            div.appendChild(tpl.content.cloneNode(true));
            return div.innerHTML;
          };
          const safe = _sanitizePatchHtml(p.value);
          document.querySelectorAll(p.selector).forEach(el => { el.innerHTML = safe; applied++; });
        }
        else if (p.action === 'add_css') {
          if (typeof p.value !== 'string') { skipped++; continue; }
          // Block CSS constructs that can exfiltrate data or load remote resources:
          // @import, url(), expression() (IE), and javascript: in CSS values
          if (/@import|url\s*\(|expression\s*\(|javascript\s*:/i.test(p.value)) { skipped++; continue; }
          const style = document.createElement('style');
          style.id = 'ark-patch-css-' + (applied);
          style.dataset.patchVersion = patch.version;
          style.textContent = p.value;
          document.head.appendChild(style); applied++;
        }
        else if (p.action === 'store_set') {
          if (!p.key || typeof p.key !== 'string') { skipped++; continue; }
          // Only allow patching safe known keys — not hub_url, credentials etc
          // Prefix keys: ark_*, checklist_*, guide_* — exact keys: alert_level, hh_name, last_alias
          const SAFE_STORE_KEYS = /^(ark_|checklist_|guide_)[a-z0-9_-]+$|^(alert_level|hh_name|last_alias|custom_checklists)$/;
          if (!SAFE_STORE_KEYS.test(p.key)) { skipped++; continue; }
          // Only allow primitive values to prevent store corruption
          if (typeof p.value !== 'string' && typeof p.value !== 'number' && typeof p.value !== 'boolean') { skipped++; continue; }
          Store.set(p.key, p.value); applied++;
        }
        else if (p.action === 'remove_element') {
          if (!p.selector) { skipped++; continue; }
          document.querySelectorAll(p.selector).forEach(el => { el.remove(); applied++; });
        }
        else if (p.action === 'show_element') {
          if (!p.selector) { skipped++; continue; }
          document.querySelectorAll(p.selector).forEach(el => { el.style.display = ''; applied++; });
        }
        else if (p.action === 'hide_element') {
          if (!p.selector) { skipped++; continue; }
          document.querySelectorAll(p.selector).forEach(el => { el.style.display = 'none'; applied++; });
        }
        else if (p.action === 'add_class') {
          if (!p.selector || !p.value) { skipped++; continue; }
          document.querySelectorAll(p.selector).forEach(el => { el.classList.add(p.value); applied++; });
        }
        else if (p.action === 'remove_class') {
          if (!p.selector || !p.value) { skipped++; continue; }
          document.querySelectorAll(p.selector).forEach(el => { el.classList.remove(p.value); applied++; });
        }
        else if (p.action === 'set_attr') {
          if (!p.selector || !p.attr || typeof p.attr !== 'string') { skipped++; continue; }
          // Block dangerous attributes (event handlers, navigation, inline html, style injection)
          if (/^on/i.test(p.attr) ||
              /^(href|src|srcdoc|style|action|formaction|formmethod|xlink:href|data|xmlns)$/i.test(p.attr)) { skipped++; continue; }
          // Also block dangerous values regardless of attribute (javascript: and data: URIs)
          if (typeof p.value === 'string' && /^\s*(javascript|data|vbscript)\s*:/i.test(p.value)) { skipped++; continue; }
          document.querySelectorAll(p.selector).forEach(el => { el.setAttribute(p.attr, p.value || ''); applied++; });
        }
      } catch(e) {
        errors.push(p.action + ':' + (p.selector || ''));
        console.warn('[ARK patch error]', p, e);
      }
    }

    // Only persist patch level when at least one op was successfully applied
    if (applied > 0) {
      this._appliedPatchVersion = patch.version;
      Store.set('ark_patch_cache', { version: patch.version, summary: String(patch.summary || '').slice(0, 300), patches: patchList.slice(0, 200) });
      Store.set('ark_patch_level', patch.version);
      Store.set('ark_patch_ts', new Date().toISOString());
      Store.set('ark_patch_summary', patch.summary || '');
    }

    const summary = patch.summary || (applied + ' fix' + (applied !== 1 ? 'es' : '') + ' applied');

    if (applied > 0) {
      if (statusEl) statusEl.textContent = '✅ Patch v' + patch.version + ' — ' + summary + (skipped ? ' (' + skipped + ' skipped)' : '') + '.';
      if (!silent) {
        Toast.show('🔧 ARK patched to v' + patch.version + ': ' + summary, 'success', 7000);
      } else {
        // Silent patch: show a brief non-intrusive status bar indicator
        const sb = document.getElementById('status-bar');
        if (sb) {
          const patchNote = document.createElement('span');
          patchNote.id = 'ark-patch-note';
          patchNote.style.cssText = 'margin-left:8px;font-size:.7rem;color:var(--accent,#8b6f3e);font-weight:600';
          patchNote.textContent = '🔧 Patched v' + patch.version;
          sb.appendChild(patchNote);
          setTimeout(() => { patchNote.remove(); }, 10 * 60 * 1000); // remove after 10 min
        }
      }
      // Log for support
      console.info('[ARK] Patch', patch.version, 'applied:', applied, 'ops,', skipped, 'skipped,', errors.length, 'errors');
    } else if (skipped > 0) {
      if (!silent) {
        if (statusEl) statusEl.textContent = '⚠️ Patch available but could not apply (' + skipped + ' ops skipped).';
      }
    }

    return applied > 0;
  },

  // Auto-check for patches on startup (silent)
  async initPatchCheck() {
    // Re-apply the last official fix straight away, so it also holds when offline
    try {
      const cached = Store.get('ark_patch_cache', null);
      if (cached && typeof cached === 'object') this._applyPatch(cached, true);
    } catch (e) {}
    // Check after 10s on first load, then every 2 hours
    setTimeout(() => this.checkForUpdates(true), 10000);
    this._patchCheckInterval = setInterval(() => this.checkForUpdates(true), 2 * 60 * 60 * 1000);
    // Also drain any queued bug reports
    if (navigator.onLine) setTimeout(() => this._drainBugQueue(), 15000);
    // Listen for online event to drain queue
    window.addEventListener('online', () => this._drainBugQueue());
  }
};


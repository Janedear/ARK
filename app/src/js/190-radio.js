// === RADIO ===
const Radio = {
  _inited: false,
  _audioCtx: null,
  _morseTimeout: null,
  _morseEndTimer: null,

  init() {
    if (this._inited) return;
    this._inited = true;
    this.initPhonetic();
    this.initMorseChart();
  },

  initPhonetic() {
    const grid = document.getElementById('phonetic-grid');
    if (!grid) return;
    grid.innerHTML = PHONETIC.map(([l, w]) => `
      <div class="phonetic-item">
        <div class="phonetic-letter">${l}</div>
        <div class="phonetic-word">${w}</div>
      </div>
    `).join('');
  },

  initMorseChart() {
    const chart = document.getElementById('morse-chart');
    if (!chart) return;
    chart.innerHTML = Object.entries(MORSE).map(([c, m]) => `
      <div class="morse-item">
        <span class="morse-char">${c === ' ' ? 'SPC' : esc(c)}</span>
        <span class="morse-code">${esc(m)}</span>
      </div>
    `).join('');
  },

  _setMorsePlaying(active) {
    const btn = document.getElementById('morse-play-btn');
    const status = document.getElementById('morse-status');
    if (btn) {
      btn.textContent = active ? '⏸ Playing…' : '▶ Play';
      if (active) btn.classList.add('morse-playing');
      else btn.classList.remove('morse-playing');
    }
    if (status) status.style.display = active ? 'inline' : 'none';
  },

  updateEncodeOutput() {
    const rawInput = document.getElementById('morse-input');
    const out = document.getElementById('morse-encode-output');
    if (!rawInput || !out) return;
    const input = rawInput.value.trim().toUpperCase();
    if (!input) { out.style.display = 'none'; return; }
    const parts = [];
    for (const char of input) {
      if (char === ' ') { parts.push('/'); continue; }
      const code = MORSE[char];
      if (code) parts.push(code); else parts.push('?');
    }
    out.textContent = parts.join(' ');
    out.style.display = 'block';
  },

  playMorse() {
    const rawInput = document.getElementById('morse-input').value.trim();
    if (!rawInput) { Toast.show('Enter text to encode as Morse', 'warning'); return; }
    const input = rawInput.toUpperCase();
    this.stopMorse();
    try {
      this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) {
      Toast.show('Audio not available in this browser', 'error'); return;
    }
    const ctx = this._audioCtx;
    // Resume is mandatory on user gesture — browsers start AudioContext suspended.
    const startPlayback = () => {
      const speedEl = document.getElementById('morse-speed');
      const dot = speedEl ? parseFloat(speedEl.value) : 0.1; // seconds per dot unit
      let t = ctx.currentTime + 0.05;
      let totalDur = 0;

      const playTone = (dur) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 650;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.01);
        gain.gain.linearRampToValueAtTime(0, t + dur - 0.01);
        osc.start(t); osc.stop(t + dur);
        // Visual flash + vibration synced to tone
        const wallDelay = (t - ctx.currentTime) * 1000;
        setTimeout(() => {
          const flash = document.getElementById('morse-flash');
          if (flash) { flash.style.display = 'block'; flash.style.opacity = '1'; }
          if (navigator.vibrate) navigator.vibrate(Math.round(dur * 1000));
          setTimeout(() => {
            if (flash) { flash.style.opacity = '0'; setTimeout(() => { if (flash) flash.style.display = 'none'; }, 100); }
          }, Math.round(dur * 1000));
        }, wallDelay);
        t += dur;
      };

      for (const char of input) {
        if (char === ' ') { t += dot * 7; continue; }
        const code = MORSE[char];
        if (!code) continue;
        for (const sym of code) {
          if (sym === '.') playTone(dot);
          else if (sym === '-') playTone(dot * 3);
          t += dot; // inter-element gap
        }
        t += dot * 2; // inter-character gap
      }
      totalDur = (t - ctx.currentTime) * 1000;
      this._setMorsePlaying(true);
      // Auto-clear playing state when sequence finishes
      this._morseEndTimer = setTimeout(() => this._setMorsePlaying(false), totalDur + 100);
      Toast.show('Playing Morse: ' + input, 'info');
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(startPlayback);
    } else {
      startPlayback();
    }
  },

  stopMorse() {
    if (this._morseEndTimer) { clearTimeout(this._morseEndTimer); this._morseEndTimer = null; }
    if (this._audioCtx) {
      try { this._audioCtx.close(); } catch(e) {}
      this._audioCtx = null;
    }
    const flash = document.getElementById('morse-flash');
    if (flash) { flash.style.opacity = '0'; flash.style.display = 'none'; }
    if (navigator.vibrate) navigator.vibrate(0);
    this._setMorsePlaying(false);
  },

  decodeMorse(inputOverride) {
    const MORSE_REV = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));
    const raw = inputOverride !== undefined
      ? inputOverride
      : (document.getElementById('morse-decode-input') ? document.getElementById('morse-decode-input').value.trim() : '');
    if (!raw) { Toast.show('Enter Morse code to decode', 'warning'); return; }
    const words = raw.split(' / ');
    const decoded = words.map(word => {
      if (!word.trim()) return '';
      return word.trim().split(' ').map(sym => {
        sym = sym.trim();
        if (!sym) return '';
        return MORSE_REV[sym] || '?';
      }).join('');
    }).join(' ');
    const out = document.getElementById('morse-decode-output');
    if (out) {
      out.style.display = 'block';
      out.textContent = decoded;
    }
    return decoded;
  },

  copyFreq(text, el) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        Toast.show('Copied: ' + text, 'success', 1800);
        if (el) {
          const orig = el.style.background;
          el.style.background = 'var(--accent-glow)';
          setTimeout(() => { el.style.background = orig; }, 600);
        }
      }).catch(() => {
        Toast.show('Could not copy — select the frequency manually', 'warning');
      });
    } else {
      Toast.show('Clipboard not available in this browser', 'warning');
    }
  },

  setFilter(band, btn) {
    // Update active button
    const bar = document.getElementById('radio-filter-bar');
    if (bar) bar.querySelectorAll('.map-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    // Show/hide cards
    const panel = document.getElementById('tab-radio');
    if (!panel) return;
    panel.querySelectorAll('.card[data-radio-band]').forEach(card => {
      if (band === 'all') {
        card.style.display = '';
      } else {
        card.style.display = card.dataset.radioBand === band ? '' : 'none';
      }
    });
    // Cards without data-radio-band (the logbook) are always visible
    panel.querySelectorAll('.card:not([data-radio-band])').forEach(card => {
      card.style.display = '';
    });
  }
};


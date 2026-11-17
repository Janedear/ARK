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
    this._initCopyKeys();
  },

  // Make every "tap to copy" frequency reachable and usable from a keyboard too.
  _initCopyKeys() {
    const panel = document.getElementById('tab-radio');
    if (!panel) return;
    panel.querySelectorAll('.freq-copyable').forEach(el => {
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
    });
    panel.addEventListener('keydown', ev => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      const el = ev.target && ev.target.closest ? ev.target.closest('.freq-copyable') : null;
      if (!el || el !== ev.target) return;
      ev.preventDefault();
      el.click();
    });
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
      btn.textContent = active ? 'Playing…' : 'Play';
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
    const inputEl = document.getElementById('morse-input');
    // An empty box plays SOS, the example shown in the box.
    const rawInput = (inputEl ? inputEl.value.trim() : '') || 'SOS';
    const input = rawInput.toUpperCase();
    if (![...input].some(ch => MORSE[ch])) {
      Toast.show('Morse only has letters and numbers. Type a word like SOS, then tap Play.', 'warning'); return;
    }
    this.stopMorse();
    try {
      this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) {
      this._audioCtx = null;
      this.updateEncodeOutput();
      Toast.show('This device cannot play the sound. Read the dots and dashes on screen instead.', 'error'); return;
    }
    const ctx = this._audioCtx;
    const gen = ++this._morseGen;
    // Resume is mandatory on user gesture — browsers start AudioContext suspended.
    const startPlayback = () => {
      if (gen !== this._morseGen) return; // stopped before the sound could start
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
          if (gen !== this._morseGen) return; // Stop was tapped
          const flash = document.getElementById('morse-flash');
          if (flash) { flash.style.display = 'block'; flash.style.opacity = '1'; }
          try { if (navigator.vibrate) navigator.vibrate(Math.round(dur * 1000)); } catch (e) {}
          setTimeout(() => {
            if (gen !== this._morseGen) return;
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
      const retry = () => Toast.show('The sound could not start. Tap Play again.', 'warning');
      try {
        const p = ctx.resume();
        if (p && p.then) p.then(startPlayback).catch(retry); else startPlayback();
      } catch (e) { retry(); }
    } else {
      startPlayback();
    }
  },

  _morseGen: 0,

  stopMorse() {
    this._morseGen++; // cancels flashes and buzzes that are still queued
    if (this._morseEndTimer) { clearTimeout(this._morseEndTimer); this._morseEndTimer = null; }
    if (this._audioCtx) {
      try { this._audioCtx.close(); } catch(e) {}
      this._audioCtx = null;
    }
    const flash = document.getElementById('morse-flash');
    if (flash) { flash.style.opacity = '0'; flash.style.display = 'none'; }
    try { if (navigator.vibrate) navigator.vibrate(0); } catch (e) {}
    this._setMorsePlaying(false);
  },

  decodeMorse(inputOverride) {
    const MORSE_REV = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));
    const raw = inputOverride !== undefined
      ? inputOverride
      : (document.getElementById('morse-decode-input') ? document.getElementById('morse-decode-input').value.trim() : '');
    if (!raw) { Toast.show('Type the dots and dashes first, like ... --- ... then tap Decode.', 'warning'); return; }
    // Phones often turn . and - into other marks. Put them back first.
    const clean = String(raw)
      .replace(/\u2026/g, '...')
      .replace(/[\u00b7\u2022\u2219\u22c5*]/g, '.')
      .replace(/[\u2010-\u2015\u2212_]/g, '-')
      .replace(/\|/g, '/');
    const words = clean.split(/\s*\/\s*|\s{3,}|\n+/);
    const decoded = words.map(word => {
      if (!word.trim()) return '';
      return word.trim().split(/\s+/).map(sym => {
        if (!sym) return '';
        return MORSE_REV[sym] || '?';
      }).join('');
    }).filter(Boolean).join(' ');
    const out = document.getElementById('morse-decode-output');
    if (out) {
      out.style.display = 'block';
      out.textContent = decoded.indexOf('?') >= 0
        ? decoded + '   (? = a letter that could not be read. Check its dots and dashes.)'
        : decoded;
    }
    return decoded;
  },

  copyFreq(text, el) {
    text = String(text == null ? '' : text);
    const ok = () => {
      Toast.show('Copied: ' + text, 'success', 1800);
      if (el) {
        el.style.background = 'var(--accent-glow)';
        setTimeout(() => { el.style.background = ''; }, 600);
      }
    };
    const fail = () => Toast.show('Could not copy. Write it down instead: ' + text, 'warning', 5000);
    // Works without the clipboard API, which browsers switch off on a local hub address.
    const legacy = () => {
      let done = false;
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed'; ta.style.top = '0'; ta.style.left = '0'; ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { ta.setSelectionRange(0, text.length); } catch (e) {}
        done = document.execCommand('copy');
        document.body.removeChild(ta);
        if (el && el.focus) { try { el.focus(); } catch (e) {} }
      } catch (e) { done = false; }
      if (done) ok(); else fail();
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(ok).catch(legacy);
        return;
      }
    } catch (e) {}
    legacy();
  },

  setFilter(band, btn) {
    // Update active button
    const bar = document.getElementById('radio-filter-bar');
    if (bar) bar.querySelectorAll('.map-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
    if (btn) { btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true'); }
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


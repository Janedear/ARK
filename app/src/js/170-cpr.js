// === CPR ===
const CPR = {
  _int: null, _elapsedInt: null,
  _count: 0, _cycleCount: 0, _startTime: 0, _pausedElapsed: 0,
  _running: false,
  _mode: 'adult', // 'adult' | 'child' | 'infant'
  _modes: {
    adult:  { bpm: 100, ms: 600,  label: 'Adult (8+ yrs) — 100–120/min · 2 hands · at least 2 in deep',   breaths: 30 },
    child:  { bpm: 100, ms: 600,  label: 'Child (1–8 yrs) — 100–120/min · 1–2 hands · about 2 in deep', breaths: 30 },
    infant: { bpm: 120, ms: 500,  label: 'Infant (<1 yr) — 100–120/min · 2 thumbs (or heel of 1 hand) · about 1.5 in deep', breaths: 30 },
  },
  _fmt(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return String(m).padStart(2,'0') + ':' + String(s % 60).padStart(2,'0');
  },
  // Highlight the chosen button in a group (shared with the choking guide).
  _markChoice(btn, on) {
    if (!btn) return;
    btn.style.background = ''; btn.style.color = ''; btn.style.fontWeight = '';
    btn.className = on ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  },
  // Hands-only CPR: an untrained rescuer skips the breaths, so the beat must not stop for them.
  _handsOnly: false,
  setHandsOnly(on) {
    this._handsOnly = !!on;
    this._cycleCount = 0;
    if (this._breathUntil) this._breathUntil = 1; // end a breath pause on the next beat
    const note = document.getElementById('cpr-cycle-note');
    if (note) note.textContent = this._handsOnly ? 'Push hard and fast. Do not stop.' : '30 compressions → 2 rescue breaths → repeat';
  },
  setMode(mode) {
    const cfg = this._modes[mode];
    if (!cfg) return;
    // A stray tap on Adult/Child/Infant in the middle of CPR must not stop the beat or lose the count.
    const wasRunning = this._running;
    if (wasRunning) this.pause(); else this.reset();
    this._mode = mode;
    const lbl = document.getElementById('cpr-mode-label');
    if (lbl) lbl.textContent = cfg.label;
    ['adult','child','infant'].forEach(m => {
      const el = document.getElementById('cpr-steps-' + m);
      if (el) el.style.display = m === mode ? '' : 'none';
      this._markChoice(document.getElementById('cpr-mode-' + m), m === mode);
    });
    // Update animation speed to match bpm
    const heart = document.getElementById('cpr-heart');
    if (heart) heart.style.animationDuration = cfg.ms + 'ms';
    if (wasRunning) this.start();
  },
  // A short click on every compression, so the rescuer can keep time without looking at the screen.
  _audio: null,
  _startAudio() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!this._audio) this._audio = new AC();
      if (this._audio.state === 'suspended' && this._audio.resume) {
        const p = this._audio.resume();
        if (p && p.catch) p.catch(() => {});
      }
    } catch (e) { this._audio = null; }
  },
  _stopAudio() {
    try { if (this._audio && this._audio.close) { const p = this._audio.close(); if (p && p.catch) p.catch(() => {}); } } catch (e) {}
    this._audio = null;
  },
  _beep(freq, dur) {
    const ctx = this._audio;
    if (!ctx || ctx.state !== 'running') return;
    // A hidden page slows its timers down, so the beat would be too slow to follow. Stay silent instead.
    if (document.hidden) return;
    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.35, t + 0.005);
      gain.gain.linearRampToValueAtTime(0.0001, t + dur);
      osc.start(t); osc.stop(t + dur + 0.02);
    } catch (e) {}
  },
  _requestWake() {
    // Keep the screen awake: hands are busy, and a dark screen would hide the count.
    try {
      if (navigator.wakeLock && navigator.wakeLock.request) {
        navigator.wakeLock.request('screen').then(lock => {
          if (this._running) this._wakeLock = lock;
          else { try { lock.release(); } catch (e) {} }
        }).catch(() => {});
      }
    } catch (e) {}
  },
  start() {
    if (this._running) return;
    this._running = true;
    // The browser can bring the tick back after a reload. Follow what the screen shows.
    const ho = document.getElementById('cpr-hands-only');
    if (ho && ho.checked !== this._handsOnly) this.setHandsOnly(ho.checked);
    const cfg = this._modes[this._mode];
    const counter = document.getElementById('cpr-counter');
    const box = document.getElementById('cpr-box');
    const startBtn = document.getElementById('cpr-start-btn');
    if (box) { box.classList.remove('cpr-paused'); box.classList.add('cpr-active'); }
    if (startBtn) { startBtn.textContent = 'RUNNING'; startBtn.disabled = true; }
    // Set animation speed to match bpm
    const heart = document.getElementById('cpr-heart');
    if (heart) heart.style.animationDuration = cfg.ms + 'ms';
    this._startTime = Date.now() - this._pausedElapsed;
    this._requestWake();
    this._startAudio();
    // Compression interval
    this._int = setInterval(() => {
      // While the two rescue breaths are being given, compressions (and the count) stop.
      if (this._breathUntil && Date.now() < this._breathUntil) return;
      if (this._breathUntil) {
        this._breathUntil = 0;
        const cueOff = document.getElementById('cpr-breath-cue');
        if (cueOff) cueOff.style.display = 'none';
        if (heart) heart.style.animationPlayState = '';
      }
      this._count++;
      this._cycleCount++;
      if (counter) { counter.textContent = this._count; counter.style.color = ''; }
      this._beep(880, 0.06);
      // After every 30 compressions: pause about 5 seconds for 2 breaths
      if (!this._handsOnly && this._cycleCount >= cfg.breaths) {
        this._cycleCount = 0;
        this._breathUntil = Date.now() + 5000;
        const cue = document.getElementById('cpr-breath-cue');
        if (cue) cue.style.display = '';
        if (counter) counter.style.color = 'var(--blue)';
        if (heart) heart.style.animationPlayState = 'paused';
        this._beep(440, 0.5);
        try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) {}
      }
    }, cfg.ms);
    // Elapsed time interval
    this._elapsedInt = setInterval(() => {
      const el = document.getElementById('cpr-elapsed');
      if (el) el.textContent = this._fmt(Date.now() - this._startTime);
    }, 500);
    // No sound on this device: say so, and point at the count instead of a beep that will never come.
    const cue = this._audio ? 'Push with each beep.' : 'No sound on this device. Push each time the number goes up.';
    Toast.show(cue + (this._handsOnly ? ' Do not stop until help arrives.' : ' After 30 pushes, give 2 breaths.'), 'info', this._audio ? undefined : 6000);
  },
  pause() {
    if (!this._running) return;
    this._running = false;
    this._pausedElapsed = Date.now() - this._startTime;
    clearInterval(this._int); this._int = null;
    clearInterval(this._elapsedInt); this._elapsedInt = null;
    this._releaseWake();
    this._stopAudio();
    const box = document.getElementById('cpr-box');
    if (box) { box.classList.add('cpr-paused'); box.classList.remove('cpr-active'); }
    const startBtn = document.getElementById('cpr-start-btn');
    if (startBtn) { startBtn.textContent = 'RESUME'; startBtn.disabled = false; }
  },
  _breathUntil: 0,
  _wakeLock: null,
  _releaseWake() {
    try { if (this._wakeLock) { const p = this._wakeLock.release(); if (p && p.catch) p.catch(() => {}); } } catch (e) {}
    this._wakeLock = null;
  },
  reset() {
    this._running = false;
    clearInterval(this._int); this._int = null;
    clearInterval(this._elapsedInt); this._elapsedInt = null;
    this._releaseWake();
    this._stopAudio();
    this._breathUntil = 0;
    const heartEl = document.getElementById('cpr-heart');
    if (heartEl) heartEl.style.animationPlayState = '';
    this._count = 0; this._cycleCount = 0; this._pausedElapsed = 0;
    const box = document.getElementById('cpr-box');
    if (box) { box.classList.add('cpr-paused'); box.classList.remove('cpr-active'); }
    const counter = document.getElementById('cpr-counter');
    if (counter) { counter.textContent = '0'; counter.style.color = ''; }
    const elapsed = document.getElementById('cpr-elapsed');
    if (elapsed) elapsed.textContent = '00:00';
    const cue = document.getElementById('cpr-breath-cue');
    if (cue) cue.style.display = 'none';
    const startBtn = document.getElementById('cpr-start-btn');
    if (startBtn) { startBtn.textContent = 'START'; startBtn.disabled = false; }
  },
  // Keep stop() as alias for reset() for backward compat
  stop() { this.reset(); }
};

// The browser drops the screen wake lock whenever the page is hidden. Take it back when the
// person returns, so the screen does not go dark in the middle of CPR.
try {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && CPR._running) { CPR._requestWake(); CPR._startAudio(); }
  });
} catch (e) {}

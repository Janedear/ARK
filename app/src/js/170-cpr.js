// === CPR ===
const CPR = {
  _int: null, _elapsedInt: null,
  _count: 0, _cycleCount: 0, _startTime: 0, _pausedElapsed: 0,
  _running: false,
  _mode: 'adult', // 'adult' | 'child' | 'infant'
  _modes: {
    adult:  { bpm: 100, ms: 600,  label: 'Adult (8+ yrs) — 100–120/min · 2 hands · 2 in deep',   breaths: 30 },
    child:  { bpm: 100, ms: 600,  label: 'Child (1–8 yrs) — 100–120/min · 1–2 hands · 2 in deep', breaths: 30 },
    infant: { bpm: 120, ms: 500,  label: 'Infant (<1 yr) — 100–120/min · 2 thumbs (or heel of 1 hand) · 1.5 in deep', breaths: 30 },
  },
  _fmt(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return String(m).padStart(2,'0') + ':' + String(s % 60).padStart(2,'0');
  },
  setMode(mode) {
    this.reset();
    this._mode = mode;
    const cfg = this._modes[mode];
    const lbl = document.getElementById('cpr-mode-label');
    if (lbl) lbl.textContent = cfg.label;
    const btn = document.getElementById('cpr-start-btn');
    if (btn) btn.textContent = `▶ START`;
    ['adult','child','infant'].forEach(m => {
      const el = document.getElementById('cpr-steps-' + m);
      if (el) el.style.display = m === mode ? '' : 'none';
    });
    ['adult','child','infant'].forEach(m => {
      const b = document.getElementById('cpr-mode-' + m);
      if (!b) return;
      if (m === mode) { b.style.background = 'var(--accent)'; b.style.color = '#000'; b.style.fontWeight = '700'; b.className = 'btn btn-sm'; }
      else { b.style.background = ''; b.style.color = ''; b.style.fontWeight = ''; b.className = 'btn btn-secondary btn-sm'; }
    });
    // Update animation speed to match bpm
    const heart = document.getElementById('cpr-heart');
    if (heart) heart.style.animationDuration = cfg.ms + 'ms';
  },
  start() {
    if (this._running) return;
    this._running = true;
    const cfg = this._modes[this._mode];
    const counter = document.getElementById('cpr-counter');
    const box = document.getElementById('cpr-box');
    const startBtn = document.getElementById('cpr-start-btn');
    if (box) { box.classList.remove('cpr-paused'); box.classList.add('cpr-active'); }
    if (startBtn) { startBtn.textContent = '▶ RUNNING'; startBtn.disabled = true; }
    // Set animation speed to match bpm
    const heart = document.getElementById('cpr-heart');
    if (heart) heart.style.animationDuration = cfg.ms + 'ms';
    this._startTime = Date.now() - this._pausedElapsed;
    // Keep the screen awake: hands are busy, and a dark screen would hide the count.
    try {
      if (navigator.wakeLock && navigator.wakeLock.request) {
        navigator.wakeLock.request('screen').then(lock => { this._wakeLock = lock; }).catch(() => {});
      }
    } catch (e) {}
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
      // After every 30 compressions: pause about 5 seconds for 2 breaths
      if (this._cycleCount >= cfg.breaths) {
        this._cycleCount = 0;
        this._breathUntil = Date.now() + 5000;
        const cue = document.getElementById('cpr-breath-cue');
        if (cue) cue.style.display = '';
        if (counter) counter.style.color = 'var(--blue)';
        if (heart) heart.style.animationPlayState = 'paused';
        try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) {}
      }
    }, cfg.ms);
    // Elapsed time interval
    this._elapsedInt = setInterval(() => {
      const el = document.getElementById('cpr-elapsed');
      if (el) el.textContent = this._fmt(Date.now() - this._startTime);
    }, 500);
    Toast.show(`CPR started — ${cfg.bpm}/min · 30 compressions then 2 breaths`, 'info');
  },
  pause() {
    if (!this._running) return;
    this._running = false;
    this._pausedElapsed = Date.now() - this._startTime;
    clearInterval(this._int); this._int = null;
    clearInterval(this._elapsedInt); this._elapsedInt = null;
    this._releaseWake();
    const box = document.getElementById('cpr-box');
    if (box) { box.classList.add('cpr-paused'); box.classList.remove('cpr-active'); }
    const startBtn = document.getElementById('cpr-start-btn');
    if (startBtn) { startBtn.textContent = '▶ RESUME'; startBtn.disabled = false; }
  },
  _breathUntil: 0,
  _wakeLock: null,
  _releaseWake() {
    try { if (this._wakeLock) this._wakeLock.release(); } catch (e) {}
    this._wakeLock = null;
  },
  reset() {
    this._running = false;
    clearInterval(this._int); this._int = null;
    clearInterval(this._elapsedInt); this._elapsedInt = null;
    clearTimeout(this._breathTimeout);
    this._releaseWake();
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
    if (startBtn) { startBtn.textContent = '▶ START'; startBtn.disabled = false; }
  },
  // Keep stop() as alias for reset() for backward compat
  stop() { this.reset(); }
};


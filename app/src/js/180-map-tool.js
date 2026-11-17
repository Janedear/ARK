// === MAP TOOL ===
const MapTool = {
  _canvas: null, _ctx: null, _mode: 'select',
  _markers: [], _inited: false,
  // Map view state — lat/lon center + zoom
  _lat: 39.8283, _lon: -98.5795, _zoom: 4, // defaults to continental US
  // Pan drag state
  _drag: false, _dragStartX: 0, _dragStartY: 0, _dragStartLat: 0, _dragStartLon: 0,
  // Pinch-zoom state
  _pinchDist: 0, _pinchZoom: 4,
  // Tile cache: "z/x/y" → HTMLImageElement (capped at 512 to avoid memory leak)
  _tileCache: {},
  _tileCacheKeys: [], // insertion-order list for FIFO eviction
  _tileCacheMax: 512,
  _tileSize: 256,
  _pendingClick: null,

  // ── OSM tile math ──────────────────────────────────────────────────────────
  _lon2tile(lon, z) { return Math.floor((lon + 180) / 360 * Math.pow(2, z)); },
  _lat2tile(lat, z) {
    const r = lat * Math.PI / 180;
    return Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * Math.pow(2, z));
  },
  // pixel offset within a tile for a given lat/lon at zoom z
  _latlon2px(lat, lon, z, tileX, tileY) {
    const n = Math.pow(2, z);
    const px = (lon + 180) / 360 * n * this._tileSize - tileX * this._tileSize;
    const latR = lat * Math.PI / 180;
    const py = (1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2 * n * this._tileSize - tileY * this._tileSize;
    return {px, py};
  },
  // canvas (x,y) → lat/lon given current view center
  _canvasToLatLon(cx, cy) {
    if (!this._canvas) return {lat: this._lat, lon: this._lon};
    const W = this._canvas.width, H = this._canvas.height;
    const n = Math.pow(2, this._zoom);
    const ts = this._tileSize;
    // world pixel of center
    const centerTX = (this._lon + 180) / 360 * n;
    const latR = this._lat * Math.PI / 180;
    const centerTY = (1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2 * n;
    // delta from center in tiles
    const dTX = (cx - W / 2) / ts;
    const dTY = (cy - H / 2) / ts;
    const tX = centerTX + dTX;
    const tY = centerTY + dTY;
    const lon = tX / n * 360 - 180;
    const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * tY / n))) * 180 / Math.PI;
    return {lat, lon};
  },
  // lat/lon → canvas (x,y)
  _latLonToCanvas(lat, lon) {
    if (!this._canvas) return {x: 0, y: 0};
    const W = this._canvas.width, H = this._canvas.height;
    const n = Math.pow(2, this._zoom);
    const ts = this._tileSize;
    const centerTX = (this._lon + 180) / 360 * n;
    const centerLatR = this._lat * Math.PI / 180;
    const centerTY = (1 - Math.log(Math.tan(centerLatR) + 1 / Math.cos(centerLatR)) / Math.PI) / 2 * n;
    const latR = lat * Math.PI / 180;
    const tX = (lon + 180) / 360 * n;
    const tY = (1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2 * n;
    return { x: W / 2 + (tX - centerTX) * ts, y: H / 2 + (tY - centerTY) * ts };
  },

  // ── Tile loading (memory cache → IndexedDB → network) ────────────────────
  _failTile(img) { img._failed = true; img._failedAt = Date.now(); },
  // Forget pieces that failed to load, so the next draw tries them again.
  _dropFailedTiles() {
    this._tileCacheKeys = this._tileCacheKeys.filter(k => {
      const t = this._tileCache[k];
      if (t && t._failed) { delete this._tileCache[k]; return false; }
      return true;
    });
  },
  _getTile(z, x, y) {
    const key = z + '/' + x + '/' + y;
    // 1) Already in memory — return instantly.
    // A piece that failed is tried again after a short wait, so the map heals when a connection comes back.
    const cached = this._tileCache[key];
    if (cached && !(cached._failed && Date.now() - (cached._failedAt || 0) > 15000)) return cached;
    if (cached) this._tileCacheKeys = this._tileCacheKeys.filter(k => k !== key);
    // 2) Evict oldest entry if cap exceeded (FIFO)
    if (this._tileCacheKeys.length >= this._tileCacheMax) {
      const evict = this._tileCacheKeys.shift();
      delete this._tileCache[evict];
    }
    // 3) Create placeholder img, start async resolution
    const img = new Image();
    img.crossOrigin = 'anonymous';
    this._tileCache[key] = img; // prevent duplicate fetches
    this._tileCacheKeys.push(key);
    // Try IDB first, fall back to network
    DB.getTile(key).then(record => {
      if (record && record.blob) {
        // Load from local cache
        const url = URL.createObjectURL(record.blob);
        img.onload = () => { URL.revokeObjectURL(url); this.draw(); };
        img.onerror = () => { URL.revokeObjectURL(url); this._fetchTileFromNetwork(img, key, z, x, y); };
        img.src = url;
      } else {
        this._fetchTileFromNetwork(img, key, z, x, y);
      }
    }).catch(() => { this._fetchTileFromNetwork(img, key, z, x, y); });
    return img;
  },
  _fetchTileFromNetwork(img, key, z, x, y) {
    const servers = ['a', 'b', 'c'];
    const s = servers[(x + y) % 3];
    const url = `https://${s}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
    // Use fetch so we can get the blob for IDB storage
    // OpenStreetMap asks apps to identify themselves; send the site origin (never the full address).
    fetch(url, {referrerPolicy: 'origin', signal: timeoutSignal(20000)}).then(r => {
      if (!r.ok) throw new Error('tile ' + r.status);
      return r.blob();
    }).then(blob => {
      DB.putTile(key, blob).catch(()=>{}); // persist asynchronously
      const objUrl = URL.createObjectURL(blob);
      img.onload = () => { img._failed = false; URL.revokeObjectURL(objUrl); this.draw(); };
      img.onerror = () => { URL.revokeObjectURL(objUrl); this._failTile(img); this.draw(); };
      img.src = objUrl;
    }).catch(() => { this._failTile(img); this.draw(); });
  },

  // ── Markers ────────────────────────────────────────────────────────────────
  // One place that says how each kind of marker looks, on the map and in the list.
  // The map picture is always light, so marker colours on it stay the same in dark mode.
  _markerKinds: {
    meeting: {name: 'Meeting point', icon: 'pin',     token: '--accent', color: '#8d7041', letter: 'M'},
    water:   {name: 'Water',         icon: 'droplet', token: '--blue',   color: '#3f6f94', letter: 'W'},
    shelter: {name: 'Shelter',       icon: 'house',   token: '--green',  color: '#4f7a3a', letter: 'S'},
    hazard:  {name: 'Hazard',        icon: 'alert',   token: '--yellow', color: '#a8741a', letter: '!'},
    medical: {name: 'Medical',       icon: 'cross',   token: '--red',    color: '#b24148', letter: '+'},
    gps:     {name: 'Location',      icon: 'pin',     token: '--blue',   color: '#3f6f94', letter: 'L'},
    other:   {name: 'Place',         icon: 'pin',     token: '--text-secondary', color: '#5c564c', letter: 'P'}
  },
  _kind(type) { return this._markerKinds[type] || this._markerKinds.other; },
  // The line icons live in the page as an SVG sprite. To paint one on the canvas it is turned
  // into a small white picture once, then reused. Until it is ready a letter is drawn instead.
  _iconImgs: {},
  _markerIcon(name) {
    if (name in this._iconImgs) return this._iconImgs[name];
    this._iconImgs[name] = null;
    try {
      const sym = document.getElementById('i-' + name);
      if (!sym) return null;
      const vb = sym.getAttribute('viewBox') || '0 0 24 24';
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="48" height="48" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${sym.innerHTML}</svg>`;
      const img = new Image();
      img.onload = () => { this._iconImgs[name] = img; this.draw(); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    } catch (e) {}
    return null;
  },
  // "12 minutes", "3 hours", "2 days" — for telling people how old a location is.
  _ago(ms) {
    const min = Math.max(1, Math.round(ms / 60000));
    if (min < 60) return min + ' minute' + (min !== 1 ? 's' : '');
    const hr = Math.round(min / 60);
    if (hr < 48) return hr + ' hour' + (hr !== 1 ? 's' : '');
    const d = Math.round(hr / 24);
    return d + ' days';
  },
  // Reads "37.7749, -122.4194", "37.7749 -122.4194", "37.77 N, 122.41 W" and similar.
  // Returns {lat, lon} or null when it is not a usable place.
  _parseLatLon(str) {
    const s = String(str || '');
    // Degrees-minutes-seconds (37° 46' 29") would be read as the wrong place. Refuse it, so the help text is shown.
    if (/['"′″]/.test(s)) return null;
    // The letter may come first ("N 37.77, W 122.41") or last ("37.77 N, 122.41 W").
    const letterFirst = /^\s*[NSEW]/i.test(s);
    const re = letterFirst ? /([NSEW])\s*(-?\d+(?:\.\d+)?)/gi : /(-?\d+(?:\.\d+)?)\s*°?\s*([NSEW])?/gi;
    const out = [];
    let m;
    while (out.length < 2 && (m = re.exec(s))) {
      let v = parseFloat(letterFirst ? m[2] : m[1]);
      const letter = letterFirst ? m[1] : m[2];
      if (letter && /[sw]/i.test(letter)) v = -Math.abs(v);
      out.push(v);
    }
    if (out.length < 2 || out.some(isNaN)) return null;
    if (Math.abs(out[0]) > 90 || Math.abs(out[1]) > 180) return null;
    return {lat: out[0], lon: out[1]};
  },
  _coordHelp: 'Type the place as two numbers, like 37.7749, -122.4194. The first must be between -90 and 90, the second between -180 and 180.',
  _lastGps() {
    const g = this._gps || Store.get('last_gps', null);
    return (g && typeof g.lat === 'number' && typeof g.lon === 'number') ? g : null;
  },

  // ── Draw ───────────────────────────────────────────────────────────────────
  draw() {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const W = this._canvas.width, H = this._canvas.height;
    const ts = this._tileSize;
    const z = this._zoom;
    const n = Math.pow(2, z);
    // A place at the very top or bottom of the world (or a damaged number) must never leave the map blank.
    if (!isFinite(this._lat) || !isFinite(this._lon)) { this._lat = 39.8283; this._lon = -98.5795; }
    this._lat = Math.max(-85, Math.min(85, this._lat));

    // Brand colours come from the page, so the empty map matches light and dark mode.
    let cs = null;
    try { cs = getComputedStyle(document.documentElement); } catch (e) {}
    const tok = (name, fb) => ((cs && cs.getPropertyValue(name)) || '').trim() || fb;
    const cBg = tok('--bg-secondary', '#efe9dd');
    const cTile = tok('--bg-elevated', '#f8f2e6');
    const cCard = tok('--bg-card', '#fffdf8');
    const cBorder = tok('--border', '#e2dccf');
    const cInk = tok('--text-primary', '#1c1a17');
    const cSoft = tok('--text-secondary', '#5c564c');
    const cMuted = tok('--text-muted', '#8a8378');
    const fontUi = '"Geist",system-ui,sans-serif';

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = cBg;
    ctx.fillRect(0, 0, W, H);

    // Center tile
    const centerTX = (this._lon + 180) / 360 * n;
    const latR = this._lat * Math.PI / 180;
    const centerTY = (1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2 * n;

    // Tile range to cover canvas
    const tilesX = Math.ceil(W / ts) + 2;
    const tilesY = Math.ceil(H / ts) + 2;
    const startTX = Math.floor(centerTX - tilesX / 2);
    const startTY = Math.floor(centerTY - tilesY / 2);

    let tilesDrawn = 0, tilesFailed = 0, tilesLoading = 0;
    for (let tx = startTX; tx <= startTX + tilesX; tx++) {
      for (let ty = startTY; ty <= startTY + tilesY; ty++) {
        // wrap x, clamp y
        const wtx = ((tx % n) + n) % n;
        if (ty < 0 || ty >= n) continue;
        const img = this._getTile(z, wtx, ty);
        const canX = W / 2 + (tx - centerTX) * ts;
        const canY = H / 2 + (ty - centerTY) * ts;
        if (img.complete && !img._failed && img.naturalWidth) {
          ctx.drawImage(img, Math.round(canX), Math.round(canY), ts, ts);
          tilesDrawn++;
        } else if (img._failed) {
          // Failed tile — plain placeholder
          ctx.fillStyle = cTile;
          ctx.fillRect(Math.round(canX), Math.round(canY), ts - 1, ts - 1);
          tilesFailed++;
        } else {
          // placeholder while loading
          ctx.fillStyle = cTile;
          ctx.fillRect(Math.round(canX), Math.round(canY), ts - 1, ts - 1);
          ctx.fillStyle = cMuted;
          ctx.font = '11px ' + fontUi;
          ctx.fillText('loading…', Math.round(canX) + 8, Math.round(canY) + 20);
          tilesLoading++;
        }
      }
    }

    // Missing-map notices — full: nothing saved for this place; partial: some pieces missing
    if (tilesFailed > 0 && tilesDrawn === 0 && tilesLoading === 0) {
      ctx.globalAlpha = 0.94;
      ctx.fillStyle = cCard;
      ctx.fillRect(0, H / 2 - 40, W, 80);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = cBorder;
      ctx.lineWidth = 1;
      ctx.strokeRect(-1, H / 2 - 40.5, W + 2, 81);
      ctx.textAlign = 'center';
      ctx.fillStyle = cInk;
      ctx.font = '600 15px ' + fontUi;
      ctx.fillText('No map saved for this place', W / 2, H / 2 - 8);
      ctx.fillStyle = cSoft;
      ctx.font = '12px ' + fontUi;
      // The saved map covers the middle zoom steps only, so zooming may bring it back.
      ctx.fillText(z > 16 ? 'Tap − to zoom out. A saved map may show.'
        : z < 12 ? 'Tap + to zoom in. A saved map may show.'
        : 'Get internet once, then tap Save this area.', W / 2, H / 2 + 14);
      ctx.fillText('Your markers still work.', W / 2, H / 2 + 30);
      ctx.textAlign = 'left';
    } else if (tilesFailed > 0 && tilesLoading === 0) {
      // Banner sits above the scale bar and the map credit
      ctx.globalAlpha = 0.94;
      ctx.fillStyle = cCard;
      ctx.fillRect(0, H - 66, W, 22);
      ctx.globalAlpha = 1;
      ctx.fillStyle = cInk;
      ctx.font = '11px ' + fontUi;
      ctx.textAlign = 'center';
      ctx.fillText('Parts of the map are not saved here', W / 2, H - 51);
      ctx.textAlign = 'left';
    }

    // OSM attribution (required)
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(0, H - 18, W, 18);
    ctx.fillStyle = '#333';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('© OpenStreetMap contributors', 4, H - 5);

    // Markers: a coloured disc with a white line icon (or a letter until the icon is ready)
    this._markers.forEach(m => {
      if (!m || typeof m.lat !== 'number' || typeof m.lon !== 'number') return; // skip legacy pixel-only markers
      const {x, y} = this._latLonToCanvas(m.lat, m.lon);
      if (x < -20 || x > W + 20 || y < -20 || y > H + 20) return; // off-screen
      const kind = this._kind(m.type);
      ctx.beginPath();
      ctx.arc(x, y, 13, 0, Math.PI * 2);
      ctx.fillStyle = kind.color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
      const icon = this._markerIcon(kind.icon);
      if (icon) {
        ctx.drawImage(icon, x - 8, y - 8, 16, 16);
      } else {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(kind.letter, x, y + 1);
        ctx.textBaseline = 'alphabetic';
      }
      if (m.label) {
        ctx.font = 'bold 11px ' + fontUi;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = 3;
        ctx.strokeText(m.label, x, y + 27);
        ctx.fillText(m.label, x, y + 27);
      }
    });
    ctx.textAlign = 'left';

    // GPS dot
    const gps = this._lastGps();
    if (gps) {
      const {x, y} = this._latLonToCanvas(gps.lat, gps.lon);
      if (x >= 0 && x <= W && y >= 0 && y <= H) {
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,120,255,0.3)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#0078ff';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
      }
    }

    // Scale bar — snap to nearest tidy distance
    const metersPerPx = 156543.03392 * Math.cos(this._lat * Math.PI / 180) / Math.pow(2, z);
    const rawMeters = metersPerPx * 80; // target ~80px wide
    const mag = Math.pow(10, Math.floor(Math.log10(rawMeters)));
    const niceSteps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];
    const niceMeters = niceSteps.reduce((prev, cur) => {
      const pv = prev * mag;
      const cv = cur * mag;
      return (Math.abs(cv - rawMeters) < Math.abs(pv - rawMeters)) ? cur : prev;
    }) * mag;
    const barPx = niceMeters / metersPerPx;
    // Shown both ways, because people think in miles and feet or in kilometres and metres.
    const miles = niceMeters / 1609.344, feet = niceMeters * 3.28084;
    const label = niceMeters >= 1000
      ? (niceMeters / 1000).toFixed(niceMeters >= 10000 ? 0 : 1) + ' km / ' + (miles >= 10 ? Math.round(miles) : miles.toFixed(1)) + ' mi'
      : niceMeters + ' m / ' + (feet >= 100 ? Math.round(feet / 10) * 10 : Math.round(feet)) + ' ft';
    const sbX = 10, sbY = H - 28;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(sbX - 2, sbY - 16, Math.max(barPx, ctx.measureText(label).width) + 4, 24);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(sbX, sbY - 4, barPx, 4);
    ctx.fillStyle = '#333';
    ctx.fillText(label, sbX, sbY - 6);
  },

  // ── Init + events ──────────────────────────────────────────────────────────
  init() {
    if (this._inited) {
      // Coming back to the map: the screen may have changed size (keyboard, rotation) while it was hidden.
      if (this._resize) this._resize();
      this.renderSavedLocations(); // distances may have changed since last time
      this.startGPS(false); // location is only followed while the map is showing, to save battery
      return;
    }
    this._inited = true;
    const canvas = document.getElementById('map-canvas');
    if (!canvas) return;
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
    const saved = Store.get('map_markers', []);
    this._markers = Array.isArray(saved) ? saved : [];

    // Resize canvas to fit container — taller on mobile for usable map area.
    // The drawing size matches the size on screen, so a finger drag moves the map exactly as far.
    const resize = () => {
      // While another screen is showing the map has no size. Leave it alone; it is measured again when the map opens.
      if (!canvas.clientWidth && this._sized) return;
      this._sized = true;
      const w = canvas.clientWidth || Math.round(canvas.parentElement.getBoundingClientRect().width) || 860;
      canvas.width = Math.min(w, 1200);
      const isMobile = canvas.width < 500;
      canvas.height = Math.round(canvas.width * (isMobile ? 0.75 : 0.52));
      this.draw();
    };
    resize();
    this._resize = resize;
    window.addEventListener('resize', resize);
    // When a connection comes back, try the missing map pieces again straight away.
    window.addEventListener('online', () => { this._dropFailedTiles(); this.draw(); });

    // Open on the place the person was last seen (or their first saved place), not a far-away
    // default: that is where their saved map is, and a fresh location can take a long time indoors.
    const lastSeen = this._lastGps();
    const firstPlace = this._markers.find(m => m && typeof m.lat === 'number' && typeof m.lon === 'number');
    const startAt = lastSeen || firstPlace;
    if (startAt && Math.abs(startAt.lat) <= 85 && Math.abs(startAt.lon) <= 180) {
      this._lat = startAt.lat; this._lon = startAt.lon; this._zoom = 15;
      const gc = document.getElementById('gps-coords');
      if (gc && lastSeen) gc.textContent = `Last known location: ${lastSeen.lat.toFixed(5)}, ${lastSeen.lon.toFixed(5)}. Looking for where you are now…`;
      this.draw();
    }

    // If GPS available, center on user
    this.startGPS(true);

    // Following the location is one of the things that drains a phone fastest.
    // Stop when ARK is put away, and start again when the person comes back to the map.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.stopGPS();
      else if (this._mapShowing()) this.startGPS(false);
    });

    // Click: place marker or pan
    canvas.addEventListener('click', e => this._onClick(e));

    // Keyboard: arrow keys move the map, + and - zoom (for people who cannot drag)
    canvas.addEventListener('keydown', e => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const step = {ArrowLeft: [-80, 0], ArrowRight: [80, 0], ArrowUp: [0, -80], ArrowDown: [0, 80]}[e.key];
      if (step) {
        e.preventDefault();
        const p = this._canvasToLatLon(canvas.width / 2 + step[0], canvas.height / 2 + step[1]);
        if (!isFinite(p.lat) || !isFinite(p.lon)) return;
        this._lat = Math.max(-85, Math.min(85, p.lat));
        this._lon = ((p.lon + 540) % 360 + 360) % 360 - 180;
        this._userMoved = true;
        this.draw();
      } else if (e.key === '+' || e.key === '=') { e.preventDefault(); this.zoomIn(); }
      else if (e.key === '-' || e.key === '_') { e.preventDefault(); this.zoomOut(); }
    });

    // Wheel: zoom
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -1 : 1;
      this._zoom = Math.max(2, Math.min(18, this._zoom + delta));
      this.draw();
    }, {passive: false});

    // Touch/mouse pan
    canvas.addEventListener('mousedown', e => this._startDrag(e));
    canvas.addEventListener('mousemove', e => this._doDrag(e));
    canvas.addEventListener('mouseup', () => { this._drag = false; });
    canvas.addEventListener('mouseleave', () => { this._drag = false; });

    // Touch pan + pinch-zoom
    canvas.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        this._startDrag(e.touches[0]);
      } else if (e.touches.length === 2) {
        // Start pinch — record initial distance
        this._drag = false;
        this._didDrag = true; // a pinch must never drop a marker when the fingers lift
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        this._pinchDist = Math.hypot(dx, dy);
        this._pinchZoom = this._zoom;
      }
    }, {passive: true});
    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      if (e.touches.length === 1) {
        if (!this._pinchDist) this._doDrag(e.touches[0]);
      } else if (e.touches.length === 2 && this._pinchDist) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const newDist = Math.hypot(dx, dy);
        const scale = newDist / this._pinchDist;
        this._zoom = Math.max(2, Math.min(18, Math.round(this._pinchZoom + Math.log2(scale))));
        this.draw();
      }
    }, {passive: false});
    // _didDrag is left alone here: the tap that may follow reads it, and the next touch resets it.
    canvas.addEventListener('touchend', () => { this._drag = false; this._pinchDist = 0; });
    canvas.addEventListener('touchcancel', () => { this._drag = false; this._pinchDist = 0; });

    this.renderSavedLocations();
  },

  _startDrag(e) {
    this._drag = true;
    this._didDrag = false;
    const rect = this._canvas.getBoundingClientRect();
    this._dragStartX = e.clientX - rect.left;
    this._dragStartY = e.clientY - rect.top;
    this._dragStartLat = this._lat;
    this._dragStartLon = this._lon;
  },

  _doDrag(e) {
    if (!this._drag) return;
    const rect = this._canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const dx = cx - this._dragStartX;
    const dy = cy - this._dragStartY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) { this._didDrag = true; this._userMoved = true; }
    const n = Math.pow(2, this._zoom);
    const ts = this._tileSize;
    // convert pixel delta to lon/lat delta
    const dLon = -dx / (ts * n) * 360;
    const startLatR = this._dragStartLat * Math.PI / 180;
    const startTY = (1 - Math.log(Math.tan(startLatR) + 1 / Math.cos(startLatR)) / Math.PI) / 2 * n;
    const newTY = startTY + dy / ts;
    const newLat = Math.atan(Math.sinh(Math.PI * (1 - 2 * newTY / n))) * 180 / Math.PI;
    this._lat = Math.max(-85, Math.min(85, newLat));
    // Keep longitude in the normal range so saved places stay valid after a long sideways drag
    this._lon = ((this._dragStartLon + dLon + 540) % 360 + 360) % 360 - 180;
    this.draw();
  },

  _onClick(e) {
    if (this._didDrag) { this._didDrag = false; return; } // was a pan, not a click
    if (this._mode === 'select') return;
    const rect = this._canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (this._canvas.width / rect.width);
    const cy = (e.clientY - rect.top) * (this._canvas.height / rect.height);
    const {lat, lon} = this._canvasToLatLon(cx, cy);
    this._pendingGeo = {lat, lon};
    const kind = this._kind(this._mode);
    Modal.open(`
      <label class="form-label" for="marker-label-input">Name (you can leave this empty)</label>
      <input type="text" id="marker-label-input" maxlength="60" class="form-input w-full" placeholder="For example: Food store, Road blocked" autocomplete="off" style="margin:6px 0 12px" onkeydown="if(event.key==='Enter'){event.preventDefault();document.getElementById('marker-place-btn').click()}">
      <div class="font-xs text-muted mb-12">${esc(kind.name)} at ${lat.toFixed(5)}, ${lon.toFixed(5)}</div>
      <div class="flex gap-8 wrap" style="justify-content:flex-end">
        <button type="button" class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
        <button type="button" class="btn btn-primary" id="marker-place-btn" onclick="Modal.close();MapTool._placeMarker(document.getElementById('marker-label-input').value.trim(),MapTool._pendingGeo.lat,MapTool._pendingGeo.lon)">Save marker</button>
      </div>
    `, 'Add a marker here');
  },

  _pendingGeo: null,

  _placeMarker(label, lat, lon) {
    this._markers.push({lat, lon, type: this._mode, label: label||'', ts: new Date().toISOString()});
    const ok = Store.set('map_markers', this._markers);
    this.draw();
    this.renderSavedLocations();
    if (ok) Toast.show('Marker saved on this device', 'success');
  },

  setMode(mode, btn) {
    this._mode = mode;
    // Only remove active from map-toolbar buttons — not from radio filter bar
    const toolbar = btn ? btn.closest('.map-toolbar') : null;
    const scope = toolbar || document.getElementById('tab-map');
    if (scope) {
      scope.querySelectorAll(toolbar ? '.map-btn' : '.map-toolbar .map-btn').forEach(b => {
        b.classList.remove('active');
        if (b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', 'false');
      });
    }
    if (btn) { btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true'); }
    const canvas = this._canvas;
    if (canvas) canvas.style.cursor = mode === 'select' ? 'grab' : 'crosshair';
  },

  zoomIn()  { this._zoom = Math.min(18, this._zoom + 1); this.draw(); },
  zoomOut() { this._zoom = Math.max(2,  this._zoom - 1); this.draw(); },

  _gpsErrorText(err) {
    const msgs = {
      1: 'ARK is not allowed to see your location. Allow location for this page in your browser settings, then try again.',
      2: 'Your location could not be found. Turn on location on this device, go outside or near a window, then try again.',
      3: 'Finding your location took too long. Go outside or near a window, then try again.'
    };
    return msgs[err && err.code] || 'Your location could not be found. You can still move the map by hand.';
  },

  locateMe() {
    const gps = this._lastGps();
    let hadCached = false;
    if (gps) {
      hadCached = true;
      this._lat = gps.lat; this._lon = gps.lon; this._zoom = 15;
      this.draw();
      const age = gps.ts ? Date.now() - Date.parse(gps.ts) : NaN;
      if (!(age > 5 * 60000)) return; // recent enough
      Toast.show('This is where you were ' + this._ago(age) + ' ago. Looking for where you are now…', 'info', 5000);
    }
    // No recent GPS — request a fresh fix with loading feedback
    if (!navigator.geolocation) {
      if (!hadCached) Toast.show('This device cannot find its location. Move the map by hand instead.', 'warning', 5000);
      return;
    }
    const btn = document.getElementById('map-btn-locate');
    const origHtml = btn ? btn.innerHTML : null;
    const restore = () => { if (btn) { btn.innerHTML = origHtml; btn.disabled = false; } };
    if (btn) { btn.textContent = 'Finding you…'; btn.disabled = true; }
    navigator.geolocation.getCurrentPosition(pos => {
      restore();
      const {latitude: lat, longitude: lon} = pos.coords;
      this._gps = {lat, lon, accuracy: pos.coords.accuracy, ts: new Date().toISOString()};
      Store.set('last_gps', this._gps);
      this._lat = lat; this._lon = lon; this._zoom = 15;
      this.draw();
      this.renderSavedLocations(); // refresh distances
    }, err => {
      restore();
      if (!hadCached) Toast.show(this._gpsErrorText(err), 'warning', 7000);
    }, {enableHighAccuracy: true, timeout: 10000, maximumAge: 30000});
  },

  clearAll() {
    if (!this._markers.length) { Toast.show('There are no markers to remove', 'info'); return; }
    const count = this._markers.length;
    Modal.confirm('Remove all ' + count + ' marker' + (count !== 1 ? 's' : '') + ' from the map? You cannot undo this.', function() {
      MapTool._markers = [];
      Store.set('map_markers', []);
      MapTool.draw();
      MapTool.renderSavedLocations();
      Toast.show('All markers removed', 'info');
    }, 'Remove all', 'Keep them');
  },

  exportImg() {
    if (!this._canvas) { Toast.show('Open the Map screen first, then try again', 'warning'); return; }
    this.draw();
    try {
      const dataUrl = this._canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'ARK-map-' + Date.now() + '.png';
      a.style.display = 'none';
      document.body.appendChild(a); // some browsers ignore clicks on links that are not in the page
      a.click();
      setTimeout(() => a.remove(), 1000);
      Toast.show('A picture of the map was saved to your downloads', 'success');
    } catch(e) {
      Toast.show('The picture could not be saved. Take a screenshot of the map instead.', 'warning', 5000);
      return;
    }
  },

  calcDistance() {
    const out = document.getElementById('dist-result');
    const pa = this._parseLatLon(document.getElementById('dist-a').value);
    const pb = this._parseLatLon(document.getElementById('dist-b').value);
    if (!pa || !pb) {
      if (out) out.textContent = '';
      Toast.show((!pa ? 'Check the From box. ' : 'Check the To box. ') + this._coordHelp, 'error', 7000);
      const bad = document.getElementById(!pa ? 'dist-a' : 'dist-b');
      if (bad) bad.focus();
      return;
    }
    const a = [pa.lat, pa.lon], b = [pb.lat, pb.lon];
    const R = 6371;
    const dLat = (b[0]-a[0]) * Math.PI / 180;
    const dLon = (b[1]-a[1]) * Math.PI / 180;
    const aa = Math.sin(dLat/2)**2 + Math.cos(a[0]*Math.PI/180) * Math.cos(b[0]*Math.PI/180) * Math.sin(dLon/2)**2;
    const dist = R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1-aa));
    const miles = dist * 0.621371;
    // Bearing from A to B
    const y = Math.sin(dLon) * Math.cos(b[0]*Math.PI/180);
    const x = Math.cos(a[0]*Math.PI/180)*Math.sin(b[0]*Math.PI/180) - Math.sin(a[0]*Math.PI/180)*Math.cos(b[0]*Math.PI/180)*Math.cos(dLon);
    const bearing = ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
    if (out) out.innerHTML =
      `<div>Distance in a straight line: <strong>${miles.toFixed(2)} mi</strong> / ${dist.toFixed(2)} km</div>` +
      `<div>Direction to go: <strong>${this._cardinal(bearing)}</strong> (${bearing.toFixed(0)}° on a compass)</div>` +
      `<div class="font-xs text-muted">Roads and paths are usually longer than a straight line.</div>`;
  },

  _cardinal(deg) {
    const directions = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    return directions[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
  },

  fillDistPoint(field) {
    const fill = (g) => {
      const inp = document.getElementById(field);
      if (inp) { inp.value = `${g.lat.toFixed(5)}, ${g.lon.toFixed(5)}`; inp.dispatchEvent(new Event('input')); }
    };
    const last = this._lastGps();
    const useLast = () => {
      if (!last) return false;
      fill(last);
      const age = last.ts ? Date.now() - Date.parse(last.ts) : NaN;
      Toast.show(age > 5 * 60000 ? 'Used your last known location, from ' + this._ago(age) + ' ago' : 'Your location was filled in', age > 5 * 60000 ? 'warning' : 'success', 4000);
      return true;
    };
    if (!navigator.geolocation) {
      if (!useLast()) Toast.show('This device cannot find its location. Type the two numbers by hand.', 'warning', 5000);
      return;
    }
    Toast.show('Finding your location…', 'info', 8000);
    navigator.geolocation.getCurrentPosition(pos => {
      fill({lat: pos.coords.latitude, lon: pos.coords.longitude});
      Toast.show('Your location was filled in', 'success', 2500);
    }, err => {
      if (!useLast()) Toast.show(this._gpsErrorText(err) + ' Or type the two numbers by hand.', 'warning', 7000);
    }, {enableHighAccuracy: true, timeout: 8000, maximumAge: 60000});
  },

  _gps: null,           // newest fix this session (the stored copy is written less often)
  _gpsSavedAt: 0,
  _gpsErrShown: {},     // each kind of location error is announced once, not on every retry
  _watchId: null,
  _centerPending: false,
  // True while the Map screen is the one the person is looking at.
  _mapShowing() {
    const p = document.getElementById('tab-map');
    return !!p && p.classList.contains('active') && !document.hidden;
  },
  // Stop following the location (the newest one is kept). Opening the map starts it again.
  stopGPS() {
    if (this._watchId === null) return;
    try { navigator.geolocation.clearWatch(this._watchId); } catch (e) {}
    this._watchId = null;
    if (this._gps) { this._gpsSavedAt = Date.now(); Store.set('last_gps', this._gps); }
  },
  startGPS(centerOnFirst = false) {
    if (!navigator.geolocation) {
      const el = document.getElementById('gps-coords');
      if (el) el.textContent = 'This device cannot find its location';
      return;
    }
    if (centerOnFirst) this._centerPending = true;
    if (this._watchId !== null) return; // already following
    this._watchId = navigator.geolocation.watchPosition(pos => {
      const {latitude: lat, longitude: lon, accuracy} = pos.coords;
      this._gps = {lat, lon, accuracy, ts: new Date().toISOString()};
      // Phones can report a new position every second; writing each one would wear the battery.
      if (Date.now() - this._gpsSavedAt > 10000) { this._gpsSavedAt = Date.now(); Store.set('last_gps', this._gps); }
      // The person has moved to another screen: keep this location, then stop to save battery.
      if (!this._mapShowing()) { this.stopGPS(); return; }
      const el = document.getElementById('gps-coords');
      if (el) el.textContent = `You are at ${lat.toFixed(5)}, ${lon.toFixed(5)} (within ${Math.round(accuracy)} m)`;
      const dot = document.getElementById('gps-dot');
      const status = document.getElementById('gps-status');
      if (dot) dot.className = 'status-dot dot-green';
      if (status) status.textContent = 'GPS active';
      if (this._centerPending) {
        this._centerPending = false;
        // Do not pull the map away from a place the person has already moved it to.
        if (!this._userMoved) { this._lat = lat; this._lon = lon; this._zoom = 15; }
        this.renderSavedLocations(); // distances to saved places
      }
      this.draw();
    }, err => {
      if (!this._mapShowing()) { this.stopGPS(); return; } // no location warnings on other screens
      const code = (err && err.code) || 0;
      if (!this._gpsErrShown[code]) {
        this._gpsErrShown[code] = true;
        Toast.show(this._gpsErrorText(err), 'warning', 7000);
      }
      // Fall back to last known position if available
      const last = this._lastGps();
      const coords = document.getElementById('gps-coords');
      if (coords) coords.textContent = last
        ? `Last known location: ${last.lat.toFixed(5)}, ${last.lon.toFixed(5)}`
        : 'Location not found. Move the map by hand.';
    }, {enableHighAccuracy: true, maximumAge: 30000});
  },

  _preCaching: false,
  async preCacheArea() {
    if (this._preCaching) { Toast.show('The map is still being saved. Please wait.', 'info'); return; }
    if (navigator.onLine === false) {
      Toast.show('No internet right now, so the map cannot be saved. Places you already looked at will still show.', 'warning', 7000);
      return;
    }
    // Save what the person is looking at. If the map is still zoomed far out, use their own location.
    let pos = null;
    if (this._zoom >= 11) {
      pos = { lat: this._lat, lon: this._lon };
    } else {
      const gps = this._lastGps();
      if (gps) {
        pos = { lat: gps.lat, lon: gps.lon };
        this._lat = gps.lat; this._lon = gps.lon; this._zoom = 14;
        this.draw();
      }
    }
    if (!pos) { Toast.show('Move the map to your area and zoom in first. Then tap Save this area.', 'warning', 6000); return; }

    this._preCaching = true;
    // Ask the browser not to clear ARK's saved map when the device runs low on space.
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) {}
    const btn = document.getElementById('map-btn-cache');
    const origHtml = btn ? btn.innerHTML : null;
    if (btn) btn.disabled = true;

    const _restoreBtn = () => {
      this._preCaching = false;
      if (btn) { btn.innerHTML = origHtml; btn.disabled = false; }
    };

    try {
      const { lat, lon } = pos;
      const zoomMin = 12, zoomMax = 16;
      let total = 0, done = 0, errors = 0;

      function latLonToTile(lat, lon, z) {
        const n = Math.pow(2, z);
        const x = Math.floor((lon + 180) / 360 * n);
        const latRad = lat * Math.PI / 180;
        const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
        return { x, y };
      }

      const tileSets = [];
      for (let z = zoomMin; z <= zoomMax; z++) {
        const n = Math.pow(2, z);
        // Tiles needed to cover roughly 5 km around the point at this zoom (one tile is 40,075 km / n wide).
        // Capped so a tap can never queue more than a few hundred downloads.
        const radius = Math.min(8, Math.max(2, Math.floor(5 / (40075016 / n / 1000))));
        const center = latLonToTile(lat, lon, z);
        for (let dx = -radius; dx <= radius; dx++) {
          for (let dy = -radius; dy <= radius; dy++) {
            const ty = center.y + dy;
            if (ty < 0 || ty >= n) continue; // skip invalid y (poles)
            const tx = ((center.x + dx) % n + n) % n; // wrap x around antimeridian
            tileSets.push({ z, x: tx, y: ty });
          }
        }
      }
      total = tileSets.length;

      if (btn) btn.textContent = `Saving 0/${total}`;
      Toast.show('Saving the map of this area. Keep this screen open until it finishes.', 'info', 5000);

      const batchSize = 6;
      for (let i = 0; i < tileSets.length; i += batchSize) {
        const batch = tileSets.slice(i, i + batchSize);
        await Promise.all(batch.map(async ({z, x, y}) => {
          const key = `${z}/${x}/${y}`;
          try {
            const existing = await DB.getTile(key);
            if (existing) { done++; return; }
            const sub = ['a','b','c'][Math.abs(x + y) % 3];
            const url = `https://${sub}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
            const resp = await fetch(url, {referrerPolicy: 'origin', signal: timeoutSignal(15000)});
            if (resp.ok) {
              const blob = await resp.blob();
              await DB.putTile(key, blob);
              done++;
            } else { errors++; }
          } catch(e) { errors++; }
        }));
        if (btn) btn.textContent = `Saving ${done}/${total}`;
        // Nothing at all is arriving: there is no real internet. Stop instead of making the person wait.
        if (done === 0 && errors >= batchSize * 3) break;
      }

      _restoreBtn();
      this._dropFailedTiles();
      this.draw();
      if (done === 0) {
        Toast.show('The map could not be saved. This needs a working internet connection. Try again when you have one.', 'error', 8000);
      } else if (done < total) {
        Toast.show(`Most of this area is saved (${done} of ${total} pieces). Tap Save this area again to get the rest.`, 'warning', 8000);
      } else {
        Toast.show('This area is saved. The map works here without internet, for about 5 km (3 miles) around.', 'success', 7000);
      }
    } catch (e) {
      console.error('Map save failed', e);
      _restoreBtn();
      Toast.show('The map could not be saved. Please try again.', 'error', 6000);
    }
  },

  startCompass() {
    if (typeof DeviceOrientationEvent === 'undefined') {
      Toast.show('This device has no compass that ARK can use', 'warning', 5000);
      const compassCard = document.getElementById('compass-heading');
      if (compassCard) compassCard.textContent = 'No compass on this device';
      const compassBtn = document.querySelector('[onclick="MapTool.startCompass()"]');
      if (compassBtn) compassBtn.style.display = 'none';
      return;
    }
    if (DeviceOrientationEvent.requestPermission) {
      DeviceOrientationEvent.requestPermission().then(state => {
        if (state === 'granted') {
          this._listenCompass();
        } else {
          Toast.show('The compass was not allowed. Tap Use Device Compass again and choose Allow.', 'warning', 6000);
        }
      }).catch(() => {
        Toast.show('The compass could not be started. Tap Use Device Compass to try again.', 'warning', 6000);
      });
    } else {
      this._listenCompass();
    }
  },

  _compassOn: false,
  _compassSeen: false,
  _listenCompass() {
    if (this._compassOn) { Toast.show('The compass is already on', 'info'); return; }
    this._compassOn = true;
    const headEl = document.getElementById('compass-heading');
    if (headEl) headEl.textContent = 'Starting the compass…';
    // Android only gives a true compass direction on the "absolute" event; the plain event is
    // relative to wherever the phone happened to be pointing when it started.
    const evt = ('ondeviceorientationabsolute' in window) ? 'deviceorientationabsolute' : 'deviceorientation';
    window.addEventListener(evt, e => {
      const hasIOS = e.webkitCompassHeading !== undefined && e.webkitCompassHeading !== null;
      const el = document.getElementById('compass-heading');
      if (!hasIOS && (e.alpha === null || e.alpha === undefined || (evt === 'deviceorientation' && e.absolute !== true))) {
        // No trustworthy reading — say so rather than show a wrong direction.
        if (el && !this._compassSeen) el.textContent = 'No compass on this device';
        return;
      }
      this._compassSeen = true;
      const rawHeading = hasIOS
        ? e.webkitCompassHeading           // iOS: clockwise from north, correct
        : (360 - e.alpha) % 360;           // Android: convert counterclockwise to clockwise
      const h = Math.round(rawHeading) % 360;
      if (el) el.textContent = 'You are facing ' + this._cardinal(h) + ' (' + h + '°). The arrow points north.';
      const compass = document.getElementById('compass-display');
      if (compass) { compass.style.transform = 'rotate(' + (-h) + 'deg)'; compass.style.opacity = '1'; }
    });
    // If nothing arrives, say so instead of leaving the person waiting.
    setTimeout(() => {
      const el = document.getElementById('compass-heading');
      if (!this._compassSeen && el) el.textContent = 'No compass on this device';
    }, 3000);
  },

  renderSavedLocations() {
    const list = document.getElementById('saved-locations');
    if (!list) return;
    if (!this._markers.length) {
      list.innerHTML = '<div class="text-secondary font-sm" style="padding:12px 0;text-align:center">No places saved yet. Pick a marker above and tap the map, or tap Add a place.</div>';
      return;
    }
    const gps = this._lastGps();
    list.innerHTML = this._markers.map((m, i) => {
      if (!m) return '';
      const kind = this._kind(m.type);
      const hasPos = typeof m.lat === 'number' && typeof m.lon === 'number';
      const name = m.label || kind.name;
      let distHtml = '';
      if (gps && hasPos) {
        const R = 6371;
        const dLat = (m.lat - gps.lat) * Math.PI / 180;
        const dLon = (m.lon - gps.lon) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(gps.lat*Math.PI/180) * Math.cos(m.lat*Math.PI/180) * Math.sin(dLon/2)**2;
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const far = dist < 1 ? (dist*1000).toFixed(0) + ' m' : (dist*0.621371).toFixed(1) + ' mi / ' + dist.toFixed(1) + ' km';
        // Which way it is from here, so the person knows where to head.
        let way = '';
        if (dist > 0.02) {
          const by = Math.sin(dLon) * Math.cos(m.lat*Math.PI/180);
          const bx = Math.cos(gps.lat*Math.PI/180) * Math.sin(m.lat*Math.PI/180) - Math.sin(gps.lat*Math.PI/180) * Math.cos(m.lat*Math.PI/180) * Math.cos(dLon);
          way = ', to the ' + this._cardinal(Math.atan2(by, bx) * 180 / Math.PI);
        }
        distHtml = ` · <span style="color:var(--accent)">${far} away${way}</span>`;
      }
      return `
      <div class="member-item">
        <div class="member-avatar" style="color:var(${kind.token})"><svg class="hi" aria-hidden="true"><use href="#i-${kind.icon}"/></svg></div>
        <div style="flex:1;min-width:0">
          <div class="font-sm bold" style="overflow-wrap:anywhere">${esc(name)}</div>
          <div class="font-xs text-muted">${esc(kind.name)}${hasPos ? ' · ' + m.lat.toFixed(5) + ', ' + m.lon.toFixed(5) : ''}${distHtml}</div>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" onclick="MapTool.flyTo(${i})" title="Show on the map" aria-label="Show ${esc(name)} on the map">Show</button>
        <button type="button" class="btn btn-ghost btn-sm" onclick="MapTool.removeMarker(${i})" aria-label="Remove ${esc(name)}" title="Remove"><svg class="hi" aria-hidden="true"><use href="#i-x"/></svg></button>
      </div>`;
    }).join('');
  },

  flyTo(i) {
    const m = this._markers[i];
    if (m && typeof m.lat === 'number' && typeof m.lon === 'number') {
      this._lat = m.lat; this._lon = m.lon; this._zoom = 16;
      this._userMoved = true;
      this.draw();
      // The list sits below the map; bring the map back into view so the tap visibly does something.
      try { this._canvas.scrollIntoView({behavior: 'smooth', block: 'center'}); } catch (e) {}
    }
  },

  removeMarker(i) {
    const m = this._markers[i];
    const label = m ? (m.label || this._kind(m.type).name) : 'this place';
    Modal.confirm(`Remove "${esc(label)}" from the map?`, function() {
      MapTool._markers.splice(i, 1);
      Store.set('map_markers', MapTool._markers);
      MapTool.draw();
      MapTool.renderSavedLocations();
    }, 'Remove', 'Keep it');
  },

  openLocationForm() {
    Modal.open(`
      <label class="form-label" for="loc-name-input">Name</label>
      <input type="text" id="loc-name-input" maxlength="60" class="form-input w-full" placeholder="For example: Community centre" autocomplete="off" style="margin:6px 0 12px">
      <label class="form-label" for="loc-type-val">What is it?</label>
      <select id="loc-type-val" class="form-input w-full" style="margin:6px 0 12px">
        <option value="meeting">Meeting point</option>
        <option value="water">Water</option>
        <option value="shelter">Shelter</option>
        <option value="hazard">Hazard (danger)</option>
        <option value="medical">Medical help</option>
      </select>
      <label class="form-label" for="loc-coords-input">Where (latitude, longitude)</label>
      <div class="flex" style="gap:6px;margin:6px 0 6px">
        <input type="text" id="loc-coords-input" maxlength="60" class="form-input" placeholder="37.7749, -122.4194" autocomplete="off" style="flex:1;min-width:0">
        <button type="button" class="btn btn-ghost btn-sm" onclick="MapTool.fillDistPoint('loc-coords-input')" aria-label="Use my location" style="flex-shrink:0;white-space:nowrap"><svg class="hi" aria-hidden="true"><use href="#i-user"/></svg> Me</button>
      </div>
      <div class="font-xs text-muted mb-12">Leave this empty to use the middle of the map as it is shown now.</div>
      <div class="flex gap-8 wrap" style="justify-content:flex-end">
        <button type="button" class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
        <button type="button" class="btn btn-primary" onclick="MapTool._doAddLocation(document.getElementById('loc-name-input').value.trim(),document.getElementById('loc-coords-input').value.trim(),document.getElementById('loc-type-val').value)">Save place</button>
      </div>
    `, 'Add a place');
  },

  _doAddLocation(name, coords, type) {
    let lat = this._lat, lon = this._lon;
    if (coords) {
      const p = this._parseLatLon(coords);
      if (!p) {
        Toast.show(this._coordHelp, 'error', 7000);
        const inp = document.getElementById('loc-coords-input');
        if (inp) { inp.setAttribute('aria-invalid', 'true'); inp.focus(); }
        return;
      }
      lat = p.lat; lon = p.lon;
    }
    Modal.close();
    this._markers.push({lat, lon, type: type||'meeting', label: name || '', ts: new Date().toISOString()});
    const ok = Store.set('map_markers', this._markers);
    this._lat = lat; this._lon = lon; this._zoom = 15;
    this._userMoved = true;
    this.draw();
    this.renderSavedLocations();
    if (ok) Toast.show(coords ? 'Place saved on this device' : 'Place saved at the middle of the map', 'success', 4000);
  }
};

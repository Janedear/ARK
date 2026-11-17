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
  _getTile(z, x, y) {
    const key = z + '/' + x + '/' + y;
    // 1) Already in memory — return instantly
    if (this._tileCache[key]) return this._tileCache[key];
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
        img.onerror = () => { img._failed = true; this._fetchTileFromNetwork(img, key, z, x, y); };
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
    fetch(url, {referrerPolicy: 'origin'}).then(r => {
      if (!r.ok) throw new Error('tile ' + r.status);
      return r.blob();
    }).then(blob => {
      DB.putTile(key, blob).catch(()=>{}); // persist asynchronously
      const objUrl = URL.createObjectURL(blob);
      img.onload = () => { URL.revokeObjectURL(objUrl); this.draw(); };
      img.onerror = () => { img._failed = true; };
      img.src = objUrl;
    }).catch(() => { img._failed = true; this.draw(); });
  },

  // ── Draw ───────────────────────────────────────────────────────────────────
  draw() {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const W = this._canvas.width, H = this._canvas.height;
    const ts = this._tileSize;
    const z = this._zoom;
    const n = Math.pow(2, z);

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#1a2235'; // ocean/bg color
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
          // Failed tile — gray placeholder
          ctx.fillStyle = '#24272c';
          ctx.fillRect(Math.round(canX), Math.round(canY), ts - 1, ts - 1);
          tilesFailed++;
        } else {
          // placeholder while loading
          ctx.fillStyle = '#24272c';
          ctx.fillRect(Math.round(canX), Math.round(canY), ts - 1, ts - 1);
          ctx.fillStyle = '#3a3f47';
          ctx.font = '11px sans-serif';
          ctx.fillText('loading…', Math.round(canX) + 8, Math.round(canY) + 20);
          tilesLoading++;
        }
      }
    }

    // Offline tile overlay — full: no tiles at all; partial: some failed some loaded
    if (tilesFailed > 0 && tilesDrawn === 0 && tilesLoading === 0) {
      // Complete offline — no cached tiles for this area
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, H / 2 - 36, W, 72);
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 14px "Geist",system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚠ Tiles unavailable offline', W / 2, H / 2 - 10);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px "Geist",system-ui,sans-serif';
      ctx.fillText('Connect to the internet or tap 📥 Cache Area first', W / 2, H / 2 + 12);
      ctx.textAlign = 'left';
    } else if (tilesFailed > 0 && tilesLoading === 0) {
      // Partial offline — some tiles missing (not yet cached); banner above scale+attribution
      ctx.fillStyle = 'rgba(245,158,11,0.9)';
      ctx.fillRect(0, H - 66, W, 20);
      ctx.fillStyle = '#1a1a1a';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`⚠ ${tilesFailed} tile${tilesFailed > 1 ? 's' : ''} not cached — tap 📥 Cache Area for full offline use`, W / 2, H - 52);
      ctx.textAlign = 'left';
    }

    // OSM attribution (required)
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(0, H - 18, W, 18);
    ctx.fillStyle = '#333';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('© OpenStreetMap contributors', 4, H - 5);

    // Markers
    const icons = {meeting:'📍',water:'💧',shelter:'🏠',hazard:'⚠️',medical:'🏥',gps:'📶'};
    this._markers.forEach(m => {
      if (m.lat == null || m.lon == null) return; // skip legacy pixel-only markers
      const {x, y} = this._latLonToCanvas(m.lat, m.lon);
      if (x < -20 || x > W + 20 || y < -20 || y > H + 20) return; // off-screen
      ctx.font = '22px serif';
      ctx.textAlign = 'center';
      ctx.fillText(icons[m.type] || '📌', x, y);
      if (m.label) {
        ctx.font = 'bold 11px "Geist",system-ui,sans-serif';
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = 3;
        ctx.strokeText(m.label, x, y + 16);
        ctx.fillText(m.label, x, y + 16);
      }
    });
    ctx.textAlign = 'left';

    // GPS dot
    const gps = Store.get('last_gps');
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

    // Zoom label
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(W - 50, 6, 44, 20);
    ctx.fillStyle = '#fff';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('z' + z, W - 8, 20);
    ctx.textAlign = 'left';

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
    const label = niceMeters >= 1000 ? (niceMeters / 1000).toFixed(niceMeters >= 10000 ? 0 : 1) + ' km' : niceMeters + ' m';
    const sbX = 10, sbY = H - 28;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(sbX - 2, sbY - 10, barPx + 4, 18);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(sbX, sbY - 4, barPx, 4);
    ctx.fillStyle = '#333';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, sbX, sbY - 6);
  },

  // ── Init + events ──────────────────────────────────────────────────────────
  init() {
    if (this._inited) return;
    this._inited = true;
    const canvas = document.getElementById('map-canvas');
    if (!canvas) return;
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
    this._markers = Store.get('map_markers', []);

    // Resize canvas to fit container — taller on mobile for usable map area
    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = Math.min(Math.round(rect.width) || 860, 1200);
      const isMobile = canvas.width < 500;
      canvas.height = Math.round(canvas.width * (isMobile ? 0.75 : 0.52));
      this.draw();
    };
    resize();
    window.addEventListener('resize', resize);

    // If GPS available, center on user
    this.startGPS(true);

    // Click: place marker or pan
    canvas.addEventListener('click', e => this._onClick(e));

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
    canvas.addEventListener('touchend', () => { this._drag = false; this._pinchDist = 0; this._didDrag = false; });

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
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this._didDrag = true;
    const n = Math.pow(2, this._zoom);
    const ts = this._tileSize;
    // convert pixel delta to lon/lat delta
    const dLon = -dx / (ts * n) * 360;
    const startLatR = this._dragStartLat * Math.PI / 180;
    const startTY = (1 - Math.log(Math.tan(startLatR) + 1 / Math.cos(startLatR)) / Math.PI) / 2 * n;
    const newTY = startTY + dy / ts;
    const newLat = Math.atan(Math.sinh(Math.PI * (1 - 2 * newTY / n))) * 180 / Math.PI;
    this._lat = Math.max(-85, Math.min(85, newLat));
    this._lon = this._dragStartLon + dLon;
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
    Modal.open(`
      <p style="margin:0 0 12px">Give this marker a short label (optional).</p>
      <label class="font-sm semibold">Label</label>
      <input type="text" id="marker-label-input" maxlength="60" class="form-input w-full" placeholder="e.g. Food stash, Road block…" style="margin:6px 0 16px">
      <div class="font-xs text-muted mb-12">📍 ${lat.toFixed(5)}, ${lon.toFixed(5)}</div>
      <div class="flex gap-8" style="justify-content:flex-end">
        <button class="btn btn-ghost" onclick="Modal.close();MapTool._placeMarker('',MapTool._pendingGeo.lat,MapTool._pendingGeo.lon)">No label</button>
        <button class="btn btn-primary" onclick="Modal.close();MapTool._placeMarker(document.getElementById('marker-label-input').value.trim(),MapTool._pendingGeo.lat,MapTool._pendingGeo.lon)">Place Marker</button>
      </div>
    `, '📌 Label This Marker');
  },

  _pendingGeo: null,

  _placeMarker(label, lat, lon) {
    this._markers.push({lat, lon, type: this._mode, label: label||'', ts: new Date().toISOString()});
    Store.set('map_markers', this._markers);
    this.draw();
    this.renderSavedLocations();
  },

  setMode(mode, btn) {
    this._mode = mode;
    // Only remove active from map-toolbar buttons — not from radio filter bar
    const toolbar = btn ? btn.closest('.map-toolbar') : null;
    if (toolbar) {
      toolbar.querySelectorAll('.map-btn').forEach(b => b.classList.remove('active'));
    } else {
      // Fallback: scope to map canvas toolbar only (first .map-toolbar in map tab)
      const mapTab = document.getElementById('tab-map');
      if (mapTab) mapTab.querySelectorAll('.map-toolbar .map-btn').forEach(b => b.classList.remove('active'));
    }
    if (btn) btn.classList.add('active');
    const canvas = this._canvas;
    if (canvas) canvas.style.cursor = mode === 'select' ? 'grab' : 'crosshair';
  },

  zoomIn()  { this._zoom = Math.min(18, this._zoom + 1); this.draw(); },
  zoomOut() { this._zoom = Math.max(2,  this._zoom - 1); this.draw(); },

  locateMe() {
    const gps = Store.get('last_gps');
    if (gps) {
      this._lat = gps.lat; this._lon = gps.lon; this._zoom = 15;
      this.draw();
      return;
    }
    // No cached GPS — request fresh fix with loading feedback
    if (!navigator.geolocation) {
      Toast.show('GPS not supported on this device', 'warning', 4000); return;
    }
    const btn = document.getElementById('map-btn-locate');
    const origText = btn ? btn.textContent : null;
    if (btn) { btn.textContent = '⏳ Locating…'; btn.style.pointerEvents = 'none'; }
    navigator.geolocation.getCurrentPosition(pos => {
      if (btn) { btn.textContent = origText; btn.style.pointerEvents = ''; }
      const {latitude: lat, longitude: lon} = pos.coords;
      Store.set('last_gps', {lat, lon, accuracy: pos.coords.accuracy, ts: new Date().toISOString()});
      this._lat = lat; this._lon = lon; this._zoom = 15;
      this.draw();
      this.renderSavedLocations(); // refresh distances
    }, err => {
      if (btn) { btn.textContent = origText; btn.style.pointerEvents = ''; }
      const msgs = {1:'GPS permission denied — tap the lock icon to enable location',2:'GPS unavailable — check device location settings',3:'GPS timed out — try again'};
      Toast.show(msgs[err.code] || err.message, 'warning', 6000);
    }, {enableHighAccuracy: true, timeout: 10000, maximumAge: 30000});
  },

  clearAll() {
    Modal.confirm('Remove all markers from the map? This cannot be undone.', function() {
      MapTool._markers = [];
      Store.set('map_markers', []);
      MapTool.draw();
      MapTool.renderSavedLocations();
    }, 'Clear All', 'Cancel');
  },

  exportImg() {
    if (!this._canvas) { Toast.show('Map not loaded yet — open the map tab first', 'warning'); return; }
    this.draw();
    try {
      const dataUrl = this._canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'ARK-map-' + Date.now() + '.png';
      a.click();
      Toast.show('📸 Map image saved to your downloads', 'success');
    } catch(e) {
      Toast.show('Map export blocked — tiles loaded cross-origin. Try after full tile cache.', 'warning');
      return;
    }
  },

  calcDistance() {
    const a = document.getElementById('dist-a').value.trim().split(',').map(Number);
    const b = document.getElementById('dist-b').value.trim().split(',').map(Number);
    if (a.length !== 2 || b.length !== 2 || a.some(isNaN) || b.some(isNaN)) {
      Toast.show('Those coordinates don\'t look right — check the format and try again', 'error'); return;
    }
    if (Math.abs(a[0]) > 90 || Math.abs(b[0]) > 90) {
      Toast.show('Latitude must be between -90 and 90', 'error'); return;
    }
    if (Math.abs(a[1]) > 180 || Math.abs(b[1]) > 180) {
      Toast.show('Longitude must be between -180 and 180', 'error'); return;
    }
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
    const directions = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    const cardinal = directions[Math.round(bearing / 22.5) % 16];
    document.getElementById('dist-result').innerHTML =
      `<div>Distance: <strong>${dist.toFixed(2)} km</strong> / ${miles.toFixed(2)} mi</div>` +
      `<div>Bearing A→B: <strong>${bearing.toFixed(1)}° ${cardinal}</strong></div>`;
  },

  fillDistPoint(field) {
    if (!navigator.geolocation) { Toast.show('GPS not available', 'warning'); return; }
    navigator.geolocation.getCurrentPosition(pos => {
      const val = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
      const inp = document.getElementById(field);
      if (inp) inp.value = val;
      Toast.show('📍 Coordinates filled from GPS', 'success', 2000);
    }, err => {
      Toast.show('GPS unavailable — enter coordinates manually', 'warning');
    }, {enableHighAccuracy: true, timeout: 8000, maximumAge: 60000});
  },

  startGPS(centerOnFirst = false) {
    if (!navigator.geolocation) {
      const el = document.getElementById('gps-coords');
      if (el) el.textContent = 'GPS: not supported';
      return;
    }
    let centered = false;
    navigator.geolocation.watchPosition(pos => {
      const {latitude: lat, longitude: lon, accuracy} = pos.coords;
      Store.set('last_gps', {lat, lon, accuracy, ts: new Date().toISOString()});
      const el = document.getElementById('gps-coords');
      if (el) el.textContent = `GPS: ${lat.toFixed(5)}, ${lon.toFixed(5)} (±${Math.round(accuracy)}m)`;
      const dot = document.getElementById('gps-dot');
      const status = document.getElementById('gps-status');
      if (dot) dot.className = 'status-dot dot-green';
      if (status) status.textContent = 'GPS active';
      if (centerOnFirst && !centered) {
        centered = true;
        this._lat = lat; this._lon = lon; this._zoom = 15;
      }
      this.draw();
    }, err => {
      const msgs = {
        1: 'GPS permission denied — tap the lock icon to enable location',
        2: 'GPS unavailable — check device location settings',
        3: 'GPS timed out — retrying…'
      };
      const msg = msgs[err.code] || err.message;
      Toast.show(msg, 'warning', 6000);
      // Fall back to last known position if available
      const last = Store.get('last_gps', null);
      if (last) {
        const coords = document.getElementById('gps-coords');
        if (coords) coords.textContent = `Last known: ${last.lat.toFixed(5)}, ${last.lon.toFixed(5)}`;
      }
    }, {enableHighAccuracy: true, maximumAge: 30000});
  },

  _preCaching: false,
  async preCacheArea() {
    if (this._preCaching) { Toast.show('Cache already in progress — please wait', 'info'); return; }
    if (!navigator.onLine) { Toast.show('Already offline — tiles cached from previous visits will work', 'info'); return; }
    // Use the GPS fix if there is one, otherwise the middle of the map as it is shown now.
    const pos = Store.get('last_gps', null) || { lat: this._lat, lon: this._lon };
    if (!pos || typeof pos.lat !== 'number' || typeof pos.lon !== 'number') { Toast.show('Move the map to your area first, then tap Cache Area', 'warning', 5000); return; }

    this._preCaching = true;
    const btn = document.getElementById('map-btn-cache');
    const origBtnText = btn ? btn.textContent : null;
    if (btn) { btn.style.pointerEvents = 'none'; }

    const _restoreBtn = () => {
      this._preCaching = false;
      if (btn) { btn.textContent = origBtnText || '📥 Cache Area'; btn.style.pointerEvents = ''; }
    };

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

    if (btn) btn.textContent = `⏳ 0/${total}`;
    Toast.show(`Caching ${total} tiles for offline use…`, 'info', 4000);

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
          const resp = await fetch(url);
          if (resp.ok) {
            const blob = await resp.blob();
            await DB.putTile(key, blob);
            done++;
          }
        } catch(e) { errors++; }
      }));
      if (btn) btn.textContent = `⏳ ${done}/${total}`;
    }

    _restoreBtn();
    Toast.show(`✓ Cached ${done} tiles for offline use${errors ? ` (${errors} failed)` : ''}`, 'success', 5000);
  },

  startCompass() {
    if (typeof DeviceOrientationEvent === 'undefined') {
      Toast.show('Compass not supported on this device', 'warning');
      const compassCard = document.getElementById('compass-heading');
      if (compassCard) compassCard.textContent = 'Compass: not available on this device';
      const compassBtn = document.querySelector('[onclick="MapTool.startCompass()"]');
      if (compassBtn) compassBtn.style.display = 'none';
      return;
    }
    if (DeviceOrientationEvent.requestPermission) {
      DeviceOrientationEvent.requestPermission().then(state => {
        if (state === 'granted') {
          this._listenCompass();
        } else {
          Toast.show('Compass permission denied — check device settings', 'warning');
        }
      }).catch(() => {
        Toast.show('Compass permission request failed', 'warning');
      });
    } else {
      this._listenCompass();
    }
  },

  _listenCompass() {
    // Android only gives a true compass direction on the "absolute" event; the plain event is
    // relative to wherever the phone happened to be pointing when it started.
    const evt = ('ondeviceorientationabsolute' in window) ? 'deviceorientationabsolute' : 'deviceorientation';
    window.addEventListener(evt, e => {
      const hasIOS = e.webkitCompassHeading !== undefined && e.webkitCompassHeading !== null;
      const el = document.getElementById('compass-heading');
      if (!hasIOS && (e.alpha === null || e.alpha === undefined || (evt === 'deviceorientation' && e.absolute !== true))) {
        // No trustworthy reading — say so rather than show a wrong direction.
        if (el) el.textContent = 'Compass not available on this device';
        return;
      }
      const rawHeading = hasIOS
        ? e.webkitCompassHeading           // iOS: clockwise from north, correct
        : (360 - e.alpha) % 360;           // Android: convert counterclockwise to clockwise
      const h = Math.round(rawHeading);
      if (el) el.textContent = 'Heading: ' + h + '°';
      const compass = document.getElementById('compass-display');
      if (compass) compass.style.transform = 'rotate(' + (-h) + 'deg)';
    });
    Toast.show('🧭 Compass is now active', 'success');
  },

  renderSavedLocations() {
    const list = document.getElementById('saved-locations');
    if (!list) return;
    if (!this._markers.length) {
      list.innerHTML = '<div class="text-secondary font-sm" style="padding:12px 0;text-align:center">No locations saved — tap the map or use Add Location</div>';
      return;
    }
    const icons = {meeting:'📍',water:'💧',shelter:'🏠',hazard:'⚠️',medical:'🏥',gps:'📶'};
    const gps = Store.get('last_gps', null);
    list.innerHTML = this._markers.map((m, i) => {
      let distHtml = '';
      if (gps && m.lat != null) {
        const R = 6371;
        const dLat = (m.lat - gps.lat) * Math.PI / 180;
        const dLon = (m.lon - gps.lon) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(gps.lat*Math.PI/180) * Math.cos(m.lat*Math.PI/180) * Math.sin(dLon/2)**2;
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        distHtml = ` · <span style="color:var(--accent)">${dist < 1 ? (dist*1000).toFixed(0)+'m' : dist.toFixed(2)+'km'}</span>`;
      }
      return `
      <div class="member-item">
        <div class="member-avatar" style="font-size:20px">${icons[m.type]||'📌'}</div>
        <div style="flex:1">
          <div class="font-sm bold">${esc(m.label || m.type)}</div>
          <div class="font-xs text-muted">${esc(m.type)} · ${m.lat != null ? m.lat.toFixed(4)+', '+m.lon.toFixed(4) : ''}${distHtml}</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="MapTool.flyTo(${i})" title="Fly to" aria-label="Fly to location" style="margin-right:4px">🎯</button>
        <button class="btn btn-ghost btn-sm" onclick="MapTool.removeMarker(${i})" aria-label="Remove marker" title="Remove">✕</button>
      </div>`;
    }).join('');
  },

  flyTo(i) {
    const m = this._markers[i];
    if (m && m.lat != null) {
      this._lat = m.lat; this._lon = m.lon; this._zoom = 16;
      this.draw();
    }
  },

  removeMarker(i) {
    const m = this._markers[i];
    const label = m ? (m.label || m.type || 'this location') : 'this location';
    Modal.confirm(`Remove "${esc(label)}" from the map?`, function() {
      MapTool._markers.splice(i, 1);
      Store.set('map_markers', MapTool._markers);
      MapTool.draw();
      MapTool.renderSavedLocations();
    }, 'Remove', 'Cancel');
  },

  openLocationForm() {
    Modal.open(`
      <p style="margin:0 0 12px">Add a location by coordinates.</p>
      <label class="font-sm semibold">Location Name</label>
      <input type="text" id="loc-name-input" maxlength="60" class="form-input w-full" placeholder="e.g. Community Center" style="margin:6px 0 12px">
      <label class="font-sm semibold">Coordinates (lat, lon)</label>
      <input type="text" id="loc-coords-input" maxlength="60" class="form-input w-full" placeholder="e.g. 37.7749, -122.4194" style="margin:6px 0 12px">
      <label class="font-sm semibold">Type</label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:6px 0 16px">
        <button class="btn btn-ghost loc-type-btn" style="justify-content:flex-start" onclick="document.querySelectorAll('.loc-type-btn').forEach(b=>b.style.outline='');this.style.outline='2px solid var(--accent)';document.getElementById('loc-type-val').value='meeting'">📍 Meeting Point</button>
        <button class="btn btn-ghost loc-type-btn" style="justify-content:flex-start" onclick="document.querySelectorAll('.loc-type-btn').forEach(b=>b.style.outline='');this.style.outline='2px solid var(--accent)';document.getElementById('loc-type-val').value='water'">💧 Water Source</button>
        <button class="btn btn-ghost loc-type-btn" style="justify-content:flex-start" onclick="document.querySelectorAll('.loc-type-btn').forEach(b=>b.style.outline='');this.style.outline='2px solid var(--accent)';document.getElementById('loc-type-val').value='shelter'">🏠 Shelter</button>
        <button class="btn btn-ghost loc-type-btn" style="justify-content:flex-start" onclick="document.querySelectorAll('.loc-type-btn').forEach(b=>b.style.outline='');this.style.outline='2px solid var(--accent)';document.getElementById('loc-type-val').value='hazard'">⚠️ Hazard Zone</button>
        <button class="btn btn-ghost loc-type-btn" style="justify-content:flex-start;grid-column:1/-1" onclick="document.querySelectorAll('.loc-type-btn').forEach(b=>b.style.outline='');this.style.outline='2px solid var(--accent)';document.getElementById('loc-type-val').value='medical'">🏥 Medical</button>
      </div>
      <input type="hidden" id="loc-type-val" value="meeting">
      <div class="flex gap-8" style="justify-content:flex-end">
        <button class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="MapTool._doAddLocation(document.getElementById('loc-name-input').value.trim(),document.getElementById('loc-coords-input').value.trim(),document.getElementById('loc-type-val').value)">Add Location</button>
      </div>
    `, '🗺️ Add Location');
  },

  _doAddLocation(name, coords, type) {
    if (!name) {
      const inp = document.getElementById('loc-name-input');
      if (inp) {
        inp.style.borderColor = 'var(--error, #ef4444)';
        inp.setAttribute('aria-invalid', 'true');
        let err = document.getElementById('loc-name-error');
        if (!err) {
          err = document.createElement('div');
          err.id = 'loc-name-error';
          err.style.cssText = 'color:var(--error,#ef4444);font-size:12px;margin-top:-8px;margin-bottom:8px';
          err.textContent = 'Location name is required';
          inp.parentNode.insertBefore(err, inp.nextSibling);
        }
        inp.focus();
      }
      return;
    }
    let lat = this._lat, lon = this._lon;
    if (coords) {
      const parts = coords.split(',').map(Number);
      if (parts.length === 2 && !parts.some(isNaN)) {
        const pLat = parts[0], pLon = parts[1];
        if (pLat < -90 || pLat > 90) { Toast.show('Latitude must be between -90 and 90', 'error'); return; }
        if (pLon < -180 || pLon > 180) { Toast.show('Longitude must be between -180 and 180', 'error'); return; }
        lat = pLat; lon = pLon;
      } else {
        Toast.show('Coordinates not recognised — use format: 37.7749, -122.4194', 'error'); return;
      }
    }
    Modal.close();
    this._markers.push({lat, lon, type: type||'meeting', label: name, ts: new Date().toISOString()});
    Store.set('map_markers', this._markers);
    this._lat = lat; this._lon = lon; this._zoom = 15;
    this.draw();
    this.renderSavedLocations();
  }
};


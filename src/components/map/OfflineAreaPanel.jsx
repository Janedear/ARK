import React, { useMemo, useRef, useState } from 'react';
import { Download, Trash2, XCircle } from 'lucide-react';
import {
  MAX_TILES, cachedTileStats, clearCachedTiles, downloadArea, formatBytes, tilesForArea,
} from '@/components/map/tileCache';

const RADIUS_OPTIONS = [1, 3, 8];
const ZOOM_OPTIONS = [10, 11, 12, 13, 14, 15, 16, 17];

export default function OfflineAreaPanel({ view, stats, onStatsChange }) {
  const [radiusKm, setRadiusKm] = useState(3);
  const [minZoom, setMinZoom] = useState(12);
  const [maxZoom, setMaxZoom] = useState(15);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const cancelled = useRef(false);

  const topZoom = Math.max(minZoom, maxZoom);
  const area = { lat: view.lat, lng: view.lng, radiusKm, minZoom, maxZoom: topZoom };
  const planned = useMemo(
    () => tilesForArea(area).length,
    [view.lat, view.lng, radiusKm, minZoom, topZoom],
  );
  const tooMany = planned > MAX_TILES;

  const start = async () => {
    setError(null);
    setMessage(null);
    cancelled.current = false;
    setBusy(true);
    setProgress({ done: 0, total: planned });
    try {
      const result = await downloadArea(area, setProgress, () => cancelled.current);
      setMessage(`Saved ${result.saved} new square${result.saved === 1 ? '' : 's'}${result.skipped ? `, ${result.skipped} already saved` : ''}${result.failed ? `, ${result.failed} could not be fetched` : ''}.`);
      onStatsChange(await cachedTileStats());
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const clear = async () => {
    if (!window.confirm('Delete every map square saved in this browser? Areas you downloaded will stop showing without a connection.')) return;
    await clearCachedTiles();
    onStatsChange(await cachedTileStats());
    setMessage('Saved map squares deleted.');
  };

  return <section className="ll-card">
    <h2>Save this area for no-signal use</h2>
    <p className="ll-muted">
      Downloads the map around the centre of the screen into this browser. Free OpenStreetMap data, no key or account.
      Keep it modest: a few hundred squares per download, not a bulk map copy.
    </p>

    <div className="ll-two">
      <label className="ll-field"><span>Radius around centre</span>
        <select value={radiusKm} onChange={e => setRadiusKm(Number(e.target.value))}>
          {RADIUS_OPTIONS.map(km => <option key={km} value={km}>{km} km</option>)}
        </select>
      </label>
      <label className="ll-field"><span>Detail level (zoom)</span>
        <select value={minZoom} onChange={e => { const value = Number(e.target.value); setMinZoom(value); if (value > maxZoom) setMaxZoom(value); }}>
          {ZOOM_OPTIONS.map(z => <option key={z} value={z}>from {z}</option>)}
        </select>
      </label>
    </div>
    <label className="ll-field"><span>Most detailed level</span>
      <select value={topZoom} onChange={e => setMaxZoom(Number(e.target.value))}>
        {ZOOM_OPTIONS.filter(z => z >= minZoom).map(z => <option key={z} value={z}>up to {z}</option>)}
      </select>
    </label>

    <p className="ll-muted" style={{ marginTop: 8 }}>
      {tooMany
        ? `${planned} squares needed — over the ${MAX_TILES} limit. Reduce the radius or narrow the zoom range.`
        : `${planned} squares needed. Lower zoom covers more ground with less detail.`}
    </p>

    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
      <button className="ll-btn" onClick={start} disabled={busy || tooMany || planned === 0}>
        <Download size={16} style={{ marginRight: 6 }} />{busy ? 'Saving…' : 'Save this area'}
      </button>
      {busy && <button className="ll-btn" onClick={() => { cancelled.current = true; }}>
        <XCircle size={16} style={{ marginRight: 6 }} />Stop
      </button>}
      <button className="ll-btn" onClick={clear} disabled={busy || !stats.count}>
        <Trash2 size={16} style={{ marginRight: 6 }} />Delete saved squares
      </button>
    </div>

    {progress && <div>
      <div className="ark-map-progress"><span style={{ width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%` }} /></div>
      <p className="ll-muted">{progress.done} of {progress.total} squares</p>
    </div>}

    {message && <p className="ll-chip ok" style={{ marginTop: 10 }}>{message}</p>}
    {error && <p className="ll-chip" style={{ marginTop: 10 }}>{error}</p>}

    <div className="ll-eyebrow" style={{ marginTop: 14 }}>
      Saved in this browser: {stats.count} squares · {stats.count ? formatBytes(stats.bytes) : 'nothing yet'}
      {stats.last ? ` · last saved ${new Date(stats.last).toLocaleString()}` : ''}
    </div>
  </section>;
}
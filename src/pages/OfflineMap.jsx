import React, { useCallback, useEffect, useState } from 'react';
import { LocateFixed } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import MapCanvas from '@/components/map/MapCanvas';
import MapLegend from '@/components/map/MapLegend';
import OfflineAreaPanel from '@/components/map/OfflineAreaPanel';
import { CATEGORY_COLORS, hasCoords } from '@/components/map/mapConfig';
import { cachedTileStats } from '@/components/map/tileCache';
import '@/components/lifeline/lifeline.css';
import '@/components/map/map.css';

export default function OfflineMap() {
  const [listings, setListings] = useState([]);
  const [view, setView] = useState({ lat: 39.5, lng: -98.35, zoom: 4 });
  const [focus, setFocus] = useState(null);
  const [stats, setStats] = useState({ count: 0, bytes: 0, last: 0 });
  const [misses, setMisses] = useState(0);
  const [geoError, setGeoError] = useState(null);

  useEffect(() => {
    base44.entities.Resource.list({ limit: 100 })
      .then(result => setListings(result.items || []))
      .catch(() => setListings([]));
    cachedTileStats().then(setStats).catch(() => {});
  }, []);

  const onMissingTile = useCallback(() => setMisses(count => count + 1), []);

  const locate = () => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError('This browser cannot report a location. Pan the map to your area instead.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => setFocus({ lat: position.coords.latitude, lng: position.coords.longitude, zoom: 14, at: Date.now() }),
      () => setGeoError('Location was refused or unavailable. Pan the map to your area instead.'),
      { timeout: 8000 },
    );
  };

  const counts = listings.filter(hasCoords).reduce((acc, listing) => {
    if (CATEGORY_COLORS[listing.category]) acc[listing.category] = (acc[listing.category] || 0) + 1;
    return acc;
  }, {});
  const pinned = Object.values(counts).reduce((sum, n) => sum + n, 0);

  return <div className="ll-page">
    <span className="ll-eyebrow">Offline map</span>
    <h1 style={{ margin: '10px 0 8px' }}>Save a map before you need it</h1>
    <p className="ll-muted">
      Map data from OpenStreetMap, a free and openly licensed map of the world. ARK stores the squares you download in this
      browser so the map still draws when the signal is gone. No key, no account, no cost.
    </p>

    <div className="ll-alert">
      <strong>What this cannot do</strong>
      No search, no directions, no live road or hazard conditions, and nothing outside the area and zoom levels you saved.
      The app itself must already be open or load from this browser's cache — a cold start with no signal can still fail.
      The printed packet remains the durable fallback.
    </div>

    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '14px 0' }}>
      <button className="ll-btn" onClick={locate}><LocateFixed size={16} style={{ marginRight: 6 }} />Centre on my location</button>
      <span className="ll-chip">{stats.count} map squares saved offline</span>
    </div>
    {geoError && <p className="ll-chip warn">{geoError}</p>}
    {misses > 0 && <p className="ll-muted">
      {misses} map square{misses === 1 ? '' : 's'} could not be drawn — that area is not saved and there is no connection.
      Save a wider area, or reconnect to fetch it once.
    </p>}

    <MapCanvas
      listings={listings}
      focus={focus}
      onViewChange={next => setView(next)}
      onMissingTile={onMissingTile}
    />

    <MapLegend counts={counts} />
    <p className="ll-muted" style={{ marginTop: 8 }}>
      {pinned === 0
        ? 'No resource listing has a map position yet. An administrator can add coordinates when creating a listing.'
        : `${pinned} resource listing${pinned === 1 ? '' : 's'} shown. Tap a dot for details and the date it was last checked.`}
    </p>

    <OfflineAreaPanel view={view} stats={stats} onStatsChange={setStats} />

    <div className="ll-eyebrow" style={{ marginTop: 18 }}>
      Map data © OpenStreetMap contributors, used under the Open Database Licence. Public tiles are for light personal caching only.
    </div>
  </div>;
}
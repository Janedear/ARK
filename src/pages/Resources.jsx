import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { MapPin } from 'lucide-react';
import useUserArea from '@/components/resources/useUserArea';
import AreaSetup from '@/components/resources/AreaSetup';
import ResourceCard from '@/components/resources/ResourceCard';
import AddResourceForm from '@/components/resources/AddResourceForm';
import { distanceMiles, hasPosition } from '@/lib/geo';
import '@/components/lifeline/lifeline.css';

const categories = ['water', 'food', 'shelter', 'medical', 'charging', 'supplies', 'information'];
const radii = [1, 5, 15, 30, 60];

function areaMatches(resourceArea, userArea) {
  if (!resourceArea || !userArea) return false;
  const listed = resourceArea.toLowerCase().trim();
  const town = userArea.split(',')[0].trim().toLowerCase();
  return listed.includes(town) || town.includes(listed);
}

export default function Resources() {
  const { user, coords, areaLabel, loading: areaLoading, save } = useUserArea();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('all');
  const [radius, setRadius] = useState(15);
  const [editingArea, setEditingArea] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await base44.entities.Resource.list({ sort: '-created_date', limit: 300 });
    setItems(res.items || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const nearby = useMemo(() => {
    const mine = items.filter(r => user && r.created_by_id === user.id);
    const pool = coords ? items : mine;
    return pool
      .map(resource => ({
        resource,
        distance: coords && hasPosition(resource)
          ? distanceMiles(coords, { lat: resource.latitude, lon: resource.longitude })
          : null,
      }))
      .filter(({ resource, distance }) => {
        if (cat !== 'all' && resource.category !== cat) return false;
        if (!coords) return true;
        if (distance != null) return distance <= radius;
        return areaMatches(resource.area, areaLabel);
      })
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  }, [items, user, coords, areaLabel, cat, radius]);

  const addListing = async data => {
    await base44.entities.Resource.create(data);
    await load();
  };

  const removeListing = async resource => {
    if (!window.confirm(`Remove ${resource.name}? This cannot be undone.`)) return;
    await base44.entities.Resource.delete(resource.id);
    await load();
  };

  const canManage = resource => !!user && (user.id === resource.created_by_id || user.role === 'admin');

  return <div className="ll-page">
    <span className="ll-eyebrow">Community resources</span>
    <h1 style={{ margin: '10px 0 8px' }}>What is near you</h1>
    <p className="ll-muted">Your own local list, built from your area and the places people around you have recorded. Each listing shows who reported it and when it was last checked. Nothing here is live availability.</p>
    <div className="ll-alert"><strong>Confirm before you travel</strong>Call ahead where possible. Conditions change fast, and a listing is not a guarantee that a site is open, stocked, or safe to reach.</div>

    {areaLoading ? <p className="ll-muted">Loading your area…</p>
      : (!coords || editingArea)
        ? <div style={{ marginTop: 18 }}>
          <AreaSetup
            areaLabel={coords ? areaLabel : ''}
            onSave={async area => { await save(area); setEditingArea(false); }}
          />
        </div>
        : <div className="ll-item" style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div><MapPin size={15} style={{ marginRight: 6, verticalAlign: -2 }} /><b>{areaLabel}</b></div>
            <button className="ll-btn" onClick={() => setEditingArea(true)}>Change area</button>
          </div>
          <div className="ll-eyebrow" style={{ marginTop: 6 }}>Only you can see this setting. It is not published.</div>
        </div>}

    <div className="ll-tags" style={{ marginTop: 14 }}>
      <button onClick={() => setCat('all')} aria-pressed={cat === 'all'}>All</button>
      {categories.map(c => <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c}>{c}</button>)}
    </div>

    {coords && <div className="ll-tags" style={{ marginTop: 8 }}>
      {radii.map(m => <button key={m} onClick={() => setRadius(m)} aria-pressed={radius === m}>Within {m} mi</button>)}
    </div>}

    {loading || areaLoading ? <p className="ll-muted">Loading listings…</p>
      : nearby.length === 0
        ? <div className="ll-card">
          <h2>Nothing recorded near you yet</h2>
          <p className="ll-muted" style={{ marginTop: 6 }}>
            {coords
              ? <>No listings within {radius} miles of {areaLabel}. Try widening the distance, or add the places you already know below — that is what makes this useful for the next person.</>
              : <>Set your area above to see local listings, or add a place you know below. Without an area ARK only shows your own notes.</>}
          </p>
        </div>
        : <div className="ll-list">{nearby.map(({ resource, distance }) => <ResourceCard
          key={resource.id}
          resource={resource}
          distance={distance}
          canManage={canManage(resource)}
          onDelete={removeListing}
        />)}</div>}

    <AddResourceForm defaultArea={areaLabel} onAdded={addListing} />
  </div>;
}
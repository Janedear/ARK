import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import '@/components/lifeline/lifeline.css';

const categories = ['water', 'food', 'shelter', 'medical', 'charging', 'supplies', 'information'];
const blank = { name: '', category: 'water', area: '', address: '', latitude: '', longitude: '', access_notes: '', accessibility: '', contact: '', source_name: '' };

export default function Resources() {
  const [items, setItems] = useState([]);
  const [cat, setCat] = useState('all');
  const [isAdmin, setIsAdmin] = useState(false);
  const [form, setForm] = useState(blank);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = cat === 'all'
      ? await base44.entities.Resource.list({ sort: '-created_date', limit: 100 })
      : await base44.entities.Resource.filter({ category: cat }, { sort: '-created_date', limit: 100 });
    setItems(res.items || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [cat]);
  useEffect(() => { base44.auth.me().then(u => setIsAdmin(u.role === 'admin')).catch(() => setIsAdmin(false)); }, []);

  const add = async e => {
    e.preventDefault();
    const { latitude, longitude, ...rest } = form;
    const hasPosition = latitude !== '' && longitude !== ''
      && !Number.isNaN(Number(latitude)) && !Number.isNaN(Number(longitude));
    const coords = hasPosition ? { latitude: Number(latitude), longitude: Number(longitude) } : {};
    await base44.entities.Resource.create({ ...rest, ...coords, status: 'unverified', last_verified: new Date().toISOString().slice(0, 10) });
    setForm(blank);
    load();
  };

  return <div className="ll-page">
    <span className="ll-eyebrow">Community resources</span>
    <h1 style={{ margin: '10px 0 8px' }}>Water, food, shelter, charging</h1>
    <p className="ll-muted">Listings added by coordinators in this workspace. Each one shows who reported it and when it was last checked. Nothing here is live availability.</p>
    <div className="ll-alert"><strong>Confirm before you travel</strong>Call ahead where possible. Conditions change fast, and a listing is not a guarantee that a site is open, stocked, or safe to reach.</div>

    <div className="ll-tags" style={{ marginTop: 14 }}>
      <button onClick={() => setCat('all')} aria-pressed={cat === 'all'}>All</button>
      {categories.map(c => <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c}>{c}</button>)}
    </div>

    {loading ? <p className="ll-muted">Loading listings…</p> : items.length === 0
      ? <p className="ll-muted">No listings in this category yet.</p>
      : <div className="ll-list">{items.map(r => <div className="ll-item" key={r.id}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <b>{r.name}</b>
          {r.status === 'verified' ? <span className="ll-chip ok">Verified</span> : r.status === 'closed' ? <span className="ll-chip">Closed</span> : <span className="ll-chip warn">Unverified</span>}
        </div>
        <div className="ll-muted">{[r.category, r.area, r.address].filter(Boolean).join(' · ')}</div>
        {r.access_notes && <p className="ll-muted" style={{ marginTop: 6 }}>{r.access_notes}</p>}
        {r.accessibility && <p className="ll-muted">Accessibility: {r.accessibility}</p>}
        <div className="ll-eyebrow" style={{ marginTop: 8 }}>Source: {r.source_name || 'not recorded'} · Last checked: {r.last_verified || 'unknown'}</div>
        {r.contact && <p className="ll-muted" style={{ marginTop: 4 }}>{r.contact}</p>}
      </div>)}</div>}

    {isAdmin && <section className="ll-card" style={{ marginTop: 24 }}>
      <h2>Add a listing (administrators)</h2>
      <p className="ll-muted">Public locations only. Never publish a private residence or a vulnerable person's address.</p>
      <form onSubmit={add}>
        <div className="ll-two">
          <label className="ll-field"><span>Name</span><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
          <label className="ll-field"><span>Category</span><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
        </div>
        <div className="ll-two">
          <label className="ll-field"><span>Area</span><input value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} /></label>
          <label className="ll-field"><span>Public address</span><input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></label>
        </div>
        <div className="ll-two">
          <label className="ll-field"><span>Latitude (optional, for the map)</span><input inputMode="decimal" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} /></label>
          <label className="ll-field"><span>Longitude (optional)</span><input inputMode="decimal" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} /></label>
        </div>
        <label className="ll-field"><span>Access notes</span><textarea value={form.access_notes} onChange={e => setForm({ ...form, access_notes: e.target.value })} /></label>
        <label className="ll-field"><span>Accommodation and accessibility</span><textarea value={form.accessibility} onChange={e => setForm({ ...form, accessibility: e.target.value })} /></label>
        <div className="ll-two">
          <label className="ll-field"><span>Contact</span><input value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} /></label>
          <label className="ll-field"><span>Source</span><input value={form.source_name} onChange={e => setForm({ ...form, source_name: e.target.value })} /></label>
        </div>
        <button className="ll-btn">Add listing</button>
      </form>
    </section>}
  </div>;
}
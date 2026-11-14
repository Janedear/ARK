import React, { useState } from 'react';
import { Plus, LocateFixed } from 'lucide-react';
import { currentPosition } from '@/lib/geocode';

const categories = ['water', 'food', 'shelter', 'medical', 'charging', 'supplies', 'information'];

const blank = { name: '', category: 'water', address: '', access_notes: '', accessibility: '', contact: '', source_name: '' };

export default function AddResourceForm({ defaultArea, onAdded }) {
  const [form, setForm] = useState(blank);
  const [pin, setPin] = useState(null);
  const [keepPrivate, setKeepPrivate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const dropPin = async () => {
    setError('');
    try {
      setPin(await currentPosition());
    } catch (err) {
      setError(err.message);
    }
  };

  const submit = async e => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await onAdded({
        ...form,
        area: defaultArea,
        status: 'unverified',
        visibility: keepPrivate ? 'private' : 'shared',
        last_verified: new Date().toISOString().slice(0, 10),
        ...(pin ? { latitude: pin.lat, longitude: pin.lon } : {}),
      });
      setForm(blank);
      setPin(null);
      setKeepPrivate(false);
    } catch (err) {
      setError(err.message || 'That listing could not be saved.');
    }
    setBusy(false);
  };

  return <section className="ll-card" style={{ marginTop: 24 }}>
    <h2><Plus size={16} style={{ marginRight: 8, verticalAlign: -2 }} />Add a place you know</h2>
    <p className="ll-muted" style={{ marginTop: 6 }}>
      Public locations only. Never list a private home, or a vulnerable person's address. Add these while you still have a connection, so they are here when you need them.
    </p>
    <form onSubmit={submit}>
      <div className="ll-two">
        <label className="ll-field"><span>Name</span><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. First Baptist food pantry" /></label>
        <label className="ll-field"><span>Category</span><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
      </div>
      <label className="ll-field"><span>Public address or cross streets</span><input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></label>
      <label className="ll-field"><span>Access notes (hours, limits, what to bring)</span><textarea value={form.access_notes} onChange={e => setForm({ ...form, access_notes: e.target.value })} /></label>
      <div className="ll-two">
        <label className="ll-field"><span>Accessibility</span><input value={form.accessibility} onChange={e => setForm({ ...form, accessibility: e.target.value })} /></label>
        <label className="ll-field"><span>Contact</span><input value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} /></label>
      </div>
      <label className="ll-field"><span>Who told you (source)</span><input value={form.source_name} onChange={e => setForm({ ...form, source_name: e.target.value })} placeholder="e.g. site staff, 13 Nov" /></label>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <button type="button" className="ll-btn" onClick={dropPin}><LocateFixed size={16} /> {pin ? 'Location added' : 'Add map position'}</button>
        <span className="ll-eyebrow">{pin ? 'Pinned where you are now' : 'Optional: lets it sort by distance'}</span>
      </div>

      <label className="ll-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" checked={keepPrivate} onChange={e => setKeepPrivate(e.target.checked)} style={{ width: 'auto' }} />
        <span>Only I can see this (a note to yourself)</span>
      </label>

      {error && <p className="ll-muted" style={{ color: 'hsl(var(--danger))' }}>{error}</p>}
      <button className="ll-btn" disabled={busy}>{busy ? 'Saving…' : 'Add listing'}</button>
    </form>
  </section>;
}
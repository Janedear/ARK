import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const blank = { household_name: '', home_area: '', meeting_spot_home: '', meeting_spot_neighbourhood: '', outside_area_plan: '', medical_needs: '', accessibility_needs: '', pets: '', supplies_notes: '' };

export default function HouseholdForm({ household, onSaved }) {
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { setForm({ ...blank, ...(household || {}) }); }, [household]);

  const set = k => e => setForm({ ...form, [k]: e.target.value });

  const save = async e => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    const payload = { ...form, last_reviewed: new Date().toISOString().slice(0, 10) };
    try {
      const saved = household?.id ? await base44.entities.Household.update(household.id, payload) : await base44.entities.Household.create(payload);
      setMsg('Saved');
      onSaved(saved);
    } catch {
      setMsg('Could not save. Check the connection and try again.');
    }
    setSaving(false);
  };

  return <form className="ll-card" onSubmit={save}>
    <h2>Household plan</h2>
    <p className="ll-muted">Store the town or neighbourhood only. Do not enter a full street address.</p>
    <label className="ll-field"><span>Household name</span><input value={form.household_name} onChange={set('household_name')} required maxLength={80} /></label>
    <label className="ll-field"><span>Town or neighbourhood</span><input value={form.home_area} onChange={set('home_area')} maxLength={80} /></label>
    <div className="ll-two">
      <label className="ll-field"><span>Meeting point near home</span><input value={form.meeting_spot_home} onChange={set('meeting_spot_home')} /></label>
      <label className="ll-field"><span>Meeting point outside the area</span><input value={form.meeting_spot_neighbourhood} onChange={set('meeting_spot_neighbourhood')} /></label>
    </div>
    <label className="ll-field"><span>If the area must be evacuated</span><textarea value={form.outside_area_plan} onChange={set('outside_area_plan')} /></label>
    <label className="ll-field"><span>Medication and medical equipment to carry</span><textarea value={form.medical_needs} onChange={set('medical_needs')} /></label>
    <label className="ll-field"><span>Accessibility and language needs</span><textarea value={form.accessibility_needs} onChange={set('accessibility_needs')} /></label>
    <div className="ll-two">
      <label className="ll-field"><span>Pets and what they need</span><textarea value={form.pets} onChange={set('pets')} /></label>
      <label className="ll-field"><span>Where the kit is kept</span><textarea value={form.supplies_notes} onChange={set('supplies_notes')} /></label>
    </div>
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <button className="ll-btn" disabled={saving}>{saving ? 'Saving…' : 'Save plan'}</button>
      <span className="ll-muted" role="status">{msg}</span>
    </div>
  </form>;
}
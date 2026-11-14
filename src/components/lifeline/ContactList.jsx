import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Trash2 } from 'lucide-react';

export default function ContactList({ householdId, contacts, onChange }) {
  const [form, setForm] = useState({ full_name: '', relationship: '', phone: '', is_out_of_area: false });

  const add = async e => {
    e.preventDefault();
    if (!form.full_name.trim()) return;
    await base44.entities.HouseholdContact.create({ ...form, household_id: householdId });
    setForm({ full_name: '', relationship: '', phone: '', is_out_of_area: false });
    onChange();
  };

  const remove = async id => {
    await base44.entities.HouseholdContact.delete(id);
    onChange();
  };

  return <section className="ll-card">
    <h2>People and contacts</h2>
    <p className="ll-muted">Private to your household. Choose one out-of-area person to act as the relay.</p>
    {contacts.length === 0 && <p className="ll-muted">No contacts saved yet.</p>}
    <div className="ll-list">{contacts.map(c => <div className="ll-item" key={c.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <div><b>{c.full_name}</b><div className="ll-muted">{[c.relationship, c.phone, c.is_out_of_area ? 'Out-of-area relay' : ''].filter(Boolean).join(' · ') || 'No details yet'}</div></div>
      <button onClick={() => remove(c.id)} aria-label={`Remove ${c.full_name}`} className="ll-muted"><Trash2 size={16} /></button>
    </div>)}</div>
    <form onSubmit={add} style={{ marginTop: 16 }}>
      <div className="ll-two">
        <label className="ll-field"><span>Name</span><input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required /></label>
        <label className="ll-field"><span>Relationship</span><input value={form.relationship} onChange={e => setForm({ ...form, relationship: e.target.value })} /></label>
      </div>
      <label className="ll-field"><span>Phone</span><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} inputMode="tel" /></label>
      <label className="ll-check" style={{ borderBottom: 0 }}><input type="checkbox" checked={form.is_out_of_area} onChange={e => setForm({ ...form, is_out_of_area: e.target.checked })} /><span>This person lives outside our area</span></label>
      <button className="ll-btn ghost" disabled={!form.full_name.trim()}>Add contact</button>
    </form>
  </section>;
}
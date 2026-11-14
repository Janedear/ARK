import React from 'react';
import { Printer } from 'lucide-react';
import useLifeline from '@/hooks/useLifeline';
import { guideBySlug } from '@/content/lifelineGuides';
import '@/components/lifeline/lifeline.css';

const keyGuides = ['water-safety', 'food-safety', 'generator-carbon-monoxide', 'communication-failure'];

export default function PrintPacket() {
  const { data } = useLifeline();
  const h = data.household || {};
  const contacts = data.contacts || [];
  const supplies = data.supplies || [];
  const today = new Date().toLocaleDateString();
  const field = v => v || '—';

  return <div className="ll-page">
    <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
      <div>
        <h1 style={{ marginBottom: 6 }}>Print packet</h1>
        <p className="ll-muted">Print or save as PDF. Paper works when the battery does not. Reprint after any change.</p>
      </div>
      <button className="ll-btn" onClick={() => window.print()}><Printer size={16} /> Print or save as PDF</button>
    </div>

    <h2 style={{ marginTop: 8 }}>{field(h.household_name)} — emergency packet</h2>
    <p className="ll-muted">Printed {today}. Recheck every six months. This packet contains private information: keep it with your kit, not on display.</p>

    <section className="ll-card" style={{ marginTop: 16 }}>
      <h2>1. Call for help</h2>
      <p>Emergency number: ______________________ (United States: 911)</p>
      <p>Local police / fire: ______________________  Hospital: ______________________</p>
      <p>Out-of-area relay contact: ______________________  Phone: ______________________</p>
    </section>

    <section className="ll-card" style={{ marginTop: 16 }}>
      <h2>2. Where we meet</h2>
      <p>Near home: {field(h.meeting_spot_home)}</p>
      <p>Outside the area: {field(h.meeting_spot_neighbourhood)}</p>
      <p>If we must leave the area: {field(h.outside_area_plan)}</p>
      <p>Area: {field(h.home_area)}</p>
    </section>

    <section className="ll-card" style={{ marginTop: 16 }}>
      <h2>3. People and contacts</h2>
      {contacts.length === 0 ? <p>No contacts saved yet.</p> : <table className="ll-status-table"><thead><tr><th>Name</th><th>Relationship</th><th>Phone</th><th>Relay</th></tr></thead><tbody>
        {contacts.map(c => <tr key={c.id}><td>{c.full_name}</td><td>{field(c.relationship)}</td><td>{field(c.phone)}</td><td>{c.is_out_of_area ? 'Yes' : '—'}</td></tr>)}
      </tbody></table>}
    </section>

    <section className="ll-card" style={{ marginTop: 16 }}>
      <h2>4. Medical and accessibility needs</h2>
      <p>Medication and equipment: {field(h.medical_needs)}</p>
      <p>Accessibility and language: {field(h.accessibility_needs)}</p>
      <p>Pets: {field(h.pets)}</p>
    </section>

    <section className="ll-card" style={{ marginTop: 16 }}>
      <h2>5. Supplies</h2>
      <p>Kit kept at: {field(h.supplies_notes)}</p>
      {supplies.length === 0 ? <p>Checklist not started.</p> : <ul style={{ paddingLeft: 20, columns: 2 }}>{supplies.map(s => <li key={s.id}>{s.packed ? '✓' : '☐'} {s.label}{s.quantity ? ` (${s.quantity})` : ''}</li>)}</ul>}
    </section>

    <section className="ll-card" style={{ marginTop: 16 }}>
      <h2>6. If the phone does not work</h2>
      <ol style={{ paddingLeft: 22 }}>{keyGuides.map(slug => { const g = guideBySlug(slug); return g ? <li key={slug} style={{ marginBottom: 8 }}><b>{g.title}:</b> {g.quickSteps[0]}</li> : null; })}</ol>
      <p className="ll-muted">Full guidance, with sources, is in the Lifeline guidance library. This list is a reminder, not a substitute.</p>
    </section>

    <section className="ll-card" style={{ marginTop: 16 }}>
      <h2>7. Notes written by hand</h2>
      <div style={{ height: 160, borderBottom: '1px solid #999' }} />
      <div style={{ height: 160 }} />
    </section>
  </div>;
}
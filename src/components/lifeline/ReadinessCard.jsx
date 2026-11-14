import React from 'react';
import { Link } from 'react-router-dom';

export default function ReadinessCard({ household, contacts, supplies }) {
  const packed = supplies.filter(s => s.packed).length;
  const hasRelay = contacts.some(c => c.is_out_of_area);
  const reviewed = household?.last_reviewed;
  const days = reviewed ? Math.floor((Date.now() - new Date(reviewed).getTime()) / 86400000) : null;

  const rows = [
    { label: 'Household plan', value: reviewed ? `Reviewed ${days} days ago` : 'Not saved yet', ok: reviewed && days < 180, to: '/HouseholdPlan' },
    { label: 'Contacts', value: `${contacts.length} saved${hasRelay ? ', relay contact set' : ', no out-of-area contact'}`, ok: contacts.length > 0 && hasRelay, to: '/HouseholdPlan' },
    { label: 'Supplies checked', value: supplies.length ? `${packed} of ${supplies.length} packed` : 'Checklist not started', ok: supplies.length > 0 && packed === supplies.length, to: '/HouseholdPlan' }
  ];

  return <section className="ll-card" aria-labelledby="ready-title">
    <h2 id="ready-title">Household readiness</h2>
    <p className="ll-muted">Saved on this account and private to you. Only a summary appears here.</p>
    {rows.map(r => <div className="ll-row" key={r.label}>
      <div><b>{r.label}</b><div className="ll-muted">{r.value}</div></div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {r.ok ? <span className="ll-chip ok">Ready</span> : <span className="ll-chip warn">Check</span>}
        <Link to={r.to} className="ll-muted">Open</Link>
      </div>
    </div>)}
  </section>;
}
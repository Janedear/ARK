import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { guides, guideCategories } from '@/content/lifelineGuides';
import EmergencyContacts from '@/components/lifeline/EmergencyContacts';
import LocalAlerts from '@/components/lifeline/LocalAlerts';
import '@/components/lifeline/lifeline.css';

export default function SurvivalLibrary() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');

  const shown = guides.filter(g => (cat === 'all' || g.category === cat) &&
    (q.trim() === '' || `${g.title} ${g.summary} ${g.quickSteps.join(' ')}`.toLowerCase().includes(q.toLowerCase())));

  return <div className="ll-page">
    <span className="ll-eyebrow">Guidance</span>
    <h1 style={{ margin: '10px 0 8px' }}>Emergency guidance</h1>
    <p className="ll-muted">Specific, actionable guidance for the situations this app is built for. Each article cites published government and humanitarian sources, with the date it was sourced. None has been reviewed by a clinician or your local emergency authority, and the app does not claim otherwise.</p>

    <div className="ll-alert"><strong>For a life-threatening emergency, call 911 now</strong>Call first, then read. This library helps you prepare and escalate; it is not medical advice, not a dispatcher, and not a replacement for trained responders.</div>

    <LocalAlerts />

    <EmergencyContacts />

    <div className="ll-search">
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search guidance, e.g. water, generator, reunification" aria-label="Search guidance" />
    </div>
    <div className="ll-tags">
      <button onClick={() => setCat('all')} aria-pressed={cat === 'all'}>All topics</button>
      {guideCategories.map(c => <button key={c.key} onClick={() => setCat(c.key)} aria-pressed={cat === c.key}>{c.label}</button>)}
    </div>

    <div className="ll-list">
      {shown.map(g => <Link key={g.slug} to={`/Guidance/${g.slug}`} className="ll-item">
        <b>{g.title}</b>
        <div className="ll-muted">{g.summary}</div>
        <div className="ll-eyebrow" style={{ marginTop: 6 }}>{g.quickSteps.length} quick steps · sourced, not independently reviewed</div>
      </Link>)}
      {shown.length === 0 && <p className="ll-muted">Nothing matches that search.</p>}
    </div>
  </div>;
}
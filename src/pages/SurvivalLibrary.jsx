import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { guides, guideCategories } from '@/content/lifelineGuides';
import '@/components/lifeline/lifeline.css';

export default function SurvivalLibrary() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');

  const shown = guides.filter(g => (cat === 'all' || g.category === cat) &&
    (q.trim() === '' || `${g.title} ${g.summary} ${g.quickSteps.join(' ')}`.toLowerCase().includes(q.toLowerCase())));

  return <div className="ll-page">
    <span className="ll-eyebrow">Guidance</span>
    <h1 style={{ margin: '10px 0 8px' }}>Emergency guidance</h1>
    <p className="ll-muted">Short, sourced guidance for the situations this app is built for. Every article cites its source and is marked as a draft until an emergency or medical professional reviews it.</p>

    <div className="ll-alert"><strong>Draft content, not medical advice</strong>These articles are being prepared for professional review. For a life-threatening emergency, call your local emergency number. Do not use this library to treat a serious injury or illness.</div>

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
        <div className="ll-eyebrow" style={{ marginTop: 6 }}>{g.quickSteps.length} quick steps · draft for review</div>
      </Link>)}
      {shown.length === 0 && <p className="ll-muted">Nothing matches that search.</p>}
    </div>
  </div>;
}
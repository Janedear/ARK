import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { responsibilities } from '@/components/network/readinessContent';
export default function ResponsibilityGuide() {
  const [selected, setSelected] = useState(0);
  const person = responsibilities[selected];
  return <section aria-labelledby="role-guide"><div className="network-section-title"><span>02</span><div><h2 id="role-guide">Who is this for?</h2><p>Operational responsibilities are not the same as account permissions.</p></div></div><div className="network-guide-grid"><div className="network-personas" aria-label="Choose a responsibility">{responsibilities.map((role, i) => <button key={role.title} onClick={() => setSelected(i)} aria-pressed={i === selected}>{role.title}</button>)}</div><article className="network-guide-card" aria-live="polite"><span className="network-kicker">{person.account}</span><h3>{person.title}</h3><p>{person.needs}</p><h4>First step</h4><p>{person.first}</p><h4>Boundary</h4><p>{person.boundary}</p><Link className="network-link" to={person.link}>Open the relevant work area →</Link></article></div><p className="network-footnote">Today the app has admin and user accounts only. Specialist, coordinator, command, read-only and no-account pathways above are a design for the next phase, not enforced access controls.</p></section>;
}
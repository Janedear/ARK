import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { scenarios } from '@/components/network/readinessContent';
export default function ScenarioGuide() {
  const [selected, setSelected] = useState('outage');
  const scenario = scenarios.find(s => s.key === selected);
  return <section aria-labelledby="scenario-guide"><div className="network-section-title"><span>03</span><div><h2 id="scenario-guide">Plan for the conditions you actually have</h2><p>Planning guidance, not live instructions or a substitute for local emergency services.</p></div></div><div className="network-scenario-tabs" aria-label="Crisis scenarios">{scenarios.map(s => <button key={s.key} aria-pressed={s.key === selected} onClick={() => setSelected(s.key)}>{s.title}</button>)}</div><article className="network-guide-card" aria-live="polite"><span className="network-kicker">Planning scenario</span><h3>{scenario.priority}</h3><ol className="network-steps">{scenario.actions.map((action, i) => <li key={action}><span>{i + 1}</span><p>{action}</p></li>)}</ol><div className="network-callout"><h4>If connectivity is lost</h4><p>{scenario.offline}</p></div><Link to={scenario.path} className="network-link">{scenario.action} →</Link></article></section>;
}
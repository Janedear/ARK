import React from 'react';
import { hubSteps } from '@/components/network/readinessContent';
export default function HubSetupGuide() {
  return <section className="network-print-section"><h2>Establish a local coordination hub</h2><p>A planning checklist to adapt with qualified local responders. Follow current official safety instructions where available.</p><ol className="network-steps">{hubSteps.map(([title, text], i) => <li key={title}><span>{i + 1}</span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol></section>;
}
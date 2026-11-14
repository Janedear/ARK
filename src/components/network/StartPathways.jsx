import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { pathways } from '@/components/network/readinessContent';
export default function StartPathways() {
  return <section aria-labelledby="start-next"><div className="network-section-title"><span>01</span><div><h2 id="start-next">What do you need to do now?</h2><p>Start with a task, not a job title. These links open the existing tools.</p></div></div><div className="network-pathways">{pathways.map(path => <Link className="network-pathway" to={path.link} key={path.number}><span className="network-kicker">{path.number}</span><h3>{path.title}</h3><p>{path.copy}</p><strong>{path.action}<ArrowRight size={16} /></strong></Link>)}</div></section>;
}
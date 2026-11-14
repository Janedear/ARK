import React from 'react';
import { Link } from 'react-router-dom';
import { navigation, guidance } from '@/components/network/navigation';
export default function PageOrientation({ page }) {
  const info = guidance[page];
  if (!info) return null;
  const group = navigation.find(g => g.items.some(i => i.page === page || (page === 'IncidentDetail' && i.page === 'Incidents')));
  return <section className="network-orientation" aria-label="How to use this area"><div className="network-breadcrumb"><Link to="/">Home</Link><span>/</span><span>{group?.label}</span></div><div className="network-orientation-grid"><p><b>For</b>{info.who}</p><p><b>What to do here</b>{info.next}</p></div><p className="network-limit">{info.limit}</p></section>;
}
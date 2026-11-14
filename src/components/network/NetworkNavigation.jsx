import React from 'react';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { navigation } from '@/components/network/navigation';
export default function NetworkNavigation({ currentPageName }) {
  return <aside className="network-sidebar"><Link to="/" className="network-brand"><Compass size={22} /><span>Response network<small>People first. Restore together.</small></span></Link><nav className="network-nav" aria-label="Response work areas">{navigation.map(group => <section key={group.label}><h2>{group.label}</h2><p>{group.description}</p>{group.items.map(item => <Link key={item.path} to={item.path} aria-current={currentPageName === item.page || (currentPageName === 'IncidentDetail' && item.page === 'Incidents') ? 'page' : undefined}><strong>{item.name}</strong><small>{item.hint}</small></Link>)}</section>)}</nav></aside>;
}
import React from 'react';
import { Link } from 'react-router-dom';
import { Droplets, UtensilsCrossed, HeartPulse, Home, Users, MapPin, ClipboardList, Printer } from 'lucide-react';

const tiles = [
  { to: '/Guidance/water-safety', icon: Droplets, label: 'Water', note: 'Store, treat, sanitise' },
  { to: '/Guidance/food-safety', icon: UtensilsCrossed, label: 'Food', note: 'Keep it safe without power' },
  { to: '/Guidance/medical-escalation', icon: HeartPulse, label: 'Medical', note: 'Who to call, what to say' },
  { to: '/Guidance/evacuation-sheltering', icon: Home, label: 'Shelter', note: 'Go or stay, safely' },
  { to: '/ResponseHub', icon: Users, label: 'Family check-in', note: 'Tell your people you are safe' },
  { to: '/Resources', icon: MapPin, label: 'Find resources', note: 'Water, food, charging' },
  { to: '/HouseholdPlan', icon: ClipboardList, label: 'My plan', note: 'Contacts and supplies' },
  { to: '/PrintPacket', icon: Printer, label: 'Print packet', note: 'Works with no power' }
];

export default function ActionGrid() {
  return <div className="ll-grid">{tiles.map(t => <Link key={t.to} to={t.to} className="ll-tile"><t.icon size={22} /><span>{t.label}</span><small>{t.note}</small></Link>)}</div>;
}
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, WifiOff, Users, Shield } from 'lucide-react';
import { HERO_IMAGE } from '@/components/halo/brand';

const badges = [
  { icon: WifiOff, label: 'Works offline' },
  { icon: Users, label: 'Stay connected locally' },
  { icon: Shield, label: 'Privacy-minded' }
];

export default function LandingHero() {
  return <section className="halo-hero">
    <div className="halo-hero-copy">
      <span className="halo-kicker"><i />A HaloSuite product · Free for families</span>
      <h1>Prepared for the unexpected.<em>Connected when it matters.</em></h1>
      <p className="halo-lede">Save emergency guides, set up a family plan, and pass messages to neighbours, even when the internet and phone signal are down.</p>
      <div className="halo-actions">
        <a href="#kit" className="halo-cta">Get ARK free <ArrowRight size={20} /></a>
        <Link to="/Home" className="halo-cta ghost">Try it in your browser</Link>
      </div>
      <p className="halo-meta">One download · No sign-up · No app store</p>
      <ul className="halo-badges">{badges.map(b => <li key={b.label}><b.icon size={17} />{b.label}</li>)}</ul>
      <p className="halo-note"><ShieldCheck size={16} />ARK helps you prepare. It does not call 911 for you.</p>
    </div>
    <div className="halo-hero-art"><img src={HERO_IMAGE} alt="ARK's angel robot guide waving in front of a glowing doorway, with homes connected by dotted lines" /></div>
  </section>;
}
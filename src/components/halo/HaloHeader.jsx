import React from 'react';
import { Link } from 'react-router-dom';
import { BrandLockup } from '@/components/halo/brand';

export default function HaloHeader() {
  return <header className="halo-app-header">
    <Link to="/Home" aria-label="ARK home"><BrandLockup /></Link>
    <div className="halo-app-header-right">
      <span className="halo-app-proto">Preparedness prototype, not emergency services</span>
      <Link to="/" className="halo-pill">Get the offline kit</Link>
    </div>
  </header>;
}
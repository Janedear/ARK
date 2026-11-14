import React from 'react';
import { Landmark, Droplets, HeartPulse, Zap, Radio, Shield, Train, Building2 } from 'lucide-react';
const icons = { financial: Landmark, water: Droplets, healthcare: HeartPulse, power_grid: Zap, telecommunications: Radio, emergency_services: Shield, transportation: Train, government: Building2 };
const labels = { operational: 'Operational', degraded: 'Degraded', compromised: 'Compromised', offline: 'Offline', reconstituting: 'Reconstituting', verified: 'Verified' };
export default function FieldSystems({ systems, onSystemClick }) {
  const groups = systems.reduce((all, system) => ({ ...all, [system.region]: [...(all[system.region] || []), system] }), {});
  return <section className="fo-sec"><h2 className="fo-h2"><i>01</i>Systems</h2>
    {Object.entries(groups).map(([region, entries], index) => <div className="fo-band" key={region}>
      <h3 className="fo-h2"><i>{String.fromCharCode(65 + index)}</i>{region.replace(/_/g, ' ')}<em>{entries.length} systems</em></h3>
      <div className="fo-grid">{entries.map(system => { const Icon = icons[system.system_type] || Building2;
        return <button className="fo-sys" key={system.id} onClick={() => onSystemClick(system)}>
          <div className="fo-sh"><span className="fo-ic"><Icon size={22} strokeWidth={1.8} /></span><div><div className="fo-sn">{system.system_name}</div><div className="fo-st">{system.system_type.replace(/_/g, ' ')}</div></div></div>
          <div className="fo-stat"><span className={`fo-dot fo-status-${system.status}`} />{labels[system.status] || 'Offline'}</div>
          {system.population_affected > 0 && <div className="fo-pop">{system.population_affected.toLocaleString()} affected</div>}
        </button>;
      })}</div>
    </div>)}
  </section>;
}
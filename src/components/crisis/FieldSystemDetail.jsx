import React from 'react';
export default function FieldSystemDetail({ system, systems }) {
  if (!system) return <div className="fo-card">No system selected.</div>;
  const values = [['Type', system.system_type?.replace(/_/g, ' ')], ['Region', system.region?.replace(/_/g, ' ')], ['Status', system.status], ['Baseline Version', system.baseline_version || 'N/A'], ['Population Affected', system.population_affected?.toLocaleString() || 'N/A'], ['Recovery Time Estimate', `${system.estimated_recovery_hours || 'N/A'} hours`]];
  return <div className="fo-card"><div className="fo-dg">{values.map(([label, value]) => <div key={label}><div>{label}</div><div>{value}</div></div>)}</div>
    {system.dependencies?.length > 0 && <div className="fo-dependencies"><div className="fo-lb">Dependencies</div><div className="fo-tm">{system.dependencies.map(id => <span className="fo-chip" key={id}>{systems.find(s => s.id === id)?.system_name || id}</span>)}</div></div>}
  </div>;
}
import React from 'react';
const types = [['credential_compromise','Credential Compromise'],['malware','Malware Outbreak'],['ddos','DDoS Attack'],['supply_chain','Supply Chain Attack'],['insider_threat','Insider Threat'],['infrastructure_failure','Infrastructure Failure'],['other','Other']];
const regions = [['region_a','Region A'],['region_b','Region B'],['region_c','Region C'],['region_d','Region D'],['multi_region','Multi-Region'],['national','National']];
export default function FieldIncidentForm({ form, setForm, onCancel, onDeclare, prefix = 'inline' }) {
  const field = key => ({ id: `${prefix}-${key}`, value: form[key], onChange: e => setForm({ ...form, [key]: e.target.value }) });
  return <div className="fo-card fo-form">
    <div><label className="fo-lb" htmlFor={`${prefix}-title`}>Incident Title *</label><input className="fo-inp" {...field('title')} placeholder="Brief incident description" /></div>
    <div className="fo-fg"><div><label className="fo-lb" htmlFor={`${prefix}-incident_type`}>Incident Type *</label><select className="fo-inp" {...field('incident_type')}>{types.map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select><div className="fo-opts">{types.map(t => t[1]).join(' · ')}</div></div>
      <div><label className="fo-lb" htmlFor={`${prefix}-severity`}>Severity *</label><select className="fo-inp" {...field('severity')}>{['low','medium','high','critical'].map(s => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}</select><div className="fo-opts">Low · Medium · High · Critical</div></div></div>
    <div><label className="fo-lb" htmlFor={`${prefix}-affected_region`}>Affected Region *</label><select className="fo-inp" {...field('affected_region')}>{regions.map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select><div className="fo-opts">{regions.map(r => r[1]).join(' · ')}</div></div>
    <div><label className="fo-lb" htmlFor={`${prefix}-description`}>Description</label><textarea className="fo-inp" rows={3} {...field('description')} placeholder="Detailed incident information (will be logged in audit trail)" /></div>
    <div className="fo-notice"><b>⚠️ Authority Notice</b><span>Declaring an incident saves a report and an activity entry. It does not dispatch responders or authorize operational action. Confirm your remit before proceeding.</span></div>
    <div className="fo-actions"><button className="fo-btn fo-out" onClick={onCancel}>Cancel</button><button className="fo-btn fo-sm" disabled={!form.title} onClick={onDeclare}>Declare Incident</button></div>
  </div>;
}
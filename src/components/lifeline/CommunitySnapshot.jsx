import React from 'react';
import { Link } from 'react-router-dom';

export default function CommunitySnapshot({ announcements, openHelp, activeIncidents }) {
  return <section className="ll-card" aria-labelledby="community-title">
    <h2 id="community-title">Community status</h2>
    <p className="ll-muted">Saved records from people using this workspace. Not an emergency alert feed.</p>
    {announcements.length === 0 && <p className="ll-muted">No announcements posted.</p>}
    {announcements.map(a => <div className="ll-row" key={a.id}>
      <div><b>{a.message}</b><div className="ll-muted">{a.author_name || 'Coordinator'} · {new Date(a.created_date).toLocaleString()}</div></div>
      {a.level === 'urgent' ? <span className="ll-chip bad">Urgent</span> : <span className="ll-chip">Info</span>}
    </div>)}
    <div className="ll-row"><div><b>{openHelp} open help requests</b><div className="ll-muted">Posted by people and volunteers here</div></div><Link to="/ResponseHub" className="ll-muted">Open</Link></div>
    <div className="ll-row"><div><b>{activeIncidents} active incidents</b><div className="ll-muted">Reported by coordinators, not verified by responders</div></div><Link to="/Incidents" className="ll-muted">Open</Link></div>
  </section>;
}
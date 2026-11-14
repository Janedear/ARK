import React from 'react';
import { Link } from 'react-router-dom';
import { Radio } from 'lucide-react';
import StartPathways from '@/components/network/StartPathways';
import ResponsibilityGuide from '@/components/network/ResponsibilityGuide';
import ScenarioGuide from '@/components/network/ScenarioGuide';
import NetworkReadiness from '@/components/network/NetworkReadiness';
export default function StartHere() {
  return <div className="network-start"><header className="network-welcome"><span className="network-kicker">Start here / purpose & next steps</span><h1>Protect people.<br />Coordinate locally.<br />Restore essential services.</h1><p>A shared workspace for communities, responders and infrastructure teams to organize needs, assign responsibility and keep a record when normal systems are disrupted.</p><div className="network-welcome-note">Planning prototype. Not emergency dispatch, not a live infrastructure control system, and not an offline communications network.</div></header><aside className="network-priority"><Radio size={22} /><div><h2>No accounts prepared? No internet?</h2><p>Use identified local coordinators, minimal paper intake and established communications. Prepare the guide before connectivity is lost; a web app cannot create a communications link on its own.</p></div><Link to="/FieldGuide">Open & print the fallback guide →</Link></aside><StartPathways /><ResponsibilityGuide /><ScenarioGuide /><NetworkReadiness /></div>;
}
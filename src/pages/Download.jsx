import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download as DownloadIcon, Shield, Check, ArrowRight } from 'lucide-react';
import { buildZip, downloadBlob } from '@/components/toolkit/zip';
import { buildKitFiles, KIT_CONTENTS } from '@/components/kit/kitFiles';
import GetArk from '@/components/kit/GetArk';
import MeetingPointPicker from '@/components/kit/MeetingPointPicker';
import { BrandLockup } from '@/components/halo/brand';
import LandingHero from '@/components/halo/LandingHero';
import FeatureCards from '@/components/halo/FeatureCards';
import '@/components/lifeline/lifeline.css';
import '@/components/halo/halo.css';

export default function Download() {
  const [done, setDone] = useState(false);
  const [meetingPoint, setMeetingPointState] = useState(() => { try { return JSON.parse(localStorage.getItem('ark-meeting-point') || 'null'); } catch { return null; } });
  const [error, setError] = useState('');
  const setMeetingPoint = point => {
    setMeetingPointState(point); setDone(false); setError('');
    try { localStorage.setItem('ark-meeting-point', JSON.stringify(point)); }
    catch { setError('This browser cannot remember your meeting point. It will still be included in the kit you download now.'); }
  };
  const download = () => {
    setDone(false); setError('');
    try { downloadBlob(buildZip(buildKitFiles(meetingPoint)), 'ARK-offline-kit.zip'); setDone(true); }
    catch { setError('The download could not start. Please try again.'); }
  };

  return <div className="ark-download halo-landing">
    <header className="halo-nav">
      <Link to="/"><BrandLockup /></Link>
      <nav>
        <Link to="/Guidance">Guides</Link>
        <Link to="/HouseholdPlan">Household plan</Link>
        <Link to="/Network">Messages</Link>
      </nav>
      <div className="halo-nav-right">
        <Link to="/Home" className="halo-link">Open the app</Link>
        <a href="#kit" className="halo-pill">Get ARK</a>
      </div>
    </header>

    <LandingHero />
    <FeatureCards />

    <main className="ll-page" id="kit" style={{ scrollMarginTop: 16, marginTop: 40 }}>
      <span className="ll-eyebrow">Free · one download</span>
      <h2 className="halo-section-title">Save it today. <em>Thank yourself later.</em></h2>
      <p className="ll-muted" style={{ fontSize: 17 }}>One download with emergency guidance, an offline message relay, a household plan to print, and the scripts volunteers need to connect radio and SMS. Save it now, while you have signal.</p>

      <MeetingPointPicker value={meetingPoint} onChange={setMeetingPoint} />

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', margin: '22px 0' }}>
        <button className="ll-btn" style={{ minHeight: 54, fontSize: 17, padding: '12px 26px' }} onClick={download}><DownloadIcon size={18} />Download ARK-offline-kit.zip</button>
        {done && <span className="ll-chip ok" role="status"><Check size={16} />Download requested. Check your Downloads folder, unzip the kit, then open START-HERE.html.</span>}
      </div>
      {error && <p className="ll-alert" role="alert">{error}</p>}

      <div className="ll-grid" style={{ marginBottom: 22 }}>
        {KIT_CONTENTS.map(item => <div className="ll-tile" key={item.name}>{item.name}<small>{item.detail}</small></div>)}
      </div>

      <div className="ll-alert danger"><strong>For immediate danger, call 911</strong>ARK does not dispatch help or call anyone. Relay messages are public and unencrypted. Guidance is sourced from government agencies but not reviewed by a clinician. Keep paper copies — browser storage can be cleared.</div>

      <GetArk meetingPoint={meetingPoint} />

      <section className="ll-card" style={{ marginTop: 18 }}>
        <h2>After downloading</h2>
        <ol style={{ paddingLeft: 22 }}>
          <li>Unzip it on your phone or computer and open <b>START-HERE.html</b>.</li>
          <li>Open the guidance and relay files once to confirm they work with your connection off.</li>
          <li>Print the guidance, contacts and plan worksheet. Copy the zip to a USB stick.</li>
          <li>Pass the kit to neighbours. Every copy works on its own.</li>
        </ol>
      </section>
    </main>
  </div>;
}
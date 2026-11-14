import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download as DownloadIcon, Shield, Check, ArrowRight } from 'lucide-react';
import { buildZip, downloadBlob } from '@/components/toolkit/zip';
import { buildKitFiles, KIT_CONTENTS } from '@/components/kit/kitFiles';
import GetArk from '@/components/kit/GetArk';
import MeetingPointPicker from '@/components/kit/MeetingPointPicker';
import '@/components/lifeline/lifeline.css';

export default function Download() {
  const [done, setDone] = useState(false);
  const [meetingPoint, setMeetingPointState] = useState(() => { try { return JSON.parse(localStorage.getItem('ark-meeting-point') || 'null'); } catch { return null; } });
  const setMeetingPoint = point => { setMeetingPointState(point); localStorage.setItem('ark-meeting-point', JSON.stringify(point)); };
  const download = () => { downloadBlob(buildZip(buildKitFiles(meetingPoint)), 'ARK-offline-kit.zip'); setDone(true); };

  return <div className="min-h-screen bg-background">
    <header className="border-b border-border bg-card">
      <div className="ll-page" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="flex items-center gap-2 font-heading font-bold"><Shield size={18} />ARK</span>
        <Link to="/Home" className="ll-btn ghost" style={{ minHeight: 38, padding: '6px 14px' }}>Open the app <ArrowRight size={15} /></Link>
      </div>
    </header>

    <main className="ll-page">
      <span className="ll-eyebrow">Offline kit · free</span>
      <h1 style={{ margin: '10px 0 10px' }}>Everything you need when the network is gone</h1>
      <p className="ll-muted" style={{ fontSize: 17 }}>One download with emergency guidance, an offline message relay, a household plan to print, and the scripts volunteers need to connect radio and SMS. Save it now, while you have signal.</p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', margin: '22px 0' }}>
        <button className="ll-btn" style={{ minHeight: 54, fontSize: 17, padding: '12px 26px' }} onClick={download}><DownloadIcon size={18} />Download ARK-offline-kit.zip</button>
        {done && <span className="ll-chip ok"><Check size={13} />Saved. Unzip it and open START-HERE.html</span>}
      </div>

      <div className="ll-grid" style={{ marginBottom: 22 }}>
        {KIT_CONTENTS.map(item => <div className="ll-tile" key={item.name}>{item.name}<small>{item.detail}</small></div>)}
      </div>

      <div className="ll-alert danger"><strong>For immediate danger, call 911</strong>ARK does not dispatch help or call anyone. Relay messages are public and unencrypted. Guidance is sourced from government agencies but not reviewed by a clinician. Keep paper copies — browser storage can be cleared.</div>

      <MeetingPointPicker value={meetingPoint} onChange={setMeetingPoint} />

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
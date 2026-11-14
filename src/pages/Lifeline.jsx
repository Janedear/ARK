import React from 'react';
import { Link } from 'react-router-dom';
import useLifeline from '@/hooks/useLifeline';
import StatusStrip from '@/components/lifeline/StatusStrip';
import UrgentHelp from '@/components/lifeline/UrgentHelp';
import ActionGrid from '@/components/lifeline/ActionGrid';
import ReadinessCard from '@/components/lifeline/ReadinessCard';
import CommunitySnapshot from '@/components/lifeline/CommunitySnapshot';
import '@/components/lifeline/lifeline.css';

export default function Lifeline() {
  const { data, loading, stale, online } = useLifeline();

  return <div className="ll-page">
    <header style={{ marginBottom: 6 }}>
      <span className="ll-eyebrow">ARK · preparedness and local coordination</span>
      <h1 style={{ margin: '10px 0 8px' }}>Get ready. Stay reachable. Help nearby.</h1>
      <p className="ll-muted">A household plan, plain-language emergency guidance, and a way to coordinate with your community when normal services fail.</p>
    </header>

    <StatusStrip online={online} at={data.at} stale={stale} />

    {(!online || stale) && <div className="ll-alert" role="alert">
      <strong>You are seeing a saved copy.</strong>
      Nothing on this screen will update until a connection returns, and anything you change will not be saved. Guidance pages you already opened may stay readable, but ARK cannot send messages or call for help. Use your printed packet and your local emergency number.
    </div>}

    <UrgentHelp />

    <section style={{ marginTop: 28 }}>
      <h2>What do you need right now?</h2>
      <ActionGrid />
    </section>

    {loading && !data.at && <p className="ll-muted" style={{ marginTop: 24 }}>Loading your plan…</p>}

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16, marginTop: 28 }}>
      <ReadinessCard household={data.household} contacts={data.contacts} supplies={data.supplies} />
      <CommunitySnapshot announcements={data.announcements} openHelp={data.openHelp} activeIncidents={data.activeIncidents} />
    </div>

    <div className="ll-alert" style={{ marginTop: 24 }}>
      <strong>What ARK is not</strong>
      Not a replacement for emergency services. It cannot guarantee rescue, medical treatment, message delivery, or that a resource is open. Device-to-device networking and offline map packages are not built. <Link to="/Capabilities" style={{ textDecoration: 'underline' }}>See exactly what works</Link>.
    </div>
  </div>;
}
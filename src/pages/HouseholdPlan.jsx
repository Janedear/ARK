import React from 'react';
import { Link } from 'react-router-dom';
import useLifeline from '@/hooks/useLifeline';
import HouseholdForm from '@/components/lifeline/HouseholdForm';
import ContactList from '@/components/lifeline/ContactList';
import SupplyChecklist from '@/components/lifeline/SupplyChecklist';
import '@/components/lifeline/lifeline.css';

export default function HouseholdPlan() {
  const { data, loading, load } = useLifeline();
  const household = data.household;

  return <div className="ll-page">
    <span className="ll-eyebrow">My household</span>
    <h1 style={{ margin: '10px 0 8px' }}>Your household plan</h1>
    <p className="ll-muted">Private to your account. Fill this in before you need it, then print a copy so it is readable without power.</p>
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '18px 0 24px' }}>
      <Link to="/PrintPacket" className="ll-btn">Print the packet</Link>
      <Link to="/Guidance" className="ll-btn ghost">Read the guidance</Link>
    </div>

    {loading && !household && <p className="ll-muted">Loading…</p>}
    <div style={{ display: 'grid', gap: 16 }}>
      <HouseholdForm household={household} onSaved={load} />
      {household?.id && <>
        <ContactList householdId={household.id} contacts={data.contacts} onChange={load} />
        <SupplyChecklist householdId={household.id} supplies={data.supplies} onChange={load} />
      </>}
      {!household && !loading && <p className="ll-muted">Save the household plan first, then add contacts and supplies.</p>}
    </div>
  </div>;
}
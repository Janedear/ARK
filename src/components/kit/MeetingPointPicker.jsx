import React, { useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import useUserArea from '@/components/resources/useUserArea';
import { currentPosition } from '@/lib/geocode';
import { findMeetingPoints, meetingPointText } from '@/components/kit/meetingPoints';

export default function MeetingPointPicker({ value, onChange }) {
  const { coords, areaLabel } = useUserArea();
  const [options, setOptions] = useState([]), [busy, setBusy] = useState(false), [error, setError] = useState('');

  const search = async useSaved => {
    setBusy(true); setError('');
    try {
      const found = await findMeetingPoints(useSaved ? coords : await currentPosition());
      setOptions(found);
      if (!found.length) setError('No named schools or town halls found nearby. Type a meeting point instead.');
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  return <section className="ll-card" style={{ marginTop: 18 }}>
    <h2><MapPin size={17} className="inline mr-1" />Starting meeting point</h2>
    <p className="ll-muted">This goes into every kit you share, so everyone who gets it knows where to gather first. Pick a public place everyone knows.</p>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
      {coords && <button className="ll-btn" disabled={busy} onClick={() => search(true)}>Find near {areaLabel || 'my area'}</button>}
      <button className="ll-btn ghost" disabled={busy} onClick={() => search(false)}>Use my current location</button>
      {busy && <Loader2 className="animate-spin" size={20} />}
    </div>
    {error && <p className="ll-muted" role="status">{error}</p>}
    <div className="ll-list">
      {options.map(o => <label key={o.name + o.lat} className="ll-item" style={{ display: 'flex', gap: 10, cursor: 'pointer' }}>
        <input type="radio" name="meet" checked={value?.name === o.name} onChange={() => onChange(o)} />
        <span><b>{o.name}</b><br /><span className="ll-muted">{o.kind} · {o.distance}{o.address ? ` · ${o.address}` : ''}</span></span>
      </label>)}
    </div>
    <label className="ll-field" style={{ marginTop: 12 }}><span>Or type your own</span>
      <input placeholder="e.g. Lincoln Elementary School, front entrance" value={value?.kind ? '' : value?.name || ''} onChange={e => onChange(e.target.value ? { name: e.target.value } : null)} />
    </label>
    <pre className="ll-item" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 14 }}>{meetingPointText(value)}</pre>
  </section>;
}
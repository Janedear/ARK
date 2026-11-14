import React, { useState } from 'react';
import { MapPin, LocateFixed } from 'lucide-react';
import { searchArea, describePosition, currentPosition } from '@/lib/geocode';

export default function AreaSetup({ areaLabel, onSave, compact }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const runSearch = async e => {
    e.preventDefault();
    if (!query.trim()) return;
    setBusy(true); setError(''); setResults([]);
    try {
      const found = await searchArea(query.trim());
      if (found.length === 0) setError('No place matched that. Try a town and state, e.g. "Boone, NC".');
      setResults(found);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  const useMyLocation = async () => {
    setBusy(true); setError(''); setResults([]);
    try {
      const position = await currentPosition();
      const label = await describePosition(position.lat, position.lon);
      await onSave({ label, ...position });
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  const pick = async result => {
    setBusy(true);
    await onSave(result);
    setResults([]);
    setQuery('');
    setBusy(false);
  };

  return <section className="ll-card">
    <h2><MapPin size={16} style={{ marginRight: 8, verticalAlign: -2 }} />{areaLabel ? 'Your area' : 'Set your area'}</h2>
    <p className="ll-muted" style={{ marginTop: 6 }}>
      {areaLabel
        ? <>Showing resources near <b>{areaLabel}</b>. Only you can see this setting.</>
        : 'ARK only shows what is near you, so nobody has to wade through listings for somewhere else. This stays on your account and is never published.'}
    </p>

    <form onSubmit={runSearch} style={{ marginTop: 12 }}>
      <div className="ll-search" style={{ marginBottom: 8 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Town and state, e.g. Asheville, NC" aria-label="Search for your area" />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="ll-btn" disabled={busy}>{busy ? 'Looking…' : 'Search'}</button>
        <button type="button" className="ll-btn" onClick={useMyLocation} disabled={busy}>
          <LocateFixed size={16} /> Use my location
        </button>
      </div>
    </form>

    {error && <p className="ll-muted" style={{ marginTop: 10, color: 'hsl(var(--danger))' }}>{error}</p>}

    {results.length > 0 && <div className="ll-list" style={{ marginTop: 12 }}>
      {results.map(result => <button key={`${result.lat},${result.lon},${result.label}`} className="ll-item" style={{ textAlign: 'left', width: '100%' }} onClick={() => pick(result)}>
        <b>{result.label}</b>
        {!compact && <div className="ll-eyebrow" style={{ marginTop: 4 }}>Tap to use this area</div>}
      </button>)}
    </div>}

    <p className="ll-muted" style={{ marginTop: 12 }}>
      Search needs a connection. If you are already offline, use your own location, or read the printed packet instead.
    </p>
  </section>;
}
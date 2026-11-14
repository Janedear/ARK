import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Radio } from 'lucide-react';
import useUserArea from '@/components/resources/useUserArea';
import '@/components/lifeline/lifeline.css';

const severityClass = severity => {
  if (severity === 'Extreme' || severity === 'Severe') return 'll-chip warn';
  return 'll-chip';
};

export default function LocalAlerts() {
  const { coords, areaLabel, loading: areaLoading } = useUserArea();
  const [alerts, setAlerts] = useState([]);
  const [state, setState] = useState('idle');
  const [checkedAt, setCheckedAt] = useState(null);

  useEffect(() => {
    if (!coords) return;
    let alive = true;
    setState('loading');
    const url = `https://api.weather.gov/alerts/active?point=${coords.lat},${coords.lon}`;
    fetch(url, { headers: { Accept: 'application/geo+json' } })
      .then(res => { if (!res.ok) throw new Error('feed unavailable'); return res.json(); })
      .then(json => {
        if (!alive) return;
        setAlerts((json.features || []).slice(0, 5).map(f => f.properties));
        setCheckedAt(new Date());
        setState('ok');
      })
      .catch(() => { if (alive) setState('error'); });
    return () => { alive = false; };
  }, [coords]);

  return <section className="ll-card" style={{ marginTop: 18 }}>
    <h2><Radio size={16} style={{ marginRight: 8, verticalAlign: -2 }} />Official warnings for your area</h2>

    {areaLoading && <p className="ll-muted" style={{ marginTop: 6 }}>Checking your area…</p>}

    {!areaLoading && !coords && <p className="ll-muted" style={{ marginTop: 6 }}>
      Set your area once and ARK will show the National Weather Service warnings that apply where you are. <Link to="/Resources" style={{ textDecoration: 'underline' }}>Set your area</Link>.
    </p>}

    {coords && state === 'loading' && <p className="ll-muted" style={{ marginTop: 6 }}>Checking official alerts for {areaLabel}…</p>}

    {coords && state === 'error' && <p className="ll-muted" style={{ marginTop: 6 }}>
      Could not reach the National Weather Service. That does <b>not</b> mean there is no warning. Use a battery radio, NOAA Weather Radio, or try again when you have a connection.
    </p>}

    {coords && state === 'ok' && alerts.length === 0 && <p className="ll-muted" style={{ marginTop: 6 }}>
      No active National Weather Service alerts for {areaLabel}. Checked {checkedAt?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}.
    </p>}

    {coords && state === 'ok' && alerts.length > 0 && <div className="ll-list" style={{ marginTop: 10 }}>
      {alerts.map((alert, index) => <div className="ll-item" key={`${alert.id || index}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <b>{alert.event || alert.headline}</b>
          {alert.severity && <span className={severityClass(alert.severity)}>{alert.severity}</span>}
        </div>
        {alert.headline && <p className="ll-muted" style={{ marginTop: 4 }}>{alert.headline}</p>}
        <div className="ll-muted">{[alert.areaDesc, alert.senderName].filter(Boolean).join(' · ')}</div>
        {alert.instruction && <p style={{ marginTop: 8 }}>{alert.instruction}</p>}
        <div className="ll-eyebrow" style={{ marginTop: 6 }}>
          {alert.ends ? `In effect until ${new Date(alert.ends).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : 'End time not given'}
        </div>
      </div>)}
    </div>}

    <p className="ll-muted" style={{ marginTop: 10 }}>
      Live from the National Weather Service. ARK does not issue alerts, and this feed covers weather-related warnings only — not evacuation orders, water notices or security incidents. Those come from local officials.
    </p>
  </section>;
}
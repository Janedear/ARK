import React, { useEffect, useRef } from 'react';
export default function OverviewTrend({ months, rows, selected, onSelect }) {
  const root = useRef(null);
  const counts = months.map(m => rows.find(r => r.created_date?.slice(0, 7) === m.key)?.count || 0);
  const maximum = Math.max(1, ...counts);
  const y = value => 94 - value / maximum * 76;
  const sample = pos => { const i = Math.min(10, Math.floor(pos)); const t = pos - i; const p0 = counts[Math.max(0, i - 1)], p1 = counts[i], p2 = counts[i + 1], p3 = counts[Math.min(11, i + 2)]; return Math.max(0, .5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t)); };
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animations = [...root.current.querySelectorAll('.smd-ridge-line')].map((el, i) => el.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 620, delay: i * 8, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' }));
    return () => animations.forEach(a => a.cancel());
  }, [rows]);
  return <section className="smd-panel smd-panel--flow" ref={root}><h2 className="smd-panel-title">Reports over 12 months <span>{counts[selected]} selected</span></h2><p className="smd-description">Recorded reports only. A low count does not establish safety.</p><div className="smd-ridge" onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); onSelect(Math.max(0, Math.min(11, Math.round((e.clientX - rect.left) / rect.width * 11)))); }}><div className="smd-ridge-chart"><svg className="smd-ridge-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{Array.from({ length: 97 }, (_, i) => <line key={i} className="smd-ridge-line" x1={i / 96 * 100} x2={i / 96 * 100} y1="100" y2={y(sample(i / 96 * 11))} />)}<line className="smd-ridge-accent" x1={selected / 11 * 100} x2={selected / 11 * 100} y1="100" y2={y(counts[selected])} /></svg><span className="smd-ridge-dot" style={{ left: `${selected / 11 * 100}%`, top: `${y(counts[selected])}%` }} /></div></div><div className="smd-ridge-labels">{months.map((m, i) => <button key={m.key} className={i === selected ? 'is-selected' : ''} onClick={() => onSelect(i)} aria-label={`${m.label}: ${counts[i]} reports`}>{m.short}</button>)}</div></section>;
}
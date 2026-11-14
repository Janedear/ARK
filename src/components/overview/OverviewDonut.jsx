import React, { useEffect, useRef, useState } from 'react';
const categories = [['critical', 'Critical', 'danger'], ['high', 'High', 'warning'], ['medium', 'Medium', 'info'], ['low', 'Low', 'success']];
export default function OverviewDonut({ rows, total }) {
  const [active, setActive] = useState(null);
  const svg = useRef(null);
  let cumulative = 0;
  const slices = categories.map(([key, label, tone]) => { const count = rows.find(r => r.severity === key)?.count || 0; const pct = total ? count / total * 100 : 0; const offset = cumulative; cumulative += pct; return { key, label, tone, count, pct, offset }; });
  useEffect(() => {
    setActive(null);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animations = [...svg.current.querySelectorAll('.smd-seg')].map(el => el.animate([{ strokeDasharray: '0 100' }, { strokeDasharray: el.getAttribute('stroke-dasharray') }], { duration: Math.max(Number(el.dataset.pct) * 9.5, 70), delay: Number(el.dataset.offset) * 9.5, easing: 'linear', fill: 'backwards' }));
    return () => animations.forEach(a => a.cancel());
  }, [rows]);
  const selected = slices.find(s => s.key === active);
  return <section className="smd-panel smd-panel--spend"><h2 className="smd-panel-title">Reports by severity <span>{total} reported</span></h2><p className="smd-description">Incidents recorded in the selected month, not verified emergency alerts.</p>
    <div className="smd-donut-wrap" data-smd-total={total} onMouseLeave={() => setActive(null)}>
      <div className={`smd-donut ${active ? 'is-active' : ''}`}><svg ref={svg} className="smd-donut-svg" viewBox="0 0 42 42" role="img" aria-label={slices.map(s => `${s.label}: ${s.count}`).join(', ')}><circle className="smd-ring" cx="21" cy="21" r="15.915" />{slices.filter(s => s.count).map(s => <circle key={s.key} className={`smd-seg smd-tone-${s.tone} ${active === s.key ? 'is-hi' : ''}`} cx="21" cy="21" r="15.915" pathLength="100" strokeDasharray={`${s.pct} ${100 - s.pct}`} strokeDashoffset={-s.offset} data-pct={s.pct} data-offset={s.offset} onMouseEnter={() => setActive(s.key)} />)}</svg><div className="smd-donut-center"><b>{(selected?.count ?? total).toLocaleString()}</b><small>{selected?.label || 'TOTAL REPORTS'}</small></div></div>
      <ul className="smd-legend">{slices.map(s => <li key={s.key} className={active === s.key ? 'is-hi' : ''} onMouseEnter={() => setActive(s.key)}><button onFocus={() => setActive(s.key)} onBlur={() => setActive(null)} onClick={() => setActive(active === s.key ? null : s.key)} aria-label={`${s.label}, ${s.count} reports, ${s.pct.toFixed(1)} percent`}><span className={`smd-swatch smd-tone-${s.tone}`} /><span className="smd-leg-name">{s.label}</span><span className="smd-bar"><span className={`smd-bar-fill smd-tone-${s.tone}`} style={{ width: `${s.pct}%` }} /></span><span className="smd-leg-amt">{s.count} · {s.pct.toFixed(0)}%</span></button></li>)}</ul>
    </div>{total === 0 && <p className="smd-description">No incident reports recorded in this month.</p>}
  </section>;
}
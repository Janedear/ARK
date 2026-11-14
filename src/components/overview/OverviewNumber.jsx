import React, { useEffect, useRef } from 'react';
export default function OverviewNumber({ value, suffix = '' }) {
  const root = useRef(null);
  const text = `${Number(value).toLocaleString()}${suffix}`;
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animations = [...root.current.querySelectorAll('.smd-odo-strip')].map((el, index) => el.animate([{ transform: 'translateY(0em)' }, { transform: `translateY(-${el.dataset.land}em)` }], { duration: 1600, delay: index * 80, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' }));
    return () => animations.forEach(a => a.cancel());
  }, [text]);
  return <span ref={root} className="smd-odo" aria-label={text} data-smd-count={value}>{[...text].map((char, i) => /\d/.test(char) ? <span aria-hidden="true" className="smd-odo-reel" key={i}><span className="smd-odo-strip" data-land={10 + Number(char)} style={{ transform: `translateY(-${10 + Number(char)}em)` }}>{Array.from({ length: 11 + Number(char) }, (_, d) => <span className="smd-odo-d" key={d}>{d % 10}</span>)}</span></span> : <span aria-hidden="true" className="smd-odo-static" key={i}>{char}</span>)}</span>;
}
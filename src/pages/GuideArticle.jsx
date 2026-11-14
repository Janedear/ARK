import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { guideBySlug } from '@/content/lifelineGuides';
import '@/components/lifeline/lifeline.css';

export default function GuideArticle() {
  const { slug } = useParams();
  const guide = guideBySlug(slug);
  const missing = !guide;

  useEffect(() => {
    if (!missing) return;
    const meta = document.createElement('meta');
    meta.name = 'prerender-status-code';
    meta.content = '404';
    document.head.appendChild(meta);
    return () => document.head.removeChild(meta);
  }, [missing]);

  if (missing) return <div className="ll-page">
    <h1>Guidance not found</h1>
    <p className="ll-muted">That article does not exist. <Link to="/Guidance" style={{ textDecoration: 'underline' }}>Browse the guidance library</Link>.</p>
  </div>;

  return <article className="ll-page">
    <Link to="/Guidance" className="ll-eyebrow">← All guidance</Link>
    <h1 style={{ margin: '10px 0 8px' }}>{guide.title}</h1>
    <p className="ll-muted">{guide.summary}</p>
    <div className="ll-alert"><strong>Draft for professional review</strong>Prepared from public preparedness sources. Not reviewed by a clinician yet, and not a substitute for emergency services.</div>
    <button className="ll-btn no-print" onClick={() => window.print()} style={{ marginBottom: 20 }}><Printer size={16} /> Print this page</button>

    <section className="ll-card" style={{ marginBottom: 16 }}>
      <h2>Do these first</h2>
      <ol style={{ paddingLeft: 22, marginTop: 10 }}>{guide.quickSteps.map(s => <li key={s} style={{ marginBottom: 10 }}>{s}</li>)}</ol>
    </section>

    {guide.sections.map(s => <section className="ll-card" key={s.heading} style={{ marginBottom: 16 }}>
      <h2>{s.heading}</h2>
      {s.body.map(p => <p key={p} style={{ marginTop: 8 }}>{p}</p>)}
    </section>)}

    <section className="ll-card">
      <h2>Sources</h2>
      <ul style={{ paddingLeft: 20, marginTop: 8 }}>{guide.sources.map(s => <li key={s.url} style={{ marginBottom: 6 }}><a href={s.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>{s.label}</a></li>)}</ul>
      <p className="ll-muted" style={{ marginTop: 10 }}>Links require a connection. This page text does not, once it is open or printed.</p>
    </section>
  </article>;
}
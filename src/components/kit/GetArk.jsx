import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, Apple, Smartphone, Share2, Copy } from 'lucide-react';
import { buildZip, downloadBlob } from '@/components/toolkit/zip';
import { buildKitFiles } from '@/components/kit/kitFiles';

// Paste the store links here once the mobile apps are approved.
const APP_STORE_URL = '';
const PLAY_STORE_URL = '';

function StoreTile({ icon: Icon, name, url }) {
  return <div className="ll-tile"><Icon size={20} />{name}
    {url ? <a className="ll-btn" href={url} target="_blank" rel="noreferrer">Get it</a>
      : <small>Not listed yet. Use the web app or the kit until it is.</small>}
  </div>;
}

export default function GetArk() {
  const [notice, setNotice] = useState('');
  const webUrl = `${window.location.origin}/Home`;

  const share = async () => {
    const blob = buildZip(buildKitFiles());
    const file = new File([blob], 'ARK-offline-kit.zip', { type: 'application/zip' });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'ARK offline kit' }); setNotice('Share sheet opened. This does not confirm the other person received it.'); }
      catch (e) { setNotice(e.name === 'AbortError' ? 'Sharing cancelled.' : e.message); }
    } else { downloadBlob(blob, 'ARK-offline-kit.zip'); setNotice('This device cannot share files directly. The kit was saved instead: pass it by USB stick, Bluetooth or email.'); }
  };
  const copy = async () => { await navigator.clipboard.writeText(webUrl); setNotice('Web address copied.'); };

  return <section className="ll-card" style={{ marginTop: 18 }}>
    <h2>Get ARK any way you can</h2>
    <p className="ll-muted">If one route is down, use another. Every copy of the kit works on its own, so whoever has it can pass it on.</p>
    <div className="ll-grid">
      <div className="ll-tile"><Globe size={20} />Web app
        <small>Any browser, needs internet.</small>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><Link className="ll-btn" to="/Home">Open</Link><button className="ll-btn ghost" onClick={copy}><Copy size={15} />Copy link</button></div>
      </div>
      <StoreTile icon={Apple} name="iPhone — App Store" url={APP_STORE_URL} />
      <StoreTile icon={Smartphone} name="Android — Google Play" url={PLAY_STORE_URL} />
      <div className="ll-tile"><Share2 size={20} />Pass it on nearby
        <small>AirDrop, Nearby Share, Bluetooth, or any app on this phone. No internet needed for the person receiving it.</small>
        <button className="ll-btn" onClick={share}><Share2 size={15} />Share the kit</button>
      </div>
    </div>
    {notice && <p className="ll-muted" style={{ marginTop: 10 }} role="status">{notice}</p>}
  </section>;
}
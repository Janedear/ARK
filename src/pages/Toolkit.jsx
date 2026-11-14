import React from 'react';
import { Download, Radio, MessageSquare, AlertTriangle } from 'lucide-react';
import { TOOLKIT_FILES, toolkitSize } from '@/components/toolkit/toolkitFiles';
import { buildZip, downloadBlob } from '@/components/toolkit/zip';
import '@/components/lifeline/lifeline.css';

export default function Toolkit() {
  const download = () => downloadBlob(buildZip(TOOLKIT_FILES), 'ark-toolkit.zip');

  return <div className="ll-page">
    <span className="ll-eyebrow">Bridge toolkit</span>
    <h1 style={{ margin: '10px 0 8px' }}>Everything needed to reach radio and SMS</h1>
    <p className="ll-muted">
      One download with the two bridges this app cannot run itself, the signing and queueing code
      they share, a self-test, and setup notes. Free and open source: no Twilio, no satellite
      subscription, no app store account, no map licence.
    </p>

    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', margin: '16px 0' }}>
      <button className="ll-btn" onClick={download}>
        <Download size={16} style={{ marginRight: 6 }} />Download ark-toolkit.zip
      </button>
      <span className="ll-chip">{TOOLKIT_FILES.length} files · {Math.round(toolkitSize / 1024)} KB</span>
    </div>

    <div className="ll-alert">
      <strong>Read this before you rely on it</strong>
      Publish the app first — the bridges need a live address to send to. Every packet relayed is
      public and unencrypted, and none of it confirms that a person received anything. No satellite
      and no Bluetooth mesh is included, because neither can be done from a web app or for free.
    </div>

    <section className="ll-card" style={{ marginTop: 18 }}>
      <h2>What is in the file</h2>
      <div className="ll-list">
        {TOOLKIT_FILES.map(file => <div className="ll-item" key={file.path}>
          <b style={{ fontFamily: 'var(--font-heading)', fontSize: 13 }}>{file.label}</b>
          <div className="ll-muted">{file.purpose}</div>
        </div>)}
      </div>
    </section>

    <section className="ll-card" style={{ marginTop: 18 }}>
      <h2>What each bridge does</h2>
      <div style={{ display: 'grid', gap: 12, marginTop: 8 }}>
        <div>
          <div><Radio size={15} style={{ marginRight: 6, verticalAlign: -2 }} /><b>Radio</b></div>
          <p className="ll-muted">Text heard by a Meshtastic node on an MQTT channel becomes a signed ARK packet, and ARK messages are handed back to the node to transmit.</p>
        </div>
        <div>
          <div><MessageSquare size={15} style={{ marginRight: 6, verticalAlign: -2 }} /><b>SMS</b></div>
          <p className="ll-muted">An open-source SMS gateway on a spare Android phone passes received texts into ARK, and ARK messages are texted to the numbers you list.</p>
        </div>
      </div>
      <p className="ll-muted" style={{ marginTop: 12 }}>
        <AlertTriangle size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
        Both need a machine that stays awake and a person willing to keep it running. Hardware and
        carrier charges are yours; the software is not.
      </p>
    </section>
  </div>;
}
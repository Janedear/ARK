import React from 'react';

function when(iso) {
  if (!iso) return 'never';
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function StatusStrip({ online, at, stale }) {
  return <div className="ll-strip" role="status">
    <div><b>Connection</b>{online ? <span className="ll-chip ok">Online</span> : <span className="ll-chip bad">Offline</span>}</div>
    <div><b>Information updated</b><span>{when(at)}</span></div>
    <div><b>This screen</b><span>{stale ? 'Showing saved copy' : 'Live from the server'}</span></div>
  </div>;
}
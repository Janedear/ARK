import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function MessageCard({ row, acknowledgments, device, alias, enqueue, runtime, now }) {
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [bundle, setBundle] = useState('');
  const e = row.envelope, expired = Date.parse(e.expires_at) <= now;
  const own = e.public_key.x === device?.publicKey.x && e.public_key.y === device?.publicKey.y;
  const validAcks = acknowledgments.filter(a => a.public_key.x !== e.public_key.x || a.public_key.y !== e.public_key.y);
  const acknowledged = validAcks.some(a => a.public_key.x === device?.publicKey.x && a.public_key.y === device?.publicKey.y);
  const run = async action => { setBusy(true); setNotice(''); try { await action(); } catch (error) { setNotice(error.message); } finally { setBusy(false); } };
  return <article className="rounded-md border bg-card p-4 space-y-3">
    <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold">{e.alias} <span className="text-xs font-normal text-muted-foreground">{own ? '· this device' : '· unverified identity'}</span></h3><p className="text-xs text-muted-foreground">Claimed time: {new Date(e.issued_at).toLocaleString()}</p></div><span className="text-xs font-semibold rounded border px-2 py-1">{expired ? 'Expired · not relayed' : row.serverAt ? 'Server stored' : 'Local copy · queued'}</span></div>
    <p className="ark-message text-sm">{e.text}</p>
    <p className="text-xs text-muted-foreground">Expires {new Date(e.expires_at).toLocaleString()}{row.serverAt && ` · Server receipt ${new Date(row.serverAt).toLocaleString()}`}</p>
    <details className="text-xs text-muted-foreground"><summary>Packet & device signature</summary><p className="break-all">Packet: {e.id}</p><p className="break-all">Device key: {e.public_key.x}.{e.public_key.y}</p><p>Signature checked on import. Compare the full key through a trusted channel; an alias is not verified identity.</p></details>
    {validAcks.length > 0 ? <div className="border-l-2 border-primary pl-3 text-xs"><strong>Reading claimed by:</strong>{validAcks.map(a => <p key={a.id}>{a.alias} · key {a.public_key.x.slice(0, 10)}… · {new Date(a.issued_at).toLocaleString()}</p>)}<p>No promise of assistance.</p></div> : <p className="text-xs text-muted-foreground">No reader acknowledgment in this device’s saved copies.</p>}
    <div className="flex flex-wrap gap-2 ark-controls">
      {!own && <Button size="sm" variant="outline" disabled={busy || expired || acknowledged || !alias.trim() || !device} onClick={() => run(async () => { await enqueue({ alias, channel: e.channel, kind: 'ack', ref: e.id, expiresAt: e.expires_at }); setNotice('Your signed acknowledgment is saved locally and queued. It does not promise help.'); })}>{acknowledged ? 'Acknowledgment saved' : 'I have read this'}</Button>}
      <Button size="sm" variant="outline" disabled={busy || expired} onClick={() => run(async () => setBundle(await runtime.makeBundle(null, [e.id, ...validAcks.map(a => a.id)])))}>Relay this message</Button>
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(async () => { if (window.confirm('Remove only this device’s copy? Copies on other devices or the server remain and can return when syncing.')) await runtime.remove(e.id); })}>Remove local copy</Button>
    </div>
    {bundle && <label className="ark-field ark-controls">Copy this public bundle<textarea readOnly rows={3} className="ark-transfer" value={bundle} onFocus={event => event.target.select()} /></label>}
    {notice && <p role="status" className="text-sm">{notice}</p>}
  </article>;
}
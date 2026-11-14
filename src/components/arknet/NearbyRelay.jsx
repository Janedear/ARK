import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import createNearbyTransport from '@/components/arknet/nearbyTransport';

export default function NearbyRelay({ runtime, channel, onImport }) {
  const [state, setState] = useState('Not paired'), [receipt, setReceipt] = useState(''), [outgoing, setOutgoing] = useState(''), [incoming, setIncoming] = useState(''), [busy, setBusy] = useState(false);
  const importer = React.useRef(onImport); importer.current = onImport;
  const peer = useMemo(() => createNearbyTransport({ onState: setState, onBundle: text => importer.current(text), onReceipt: setReceipt }), [runtime]);
  useEffect(() => () => peer.disconnect(), [peer]);
  const run = async action => { setBusy(true); try { await action(); } catch (error) { setState(error.message); } finally { setBusy(false); } };
  return <section className="ll-card space-y-3 ark-controls"><h2>Nearby browser connection</h2><p className="ll-muted">Experimental: put both devices on the same Wi-Fi or hotspot, keep both pages open, and exchange pairing codes using a method already available. No Bluetooth discovery, external pairing service or internet relay is used; local network restrictions may prevent connection.</p>
    <p className="text-sm"><strong>Pair only with someone you choose.</strong> Pairing exposes network connection details and accepts their signed public bundles into your relay queue. It does not verify who they are.</p>
    <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => run(async () => setOutgoing(await peer.offer()))}>1. Create offer</Button><Button variant="outline" onClick={() => { peer.disconnect(); setOutgoing(''); setReceipt(''); }}>Disconnect / reset</Button></div>
    <label className="ark-field">Code from the other person<textarea className="ark-transfer" value={incoming} onChange={e => setIncoming(e.target.value)} rows={3} maxLength={60000} placeholder="Paste their offer or answer" /></label>
    <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy || !incoming} onClick={() => run(async () => setOutgoing(await peer.answer(incoming)))}>2. Answer an offer</Button><Button variant="outline" disabled={busy || !incoming} onClick={() => run(() => peer.finish(incoming))}>3. Apply their answer</Button></div>
    {outgoing && <><label className="ark-field">Give this code to the other person<textarea className="ark-transfer" readOnly value={outgoing} rows={3} onFocus={e => e.target.select()} /></label><Button variant="outline" onClick={() => run(async () => { await navigator.clipboard.writeText(outgoing); setReceipt('Pairing code copied.'); })}>Copy pairing code</Button></>}
    <p role="status" className="text-sm font-semibold">{busy ? 'Working… ' : ''}{state}</p>
    <Button disabled={busy} onClick={() => run(async () => peer.send(await runtime.makeBundle(channel)))}>Send channel’s public bundle</Button>
    {receipt && <p role="status" className="text-sm">{receipt}</p>}
    <p className="text-xs text-muted-foreground">A peer storage receipt confirms only what that peer reports storing. It is not an acknowledgment of reading or a promise of assistance.</p>
  </section>;
}
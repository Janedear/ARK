import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import MessageCard from '@/components/arknet/MessageCard';

export default function MessageFeed({ network, channel, alias }) {
  const [now, setNow] = useState(Date.now()), [visible, setVisible] = useState(50);
  // Presentation-only clock: no server polling.
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  useEffect(() => setVisible(50), [channel]);
  const messages = network.rows.filter(r => r.envelope.kind === 'message' && r.envelope.channel === channel);
  const acknowledgments = network.rows.filter(r => r.envelope.kind === 'ack');
  return <section className="space-y-4" aria-label="Public message feed"><div><span className="ll-eyebrow">Public channel / {channel}</span><h2 className="font-semibold mt-1">Saved reports & acknowledgments</h2><p className="ll-muted">A mix of local, relayed and server-confirmed copies. Source labels matter. Channels do not restrict who can read them.</p></div>
    {network.loading ? <p role="status" className="ll-card">Opening this device’s saved packets…</p> : messages.length === 0 ? <div className="ll-card"><h3 className="font-semibold">No saved reports in this channel</h3><p className="text-sm mt-1">Create a message, import a public bundle, or sync when a gateway is reachable.</p></div> : messages.slice(0, visible).map(row => <MessageCard key={row.id} row={row} acknowledgments={acknowledgments.filter(r => r.envelope.ref === row.id).map(r => r.envelope)} device={network.device} alias={alias} enqueue={network.enqueue} runtime={network.runtime} now={now} />)}
    {!alias.trim() && messages.length > 0 && <p className="text-sm text-muted-foreground">Enter a public alias in the message form to acknowledge reading a report.</p>}
    <div className="flex flex-wrap gap-2">{messages.length > visible && <Button variant="outline" onClick={() => setVisible(value => value + 50)}>Show more saved reports</Button>}{network.hasMore && <Button variant="outline" disabled={network.status.phase === 'syncing'} onClick={() => network.sync(true)}>Load older server packets</Button>}</div>
  </section>;
}
import React from 'react';
import { RefreshCw, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NetworkStatus({ status, rows, sync }) {
  const queued = rows.filter(row => !row.serverAt && Date.parse(row.envelope.expires_at) > Date.now()).length;
  const labels = { unknown: 'Not yet checked', syncing: 'Contacting gateway…', available: 'Gateway reached at last check', unavailable: 'Gateway not confirmed' };
  return <section className="ll-card space-y-3" aria-label="Transport status">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 font-semibold"><Radio size={19} />{labels[status.phase]}</div><Button onClick={() => sync()} disabled={status.phase === 'syncing' || Date.now() < (status.retryAt || 0)} variant="outline"><RefreshCw size={16} className={status.phase === 'syncing' ? 'animate-spin' : ''} />Sync now</Button></div>
    <div className="grid gap-3 sm:grid-cols-3 text-sm"><p><b className="block">{queued} queued locally</b><span className="text-muted-foreground">Not confirmed on the server</span></p><p><b className="block">{status.lastContact ? new Date(status.lastContact).toLocaleString() : 'No server receipt yet'}</b><span className="text-muted-foreground">Last successful gateway contact</span></p><p><b className="block">Keep this page open</b><span className="text-muted-foreground">No background delivery guarantee</span></p></div>
    {status.error && <p className="text-sm text-destructive" role="status">{status.error} {status.retryAt && `Next automatic attempt no earlier than ${new Date(status.retryAt).toLocaleTimeString()}.`}</p>}
    <p className="ll-muted">Local counts include relay packets and acknowledgments from every channel. A server receipt is not proof anyone has read a message. Refresh for new reports; this is not a continuously monitored feed.</p>
  </section>;
}
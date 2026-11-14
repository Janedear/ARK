import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { URGENCY } from './hubConfig';

export default function HelpRequestItem({ request, me, onChange }) {
  const [busy, setBusy] = useState(false);
  const u = URGENCY[request.urgency] || URGENCY.medium;
  const isClaimer = request.claimed_by === me?.email;
  const canClose = isClaimer || request.created_by_id === me?.id || me?.role === 'admin';

  const [error, setError] = useState('');

  const update = async (data) => {
    setBusy(true); setError('');
    try {
      // Someone else may have claimed it since this list loaded.
      if (data.status === 'claimed' && (await base44.entities.HelpRequest.get(request.id)).status !== 'open') {
        setError('Someone else just took this one.');
      } else {
        await base44.entities.HelpRequest.update(request.id, data);
      }
    } catch (e) {
      setError(e.message || 'That change could not be saved. Try again.');
    }
    setBusy(false);
    onChange();
  };

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold">{request.title}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${u.badge}`}>{u.label}</span>
      </div>
      {request.location && <div className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{request.location}</div>}
      {request.details && <p className="text-sm whitespace-pre-wrap">{request.details}</p>}
      <p className="text-xs text-muted-foreground">
        {request.requester_name || 'Someone'} · {formatDistanceToNow(new Date(request.created_date), { addSuffix: true })}
        {request.status === 'claimed' && <span className="font-semibold text-foreground"> · Handled by {request.claimed_by_name || request.claimed_by}</span>}
      </p>
      <div className="flex gap-2">
        {busy && <Loader2 className="h-4 w-4 animate-spin self-center" />}
        {request.status === 'open' && (
          <Button size="sm" disabled={busy} onClick={() => update({ status: 'claimed', claimed_by: me.email, claimed_by_name: me.full_name })}>I'll handle it</Button>
        )}
        {request.status === 'claimed' && isClaimer && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => update({ status: 'open', claimed_by: '', claimed_by_name: '' })}>Release</Button>
        )}
        {canClose && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => update({ status: 'done' })}>Mark done</Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}
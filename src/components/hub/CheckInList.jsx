import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, MapPin, Phone, Wrench } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { CHECKIN_STATUS } from './hubConfig';

export default function CheckInList({ checkIns, counts, filter, onFilter }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const tabs = [['all', 'Everyone', total], ...Object.entries(CHECKIN_STATUS).map(([k, s]) => [k, s.short, counts[k] || 0])];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5" /> Who's checked in</CardTitle>
        <div className="flex flex-wrap gap-2 pt-2">
          {tabs.map(([key, label, n]) => (
            <button key={key} onClick={() => onFilter(key)}
              className={`rounded-full px-3 py-1 text-sm font-medium border ${filter === key ? 'bg-slate-900 text-white border-slate-900' : 'bg-card hover:bg-muted'}`}>
              {label} <span className="font-bold">{n}</span>
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {checkIns.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No one here yet.</p>}
        {checkIns.map((c) => {
          const s = CHECKIN_STATUS[c.status];
          return (
            <div key={c.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{c.name}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded border ${s?.badge}`}>{s?.short}</span>
              </div>
              <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                {c.location && <div className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{c.location}</div>}
                {c.phone && <div className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /><a href={`tel:${c.phone}`} className="underline">{c.phone}</a></div>}
                {c.skills && <div className="flex items-center gap-1"><Wrench className="h-3.5 w-3.5" />{c.skills}</div>}
                {c.note && <p className="text-foreground">{c.note}</p>}
                <p className="text-xs">{formatDistanceToNow(new Date(c.updated_date), { addSuffix: true })}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
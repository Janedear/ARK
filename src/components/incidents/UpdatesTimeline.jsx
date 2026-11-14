import React from 'react';
import { format } from 'date-fns';
import { Flag, MessageSquare, PlusCircle, Play, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import AddNoteForm from './AddNoteForm';
import { getStage } from './incidentConfig';

const KIND_ICON = { status_change: Flag, note: MessageSquare, action_added: PlusCircle, action_updated: Play, action_completed: CheckCircle2 };

export default function UpdatesTimeline({ incident, updates, onChange }) {
  return (
    <Card>
      <CardHeader className="p-4"><CardTitle className="text-lg">Timeline</CardTitle></CardHeader>
      <CardContent className="space-y-4 p-4 pt-0">
        {incident.status !== 'closed' && <AddNoteForm incidentId={incident.id} onChange={onChange} />}
        {updates.length === 0 && <div className="text-sm text-gray-500 text-center py-4">No activity yet.</div>}
        <div className="space-y-4">
          {updates.map((u) => {
            const Icon = KIND_ICON[u.kind] || MessageSquare;
            return (
              <div key={u.id} className="flex gap-3">
                <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <Icon className="h-3.5 w-3.5 text-slate-600" />
                </div>
                <div className="min-w-0 flex-1">
                  {u.kind === 'status_change' && u.to_status && (
                    <div className="text-sm font-semibold text-gray-900">
                      {u.from_status ? `${getStage(u.from_status).label} → ` : ''}{getStage(u.to_status).label}
                    </div>
                  )}
                  <div className="text-sm text-gray-700 whitespace-pre-wrap break-words">{u.message}</div>
                  <div className="text-xs text-gray-400 mt-0.5 break-all">{u.actor_email} · {format(new Date(u.created_date), 'MMM d, HH:mm')}</div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
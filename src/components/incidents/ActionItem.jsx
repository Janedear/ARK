import React, { useState } from 'react';
import { format, isPast } from 'date-fns';
import { Sparkles, User, Clock, Play, Check, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ACTION_STATUS, OPEN_ACTION_STATUSES, getPhase } from './incidentConfig';
import { logUpdate } from './logUpdate';
import CompleteActionDialog from './CompleteActionDialog';

export default function ActionItem({ action, onChange }) {
  const [outcome, setOutcome] = useState(null);
  const [starting, setStarting] = useState(false);
  const isOpen = OPEN_ACTION_STATUSES.includes(action.status);
  const overdue = isOpen && action.due_at && isPast(new Date(action.due_at));
  const status = ACTION_STATUS[action.status] || ACTION_STATUS.planned;
  const phase = getPhase(action.phase);

  const start = async () => {
    setStarting(true);
    try {
      await base44.entities.IncidentAction.update(action.id, { status: 'in_progress', started_at: new Date().toISOString() });
      await logUpdate(action.incident_id, { kind: 'action_updated', message: `Started: ${action.title}` });
      onChange();
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className={`border rounded-lg p-3 bg-white ${overdue ? 'border-red-300' : ''} ${isOpen ? '' : 'opacity-80'}`}>
      <div className={`font-medium text-sm ${action.status === 'cancelled' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{action.title}</div>
      <div className="flex flex-wrap gap-1 mt-1.5">
        <Badge variant="outline" className={phase.badge}>{phase.label}</Badge>
        <Badge variant="outline" className={status.badge}>{status.label}</Badge>
        {action.ai_suggested && <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200"><Sparkles className="h-3 w-3 mr-1" />AI suggested</Badge>}
      </div>
      {action.details && <p className="text-xs text-gray-600 mt-2 whitespace-pre-wrap">{action.details}</p>}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1 break-all"><User className="h-3 w-3 shrink-0" />{action.assigned_to || 'Unassigned'}</span>
        {action.due_at && (
          <span className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-semibold' : ''}`}>
            <Clock className="h-3 w-3" />{overdue ? 'Overdue: ' : 'Due '}{format(new Date(action.due_at), 'MMM d, HH:mm')}
          </span>
        )}
      </div>
      {action.result_notes && (
        <div className="mt-2 text-xs bg-gray-50 rounded p-2"><span className="font-semibold">Result:</span> {action.result_notes}</div>
      )}
      {isOpen && (
        <div className="flex flex-wrap gap-2 mt-3">
          {action.status === 'planned' && <Button size="sm" variant="outline" onClick={start} disabled={starting}><Play />Start</Button>}
          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setOutcome('done')}><Check />Complete</Button>
          <Button size="sm" variant="outline" className="text-red-600" onClick={() => setOutcome('failed')}><X />Failed</Button>
        </div>
      )}
      <CompleteActionDialog action={action} outcome={outcome} onClose={() => setOutcome(null)} onChange={onChange} />
    </div>
  );
}
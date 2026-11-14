import React, { useState } from 'react';
import { format } from 'date-fns';
import { ArrowRightCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getStage, SEVERITY_BADGE, humanize } from './incidentConfig';
import { logUpdate } from './logUpdate';

export default function IncidentHeader({ incident, onAdvance, onChange }) {
  const [claiming, setClaiming] = useState(false);
  const stage = getStage(incident.status);

  const takeLead = async () => {
    setClaiming(true);
    try {
      const user = await base44.auth.me();
      await base44.entities.Incident.update(incident.id, { lead_email: user.email });
      await logUpdate(incident.id, { kind: 'note', message: `${user.email} took the lead` });
      onChange();
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="bg-white border rounded-xl p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-mono text-gray-500">{incident.incident_number || 'No reference number'}</div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{incident.title}</h1>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Badge variant="outline" className={`capitalize ${SEVERITY_BADGE[incident.severity]}`}>{incident.severity}</Badge>
            <Badge variant="outline" className={stage.badge}>{stage.label}</Badge>
            <Badge variant="outline" className="capitalize">{humanize(incident.incident_type)}</Badge>
            <Badge variant="outline" className="capitalize">{humanize(incident.affected_region)}</Badge>
          </div>
        </div>
        {incident.status !== 'closed' && (
          <Button onClick={onAdvance} className="bg-slate-900 hover:bg-slate-800 w-full sm:w-auto"><ArrowRightCircle />Change stage</Button>
        )}
      </div>
      {incident.description && <p className="text-sm text-gray-600 whitespace-pre-wrap">{incident.description}</p>}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
        <span>Lead: <span className="font-medium text-gray-800 break-all">{incident.lead_email || 'Unassigned'}</span></span>
        {!incident.lead_email && (
          <Button size="sm" variant="link" className="h-auto p-0 text-xs" onClick={takeLead} disabled={claiming}>Take the lead</Button>
        )}
        {incident.declared_at && <span>Declared {format(new Date(incident.declared_at), 'MMM d, yyyy HH:mm')}</span>}
        {incident.civilians_affected > 0 && <span>{incident.civilians_affected.toLocaleString()} civilians affected</span>}
      </div>
      {incident.resolution_summary && (
        <div className="text-sm bg-green-50 border border-green-200 rounded p-2"><span className="font-semibold">Resolution:</span> {incident.resolution_summary}</div>
      )}
      {incident.lessons_learned && (
        <div className="text-sm bg-blue-50 border border-blue-200 rounded p-2"><span className="font-semibold">Lessons learned:</span> {incident.lessons_learned}</div>
      )}
    </div>
  );
}
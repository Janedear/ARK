import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { getStage, SEVERITY_BADGE, humanize } from './incidentConfig';

export default function IncidentCard({ incident }) {
  const stage = getStage(incident.status);
  return (
    <Link to={`/IncidentDetail?id=${incident.id}`} className="block bg-white border rounded-xl p-4 hover:shadow-md hover:border-slate-300 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {incident.incident_number && <div className="text-xs font-mono text-gray-400">{incident.incident_number}</div>}
          <div className="font-semibold text-gray-900">{incident.title}</div>
          <div className="text-xs text-gray-500 mt-1 capitalize">{humanize(incident.incident_type)} · {humanize(incident.affected_region)}</div>
        </div>
        <Badge variant="outline" className={`capitalize shrink-0 ${SEVERITY_BADGE[incident.severity]}`}>{incident.severity}</Badge>
      </div>
      <div className="flex items-center justify-between gap-3 mt-3 text-xs">
        <span className="inline-flex items-center gap-1.5 font-medium text-gray-800 shrink-0">
          <span className={`h-2 w-2 rounded-full ${stage.dot}`} />{stage.label}
        </span>
        <span className="text-gray-400 truncate">Lead: {incident.lead_email || 'Unassigned'}</span>
      </div>
    </Link>
  );
}
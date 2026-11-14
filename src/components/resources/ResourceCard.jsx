import React from 'react';
import { Trash2 } from 'lucide-react';
import { formatDistance } from '@/lib/geo';

export default function ResourceCard({ resource, distance, canManage, onDelete }) {
  const shown = formatDistance(distance);
  return <div className="ll-item">
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
      <b>{resource.name}</b>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {shown && <span className="ll-chip">{shown}</span>}
        {resource.status === 'verified'
          ? <span className="ll-chip ok">Verified</span>
          : resource.status === 'closed'
            ? <span className="ll-chip">Closed</span>
            : <span className="ll-chip warn">Unverified</span>}
        {resource.visibility === 'private' && <span className="ll-chip">Only you</span>}
      </div>
    </div>
    <div className="ll-muted">{[resource.category, resource.area, resource.address].filter(Boolean).join(' · ')}</div>
    {resource.access_notes && <p className="ll-muted" style={{ marginTop: 6 }}>{resource.access_notes}</p>}
    {resource.accessibility && <p className="ll-muted">Accessibility: {resource.accessibility}</p>}
    {resource.contact && <p className="ll-muted" style={{ marginTop: 4 }}>{resource.contact}</p>}
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <div className="ll-eyebrow">Source: {resource.source_name || 'not recorded'} · Last checked: {resource.last_verified || 'unknown'}</div>
      {canManage && <button className="ll-btn" onClick={() => onDelete(resource)}><Trash2 size={14} /> Remove</button>}
    </div>
  </div>;
}
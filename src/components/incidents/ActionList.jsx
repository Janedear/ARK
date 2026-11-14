import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import ActionItem from './ActionItem';
import AddActionDialog from './AddActionDialog';
import { OPEN_ACTION_STATUSES, phaseForStage } from './incidentConfig';

export default function ActionList({ incident, actions, onChange }) {
  const isOpen = (a) => OPEN_ACTION_STATUSES.includes(a.status);
  const sorted = [...actions].sort((a, b) => isOpen(b) - isOpen(a));
  const done = actions.filter((a) => a.status === 'done').length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 p-4">
        <div>
          <CardTitle className="text-lg">Response actions</CardTitle>
          <p className="text-xs text-gray-500 mt-1">{done} of {actions.length} complete</p>
        </div>
        {incident.status !== 'closed' && (
          <AddActionDialog incidentId={incident.id} defaultPhase={phaseForStage(incident.status)} onChange={onChange} />
        )}
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        {sorted.length === 0 ? (
          <div className="text-center text-sm text-gray-500 py-8 border border-dashed rounded-lg">
            No actions yet. Add one, or ask the AI advisor for recommendations.
          </div>
        ) : (
          sorted.map((a) => <ActionItem key={a.id} action={a} onChange={onChange} />)
        )}
      </CardContent>
    </Card>
  );
}
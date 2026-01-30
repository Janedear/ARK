import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function IncidentTimeline({ incident, auditLogs }) {
  const incidentLogs = auditLogs
    .filter(log => log.affected_resources?.includes(incident.id))
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const statusSteps = [
    { status: 'reported', label: 'Reported', color: 'text-blue-600' },
    { status: 'investigating', label: 'Investigating', color: 'text-yellow-600' },
    { status: 'responding', label: 'Responding', color: 'text-orange-600' },
    { status: 'recovering', label: 'Recovering', color: 'text-purple-600' },
    { status: 'resolved', label: 'Resolved', color: 'text-green-600' }
  ];

  const currentStepIndex = statusSteps.findIndex(s => s.status === incident.status);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Incident Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {statusSteps.map((step, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              const Icon = isPast ? CheckCircle : isCurrent ? AlertCircle : Circle;

              return (
                <div key={step.status} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <Icon 
                      className={`h-6 w-6 ${isPast || isCurrent ? step.color : 'text-gray-300'}`}
                    />
                    <span className={`text-xs mt-1 ${isPast || isCurrent ? 'font-semibold' : 'text-gray-400'}`}>
                      {step.label}
                    </span>
                  </div>
                  {idx < statusSteps.length - 1 && (
                    <div className={`flex-1 h-0.5 ${isPast ? 'bg-green-500' : 'bg-gray-200'} mx-2`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Action Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {incidentLogs.length > 0 ? (
              incidentLogs.map(log => (
                <div key={log.id} className="flex gap-3 items-start border-l-2 border-blue-200 pl-3 py-2">
                  <div className="flex-shrink-0 text-xs text-gray-500 w-32">
                    {format(new Date(log.created_date), 'MMM d, HH:mm')}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm capitalize">
                      {log.action_type.replace(/_/g, ' ')}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{log.action_details}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      By: {log.actor_email}
                    </div>
                  </div>
                  <Badge 
                    className={
                      log.outcome === 'success' ? 'bg-green-100 text-green-700' :
                      log.outcome === 'failure' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }
                  >
                    {log.outcome}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4 text-sm">
                No actions recorded yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
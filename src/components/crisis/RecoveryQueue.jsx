import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Lock, Clock, Users, AlertTriangle, Server } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function RecoveryQueue({ tasks, systems, onExecuteTask }) {
  const getSystemName = (systemId) => {
    const system = systems.find(s => s.id === systemId);
    return system?.system_name || systemId;
  };

  const statusConfig = {
    queued: { color: "bg-gray-100 text-gray-700", icon: Clock },
    blocked: { color: "bg-red-100 text-red-700", icon: Lock },
    in_progress: { color: "bg-blue-100 text-blue-700", icon: Clock },
    verification: { color: "bg-yellow-100 text-yellow-700", icon: AlertTriangle },
    complete: { color: "bg-green-100 text-green-700", icon: ArrowRight },
    failed: { color: "bg-red-100 text-red-700", icon: AlertTriangle }
  };

  // Sort by priority score descending
  const sortedTasks = [...tasks].sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Recovery Queue (Prioritized by Civilian Harm-Hours)
          </CardTitle>
          <Badge variant="outline" className="text-sm">
            {tasks.filter(t => t.status === 'complete').length} / {tasks.length} Complete
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Progress 
            value={(tasks.filter(t => t.status === 'complete').length / tasks.length) * 100} 
            className="h-2"
          />
        </div>
        <div className="space-y-3">
          {sortedTasks.slice(0, 10).map((task, idx) => {
            const statusInfo = statusConfig[task.status] || statusConfig.queued;
            const StatusIcon = statusInfo.icon;

            return (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-all"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-sm">
                  {idx + 1}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{task.task_title}</div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 flex-wrap">
                    {task.system_id && (
                      <span className="flex items-center gap-1">
                        <Server className="h-3 w-3" />
                        {getSystemName(task.system_id)}
                      </span>
                    )}
                    {task.harm_hours > 0 && (
                      <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                        <Users className="h-3 w-3 mr-1" />
                        {Math.round(task.harm_hours)} harm-hours
                      </Badge>
                    )}
                    {task.priority_score && (
                      <Badge variant="outline" className="text-xs">
                        Priority: {Math.round(task.priority_score)}
                      </Badge>
                    )}
                  </div>
                </div>

                <Badge className={statusConfig[task.status].color}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {task.status.replace(/_/g, ' ')}
                </Badge>

                {task.status === 'queued' && !task.blocked_by?.length && (
                  <Button
                    size="sm"
                    onClick={() => onExecuteTask(task)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Execute
                  </Button>
                )}
                
                {task.blocked_by?.length > 0 && (
                  <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                    <Lock className="h-3 w-3 mr-1" />
                    Blocked by {task.blocked_by.length}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
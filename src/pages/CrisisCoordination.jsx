import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Plus, PlayCircle, Shield } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";
import { SEVERITY_BADGE as severityColors } from '@/components/incidents/incidentConfig';
import SystemStatusGrid from '../components/crisis/SystemStatusGrid';
import RecoveryQueue from '../components/crisis/RecoveryQueue';

export default function CrisisCoordination() {
  const [showIncidentDialog, setShowIncidentDialog] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [incidentForm, setIncidentForm] = useState({
    title: '',
    incident_type: 'credential_compromise',
    severity: 'medium',
    affected_region: 'region_a',
    description: ''
  });

  const queryClient = useQueryClient();

  const { data: systems = [] } = useQuery({
    queryKey: ['systems'],
    queryFn: () => base44.entities.System.list()
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => base44.entities.Incident.list()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.RecoveryTask.list()
  });

  const createIncidentMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      
      // Create incident
      const incident = await base44.entities.Incident.create({
        ...data,
        status: 'reported',
        declared_at: new Date().toISOString()
      });

      // Create audit log
      await base44.entities.AuditLog.create({
        actor_email: user.email,
        action_type: 'incident_declared',
        action_details: `Incident "${data.title}" declared in ${data.affected_region}`,
        affected_resources: [incident.id],
        outcome: 'success',
        region: data.affected_region
      });

      return incident;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['incidents']);
      queryClient.invalidateQueries(['auditLogs']);
      setShowIncidentDialog(false);
      setIncidentForm({ title: '', incident_type: 'credential_compromise', severity: 'medium', affected_region: 'region_a', description: '' });
      toast.success('Incident declared and logged');
    }
  });

  const executeTaskMutation = useMutation({
    mutationFn: async (task) => {
      const user = await base44.auth.me();
      
      // Update task status
      await base44.entities.RecoveryTask.update(task.id, {
        status: 'in_progress',
        assigned_to: user.email,
        started_at: new Date().toISOString()
      });

      // Simulate execution time
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Complete task
      await base44.entities.RecoveryTask.update(task.id, {
        status: 'complete',
        completed_at: new Date().toISOString()
      });

      // Update system status if applicable
      if (task.system_id) {
        await base44.entities.System.update(task.system_id, {
          status: 'verified',
          last_reconstitution_date: new Date().toISOString()
        });
      }

      // Create audit log
      await base44.entities.AuditLog.create({
        actor_email: user.email,
        action_type: 'system_reconstituted',
        action_details: `Completed: ${task.task_title}`,
        affected_resources: task.system_id ? [task.system_id] : [],
        outcome: 'success',
        authority_id: task.authority_id
      });

      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      queryClient.invalidateQueries(['systems']);
      queryClient.invalidateQueries(['auditLogs']);
      toast.success('Recovery task completed successfully');
    }
  });

  const activeIncidents = incidents.filter(i => i.status !== 'resolved');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              Crisis Coordination Center
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Real-time incident response and system recovery coordination
            </p>
          </div>

          <Dialog open={showIncidentDialog} onOpenChange={setShowIncidentDialog}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700">
                <Plus className="h-4 w-4 mr-2" />
                Declare Incident
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Declare New Incident</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Incident Title *</Label>
                  <Input
                    value={incidentForm.title}
                    onChange={(e) => setIncidentForm({...incidentForm, title: e.target.value})}
                    placeholder="Brief incident description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Incident Type *</Label>
                    <Select
                      value={incidentForm.incident_type}
                      onValueChange={(value) => setIncidentForm({...incidentForm, incident_type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="credential_compromise">Credential Compromise</SelectItem>
                        <SelectItem value="malware">Malware Outbreak</SelectItem>
                        <SelectItem value="ddos">DDoS Attack</SelectItem>
                        <SelectItem value="supply_chain">Supply Chain Attack</SelectItem>
                        <SelectItem value="insider_threat">Insider Threat</SelectItem>
                        <SelectItem value="infrastructure_failure">Infrastructure Failure</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Severity *</Label>
                    <Select
                      value={incidentForm.severity}
                      onValueChange={(value) => setIncidentForm({...incidentForm, severity: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Affected Region *</Label>
                  <Select
                    value={incidentForm.affected_region}
                    onValueChange={(value) => setIncidentForm({...incidentForm, affected_region: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="region_a">Region A</SelectItem>
                      <SelectItem value="region_b">Region B</SelectItem>
                      <SelectItem value="region_c">Region C</SelectItem>
                      <SelectItem value="region_d">Region D</SelectItem>
                      <SelectItem value="multi_region">Multi-Region</SelectItem>
                      <SelectItem value="national">National</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={incidentForm.description}
                    onChange={(e) => setIncidentForm({...incidentForm, description: e.target.value})}
                    placeholder="Detailed incident information (will be logged in audit trail)"
                    rows={4}
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                  <div className="font-semibold text-yellow-900">⚠️ Authority Notice</div>
                  <div className="text-yellow-700 text-xs mt-1">
                    Declaring an incident creates an immutable audit log entry and may trigger automated response protocols. Ensure you have appropriate authority.
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowIncidentDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => createIncidentMutation.mutate(incidentForm)}
                    disabled={!incidentForm.title}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Declare Incident
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Active Incidents Summary */}
        {activeIncidents.length > 0 && (
          <Card className="border-orange-300">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Active Incidents Requiring Response
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeIncidents.map(incident => (
                  <div key={incident.id} className="p-3 border rounded-lg bg-white">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{incident.title}</div>
                        <div className="text-xs text-gray-500 mt-1 capitalize">
                          {incident.incident_type.replace(/_/g, ' ')} • {incident.affected_region.replace(/_/g, ' ')}
                        </div>
                      </div>
                      <Badge className={severityColors[incident.severity]}>
                        {incident.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recovery Queue */}
        <RecoveryQueue
          tasks={tasks}
          systems={systems}
          onExecuteTask={(task) => executeTaskMutation.mutate(task)}
        />

        {/* System Status Grid */}
        <SystemStatusGrid
          systems={systems}
          onSystemClick={setSelectedSystem}
        />

        {/* System Detail Modal */}
        {selectedSystem && (
          <Dialog open={!!selectedSystem} onOpenChange={() => setSelectedSystem(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{selectedSystem.system_name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-gray-500">Type</div>
                    <div className="font-medium capitalize">{selectedSystem.system_type.replace(/_/g, ' ')}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Region</div>
                    <div className="font-medium capitalize">{selectedSystem.region.replace(/_/g, ' ')}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Status</div>
                    <div className="font-medium capitalize">{selectedSystem.status}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Baseline Version</div>
                    <div className="font-medium">{selectedSystem.baseline_version || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Population Affected</div>
                    <div className="font-medium">{selectedSystem.population_affected?.toLocaleString() || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Recovery Time Estimate</div>
                    <div className="font-medium">{selectedSystem.estimated_recovery_hours || 'N/A'} hours</div>
                  </div>
                </div>

                {selectedSystem.dependencies?.length > 0 && (
                  <div>
                    <div className="text-gray-500 text-sm mb-1">Dependencies</div>
                    <div className="flex flex-wrap gap-1">
                      {selectedSystem.dependencies.map(depId => (
                        <Badge key={depId} variant="outline" className="text-xs">
                          {systems.find(s => s.id === depId)?.system_name || depId}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
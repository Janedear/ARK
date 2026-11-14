import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BookOpen, Plus, PlayCircle, CheckCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function Playbooks() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedPlaybook, setSelectedPlaybook] = useState(null);
  const [playbookForm, setPlaybookForm] = useState({
    title: '',
    scenario_type: 'credential_compromise',
    description: '',
    required_authority: 'regional',
    validation_status: 'draft'
  });

  const queryClient = useQueryClient();

  const { data: playbooks = [] } = useQuery({
    queryKey: ['playbooks'],
    queryFn: () => base44.entities.Playbook.list()
  });

  const createPlaybookMutation = useMutation({
    mutationFn: async (data) => {
      const playbook = await base44.entities.Playbook.create(data);
      
      const user = await base44.auth.me();
      await base44.entities.AuditLog.create({
        actor_email: user.email,
        action_type: 'baseline_updated',
        action_details: `Created playbook: "${data.title}"`,
        affected_resources: [playbook.id],
        outcome: 'success'
      });

      return playbook;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['playbooks']);
      queryClient.invalidateQueries(['auditLogs']);
      setShowAddDialog(false);
      toast.success('Playbook created');
    }
  });

  const scenarioTypeIcons = {
    credential_compromise: '🔐',
    malware_outbreak: '🦠',
    supply_chain_attack: '📦',
    infrastructure_failure: '⚡',
    coordinated_attack: '🎯'
  };

  const statusColors = {
    validated: 'bg-green-100 text-green-700',
    needs_review: 'bg-yellow-100 text-yellow-700',
    draft: 'bg-gray-100 text-gray-700'
  };

  const authorityColors = {
    regional: 'bg-blue-100 text-blue-700',
    national: 'bg-purple-100 text-purple-700',
    emergency_override: 'bg-red-100 text-red-700'
  };

  return (
    <div className="fo-screen">
      <div className="fo-container space-y-6">
        {/* Header */}
        <div className="fo-page-header">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-emerald-600" />
              Response procedures
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Review documented response steps and check their scope before a supervised exercise.
            </p>
          </div>

          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Playbook
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Playbook</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Playbook Title *</Label>
                  <Input
                    value={playbookForm.title}
                    onChange={(e) => setPlaybookForm({...playbookForm, title: e.target.value})}
                    placeholder="e.g., Regional Credential Reset Protocol"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Scenario Type *</Label>
                    <Select
                      value={playbookForm.scenario_type}
                      onValueChange={(value) => setPlaybookForm({...playbookForm, scenario_type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="credential_compromise">Credential Compromise</SelectItem>
                        <SelectItem value="malware_outbreak">Malware Outbreak</SelectItem>
                        <SelectItem value="supply_chain_attack">Supply Chain Attack</SelectItem>
                        <SelectItem value="infrastructure_failure">Infrastructure Failure</SelectItem>
                        <SelectItem value="coordinated_attack">Coordinated Attack</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Required Authority *</Label>
                    <Select
                      value={playbookForm.required_authority}
                      onValueChange={(value) => setPlaybookForm({...playbookForm, required_authority: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="regional">Regional</SelectItem>
                        <SelectItem value="national">National</SelectItem>
                        <SelectItem value="emergency_override">Emergency Override</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Description *</Label>
                  <Textarea
                    value={playbookForm.description}
                    onChange={(e) => setPlaybookForm({...playbookForm, description: e.target.value})}
                    placeholder="Describe the playbook purpose, when to use it, and expected outcomes"
                    rows={4}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => createPlaybookMutation.mutate(playbookForm)}
                    disabled={!playbookForm.title || !playbookForm.description}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    Create Playbook
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Playbooks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {playbooks.length > 0 ? (
            playbooks.map(playbook => (
              <Card
                key={playbook.id}
                className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-emerald-300"
                onClick={() => setSelectedPlaybook(playbook)}
              >
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">
                      {scenarioTypeIcons[playbook.scenario_type] || '📋'}
                    </span>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{playbook.title}</CardTitle>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <Badge className={statusColors[playbook.validation_status]}>
                          {playbook.validation_status.replace(/_/g, ' ')}
                        </Badge>
                        <Badge className={authorityColors[playbook.required_authority]}>
                          {playbook.required_authority} authority
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {playbook.description}
                  </p>
                  <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                    {playbook.last_validated && (
                      <>
                        <CheckCircle className="h-3 w-3" />
                        <span>Validated: {format(new Date(playbook.last_validated), 'MMM d, yyyy')}</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="md:col-span-2">
              <CardContent className="py-12 text-center text-gray-500">
                <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <div className="font-medium">No playbooks created yet</div>
                <div className="text-sm">Create your first response playbook to get started</div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Playbook Detail Modal */}
        {selectedPlaybook && (
          <Dialog open={!!selectedPlaybook} onOpenChange={() => setSelectedPlaybook(null)}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="text-2xl">{scenarioTypeIcons[selectedPlaybook.scenario_type]}</span>
                  {selectedPlaybook.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <Badge className={statusColors[selectedPlaybook.validation_status]}>
                    {selectedPlaybook.validation_status.replace(/_/g, ' ')}
                  </Badge>
                  <Badge className={authorityColors[selectedPlaybook.required_authority]}>
                    {selectedPlaybook.required_authority} authority required
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {selectedPlaybook.scenario_type.replace(/_/g, ' ')}
                  </Badge>
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-700">Description</div>
                  <div className="text-sm text-gray-600 mt-1">{selectedPlaybook.description}</div>
                </div>

                {selectedPlaybook.steps?.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold text-gray-700 mb-2">Response Steps</div>
                    <div className="space-y-2">
                      {selectedPlaybook.steps.map((step, idx) => (
                        <div key={idx} className="flex gap-3 p-2 border rounded-lg">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold">
                            {step.step_number || idx + 1}
                          </div>
                          <div className="flex-1 text-sm">
                            <div>{step.description}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {step.responsible_role} • ~{step.estimated_duration}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPlaybook.last_validated && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                    <div className="flex items-center gap-2 text-green-900">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-semibold">Validated</span>
                    </div>
                    <div className="text-green-700 text-xs mt-1">
                      Last validation: {format(new Date(selectedPlaybook.last_validated), 'MMMM d, yyyy')}
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
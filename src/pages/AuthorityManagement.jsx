import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Shield, Plus, UserPlus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from 'sonner';
import { addHours, addDays } from 'date-fns';
import AuthorityChain from '../components/crisis/AuthorityChain';

export default function AuthorityManagement() {
  const [showGrantDialog, setShowGrantDialog] = useState(false);
  const [authorityForm, setAuthorityForm] = useState({
    grant_type: '',
    granted_to_user: '',
    scope: 'region_a',
    permitted_actions: [],
    duration_hours: 72,
    delegation_permitted: false,
    purpose: ''
  });

  const queryClient = useQueryClient();

  const { data: authorities = [] } = useQuery({
    queryKey: ['authorities'],
    queryFn: () => base44.entities.Authority.list()
  });

  const grantAuthorityMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      
      const validFrom = new Date();
      const validUntil = addHours(validFrom, data.duration_hours);

      const authority = await base44.entities.Authority.create({
        grant_type: data.grant_type,
        granted_to_user: data.granted_to_user,
        granted_by_user: user.email,
        scope: data.scope,
        permitted_actions: data.permitted_actions,
        valid_from: validFrom.toISOString(),
        valid_until: validUntil.toISOString(),
        status: 'active',
        delegation_permitted: data.delegation_permitted,
        purpose: data.purpose
      });

      // Audit log
      await base44.entities.AuditLog.create({
        actor_email: user.email,
        action_type: 'authority_granted',
        action_details: `Granted "${data.grant_type}" authority to ${data.granted_to_user} for ${data.scope} (${data.duration_hours}h)`,
        affected_resources: [authority.id],
        outcome: 'success',
        authority_id: authority.id,
        region: data.scope.startsWith('region_') ? data.scope : 'national'
      });

      return authority;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['authorities']);
      queryClient.invalidateQueries(['auditLogs']);
      setShowGrantDialog(false);
      setAuthorityForm({
        grant_type: '',
        granted_to_user: '',
        scope: 'region_a',
        permitted_actions: [],
        duration_hours: 72,
        delegation_permitted: false,
        purpose: ''
      });
      toast.success('Authority granted and logged');
    }
  });

  const actionOptions = [
    { value: 'reconstitute_systems', label: 'Reconstitute Systems' },
    { value: 'reset_trust', label: 'Reset Trust/Credentials' },
    { value: 'coordinate_response', label: 'Coordinate Response' },
    { value: 'delegate_authority', label: 'Delegate Authority' },
    { value: 'access_audit_logs', label: 'Access Audit Logs' },
    { value: 'modify_priorities', label: 'Modify Priorities' }
  ];

  const toggleAction = (action) => {
    const current = authorityForm.permitted_actions || [];
    if (current.includes(action)) {
      setAuthorityForm({
        ...authorityForm,
        permitted_actions: current.filter(a => a !== action)
      });
    } else {
      setAuthorityForm({
        ...authorityForm,
        permitted_actions: [...current, action]
      });
    }
  };

  return (
    <div className="fo-screen">
      <div className="fo-container space-y-6">
        {/* Header */}
        <div className="fo-page-header">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Shield className="h-8 w-8 text-purple-600" />
              Authority Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Grant, delegate, and audit crisis response authorities
            </p>
          </div>

          <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                Grant Authority
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Grant New Authority</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Authority Type *</Label>
                  <Input
                    value={authorityForm.grant_type}
                    onChange={(e) => setAuthorityForm({...authorityForm, grant_type: e.target.value})}
                    placeholder="e.g., Regional Crisis Coordinator"
                  />
                </div>

                <div>
                  <Label>Grant To (Email) *</Label>
                  <Input
                    type="email"
                    value={authorityForm.granted_to_user}
                    onChange={(e) => setAuthorityForm({...authorityForm, granted_to_user: e.target.value})}
                    placeholder="user@agency.gov"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Scope *</Label>
                    <Select
                      value={authorityForm.scope}
                      onValueChange={(value) => setAuthorityForm({...authorityForm, scope: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="national">National</SelectItem>
                        <SelectItem value="region_a">Region A</SelectItem>
                        <SelectItem value="region_b">Region B</SelectItem>
                        <SelectItem value="region_c">Region C</SelectItem>
                        <SelectItem value="region_d">Region D</SelectItem>
                        <SelectItem value="system_specific">System Specific</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Duration (hours) *</Label>
                    <Input
                      type="number"
                      value={authorityForm.duration_hours}
                      onChange={(e) => setAuthorityForm({...authorityForm, duration_hours: parseInt(e.target.value)})}
                      min={1}
                      max={168}
                    />
                    <p className="text-xs text-gray-500 mt-1">Max: 168 hours (7 days)</p>
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Permitted Actions *</Label>
                  <div className="space-y-2 border rounded-lg p-3">
                    {actionOptions.map(option => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={option.value}
                          checked={authorityForm.permitted_actions?.includes(option.value)}
                          onCheckedChange={() => toggleAction(option.value)}
                        />
                        <label
                          htmlFor={option.value}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Purpose/Justification *</Label>
                  <Input
                    value={authorityForm.purpose}
                    onChange={(e) => setAuthorityForm({...authorityForm, purpose: e.target.value})}
                    placeholder="Reason for granting this authority"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="delegation"
                    checked={authorityForm.delegation_permitted}
                    onCheckedChange={(checked) => setAuthorityForm({...authorityForm, delegation_permitted: checked})}
                  />
                  <label htmlFor="delegation" className="text-sm font-medium cursor-pointer">
                    Allow this authority to be delegated further
                  </label>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                  <div className="font-semibold text-blue-900">🔒 Authority Principles</div>
                  <div className="text-blue-700 text-xs mt-1 space-y-1">
                    <div>• Time-bounded: All authorities expire automatically</div>
                    <div>• Scope-limited: Cannot exceed your own authority</div>
                    <div>• Auditable: Creates immutable log entry</div>
                    <div>• Revocable: Can be revoked before expiration</div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowGrantDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => grantAuthorityMutation.mutate(authorityForm)}
                    disabled={!authorityForm.grant_type || !authorityForm.granted_to_user || authorityForm.permitted_actions.length === 0 || !authorityForm.purpose}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Grant Authority
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Authority Chain Visualization */}
        <AuthorityChain authorities={authorities} />
      </div>
    </div>
  );
}
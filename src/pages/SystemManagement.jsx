import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Server, Plus, RefreshCw, CheckCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";

export default function SystemManagement() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [systemForm, setSystemForm] = useState({
    system_name: '',
    system_type: 'healthcare',
    region: 'region_a',
    status: 'operational',
    population_affected: 0,
    time_to_critical_harm_hours: 24,
    estimated_recovery_hours: 4,
    baseline_version: 'v1.0.0'
  });

  const queryClient = useQueryClient();

  const { data: systems = [] } = useQuery({
    queryKey: ['systems'],
    queryFn: () => base44.entities.System.list()
  });

  const createSystemMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      
      const system = await base44.entities.System.create(data);

      await base44.entities.AuditLog.create({
        actor_email: user.email,
        action_type: 'baseline_updated',
        action_details: `System "${data.system_name}" registered with baseline ${data.baseline_version}`,
        affected_resources: [system.id],
        outcome: 'success',
        region: data.region
      });

      return system;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['systems']);
      queryClient.invalidateQueries(['auditLogs']);
      setShowAddDialog(false);
      setSystemForm({
        system_name: '',
        system_type: 'healthcare',
        region: 'region_a',
        status: 'operational',
        population_affected: 0,
        time_to_critical_harm_hours: 24,
        estimated_recovery_hours: 4,
        baseline_version: 'v1.0.0'
      });
      toast.success('System registered successfully');
    }
  });

  const reconstituteSystemMutation = useMutation({
    mutationFn: async (system) => {
      const user = await base44.auth.me();
      
      // Update system to reconstituting
      await base44.entities.System.update(system.id, {
        status: 'reconstituting'
      });

      // Simulate reconstitution
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Complete reconstitution
      await base44.entities.System.update(system.id, {
        status: 'verified',
        last_reconstitution_date: new Date().toISOString()
      });

      // Audit log
      await base44.entities.AuditLog.create({
        actor_email: user.email,
        action_type: 'system_reconstituted',
        action_details: `System "${system.system_name}" reconstituted from baseline ${system.baseline_version}`,
        affected_resources: [system.id],
        outcome: 'success',
        region: system.region
      });

      return system;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['systems']);
      queryClient.invalidateQueries(['auditLogs']);
      toast.success('System reconstituted from known-good baseline');
    }
  });

  const groupByType = (systems) => {
    const grouped = {};
    systems.forEach(sys => {
      if (!grouped[sys.system_type]) grouped[sys.system_type] = [];
      grouped[sys.system_type].push(sys);
    });
    return grouped;
  };

  const grouped = groupByType(systems);

  const statusColors = {
    operational: 'bg-green-100 text-green-700',
    degraded: 'bg-yellow-100 text-yellow-700',
    compromised: 'bg-red-100 text-red-700',
    offline: 'bg-gray-100 text-gray-700',
    reconstituting: 'bg-blue-100 text-blue-700',
    verified: 'bg-green-100 text-green-700'
  };

  return (
    <div className="fo-screen">
      <div className="fo-container space-y-6">
        {/* Header */}
        <div className="fo-page-header">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Server className="h-8 w-8 text-blue-600" />
              System Management & Baselines
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Register systems, maintain baselines, execute reconstitution
            </p>
          </div>

          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Register System
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Register New System</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>System Name *</Label>
                  <Input
                    value={systemForm.system_name}
                    onChange={(e) => setSystemForm({...systemForm, system_name: e.target.value})}
                    placeholder="e.g., Metro Hospital Network"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>System Type *</Label>
                    <Select
                      value={systemForm.system_type}
                      onValueChange={(value) => setSystemForm({...systemForm, system_type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="power_grid">Power Grid</SelectItem>
                        <SelectItem value="water">Water Systems</SelectItem>
                        <SelectItem value="telecommunications">Telecommunications</SelectItem>
                        <SelectItem value="emergency_services">Emergency Services</SelectItem>
                        <SelectItem value="financial">Financial</SelectItem>
                        <SelectItem value="transportation">Transportation</SelectItem>
                        <SelectItem value="government">Government</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Region *</Label>
                    <Select
                      value={systemForm.region}
                      onValueChange={(value) => setSystemForm({...systemForm, region: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="region_a">Region A</SelectItem>
                        <SelectItem value="region_b">Region B</SelectItem>
                        <SelectItem value="region_c">Region C</SelectItem>
                        <SelectItem value="region_d">Region D</SelectItem>
                        <SelectItem value="national">National</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Population Affected</Label>
                    <Input
                      type="number"
                      value={systemForm.population_affected}
                      onChange={(e) => setSystemForm({...systemForm, population_affected: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label>Critical Harm Time (hrs)</Label>
                    <Input
                      type="number"
                      value={systemForm.time_to_critical_harm_hours}
                      onChange={(e) => setSystemForm({...systemForm, time_to_critical_harm_hours: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label>Recovery Time (hrs)</Label>
                    <Input
                      type="number"
                      value={systemForm.estimated_recovery_hours}
                      onChange={(e) => setSystemForm({...systemForm, estimated_recovery_hours: parseInt(e.target.value)})}
                    />
                  </div>
                </div>

                <div>
                  <Label>Baseline Version</Label>
                  <Input
                    value={systemForm.baseline_version}
                    onChange={(e) => setSystemForm({...systemForm, baseline_version: e.target.value})}
                    placeholder="e.g., v2.1.0"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => createSystemMutation.mutate(systemForm)}
                    disabled={!systemForm.system_name}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Register System
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Systems by Type */}
        {Object.entries(grouped).map(([type, typeSystems]) => (
          <Card key={type}>
            <CardHeader>
              <CardTitle className="text-lg capitalize flex items-center gap-2">
                {type.replace(/_/g, ' ')}
                <Badge variant="outline" className="ml-auto">
                  {typeSystems.length} systems
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {typeSystems.map(system => (
                  <div key={system.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{system.system_name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Baseline: {system.baseline_version || 'N/A'} • 
                        Region: {system.region.replace(/_/g, ' ')} • 
                        {system.population_affected?.toLocaleString()} civilians
                      </div>
                    </div>
                    
                    <Badge className={statusColors[system.status]}>
                      {system.status}
                    </Badge>

                    {system.status === 'compromised' && (
                      <Button
                        size="sm"
                        onClick={() => reconstituteSystemMutation.mutate(system)}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Reconstitute
                      </Button>
                    )}

                    {system.status === 'verified' && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
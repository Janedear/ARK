import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import OptionSelect from './OptionSelect';
import { INCIDENT_TYPES, SEVERITIES, REGIONS } from './incidentConfig';

const EMPTY = { title: '', incident_type: 'credential_compromise', severity: 'medium', affected_region: 'region_a', description: '' };

export default function DeclareIncidentDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const set = (key) => (value) => setForm({ ...form, [key]: value });

  const declare = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      const now = new Date();
      const incident = await base44.entities.Incident.create({
        ...form,
        status: 'reported',
        lead_email: user.email,
        declared_at: now.toISOString(),
        incident_number: `INC-${now.getFullYear()}-${String(now.getTime()).slice(-5)}`,
      });
      await Promise.all([
        base44.entities.IncidentUpdate.create({ incident_id: incident.id, kind: 'status_change', to_status: 'reported', message: 'Incident declared', actor_email: user.email }),
        base44.entities.AuditLog.create({ actor_email: user.email, action_type: 'incident_declared', action_details: `Incident "${form.title}" declared in ${form.affected_region}`, affected_resources: [incident.id], outcome: 'success', region: form.affected_region }),
      ]);
      return incident;
    },
    onSuccess: (incident) => {
      queryClient.invalidateQueries();
      setOpen(false);
      setForm(EMPTY);
      navigate(`/IncidentDetail?id=${incident.id}`);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"><Plus />Declare Incident</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Declare New Incident</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Incident title *</Label>
            <Input value={form.title} onChange={(e) => set('title')(e.target.value)} placeholder="Brief incident description" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <OptionSelect label="Type *" value={form.incident_type} onChange={set('incident_type')} options={INCIDENT_TYPES} />
            <OptionSelect label="Severity *" value={form.severity} onChange={set('severity')} options={SEVERITIES} />
            <OptionSelect label="Region *" value={form.affected_region} onChange={set('affected_region')} options={REGIONS} />
          </div>
          <div className="space-y-1.5">
            <Label>What do you know so far?</Label>
            <Textarea rows={4} value={form.description} onChange={(e) => set('description')(e.target.value)} placeholder="Symptoms, affected services, who reported it..." />
          </div>
          <p className="text-xs text-gray-500">You'll be set as incident lead. Declaring is recorded in the audit trail.</p>
          {declare.isError && <p className="text-sm text-red-600">Could not declare the incident: {declare.error.message}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => declare.mutate()} disabled={!form.title.trim() || declare.isPending} className="bg-red-600 hover:bg-red-700">
              {declare.isPending && <Loader2 className="animate-spin" />}Declare Incident
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import React, { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import OptionSelect from './OptionSelect';
import { PHASES } from './incidentConfig';
import { logUpdate } from './logUpdate';

const EMPTY = { title: '', phase: 'analysis', details: '', assigned_to: '', due_at: '' };
const PHASE_OPTIONS = PHASES.map((p) => ({ value: p.key, label: p.label }));

export default function AddActionDialog({ incidentId, defaultPhase, onChange }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const set = (key) => (value) => setForm({ ...form, [key]: value });

  const handleOpen = (o) => {
    setOpen(o);
    if (o) setForm({ ...EMPTY, phase: defaultPhase });
  };

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.IncidentAction.create({
        ...form,
        incident_id: incidentId,
        status: 'planned',
        due_at: form.due_at ? new Date(form.due_at).toISOString() : undefined,
      });
      await logUpdate(incidentId, { kind: 'action_added', message: `Action added: ${form.title}` });
      setOpen(false);
      onChange();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus />Add action</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add response action</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>What needs to be done? *</Label>
            <Input value={form.title} onChange={(e) => set('title')(e.target.value)} placeholder="e.g. Isolate affected billing servers" /></div>
          <OptionSelect label="Phase" value={form.phase} onChange={set('phase')} options={PHASE_OPTIONS} />
          <div className="space-y-1.5"><Label>Details</Label>
            <Textarea rows={3} value={form.details} onChange={(e) => set('details')(e.target.value)} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Assign to (email)</Label>
              <Input type="email" value={form.assigned_to} onChange={(e) => set('assigned_to')(e.target.value)} placeholder="responder@agency.gov" /></div>
            <div className="space-y-1.5"><Label>Due</Label>
              <Input type="datetime-local" value={form.due_at} onChange={(e) => set('due_at')(e.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={!form.title.trim() || saving}>{saving && <Loader2 className="animate-spin" />}Add action</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
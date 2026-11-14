import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import OptionSelect from './OptionSelect';
import { STAGES, stageIndex } from './incidentConfig';
import { logUpdate } from './logUpdate';

export default function AdvanceStageDialog({ incident, openActionCount, open, onOpenChange, onChange }) {
  const current = stageIndex(incident.status);
  const [target, setTarget] = useState(STAGES[Math.min(current + 1, STAGES.length - 1)].key);
  const [reason, setReason] = useState('');
  const [summary, setSummary] = useState(incident.resolution_summary || '');
  const [lessons, setLessons] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const options = STAGES.filter((s) => s.key !== incident.status && (s.key !== 'closed' || incident.status === 'resolved'))
    .map((s) => ({ value: s.key, label: s.label }));
  const finishing = ['resolved', 'closed'].includes(target);
  const blocked = finishing && openActionCount > 0;
  const canSave = reason.trim() && !blocked && (target !== 'resolved' || summary.trim()) && (target !== 'closed' || lessons.trim());

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const data = { status: target };
      if (target === 'resolved') Object.assign(data, { resolution_summary: summary, resolved_at: new Date().toISOString() });
      if (target === 'closed') data.lessons_learned = lessons;
      await base44.entities.Incident.update(incident.id, data);
      await logUpdate(incident.id, { kind: 'status_change', from_status: incident.status, to_status: target, message: reason });
      if (target === 'resolved') {
        const user = await base44.auth.me();
        await base44.entities.AuditLog.create({ actor_email: user.email, action_type: 'incident_resolved', action_details: `Incident "${incident.title}" resolved: ${summary}`, affected_resources: [incident.id], outcome: 'success', region: incident.affected_region });
      }
      onOpenChange(false);
      onChange();
    } catch (e) {
      setError('Only the incident lead or an admin can change this incident\'s stage.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Change incident stage</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <OptionSelect label="Move to" value={target} onChange={setTarget} options={options} />
          {blocked && (
            <div className="text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded p-3">
              {openActionCount} action{openActionCount > 1 ? 's are' : ' is'} still open. Complete or mark them failed before resolving.
            </div>
          )}
          {target === 'resolved' && (
            <div className="space-y-1.5"><Label>Resolution summary *</Label>
              <Textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What fixed it and how it was verified" /></div>
          )}
          {target === 'closed' && (
            <div className="space-y-1.5"><Label>Lessons learned *</Label>
              <Textarea rows={3} value={lessons} onChange={(e) => setLessons(e.target.value)} placeholder="What should change before the next incident" /></div>
          )}
          <div className="space-y-1.5"><Label>Reason for this change *</Label>
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Affected hosts isolated, no further spread detected" /></div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={save} disabled={!canSave || saving} className="bg-slate-900 hover:bg-slate-800">
              {saving && <Loader2 className="animate-spin" />}Confirm change
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
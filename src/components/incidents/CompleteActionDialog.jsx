import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { logUpdate } from './logUpdate';

export default function CompleteActionDialog({ action, outcome, onClose, onChange }) {
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const done = outcome === 'done';

  const save = async () => {
    setSaving(true);
    try {
      const user = await base44.auth.me();
      await base44.entities.IncidentAction.update(action.id, {
        status: outcome, result_notes: notes, completed_at: new Date().toISOString(), completed_by: user.email,
      });
      await logUpdate(action.incident_id, { kind: 'action_completed', message: `${done ? 'Completed' : 'Failed'}: ${action.title}. ${notes}` });
      setNotes('');
      onClose();
      onChange();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!outcome} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{done ? 'Complete action' : 'Mark action as failed'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">{action.title}</p>
          <div className="space-y-1.5">
            <Label>{done ? 'What was the result, and how was it verified? *' : 'What went wrong? *'}</Label>
            <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={save} disabled={!notes.trim() || saving} className={done ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}>
              {saving && <Loader2 className="animate-spin" />}{done ? 'Mark complete' : 'Mark failed'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
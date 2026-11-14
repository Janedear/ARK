import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { logUpdate } from './logUpdate';

export default function AddNoteForm({ incidentId, onChange }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const post = async () => {
    setSaving(true);
    try {
      await logUpdate(incidentId, { kind: 'note', message: text.trim() });
      setText('');
      onChange();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Post a situation update..." />
      <div className="flex justify-end">
        <Button size="sm" onClick={post} disabled={!text.trim() || saving}>
          {saving && <Loader2 className="animate-spin" />}Post update
        </Button>
      </div>
    </div>
  );
}
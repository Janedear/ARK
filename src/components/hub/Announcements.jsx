import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Megaphone, Loader2, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Announcements({ items, me, onChange }) {
  const [message, setMessage] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [saving, setSaving] = useState(false);
  const isAdmin = me?.role === 'admin';

  const post = async () => {
    setSaving(true);
    await base44.entities.Announcement.create({ message, level: urgent ? 'urgent' : 'info', author_name: me.full_name });
    setMessage(''); setUrgent(false); setSaving(false);
    onChange();
  };

  const remove = async (id) => { await base44.entities.Announcement.delete(id); onChange(); };

  return (
    <div className="space-y-2">
      {items.map((a) => (
        <div key={a.id} className={`rounded-lg p-3 flex gap-3 items-start ${a.level === 'urgent' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}>
          <Megaphone className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold whitespace-pre-wrap">{a.message}</p>
            <p className="text-xs opacity-80 mt-1">{a.author_name} · {formatDistanceToNow(new Date(a.created_date), { addSuffix: true })}</p>
          </div>
          {isAdmin && <button onClick={() => remove(a.id)} className="opacity-70 hover:opacity-100"><Trash2 className="h-4 w-4" /></button>}
        </div>
      ))}
      {isAdmin && (
        <div className="rounded-lg border bg-card p-3 space-y-2">
          <Textarea placeholder="Post an update to everyone (meeting point, next steps, what to avoid…)" value={message} onChange={(e) => setMessage(e.target.value)} rows={2} />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} /> Mark urgent</label>
            <Button size="sm" onClick={post} disabled={saving || !message.trim()}>{saving && <Loader2 className="animate-spin" />} Post update</Button>
          </div>
        </div>
      )}
    </div>
  );
}
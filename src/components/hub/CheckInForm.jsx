import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, UserCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { CHECKIN_STATUS } from './hubConfig';

export default function CheckInForm({ me, existing, onSaved }) {
  const [form, setForm] = useState({ name: '', status: '', location: '', phone: '', skills: '', note: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      name: existing?.name || me?.full_name || '',
      status: existing?.status || '',
      location: existing?.location || '',
      phone: existing?.phone || '',
      skills: existing?.skills || '',
      note: existing?.note || '',
    });
  }, [existing, me]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    setSaving(true);
    if (existing) await base44.entities.CheckIn.update(existing.id, form);
    else await base44.entities.CheckIn.create(form);
    setSaving(false);
    onSaved();
  };

  return (
    <Card className="border-2 border-slate-900">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg"><UserCheck className="h-5 w-5" /> Check in</CardTitle>
        {existing && <p className="text-xs text-muted-foreground">Last updated {formatDistanceToNow(new Date(existing.updated_date), { addSuffix: true })}</p>}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(CHECKIN_STATUS).map(([key, s]) => (
            <button key={key} type="button" onClick={() => setForm({ ...form, status: key })}
              className={`rounded-lg border-2 py-3 text-sm font-bold transition ${form.status === key ? s.btn + ' border-transparent' : 'bg-card ' + s.idle}`}>
              {s.label}
            </button>
          ))}
        </div>
        <Input placeholder="Your name" value={form.name} onChange={set('name')} />
        <Input placeholder="Where are you? (address, building, area)" value={form.location} onChange={set('location')} />
        <Input placeholder="Phone or best way to reach you" value={form.phone} onChange={set('phone')} />
        <Input placeholder="Skills or resources (medical, generator, truck, IT…)" value={form.skills} onChange={set('skills')} />
        <Textarea placeholder="Anything else people should know" value={form.note} onChange={set('note')} rows={2} />
        <Button onClick={save} disabled={saving || !form.status || !form.name} className="w-full h-11">
          {saving && <Loader2 className="animate-spin" />} {existing ? 'Update my check-in' : 'Check in'}
        </Button>
      </CardContent>
    </Card>
  );
}
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2 } from 'lucide-react';
import { URGENCY } from './hubConfig';

const EMPTY = { title: '', details: '', location: '', urgency: 'medium' };

export default function HelpRequestForm({ me, onCreated }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await base44.entities.HelpRequest.create({ ...form, status: 'open', requester_name: me?.full_name });
    setSaving(false); setForm(EMPTY); setOpen(false);
    onCreated();
  };

  if (!open) return <Button onClick={() => setOpen(true)} className="w-full h-11"><Plus /> Post a need</Button>;

  return (
    <form onSubmit={submit} className="rounded-lg border bg-card p-3 space-y-2">
      <Input placeholder="What's needed? (e.g. Insulin for 2 people, Restore email server)" value={form.title} onChange={set('title')} required />
      <Input placeholder="Location" value={form.location} onChange={set('location')} />
      <Textarea placeholder="Details" value={form.details} onChange={set('details')} rows={2} />
      <select value={form.urgency} onChange={set('urgency')} className="w-full h-9 rounded-md border bg-background px-3 text-sm">
        {Object.entries(URGENCY).map(([k, u]) => <option key={k} value={k}>Urgency: {u.label}</option>)}
      </select>
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
        <Button type="submit" className="flex-1" disabled={saving}>{saving && <Loader2 className="animate-spin" />} Post</Button>
      </div>
    </form>
  );
}
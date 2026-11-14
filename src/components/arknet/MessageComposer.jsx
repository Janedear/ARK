import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MessageComposer({ channel, alias, setAlias, enqueue, ready }) {
  const [text, setText] = useState(''), [hours, setHours] = useState('24'), [consent, setConsent] = useState(false), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const submit = async event => {
    event.preventDefault(); setBusy(true); setNotice('');
    try { await enqueue({ alias, channel, text, hours }); setText(''); setNotice('Saved on this device and queued for public relay. Delivery is not yet confirmed.'); }
    catch (error) { setNotice(error.message); }
    finally { setBusy(false); }
  };
  return <section className="ll-card ark-controls"><h2>Send a public message</h2><form onSubmit={submit} className="space-y-3">
    <label className="ark-field">Public alias<input value={alias} onChange={e => setAlias(e.target.value)} maxLength={40} required placeholder="Use a non-identifying alias" autoComplete="off" /></label>
    <label className="ark-field">Message to #{channel}<textarea value={text} onChange={e => setText(e.target.value)} maxLength={1000} rows={4} required placeholder="What is needed or available? Use a broad area only." /></label>
    <div className="flex items-center justify-between gap-3"><label className="ark-field">Relay expiry<select value={hours} onChange={e => setHours(e.target.value)}><option value="1">1 hour</option><option value="6">6 hours</option><option value="24">24 hours</option><option value="72">72 hours</option></select></label><span className="text-xs text-muted-foreground">{text.length}/1,000</span></div>
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1 h-4 w-4" required /><span>This is public and unencrypted. Anyone may read, copy and relay it. I have not included private or medical details.</span></label>
    <Button type="submit" disabled={!ready || busy || !consent || !text.trim() || !alias.trim()} className="w-full"><Send size={16} />{busy ? 'Saving on this device…' : 'Save & queue publicly'}</Button>
    {notice && <p role="status" className="text-sm">{notice}</p>}
  </form></section>;
}
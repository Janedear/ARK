import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LifeBuoy } from 'lucide-react';
import HelpRequestForm from './HelpRequestForm';
import HelpRequestItem from './HelpRequestItem';

export default function HelpBoard({ requests, me, onChange }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg"><LifeBuoy className="h-5 w-5" /> Needs board</CardTitle>
        <p className="text-sm text-muted-foreground">Post what's needed. Claim what you can do.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        <HelpRequestForm me={me} onCreated={onChange} />
        {requests.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No open needs right now.</p>}
        {requests.map((r) => <HelpRequestItem key={r.id} request={r} me={me} onChange={onChange} />)}
      </CardContent>
    </Card>
  );
}
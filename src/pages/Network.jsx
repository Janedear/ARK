import React, { useState } from 'react';
import { Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import useArkNetwork from '@/components/arknet/useArkNetwork';
import NetworkStatus from '@/components/arknet/NetworkStatus';
import MessageComposer from '@/components/arknet/MessageComposer';
import MessageFeed from '@/components/arknet/MessageFeed';
import RelayTransfer from '@/components/arknet/RelayTransfer';
import NearbyRelay from '@/components/arknet/NearbyRelay';
import GrowNetwork from '@/components/arknet/GrowNetwork';
import NetworkPlan from '@/components/arknet/NetworkPlan';
import '@/components/lifeline/lifeline.css';
import '@/components/arknet/arknet.css';

export default function Network() {
  const urlParams = new URLSearchParams(window.location.search);
  const initial = /^[a-z0-9][a-z0-9-]{0,39}$/.test(urlParams.get('channel') || '') ? urlParams.get('channel') : 'general';
  const [channel, setChannel] = useState(initial), [channelInput, setChannelInput] = useState(initial), [alias, setAlias] = useState('');
  const network = useArkNetwork(channel);
  return <div className="ll-page ark-network space-y-6">
    <header><span className="ll-eyebrow flex items-center gap-2"><Radio size={16} />ARK / Open relay network</span><h1 className="font-heading mt-3 mb-2">Keep a path open.</h1><p className="ll-muted">Create public reports, carry them between people, and reconnect whenever a path becomes available. No guaranteed delivery, rescue or verified identity.</p></header>
    <div className="ll-alert"><strong>Public by design. Not an emergency channel.</strong>Anyone who receives these messages can read and copy them. No private addresses, medical information or private contacts. Native mesh and radio links are not built; nearby browser links are experimental.</div>
    <NetworkStatus status={network.status} rows={network.rows} sync={network.sync} />
    <form className="flex flex-wrap items-end gap-3 ark-controls" onSubmit={e => { e.preventDefault(); setChannel(channelInput.trim().toLowerCase()); }}><label className="ark-field flex-1 min-w-0">Public channel code<input value={channelInput} onChange={e => setChannelInput(e.target.value.toLowerCase())} pattern="[a-z0-9][a-z0-9-]{0,39}" maxLength={40} required title="1–40 lowercase letters, digits or hyphens" /></label><Button type="submit" variant="outline">Open channel</Button></form>
    <p className="text-xs text-muted-foreground">Start with general, or agree a neighborhood code. Everyone can use the same code; it is not a private room. Your alias does not identify your account to other participants.</p>
    <Tabs defaultValue="messages" className="space-y-5"><TabsList className="grid grid-cols-2 sm:grid-cols-4 h-auto gap-1 w-full"><TabsTrigger value="messages">Messages</TabsTrigger><TabsTrigger value="relay">Relay paths</TabsTrigger><TabsTrigger value="grow">Grow the network</TabsTrigger><TabsTrigger value="plan">Availability plan</TabsTrigger></TabsList>
      <TabsContent value="messages" forceMount className="data-[state=inactive]:hidden"><div className="grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-6 items-start"><MessageComposer channel={channel} alias={alias} setAlias={setAlias} enqueue={network.enqueue} ready={Boolean(network.device)} /><MessageFeed network={network} channel={channel} alias={alias} /></div></TabsContent>
      <TabsContent value="relay" forceMount className="data-[state=inactive]:hidden"><div className="grid lg:grid-cols-2 gap-5 items-start"><RelayTransfer runtime={network.runtime} channel={channel} importBundle={network.importBundle} /><NearbyRelay runtime={network.runtime} channel={channel} onImport={network.importBundle} /></div></TabsContent>
      <TabsContent value="grow" forceMount className="data-[state=inactive]:hidden"><GrowNetwork /></TabsContent>
      <TabsContent value="plan" forceMount className="data-[state=inactive]:hidden"><NetworkPlan /></TabsContent>
    </Tabs>
    <p className="text-xs text-muted-foreground">This device stores up to 1,000 public packets. Local copies and device keys are not encrypted at rest by ARK. Keep a downloaded relay tool and a paper fallback; the full app is not guaranteed to cold-start offline.</p>
  </div>;
}
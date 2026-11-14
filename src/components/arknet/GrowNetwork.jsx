import React, { useState } from 'react';
import { Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import createRelayRuntime from '@/components/arknet/relayRuntime';
import createNearbyTransport from '@/components/arknet/nearbyTransport';
import standaloneController from '@/components/arknet/standaloneController';
import standaloneTemplate from '@/components/arknet/standaloneTemplate';

export default function GrowNetwork() {
  const [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
  const buildTool = () => standaloneTemplate.replace('<!--ARK_SCRIPT-->', `<script>(${standaloneController.toString()})(${createRelayRuntime.toString()},${createNearbyTransport.toString()});<\/script>`);
  const save = html => { const url = URL.createObjectURL(new Blob([html], { type: 'text/html' })); const link = document.createElement('a'); link.href = url; link.download = 'ARK-Offline-Relay.html'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  const distribute = async share => {
    setBusy(true); setNotice('');
    try { const html = buildTool(), file = new File([html], 'ARK-Offline-Relay.html', { type: 'text/html' }); if (share && navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'ARK offline public relay tool' }); setNotice('Opened device sharing. This does not confirm the other person received or can run the tool.'); } else { save(html); setNotice('Clean offline tool downloaded. It contains no saved messages, accounts or private keys. Open it in a compatible full browser before relying on it.'); } }
    catch (error) { setNotice(error.name === 'AbortError' ? 'Sharing canceled. Nothing is confirmed delivered.' : error.message); }
    finally { setBusy(false); }
  };
  return <section className="ll-card space-y-4 ark-controls"><div><span className="ll-eyebrow">Grow the network during an outage</span><h2>Pass the tool, not just a message</h2></div>
    <p className="text-sm">Download a self-contained relay tool while you have access. Pass a clean copy by an available file-sharing method or removable media; another person can create public messages without an ARK account or internet on a browser that supports running local HTML.</p>
    <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => distribute(false)}><Download size={16} />Download offline relay tool</Button><Button variant="outline" disabled={busy} onClick={() => distribute(true)}><Share2 size={16} />Share clean tool</Button></div>
    <ol className="list-decimal pl-5 text-sm space-y-2"><li>Open the downloaded HTML in a compatible full browser and confirm that it can save locally.</li><li>Agree on a public channel code, safe check-in times and a relay point.</li><li>Pass message bundles separately. Every new participant can save and re-share a clean tool copy.</li><li>When someone regains internet, they can sign in to ARK and import a bundle to the online gateway.</li></ol>
    <p className="text-sm text-destructive"><strong>Not a universal phone installer.</strong> Many phone file previews, especially on iPhone, cannot execute this tool. A saved file does not bypass browser restrictions. Use a compatible device or a staffed/paper relay; native distribution is still to be built.</p>
    <p className="ll-muted">No live app address is embedded. The full app still depends on its hosted services; the standalone tool does not. Only accept executable HTML from a trusted source. Device-to-device outage behavior has not yet been verified on physical phones.</p>
    {notice && <p role="status" className="text-sm">{notice}</p>}
  </section>;
}
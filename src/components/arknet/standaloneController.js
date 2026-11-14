export default function standaloneController(createRuntime, createNearby) {
  window.addEventListener('DOMContentLoaded', async () => {
    const cleanTool = '<!doctype html>\n' + document.documentElement.outerHTML;
    const $ = id => document.getElementById(id), runtime = createRuntime('ark-standalone-relay-v1');
    let identity, visible = 50;
    const say = message => { $('status').textContent = message; };
    const channel = () => { const value = $('channel').value.trim().toLowerCase(); if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(value)) throw new Error('Use a channel of 1–40 lowercase letters, digits or hyphens.'); return value; };
    const alias = () => { const value = $('alias').value.trim(); if (!value) throw new Error('Enter a public alias first.'); return value; };
    const save = (text, name, type) => { const url = URL.createObjectURL(new Blob([text], { type })); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
    const share = async (text, name, type) => { const file = new File([text], name, { type }); if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'ARK public relay' }); else save(text, name, type); say('Handed to your device. Delivery to another person is not confirmed.'); };
    const run = async action => { try { await action(); } catch (error) { say(error.message || 'Operation failed. Keep your existing copies.'); } };
    const bind = (id, action) => { $(id).onclick = () => run(action); };
    const element = (tag, text, parent, cls) => { const node = document.createElement(tag); node.textContent = text; if (cls) node.className = cls; parent.append(node); return node; };
    const render = async () => {
      const all = await runtime.all(), selected = channel();
      const messages = all.filter(r => r.envelope.kind === 'message' && r.envelope.channel === selected);
      $('reports').replaceChildren(); $('more').hidden = messages.length <= visible;
      if (!messages.length) element('p', 'No reports saved for this channel. Create one or import a public bundle.', $('reports'));
      messages.slice(0, visible).forEach(row => {
        const e = row.envelope, expired = Date.parse(e.expires_at) <= Date.now(), card = element('article', '', $('reports'));
        const own = e.public_key.x === identity?.publicKey.x && e.public_key.y === identity?.publicKey.y;
        const acks = all.filter(r => r.envelope.kind === 'ack' && r.envelope.ref === e.id && (r.envelope.public_key.x !== e.public_key.x || r.envelope.public_key.y !== e.public_key.y));
        element('strong', e.alias + (own ? ' · this device' : ' · unverified identity'), card);
        element('p', e.text, card, 'message');
        element('small', `Claimed time ${new Date(e.issued_at).toLocaleString()} · ${expired ? 'Expired; will not relay' : 'Local copy; no delivery confirmation'} · Expires ${new Date(e.expires_at).toLocaleString()}`, card);
        element('p', acks.length ? 'Reading claimed by: ' + acks.map(r => `${r.envelope.alias} (key ${r.envelope.public_key.x.slice(0, 10)}…)`).join(', ') + '. Not a promise of help.' : 'No reader acknowledgment in these saved copies.', card, 'muted');
        const details = element('details', '', card); element('summary', 'Packet and device key', details); element('p', e.id, details, 'code'); element('p', `${e.public_key.x}.${e.public_key.y}`, details, 'code');
        if (!own) {
          const ack = element('button', 'I have read this', card);
          ack.disabled = expired || !identity || acks.some(r => r.envelope.public_key.x === identity.publicKey.x && r.envelope.public_key.y === identity.publicKey.y);
          ack.onclick = () => run(async () => { await runtime.compose({ alias: alias(), channel: e.channel, kind: 'ack', ref: e.id, expiresAt: e.expires_at }); say('Reading acknowledgment saved locally. Relay it to return it to the sender.'); });
        }
        const relay = element('button', 'Relay this report', card); relay.disabled = expired;
        relay.onclick = () => run(async () => { $('outgoing').value = await runtime.makeBundle(null, [e.id, ...acks.map(r => r.id)]); $('outgoing').focus(); say('Specific report bundle prepared. Copy or save it.'); });
        const remove = element('button', 'Remove local copy', card);
        remove.onclick = () => run(async () => { if (confirm('Delete only this local copy? Other copies remain and may return.')) await runtime.remove(e.id); });
      });
    };
    const peer = createNearby({ onState: value => { $('peerstate').textContent = value; }, onReceipt: value => { $('receipt').textContent = value; }, onBundle: text => runtime.importBundle(text) });
    runtime.subscribe(() => run(render));
    $('channel').onchange = () => run(async () => { visible = 50; await render(); });
    $('compose').onsubmit = event => { event.preventDefault(); run(async () => { if (!$('consent').checked) throw new Error('Confirm public sharing first.'); await runtime.compose({ alias: alias(), channel: channel(), text: $('message').value, hours: $('expiry').value }); $('message').value = ''; say('Saved on this device. Nothing has been delivered. Create a bundle or connect to a peer.'); }); };
    bind('prepare', async () => { $('outgoing').value = await runtime.makeBundle(channel()); say('Newest 40 active packets prepared. Nothing has been delivered.'); });
    bind('copy', async () => { if (!$('outgoing').value) throw new Error('Prepare a bundle first.'); await navigator.clipboard.writeText($('outgoing').value); say('Copied. If copying is blocked, select the text and copy manually.'); });
    bind('save', () => { if (!$('outgoing').value) throw new Error('Prepare a bundle first.'); save($('outgoing').value, 'ark-relay.json', 'application/json'); say('Bundle saved. Pass it to another person using an available method.'); });
    bind('share', () => { if (!$('outgoing').value) throw new Error('Prepare a bundle first.'); return share($('outgoing').value, 'ark-relay.json', 'application/json'); });
    $('file').onchange = event => { const file = event.target.files?.[0]; if (file) run(async () => { if (file.size > 150000) throw new Error('Bundle exceeds 150 KB.'); $('incoming').value = await file.text(); say('File read locally. Click Import public packets to accept it.'); }); event.target.value = ''; };
    bind('import', async () => { const result = await runtime.importBundle($('incoming').value); $('incoming').value = ''; say(`${result.added} new packets saved; ${result.expired} expired packets skipped. No server delivery has occurred.`); });
    bind('offer', async () => { $('paircode').value = await peer.offer(); });
    bind('answer', async () => { $('paircode').value = await peer.answer($('remote').value); });
    bind('finish', () => peer.finish($('remote').value));
    bind('copypair', async () => { await navigator.clipboard.writeText($('paircode').value); say('Pairing code copied.'); });
    bind('disconnect', () => { peer.disconnect(); $('paircode').value = ''; $('receipt').textContent = ''; });
    bind('sendpeer', async () => peer.send(await runtime.makeBundle(channel())));
    bind('tool', () => { save(cleanTool, 'ARK-Offline-Relay.html', 'text/html'); say('Clean tool saved without messages or private keys.'); });
    bind('sharetool', () => share(cleanTool, 'ARK-Offline-Relay.html', 'text/html'));
    bind('print', () => window.print()); bind('more', async () => { visible += 50; await render(); });
    window.addEventListener('pagehide', () => peer.disconnect());
    for (const id of ['outgoing', 'paircode']) $(id).onfocus = event => event.target.select();
    try { identity = await runtime.identity(); $('device').textContent = `This device key fingerprint: ${identity.fingerprint}`; await render(); say('Local storage ready. No server connected. Public packets stay here until you relay them.'); }
    catch (error) { say(error.message + ' No unsaved message should be treated as stored.'); }
  });
}
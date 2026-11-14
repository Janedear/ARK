// No discovery, STUN, TURN, or external signaling. Pair explicitly on a mutually reachable LAN.
export default function createNearbyTransport({ onState, onBundle, onReceipt }) {
  let pc, channel, incoming, waiting, closed = false;
  const fail = message => onState(message);
  const setupChannel = dc => {
    channel = dc;
    dc.onopen = () => onState('Connected to one peer');
    dc.onclose = () => { incoming = null; onState('Peer disconnected'); };
    dc.onerror = () => fail('Peer connection error; keep your local copies.');
    dc.onmessage = async event => {
      try {
        if (typeof event.data !== 'string' || event.data.length > 32768) throw new Error('Peer sent an oversized frame.');
        const frame = JSON.parse(event.data);
        if (frame.type === 'receipt' && frame.id === waiting) { waiting = null; onReceipt(`Peer stored ${Number(frame.stored) || 0} packets. This is not a reader acknowledgment.`); return; }
        if (frame.type === 'start') {
          if (incoming || typeof frame.id !== 'string' || frame.id.length > 64 || !Number.isInteger(frame.size) || frame.size < 1 || frame.size > 150000) throw new Error('Invalid peer transfer.');
          incoming = { id: frame.id, size: frame.size, chunks: [], length: 0, at: Date.now() }; return;
        }
        if (frame.type === 'chunk') {
          if (!incoming || frame.id !== incoming.id || typeof frame.data !== 'string' || frame.data.length > 4096 || incoming.length + frame.data.length > incoming.size || Date.now() - incoming.at > 30000) throw new Error('Invalid or incomplete peer transfer.');
          incoming.chunks.push(frame.data); incoming.length += frame.data.length; return;
        }
        if (frame.type === 'end') {
          if (!incoming || frame.id !== incoming.id || incoming.length !== incoming.size) throw new Error('Incomplete peer transfer.');
          const transfer = incoming; incoming = null;
          const result = await onBundle(transfer.chunks.join(''));
          if (dc.readyState === 'open') dc.send(JSON.stringify({ type: 'receipt', id: transfer.id, stored: result.stored }));
          onState('Public peer bundle saved locally');
        }
      } catch (error) { incoming = null; fail(error.message); }
    };
  };
  const start = () => {
    if (!globalThis.RTCPeerConnection) throw new Error('Nearby browser connections are not available on this device. Use a manual bundle.');
    if (pc) throw new Error('Disconnect before starting a new pairing.');
    closed = false; pc = new RTCPeerConnection({ iceServers: [] });
    pc.ondatachannel = event => setupChannel(event.channel);
    pc.onconnectionstatechange = () => { if (!closed && ['failed', 'disconnected'].includes(pc.connectionState)) onState('Peer unreachable. Check Wi-Fi isolation or use manual transfer.'); };
    onState('Preparing a local pairing code…');
    return pc;
  };
  const gather = connection => new Promise((resolve, reject) => {
    if (connection.iceGatheringState === 'complete') return resolve();
    const timer = setTimeout(() => { connection.removeEventListener('icegatheringstatechange', check); reject(new Error('Pairing preparation timed out. Retry or use a manual bundle.')); }, 15000);
    function check() { if (connection.iceGatheringState === 'complete') { clearTimeout(timer); connection.removeEventListener('icegatheringstatechange', check); resolve(); } }
    connection.addEventListener('icegatheringstatechange', check);
  });
  const parse = (text, type) => {
    if (typeof text !== 'string' || text.length > 60000) throw new Error('Pairing code is too large.');
    const value = JSON.parse(text);
    if (value.protocol !== 'ARK-PAIR-1' || value.type !== type || typeof value.sdp !== 'string') throw new Error(`Paste an ARK ${type} code.`);
    return { type, sdp: value.sdp };
  };
  const code = connection => JSON.stringify({ protocol: 'ARK-PAIR-1', type: connection.localDescription.type, sdp: connection.localDescription.sdp });
  const offer = async () => { const c = start(); setupChannel(c.createDataChannel('ark-public-relay')); await c.setLocalDescription(await c.createOffer()); await gather(c); onState('Give this offer to the other person'); return code(c); };
  const answer = async text => { const remote = parse(text, 'offer'); const c = start(); await c.setRemoteDescription(remote); await c.setLocalDescription(await c.createAnswer()); await gather(c); onState('Give this answer back to the first person'); return code(c); };
  const finish = async text => { if (!pc || pc.signalingState !== 'have-local-offer') throw new Error('Create an offer first.'); await pc.setRemoteDescription(parse(text, 'answer')); onState('Trying the local connection…'); };
  const send = async text => {
    if (channel?.readyState !== 'open') throw new Error('Pair with a peer first.');
    if (!text || text.length > 150000) throw new Error('Bundle too large.');
    const id = crypto.randomUUID(); waiting = id; onReceipt('Sending; peer storage is not yet confirmed.');
    channel.send(JSON.stringify({ type: 'start', id, size: text.length }));
    for (let i = 0; i < text.length; i += 4096) {
      if (channel.readyState !== 'open') throw new Error('Peer disconnected before the bundle finished.');
      if (channel.bufferedAmount > 65536) await new Promise(resolve => setTimeout(resolve, 100));
      channel.send(JSON.stringify({ type: 'chunk', id, data: text.slice(i, i + 4096) }));
    }
    channel.send(JSON.stringify({ type: 'end', id }));
    setTimeout(() => { if (waiting === id && !closed) onReceipt('No storage receipt returned. Delivery is unconfirmed; keep the bundle.'); }, 15000);
  };
  const disconnect = () => { closed = true; waiting = null; incoming = null; channel?.close(); pc?.close(); channel = null; pc = null; onState('Not paired'); };
  return { offer, answer, finish, send, disconnect };
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

Deno.serve(async (req) => {
  try {
    const client = createClientFromRequest(req);
    const user = await client.auth.me().catch(e => e.status === 401 ? null : Promise.reject(e));
    if (!user) return Response.json({ error: 'Sign in to use the online gateway. Offline relaying does not require an account.' }, { status: 401 });
    const raw = await req.text();
    if (raw.length > 160000) return Response.json({ error: 'Transfer too large.' }, { status: 413 });
    let body;
    try { body = JSON.parse(raw); } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }); }
    if (!body || !['push', 'feed'].includes(body.action)) return Response.json({ error: 'Choose push or feed.' }, { status: 400 });
    const store = client.asServiceRole.entities.NetworkPacket;
    const now = new Date().toISOString();
    if (body.action === 'feed') {
      if (typeof body.channel !== 'string' || !/^[a-z0-9][a-z0-9-]{0,39}$/.test(body.channel) || (body.cursor && (typeof body.cursor !== 'string' || body.cursor.length > 4096))) return Response.json({ error: 'Invalid channel or cursor.' }, { status: 400 });
      const page = await store.filter({ channel: body.channel, expires_at: { $gt: now } }, { sort: '-created_date', limit: 50, ...(body.cursor ? { cursor: body.cursor } : {}) });
      return Response.json({ packets: page.items.map(r => ({ envelope: JSON.parse(r.envelope_json), serverAt: r.received_at })), next_cursor: page.next_cursor, has_more: page.has_more, checked_at: now });
    }
    if (!Array.isArray(body.packets) || body.packets.length < 1 || body.packets.length > 40) return Response.json({ error: 'Send between 1 and 40 packets.' }, { status: 400 });
    const encoder = new TextEncoder();
    const hex = bytes => Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2, '0')).join('');
    const verified = [];
    for (const e of body.packets) {
      if (!e || e.v !== 1 || !['message', 'ack'].includes(e.kind) || typeof e.channel !== 'string' || !/^[a-z0-9][a-z0-9-]{0,39}$/.test(e.channel) || typeof e.alias !== 'string' || !e.alias.trim() || e.alias.length > 40 || typeof e.text !== 'string' || e.text.length > 1000 || typeof e.ref !== 'string' || !/^[a-f0-9]{64}$/.test(e.id || '')) return Response.json({ error: 'Invalid public packet.' }, { status: 400 });
      if ((e.kind === 'message' && (!e.text.trim() || e.ref !== '')) || (e.kind === 'ack' && (e.text !== '' || !/^[a-f0-9]{64}$/.test(e.ref)))) return Response.json({ error: 'Invalid message or acknowledgment.' }, { status: 400 });
      const issued = Date.parse(e.issued_at), expires = Date.parse(e.expires_at);
      if (typeof e.issued_at !== 'string' || typeof e.expires_at !== 'string' || !Number.isFinite(issued) || !Number.isFinite(expires) || new Date(issued).toISOString() !== e.issued_at || new Date(expires).toISOString() !== e.expires_at || issued > Date.now() + 300000 || expires <= Date.now() || expires <= issued || expires - issued > 259200000) return Response.json({ error: 'Expired packet or invalid device time. Check the sender clock.' }, { status: 400 });
      const k = e.public_key;
      if (!k || k.kty !== 'EC' || k.crv !== 'P-256' || !/^[A-Za-z0-9_-]{43}$/.test(k.x || '') || !/^[A-Za-z0-9_-]{43}$/.test(k.y || '') || typeof e.signature !== 'string' || !/^[A-Za-z0-9_-]{86}$/.test(e.signature)) return Response.json({ error: 'Invalid signing key.' }, { status: 400 });
      const payload = { v: 1, kind: e.kind, channel: e.channel, alias: e.alias, text: e.text, ref: e.ref, issued_at: e.issued_at, expires_at: e.expires_at, public_key: { kty: 'EC', crv: 'P-256', x: k.x, y: k.y } };
      const bytes = encoder.encode(JSON.stringify(payload));
      if (hex(await crypto.subtle.digest('SHA-256', bytes)) !== e.id) return Response.json({ error: 'Packet fingerprint does not match.' }, { status: 400 });
      let valid = false;
      try {
        const key = await crypto.subtle.importKey('jwk', payload.public_key, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
        const signature = Uint8Array.from(atob(e.signature.replace(/-/g, '+').replace(/_/g, '/') + '=='), c => c.charCodeAt(0));
        valid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, signature, bytes);
      } catch { valid = false; }
      if (!valid) return Response.json({ error: 'Invalid device signature. Nothing in this batch was accepted.' }, { status: 400 });
      verified.push({ ...payload, id: e.id, signature: e.signature });
    }
    const unique = [...new Map(verified.map(e => [e.id, e])).values()];
    const [recent, existing] = await Promise.all([
      store.count({ relay_user_id: user.id, created_date: { $gte: new Date(Date.now() - 60000).toISOString() } }),
      store.filter({ message_id: { $in: unique.map(e => e.id) } }, { limit: 200 })
    ]);
    const known = new Map(existing.items.map(r => [r.message_id, r.received_at]));
    const missing = unique.filter(e => !known.has(e.id));
    if (recent + missing.length > 200) return Response.json({ error: 'Gateway busy for this account. Wait at least one minute; packets remain on your device.' }, { status: 429, headers: { 'Retry-After': '60' } });
    if (missing.length) await store.bulkCreate(missing.map(e => ({ message_id: e.id, kind: e.kind, channel: e.channel, reference_id: e.ref, envelope_json: JSON.stringify(e), expires_at: e.expires_at, received_at: now, relay_user_id: user.id })));
    return Response.json({ accepted: unique.map(e => ({ id: e.id, serverAt: known.get(e.id) || now })), checked_at: now });
  } catch (error) {
    const status = error.status === 429 ? 429 : 500;
    console.error('Network gateway:', error.message);
    return Response.json({ error: status === 429 ? 'Gateway temporarily limited. Retry later; keep your local copies.' : 'Gateway unavailable. Keep your local copies and retry later.' }, { status, ...(status === 429 ? { headers: { 'Retry-After': '60' } } : {}) });
  }
});
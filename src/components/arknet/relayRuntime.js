// Self-contained on purpose: the identical protocol/storage engine is embedded in the offline companion.
export default function createRelayRuntime(namespace = 'ark-relay-v1') {
  const encoder = new TextEncoder();
  const hex = bytes => Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2, '0')).join('');
  const hash = async value => hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
  const base64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const listeners = new Set();
  let dbPromise, identityPromise;
  let mutationTail = Promise.resolve();
  const mutate = action => { const operation = mutationTail.then(action); mutationTail = operation.catch(() => {}); return operation; };
  const database = () => dbPromise ||= new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) return reject(new Error('This browser cannot store the relay queue. Use a browser with local storage enabled.'));
    const request = indexedDB.open(namespace, 1);
    request.onupgradeneeded = () => { request.result.createObjectStore('settings'); request.result.createObjectStore('packets', { keyPath: 'id' }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Local storage could not open. Do not rely on unsaved messages.'));
  });
  const transaction = async (name, mode, operation) => {
    const db = await database();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(name, mode); let request;
      try { request = operation(tx.objectStore(name)); } catch (error) { tx.abort(); reject(error); return; }
      tx.oncomplete = () => resolve(request?.result);
      tx.onerror = () => reject(tx.error || new Error('Local save failed.'));
      tx.onabort = () => reject(tx.error || new Error('Local save was interrupted.'));
    });
  };
  const changed = () => listeners.forEach(listener => listener());
  const identity = () => identityPromise ||= (async () => {
    if (!globalThis.crypto?.subtle) throw new Error('Device signing is unavailable here. Open in a supported secure browser; local HTML execution varies by phone.');
    const saved = await transaction('settings', 'readonly', store => store.get('identity'));
    if (saved) return saved;
    const keys = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
    const jwk = await crypto.subtle.exportKey('jwk', keys.publicKey);
    const publicKey = { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y };
    const next = { privateKey: keys.privateKey, publicKey, fingerprint: await hash(JSON.stringify(publicKey)) };
    await transaction('settings', 'readwrite', store => store.put(next, 'identity'));
    return next;
  })();
  const all = async () => (await transaction('packets', 'readonly', store => store.getAll())).sort((a, b) => b.envelope.issued_at.localeCompare(a.envelope.issued_at));
  const validate = async e => {
    if (!e || e.v !== 1 || !['message', 'ack'].includes(e.kind) || typeof e.channel !== 'string' || !/^[a-z0-9][a-z0-9-]{0,39}$/.test(e.channel) || typeof e.alias !== 'string' || !e.alias.trim() || e.alias.length > 40 || typeof e.text !== 'string' || e.text.length > 1000 || typeof e.ref !== 'string' || !/^[a-f0-9]{64}$/.test(e.id || '')) throw new Error('Invalid public packet.');
    if ((e.kind === 'message' && (!e.text.trim() || e.ref !== '')) || (e.kind === 'ack' && (e.text !== '' || !/^[a-f0-9]{64}$/.test(e.ref)))) throw new Error('Invalid message or acknowledgment.');
    const issued = Date.parse(e.issued_at), expires = Date.parse(e.expires_at);
    if (typeof e.issued_at !== 'string' || typeof e.expires_at !== 'string' || !Number.isFinite(issued) || !Number.isFinite(expires) || new Date(issued).toISOString() !== e.issued_at || new Date(expires).toISOString() !== e.expires_at || issued > Date.now() + 300000 || expires <= issued || expires - issued > 259200000) throw new Error('Invalid packet time. Check the sender clock.');
    const k = e.public_key;
    if (!k || k.kty !== 'EC' || k.crv !== 'P-256' || !/^[A-Za-z0-9_-]{43}$/.test(k.x || '') || !/^[A-Za-z0-9_-]{43}$/.test(k.y || '') || !/^[A-Za-z0-9_-]{86}$/.test(e.signature || '')) throw new Error('Invalid device signing key.');
    const payload = { v: 1, kind: e.kind, channel: e.channel, alias: e.alias, text: e.text, ref: e.ref, issued_at: e.issued_at, expires_at: e.expires_at, public_key: { kty: 'EC', crv: 'P-256', x: k.x, y: k.y } };
    const canonical = JSON.stringify(payload), bytes = encoder.encode(canonical);
    if (await hash(canonical) !== e.id) throw new Error('Packet fingerprint mismatch.');
    const key = await crypto.subtle.importKey('jwk', payload.public_key, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const signature = Uint8Array.from(atob(e.signature.replace(/-/g, '+').replace(/_/g, '/') + '=='), c => c.charCodeAt(0));
    if (!await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, signature, bytes)) throw new Error('Invalid device signature. Transfer not accepted.');
    return { ...payload, id: e.id, signature: e.signature };
  };
  const receive = (incoming, source = 'relay') => mutate(async () => {
    if (!Array.isArray(incoming) || incoming.length > 50) throw new Error('At most 50 packets per transfer.');
    const clean = [];
    for (const item of incoming) {
      const e = await validate(source === 'server' ? item.envelope : item);
      if (Date.parse(e.expires_at) > Date.now()) clean.push({ envelope: e, serverAt: source === 'server' ? item.serverAt : null });
    }
    const rows = await all(), known = new Map(rows.map(row => [row.id, row]));
    const expired = rows.filter(row => Date.parse(row.envelope.expires_at) <= Date.now());
    const additions = clean.filter(item => !known.has(item.envelope.id));
    if (rows.length - expired.length + additions.length > 1000) throw new Error('This device has reached its 1,000-packet limit. Remove old local copies before accepting more.');
    const receivedAt = new Date().toISOString();
    await transaction('packets', 'readwrite', store => {
      expired.forEach(row => store.delete(row.id));
      clean.forEach(({ envelope, serverAt }) => { const old = known.get(envelope.id); store.put({ ...old, id: envelope.id, envelope, receivedAt: old?.receivedAt || receivedAt, serverAt: old?.serverAt || serverAt || null }); });
    });
    changed();
    return { stored: new Set(clean.map(item => item.envelope.id)).size, added: additions.length, expired: incoming.length - clean.length };
  });
  const compose = async ({ alias, channel, text = '', kind = 'message', ref = '', hours = 24, expiresAt }) => {
    const device = await identity();
    const payload = { v: 1, kind, channel: channel.trim().toLowerCase(), alias: alias.trim(), text: text.trim(), ref, issued_at: new Date().toISOString(), expires_at: expiresAt || new Date(Date.now() + Number(hours) * 3600000).toISOString(), public_key: device.publicKey };
    const canonical = JSON.stringify(payload);
    const envelope = { ...payload, id: await hash(canonical), signature: base64(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, device.privateKey, encoder.encode(canonical))) };
    await receive([envelope]);
    return envelope;
  };
  const pending = async () => (await all()).filter(row => !row.serverAt && Date.parse(row.envelope.expires_at) > Date.now()).reverse().slice(0, 40).map(row => row.envelope);
  const markServer = receipts => mutate(async () => {
    const rows = await all(), byId = new Map(rows.map(row => [row.id, row]));
    await transaction('packets', 'readwrite', store => receipts.forEach(receipt => { const row = byId.get(receipt.id); if (row) store.put({ ...row, serverAt: receipt.serverAt }); }));
    changed();
  });
  const makeBundle = async (channel, ids) => {
    const rows = (await all()).filter(row => Date.parse(row.envelope.expires_at) > Date.now() && (!channel || row.envelope.channel === channel) && (!ids || ids.includes(row.id)));
    if (ids) rows.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    return JSON.stringify({ protocol: 'ARK-RELAY-1', packets: rows.slice(0, 40).map(row => row.envelope) });
  };
  const importBundle = async text => {
    if (typeof text !== 'string' || text.length > 150000) throw new Error('Transfer exceeds the 150 KB limit.');
    const bundle = JSON.parse(text);
    if (bundle?.protocol !== 'ARK-RELAY-1' || !Array.isArray(bundle.packets) || bundle.packets.length > 40) throw new Error('This is not a supported ARK relay bundle.');
    return receive(bundle.packets);
  };
  const remove = id => mutate(async () => { await transaction('packets', 'readwrite', store => store.delete(id)); changed(); });
  return { identity, all, validate, compose, receive, pending, markServer, makeBundle, importBundle, remove, subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); } };
}
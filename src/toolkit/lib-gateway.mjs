const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function endpoint() {
  const url = process.env.ARK_FUNCTION_URL;
  if (!url) throw new Error('ARK_FUNCTION_URL is not set. See README step 3.');
  return url;
}

async function call(body, attempt = 1) {
  const response = await fetch(endpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + (process.env.ARK_TOKEN || ''),
    },
    body: JSON.stringify(body),
  });
  const raw = await response.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = { error: raw.slice(0, 200) };
  }
  if (response.status === 429 && attempt < 3) {
    await sleep(60000);
    return call(body, attempt + 1);
  }
  if (!response.ok) throw new Error(data.error || 'Gateway returned ' + response.status);
  return data;
}

// With ARK_HUB_URL set, bridges talk to an ARK Local Hub on the same network instead (no internet needed).
const hubUrl = () => (process.env.ARK_HUB_URL || '').replace(/\/$/, '');

async function hubCall(path, body) {
  const response = await fetch(hubUrl() + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Hub returned ' + response.status);
  return data;
}

export async function pushPackets(packets) {
  if (!hubUrl()) return call({ action: 'push', packets });
  const result = await hubCall('/api/bundle', { protocol: 'ARK-RELAY-1', packets });
  // A hub may reject individual packets while accepting the rest. Never acknowledge
  // a rejected packet as stored: doing so silently discards undelivered messages.
  if (!result || !Array.isArray(result.rejected)) {
    throw new Error('Hub returned an invalid storage receipt; keep the local queue.');
  }
  const rejectedIds = new Set(result.rejected.map(item => item.id));
  for (const item of result.rejected) {
    console.warn('hub refused packet', item.id, item.reason);
  }
  return {
    accepted: packets.filter(packet => !rejectedIds.has(packet.id)).map(packet => ({ id: packet.id })),
    rejected: result.rejected,
  };
}

export async function fetchFeed(channel) {
  if (!hubUrl()) return call({ action: 'feed', channel });
  const bundle = await hubCall(`/api/bundle?channel=${encodeURIComponent(channel)}&limit=40`);
  return { packets: bundle.packets.map(envelope => ({ envelope })) };
}
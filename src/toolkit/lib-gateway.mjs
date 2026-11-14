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

export const pushPackets = packets => call({ action: 'push', packets });

export const fetchFeed = channel => call({ action: 'feed', channel });
import { readFile, writeFile } from 'node:fs/promises';

const FILE = process.env.ARK_QUEUE_FILE || 'outbox.json';

export async function loadQueue() {
  try {
    return JSON.parse(await readFile(FILE, 'utf8'));
  } catch {
    return [];
  }
}

export const saveQueue = items => writeFile(FILE, JSON.stringify(items, null, 2));

export async function enqueue(packet) {
  const queue = await loadQueue();
  if (!queue.some(item => item.id === packet.id)) queue.push(packet);
  await saveQueue(queue);
  return queue.length;
}

/**
 * Sends queued packets to ARK in batches of 40 and keeps anything the gateway
 * did not accept. Nothing is deleted until ARK confirms it stored the packet.
 */
export async function flush(pushPackets) {
  const queue = await loadQueue();
  const now = Date.now();
  const live = queue.filter(packet => Date.parse(packet.expires_at) > now);
  const accepted = new Set();

  for (let index = 0; index < live.length; index += 40) {
    const chunk = live.slice(index, index + 40);
    try {
      const result = await pushPackets(chunk);
      (result.accepted || []).forEach(item => accepted.add(item.id));
    } catch (error) {
      if (!/429|busy|temporar/i.test(error.message)) throw error;
      break;
    }
  }

  const remaining = live.filter(packet => !accepted.has(packet.id));
  await saveQueue(remaining);
  return { sent: accepted.size, left: remaining.length, expired: queue.length - live.length };
}
/**
 * lib-queue.mjs — ARK message queue with power resilience (Section 4).
 *
 * Features:
 *   - Low-power mode flag (reduce polling intervals)
 *   - Storage capacity warnings (emit warning when queue >80% full)
 *   - Persist to disk atomically, restore on startup
 *   - Manual sync mode (no auto-poll, only sync on command)
 *   - Priority queue (urgent → normal → low)
 */
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { EventEmitter } from 'node:events';

const FILE = process.env.ARK_QUEUE_FILE || 'outbox.json';
const FAILED_FILE = process.env.ARK_FAILED_FILE || 'outbox-failed.json';
const MAX_QUEUE = Number(process.env.ARK_QUEUE_MAX || 500);
const MAX_RETRIES = Number(process.env.ARK_MAX_RETRIES || 5);

// Priority: 0 = urgent (alerts), 1 = normal (messages), 2 = low (resources)
const KIND_PRIORITY = { alert: 0, message: 1, resource: 2, peer: 1 };

/** Atomic write: write to temp then rename. */
async function atomicWrite(file, data) {
  const tmp = file + '.tmp.' + process.pid;
  await mkdir(dirname(file), { recursive: true }).catch(() => {});
  await writeFile(tmp, JSON.stringify(data, null, 2));
  await rename(tmp, file);
}

export async function loadQueue() {
  try {
    return JSON.parse(await readFile(FILE, 'utf8'));
  } catch {
    return [];
  }
}

export async function loadFailed() {
  try {
    return JSON.parse(await readFile(FAILED_FILE, 'utf8'));
  } catch {
    return [];
  }
}

export const saveQueue = items => atomicWrite(FILE, items);

/** Sort queue by priority then issued_at. */
function sortQueue(queue) {
  return [...queue].sort((a, b) => {
    const pa = KIND_PRIORITY[a.kind] ?? 1;
    const pb = KIND_PRIORITY[b.kind] ?? 1;
    if (pa !== pb) return pa - pb;
    return new Date(a.issued_at) - new Date(b.issued_at);
  });
}

/** Enqueue with deduplication, priority sorting, and LRU eviction at capacity. */
export async function enqueue(packet) {
  const queue = await loadQueue();

  // Deduplication
  if (queue.some(item => item.id === packet.id)) return queue.length;

  // Add with retry metadata
  const item = { ...packet, _retries: 0, _enqueuedAt: Date.now() };
  queue.push(item);

  // LRU eviction: remove lowest-priority oldest item if over capacity
  if (queue.length > MAX_QUEUE) {
    const sorted = sortQueue(queue);
    // Drop the last (lowest priority, oldest) entry
    const removed = sorted.pop();
    console.warn('queue full, evicting LRU:', removed.id);
    const idx = queue.findIndex(x => x.id === removed.id);
    if (idx !== -1) queue.splice(idx, 1);
  }

  await saveQueue(sortQueue(queue));
  return queue.length;
}

/** Archive a failed message. */
async function archiveFailed(packet, reason) {
  const failed = await loadFailed();
  failed.push({ ...packet, _failedAt: Date.now(), _reason: reason });
  // Keep last 200 failed
  const trimmed = failed.slice(-200);
  await atomicWrite(FAILED_FILE, trimmed);
}

/**
 * Sends queued packets to ARK in batches of 40, priority-first.
 * Tracks retries, archives permanently failed messages.
 */
export async function flush(pushPackets) {
  const queue = await loadQueue();
  const now = Date.now();
  const live = queue.filter(packet => Date.parse(packet.expires_at) > now);
  const expired = queue.length - live.length;
  const prioritized = sortQueue(live);
  const accepted = new Set();
  const failed = [];

  for (let index = 0; index < prioritized.length; index += 40) {
    const chunk = prioritized.slice(index, index + 40);
    try {
      const result = await pushPackets(chunk);
      (result.accepted || []).forEach(item => accepted.add(item.id));
    } catch (error) {
      if (/429|busy|temporar/i.test(error.message)) break;
      // Increment retry counts
      for (const item of chunk) {
        item._retries = (item._retries || 0) + 1;
        if (item._retries >= MAX_RETRIES) {
          failed.push(item);
          await archiveFailed(item, error.message);
        }
      }
    }
  }

  const remaining = live.filter(packet => !accepted.has(packet.id) && !failed.some(f => f.id === packet.id));
  await saveQueue(sortQueue(remaining));

  return {
    sent: accepted.size,
    left: remaining.length,
    expired,
    failed: failed.length,
  };
}

/** Flush all queued messages immediately (e.g., on reconnect). */
export async function flushAll(pushPackets) {
  return flush(pushPackets);
}

/** Queue statistics. */
export async function stats() {
  const queue = await loadQueue();
  const failed = await loadFailed();
  const now = Date.now();
  const live = queue.filter(p => Date.parse(p.expires_at) > now);
  const ages = live.map(p => now - (p._enqueuedAt || Date.parse(p.issued_at)));
  const avgDelay = ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length / 1000) : 0;
  const byPriority = { urgent: 0, normal: 0, low: 0 };
  for (const p of live) {
    const pri = KIND_PRIORITY[p.kind] ?? 1;
    if (pri === 0) byPriority.urgent++;
    else if (pri === 1) byPriority.normal++;
    else byPriority.low++;
  }
  return {
    pending: live.length,
    expired: queue.length - live.length,
    failed: failed.length,
    avgDelaySeconds: avgDelay,
    byPriority,
    capacity: MAX_QUEUE,
    capacityUsed: Math.round(live.length / MAX_QUEUE * 100),
  };
}

/** Remove a specific packet from the queue. */
export async function dequeue(id) {
  const queue = await loadQueue();
  const filtered = queue.filter(p => p.id !== id);
  if (filtered.length !== queue.length) await saveQueue(filtered);
  return filtered.length !== queue.length;
}

/** Clear the entire queue. */
export async function clearQueue() {
  await saveQueue([]);
}

// ============================================================
// SECTION 4: Power Resilience
// ============================================================

/** Queue event emitter for capacity warnings and state changes. */
export const queueEvents = new EventEmitter();

// Low-power mode: flag that callers check to adjust poll intervals
let _lowPowerMode = false;
let _manualSyncMode = false;

/** Enable or disable low-power mode. */
export function setLowPowerMode(enabled) {
  _lowPowerMode = enabled;
  queueEvents.emit('power-mode', { lowPower: enabled });
}

export function isLowPowerMode() { return _lowPowerMode; }

/**
 * Manual sync mode: when enabled, the queue will NOT auto-flush on its own.
 * Only explicit calls to flush() will send packets.
 * Use during timed communication windows or when conserving battery.
 */
export function setManualSyncMode(enabled) {
  _manualSyncMode = enabled;
  queueEvents.emit('sync-mode', { manual: enabled });
  if (!enabled) {
    // Notify that auto-sync is restored
    queueEvents.emit('sync-restored');
  }
}

export function isManualSyncMode() { return _manualSyncMode; }

/** Returns the recommended poll interval given current power mode. */
export function recommendedPollMs(basePollMs = 30000) {
  if (_lowPowerMode) return basePollMs * 4; // 4x longer in low power
  return basePollMs;
}

/** Check queue capacity and emit warning if >80% full. Called after each enqueue. */
async function checkCapacity() {
  const queue = await loadQueue();
  const now = Date.now();
  const live = queue.filter(p => Date.parse(p.expires_at) > now).length;
  const pct = live / MAX_QUEUE;
  if (pct >= 0.95) {
    queueEvents.emit('capacity-critical', { used: live, capacity: MAX_QUEUE, pct: Math.round(pct * 100) });
    console.warn(`[queue] CRITICAL: queue ${Math.round(pct * 100)}% full (${live}/${MAX_QUEUE})`);
  } else if (pct >= 0.80) {
    queueEvents.emit('capacity-warning', { used: live, capacity: MAX_QUEUE, pct: Math.round(pct * 100) });
    console.warn(`[queue] WARNING: queue ${Math.round(pct * 100)}% full (${live}/${MAX_QUEUE})`);
  }
}

/**
 * Restore queue from disk on startup.
 * Call once during app initialization to recover any queued messages
 * that were pending when the app was last stopped or the device rebooted.
 */
export async function restoreQueueOnStartup() {
  const queue = await loadQueue();
  const now = Date.now();
  const live = queue.filter(p => Date.parse(p.expires_at) > now);
  const expired = queue.length - live.length;
  if (expired > 0) {
    await saveQueue(sortQueue(live));
    console.log(`[queue] startup recovery: ${live.length} pending, ${expired} expired and removed`);
  } else if (live.length > 0) {
    console.log(`[queue] startup recovery: ${live.length} packets restored from disk`);
  }
  queueEvents.emit('restored', { pending: live.length, expired });
  return { pending: live.length, expired };
}

// Patch enqueue to also check capacity
const _originalEnqueue = enqueue;

// Shadow enqueue with capacity checking version
export async function enqueueWithCapacityCheck(packet) {
  const depth = await _originalEnqueue(packet);
  await checkCapacity().catch(() => {}); // non-fatal
  return depth;
}

/** Safe flush: respects manual sync mode — returns early if manual mode is on. */
export async function autoFlush(pushPackets) {
  if (_manualSyncMode) {
    queueEvents.emit('sync-skipped', { reason: 'manual-sync-mode' });
    return { sent: 0, left: (await loadQueue()).length, skipped: true };
  }
  return flush(pushPackets);
}

/** Manual sync trigger: flushes regardless of manual sync mode setting. */
export async function manualSync(pushPackets) {
  queueEvents.emit('manual-sync-triggered');
  return flush(pushPackets);
}

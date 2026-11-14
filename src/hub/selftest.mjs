// Proves the hub's message format on this machine: encoding, verification, tampering,
// duplicates, expiry, acknowledgments, persistence and corrupted storage.
//   node selftest.mjs
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore, loadSigner, verify, PROTOCOL } from './hub-core.mjs';

const dir = await mkdtemp(join(tmpdir(), 'ark-hub-test-'));
const results = [];
const check = async (name, test) => {
  try { await test(); results.push(['PASS', name]); } catch (error) { results.push(['FAIL', name, error.message]); }
};
const rejects = async (promise, pattern) => {
  try { await promise; } catch (error) { if (pattern.test(error.message)) return; throw new Error('wrong error: ' + error.message); }
  throw new Error('was accepted but should be rejected');
};

const alice = await loadSigner(join(dir, 'a.json'));
const mallory = await loadSigner(join(dir, 'm.json'));
const msg = await alice.sign({ channel: 'help', alias: 'Alice', text: 'NEED WATER, 2 adults, school gym' });

await check('signed packet verifies', () => verify(msg));
await check('changed text is rejected', () => rejects(verify({ ...msg, text: 'ALL FINE' }), /Fingerprint/));
await check('changed id is rejected', () => rejects(verify({ ...msg, id: 'a'.repeat(64) }), /Fingerprint/));
await check('forged signature is rejected', async () => {
  const forged = await mallory.sign({ channel: 'help', alias: 'Alice', text: msg.text });
  await rejects(verify({ ...forged, public_key: msg.public_key, id: msg.id }), /Signature/);
});
await check('future packet is rejected', async () => rejects(verify(await alice.sign({ channel: 'help', alias: 'A', text: 'x', now: Date.now() + 3600000 })), /future/));
await check('lifetime is capped at 72 hours', async () => {
  const p = await alice.sign({ channel: 'help', alias: 'A', text: 'x', hours: 500 });
  if (Date.parse(p.expires_at) - Date.parse(p.issued_at) !== 72 * 3600000) throw new Error('not capped');
});

const file = join(dir, 'packets.json');
const store = createStore(file);
await check('store accepts, then counts duplicates', async () => {
  const first = await store.accept([msg]), second = await store.accept([msg]);
  if (first.added !== 1 || second.duplicate !== 1) throw new Error(JSON.stringify({ first, second }));
});
await check('expired packet is not stored', async () => {
  const old = await alice.sign({ channel: 'help', alias: 'A', text: 'old', hours: 1, now: Date.now() - 2 * 3600000 });
  const r = await store.accept([old]);
  if (r.added !== 0 || r.rejected.length !== 1) throw new Error(JSON.stringify(r));
});
await check('acknowledgment links to its message', async () => {
  const ack = await alice.sign({ kind: 'ack', channel: 'help', alias: 'Bob', ref: msg.id });
  await store.accept([ack]);
  if (store.messages()[0].seen !== 1) throw new Error('seen count is ' + store.messages()[0].seen);
});
await check('ack with a bad reference is rejected', async () => rejects(verify(await alice.sign({ kind: 'ack', channel: 'help', alias: 'B', ref: 'nope' })), /acknowledgment/));
await check('garbage in a bundle is rejected item by item', async () => {
  const r = await store.accept([null, { v: 1 }, 'text']);
  if (r.rejected.length !== 3 || r.added !== 0) throw new Error(JSON.stringify(r));
});
await check('bundle is capped for the phone app', async () => {
  const b = store.bundle({ max: 1 });
  if (b.protocol !== PROTOCOL || b.packets.length !== 1) throw new Error('bad bundle');
});
await check('packets survive a restart', async () => {
  await new Promise(resolve => setTimeout(resolve, 100));
  const reopened = createStore(file);
  if (await reopened.load() !== 2) throw new Error('reloaded wrong count');
});
await check('corrupted storage file does not crash the hub', async () => {
  await writeFile(join(dir, 'bad.json'), '{not json');
  if (await createStore(join(dir, 'bad.json')).load() !== 0) throw new Error('should start empty');
});

for (const [status, name, detail] of results) console.log(status, name, detail ? `(${detail})` : '');
const failed = results.filter(r => r[0] === 'FAIL').length;
console.log(failed ? `${failed} of ${results.length} checks FAILED. Do not rely on this hub.` : `All ${results.length} checks passed.`);
process.exit(failed ? 1 : 0);
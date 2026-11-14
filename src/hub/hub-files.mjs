// Lists the library files a hub shares and computes a SHA-256 fingerprint for each, in the background.
import { createReadStream } from 'node:fs';
import { readdir, stat, readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';

const hashFile = path => new Promise((resolve, reject) => {
  const hash = createHash('sha256');
  createReadStream(path).on('data', chunk => hash.update(chunk)).on('end', () => resolve(hash.digest('hex'))).on('error', reject);
});

export function startFileIndex(dir, cacheFile) {
  let entries = [];
  const scan = async () => {
    let cache = {};
    try { cache = JSON.parse(await readFile(cacheFile, 'utf8')); } catch { /* none yet */ }
    let names = [];
    try { names = (await readdir(dir)).filter(name => /^[\w.-]+$/.test(name) && !name.startsWith('.')); } catch { /* no library */ }
    const found = [];
    for (const name of names.sort()) {
      const info = await stat(join(dir, name));
      if (info.isFile()) found.push({ name, bytes: info.size, key: `${name}:${info.size}:${info.mtimeMs}` });
    }
    entries = found.map(f => ({ name: f.name, bytes: f.bytes, sha256: cache[f.key] || null }));
    for (const [i, f] of found.entries()) {
      if (entries[i].sha256) continue;
      entries[i].sha256 = await hashFile(join(dir, f.name));
      cache[f.key] = entries[i].sha256;
      await mkdir(dirname(cacheFile), { recursive: true });
      await writeFile(cacheFile, JSON.stringify(cache));
    }
  };
  // Rescan every 2 minutes so files copied in after the hub started show up too.
  let scanning = false;
  const rescan = () => {
    if (scanning) return;
    scanning = true;
    scan().catch(error => console.error('Library index failed:', error.message)).finally(() => { scanning = false; });
  };
  rescan();
  setInterval(rescan, 120000).unref();
  return {
    dir,
    has: name => entries.some(entry => entry.name === name),
    manifest: () => ({
      generated_at: new Date().toISOString(),
      files: entries,
      note: 'sha256 is null while the hub is still computing it. A fingerprint proves the file matches another copy, not who made it. Compare against a copy you trust.',
    }),
  };
}
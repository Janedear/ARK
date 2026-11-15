// Lists the library files a hub shares, computes SHA-256 fingerprints, tracks downloads, supports categories.
// Node 18+, no dependencies.
import { createReadStream } from 'node:fs';
import { readdir, stat, readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, dirname, extname } from 'node:path';

const hashFile = path => new Promise((resolve, reject) => {
  const hash = createHash('sha256');
  createReadStream(path).on('data', chunk => hash.update(chunk)).on('end', () => resolve(hash.digest('hex'))).on('error', reject);
});

// MIME type detection by extension
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.json': 'application/json',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.gz': 'application/gzip',
  '.apk': 'application/vnd.android.package-archive',
  '.zim': 'application/octet-stream',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.webm': 'video/webm',
  '.csv': 'text/csv; charset=utf-8',
  '.xml': 'application/xml',
  '.bin': 'application/octet-stream',
  '.exe': 'application/octet-stream',
  '.dmg': 'application/octet-stream',
};

export function mimeOf(filename) {
  return MIME_TYPES[extname(filename).toLowerCase()] || 'application/octet-stream';
}

// File categories by extension or naming convention
const CATEGORY_MAP = {
  guides: ['.html', '.htm', '.txt', '.md', '.pdf'],
  maps: [],
  data: ['.json', '.csv', '.xml', '.zim'],
  tools: ['.apk', '.exe', '.dmg', '.bin'],
  media: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.mp4', '.mp3', '.ogg', '.webm'],
};

function categoryOf(name) {
  const lname = name.toLowerCase();
  if (lname.includes('map') || lname.includes('atlas')) return 'maps';
  if (lname.includes('guide') || lname.includes('manual') || lname.includes('plan')) return 'guides';
  const ext = extname(lname);
  for (const [cat, exts] of Object.entries(CATEGORY_MAP)) {
    if (exts.includes(ext)) return cat;
  }
  return 'data';
}

export function startFileIndex(dir, cacheFile) {
  let entries = [];
  let downloadCounts = {};
  let downloadCacheFile = cacheFile.replace('.json', '-downloads.json');

  const loadDownloadCounts = async () => {
    try { downloadCounts = JSON.parse(await readFile(downloadCacheFile, 'utf8')); } catch { downloadCounts = {}; }
  };

  const saveDownloadCounts = async () => {
    try {
      await mkdir(dirname(downloadCacheFile), { recursive: true });
      await writeFile(downloadCacheFile, JSON.stringify(downloadCounts));
    } catch { /* best effort */ }
  };

  const scan = async () => {
    let cache = {};
    try { cache = JSON.parse(await readFile(cacheFile, 'utf8')); } catch { /* none yet */ }
    let names = [];
    try { names = (await readdir(dir)).filter(name => /^[\w. -]+$/.test(name) && !name.startsWith('.')); } catch { /* no library */ }
    const found = [];
    for (const name of names.sort()) {
      const info = await stat(join(dir, name));
      if (info.isFile()) found.push({ name, bytes: info.size, mtime: info.mtimeMs, key: `${name}:${info.size}:${info.mtimeMs}` });
    }
    entries = found.map(f => ({
      name: f.name,
      bytes: f.bytes,
      mtime: new Date(f.mtime).toISOString(),
      sha256: cache[f.key] || null,
      category: categoryOf(f.name),
      mime: mimeOf(f.name),
      downloads: downloadCounts[f.name] || 0,
    }));
    for (const [i, f] of found.entries()) {
      if (entries[i].sha256) continue;
      entries[i].sha256 = await hashFile(join(dir, f.name));
      cache[f.key] = entries[i].sha256;
      await mkdir(dirname(cacheFile), { recursive: true });
      await writeFile(cacheFile, JSON.stringify(cache));
    }
  };

  let scanning = false;
  const rescan = () => {
    if (scanning) return;
    scanning = true;
    scan().catch(error => console.error('Library index failed:', error.message)).finally(() => { scanning = false; });
  };

  // Initialize
  loadDownloadCounts().then(rescan);
  setInterval(rescan, 120000).unref();

  return {
    dir,
    has: name => entries.some(entry => entry.name === name),
    // Track download count for a file (atomic increment)
    async trackDownload(name) {
      downloadCounts[name] = (downloadCounts[name] || 0) + 1;
      const idx = entries.findIndex(e => e.name === name);
      if (idx >= 0) entries[idx].downloads = downloadCounts[name];
      await saveDownloadCounts();
      return downloadCounts[name];
    },
    // Directory listing with categories
    listByCategory() {
      const cats = {};
      for (const e of entries) {
        if (!cats[e.category]) cats[e.category] = [];
        cats[e.category].push(e);
      }
      return cats;
    },
    manifest() {
      return {
        generated_at: new Date().toISOString(),
        files: entries,
        note: 'sha256 is null while the hub is still computing it. A fingerprint proves the file matches another copy, not who made it.',
      };
    },
    // Get entry including mime/category/downloads
    getEntry: name => entries.find(e => e.name === name) || null,
  };
}

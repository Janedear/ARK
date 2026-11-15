// Packs the kit folder back into ARK-offline-kit.zip so every phone that visits a hub can carry
// the whole kit, including the hub itself, to the next town. No internet or npm needed.
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

// Large library downloads and this hub's private data (signing key, messages) never leave the hub.
const SKIP = new Set(['files', 'hub-data', 'inbox', 'outbox', 'node_modules', '.git']);
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = buf => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

// Compression method flags
const METHOD_STORE = 0;    // No compression (current default — Pi-safe, predictable)
const METHOD_DEFLATE = 8;  // Deflate (future option, requires zlib)

async function walk(dir, rel = '') {
  const out = [];
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const entry of entries) {
    if (SKIP.has(entry.name) || entry.name.endsWith('.zip')) continue;
    const path = join(dir, entry.name), name = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...await walk(path, name));
    } else if (entry.isFile()) {
      let data;
      try {
        data = await readFile(path);
      } catch (err) {
        // Error recovery: skip unreadable files instead of crashing
        console.warn(`ZIP: skipping unreadable file ${name}: ${err.message}`);
        continue;
      }
      out.push({ name, data });
    }
  }
  return out;
}

/**
 * Build an ARK kit ZIP.
 * @param {string} kitDir - root directory to pack
 * @param {string} root - top-level folder name inside the ZIP
 * @param {function} onProgress - optional callback(done, total, currentFile)
 * @param {number} method - compression method: METHOD_STORE (0) or METHOD_DEFLATE (8)
 */
export async function zipKit(kitDir, root = 'ARK-offline-kit', onProgress = null, method = METHOD_STORE) {
  const files = await walk(kitDir);
  const local = [], central = [];
  let offset = 0;
  const manifest = { generated_at: new Date().toISOString(), root, files: [] };

  for (const [i, file] of files.entries()) {
    if (onProgress) onProgress(i, files.length, file.name);
    const name = Buffer.from(`${root}/${file.name}`, 'utf8');
    const crc = crc32(file.data);
    const size = file.data.length;
    // Compute SHA-256 for manifest
    const hash = createHash('sha256').update(file.data).digest('hex');
    manifest.files.push({ path: file.name, bytes: size, sha256: hash });

    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0);  // local file header signature
    head.writeUInt16LE(20, 4);          // version needed
    head.writeUInt16LE(0x0800, 6);      // general purpose flags (UTF-8)
    head.writeUInt16LE(method, 8);      // compression method (store=0)
    head.writeUInt32LE(crc, 14);        // CRC-32
    head.writeUInt32LE(size, 18);       // compressed size
    head.writeUInt32LE(size, 22);       // uncompressed size
    head.writeUInt16LE(name.length, 26); // filename length

    local.push(head, name, file.data);

    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);   // central directory signature
    dir.writeUInt16LE(20, 4);           // version made by
    dir.writeUInt16LE(20, 6);           // version needed
    dir.writeUInt16LE(0x0800, 8);       // flags
    dir.writeUInt16LE(method, 10);      // compression method
    dir.writeUInt32LE(crc, 16);         // CRC-32
    dir.writeUInt32LE(size, 20);        // compressed size
    dir.writeUInt32LE(size, 24);        // uncompressed size
    dir.writeUInt16LE(name.length, 28); // filename length
    dir.writeUInt32LE(offset, 42);      // local header offset

    central.push(dir, name);
    offset += 30 + name.length + size;
  }

  if (onProgress) onProgress(files.length, files.length, 'manifest.json');

  // Add manifest.json
  const manifestData = Buffer.from(JSON.stringify(manifest, null, 2), 'utf8');
  const manifestName = Buffer.from(`${root}/manifest.json`, 'utf8');
  const manifestCrc = crc32(manifestData);
  const manifestSize = manifestData.length;

  const manifestHead = Buffer.alloc(30);
  manifestHead.writeUInt32LE(0x04034b50, 0);
  manifestHead.writeUInt16LE(20, 4);
  manifestHead.writeUInt16LE(0x0800, 6);
  manifestHead.writeUInt16LE(METHOD_STORE, 8);
  manifestHead.writeUInt32LE(manifestCrc, 14);
  manifestHead.writeUInt32LE(manifestSize, 18);
  manifestHead.writeUInt32LE(manifestSize, 22);
  manifestHead.writeUInt16LE(manifestName.length, 26);
  local.push(manifestHead, manifestName, manifestData);

  const manifestDir = Buffer.alloc(46);
  manifestDir.writeUInt32LE(0x02014b50, 0);
  manifestDir.writeUInt16LE(20, 4);
  manifestDir.writeUInt16LE(20, 6);
  manifestDir.writeUInt16LE(0x0800, 8);
  manifestDir.writeUInt16LE(METHOD_STORE, 10);
  manifestDir.writeUInt32LE(manifestCrc, 16);
  manifestDir.writeUInt32LE(manifestSize, 20);
  manifestDir.writeUInt32LE(manifestSize, 24);
  manifestDir.writeUInt16LE(manifestName.length, 28);
  manifestDir.writeUInt32LE(offset, 42);
  central.push(manifestDir, manifestName);

  const totalFiles = files.length + 1; // +1 for manifest
  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);         // end of central directory signature
  end.writeUInt16LE(totalFiles, 8);          // entries on this disk
  end.writeUInt16LE(totalFiles, 10);         // total entries
  end.writeUInt32LE(centralBuf.length, 12);  // central directory size
  end.writeUInt32LE(offset + 30 + manifestName.length + manifestSize, 16); // central dir offset

  return Buffer.concat([...local, centralBuf, end]);
}

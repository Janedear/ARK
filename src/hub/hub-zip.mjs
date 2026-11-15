// Packs the kit folder back into ARK-offline-kit.zip so every phone that visits a hub can carry
// the whole kit, including the hub itself, to the next town. No internet or Base44 needed.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Large library downloads and this hub's private data (signing key, messages) never leave the hub.
const SKIP = new Set(['files', 'hub-data', 'inbox', 'outbox', 'node_modules', '.git']);
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = buf => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

async function walk(dir, rel = '') {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name) || entry.name.endsWith('.zip')) continue;
    const path = join(dir, entry.name), name = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...await walk(path, name));
    else if (entry.isFile()) out.push({ name, data: await readFile(path) });
  }
  return out;
}

export async function zipKit(kitDir, root = 'ARK-offline-kit') {
  const local = [], central = [];
  let offset = 0;
  for (const file of await walk(kitDir)) {
    const name = Buffer.from(`${root}/${file.name}`, 'utf8'), crc = crc32(file.data), size = file.data.length;
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0); head.writeUInt16LE(20, 4); head.writeUInt16LE(0x0800, 6);
    head.writeUInt32LE(crc, 14); head.writeUInt32LE(size, 18); head.writeUInt32LE(size, 22); head.writeUInt16LE(name.length, 26);
    local.push(head, name, file.data);
    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0); dir.writeUInt16LE(20, 4); dir.writeUInt16LE(20, 6); dir.writeUInt16LE(0x0800, 8);
    dir.writeUInt32LE(crc, 16); dir.writeUInt32LE(size, 20); dir.writeUInt32LE(size, 24); dir.writeUInt16LE(name.length, 28);
    dir.writeUInt32LE(offset, 42);
    central.push(dir, name);
    offset += 30 + name.length + size;
  }
  const centralBuf = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(central.length / 2, 8); end.writeUInt16LE(central.length / 2, 10);
  end.writeUInt32LE(centralBuf.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, centralBuf, end]);
}
const DB_NAME = 'ark-map-tiles-v1';
const STORE = 'tiles';
const TILE_URL = (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

export const MAX_TILES = 600;
const MINOR_TILE_PAUSE_MS = 40;

let dbPromise;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'key' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('This browser will not let ARK store map tiles.'));
    });
  }
  return dbPromise;
}

async function withStore(mode, action) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = action(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(request ? request.result : undefined);
    tx.onerror = () => reject(tx.error || new Error('Map tile storage failed.'));
  });
}

const tileKey = (z, x, y) => `${z}/${x}/${y}`;

export const getCachedTile = (z, x, y) =>
  withStore('readonly', store => store.get(tileKey(z, x, y))).then(row => row?.blob || null);

export const putCachedTile = (z, x, y, blob) =>
  withStore('readwrite', store => store.put({ key: tileKey(z, x, y), blob, bytes: blob.size, at: Date.now() }));

export const clearCachedTiles = () => withStore('readwrite', store => store.clear());

export function cachedTileStats() {
  return openDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    let count = 0;
    let bytes = 0;
    let last = 0;
    const request = tx.objectStore(STORE).openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      count += 1;
      bytes += cursor.value.bytes || 0;
      last = Math.max(last, cursor.value.at || 0);
      cursor.continue();
    };
    tx.oncomplete = () => resolve({ count, bytes, last });
    tx.onerror = () => reject(tx.error || new Error('Could not read saved tiles.'));
  }));
}

export async function fetchTile(z, x, y) {
  const response = await fetch(TILE_URL(z, x, y), { mode: 'cors' });
  if (!response.ok) throw new Error(`Tile server returned ${response.status}`);
  return response.blob();
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function tilesForArea({ lat, lng, radiusKm, minZoom, maxZoom }) {
  const centerLat = clamp(lat, -84, 84);
  const latSpan = radiusKm / 111.32;
  const lngSpan = radiusKm / (111.32 * Math.max(Math.cos((centerLat * Math.PI) / 180), 0.2));
  const tiles = [];

  for (let z = clamp(minZoom, 2, 18); z <= clamp(maxZoom, 2, 18); z += 1) {
    const scale = 2 ** z;
    const toX = lon => Math.floor(((lon + 180) / 360) * scale);
    const toY = latValue => {
      const rad = (clamp(latValue, -84, 84) * Math.PI) / 180;
      return Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * scale);
    };
    const xStart = clamp(toX(lng - lngSpan), 0, scale - 1);
    const xEnd = clamp(toX(lng + lngSpan), 0, scale - 1);
    const yStart = clamp(toY(centerLat + latSpan), 0, scale - 1);
    const yEnd = clamp(toY(centerLat - latSpan), 0, scale - 1);
    for (let x = xStart; x <= xEnd; x += 1) {
      for (let y = yStart; y <= yEnd; y += 1) tiles.push([z, x, y]);
    }
  }
  return tiles;
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function downloadArea(area, onProgress, isCancelled) {
  const list = tilesForArea(area);
  if (!list.length) throw new Error('That zoom range covers no tiles. Widen the range.');
  if (list.length > MAX_TILES) {
    throw new Error(`That area needs ${list.length} tiles and the limit is ${MAX_TILES}. Choose a smaller radius or a narrower zoom range.`);
  }

  const result = { total: list.length, saved: 0, skipped: 0, failed: 0 };
  for (let index = 0; index < list.length; index += 1) {
    if (isCancelled?.()) break;
    const [z, x, y] = list[index];
    if (await getCachedTile(z, x, y)) {
      result.skipped += 1;
    } else {
      try {
        await putCachedTile(z, x, y, await fetchTile(z, x, y));
        result.saved += 1;
      } catch {
        result.failed += 1;
      }
    }
    onProgress?.({ ...result, done: index + 1 });
    await wait(MINOR_TILE_PAUSE_MS);
  }
  return result;
}

export const formatBytes = bytes => (bytes < 1024 * 1024
  ? `${Math.max(1, Math.round(bytes / 1024))} KB`
  : `${(bytes / 1024 / 1024).toFixed(1)} MB`);
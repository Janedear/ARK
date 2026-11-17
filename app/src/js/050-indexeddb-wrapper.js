// === INDEXEDDB WRAPPER ===
const DB = {
  _db: null,
  async open() {
    if (this._db) return this._db;
    return new Promise((res, rej) => {
      const req = indexedDB.open('ARK_DB', 3);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('messages')) {
          const ms = db.createObjectStore('messages', {keyPath:'id'});
          ms.createIndex('channel','channel',{unique:false});
          ms.createIndex('ts','ts',{unique:false});
        }
        if (!db.objectStoreNames.contains('resources')) {
          db.createObjectStore('resources', {keyPath:'id',autoIncrement:true});
        }
        // v3: persistent map tile cache (key: "z/x/y", value: {key, blob, ts})
        if (!db.objectStoreNames.contains('map_tiles')) {
          const tileStore = db.createObjectStore('map_tiles', {keyPath:'key'});
          tileStore.createIndex('ts','ts',{unique:false});
        }
      };
      req.onsuccess = e => {
        this._db = e.target.result;
        // Saved map tiles are kept: an emergency can come long after the map was cached,
        // and an old map is far better than no map.
        res(this._db);
      };
      req.onerror = e => { console.error('IDB error', e); rej(e); };
      // Another tab holding an older database open must not leave this promise hanging forever.
      req.onblocked = () => rej(new Error('IndexedDB blocked by another tab'));
    });
  },
  // ── Tile cache helpers ─────────────────────────────────────────────────────
  async getTile(key) {
    try {
      const db = await this.open();
      return new Promise((res) => {
        const req = db.transaction('map_tiles','readonly').objectStore('map_tiles').get(key);
        req.onsuccess = () => res(req.result || null);
        req.onerror = () => res(null);
      });
    } catch(e) { return null; }
  },
  async putTile(key, blob) {
    try {
      const db = await this.open();
      return new Promise((res) => {
        const req = db.transaction('map_tiles','readwrite').objectStore('map_tiles').put({key, blob, ts: Date.now()});
        req.onsuccess = () => res();
        req.onerror = () => res();
      });
    } catch(e) {}
  },
  async _pruneTiles() {
    try {
      const db = await this.open();
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days
      const tx = db.transaction('map_tiles','readwrite');
      const idx = tx.objectStore('map_tiles').index('ts');
      const range = IDBKeyRange.upperBound(cutoff);
      idx.openCursor(range).onsuccess = (e) => {
        const cur = e.target.result;
        if (cur) { cur.delete(); cur.continue(); }
      };
    } catch(e) {}
  },
  async getAll(store) {
    try {
      const db = await this.open();
      return new Promise((res, rej) => {
        const tx = db.transaction(store,'readonly');
        const req = tx.objectStore(store).getAll();
        req.onsuccess = () => res(req.result || []);
        req.onerror = rej;
      });
    } catch(e) { return []; }
  },
  async put(store, item) {
    try {
      const db = await this.open();
      return new Promise((res) => {
        const tx = db.transaction(store,'readwrite');
        const req = tx.objectStore(store).put(item);
        req.onsuccess = () => res(req.result);
        req.onerror = (e) => { console.error('IDB put error', store, e); res(undefined); };
      });
    } catch(e) { console.error('IDB put error', store, e); return undefined; }
  },
  async clear(store) {
    try {
      const db = await this.open();
      return new Promise((res) => {
        const tx = db.transaction(store,'readwrite');
        const req = tx.objectStore(store).clear();
        req.onsuccess = () => res();
        req.onerror = () => res();
      });
    } catch(e) {}
  },
  async delete(store, id) {
    try {
      const db = await this.open();
      return new Promise((res, rej) => {
        const tx = db.transaction(store,'readwrite');
        const req = tx.objectStore(store).delete(id);
        req.onsuccess = () => res();
        req.onerror = rej;
      });
    } catch(e) { console.error('IDB delete error', e); }
  }
};


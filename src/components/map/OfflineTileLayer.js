import L from 'leaflet';
import { getCachedTile, putCachedTile, fetchTile } from '@/components/map/tileCache';

/**
 * Grid layer that reads tiles from the browser cache first and only falls back
 * to the OpenStreetMap tile server when a tile has not been saved yet.
 */
const OfflineTileLayer = L.GridLayer.extend({
  createTile(coords, done) {
    const img = document.createElement('img');
    img.alt = '';
    img.decoding = 'async';

    (async () => {
      const { x, y, z } = coords;
      let blob = await getCachedTile(z, x, y).catch(() => null);

      if (!blob && (typeof navigator === 'undefined' || navigator.onLine)) {
        try {
          blob = await fetchTile(z, x, y);
          await putCachedTile(z, x, y, blob);
          this.fire('tilesource', { coords, source: 'network' });
        } catch {
          blob = null;
        }
      }

      if (!blob) {
        img.className = 'ark-tile-gap';
        this.fire('tilesource', { coords, source: 'missing' });
        done(null, img);
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        done(null, img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        done(null, img);
      };
      img.src = objectUrl;
    })();

    return img;
  },
});

export default OfflineTileLayer;
const EARTH_RADIUS_MILES = 3958.8;
const toRad = deg => (deg * Math.PI) / 180;

export function distanceMiles(from, to) {
  if (!from || !to) return null;
  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lon - from.lon);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(a));
}

export function formatDistance(miles) {
  if (miles == null) return null;
  if (miles < 0.15) return 'right here';
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

export function hasPosition(record) {
  return typeof record?.latitude === 'number' && typeof record?.longitude === 'number';
}
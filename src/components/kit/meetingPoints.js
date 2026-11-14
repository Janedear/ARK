import { distanceMiles, formatDistance } from '@/lib/geo';

const OVERPASS = 'https://overpass-api.de/api/interpreter';
export const DEFAULT_MEETING_TEXT = 'Not chosen yet. Default: the main entrance of the nearest public elementary school. If it is unsafe or closed, the front steps of your town hall.';

/** Nearest named schools (elementary first) and town halls from OpenStreetMap. */
export async function findMeetingPoints(origin) {
  const q = `[out:json][timeout:25];(nwr["amenity"="townhall"](around:15000,${origin.lat},${origin.lon});nwr["amenity"="school"](around:6000,${origin.lat},${origin.lon}););out center tags;`;
  const res = await fetch(OVERPASS, { method: 'POST', body: 'data=' + encodeURIComponent(q) });
  if (!res.ok) throw new Error('Place lookup is unavailable right now. Type a meeting point instead.');
  const { elements } = await res.json();
  const rows = elements.filter(e => e.tags?.name).map(e => {
    const t = e.tags, pos = { lat: e.lat ?? e.center?.lat, lon: e.lon ?? e.center?.lon };
    const elementary = /elementary|primary/i.test(t.name) || t.school === 'primary' || String(t['isced:level'] || '').includes('1');
    return {
      name: t.name, ...pos,
      kind: t.amenity === 'townhall' ? 'Town hall' : elementary ? 'Elementary school' : 'School',
      address: [t['addr:housenumber'], t['addr:street'], t['addr:city']].filter(Boolean).join(' '),
      miles: distanceMiles(origin, pos), elementary,
    };
  });
  const schools = rows.filter(r => r.kind !== 'Town hall').sort((a, b) => (b.elementary - a.elementary) || a.miles - b.miles).slice(0, 3);
  const halls = rows.filter(r => r.kind === 'Town hall').sort((a, b) => a.miles - b.miles).slice(0, 2);
  return [...schools, ...halls].map(r => ({ ...r, distance: formatDistance(r.miles) }));
}

export function meetingPointText(point) {
  if (!point?.name) return DEFAULT_MEETING_TEXT;
  const lines = [point.kind ? `${point.name} (${point.kind})` : point.name];
  if (point.address) lines.push(point.address);
  if (typeof point.lat === 'number') lines.push(`GPS: ${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}`);
  lines.push('Meet at the main entrance. If it is unsafe, wait at the nearest safe spot in sight of it.');
  return lines.join('\n');
}
const NOMINATIM = 'https://nominatim.openstreetmap.org';

function shortLabel(result) {
  const a = result.address || {};
  const place = a.city || a.town || a.village || a.hamlet || a.suburb || a.county || result.name;
  const region = a.state || a.region || a.country;
  const label = [place, region].filter(Boolean).join(', ');
  return label || result.display_name || 'Unknown place';
}

export async function searchArea(query) {
  const url = `${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('Area lookup is unavailable right now.');
  const rows = await res.json();
  return rows.map(row => ({ label: shortLabel(row), lat: Number(row.lat), lon: Number(row.lon) }));
}

export async function describePosition(lat, lon) {
  const res = await fetch(`${NOMINATIM}/reverse?format=jsonv2&addressdetails=1&lat=${lat}&lon=${lon}`);
  if (!res.ok) return 'My current location';
  const row = await res.json();
  return shortLabel(row);
}

export function currentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('This device cannot report a location.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
      () => reject(new Error('Location was not shared. Search for your town instead.')),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    );
  });
}
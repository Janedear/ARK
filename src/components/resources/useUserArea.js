import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * The area a person chose for their own resource list, kept on their user record
 * so it follows them to any device.
 */
export default function useUserArea() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    base44.auth.me()
      .then(me => { if (alive) setUser(me); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const coords = user && typeof user.home_lat === 'number' && typeof user.home_lon === 'number'
    ? { lat: user.home_lat, lon: user.home_lon }
    : null;

  const save = async area => {
    await base44.auth.updateMe({ home_area: area.label, home_lat: area.lat, home_lon: area.lon });
    setUser(prev => ({ ...prev, home_area: area.label, home_lat: area.lat, home_lon: area.lon }));
  };

  return { user, coords, areaLabel: user?.home_area || '', loading, save };
}
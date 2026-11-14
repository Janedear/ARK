import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const KEY = 'lifeline_snapshot_v1';
const empty = { household: null, contacts: [], supplies: [], announcements: [], openHelp: 0, activeIncidents: 0, at: null };

function readCache() {
  try { return { ...empty, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return empty; }
}

export default function useLifeline() {
  const [data, setData] = useState(readCache);
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);

  const load = async () => {
    setLoading(true);
    try {
      // Always the signed-in person's own household, even for admins who can read everyone's.
      const me = await base44.auth.me();
      const hh = (await base44.entities.Household.filter({ created_by_id: me.id }, { sort: '-created_date', limit: 1 })).items[0] || null;
      const [contacts, supplies, announcements, openHelp, activeIncidents] = await Promise.all([
        hh ? base44.entities.HouseholdContact.filter({ household_id: hh.id }, { sort: 'created_date', limit: 200 }) : { items: [] },
        hh ? base44.entities.SupplyItem.filter({ household_id: hh.id }, { sort: 'created_date', limit: 200 }) : { items: [] },
        base44.entities.Announcement.list({ sort: '-created_date', limit: 2 }),
        base44.entities.HelpRequest.count({ status: 'open' }),
        base44.entities.Incident.count({ status: { $nin: ['resolved', 'closed'] } })
      ]);
      const next = { household: hh, contacts: contacts.items || [], supplies: supplies.items || [], announcements: announcements.items || [], openHelp, activeIncidents, at: new Date().toISOString() };
      localStorage.setItem(KEY, JSON.stringify(next));
      setData(next);
      setStale(false);
    } catch {
      setData(readCache());
      setStale(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const up = () => { setOnline(true); load(); };
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  return { data, loading, stale, online, load };
}
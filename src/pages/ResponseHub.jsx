import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import CheckInForm from '@/components/hub/CheckInForm';
import CheckInList from '@/components/hub/CheckInList';
import Announcements from '@/components/hub/Announcements';
import HelpBoard from '@/components/hub/HelpBoard';

export default function ResponseHub() {
  const [me, setMe] = useState(null);
  const [myCheckIn, setMyCheckIn] = useState(null);
  const [checkIns, setCheckIns] = useState([]);
  const [counts, setCounts] = useState({});
  const [filter, setFilter] = useState('all');
  const [requests, setRequests] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadMine = useCallback(async (user) => {
    const mine = await base44.entities.CheckIn.filter({ created_by_id: user.id });
    setMyCheckIn(mine[0] || null);
  }, []);

  const loadCheckIns = useCallback(async () => {
    const query = filter === 'all' ? {} : { status: filter };
    const [page, agg] = await Promise.all([
      base44.entities.CheckIn.filter(query, { sort: '-updated_date', limit: 200 }),
      base44.entities.CheckIn.aggregate({ query: {}, groupBy: 'status' }),
    ]);
    setCheckIns(page.items);
    setCounts(Object.fromEntries(agg.rows.map((r) => [r.status, r.count])));
  }, [filter]);

  const loadRequests = useCallback(async () => {
    const page = await base44.entities.HelpRequest.filter({ status: { $in: ['open', 'claimed'] } }, { sort: '-created_date', limit: 100 });
    setRequests(page.items);
  }, []);

  const loadAnnouncements = useCallback(async () => {
    const page = await base44.entities.Announcement.list({ sort: '-created_date', limit: 5 });
    setAnnouncements(page.items);
  }, []);

  useEffect(() => {
    (async () => {
      const user = await base44.auth.me();
      setMe(user);
      await Promise.all([loadMine(user), loadRequests(), loadAnnouncements()]);
      setLoading(false);
    })();
  }, [loadMine, loadRequests, loadAnnouncements]);

  useEffect(() => { loadCheckIns(); }, [loadCheckIns]);

  useEffect(() => {
    const subs = [
      base44.entities.CheckIn.subscribe(() => loadCheckIns()),
      base44.entities.HelpRequest.subscribe(() => loadRequests()),
      base44.entities.Announcement.subscribe(() => loadAnnouncements()),
    ];
    return () => subs.forEach((unsub) => unsub());
  }, [loadCheckIns, loadRequests, loadAnnouncements]);

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  const onCheckInSaved = () => { loadMine(me); loadCheckIns(); };

  return (
    <div className="fo-screen fo-hub space-y-6">
      <div className="fo-page-header">
        <h1 className="text-2xl font-bold">People & help</h1>
        <p className="text-sm text-muted-foreground">Tell your team how you are, read local updates, and coordinate specific needs. This is not emergency dispatch.</p>
      </div>
      <Announcements items={announcements} me={me} onChange={loadAnnouncements} />
      <div className="grid gap-6 xl:grid-cols-3 items-start">
        <CheckInForm me={me} existing={myCheckIn} onSaved={onCheckInSaved} />
        <HelpBoard requests={requests} me={me} onChange={loadRequests} />
        <CheckInList checkIns={checkIns} counts={counts} filter={filter} onFilter={setFilter} />
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DeclareIncidentDialog from '@/components/incidents/DeclareIncidentDialog';
import StageFilter from '@/components/incidents/StageFilter';
import IncidentCard from '@/components/incidents/IncidentCard';
import { ACTIVE_STAGES } from '@/components/incidents/incidentConfig';

const queryFor = (stage) => (stage === 'all' ? {} : stage === 'active' ? { status: { $in: ACTIVE_STAGES } } : { status: stage });

export default function Incidents() {
  const [stage, setStage] = useState('active');

  const { data: counts } = useQuery({
    queryKey: ['incidentCounts'],
    queryFn: () => base44.entities.Incident.aggregate({ query: {}, groupBy: 'status' }),
  });

  const list = useInfiniteQuery({
    queryKey: ['incidentList', stage],
    queryFn: ({ pageParam }) =>
      base44.entities.Incident.filter(queryFor(stage), { sort: '-created_date', limit: 30, ...(pageParam ? { cursor: pageParam } : {}) }),
    initialPageParam: null,
    getNextPageParam: (last) => (last.has_more ? last.next_cursor : undefined),
  });
  const incidents = list.data?.pages.flatMap((p) => p.items) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Incidents</h1>
            <p className="text-sm text-gray-500">Track every incident from first report to closure</p>
          </div>
          <DeclareIncidentDialog />
        </div>

        <StageFilter value={stage} onChange={setStage} rows={counts?.rows || []} />

        {list.isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : incidents.length === 0 ? (
          <div className="text-center text-sm text-gray-500 py-16 bg-white border border-dashed rounded-xl">No incidents in this view.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {incidents.map((i) => <IncidentCard key={i.id} incident={i} />)}
          </div>
        )}

        {list.hasNextPage && (
          <Button variant="outline" className="w-full" onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage}>
            {list.isFetchingNextPage && <Loader2 className="animate-spin" />}Load more
          </Button>
        )}
      </div>
    </div>
  );
}
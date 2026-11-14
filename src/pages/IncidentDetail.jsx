import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Loader2 } from 'lucide-react';
import IncidentHeader from '@/components/incidents/IncidentHeader';
import StageTracker from '@/components/incidents/StageTracker';
import ActionList from '@/components/incidents/ActionList';
import AIAdvisor from '@/components/incidents/AIAdvisor';
import UpdatesTimeline from '@/components/incidents/UpdatesTimeline';
import AdvanceStageDialog from '@/components/incidents/AdvanceStageDialog';
import { OPEN_ACTION_STATUSES } from '@/components/incidents/incidentConfig';

export default function IncidentDetail() {
  const id = new URLSearchParams(window.location.search).get('id');
  const queryClient = useQueryClient();
  const [advanceOpen, setAdvanceOpen] = useState(false);

  const { data: incident, isLoading } = useQuery({
    queryKey: ['incident', id],
    queryFn: async () => (await base44.entities.Incident.filter({ id }))[0] || null,
  });
  const { data: actions = [] } = useQuery({
    queryKey: ['incidentActions', id],
    queryFn: async () => (await base44.entities.IncidentAction.filter({ incident_id: id }, { sort: 'created_date', limit: 200 })).items,
  });
  const { data: updates = [] } = useQuery({
    queryKey: ['incidentUpdates', id],
    queryFn: async () => (await base44.entities.IncidentUpdate.filter({ incident_id: id }, { sort: '-created_date', limit: 100 })).items,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['incident', id] });
    queryClient.invalidateQueries({ queryKey: ['incidentActions', id] });
    queryClient.invalidateQueries({ queryKey: ['incidentUpdates', id] });
    queryClient.invalidateQueries({ queryKey: ['incidentList'] });
    queryClient.invalidateQueries({ queryKey: ['incidentCounts'] });
  };

  // Live updates so every responder sees changes as they happen
  useEffect(() => {
    const unsubs = [base44.entities.Incident, base44.entities.IncidentAction, base44.entities.IncidentUpdate].map((entity) =>
      entity.subscribe((e) => { if (e.id === id || e.data?.incident_id === id) refresh(); })
    );
    return () => unsubs.forEach((u) => u());
  }, [id]);

  const notFound = !isLoading && !incident;
  useEffect(() => {
    if (!notFound) return;
    const meta = document.createElement('meta');
    meta.name = 'prerender-status-code';
    meta.content = '404';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, [notFound]);

  if (isLoading) return <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>;
  if (notFound) return (
    <div className="text-center py-24 space-y-3">
      <div className="text-lg font-semibold">Incident not found</div>
      <Link to="/Incidents" className="text-sm text-blue-600 hover:underline">Back to incidents</Link>
    </div>
  );

  const openActionCount = actions.filter((a) => OPEN_ACTION_STATUSES.includes(a.status)).length;

  return (
    <div className="fo-screen">
      <div className="fo-container space-y-6">
        <Link to="/Incidents" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" />All incidents
        </Link>
        <IncidentHeader incident={incident} onAdvance={() => setAdvanceOpen(true)} onChange={refresh} />
        <StageTracker status={incident.status} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <AIAdvisor incident={incident} actions={actions} onChange={refresh} />
            <ActionList incident={incident} actions={actions} onChange={refresh} />
          </div>
          <UpdatesTimeline incident={incident} updates={updates} onChange={refresh} />
        </div>
      </div>
      <AdvanceStageDialog
        key={incident.status}
        incident={incident}
        openActionCount={openActionCount}
        open={advanceOpen}
        onOpenChange={setAdvanceOpen}
        onChange={refresh}
      />
    </div>
  );
}
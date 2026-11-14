import React, { useState } from 'react';
import { Sparkles, Loader2, Plus, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getPhase } from './incidentConfig';
import { buildAdvisorPrompt, ADVISOR_SCHEMA } from './advisorPrompt';
import { logUpdate } from './logUpdate';

export default function AIAdvisor({ incident, actions, onChange }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState([]);

  const ask = async () => {
    setLoading(true);
    setAdded([]);
    try {
      setResult(await base44.integrations.Core.InvokeLLM({ prompt: buildAdvisorPrompt(incident, actions), response_json_schema: ADVISOR_SCHEMA }));
    } finally {
      setLoading(false);
    }
  };

  const accept = async (s, i) => {
    setAdded([...added, i]);
    await base44.entities.IncidentAction.create({ incident_id: incident.id, title: s.title, phase: s.phase, details: s.details, status: 'planned', ai_suggested: true });
    await logUpdate(incident.id, { kind: 'action_added', message: `AI-recommended action accepted: ${s.title}` });
    onChange();
  };

  return (
    <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="font-semibold text-indigo-950 flex items-center gap-2"><Sparkles className="h-4 w-4 text-indigo-600" />AI Response Advisor</div>
          <p className="text-xs text-indigo-900/70">Recommends next steps. Your team decides; nothing runs automatically.</p>
        </div>
        {incident.status !== 'closed' && (
          <Button size="sm" onClick={ask} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto">
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}{result ? 'Refresh advice' : 'Get recommendations'}
          </Button>
        )}
      </div>
      {loading && <p className="text-sm text-indigo-900/70">Analyzing the incident and actions so far...</p>}
      {result && !loading && (
        <div className="space-y-3">
          <p className="text-sm text-gray-800">{result.assessment}</p>
          {result.stage_readiness && <p className="text-xs bg-white border rounded p-2 text-gray-700"><span className="font-semibold">Stage readiness:</span> {result.stage_readiness}</p>}
          {result.suggestions?.map((s, i) => (
            <div key={i} className="bg-white border rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium text-sm text-gray-900">{s.title}</div>
                <Badge variant="outline" className={`shrink-0 ${getPhase(s.phase).badge}`}>{getPhase(s.phase).label}</Badge>
              </div>
              <p className="text-xs text-gray-600 mt-1">{s.details}</p>
              {s.rationale && <p className="text-xs text-gray-400 mt-1 italic">Why: {s.rationale}</p>}
              <Button size="sm" variant="outline" className="mt-2" disabled={added.includes(i)} onClick={() => accept(s, i)}>
                {added.includes(i) ? <><Check />Added to plan</> : <><Plus />Add to plan</>}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
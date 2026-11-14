export const STAGES = [
  { key: 'reported', label: 'Reported', hint: 'Incident logged and awaiting triage.', dot: 'bg-blue-500', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  { key: 'analysis', label: 'Analysis', hint: 'Confirm what happened, how it got in, and how far it spread.', dot: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { key: 'containment', label: 'Containment', hint: 'Stop the spread and isolate affected systems.', dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-800 border-orange-200' },
  { key: 'eradication', label: 'Eradication', hint: 'Remove the threat and close the way it got in.', dot: 'bg-red-500', badge: 'bg-red-100 text-red-800 border-red-200' },
  { key: 'recovery', label: 'Recovery', hint: 'Restore systems from trusted baselines and verify them.', dot: 'bg-purple-500', badge: 'bg-purple-100 text-purple-800 border-purple-200' },
  { key: 'resolved', label: 'Resolved', hint: 'Services restored and verified.', dot: 'bg-green-500', badge: 'bg-green-100 text-green-800 border-green-200' },
  { key: 'closed', label: 'Closed', hint: 'Post-incident review complete.', dot: 'bg-gray-500', badge: 'bg-gray-200 text-gray-800 border-gray-300' },
];

export const ACTIVE_STAGES = ['reported', 'analysis', 'containment', 'eradication', 'recovery'];
export const stageIndex = (key) => Math.max(0, STAGES.findIndex((s) => s.key === key));
export const getStage = (key) => STAGES.find((s) => s.key === key) || STAGES[0];

export const PHASES = [
  { key: 'analysis', label: 'Analysis', badge: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { key: 'containment', label: 'Containment', badge: 'bg-orange-100 text-orange-800 border-orange-200' },
  { key: 'eradication', label: 'Eradication', badge: 'bg-red-100 text-red-800 border-red-200' },
  { key: 'recovery', label: 'Recovery', badge: 'bg-purple-100 text-purple-800 border-purple-200' },
  { key: 'communication', label: 'Communication', badge: 'bg-sky-100 text-sky-800 border-sky-200' },
];
export const getPhase = (key) => PHASES.find((p) => p.key === key) || PHASES[0];
export const phaseForStage = (stage) =>
  ({ containment: 'containment', eradication: 'eradication', recovery: 'recovery', resolved: 'recovery', closed: 'recovery' }[stage] || 'analysis');

export const ACTION_STATUS = {
  planned: { label: 'Planned', badge: 'bg-gray-100 text-gray-700 border-gray-200' },
  in_progress: { label: 'In progress', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  done: { label: 'Done', badge: 'bg-green-100 text-green-800 border-green-200' },
  failed: { label: 'Failed', badge: 'bg-red-100 text-red-800 border-red-200' },
  cancelled: { label: 'Cancelled', badge: 'bg-gray-100 text-gray-500 border-gray-200' },
};
export const OPEN_ACTION_STATUSES = ['planned', 'in_progress'];

export const SEVERITY_BADGE = {
  low: 'bg-blue-100 text-blue-800 border-blue-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-red-100 text-red-800 border-red-200',
};

export const INCIDENT_TYPES = [
  { value: 'credential_compromise', label: 'Credential Compromise' },
  { value: 'malware', label: 'Malware Outbreak' },
  { value: 'ddos', label: 'DDoS Attack' },
  { value: 'supply_chain', label: 'Supply Chain Attack' },
  { value: 'insider_threat', label: 'Insider Threat' },
  { value: 'infrastructure_failure', label: 'Infrastructure Failure' },
  { value: 'other', label: 'Other' },
];
export const SEVERITIES = ['low', 'medium', 'high', 'critical'].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }));
export const REGIONS = [
  { value: 'region_a', label: 'Region A' },
  { value: 'region_b', label: 'Region B' },
  { value: 'region_c', label: 'Region C' },
  { value: 'region_d', label: 'Region D' },
  { value: 'multi_region', label: 'Multi-Region' },
  { value: 'national', label: 'National' },
];

export const humanize = (s) => (s || '').replace(/_/g, ' ');
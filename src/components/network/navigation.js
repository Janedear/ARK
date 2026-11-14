export const navigation = [
  { label: 'Start & prepare', description: 'Understand the network before you act.', items: [
    { name: 'Start here', path: '/', page: 'StartHere', hint: 'Choose your next step' },
    { name: 'No-internet field guide', path: '/FieldGuide', page: 'FieldGuide', hint: 'Prepare a paper fallback' }
  ] },
  { label: '01 · Protect people', description: 'Account for people and urgent needs.', items: [
    { name: 'People & help', path: '/ResponseHub', page: 'ResponseHub', hint: 'Check in, ask for help, offer support' }
  ] },
  { label: '02 · Coordinate response', description: 'Build a shared picture of the crisis.', items: [
    { name: 'Incident register', path: '/Incidents', page: 'Incidents', hint: 'Report, assign and track response' },
    { name: 'Situation overview', path: '/Dashboard', page: 'Dashboard', hint: 'Review saved reports and progress' }
  ] },
  { label: '03 · Restore services', description: 'Plan recovery of essential systems.', items: [
    { name: 'Recovery desk', path: '/CrisisCoordination', page: 'CrisisCoordination', hint: 'Prioritize work; execution is simulated' },
    { name: 'Infrastructure register', path: '/SystemManagement', page: 'SystemManagement', hint: 'Track systems and recovery baselines' },
    { name: 'Response procedures', path: '/Playbooks', page: 'Playbooks', hint: 'Read documented response steps' }
  ] },
  { label: '04 · Authority & review', description: 'Document responsibility and decisions.', items: [
    { name: 'Authority records', path: '/AuthorityManagement', page: 'AuthorityManagement', hint: 'Record mandates and their expiry' },
    { name: 'Activity log', path: '/AuditViewer', page: 'AuditViewer', hint: 'Review recorded platform actions' }
  ] }
];
export const guidance = {
  ResponseHub: { who: 'People seeking help, volunteers and local coordinators', next: 'Check in → read announcements → post or claim a need.', limit: 'Posts are not monitored emergency calls. Shared records require connectivity; no offline intake is implemented.' },
  Incidents: { who: 'Incident leads and response teams', next: 'Report an incident → name a lead → assign actions → record outcomes.', limit: 'A report is not a verified alert. Confirm sources and use established emergency channels for immediate danger.' },
  IncidentDetail: { who: 'The incident lead and assigned responders', next: 'Review context → agree on actions → record evidence → change stage with a reason.', limit: 'AI advice requires human review. Recorded completion is not independent proof of recovery.' },
  Dashboard: { who: 'Local coordinators and regional planning teams', next: 'Choose a reporting month → inspect incident records → open the relevant work area.', limit: 'These are saved application records, not a live sensor network. Missing reports do not mean no impact.' },
  CrisisCoordination: { who: 'Recovery leads and qualified infrastructure operators', next: 'Assess affected services → prioritize recovery tasks → review system details.', limit: 'Prototype only: Execute simulates recovery. It does not operate infrastructure or establish that a service is safe.' },
  SystemManagement: { who: 'Qualified operators responsible for essential services', next: 'Register a system → document a trusted baseline → review its recovery status.', limit: 'Reconstitution is simulated. Physical systems and real trust resets require qualified teams and independently verified authorization.' },
  Playbooks: { who: 'Response planners and trained teams', next: 'Find a matching procedure → check scope and authority → use it in a supervised exercise.', limit: 'Stored procedures and validation labels are not certification or automatic authorization to act.' },
  AuthorityManagement: { who: 'App administrators and authorized coordinating officials', next: 'Document the mandate → identify its scope and expiry → review the delegation chain.', limit: 'An authority record is not a legal mandate or an enforced account permission. Granular operational access is not implemented.' },
  AuditViewer: { who: 'Supervisors, auditors and after-action reviewers', next: 'Filter actions → examine the actor and outcome → review the record with supporting evidence.', limit: 'This is an application activity log; independent hash-chain verification and tamper-proof storage are not implemented.' }
};
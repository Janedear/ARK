export const navigation = [
  { label: 'Now', description: 'Start here, then act.', items: [
    { name: 'Home', path: '/', page: 'Lifeline', hint: 'Status, urgent help, next steps' },
    { name: 'What actually works', path: '/Capabilities', page: 'Capabilities', hint: 'Honest feature status' }
  ] },
  { label: 'My household', description: 'Private to your account.', items: [
    { name: 'Household plan', path: '/HouseholdPlan', page: 'HouseholdPlan', hint: 'People, meeting points, supplies' },
    { name: 'Print packet', path: '/PrintPacket', page: 'PrintPacket', hint: 'Paper copy for no power' }
  ] },
  { label: 'Guidance', description: 'Readable under stress.', items: [
    { name: 'Emergency guidance', path: '/Guidance', page: 'SurvivalLibrary', hint: 'Water, food, medical, power' },
    { name: 'No-internet field guide', path: '/FieldGuide', page: 'FieldGuide', hint: 'Prepare a paper fallback' }
  ] },
  { label: 'Community', description: 'Nearby people and services.', items: [
    { name: 'Open relay network', path: '/Network', page: 'Network', hint: 'Messages, offline queues, relay paths' },
    { name: 'Resources', path: '/Resources', page: 'Resources', hint: 'Water, food, shelter, charging' },
    { name: 'People & help', path: '/ResponseHub', page: 'ResponseHub', hint: 'Check in, ask, offer support' },
    { name: 'Incident register', path: '/Incidents', page: 'Incidents', hint: 'Report and track local disruption' }
  ] },
  { label: 'Coordination', description: 'For trained teams.', items: [
    { name: 'Situation overview', path: '/Dashboard', page: 'Dashboard', hint: 'Saved reports and progress' },
    { name: 'Recovery desk', path: '/CrisisCoordination', page: 'CrisisCoordination', hint: 'Prioritise work; simulated' },
    { name: 'Infrastructure register', path: '/SystemManagement', page: 'SystemManagement', hint: 'Systems and baselines' },
    { name: 'Response procedures', path: '/Playbooks', page: 'Playbooks', hint: 'Documented steps' },
    { name: 'Authority records', path: '/AuthorityManagement', page: 'AuthorityManagement', hint: 'Mandates and expiry' },
    { name: 'Activity log', path: '/AuditViewer', page: 'AuditViewer', hint: 'Recorded platform actions' }
  ] }
];
export const guidance = {
  Network: { who: 'Anyone sharing public reports or carrying them between people', next: 'Choose a channel → save a public message → check its receipt → use Relay paths or download the offline tool.', limit: 'Unencrypted public reports. Device signatures are not verified identity. No dispatch, native mesh or guaranteed delivery.' },
  Lifeline: { who: 'Anyone preparing a household or facing a disruption', next: 'Check the connection status → open the urgent block if someone is in danger → pick a task from the grid.', limit: 'ARK does not dispatch responders or call anyone for you. A saved snapshot is a copy, not live data.' },
  Capabilities: { who: 'Anyone deciding whether to rely on ARK', next: 'Read the status of each feature → disconnect and test the ones you care about.', limit: 'Statuses are conservative until a person tests them on a real phone.' },
  HouseholdPlan: { who: 'One household, one account', next: 'Save the plan → add contacts and one out-of-area relay → work through the supply checklist → print the packet.', limit: 'Records are private to this account, and admins can read all records. Use the town or neighbourhood, never a full street address.' },
  PrintPacket: { who: 'Anyone who may lose power or signal', next: 'Print or save as PDF → keep it with the kit → reprint after every change.', limit: 'The packet is a snapshot. It will not update itself, and it contains private information.' },
  SurvivalLibrary: { who: 'Households and volunteers', next: 'Search or pick a topic → read the quick steps → check the cited source.', limit: 'Draft content. Not reviewed by a clinician, and not a substitute for emergency services.' },
  GuideArticle: { who: 'Households and volunteers', next: 'Read the quick steps first → print the page if you may lose power.', limit: 'Draft content awaiting professional review. Source links need a connection.' },
  Resources: { who: 'People looking for local help, and coordinators who add listings', next: 'Filter by category → check the source and last-checked date → call ahead before travelling.', limit: 'No live availability and no verified feed. Listings are claims. Never publish a private address.' },
  ResponseHub: { who: 'People seeking help, volunteers and local coordinators', next: 'Check in → read announcements → post or claim a need.', limit: 'Posts are not monitored emergency calls. Shared records require connectivity; no offline intake is implemented.' },
  Incidents: { who: 'Incident leads and response teams', next: 'Report an incident → name a lead → assign actions → record outcomes.', limit: 'A report is not a verified alert. Use established emergency channels for immediate danger.' },
  IncidentDetail: { who: 'The incident lead and assigned responders', next: 'Review context → agree on actions → record evidence → change stage with a reason.', limit: 'AI advice requires human review. Recorded completion is not independent proof of recovery.' },
  Dashboard: { who: 'Local coordinators and regional planners', next: 'Choose a report month → inspect incident records → open the relevant work area.', limit: 'These are saved application records, not a live sensor network.' },
  CrisisCoordination: { who: 'Recovery leads and qualified infrastructure operators', next: 'Assess affected services → prioritise recovery tasks → review system details.', limit: 'Prototype only: recovery execution is simulated. It does not operate infrastructure.' },
  SystemManagement: { who: 'Qualified operators responsible for essential services', next: 'Register a system → document a trusted baseline → review recovery status.', limit: 'Reconstitution is simulated. Real recovery needs qualified teams and verified authorisation.' },
  Playbooks: { who: 'Response planners and trained teams', next: 'Find a matching procedure → check scope → use it in a supervised exercise.', limit: 'Stored procedures are not certification or automatic authorisation.' },
  AuthorityManagement: { who: 'Administrators and coordinating officials', next: 'Document the mandate → identify scope and expiry → review the delegation chain.', limit: 'An authority record is not a legal mandate or an enforced permission.' },
  AuditViewer: { who: 'Supervisors, auditors and reviewers', next: 'Filter actions → examine the actor and outcome → compare with original evidence.', limit: 'Application activity log only. No tamper-proof storage or independent verification.' }
};
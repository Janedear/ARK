import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
const sum = rows => rows.reduce((total, row) => total + row.count, 0);
export default function useOverview() {
  const [selected, onSelect] = useState(11);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => { const date = new Date(); const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 11 + i, 1)); const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1)); return { key: start.toISOString().slice(0, 7), start: start.toISOString(), end: end.toISOString(), short: start.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }), label: start.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }) }; }), []);
  const month = months[selected];
  const query = { created_date: { $gte: month.start, $lt: month.end } };
  const report = useQuery({ queryKey: ['overview-report', month.key], queryFn: async () => {
    const [severity, statuses, recent] = await Promise.all([base44.entities.Incident.aggregate({ query, groupBy: 'severity' }), base44.entities.Incident.aggregate({ query, groupBy: 'status' }), base44.entities.Incident.filter(query, { sort: '-created_date', limit: 5 })]);
    const total = sum(statuses.rows); const resolved = sum(statuses.rows.filter(r => ['resolved', 'closed'].includes(r.status)));
    return { total, resolved, open: total - resolved, percentage: total ? Math.round(resolved / total * 100) : 0, severity: severity.rows, recent: recent.items };
  } });
  const context = useQuery({ queryKey: ['overview-current'], queryFn: async () => {
    const [systems, authorities, tasks, active, trend] = await Promise.all([base44.entities.System.aggregate({ groupBy: 'status' }), base44.entities.Authority.count({ status: 'active' }), base44.entities.RecoveryTask.count({ status: { $in: ['queued', 'in_progress'] } }), base44.entities.Incident.count({ status: { $nin: ['resolved', 'closed'] } }), base44.entities.Incident.aggregate({ query: { created_date: { $gte: months[0].start, $lt: months[11].end } }, dateBucket: { field: 'created_date', unit: 'month' } })]);
    const total = sum(systems.rows); const operational = systems.rows.find(r => r.status === 'operational')?.count || 0;
    return { systems: total, operational, authorities, tasks, active, trend: trend.rows };
  } });
  return { selected, onSelect, months, month, report, context };
}
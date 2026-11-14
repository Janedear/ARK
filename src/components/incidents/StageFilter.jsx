import React from 'react';
import { STAGES, ACTIVE_STAGES } from './incidentConfig';

export default function StageFilter({ value, onChange, rows }) {
  const count = (key) => rows.find((r) => r.status === key)?.count || 0;
  const filters = [
    { key: 'active', label: 'Active', n: ACTIVE_STAGES.reduce((sum, k) => sum + count(k), 0) },
    ...STAGES.map((s) => ({ key: s.key, label: s.label, n: count(s.key) })),
    { key: 'all', label: 'All', n: rows.reduce((sum, r) => sum + r.count, 0) },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
      {filters.map((f) => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          className={`fo-filter shrink-0 px-4 py-2 rounded text-xs font-semibold border transition ${
            value === f.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          {f.label} <span className={value === f.key ? 'text-slate-300' : 'text-gray-400'}>{f.n}</span>
        </button>
      ))}
    </div>
  );
}
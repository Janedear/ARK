import React from 'react';
import { Check } from 'lucide-react';
import { STAGES, stageIndex, getStage } from './incidentConfig';

export default function StageTracker({ status }) {
  const current = stageIndex(status);
  const stage = getStage(status);

  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STAGES.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1 shrink-0">
            <div
              title={s.label}
              className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                i < current ? 'bg-green-600 text-white' : i === current ? `${s.dot} text-white ring-4 ring-gray-200` : 'bg-gray-200 text-gray-500'
              }`}
            >
              {i < current ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-xs hidden md:inline ${i === current ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>{s.label}</span>
            {i < STAGES.length - 1 && <div className={`h-0.5 w-4 md:w-6 ${i < current ? 'bg-green-600' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>
      <div className="mt-3">
        <div className="text-sm font-semibold text-gray-900">Stage {current + 1} of {STAGES.length}: {stage.label}</div>
        <div className="text-xs text-gray-500">{stage.hint}</div>
      </div>
    </div>
  );
}
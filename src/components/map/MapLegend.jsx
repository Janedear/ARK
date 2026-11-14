import React from 'react';
import { CATEGORY_COLORS } from '@/components/map/mapConfig';

export default function MapLegend({ counts }) {
  return <div className="ark-legend">
    {Object.entries(CATEGORY_COLORS).map(([category, color]) => <span key={category} className="ark-legend-item">
      <i style={{ background: color }} aria-hidden="true" />
      {category}{counts?.[category] ? ` (${counts[category]})` : ''}
    </span>)}
  </div>;
}
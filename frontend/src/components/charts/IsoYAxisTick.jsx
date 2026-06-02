import React from 'react';
import { TEXT_PRIMARY, wrapIsoLabelLines } from './charts.utils.js';

export function IsoYAxisTick({ x, y, payload }) {
  const lines = wrapIsoLabelLines(payload?.value || '');
  return (
    <g transform={`translate(${x},${y})`}>
      {lines.map((line, idx) => (
        <text
          key={`${payload?.value}-${idx}`}
          x={0}
          y={idx * 16}
          dy={5}
          textAnchor="end"
          fill={TEXT_PRIMARY}
          fontSize={13}
          fontWeight={700}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

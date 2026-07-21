import React, { useMemo } from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import { ChartsSections } from './charts/ChartsSections.jsx';
import { IsoYAxisTick } from './charts/IsoYAxisTick.jsx';
import {
  abbreviateAreaLabel,
  buildChartsData,
  hasChartsAnalysisData,
  palette,
  PIE_COLORS,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  tooltipStyle
} from './charts/charts.utils.js';

export default function ChartsPage({ records = [], summary = null, analysisTotalRecords = 0 }) {
  const hasAnalysisData = useMemo(() => (
    hasChartsAnalysisData({ records, summary, analysisTotalRecords })
  ), [records, summary, analysisTotalRecords]);

  const data = useMemo(() => buildChartsData({ records, summary }), [records, summary]);

  if (!hasAnalysisData) {
    return (
      <Card>
        <CardContent sx={{ p: 3.5, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5, color: TEXT_PRIMARY }}>
            No hay datos suficientes para mostrar gráficos
          </Typography>
          <Typography sx={{ color: TEXT_SECONDARY, fontWeight: 500 }}>
            Cargá un análisis para visualizar desvíos, resultados e ISO 22000.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <ChartsSections
      data={data}
      textPrimary={TEXT_PRIMARY}
      textMuted={TEXT_MUTED}
      textSecondary={TEXT_SECONDARY}
      palette={palette}
      pieColors={PIE_COLORS}
      tooltipStyle={tooltipStyle}
      abbreviateAreaLabel={abbreviateAreaLabel}
      IsoYAxisTick={IsoYAxisTick}
    />
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { Box, Card, CardContent, Tab, Tabs, Typography } from '@mui/material';
import { ChartsSections } from './charts/ChartsSections.jsx';
import { IsoYAxisTick } from './charts/IsoYAxisTick.jsx';
import PeriodComparisonPage from './PeriodComparisonPage.jsx';
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

  const [view, setView] = useState(() => (hasAnalysisData ? 'current' : 'comparison'));
  const data = useMemo(() => buildChartsData({ records, summary }), [records, summary]);

  useEffect(() => {
    if (!hasAnalysisData && view === 'current') {
      setView('comparison');
    }
  }, [hasAnalysisData, view]);

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Card>
        <CardContent sx={{ py: 1.25, px: { xs: 1, sm: 2 } }}>
          <Tabs
            value={view}
            onChange={(_event, next) => setView(next)}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="Vistas de indicadores"
          >
            <Tab
              value="current"
              label="Análisis actual"
              disabled={!hasAnalysisData}
              sx={{ textTransform: 'none', fontWeight: 800 }}
            />
            <Tab
              value="comparison"
              label="Comparar períodos"
              sx={{ textTransform: 'none', fontWeight: 800 }}
            />
          </Tabs>
        </CardContent>
      </Card>

      {view === 'comparison' ? (
        <PeriodComparisonPage />
      ) : !hasAnalysisData ? (
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
      ) : (
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
      )}
    </Box>
  );
}

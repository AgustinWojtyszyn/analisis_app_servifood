import React from 'react';
import { Box, Card, CardContent, Grid, Typography } from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  ReportProblem as ReportProblemIcon,
  FactCheck as FactCheckIcon,
  Rule as RuleIcon,
  Visibility as VisibilityIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';

const metricVariants = {
  info: { icon: AnalyticsIcon, color: 'info.main', bg: 'rgba(2, 132, 199, 0.14)' },
  error: { icon: ReportProblemIcon, color: 'error.main', bg: 'rgba(220, 38, 38, 0.14)' },
  success: { icon: FactCheckIcon, color: 'success.main', bg: 'rgba(22, 163, 74, 0.14)' },
  warning: { icon: VisibilityIcon, color: 'warning.main', bg: 'rgba(234, 88, 12, 0.14)' },
  primary: { icon: RuleIcon, color: 'primary.main', bg: 'rgba(29, 78, 216, 0.14)' },
  secondary: { icon: TrendingUpIcon, color: 'secondary.main', bg: 'rgba(126, 34, 206, 0.14)' }
};

function MetricCard({ title, value, variant = 'info' }) {
  const { icon: Icon, color, bg } = metricVariants[variant] || metricVariants.info;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.25 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography color="text.secondary" sx={{ fontSize: 13.5, fontWeight: 600 }} gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, mb: 0 }}>
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.5,
              backgroundColor: bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Icon sx={{ fontSize: 24, color }} />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export function SummaryGrid({ summary, processedAt = null }) {
  if (!summary) return null;

  const effectiveProcessedAt = summary.processedAt || processedAt;
  const processedAtLabel = effectiveProcessedAt
    ? new Date(effectiveProcessedAt).toLocaleString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    : null;

  return (
    <>
      {processedAtLabel && (
        <Typography sx={{ mb: 1.25, color: 'text.secondary', fontSize: 14 }}>
          Procesado: {processedAtLabel}
        </Typography>
      )}
      <Grid container spacing={2.25} sx={{ mb: 3.5 }}>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <MetricCard title="Total registros" value={summary.totalRecords || 0} variant="info" />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <MetricCard title="Total desvíos" value={summary.totalDesvios || 0} variant="error" />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <MetricCard title="Conformes" value={summary.totalConformes || 0} variant="success" />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <MetricCard title="Inocuidad" value={summary.totalInocuidad || 0} variant="primary" />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <MetricCard title="Calidad" value={summary.totalCalidad || 0} variant="secondary" />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <MetricCard title="Logística" value={summary.totalLogistica || 0} variant="info" />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <MetricCard title="Legal" value={summary.totalLegal || 0} variant="warning" />
      </Grid>
      {(summary.totalRevisionManual || 0) > 0 && (
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <MetricCard title="Revisión manual" value={summary.totalRevisionManual || 0} variant="warning" />
        </Grid>
      )}
      </Grid>
    </>
  );
}

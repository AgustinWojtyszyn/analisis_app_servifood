import React from 'react';
import { Box, Card, CardContent, Grid, Typography } from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  ReportProblem as ReportProblemIcon,
  Rule as RuleIcon,
  Visibility as VisibilityIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { isIsoManualValue, readCanonicalIso } from '../lib/isoFields';

const metricVariants = {
  info: { icon: AnalyticsIcon, color: 'info.main', bg: 'rgba(2, 132, 199, 0.14)' },
  error: { icon: ReportProblemIcon, color: 'error.main', bg: 'rgba(220, 38, 38, 0.14)' },
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

function normalizeCompare(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ');
}

function toTitleCaseLabel(value = '') {
  const normalized = String(value || '')
    .trim()
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ');

  return normalized
    .split('/')
    .map((chunk) => chunk
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' '))
    .filter(Boolean)
    .join('/');
}

function isManualIsoValue(value = '') {
  return isIsoManualValue(value);
}

function resolveCategoryFromRecord(record = {}) {
  const originalColumns = (record?.columnasOriginales && typeof record.columnasOriginales === 'object' && !Array.isArray(record.columnasOriginales))
    ? record.columnasOriginales
    : {};
  const originalEntries = Object.entries(originalColumns);
  const findOriginalByAliases = (aliases = []) => {
    for (const alias of aliases) {
      const aliasNorm = normalizeCompare(alias);
      const match = originalEntries.find(([key]) => normalizeCompare(key) === aliasNorm);
      if (match) return String(match[1] || '').trim();
    }
    return '';
  };
  const excelClassification = String(
    record?.classification_original
    || findOriginalByAliases([
      'Clasificacion del desvio',
      'Clasificación del desvío',
      'Clasificacion del desvío',
      'Clasificación del desvio'
    ])
    || ''
  ).trim();
  if (excelClassification) return excelClassification;

  if (record?.preserveOriginalClassification && String(record?.classification_original || '').trim()) {
    return String(record.classification_original).trim();
  }
  return String(record?.clasificacionDesvio || record?.classification_normalized || record?.categoriaDesvio || '').trim();
}

function buildSummaryFromRecords(records = [], baseSummary = {}) {
  if (!Array.isArray(records) || records.length === 0) return baseSummary;

  const byCategoria = {};
  let totalInternos = 0;
  let totalExternos = 0;
  let totalRevisionManual = 0;

  records.forEach((record) => {
    const cat = resolveCategoryFromRecord(record);
    if (cat) byCategoria[cat] = (byCategoria[cat] || 0) + 1;

    const alcance = normalizeCompare(
      record?.tipoDesvioOrigen
      || record?.scope_normalized
      || record?.scope_original
      || record?.alcanceDesvio
      || ''
    );
    if (alcance === 'interno') totalInternos += 1;
    if (alcance === 'externo') totalExternos += 1;

    if (isManualIsoValue(readCanonicalIso(record))) {
      totalRevisionManual += 1;
    }
  });

  const entries = Object.entries(byCategoria);
  const sumBy = (predicate) => entries.reduce((acc, [name, value]) => acc + (predicate(name) ? Number(value || 0) : 0), 0);
  const isExact = (name, expected) => normalizeCompare(name) === normalizeCompare(expected);

  return {
    ...baseSummary,
    totalRecords: records.length,
    byCategoria,
    totalInocuidad: sumBy((name) => isExact(name, 'Inocuidad') || isExact(name, 'Desvío de Inocuidad')),
    totalLogistica: sumBy((name) => isExact(name, 'Logística') || isExact(name, 'Desvío de Logística')),
    totalCalidad: sumBy((name) => isExact(name, 'Calidad') || isExact(name, 'Desvío de Calidad')),
    totalLegal: sumBy((name) => isExact(name, 'Legales') || isExact(name, 'Legal') || isExact(name, 'Desvío Legal')),
    totalRevisionManual,
    totalInternos,
    totalExternos
  };
}

export function SummaryGrid({ summary, processedAt = null, records = [] }) {
  if (!summary) return null;
  const effectiveSummary = buildSummaryFromRecords(records, summary);

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

  const dynamicCategoryCards = Object.entries(effectiveSummary.byCategoria || {})
    .filter(([name]) => Boolean(String(name || '').trim()))
    .reduce((acc, [name, value]) => {
      const rawName = String(name || '').trim();
      const normalizedKey = normalizeCompare(rawName).replace(/^desvio de\s+/, '');
      if (!normalizedKey || normalizedKey === 'conforme') return acc;
      const current = acc.get(normalizedKey) || { label: rawName, value: 0 };
      current.value += Number(value || 0);
      if (!current.label || rawName.length > current.label.length) current.label = rawName;
      acc.set(normalizedKey, current);
      return acc;
    }, new Map());

  const fixedCategoryNormalized = new Set([
    'inocuidad',
    'logistica',
    'calidad',
    'legal',
    'legales',
    'revisar manualmente',
    'revision manual'
  ]);

  const dynamicCards = [...dynamicCategoryCards.entries()]
    .filter(([normalizedKey]) => !fixedCategoryNormalized.has(normalizedKey))
    .map(([, item]) => ({
      title: toTitleCaseLabel(String(item.label || '').replace(/^desvio de\s+/i, '')),
      value: Number(item.value || 0)
    }))
    .filter((item) => item.title && item.value > 0)
    .sort((a, b) => b.value - a.value || a.title.localeCompare(b.title, 'es'));

  return (
    <>
      {processedAtLabel && (
        <Typography sx={{ mb: 1.25, color: 'text.secondary', fontSize: 14 }}>
          Procesado: {processedAtLabel}
        </Typography>
      )}
      <Grid container spacing={2.25} sx={{ mb: 3.5 }}>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <MetricCard title="Total registros" value={effectiveSummary.totalRecords || 0} variant="info" />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <MetricCard title="Total desvíos" value={effectiveSummary.totalDesvios || 0} variant="error" />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <MetricCard title="Inocuidad" value={effectiveSummary.totalInocuidad || 0} variant="primary" />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <MetricCard title="Logística" value={effectiveSummary.totalLogistica || 0} variant="info" />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <MetricCard title="Calidad" value={effectiveSummary.totalCalidad || 0} variant="secondary" />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <MetricCard title="Legal" value={effectiveSummary.totalLegal || 0} variant="warning" />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <MetricCard title="Internos" value={effectiveSummary.totalInternos || 0} variant="info" />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <MetricCard title="Externos" value={effectiveSummary.totalExternos || 0} variant="primary" />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <MetricCard title="Rev. manual" value={effectiveSummary.totalRevisionManual || 0} variant="warning" />
      </Grid>
      {dynamicCards.map((item) => (
        <Grid item xs={12} sm={6} md={4} lg={2} key={`cat-${item.title}`}>
          <MetricCard title={item.title} value={item.value} variant="secondary" />
        </Grid>
      ))}
      </Grid>
    </>
  );
}

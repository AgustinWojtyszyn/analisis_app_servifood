import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import CompareArrowsRoundedIcon from '@mui/icons-material/CompareArrowsRounded';
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded';
import TrendingFlatRoundedIcon from '@mui/icons-material/TrendingFlatRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import { compareAnalysisPeriods } from '../services/analysis';

const PRESETS = [
  { id: 'month', label: 'Mes actual vs anterior' },
  { id: '30days', label: 'Últimos 30 días' },
  { id: 'year', label: 'Año actual vs anterior' },
  { id: 'custom', label: 'Personalizado' }
];

const METRIC_CARDS = [
  { key: 'totalDesvios', label: 'Desvíos', lowerIsBetter: true },
  { key: 'conformityRate', label: 'Conformidad', suffix: '%', lowerIsBetter: false },
  { key: 'totalNC', label: 'No conformidades', lowerIsBetter: true },
  { key: 'totalOBS', label: 'Observaciones', lowerIsBetter: true },
  { key: 'actionClosureRate', label: 'Cierre de acciones', suffix: '%', lowerIsBetter: false },
  { key: 'totalRecords', label: 'Registros analizados', lowerIsBetter: null }
];

function pad(value) {
  return String(value).padStart(2, '0');
}

function toInputDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function cloneDate(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, amount) {
  const next = cloneDate(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function buildPreset(id, now = new Date()) {
  const today = cloneDate(now);

  if (id === '30days') {
    return {
      periodAFrom: toInputDate(addDays(today, -29)),
      periodATo: toInputDate(today),
      periodBFrom: toInputDate(addDays(today, -59)),
      periodBTo: toInputDate(addDays(today, -30))
    };
  }

  if (id === 'year') {
    const previousYear = today.getFullYear() - 1;
    const previousMonthLastDay = new Date(previousYear, today.getMonth() + 1, 0).getDate();
    const previousEquivalent = new Date(
      previousYear,
      today.getMonth(),
      Math.min(today.getDate(), previousMonthLastDay)
    );
    return {
      periodAFrom: `${today.getFullYear()}-01-01`,
      periodATo: toInputDate(today),
      periodBFrom: `${previousYear}-01-01`,
      periodBTo: toInputDate(previousEquivalent)
    };
  }

  const currentStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const previousStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const previousMonthLastDay = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
  const previousEnd = new Date(
    previousStart.getFullYear(),
    previousStart.getMonth(),
    Math.min(today.getDate(), previousMonthLastDay)
  );

  return {
    periodAFrom: toInputDate(currentStart),
    periodATo: toInputDate(today),
    periodBFrom: toInputDate(previousStart),
    periodBTo: toInputDate(previousEnd)
  };
}

function formatNumber(value, suffix = '') {
  const numeric = Number(value || 0);
  const rendered = Number.isInteger(numeric)
    ? numeric.toLocaleString('es-AR')
    : numeric.toLocaleString('es-AR', { maximumFractionDigits: 2 });
  return `${rendered}${suffix}`;
}

function formatRange(range) {
  if (!range?.from || !range?.to) return 'Sin período';
  const format = (value) => {
    const [year, month, day] = String(value).split('-');
    return `${day}/${month}/${year}`;
  };
  return `${format(range.from)} → ${format(range.to)}`;
}

function changeLabel(change, suffix = '') {
  if (!change) return 'Sin comparación';
  if (change.absolute === 0) return 'Sin cambios';
  if (change.percentage == null) {
    const sign = change.absolute > 0 ? '+' : '';
    return `${sign}${formatNumber(change.absolute, suffix)}`;
  }
  const sign = change.percentage > 0 ? '+' : '';
  return `${sign}${formatNumber(change.percentage, '%')}`;
}

function resolveChangeTone(change, lowerIsBetter) {
  if (!change || change.absolute === 0 || lowerIsBetter == null) return 'default';
  const improved = lowerIsBetter ? change.absolute < 0 : change.absolute > 0;
  return improved ? 'success' : 'error';
}

function ChangeIcon({ direction }) {
  if (direction === 'up') return <TrendingUpRoundedIcon fontSize="small" />;
  if (direction === 'down') return <TrendingDownRoundedIcon fontSize="small" />;
  return <TrendingFlatRoundedIcon fontSize="small" />;
}

function MetricCard({ config, current, previous, change }) {
  const tone = resolveChangeTone(change, config.lowerIsBetter);

  return (
    <Card variant="outlined" sx={{ height: '100%', borderRadius: 3 }}>
      <CardContent sx={{ p: 2.5 }}>
        <Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 800, mb: 1 }}>
          {config.label}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: { xs: 28, md: 32 }, fontWeight: 900, lineHeight: 1 }}>
            {formatNumber(current, config.suffix)}
          </Typography>
          <Chip
            size="small"
            color={tone}
            variant={tone === 'default' ? 'outlined' : 'filled'}
            icon={<ChangeIcon direction={change?.direction} />}
            label={changeLabel(change, config.suffix)}
            sx={{ fontWeight: 800 }}
          />
        </Box>
        <Typography color="text.secondary" sx={{ mt: 1.25, fontSize: 12.5 }}>
          Período anterior: <strong>{formatNumber(previous, config.suffix)}</strong>
        </Typography>
      </CardContent>
    </Card>
  );
}

function CounterComparison({ title, current = {}, previous = {} }) {
  const rows = useMemo(() => {
    const keys = [...new Set([...Object.keys(current || {}), ...Object.keys(previous || {})])];
    return keys
      .map((key) => ({
        key,
        current: Number(current?.[key] || 0),
        previous: Number(previous?.[key] || 0)
      }))
      .map((item) => ({ ...item, delta: item.current - item.previous }))
      .sort((a, b) => Math.max(b.current, b.previous) - Math.max(a.current, a.previous))
      .slice(0, 10);
  }, [current, previous]);

  const maxValue = Math.max(1, ...rows.flatMap((item) => [item.current, item.previous]));

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3, height: '100%' }}>
      <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>
        {title}
      </Typography>
      {rows.length === 0 ? (
        <Typography color="text.secondary">No hay datos para estos períodos.</Typography>
      ) : (
        <Stack spacing={2}>
          {rows.map((item) => (
            <Box key={item.key}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 0.7 }}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 800 }}>{item.key}</Typography>
                <Typography color="text.secondary" sx={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>
                  {item.current} vs {item.previous}
                  {item.delta !== 0 ? ` · ${item.delta > 0 ? '+' : ''}${item.delta}` : ''}
                </Typography>
              </Box>
              <Box sx={{ display: 'grid', gap: 0.5 }}>
                <Box sx={{ height: 7, borderRadius: 99, bgcolor: 'action.hover', overflow: 'hidden' }}>
                  <Box sx={{ width: `${(item.current / maxValue) * 100}%`, height: '100%', bgcolor: 'primary.main', borderRadius: 99 }} />
                </Box>
                <Box sx={{ height: 5, borderRadius: 99, bgcolor: 'action.hover', overflow: 'hidden' }}>
                  <Box sx={{ width: `${(item.previous / maxValue) * 100}%`, height: '100%', bgcolor: 'text.disabled', borderRadius: 99 }} />
                </Box>
              </Box>
            </Box>
          ))}
        </Stack>
      )}
    </Paper>
  );
}

export default function PeriodComparisonPage() {
  const [preset, setPreset] = useState('month');
  const [filters, setFilters] = useState(() => buildPreset('month'));
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runComparison = useCallback(async (nextFilters) => {
    setLoading(true);
    setError('');
    try {
      const payload = await compareAnalysisPeriods(nextFilters);
      setResult(payload);
    } catch (err) {
      setResult(null);
      setError(err.message || 'No se pudieron comparar los períodos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = buildPreset('month');
    runComparison(initial);
  }, [runComparison]);

  const handlePreset = (id) => {
    setPreset(id);
    if (id === 'custom') return;
    const next = buildPreset(id);
    setFilters(next);
    runComparison(next);
  };

  const metricsA = result?.periodA?.metrics || {};
  const metricsB = result?.periodB?.metrics || {};

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Paper sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              Comparador de períodos
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              Compará indicadores históricos y detectá rápidamente qué mejoró, qué empeoró y dónde cambió la operación.
            </Typography>
          </Box>
          <CompareArrowsRoundedIcon color="primary" sx={{ fontSize: 36 }} />
        </Box>

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 3 }}>
          {PRESETS.map((item) => (
            <Button
              key={item.id}
              size="small"
              variant={preset === item.id ? 'contained' : 'outlined'}
              onClick={() => handlePreset(item.id)}
              sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 99 }}
            >
              {item.label}
            </Button>
          ))}
        </Stack>

        <Box sx={{ mt: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 1.5 }}>Período A · actual</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              <TextField
                type="date"
                size="small"
                label="Desde"
                value={filters.periodAFrom}
                onChange={(e) => { setPreset('custom'); setFilters((prev) => ({ ...prev, periodAFrom: e.target.value })); }}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                type="date"
                size="small"
                label="Hasta"
                value={filters.periodATo}
                onChange={(e) => { setPreset('custom'); setFilters((prev) => ({ ...prev, periodATo: e.target.value })); }}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 1.5 }}>Período B · comparación</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              <TextField
                type="date"
                size="small"
                label="Desde"
                value={filters.periodBFrom}
                onChange={(e) => { setPreset('custom'); setFilters((prev) => ({ ...prev, periodBFrom: e.target.value })); }}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                type="date"
                size="small"
                label="Hasta"
                value={filters.periodBTo}
                onChange={(e) => { setPreset('custom'); setFilters((prev) => ({ ...prev, periodBTo: e.target.value })); }}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          </Paper>
        </Box>

        <Button
          variant="contained"
          onClick={() => runComparison(filters)}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={17} color="inherit" /> : <CompareArrowsRoundedIcon />}
          sx={{ mt: 2.5, textTransform: 'none', fontWeight: 900 }}
        >
          {loading ? 'Comparando...' : 'Comparar períodos'}
        </Button>
      </Paper>

      {error && <Alert severity="error">{error}</Alert>}

      {result && (
        <>
          <Paper variant="outlined" sx={{ px: { xs: 2, md: 2.5 }, py: 2, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
              <Box>
                <Typography color="primary" sx={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>Período A</Typography>
                <Typography sx={{ fontWeight: 800 }}>{formatRange(result.periodA?.range)}</Typography>
                <Typography color="text.secondary" sx={{ fontSize: 12.5 }}>{metricsA.totalAnalyses || 0} análisis</Typography>
              </Box>
              <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                <Typography color="text.secondary" sx={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>Período B</Typography>
                <Typography sx={{ fontWeight: 800 }}>{formatRange(result.periodB?.range)}</Typography>
                <Typography color="text.secondary" sx={{ fontSize: 12.5 }}>{metricsB.totalAnalyses || 0} análisis</Typography>
              </Box>
            </Box>
          </Paper>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }, gap: 2 }}>
            {METRIC_CARDS.map((config) => (
              <MetricCard
                key={config.key}
                config={config}
                current={metricsA[config.key]}
                previous={metricsB[config.key]}
                change={result.changes?.[config.key]}
              />
            ))}
          </Box>

          <Paper sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>Lectura rápida</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
              Señales principales detectadas al comparar ambos períodos.
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5 }}>
              {(result.insights || []).map((insight) => (
                <Alert
                  key={insight.key}
                  severity={insight.tone === 'positive' ? 'success' : insight.tone === 'negative' ? 'warning' : 'info'}
                  sx={{ alignItems: 'center' }}
                >
                  {insight.text}
                </Alert>
              ))}
            </Box>
          </Paper>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2.5 }}>
            <CounterComparison
              title="Categorías con mayor movimiento"
              current={metricsA.byCategoria}
              previous={metricsB.byCategoria}
            />
            <CounterComparison
              title="Áreas con mayor movimiento"
              current={metricsA.byArea}
              previous={metricsB.byArea}
            />
          </Box>
        </>
      )}
    </Box>
  );
}

export { buildPreset };

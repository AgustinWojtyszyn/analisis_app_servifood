import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Tooltip as MuiTooltip,
  Typography
} from '@mui/material';
import {
  ArrowForwardRounded,
  AssignmentLateRounded,
  InsightsRounded,
  RefreshRounded,
  RemoveRounded,
  TrendingDownRounded,
  TrendingUpRounded,
  VerifiedRounded,
  WarningAmberRounded
} from '@mui/icons-material';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getExecutiveDashboard } from '../services/analysis';
import { getCertifications } from '../services/certificationService';

const colors = {
  navy: '#102b52',
  blue: '#1d58a5',
  blueSoft: '#edf4ff',
  ink: '#13233a',
  muted: '#6f7f93',
  line: '#dfe7f1',
  canvas: '#f3f6fa',
  white: '#ffffff',
  red: '#c33d36',
  redSoft: '#fff1ef',
  amber: '#a96b18',
  amberSoft: '#fff7e7',
  teal: '#0a817a',
  tealSoft: '#eaf8f6'
};

const formatNumber = (value) => value == null
  ? '—'
  : Number(value).toLocaleString('es-AR', { maximumFractionDigits: 1 });

function HeroMetric({ label, value, helper, tone = 'default', onClick, loading, icon }) {
  const toneColor = tone === 'danger' ? '#ffb3ad' : tone === 'warning' ? '#ffd38d' : '#c9d9ef';

  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        width: '100%',
        minWidth: 0,
        textAlign: 'left',
        justifyContent: 'flex-start',
        borderRadius: 2,
        px: { xs: 0, sm: 1 },
        py: { xs: 1.25, sm: 1 },
        color: 'inherit',
        '&.Mui-focusVisible': { outline: '2px solid #fff', outlineOffset: 3 }
      }}
    >
      <Box sx={{ width: '100%', minWidth: 0 }}>
        <Stack direction="row" alignItems="center" gap={0.8} sx={{ mb: 0.8, color: '#bdcde1' }}>
          {icon}
          <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.15 }}>{label}</Typography>
        </Stack>
        {loading ? (
          <Skeleton variant="text" width="46%" height={56} sx={{ bgcolor: 'rgba(255,255,255,0.12)' }} />
        ) : (
          <Typography sx={{ fontSize: { xs: 38, sm: 44, lg: 50 }, lineHeight: 1, fontWeight: 760, letterSpacing: -1.8 }}>
            {formatNumber(value)}
          </Typography>
        )}
        {loading ? (
          <Skeleton variant="text" width="72%" sx={{ bgcolor: 'rgba(255,255,255,0.10)' }} />
        ) : (
          <Typography sx={{ mt: 1, color: toneColor, fontSize: 11.5, lineHeight: 1.45, minHeight: 32 }}>
            {helper}
          </Typography>
        )}
      </Box>
    </ButtonBase>
  );
}

function PanelHeader({ eyebrow, title, action, onAction }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="flex-end" gap={2} sx={{ mb: 2.25 }}>
      <Box sx={{ minWidth: 0 }}>
        {eyebrow && (
          <Typography sx={{ color: colors.blue, fontSize: 10.5, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', mb: 0.45 }}>
            {eyebrow}
          </Typography>
        )}
        <Typography component="h2" sx={{ color: colors.ink, fontSize: { xs: 18, md: 20 }, fontWeight: 780, letterSpacing: -0.45 }}>
          {title}
        </Typography>
      </Box>
      {action && (
        <Button
          size="small"
          onClick={onAction}
          endIcon={<ArrowForwardRounded sx={{ fontSize: '15px !important' }} />}
          sx={{ minWidth: 0, px: 0, color: colors.blue, fontSize: 11.5, fontWeight: 750, whiteSpace: 'nowrap' }}
        >
          {action}
        </Button>
      )}
    </Stack>
  );
}

function TrendTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const month = payload[0].payload;

  return (
    <Box sx={{ bgcolor: colors.navy, color: '#fff', px: 1.6, py: 1.25, borderRadius: 2, boxShadow: '0 12px 28px rgba(16,43,82,0.18)' }}>
      <Typography sx={{ fontSize: 10.5, color: '#cbd8e8', textTransform: 'capitalize' }}>{month.label}</Typography>
      <Typography sx={{ fontSize: 15, fontWeight: 800, mt: 0.25 }}>{formatNumber(month.total)} desvíos</Typography>
      {month.partial && <Typography sx={{ fontSize: 10, color: '#9fb4cf', mt: 0.3 }}>Mes en curso</Typography>}
    </Box>
  );
}

function EmptyState({ children, action, onAction }) {
  return (
    <Box sx={{ minHeight: 124, display: 'grid', placeItems: 'center', textAlign: 'center', px: 2 }}>
      <Box>
        <Typography sx={{ color: colors.muted, fontSize: 12.5, lineHeight: 1.55 }}>{children}</Typography>
        {action && (
          <Button size="small" onClick={onAction} sx={{ mt: 1.2, color: colors.blue, fontWeight: 750, fontSize: 11.5 }}>
            {action}
          </Button>
        )}
      </Box>
    </Box>
  );
}

export default function DashboardHome({ user, onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [expiredItems, setExpiredItems] = useState(null);
  const [expiredLoading, setExpiredLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setExpiredItems(null);
    setExpiredLoading(false);

    getExecutiveDashboard({ signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        setData(result);

        if (result.certifications?.expired > 0) {
          setExpiredLoading(true);
          getCertifications()
            .then((payload) => {
              if (controller.signal.aborted) return;
              setExpiredItems((payload.items || [])
                .filter((item) => item.daysUntilExpiration < 0)
                .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration));
            })
            .catch(() => {
              if (!controller.signal.aborted) setExpiredItems(null);
            })
            .finally(() => {
              if (!controller.signal.aborted) setExpiredLoading(false);
            });
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setData(null);
          setError(err.message || 'No se pudo cargar el dashboard.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [revision, user?.id]);

  const go = (section) => onNavigate?.(section);
  const deviations = data?.deviations;
  const nc = data?.nonconformities;
  const cert = data?.certifications;
  const change = deviations?.change;
  const hasTrend = Boolean(deviations?.months?.some((month) => month.total !== null));
  const previousLabel = deviations?.previous?.label || 'mes anterior';

  const changeText = !change
    ? 'Comparación pendiente'
    : change.percentage == null
      ? `${previousLabel}: 0`
      : `${change.percentage > 0 ? '+' : ''}${formatNumber(change.percentage)}% vs ${previousLabel}`;

  const ChangeIcon = change?.direction === 'up' ? TrendingUpRounded : change?.direction === 'down' ? TrendingDownRounded : RemoveRounded;
  const topSector = deviations?.topSectors?.[0] || null;

  const priorityAlerts = useMemo(() => {
    const source = data?.alerts || [];
    const priority = source.filter((item) => item.severity === 'error' || item.severity === 'warning');
    return (priority.length ? priority : source).slice(0, 3);
  }, [data?.alerts]);

  const certificationItems = useMemo(
    () => [...(expiredItems || []), ...(cert?.urgent || [])].slice(0, 4),
    [expiredItems, cert?.urgent]
  );

  const status = cert?.expired || nc?.overdue
    ? { label: 'Requiere atención', tone: 'danger', description: 'Hay vencimientos o pendientes que conviene revisar hoy.' }
    : priorityAlerts.length
      ? { label: 'Seguimiento', tone: 'warning', description: 'Hay señales operativas para seguir de cerca.' }
      : { label: 'Sin alertas críticas', tone: 'ok', description: 'No aparecen señales críticas con la información disponible.' };

  const statusStyles = status.tone === 'danger'
    ? { bgcolor: colors.redSoft, color: colors.red, borderColor: '#f0c3bf' }
    : status.tone === 'warning'
      ? { bgcolor: colors.amberSoft, color: colors.amber, borderColor: '#efd7aa' }
      : { bgcolor: colors.tealSoft, color: colors.teal, borderColor: '#bde7e2' };

  const sources = deviations?.sources?.map((source) => `${source.year}: ${source.filename}`).join(' · ');
  const refreshed = data
    ? new Date(data.generatedAt).toLocaleString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
    : '';

  return (
    <Box
      aria-busy={loading}
      sx={{
        minHeight: '100%',
        bgcolor: colors.canvas,
        color: colors.ink,
        px: { xs: 1.5, sm: 2.5, xl: 4 },
        py: { xs: 2, md: 3 }
      }}
    >
      <Box sx={{ maxWidth: 1460, mx: 'auto' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2} sx={{ mb: 2.5 }}>
          <Box>
            <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 0.6 }}>
              <Typography sx={{ color: colors.blue, fontSize: 10.5, fontWeight: 850, letterSpacing: 1.35, textTransform: 'uppercase' }}>
                ServiFood · Dirección
              </Typography>
              <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#a9b8ca' }} />
              <Typography sx={{ color: colors.muted, fontSize: 11.5, textTransform: 'capitalize' }}>
                {deviations?.current?.label || 'Mes actual'}
              </Typography>
            </Stack>
            <Typography component="h1" sx={{ fontSize: { xs: 27, md: 32 }, fontWeight: 820, letterSpacing: -1.15, lineHeight: 1.1 }}>
              Dashboard ejecutivo
            </Typography>
          </Box>

          <Stack direction="row" alignItems="center" gap={1.25}>
            <Chip
              label={status.label}
              size="small"
              variant="outlined"
              sx={{
                ...statusStyles,
                height: 28,
                fontSize: 11,
                fontWeight: 800,
                borderRadius: 1.5
              }}
            />
            <MuiTooltip title={loading ? 'Actualizando' : refreshed ? `Última consulta ${refreshed}` : 'Actualizar'}>
              <span>
                <IconButton
                  aria-label="Actualizar dashboard"
                  disabled={loading}
                  onClick={() => setRevision((value) => value + 1)}
                  sx={{ width: 36, height: 36, bgcolor: colors.white, border: `1px solid ${colors.line}`, color: colors.blue }}
                >
                  <RefreshRounded sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </MuiTooltip>
          </Stack>
        </Stack>

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2.5, borderRadius: 2.5 }}
            action={<Button color="inherit" onClick={() => setRevision((value) => value + 1)}>Reintentar</Button>}
          >
            {error}
          </Alert>
        )}

        <Paper
          elevation={0}
          sx={{
            position: 'relative',
            overflow: 'hidden',
            bgcolor: colors.navy,
            color: '#fff',
            borderRadius: { xs: 3, md: 4 },
            p: { xs: 2.4, sm: 3, lg: 3.5 },
            mb: 2.5,
            boxShadow: '0 20px 44px rgba(16,43,82,0.12)',
            '&::after': {
              content: '""',
              position: 'absolute',
              width: 320,
              height: 320,
              borderRadius: '50%',
              right: -130,
              top: -210,
              background: 'radial-gradient(circle, rgba(56,117,197,0.42) 0%, rgba(56,117,197,0) 72%)',
              pointerEvents: 'none'
            }
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={{ xs: 2, md: 4 }} sx={{ mb: { xs: 2, md: 2.5 } }}>
              <Box sx={{ maxWidth: 610 }}>
                <Typography sx={{ color: '#9fb7d5', fontSize: 10.5, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', mb: 0.7 }}>
                  Panorama operativo
                </Typography>
                <Typography sx={{ fontSize: { xs: 20, md: 24 }, fontWeight: 780, letterSpacing: -0.6, lineHeight: 1.2 }}>
                  {status.description}
                </Typography>
              </Box>
              {!loading && refreshed && (
                <Typography sx={{ color: '#89a3c2', fontSize: 10.5, alignSelf: { md: 'flex-end' } }}>
                  Actualizado {refreshed}
                </Typography>
              )}
            </Stack>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
                gap: { xs: 0.75, sm: 1.5 },
                '& > *:not(:first-of-type)': {
                  borderLeft: { xs: 'none', sm: '1px solid rgba(255,255,255,0.13)' },
                  pl: { xs: 0, sm: 2.5, lg: 3.5 }
                }
              }}
            >
              <HeroMetric
                label="Desvíos del mes"
                value={deviations?.current?.total}
                helper={deviations ? <Stack component="span" direction="row" alignItems="center" gap={0.5}><ChangeIcon sx={{ fontSize: 14 }} />{changeText}</Stack> : 'No disponible'}
                tone={change?.direction === 'up' ? 'warning' : 'default'}
                onClick={() => go('annualAnalysis')}
                loading={loading}
                icon={<InsightsRounded sx={{ fontSize: 16 }} />}
              />
              <HeroMetric
                label="No conformidades abiertas"
                value={nc?.total ? nc.open : null}
                helper={!nc ? 'No disponible' : nc.overdue ? `${formatNumber(nc.overdue)} declaradas vencidas` : nc.total ? 'Pendientes de cierre' : 'Sin registros'}
                tone={nc?.overdue ? 'danger' : 'default'}
                onClick={() => go('customerNonconformities')}
                loading={loading}
                icon={<AssignmentLateRounded sx={{ fontSize: 16 }} />}
              />
              <HeroMetric
                label="Certificaciones en atención"
                value={cert ? cert.count + cert.expired : null}
                helper={!cert ? 'No disponible' : cert.expired ? `${formatNumber(cert.expired)} vencidas` : 'Próximos 30 días'}
                tone={cert?.expired ? 'danger' : cert?.count ? 'warning' : 'default'}
                onClick={() => go('certifications')}
                loading={loading}
                icon={<VerifiedRounded sx={{ fontSize: 16 }} />}
              />
            </Box>

            {!loading && topSector && (
              <ButtonBase
                onClick={() => go('annualAnalysis')}
                sx={{
                  width: '100%',
                  mt: 2,
                  px: 1.5,
                  py: 1.1,
                  borderRadius: 2,
                  justifyContent: 'space-between',
                  gap: 2,
                  bgcolor: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: '#fff',
                  textAlign: 'left',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.10)' }
                }}
              >
                <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'baseline' }} gap={{ xs: 0.25, sm: 1.2 }}>
                  <Typography sx={{ color: '#9fb7d5', fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>Foco del mes</Typography>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 750 }}>{topSector.name}</Typography>
                  <Typography sx={{ color: '#b9cbe0', fontSize: 11.5 }}>{formatNumber(topSector.value)} desvíos · {formatNumber(topSector.share)}% del mes</Typography>
                </Stack>
                <ArrowForwardRounded sx={{ fontSize: 17, color: '#a9bfd9', flexShrink: 0 }} />
              </ButtonBase>
            )}
          </Box>
        </Paper>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.8fr) minmax(300px, 0.72fr)' },
            gap: 2.5,
            mb: 2.5
          }}
        >
          <Paper elevation={0} sx={{ border: `1px solid ${colors.line}`, borderRadius: 3, p: { xs: 2.2, sm: 2.8 }, minWidth: 0 }}>
            <PanelHeader eyebrow="Evolución" title="Tendencia de desvíos" action="Análisis anual" onAction={() => go('annualAnalysis')} />
            {loading ? (
              <Skeleton variant="rounded" height={330} />
            ) : hasTrend ? (
              <>
                <Box
                  sx={{ height: { xs: 265, sm: 330 }, minWidth: 0 }}
                  role="img"
                  aria-label={`Evolución mensual: ${deviations.months.map((month) => `${month.label}: ${month.total == null ? 'sin cobertura' : `${month.total} desvíos`}`).join('; ')}`}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={deviations.months} margin={{ top: 8, right: 8, left: -22, bottom: 0 }} accessibilityLayer>
                      <defs>
                        <linearGradient id="executiveTrendFillV2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={colors.blue} stopOpacity={0.2} />
                          <stop offset="100%" stopColor={colors.blue} stopOpacity={0.015} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="#e9eef5" strokeDasharray="2 6" />
                      <XAxis dataKey="shortLabel" axisLine={false} tickLine={false} tick={{ fill: colors.muted, fontSize: 11 }} dy={8} />
                      <YAxis allowDecimals={false} tickCount={4} axisLine={false} tickLine={false} tick={{ fill: colors.muted, fontSize: 10 }} />
                      <Tooltip content={<TrendTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke={colors.blue}
                        strokeWidth={3}
                        fill="url(#executiveTrendFillV2)"
                        connectNulls={false}
                        dot={{ r: 3.5, fill: colors.white, stroke: colors.blue, strokeWidth: 2 }}
                        activeDot={{ r: 5.5, fill: colors.white, stroke: colors.blue, strokeWidth: 3 }}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={0.75} sx={{ mt: 1.25 }}>
                  <Typography sx={{ color: colors.muted, fontSize: 10.5 }}>Mes actual en curso · los meses sin cobertura no se cuentan como cero.</Typography>
                  {sources && <Typography sx={{ color: '#9aa7b8', fontSize: 10, maxWidth: 420, textAlign: { sm: 'right' } }}>Fuente: {sources}</Typography>}
                </Stack>
              </>
            ) : (
              <EmptyState action="Abrir análisis anual" onAction={() => go('annualAnalysis')}>
                La tendencia aparecerá cuando exista cobertura en la carga anual.
              </EmptyState>
            )}
          </Paper>

          <Paper elevation={0} sx={{ border: `1px solid ${colors.line}`, borderRadius: 3, p: { xs: 2.2, sm: 2.8 } }}>
            <PanelHeader eyebrow="Hoy" title="Requiere atención" />
            {loading ? (
              <Stack spacing={1.5}>{[1, 2, 3].map((key) => <Skeleton key={key} variant="rounded" height={78} />)}</Stack>
            ) : priorityAlerts.length ? (
              <Stack spacing={1.25}>
                {priorityAlerts.map((item) => {
                  const danger = item.severity === 'error';
                  return (
                    <ButtonBase
                      key={item.id}
                      onClick={() => go(item.target)}
                      sx={{
                        width: '100%',
                        textAlign: 'left',
                        justifyContent: 'stretch',
                        borderRadius: 2,
                        bgcolor: danger ? colors.redSoft : colors.amberSoft,
                        border: `1px solid ${danger ? '#f2c9c5' : '#f0dfbc'}`,
                        p: 1.5,
                        '&.Mui-focusVisible': { outline: `2px solid ${colors.blue}`, outlineOffset: 2 }
                      }}
                    >
                      <Box sx={{ width: '100%' }}>
                        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
                          <Stack direction="row" alignItems="center" gap={0.8}>
                            <WarningAmberRounded sx={{ fontSize: 16, color: danger ? colors.red : colors.amber, mt: 0.1 }} />
                            <Typography sx={{ color: colors.ink, fontSize: 12.5, fontWeight: 800, lineHeight: 1.35 }}>{item.title}</Typography>
                          </Stack>
                          <ArrowForwardRounded sx={{ fontSize: 16, color: danger ? colors.red : colors.amber, flexShrink: 0 }} />
                        </Stack>
                        <Typography sx={{ color: colors.muted, fontSize: 11, lineHeight: 1.45, mt: 0.75 }}>{item.detail}</Typography>
                      </Box>
                    </ButtonBase>
                  );
                })}
              </Stack>
            ) : (
              <EmptyState>No hay alertas prioritarias con la información disponible.</EmptyState>
            )}
          </Paper>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 0.9fr) minmax(0, 1.1fr)' }, gap: 2.5 }}>
          <Paper elevation={0} sx={{ border: `1px solid ${colors.line}`, borderRadius: 3, p: { xs: 2.2, sm: 2.8 }, minWidth: 0 }}>
            <PanelHeader eyebrow="Dónde actuar" title="Sectores principales" action="Ver análisis" onAction={() => go('annualAnalysis')} />
            {loading ? (
              <Stack spacing={1.7}>{[1, 2, 3].map((key) => <Skeleton key={key} variant="rounded" height={48} />)}</Stack>
            ) : deviations?.topSectors?.length ? (
              <Stack spacing={2}>
                {deviations.topSectors.map((sector, index) => (
                  <Box key={sector.key}>
                    <Stack direction="row" alignItems="baseline" justifyContent="space-between" gap={1} sx={{ mb: 0.7 }}>
                      <Typography sx={{ color: colors.ink, fontSize: 12.5, fontWeight: index === 0 ? 800 : 650, overflowWrap: 'anywhere' }}>
                        {index + 1}. {sector.name}
                      </Typography>
                      <Typography sx={{ color: colors.muted, fontSize: 11.5, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {formatNumber(sector.value)} · {formatNumber(sector.share)}%
                      </Typography>
                    </Stack>
                    <Box sx={{ height: 7, bgcolor: '#edf1f6', borderRadius: 99, overflow: 'hidden' }}>
                      <Box
                        sx={{
                          width: `${Math.max(4, Math.min(100, sector.share || 0))}%`,
                          height: '100%',
                          borderRadius: 99,
                          bgcolor: index === 0 ? colors.blue : '#91aac9'
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </Stack>
            ) : (
              <EmptyState>Sin registros sectorizados del mes.</EmptyState>
            )}
          </Paper>

          <Paper elevation={0} sx={{ border: `1px solid ${colors.line}`, borderRadius: 3, p: { xs: 2.2, sm: 2.8 }, minWidth: 0 }}>
            <PanelHeader eyebrow="Cumplimiento" title="Próximos vencimientos" action="Ver todos" onAction={() => go('certifications')} />
            {loading || expiredLoading ? (
              <Stack spacing={1.2}>{[1, 2, 3].map((key) => <Skeleton key={key} variant="rounded" height={54} />)}</Stack>
            ) : certificationItems.length ? (
              <Stack divider={<Box sx={{ height: '1px', bgcolor: '#edf1f6' }} />}>
                {certificationItems.map((item) => {
                  const days = item.daysUntilExpiration;
                  const expired = days < 0;
                  const urgent = !expired && days <= 7;
                  return (
                    <ButtonBase
                      key={item.id}
                      onClick={() => go('certifications')}
                      sx={{ width: '100%', textAlign: 'left', justifyContent: 'space-between', gap: 2, py: 1.3, '&.Mui-focusVisible': { outline: `2px solid ${colors.blue}` } }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ color: colors.ink, fontSize: 12.5, fontWeight: 700, overflowWrap: 'anywhere' }}>{item.name}</Typography>
                        <Typography sx={{ color: colors.muted, fontSize: 10.5, mt: 0.35 }}>
                          {item.expirationDate?.split('-').reverse().join('/')}{item.responsibleArea ? ` · ${item.responsibleArea}` : ''}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={expired ? 'Vencida' : days === 0 ? 'Hoy' : `${days} días`}
                        sx={{
                          flexShrink: 0,
                          height: 24,
                          fontSize: 10.5,
                          fontWeight: 800,
                          bgcolor: expired ? colors.redSoft : urgent ? colors.amberSoft : colors.blueSoft,
                          color: expired ? colors.red : urgent ? colors.amber : colors.blue
                        }}
                      />
                    </ButtonBase>
                  );
                })}
              </Stack>
            ) : (
              <EmptyState>{!cert ? 'Agenda no disponible.' : cert.expired ? 'Detalle de vencidas no disponible.' : 'Sin vencimientos próximos.'}</EmptyState>
            )}
            {cert?.expired > 0 && !expiredItems?.length && !expiredLoading && (
              <Button onClick={() => go('certifications')} size="small" sx={{ color: colors.blue, px: 0, mt: 1, fontWeight: 750, fontSize: 11.5 }}>
                Consultar certificaciones vencidas
              </Button>
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}

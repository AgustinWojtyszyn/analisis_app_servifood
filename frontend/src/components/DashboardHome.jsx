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
  TaskAltRounded,
  TrendingDownRounded,
  TrendingUpRounded,
  VerifiedRounded,
  WarningAmberRounded
} from '@mui/icons-material';
import { getExecutiveDashboard } from '../services/analysis';
import { getCertifications } from '../services/certificationService';

const C = {
  navy: '#0e2a4d',
  navy2: '#143a67',
  blue: '#1f5ca8',
  ink: '#15243a',
  muted: '#708096',
  faint: '#96a3b5',
  line: '#dfe6ee',
  canvas: '#f4f6f8',
  white: '#ffffff',
  red: '#c73f37',
  redSoft: '#fff1ef',
  amber: '#a86a17',
  amberSoft: '#fff6e5',
  teal: '#0b7b73',
  tealSoft: '#ebf7f5'
};

const n = (value) => value == null
  ? '—'
  : Number(value).toLocaleString('es-AR', { maximumFractionDigits: 1 });

function SmallAction({ children, onClick }) {
  return (
    <Button
      size="small"
      onClick={onClick}
      endIcon={<ArrowForwardRounded sx={{ fontSize: '14px !important' }} />}
      sx={{
        p: 0,
        minWidth: 0,
        color: C.blue,
        fontSize: 11.5,
        fontWeight: 800,
        textTransform: 'none',
        '&:hover': { bgcolor: 'transparent', color: C.navy }
      }}
    >
      {children}
    </Button>
  );
}

function MetricLine({ icon, label, value, helper, tone = 'default', onClick, loading }) {
  const toneColor = tone === 'danger' ? C.red : tone === 'warning' ? C.amber : C.muted;
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        width: '100%',
        justifyContent: 'flex-start',
        textAlign: 'left',
        borderRadius: 2,
        px: 1.2,
        py: 1.1,
        '&.Mui-focusVisible': { outline: `2px solid ${C.blue}`, outlineOffset: 2 }
      }}
    >
      <Stack direction="row" alignItems="center" gap={1.2} sx={{ width: '100%', minWidth: 0 }}>
        <Box sx={{ width: 34, height: 34, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 1.5, bgcolor: '#eef3f8', color: C.blue }}>
          {icon}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ color: C.muted, fontSize: 10.5, fontWeight: 700, mb: 0.2 }}>{label}</Typography>
          {loading ? <Skeleton width={80} /> : (
            <Stack direction="row" alignItems="baseline" gap={1} flexWrap="wrap">
              <Typography sx={{ color: C.ink, fontSize: 26, fontWeight: 820, lineHeight: 1, letterSpacing: -0.7 }}>{n(value)}</Typography>
              <Typography component="div" sx={{ color: toneColor, fontSize: 10.8, lineHeight: 1.35 }}>{helper}</Typography>
            </Stack>
          )}
        </Box>
        <ArrowForwardRounded sx={{ fontSize: 17, color: '#a4b0bf', flexShrink: 0 }} />
      </Stack>
    </ButtonBase>
  );
}

function SectionTitle({ kicker, title, action, onAction }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="flex-end" gap={2} sx={{ mb: 2 }}>
      <Box>
        {kicker && <Typography sx={{ color: C.faint, fontSize: 9.5, fontWeight: 850, textTransform: 'uppercase', letterSpacing: 1.25, mb: 0.45 }}>{kicker}</Typography>}
        <Typography component="h2" sx={{ color: C.ink, fontSize: { xs: 18, md: 20 }, fontWeight: 820, letterSpacing: -0.4 }}>{title}</Typography>
      </Box>
      {action && <SmallAction onClick={onAction}>{action}</SmallAction>}
    </Stack>
  );
}

function EmptyMessage({ children, action, onAction }) {
  return (
    <Box sx={{ minHeight: 104, display: 'grid', placeItems: 'center', textAlign: 'center', px: 2 }}>
      <Box>
        <Typography sx={{ color: C.muted, fontSize: 12, lineHeight: 1.55 }}>{children}</Typography>
        {action && <Button size="small" onClick={onAction} sx={{ mt: 1, color: C.blue, fontSize: 11.5, fontWeight: 800 }}>{action}</Button>}
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
  const previousLabel = deviations?.previous?.label || 'mes anterior';
  const topSector = deviations?.topSectors?.[0] || null;

  const changeText = !change
    ? 'Comparación pendiente'
    : change.percentage == null
      ? `${previousLabel}: 0`
      : `${change.percentage > 0 ? '+' : ''}${n(change.percentage)}% vs ${previousLabel}`;

  const ChangeIcon = change?.direction === 'up'
    ? TrendingUpRounded
    : change?.direction === 'down'
      ? TrendingDownRounded
      : RemoveRounded;

  const alerts = useMemo(() => {
    const source = data?.alerts || [];
    const important = source.filter((item) => item.severity === 'error' || item.severity === 'warning');
    return (important.length ? important : source).slice(0, 3);
  }, [data?.alerts]);

  const certifications = useMemo(
    () => [...(expiredItems || []), ...(cert?.urgent || [])].slice(0, 4),
    [expiredItems, cert?.urgent]
  );

  const hasUrgent = Boolean(cert?.expired || nc?.overdue);
  const status = loading
    ? { label: 'Actualizando', detail: 'Estamos reuniendo los últimos registros.' }
    : error
      ? { label: 'Datos no disponibles', detail: 'No pudimos actualizar el panorama.' }
      : hasUrgent
        ? { label: 'Atención requerida', detail: 'Hay asuntos vencidos o pendientes para revisar.' }
        : alerts.length
          ? { label: 'Seguimiento activo', detail: 'Hay señales operativas que conviene seguir.' }
          : { label: 'Sin alertas críticas', detail: 'No aparecen señales críticas con la información disponible.' };

  const statusChip = loading
    ? { bgcolor: '#eaf1f8', color: C.blue }
    : hasUrgent
      ? { bgcolor: C.redSoft, color: C.red }
      : alerts.length
        ? { bgcolor: C.amberSoft, color: C.amber }
        : { bgcolor: C.tealSoft, color: C.teal };

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
    <Box aria-busy={loading} sx={{ minHeight: '100%', bgcolor: C.canvas, color: C.ink, px: { xs: 1.5, sm: 2.5, xl: 4 }, py: { xs: 2, md: 3 } }}>
      <Box sx={{ maxWidth: 1380, mx: 'auto' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2} sx={{ mb: 2.4 }}>
          <Box>
            <Typography sx={{ color: C.blue, fontSize: 10, fontWeight: 900, letterSpacing: 1.45, textTransform: 'uppercase', mb: 0.55 }}>
              ServiFood · Dirección
            </Typography>
            <Stack direction="row" alignItems="baseline" gap={1.3} flexWrap="wrap">
              <Typography component="h1" sx={{ fontSize: { xs: 27, md: 32 }, fontWeight: 850, letterSpacing: -1.1, lineHeight: 1.05 }}>
                Resumen ejecutivo
              </Typography>
              <Typography sx={{ color: C.muted, fontSize: 11.5, textTransform: 'capitalize' }}>
                {deviations?.current?.label || 'Mes actual'}
              </Typography>
            </Stack>
          </Box>

          <Stack direction="row" alignItems="center" gap={1}>
            <Chip label={status.label} size="small" sx={{ ...statusChip, height: 28, fontSize: 10.8, fontWeight: 850, borderRadius: 1.5 }} />
            <MuiTooltip title={loading ? 'Actualizando' : refreshed ? `Última consulta ${refreshed}` : 'Actualizar'}>
              <span>
                <IconButton
                  aria-label="Actualizar dashboard"
                  disabled={loading}
                  onClick={() => setRevision((value) => value + 1)}
                  sx={{ width: 36, height: 36, bgcolor: C.white, border: `1px solid ${C.line}`, color: C.blue }}
                >
                  <RefreshRounded sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </MuiTooltip>
          </Stack>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2.2, borderRadius: 2.2 }} action={<Button color="inherit" onClick={() => setRevision((value) => value + 1)}>Reintentar</Button>}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.35fr) minmax(340px, 0.65fr)' }, gap: 2.2, mb: 2.2 }}>
          <Paper
            elevation={0}
            sx={{
              position: 'relative',
              overflow: 'hidden',
              minHeight: 300,
              borderRadius: 3.5,
              bgcolor: C.navy,
              color: '#fff',
              p: { xs: 2.5, md: 3.4 },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 18px 38px rgba(14,42,77,0.14)',
              '&::after': {
                content: '""',
                position: 'absolute',
                width: 360,
                height: 360,
                right: -150,
                bottom: -230,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(57,112,177,0.55), rgba(57,112,177,0) 70%)'
              }
            }}
          >
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Typography sx={{ color: '#9fb6d1', fontSize: 10, fontWeight: 900, letterSpacing: 1.25, textTransform: 'uppercase' }}>
                Brief del día
              </Typography>
              <Typography sx={{ mt: 1.2, maxWidth: 650, fontSize: { xs: 23, md: 30 }, fontWeight: 780, letterSpacing: -0.9, lineHeight: 1.18 }}>
                {status.detail}
              </Typography>

              {!loading && topSector && (
                <ButtonBase
                  onClick={() => go('annualAnalysis')}
                  sx={{
                    mt: 2.2,
                    display: 'inline-flex',
                    px: 1.4,
                    py: 0.9,
                    borderRadius: 1.6,
                    bgcolor: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.11)',
                    color: '#fff',
                    textAlign: 'left',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' }
                  }}
                >
                  <Stack direction="row" alignItems="center" gap={1}>
                    <Typography sx={{ color: '#9fb6d1', fontSize: 9.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.8 }}>Foco</Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 800 }}>{topSector.name}</Typography>
                    <Typography sx={{ color: '#bdd0e5', fontSize: 11 }}>{n(topSector.value)} desvíos · {n(topSector.share)}%</Typography>
                    <ArrowForwardRounded sx={{ fontSize: 16, color: '#9fb6d1' }} />
                  </Stack>
                </ButtonBase>
              )}
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} gap={{ xs: 1, sm: 3 }} sx={{ position: 'relative', zIndex: 1, mt: 4 }}>
              <Box sx={{ minWidth: 125 }}>
                <Typography sx={{ color: '#8ea7c3', fontSize: 9.5, fontWeight: 800 }}>DESVÍOS DEL MES</Typography>
                {loading ? <Skeleton width={70} sx={{ bgcolor: 'rgba(255,255,255,0.12)' }} /> : (
                  <Stack direction="row" alignItems="baseline" gap={0.8}>
                    <Typography sx={{ fontSize: 35, fontWeight: 820, letterSpacing: -1 }}>{n(deviations?.current?.total)}</Typography>
                    <Stack component="span" direction="row" alignItems="center" gap={0.25} sx={{ color: change?.direction === 'up' ? '#ffd08b' : '#bdd0e5', fontSize: 10.5 }}>
                      <ChangeIcon sx={{ fontSize: 13 }} />
                      {changeText}
                    </Stack>
                  </Stack>
                )}
              </Box>
              <Box sx={{ minWidth: 125 }}>
                <Typography sx={{ color: '#8ea7c3', fontSize: 9.5, fontWeight: 800 }}>NC ABIERTAS</Typography>
                {loading ? <Skeleton width={70} sx={{ bgcolor: 'rgba(255,255,255,0.12)' }} /> : (
                  <Typography sx={{ fontSize: 35, fontWeight: 820, letterSpacing: -1 }}>{n(nc?.total ? nc.open : null)}</Typography>
                )}
              </Box>
              <Box sx={{ minWidth: 150 }}>
                <Typography sx={{ color: '#8ea7c3', fontSize: 9.5, fontWeight: 800 }}>CERTIFICACIONES</Typography>
                {loading ? <Skeleton width={70} sx={{ bgcolor: 'rgba(255,255,255,0.12)' }} /> : (
                  <Stack direction="row" alignItems="baseline" gap={0.8}>
                    <Typography sx={{ fontSize: 35, fontWeight: 820, letterSpacing: -1 }}>{n(cert ? cert.count + cert.expired : null)}</Typography>
                    <Typography sx={{ color: cert?.expired ? '#ffaaa3' : '#bdd0e5', fontSize: 10.5 }}>
                      {cert?.expired ? `${n(cert.expired)} vencidas` : 'en seguimiento'}
                    </Typography>
                  </Stack>
                )}
              </Box>
            </Stack>
          </Paper>

          <Paper elevation={0} sx={{ borderRadius: 3.5, border: `1px solid ${C.line}`, bgcolor: '#fff', p: { xs: 2.2, md: 2.6 } }}>
            <SectionTitle kicker="Prioridad" title="Qué atender hoy" />
            {loading ? (
              <Stack spacing={1.2}>{[1, 2, 3].map((id) => <Skeleton key={id} variant="rounded" height={67} />)}</Stack>
            ) : alerts.length ? (
              <Stack spacing={0.8}>
                {alerts.map((item, index) => {
                  const danger = item.severity === 'error';
                  return (
                    <ButtonBase
                      key={item.id}
                      onClick={() => go(item.target)}
                      sx={{
                        width: '100%',
                        textAlign: 'left',
                        borderRadius: 2,
                        px: 1.25,
                        py: 1.05,
                        justifyContent: 'flex-start',
                        border: `1px solid ${index === 0 ? (danger ? '#efc0bc' : '#ead5ad') : '#edf1f5'}`,
                        bgcolor: index === 0 ? (danger ? C.redSoft : C.amberSoft) : '#fff',
                        '&:hover': { bgcolor: index === 0 ? (danger ? '#ffe9e6' : '#fff0d6') : '#f8fafc' }
                      }}
                    >
                      <Stack direction="row" gap={1.1} alignItems="flex-start" sx={{ width: '100%' }}>
                        <Box sx={{ mt: 0.1, color: danger ? C.red : C.amber }}>
                          <WarningAmberRounded sx={{ fontSize: 16 }} />
                        </Box>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography sx={{ color: C.ink, fontSize: 12.2, fontWeight: 820, lineHeight: 1.35 }}>{item.title}</Typography>
                          <Typography sx={{ color: C.muted, fontSize: 10.8, lineHeight: 1.45, mt: 0.35 }}>{item.detail}</Typography>
                        </Box>
                        <ArrowForwardRounded sx={{ fontSize: 16, color: '#a8b2bf', mt: 0.1 }} />
                      </Stack>
                    </ButtonBase>
                  );
                })}
              </Stack>
            ) : (
              <EmptyMessage>No hay alertas prioritarias con la información disponible.</EmptyMessage>
            )}
          </Paper>
        </Box>

        <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${C.line}`, bgcolor: '#fff', mb: 2.2, overflow: 'hidden' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, '& > *:not(:last-child)': { borderRight: { xs: 'none', md: `1px solid ${C.line}` }, borderBottom: { xs: `1px solid ${C.line}`, md: 'none' } } }}>
            <MetricLine
              icon={<InsightsRounded sx={{ fontSize: 18 }} />}
              label="Desvíos del mes"
              value={deviations?.current?.total}
              helper={changeText}
              tone={change?.direction === 'up' ? 'warning' : 'default'}
              onClick={() => go('annualAnalysis')}
              loading={loading}
            />
            <MetricLine
              icon={<AssignmentLateRounded sx={{ fontSize: 18 }} />}
              label="No conformidades abiertas"
              value={nc?.total ? nc.open : null}
              helper={!nc ? 'No disponible' : nc?.overdue ? `${n(nc.overdue)} vencidas` : nc?.total ? 'Pendientes de cierre' : 'Sin registros'}
              tone={nc?.overdue ? 'danger' : 'default'}
              onClick={() => go('customerNonconformities')}
              loading={loading}
            />
            <MetricLine
              icon={<VerifiedRounded sx={{ fontSize: 18 }} />}
              label="Certificaciones que requieren atención"
              value={cert ? cert.count + cert.expired : null}
              helper={!cert ? 'No disponible' : cert.expired ? `${n(cert.expired)} vencidas` : 'Próximos 30 días'}
              tone={cert?.expired ? 'danger' : cert?.count ? 'warning' : 'default'}
              onClick={() => go('certifications')}
              loading={loading}
            />
          </Box>
        </Paper>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 0.9fr) minmax(0, 1.1fr)' }, gap: 2.2 }}>
          <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${C.line}`, bgcolor: '#fff', p: { xs: 2.2, md: 2.6 } }}>
            <SectionTitle kicker="Dónde actuar" title="Sectores principales" action="Abrir análisis" onAction={() => go('annualAnalysis')} />
            {loading ? (
              <Stack spacing={1.3}>{[1, 2, 3].map((id) => <Skeleton key={id} variant="rounded" height={52} />)}</Stack>
            ) : deviations?.topSectors?.length ? (
              <Stack spacing={1.6}>
                {deviations.topSectors.map((sector, index) => (
                  <Box key={sector.key}>
                    <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={1}>
                      <Stack direction="row" alignItems="baseline" gap={1} minWidth={0}>
                        <Typography sx={{ color: index === 0 ? C.blue : C.faint, fontSize: 10.5, fontWeight: 900 }}>0{index + 1}</Typography>
                        <Typography sx={{ color: C.ink, fontSize: 12.5, fontWeight: index === 0 ? 820 : 700, overflowWrap: 'anywhere' }}>{sector.name}</Typography>
                      </Stack>
                      <Typography sx={{ color: C.muted, fontSize: 11.5, whiteSpace: 'nowrap' }}>{n(sector.value)} · {n(sector.share)}%</Typography>
                    </Stack>
                    <Box sx={{ mt: 0.75, ml: 3.7, height: 5, bgcolor: '#edf1f5', borderRadius: 99, overflow: 'hidden' }}>
                      <Box sx={{ width: `${Math.max(4, Math.min(100, sector.share || 0))}%`, height: '100%', bgcolor: index === 0 ? C.blue : '#a8bbd1', borderRadius: 99 }} />
                    </Box>
                  </Box>
                ))}
              </Stack>
            ) : (
              <EmptyMessage action="Revisar análisis anual" onAction={() => go('annualAnalysis')}>Sin registros sectorizados para el mes actual.</EmptyMessage>
            )}
          </Paper>

          <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${C.line}`, bgcolor: '#fff', p: { xs: 2.2, md: 2.6 } }}>
            <SectionTitle kicker="Agenda" title="Vencimientos y cumplimiento" action="Ver certificaciones" onAction={() => go('certifications')} />
            {loading || expiredLoading ? (
              <Stack spacing={1.2}>{[1, 2, 3].map((id) => <Skeleton key={id} variant="rounded" height={52} />)}</Stack>
            ) : certifications.length ? (
              <Stack divider={<Box sx={{ height: 1, bgcolor: '#edf1f5' }} />}>
                {certifications.map((item) => {
                  const days = item.daysUntilExpiration;
                  const expired = days < 0;
                  const urgent = !expired && days <= 7;
                  return (
                    <ButtonBase
                      key={item.id}
                      onClick={() => go('certifications')}
                      sx={{ width: '100%', py: 1.15, justifyContent: 'space-between', gap: 2, textAlign: 'left', '&.Mui-focusVisible': { outline: `2px solid ${C.blue}` } }}
                    >
                      <Stack direction="row" alignItems="center" gap={1.1} minWidth={0}>
                        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: expired ? C.red : urgent ? C.amber : C.blue, flexShrink: 0 }} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ color: C.ink, fontSize: 12.2, fontWeight: 760, overflowWrap: 'anywhere' }}>{item.name}</Typography>
                          <Typography sx={{ color: C.muted, fontSize: 10.3, mt: 0.25 }}>
                            {item.expirationDate?.split('-').reverse().join('/')}{item.responsibleArea ? ` · ${item.responsibleArea}` : ''}
                          </Typography>
                        </Box>
                      </Stack>
                      <Typography sx={{ color: expired ? C.red : urgent ? C.amber : C.muted, fontSize: 10.5, fontWeight: 800, whiteSpace: 'nowrap' }}>
                        {expired ? 'Vencida' : days === 0 ? 'Hoy' : `${days} días`}
                      </Typography>
                    </ButtonBase>
                  );
                })}
              </Stack>
            ) : (
              <EmptyMessage>{!cert ? 'Agenda no disponible.' : cert.expired ? 'Detalle de vencidas no disponible.' : 'Sin vencimientos próximos.'}</EmptyMessage>
            )}

            {cert?.expired > 0 && !expiredItems?.length && !expiredLoading && (
              <Button onClick={() => go('certifications')} size="small" sx={{ color: C.blue, px: 0, mt: 1, fontWeight: 800, fontSize: 11.5 }}>
                Consultar certificaciones vencidas
              </Button>
            )}
          </Paper>
        </Box>

        {!loading && !error && (
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" gap={1} sx={{ mt: 2.1, px: 0.4 }}>
            <Stack direction="row" alignItems="center" gap={0.65}>
              <TaskAltRounded sx={{ fontSize: 14, color: C.teal }} />
              <Typography sx={{ color: C.faint, fontSize: 10.3 }}>Resumen generado con registros persistidos de análisis, NC y certificaciones.</Typography>
            </Stack>
            {refreshed && <Typography sx={{ color: C.faint, fontSize: 10.3 }}>Actualizado {refreshed}</Typography>}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

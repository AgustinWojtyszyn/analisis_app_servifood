import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  IconButton,
  Skeleton,
  Stack,
  Tooltip as MuiTooltip,
  Typography
} from '@mui/material';
import {
  ArrowOutwardRounded,
  AutorenewRounded,
  AssignmentRounded,
  EventBusyRounded,
  FactCheckRounded,
  GppMaybeRounded,
  QueryStatsRounded,
  WorkspacePremiumRounded
} from '@mui/icons-material';
import { getExecutiveDashboard } from '../services/analysis';
import { getCertifications } from '../services/certificationService';
import { getAdminHealthDeclarations } from '../services/healthDeclarations';

const BLUE = '#2563eb';
const BLUE_DARK = '#1e40af';
const BLUE_INK = '#334155';
const BLUE_PALE = '#eff6ff';
const INK = '#101828';
const MUTED = '#667085';
const LINE = '#e2e8f0';
const CANVAS = 'transparent';
const WHITE = '#ffffff';

const formatNumber = (value) => value == null
  ? '—'
  : Number(value).toLocaleString('es-AR', { maximumFractionDigits: 1 });

const formatMonthLabel = (value) => {
  if (!value) return 'Mes actual';
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const formatDateParts = (isoDate) => {
  if (!isoDate) return { day: '—', month: '' };
  const [year, month, day] = String(isoDate).split('-').map(Number);
  if (!year || !month || !day) return { day: '—', month: '' };
  const date = new Date(Date.UTC(year, month - 1, day));
  return {
    day: String(day).padStart(2, '0'),
    month: date.toLocaleDateString('es-AR', { month: 'short', timeZone: 'UTC' }).replace('.', '').toUpperCase()
  };
};

function TextAction({ children, onClick }) {
  return (
    <Button
      onClick={onClick}
      endIcon={<ArrowOutwardRounded sx={{ fontSize: '15px !important' }} />}
      sx={{
        p: 0,
        minWidth: 0,
        color: BLUE,
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 0.45,
        '&:hover': { bgcolor: 'transparent', color: BLUE_DARK }
      }}
    >
      {children}
    </Button>
  );
}

function SignalCell({ index, label, value, note, onClick, loading }) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        width: '100%',
        minWidth: 0,
        minHeight: { xs: 112, md: 132 },
        display: 'block',
        textAlign: 'left',
        px: { xs: 2, md: 2.6 },
        py: 2.1,
        borderRadius: 0,
        '&.Mui-focusVisible': { outline: `2px solid ${BLUE}`, outlineOffset: -2 },
        '&:hover': { bgcolor: '#f8fbff' }
      }}
    >
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1} sx={{ mb: 1.2 }}>
        <Typography sx={{ color: BLUE, fontSize: 10, fontWeight: 900, letterSpacing: 1.2 }}>
          {String(index).padStart(2, '0')}
        </Typography>
        <ArrowOutwardRounded sx={{ fontSize: 15, color: '#9aa7b8' }} />
      </Stack>

      <Typography sx={{ color: MUTED, fontSize: 10.5, fontWeight: 750, textTransform: 'uppercase', letterSpacing: 0.65 }}>
        {label}
      </Typography>

      {loading ? (
        <Skeleton width="45%" height={48} />
      ) : (
        <Typography sx={{ color: INK, fontSize: { xs: 34, md: 42 }, fontWeight: 850, lineHeight: 1.02, letterSpacing: -1.5, mt: 0.5 }}>
          {formatNumber(value)}
        </Typography>
      )}

      {loading ? (
        <Skeleton width="66%" />
      ) : (
        <Typography sx={{ color: MUTED, fontSize: 10.8, lineHeight: 1.45, mt: 0.65 }}>
          {note}
        </Typography>
      )}
    </ButtonBase>
  );
}

function SectionHeader({ index, title, action, onAction }) {
  return (
    <Stack direction="row" alignItems="flex-end" justifyContent="space-between" gap={2} sx={{ mb: 2.1 }}>
      <Stack direction="row" alignItems="baseline" gap={1.2}>
        <Typography sx={{ color: BLUE, fontSize: 10, fontWeight: 900, letterSpacing: 1.15 }}>
          {index}
        </Typography>
        <Typography component="h2" sx={{ color: INK, fontSize: { xs: 18, md: 21 }, fontWeight: 850, letterSpacing: -0.5 }}>
          {title}
        </Typography>
      </Stack>
      {action && <TextAction onClick={onAction}>{action}</TextAction>}
    </Stack>
  );
}

function QuickCard({ icon, eyebrow, title, value, helper, onClick, loading }) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        width: '100%',
        minWidth: 0,
        textAlign: 'left',
        display: 'block',
        borderRadius: 2.5,
        bgcolor: WHITE,
        border: `1px solid ${LINE}`,
        px: 2,
        py: 1.8,
        transition: 'transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: '#b7c9df',
          boxShadow: '0 10px 24px rgba(31,92,168,0.08)'
        },
        '&.Mui-focusVisible': { outline: `2px solid ${BLUE}`, outlineOffset: 2 }
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1.5}>
        <Box sx={{ width: 34, height: 34, borderRadius: 1.5, bgcolor: BLUE_PALE, color: BLUE, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          {icon}
        </Box>
        <ArrowOutwardRounded sx={{ fontSize: 17, color: '#8da2bb' }} />
      </Stack>

      <Typography sx={{ color: MUTED, fontSize: 9.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.9, mt: 1.5 }}>
        {eyebrow}
      </Typography>
      <Typography sx={{ color: INK, fontSize: 15, fontWeight: 850, letterSpacing: -0.2, mt: 0.35 }}>
        {title}
      </Typography>

      {loading ? (
        <Skeleton width="45%" height={34} />
      ) : (
        <Typography sx={{ color: BLUE_DARK, fontSize: 24, fontWeight: 900, lineHeight: 1.05, mt: 1 }}>
          {value}
        </Typography>
      )}

      <Typography sx={{ color: MUTED, fontSize: 10.5, lineHeight: 1.45, mt: 0.5 }}>
        {helper}
      </Typography>
    </ButtonBase>
  );
}

function LoadingRows({ count = 3 }) {
  return (
    <Stack spacing={1.4}>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} variant="rectangular" height={54} sx={{ borderRadius: 0.5 }} />
      ))}
    </Stack>
  );
}

export default function DashboardHome({ user, onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [expiredItems, setExpiredItems] = useState(null);
  const [expiredLoading, setExpiredLoading] = useState(false);
  const [healthAlerts, setHealthAlerts] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setExpiredItems(null);
    setExpiredLoading(false);
    setHealthAlerts(null);
    setHealthLoading(true);

    Promise.resolve(getAdminHealthDeclarations())
      .then((rows) => {
        if (controller.signal.aborted) return;
        const list = Array.isArray(rows) ? rows : [];
        setHealthAlerts(list.filter((row) => ['rojo', 'amarillo'].includes(String(row.trafficLight || '').toLowerCase())).length);
      })
      .catch(() => {
        if (!controller.signal.aborted) setHealthAlerts(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setHealthLoading(false);
      });

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
          setError(err.message || 'No se pudo cargar el panel.');
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

  const changeText = !change
    ? 'Comparación pendiente'
    : change.percentage == null
      ? `${previousLabel}: 0`
      : `${change.percentage > 0 ? '+' : ''}${formatNumber(change.percentage)}% frente a ${previousLabel}`;

  const alerts = useMemo(() => {
    const source = data?.alerts || [];
    const priority = source.filter((item) => item.severity === 'error' || item.severity === 'warning');
    return (priority.length ? priority : source).slice(0, 4);
  }, [data?.alerts]);

  const certificationItems = useMemo(
    () => [...(expiredItems || []), ...(cert?.urgent || [])].slice(0, 5),
    [expiredItems, cert?.urgent]
  );

  const executiveHeadline = loading
    ? 'Actualizando el estado operativo.'
    : error
      ? 'No pudimos actualizar el estado operativo.'
      : cert?.expired
        ? `${formatNumber(cert.expired)} certificaciones vencidas requieren revisión.`
        : nc?.overdue
          ? `${formatNumber(nc.overdue)} no conformidades requieren seguimiento.`
          : alerts.length
            ? 'Hay señales operativas que conviene revisar.'
            : 'No hay alertas críticas en los registros disponibles.';

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
    <Box aria-busy={loading} sx={{ minHeight: '100%', bgcolor: CANVAS, color: INK }}>
      <Box sx={{ maxWidth: 1440, mx: 'auto', px: 0, py: { xs: 0.5, md: 0.75 } }}>
        <Box sx={{ pt: 0, mb: { xs: 2, md: 2.5 } }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'flex-end' }} gap={2.5}>
            <Box sx={{ maxWidth: 850 }}>
              <Typography sx={{ color: BLUE, fontSize: 10.5, fontWeight: 900, letterSpacing: 1.7, textTransform: 'uppercase', mb: 1 }}>
                Calidad operativa / {formatMonthLabel(deviations?.current?.label)}
              </Typography>
              <Typography component="h1" sx={{ color: INK, fontSize: { xs: 26, sm: 30, lg: 34 }, fontWeight: 900, letterSpacing: -1.1, lineHeight: 1.05 }}>
                Pulso de ServiFood
              </Typography>
              <Typography sx={{ color: BLUE_INK, fontSize: { xs: 14, md: 16 }, fontWeight: 650, letterSpacing: -0.2, lineHeight: 1.35, mt: 0.8 }}>
                {executiveHeadline}
              </Typography>
            </Box>

            <Stack direction="row" alignItems="center" gap={1.2}>
              <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                <Typography sx={{ color: MUTED, fontSize: 10, fontWeight: 750, textTransform: 'uppercase', letterSpacing: 0.7 }}>
                  Última lectura
                </Typography>
                <Typography sx={{ color: INK, fontSize: 11.5, fontWeight: 700, mt: 0.2 }}>
                  {loading ? 'Actualizando…' : refreshed || 'Sin lectura'}
                </Typography>
              </Box>
              <MuiTooltip title="Actualizar">
                <span>
                  <IconButton
                    aria-label="Actualizar dashboard"
                    disabled={loading}
                    onClick={() => setRevision((value) => value + 1)}
                    sx={{
                      width: 42,
                      height: 42,
                      border: `1px solid ${LINE}`,
                      borderRadius: 1.5,
                      color: BLUE,
                      bgcolor: WHITE,
                      '&:hover': { bgcolor: BLUE_PALE }
                    }}
                  >
                    <AutorenewRounded sx={{ fontSize: 19 }} />
                  </IconButton>
                </span>
              </MuiTooltip>
            </Stack>
          </Stack>
        </Box>

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2.5, borderRadius: 0.5 }}
            action={<Button color="inherit" onClick={() => setRevision((value) => value + 1)}>Reintentar</Button>}
          >
            {error}
          </Alert>
        )}

        <Box
          sx={{
            bgcolor: WHITE,
            border: `1px solid ${LINE}`,
            borderLeft: `5px solid ${BLUE}`,
            mb: { xs: 3, md: 4 },
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
            '& > *:not(:last-child)': {
              borderRight: { xs: 'none', md: `1px solid ${LINE}` },
              borderBottom: { xs: `1px solid ${LINE}`, md: 'none' }
            }
          }}
        >
          <SignalCell
            index={1}
            label="Desvíos este mes"
            value={deviations?.current?.total}
            note={changeText}
            onClick={() => go('annualAnalysis')}
            loading={loading}
          />
          <SignalCell
            index={2}
            label="No conformidades abiertas"
            value={nc?.total ? nc.open : null}
            note={!nc ? 'Información no disponible' : nc.overdue ? `${formatNumber(nc.overdue)} declaradas vencidas` : nc.total ? 'Pendientes de cierre' : 'Sin registros persistidos'}
            onClick={() => go('customerNonconformities')}
            loading={loading}
          />
          <SignalCell
            index={3}
            label="Certificaciones en atención"
            value={cert ? cert.count + cert.expired : null}
            note={!cert ? 'Información no disponible' : cert.expired ? `${formatNumber(cert.expired)} vencidas` : cert.count ? `${formatNumber(cert.count)} próximas a vencer` : 'Sin vencimientos próximos'}
            onClick={() => go('certifications')}
            loading={loading}
          />
        </Box>

        <Box component="section" sx={{ mb: { xs: 3.5, md: 4.5 } }}>
          <SectionHeader index="Accesos" title="Ir directo a gestionar" />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }, gap: 1.5 }}>
            <QuickCard
              icon={<QueryStatsRounded sx={{ fontSize: 18 }} />}
              eyebrow="Análisis"
              title="Análisis anual"
              value={deviations?.current?.total == null ? 'Abrir' : `${formatNumber(deviations.current.total)} desvíos`}
              helper="Resumen, sectores y clasificaciones."
              onClick={() => go('annualAnalysis')}
              loading={loading}
            />
            <QuickCard
              icon={<FactCheckRounded sx={{ fontSize: 18 }} />}
              eyebrow="Clientes"
              title="No conformidades"
              value={!nc ? 'Abrir' : nc.total ? `${formatNumber(nc.open)} abiertas` : 'Sin registros'}
              helper="Revisá casos pendientes y su estado."
              onClick={() => go('customerNonconformities')}
              loading={loading}
            />
            <QuickCard
              icon={<AssignmentRounded sx={{ fontSize: 18 }} />}
              eyebrow="Salud"
              title="Solicitudes de salud"
              value={healthAlerts == null ? 'Abrir gestor' : `${formatNumber(healthAlerts)} alertas`}
              helper="Casos Amarillo/Rojo del personal."
              onClick={() => go('adminHealthDeclarations')}
              loading={healthLoading}
            />
            <QuickCard
              icon={<WorkspacePremiumRounded sx={{ fontSize: 18 }} />}
              eyebrow="Cumplimiento"
              title="Certificaciones vencidas"
              value={!cert ? 'Abrir' : `${formatNumber(cert.expired)} vencidas`}
              helper="Entrá directo al control de renovaciones."
              onClick={() => go('certifications')}
              loading={loading}
            />
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.2fr) minmax(360px, 0.8fr)' }, gap: { xs: 3.5, lg: 5 }, alignItems: 'start' }}>
          <Box component="section" sx={{ minWidth: 0 }}>
            <SectionHeader index="A" title="Señales que requieren decisión" />
            <Box sx={{ borderTop: `1px solid ${INK}` }}>
              {loading ? (
                <Box sx={{ py: 2 }}><LoadingRows count={4} /></Box>
              ) : alerts.length ? (
                alerts.map((item, index) => (
                  <ButtonBase
                    key={item.id}
                    onClick={() => go(item.target)}
                    sx={{
                      width: '100%',
                      textAlign: 'left',
                      borderRadius: 0,
                      borderBottom: `1px solid ${LINE}`,
                      px: 0,
                      py: { xs: 1.8, md: 2.1 },
                      '&:hover': { bgcolor: '#fafcff' },
                      '&.Mui-focusVisible': { outline: `2px solid ${BLUE}`, outlineOffset: -2 }
                    }}
                  >
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '38px minmax(0, 1fr)', sm: '54px minmax(0, 1fr) auto' }, width: '100%', gap: { xs: 1, sm: 1.5 }, alignItems: 'start' }}>
                      <Typography sx={{ color: BLUE, fontSize: 11, fontWeight: 900, pt: 0.15 }}>
                        {String(index + 1).padStart(2, '0')}
                      </Typography>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ color: INK, fontSize: { xs: 14, md: 15 }, fontWeight: 850, lineHeight: 1.3 }}>
                          {item.title}
                        </Typography>
                        <Typography sx={{ color: MUTED, fontSize: 11.5, lineHeight: 1.55, mt: 0.45 }}>
                          {item.detail}
                        </Typography>
                      </Box>
                      <ArrowOutwardRounded sx={{ display: { xs: 'none', sm: 'block' }, fontSize: 18, color: '#8c99aa', mt: 0.15 }} />
                    </Box>
                  </ButtonBase>
                ))
              ) : (
                <Box sx={{ py: 5 }}>
                  <Stack direction="row" alignItems="center" gap={1.2}>
                    <FactCheckRounded sx={{ color: BLUE, fontSize: 21 }} />
                    <Typography sx={{ color: INK, fontSize: 14, fontWeight: 800 }}>
                      Sin señales prioritarias para mostrar.
                    </Typography>
                  </Stack>
                  <Typography sx={{ color: MUTED, fontSize: 11.5, mt: 0.8 }}>
                    El panel se actualizará automáticamente cuando existan registros relevantes.
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          <Box component="section" sx={{ minWidth: 0 }}>
            <SectionHeader index="B" title="Agenda de cumplimiento" action="Ver certificaciones" onAction={() => go('certifications')} />
            <Box sx={{ borderTop: `1px solid ${INK}` }}>
              {loading || expiredLoading ? (
                <Box sx={{ py: 2 }}><LoadingRows count={4} /></Box>
              ) : certificationItems.length ? (
                certificationItems.map((item) => {
                  const date = formatDateParts(item.expirationDate);
                  return (
                    <ButtonBase
                      key={item.id}
                      onClick={() => go('certifications')}
                      sx={{
                        width: '100%',
                        textAlign: 'left',
                        borderRadius: 0,
                        borderBottom: `1px solid ${LINE}`,
                        py: 1.65,
                        px: 0,
                        '&:hover': { bgcolor: '#fafcff' },
                        '&.Mui-focusVisible': { outline: `2px solid ${BLUE}`, outlineOffset: -2 }
                      }}
                    >
                      <Box sx={{ display: 'grid', gridTemplateColumns: '58px minmax(0, 1fr) auto', width: '100%', gap: 1.3, alignItems: 'center' }}>
                        <Box>
                          <Typography sx={{ color: BLUE, fontSize: 22, fontWeight: 900, lineHeight: 1 }}>{date.day}</Typography>
                          <Typography sx={{ color: MUTED, fontSize: 9, fontWeight: 850, letterSpacing: 0.9, mt: 0.25 }}>{date.month}</Typography>
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ color: INK, fontSize: 12.5, fontWeight: 800, lineHeight: 1.35, overflowWrap: 'anywhere' }}>
                            {item.name}
                          </Typography>
                          <Typography sx={{ color: MUTED, fontSize: 10.5, mt: 0.3 }}>
                            {item.responsibleArea || 'Responsable no informado'}
                          </Typography>
                        </Box>
                        <Typography sx={{ color: BLUE, fontSize: 9.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.55, whiteSpace: 'nowrap' }}>
                          {item.daysUntilExpiration < 0 ? 'Vencida' : item.daysUntilExpiration === 0 ? 'Hoy' : `${item.daysUntilExpiration} días`}
                        </Typography>
                      </Box>
                    </ButtonBase>
                  );
                })
              ) : (
                <Box sx={{ py: 4.5 }}>
                  <Stack direction="row" alignItems="center" gap={1.2}>
                    <EventBusyRounded sx={{ color: BLUE, fontSize: 21 }} />
                    <Typography sx={{ color: INK, fontSize: 13.5, fontWeight: 800 }}>
                      {!cert ? 'Agenda no disponible.' : cert.expired ? 'El detalle de vencidas no está disponible.' : 'Sin vencimientos próximos.'}
                    </Typography>
                  </Stack>
                </Box>
              )}

              {cert?.expired > 0 && !expiredItems?.length && !expiredLoading && (
                <Box sx={{ pt: 1.5 }}>
                  <TextAction onClick={() => go('certifications')}>Consultar vencidas</TextAction>
                </Box>
              )}
            </Box>
          </Box>
        </Box>

        <Box component="section" sx={{ mt: { xs: 4.5, md: 6 } }}>
          <SectionHeader index="C" title="Dónde se concentra el problema" action="Abrir análisis anual" onAction={() => go('annualAnalysis')} />
          <Box sx={{ borderTop: `1px solid ${INK}` }}>
            {loading ? (
              <Box sx={{ py: 2 }}><LoadingRows count={3} /></Box>
            ) : deviations?.topSectors?.length ? (
              deviations.topSectors.map((sector, index) => (
                <Box
                  key={sector.key}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '44px minmax(0, 1fr)', sm: '62px minmax(220px, 0.9fr) minmax(200px, 1.4fr) 110px' },
                    gap: { xs: 1, sm: 2 },
                    alignItems: 'center',
                    borderBottom: `1px solid ${LINE}`,
                    py: { xs: 1.8, sm: 1.65 }
                  }}
                >
                  <Typography sx={{ color: index === 0 ? BLUE : '#9aa7b8', fontSize: 11, fontWeight: 900 }}>
                    {String(index + 1).padStart(2, '0')}
                  </Typography>
                  <Typography sx={{ color: INK, fontSize: 13, fontWeight: index === 0 ? 850 : 720, overflowWrap: 'anywhere' }}>
                    {sector.name}
                  </Typography>
                  <Box sx={{ display: { xs: 'none', sm: 'block' }, height: 8, bgcolor: '#e9eef4', overflow: 'hidden' }}>
                    <Box sx={{ width: `${Math.max(3, Math.min(100, sector.share || 0))}%`, height: '100%', bgcolor: index === 0 ? BLUE : '#8fb0d3' }} />
                  </Box>
                  <Typography sx={{ gridColumn: { xs: '2', sm: 'auto' }, color: MUTED, fontSize: 11.5, fontWeight: 700, textAlign: { sm: 'right' } }}>
                    {formatNumber(sector.value)} · {formatNumber(sector.share)}%
                  </Typography>
                </Box>
              ))
            ) : (
              <Box sx={{ py: 4.5 }}>
                <Stack direction="row" alignItems="center" gap={1.2}>
                  <QueryStatsRounded sx={{ color: BLUE, fontSize: 21 }} />
                  <Box>
                    <Typography sx={{ color: INK, fontSize: 13.5, fontWeight: 800 }}>
                      Aún no hay un sector dominante para este mes.
                    </Typography>
                    <Typography sx={{ color: MUTED, fontSize: 11.5, mt: 0.45 }}>
                      Se mostrará el ranking cuando existan desvíos sectorizados con cobertura mensual.
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            )}
          </Box>
        </Box>

        <Box sx={{ mt: { xs: 4, md: 5 }, pt: 1.6, borderTop: `1px solid ${LINE}` }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={0.8}>
            <Typography sx={{ color: MUTED, fontSize: 9.8 }}>
              Datos de análisis anual, no conformidades persistidas y certificaciones.
            </Typography>
            <Stack direction="row" alignItems="center" gap={0.75}>
              <GppMaybeRounded sx={{ color: BLUE, fontSize: 13 }} />
              <Typography sx={{ color: MUTED, fontSize: 9.8 }}>
                Los módulos fuente siguen siendo la referencia para el detalle.
              </Typography>
            </Stack>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, ButtonBase, IconButton, Skeleton, Stack, Tooltip as MuiTooltip, Typography } from '@mui/material';
import { ArrowForwardRounded, RefreshRounded, TrendingUpRounded, TrendingDownRounded, RemoveRounded } from '@mui/icons-material';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getExecutiveDashboard } from '../services/analysis';
import { getCertifications } from '../services/certificationService';

const blue = '#214c91';
const ink = '#182d4b';
const muted = '#758092';
const tones = { error: '#b5443e', warning: '#a56e25', info: muted };
const number = (value) => value == null ? '—' : value.toLocaleString('es-AR', { maximumFractionDigits: 1 });
const heading = { fontSize: 16, fontWeight: 650, letterSpacing: -0.3, color: ink };
const quiet = { color: muted, fontSize: 12, lineHeight: 1.7 };

function Metric({ title, value, helper, detail, tone = 'info', onClick, children, loading }) {
  return <MuiTooltip title={detail || ''} arrow>
    <ButtonBase onClick={onClick} sx={{ display: 'block', textAlign: 'left', minWidth: 0, width: '100%', borderRadius: 1, '&.Mui-focusVisible': { outline: `2px solid ${blue}`, outlineOffset: 5 } }}>
      <Typography component="h2" sx={{ fontSize: { xs: 11, sm: 13 }, color: muted, lineHeight: 1.5, minHeight: { xs: 50, sm: 40, lg: 20 } }}>{title}</Typography>
      {loading ? <Skeleton width="65%" height={76} /> : <Typography sx={{ fontSize: { xs: 44, sm: 62, xl: 72 }, fontWeight: 500, color: blue, letterSpacing: -2.5, lineHeight: 1.3, fontVariantNumeric: 'tabular-nums' }}>{number(value)}</Typography>}
      {loading ? <Skeleton width="75%" /> : <Typography sx={{ fontSize: { xs: 10, sm: 12 }, color: tones[tone], display: 'flex', alignItems: 'flex-start', gap: 0.5, minHeight: 36, lineHeight: 1.5 }}>{children}{helper}</Typography>}
    </ButtonBase>
  </MuiTooltip>;
}

function SectionHeading({ title, onClick, action }) {
  return <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={2} sx={{ mb: 3 }}>
    <Typography component="h2" sx={heading}>{title}</Typography>
    {action && <Button size="small" onClick={onClick} sx={{ p: 0, minWidth: 0, fontSize: 11, color: muted, whiteSpace: 'nowrap' }}>{action}</Button>}
  </Stack>;
}

function TrendTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const month = payload[0].payload;
  return <Box sx={{ bgcolor: ink, color: '#fff', p: 1.5, borderRadius: '8px' }}>
    <Typography sx={{ fontSize: 11 }}>{month.label}</Typography>
    <Typography sx={{ fontWeight: 650, my: 0.5 }}>{number(month.total)} desvíos</Typography>
    {month.partial && <Typography sx={{ fontSize: 10, opacity: 0.7 }}>Mes en curso</Typography>}
  </Box>;
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
    getExecutiveDashboard({ signal: controller.signal }).then((result) => {
      if (controller.signal.aborted) return;
      setData(result);
      // The summary includes an expired count. Fetch names only when needed,
      // using the existing authenticated certification service.
      if (result.certifications?.expired > 0) {
        setExpiredLoading(true);
        getCertifications().then((payload) => {
          if (!controller.signal.aborted) setExpiredItems((payload.items || [])
            .filter((item) => item.daysUntilExpiration < 0)
            .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration));
        }).catch(() => {
          if (!controller.signal.aborted) setExpiredItems(null);
        }).finally(() => {
          if (!controller.signal.aborted) setExpiredLoading(false);
        });
      }
    }).catch((err) => {
      if (!controller.signal.aborted) { setData(null); setError(err.message || 'No se pudo cargar el dashboard.'); }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision, user?.id]);

  const go = (section) => onNavigate?.(section);
  const deviations = data?.deviations;
  const nc = data?.nonconformities;
  const cert = data?.certifications;
  const change = deviations?.change;
  const hasTrend = deviations?.months.some((month) => month.total !== null);
  const previousLabel = deviations?.previous.label || 'mes anterior';
  const changeText = !change ? 'Comparación pendiente'
    : change.percentage == null ? `${previousLabel}: 0`
      : `${change.percentage > 0 ? '+' : ''}${number(change.percentage)}% vs ${previousLabel}`;
  const ChangeIcon = change?.direction === 'up' ? TrendingUpRounded : change?.direction === 'down' ? TrendingDownRounded : RemoveRounded;
  // Keep backend severity order, omit informational filler and repeated KPI alerts.
  const alerts = (data?.alerts || []).filter((item) => item.severity !== 'info'
    && !['expired', 'upcoming', 'nc-open', 'nc-overdue', 'increase'].includes(item.id)).slice(0, 3);
  const certificationItems = [...(expiredItems || []), ...(cert?.urgent || [])].slice(0, 3);
  const sources = deviations?.sources.map((source) => `${source.year}: ${source.filename}`).join(' · ');
  const refreshed = data ? new Date(data.generatedAt).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

  return <Box aria-busy={loading} sx={{ color: ink, px: { xs: 1, sm: 2.5, lg: 4 }, pt: { xs: 1, md: 2 }, pb: 5 }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} sx={{ mb: { xs: 4, md: 5 } }}>
      <Box>
        <Typography component="h1" sx={{ fontSize: { xs: 25, sm: 30 }, fontWeight: 600, letterSpacing: -1 }}>Dashboard ejecutivo</Typography>
        <Typography sx={{ ...quiet, mt: 0.7, textTransform: 'capitalize' }}>{deviations?.current.label || 'Mes actual'}</Typography>
      </Box>
      <MuiTooltip title={loading ? 'Actualizando' : refreshed ? `Actualizar · última consulta ${refreshed}` : 'Actualizar'}>
        <span><IconButton aria-label="Actualizar dashboard" disabled={loading} onClick={() => setRevision((value) => value + 1)} sx={{ color: muted }}><RefreshRounded sx={{ fontSize: 19 }} /></IconButton></span>
      </MuiTooltip>
    </Stack>
    {error && <Alert severity="error" sx={{ mb: 3 }} action={<Button color="inherit" onClick={() => setRevision((value) => value + 1)}>Reintentar</Button>}>{error}</Alert>}

    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: { xs: 2, sm: 4, lg: 6 }, mb: { xs: 4, md: 6 } }}>
      <Metric title="Desvíos del mes" value={deviations?.current.total} helper={deviations ? changeText : 'No disponible'} detail={`Mes en curso frente al mes anterior completo. ${sources || 'Fuente: análisis anual'}. Los meses sin cobertura no equivalen a cero.`} tone={change?.direction === 'up' ? 'warning' : 'info'} onClick={() => go('annualAnalysis')} loading={loading}>
        {change && <ChangeIcon sx={{ fontSize: 15, flexShrink: 0, mt: 0.1 }} />}
      </Metric>
      <Metric title="No conformidades abiertas" value={nc?.total ? nc.open : null} helper={!nc ? 'No disponible' : nc.overdue ? `${number(nc.overdue)} declaradas vencidas` : nc.total ? 'Pendientes de cierre' : 'Sin registros'} detail={`NC persistidas. No hay fechas límite registradas.${nc?.unknown ? ` ${nc.unknown} NC sin estado reconocido, excluidas del total abierto.` : ''}`} tone={nc?.overdue ? 'error' : 'info'} onClick={() => go('customerNonconformities')} loading={loading} />
      <Metric title="Certificaciones que requieren atención" value={cert ? cert.count + cert.expired : null} helper={!cert ? 'No disponible' : cert.expired ? `${number(cert.expired)} vencidas` : 'Próximos 30 días'} detail={`Incluye vencidas y próximas a vencer en 30 días.${cert?.invalidDates ? ` ${cert.invalidDates} sin fecha válida, excluidas.` : ''}`} tone={cert?.expired ? 'error' : 'info'} onClick={() => go('certifications')} loading={loading} />
    </Box>

    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 2.5fr) minmax(220px, 1fr)' }, gap: { xs: 4, lg: 5 }, alignItems: 'start', mb: { xs: 5, md: 6 } }}>
      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 2 }}>
          <Typography component="h2" sx={{ ...heading, fontSize: { xs: 19, sm: 22 } }}>Tendencia de desvíos</Typography>
          <Typography sx={{ ...quiet, fontSize: 10 }}>6 meses</Typography>
        </Stack>
        {loading ? <Skeleton variant="rounded" height={300} /> : hasTrend ? <>
          <Box sx={{ height: { xs: 260, sm: 320, xl: 350 }, minWidth: 0 }} role="img" aria-label={`Evolución mensual: ${deviations.months.map((month) => `${month.label}: ${month.total == null ? 'sin cobertura' : `${month.total} desvíos`}`).join('; ')}. El mes actual es parcial.`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={deviations.months} margin={{ top: 20, right: 10, left: -25, bottom: 0 }} accessibilityLayer>
                <defs><linearGradient id="executiveTrendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={blue} stopOpacity={0.16} /><stop offset="100%" stopColor={blue} stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid vertical={false} stroke="#e9edf3" strokeDasharray="2 6" />
                <XAxis dataKey="shortLabel" axisLine={false} tickLine={false} tick={{ fill: muted, fontSize: 11 }} dy={8} />
                <YAxis allowDecimals={false} tickCount={4} axisLine={false} tickLine={false} tick={{ fill: muted, fontSize: 10 }} />
                <Tooltip content={<TrendTooltip />} />
                <Area type="linear" dataKey="total" stroke={blue} strokeWidth={3} fill="url(#executiveTrendFill)" connectNulls={false} dot={{ r: 3, fill: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
          <Typography sx={{ ...quiet, fontSize: 10, mt: 1.5 }}>Mes actual en curso · comparación con meses completos</Typography>
        </> : <Box sx={{ minHeight: { xs: 90, sm: 160 }, display: 'flex', alignItems: 'center' }}>
          <Typography sx={quiet}>{data?.errors.deviations ? 'No se pudo consultar la evolución.' : 'La tendencia aparecerá con la próxima carga anual.'}</Typography>
        </Box>}
      </Box>
      <Box component="aside" aria-label="Requiere atención" sx={{ bgcolor: '#f4f6fa', p: { xs: 2.5, lg: 3 }, borderRadius: '4px' }}>
        <Typography component="h2" sx={{ ...heading, mb: 2.5 }}>Requiere atención</Typography>
        {loading ? <Stack spacing={2}>{[1, 2].map((key) => <Skeleton key={key} height={45} />)}</Stack> : alerts.length ? <Stack spacing={3}>
          {alerts.map((item) => <Box key={item.id}>
            <ButtonBase onClick={() => go(item.target)} sx={{ textAlign: 'left', width: '100%', justifyContent: 'space-between', gap: 1, alignItems: 'flex-start', '&.Mui-focusVisible': { outline: `2px solid ${blue}` } }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: item.severity === 'error' ? tones.error : ink, lineHeight: 1.5 }}>{item.title}</Typography>
              <ArrowForwardRounded sx={{ fontSize: 15, color: tones[item.severity], flexShrink: 0, mt: 0.3 }} />
            </ButtonBase>
            <Typography sx={{ ...quiet, fontSize: 11, mt: 0.7 }}>{item.detail}</Typography>
          </Box>)}
        </Stack> : <Typography sx={quiet}>{data ? 'Sin alertas adicionales.' : 'No disponible.'}</Typography>}
      </Box>
    </Box>

    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' }, gap: { xs: 4, md: 7 } }}>
      <Box sx={{ minWidth: 0 }}>
        <SectionHeading title="Sectores principales" action="Análisis anual ↗" onClick={() => go('annualAnalysis')} />
        {loading ? <Skeleton height={100} /> : deviations?.topSectors.length ? <Stack spacing={2.5}>
          {deviations.topSectors.map((sector, index) => <Box key={sector.key}>
            <Stack direction="row" alignItems="baseline" justifyContent="space-between" gap={1} sx={{ mb: 0.8 }}>
              <Typography sx={{ fontSize: 13, color: index === 0 ? blue : ink, fontWeight: index === 0 ? 600 : 400, overflowWrap: 'anywhere' }}>{sector.name}</Typography>
              <Typography sx={{ fontSize: 13, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{number(sector.value)} <Box component="span" sx={{ color: muted, fontSize: 11, ml: 1 }}>{number(sector.share)}%</Box></Typography>
            </Stack>
            <Box role="meter" aria-label={sector.name} aria-valuenow={sector.share} aria-valuemin={0} aria-valuemax={100} sx={{ height: 3, bgcolor: '#eef1f6' }}><Box sx={{ width: `${sector.share}%`, height: '100%', bgcolor: index === 0 ? blue : '#b0bfd4' }} /></Box>
          </Box>)}
        </Stack> : <Typography sx={quiet}>Sin registros del mes.</Typography>}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <SectionHeading title="Próximos vencimientos" action="Ver todos ↗" onClick={() => go('certifications')} />
        {loading || expiredLoading ? <Skeleton height={100} /> : <>
          {certificationItems.length ? <Stack spacing={2.5}>
            {certificationItems.map((item) => {
              const days = item.daysUntilExpiration;
              const color = days <= 7 ? tones.error : days <= 15 ? tones.warning : muted;
              return <ButtonBase key={item.id} onClick={() => go('certifications')} sx={{ width: '100%', textAlign: 'left', justifyContent: 'space-between', gap: 2, '&.Mui-focusVisible': { outline: `2px solid ${blue}` } }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13, color: ink, overflowWrap: 'anywhere' }}>{item.name}</Typography>
                  <Typography sx={{ ...quiet, fontSize: 10, mt: 0.4 }}>{item.expirationDate?.split('-').reverse().join('/')}{item.responsibleArea ? ` · ${item.responsibleArea}` : ''}</Typography>
                </Box>
                <Typography sx={{ fontSize: 11, color, whiteSpace: 'nowrap' }}>{days < 0 ? 'Vencida' : days === 0 ? 'Hoy' : `${days} días`}</Typography>
              </ButtonBase>;
            })}
          </Stack> : <Typography sx={quiet}>{!cert ? 'Agenda no disponible.' : cert.expired ? 'Detalle de vencidas no disponible.' : 'Sin vencimientos próximos.'}</Typography>}
          {cert?.expired > 0 && !expiredItems?.length && <Button onClick={() => go('certifications')} size="small" sx={{ color: blue, px: 0, mt: 1 }}>Consultar certificaciones vencidas ↗</Button>}
        </>}
      </Box>
    </Box>
  </Box>;
}

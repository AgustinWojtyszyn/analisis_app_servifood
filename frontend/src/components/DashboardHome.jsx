import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, Divider, LinearProgress, Skeleton, Stack, Typography
} from '@mui/material';
import {
  ArrowForwardRounded, RefreshRounded, TrendingUpRounded, TrendingDownRounded,
  RemoveRounded, ReportProblemOutlined, BusinessOutlined, AssignmentLateOutlined,
  VerifiedOutlined, NotificationsNoneRounded, ArrowOutwardRounded, CalendarTodayOutlined
} from '@mui/icons-material';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getExecutiveDashboard } from '../services/analysis';

const ink = '#172e3a';
const muted = '#5d6d76';
const border = '#e3e9eb';
const teal = '#137f78';
const number = (value) => value == null ? '—' : value.toLocaleString('es-AR', { maximumFractionDigits: 1 });
const panel = { p: { xs: 2.5, lg: 3.5 }, minWidth: 0 };
const toneColor = { error: '#b63732', warning: '#95601b', info: '#456578', success: '#147564' };

function SectionHeading({ eyebrow, title, action, onClick }) {
  return <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} sx={{ mb: 2.5 }}>
    <Box>
      <Typography sx={{ fontSize: 10, letterSpacing: 1.7, color: muted, fontWeight: 700, mb: 0.65 }}>{eyebrow}</Typography>
      <Typography component="h2" sx={{ fontSize: 19, fontWeight: 750, color: ink }}>{title}</Typography>
    </Box>
    {action && <Button size="small" onClick={onClick} endIcon={<ArrowOutwardRounded sx={{ fontSize: 16 }} />} sx={{ color: teal, flexShrink: 0 }}>{action}</Button>}
  </Stack>;
}

function Metric({ icon: Icon, title, value, helper, tone = 'info', onClick, children, loading }) {
  return <Box sx={{ p: { xs: 1.75, sm: 2.5, lg: 3 }, minWidth: 0 }}>
    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
      <Typography sx={{ fontSize: 12, fontWeight: 650, color: muted, minHeight: { xs: 36, sm: 0 } }}>{title}</Typography>
      <Icon sx={{ fontSize: 20, color: muted, display: { xs: 'none', sm: 'block' } }} />
    </Stack>
    {loading ? <Skeleton width="55%" height={70} /> : <Typography sx={{ fontSize: { xs: 36, md: 40, xl: 48 }, fontWeight: 700, letterSpacing: -2, lineHeight: 1.4, color: ink, fontVariantNumeric: 'tabular-nums' }}>{number(value)}</Typography>}
    <Box sx={{ minHeight: 45 }}>
      {loading ? <Skeleton width="85%" /> : <>
        <Typography sx={{ fontSize: 12, fontWeight: 650, color: toneColor[tone], display: 'flex', gap: 0.5, alignItems: 'center' }}>{children}{helper}</Typography>
      </>}
    </Box>
    <Button size="small" onClick={onClick} endIcon={<ArrowForwardRounded />} sx={{ mt: 0.8, p: 0, color: muted, fontSize: 11, justifyContent: 'flex-start' }}>Ver detalle</Button>
  </Box>;
}

function EmptyState({ title, detail, action, onClick }) {
  return <Box sx={{ py: 4, px: 1, textAlign: 'center' }}>
    <Typography sx={{ fontWeight: 700, color: ink, mb: 0.8 }}>{title}</Typography>
    <Typography sx={{ fontSize: 13, color: muted, maxWidth: 410, mx: 'auto', lineHeight: 1.7 }}>{detail}</Typography>
    {action && <Button onClick={onClick} sx={{ mt: 1.5, color: teal }} endIcon={<ArrowForwardRounded />}>{action}</Button>}
  </Box>;
}

function TrendTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const month = payload[0].payload;
  return <Box sx={{ bgcolor: ink, color: '#fff', p: 1.75, borderRadius: 2, boxShadow: '0 8px 30px #172e3a25' }}>
    <Typography sx={{ fontSize: 12, textTransform: 'capitalize' }}>{month.label}</Typography>
    <Typography sx={{ fontWeight: 750, my: 0.5 }}>{number(month.total)} desvíos</Typography>
    <Typography sx={{ fontSize: 11, color: '#cfdddd' }}>{month.partial ? 'Mes en curso · acumulado parcial' : 'Total mensual registrado'}</Typography>
  </Box>;
}

export default function DashboardHome({ user, onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getExecutiveDashboard({ signal: controller.signal }).then((result) => {
      if (!controller.signal.aborted) setData(result);
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
  const top = deviations?.topSectors?.[0];
  const hasTrend = deviations?.months.some((month) => month.total !== null);
  const previousLabel = deviations?.previous.label || 'mes anterior';
  const changeText = !change ? 'Sin base comparable'
    : change.percentage == null ? `Sin base porcentual · ${previousLabel}: 0`
      : `${change.percentage > 0 ? '+' : ''}${number(change.percentage)}% vs ${previousLabel}`;
  const ChangeIcon = change?.direction === 'up' ? TrendingUpRounded : change?.direction === 'down' ? TrendingDownRounded : RemoveRounded;
  const critical = data?.alerts.filter((item) => item.severity === 'error').length || 0;
  const warnings = data?.alerts.filter((item) => item.severity === 'warning').length || 0;
  const partial = data && (Object.keys(data.errors).length > 0 || deviations?.current.total == null || !nc?.total || !cert?.total || nc?.unknown > 0 || cert?.invalidDates > 0);
  const status = critical ? 'Atención prioritaria' : warnings ? 'Requiere seguimiento' : partial ? 'Información por completar' : 'Resumen actualizado';
  const statusTone = critical ? 'error' : warnings ? 'warning' : 'info';

  return <Box sx={{ bgcolor: '#f7f9f9', borderRadius: '20px', overflow: 'hidden', color: ink, border: `1px solid ${border}` }} aria-busy={loading}>
    <Box sx={{ px: { xs: 2.5, lg: 3.5 }, pt: 3.5, pb: 3 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography sx={{ color: teal, fontSize: 10, letterSpacing: 2.4, fontWeight: 800, mb: 1 }}>SERVIFOOD / DIRECCIÓN</Typography>
          <Typography component="h1" sx={{ fontSize: { xs: 26, md: 32 }, fontWeight: 750, letterSpacing: -1 }}>Dashboard ejecutivo</Typography>
          <Typography sx={{ mt: 0.8, color: muted, fontSize: 13 }}>Hola, {user?.name || 'equipo'}. Estas son las señales que requieren tu atención.</Typography>
        </Box>
        <Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }} justifyContent="center" gap={1}>
          <Button onClick={() => setRevision((value) => value + 1)} disabled={loading} startIcon={<RefreshRounded />} variant="outlined" sx={{ borderColor: border, color: ink, bgcolor: '#fff' }}>Actualizar</Button>
          <Typography sx={{ fontSize: 10, color: muted }} aria-live="polite">
            {loading ? 'Consultando fuentes…' : data ? `Consultado ${new Date(data.generatedAt).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · Argentina` : 'Sin conexión con los indicadores'}
          </Typography>
        </Stack>
      </Stack>
      <Stack direction="row" flexWrap="wrap" gap={1.5} alignItems="center" sx={{ mt: 2.5 }}>
        {!loading && data && <Chip size="small" label={status} sx={{ color: toneColor[statusTone], bgcolor: `${toneColor[statusTone]}10`, border: `1px solid ${toneColor[statusTone]}25`, borderRadius: 5 }} />}
        <Typography sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: muted, fontSize: 12, textTransform: 'capitalize' }}>
          <CalendarTodayOutlined sx={{ fontSize: 15 }} />{deviations?.current.label || 'Mes actual'} · mes en curso
        </Typography>
      </Stack>
    </Box>
    {error && <Alert severity="error" sx={{ mx: 3, mb: 3 }} action={<Button color="inherit" onClick={() => setRevision((value) => value + 1)}>Reintentar</Button>}>{error}</Alert>}
    <Box sx={{ bgcolor: '#fff' }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}`, '& > *:not(:last-child)': { borderRight: `1px solid ${border}` }, '& > *': { borderBottom: { xs: `1px solid ${border}`, lg: 0 } } }}>
        <Metric icon={ReportProblemOutlined} title="Desvíos del mes" value={deviations?.current.total} helper={changeText} tone={change?.direction === 'up' ? 'error' : 'info'} onClick={() => go('annualAnalysis')} loading={loading}>
          {change && <ChangeIcon sx={{ fontSize: 17 }} />}
        </Metric>
        <Metric icon={BusinessOutlined} title="Sector con más desvíos" value={top?.value} helper={!deviations ? 'Información no disponible' : top ? `${top.name} · ${number(top.share)}% del mes` : 'Sin desvíos sectorizados este mes'} tone={top ? 'warning' : 'info'} onClick={() => go('annualAnalysis')} loading={loading} />
        <Metric icon={AssignmentLateOutlined} title="No conformidades abiertas" value={nc?.total ? nc.open : null} helper={!nc ? 'Información no disponible' : !nc.total ? 'Sin registros persistidos' : nc.overdue ? `${number(nc.overdue)} declaradas vencidas` : `${number(nc.total)} NC registradas · sin fechas límite`} tone={nc?.overdue ? 'error' : nc?.open ? 'warning' : 'info'} onClick={() => go('customerNonconformities')} loading={loading} />
        <Metric icon={VerifiedOutlined} title="Certificaciones por vencer" value={cert?.count} helper={!cert ? 'Información no disponible' : cert.expired ? `${number(cert.expired)} ya vencidas · revisar` : 'Próximos 30 días, incluido hoy'} tone={cert?.expired ? 'error' : cert?.count ? 'warning' : 'info'} onClick={() => go('certifications')} loading={loading} />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1.55fr) minmax(310px, 1fr)' } }}>
        <Box sx={{ ...panel, borderRight: { lg: `1px solid ${border}` } }}>
          <SectionHeading eyebrow="EVOLUCIÓN OPERATIVA" title="Tendencia de desvíos" action="Análisis anual" onClick={() => go('annualAnalysis')} />
          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 12, color: muted }}>Últimos 6 meses · menor es mejor</Typography>
            <Stack direction="row" gap={0.8} alignItems="center"><Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: teal }} /><Typography sx={{ fontSize: 11, color: muted }}>Desvíos</Typography></Stack>
          </Stack>
          {loading ? <Skeleton variant="rounded" height={245} /> : hasTrend ? <>
            <Box sx={{ height: 245, width: '100%', minWidth: 0 }} role="img" aria-label={`Evolución mensual: ${deviations.months.map((month) => `${month.label}: ${month.total == null ? 'sin cobertura' : `${month.total} desvíos`}`).join('; ')}. El mes actual es parcial.`}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={deviations.months} margin={{ top: 15, right: 15, left: -25, bottom: 0 }} accessibilityLayer>
                  <defs><linearGradient id="executiveTrendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={teal} stopOpacity={0.18} /><stop offset="100%" stopColor={teal} stopOpacity={0.01} /></linearGradient></defs>
                  <CartesianGrid vertical={false} stroke={border} strokeDasharray="3 5" />
                  <XAxis dataKey="shortLabel" axisLine={false} tickLine={false} tick={{ fill: muted, fontSize: 11 }} dy={8} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: muted, fontSize: 11 }} />
                  <Tooltip content={<TrendTooltip />} />
                  <Area type="linear" dataKey="total" stroke={teal} strokeWidth={2.5} fill="url(#executiveTrendFill)" connectNulls={false} dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
            <Typography sx={{ fontSize: 11, color: muted, mt: 2, lineHeight: 1.6 }}>Mes actual parcial frente a meses completos. Los meses sin cobertura se muestran como interrupciones, no como cero.</Typography>
          </> : <EmptyState title={data?.errors.deviations ? 'No pudimos consultar la evolución' : 'Todavía no hay una tendencia disponible'} detail="El análisis anual alimenta esta vista con el mes real de cada desvío." action="Abrir análisis anual" onClick={() => go('annualAnalysis')} />}
        </Box>
        <Box sx={{ ...panel, bgcolor: '#fbfcfc', borderTop: { xs: `1px solid ${border}`, lg: 0 } }}>
          <SectionHeading eyebrow="PRIORIDADES DE HOY" title="Centro de alertas" />
          {loading ? <Stack spacing={2}>{[1, 2, 3].map((key) => <Skeleton key={key} variant="rounded" height={68} />)}</Stack> : data?.alerts.length ? <Stack spacing={1.2}>
            {data.alerts.map((item) => <Box key={item.id} sx={{ borderLeft: `3px solid ${toneColor[item.severity]}`, pl: 1.6, py: 0.5 }}>
              <Button onClick={() => go(item.target)} sx={{ p: 0, textAlign: 'left', color: ink, fontSize: 12.5, fontWeight: 750, justifyContent: 'flex-start', lineHeight: 1.5 }} endIcon={<ArrowForwardRounded sx={{ fontSize: 14 }} />}>{item.title}</Button>
              <Typography sx={{ fontSize: 10, color: toneColor[item.severity], fontWeight: 700, mt: 0.25 }}>{item.severity === 'error' ? 'PRIORITARIA' : item.severity === 'warning' ? 'SEGUIMIENTO' : 'INFORMACIÓN'}</Typography>
              <Typography sx={{ fontSize: 11.5, color: muted, mt: 0.35, lineHeight: 1.6 }}>{item.detail}</Typography>
            </Box>)}
          </Stack> : <EmptyState title="Alertas no disponibles" detail="Actualizá el dashboard para consultar las prioridades." />}
          <Stack direction="row" gap={0.7} sx={{ mt: 2, color: muted }}><NotificationsNoneRounded sx={{ fontSize: 14 }} /><Typography sx={{ fontSize: 10 }}>Señales automáticas de los registros disponibles.</Typography></Stack>
        </Box>
      </Box>

      <Divider sx={{ borderColor: border }} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) minmax(0, 1fr)' } }}>
        <Box sx={{ ...panel, borderRight: { lg: `1px solid ${border}` } }}>
          <SectionHeading eyebrow="DÓNDE ACTUAR" title="Sectores con más problemas" />
          {loading ? <Skeleton variant="rounded" height={190} /> : deviations?.topSectors.length ? <Stack spacing={2.5}>
            {deviations.topSectors.map((sector, index) => <Box key={sector.key}>
              <Stack direction="row" justifyContent="space-between" gap={1} alignItems="center" sx={{ mb: 1 }}>
                <Stack direction="row" gap={1} alignItems="center" sx={{ minWidth: 0 }}>
                  <Typography sx={{ color: index === 0 ? '#95601b' : muted, fontSize: 12, fontWeight: 750 }}>0{index + 1}</Typography>
                  <Box sx={{ minWidth: 0 }}><Typography sx={{ fontSize: 13, fontWeight: 700, overflowWrap: 'anywhere' }}>{sector.name}</Typography>{index === 0 && <Typography sx={{ fontSize: 10, color: '#95601b' }}>Mayor concentración del mes</Typography>}</Box>
                </Stack>
                <Typography sx={{ fontWeight: 750, fontSize: 14, whiteSpace: 'nowrap' }}>{number(sector.value)} <Box component="span" sx={{ color: muted, fontWeight: 400, fontSize: 11 }}>· {number(sector.share)}%</Box></Typography>
              </Stack>
              <LinearProgress variant="determinate" value={sector.share} aria-label={`${sector.name}: ${number(sector.share)}% de los desvíos del mes`} sx={{ height: 5, borderRadius: 3, bgcolor: '#edf1f2', '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: index === 0 ? '#b98235' : '#829d9c' } }} />
            </Box>)}
            <Typography sx={{ fontSize: 11, color: muted }}>Top 3 · distribución sobre los {number(deviations.current.total)} desvíos del mes.</Typography>
          </Stack> : <EmptyState title="Sin ranking para este mes" detail="El ranking estará disponible cuando existan desvíos sectorizados con cobertura mensual." />}
        </Box>
        <Box sx={{ ...panel, borderTop: { xs: `1px solid ${border}`, lg: 0 } }}>
          <SectionHeading eyebrow="AGENDA DE CUMPLIMIENTO" title="Próximos vencimientos" action="Ver todos" onClick={() => go('certifications')} />
          {loading ? <Skeleton variant="rounded" height={190} /> : cert?.urgent.length ? <Stack divider={<Divider sx={{ borderColor: border }} />} spacing={1.7}>
            {cert.urgent.map((item) => {
              const color = item.daysUntilExpiration <= 7 ? toneColor.error : item.daysUntilExpiration <= 15 ? toneColor.warning : toneColor.success;
              const days = item.daysUntilExpiration === 0 ? 'Hoy' : `${item.daysUntilExpiration} días`;
              return <Stack key={item.id} direction="row" alignItems="center" justifyContent="space-between" gap={1.5}>
                <Box sx={{ minWidth: 0 }}><Typography sx={{ fontSize: 13, fontWeight: 700, overflowWrap: 'anywhere' }}>{item.name}</Typography><Typography sx={{ fontSize: 11, color: muted, mt: 0.6 }}>{item.expirationDate.split('-').reverse().join('/')} · {item.responsibleArea || item.responsiblePerson || 'Sin responsable asignado'}</Typography></Box>
                <Chip size="small" label={days} sx={{ flexShrink: 0, color, bgcolor: `${color}10`, fontSize: 11, border: `1px solid ${color}25` }} />
              </Stack>;
            })}
          </Stack> : <EmptyState title={!cert ? 'Agenda no disponible' : cert.total ? 'Sin vencimientos en los próximos 30 días' : 'Sin certificaciones registradas'} detail={cert?.expired ? `${cert.expired} certificaciones ya vencieron. Revisá su renovación.` : 'Consultá las certificaciones y sus responsables desde el módulo.'} />}
          {cert?.urgent.length > 0 && <Typography sx={{ mt: 2, fontSize: 10, color: muted }}>Urgente ≤ 7 días · próximo ≤ 15 días · programado ≤ 30 días</Typography>}
        </Box>
      </Box>
    </Box>
    <Box sx={{ px: { xs: 2.5, lg: 3.5 }, py: 2, borderTop: `1px solid ${border}` }}>
      <Typography sx={{ fontSize: 10.5, color: muted, lineHeight: 1.8 }}>Fuentes: última carga anual de cada año · NC persistidas · certificaciones. Las cargas de análisis individuales se consultan en Historial.</Typography>
      {deviations?.sources.map((source) => <Typography key={source.id} sx={{ fontSize: 10, color: muted, overflowWrap: 'anywhere' }}>Anual {source.year}: {source.filename} · cargado {new Date(source.uploadedAt).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</Typography>)}
      {nc?.unknown > 0 && <Typography sx={{ fontSize: 11, color: toneColor.warning, mt: 0.5 }}>{nc.unknown} NC sin estado reconocido: no se incluyen como abiertas ni cerradas.</Typography>}
      {cert?.invalidDates > 0 && <Typography sx={{ fontSize: 11, color: toneColor.warning, mt: 0.5 }}>{cert.invalidDates} certificaciones sin fecha válida: no se pueden evaluar sus vencimientos.</Typography>}
      <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
        {[['upload', 'Cargar archivos'], ['history', 'Historial'], ['charts', 'Comparar períodos'], ['customerNonconformities', 'NC Clientes']].map(([target, label]) => <Button key={target} size="small" onClick={() => go(target)} sx={{ color: teal, fontSize: 11 }}>{label}</Button>)}
      </Stack>
    </Box>
  </Box>;
}

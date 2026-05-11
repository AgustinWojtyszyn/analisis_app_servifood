import React, { useMemo } from 'react';
import { Box, Card, CardContent, Grid, Typography } from '@mui/material';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

const palette = ['#1d4ed8', '#2563eb', '#0f766e', '#ea580c', '#7c3aed', '#0284c7', '#dc2626', '#334155', '#16a34a'];
const AREA_FALLBACK = 'Área no identificada';
const PIE_COLORS = ['#1d4ed8', '#0f766e', '#ea580c', '#7c3aed', '#0284c7', '#dc2626'];
const TEXT_PRIMARY = '#0f172a';
const TEXT_SECONDARY = '#334155';
const TEXT_MUTED = '#475569';

function normalizeCategoryKey(value) {
  const raw = String(value || '').trim().toLowerCase();
  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!normalized) return 'Revisar manualmente';
  if (normalized.includes('legal')) return 'Legales';
  if (normalized.includes('logistica')) return 'Logística';
  if (normalized.includes('inocuidad')) return 'Inocuidad';
  if (normalized.includes('mantenimiento')) return 'Mantenimiento';
  if (normalized.includes('rrhh') || normalized.includes('recursos humanos') || normalized.includes('personal')) return 'Recursos Humanos';
  if (normalized.includes('calidad')) return 'Calidad';
  return 'Revisar manualmente';
}

function normalizeArea(value) {
  const raw = String(value || '').trim();
  if (!raw) return AREA_FALLBACK;
  return raw;
}

function pickFirstValue(record = {}, keys = []) {
  for (const key of keys) {
    const value = record?.[key];
    if (value != null && String(value).trim() !== '') return value;
  }
  return '';
}

function normalizeIsoKey(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (!normalized || normalized === '-' || normalized.includes('revisar manualmente') || normalized.includes('revision manual')) return '';
  return raw;
}

function shortLabel(value, max = 26) {
  const text = String(value || '').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function abbreviateAreaLabel(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return AREA_FALLBACK;
  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (/^area de pre elaborados$/i.test(normalized) || /^área de pre elaborados$/i.test(raw)) return 'Pre elaborados';
  if (/adium/i.test(raw)) return 'Adium';
  return shortLabel(raw, 20);
}

function abbreviateIsoLabel(value = '') {
  const raw = String(value || '').trim();
  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (!raw) return '';
  if (normalized.includes('8.5') && (normalized.includes('haccp') || normalized.includes('oprp') || normalized.includes('pcc'))) return '8.5 HACCP';
  if (normalized.includes('8.2') && normalized.includes('prp')) return '8.2 PRP';
  if (normalized.includes('7.5') && normalized.includes('informacion documentada')) return '7.5 Documentación';
  if (normalized.includes('7.2') && normalized.includes('competencia')) return '7.2 Competencia';
  if (normalized.includes('9.2') && normalized.includes('auditoria')) return '9.2 Auditoría';
  return shortLabel(raw, 30);
}

function wrapIsoLabelLines(value = '') {
  const short = abbreviateIsoLabel(value);
  if (short.length <= 22) return [short];
  const words = short.split(' ');
  const lines = [];
  let current = '';
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > 22) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines.slice(0, 2);
}

function normalizeAreaDisplayName(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return AREA_FALLBACK;
  const noParens = raw.replace(/\s*\(.+?\)\s*/g, '').trim();
  const normalized = noParens
    .replace(/^area de pre elaborados$/i, 'Pre elaborados')
    .replace(/^área de pre elaborados$/i, 'Pre elaborados')
    .replace(/^area de residuos$/i, 'Residuos')
    .replace(/^área de residuos$/i, 'Residuos');
  return normalized || AREA_FALLBACK;
}

function buildTopWithOthers(items = [], maxItems = 8) {
  const sorted = [...items].sort((a, b) => Number(b.value || 0) - Number(a.value || 0));
  if (sorted.length <= maxItems) return sorted;
  const head = sorted.slice(0, maxItems);
  const tail = sorted.slice(maxItems);
  const others = tail.reduce((acc, item) => acc + Number(item.value || 0), 0);
  return others > 0 ? [...head, { name: 'Otros', value: others }] : head;
}

function IsoYAxisTick({ x, y, payload }) {
  const lines = wrapIsoLabelLines(payload?.value || '');
  return (
    <g transform={`translate(${x},${y})`}>
      {lines.map((line, idx) => (
        <text
          key={`${payload?.value}-${idx}`}
          x={0}
          y={idx * 16}
          dy={5}
          textAnchor="end"
          fill={TEXT_PRIMARY}
          fontSize={13}
          fontWeight={700}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

function piePercentLabel({ percent = 0 }) {
  if (!percent || percent < 0.04) return '';
  return `${Math.round(percent * 100)}%`;
}

function tooltipStyle() {
  return {
    contentStyle: {
      backgroundColor: '#ffffff',
      border: '1px solid #cbd5e1',
      borderRadius: 10,
      color: TEXT_PRIMARY,
      fontWeight: 700,
      fontSize: 13
    },
    labelStyle: { color: TEXT_PRIMARY, fontWeight: 800, fontSize: 13 },
    itemStyle: { color: TEXT_SECONDARY, fontWeight: 700, fontSize: 13 }
  };
}

function objectToChartData(mapObject = {}) {
  return Object.entries(mapObject)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function splitAreas(areaClasificada) {
  return String(areaClasificada || '')
    .split(/[\/,]/)
    .map((area) => area.trim())
    .filter(Boolean);
}

function normalizeEstadoAccion(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw || raw === '-') return null;
  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');

  if (!normalized || normalized === '-') return null;
  if (normalized === 'abierta' || normalized === 'abierto') return 'abierto';
  if (normalized === 'cerrada' || normalized === 'cerrado') return 'cerrado';
  return null;
}

function normalizeEstadoAccionFromRecord(record = {}) {
  const value = pickFirstValue(record, ['estadoAcciones', 'estadoAccion', 'estado', 'actionStatus', 'status']);
  return normalizeEstadoAccion(value);
}

export default function ChartsPage({ records = [], summary = null, analysisTotalRecords = 0 }) {
  const hasAnalysisData = useMemo(() => {
    const totalRegistros = Number(summary?.totalRegistros ?? summary?.totalRecords ?? 0);
    const totalAnalisis = Number(analysisTotalRecords || 0);
    const totalDesvios = Number(summary?.totalDesvios ?? 0);
    const categorias = (
      Number(summary?.totalInocuidad ?? 0) +
      Number(summary?.totalLogistica ?? 0) +
      Number(summary?.totalCalidad ?? 0) +
      Number(summary?.totalLegal ?? 0) +
      Number(summary?.totalMantenimiento ?? 0) +
      Number(summary?.totalRRHH ?? 0)
    );
    return (
      (Array.isArray(records) && records.length > 0) ||
      totalAnalisis > 0 ||
      totalRegistros > 0 ||
      totalDesvios > 0 ||
      categorias > 0
    );
  }, [records, summary, analysisTotalRecords]);

  const data = useMemo(() => {
    const safeSummary = summary || {};
    const fallbackByArea = {};
    const fallbackByCategoria = {};
    const fallbackByIso = {};
    const fallbackActions = { abierto: 0, cerrado: 0 };
    records.forEach((record) => {
      const categoria = String(
        pickFirstValue(record, ['clasificacionDesvio', 'classification_normalized', 'categoriaDesvio', 'classification_original'])
      ).trim();
      const iso = normalizeIsoKey(
        pickFirstValue(record, ['relacionIso22000', 'relacionISO', 'isoRelation', 'iso22000', 'iso'])
      );
      const estadoAccion = normalizeEstadoAccionFromRecord(record);
      if (categoria) {
        const canonical = normalizeCategoryKey(categoria);
        fallbackByCategoria[canonical] = (fallbackByCategoria[canonical] || 0) + 1;
      }

      const areaRaw = pickFirstValue(record, ['areaSector', 'area_sector', 'area_normalized', 'areaClasificada', 'area', 'sector']);
      const areaList = splitAreas(areaRaw);
      if (areaList.length === 0) {
        fallbackByArea[AREA_FALLBACK] = (fallbackByArea[AREA_FALLBACK] || 0) + 1;
      } else {
        areaList.map(normalizeArea).forEach((areaItem) => {
          fallbackByArea[areaItem] = (fallbackByArea[areaItem] || 0) + 1;
        });
      }

      if (iso) {
        fallbackByIso[iso] = (fallbackByIso[iso] || 0) + 1;
      }

      if (estadoAccion === 'cerrado') fallbackActions.cerrado += 1;
      if (estadoAccion === 'abierto') fallbackActions.abierto += 1;
    });

    const hasRecords = Array.isArray(records) && records.length > 0;
    const summaryByArea = safeSummary.byArea && Object.keys(safeSummary.byArea).length > 0 ? safeSummary.byArea : null;
    const summaryByCategoria = safeSummary.byCategoria && Object.keys(safeSummary.byCategoria).length > 0 ? safeSummary.byCategoria : null;
    const summaryByIso = safeSummary.byIso22000 && Object.keys(safeSummary.byIso22000).length > 0 ? safeSummary.byIso22000 : null;

    const desviosPorAreaRaw = objectToChartData(hasRecords ? fallbackByArea : (summaryByArea || fallbackByArea))
      .map((item) => ({ ...item, name: normalizeAreaDisplayName(item.name) }));
    const areaMerged = Object.values(
      desviosPorAreaRaw.reduce((acc, item) => {
        const key = item.name;
        if (!acc[key]) acc[key] = { name: key, value: 0 };
        acc[key].value += Number(item.value || 0);
        return acc;
      }, {})
    );
    const desviosPorArea = buildTopWithOthers(areaMerged, 6);
    const categoriaRaw = hasRecords ? fallbackByCategoria : (summaryByCategoria || fallbackByCategoria);
    const categoriasCompletas = {
      Legales: Number(categoriaRaw.Legales ?? categoriaRaw['Desvío Legal'] ?? safeSummary.totalLegal ?? 0),
      'Logística': Number(categoriaRaw['Logística'] ?? categoriaRaw['Desvío de Logística'] ?? safeSummary.totalLogistica ?? 0),
      Calidad: Number(categoriaRaw.Calidad ?? categoriaRaw['Desvío de Calidad'] ?? safeSummary.totalCalidad ?? 0),
      Mantenimiento: Number(categoriaRaw.Mantenimiento ?? categoriaRaw['Desvío de Mantenimiento'] ?? 0),
      Inocuidad: Number(categoriaRaw.Inocuidad ?? categoriaRaw['Desvío de Inocuidad'] ?? safeSummary.totalInocuidad ?? 0),
      'Recursos Humanos': Number(categoriaRaw['Recursos Humanos'] ?? categoriaRaw['Desvío de Recursos Humanos'] ?? 0)
    };
    const desviosPorCategoria = objectToChartData(categoriasCompletas).filter((item) => item.value > 0);
    const desviosPorCategoriaCompleta = objectToChartData(categoriasCompletas).filter((item) => item.value > 0);
    const isoRaw = hasRecords ? fallbackByIso : (summaryByIso || fallbackByIso);
    const isoFiltered = Object.fromEntries(
      Object.entries(isoRaw).filter(([key]) => normalizeIsoKey(key))
    );
    const desviosPorIso = buildTopWithOthers(objectToChartData(isoFiltered), 10);

    const resumenHallazgos = [
      { name: 'Desvíos reales', value: Number(safeSummary.totalDesvios || 0) },
      { name: 'Inocuidad', value: Number(safeSummary.totalInocuidad || 0) },
      { name: 'Logística', value: Number(safeSummary.totalLogistica || 0) },
      { name: 'Calidad', value: Number(safeSummary.totalCalidad || 0) },
      { name: 'Legal', value: Number(safeSummary.totalLegal || 0) },
      { name: 'Rev. manual', value: Number(safeSummary.totalRevisionManual || 0) }
    ];

    const summaryHasActions = !hasRecords && safeSummary.actions && (
      Number(safeSummary.actions.abiertas ?? 0) > 0 || Number(safeSummary.actions.cerradas ?? 0) > 0
    );
    const estadoAcciones = [
      { name: 'Abierto', value: Number(summaryHasActions ? (safeSummary.actions?.abiertas ?? 0) : fallbackActions.abierto) },
      { name: 'Cerrado', value: Number(summaryHasActions ? (safeSummary.actions?.cerradas ?? 0) : fallbackActions.cerrado) }
    ];
    const estadoAccionesActivos = estadoAcciones.filter((item) => Number(item.value || 0) > 0);
    const estadoSingle = estadoAccionesActivos.length === 1 ? estadoAccionesActivos[0] : null;

    return {
      resumenHallazgos,
      desviosPorArea,
      desviosPorCategoria,
      desviosPorCategoriaCompleta,
      desviosPorIso,
      estadoAcciones,
      estadoSingle,
      totalRecords: Number(safeSummary.totalRecords || records.length || 0)
    };
  }, [records, summary]);

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
    <Box>
      <Grid container spacing={2.25} sx={{ mb: 0.5 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography sx={{ fontWeight: 800, mb: 1.5, color: TEXT_PRIMARY, fontSize: 17 }}>Resumen de hallazgos</Typography>
              <Grid container spacing={1.5}>
                {data.resumenHallazgos.map((item) => (
                  <Grid item xs={6} sm={4} md={2.4} key={item.name}>
                    <Box sx={{ borderRadius: 2, p: 1.5, border: '1px solid', borderColor: 'divider', backgroundColor: 'rgba(248,250,252,0.9)' }}>
                      <Typography variant="body2" sx={{ color: TEXT_SECONDARY, fontWeight: 700 }}>{item.name}</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 900, color: TEXT_PRIMARY }}>{item.value}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2.25}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 1.75 }}>
              <Typography sx={{ fontWeight: 900, mb: 2, color: TEXT_PRIMARY, fontSize: 17 }}>Desvíos por área</Typography>
              <Box sx={{ width: '100%', height: data.desviosPorArea.length === 0 ? 165 : 360 }}>
                {data.desviosPorArea.length === 0 ? (
                  <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                    No hay datos por área
                  </Box>
                ) : (
                  <ResponsiveContainer>
                    <BarChart data={data.desviosPorArea} layout="vertical" margin={{ top: 8, right: 12, left: 8, bottom: 8 }} barCategoryGap={16}>
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 13, fontWeight: 700, fill: TEXT_MUTED }} />
                      <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 13, fontWeight: 700, fill: TEXT_PRIMARY }} tickFormatter={(value) => abbreviateAreaLabel(value)} />
                      <Tooltip {...tooltipStyle()} formatter={(value) => [value, 'Cantidad']} labelFormatter={(label) => String(label || '')} />
                      <Bar dataKey="value" radius={[0, 7, 7, 0]}>
                        {data.desviosPorArea.map((entry, idx) => (
                          <Cell key={entry.name} fill={palette[idx % palette.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 1.75 }}>
              <Typography sx={{ fontWeight: 900, mb: 2, color: TEXT_PRIMARY, fontSize: 17 }}>Desvíos por categoría</Typography>
              <Box sx={{ width: '100%', height: data.desviosPorCategoria.length === 0 ? 165 : 260 }}>
                {data.desviosPorCategoria.length === 0 ? (
                  <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                    No hay datos por categoría
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', gap: 1.5 }}>
                    <Box sx={{ flex: '0 0 54%', minWidth: 0, height: '100%' }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={data.desviosPorCategoria} dataKey="value" nameKey="name" outerRadius={74} label={piePercentLabel} labelLine={false}>
                            {data.desviosPorCategoria.map((entry, idx) => (
                              <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip {...tooltipStyle()} formatter={(value) => [value, 'Cantidad']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                      {data.desviosPorCategoria.map((item, idx) => (
                        <Box key={item.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '999px', backgroundColor: PIE_COLORS[idx % PIE_COLORS.length], flexShrink: 0 }} />
                          <Typography variant="body2" sx={{ fontWeight: 800, color: TEXT_PRIMARY, minWidth: 0, fontSize: 13.5 }}>
                            {item.name}: {item.value}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 1.75 }}>
              <Typography sx={{ fontWeight: 900, mb: 2, color: TEXT_PRIMARY, fontSize: 17 }}>Desvíos por categoría (barras)</Typography>
              <Box sx={{ width: '100%', height: data.desviosPorCategoriaCompleta.length === 0 ? 165 : 340 }}>
                {data.desviosPorCategoriaCompleta.length === 0 ? (
                  <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                    No hay datos por categoría
                  </Box>
                ) : (
                  <ResponsiveContainer>
                    <BarChart data={data.desviosPorCategoriaCompleta} layout="vertical" margin={{ top: 6, right: 10, left: 6, bottom: 8 }} barCategoryGap={18}>
                      <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 13, fontWeight: 800, fill: TEXT_PRIMARY }} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 13, fontWeight: 700, fill: TEXT_MUTED }} />
                      <Tooltip {...tooltipStyle()} formatter={(value) => [value, 'Cantidad']} labelFormatter={(label) => String(label || '')} />
                      <Bar dataKey="value" fill="#1d4ed8" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 1.75 }}>
              <Typography sx={{ fontWeight: 900, mb: 2, color: TEXT_PRIMARY, fontSize: 17 }}>Estado de acciones</Typography>
              <Box sx={{ width: '100%', height: data.estadoAcciones.every((item) => item.value === 0) ? 165 : 270 }}>
                {data.estadoAcciones.every((item) => item.value === 0) ? (
                  <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                    No hay estados de acción registrados
                  </Box>
                ) : data.estadoSingle ? (
                  <Box
                    sx={{
                      height: '100%',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: 'rgba(248,250,252,0.75)'
                    }}
                  >
                    <Typography variant="h4" sx={{ fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                      {data.estadoSingle.value}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 800, color: TEXT_PRIMARY, mt: 0.75, fontSize: 18 }}>
                      {`${data.estadoSingle.name.toLowerCase()}${Number(data.estadoSingle.value) === 1 ? '' : 's'}`}
                    </Typography>
                    <Typography variant="body2" sx={{ color: TEXT_MUTED, mt: 1, fontWeight: 700 }}>
                      {`0 ${data.estadoSingle.name.toLowerCase() === 'cerrado' ? 'abiertos' : 'cerrados'}`}
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={data.estadoAcciones}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={data.estadoSingle ? 68 : 82}
                          innerRadius={data.estadoSingle ? 42 : 0}
                          label={data.estadoSingle ? false : piePercentLabel}
                          labelLine={false}
                        >
                          {data.estadoAcciones.map((entry, idx) => (
                            <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        {data.estadoSingle && (
                          <text x="50%" y="51%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 12, fontWeight: 700, fill: '#0f172a' }}>
                            {`${data.estadoSingle.value} ${data.estadoSingle.name.toLowerCase()}${Number(data.estadoSingle.value) === 1 ? '' : 's'}`}
                          </text>
                        )}
                        <Tooltip {...tooltipStyle()} formatter={(value) => [value, 'Cantidad']} />
                      </PieChart>
                    </ResponsiveContainer>
                    <Box sx={{ mt: 1.25, display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
                      {(data.estadoSingle ? [data.estadoSingle] : data.estadoAcciones).map((item, idx) => (
                        <Typography key={item.name} variant="body2" sx={{ color: TEXT_PRIMARY, fontWeight: 800, fontSize: 13.5 }}>
                          {item.name}: {item.value}
                        </Typography>
                      ))}
                    </Box>
                  </>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 1.75 }}>
              <Typography sx={{ fontWeight: 900, mb: 2, color: TEXT_PRIMARY, fontSize: 17 }}>Vinculación con requisitos ISO 22000</Typography>
              <Box sx={{ width: '100%', height: data.desviosPorIso.length === 0 ? 170 : 640 }}>
                {data.desviosPorIso.length === 0 ? (
                  <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                    No hay datos ISO
                  </Box>
                ) : (
                  <ResponsiveContainer>
                    <BarChart data={data.desviosPorIso} layout="vertical" margin={{ top: 8, right: 16, left: 18, bottom: 8 }} barCategoryGap={24}>
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 13, fontWeight: 700, fill: TEXT_MUTED }} />
                      <YAxis type="category" dataKey="name" width={280} tick={<IsoYAxisTick />} />
                      <Tooltip {...tooltipStyle()} formatter={(value) => [value, 'Cantidad']} labelFormatter={(label) => String(label || '')} />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                        {data.desviosPorIso.map((entry, idx) => (
                          <Cell key={entry.name} fill={palette[idx % palette.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Box>
              <Typography variant="body2" sx={{ mt: 1, color: TEXT_MUTED, fontWeight: 700, fontSize: 13.5 }}>
                Total analizado: {data.totalRecords}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

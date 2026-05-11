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
      const categoria = String(record.clasificacionDesvio || record.classification_normalized || record.categoriaDesvio || '').trim();
      const iso = normalizeIsoKey(record.relacionIso22000 || record.iso22000);
      const estadoAccion = normalizeEstadoAccion(record.estadoAcciones || record.estadoAccion);
      if (categoria) {
        const canonical = normalizeCategoryKey(categoria);
        fallbackByCategoria[canonical] = (fallbackByCategoria[canonical] || 0) + 1;
      }

      const areaRaw = record.areaSector || record.area_sector || record.area_normalized || record.areaClasificada || record.area;
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

    const summaryByArea = safeSummary.byArea && Object.keys(safeSummary.byArea).length > 0 ? safeSummary.byArea : null;
    const summaryByCategoria = safeSummary.byCategoria && Object.keys(safeSummary.byCategoria).length > 0 ? safeSummary.byCategoria : null;
    const summaryByIso = safeSummary.byIso22000 && Object.keys(safeSummary.byIso22000).length > 0 ? safeSummary.byIso22000 : null;

    const desviosPorArea = objectToChartData(summaryByArea || fallbackByArea);
    const categoriaRaw = summaryByCategoria || fallbackByCategoria;
    const categoriasCompletas = {
      Legales: Number(categoriaRaw.Legales ?? categoriaRaw['Desvío Legal'] ?? safeSummary.totalLegal ?? 0),
      'Logística': Number(categoriaRaw['Logística'] ?? categoriaRaw['Desvío de Logística'] ?? safeSummary.totalLogistica ?? 0),
      Calidad: Number(categoriaRaw.Calidad ?? categoriaRaw['Desvío de Calidad'] ?? safeSummary.totalCalidad ?? 0),
      Mantenimiento: Number(categoriaRaw.Mantenimiento ?? categoriaRaw['Desvío de Mantenimiento'] ?? 0),
      Inocuidad: Number(categoriaRaw.Inocuidad ?? categoriaRaw['Desvío de Inocuidad'] ?? safeSummary.totalInocuidad ?? 0),
      'Recursos Humanos': Number(categoriaRaw['Recursos Humanos'] ?? categoriaRaw['Desvío de Recursos Humanos'] ?? 0)
    };
    const desviosPorCategoria = objectToChartData(categoriasCompletas).filter((item) => item.value > 0);
    const desviosPorCategoriaCompleta = objectToChartData(categoriasCompletas);
    const isoRaw = summaryByIso || fallbackByIso;
    const isoFiltered = Object.fromEntries(
      Object.entries(isoRaw).filter(([key]) => normalizeIsoKey(key))
    );
    const desviosPorIso = objectToChartData(isoFiltered);

    const resumenHallazgos = [
      { name: 'Desvíos reales', value: Number(safeSummary.totalDesvios || 0) },
      { name: 'Inocuidad', value: Number(safeSummary.totalInocuidad || 0) },
      { name: 'Logística', value: Number(safeSummary.totalLogistica || 0) },
      { name: 'Calidad', value: Number(safeSummary.totalCalidad || 0) },
      { name: 'Legal', value: Number(safeSummary.totalLegal || 0) },
      { name: 'Rev. manual', value: Number(safeSummary.totalRevisionManual || 0) }
    ];

    const summaryHasActions = safeSummary.actions && (
      Number(safeSummary.actions.abiertas ?? 0) > 0 || Number(safeSummary.actions.cerradas ?? 0) > 0
    );
    const estadoAcciones = [
      { name: 'Abierto', value: Number(summaryHasActions ? (safeSummary.actions?.abiertas ?? 0) : fallbackActions.abierto) },
      { name: 'Cerrado', value: Number(summaryHasActions ? (safeSummary.actions?.cerradas ?? 0) : fallbackActions.cerrado) }
    ];

    return {
      resumenHallazgos,
      desviosPorArea,
      desviosPorCategoria,
      desviosPorCategoriaCompleta,
      desviosPorIso,
      estadoAcciones,
      totalRecords: Number(safeSummary.totalRecords || records.length || 0)
    };
  }, [records, summary]);

  if (!hasAnalysisData) {
    return (
      <Card>
        <CardContent sx={{ p: 3.5, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
            No hay datos suficientes para mostrar gráficos
          </Typography>
          <Typography color="text.secondary">
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
              <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Resumen de hallazgos</Typography>
              <Grid container spacing={1.5}>
                {data.resumenHallazgos.map((item) => (
                  <Grid item xs={6} sm={4} md={2.4} key={item.name}>
                    <Box sx={{ borderRadius: 2, p: 1.5, border: '1px solid', borderColor: 'divider', backgroundColor: 'rgba(248,250,252,0.9)' }}>
                      <Typography variant="body2" color="text.secondary">{item.name}</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 800 }}>{item.value}</Typography>
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
            <CardContent sx={{ p: 2.5 }}>
              <Typography sx={{ fontWeight: 700, mb: 2 }}>Desvíos por área</Typography>
              <Box sx={{ width: '100%', height: 320 }}>
                {data.desviosPorArea.length === 0 ? (
                  <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                    No hay datos por área
                  </Box>
                ) : (
                  <ResponsiveContainer>
                    <BarChart data={data.desviosPorArea} margin={{ top: 8, right: 12, left: 4, bottom: 54 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} tickFormatter={(value) => shortLabel(value, 20)} interval={0} angle={-18} textAnchor="end" height={78} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
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
            <CardContent sx={{ p: 2.5 }}>
              <Typography sx={{ fontWeight: 700, mb: 2 }}>Desvíos por categoría</Typography>
              <Box sx={{ width: '100%', height: 320 }}>
                {data.desviosPorCategoria.length === 0 ? (
                  <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                    No hay datos por categoría
                  </Box>
                ) : (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={data.desviosPorCategoria} dataKey="value" nameKey="name" outerRadius={105} label>
                        {data.desviosPorCategoria.map((entry, idx) => (
                          <Cell key={entry.name} fill={palette[idx % palette.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                )}
                {data.desviosPorCategoria.length > 0 && (
                  <Box sx={{ mt: 1.25, display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
                    {data.desviosPorCategoria.map((item, idx) => (
                      <Typography key={item.name} variant="body2" sx={{ color: palette[idx % palette.length], fontWeight: 700 }}>
                        {item.name}: {item.value}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography sx={{ fontWeight: 700, mb: 2 }}>Desvíos por categoría (barras)</Typography>
              <Box sx={{ width: '100%', height: 320 }}>
                {data.desviosPorCategoriaCompleta.length === 0 ? (
                  <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                    No hay datos por categoría
                  </Box>
                ) : (
                  <ResponsiveContainer>
                    <BarChart data={data.desviosPorCategoriaCompleta} margin={{ top: 8, right: 12, left: 4, bottom: 54 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} tickFormatter={(value) => shortLabel(value, 18)} interval={0} angle={-18} textAnchor="end" height={78} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#1d4ed8" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography sx={{ fontWeight: 700, mb: 2 }}>Estado de acciones</Typography>
              <Box sx={{ width: '100%', height: 320 }}>
                {data.estadoAcciones.every((item) => item.value === 0) ? (
                  <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                    No hay estados de acción registrados
                  </Box>
                ) : (
                  <>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={data.estadoAcciones} dataKey="value" nameKey="name" outerRadius={105} label>
                          {data.estadoAcciones.map((entry, idx) => (
                            <Cell key={entry.name} fill={palette[idx % palette.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <Box sx={{ mt: 1.25, display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
                      {data.estadoAcciones.map((item, idx) => (
                        <Typography key={item.name} variant="body2" sx={{ color: palette[idx % palette.length], fontWeight: 700 }}>
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
            <CardContent sx={{ p: 2.5 }}>
              <Typography sx={{ fontWeight: 700, mb: 2 }}>Vinculación con requisitos ISO 22000</Typography>
              <Box sx={{ width: '100%', height: 340 }}>
                {data.desviosPorIso.length === 0 ? (
                  <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                    No hay datos ISO
                  </Box>
                ) : (
                  <ResponsiveContainer>
                    <BarChart data={data.desviosPorIso} margin={{ top: 8, right: 12, left: 4, bottom: 70 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} tickFormatter={(value) => shortLabel(value, 28)} interval={0} angle={-20} textAnchor="end" height={98} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {data.desviosPorIso.map((entry, idx) => (
                          <Cell key={entry.name} fill={palette[idx % palette.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Total analizado: {data.totalRecords}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

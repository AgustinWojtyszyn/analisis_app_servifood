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

function objectToChartData(mapObject = {}) {
  return Object.entries(mapObject)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function splitAreas(areaClasificada) {
  return String(areaClasificada || '')
    .split(',')
    .map((area) => area.trim())
    .filter(Boolean);
}

export default function ChartsPage({ records = [], summary = null }) {
  const data = useMemo(() => {
    const safeSummary = summary || {};
    const deriveFromRecords = !summary || (!summary.byArea && !summary.byCategoria && !summary.byIso22000);

    const fallbackByArea = {};
    const fallbackByCategoria = {};
    const fallbackByIso = {};
    const fallbackActions = { abiertas: 0, cerradas: 0, enProceso: 0, sinAccion: 0 };

    if (deriveFromRecords) {
      records.forEach((record) => {
        const area = String(record.areaClasificada || '').trim();
        const categoria = String(record.categoriaDesvio || '').trim();
        const iso = String(record.iso22000 || '').trim();
        const estadoAccion = String(record.estadoAccion || '').trim();
        const resultadoClasificado = String(record.resultadoClasificado || '').trim();
        if (categoria) fallbackByCategoria[categoria] = (fallbackByCategoria[categoria] || 0) + 1;

        if (area && resultadoClasificado !== 'Conforme') {
          const areaList = splitAreas(area);
          areaList.forEach((areaItem) => {
            fallbackByArea[areaItem] = (fallbackByArea[areaItem] || 0) + 1;
          });
        }

        if (iso && resultadoClasificado !== 'Conforme') {
          fallbackByIso[iso] = (fallbackByIso[iso] || 0) + 1;
        }

        if (estadoAccion === 'abierta') fallbackActions.abiertas += 1;
        if (estadoAccion === 'cerrada') fallbackActions.cerradas += 1;
        if (estadoAccion === 'en_proceso') fallbackActions.enProceso += 1;
        if (estadoAccion === 'sin_accion') fallbackActions.sinAccion += 1;
      });
    }

    const desviosPorArea = objectToChartData(safeSummary.byArea || fallbackByArea);
    const categoriaRaw = safeSummary.byCategoria || fallbackByCategoria;
    const desviosPorCategoria = objectToChartData({
      'Desvío de Inocuidad': Number(safeSummary.totalInocuidad ?? categoriaRaw['Desvío de Inocuidad'] ?? 0),
      'Desvío de Calidad': Number(safeSummary.totalCalidad ?? categoriaRaw['Desvío de Calidad'] ?? 0),
      'Desvío de Logística': Number(safeSummary.totalLogistica ?? categoriaRaw['Desvío de Logística'] ?? 0),
      'Desvío Legal': Number(safeSummary.totalLegal ?? categoriaRaw['Desvío Legal'] ?? 0)
    }).filter((item) => item.value > 0);
    const desviosPorIso = objectToChartData(safeSummary.byIso22000 || fallbackByIso);

    const resumenHallazgos = [
      { name: 'Desvíos reales', value: Number(safeSummary.totalDesvios || 0) },
      { name: 'Inocuidad', value: Number(safeSummary.totalInocuidad || 0) },
      { name: 'Calidad', value: Number(safeSummary.totalCalidad || 0) },
      { name: 'Logística', value: Number(safeSummary.totalLogistica || 0) },
      { name: 'Legal', value: Number(safeSummary.totalLegal || 0) }
    ];

    const estadoAcciones = [
      { name: 'Abiertas', value: Number(safeSummary.actions?.abiertas ?? fallbackActions.abiertas) },
      { name: 'Cerradas', value: Number(safeSummary.actions?.cerradas ?? fallbackActions.cerradas) },
      { name: 'En proceso', value: Number(safeSummary.actions?.enProceso ?? fallbackActions.enProceso) },
      { name: 'Sin acción', value: Number(safeSummary.actions?.sinAccion ?? fallbackActions.sinAccion) }
    ];

    return {
      resumenHallazgos,
      desviosPorArea,
      desviosPorCategoria,
      desviosPorIso,
      estadoAcciones,
      totalRecords: Number(safeSummary.totalRecords || records.length || 0)
    };
  }, [records, summary]);

  if (!records.length) {
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
                <ResponsiveContainer>
                  <BarChart data={data.desviosPorArea}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={70} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {data.desviosPorArea.map((entry, idx) => (
                        <Cell key={entry.name} fill={palette[idx % palette.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography sx={{ fontWeight: 700, mb: 2 }}>Desvíos por categoría</Typography>
              <Box sx={{ width: '100%', height: 320 }}>
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
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography sx={{ fontWeight: 700, mb: 2 }}>Desvíos por categoría (barras)</Typography>
              <Box sx={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={data.desviosPorCategoria}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-10} textAnchor="end" height={70} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#1d4ed8" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
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
                    No hay acciones registradas todavía
                  </Box>
                ) : (
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
                <ResponsiveContainer>
                  <BarChart data={data.desviosPorIso}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={92} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {data.desviosPorIso.map((entry, idx) => (
                        <Cell key={entry.name} fill={palette[idx % palette.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
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

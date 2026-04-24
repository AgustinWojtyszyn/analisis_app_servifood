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
    const deriveFromRecords = !summary || (!summary.byArea && !summary.byTipo && !summary.byIso22000);

    const fallbackByArea = {};
    const fallbackByTipo = {};
    const fallbackByIso = {};
    const fallbackActions = { abiertas: 0, cerradas: 0, enProceso: 0 };
    let fallbackConformes = 0;
    let fallbackNoConformes = 0;
    let fallbackOM = 0;

    if (deriveFromRecords) {
      records.forEach((record) => {
        const area = String(record.areaClasificada || '').trim();
        const tipo = String(record.tipoDesvio || '').trim();
        const iso = String(record.iso22000 || '').trim();
        const estadoAccion = String(record.estadoAccion || '').trim();
        const resultadoClasificado = String(record.resultadoClasificado || '').trim();

        if (tipo && tipo !== '-') {
          fallbackByTipo[tipo] = (fallbackByTipo[tipo] || 0) + 1;
        }

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

        if (resultadoClasificado === 'Conforme') fallbackConformes += 1;
        if (resultadoClasificado === 'Oportunidad de mejora') fallbackOM += 1;
        if (resultadoClasificado === 'No conforme') fallbackNoConformes += 1;
      });
    }

    const desviosPorArea = objectToChartData(safeSummary.byArea || fallbackByArea);
    const desviosPorTipo = objectToChartData(safeSummary.byTipo || fallbackByTipo);
    const desviosPorIso = objectToChartData(safeSummary.byIso22000 || fallbackByIso);

    const conformidadData = [
      { name: 'Conforme', value: Number(safeSummary.totalConformes ?? fallbackConformes) },
      { name: 'No conforme', value: Number((safeSummary.totalNC || 0) + (safeSummary.totalOBS || 0) || fallbackNoConformes) },
      { name: 'Oportunidad de mejora', value: Number(safeSummary.totalOM ?? fallbackOM) }
    ];

    const estadoAcciones = [
      { name: 'Abiertas', value: Number(safeSummary.actions?.abiertas ?? fallbackActions.abiertas) },
      { name: 'Cerradas', value: Number(safeSummary.actions?.cerradas ?? fallbackActions.cerradas) },
      { name: 'En proceso', value: Number(safeSummary.actions?.enProceso ?? fallbackActions.enProceso) }
    ];

    return {
      desviosPorArea,
      desviosPorTipo,
      desviosPorIso,
      conformidadData,
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
              <Typography sx={{ fontWeight: 700, mb: 2 }}>Desvíos por tipo (NC / OBS / OM)</Typography>
              <Box sx={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={data.desviosPorTipo} dataKey="value" nameKey="name" outerRadius={105} label>
                      {data.desviosPorTipo.map((entry, idx) => (
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
              <Typography sx={{ fontWeight: 700, mb: 2 }}>Conforme vs No conforme vs OM</Typography>
              <Box sx={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={data.conformidadData}>
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

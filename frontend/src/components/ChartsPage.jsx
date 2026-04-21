import React, { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography
} from '@mui/material';
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

const severityPalette = {
  Alta: '#dc2626',
  Media: '#ea580c',
  Baja: '#16a34a'
};

const categoryPalette = ['#1d4ed8', '#2563eb', '#0f766e', '#ea580c', '#7c3aed', '#0284c7', '#dc2626', '#334155'];

function normalizeText(value) {
  return String(value || '').trim();
}

export default function ChartsPage({ records = [] }) {
  const data = useMemo(() => {
    const gravedad = { Alta: 0, Media: 0, Baja: 0 };
    const categoriaMap = {};
    const sectorMap = {};

    records.forEach((record) => {
      const gravedadKey = normalizeText(record.gravedad).toLowerCase();
      if (gravedadKey === 'alta') gravedad.Alta += 1;
      else if (gravedadKey === 'media') gravedad.Media += 1;
      else gravedad.Baja += 1;

      const categoria = normalizeText(record.categoria) || 'otros';
      categoriaMap[categoria] = (categoriaMap[categoria] || 0) + 1;

      const sector = normalizeText(record.sector) || 'Sin sector';
      sectorMap[sector] = {
        count: (sectorMap[sector]?.count || 0) + 1,
        alta: (sectorMap[sector]?.alta || 0) + (gravedadKey === 'alta' ? 1 : 0),
        media: (sectorMap[sector]?.media || 0) + (gravedadKey === 'media' ? 1 : 0)
      };
    });

    const severityData = Object.entries(gravedad).map(([name, value]) => ({ name, value }));

    const categoryData = Object.entries(categoriaMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const sectorData = Object.entries(sectorMap)
      .map(([name, value]) => ({ name, value: value.count, alta: value.alta, media: value.media }))
      .sort((a, b) => b.value - a.value);

    const prioritySector = sectorData[0]
      ? {
          name: sectorData[0].name,
          total: sectorData[0].value,
          alta: sectorData[0].alta,
          media: sectorData[0].media
        }
      : null;

    return { severityData, categoryData, sectorData, prioritySector };
  }, [records]);

  if (!records.length) {
    return (
      <Card>
        <CardContent sx={{ p: 3.5, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
            No hay datos suficientes para mostrar gráficos
          </Typography>
          <Typography color="text.secondary">
            Cargá un análisis para visualizar distribución por gravedad, categoría y sector.
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
              <Typography sx={{ fontWeight: 700, mb: 2 }}>Distribución por gravedad</Typography>
              <Box sx={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={data.severityData} dataKey="value" nameKey="name" outerRadius={95} label>
                      {data.severityData.map((entry) => (
                        <Cell key={entry.name} fill={severityPalette[entry.name]} />
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
              <Typography sx={{ fontWeight: 700, mb: 2 }}>Distribución por categoría</Typography>
              <Box sx={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={data.categoryData}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={60} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {data.categoryData.map((entry, idx) => (
                        <Cell key={entry.name} fill={categoryPalette[idx % categoryPalette.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography sx={{ fontWeight: 700, mb: 2 }}>Incidencias por sector</Typography>
              <Box sx={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={data.sectorData}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={60} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#1d4ed8" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography sx={{ fontWeight: 700, mb: 2 }}>Sector con mayor relevancia</Typography>
              {data.prioritySector ? (
                <>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>{data.prioritySector.name}</Typography>
                  <Typography color="text.secondary" sx={{ mt: 1 }}>
                    Total de incidencias: <strong>{data.prioritySector.total}</strong>
                  </Typography>
                  <Typography color="text.secondary">
                    Alta gravedad: <strong>{data.prioritySector.alta}</strong>
                  </Typography>
                  <Typography color="text.secondary">
                    Media gravedad: <strong>{data.prioritySector.media}</strong>
                  </Typography>
                </>
              ) : (
                <Typography color="text.secondary">No hay datos disponibles.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

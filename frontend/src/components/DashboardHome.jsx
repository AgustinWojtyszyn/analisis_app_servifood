import React from 'react';
import { Box, Card, CardContent, Grid, Paper, Skeleton, Typography } from '@mui/material';
import QueryStatsRoundedIcon from '@mui/icons-material/QueryStatsRounded';

function SummaryCard({ title, value, tone = 'info' }) {
  const colors = {
    info: 'linear-gradient(140deg, #e0e7ff, #dbeafe)',
    error: 'linear-gradient(140deg, #fee2e2, #ffe4e6)',
    warning: 'linear-gradient(140deg, #ffedd5, #fde68a)',
    success: 'linear-gradient(140deg, #dcfce7, #d1fae5)'
  };

  return (
    <Card sx={{ height: '100%', transition: 'transform 0.2s ease', '&:hover': { transform: 'translateY(-2px)' } }}>
      <CardContent sx={{ background: colors[tone] || colors.info }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 800, mt: 1 }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function DashboardHome({ user, currentAnalysis, loading = false }) {
  const summary = currentAnalysis?.summary;

  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Skeleton variant="text" width="40%" height={42} />
        <Skeleton variant="text" width="60%" />
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          {[1, 2, 3, 4].map((id) => (
            <Grid key={id} item xs={12} sm={6} lg={3}>
              <Skeleton variant="rounded" height={118} />
            </Grid>
          ))}
        </Grid>
      </Paper>
    );
  }

  return (
    <Box>
      <Paper
        sx={{
          p: { xs: 2.5, md: 3.5 },
          mb: 2.5,
          border: '1px solid rgba(147, 197, 253, 0.45)',
          background: 'linear-gradient(140deg, #ffffff 0%, #eff6ff 100%)'
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 900, mb: 0.75 }}>
          Hola, {user?.name || user?.email}
        </Typography>
        <Typography color="text.secondary">
          Monitoreá incidencias, detectá patrones y gestioná acciones correctivas desde un único panel.
        </Typography>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <SummaryCard title="Total registros" value={summary?.totalRecords || 0} tone="info" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <SummaryCard title="Total desvíos" value={summary?.totalDesvios || 0} tone="error" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <SummaryCard title="No conformes" value={(summary?.totalNC || 0) + (summary?.totalOBS || 0)} tone="warning" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <SummaryCard title="Oportunidades de mejora" value={summary?.totalOM || 0} tone="success" />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={7}>
          <Paper sx={{ p: 3, minHeight: 240 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
              Tendencia de categorías
            </Typography>
            <Box
              sx={{
                height: 170,
                borderRadius: 2,
                border: '1px dashed',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary',
                background: 'linear-gradient(140deg, rgba(219,234,254,0.45), rgba(240,249,255,0.45))'
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <QueryStatsRoundedIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="body2">Espacio reservado para gráfico (bar/pie)</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Paper sx={{ p: 3, minHeight: 240 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
              Último análisis cargado
            </Typography>

            {!currentAnalysis ? (
              <Box
                sx={{
                  border: '1px dashed',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 3,
                  textAlign: 'center',
                  color: 'text.secondary'
                }}
              >
                No hay análisis aún
              </Box>
            ) : (
              <Box
                sx={{
                  borderRadius: 2,
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: 'rgba(248,250,252,0.9)'
                }}
              >
                <Typography variant="body2" color="text.secondary">Archivo</Typography>
                <Typography sx={{ fontWeight: 700, mb: 1.5 }}>{currentAnalysis.filename}</Typography>
                <Typography variant="body2" color="text.secondary">Registros procesados</Typography>
                <Typography sx={{ fontWeight: 800, fontSize: 22 }}>{currentAnalysis.totalRecords || 0}</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

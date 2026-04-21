import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  Chip
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  WarningAmber as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';

const metricVariants = {
  success: { icon: CheckCircleIcon, color: 'success' },
  warning: { icon: WarningIcon, color: 'warning' },
  error: { icon: ErrorIcon, color: 'error' },
  info: { icon: InfoIcon, color: 'info' }
};

export function MetricCard({ title, value, variant = 'info', icon: CustomIcon }) {
  const { icon: DefaultIcon, color } = metricVariants[variant] || metricVariants.info;
  const Icon = CustomIcon || DefaultIcon;
  const iconBackgrounds = {
    success: 'rgba(22, 163, 74, 0.14)',
    warning: 'rgba(234, 88, 12, 0.14)',
    error: 'rgba(220, 38, 38, 0.14)',
    info: 'rgba(2, 132, 199, 0.14)'
  };

  return (
    <Card sx={{ height: '100%', transition: 'all 0.2s ease', '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 10px 18px rgba(18, 47, 105, 0.10)' } }}>
      <CardContent sx={{ p: 2.25 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography color="text.secondary" sx={{ fontSize: 13.5, fontWeight: 600 }} gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, mb: 0 }}>
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.5,
              backgroundColor: iconBackgrounds[color] || iconBackgrounds.info,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Icon sx={{ fontSize: 24, color: `${color}.main` }} />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export function SummaryGrid({ summary }) {
  if (!summary) return null;

  const { totalRecords, byCategory, bySeverity } = summary;

  return (
    <Grid container spacing={2.25} sx={{ mb: 3.5 }}>
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard 
          title="Total de Registros" 
          value={totalRecords}
          variant="info"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard 
          title="Registros de Alta Gravedad" 
          value={bySeverity?.alta || 0}
          variant="error"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard 
          title="Registros de Gravedad Media" 
          value={bySeverity?.media || 0}
          variant="warning"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard 
          title="Registros de Baja Gravedad" 
          value={bySeverity?.baja || 0}
          variant="success"
        />
      </Grid>
    </Grid>
  );
}

export function CategoryGrid({ summary }) {
  if (!summary?.byCategory) return null;

  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Registros por Categoría
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {Object.entries(summary.byCategory).map(([category, count]) => (
          <Chip
            key={category}
            label={`${category}: ${count}`}
            variant="outlined"
            sx={{ py: 2.5 }}
          />
        ))}
      </Box>
    </Paper>
  );
}

export function EmployeeMetrics({ summary }) {
  if (!summary?.employeeMeasures) return null;

  const measures = summary.employeeMeasures;
  const measureColors = {
    'ninguna': 'success',
    'aviso': 'info',
    'seguimiento': 'warning',
    'medida_correctiva': 'error'
  };

  return (
    <Paper sx={{ p: 2.5 }}>
      <Typography variant="h6" sx={{ mb: 1.75, fontWeight: 700 }}>
        Acciones Recomendadas por Empleado
      </Typography>
      <Box sx={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 700, color: '#475569' }}>Empleado</th>
              <th style={{ textAlign: 'center', padding: '10px 12px', fontWeight: 700, color: '#475569' }}>Incidencias</th>
              <th style={{ textAlign: 'center', padding: '10px 12px', fontWeight: 700, color: '#475569' }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(measures).map(([employee, data]) => (
              <tr key={employee} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px 12px' }}>{employee}</td>
                <td style={{ textAlign: 'center', padding: '10px 12px' }}>{data.count}</td>
                <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                  <Chip
                    label={data.medida.replace('_', ' ')}
                    color={measureColors[data.medida]}
                    size="small"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
    </Paper>
  );
}

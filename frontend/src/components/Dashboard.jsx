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

  return (
    <Card sx={{ height: '100%', transition: 'transform 0.2s ease', '&:hover': { transform: 'translateY(-2px)' } }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, my: 1 }}>
              {value}
            </Typography>
          </Box>
          <Icon sx={{ fontSize: 40, color: `${color}.main` }} />
        </Box>
      </CardContent>
    </Card>
  );
}

export function SummaryGrid({ summary }) {
  if (!summary) return null;

  const { totalRecords, byCategory, bySeverity } = summary;

  return (
    <Grid container spacing={2} sx={{ mb: 4 }}>
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
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Acciones Recomendadas por Empleado
      </Typography>
      <Box sx={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Empleado</th>
              <th style={{ textAlign: 'center', padding: '12px', fontWeight: 600 }}>Incidencias</th>
              <th style={{ textAlign: 'center', padding: '12px', fontWeight: 600 }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(measures).map(([employee, data]) => (
              <tr key={employee} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '12px' }}>{employee}</td>
                <td style={{ textAlign: 'center', padding: '12px' }}>{data.count}</td>
                <td style={{ textAlign: 'center', padding: '12px' }}>
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

import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import DeleteSweepRoundedIcon from '@mui/icons-material/DeleteSweepRounded';
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
import {
  countBy,
  parseCustomerNonconformitiesWorkbook,
  sortMonthData,
  uniqueValues
} from '../lib/customerNonconformities';

const CHART_COLORS = ['#1d4ed8', '#0f766e', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#4d7c0f', '#be123c'];
const FILTER_FIELDS = [
  ['month', 'Mes'],
  ['hazardType', 'Tipo de peligro'],
  ['area', 'Área'],
  ['client', 'Cliente'],
  ['status', 'Estado'],
  ['severity', 'Severidad']
];

const emptyFilters = {
  month: '',
  hazardType: '',
  area: '',
  client: '',
  status: '',
  severity: ''
};

function isExcelFile(file) {
  const name = String(file?.name || '').toLowerCase();
  return name.endsWith('.xlsx') || name.endsWith('.xls');
}

function KpiCard({ label, value, helper }) {
  return (
    <Grid item xs={12} sm={6} lg={2.4}>
      <Paper sx={{ p: 2, height: '100%', border: '1px solid #dde7f6', boxShadow: 'none' }}>
        <Typography sx={{ color: '#52627e', fontWeight: 800, fontSize: 13 }}>{label}</Typography>
        <Typography sx={{ color: '#0b1f4d', fontWeight: 900, fontSize: 25, mt: 0.5, lineHeight: 1.1 }}>
          {value}
        </Typography>
        {helper && (
          <Typography sx={{ color: '#64748b', fontWeight: 650, fontSize: 12.5, mt: 0.7 }}>
            {helper}
          </Typography>
        )}
      </Paper>
    </Grid>
  );
}

function ChartCard({ title, data, type = 'bar', horizontal = false }) {
  const height = data.length === 0 ? 160 : Math.max(260, Math.min(520, data.length * 44 + 90));

  return (
    <Grid item xs={12} lg={6}>
      <Card sx={{ height: '100%' }}>
        <CardContent sx={{ p: 2 }}>
          <Typography sx={{ fontWeight: 900, color: '#0b1f4d', mb: 1.5, fontSize: 17 }}>{title}</Typography>
          <Box sx={{ height }}>
            {data.length === 0 ? (
              <Box sx={{ height: '100%', border: '1px dashed #cbd5e1', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 700 }}>
                Sin datos para graficar
              </Box>
            ) : (
              <ResponsiveContainer>
                {type === 'pie' ? (
                  <PieChart>
                    <Pie data={data} dataKey="value" nameKey="name" outerRadius={92} label={({ percent = 0 }) => (percent >= 0.06 ? `${Math.round(percent * 100)}%` : '')} labelLine={false}>
                      {data.map((entry, idx) => (
                        <Cell key={entry.name} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Cantidad']} />
                  </PieChart>
                ) : (
                  <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 16, left: horizontal ? 24 : 4, bottom: horizontal ? 8 : 34 }}>
                    {horizontal ? (
                      <>
                        <XAxis type="number" allowDecimals={false} tick={{ fill: '#475569', fontWeight: 700, fontSize: 12 }} />
                        <YAxis type="category" dataKey="name" width={150} tick={{ fill: '#0b1f4d', fontWeight: 750, fontSize: 12 }} />
                      </>
                    ) : (
                      <>
                        <XAxis dataKey="name" tick={{ fill: '#0b1f4d', fontWeight: 750, fontSize: 12 }} angle={-20} textAnchor="end" height={54} />
                        <YAxis allowDecimals={false} tick={{ fill: '#475569', fontWeight: 700, fontSize: 12 }} />
                      </>
                    )}
                    <Tooltip formatter={(value) => [value, 'Cantidad']} />
                    <Bar dataKey="value" radius={horizontal ? [0, 7, 7, 0] : [7, 7, 0, 0]}>
                      {data.map((entry, idx) => (
                        <Cell key={entry.name} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}
          </Box>
          {type === 'pie' && data.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {data.map((item, idx) => (
                <Chip
                  key={item.name}
                  size="small"
                  label={`${item.name}: ${item.value}`}
                  sx={{ bgcolor: `${CHART_COLORS[idx % CHART_COLORS.length]}18`, color: '#0f172a', fontWeight: 800 }}
                />
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Grid>
  );
}

function applyFilters(records, filters) {
  return records.filter((record) => (
    Object.entries(filters).every(([field, value]) => !value || record[field] === value)
  ));
}

export default function CustomerNonconformitiesPage() {
  const inputId = useMemo(() => `customer-nc-upload-${Math.random().toString(36).slice(2, 10)}`, []);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [records, setRecords] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState(emptyFilters);

  const filteredRecords = useMemo(() => applyFilters(records, filters), [records, filters]);
  const filterOptions = useMemo(() => {
    return Object.fromEntries(FILTER_FIELDS.map(([field]) => [field, uniqueValues(records, field)]));
  }, [records]);

  const metrics = useMemo(() => {
    const statusCounts = countBy(filteredRecords, 'status');
    const severityCounts = countBy(filteredRecords, 'severity');
    const clients = countBy(filteredRecords, 'client').filter((item) => item.name !== 'Sin especificar');
    const hazards = countBy(filteredRecords, 'hazardType');
    const areas = countBy(filteredRecords, 'area');

    return {
      total: filteredRecords.length,
      open: statusCounts.find((item) => item.name === 'Abierto')?.value || 0,
      closed: statusCounts.find((item) => item.name === 'Cerrado')?.value || 0,
      severityText: severityCounts.length ? severityCounts.map((item) => `${item.name}: ${item.value}`).join(' · ') : 'Sin datos',
      topClient: clients[0],
      topHazard: hazards[0],
      topArea: areas[0]
    };
  }, [filteredRecords]);

  const chartData = useMemo(() => ({
    byMonth: sortMonthData(countBy(filteredRecords, 'month')),
    byHazard: countBy(filteredRecords, 'hazardType'),
    byArea: countBy(filteredRecords, 'area'),
    bySeverity: countBy(filteredRecords, 'severity'),
    byClient: countBy(filteredRecords, 'client').filter((item) => item.name !== 'Sin especificar').slice(0, 12),
    byStatus: countBy(filteredRecords, 'status')
  }), [filteredRecords]);

  const clearCurrentLoad = () => {
    setFileName('');
    setRecords([]);
    setWarnings([]);
    setError('');
    setFilters(emptyFilters);
  };

  const processFile = async (file) => {
    if (!file) return;
    if (!isExcelFile(file)) {
      setError('Formato inválido. Seleccioná un archivo Excel .xlsx o .xls.');
      return;
    }

    setLoading(true);
    setError('');
    setWarnings([]);
    try {
      const result = await parseCustomerNonconformitiesWorkbook(file);
      setFileName(file.name);
      setRecords(result.records);
      setWarnings(result.warnings);
      setFilters(emptyFilters);
      if (!result.records.length) {
        setWarnings((prev) => [...prev, 'Se detectaron las columnas, pero no se encontraron registros para analizar.']);
      }
    } catch (err) {
      setRecords([]);
      setFileName('');
      setError(err.message || 'No se pudo procesar el archivo de no conformidades de clientes.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event) => {
    processFile(event.target.files?.[0]);
    event.target.value = '';
  };

  const handleDrag = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(event.type === 'dragenter' || event.type === 'dragover');
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    processFile(event.dataTransfer?.files?.[0]);
  };

  return (
    <Box>
      <Card sx={{ mb: 2.25 }}>
        <CardContent sx={{ p: { xs: 2.25, md: 3 } }}>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#0b1f4d', mb: 0.6 }}>
            No conformidades de clientes
          </Typography>
          <Typography sx={{ color: '#475569', fontWeight: 600, mb: 2.25 }}>
            Carga y análisis de reclamos/no conformidades de clientes a partir de Excel.
          </Typography>

          <Paper
            component="label"
            htmlFor={inputId}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            sx={{
              display: 'block',
              p: { xs: 2.5, md: 3.5 },
              textAlign: 'center',
              border: '2px dashed',
              borderColor: dragActive ? '#1d4ed8' : '#cbd5e1',
              bgcolor: dragActive ? '#eff6ff' : '#f8fafc',
              cursor: 'pointer',
              boxShadow: 'none'
            }}
          >
            <CloudUploadRoundedIcon sx={{ color: '#1d4ed8', fontSize: 42, mb: 0.5 }} />
            <Typography sx={{ fontWeight: 900, color: '#0f2a66' }}>
              {loading ? 'Procesando archivo...' : 'Arrastrá o seleccioná un Excel de reclamos'}
            </Typography>
            <Typography sx={{ color: '#64748b', fontWeight: 650, fontSize: 13.5, mt: 0.5 }}>
              Se aceptan archivos .xlsx y .xls. La tabla puede empezar debajo de encabezados administrativos.
            </Typography>
            <input id={inputId} type="file" hidden accept=".xlsx,.xls" onChange={handleFileChange} />
          </Paper>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mt: 1.5 }}>
            {fileName && <Chip label={`Archivo: ${fileName}`} color="primary" variant="outlined" />}
            {records.length > 0 && <Chip label={`${records.length} registros cargados`} color="success" variant="outlined" />}
            {(fileName || records.length > 0 || error) && (
              <Button startIcon={<DeleteSweepRoundedIcon />} onClick={clearCurrentLoad} variant="outlined" size="small">
                Limpiar carga actual
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {warnings.map((warning) => (
        <Alert key={warning} severity="warning" sx={{ mb: 1.25 }}>{warning}</Alert>
      ))}

      {records.length > 0 && (
        <>
          <Grid container spacing={1.75} sx={{ mb: 2.25 }}>
            <KpiCard label="Total NC" value={metrics.total} />
            <KpiCard label="Abiertas" value={metrics.open} />
            <KpiCard label="Cerradas" value={metrics.closed} />
            <KpiCard label="Tipo principal" value={metrics.topHazard?.name || 'Sin datos'} helper={metrics.topHazard ? `${metrics.topHazard.value} registros` : ''} />
            <KpiCard label="Área principal" value={metrics.topArea?.name || 'Sin datos'} helper={metrics.topArea ? `${metrics.topArea.value} registros` : ''} />
          </Grid>

          <Card sx={{ mb: 2.25 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography sx={{ fontWeight: 900, color: '#0b1f4d', mb: 1.5 }}>Filtros</Typography>
              <Grid container spacing={1.5}>
                {FILTER_FIELDS.map(([field, label]) => (
                  <Grid item xs={12} sm={6} md={4} lg={2} key={field}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label={label}
                      value={filters[field]}
                      onChange={(event) => setFilters((prev) => ({ ...prev, [field]: event.target.value }))}
                    >
                      <MenuItem value="">Todos</MenuItem>
                      {filterOptions[field].map((option) => (
                        <MenuItem key={option} value={option}>{option}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          <Grid container spacing={2.25} sx={{ mb: 2.25 }}>
            <ChartCard title="NC por mes" data={chartData.byMonth} />
            <ChartCard title="NC por tipo de peligro" data={chartData.byHazard} horizontal />
            <ChartCard title="NC por área/sector" data={chartData.byArea} horizontal />
            <ChartCard title="NC por severidad" data={chartData.bySeverity} type="pie" />
            <ChartCard title="NC por cliente" data={chartData.byClient} horizontal />
            <ChartCard title="Abiertas vs cerradas" data={chartData.byStatus} type="pie" />
          </Grid>

          <Card sx={{ mb: 2.25 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography sx={{ fontWeight: 900, color: '#0b1f4d', mb: 0.5 }}>
                Indicadores adicionales
              </Typography>
              <Typography sx={{ color: '#475569', fontWeight: 650 }}>
                Severidad: {metrics.severityText}
              </Typography>
              <Typography sx={{ color: '#475569', fontWeight: 650, mt: 0.5 }}>
                Cliente con más reclamos: {metrics.topClient ? `${metrics.topClient.name} (${metrics.topClient.value})` : 'Sin datos'}
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ p: 2 }}>
              <Typography sx={{ fontWeight: 900, color: '#0b1f4d', mb: 1.5 }}>Vista previa de datos</Typography>
              <TableContainer sx={{ maxHeight: 520 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      {['Mes', 'Reclamo', 'Tipo de peligro', 'Severidad', 'Causa probable', 'Área', 'Cliente', 'Estado'].map((header) => (
                        <TableCell key={header} sx={{ fontWeight: 900, bgcolor: '#eef4ff', color: '#0b1f4d' }}>{header}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRecords.slice(0, 250).map((record, index) => (
                      <TableRow key={`${record.sourceFileName}-${index}`} hover>
                        <TableCell>{record.year ? `${record.month} ${record.year}` : record.month}</TableCell>
                        <TableCell>{record.claim}</TableCell>
                        <TableCell>{record.hazardType}</TableCell>
                        <TableCell>{record.severity || 'Sin especificar'}</TableCell>
                        <TableCell>{record.probableCause || 'Sin especificar'}</TableCell>
                        <TableCell>{record.area}</TableCell>
                        <TableCell>{record.client || 'Sin especificar'}</TableCell>
                        <TableCell>{record.status || 'Sin especificar'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {filteredRecords.length > 250 && (
                <Typography sx={{ color: '#64748b', fontWeight: 700, fontSize: 13, mt: 1 }}>
                  Vista previa limitada a 250 filas de {filteredRecords.length} registros filtrados.
                </Typography>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
}

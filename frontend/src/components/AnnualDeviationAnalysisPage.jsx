import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
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
import * as XLSX from 'xlsx';
import {
  exportAnnualDeviationExcel,
  getAnnualDeviationUpload,
  getAnnualDeviationUploads,
  uploadAnnualDeviationExcel
} from '../services/annualDeviation';

const COLORS = ['#1d4ed8', '#0f766e', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#4d7c0f', '#be123c'];
const emptyFilters = { year: '', month: '', areaSector: '', classification: '', sheetType: '' };
const SHEET_LABELS = { annual: 'Anual', quality: 'Calidad', logistics: 'Logística' };

function isExcelFile(file) {
  return String(file?.name || '').toLowerCase().endsWith('.xlsx');
}

function countBy(records, field, limit = null) {
  const counts = new Map();
  records.forEach((record) => {
    const name = record[field] || 'Sin especificar';
    const key = String(name).toLowerCase();
    const item = counts.get(key) || { name, value: 0 };
    item.value += 1;
    counts.set(key, item);
  });
  const result = [...counts.values()].sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  return limit ? result.slice(0, limit) : result;
}

function normalizeSourceType(value = '') {
  const key = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  if (!key || /^\d+([,.]\d+)?%?$/.test(key)) return '';
  if (key === 'interno' || key === 'internos') return 'Interno';
  if (key === 'externo' || key === 'externos') return 'Externo';
  return '';
}

function countBySourceType(records) {
  return countBy(
    records
      .map((record) => ({ ...record, sourceType: normalizeSourceType(record.sourceType) }))
      .filter((record) => record.sourceType),
    'sourceType'
  );
}

function uniqueValues(records, field) {
  return [...new Set(records.map((record) => record[field]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'es'));
}

function applyFilters(records, filters) {
  return records.filter((record) => (
    (!filters.year || String(record.year || '') === String(filters.year)) &&
    (!filters.month || record.month === filters.month) &&
    (!filters.areaSector || record.areaSector === filters.areaSector) &&
    (!filters.classification || record.classification === filters.classification) &&
    (!filters.sheetType || record.sheetType === filters.sheetType)
  ));
}

function isClassification(row, key) {
  return String(row?.classificationKey || row?.classification || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim() === key;
}

function effectiveRowsForType(records, type) {
  const key = type === 'quality' ? 'calidad' : 'logistica';
  const sheetRows = records.filter((row) => row.sheetType === type);
  const annualClassifiedRows = records.filter((row) => row.sheetType === 'annual' && isClassification(row, key));
  return annualClassifiedRows.length > sheetRows.length ? annualClassifiedRows : sheetRows;
}

function KpiCard({ label, value, helper }) {
  return (
    <Grid item xs={12} sm={6} md={3}>
      <Paper sx={{ p: 2, height: '100%', border: '1px solid #dde7f6', boxShadow: 'none' }}>
        <Typography sx={{ color: '#52627e', fontWeight: 800, fontSize: 13 }}>{label}</Typography>
        <Typography sx={{ color: '#0b1f4d', fontWeight: 900, fontSize: 26, mt: 0.5, overflowWrap: 'anywhere' }}>{value}</Typography>
        {helper && <Typography sx={{ color: '#64748b', fontWeight: 650, fontSize: 12.5 }}>{helper}</Typography>}
      </Paper>
    </Grid>
  );
}

function ChartCard({ title, data, type = 'bar', horizontal = false }) {
  const height = data.length ? Math.max(260, Math.min(540, data.length * 40 + 90)) : 180;
  return (
    <Grid item xs={12} lg={6}>
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography sx={{ fontWeight: 900, color: '#0b1f4d', mb: 1.5 }}>{title}</Typography>
          <Box sx={{ height }}>
            {!data.length ? (
              <Box sx={{ height: '100%', border: '1px dashed #cbd5e1', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 700 }}>
                Sin datos para graficar
              </Box>
            ) : (
              <ResponsiveContainer>
                {type === 'pie' ? (
                  <PieChart>
                    <Pie data={data} dataKey="value" nameKey="name" outerRadius={92} label={({ percent = 0 }) => (percent >= 0.06 ? `${Math.round(percent * 100)}%` : '')} labelLine={false}>
                      {data.map((item, idx) => <Cell key={item.name} fill={COLORS[idx % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Cantidad']} />
                  </PieChart>
                ) : (
                  <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 16, left: horizontal ? 28 : 4, bottom: horizontal ? 8 : 42 }}>
                    {horizontal ? (
                      <>
                        <XAxis type="number" allowDecimals={false} tick={{ fill: '#475569', fontWeight: 700, fontSize: 12 }} />
                        <YAxis type="category" dataKey="name" width={160} tick={{ fill: '#0b1f4d', fontWeight: 750, fontSize: 12 }} />
                      </>
                    ) : (
                      <>
                        <XAxis dataKey="name" tick={{ fill: '#0b1f4d', fontWeight: 750, fontSize: 12 }} angle={-20} textAnchor="end" height={60} />
                        <YAxis allowDecimals={false} tick={{ fill: '#475569', fontWeight: 700, fontSize: 12 }} />
                      </>
                    )}
                    <Tooltip formatter={(value) => [value, 'Cantidad']} />
                    <Bar dataKey="value" radius={horizontal ? [0, 7, 7, 0] : [7, 7, 0, 0]}>
                      {data.map((item, idx) => <Cell key={item.name} fill={COLORS[idx % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );
}

function DeviationTable({ rows }) {
  return (
    <TableContainer component={Paper} sx={{ border: '1px solid #dde7f6', boxShadow: 'none' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {['Hoja', 'Fecha / mes', 'Área / sector', 'Desvío detectado', 'Clasificación', 'Interno / externo', 'Acción inmediata', 'Acción correctiva', 'Estado', 'Observaciones'].map((header) => (
              <TableCell key={header} sx={{ fontWeight: 900, color: '#0b1f4d', whiteSpace: 'nowrap' }}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.slice(0, 500).map((row) => (
            <TableRow key={row.id || `${row.sheetType}-${row.rowIndex}`} hover>
              <TableCell>{SHEET_LABELS[row.sheetType] || row.sheetType}</TableCell>
              <TableCell>{row.dateMonth || row.month || '-'}</TableCell>
              <TableCell>{row.areaSector || '-'}</TableCell>
              <TableCell>{row.deviation || '-'}</TableCell>
              <TableCell>{row.classification || '-'}</TableCell>
              <TableCell>{row.sourceType || '-'}</TableCell>
              <TableCell>{row.immediateAction || '-'}</TableCell>
              <TableCell>{row.correctiveAction || '-'}</TableCell>
              <TableCell>{row.status || '-'}</TableCell>
              <TableCell>{row.observations || '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {rows.length > 500 && (
        <Box sx={{ px: 2, py: 1.25, color: '#64748b', fontWeight: 700 }}>
          Mostrando 500 de {rows.length} filas. Exportá Excel para ver la tabla completa.
        </Box>
      )}
    </TableContainer>
  );
}

function SummaryList({ title, data, showPercentage = false }) {
  return (
    <Card>
      <CardContent>
        <Typography sx={{ fontWeight: 900, color: '#0b1f4d', mb: 1.25 }}>{title}</Typography>
        <Stack spacing={0.8}>
          {data.length ? data.map((item) => (
            <Box key={item.name} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, borderBottom: '1px solid #e2e8f0', pb: 0.75 }}>
              <Typography sx={{ fontWeight: 750, color: '#1f2937' }}>{item.name}</Typography>
              <Typography sx={{ fontWeight: 900, color: '#0b1f4d', whiteSpace: 'nowrap' }}>
                {item.value}{showPercentage ? ` · ${item.percentage ?? 0}%` : ''}
              </Typography>
            </Box>
          )) : (
            <Typography sx={{ color: '#64748b', fontWeight: 700 }}>Sin datos</Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

function exportRowsToExcel(rows, fileName) {
  const data = rows.map((row) => ({
    Hoja: SHEET_LABELS[row.sheetType] || row.sheetType,
    'Fecha / mes': row.dateMonth,
    Mes: row.month,
    'Área / sector': row.areaSector,
    'Desvío detectado': row.deviation,
    Clasificación: row.classification,
    'Interno / externo': row.sourceType,
    'Acción inmediata': row.immediateAction,
    'Acción correctiva': row.correctiveAction,
    Estado: row.status,
    Observaciones: row.observations
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data), 'Tabla filtrada');
  XLSX.writeFile(workbook, fileName);
}

export default function AnnualDeviationAnalysisPage() {
  const [activeTab, setActiveTab] = useState('summary');
  const [uploads, setUploads] = useState([]);
  const [selectedUploadId, setSelectedUploadId] = useState('');
  const [selectedUpload, setSelectedUpload] = useState(null);
  const [filters, setFilters] = useState(emptyFilters);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadUploads = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await getAnnualDeviationUploads();
      const list = payload.data || [];
      setUploads(list);
      if (list.length && !selectedUploadId) setSelectedUploadId(list[0].id);
    } catch (err) {
      setError(err.message || 'No se pudo cargar el historial anual');
    } finally {
      setLoading(false);
    }
  }, [selectedUploadId]);

  useEffect(() => {
    loadUploads();
  }, [loadUploads]);

  useEffect(() => {
    if (!selectedUploadId) {
      setSelectedUpload(null);
      return;
    }
    let active = true;
    setLoading(true);
    getAnnualDeviationUpload(selectedUploadId)
      .then((payload) => {
        if (active) {
          setSelectedUpload(payload);
          setFilters((prev) => ({ ...prev, year: payload.year || '' }));
        }
      })
      .catch((err) => active && setError(err.message || 'No se pudo abrir la carga anual'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [selectedUploadId]);

  const rows = useMemo(() => selectedUpload?.rows || [], [selectedUpload]);
  const filteredRows = useMemo(() => applyFilters(rows, filters), [rows, filters]);
  const qualityRows = useMemo(() => applyFilters(effectiveRowsForType(rows, 'quality'), { ...filters, sheetType: '' }), [filters, rows]);
  const logisticsRows = useMemo(() => applyFilters(effectiveRowsForType(rows, 'logistics'), { ...filters, sheetType: '' }), [filters, rows]);

  const options = useMemo(() => ({
    years: uniqueValues(rows, 'year'),
    months: uniqueValues(rows, 'month'),
    areas: uniqueValues(rows, 'areaSector'),
    classifications: uniqueValues(rows, 'classification')
  }), [rows]);

  const chartData = useMemo(() => ({
    byMonth: countBy(filteredRows, 'month').sort((a, b) => {
      const monthA = rows.find((row) => row.month === a.name)?.monthNumber || 99;
      const monthB = rows.find((row) => row.month === b.name)?.monthNumber || 99;
      return monthA - monthB;
    }),
    byClassification: countBy(filteredRows, 'classification'),
    byArea: countBy(filteredRows, 'areaSector', 12),
    bySourceType: countBySourceType(filteredRows),
    topAreas: countBy(filteredRows, 'areaSector', 10),
    topDeviations: countBy(filteredRows, 'deviation', 10),
    quality: countBy(qualityRows, 'deviation', 10),
    logistics: countBy(logisticsRows, 'deviation', 10)
  }), [filteredRows, logisticsRows, qualityRows, rows]);

  const uploadFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!isExcelFile(file)) {
      setError('Formato inválido. Seleccioná un archivo .xlsx.');
      return;
    }
    setUploading(true);
    setProgress(0);
    setError('');
    setSuccess('');
    try {
      const payload = await uploadAnnualDeviationExcel(file, setProgress);
      setSuccess('Excel anual cargado correctamente.');
      setUploads((prev) => [payload.upload, ...prev.filter((item) => item.id !== payload.upload.id)]);
      setSelectedUpload(payload.upload);
      setSelectedUploadId(payload.upload.id);
      setFilters({ ...emptyFilters, year: payload.upload.year || '' });
      setActiveTab('summary');
    } catch (err) {
      setError(err.message || 'No se pudo procesar el Excel anual. Revisá que tenga hojas anual, calidad y logística.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const resetFilters = () => setFilters({ ...emptyFilters, year: selectedUpload?.year || '' });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
      <Paper sx={{ p: 2.25, border: '1px solid #dde7f6', boxShadow: 'none' }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', lg: 'center' }} justifyContent="space-between">
          <Box>
            <Typography sx={{ fontWeight: 900, color: '#0b1f4d', fontSize: 22 }}>Análisis anual de desvíos</Typography>
            <Typography sx={{ color: '#64748b', fontWeight: 650 }}>Carga el Excel anual y consultá resumen, calidad, logística y tabla completa.</Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button variant="outlined" startIcon={<RefreshRoundedIcon />} onClick={loadUploads} disabled={loading}>Actualizar</Button>
            <Button variant="outlined" startIcon={<DownloadRoundedIcon />} disabled={!selectedUpload?.id} onClick={() => exportAnnualDeviationExcel(selectedUpload.id)}>
              Exportar resumen
            </Button>
            <Button variant="contained" component="label" startIcon={<CloudUploadRoundedIcon />} disabled={uploading}>
              Cargar Excel anual
              <input hidden type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={uploadFile} />
            </Button>
          </Stack>
        </Stack>
        {uploading && <LinearProgress variant={progress ? 'determinate' : 'indeterminate'} value={progress} sx={{ mt: 2 }} />}
      </Paper>

      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}
      {selectedUpload?.metadata?.warnings?.length > 0 && (
        <Alert severity="warning">{selectedUpload.metadata.warnings.join(' ')}</Alert>
      )}

      <Paper sx={{ p: 2, border: '1px solid #dde7f6', boxShadow: 'none' }}>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField select label="Carga anual" value={selectedUploadId} onChange={(e) => setSelectedUploadId(e.target.value)} fullWidth size="small">
              {uploads.map((upload) => (
                <MenuItem key={upload.id} value={upload.id}>{upload.year || 'Sin año'} · {upload.filename}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6} md={1.5}>
            <TextField select label="Año" value={filters.year} onChange={(e) => setFilters((prev) => ({ ...prev, year: e.target.value }))} fullWidth size="small">
              <MenuItem value="">Todos</MenuItem>
              {options.years.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={6} md={1.7}>
            <TextField select label="Mes" value={filters.month} onChange={(e) => setFilters((prev) => ({ ...prev, month: e.target.value }))} fullWidth size="small">
              <MenuItem value="">Todos</MenuItem>
              {options.months.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField select label="Área / sector" value={filters.areaSector} onChange={(e) => setFilters((prev) => ({ ...prev, areaSector: e.target.value }))} fullWidth size="small">
              <MenuItem value="">Todas</MenuItem>
              {options.areas.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField select label="Clasificación" value={filters.classification} onChange={(e) => setFilters((prev) => ({ ...prev, classification: e.target.value }))} fullWidth size="small">
              <MenuItem value="">Todas</MenuItem>
              {options.classifications.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={8} md={1.4}>
            <TextField select label="Tipo" value={filters.sheetType} onChange={(e) => setFilters((prev) => ({ ...prev, sheetType: e.target.value }))} fullWidth size="small">
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="annual">Anual</MenuItem>
              <MenuItem value="quality">Calidad</MenuItem>
              <MenuItem value="logistics">Logística</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={4} md={0.4}>
            <Button onClick={resetFilters} size="small">Limpiar</Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ border: '1px solid #dde7f6', boxShadow: 'none' }}>
        <Tabs value={activeTab} onChange={(e, value) => setActiveTab(value)} variant="scrollable" scrollButtons="auto">
          <Tab value="summary" label="Resumen anual" />
          <Tab value="quality" label="Desvíos de calidad" />
          <Tab value="logistics" label="Desvíos de logística" />
          <Tab value="table" label="Tabla completa" />
          <Tab value="upload" label="Cargar Excel anual" />
        </Tabs>
      </Paper>

      {!selectedUpload && !loading ? (
        <Paper sx={{ p: 4, textAlign: 'center', border: '1px dashed #cbd5e1', boxShadow: 'none' }}>
          <Typography sx={{ color: '#0b1f4d', fontWeight: 900, fontSize: 18 }}>No hay cargas anuales todavía</Typography>
          <Typography sx={{ color: '#64748b', fontWeight: 650, mt: 0.5 }}>Usá la pestaña de carga para subir el archivo de Bruno.</Typography>
        </Paper>
      ) : null}

      {activeTab === 'summary' && selectedUpload && (
        <>
          <Grid container spacing={1.5}>
            <KpiCard label="Total de desvíos" value={filteredRows.length} helper={`Archivo: ${selectedUpload.filename}`} />
            <KpiCard label="Áreas / sectores" value={chartData.byArea.length} />
            <KpiCard label="Clasificaciones" value={chartData.byClassification.length} />
            <KpiCard label="Internos / externos" value={chartData.bySourceType.length ? chartData.bySourceType.map((i) => `${i.name}: ${i.value}`).join(' · ') : 'Sin dato'} />
          </Grid>
          <Grid container spacing={2}>
            <ChartCard title="Desvíos por mes" data={chartData.byMonth} />
            <ChartCard title="Desvíos por clasificación" data={chartData.byClassification} type="pie" />
            <ChartCard title="Desvíos por área / sector" data={chartData.byArea} horizontal />
            <ChartCard title="Internos vs externos" data={chartData.bySourceType} type="pie" />
          </Grid>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}><SummaryList title="Top 10 áreas / sectores" data={chartData.topAreas} /></Grid>
            <Grid item xs={12} md={6}><SummaryList title="Top 10 desvíos más repetidos" data={chartData.topDeviations} /></Grid>
          </Grid>
        </>
      )}

      {activeTab === 'quality' && selectedUpload && (
        <>
          <Grid container spacing={1.5}>
            <KpiCard label="Total calidad" value={qualityRows.length} />
            <KpiCard label="Desvío más frecuente" value={chartData.quality[0]?.name || '-'} helper={chartData.quality[0] ? `${chartData.quality[0].value} casos` : ''} />
          </Grid>
          <Grid container spacing={2}>
            <ChartCard title="Desvíos de calidad más frecuentes" data={chartData.quality} horizontal />
            <ChartCard title="Porcentaje por desvío de calidad" data={chartData.quality} type="pie" />
          </Grid>
          <SummaryList title="Cantidad y porcentaje sobre total" data={chartData.quality.map((item) => ({ ...item, percentage: qualityRows.length ? Math.round((item.value * 10000) / qualityRows.length) / 100 : 0 }))} showPercentage />
          <DeviationTable rows={qualityRows} />
        </>
      )}

      {activeTab === 'logistics' && selectedUpload && (
        <>
          <Grid container spacing={1.5}>
            <KpiCard label="Total logística" value={logisticsRows.length} />
            <KpiCard label="Desvío más frecuente" value={chartData.logistics[0]?.name || '-'} helper={chartData.logistics[0] ? `${chartData.logistics[0].value} casos` : ''} />
          </Grid>
          <Grid container spacing={2}>
            <ChartCard title="Desvíos de logística más frecuentes" data={chartData.logistics} horizontal />
            <ChartCard title="Porcentaje por desvío de logística" data={chartData.logistics} type="pie" />
          </Grid>
          <SummaryList title="Cantidad y porcentaje sobre total" data={chartData.logistics.map((item) => ({ ...item, percentage: logisticsRows.length ? Math.round((item.value * 10000) / logisticsRows.length) / 100 : 0 }))} showPercentage />
          <DeviationTable rows={logisticsRows} />
        </>
      )}

      {activeTab === 'table' && selectedUpload && (
        <>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between">
            <Typography sx={{ color: '#0b1f4d', fontWeight: 900 }}>Tabla completa filtrada: {filteredRows.length} filas</Typography>
            <Button variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={() => exportRowsToExcel(filteredRows, `tabla_anual_filtrada_${Date.now()}.xlsx`)}>
              Exportar tabla filtrada
            </Button>
          </Stack>
          <DeviationTable rows={filteredRows} />
        </>
      )}

      {activeTab === 'upload' && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 3, border: '1px dashed #94a3b8', boxShadow: 'none', textAlign: 'center' }}>
              <CloudUploadRoundedIcon sx={{ fontSize: 44, color: '#1d4ed8' }} />
              <Typography sx={{ color: '#0b1f4d', fontWeight: 900, mt: 1 }}>Cargar Excel anual</Typography>
              <Typography sx={{ color: '#64748b', fontWeight: 650, my: 1 }}>Formato soportado: .xlsx con hojas anual, calidad y logística.</Typography>
              <Button variant="contained" component="label" disabled={uploading}>
                Seleccionar archivo
                <input hidden type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={uploadFile} />
              </Button>
            </Paper>
          </Grid>
          <Grid item xs={12} md={7}>
            <Card>
              <CardContent>
                <Typography sx={{ color: '#0b1f4d', fontWeight: 900, mb: 1 }}>Historial de cargas anuales</Typography>
                <Stack spacing={1}>
                  {uploads.map((upload) => (
                    <Paper key={upload.id} sx={{ p: 1.5, border: '1px solid #e2e8f0', boxShadow: 'none', display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center' }}>
                      <Box>
                        <Typography sx={{ fontWeight: 850, color: '#0b1f4d' }}>{upload.filename}</Typography>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 650, color: '#64748b' }}>
                          {upload.year || 'Sin año'} · {new Date(upload.uploadedAt).toLocaleString('es-AR')}
                        </Typography>
                      </Box>
                      <Chip label={`${upload.summary?.total || 0} desvíos`} sx={{ fontWeight: 800 }} />
                    </Paper>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}

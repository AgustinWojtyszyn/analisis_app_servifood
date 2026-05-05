import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  MenuItem
} from '@mui/material';
import {
  archiveAnalysis,
  deleteAllAnalyses,
  deleteAnalysis,
  deleteAnalysesBulk,
  exportAnalysesBulk,
  getAnalysisHistory
} from '../services/analysis';

const limitOptions = [10, 25, 50];

export default function AnalysisHistory({ onSelectAnalysis, isAdmin = false }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    from: '',
    to: '',
    status: '',
    userId: '',
    minRecords: '',
    minNC: '',
    minOBS: '',
    minConformes: '',
    sort: 'date_desc',
    page: 1,
    limit: 10
  });
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  useEffect(() => {
    loadHistory();
  }, [filters]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await getAnalysisHistory(filters);
      setItems(data?.data || []);
      setMeta({
        page: data?.page || 1,
        limit: data?.limit || 10,
        total: data?.total || 0,
        totalPages: data?.totalPages || 1
      });
      setSelectedIds([]);
    } catch (err) {
      setError(err.message || 'Error cargando historial');
    } finally {
      setLoading(false);
    }
  };

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((item) => item.id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleDeleteOne = async (id) => {
    const { error: deleteError } = await deleteAnalysis(id);
    if (deleteError) {
      setError(deleteError.message || 'No se pudo eliminar el análisis');
      return;
    }
    setSuccess('Análisis eliminado');
    loadHistory();
  };

  const handleDeleteBulk = async () => {
    if (!selectedIds.length) return;
    try {
      await deleteAnalysesBulk(selectedIds);
      setSuccess('Análisis seleccionados eliminados');
      loadHistory();
    } catch (err) {
      setError(err.message || 'No se pudieron eliminar los análisis seleccionados');
    }
  };

  const handleExportBulk = async (ids = selectedIds) => {
    if (!ids.length) return;
    try {
      await exportAnalysesBulk(ids);
      setSuccess('Exportación iniciada');
    } catch (err) {
      setError(err.message || 'No se pudo exportar');
    }
  };

  const handleDeleteAll = async () => {
    const value = window.prompt('Escribe BORRAR para eliminar todos los análisis');
    if (value !== 'BORRAR') {
      setError('Confirmación inválida. Debe ser BORRAR');
      return;
    }

    try {
      await deleteAllAnalyses('BORRAR');
      setSuccess('Todos los análisis fueron eliminados');
      loadHistory();
    } catch (err) {
      setError(err.message || 'No se pudo eliminar todo');
    }
  };

  const handleArchiveOne = async (analysis) => {
    if (!analysis?.id) return;
    const confirmed = window.confirm(`¿Archivar el análisis "${analysis.filename}"?`);
    if (!confirmed) return;

    try {
      const response = await archiveAnalysis(analysis.id);
      setSuccess(response?.message || 'Análisis archivado');
      loadHistory();
    } catch (err) {
      setError(err.message || 'No se pudo archivar el análisis');
    }
  };

  const onFilterChange = (patch) => {
    setFilters((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Dashboard de análisis</Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0,1fr))' }, gap: 1, mb: 1.5 }}>
        <TextField size="small" label="Buscar archivo" value={filters.search} onChange={(e) => onFilterChange({ search: e.target.value })} />
        <TextField size="small" type="date" label="Desde" InputLabelProps={{ shrink: true }} value={filters.from} onChange={(e) => onFilterChange({ from: e.target.value })} />
        <TextField size="small" type="date" label="Hasta" InputLabelProps={{ shrink: true }} value={filters.to} onChange={(e) => onFilterChange({ to: e.target.value })} />
        <TextField size="small" select label="Estado" value={filters.status} onChange={(e) => onFilterChange({ status: e.target.value })}>
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="active">active</MenuItem>
          <MenuItem value="exported">exported</MenuItem>
          <MenuItem value="archived">archived</MenuItem>
        </TextField>
        <TextField size="small" type="number" label="Mín. registros" value={filters.minRecords} onChange={(e) => onFilterChange({ minRecords: e.target.value })} />
        <TextField size="small" type="number" label="Mín. NC" value={filters.minNC} onChange={(e) => onFilterChange({ minNC: e.target.value })} />
        <TextField size="small" type="number" label="Mín. OBS" value={filters.minOBS} onChange={(e) => onFilterChange({ minOBS: e.target.value })} />
        <TextField size="small" type="number" label="Mín. conformes" value={filters.minConformes} onChange={(e) => onFilterChange({ minConformes: e.target.value })} />
        {isAdmin && (
          <TextField size="small" label="Usuario (UUID)" value={filters.userId} onChange={(e) => onFilterChange({ userId: e.target.value })} />
        )}
        <TextField size="small" select label="Orden" value={filters.sort} onChange={(e) => onFilterChange({ sort: e.target.value })}>
          <MenuItem value="date_desc">Fecha desc</MenuItem>
          <MenuItem value="date_asc">Fecha asc</MenuItem>
          <MenuItem value="name_asc">Nombre asc</MenuItem>
          <MenuItem value="name_desc">Nombre desc</MenuItem>
          <MenuItem value="records_desc">Registros desc</MenuItem>
          <MenuItem value="records_asc">Registros asc</MenuItem>
          <MenuItem value="nc_desc">NC desc</MenuItem>
          <MenuItem value="nc_asc">NC asc</MenuItem>
        </TextField>
        <TextField size="small" select label="Por página" value={filters.limit} onChange={(e) => onFilterChange({ limit: Number(e.target.value), page: 1 })}>
          {limitOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
        </TextField>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
        <Button variant="outlined" onClick={() => handleExportBulk()} disabled={!selectedIds.length}>Exportar seleccionados</Button>
        <Button variant="outlined" color="error" onClick={handleDeleteBulk} disabled={!selectedIds.length}>Eliminar seleccionados</Button>
        <Button variant="outlined" color="error" onClick={handleDeleteAll}>Eliminar todos los análisis</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 1.5 }}>{success}</Alert>}

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={items.length > 0 && selectedIds.length === items.length}
                  indeterminate={selectedIds.length > 0 && selectedIds.length < items.length}
                  onChange={toggleSelectAll}
                />
              </TableCell>
              <TableCell>Archivo</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Registros</TableCell>
              <TableCell>NC</TableCell>
              <TableCell>OBS</TableCell>
              <TableCell>Conformes</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!loading && items.map((analysis) => (
              <TableRow key={analysis.id} hover>
                <TableCell padding="checkbox">
                  <Checkbox checked={selectedSet.has(analysis.id)} onChange={() => toggleSelectOne(analysis.id)} />
                </TableCell>
                <TableCell>{analysis.filename}</TableCell>
                <TableCell>{new Date(analysis.uploadDate).toLocaleString('es-AR')}</TableCell>
                <TableCell>{analysis.totalRecords || 0}</TableCell>
                <TableCell>{analysis.summary?.totalNC || 0}</TableCell>
                <TableCell>{analysis.summary?.totalOBS || 0}</TableCell>
                <TableCell>{analysis.summary?.totalConformes || 0}</TableCell>
                <TableCell>{analysis.status || 'n/a'}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button variant="outlined" size="small" onClick={() => onSelectAnalysis(analysis.id)}>Ver detalle</Button>
                    <Button variant="text" size="small" onClick={() => handleExportBulk([analysis.id])}>Exportar</Button>
                    {isAdmin && analysis.status === 'active' && (
                      <Button variant="text" color="warning" size="small" onClick={() => handleArchiveOne(analysis)}>
                        Archivar
                      </Button>
                    )}
                    <Button variant="text" color="error" size="small" onClick={() => handleDeleteOne(analysis.id)}>Eliminar</Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {loading && (
              <TableRow>
                <TableCell colSpan={9}>Cargando...</TableCell>
              </TableRow>
            )}
            {!loading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={9}>Sin resultados para los filtros actuales.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5 }}>
        <Typography variant="body2">Total: {meta.total}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" size="small" disabled={meta.page <= 1} onClick={() => onFilterChange({ page: meta.page - 1 })}>Anterior</Button>
          <Typography variant="body2" sx={{ alignSelf: 'center' }}>Página {meta.page} / {meta.totalPages}</Typography>
          <Button variant="outlined" size="small" disabled={meta.page >= meta.totalPages} onClick={() => onFilterChange({ page: meta.page + 1 })}>Siguiente</Button>
        </Box>
      </Box>
    </Paper>
  );
}

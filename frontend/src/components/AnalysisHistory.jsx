import React, { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  MenuItem,
  Tooltip
} from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import {
  archiveAnalysis,
  deleteAllAnalyses,
  deleteAnalysis,
  deleteAnalysesBulk,
  exportAnalysesBulk,
  getAnalysisHistory,
  reprocessIsoAllAnalyses
} from '../services/analysis';

const limitOptions = [10, 25, 50];

export default function AnalysisHistory({ onSelectAnalysis, isAdmin = false, onAfterReprocess = null }) {
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
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [reprocessingIso, setReprocessingIso] = useState(false);

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

  const handleReprocessIsoAll = async () => {
    const confirmed = window.confirm('Esto recalculará la relación ISO 22000 de todos tus análisis guardados usando las reglas actuales. No modificará los datos originales del Excel. ¿Continuar?');
    if (!confirmed) return;

    try {
      setReprocessingIso(true);
      setError('');
      const response = await reprocessIsoAllAnalyses();
      setSuccess(
        `ISO reprocesada correctamente. ${response?.updatedAnalyses || 0} análisis actualizados, ${response?.recordsProcessed || 0} registros procesados, revisión manual: antes ${response?.manualBefore || 0} / ahora ${response?.manualAfter || 0}.`
      );
      await loadHistory();
      if (typeof onAfterReprocess === 'function') {
        await onAfterReprocess(response);
      }
    } catch (_err) {
      setError('No se pudo reprocesar la ISO. Intentalo nuevamente.');
    } finally {
      setReprocessingIso(false);
    }
  };

  const onFilterChange = (patch) => {
    setFilters((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));
  };

  return (
    <Paper
      sx={{
        p: { xs: 1.5, md: 2.25 },
        borderRadius: 3,
        border: '1px solid rgba(29,78,216,0.12)',
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
        boxShadow: '0 10px 28px rgba(15, 23, 42, 0.08)'
      }}
    >
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 900, color: '#0f172a', letterSpacing: '-0.01em' }}>
          Historial de análisis
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b', mt: 0.25 }}>
          Consultá, exportá y administrá análisis cargados.
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr 1fr 120px' },
          gap: 1.25,
          mb: 1.25
        }}
      >
        <TextField
          id="history-search"
          name="history_search"
          size="small"
          label="Buscar archivo"
          value={filters.search}
          onChange={(e) => onFilterChange({ search: e.target.value })}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon sx={{ fontSize: 18, color: '#64748b' }} />
              </InputAdornment>
            )
          }}
          sx={fieldSx}
        />
        <TextField id="history-from" name="history_from" size="small" type="date" label="Desde" InputLabelProps={{ shrink: true }} value={filters.from} onChange={(e) => onFilterChange({ from: e.target.value })} sx={fieldSx} />
        <TextField id="history-to" name="history_to" size="small" type="date" label="Hasta" InputLabelProps={{ shrink: true }} value={filters.to} onChange={(e) => onFilterChange({ to: e.target.value })} sx={fieldSx} />
        <TextField id="history-status" name="history_status" size="small" select label="Estado" value={filters.status} onChange={(e) => onFilterChange({ status: e.target.value })} sx={fieldSx}>
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="active">active</MenuItem>
          <MenuItem value="exported">exported</MenuItem>
          <MenuItem value="archived">archived</MenuItem>
        </TextField>
        <TextField id="history-limit" name="history_limit" size="small" select label="Por página" value={filters.limit} onChange={(e) => onFilterChange({ limit: Number(e.target.value), page: 1 })} sx={fieldSx}>
          {limitOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
        </TextField>
      </Box>

      <Accordion
        expanded={showAdvancedFilters}
        onChange={(_e, expanded) => setShowAdvancedFilters(expanded)}
        disableGutters
        elevation={0}
        sx={{
          mb: 1.5,
          border: '1px solid rgba(148,163,184,0.28)',
          borderRadius: 2,
          backgroundColor: 'rgba(255,255,255,0.7)',
          '&:before': { display: 'none' }
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />} sx={{ minHeight: 44 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#1e3a8a' }}>
            Filtros avanzados
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0.5 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0,1fr))' }, gap: 1.25 }}>
            <TextField id="history-min-records" name="history_min_records" size="small" type="number" label="Mín. registros" value={filters.minRecords} onChange={(e) => onFilterChange({ minRecords: e.target.value })} sx={fieldSx} />
            <TextField id="history-min-nc" name="history_min_nc" size="small" type="number" label="Mín. NC" value={filters.minNC} onChange={(e) => onFilterChange({ minNC: e.target.value })} sx={fieldSx} />
            <TextField id="history-min-obs" name="history_min_obs" size="small" type="number" label="Mín. OBS" value={filters.minOBS} onChange={(e) => onFilterChange({ minOBS: e.target.value })} sx={fieldSx} />
            <TextField id="history-min-conformes" name="history_min_conformes" size="small" type="number" label="Mín. conformes" value={filters.minConformes} onChange={(e) => onFilterChange({ minConformes: e.target.value })} sx={fieldSx} />
            {isAdmin && (
              <TextField id="history-user-id" name="history_user_id" size="small" label="Usuario (UUID)" value={filters.userId} onChange={(e) => onFilterChange({ userId: e.target.value })} sx={fieldSx} />
            )}
            <TextField id="history-sort" name="history_sort" size="small" select label="Orden" value={filters.sort} onChange={(e) => onFilterChange({ sort: e.target.value })} sx={fieldSx}>
              <MenuItem value="date_desc">Fecha desc</MenuItem>
              <MenuItem value="date_asc">Fecha asc</MenuItem>
              <MenuItem value="name_asc">Nombre asc</MenuItem>
              <MenuItem value="name_desc">Nombre desc</MenuItem>
              <MenuItem value="records_desc">Registros desc</MenuItem>
              <MenuItem value="records_asc">Registros asc</MenuItem>
              <MenuItem value="nc_desc">NC desc</MenuItem>
              <MenuItem value="nc_asc">NC asc</MenuItem>
            </TextField>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
        <Button
          variant="contained"
          onClick={handleReprocessIsoAll}
          disabled={reprocessingIso || loading}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 700,
            backgroundColor: '#1d4ed8',
            '&:hover': { backgroundColor: '#1e40af' }
          }}
        >
          {reprocessingIso ? 'Reprocesando ISO...' : 'Reprocesar ISO de todos'}
        </Button>
        <Button variant="outlined" onClick={() => handleExportBulk()} disabled={!selectedIds.length} sx={btnGhostSx}>Exportar seleccionados</Button>
        <Button variant="outlined" color="error" onClick={handleDeleteBulk} disabled={!selectedIds.length} sx={btnSoftDangerSx}>Eliminar seleccionados</Button>
        <Button variant="outlined" color="error" onClick={handleDeleteAll} sx={btnSoftDangerSx}>Eliminar todos los análisis</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 1.5 }}>{success}</Alert>}

      <TableContainer
        sx={{
          border: '1px solid rgba(148,163,184,0.25)',
          borderRadius: 2.5,
          backgroundColor: '#fff'
        }}
      >
        <Table size="small" sx={{ minWidth: 980 }}>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" sx={headCellSx}>
                <Checkbox
                  checked={items.length > 0 && selectedIds.length === items.length}
                  indeterminate={selectedIds.length > 0 && selectedIds.length < items.length}
                  onChange={toggleSelectAll}
                />
              </TableCell>
              <TableCell sx={headCellSx}>Archivo</TableCell>
              <TableCell sx={headCellSx}>Fecha</TableCell>
              <TableCell sx={headCellSx}>Registros</TableCell>
              <TableCell sx={headCellSx}>NC</TableCell>
              <TableCell sx={headCellSx}>OBS</TableCell>
              <TableCell sx={headCellSx}>Conformes</TableCell>
              <TableCell sx={headCellSx}>Estado</TableCell>
              <TableCell sx={headCellSx}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!loading && items.map((analysis) => (
              <TableRow
                key={analysis.id}
                hover
                sx={{
                  '& td': { borderBottom: '1px solid rgba(226,232,240,0.75)' },
                  '&:hover': { backgroundColor: 'rgba(59,130,246,0.05)' }
                }}
              >
                <TableCell padding="checkbox">
                  <Checkbox checked={selectedSet.has(analysis.id)} onChange={() => toggleSelectOne(analysis.id)} />
                </TableCell>
                <TableCell sx={{ maxWidth: 320 }}>
                  <Tooltip title={analysis.filename || ''} placement="top-start">
                    <Typography sx={{ fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {analysis.filename}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell>{new Date(analysis.uploadDate).toLocaleString('es-AR')}</TableCell>
                <TableCell>{analysis.totalRecords || 0}</TableCell>
                <TableCell>{analysis.summary?.totalNC || 0}</TableCell>
                <TableCell>{analysis.summary?.totalOBS || 0}</TableCell>
                <TableCell>{analysis.summary?.totalConformes || 0}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={analysis.status || 'n/a'}
                    sx={{
                      fontWeight: 700,
                      textTransform: 'lowercase',
                      backgroundColor: analysis.status === 'active'
                        ? 'rgba(37,99,235,0.12)'
                        : analysis.status === 'archived'
                          ? 'rgba(100,116,139,0.15)'
                          : 'rgba(14,165,233,0.14)',
                      color: analysis.status === 'active'
                        ? '#1e40af'
                        : analysis.status === 'archived'
                          ? '#334155'
                          : '#0c4a6e'
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button variant="outlined" size="small" onClick={() => onSelectAnalysis(analysis.id)} sx={btnGhostSx}>Ver detalle</Button>
                    <Button variant="text" size="small" onClick={() => handleExportBulk([analysis.id])} sx={{ color: '#2563eb', fontWeight: 700 }}>Exportar</Button>
                    {isAdmin && analysis.status === 'active' && (
                      <Button variant="text" color="warning" size="small" sx={{ fontWeight: 700 }} onClick={() => handleArchiveOne(analysis)}>
                        Archivar
                      </Button>
                    )}
                    <Button variant="text" color="error" size="small" sx={{ fontWeight: 700 }} onClick={() => handleDeleteOne(analysis.id)}>Eliminar</Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {loading && (
              <TableRow>
                <TableCell colSpan={9} sx={{ py: 3 }}>
                  <Typography color="text.secondary">Cargando...</Typography>
                </TableCell>
              </TableRow>
            )}
            {!loading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} sx={{ py: 3 }}>
                  <Typography color="text.secondary">Sin resultados para los filtros actuales.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Divider sx={{ my: 1.5, borderColor: 'rgba(148,163,184,0.2)' }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5, alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="body2" sx={{ color: '#475569', fontWeight: 600 }}>Total: {meta.total}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" size="small" sx={btnGhostSx} disabled={meta.page <= 1} onClick={() => onFilterChange({ page: meta.page - 1 })}>Anterior</Button>
          <Typography variant="body2" sx={{ alignSelf: 'center', color: '#475569', fontWeight: 600 }}>Página {meta.page} / {meta.totalPages}</Typography>
          <Button variant="outlined" size="small" sx={btnGhostSx} disabled={meta.page >= meta.totalPages} onClick={() => onFilterChange({ page: meta.page + 1 })}>Siguiente</Button>
        </Box>
      </Box>
    </Paper>
  );
}

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    backgroundColor: '#fff',
    '& fieldset': { borderColor: 'rgba(148,163,184,0.4)' },
    '&:hover fieldset': { borderColor: 'rgba(37,99,235,0.5)' },
    '&.Mui-focused fieldset': { borderColor: '#2563eb' }
  },
  '& .MuiInputBase-input': {
    py: 1.1
  }
};

const headCellSx = {
  fontWeight: 800,
  color: '#334155',
  fontSize: 13,
  backgroundColor: 'rgba(241,245,249,0.9)',
  borderBottom: '1px solid rgba(203,213,225,0.9)'
};

const btnGhostSx = {
  borderRadius: 2,
  textTransform: 'none',
  fontWeight: 700,
  borderColor: 'rgba(59,130,246,0.35)',
  color: '#1d4ed8',
  '&:hover': {
    borderColor: '#2563eb',
    backgroundColor: 'rgba(37,99,235,0.06)'
  }
};

const btnSoftDangerSx = {
  borderRadius: 2,
  textTransform: 'none',
  fontWeight: 700,
  borderColor: 'rgba(220,38,38,0.28)',
  color: '#b91c1c',
  backgroundColor: 'rgba(254,242,242,0.55)',
  '&:hover': {
    borderColor: 'rgba(220,38,38,0.45)',
    backgroundColor: 'rgba(254,226,226,0.7)'
  }
};

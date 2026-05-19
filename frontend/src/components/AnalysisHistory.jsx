import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  getAnalysisHistory
} from '../services/analysis';

const limitOptions = [10, 25, 50, 100];
const initialFilters = {
  searchTerm: '',
  dateFrom: '',
  dateTo: '',
  status: '',
  userFilter: '',
  locationFilter: '',
  minRecords: '',
  minNC: '',
  minOBS: '',
  minConformes: '',
  sort: 'date_desc',
  page: 1,
  pageSize: 10
};

export default function AnalysisHistory({ onSelectAnalysis, isAdmin = false }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [filters, setFilters] = useState(initialFilters);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const requestParams = {
        search: filters.searchTerm,
        searchTerm: filters.searchTerm,
        from: filters.dateFrom,
        to: filters.dateTo,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        status: filters.status,
        userId: filters.userFilter,
        userFilter: filters.userFilter,
        locationFilter: filters.locationFilter,
        minRecords: filters.minRecords,
        minNC: filters.minNC,
        minOBS: filters.minOBS,
        minConformes: filters.minConformes,
        sort: filters.sort,
        page: filters.page,
        limit: filters.pageSize,
        pageSize: filters.pageSize
      };
      const { data } = await getAnalysisHistory(requestParams);
      setItems(data?.data || []);
      setMeta({
        page: data?.page || 1,
        limit: data?.limit || filters.pageSize,
        total: data?.total || 0,
        totalPages: data?.totalPages || 1
      });
      setSelectedIds([]);
    } catch (err) {
      setError(err.message || 'Error cargando historial');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

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
    setDraftFilters((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));
  };

  const applyFilters = () => {
    setFilters((prev) => ({
      ...prev,
      ...draftFilters,
      page: 1
    }));
  };

  const clearFilters = () => {
    setDraftFilters(initialFilters);
    setFilters(initialFilters);
  };

  const onPageChange = (page) => {
    setFilters((prev) => ({ ...prev, page }));
    setDraftFilters((prev) => ({ ...prev, page }));
  };

  const onPageSizeChange = (pageSize) => {
    setDraftFilters((prev) => ({ ...prev, pageSize, page: 1 }));
    setFilters((prev) => ({ ...prev, pageSize, page: 1 }));
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
          value={draftFilters.searchTerm}
          onChange={(e) => onFilterChange({ searchTerm: e.target.value })}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon sx={{ fontSize: 18, color: '#64748b' }} />
              </InputAdornment>
            )
          }}
          sx={fieldSx}
        />
        <TextField id="history-from" name="history_from" size="small" type="date" label="Desde" InputLabelProps={{ shrink: true }} value={draftFilters.dateFrom} onChange={(e) => onFilterChange({ dateFrom: e.target.value })} sx={fieldSx} />
        <TextField id="history-to" name="history_to" size="small" type="date" label="Hasta" InputLabelProps={{ shrink: true }} value={draftFilters.dateTo} onChange={(e) => onFilterChange({ dateTo: e.target.value })} sx={fieldSx} />
        <TextField id="history-status" name="history_status" size="small" select label="Estado" value={draftFilters.status} onChange={(e) => onFilterChange({ status: e.target.value })} sx={fieldSx}>
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="active">active</MenuItem>
          <MenuItem value="exported">exported</MenuItem>
          <MenuItem value="archived">archived</MenuItem>
        </TextField>
        <TextField id="history-limit" name="history_limit" size="small" select label="Por página" value={draftFilters.pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))} sx={fieldSx}>
          {limitOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
        </TextField>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
        <Button variant="contained" onClick={applyFilters} sx={btnPrimarySx}>Buscar</Button>
        <Button variant="outlined" onClick={clearFilters} sx={btnGhostSx}>Limpiar filtros</Button>
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
            <TextField id="history-min-records" name="history_min_records" size="small" type="number" label="Mín. registros" value={draftFilters.minRecords} onChange={(e) => onFilterChange({ minRecords: e.target.value })} sx={fieldSx} />
            <TextField id="history-min-nc" name="history_min_nc" size="small" type="number" label="Mín. NC" value={draftFilters.minNC} onChange={(e) => onFilterChange({ minNC: e.target.value })} sx={fieldSx} />
            <TextField id="history-min-obs" name="history_min_obs" size="small" type="number" label="Mín. OBS" value={draftFilters.minOBS} onChange={(e) => onFilterChange({ minOBS: e.target.value })} sx={fieldSx} />
            <TextField id="history-min-conformes" name="history_min_conformes" size="small" type="number" label="Mín. conformes" value={draftFilters.minConformes} onChange={(e) => onFilterChange({ minConformes: e.target.value })} sx={fieldSx} />
            {isAdmin && (
              <TextField id="history-user-id" name="history_user_id" size="small" label="Usuario (UUID)" value={draftFilters.userFilter} onChange={(e) => onFilterChange({ userFilter: e.target.value })} sx={fieldSx} />
            )}
            <TextField id="history-location" name="history_location" size="small" label="Ubicación/Sede" value={draftFilters.locationFilter} onChange={(e) => onFilterChange({ locationFilter: e.target.value })} sx={fieldSx} />
            <TextField id="history-sort" name="history_sort" size="small" select label="Orden" value={draftFilters.sort} onChange={(e) => onFilterChange({ sort: e.target.value })} sx={fieldSx}>
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
        <Typography variant="body2" sx={{ color: '#475569', fontWeight: 600 }}>
          Mostrando {meta.total === 0 ? 0 : ((meta.page - 1) * meta.limit) + 1}-{Math.min(meta.page * meta.limit, meta.total)} de {meta.total} registros
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" size="small" sx={btnGhostSx} disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)}>Anterior</Button>
          <Typography variant="body2" sx={{ alignSelf: 'center', color: '#475569', fontWeight: 600 }}>Página {meta.page} / {meta.totalPages}</Typography>
          <Button variant="outlined" size="small" sx={btnGhostSx} disabled={meta.page >= meta.totalPages} onClick={() => onPageChange(meta.page + 1)}>Siguiente</Button>
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

const btnPrimarySx = {
  borderRadius: 2,
  textTransform: 'none',
  fontWeight: 700,
  backgroundColor: '#1d4ed8',
  '&:hover': {
    backgroundColor: '#1e40af'
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

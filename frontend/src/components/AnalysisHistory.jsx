import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Divider,
  Dialog,
  DialogContent,
  DialogTitle,
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
import { isIsoManualValue, readCanonicalIso } from '../lib/isoFields.js';

const limitOptions = [10, 25, 50];
const toNumber = (value) => Number(value || 0);
const EMPTY_LABEL = '—';

function getShortId(id = '') {
  const fullId = String(id || '').trim();
  return fullId ? fullId.slice(0, 8) : EMPTY_LABEL;
}

function getRecordsCount(analysis = {}) {
  const summaryTotal = Number(analysis?.summary?.totalRecords);
  if (Number.isFinite(summaryTotal) && summaryTotal >= 0) return summaryTotal;
  const topLevelTotal = Number(analysis?.totalRecords);
  if (Number.isFinite(topLevelTotal) && topLevelTotal >= 0) return topLevelTotal;
  return Array.isArray(analysis?.records) ? analysis.records.length : 0;
}

function getManualCount(analysis = {}) {
  const summaryManual = Number(analysis?.summary?.totalRevisionManual);
  if (Number.isFinite(summaryManual) && summaryManual >= 0) return summaryManual;
  const records = Array.isArray(analysis?.records) ? analysis.records : [];
  return records.reduce((count, record) => {
    return count + (isIsoManualValue(readCanonicalIso(record)) ? 1 : 0);
  }, 0);
}

function formatDateTime(value) {
  if (!value) return EMPTY_LABEL;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return EMPTY_LABEL;
  return date.toLocaleString('es-AR');
}

function countDebugErrors(response = {}) {
  const analyses = Array.isArray(response?.analysesDebug)
    ? response.analysesDebug
    : Array.isArray(response?.debug)
      ? response.debug
      : [];
  return analyses.reduce((count, item) => count + (item?.persistError || item?.error || item?.warning ? 1 : 0), 0);
}

function getDebugAnalyses(response = {}) {
  if (Array.isArray(response?.analysesDebug)) return response.analysesDebug;
  if (Array.isArray(response?.debug)) return response.debug;
  return [];
}

function buildBulkDeleteMessage(response = {}) {
  const deleted = Number(response?.deletedCount || 0);
  const notFound = Array.isArray(response?.nonexistentIds) ? response.nonexistentIds.length : 0;
  const unauthorized = Number(response?.unauthorizedCount || 0);
  const failed = Number(response?.failedCount || 0);
  return `Eliminados: ${deleted}. No encontrados: ${notFound}. No autorizados: ${unauthorized}. Fallidos: ${failed}.`;
}

function buildDeleteProcessedMessage(response = {}) {
  const deleted = Number(response?.deletedCount || 0);
  const skipped = Number(response?.skippedActiveCount || 0);
  const failed = Number(response?.failedCount || 0);
  return `Análisis procesados eliminados: ${deleted}. Conservados por estar activos/no eliminables: ${skipped}. Fallidos: ${failed}.`;
}

export default function AnalysisHistory({ onSelectAnalysis, isAdmin = false, onAfterReprocess = null, onAfterDelete = null }) {
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
  const [reprocessingIsoDebug, setReprocessingIsoDebug] = useState(false);
  const [debugResult, setDebugResult] = useState(null);
  const [debugDialogOpen, setDebugDialogOpen] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [deletingProcessed, setDeletingProcessed] = useState(false);

  const loadHistory = useCallback(async (options = {}) => {
    try {
      setLoading(true);
      setError('');
      const { data } = await getAnalysisHistory(filters);
      const nextItems = data?.data || [];
      setItems(nextItems);
      setMeta({
        page: data?.page || 1,
        limit: data?.limit || 10,
        total: data?.total || 0,
        totalPages: data?.totalPages || 1
      });
      const retainSelectedIds = Array.isArray(options.retainSelectedIds) ? options.retainSelectedIds : [];
      if (retainSelectedIds.length > 0) {
        const visibleIds = new Set(nextItems.map((item) => item.id));
        setSelectedIds(retainSelectedIds.filter((id) => visibleIds.has(id)));
      } else {
        setSelectedIds([]);
      }
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
  const isReprocessingIso = reprocessingIso || reprocessingIsoDebug;
  const isDeletingAnalysis = deletingBulk || deletingProcessed;

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
    if (isDeletingAnalysis || isReprocessingIso) return;
    const { error: deleteError } = await deleteAnalysis(id);
    if (deleteError) {
      setError(deleteError.message || 'No se pudo eliminar el análisis');
      return;
    }
    setSuccess('Análisis eliminado');
    if (typeof onAfterDelete === 'function') {
      onAfterDelete([id]);
    }
    await loadHistory();
  };

  const handleDeleteBulk = async () => {
    if (!selectedIds.length || isDeletingAnalysis || isReprocessingIso) return;
    const confirmed = window.confirm(`¿Eliminar ${selectedIds.length} análisis seleccionados?`);
    if (!confirmed) return;

    try {
      setDeletingBulk(true);
      setError('');
      const response = await deleteAnalysesBulk(selectedIds);
      setSuccess(buildBulkDeleteMessage(response));
      const deletedIds = Array.isArray(response?.deletedIds) ? response.deletedIds : [];
      const failedIds = [
        ...(Array.isArray(response?.failedIds) ? response.failedIds : []),
        ...(Array.isArray(response?.unauthorizedIds) ? response.unauthorizedIds : [])
      ];
      if (typeof onAfterDelete === 'function') {
        onAfterDelete(deletedIds);
      }
      await loadHistory({ retainSelectedIds: failedIds });
    } catch (err) {
      setError(err.message || 'No se pudieron eliminar los análisis seleccionados');
    } finally {
      setDeletingBulk(false);
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
    if (isDeletingAnalysis || isReprocessingIso) return;
    const value = window.prompt('Se eliminarán solo análisis finalizados/procesados. Los análisis activos o en procesamiento se conservarán. Esta acción no se puede deshacer. Escribe BORRAR para continuar.');
    if (value !== 'BORRAR') {
      setError('Confirmación inválida. Debe ser BORRAR');
      return;
    }

    try {
      setDeletingProcessed(true);
      setError('');
      const response = await deleteAllAnalyses('BORRAR', { userId: filters.userId });
      setSuccess(buildDeleteProcessedMessage(response));
      const deletedIds = Array.isArray(response?.deletedIds) ? response.deletedIds : [];
      setSelectedIds((prev) => prev.filter((id) => !deletedIds.includes(id)));
      if (typeof onAfterDelete === 'function') {
        onAfterDelete(deletedIds);
      }
      await loadHistory();
    } catch (err) {
      setError(err.message || 'No se pudieron eliminar los análisis procesados');
    } finally {
      setDeletingProcessed(false);
    }
  };

  const handleArchiveOne = async (analysis) => {
    if (!analysis?.id) return;
    if (isDeletingAnalysis || isReprocessingIso) return;
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
    if (isReprocessingIso || isDeletingAnalysis) return;
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

  const handleReprocessIsoDebug = async () => {
    if (!isAdmin || isReprocessingIso || isDeletingAnalysis) return;
    const confirmed = window.confirm('Esto recalculará la relación ISO 22000 con diagnóstico visible para administradores. ¿Continuar?');
    if (!confirmed) return;

    try {
      setReprocessingIsoDebug(true);
      setError('');
      setDebugResult(null);
      const response = await reprocessIsoAllAnalyses({ debug: true });
      setDebugResult(response);
      setDebugDialogOpen(true);
      setSuccess(
        `ISO reprocesada con diagnóstico. ${response?.analysesProcessed || 0} análisis procesados, ${response?.recordsProcessed || 0} registros procesados.`
      );
      await loadHistory();
      if (typeof onAfterReprocess === 'function') {
        await onAfterReprocess(response);
      }
    } catch (err) {
      console.error('Error reprocesando ISO con diagnóstico:', err);
      setError('No se pudo reprocesar la ISO con diagnóstico. Intentalo nuevamente.');
    } finally {
      setReprocessingIsoDebug(false);
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
          disabled={isReprocessingIso || isDeletingAnalysis || loading}
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
        {isAdmin && (
          <Button
            variant="outlined"
            onClick={handleReprocessIsoDebug}
            disabled={isReprocessingIso || isDeletingAnalysis || loading}
            sx={btnGhostSx}
          >
            {reprocessingIsoDebug ? 'Generando diagnóstico...' : 'Reprocesar ISO con diagnóstico'}
          </Button>
        )}
        <Button variant="outlined" onClick={() => handleExportBulk()} disabled={!selectedIds.length || isDeletingAnalysis} sx={btnGhostSx}>Exportar seleccionados</Button>
        <Button variant="outlined" color="error" onClick={handleDeleteBulk} disabled={!selectedIds.length || isDeletingAnalysis || isReprocessingIso} sx={btnSoftDangerSx}>
          {deletingBulk ? 'Eliminando...' : 'Eliminar seleccionados'}
        </Button>
        <Button variant="outlined" color="error" onClick={handleDeleteAll} disabled={isDeletingAnalysis || isReprocessingIso} sx={btnSoftDangerSx}>
          {deletingProcessed ? 'Eliminando...' : 'Eliminar análisis procesados'}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 1.5 }}>{success}</Alert>}
      <IsoDebugResultDialog
        open={debugDialogOpen}
        result={debugResult}
        onClose={() => setDebugDialogOpen(false)}
      />

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
                  disabled={isDeletingAnalysis || isReprocessingIso}
                />
              </TableCell>
              <TableCell sx={headCellSx}>Archivo</TableCell>
              <TableCell sx={headCellSx}>Fecha de procesamiento</TableCell>
              <TableCell sx={headCellSx}>Total registros</TableCell>
              <TableCell sx={headCellSx}>Total desvíos</TableCell>
              <TableCell sx={headCellSx}>Internos</TableCell>
              <TableCell sx={headCellSx}>Externos</TableCell>
              <TableCell sx={headCellSx}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!loading && items.map((analysis) => (
              (() => {
                const summary = analysis.summary || {};
                const totalDesvios = toNumber(summary.totalDesvios);
                const totalInternos = toNumber(summary.totalInternos ?? summary.byAlcance?.Interno ?? summary.byAlcance?.interno);
                const totalExternos = toNumber(summary.totalExternos ?? summary.byAlcance?.Externo ?? summary.byAlcance?.externo);
                const recordsCount = getRecordsCount(analysis);
                const manualCount = getManualCount(analysis);
                return (
              <TableRow
                key={analysis.id}
                hover
                sx={{
                  '& td': { borderBottom: '1px solid rgba(226,232,240,0.75)' },
                  '&:hover': { backgroundColor: 'rgba(59,130,246,0.05)' }
                }}
              >
                <TableCell padding="checkbox">
                  <Checkbox checked={selectedSet.has(analysis.id)} onChange={() => toggleSelectOne(analysis.id)} disabled={isDeletingAnalysis || isReprocessingIso} />
                </TableCell>
                <TableCell sx={{ maxWidth: 320 }}>
                  <Tooltip title={analysis.filename || ''} placement="top-start">
                    <Typography sx={{ fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {analysis.filename}
                    </Typography>
                  </Tooltip>
                  {isAdmin && (
                    <Box sx={{ display: 'flex', gap: 0.6, flexWrap: 'wrap', mt: 0.75 }}>
                      <Tooltip title={analysis.id || EMPTY_LABEL} placement="top-start">
                        <Typography component="span" sx={adminMetaPillSx}>ID {getShortId(analysis.id)}</Typography>
                      </Tooltip>
                      <Typography component="span" sx={adminMetaPillSx}>{analysis.status || EMPTY_LABEL}</Typography>
                      <Typography component="span" sx={adminMetaPillSx}>{formatDateTime(analysis.uploadDate)}</Typography>
                      <Typography component="span" sx={adminMetaPillSx}>{recordsCount} regs.</Typography>
                      <Typography component="span" sx={adminMetaPillSx}>{manualCount} rev. manual</Typography>
                    </Box>
                  )}
                </TableCell>
                <TableCell>{formatDateTime(analysis.uploadDate)}</TableCell>
                <TableCell>{recordsCount}</TableCell>
                <TableCell>{totalDesvios}</TableCell>
                <TableCell>{totalInternos}</TableCell>
                <TableCell>{totalExternos}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button variant="outlined" size="small" onClick={() => onSelectAnalysis(analysis.id)} sx={btnGhostSx}>Ver detalle</Button>
                    <Button variant="text" size="small" onClick={() => handleExportBulk([analysis.id])} sx={{ color: '#2563eb', fontWeight: 700 }}>Exportar</Button>
                    {isAdmin && analysis.status === 'active' && (
                      <Button variant="text" color="warning" size="small" sx={{ fontWeight: 700 }} disabled={isDeletingAnalysis || isReprocessingIso} onClick={() => handleArchiveOne(analysis)}>
                        Archivar
                      </Button>
                    )}
                    <Button variant="text" color="error" size="small" sx={{ fontWeight: 700 }} disabled={isDeletingAnalysis || isReprocessingIso} onClick={() => handleDeleteOne(analysis.id)}>Eliminar</Button>
                  </Box>
                </TableCell>
              </TableRow>
                );
              })()
            ))}
            {loading && (
              <TableRow>
                <TableCell colSpan={8} sx={{ py: 3 }}>
                  <Typography color="text.secondary">Cargando...</Typography>
                </TableCell>
              </TableRow>
            )}
            {!loading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} sx={{ py: 3 }}>
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

function IsoDebugResultDialog({ open, result, onClose }) {
  const analyses = getDebugAnalyses(result);
  const errorsCount = countDebugErrors(result);
  const recordsProcessed = Number(result?.recordsProcessed ?? result?.recordsProcessedTotal ?? 0);
  const updatedAnalyses = Number(result?.updatedAnalyses || 0);
  const changedRecords = analyses.reduce((total, item) => total + Number(item?.updatedRecordsCount || 0), 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center' }}>
        <Typography sx={{ fontWeight: 900, color: '#0f172a' }}>Diagnóstico de reproceso ISO</Typography>
        <Button variant="outlined" size="small" onClick={onClose} sx={btnGhostSx}>Cerrar</Button>
      </DialogTitle>
      <DialogContent dividers>
        {!result ? (
          <Typography color="text.secondary">Sin diagnóstico disponible.</Typography>
        ) : (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, minmax(0,1fr))' }, gap: 1, mb: 1.5 }}>
              <DebugMetric label="Análisis procesados" value={result?.analysesProcessed ?? analyses.length ?? 0} />
              <DebugMetric label="Registros procesados" value={recordsProcessed} />
              <DebugMetric label="Registros modificados" value={changedRecords} />
              <DebugMetric label="Errores" value={errorsCount} />
              {result?.duration != null && <DebugMetric label="Duración" value={result.duration} />}
            </Box>
            <Typography variant="body2" sx={{ color: '#475569', mb: 1 }}>
              Actualizó {updatedAnalyses} análisis. Revisión manual: antes {Number(result?.manualBefore || 0)} / ahora {Number(result?.manualAfter || 0)}.
            </Typography>
            {analyses.length === 0 ? (
              <Typography color="text.secondary">El backend no devolvió detalle por análisis.</Typography>
            ) : analyses.map((analysis, index) => (
              <DebugAnalysisAccordion key={analysis?.analysisId || index} analysis={analysis} />
            ))}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DebugMetric({ label, value }) {
  return (
    <Box sx={{ border: '1px solid rgba(148,163,184,0.28)', borderRadius: 1.5, p: 1, backgroundColor: '#f8fafc' }}>
      <Typography sx={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>{label}</Typography>
      <Typography sx={{ fontSize: 20, color: '#0f172a', fontWeight: 900 }}>{value ?? 0}</Typography>
    </Box>
  );
}

function DebugAnalysisAccordion({ analysis = {} }) {
  const records = Array.isArray(analysis?.records) ? analysis.records : [];
  const updatedRecords = Number(analysis?.updatedRecordsCount || 0);
  const processedRecords = Number(analysis?.recordsProcessed ?? analysis?.recordsCount ?? 0);
  const unchangedRecords = Math.max(0, processedRecords - updatedRecords);
  const visibleRecords = records.slice(0, 20);

  return (
    <Accordion disableGutters elevation={0} sx={{ mb: 1, border: '1px solid rgba(148,163,184,0.28)', borderRadius: 1.5, '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, color: '#0f172a' }}>
            {analysis?.filename || 'Análisis sin nombre'} · ID {getShortId(analysis?.analysisId)}
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: '#64748b' }}>
            Procesados {processedRecords} · modificados {updatedRecords} · sin cambios {unchangedRecords} · manual {Number(analysis?.manualAfter ?? 0)}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0,1fr))' }, gap: 1, mb: 1 }}>
          <DebugField label="Estado" value={analysis?.status} />
          <DebugField label="Lectura" value={analysis?.recordsPathRead} />
          <DebugField label="Escritura" value={analysis?.recordsPathWritten} />
          <DebugField label="Persistido" value={analysis?.persisted == null ? EMPTY_LABEL : (analysis.persisted ? 'Sí' : 'No')} />
          <DebugField label="Post-save" value={analysis?.postSaveMatchesExpected == null ? EMPTY_LABEL : (analysis.postSaveMatchesExpected ? 'OK' : 'Revisar')} />
          <DebugField label="Valor verificado" value={analysis?.postSaveValue} />
        </Box>
        {(analysis?.persistError || analysis?.error || analysis?.warning) && (
          <Alert severity="warning" sx={{ mb: 1 }}>
            {String(analysis.persistError || analysis.error || analysis.warning)}
          </Alert>
        )}
        {visibleRecords.length > 0 ? (
          <Box sx={{ display: 'grid', gap: 0.75 }}>
            {visibleRecords.map((record, index) => (
              <Box key={`${record?.recordIndex ?? index}-${record?.nextIso ?? ''}`} sx={{ border: '1px solid rgba(226,232,240,0.9)', borderRadius: 1, p: 1 }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: '#0f172a' }}>
                  Registro {record?.recordIndex ?? index} · {record?.changed ? 'modificado' : 'sin cambios'}
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: '#475569' }}>
                  ISO: {record?.prevIso || EMPTY_LABEL} → {record?.nextIso || EMPTY_LABEL}
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: '#475569' }}>
                  Regla: {record?.matchedRule || EMPTY_LABEL} · Motivo: {record?.decisionReason || EMPTY_LABEL}
                </Typography>
                {Array.isArray(record?.usedFields) && record.usedFields.length > 0 && (
                  <Typography sx={{ fontSize: 12.5, color: '#475569' }}>
                    Campos: {record.usedFields.join(', ')}
                  </Typography>
                )}
                {record?.sourceTextPreview && (
                  <Typography sx={{ fontSize: 12.5, color: '#64748b', mt: 0.25 }}>
                    {String(record.sourceTextPreview)}
                  </Typography>
                )}
              </Box>
            ))}
            {records.length > visibleRecords.length && (
              <Typography sx={{ fontSize: 12.5, color: '#64748b' }}>
                Se muestran los primeros {visibleRecords.length} de {records.length} registros de diagnóstico.
              </Typography>
            )}
          </Box>
        ) : (
          <Typography color="text.secondary">Sin registros de diagnóstico para este análisis.</Typography>
        )}
      </AccordionDetails>
    </Accordion>
  );
}

function DebugField({ label, value }) {
  const safeValue = value == null || value === '' ? EMPTY_LABEL : String(value);
  return (
    <Box sx={{ border: '1px solid rgba(226,232,240,0.9)', borderRadius: 1, p: 0.85 }}>
      <Typography sx={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>{label}</Typography>
      <Typography sx={{ fontSize: 13, color: '#0f172a', fontWeight: 700, wordBreak: 'break-word' }}>{safeValue}</Typography>
    </Box>
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

const adminMetaPillSx = {
  display: 'inline-flex',
  alignItems: 'center',
  maxWidth: '100%',
  px: 0.75,
  py: 0.25,
  borderRadius: 1,
  border: '1px solid rgba(148,163,184,0.35)',
  backgroundColor: 'rgba(241,245,249,0.8)',
  color: '#475569',
  fontSize: 11.5,
  fontWeight: 800,
  lineHeight: 1.4,
  whiteSpace: 'nowrap'
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

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from '@mui/material';
import NutritionModuleForm from './NutritionModuleForm';
import NutritionModulesTable from './NutritionModulesTable';
import {
  createNutritionModule,
  deleteNutritionModuleFile,
  downloadNutritionModuleFile,
  deleteNutritionModule,
  downloadNutritionModule,
  exportNutritionModuleExcel,
  getNutritionModuleFiles,
  getNutritionModules,
  uploadNutritionModuleFiles,
  updateNutritionModule,
  updateNutritionModuleStatus
} from '../services/nutritionModulesService';

function canManageRole(role) {
  const normalized = String(role || '').toLowerCase();
  return normalized === 'admin';
}

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['pdf', 'xls', 'xlsx', 'csv', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'webp', 'txt']);
const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

function normalizeSearchValue(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function PaginationControls({ page, totalPages, pageSize, totalItems, startItem, endItem, onPageChange, onPageSizeChange }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TextField
          size="small"
          select
          label="Por página"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          sx={{ minWidth: 120 }}
        >
          {PAGE_SIZE_OPTIONS.map((option) => (
            <MenuItem key={option} value={option}>{option}</MenuItem>
          ))}
        </TextField>
        <Typography variant="body2" color="text.secondary">
          Mostrando {startItem}-{endItem} de {totalItems} módulos
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button variant="outlined" size="small" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Anterior
        </Button>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Página {page} de {totalPages}
        </Typography>
        <Button variant="outlined" size="small" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Siguiente
        </Button>
      </Box>
    </Box>
  );
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (!value || value < 0) return '-';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NutritionModulesPage({ user }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [editingFiles, setEditingFiles] = useState([]);
  const [filesDialogOpen, setFilesDialogOpen] = useState(false);
  const [filesDialogRow, setFilesDialogRow] = useState(null);
  const [filesDialogFiles, setFilesDialogFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [attachmentsFilter, setAttachmentsFilter] = useState('todos');
  const [selectedDate, setSelectedDate] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const canManage = useMemo(() => canManageRole(user?.role), [user?.role]);
  const filteredRows = useMemo(() => {
    const search = normalizeSearchValue(searchTerm);
    return rows.filter((row) => {
      const title = normalizeSearchValue(row?.title || '');
      const description = normalizeSearchValue(row?.description || '');
      const content = normalizeSearchValue(row?.content || '');
      const status = String(row?.status || 'borrador').toLowerCase();
      const filesCount = Number(row?.filesCount || 0);
      const updatedRaw = row?.updatedAt || row?.updated_at || row?.createdAt || row?.created_at || null;
      const moduleDate = updatedRaw ? new Date(updatedRaw) : null;
      const hasValidDate = moduleDate && !Number.isNaN(moduleDate.getTime());

      const matchesSearch = !search || title.includes(search) || description.includes(search) || content.includes(search);
      const matchesStatus = statusFilter === 'todos' || status === statusFilter;
      const matchesAttachments = attachmentsFilter === 'todos'
        || (attachmentsFilter === 'con_adjuntos' && filesCount > 0)
        || (attachmentsFilter === 'sin_adjuntos' && filesCount === 0);
      if (selectedDate) {
        if (!hasValidDate) return false;
        const start = new Date(selectedDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(selectedDate);
        end.setHours(23, 59, 59, 999);
        if (moduleDate < start || moduleDate > end) return false;
      }

      if (dateFrom) {
        if (!hasValidDate) return false;
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (moduleDate < from) return false;
      }

      if (dateTo) {
        if (!hasValidDate) return false;
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (moduleDate > to) return false;
      }

      return matchesSearch && matchesStatus && matchesAttachments;
    });
  }, [rows, searchTerm, statusFilter, attachmentsFilter, selectedDate, dateFrom, dateTo]);

  const totalItems = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedRows = filteredRows.slice(startIndex, endIndex);
  const startItem = totalItems === 0 ? 0 : startIndex + 1;
  const endItem = totalItems === 0 ? 0 : Math.min(endIndex, totalItems);

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage);
    }
  }, [page, safePage]);

  useEffect(() => {
    void loadRows();
  }, []);

  const loadRows = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getNutritionModules();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar módulos');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    if (!canManage) return;
    setEditingRow(null);
    setFormOpen(true);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(1);
  };

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(1);
  };

  const handleAttachmentsFilterChange = (event) => {
    setAttachmentsFilter(event.target.value);
    setPage(1);
  };

  const handleSelectedDateChange = (event) => {
    setSelectedDate(event.target.value);
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const handleDateFromChange = (event) => {
    setDateFrom(event.target.value);
    setSelectedDate('');
    setPage(1);
  };

  const handleDateToChange = (event) => {
    setDateTo(event.target.value);
    setSelectedDate('');
    setPage(1);
  };

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
  };

  const handlePageSizeChange = (nextPageSize) => {
    setPageSize(nextPageSize);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('todos');
    setAttachmentsFilter('todos');
    setSelectedDate('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
    setPageSize(10);
  };

  const handleEdit = (row) => {
    if (!canManage) return;
    setEditingRow(row);
    void loadFilesForEditing(row.id);
    setFormOpen(true);
  };

  const loadFilesForEditing = async (moduleId) => {
    try {
      const files = await getNutritionModuleFiles(moduleId);
      setEditingFiles(Array.isArray(files) ? files : []);
    } catch {
      setEditingFiles([]);
    }
  };

  const handleSubmit = async (payload) => {
    if (!canManage) return;
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const files = Array.isArray(payload.files) ? payload.files : [];
      if (editingRow?.id) {
        await updateNutritionModule(editingRow.id, payload);
        if (files.length) {
          await uploadNutritionModuleFiles(editingRow.id, files);
        }
        setSuccess('Módulo actualizado correctamente');
      } else {
        const created = await createNutritionModule(payload);
        if (created?.id && files.length) {
          await uploadNutritionModuleFiles(created.id, files);
        }
        setSuccess('Módulo creado correctamente');
      }
      setFormOpen(false);
      setEditingRow(null);
      setEditingFiles([]);
      await loadRows();
    } catch (err) {
      setError(err.message || 'No se pudo guardar módulo');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (row, status) => {
    if (!canManage) return;
    try {
      setError('');
      setSuccess('');
      await updateNutritionModuleStatus(row.id, status);
      setSuccess(status === 'publicado' ? 'Módulo publicado' : 'Módulo archivado');
      await loadRows();
    } catch (err) {
      setError(err.message || 'No se pudo actualizar estado');
    }
  };

  const handleDownload = async (row) => {
    try {
      setError('');
      await downloadNutritionModule(row.id);
    } catch (err) {
      setError(err.message || 'No se pudo descargar módulo');
    }
  };

  const handleDelete = async (row) => {
    if (!canManage) return;
    const confirmed = window.confirm('¿Seguro que querés borrar este módulo? Esta acción no se puede deshacer.');
    if (!confirmed) return;

    try {
      setError('');
      setSuccess('');
      await deleteNutritionModule(row.id);
      setSuccess('Módulo eliminado correctamente');
      await loadRows();
    } catch (err) {
      setError(err.message || 'No se pudo eliminar módulo');
    }
  };

  const handleViewFiles = async (row) => {
    try {
      setError('');
      const files = await getNutritionModuleFiles(row.id);
      setFilesDialogRow(row);
      setFilesDialogFiles(Array.isArray(files) ? files : []);
      setFilesDialogOpen(true);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar archivos adjuntos');
    }
  };

  const handleDeleteFile = async (file) => {
    if (!canManage) return;
    const confirmed = window.confirm('¿Seguro que querés borrar este archivo adjunto? Esta acción no se puede deshacer.');
    if (!confirmed) return;
    try {
      setError('');
      await deleteNutritionModuleFile(file.id);
      setEditingFiles((prev) => prev.filter((item) => item.id !== file.id));
      setFilesDialogFiles((prev) => prev.filter((item) => item.id !== file.id));
      await loadRows();
    } catch (err) {
      setError(err.message || 'No se pudo borrar archivo adjunto');
    }
  };

  const handleDownloadFile = async (file) => {
    try {
      setError('');
      await downloadNutritionModuleFile(file.id);
    } catch (err) {
      setError(err.message || 'No se pudo descargar archivo adjunto');
    }
  };

  const handleUploadFilesFromDialog = async (event) => {
    if (!canManage) return;
    const row = filesDialogRow;
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!row?.id || !files.length) return;

    for (const file of files) {
      const ext = String(file.name || '').split('.').pop()?.toLowerCase() || '';
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        setError(`Archivo no permitido: ${file.name}`);
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`El archivo "${file.name}" supera el máximo de 25 MB`);
        return;
      }
    }

    try {
      setError('');
      setUploadingFiles(true);
      await uploadNutritionModuleFiles(row.id, files);
      const updated = await getNutritionModuleFiles(row.id);
      setFilesDialogFiles(Array.isArray(updated) ? updated : []);
      if (editingRow?.id === row.id) {
        setEditingFiles(Array.isArray(updated) ? updated : []);
      }
      await loadRows();
    } catch (err) {
      setError(err.message || 'No se pudieron subir archivos adjuntos');
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleExportExcel = async (row) => {
    try {
      setError('');
      await exportNutritionModuleExcel(row.id);
    } catch (err) {
      setError(err.message || 'No se pudo exportar módulo a Excel');
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.25, gap: 1 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>Módulos Nutricionales</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.4 }}>
              {canManage
                ? 'Creá, editá, publicá, archivá y descargá módulos del área nutricional.'
                : 'Consultá y descargá los módulos nutricionales publicados.'}
            </Typography>
          </Box>
          {canManage && (
            <Button variant="contained" onClick={handleCreate}>Crear módulo</Button>
          )}
        </Box>

        {error && <Alert severity="error" sx={{ mb: 1.2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 1.2 }}>{success}</Alert>}

        {loading ? (
          <Box sx={{ py: 2 }}><CircularProgress size={22} /></Box>
        ) : (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr repeat(5, minmax(130px, 1fr)) auto' }, gap: 1, mb: 1.2 }}>
              <TextField
                size="small"
                label="Buscar módulo..."
                placeholder="Buscar módulo..."
                value={searchTerm}
                onChange={handleSearchChange}
              />
              <TextField size="small" select label="Estado" value={statusFilter} onChange={handleStatusFilterChange}>
                <MenuItem value="todos">Todos</MenuItem>
                <MenuItem value="publicado">Publicado</MenuItem>
                <MenuItem value="archivado">Archivado</MenuItem>
                <MenuItem value="borrador">Borrador</MenuItem>
              </TextField>
              <TextField size="small" select label="Adjuntos" value={attachmentsFilter} onChange={handleAttachmentsFilterChange}>
                <MenuItem value="todos">Todos</MenuItem>
                <MenuItem value="con_adjuntos">Con adjuntos</MenuItem>
                <MenuItem value="sin_adjuntos">Sin adjuntos</MenuItem>
              </TextField>
              <TextField
                size="small"
                type="date"
                label="Día"
                InputLabelProps={{ shrink: true }}
                value={selectedDate}
                onChange={handleSelectedDateChange}
              />
              <TextField
                size="small"
                type="date"
                label="Desde"
                InputLabelProps={{ shrink: true }}
                value={dateFrom}
                onChange={handleDateFromChange}
              />
              <TextField
                size="small"
                type="date"
                label="Hasta"
                InputLabelProps={{ shrink: true }}
                value={dateTo}
                onChange={handleDateToChange}
              />
              <Button variant="outlined" onClick={handleClearFilters}>Limpiar filtros</Button>
            </Box>

            <Box sx={{ mb: 1.1 }}>
              <PaginationControls
                page={safePage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={totalItems}
                startItem={startItem}
                endItem={endItem}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </Box>

            <NutritionModulesTable
              rows={paginatedRows}
              canManage={canManage}
              onEdit={handleEdit}
              onPublish={(row) => handleStatusChange(row, 'publicado')}
              onArchive={(row) => handleStatusChange(row, 'archivado')}
              onDelete={handleDelete}
              onDownload={handleDownload}
              onExportExcel={handleExportExcel}
              onViewFiles={handleViewFiles}
              emptyMessage="No se encontraron módulos con los filtros aplicados."
            />

            <Box sx={{ mt: 1.1 }}>
              <PaginationControls
                page={safePage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={totalItems}
                startItem={startItem}
                endItem={endItem}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </Box>
          </>
        )}
      </CardContent>

      <NutritionModuleForm
        open={formOpen}
        onClose={() => {
          if (saving) return;
          setFormOpen(false);
          setEditingRow(null);
        }}
        onSubmit={handleSubmit}
        initialData={editingRow}
        canEditStatus={canManage}
        saving={saving}
        existingFiles={editingFiles}
        onDownloadFile={handleDownloadFile}
        onDeleteFile={handleDeleteFile}
      />

      <Dialog open={filesDialogOpen} onClose={() => setFilesDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Archivos adjuntos: {filesDialogRow?.title || ''}</DialogTitle>
        <DialogContent>
          {!filesDialogFiles.length && (
            <Typography color="text.secondary">Este módulo no tiene archivos adjuntos.</Typography>
          )}
          {filesDialogFiles.map((file) => (
            <Box key={file.id} sx={{ display: 'flex', gap: 0.75, alignItems: 'center', justifyContent: 'space-between', py: 0.5 }}>
              <Box>
                <Typography sx={{ fontWeight: 600 }}>{file.fileName}</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {file.fileType || '-'} • {formatBytes(file.fileSize)} • {file.createdAt ? new Date(file.createdAt).toLocaleString('es-AR') : '-'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.75 }}>
                <Button size="small" variant="outlined" onClick={() => handleDownloadFile(file)}>Descargar archivo</Button>
                {canManage && (
                  <Button size="small" color="error" variant="outlined" onClick={() => handleDeleteFile(file)}>Borrar archivo</Button>
                )}
              </Box>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          {canManage && (
            <Button component="label" variant="outlined" disabled={uploadingFiles}>
              {uploadingFiles ? 'Subiendo...' : 'Subir archivos'}
              <input hidden type="file" multiple onChange={handleUploadFilesFromDialog} />
            </Button>
          )}
          <Button onClick={() => setFilesDialogOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

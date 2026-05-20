import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
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
  updateNutritionModule
} from '../services/nutritionModulesService';

function canManageRole(role) {
  const normalized = String(role || '').trim().toLowerCase();
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

function PaginationControls({ idPrefix, page, totalPages, pageSize, totalItems, startItem, endItem, onPageChange, onPageSizeChange }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TextField
          id={`${idPrefix}-page-size`}
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
          Mostrando {startItem}-{endItem} de {totalItems} documentos
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedSection, setSelectedSection] = useState('todos');

  const canManage = useMemo(() => canManageRole(user?.role), [user?.role]);
  const filteredRows = useMemo(() => {
    const search = normalizeSearchValue(searchTerm);
    return rows.filter((row) => {
      const title = normalizeSearchValue(row?.title || '');
      const moduleType = String(row?.moduleType || row?.module_type || '').toLowerCase();

      const matchesSearch = !search || title.includes(search);
      const matchesSection = selectedSection === 'todos' || moduleType === selectedSection;
      return matchesSearch && matchesSection;
    });
  }, [rows, searchTerm, selectedSection]);

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
      setError(err.message || 'No se pudieron cargar documentos');
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

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
  };

  const handlePageSizeChange = (nextPageSize) => {
    setPageSize(nextPageSize);
    setPage(1);
  };

  const handleSectionChange = (_event, nextSection) => {
    if (!nextSection) return;
    setSelectedSection(nextSection);
    setPage(1);
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
        setSuccess('Documento actualizado correctamente');
      } else {
        const created = await createNutritionModule(payload);
        if (created?.id && files.length) {
          await uploadNutritionModuleFiles(created.id, files);
        }
        setSuccess('Documento creado correctamente');
      }
      setFormOpen(false);
      setEditingRow(null);
      setEditingFiles([]);
      await loadRows();
    } catch (err) {
      setError(err.message || 'No se pudo guardar documento');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async (row) => {
    try {
      setError('');
      await downloadNutritionModule(row.id);
    } catch (err) {
      setError(err.message || 'No se pudo descargar documento');
    }
  };

  const handleDelete = async (row) => {
    if (!canManage) return;
    const confirmed = window.confirm('¿Seguro que querés borrar este documento? Esta acción no se puede deshacer.');
    if (!confirmed) return;

    try {
      setError('');
      setSuccess('');
      await deleteNutritionModule(row.id);
      setSuccess('Documento eliminado correctamente');
      await loadRows();
    } catch (err) {
      setError(err.message || 'No se pudo eliminar documento');
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
      setError(err.message || 'No se pudo exportar documento a Excel');
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.25, gap: 1 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>Documentos SGC</Typography>
            <Typography sx={{ mt: 0.4, color: '#1f2f4a' }}>
              {canManage
                ? 'Creá, editá y descargá documentos del Sistema de Gestión de Calidad.'
                : 'Consultá y descargá documentos del Sistema de Gestión de Calidad.'}
            </Typography>
          </Box>
          {canManage && (
            <Button variant="contained" onClick={handleCreate}>Crear documento</Button>
          )}
        </Box>

        {error && <Alert severity="error" sx={{ mb: 1.2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 1.2 }}>{success}</Alert>}

        {loading ? (
          <Box sx={{ py: 2 }}><CircularProgress size={22} /></Box>
        ) : (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(220px, 360px)' }, gap: 1, mb: 1.2 }}>
              <Box sx={{ gridColumn: '1 / -1' }}>
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={selectedSection}
                  onChange={handleSectionChange}
                  aria-label="Apartado de documentos"
                >
                  <ToggleButton value="todos">Todos</ToggleButton>
                  <ToggleButton value="procedimiento">Procedimientos</ToggleButton>
                  <ToggleButton value="registro">Registros</ToggleButton>
                  <ToggleButton value="estrategias">Estrategias</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <TextField
                id="nutrition-modules-search"
                size="small"
                label="Buscar por nombre..."
                placeholder="Buscar por nombre..."
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </Box>

            <Box sx={{ mb: 1.1 }}>
              <PaginationControls
                idPrefix="nutrition-modules-top"
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
              onDelete={handleDelete}
              onDownload={handleDownload}
              onExportExcel={handleExportExcel}
              onViewFiles={handleViewFiles}
              emptyMessage="No se encontraron documentos para la búsqueda aplicada."
            />

            <Box sx={{ mt: 1.1 }}>
              <PaginationControls
                idPrefix="nutrition-modules-bottom"
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
        saving={saving}
        existingFiles={editingFiles}
        onDownloadFile={handleDownloadFile}
        onDeleteFile={handleDeleteFile}
      />

      <Dialog open={filesDialogOpen} onClose={() => setFilesDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Archivos adjuntos: {filesDialogRow?.title || ''}</DialogTitle>
        <DialogContent>
          {!filesDialogFiles.length && (
            <Typography color="text.secondary">Este documento no tiene archivos adjuntos.</Typography>
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

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
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
  return normalized === 'admin' || normalized === 'nutricionista';
}

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['pdf', 'xls', 'xlsx', 'csv', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'webp', 'txt']);

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

  const canManage = useMemo(() => canManageRole(user?.role), [user?.role]);

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
    setEditingRow(null);
    setFormOpen(true);
  };

  const handleEdit = (row) => {
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
          <NutritionModulesTable
            rows={rows}
            canManage={canManage}
            onEdit={handleEdit}
            onPublish={(row) => handleStatusChange(row, 'publicado')}
            onArchive={(row) => handleStatusChange(row, 'archivado')}
            onDelete={handleDelete}
            onDownload={handleDownload}
            onExportExcel={handleExportExcel}
            onViewFiles={handleViewFiles}
          />
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

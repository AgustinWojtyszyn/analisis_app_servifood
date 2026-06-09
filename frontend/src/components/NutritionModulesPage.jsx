import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from '@mui/material';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import CloudDownloadRoundedIcon from '@mui/icons-material/CloudDownloadRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import DriveFileMoveRoundedIcon from '@mui/icons-material/DriveFileMoveRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import KeyboardBackspaceRoundedIcon from '@mui/icons-material/KeyboardBackspaceRounded';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import NoteAddRoundedIcon from '@mui/icons-material/NoteAddRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import NutritionModuleForm from './NutritionModuleForm';
import {
  analyzeNutritionModuleZip,
  confirmNutritionModuleZipImport,
  createNutritionModule,
  createNutritionModuleFolder,
  deleteNutritionModuleFile,
  deleteNutritionModuleFolder,
  downloadNutritionModuleFile,
  deleteNutritionModule,
  downloadNutritionModule,
  exportNutritionModuleExcel,
  getNutritionModuleFiles,
  getNutritionModuleFolders,
  getNutritionModules,
  moveNutritionModule,
  uploadNutritionModuleFiles,
  updateNutritionModule,
  updateNutritionModuleFolder
} from '../services/nutritionModulesService';

function canManageRole(role) {
  return String(role || '').trim().toLowerCase() === 'admin';
}

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_ZIP_FILE_SIZE_BYTES = 100 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['pdf', 'xls', 'xlsx', 'csv', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'webp', 'txt']);

function normalizeSearchValue(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (!value || value < 0) return '-';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-AR');
}

function filesLabel(value) {
  const count = Number(value || 0);
  if (count <= 0) return 'Sin adjuntos';
  if (count === 1) return '1 adjunto';
  return `${count} adjuntos`;
}

function FolderDialog({ open, mode, initialData, folders, currentFolderId, onClose, onSubmit, saving }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const blockedIds = useMemo(() => {
    if (!initialData?.id) return new Set();
    const blocked = new Set([initialData.id]);
    let changed = true;
    while (changed) {
      changed = false;
      folders.forEach((folder) => {
        if (folder.parentId && blocked.has(folder.parentId) && !blocked.has(folder.id)) {
          blocked.add(folder.id);
          changed = true;
        }
      });
    }
    return blocked;
  }, [folders, initialData?.id]);

  useEffect(() => {
    if (!open) return;
    setName(initialData?.name || '');
    setDescription(initialData?.description || '');
    setParentId(initialData?.parentId || currentFolderId || '');
  }, [open, initialData, currentFolderId]);

  const availableFolders = folders.filter((folder) => !blockedIds.has(folder.id));

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'edit' ? 'Editar carpeta' : 'Nueva carpeta'}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1, display: 'grid', gap: 1.25 }}>
          <TextField label="Nombre" value={name} onChange={(event) => setName(event.target.value)} required fullWidth />
          <TextField label="Descripción" value={description} onChange={(event) => setDescription(event.target.value)} fullWidth multiline minRows={2} />
          <TextField select label="Ubicación" value={parentId} onChange={(event) => setParentId(event.target.value)} fullWidth>
            <MenuItem value="">Raíz</MenuItem>
            {availableFolders.map((folder) => (
              <MenuItem key={folder.id} value={folder.id}>{folder.name}</MenuItem>
            ))}
          </TextField>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button
          variant="contained"
          disabled={saving}
          onClick={() => onSubmit({ name: name.trim(), description: description.trim(), parentId: parentId || null })}
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function MoveDocumentDialog({ open, row, folders, onClose, onSubmit, saving }) {
  const [folderId, setFolderId] = useState('');

  useEffect(() => {
    if (!open) return;
    setFolderId(row?.folderId || '');
  }, [open, row]);

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Mover documento</DialogTitle>
      <DialogContent>
        <TextField
          select
          label="Nueva ubicación"
          value={folderId}
          onChange={(event) => setFolderId(event.target.value)}
          fullWidth
          sx={{ mt: 1 }}
        >
          <MenuItem value="">Raíz / Sin carpeta</MenuItem>
          {folders.map((folder) => (
            <MenuItem key={folder.id} value={folder.id}>{folder.name}</MenuItem>
          ))}
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" onClick={() => onSubmit(folderId || null)} disabled={saving}>
          {saving ? 'Moviendo...' : 'Mover'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ExplorerRow({ icon, title, meta, actions, onOpen }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, 1.4fr) minmax(160px, 0.9fr) auto' },
        gap: 1,
        alignItems: 'center',
        px: 1.1,
        py: 0.9,
        borderBottom: '1px solid rgba(148, 163, 184, 0.22)',
        '&:hover': { bgcolor: 'rgba(15, 23, 42, 0.04)' }
      }}
    >
      <Button
        onClick={onOpen}
        startIcon={icon}
        sx={{ justifyContent: 'flex-start', textAlign: 'left', px: 0.5, fontWeight: 800, minWidth: 0 }}
      >
        <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</Box>
      </Button>
      <Typography variant="body2" color="text.secondary">{meta}</Typography>
      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: { xs: 'flex-start', md: 'flex-end' }, flexWrap: 'wrap' }}>
        {actions}
      </Box>
    </Box>
  );
}

function buildImportReport(result) {
  if (!result) return '';
  const lines = [
    'Reporte de importación ZIP - Documentos SGC',
    `Importados: ${result.imported || 0}`,
    `Omitidos: ${result.skipped || 0}`,
    `Duplicados: ${result.duplicates || 0}`,
    `Fallidos: ${result.failed || 0}`,
    '',
    'Detalle:'
  ];
  (result.rows || []).forEach((row) => {
    lines.push(`${row.status || '-'};${row.path || '-'};${row.message || row.documentId || ''}`);
  });
  if (result.warnings?.length) {
    lines.push('', 'Advertencias:');
    result.warnings.forEach((warning) => lines.push(`- ${warning}`));
  }
  return lines.join('\n');
}

function ZipImportDialog({ open, onClose, onAnalyze, onConfirm, analyzing, importing, analysis, result }) {
  const [selectedZip, setSelectedZip] = useState(null);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!open) return;
    setSelectedZip(null);
    setLocalError('');
  }, [open]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    event.target.value = '';
    setLocalError('');
    if (!file) {
      setSelectedZip(null);
      return;
    }
    if (!String(file.name || '').toLowerCase().endsWith('.zip')) {
      setLocalError('El archivo debe tener extensión .zip');
      setSelectedZip(null);
      return;
    }
    if (file.size > MAX_ZIP_FILE_SIZE_BYTES) {
      setLocalError(`El ZIP no puede superar ${formatBytes(MAX_ZIP_FILE_SIZE_BYTES)}`);
      setSelectedZip(null);
      return;
    }
    setSelectedZip(file);
  };

  const handleDownloadReport = () => {
    const text = buildImportReport(result);
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_importacion_sgc_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const busy = analyzing || importing;
  const summary = analysis?.summary || null;
  const canImport = Boolean(analysis?.token && selectedZip && analysis.fileName === selectedZip.name && !result);

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>Importar ZIP</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1, display: 'grid', gap: 1.25 }}>
          <Alert severity="info">
            Se conservará la estructura interna de carpetas. Si el ZIP contiene una carpeta envolvente DOCUMENTOS-SERVIFOOD, se importará su contenido.
          </Alert>
          <Alert severity="warning">
            Se ignorarán archivos temporales, ocultos del sistema, vacíos, rutas sospechosas, ZIPs internos y extensiones no admitidas. Tamaño máximo: {formatBytes(MAX_ZIP_FILE_SIZE_BYTES)}.
          </Alert>
          {localError && <Alert severity="error">{localError}</Alert>}
          <Button component="label" variant="outlined" startIcon={<UploadFileRoundedIcon />} disabled={busy}>
            Seleccionar ZIP
            <input hidden type="file" accept=".zip,application/zip" onChange={handleFileChange} />
          </Button>
          {selectedZip && (
            <Typography variant="body2" color="text.secondary">
              {selectedZip.name} · {formatBytes(selectedZip.size)}
            </Typography>
          )}
          {summary && (
            <Box sx={{ border: '1px solid rgba(148, 163, 184, 0.28)', borderRadius: 1, p: 1 }}>
              <Typography sx={{ fontWeight: 800, mb: 0.75 }}>Vista previa</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 0.75 }}>
                <Typography>Carpetas nuevas: <strong>{summary.foldersNew}</strong></Typography>
                <Typography>Carpetas existentes: <strong>{summary.foldersExisting}</strong></Typography>
                <Typography>Documentos nuevos: <strong>{summary.documentsNew}</strong></Typography>
                <Typography>Archivos omitidos: <strong>{summary.filesSkipped}</strong></Typography>
                <Typography>Duplicados: <strong>{summary.duplicates}</strong></Typography>
                <Typography>Inválidos: <strong>{summary.invalidFiles}</strong></Typography>
                <Typography>Tamaño descomprimido: <strong>{formatBytes(summary.totalUncompressedBytes)}</strong></Typography>
              </Box>
              {!!summary.warnings?.length && (
                <Box sx={{ mt: 1, maxHeight: 180, overflow: 'auto' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 13 }}>Advertencias</Typography>
                  {summary.warnings.slice(0, 60).map((warning, index) => (
                    <Typography key={`${warning}-${index}`} variant="body2" color="text.secondary">- {warning}</Typography>
                  ))}
                  {summary.warnings.length > 60 && (
                    <Typography variant="body2" color="text.secondary">Se muestran las primeras 60 advertencias.</Typography>
                  )}
                </Box>
              )}
            </Box>
          )}
          {result && (
            <Box sx={{ border: '1px solid rgba(148, 163, 184, 0.28)', borderRadius: 1, p: 1 }}>
              <Typography sx={{ fontWeight: 800, mb: 0.75 }}>Resultado final</Typography>
              <Typography>Importados: <strong>{result.imported || 0}</strong></Typography>
              <Typography>Omitidos: <strong>{result.skipped || 0}</strong></Typography>
              <Typography>Duplicados: <strong>{result.duplicates || 0}</strong></Typography>
              <Typography>Fallidos: <strong>{result.failed || 0}</strong></Typography>
              {!!result.rows?.length && (
                <Box sx={{ mt: 1, maxHeight: 220, overflow: 'auto' }}>
                  {result.rows.slice(0, 80).map((row, index) => (
                    <Typography key={`${row.path}-${index}`} variant="body2" color="text.secondary">
                      {row.status}: {row.path}{row.message ? ` - ${row.message}` : ''}
                    </Typography>
                  ))}
                  {result.rows.length > 80 && (
                    <Typography variant="body2" color="text.secondary">Se muestran los primeros 80 registros. Descargá el reporte para ver todo.</Typography>
                  )}
                </Box>
              )}
            </Box>
          )}
          {(analyzing || importing) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="body2">{analyzing ? 'Analizando ZIP...' : 'Importando documentos...'}</Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        {result && <Button variant="outlined" onClick={handleDownloadReport}>Descargar reporte</Button>}
        <Button onClick={onClose} disabled={busy}>Cerrar</Button>
        <Button variant="outlined" onClick={() => selectedZip && onAnalyze(selectedZip)} disabled={!selectedZip || busy}>
          Analizar ZIP
        </Button>
        <Button variant="contained" onClick={onConfirm} disabled={!canImport || busy}>
          Importar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function NutritionModulesPage({ user }) {
  const [rows, setRows] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [editingFiles, setEditingFiles] = useState([]);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [moveDocumentRow, setMoveDocumentRow] = useState(null);
  const [filesDialogOpen, setFilesDialogOpen] = useState(false);
  const [filesDialogRow, setFilesDialogRow] = useState(null);
  const [filesDialogFiles, setFilesDialogFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [zipDialogOpen, setZipDialogOpen] = useState(false);
  const [zipAnalyzing, setZipAnalyzing] = useState(false);
  const [zipImporting, setZipImporting] = useState(false);
  const [zipAnalysis, setZipAnalysis] = useState(null);
  const [zipResult, setZipResult] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState('todos');

  const canManage = useMemo(() => canManageRole(user?.role), [user?.role]);
  const folderById = useMemo(() => new Map(folders.map((folder) => [folder.id, folder])), [folders]);

  const breadcrumbs = useMemo(() => {
    const chain = [];
    let cursor = currentFolderId ? folderById.get(currentFolderId) : null;
    const visited = new Set();
    while (cursor && !visited.has(cursor.id)) {
      chain.unshift(cursor);
      visited.add(cursor.id);
      cursor = cursor.parentId ? folderById.get(cursor.parentId) : null;
    }
    return chain;
  }, [currentFolderId, folderById]);

  const search = normalizeSearchValue(searchTerm);
  const currentFolders = folders.filter((folder) => {
    const matchesLocation = search ? true : (folder.parentId || null) === (currentFolderId || null);
    return matchesLocation && (!search || normalizeSearchValue(folder.name).includes(search));
  });
  const currentRows = rows.filter((row) => {
    const moduleType = String(row?.moduleType || row?.module_type || '').toLowerCase();
    const matchesLocation = search ? true : (row.folderId || null) === (currentFolderId || null);
    const matchesSearch = !search || normalizeSearchValue(row?.title || '').includes(search);
    const matchesSection = selectedSection === 'todos' || moduleType === selectedSection;
    return matchesLocation && matchesSearch && matchesSection;
  });
  const currentParentId = currentFolderId ? (folderById.get(currentFolderId)?.parentId || null) : null;

  useEffect(() => {
    void loadLibrary();
  }, []);

  const loadLibrary = async () => {
    try {
      setLoading(true);
      setError('');
      const [documentsData, foldersData] = await Promise.all([
        getNutritionModules(),
        getNutritionModuleFolders()
      ]);
      setRows(Array.isArray(documentsData) ? documentsData : []);
      setFolders(Array.isArray(foldersData) ? foldersData : []);
    } catch (err) {
      setError(err.message || 'No se pudo cargar la biblioteca documental');
      setRows([]);
      setFolders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = () => {
    if (!canManage) return;
    setEditingRow(null);
    setEditingFiles([]);
    setFormOpen(true);
  };

  const handleEditDocument = (row) => {
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

  const handleSubmitDocument = async (payload) => {
    if (!canManage) return;
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const files = Array.isArray(payload.files) ? payload.files : [];
      const payloadWithFolder = {
        ...payload,
        folderId: editingRow?.id ? (payload.folderId ?? editingRow.folderId ?? null) : (payload.folderId ?? currentFolderId ?? null)
      };
      if (editingRow?.id) {
        await updateNutritionModule(editingRow.id, payloadWithFolder);
        if (files.length) {
          await uploadNutritionModuleFiles(editingRow.id, files);
        }
        setSuccess('Documento actualizado correctamente');
      } else {
        const created = await createNutritionModule(payloadWithFolder);
        if (created?.id && files.length) {
          await uploadNutritionModuleFiles(created.id, files);
        }
        setSuccess('Documento creado correctamente');
      }
      setFormOpen(false);
      setEditingRow(null);
      setEditingFiles([]);
      await loadLibrary();
    } catch (err) {
      setError(err.message || 'No se pudo guardar documento');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitFolder = async (payload) => {
    if (!canManage) return;
    if (!payload.name) {
      setError('El nombre de la carpeta es obligatorio');
      return;
    }
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      if (editingFolder?.id) {
        await updateNutritionModuleFolder(editingFolder.id, { ...payload, status: 'activo' });
        setSuccess('Carpeta actualizada correctamente');
      } else {
        await createNutritionModuleFolder(payload);
        setSuccess('Carpeta creada correctamente');
      }
      setFolderDialogOpen(false);
      setEditingFolder(null);
      await loadLibrary();
    } catch (err) {
      setError(err.message || 'No se pudo guardar carpeta');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFolder = async (folder) => {
    if (!canManage) return;
    const confirmed = window.confirm('¿Seguro que querés archivar esta carpeta? Solo se permite si no contiene documentos ni subcarpetas activas.');
    if (!confirmed) return;
    try {
      setError('');
      setSuccess('');
      await deleteNutritionModuleFolder(folder.id);
      if (currentFolderId === folder.id) setCurrentFolderId(folder.parentId || null);
      setSuccess('Carpeta archivada correctamente');
      await loadLibrary();
    } catch (err) {
      setError(err.message || 'No se pudo archivar carpeta');
    }
  };

  const handleMoveDocument = async (folderId) => {
    if (!canManage || !moveDocumentRow?.id) return;
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      await moveNutritionModule(moveDocumentRow.id, folderId);
      setMoveDocumentRow(null);
      setSuccess('Documento movido correctamente');
      await loadLibrary();
    } catch (err) {
      setError(err.message || 'No se pudo mover documento');
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

  const handleDeleteDocument = async (row) => {
    if (!canManage) return;
    const confirmed = window.confirm('¿Seguro que querés borrar este documento? Esta acción no se puede deshacer.');
    if (!confirmed) return;
    try {
      setError('');
      setSuccess('');
      await deleteNutritionModule(row.id);
      setSuccess('Documento eliminado correctamente');
      await loadLibrary();
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
      await loadLibrary();
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

  const validateFiles = (files) => {
    const keys = new Set();
    for (const file of files) {
      const name = String(file.name || '').trim();
      const ext = name.split('.').pop()?.toLowerCase() || '';
      const key = `${name.toLowerCase()}::${file.size}`;
      if (!name || !name.includes('.')) return `Archivo sin extensión válida: ${name || 'sin nombre'}`;
      if (name.startsWith('~$')) return `No se permiten archivos temporales: ${name}`;
      if (ext === 'tmp') return `No se permiten archivos .tmp: ${name}`;
      if (!ALLOWED_EXTENSIONS.has(ext)) return `Archivo no permitido: ${name}`;
      if (file.size > MAX_FILE_SIZE_BYTES) return `El archivo "${name}" supera el máximo de 25 MB`;
      if (keys.has(key)) return `Archivo duplicado en la carga: ${name}`;
      keys.add(key);
    }
    return '';
  };

  const handleUploadFilesFromDialog = async (event) => {
    if (!canManage) return;
    const row = filesDialogRow;
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!row?.id || !files.length) return;
    const invalidReason = validateFiles(files);
    if (invalidReason) {
      setError(invalidReason);
      return;
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
      await loadLibrary();
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

  const handleAnalyzeZip = async (file) => {
    if (!canManage) return;
    try {
      setError('');
      setSuccess('');
      setZipResult(null);
      setZipAnalyzing(true);
      const analysis = await analyzeNutritionModuleZip(file);
      setZipAnalysis(analysis);
    } catch (err) {
      setError(err.message || 'No se pudo analizar el ZIP');
      setZipAnalysis(null);
    } finally {
      setZipAnalyzing(false);
    }
  };

  const handleConfirmZipImport = async () => {
    if (!canManage || !zipAnalysis?.token) return;
    try {
      setError('');
      setSuccess('');
      setZipImporting(true);
      const result = await confirmNutritionModuleZipImport(zipAnalysis.token);
      setZipResult(result);
      setSuccess(`Importación finalizada: ${result.imported || 0} documentos importados`);
      await loadLibrary();
    } catch (err) {
      setError(err.message || 'No se pudo importar el ZIP');
    } finally {
      setZipImporting(false);
    }
  };

  const handleCloseZipDialog = () => {
    if (zipAnalyzing || zipImporting) return;
    setZipDialogOpen(false);
    setZipAnalysis(null);
    setZipResult(null);
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.25, gap: 1, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>Documentos SGC</Typography>
            <Typography sx={{ mt: 0.4, color: '#1f2f4a' }}>
              {canManage ? 'Gestioná carpetas, documentos y adjuntos del SGC.' : 'Consultá documentos y adjuntos autorizados del SGC.'}
            </Typography>
          </Box>
          {canManage && (
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              <Button startIcon={<UploadFileRoundedIcon />} variant="outlined" onClick={() => setZipDialogOpen(true)}>
                Importar ZIP
              </Button>
              <Button startIcon={<FolderRoundedIcon />} variant="outlined" onClick={() => { setEditingFolder(null); setFolderDialogOpen(true); }}>
                Nueva carpeta
              </Button>
              <Button startIcon={<NoteAddRoundedIcon />} variant="contained" onClick={handleCreateDocument}>
                Crear documento
              </Button>
            </Box>
          )}
        </Box>

        {error && <Alert severity="error" sx={{ mb: 1.2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 1.2 }}>{success}</Alert>}

        {loading ? (
          <Box sx={{ py: 2 }}><CircularProgress size={22} /></Box>
        ) : (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, 420px) 1fr' }, gap: 1, alignItems: 'center', mb: 1.2 }}>
              <TextField
                id="nutrition-modules-search"
                size="small"
                label="Buscar carpeta o documento..."
                placeholder="Buscar carpeta o documento..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <ToggleButtonGroup
                size="small"
                exclusive
                value={selectedSection}
                onChange={(_event, nextSection) => nextSection && setSelectedSection(nextSection)}
                aria-label="Apartado de documentos"
                sx={{ justifyContent: { xs: 'flex-start', md: 'flex-end' }, flexWrap: 'wrap' }}
              >
                <ToggleButton value="todos">Todos</ToggleButton>
                <ToggleButton value="estrategias">Estrategias</ToggleButton>
                <ToggleButton value="procedimiento">Procedimientos</ToggleButton>
                <ToggleButton value="registro">Registros</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<KeyboardBackspaceRoundedIcon />}
                disabled={!currentFolderId}
                onClick={() => setCurrentFolderId(currentParentId)}
              >
                Volver
              </Button>
              <Breadcrumbs sx={{ minWidth: 0 }}>
                <Button size="small" onClick={() => setCurrentFolderId(null)}>Documentos SGC</Button>
                {breadcrumbs.map((folder) => (
                  <Button key={folder.id} size="small" onClick={() => setCurrentFolderId(folder.id)}>{folder.name}</Button>
                ))}
              </Breadcrumbs>
            </Box>

            <Box sx={{ border: '1px solid rgba(148, 163, 184, 0.28)', borderRadius: 1, overflow: 'hidden' }}>
              <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: 'minmax(260px, 1.4fr) minmax(160px, 0.9fr) auto', gap: 1, px: 1.1, py: 0.75, bgcolor: 'rgba(15, 23, 42, 0.04)' }}>
                <Typography sx={{ fontWeight: 800, fontSize: 13 }}>Nombre</Typography>
                <Typography sx={{ fontWeight: 800, fontSize: 13 }}>Detalle</Typography>
                <Typography sx={{ fontWeight: 800, fontSize: 13, textAlign: 'right' }}>Acciones</Typography>
              </Box>
              {[...currentFolders].map((folder) => (
                <ExplorerRow
                  key={folder.id}
                  icon={<FolderRoundedIcon color="primary" />}
                  title={folder.name}
                  meta={folder.description || `Actualizada ${formatDate(folder.updatedAt || folder.createdAt)}`}
                  onOpen={() => setCurrentFolderId(folder.id)}
                  actions={canManage && (
                    <>
                      <Tooltip title="Renombrar o mover carpeta">
                        <IconButton size="small" onClick={() => { setEditingFolder(folder); setFolderDialogOpen(true); }}><EditRoundedIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Archivar carpeta vacía">
                        <IconButton size="small" color="error" onClick={() => handleDeleteFolder(folder)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </>
                  )}
                />
              ))}
              {[...currentRows].map((row) => (
                <ExplorerRow
                  key={row.id}
                  icon={<ArticleRoundedIcon color="info" />}
                  title={row.title}
                  meta={`${row.description || 'Sin descripción'} · ${filesLabel(row.filesCount)} · ${formatDate(row.updatedAt || row.createdAt)}`}
                  onOpen={() => handleViewFiles(row)}
                  actions={(
                    <>
                      <Tooltip title="Exportar Excel">
                        <IconButton size="small" onClick={() => handleExportExcel(row)}><MoreHorizRoundedIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Descargar documento">
                        <IconButton size="small" onClick={() => handleDownload(row)}><CloudDownloadRoundedIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Ver adjuntos">
                        <IconButton size="small" onClick={() => handleViewFiles(row)}><AttachFileRoundedIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      {canManage && (
                        <>
                          <Tooltip title="Editar documento">
                            <IconButton size="small" onClick={() => handleEditDocument(row)}><EditRoundedIcon fontSize="small" /></IconButton>
                          </Tooltip>
                          <Tooltip title="Mover documento">
                            <IconButton size="small" onClick={() => setMoveDocumentRow(row)}><DriveFileMoveRoundedIcon fontSize="small" /></IconButton>
                          </Tooltip>
                          <Tooltip title="Borrar documento">
                            <IconButton size="small" color="error" onClick={() => handleDeleteDocument(row)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>
                          </Tooltip>
                        </>
                      )}
                    </>
                  )}
                />
              ))}
              {!currentFolders.length && !currentRows.length && (
                <Box sx={{ py: 3, px: 1.2 }}>
                  <Typography sx={{ fontWeight: 700 }}>
                    {searchTerm ? 'No se encontraron carpetas ni documentos.' : 'Esta carpeta todavía no contiene elementos.'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {canManage ? 'Podés crear una carpeta o documento desde las acciones superiores.' : 'Cuando haya documentos disponibles van a aparecer en este listado.'}
                  </Typography>
                </Box>
              )}
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
        onSubmit={handleSubmitDocument}
        initialData={editingRow}
        saving={saving}
        existingFiles={editingFiles}
        onDownloadFile={handleDownloadFile}
        onDeleteFile={handleDeleteFile}
        folderId={editingRow?.folderId ?? currentFolderId ?? null}
        validateFiles={validateFiles}
      />

      <FolderDialog
        open={folderDialogOpen}
        mode={editingFolder?.id ? 'edit' : 'create'}
        initialData={editingFolder}
        folders={folders}
        currentFolderId={currentFolderId}
        onClose={() => { if (!saving) { setFolderDialogOpen(false); setEditingFolder(null); } }}
        onSubmit={handleSubmitFolder}
        saving={saving}
      />

      <MoveDocumentDialog
        open={!!moveDocumentRow}
        row={moveDocumentRow}
        folders={folders}
        onClose={() => { if (!saving) setMoveDocumentRow(null); }}
        onSubmit={handleMoveDocument}
        saving={saving}
      />

      <ZipImportDialog
        open={zipDialogOpen}
        onClose={handleCloseZipDialog}
        onAnalyze={handleAnalyzeZip}
        onConfirm={handleConfirmZipImport}
        analyzing={zipAnalyzing}
        importing={zipImporting}
        analysis={zipAnalysis}
        result={zipResult}
      />

      <Dialog open={filesDialogOpen} onClose={() => setFilesDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Archivos adjuntos: {filesDialogRow?.title || ''}</DialogTitle>
        <DialogContent>
          {!filesDialogFiles.length && (
            <Typography color="text.secondary">Este documento no tiene archivos adjuntos.</Typography>
          )}
          {filesDialogFiles.map((file, index) => (
            <Box key={file.id}>
              {index > 0 && <Divider />}
              <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', justifyContent: 'space-between', py: 0.8, flexWrap: 'wrap' }}>
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>{file.fileName}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {file.fileType || '-'} · {formatBytes(file.fileSize)} · {file.createdAt ? new Date(file.createdAt).toLocaleString('es-AR') : '-'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.75 }}>
                  <Button size="small" startIcon={<CloudDownloadRoundedIcon />} variant="outlined" onClick={() => handleDownloadFile(file)}>Descargar</Button>
                  {canManage && (
                    <Button size="small" color="error" variant="outlined" onClick={() => handleDeleteFile(file)}>Borrar</Button>
                  )}
                </Box>
              </Box>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          {canManage && (
            <Button component="label" htmlFor="nutrition-module-dialog-files" startIcon={<UploadFileRoundedIcon />} variant="outlined" disabled={uploadingFiles}>
              {uploadingFiles ? 'Subiendo...' : 'Subir archivos'}
              <input id="nutrition-module-dialog-files" hidden type="file" multiple onChange={handleUploadFilesFromDialog} />
            </Button>
          )}
          <Button onClick={() => setFilesDialogOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

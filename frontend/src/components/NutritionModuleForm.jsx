import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from '@mui/material';

const EMPTY_FORM = {
  title: '',
  description: '',
  content: '',
  status: 'aprobado',
  moduleType: ''
};

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (!value || value < 0) return '-';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NutritionModuleForm({
  open,
  onClose,
  onSubmit,
  initialData,
  saving = false,
  existingFiles = [],
  onDownloadFile,
  onDeleteFile
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);

  const mode = useMemo(() => (initialData?.id ? 'edit' : 'create'), [initialData?.id]);

  useEffect(() => {
    if (!open) return;
    setError('');
    setSelectedFiles([]);
    if (initialData?.id) {
      setForm({
        title: initialData.title || '',
        description: initialData.description || '',
        content: initialData.content || '',
        status: 'aprobado',
        moduleType: initialData.moduleType || ''
      });
      return;
    }
    setForm(EMPTY_FORM);
  }, [open, initialData]);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleFilesChange = (event) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setError('El título es obligatorio');
      return;
    }
    if (!form.moduleType) {
      setError('El apartado es obligatorio');
      return;
    }
    setError('');
    await onSubmit({
      title: form.title.trim(),
      description: form.description.trim(),
      content: form.content,
      status: 'aprobado',
      moduleType: form.moduleType,
      files: selectedFiles
    });
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>{mode === 'edit' ? 'Editar documento SGC' : 'Crear documento SGC'}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1, display: 'grid', gap: 1.25 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Título" value={form.title} onChange={handleChange('title')} required fullWidth />
          <TextField label="Descripción" value={form.description} onChange={handleChange('description')} fullWidth multiline minRows={2} />
          <TextField label="Contenido" value={form.content} onChange={handleChange('content')} fullWidth multiline minRows={10} />
          <TextField
            select
            label="Apartado"
            value={form.moduleType}
            onChange={handleChange('moduleType')}
            fullWidth
            required
          >
            <MenuItem value="procedimiento">Procedimiento</MenuItem>
            <MenuItem value="registro">Registro</MenuItem>
            <MenuItem value="estrategias">Estrategias</MenuItem>
          </TextField>
          <Box>
            <Button component="label" htmlFor="nutrition-module-form-files" variant="outlined">
              Adjuntar archivos
              <input id="nutrition-module-form-files" hidden type="file" multiple onChange={handleFilesChange} />
            </Button>
            {!!selectedFiles.length && (
              <Box sx={{ mt: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 13 }}>Nuevos archivos seleccionados</Typography>
                {selectedFiles.map((file) => (
                  <Typography key={`${file.name}-${file.size}`} sx={{ fontSize: 13 }}>
                    {file.name} ({formatBytes(file.size)})
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
          {initialData?.id && (
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 0.5 }}>Archivos adjuntos</Typography>
              {!existingFiles.length && (
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Sin archivos adjuntos.</Typography>
              )}
              {existingFiles.map((file) => (
                <Box key={file.id} sx={{ display: 'flex', gap: 0.75, alignItems: 'center', mb: 0.5, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontSize: 13 }}>
                    {file.fileName} ({formatBytes(file.fileSize)})
                  </Typography>
                  <Button size="small" variant="outlined" onClick={() => onDownloadFile?.(file)}>Descargar archivo</Button>
                  <Button size="small" color="error" variant="outlined" onClick={() => onDeleteFile?.(file)}>Borrar archivo</Button>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Crear documento'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

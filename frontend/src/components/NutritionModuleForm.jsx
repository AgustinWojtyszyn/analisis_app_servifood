import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from '@mui/material';

const STATUS_OPTIONS = [
  { value: 'borrador', label: 'Borrador' },
  { value: 'publicado', label: 'Publicado' },
  { value: 'archivado', label: 'Archivado' }
];

const EMPTY_FORM = {
  title: '',
  description: '',
  content: '',
  status: 'borrador'
};

export default function NutritionModuleForm({ open, onClose, onSubmit, initialData, canEditStatus = true, saving = false }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  const mode = useMemo(() => (initialData?.id ? 'edit' : 'create'), [initialData?.id]);

  useEffect(() => {
    if (!open) return;
    setError('');
    if (initialData?.id) {
      setForm({
        title: initialData.title || '',
        description: initialData.description || '',
        content: initialData.content || '',
        status: initialData.status || 'borrador'
      });
      return;
    }
    setForm(EMPTY_FORM);
  }, [open, initialData]);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setError('El título es obligatorio');
      return;
    }
    setError('');
    await onSubmit({
      title: form.title.trim(),
      description: form.description.trim(),
      content: form.content,
      status: canEditStatus ? form.status : 'borrador'
    });
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>{mode === 'edit' ? 'Editar módulo nutricional' : 'Crear módulo nutricional'}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1, display: 'grid', gap: 1.25 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Título" value={form.title} onChange={handleChange('title')} required fullWidth />
          <TextField label="Descripción" value={form.description} onChange={handleChange('description')} fullWidth multiline minRows={2} />
          <TextField label="Contenido" value={form.content} onChange={handleChange('content')} fullWidth multiline minRows={10} />
          <TextField
            select
            label="Estado"
            value={form.status}
            onChange={handleChange('status')}
            fullWidth
            disabled={!canEditStatus}
          >
            {STATUS_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
            ))}
          </TextField>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Crear módulo'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

import React, { useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, TextField } from '@mui/material';

const initialState = {
  name: '',
  type: '',
  module: '',
  description: '',
  expirationDate: '',
  responsibleArea: '',
  responsiblePerson: ''
};

export default function CertificationForm({ open, onClose, onSubmit, initialValue = null, loading = false }) {
  const [form, setForm] = useState(initialState);

  useEffect(() => {
    if (initialValue) {
      setForm({
        name: initialValue.name || '',
        type: initialValue.type || '',
        module: initialValue.module || '',
        description: initialValue.description || '',
        expirationDate: initialValue.expirationDate || '',
        responsibleArea: initialValue.responsibleArea || '',
        responsiblePerson: initialValue.responsiblePerson || ''
      });
      return;
    }
    setForm(initialState);
  }, [initialValue, open]);

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const submit = (e) => {
    e.preventDefault();
    onSubmit?.(form);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{initialValue ? 'Editar certificación' : 'Nueva certificación'}</DialogTitle>
      <Box component="form" onSubmit={submit}>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField required fullWidth label="Nombre" value={form.name} onChange={(e) => handleChange('name', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Tipo" value={form.type} onChange={(e) => handleChange('type', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Módulo / Categoría" value={form.module} onChange={(e) => handleChange('module', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField required fullWidth type="date" label="Fecha de vencimiento" InputLabelProps={{ shrink: true }} value={form.expirationDate} onChange={(e) => handleChange('expirationDate', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Área responsable" value={form.responsibleArea} onChange={(e) => handleChange('responsibleArea', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Responsable" value={form.responsiblePerson} onChange={(e) => handleChange('responsiblePerson', e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={3} label="Descripción" value={form.description} onChange={(e) => handleChange('description', e.target.value)} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={loading}>{initialValue ? 'Guardar cambios' : 'Crear'}</Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

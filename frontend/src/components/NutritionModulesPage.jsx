import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Typography } from '@mui/material';
import NutritionModuleForm from './NutritionModuleForm';
import NutritionModulesTable from './NutritionModulesTable';
import {
  createNutritionModule,
  deleteNutritionModule,
  downloadNutritionModule,
  getNutritionModules,
  updateNutritionModule,
  updateNutritionModuleStatus
} from '../services/nutritionModulesService';

function canManageRole(role) {
  const normalized = String(role || '').toLowerCase();
  return normalized === 'admin' || normalized === 'nutricionista';
}

export default function NutritionModulesPage({ user }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);

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
    setFormOpen(true);
  };

  const handleSubmit = async (payload) => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      if (editingRow?.id) {
        await updateNutritionModule(editingRow.id, payload);
        setSuccess('Módulo actualizado correctamente');
      } else {
        await createNutritionModule(payload);
        setSuccess('Módulo creado correctamente');
      }
      setFormOpen(false);
      setEditingRow(null);
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
    const confirmed = window.confirm(`¿Eliminar el módulo "${row.title}"? Esta acción no se puede deshacer.`);
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
      />
    </Card>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Grid, Paper, Snackbar, Stack, Typography } from '@mui/material';
import CertificationForm from '../components/certifications/CertificationForm';
import CertificationTable from '../components/certifications/CertificationTable';
import {
  getCertifications,
  createCertification,
  updateCertification,
  deleteCertification,
  getCertificationNotificationPreview
} from '../services/certificationService';

function MetricCard({ label, value }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>{value}</Typography>
      </CardContent>
    </Card>
  );
}

export default function CertificationsPage() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, nearExpiration: 0, expired: 0, triggersDetected: 0 });
  const [preview, setPreview] = useState({ triggerCount: 0, message: '' });
  const [loading, setLoading] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, previewData] = await Promise.all([getCertifications(), getCertificationNotificationPreview()]);
      setItems(Array.isArray(list?.items) ? list.items : []);
      setSummary(list?.summary || { total: 0, active: 0, nearExpiration: 0, expired: 0, triggersDetected: 0 });
      setPreview({ triggerCount: previewData?.triggerCount || 0, message: previewData?.message || '' });
    } catch (e) {
      setError(e.message || 'Error cargando certificaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerBanner = useMemo(() => {
    if (!preview.triggerCount) return null;
    return `${preview.triggerCount} trigger(s) detectado(s). ${preview.message || 'Envío desactivado en período de prueba.'}`;
  }, [preview]);

  const onCreate = () => {
    setEditing(null);
    setOpenForm(true);
  };

  const onSubmit = async (payload) => {
    try {
      setLoading(true);
      if (editing?.id) {
        await updateCertification(editing.id, payload);
      } else {
        await createCertification(payload);
      }
      setOpenForm(false);
      setEditing(null);
      await loadData();
    } catch (e) {
      setError(e.message || 'Error guardando certificación');
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (item) => {
    const confirmed = window.confirm(`¿Eliminar certificación "${item?.name || ''}"?`);
    if (!confirmed) return;
    try {
      setLoading(true);
      await deleteCertification(item.id);
      await loadData();
    } catch (e) {
      setError(e.message || 'Error eliminando certificación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>Certificaciones</Typography>
          <Typography color="text.secondary">Gestión de vencimientos y triggers lógicos de notificación (sin envío real).</Typography>
        </Box>
        <Button variant="contained" onClick={onCreate} disabled={loading}>Nueva certificación</Button>
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4} lg={3}><MetricCard label="Total" value={summary.total} /></Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}><MetricCard label="Vigentes" value={summary.active} /></Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}><MetricCard label="Próximas" value={summary.nearExpiration} /></Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}><MetricCard label="Vencidas" value={summary.expired} /></Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}><MetricCard label="Triggers" value={summary.triggersDetected} /></Grid>
      </Grid>

      {triggerBanner && <Alert severity="warning">{triggerBanner}</Alert>}

      <Paper variant="outlined" sx={{ p: 1.2 }}>
        <CertificationTable
          items={items}
          onEdit={(item) => {
            setEditing(item);
            setOpenForm(true);
          }}
          onDelete={onDelete}
        />
      </Paper>

      <CertificationForm
        open={openForm}
        onClose={() => {
          setOpenForm(false);
          setEditing(null);
        }}
        onSubmit={onSubmit}
        initialValue={editing}
        loading={loading}
      />

      <Snackbar open={Boolean(error)} autoHideDuration={4000} onClose={() => setError('')}>
        <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
      </Snackbar>
    </Stack>
  );
}

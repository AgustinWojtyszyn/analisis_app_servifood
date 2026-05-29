import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, MenuItem, Snackbar, Stack, TextField, Typography } from '@mui/material';
import CertificationForm from '../components/certifications/CertificationForm';
import CertificationTable from '../components/certifications/CertificationTable';
import {
  getCertifications,
  createCertification,
  updateCertification,
  deleteCertification,
  getCertificationNotificationPreview,
  sendCertificationTestNotification,
  runCertificationNotificationJob
} from '../services/certificationService';

function MetricCard({ label, value }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 1.75 }}>
      <CardContent sx={{ p: 1.1, '&:last-child': { pb: 1.1 } }}>
        <Typography variant="caption" sx={{ color: '#51617a', fontWeight: 700 }}>{label}</Typography>
        <Typography sx={{ fontWeight: 900, fontSize: 22, lineHeight: 1.05, color: '#0f2a66' }}>{value}</Typography>
      </CardContent>
    </Card>
  );
}

export default function CertificationsPage() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, nearExpiration: 0, expired: 0, triggersDetected: 0 });
  const [preview, setPreview] = useState({ triggerCount: 0, message: '' });
  const [authorizedRecipients, setAuthorizedRecipients] = useState([
    'agustinwojtyszyn99@gmail.com',
    'direcciontecnicaservifood@gmail.com',
    'adm.servifood@gmail.com'
  ]);
  const [loading, setLoading] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [sendingTestId, setSendingTestId] = useState('');
  const [runningJob, setRunningJob] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, previewData] = await Promise.all([getCertifications(), getCertificationNotificationPreview()]);
      setItems(Array.isArray(list?.items) ? list.items : []);
      setSummary(list?.summary || { total: 0, active: 0, nearExpiration: 0, expired: 0, triggersDetected: 0 });
      setPreview({ triggerCount: previewData?.triggerCount || 0, message: previewData?.message || '' });
      if (Array.isArray(previewData?.recipients) && previewData.recipients.length) {
        setAuthorizedRecipients(previewData.recipients);
      }
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
    return `${preview.triggerCount} trigger(s) detectado(s). ${preview.message || 'Monitoreo automático piloto activo.'}`;
  }, [preview]);

  const moduleOptions = useMemo(() => {
    const options = new Set();
    for (const item of items) {
      const mod = String(item?.module || '').trim();
      if (mod) options.add(mod);
    }
    return Array.from(options).sort((a, b) => a.localeCompare(b, 'es'));
  }, [items]);

  const filteredItems = useMemo(() => {
    const search = String(searchTerm || '').trim().toLowerCase();
    return items.filter((item) => {
      const name = String(item?.name || '').toLowerCase();
      const moduleName = String(item?.module || '');
      const status = String(item?.status || '');
      const matchesSearch = !search || name.includes(search);
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      const matchesModule = moduleFilter === 'all' || moduleName === moduleFilter;
      return matchesSearch && matchesStatus && matchesModule;
    });
  }, [items, searchTerm, statusFilter, moduleFilter]);

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

  const onSendTest = async (item) => {
    if (!item?.id) return;
    try {
      setSendingTestId(item.id);
      const response = await sendCertificationTestNotification(item.id);
      if (response?.success) {
        const recipients = Array.isArray(response?.recipients) ? response.recipients : authorizedRecipients;
        setSuccessMessage(`Aviso manual ejecutado. Enviados: ${response?.sent || 0}. Destinatarios: ${recipients.join(', ')}`);
      } else {
        setError(response?.message || 'La certificación no dispara notificación hoy. Ajustá la fecha para que venza entre 2 y 7 días, mañana o hoy.');
      }
      await loadData();
    } catch (e) {
      setError(e.message || 'No se pudo enviar la notificación de prueba');
    } finally {
      setSendingTestId('');
    }
  };

  const onRunNotificationJob = async () => {
    try {
      setRunningJob(true);
      const response = await runCertificationNotificationJob();
      const recipients = Array.isArray(response?.recipients) && response.recipients.length ? response.recipients : authorizedRecipients;
      setSuccessMessage(
        `Revisión ejecutada. Revisadas: ${response?.checked || 0} · Enviadas: ${response?.sent || 0} · Ya enviadas: ${response?.skippedAlreadySent || 0} · Sin trigger: ${response?.skippedWithoutTrigger || 0} · Errores: ${response?.failed || 0}. Destinatarios: ${recipients.join(', ')}`
      );
      await loadData();
    } catch (e) {
      setError(e.message || 'No se pudo ejecutar la revisión automática');
    } finally {
      setRunningJob(false);
    }
  };

  return (
    <>
      <Card sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
          <Stack spacing={1.1}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={1}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f2a66' }}>Certificaciones</Typography>
                <Typography sx={{ mt: 0.3, color: '#42546f', fontSize: 14 }}>
                  Gestión de vencimientos y alertas internas de certificaciones.
                </Typography>
              </Box>
              <Button variant="contained" onClick={onCreate} disabled={loading} sx={{ boxShadow: '0 6px 16px rgba(37,99,235,0.25)' }}>
                Nueva certificación
              </Button>
            </Stack>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                size="small"
                variant="outlined"
                disabled={runningJob}
                onClick={onRunNotificationJob}
              >
                {runningJob ? 'Ejecutando revisión...' : 'Ejecutar revisión'}
              </Button>
            </Box>
            <Typography sx={{ fontSize: 12, color: '#5f6f88' }}>
              Modo piloto: los avisos se envían únicamente a los correos autorizados de ServiFood.
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#5f6f88' }}>
              Destinatarios actuales: {authorizedRecipients.join(', ')}
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, minmax(0, 1fr))',
                  sm: 'repeat(3, minmax(0, 1fr))',
                  lg: 'repeat(5, minmax(0, 1fr))'
                },
                gap: 1
              }}
            >
              <MetricCard label="Total" value={summary.total} />
              <MetricCard label="Vigentes" value={summary.active} />
              <MetricCard label="Próximas" value={summary.nearExpiration} />
              <MetricCard label="Vencidas" value={summary.expired} />
              <MetricCard label="Triggers" value={summary.triggersDetected} />
            </Box>

            {triggerBanner && <Alert severity="warning" sx={{ py: 0.4 }}>{triggerBanner}</Alert>}

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(220px, 1fr) 210px 230px' }, gap: 1 }}>
              <TextField
                size="small"
                label="Buscar por nombre..."
                placeholder="Buscar por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <TextField size="small" select label="Estado" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="active">Vigente</MenuItem>
                <MenuItem value="near_expiration">Próxima a vencer</MenuItem>
                <MenuItem value="expires_tomorrow">Vence mañana</MenuItem>
                <MenuItem value="expires_today">Vence hoy</MenuItem>
                <MenuItem value="expired">Vencida</MenuItem>
              </TextField>
              <TextField size="small" select label="Módulo/Categoría" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
                <MenuItem value="all">Todos</MenuItem>
                {moduleOptions.map((moduleName) => (
                  <MenuItem key={moduleName} value={moduleName}>{moduleName}</MenuItem>
                ))}
              </TextField>
            </Box>

          {loading ? (
            <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={22} />
            </Box>
          ) : (
              <CertificationTable
                items={filteredItems}
                onEdit={(item) => {
                  setEditing(item);
                  setOpenForm(true);
                }}
                onDelete={onDelete}
                onCreate={onCreate}
                onSendTest={onSendTest}
                sendingTestId={sendingTestId}
              />
          )}
          </Stack>
        </CardContent>
      </Card>

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
      <Snackbar open={Boolean(successMessage)} autoHideDuration={4000} onClose={() => setSuccessMessage('')}>
        <Alert severity="success" onClose={() => setSuccessMessage('')}>{successMessage}</Alert>
      </Snackbar>
    </>
  );
}

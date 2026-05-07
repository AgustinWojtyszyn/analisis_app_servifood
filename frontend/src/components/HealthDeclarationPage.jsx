import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  Radio,
  RadioGroup,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  deleteMyHealthDeclaration,
  getMyHealthDeclarations,
  getTodayHealthDeclaration,
  submitHealthDeclaration,
  updateMyHealthDeclaration
} from '../services/healthDeclarations';

function yesNoValue(value) {
  if (value === 'si') return true;
  if (value === 'no') return false;
  return null;
}

function boolToYesNo(value) {
  return value ? 'si' : 'no';
}

function getTrafficLightStyles(trafficLight) {
  const value = String(trafficLight || '').toLowerCase();
  if (value === 'rojo') {
    return {
      rowBg: '#fee2e2',
      cellColor: '#991b1b'
    };
  }
  if (value === 'amarillo') {
    return {
      rowBg: '#fef9c3',
      cellColor: '#854d0e'
    };
  }
  if (value === 'verde') {
    return {
      rowBg: '#dcfce7',
      cellColor: '#166534'
    };
  }
  return {
    rowBg: 'transparent',
    cellColor: 'inherit'
  };
}

function buildHealthEvaluation({ hasSymptoms = false, hasFever = false, recentContact = false, symptomsDetail = {} } = {}) {
  const detail = symptomsDetail && typeof symptomsDetail === 'object' ? symptomsDetail : {};
  const isRed = Boolean(detail.vomiting || detail.diarrhea || detail.jaundice || hasFever || detail.difficultyBreathing);
  const isYellow = !isRed && Boolean(
    detail.uncoveredWounds || detail.skinLesions || detail.cough || detail.soreThroat || recentContact || hasSymptoms
  );

  if (isRed) {
    return {
      healthStatus: 'No Apto',
      trafficLight: 'Rojo',
      suggestedAction: 'No ingresar a producción. Derivar a médico laboral e informar a supervisor/calidad.'
    };
  }
  if (isYellow) {
    return {
      healthStatus: 'Requiere evaluación',
      trafficLight: 'Amarillo',
      suggestedAction: 'Avisar al supervisor y evaluar gravedad. Herida leve: vendaje impermeable + guante. Síntoma respiratorio leve: barbijo + lavado de manos.'
    };
  }
  return {
    healthStatus: 'Apto',
    trafficLight: 'Verde',
    suggestedAction: 'Puede ingresar. Mantener higiene de manos.'
  };
}

export default function HealthDeclarationPage({ onOpenPolicies, onAfterDelete }) {
  const SERVIFOOD_LOGO_URL = 'https://analisis.servifoodapp.site/assets/servifood_logo_white_text_HQ-2783eac4.png';
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [warning, setWarning] = useState('');
  const [completedToday, setCompletedToday] = useState(false);
  const [todayDeclaration, setTodayDeclaration] = useState(null);
  const [history, setHistory] = useState([]);

  const [form, setForm] = useState({
    hasSymptoms: '',
    hasFever: '',
    recentContact: '',
    commitInform: '',
    policyAccepted: false,
    symptomsDetail: {
      cough: false,
      soreThroat: false,
      difficultyBreathing: false,
      vomiting: false,
      diarrhea: false,
      jaundice: false,
      skinLesions: false,
      uncoveredWounds: false
    }
  });

  useEffect(() => {
    bootstrap();
  }, []);

  const editableNow = useMemo(() => Boolean(todayDeclaration?.canEditOrDelete), [todayDeclaration]);

  const bootstrap = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      setWarning('');

      const [today, myHistory] = await Promise.all([
        getTodayHealthDeclaration(),
        getMyHealthDeclarations()
      ]);

      setCompletedToday(Boolean(today?.completed));
      setTodayDeclaration(today?.declaration || null);
      setShowForm(false);
      setHistory(Array.isArray(myHistory) ? myHistory : []);
    } catch (err) {
      setError(err.message || 'No se pudo cargar la declaración');
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const hasSymptomsExplicit = yesNoValue(form.hasSymptoms);
    const hasFever = yesNoValue(form.hasFever);
    const recentContact = yesNoValue(form.recentContact);
    const commitInform = yesNoValue(form.commitInform);
    const derivedHasSymptoms = Object.values(form.symptomsDetail || {}).some(Boolean);
    const hasSymptoms = hasSymptomsExplicit == null ? derivedHasSymptoms : (hasSymptomsExplicit || derivedHasSymptoms);

    if ([hasFever, recentContact, commitInform].some((v) => v === null)) {
      return { valid: false, error: 'Debes responder todas las preguntas.' };
    }

    if (!commitInform) {
      return { valid: false, error: 'El compromiso de informar síntomas es obligatorio.' };
    }

    if (!form.policyAccepted) {
      return { valid: false, error: 'Debes aceptar la política interna.' };
    }

    return {
      valid: true,
      payload: {
        hasSymptoms,
        hasFever,
        recentContact,
        symptomsDetail: form.symptomsDetail,
        commitInform,
        policyAccepted: true
      }
    };
  };

  const resetForm = () => {
    setForm({
      hasSymptoms: '',
      hasFever: '',
      recentContact: '',
      commitInform: '',
      policyAccepted: false,
      symptomsDetail: {
        cough: false,
        soreThroat: false,
        difficultyBreathing: false,
        vomiting: false,
        diarrhea: false,
        jaundice: false,
        skinLesions: false,
        uncoveredWounds: false
      }
    });
    setEditingId(null);
  };

  const submit = async () => {
    const check = validate();
    if (!check.valid) {
      setError(check.error);
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      setWarning('');

      const response = editingId
        ? await updateMyHealthDeclaration(editingId, check.payload)
        : await submitHealthDeclaration(check.payload);

      setCompletedToday(true);
      setTodayDeclaration(response?.declaration || null);
      setShowForm(false);
      setSuccess(editingId ? 'Declaración actualizada correctamente.' : 'Declaración completada correctamente.');

      if (check.payload.hasSymptoms || check.payload.hasFever || check.payload.recentContact) {
        setWarning('Declaración con indicadores de riesgo. Notificá al responsable inmediatamente.');
      }

      const myHistory = await getMyHealthDeclarations();
      setHistory(Array.isArray(myHistory) ? myHistory : []);
      resetForm();
    } catch (err) {
      setError(err.message || 'No se pudo guardar la declaración');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = () => {
    if (!todayDeclaration) return;
    setEditingId(todayDeclaration.id);
    setShowForm(true);
    setForm({
      hasSymptoms: boolToYesNo(todayDeclaration.hasSymptoms),
      hasFever: boolToYesNo(todayDeclaration.hasFever),
      recentContact: boolToYesNo(todayDeclaration.recentContact),
      commitInform: boolToYesNo(todayDeclaration.commitInform),
      policyAccepted: Boolean(todayDeclaration.policyAccepted),
      symptomsDetail: {
        cough: Boolean(todayDeclaration?.symptomsDetail?.cough),
        soreThroat: Boolean(todayDeclaration?.symptomsDetail?.soreThroat),
        difficultyBreathing: Boolean(todayDeclaration?.symptomsDetail?.difficultyBreathing),
        vomiting: Boolean(todayDeclaration?.symptomsDetail?.vomiting),
        diarrhea: Boolean(todayDeclaration?.symptomsDetail?.diarrhea),
        jaundice: Boolean(todayDeclaration?.symptomsDetail?.jaundice),
        skinLesions: Boolean(todayDeclaration?.symptomsDetail?.skinLesions),
        uncoveredWounds: Boolean(todayDeclaration?.symptomsDetail?.uncoveredWounds)
      }
    });
  };

  const deleteMine = async () => {
    if (!todayDeclaration?.id) return;
    try {
      setError('');
      await deleteMyHealthDeclaration(todayDeclaration.id);
      setSuccess('Declaración eliminada. Ya podés cargar una nueva.');
      setCompletedToday(false);
      setTodayDeclaration(null);
      resetForm();
      const myHistory = await getMyHealthDeclarations();
      setHistory(Array.isArray(myHistory) ? myHistory : []);
      onAfterDelete?.();
    } catch (err) {
      setError(err.message || 'No se pudo eliminar la declaración');
    }
  };

  if (loading) {
    return (
      <Card sx={{ bgcolor: '#0f172a', color: '#e2e8f0', border: '1px solid #1e293b' }}>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  const traffic = String(todayDeclaration?.trafficLight || '').toLowerCase();
  const statusChipSx = traffic === 'rojo'
    ? { backgroundColor: '#dc2626', color: '#fff' }
    : traffic === 'amarillo'
      ? { backgroundColor: '#f59e0b', color: '#111827' }
      : traffic === 'verde'
        ? { backgroundColor: '#16a34a', color: '#fff' }
        : { backgroundColor: '#f59e0b', color: '#111827' };

  const recentHistory = Array.isArray(history) ? history.slice(0, 5) : [];
  const isFormMode = Boolean(editingId || showForm);
  const statusLabel = completedToday ? 'Declaración completada' : 'Pendiente';

  return (
    <Box sx={{ display: 'grid', gap: 2, maxWidth: 1180, mx: 'auto', width: '100%', px: { xs: 1, sm: 2 } }}>
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}
      {warning && <Alert severity="warning">{warning}</Alert>}

      {isFormMode ? (
        <Card sx={{ bgcolor: '#0f172a', color: '#e2e8f0', border: '1px solid #1e293b', borderRadius: 4, boxShadow: '0 16px 34px rgba(2, 6, 23, 0.35)' }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>Formulario de declaración</Typography>
              <Button variant="text" onClick={() => { setShowForm(false); setEditingId(null); }}>Volver al panel</Button>
            </Stack>

            <Box sx={{ display: 'grid', gap: 1.25 }}>
              <FormControl>
                <FormLabel>1. ¿Presentás síntomas actualmente?</FormLabel>
                <RadioGroup value={form.hasSymptoms} onChange={(e) => setForm((prev) => ({ ...prev, hasSymptoms: e.target.value }))}>
                  <FormControlLabel value="si" control={<Radio />} label="Sí, tengo síntomas" />
                  <FormControlLabel value="no" control={<Radio />} label="No tengo síntomas" />
                </RadioGroup>
              </FormControl>

              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1.25 }}>
                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Checklist de síntomas (obligatorio en procedimiento)</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
                  {[
                    ['cough', 'Tos'],
                    ['soreThroat', 'Dolor de garganta'],
                    ['difficultyBreathing', 'Dificultad respiratoria'],
                    ['vomiting', 'Vómitos'],
                    ['diarrhea', 'Diarrea'],
                    ['jaundice', 'Ictericia'],
                    ['skinLesions', 'Lesiones cutáneas'],
                    ['uncoveredWounds', 'Heridas/cortes sin cubrir']
                  ].map(([key, label]) => (
                    <FormControlLabel
                      key={key}
                      control={(
                        <Checkbox
                          checked={Boolean(form.symptomsDetail?.[key])}
                          onChange={(e) => setForm((prev) => ({
                            ...prev,
                            symptomsDetail: { ...prev.symptomsDetail, [key]: e.target.checked }
                          }))}
                        />
                      )}
                      label={label}
                    />
                  ))}
                </Box>
              </Box>

              <FormControl>
                <FormLabel>2. ¿Tenés fiebre?</FormLabel>
                <RadioGroup value={form.hasFever} onChange={(e) => setForm((prev) => ({ ...prev, hasFever: e.target.value }))}>
                  <FormControlLabel value="si" control={<Radio />} label="Sí" />
                  <FormControlLabel value="no" control={<Radio />} label="No" />
                </RadioGroup>
              </FormControl>

              <FormControl>
                <FormLabel>3. ¿Tuviste contacto reciente con alguien enfermo?</FormLabel>
                <RadioGroup value={form.recentContact} onChange={(e) => setForm((prev) => ({ ...prev, recentContact: e.target.value }))}>
                  <FormControlLabel value="si" control={<Radio />} label="Sí" />
                  <FormControlLabel value="no" control={<Radio />} label="No" />
                </RadioGroup>
              </FormControl>

              <FormControl>
                <FormLabel>4. ¿Te comprometés a informar síntomas durante la jornada?</FormLabel>
                <RadioGroup value={form.commitInform} onChange={(e) => setForm((prev) => ({ ...prev, commitInform: e.target.value }))}>
                  <FormControlLabel value="si" control={<Radio />} label="Sí" />
                  <FormControlLabel value="no" control={<Radio />} label="No" />
                </RadioGroup>
              </FormControl>

              <FormControlLabel
                control={<Checkbox checked={form.policyAccepted} onChange={(e) => setForm((prev) => ({ ...prev, policyAccepted: e.target.checked }))} />}
                label="Declaro haber leído y aceptado la política interna"
              />

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button variant="outlined" onClick={onOpenPolicies}>Ver política</Button>
                <Button variant="contained" onClick={submit} disabled={saving}>
                  {saving ? 'Guardando...' : (editingId ? 'Guardar cambios' : 'Enviar declaración')}
                </Button>
                {editingId && <Button variant="text" onClick={() => setEditingId(null)}>Cancelar edición</Button>}
                {!editingId && !completedToday && <Button variant="text" onClick={() => setShowForm(false)}>Volver</Button>}
              </Box>
              {(() => {
                const evalPreview = buildHealthEvaluation({
                  hasSymptoms: Object.values(form.symptomsDetail || {}).some(Boolean) || yesNoValue(form.hasSymptoms) === true,
                  hasFever: yesNoValue(form.hasFever) === true,
                  recentContact: yesNoValue(form.recentContact) === true,
                  symptomsDetail: form.symptomsDetail
                });
                return (
                  <Alert severity={evalPreview.trafficLight === 'Rojo' ? 'error' : evalPreview.trafficLight === 'Amarillo' ? 'warning' : 'success'}>
                    Estado: {evalPreview.healthStatus} ({evalPreview.trafficLight}). {evalPreview.suggestedAction}
                  </Alert>
                );
              })()}
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          <Grid item xs={12} md={7}>
            <Card sx={{ height: '100%', bgcolor: '#0f172a', color: '#e2e8f0', border: '1px solid #1e293b', borderRadius: 4, boxShadow: '0 16px 34px rgba(2, 6, 23, 0.35)' }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Chip label="Declaración diaria" size="small" sx={{ bgcolor: '#1d4ed8', color: '#fff', fontWeight: 700 }} />
                  <Box
                    component="img"
                    src={SERVIFOOD_LOGO_URL}
                    alt="ServiFood"
                    sx={{
                      width: { xs: 84, sm: 108, md: 118 },
                      maxWidth: { xs: 100, md: 130 },
                      height: 'auto',
                      objectFit: 'contain'
                    }}
                  />
                </Stack>

                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1.2, fontSize: { xs: '1.6rem', md: '2rem' } }}>
                  Completá tu declaración de salud
                </Typography>
                <Typography sx={{ color: '#cbd5e1', mb: 0.8 }}>
                  Registrá tu estado sanitario antes de comenzar la jornada.
                </Typography>
                <Typography sx={{ color: '#94a3b8', fontSize: '0.93rem', mb: 2.2 }}>
                  El formulario toma menos de 1 minuto.
                </Typography>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
                  <Button variant="contained" onClick={() => setShowForm(true)} sx={{ minHeight: 48, px: 3, width: { xs: '100%', sm: 'auto' } }}>
                    Completar declaración
                  </Button>
                  <Button variant="outlined" onClick={onOpenPolicies} sx={{ minHeight: 48, width: { xs: '100%', sm: 'auto' }, color: '#e2e8f0', borderColor: '#475569' }}>
                    Ver política
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={5}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Card sx={{ bgcolor: '#0f172a', color: '#e2e8f0', border: '1px solid #1e293b', borderRadius: 4, boxShadow: '0 14px 30px rgba(2, 6, 23, 0.3)' }}>
                  <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.2 }}>Estado de hoy</Typography>
                    <Chip label={statusLabel} sx={{ ...statusChipSx, fontWeight: 700, mb: 1.2 }} />
                    {completedToday ? (
                      <>
                        <Typography sx={{ color: '#e2e8f0', fontWeight: 600, mb: 0.5 }}>Declaración completada</Typography>
                        <Typography sx={{ color: '#94a3b8', fontSize: '0.88rem', mb: 1.4 }}>
                          {todayDeclaration?.declaredAt ? new Date(todayDeclaration.declaredAt).toLocaleString('es-AR') : 'Sin fecha disponible'}
                        </Typography>
                        {todayDeclaration?.healthStatus && (
                          <Typography sx={{ color: '#cbd5e1', fontSize: '0.92rem', mb: 1 }}>
                            Resultado: {todayDeclaration.healthStatus}
                          </Typography>
                        )}
                        {editableNow && (
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                            <Button variant="outlined" onClick={startEdit} sx={{ width: { xs: '100%', sm: 'auto' } }}>Ver detalle / Editar</Button>
                            <Button variant="outlined" color="error" onClick={deleteMine} sx={{ width: { xs: '100%', sm: 'auto' } }}>Eliminar</Button>
                          </Stack>
                        )}
                      </>
                    ) : (
                      <Typography sx={{ color: '#cbd5e1', fontSize: '0.93rem' }}>
                        Todavía no completaste la declaración sanitaria del día.
                      </Typography>
                    )}

                    <Divider sx={{ my: 1.5, borderColor: '#1e293b' }} />
                    <Stack spacing={0.6}>
                      <Typography sx={{ fontSize: '0.87rem', color: '#bbf7d0' }}>Verde: Ingresa.</Typography>
                      <Typography sx={{ fontSize: '0.87rem', color: '#fde68a' }}>Amarillo: Avisar supervisor.</Typography>
                      <Typography sx={{ fontSize: '0.87rem', color: '#fecaca' }}>Rojo: No ingresa a cocina/producción.</Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card sx={{ bgcolor: '#0f172a', color: '#e2e8f0', border: '1px solid #1e293b', borderRadius: 4, boxShadow: '0 14px 30px rgba(2, 6, 23, 0.3)' }}>
                  <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.2 }}>Últimas declaraciones</Typography>
                    {recentHistory.length === 0 ? (
                      <Typography sx={{ color: '#94a3b8', fontSize: '0.92rem' }}>
                        Todavía no hay declaraciones registradas.
                      </Typography>
                    ) : isMobile ? (
                      <Stack spacing={1} sx={{ maxHeight: 280, overflow: 'auto', pr: 0.5 }}>
                        {recentHistory.map((item) => {
                          const styles = getTrafficLightStyles(item.trafficLight);
                          return (
                            <Box key={item.id} sx={{ p: 1.1, borderRadius: 2, bgcolor: '#111c34', border: '1px solid #24324b' }}>
                              <Typography sx={{ fontSize: '0.8rem', color: '#93c5fd' }}>
                                {new Date(item.declaredAt || item.createdAt).toLocaleString('es-AR')}
                              </Typography>
                              <Typography sx={{ fontSize: '0.84rem', color: styles.cellColor, fontWeight: 700 }}>
                                {item.healthStatus || '-'} · {item.trafficLight || '-'}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Stack>
                    ) : (
                      <TableContainer sx={{ maxHeight: 280, border: '1px solid #1e293b', borderRadius: 2 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontSize: '0.75rem' }}>Fecha</TableCell>
                              <TableCell sx={{ fontSize: '0.75rem' }}>Estado</TableCell>
                              <TableCell sx={{ fontSize: '0.75rem' }}>Semáforo</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {recentHistory.map((item) => {
                              const styles = getTrafficLightStyles(item.trafficLight);
                              return (
                                <TableRow key={item.id}>
                                  <TableCell sx={{ fontSize: '0.76rem', color: '#cbd5e1' }}>
                                    {new Date(item.declaredAt || item.createdAt).toLocaleString('es-AR')}
                                  </TableCell>
                                  <TableCell sx={{ fontSize: '0.76rem', color: '#e2e8f0' }}>{item.healthStatus || '-'}</TableCell>
                                  <TableCell sx={{ fontSize: '0.76rem', fontWeight: 700, color: styles.cellColor }}>{item.trafficLight || '-'}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}

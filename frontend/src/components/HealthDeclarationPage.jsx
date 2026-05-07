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
  if (value === 'rojo') return { rowBg: '#4a2327', cellColor: '#fecaca' };
  if (value === 'amarillo') return { rowBg: '#4d3c1f', cellColor: '#fde68a' };
  if (value === 'verde') return { rowBg: '#1f3d32', cellColor: '#bbf7d0' };
  return { rowBg: 'transparent', cellColor: '#c4d2e6' };
}

function buildHealthEvaluation({ hasSymptoms = false, hasFever = false, recentContact = false, symptomsDetail = {} } = {}) {
  const detail = symptomsDetail && typeof symptomsDetail === 'object' ? symptomsDetail : {};
  const isRed = Boolean(detail.vomiting || detail.diarrhea || detail.jaundice || hasFever || detail.difficultyBreathing);
  const isYellow = !isRed && Boolean(
    detail.uncoveredWounds || detail.skinLesions || detail.cough || detail.soreThroat || recentContact || hasSymptoms
  );

  if (isRed) return { healthStatus: 'No Apto', trafficLight: 'Rojo', suggestedAction: 'No ingresar a producción. Derivar a médico laboral e informar a supervisor/calidad.' };
  if (isYellow) return { healthStatus: 'Requiere evaluación', trafficLight: 'Amarillo', suggestedAction: 'Avisar al supervisor y evaluar gravedad. Herida leve: vendaje impermeable + guante. Síntoma respiratorio leve: barbijo + lavado de manos.' };
  return { healthStatus: 'Apto', trafficLight: 'Verde', suggestedAction: 'Puede ingresar. Mantener higiene de manos.' };
}

export default function HealthDeclarationPage({ onOpenPolicies, onAfterDelete }) {
  const SERVIFOOD_LOGO_URL = 'https://analisis.servifoodapp.site/assets/servifood_logo_white_text_HQ-2783eac4.png';
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const surfaceMain = '#1a2638';
  const surfaceSoft = '#202f45';
  const borderSoft = '#31455f';
  const textPrimary = '#f4f8ff';
  const textSecondary = '#c4d2e6';
  const textMuted = '#9eb0c9';

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
      const [today, myHistory] = await Promise.all([getTodayHealthDeclaration(), getMyHealthDeclarations()]);
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
    if ([hasFever, recentContact, commitInform].some((v) => v === null)) return { valid: false, error: 'Debes responder todas las preguntas.' };
    if (!commitInform) return { valid: false, error: 'El compromiso de informar síntomas es obligatorio.' };
    if (!form.policyAccepted) return { valid: false, error: 'Debes aceptar la política interna.' };
    return { valid: true, payload: { hasSymptoms, hasFever, recentContact, symptomsDetail: form.symptomsDetail, commitInform, policyAccepted: true } };
  };

  const resetForm = () => {
    setForm({
      hasSymptoms: '', hasFever: '', recentContact: '', commitInform: '', policyAccepted: false,
      symptomsDetail: { cough: false, soreThroat: false, difficultyBreathing: false, vomiting: false, diarrhea: false, jaundice: false, skinLesions: false, uncoveredWounds: false }
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
      const response = editingId ? await updateMyHealthDeclaration(editingId, check.payload) : await submitHealthDeclaration(check.payload);
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
        cough: Boolean(todayDeclaration?.symptomsDetail?.cough), soreThroat: Boolean(todayDeclaration?.symptomsDetail?.soreThroat),
        difficultyBreathing: Boolean(todayDeclaration?.symptomsDetail?.difficultyBreathing), vomiting: Boolean(todayDeclaration?.symptomsDetail?.vomiting),
        diarrhea: Boolean(todayDeclaration?.symptomsDetail?.diarrhea), jaundice: Boolean(todayDeclaration?.symptomsDetail?.jaundice),
        skinLesions: Boolean(todayDeclaration?.symptomsDetail?.skinLesions), uncoveredWounds: Boolean(todayDeclaration?.symptomsDetail?.uncoveredWounds)
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
      <Card sx={{ bgcolor: surfaceMain, color: textPrimary, border: `1px solid ${borderSoft}` }}>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  const traffic = String(todayDeclaration?.trafficLight || '').toLowerCase();
  const statusChipSx = traffic === 'rojo' ? { backgroundColor: '#dc2626', color: '#fff' }
    : traffic === 'amarillo' ? { backgroundColor: '#f59e0b', color: '#111827' }
      : traffic === 'verde' ? { backgroundColor: '#16a34a', color: '#fff' }
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
        <Card sx={{ bgcolor: surfaceMain, color: textPrimary, border: `1px solid ${borderSoft}`, borderRadius: 4, boxShadow: '0 14px 28px rgba(7, 14, 27, 0.26)' }}>
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
                    ['cough', 'Tos'], ['soreThroat', 'Dolor de garganta'], ['difficultyBreathing', 'Dificultad respiratoria'], ['vomiting', 'Vómitos'],
                    ['diarrhea', 'Diarrea'], ['jaundice', 'Ictericia'], ['skinLesions', 'Lesiones cutáneas'], ['uncoveredWounds', 'Heridas/cortes sin cubrir']
                  ].map(([key, label]) => (
                    <FormControlLabel
                      key={key}
                      control={<Checkbox checked={Boolean(form.symptomsDetail?.[key])} onChange={(e) => setForm((prev) => ({ ...prev, symptomsDetail: { ...prev.symptomsDetail, [key]: e.target.checked } }))} />}
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

              <FormControlLabel control={<Checkbox checked={form.policyAccepted} onChange={(e) => setForm((prev) => ({ ...prev, policyAccepted: e.target.checked }))} />} label="Declaro haber leído y aceptado la política interna" />

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button variant="outlined" onClick={onOpenPolicies}>Ver política</Button>
                <Button variant="contained" onClick={submit} disabled={saving}>{saving ? 'Guardando...' : (editingId ? 'Guardar cambios' : 'Enviar declaración')}</Button>
                {editingId && <Button variant="text" onClick={() => setEditingId(null)}>Cancelar edición</Button>}
                {!editingId && !completedToday && <Button variant="text" onClick={() => setShowForm(false)}>Volver</Button>}
              </Box>
              {(() => {
                const evalPreview = buildHealthEvaluation({ hasSymptoms: Object.values(form.symptomsDetail || {}).some(Boolean) || yesNoValue(form.hasSymptoms) === true, hasFever: yesNoValue(form.hasFever) === true, recentContact: yesNoValue(form.recentContact) === true, symptomsDetail: form.symptomsDetail });
                return <Alert severity={evalPreview.trafficLight === 'Rojo' ? 'error' : evalPreview.trafficLight === 'Amarillo' ? 'warning' : 'success'}>Estado: {evalPreview.healthStatus} ({evalPreview.trafficLight}). {evalPreview.suggestedAction}</Alert>;
              })()}
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          <Grid item xs={12} md={7}>
            <Card sx={{ height: '100%', bgcolor: surfaceMain, color: textPrimary, border: `1px solid ${borderSoft}`, borderRadius: 4, boxShadow: '0 14px 28px rgba(7, 14, 27, 0.26)' }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Chip label="Declaración diaria" size="small" sx={{ bgcolor: '#1d4ed8', color: '#fff', fontWeight: 700 }} />
                  <Box component="img" src={SERVIFOOD_LOGO_URL} alt="ServiFood" sx={{ width: { xs: 84, sm: 108, md: 118 }, maxWidth: { xs: 100, md: 130 }, height: 'auto', objectFit: 'contain' }} />
                </Stack>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1.2, fontSize: { xs: '1.6rem', md: '2rem' } }}>Completá tu declaración de salud</Typography>
                <Typography sx={{ color: textSecondary, mb: 0.8 }}>Registrá tu estado sanitario antes de comenzar la jornada.</Typography>
                <Typography sx={{ color: textMuted, fontSize: '0.93rem', mb: 2.2 }}>El formulario toma menos de 1 minuto.</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
                  <Button variant="contained" onClick={() => setShowForm(true)} sx={{ minHeight: 48, px: 3, width: { xs: '100%', sm: 'auto' } }}>Completar declaración</Button>
                  <Button variant="outlined" onClick={onOpenPolicies} sx={{ minHeight: 48, width: { xs: '100%', sm: 'auto' }, color: textPrimary, borderColor: '#5b708c' }}>Ver política</Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={5}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Card sx={{ bgcolor: surfaceSoft, color: textPrimary, border: `1px solid ${borderSoft}`, borderRadius: 4, boxShadow: '0 12px 24px rgba(7, 14, 27, 0.22)' }}>
                  <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.2 }}>Estado de hoy</Typography>
                    <Chip label={statusLabel} sx={{ ...statusChipSx, fontWeight: 700, mb: 1.2 }} />
                    {completedToday ? (
                      <Box sx={{ bgcolor: '#26384f', border: '1px solid #3c5878', borderRadius: 2, p: 1.4, mb: 1.2 }}>
                        <Typography sx={{ color: '#f8fbff', fontWeight: 800, mb: 0.6 }}>Declaración completada</Typography>
                        <Typography sx={{ color: '#9fb5d2', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>Fecha y hora</Typography>
                        <Typography sx={{ color: '#e6eefb', fontSize: '0.9rem', mb: 1 }}>{todayDeclaration?.declaredAt ? new Date(todayDeclaration.declaredAt).toLocaleString('es-AR') : 'Sin fecha disponible'}</Typography>
                        {todayDeclaration?.healthStatus && <Typography sx={{ color: '#9fb5d2', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>Resultado sanitario</Typography>}
                        {todayDeclaration?.healthStatus && <Typography sx={{ color: '#f4f8ff', fontSize: '0.98rem', fontWeight: 800 }}>Resultado: {todayDeclaration.healthStatus}</Typography>}
                      </Box>
                    ) : (
                      <Typography sx={{ color: textSecondary, fontSize: '0.93rem', mb: 1.2 }}>Todavía no completaste la declaración sanitaria del día.</Typography>
                    )}
                    {completedToday && editableNow && (
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                        <Button variant="outlined" size="small" onClick={startEdit} sx={{ width: { xs: '100%', sm: 'auto' }, color: '#d7e4f7', borderColor: '#5b708c' }}>Ver detalle / Editar</Button>
                        <Button variant="outlined" size="small" color="error" onClick={deleteMine} sx={{ width: { xs: '100%', sm: 'auto' } }}>Eliminar</Button>
                      </Stack>
                    )}
                    <Divider sx={{ my: 1.6, borderColor: '#3a4f6b' }} />
                    <Stack spacing={0.7}>
                      <Typography sx={{ fontSize: '0.83rem', color: '#bcf0c9' }}>Verde: Ingresa.</Typography>
                      <Typography sx={{ fontSize: '0.83rem', color: '#ffe4a8' }}>Amarillo: Avisar supervisor.</Typography>
                      <Typography sx={{ fontSize: '0.83rem', color: '#ffc6c6' }}>Rojo: No ingresa a cocina/producción.</Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card sx={{ bgcolor: surfaceSoft, color: textPrimary, border: `1px solid ${borderSoft}`, borderRadius: 4, boxShadow: '0 12px 24px rgba(7, 14, 27, 0.22)' }}>
                  <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.2 }}>Últimas declaraciones</Typography>
                    {recentHistory.length === 0 ? (
                      <Typography sx={{ color: textMuted, fontSize: '0.92rem' }}>Todavía no hay declaraciones registradas.</Typography>
                    ) : isMobile ? (
                      <Stack spacing={1} sx={{ maxHeight: 280, overflow: 'auto', pr: 0.5 }}>
                        {recentHistory.map((item) => {
                          const styles = getTrafficLightStyles(item.trafficLight);
                          return (
                            <Box key={item.id} sx={{ p: 1.1, borderRadius: 2, bgcolor: '#26384f', border: '1px solid #3c5878' }}>
                              <Typography sx={{ fontSize: '0.8rem', color: '#bcd1ec' }}>{new Date(item.declaredAt || item.createdAt).toLocaleString('es-AR')}</Typography>
                              <Typography sx={{ fontSize: '0.84rem', color: styles.cellColor, fontWeight: 800 }}>{item.healthStatus || '-'} · {item.trafficLight || '-'}</Typography>
                            </Box>
                          );
                        })}
                      </Stack>
                    ) : (
                      <TableContainer sx={{ maxHeight: 280, border: '1px solid #3c5878', borderRadius: 2 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontSize: '0.75rem', color: '#f4f8ff', bgcolor: '#304660', fontWeight: 800 }}>Fecha</TableCell>
                              <TableCell sx={{ fontSize: '0.75rem', color: '#f4f8ff', bgcolor: '#304660', fontWeight: 800 }}>Estado</TableCell>
                              <TableCell sx={{ fontSize: '0.75rem', color: '#f4f8ff', bgcolor: '#304660', fontWeight: 800 }}>Semáforo</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {recentHistory.map((item) => {
                              const styles = getTrafficLightStyles(item.trafficLight);
                              return (
                                <TableRow key={item.id} sx={{ '& td': { borderColor: '#39506c', bgcolor: '#24384f' } }}>
                                  <TableCell sx={{ fontSize: '0.76rem', color: '#d7e4f7' }}>{new Date(item.declaredAt || item.createdAt).toLocaleString('es-AR')}</TableCell>
                                  <TableCell sx={{ fontSize: '0.76rem', color: '#edf4ff', fontWeight: 600 }}>{item.healthStatus || '-'}</TableCell>
                                  <TableCell sx={{ fontSize: '0.76rem', fontWeight: 800, color: styles.cellColor }}>{item.trafficLight || '-'}</TableCell>
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

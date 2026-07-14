import servifoodLogo from '../assets/servifood_logo_white_text_HQ.png';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import DeclarationSuccessConfetti from './DeclarationSuccessConfetti';
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

function emptySymptomsDetail() {
  return {
    cough: false,
    soreThroat: false,
    difficultyBreathing: false,
    vomiting: false,
    diarrhea: false,
    jaundice: false,
    skinLesions: false,
    uncoveredWounds: false
  };
}

function getLocalDateParts(date, timeZone = 'America/Argentina/Buenos_Aires') {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(value);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  if (!year || !month || !day) return null;
  return { year, month, day };
}

function isSameLocalDay(dateA, dateB, timeZone = 'America/Argentina/Buenos_Aires') {
  const partsA = getLocalDateParts(dateA, timeZone);
  const partsB = getLocalDateParts(dateB, timeZone);
  if (!partsA || !partsB) return false;
  return partsA.year === partsB.year && partsA.month === partsB.month && partsA.day === partsB.day;
}

function getTrafficLightStyles(trafficLight) {
  const value = String(trafficLight || '').toLowerCase();
  if (value === 'rojo') return { rowBg: '#4a2327', cellColor: '#fecaca' };
  if (value === 'amarillo') return { rowBg: '#4d3c1f', cellColor: '#fde68a' };
  if (value === 'verde') return { rowBg: '#1f3d32', cellColor: '#bbf7d0' };
  return { rowBg: 'transparent', cellColor: '#c4d2e6' };
}

function ArgentinaFlagBand() {
  return (
    <Box
      aria-hidden="true"
      sx={{
        width: '100%',
        maxWidth: 440,
        height: 42,
        borderRadius: 999,
        border: '1px solid rgba(255, 255, 255, 0.28)',
        overflow: 'hidden',
        opacity: 0.72,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.34), 0 8px 18px rgba(7, 14, 27, 0.16)',
        background: 'linear-gradient(to bottom, #75AADB 0 33.333%, #FFFFFF 33.333% 66.666%, #75AADB 66.666% 100%)'
      }}
    />
  );
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
  const SERVIFOOD_LOGO_URL = servifoodLogo;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const surfaceMain = '#1a2638';
  const surfaceSoft = '#202f45';
  const borderSoft = '#31455f';
  const textPrimary = '#f4f8ff';
  const textSecondary = '#c4d2e6';
  const textMuted = '#9eb0c9';
  const formCardBg = '#1B2A41';
  const formBlockBg = '#223854';
  const formBorder = 'rgba(255,255,255,0.14)';
  const formLabelColor = '#EAF0F8';
  const formHelperColor = '#B9C7DA';

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
  const [confettiRunId, setConfettiRunId] = useState(0);
  const submitInFlightRef = useRef(false);

  const [form, setForm] = useState({
    hasSymptoms: '',
    hasFever: '',
    recentContact: '',
    commitInform: '',
    policyAccepted: false,
    symptomsDetail: emptySymptomsDetail()
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
      const safeHistory = Array.isArray(myHistory) ? myHistory : [];
      const apiTodayDeclaration = today?.declaration || null;
      const historyTodayDeclaration = safeHistory.find((item) => isSameLocalDay(item?.declaredAt || item?.createdAt, new Date()));
      const effectiveTodayDeclaration = apiTodayDeclaration && isSameLocalDay(apiTodayDeclaration?.declaredAt || apiTodayDeclaration?.createdAt, new Date())
        ? apiTodayDeclaration
        : (historyTodayDeclaration || null);

      setCompletedToday(Boolean(effectiveTodayDeclaration));
      setTodayDeclaration(effectiveTodayDeclaration);
      setShowForm(false);
      setHistory(safeHistory);
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
    const hasSelectedSymptoms = Object.values(form.symptomsDetail || {}).some(Boolean);
    if ([hasSymptomsExplicit, hasFever, recentContact, commitInform].some((v) => v === null)) return { valid: false, error: 'Debes responder todas las preguntas.' };
    if (hasSymptomsExplicit && !hasSelectedSymptoms) return { valid: false, error: 'Seleccioná al menos un síntoma.' };
    if (!commitInform) return { valid: false, error: 'El compromiso de informar síntomas es obligatorio.' };
    if (!form.policyAccepted) return { valid: false, error: 'Debes aceptar la política interna.' };

    const normalizedSymptoms = hasSymptomsExplicit ? form.symptomsDetail : emptySymptomsDetail();
    return {
      valid: true,
      payload: {
        hasSymptoms: hasSymptomsExplicit,
        hasFever,
        recentContact,
        symptomsDetail: normalizedSymptoms,
        commitInform,
        policyAccepted: true
      }
    };
  };

  const resetForm = () => {
    setForm({
      hasSymptoms: '', hasFever: '', recentContact: '', commitInform: '', policyAccepted: false,
      symptomsDetail: emptySymptomsDetail()
    });
    setEditingId(null);
  };

  const onHasSymptomsChange = (value) => {
    setForm((prev) => {
      if (value === 'no') {
        return { ...prev, hasSymptoms: value, symptomsDetail: emptySymptomsDetail() };
      }
      return { ...prev, hasSymptoms: value };
    });
  };

  const submit = async () => {
    if (submitInFlightRef.current) {
      return;
    }
    const check = validate();
    if (!check.valid) {
      setError(check.error);
      return;
    }
    try {
      submitInFlightRef.current = true;
      setSaving(true);
      setError('');
      setSuccess('');
      setWarning('');
      const isCreating = !editingId;
      const response = isCreating ? await submitHealthDeclaration(check.payload) : await updateMyHealthDeclaration(editingId, check.payload);
      setCompletedToday(true);
      setTodayDeclaration(response?.declaration || null);
      setShowForm(false);
      setSuccess(editingId ? 'Declaración actualizada correctamente.' : 'Declaración completada correctamente.');
      if (isCreating && response?.declaration?.id) {
        setConfettiRunId((prev) => prev + 1);
      }
      if (check.payload.hasSymptoms || check.payload.hasFever || check.payload.recentContact) {
        setWarning('Declaración con indicadores de riesgo. Notificá al responsable inmediatamente.');
      }
      const myHistory = await getMyHealthDeclarations();
      setHistory(Array.isArray(myHistory) ? myHistory : []);
      resetForm();
    } catch (err) {
      setError(err.message || 'No se pudo guardar la declaración');
    } finally {
      submitInFlightRef.current = false;
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
  const hasSymptomsChoice = yesNoValue(form.hasSymptoms);

  return (
    <Box sx={{ display: 'grid', gap: 2, maxWidth: 1180, mx: 'auto', width: '100%', px: { xs: 1, sm: 2 } }}>
      <DeclarationSuccessConfetti runId={confettiRunId} />
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}
      {warning && <Alert severity="warning">{warning}</Alert>}

      {isFormMode ? (
        <Card sx={{ bgcolor: formCardBg, color: textPrimary, border: `1px solid ${formBorder}`, borderRadius: 4, boxShadow: '0 14px 28px rgba(7, 14, 27, 0.22)' }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} sx={{ mb: 1.5 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>Formulario de declaración</Typography>
              <Button variant="text" onClick={() => { setShowForm(false); setEditingId(null); }} sx={{ color: formHelperColor, width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'flex-start', sm: 'center' } }}>
                Volver al inicio
              </Button>
            </Stack>

            <Box sx={{ display: 'grid', gap: 1.25 }}>
              <FormControl>
                <FormLabel sx={{ color: `${formLabelColor} !important`, fontWeight: 700 }}>1. ¿Presentás síntomas actualmente?</FormLabel>
                <RadioGroup value={form.hasSymptoms} onChange={(e) => onHasSymptomsChange(e.target.value)}>
                  <FormControlLabel
                    value="si"
                    control={<Radio sx={{ color: '#8ab4ff', '&.Mui-checked': { color: '#2F6BFF' } }} />}
                    label="Sí, tengo síntomas"
                    sx={{ minHeight: 42, '& .MuiFormControlLabel-label': { color: formLabelColor, fontSize: { xs: '0.97rem', sm: '1rem' } } }}
                  />
                  <FormControlLabel
                    value="no"
                    control={<Radio sx={{ color: '#8ab4ff', '&.Mui-checked': { color: '#2F6BFF' } }} />}
                    label="No tengo síntomas"
                    sx={{ minHeight: 42, '& .MuiFormControlLabel-label': { color: formLabelColor, fontSize: { xs: '0.97rem', sm: '1rem' } } }}
                  />
                </RadioGroup>
              </FormControl>

              {hasSymptomsChoice === true && (
                <Box sx={{ border: '1px solid', borderColor: formBorder, borderRadius: 2, p: { xs: 1.2, sm: 1.4 }, bgcolor: formBlockBg }}>
                  <Typography sx={{ fontWeight: 700, mb: 0.5, color: formLabelColor }}>Checklist de síntomas (obligatorio)</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, columnGap: 1 }}>
                    {[
                      ['cough', 'Tos'], ['soreThroat', 'Dolor de garganta'], ['difficultyBreathing', 'Dificultad respiratoria'], ['vomiting', 'Vómitos'],
                      ['diarrhea', 'Diarrea'], ['jaundice', 'Ictericia'], ['skinLesions', 'Lesiones cutáneas'], ['uncoveredWounds', 'Heridas/cortes sin cubrir']
                    ].map(([key, label]) => (
                      <FormControlLabel
                        key={key}
                        control={(
                          <Checkbox
                            checked={Boolean(form.symptomsDetail?.[key])}
                            onChange={(e) => setForm((prev) => ({ ...prev, symptomsDetail: { ...prev.symptomsDetail, [key]: e.target.checked } }))}
                            sx={{ color: '#8ab4ff', '&.Mui-checked': { color: '#2F6BFF' } }}
                          />
                        )}
                        label={label}
                        sx={{ minHeight: 42, mr: 0.5, '& .MuiFormControlLabel-label': { color: formLabelColor, fontSize: { xs: '0.95rem', sm: '1rem' } } }}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              <FormControl>
                <FormLabel sx={{ color: `${formLabelColor} !important`, fontWeight: 700 }}>2. ¿Tenés fiebre?</FormLabel>
                <RadioGroup value={form.hasFever} onChange={(e) => setForm((prev) => ({ ...prev, hasFever: e.target.value }))}>
                  <FormControlLabel value="si" control={<Radio sx={{ color: '#8ab4ff', '&.Mui-checked': { color: '#2F6BFF' } }} />} label="Sí" sx={{ minHeight: 42, '& .MuiFormControlLabel-label': { color: formLabelColor } }} />
                  <FormControlLabel value="no" control={<Radio sx={{ color: '#8ab4ff', '&.Mui-checked': { color: '#2F6BFF' } }} />} label="No" sx={{ minHeight: 42, '& .MuiFormControlLabel-label': { color: formLabelColor } }} />
                </RadioGroup>
              </FormControl>

              <FormControl>
                <FormLabel sx={{ color: `${formLabelColor} !important`, fontWeight: 700 }}>3. ¿Tuviste contacto reciente con alguien enfermo?</FormLabel>
                <RadioGroup value={form.recentContact} onChange={(e) => setForm((prev) => ({ ...prev, recentContact: e.target.value }))}>
                  <FormControlLabel value="si" control={<Radio sx={{ color: '#8ab4ff', '&.Mui-checked': { color: '#2F6BFF' } }} />} label="Sí" sx={{ minHeight: 42, '& .MuiFormControlLabel-label': { color: formLabelColor } }} />
                  <FormControlLabel value="no" control={<Radio sx={{ color: '#8ab4ff', '&.Mui-checked': { color: '#2F6BFF' } }} />} label="No" sx={{ minHeight: 42, '& .MuiFormControlLabel-label': { color: formLabelColor } }} />
                </RadioGroup>
              </FormControl>

              <FormControl>
                <FormLabel sx={{ color: `${formLabelColor} !important`, fontWeight: 700 }}>4. ¿Te comprometés a informar síntomas durante la jornada?</FormLabel>
                <RadioGroup value={form.commitInform} onChange={(e) => setForm((prev) => ({ ...prev, commitInform: e.target.value }))}>
                  <FormControlLabel value="si" control={<Radio sx={{ color: '#8ab4ff', '&.Mui-checked': { color: '#2F6BFF' } }} />} label="Sí" sx={{ minHeight: 42, '& .MuiFormControlLabel-label': { color: formLabelColor } }} />
                  <FormControlLabel value="no" control={<Radio sx={{ color: '#8ab4ff', '&.Mui-checked': { color: '#2F6BFF' } }} />} label="No" sx={{ minHeight: 42, '& .MuiFormControlLabel-label': { color: formLabelColor } }} />
                </RadioGroup>
              </FormControl>

              <FormControlLabel
                control={<Checkbox checked={form.policyAccepted} onChange={(e) => setForm((prev) => ({ ...prev, policyAccepted: e.target.checked }))} sx={{ color: '#8ab4ff', '&.Mui-checked': { color: '#2F6BFF' } }} />}
                label="Declaro haber leído y aceptado la política interna"
                sx={{ '& .MuiFormControlLabel-label': { color: formHelperColor } }}
              />

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button variant="outlined" onClick={onOpenPolicies} sx={{ minHeight: 46, width: { xs: '100%', sm: 'auto' }, color: formLabelColor, borderColor: formBorder, '&:hover': { borderColor: '#5f7fa8', bgcolor: 'rgba(47,107,255,0.08)' } }}>
                  Ver política
                </Button>
                <Button variant="contained" onClick={submit} disabled={saving} sx={{ minHeight: 46, width: { xs: '100%', sm: 'auto' } }}>{saving ? 'Enviando...' : (editingId ? 'Guardar cambios' : 'Enviar declaración')}</Button>
                {editingId && <Button variant="text" onClick={() => setEditingId(null)} sx={{ minHeight: 46, width: { xs: '100%', sm: 'auto' }, color: formHelperColor }}>Cancelar edición</Button>}
                {!editingId && !completedToday && <Button variant="text" onClick={() => setShowForm(false)} sx={{ minHeight: 46, width: { xs: '100%', sm: 'auto' }, color: formHelperColor }}>Volver</Button>}
              </Box>
              {(() => {
                const normalizedSymptomsPreview = hasSymptomsChoice ? form.symptomsDetail : emptySymptomsDetail();
                const evalPreview = buildHealthEvaluation({ hasSymptoms: hasSymptomsChoice === true, hasFever: yesNoValue(form.hasFever) === true, recentContact: yesNoValue(form.recentContact) === true, symptomsDetail: normalizedSymptomsPreview });
                const isRed = evalPreview.trafficLight === 'Rojo';
                const isYellow = evalPreview.trafficLight === 'Amarillo';
                const sx = isRed
                  ? { bgcolor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#FECACA' }
                  : isYellow
                    ? { bgcolor: 'rgba(245,158,11,0.16)', border: '1px solid rgba(245,158,11,0.35)', color: '#FDE68A' }
                    : { bgcolor: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.35)', color: '#BBF7D0' };
                return (
                  <Alert icon={false} severity={isRed ? 'error' : isYellow ? 'warning' : 'success'} sx={sx}>
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
            <Card sx={{ height: '100%', bgcolor: surfaceMain, color: textPrimary, border: `1px solid ${borderSoft}`, borderRadius: 4, boxShadow: '0 14px 28px rgba(7, 14, 27, 0.26)' }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Box sx={{ mb: 3 }}>
                  <Chip
                    label="Declaración diaria"
                    size="small"
                    sx={{
                      bgcolor: '#1d4ed8',
                      color: '#fff',
                      fontWeight: 700
                    }}
                  />
                  <Stack alignItems="center" spacing={1.5} sx={{ mt: 2 }}>
                    <Box component="img" src={SERVIFOOD_LOGO_URL} alt="ServiFood" sx={{ display: 'block', width: { xs: 72, sm: 90 }, height: 'auto', objectFit: 'contain' }} />
                    <ArgentinaFlagBand />
                  </Stack>
                </Box>
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

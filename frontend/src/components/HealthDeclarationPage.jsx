import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
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

function renderBoolean(value) {
  return value ? 'Sí' : 'No';
}

function getTrafficLightStyles(trafficLight) {
  const value = String(trafficLight || '').toLowerCase();
  if (value === 'rojo') {
    return {
      rowBg: 'rgba(220, 38, 38, 0.14)',
      cellColor: '#ffffff'
    };
  }
  if (value === 'amarillo') {
    return {
      rowBg: 'rgba(245, 158, 11, 0.16)',
      cellColor: '#111827'
    };
  }
  if (value === 'verde') {
    return {
      rowBg: 'rgba(22, 163, 74, 0.14)',
      cellColor: '#ffffff'
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
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
      policyAccepted: false
      ,
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
      <Card>
        <CardContent sx={{ textAlign: 'center' }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Declaración de Salud</Typography>
          <Alert severity="info" sx={{ mb: 1.5 }}>
            Semáforo sanitario: Verde (ingresa), Amarillo (avisa supervisor), Rojo (no ingresa a cocina/producción).
          </Alert>

          {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 1.5 }}>{success}</Alert>}
          {warning && <Alert severity="warning" sx={{ mb: 1.5 }}>{warning}</Alert>}

          {completedToday && !editingId ? (
            <>
              <Alert severity="info" sx={{ mb: 1.5 }}>
                Ya completaste la declaración de hoy.
                {todayDeclaration?.declaredAt ? ` (${new Date(todayDeclaration.declaredAt).toLocaleString('es-AR')})` : ''}
              </Alert>
              <Alert
                severity={todayDeclaration?.trafficLight === 'Rojo' ? 'error' : todayDeclaration?.trafficLight === 'Amarillo' ? 'warning' : 'success'}
                sx={{ mb: 1.5 }}
              >
                {todayDeclaration?.trafficLight === 'Verde' && 'Estoy bien → Ingreso'}
                {todayDeclaration?.trafficLight === 'Amarillo' && 'Tengo una herida o tos → Aviso al supervisor'}
                {todayDeclaration?.trafficLight === 'Rojo' && 'Tengo fiebre, vómitos o diarrea → No ingreso a cocina'}
                {todayDeclaration?.suggestedAction ? ` · ${todayDeclaration.suggestedAction}` : ''}
              </Alert>
              {editableNow && (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button variant="outlined" onClick={startEdit}>Editar (15 min)</Button>
                  <Button variant="outlined" color="error" onClick={deleteMine}>Eliminar (15 min)</Button>
                </Box>
              )}
            </>
          ) : (
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
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Mi historial</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Síntomas</TableCell>
                  <TableCell>Fiebre</TableCell>
                  <TableCell>Contacto</TableCell>
                  <TableCell>Política</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Semáforo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((item) => (
                  <TableRow
                    key={item.id}
                    sx={() => {
                      const styles = getTrafficLightStyles(item.trafficLight);
                      return {
                        '& td': {
                          backgroundColor: styles.rowBg,
                          color: styles.cellColor
                        },
                        '&:hover td': {
                          backgroundColor: styles.rowBg
                        }
                      };
                    }}
                  >
                    <TableCell>{new Date(item.declaredAt || item.createdAt).toLocaleString('es-AR')}</TableCell>
                    <TableCell>{renderBoolean(item.hasSymptoms)}</TableCell>
                    <TableCell>{renderBoolean(item.hasFever)}</TableCell>
                    <TableCell>{renderBoolean(item.recentContact)}</TableCell>
                    <TableCell>{item.policyAccepted ? 'Aceptada' : 'No'}</TableCell>
                    <TableCell>{item.healthStatus || '-'}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{item.trafficLight || '-'}</TableCell>
                  </TableRow>
                ))}
                {history.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>Sin declaraciones cargadas.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}

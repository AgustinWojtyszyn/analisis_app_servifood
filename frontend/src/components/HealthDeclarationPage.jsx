import React, { useEffect, useState } from 'react';
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
  deleteHealthDeclarationById,
  exportHealthDeclarations,
  getAdminHealthDeclarations,
  getMyHealthDeclarations,
  getTodayHealthDeclaration,
  submitHealthDeclaration
} from '../services/healthDeclarations';

function yesNoValue(value) {
  if (value === 'si') return true;
  if (value === 'no') return false;
  return null;
}

function renderBoolean(value) {
  return value ? 'Sí' : 'No';
}

export default function HealthDeclarationPage({ isAdmin = false, onOpenPolicies }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [warning, setWarning] = useState('');
  const [completedToday, setCompletedToday] = useState(false);
  const [todayDeclaration, setTodayDeclaration] = useState(null);
  const [history, setHistory] = useState([]);
  const [adminRows, setAdminRows] = useState([]);

  const [form, setForm] = useState({
    hasSymptoms: '',
    hasFever: '',
    recentContact: '',
    commitInform: '',
    policyAccepted: false
  });

  useEffect(() => {
    bootstrap();
  }, [isAdmin]);

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

      if (isAdmin) {
        const rows = await getAdminHealthDeclarations();
        setAdminRows(Array.isArray(rows) ? rows : []);
      } else {
        setAdminRows([]);
      }
    } catch (err) {
      setError(err.message || 'No se pudo cargar la declaración');
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const hasSymptoms = yesNoValue(form.hasSymptoms);
    const hasFever = yesNoValue(form.hasFever);
    const recentContact = yesNoValue(form.recentContact);
    const commitInform = yesNoValue(form.commitInform);

    if ([hasSymptoms, hasFever, recentContact, commitInform].some((v) => v === null)) {
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
        commitInform,
        policyAccepted: true
      }
    };
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
      const response = await submitHealthDeclaration(check.payload);
      setCompletedToday(true);
      setTodayDeclaration(response?.declaration || null);
      setSuccess('Declaración completada correctamente.');

      if (response?.risk) {
        setWarning('Declaración con indicadores de riesgo. Notificá al responsable inmediatamente.');
      }

      const myHistory = await getMyHealthDeclarations();
      setHistory(Array.isArray(myHistory) ? myHistory : []);
      if (isAdmin) {
        const rows = await getAdminHealthDeclarations();
        setAdminRows(Array.isArray(rows) ? rows : []);
      }
    } catch (err) {
      setError(err.message || 'No se pudo guardar la declaración');
    } finally {
      setSaving(false);
    }
  };

  const deleteAdminRow = async (id) => {
    try {
      setError('');
      await deleteHealthDeclarationById(id);
      setAdminRows((prev) => prev.filter((item) => item.id !== id));
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

          {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 1.5 }}>{success}</Alert>}
          {warning && <Alert severity="warning" sx={{ mb: 1.5 }}>{warning}</Alert>}

          {completedToday ? (
            <Alert severity="info" sx={{ mb: 1.5 }}>
              Ya completaste la declaración de hoy.
              {todayDeclaration?.declaredAt ? ` (${new Date(todayDeclaration.declaredAt).toLocaleString('es-AR')})` : ''}
            </Alert>
          ) : (
            <Box sx={{ display: 'grid', gap: 1.25 }}>
              <FormControl>
                <FormLabel>1. ¿Presentás síntomas actualmente?</FormLabel>
                <RadioGroup value={form.hasSymptoms} onChange={(e) => setForm((prev) => ({ ...prev, hasSymptoms: e.target.value }))}>
                  <FormControlLabel value="si" control={<Radio />} label="Sí, tengo síntomas" />
                  <FormControlLabel value="no" control={<Radio />} label="No tengo síntomas" />
                </RadioGroup>
              </FormControl>

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
                  {saving ? 'Guardando...' : 'Enviar declaración'}
                </Button>
              </Box>
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
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{new Date(item.declaredAt || item.createdAt).toLocaleString('es-AR')}</TableCell>
                    <TableCell>{renderBoolean(item.hasSymptoms)}</TableCell>
                    <TableCell>{renderBoolean(item.hasFever)}</TableCell>
                    <TableCell>{renderBoolean(item.recentContact)}</TableCell>
                    <TableCell>{item.policyAccepted ? 'Aceptada' : 'No'}</TableCell>
                  </TableRow>
                ))}
                {history.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5}>Sin declaraciones cargadas.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Panel Admin</Typography>
              <Button variant="outlined" onClick={exportHealthDeclarations}>Exportar Excel</Button>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Usuario</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Síntomas</TableCell>
                    <TableCell>Fiebre</TableCell>
                    <TableCell>Contacto</TableCell>
                    <TableCell>Política</TableCell>
                    <TableCell>Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {adminRows.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.userId}</TableCell>
                      <TableCell>{new Date(item.declaredAt || item.createdAt).toLocaleString('es-AR')}</TableCell>
                      <TableCell>{renderBoolean(item.hasSymptoms)}</TableCell>
                      <TableCell>{renderBoolean(item.hasFever)}</TableCell>
                      <TableCell>{renderBoolean(item.recentContact)}</TableCell>
                      <TableCell>{item.policyAccepted ? 'Aceptada' : 'No'}</TableCell>
                      <TableCell>
                        <Button size="small" color="error" onClick={() => deleteAdminRow(item.id)}>Eliminar</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {adminRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7}>No hay declaraciones.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

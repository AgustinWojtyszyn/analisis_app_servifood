import React, { useEffect, useState } from 'react';
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
  FormControlLabel,
  Stack,
  Typography
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import HealthAndSafetyRoundedIcon from '@mui/icons-material/HealthAndSafetyRounded';
import RestaurantRoundedIcon from '@mui/icons-material/RestaurantRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import { getActiveHealthPolicy } from '../services/healthDeclarations';
import { acceptCurrentPolicy, getCurrentPolicyAcceptance } from '../services/policyAcceptances';
import { CURRENT_POLICY_VERSION } from '../constants/policies';
import servifoodLogo from '../assets/servifood_logo_white_text_HQ.png';

const getCurrentMonthYear = () => {
  const now = new Date();
  const formatted = new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    year: 'numeric'
  }).format(now);

  return formatted
    .replace(' de ', ' ')
    .replace(/^\w/, (letter) => letter.toUpperCase());
};

function PolicySection({ icon, title, text }) {
  return (
    <Box
      sx={{
        border: '1px solid rgba(148,163,184,0.28)',
        borderRadius: 2.2,
        p: { xs: 1.25, md: 1.45 },
        backgroundColor: '#fcfdff',
        minHeight: { md: 170 },
        height: '100%'
      }}
    >
      <Stack direction="row" spacing={0.95} alignItems="center" sx={{ mb: 0.7 }}>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            backgroundColor: 'rgba(37,99,235,0.09)',
            color: '#1e3a8a'
          }}
        >
          {icon}
        </Box>
        <Typography sx={{ fontWeight: 800, color: '#0f172a', fontSize: 15.2, letterSpacing: '-0.01em' }}>
          {title}
        </Typography>
      </Stack>
      <Typography sx={{ color: '#334155', lineHeight: 1.64, fontSize: 13.9 }}>
        {text}
      </Typography>
    </Box>
  );
}

function formatAcceptanceDateTime(value) {
  if (!value) return { date: '-', time: '-' };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: '-', time: '-' };

  return {
    date: new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date),
    time: new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  };
}

function PolicyAcceptanceBlock({
  acceptance,
  acceptanceLoading,
  acceptanceError,
  checked,
  saving,
  saveError,
  onCheckedChange,
  onAccept,
  onViewConfirmation
}) {
  const acceptedDateTime = formatAcceptanceDateTime(acceptance?.accepted_at);

  if (acceptanceLoading) {
    return (
      <Box sx={{ mt: 1.45, p: 1.35, border: '1px solid rgba(148,163,184,0.26)', borderRadius: 2, backgroundColor: '#f8fbff' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={18} />
          <Typography sx={{ color: '#475569', fontSize: 13.5, fontWeight: 650 }}>
            Consultando estado de aceptación...
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (acceptanceError) {
    return (
      <Alert severity="error" sx={{ mt: 1.45 }}>
        No pudimos consultar tu estado de aceptación. Recargá la pantalla e intentá nuevamente.
      </Alert>
    );
  }

  if (acceptance) {
    return (
      <Box
        sx={{
          mt: 1.45,
          p: { xs: 1.25, md: 1.45 },
          border: '1px solid rgba(37,99,235,0.18)',
          borderRadius: 2.2,
          backgroundColor: 'rgba(248,251,255,0.92)'
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.1} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <CheckCircleRoundedIcon sx={{ color: '#1e3a8a', fontSize: 28 }} />
            <Box>
              <Typography sx={{ fontWeight: 900, color: '#0f2a66', fontSize: 15.5 }}>
                Políticas aceptadas
              </Typography>
              <Typography sx={{ color: '#475569', fontSize: 13.3 }}>
                Aceptaste la versión vigente el {acceptedDateTime.date} a las {acceptedDateTime.time}.
              </Typography>
            </Box>
          </Stack>
          <Button size="small" variant="text" onClick={onViewConfirmation} sx={{ fontWeight: 800 }}>
            Ver confirmación
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        mt: 1.45,
        p: { xs: 1.25, md: 1.45 },
        border: '1px solid rgba(148,163,184,0.32)',
        borderRadius: 2.2,
        backgroundColor: '#fcfdff'
      }}
    >
      <Stack spacing={1}>
        <Typography sx={{ fontWeight: 850, color: '#0f2a66', fontSize: 15.5 }}>
          Aceptación de políticas internas
        </Typography>
        <FormControlLabel
          control={
            <Checkbox
              checked={checked}
              onChange={(event) => onCheckedChange(event.target.checked)}
              disabled={saving}
            />
          }
          label="Confirmo que he leído y comprendido las políticas internas vigentes."
          sx={{
            m: 0,
            alignItems: 'flex-start',
            '.MuiFormControlLabel-label': {
              color: '#334155',
              fontSize: 13.8,
              pt: 0.85
            }
          }}
        />
        {saveError && (
          <Alert severity="error" sx={{ py: 0.45 }}>
            No pudimos registrar tu aceptación. Intentá nuevamente.
          </Alert>
        )}
        <Box>
          <Button variant="contained" onClick={onAccept} disabled={!checked || saving}>
            {saving ? 'Registrando...' : 'Aceptar políticas'}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}

function PolicyConfirmationView({ acceptance, onBackToPolicies, onGoDashboard }) {
  const acceptedDateTime = formatAcceptanceDateTime(acceptance?.accepted_at);

  return (
    <Card sx={{ borderRadius: 3.2, border: '1px solid rgba(148,163,184,0.28)', boxShadow: '0 10px 28px rgba(15, 23, 42, 0.06)' }}>
      <CardContent sx={{ p: { xs: 1.7, md: 2.5 } }}>
        <Box
          sx={{
            border: '1px solid rgba(148,163,184,0.24)',
            borderRadius: 2.8,
            overflow: 'hidden',
            backgroundColor: '#fff',
            boxShadow: '0 6px 18px rgba(15,23,42,0.05)'
          }}
        >
          <Box
            sx={{
              px: { xs: 1.5, md: 2.3 },
              py: { xs: 1.45, md: 1.7 },
              background: 'linear-gradient(120deg, #14316f 0%, #1d4ed8 100%)',
              color: '#fff'
            }}
          >
            <Stack direction="row" spacing={{ xs: 1.15, md: 1.45 }} alignItems="center">
              <Box
                component="img"
                src={servifoodLogo}
                alt="ServiFood"
                sx={{
                  width: { xs: 136, sm: 176, md: 214 },
                  maxHeight: { xs: 56, sm: 72, md: 82 },
                  height: 'auto',
                  objectFit: 'contain',
                  display: 'block',
                  flexShrink: 0
                }}
              />
              <Box>
                <Typography sx={{ fontWeight: 900, letterSpacing: '-0.012em', lineHeight: 1.15, fontSize: { xs: 20, md: 25.5 } }}>
                  Políticas aceptadas
                </Typography>
                <Typography sx={{ fontSize: { xs: 12.9, md: 14 }, color: 'rgba(239,246,255,0.95)', mt: 0.25, lineHeight: 1.32 }}>
                  Registro de aceptación de políticas internas
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Box sx={{ p: { xs: 2, md: 3 }, textAlign: 'center' }}>
            <CheckCircleRoundedIcon sx={{ color: '#1e3a8a', fontSize: 58, mb: 1 }} />
            <Typography sx={{ fontWeight: 900, color: '#0f2a66', fontSize: { xs: 22, md: 26 }, mb: 0.7 }}>
              Políticas aceptadas
            </Typography>
            <Typography sx={{ color: '#334155', fontSize: 15, mb: 1 }}>
              Tu aceptación fue registrada correctamente.
            </Typography>
            <Typography sx={{ color: '#475569', fontSize: 13.5, mb: 2.2 }}>
              Fecha y hora de aceptación: {acceptedDateTime.date} a las {acceptedDateTime.time}. Versión {CURRENT_POLICY_VERSION}.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="center">
              <Button variant="contained" onClick={onBackToPolicies}>Volver a las políticas</Button>
              <Button variant="outlined" onClick={onGoDashboard}>Ir al dashboard</Button>
            </Stack>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function HealthPoliciesPage({ user, onGoDashboard }) {
  const [loading, setLoading] = useState(true);
  const [acceptanceLoading, setAcceptanceLoading] = useState(true);
  const [error, setError] = useState('');
  const [acceptanceError, setAcceptanceError] = useState('');
  const [policy, setPolicy] = useState(null);
  const [acceptance, setAcceptance] = useState(null);
  const [acceptanceChecked, setAcceptanceChecked] = useState(false);
  const [savingAcceptance, setSavingAcceptance] = useState(false);
  const [saveAcceptanceError, setSaveAcceptanceError] = useState('');
  const [confirmationView, setConfirmationView] = useState(() => window.location.pathname === '/politicas-seguridad/confirmacion');
  const currentMonthYear = getCurrentMonthYear();

  useEffect(() => {
    loadPolicy();
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setConfirmationView(window.location.pathname === '/politicas-seguridad/confirmacion');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const loadPolicy = async () => {
    try {
      setLoading(true);
      setAcceptanceLoading(true);
      setError('');
      setAcceptanceError('');
      const [data, acceptanceData] = await Promise.all([
        getActiveHealthPolicy(),
        getCurrentPolicyAcceptance()
      ]);
      setPolicy(data || null);
      setAcceptance(acceptanceData || null);
    } catch (err) {
      if (String(err?.message || '').toLowerCase().includes('policy_acceptances')) {
        setAcceptanceError(err.message || 'No se pudo consultar el estado de aceptación');
      } else {
        setError(err.message || 'No se pudo cargar la política activa');
      }
    } finally {
      setLoading(false);
      setAcceptanceLoading(false);
    }
  };

  const navigateToPolicies = () => {
    if (window.location.pathname !== '/politicas-seguridad') {
      window.history.pushState({}, '', '/politicas-seguridad');
    }
    setConfirmationView(false);
  };

  const navigateToConfirmation = () => {
    if (window.location.pathname !== '/politicas-seguridad/confirmacion') {
      window.history.pushState({}, '', '/politicas-seguridad/confirmacion');
    }
    setConfirmationView(true);
  };

  const handleAcceptPolicies = async () => {
    if (!acceptanceChecked || savingAcceptance) return;
    try {
      setSavingAcceptance(true);
      setSaveAcceptanceError('');
      const saved = await acceptCurrentPolicy(user?.id);
      setAcceptance(saved);
      navigateToConfirmation();
    } catch {
      setSaveAcceptanceError('No pudimos registrar tu aceptación. Intentá nuevamente.');
    } finally {
      setSavingAcceptance(false);
    }
  };

  if (confirmationView && acceptance) {
    return (
      <PolicyConfirmationView
        acceptance={acceptance}
        onBackToPolicies={navigateToPolicies}
        onGoDashboard={onGoDashboard}
      />
    );
  }

  return (
    <Card sx={{ borderRadius: 3.2, border: '1px solid rgba(148,163,184,0.28)', boxShadow: '0 10px 28px rgba(15, 23, 42, 0.06)' }}>
      <CardContent sx={{ p: { xs: 1.7, md: 2.5 } }}>
        {loading && <CircularProgress size={22} />}
        {!loading && error && <Alert severity="error">{error}</Alert>}
        {!loading && !error && !policy && <Alert severity="info">No hay política activa configurada.</Alert>}

        {!loading && (
          <Box
            sx={{
              border: '1px solid rgba(148,163,184,0.24)',
              borderRadius: 2.8,
              overflow: 'hidden',
              backgroundColor: '#fff',
              boxShadow: '0 6px 18px rgba(15,23,42,0.05)'
            }}
          >
            <Box
              sx={{
                px: { xs: 1.5, md: 2.3 },
                py: { xs: 1.45, md: 1.7 },
                background: 'linear-gradient(120deg, #14316f 0%, #1d4ed8 100%)',
                color: '#fff'
              }}
            >
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 1.15, md: 1.4 }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
                <Stack direction="row" spacing={{ xs: 1.15, md: 1.45 }} alignItems="center">
                  <Box
                    component="img"
                    src={servifoodLogo}
                    alt="ServiFood"
                    sx={{
                      width: { xs: 136, sm: 176, md: 214 },
                      maxHeight: { xs: 56, sm: 72, md: 82 },
                      height: 'auto',
                      objectFit: 'contain',
                      display: 'block',
                      flexShrink: 0
                    }}
                  />
                  <Divider
                    orientation="vertical"
                    flexItem
                    sx={{
                      borderColor: 'rgba(255,255,255,0.2)',
                      mx: { xs: 0.1, md: 0.3 },
                      display: { xs: 'none', md: 'block' }
                    }}
                  />
                  <Box>
                    <Typography sx={{ fontWeight: 900, letterSpacing: '-0.012em', lineHeight: 1.15, fontSize: { xs: 20, md: 25.5 } }}>
                      Políticas Internas
                    </Typography>
                    <Typography sx={{ fontSize: { xs: 12.9, md: 14 }, color: 'rgba(239,246,255,0.95)', mt: 0.25, lineHeight: 1.32 }}>
                      Lineamientos de salud, higiene y cumplimiento interno
                    </Typography>
                    <Typography sx={{ mt: 0.45, fontSize: 12.6, color: 'rgba(219,234,254,0.95)', fontWeight: 600 }}>
                      ServiFood Catering · Plataforma de análisis de desvíos
                    </Typography>
                  </Box>
                </Stack>
                <Chip
                  size="small"
                  label="Documento institucional"
                  icon={<DescriptionRoundedIcon />}
                  sx={{
                    fontWeight: 700,
                    color: '#eff6ff',
                    border: '1px solid rgba(219,234,254,0.3)',
                    backgroundColor: 'rgba(255,255,255,0.07)',
                    '& .MuiChip-icon': { color: 'rgba(239,246,255,0.95)' }
                  }}
                />
              </Stack>
            </Box>

            <Box sx={{ p: { xs: 1.45, md: 2 } }}>
              {policy && (
                <Box
                  sx={{
                    mb: 1.3,
                    p: { xs: 1, md: 1.2 },
                    borderRadius: 1.9,
                    border: '1px solid rgba(148,163,184,0.26)',
                    backgroundColor: 'rgba(248,251,255,0.82)'
                  }}
                >
                  <Chip
                    size="small"
                    label="Política vigente"
                    sx={{
                      mb: 0.8,
                      fontWeight: 800,
                      color: '#1e3a8a',
                      backgroundColor: 'rgba(37,99,235,0.1)',
                      border: '1px solid rgba(37,99,235,0.18)'
                    }}
                  />
                  <Typography sx={{ color: '#0f172a', fontWeight: 800, fontSize: 16, letterSpacing: '-0.01em', mb: 0.35 }}>
                    {policy.title || policy.name || 'Declaración jurada de salud'}
                  </Typography>
                  <Typography sx={{ color: '#475569', fontSize: 13.5, lineHeight: 1.5 }}>
                    Documento aplicable a ingresos y tareas en planta.
                  </Typography>
                </Box>
              )}

              <Typography sx={{ mb: 1.55, color: '#1f2937', lineHeight: 1.7, fontSize: 14.2 }}>
                Declaro encontrarme en condiciones de salud adecuadas al momento de ingresar a la planta y manifiesto haber leído y comprendido la política interna vigente de la empresa.
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.15 }}>
                <PolicySection
                  icon={<HealthAndSafetyRoundedIcon sx={{ fontSize: 19 }} />}
                  title="Declaración jurada de salud"
                  text="La declaración jurada de salud es obligatoria al ingreso y confirma la aptitud sanitaria del colaborador para operar en planta bajo criterios de inocuidad."
                />
                <PolicySection
                  icon={<RestaurantRoundedIcon sx={{ fontSize: 19 }} />}
                  title="Prevención alimentaria"
                  text="Esta declaración tiene como objetivo prevenir riesgos de contaminación o transmisión de enfermedades a través de alimentos, protegiendo al personal, clientes y consumidores."
                />
                <PolicySection
                  icon={<CampaignRoundedIcon sx={{ fontSize: 19 }} />}
                  title="Comunicación obligatoria"
                  text="Antes de iniciar tareas, todo colaborador deberá informar al supervisor o al área de Calidad cualquier síntoma, lesión o condición que pudiera representar un riesgo."
                />
                <PolicySection
                  icon={<LockRoundedIcon sx={{ fontSize: 19 }} />}
                  title="Confidencialidad"
                  text="La información declarada será tratada de manera confidencial y utilizada únicamente con fines preventivos y de control interno."
                />
              </Box>

              <PolicyAcceptanceBlock
                acceptance={acceptance}
                acceptanceLoading={acceptanceLoading}
                acceptanceError={acceptanceError}
                checked={acceptanceChecked}
                saving={savingAcceptance}
                saveError={saveAcceptanceError}
                onCheckedChange={setAcceptanceChecked}
                onAccept={handleAcceptPolicies}
                onViewConfirmation={navigateToConfirmation}
              />

              <Divider sx={{ mt: 1.45, mb: 1, borderColor: 'rgba(148,163,184,0.26)' }} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.6} justifyContent="space-between">
                <Typography sx={{ color: '#475569', fontSize: 12.5, fontWeight: 600 }}>
                  ServiFood Catering · Plataforma de análisis de desvíos
                </Typography>
                <Typography sx={{ color: '#475569', fontSize: 12.5, fontWeight: 600 }}>
                  Última actualización: {currentMonthYear}
                </Typography>
              </Stack>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

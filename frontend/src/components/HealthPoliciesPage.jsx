import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography
} from '@mui/material';
import HealthAndSafetyRoundedIcon from '@mui/icons-material/HealthAndSafetyRounded';
import RestaurantRoundedIcon from '@mui/icons-material/RestaurantRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import { getActiveHealthPolicy } from '../services/healthDeclarations';
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
        border: '1px solid rgba(29,78,216,0.14)',
        borderRadius: 2,
        p: { xs: 1.25, md: 1.5 },
        backgroundColor: '#f8fbff'
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.6 }}>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            backgroundColor: 'rgba(29,78,216,0.12)',
            color: '#1e3a8a'
          }}
        >
          {icon}
        </Box>
        <Typography sx={{ fontWeight: 800, color: '#0f172a', fontSize: 15 }}>
          {title}
        </Typography>
      </Stack>
      <Typography sx={{ color: '#334155', lineHeight: 1.55, fontSize: 14 }}>
        {text}
      </Typography>
    </Box>
  );
}

export default function HealthPoliciesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [policy, setPolicy] = useState(null);
  const currentMonthYear = getCurrentMonthYear();

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getActiveHealthPolicy();
      setPolicy(data || null);
    } catch (err) {
      setError(err.message || 'No se pudo cargar la política activa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ borderRadius: 3, border: '1px solid rgba(29,78,216,0.18)', boxShadow: '0 12px 30px rgba(15, 23, 42, 0.10)' }}>
      <CardContent sx={{ p: { xs: 1.75, md: 2.5 } }}>
        {loading && <CircularProgress size={22} />}
        {!loading && error && <Alert severity="error">{error}</Alert>}
        {!loading && !error && !policy && <Alert severity="info">No hay política activa configurada.</Alert>}

        {!loading && (
          <Box
            sx={{
              border: '1px solid rgba(148,163,184,0.3)',
              borderRadius: 2.5,
              overflow: 'hidden',
              backgroundColor: '#fff'
            }}
          >
            <Box
              sx={{
                px: { xs: 1.5, md: 2.2 },
                py: { xs: 1.6, md: 2.1 },
                background: 'linear-gradient(120deg, #14316f 0%, #1d4ed8 100%)',
                color: '#fff'
              }}
            >
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.4} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
                <Stack direction="row" spacing={{ xs: 1.4, md: 1.8 }} alignItems="center">
                  <Box
                    component="img"
                    src={servifoodLogo}
                    alt="ServiFood"
                    sx={{
                      width: { xs: 150, md: 210 },
                      height: { xs: 48, md: 68 },
                      objectFit: 'contain',
                      display: 'block',
                      flexShrink: 0
                    }}
                  />
                  <Divider
                    orientation="vertical"
                    flexItem
                    sx={{
                      borderColor: 'rgba(255,255,255,0.32)',
                      mx: { xs: 0.2, md: 0.4 },
                      display: { xs: 'none', md: 'block' }
                    }}
                  />
                  <Box>
                    <Typography sx={{ fontWeight: 900, letterSpacing: '-0.01em', lineHeight: 1.2, fontSize: { xs: 20, md: 24 } }}>
                      Políticas Internas
                    </Typography>
                    <Typography sx={{ fontSize: { xs: 13, md: 14 }, color: 'rgba(239,246,255,0.95)', mt: 0.25 }}>
                      Lineamientos de salud, higiene y cumplimiento interno
                    </Typography>
                    <Typography sx={{ mt: 0.55, fontSize: 12.8, color: 'rgba(219,234,254,0.95)', fontWeight: 600 }}>
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
                    color: '#dbeafe',
                    border: '1px solid rgba(219,234,254,0.4)',
                    backgroundColor: 'rgba(255,255,255,0.09)'
                  }}
                />
              </Stack>
            </Box>

            <Box sx={{ p: { xs: 1.4, md: 2 } }}>
              {policy && (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.1 }}>
                  <Chip
                    size="small"
                    label="Política vigente"
                    sx={{
                      fontWeight: 800,
                      color: '#1e3a8a',
                      backgroundColor: 'rgba(29,78,216,0.12)',
                      border: '1px solid rgba(29,78,216,0.2)'
                    }}
                  />
                  <Typography sx={{ color: '#334155', fontWeight: 700, fontSize: 14 }}>
                    {policy.title || policy.name || 'Declaración jurada de salud'}
                  </Typography>
                </Stack>
              )}

              <Typography sx={{ mb: 1.4, color: '#1f2937', lineHeight: 1.6, fontSize: 14 }}>
                Declaro encontrarme en condiciones de salud adecuadas al momento de ingresar a la planta y manifiesto haber leído y comprendido la política interna vigente de la empresa.
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.2 }}>
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

              <Divider sx={{ my: 1.4, borderColor: 'rgba(148,163,184,0.35)' }} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.6} justifyContent="space-between">
                <Typography sx={{ color: '#334155', fontSize: 13, fontWeight: 700 }}>
                  ServiFood Catering · Plataforma de análisis de desvíos
                </Typography>
                <Typography sx={{ color: '#475569', fontSize: 13, fontWeight: 600 }}>
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

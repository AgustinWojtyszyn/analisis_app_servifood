import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import RuleRoundedIcon from '@mui/icons-material/RuleRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import servifoodLogo from '../assets/servifood_logo_white_text_HQ.png';
import excelIcon from '../assets/excel.png';

const featureItems = [
  {
    icon: <img src={excelIcon} alt="Excel" width={24} height={24} />,
    title: 'Procesar archivos Excel automáticamente',
    description: 'Subí tu archivo y obtené una lectura estructurada en pocos segundos.'
  },
  {
    icon: <RuleRoundedIcon sx={{ fontSize: 24 }} />,
    title: 'Clasificar incidencias por gravedad',
    description: 'Aplicá reglas de negocio para priorizar lo urgente frente a lo operativo.'
  },
  {
    icon: <BoltRoundedIcon sx={{ fontSize: 24 }} />,
    title: 'Detectar problemas críticos en segundos',
    description: 'Identificá focos de riesgo sin revisión manual fila por fila.'
  },
  {
    icon: <InsightsRoundedIcon sx={{ fontSize: 24 }} />,
    title: 'Priorizar acciones por sector',
    description: 'Tomá decisiones con una vista clara de impacto por área.'
  }
];

export default function PublicLanding({ onLogin, onRegister }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        px: 2,
        py: { xs: 5, md: 7 },
        display: 'flex',
        justifyContent: 'center',
        background: 'linear-gradient(155deg, #101f63 0%, #203d8f 54%, #2d52af 100%)',
        position: 'relative',
        overflow: 'hidden',
        '@keyframes fadeUp': {
          '0%': { opacity: 0, transform: 'translateY(14px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          width: 720,
          height: 720,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(95,156,255,0.32) 0%, rgba(95,156,255,0) 68%)',
          top: -250,
          left: '50%',
          transform: 'translateX(-50%)'
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 20% 80%, rgba(52, 211, 153, 0.10), transparent 36%), radial-gradient(circle at 85% 18%, rgba(125, 211, 252, 0.16), transparent 35%)',
          pointerEvents: 'none'
        }
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 1080, position: 'relative', zIndex: 1 }}>
        <Box sx={{ textAlign: 'center', maxWidth: 840, mx: 'auto' }}>
          <Box
            component="img"
            src={servifoodLogo}
            alt="ServiFood Catering Logo"
            sx={{
              width: { xs: 200, md: 230 },
              height: { xs: 200, md: 230 },
              objectFit: 'contain',
              display: 'block',
              mx: 'auto',
              animation: 'fadeUp 520ms ease-out both'
            }}
          />
          <Typography
            sx={{
              mt: { xs: 2, md: 2.5 },
              fontSize: { xs: 40, sm: 50, md: 56 },
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              lineHeight: 1.02,
              animation: 'fadeUp 520ms ease-out 110ms both'
            }}
          >
            ANÁLISIS DE CALIDAD
          </Typography>
          <Typography
            sx={{
              mt: { xs: 1.8, md: 2.1 },
              color: 'rgba(236,244,255,0.82)',
              fontSize: { xs: 16, md: 18 },
              maxWidth: 700,
              mx: 'auto',
              animation: 'fadeUp 520ms ease-out 200ms both'
            }}
          >
            Convertí planillas en decisiones operativas con clasificación automática, priorización de riesgos y seguimiento claro por sector.
          </Typography>
          <Box
            sx={{
              display: 'flex',
              gap: 1.35,
              justifyContent: 'center',
              mt: { xs: 3.3, md: 4 },
              flexWrap: 'wrap',
              animation: 'fadeUp 520ms ease-out 290ms both'
            }}
          >
            <Button
              variant="outlined"
              onClick={onLogin}
              sx={{
                px: 2.6,
                py: 1.15,
                fontWeight: 700,
                borderRadius: 2.2,
                color: '#f1f6ff',
                borderColor: 'rgba(241,246,255,0.62)',
                backgroundColor: 'rgba(255,255,255,0.03)',
                transition: 'transform 0.2s ease, filter 0.2s ease, background-color 0.2s ease',
                '&:hover': {
                  borderColor: '#ffffff',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  transform: 'translateY(-1px) scale(1.015)',
                  filter: 'brightness(1.08)'
                }
              }}
            >
              Iniciar Sesión
            </Button>
            <Button
              variant="contained"
              onClick={onRegister}
              sx={{
                px: 2.7,
                py: 1.15,
                fontWeight: 800,
                borderRadius: 2.2,
                backgroundColor: '#fb8c00',
                boxShadow: '0 12px 22px rgba(251, 140, 0, 0.34)',
                transition: 'transform 0.2s ease, filter 0.2s ease, background-color 0.2s ease',
                '&:hover': {
                  backgroundColor: '#f57c00',
                  transform: 'translateY(-1px) scale(1.015)',
                  filter: 'brightness(1.06)'
                }
              }}
            >
              Registrarse
            </Button>
          </Box>
        </Box>

        <Box sx={{ mt: { xs: 7, md: 8.5 }, maxWidth: 1020, mx: 'auto' }}>
          <Typography
            sx={{
              textAlign: 'center',
              color: '#f8fbff',
              fontWeight: 800,
              fontSize: { xs: 25, md: 31 },
              mb: { xs: 2.6, md: 3.2 }
            }}
          >
            ¿Qué podés hacer con la plataforma?
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              gap: 1.6
            }}
          >
            {featureItems.map((item) => (
              <Box
                key={item.title}
                sx={{
                  borderRadius: 3,
                  p: { xs: 2.1, md: 2.35 },
                  backgroundColor: 'rgba(255,255,255,0.13)',
                  border: '1px solid rgba(255,255,255,0.17)',
                  boxShadow: '0 8px 20px rgba(7, 18, 53, 0.16)',
                  backdropFilter: 'blur(6px)'
                }}
              >
                <Box sx={{ color: '#d6e6ff', mb: 1.05 }}>{item.icon}</Box>
                <Typography sx={{ color: '#ffffff', fontWeight: 700, fontSize: 17, lineHeight: 1.25 }}>
                  {item.title}
                </Typography>
                <Typography sx={{ mt: 0.75, color: 'rgba(230,240,255,0.83)', fontSize: 14.3 }}>
                  {item.description}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Box
          sx={{
            mt: { xs: 7, md: 8.5 },
            maxWidth: 980,
            mx: 'auto',
            borderRadius: 3,
            p: { xs: 2.6, md: 3.2 },
            textAlign: 'center',
            background: 'linear-gradient(132deg, rgba(255,255,255,0.11), rgba(255,255,255,0.06))',
            border: '1px solid rgba(255,255,255,0.18)',
            boxShadow: '0 12px 26px rgba(8, 20, 58, 0.16)'
          }}
        >
          <Typography sx={{ color: '#f8fbff', fontWeight: 800, fontSize: { xs: 23, md: 28 } }}>
            Empezá a optimizar tu gestión hoy
          </Typography>
          <Typography sx={{ mt: 0.8, color: 'rgba(234,242,255,0.84)', fontSize: { xs: 15.5, md: 17 } }}>
            Subí tu primer archivo y obtené resultados en segundos.
          </Typography>
          <Button
            variant="contained"
            onClick={onRegister}
            sx={{
              mt: 2.2,
              px: 3.2,
              py: 1.2,
              fontWeight: 800,
              borderRadius: 2.1,
              backgroundColor: '#fb8c00',
              '&:hover': { backgroundColor: '#f57c00' }
            }}
          >
            Crear cuenta
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

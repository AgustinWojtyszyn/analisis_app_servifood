import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import {
  BarChart3,
  FolderCheck,
  HeartPulse,
  ShieldCheck
} from 'lucide-react';
import servifoodLogo from '../assets/servifood_logo_white_text_HQ.png';

function FeatureLine({ icon: Icon, children }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.1, color: 'rgba(236,244,255,0.88)', fontSize: 14.5 }}>
      <Icon size={18} strokeWidth={2.2} aria-hidden="true" />
      <span>{children}</span>
    </Box>
  );
}

export default function PublicLanding({ onLogin, onRegister }) {
  const institutionalFeatures = [
    { icon: HeartPulse, text: 'Declaraciones de salud.' },
    { icon: ShieldCheck, text: 'Políticas y cumplimiento.' },
    { icon: FolderCheck, text: 'Documentación del sistema de gestión.' },
    { icon: BarChart3, text: 'Herramientas internas de análisis.' }
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        px: 2,
        py: { xs: 4, md: 5 },
        display: 'flex',
        justifyContent: 'center',
        background: 'linear-gradient(155deg, #101f63 0%, #203d8f 54%, #2d52af 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 980, position: 'relative', zIndex: 1 }}>
        <Box sx={{ textAlign: 'center', maxWidth: 860, mx: 'auto' }}>
          <Box
            component="img"
            src={servifoodLogo}
            alt="ServiFood Catering Logo"
            sx={{
              width: { xs: 150, md: 180 },
              height: { xs: 150, md: 180 },
              objectFit: 'contain',
              display: 'block',
              mx: 'auto'
            }}
          />
          <Typography
            component="h1"
            sx={{
              mt: { xs: 1.5, md: 2 },
              fontSize: { xs: 35, sm: 44, md: 54 },
              fontWeight: 900,
              color: '#ffffff',
              lineHeight: 1.05
            }}
          >
            ServiFood — Plataforma de gestión y cumplimiento
          </Typography>
          <Typography
            sx={{
              mt: 2,
              color: 'rgba(236,244,255,0.84)',
              fontSize: { xs: 16, md: 18 },
              maxWidth: 760,
              mx: 'auto',
              lineHeight: 1.6
            }}
          >
            Centralización de declaraciones de salud, documentación del sistema de gestión y herramientas internas de análisis.
          </Typography>

          <Box sx={{ mt: { xs: 3.2, md: 4 }, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              onClick={onLogin}
              sx={{
                px: 4,
                py: 1.35,
                fontWeight: 850,
                borderRadius: 1.5,
                backgroundColor: '#fb8c00',
                boxShadow: '0 12px 22px rgba(251, 140, 0, 0.30)',
                '&:hover': { backgroundColor: '#f57c00' }
              }}
            >
              Ingresar
            </Button>
          </Box>
        </Box>

        <Box
          sx={{
            mt: { xs: 4.2, md: 5 },
            maxWidth: 760,
            mx: 'auto',
            borderRadius: 2,
            p: { xs: 2.4, md: 2.8 },
            backgroundColor: 'rgba(255,255,255,0.11)',
            border: '1px solid rgba(255,255,255,0.18)',
            boxShadow: '0 12px 26px rgba(8, 20, 58, 0.16)',
            display: 'grid',
            gap: 1.35
          }}
        >
          {institutionalFeatures.map((item) => (
            <FeatureLine key={item.text} icon={item.icon}>{item.text}</FeatureLine>
          ))}
        </Box>

        {onRegister && (
          <Box sx={{ mt: 3.5, textAlign: 'center' }}>
            <Button
              variant="outlined"
              onClick={onRegister}
              sx={{
                px: 2.6,
                py: 1.05,
                fontWeight: 750,
                borderRadius: 1.5,
                color: '#f1f6ff',
                borderColor: 'rgba(241,246,255,0.62)',
                backgroundColor: 'rgba(255,255,255,0.03)',
                '&:hover': {
                  borderColor: '#ffffff',
                  backgroundColor: 'rgba(255,255,255,0.08)'
                }
              }}
            >
              Solicitar registro
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}

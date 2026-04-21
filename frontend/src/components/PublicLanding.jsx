import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import servifoodLogo from '../assets/servifood_logo_white_text_HQ.png';

export default function PublicLanding({ onLogin, onRegister }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        px: 2,
        py: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(145deg, #1a237e 0%, #283593 52%, #303f9f 100%)'
      }}
    >
      <Box sx={{ textAlign: 'center', maxWidth: 760 }}>
        <Box
          component="img"
          src={servifoodLogo}
          alt="ServiFood Catering Logo"
          sx={{ width: 220, height: 220, objectFit: 'contain', display: 'block', mx: 'auto' }}
        />
        <Typography
          sx={{
            mt: 1.5,
            fontSize: { xs: 34, sm: 48 },
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '0.03em'
          }}
        >
          ANÁLISIS DE CALIDAD
        </Typography>
        <Typography sx={{ mt: 1.5, color: 'rgba(255,255,255,0.88)' }}>
          Plataforma para procesar archivos Excel, clasificar incidencias y priorizar acciones.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.25, justifyContent: 'center', mt: 3, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            onClick={onLogin}
            sx={{
              px: 2.5,
              py: 1.15,
              fontWeight: 700,
              borderRadius: 2,
              backgroundColor: '#283593',
              '&:hover': { backgroundColor: '#3949ab' }
            }}
          >
            Iniciar Sesión
          </Button>
          <Button
            variant="contained"
            onClick={onRegister}
            sx={{
              px: 2.5,
              py: 1.15,
              fontWeight: 700,
              borderRadius: 2,
              backgroundColor: '#fb8c00',
              '&:hover': { backgroundColor: '#f57c00' }
            }}
          >
            Registrarse
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

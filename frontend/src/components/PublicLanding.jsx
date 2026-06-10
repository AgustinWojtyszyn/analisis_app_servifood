import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import {
  BarChart3,
  FileText,
  HeartPulse,
  ShieldCheck
} from 'lucide-react';
import servifoodLogo from '../assets/servifood_logo_white_text_HQ.png';

const benefits = [
  {
    icon: FileText,
    title: 'Centralizar documentación',
    text: 'Procedimientos, registros, políticas y archivos operativos en un mismo lugar.'
  },
  {
    icon: HeartPulse,
    title: 'Gestionar salud operativa',
    text: 'Declaraciones de salud y seguimiento diario del equipo.'
  },
  {
    icon: BarChart3,
    title: 'Analizar información',
    text: 'Carga de planillas, historial, gráficos e indicadores para la gestión interna.'
  },
  {
    icon: ShieldCheck,
    title: 'Controlar accesos',
    text: 'Cada persona ve únicamente las herramientas habilitadas según su perfil.'
  }
];

const profileUses = [
  {
    title: 'Colaboradores',
    text: 'Acceso simple a las funciones operativas necesarias.',
    items: ['Declaración de Salud', 'Políticas internas']
  },
  {
    title: 'Gestión interna',
    text: 'Herramientas para administración, seguimiento documental y análisis operativo.',
    items: [
      'Documentos SGC y certificaciones',
      'Análisis, historial e indicadores',
      'Reglas de clasificación',
      'Gestión de usuarios y declaraciones'
    ]
  }
];

const primaryButtonSx = {
  minWidth: { xs: '100%', sm: 154 },
  px: 4,
  py: 1.28,
  borderRadius: 1.5,
  backgroundColor: '#fb8c00',
  boxShadow: '0 12px 24px rgba(251,140,0,0.30)',
  fontWeight: 850,
  '&:hover': {
    backgroundColor: '#f57c00',
    boxShadow: '0 14px 28px rgba(251,140,0,0.36)',
    transform: 'translateY(-1px)'
  },
  transition: 'transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease'
};

const secondaryButtonSx = {
  minWidth: { xs: '100%', sm: 178 },
  px: 3,
  py: 1.18,
  borderRadius: 1.5,
  color: '#ffffff',
  borderColor: 'rgba(255,255,255,0.72)',
  backgroundColor: 'rgba(255,255,255,0.10)',
  fontWeight: 800,
  '&:hover': {
    borderColor: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.16)'
  }
};

function ActionButtons({ onLogin, onRegister }) {
  return (
    <Box
      sx={{
        mt: { xs: 2.6, md: 3 },
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'center',
        alignItems: 'center',
        gap: 1.3
      }}
    >
      <Button variant="contained" onClick={onLogin} sx={primaryButtonSx}>
        Ingresar
      </Button>
      {onRegister && (
        <Button variant="outlined" onClick={onRegister} sx={secondaryButtonSx}>
          Solicitar registro
        </Button>
      )}
    </Box>
  );
}

function BenefitItem({ icon: Icon, title, text }) {
  return (
    <Box
      sx={{
        p: { xs: 1.8, md: 2 },
        borderRadius: 2,
        border: '1px solid rgba(255,255,255,0.14)',
        backgroundColor: 'rgba(255,255,255,0.08)',
        display: 'grid',
        gridTemplateColumns: '38px 1fr',
        gap: 1.5,
        alignItems: 'start',
        transition: 'transform 160ms ease, background-color 160ms ease, border-color 160ms ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          backgroundColor: 'rgba(255,255,255,0.11)',
          borderColor: 'rgba(255,255,255,0.22)'
        }
      }}
    >
      <Box
        sx={{
          width: 38,
          height: 38,
          borderRadius: 1.5,
          display: 'grid',
          placeItems: 'center',
          color: '#ffffff',
          backgroundColor: 'rgba(125,211,252,0.18)',
          border: '1px solid rgba(125,211,252,0.26)'
        }}
      >
        <Icon size={21} strokeWidth={2.15} aria-hidden="true" />
      </Box>
      <Box>
        <Typography component="h3" sx={{ color: '#ffffff', fontSize: 17, fontWeight: 850, lineHeight: 1.2 }}>
          {title}
        </Typography>
        <Typography sx={{ mt: 0.65, color: 'rgba(235,245,255,0.82)', fontSize: 14.5, lineHeight: 1.5 }}>
          {text}
        </Typography>
      </Box>
    </Box>
  );
}

function ProfileUseBlock({ title, text, items }) {
  return (
    <Box
      sx={{
        p: { xs: 2.2, md: 2.8 },
        borderRadius: 2,
        border: '1px solid rgba(255,255,255,0.16)',
        background: 'linear-gradient(145deg, rgba(255,255,255,0.12), rgba(255,255,255,0.07))',
        boxShadow: '0 14px 30px rgba(3,11,38,0.16)'
      }}
    >
      <Typography component="h3" sx={{ color: '#ffffff', fontSize: { xs: 22, md: 25 }, fontWeight: 900, lineHeight: 1.15 }}>
        {title}
      </Typography>
      <Typography sx={{ mt: 1, color: 'rgba(235,245,255,0.83)', fontSize: 15.5, lineHeight: 1.55 }}>
        {text}
      </Typography>
      <Box component="ul" sx={{ mt: 2, mb: 0, pl: 2.4, color: 'rgba(255,255,255,0.91)', display: 'grid', gap: 0.85 }}>
        {items.map((item) => (
          <Typography key={item} component="li" sx={{ pl: 0.3, fontSize: 15, lineHeight: 1.45 }}>
            {item}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

export default function PublicLanding({ onLogin, onRegister }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at 16% 7%, rgba(14,165,233,0.28) 0, rgba(14,165,233,0) 27%), radial-gradient(circle at 86% 20%, rgba(251,140,0,0.14) 0, rgba(251,140,0,0) 23%), linear-gradient(155deg, #08164f 0%, #15317c 52%, #2d52af 100%)',
        color: '#ffffff',
        overflowX: 'hidden'
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 1080, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, py: { xs: 3, md: 4.5 } }}>
        <Box component="section" sx={{ textAlign: 'center', maxWidth: 840, mx: 'auto', pt: { xs: 0.5, md: 1 }, pb: { xs: 4, md: 5.5 } }}>
          <Box
            component="img"
            src={servifoodLogo}
            alt="ServiFood Catering Logo"
            sx={{
              width: { xs: 118, sm: 140, md: 158 },
              height: { xs: 118, sm: 140, md: 158 },
              objectFit: 'contain',
              display: 'block',
              mx: 'auto'
            }}
          />
          <Typography
            component="h1"
            sx={{
              mt: { xs: 1, md: 1.5 },
              color: '#ffffff',
              fontSize: { xs: 32, sm: 43, md: 54 },
              fontWeight: 950,
              lineHeight: 1.05
            }}
          >
            ServiFood — Plataforma de gestión y cumplimiento
          </Typography>
          <Typography
            sx={{
              mt: 1.8,
              color: 'rgba(236,244,255,0.88)',
              fontSize: { xs: 16.5, md: 19 },
              maxWidth: 760,
              mx: 'auto',
              lineHeight: 1.58
            }}
          >
            Un espacio centralizado para declaraciones de salud, políticas internas, documentación del sistema de gestión e indicadores operativos.
          </Typography>
          <ActionButtons onLogin={onLogin} onRegister={onRegister} />
        </Box>

        <Box component="section" sx={{ py: { xs: 2.5, md: 3.5 } }}>
          <Typography component="h2" sx={{ color: '#ffffff', fontSize: { xs: 25, md: 32 }, fontWeight: 900, lineHeight: 1.15 }}>
            Qué permite hacer la plataforma
          </Typography>
          <Box
            sx={{
              mt: 2,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
              gap: 1.5
            }}
          >
            {benefits.map((benefit) => (
              <BenefitItem key={benefit.title} {...benefit} />
            ))}
          </Box>
        </Box>

        <Box component="section" sx={{ py: { xs: 3.5, md: 4.5 } }}>
          <Typography component="h2" sx={{ color: '#ffffff', fontSize: { xs: 25, md: 32 }, fontWeight: 900, lineHeight: 1.15 }}>
            Usos según perfil
          </Typography>
          <Box
            sx={{
              mt: 2,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
              gap: 2
            }}
          >
            {profileUses.map((use) => (
              <ProfileUseBlock key={use.title} {...use} />
            ))}
          </Box>
        </Box>

        <Box
          component="section"
          sx={{
            my: { xs: 3, md: 4 },
            p: { xs: 2.2, md: 2.8 },
            borderRadius: 2,
            border: '1px solid rgba(125,211,252,0.24)',
            background: 'linear-gradient(135deg, rgba(14,165,233,0.15), rgba(255,255,255,0.08))',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '48px 1fr' },
            gap: 1.7,
            alignItems: 'center'
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 1.5,
              display: 'grid',
              placeItems: 'center',
              color: '#ffffff',
              backgroundColor: 'rgba(251,140,0,0.20)',
              border: '1px solid rgba(251,140,0,0.28)'
            }}
          >
            <ShieldCheck size={27} strokeWidth={2.15} aria-hidden="true" />
          </Box>
          <Box>
            <Typography component="h2" sx={{ color: '#ffffff', fontSize: { xs: 22, md: 26 }, fontWeight: 900, lineHeight: 1.15 }}>
              Acceso automático según perfil
            </Typography>
            <Typography sx={{ mt: 0.8, color: 'rgba(235,245,255,0.84)', fontSize: { xs: 15.5, md: 16.5 }, lineHeight: 1.55 }}>
              El inicio de sesión es único para todos. Luego, la plataforma muestra automáticamente las herramientas habilitadas para cada cuenta.
            </Typography>
          </Box>
        </Box>

        <Box
          component="section"
          sx={{
            mt: { xs: 4, md: 5 },
            mb: { xs: 3, md: 4 },
            p: { xs: 2.4, md: 3.2 },
            borderRadius: 2,
            textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.16)',
            backgroundColor: 'rgba(255,255,255,0.09)',
            boxShadow: '0 18px 36px rgba(3,11,38,0.18)'
          }}
        >
          <Typography component="h2" sx={{ color: '#ffffff', fontSize: { xs: 27, md: 36 }, fontWeight: 950, lineHeight: 1.12 }}>
            Ingresá a la plataforma
          </Typography>
          <Typography sx={{ mt: 1.1, color: 'rgba(235,245,255,0.84)', fontSize: { xs: 15.5, md: 17 }, lineHeight: 1.55 }}>
            Accedé con tu cuenta para ver las herramientas disponibles para tu perfil.
          </Typography>
          <ActionButtons onLogin={onLogin} onRegister={onRegister} />
        </Box>

        <Box component="footer" sx={{ py: { xs: 2.5, md: 3 }, textAlign: 'center', color: 'rgba(235,245,255,0.68)' }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.88)', fontSize: 15.5, fontWeight: 850 }}>
            ServiFood Catering
          </Typography>
          <Typography sx={{ mt: 0.45, fontSize: 14 }}>
            Plataforma interna de gestión y cumplimiento
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

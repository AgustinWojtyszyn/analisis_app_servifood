import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { BarChart3, ClipboardCheck, FileText, FolderCheck, HeartPulse } from 'lucide-react';
import servifoodLogo from '../assets/servifood_logo_white_text_HQ.png';

const ORANGE = '#fb8c00';
const ORANGE_DARK = '#f57c00';

const visualModules = [
  {
    icon: BarChart3,
    title: 'Calidad',
    description: 'Indicadores y seguimiento'
  },
  {
    icon: FileText,
    title: 'Documentación',
    description: 'Documentos SGC centralizados'
  },
  {
    icon: ClipboardCheck,
    title: 'Operación',
    description: 'Herramientas de trabajo diario'
  }
];

const moduleCards = [
  {
    icon: BarChart3,
    title: 'Calidad y análisis',
    description: 'Indicadores claros para tomar decisiones y dar seguimiento a la operación.'
  },
  {
    icon: FolderCheck,
    title: 'Documentación y cumplimiento',
    description: 'Documentos SGC, certificaciones y políticas internas en un mismo lugar.'
  },
  {
    icon: HeartPulse,
    title: 'Salud operativa y accesos',
    description: 'Declaraciones de salud, perfiles y permisos adecuados para cada cuenta.'
  }
];

const primaryButtonSx = {
  minHeight: { xs: 38, sm: 42, md: 44 },
  px: { xs: 2, sm: 2.5, md: 2.8 },
  borderRadius: 1,
  backgroundColor: ORANGE,
  boxShadow: { xs: '0 4px 10px rgba(251,140,0,0.18)', sm: '0 8px 18px rgba(251,140,0,0.22)' },
  color: '#ffffff',
  fontSize: { xs: 14, sm: 14.5 },
  fontWeight: 850,
  whiteSpace: 'nowrap',
  '&:hover': {
    backgroundColor: ORANGE_DARK,
    boxShadow: { xs: '0 5px 12px rgba(251,140,0,0.20)', sm: '0 10px 20px rgba(251,140,0,0.26)' }
  }
};

const secondaryButtonSx = {
  minHeight: { xs: 38, sm: 42, md: 44 },
  px: { xs: 1.9, sm: 2.2, md: 2.4 },
  borderRadius: 1,
  color: '#ffffff',
  borderColor: 'rgba(255,255,255,0.30)',
  backgroundColor: 'rgba(255,255,255,0.035)',
  fontSize: { xs: 14, sm: 14.5 },
  fontWeight: 800,
  whiteSpace: 'nowrap',
  '&:hover': {
    borderColor: 'rgba(255,255,255,0.58)',
    backgroundColor: 'rgba(255,255,255,0.075)'
  }
};

function HeaderActions({ onLogin, onRegister }) {
  return (
    <Box
      sx={{
        display: 'flex',
        width: { xs: '100%', sm: 'auto' },
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: { xs: 'stretch', sm: 'flex-end' },
        gap: { xs: 0.65, sm: 1 }
      }}
    >
      {onRegister && (
        <Button variant="outlined" onClick={onRegister} sx={{ ...secondaryButtonSx, width: { xs: '100%', sm: 'auto' } }}>
          Solicitar registro
        </Button>
      )}
      <Button variant="contained" onClick={onLogin} sx={{ ...primaryButtonSx, width: { xs: '100%', sm: 'auto' } }}>
        Ingresar
      </Button>
    </Box>
  );
}

function LogoBlock() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.85, sm: 1.1 }, minWidth: 0 }}>
      <Box
        component="img"
        src={servifoodLogo}
        alt="ServiFood Catering Logo"
        sx={{ width: { xs: 38, sm: 48, md: 56 }, height: { xs: 38, sm: 48, md: 56 }, objectFit: 'contain', flex: '0 0 auto' }}
      />
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ color: '#ffffff', fontSize: { xs: 14, sm: 15, md: 16 }, fontWeight: 900, lineHeight: 1.12 }}>
          ServiFood Catering
        </Typography>
        <Typography sx={{ mt: 0.15, color: 'rgba(235,245,255,0.68)', fontSize: { xs: 12.5, sm: 13.5 }, fontWeight: 700 }}>
          Plataforma interna
        </Typography>
      </Box>
    </Box>
  );
}

function HeroVisual() {
  return (
    <Box
      sx={{
        borderRadius: 1,
        border: '1px solid rgba(255,255,255,0.10)',
        backgroundColor: { xs: 'rgba(255,255,255,0.045)', sm: 'rgba(255,255,255,0.065)', md: 'rgba(255,255,255,0.07)' },
        boxShadow: { xs: 'none', sm: '0 10px 24px rgba(2,10,35,0.16)', md: '0 16px 34px rgba(2,10,35,0.20)' },
        p: { xs: 1.25, sm: 2, md: 2.8 }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.9, sm: 1.2 }, pb: { xs: 1.1, sm: 1.6, md: 2 }, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Box
          component="img"
          src={servifoodLogo}
          alt="ServiFood Catering Logo"
          sx={{ width: { xs: 34, sm: 42, md: 48 }, height: { xs: 34, sm: 42, md: 48 }, objectFit: 'contain', flex: '0 0 auto' }}
        />
        <Box>
          <Typography sx={{ color: '#ffffff', fontSize: { xs: 14.5, sm: 15.5, md: 16 }, fontWeight: 900, lineHeight: 1.15 }}>
            Plataforma interna
          </Typography>
          <Typography sx={{ mt: 0.2, color: 'rgba(235,245,255,0.64)', fontSize: { xs: 12.7, sm: 13.2, md: 13.5 }, lineHeight: 1.35 }}>
            Gestión diaria de calidad, documentos y operación.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ mt: { xs: 1.05, sm: 1.6, md: 2 }, display: 'grid', gap: { xs: 0.7, sm: 0.95, md: 1.1 } }}>
        {visualModules.map(({ icon: Icon, title, description }) => (
          <Box
            key={title}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '32px 1fr', sm: '36px 1fr', md: '40px 1fr' },
              alignItems: 'center',
              gap: { xs: 0.85, sm: 1.05, md: 1.25 },
              p: { xs: 0.85, sm: 1.1, md: 1.35 },
              borderRadius: 1,
              backgroundColor: { xs: 'rgba(255,255,255,0.045)', md: 'rgba(255,255,255,0.075)' },
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            <Box
              sx={{
                width: { xs: 32, sm: 36, md: 40 },
                height: { xs: 32, sm: 36, md: 40 },
                borderRadius: 1,
                display: 'grid',
                placeItems: 'center',
                color: '#ffffff',
                backgroundColor: 'rgba(251,140,0,0.12)',
                border: '1px solid rgba(251,140,0,0.20)'
              }}
            >
              <Icon size={18} strokeWidth={2.1} aria-hidden="true" />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ color: '#ffffff', fontSize: { xs: 14, sm: 15, md: 15.5 }, fontWeight: 900, lineHeight: 1.18 }}>
                {title}
              </Typography>
              <Typography sx={{ mt: 0.1, color: 'rgba(235,245,255,0.66)', fontSize: { xs: 12.6, sm: 13.1, md: 13.5 }, lineHeight: 1.32 }}>
                {description}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function ModuleCard({ icon: Icon, title, description }) {
  return (
    <Box
      sx={{
        p: { xs: 1.45, sm: 1.85, md: 2.3 },
        borderRadius: 1,
        border: '1px solid rgba(255,255,255,0.09)',
        backgroundColor: { xs: 'rgba(255,255,255,0.052)', md: 'rgba(255,255,255,0.075)' },
        minHeight: { md: 196 }
      }}
    >
      <Box
        sx={{
          width: { xs: 34, sm: 38, md: 42 },
          height: { xs: 34, sm: 38, md: 42 },
          borderRadius: 1,
          display: 'grid',
          placeItems: 'center',
          color: '#ffffff',
          backgroundColor: 'rgba(251,140,0,0.12)',
          border: '1px solid rgba(251,140,0,0.20)'
        }}
      >
        <Icon size={20} strokeWidth={2.1} aria-hidden="true" />
      </Box>
      <Typography component="h3" sx={{ mt: { xs: 1.1, md: 1.6 }, color: '#ffffff', fontSize: { xs: 17, sm: 18.5, md: 20 }, fontWeight: 900, lineHeight: 1.2 }}>
        {title}
      </Typography>
      <Typography sx={{ mt: { xs: 0.65, md: 1 }, color: 'rgba(235,245,255,0.72)', fontSize: { xs: 13.8, sm: 14.4, md: 15 }, lineHeight: { xs: 1.45, md: 1.55 } }}>
        {description}
      </Typography>
    </Box>
  );
}

export default function PublicLanding({ onLogin, onRegister }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(150deg, #071347 0%, #102a6d 58%, #1f4699 100%)',
        color: '#ffffff',
        overflowX: 'hidden'
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 1180, mx: 'auto', px: { xs: 1.5, sm: 3, md: 4 }, py: { xs: 1.25, sm: 2, md: 2.8 } }}>
        <Box
          component="header"
          sx={{
            display: 'flex',
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            gap: { xs: 1.05, sm: 2 },
            flexDirection: { xs: 'column', sm: 'row' },
            pb: { xs: 1.35, sm: 2.2, md: 3.2 },
            borderBottom: '1px solid rgba(255,255,255,0.08)'
          }}
        >
          <LogoBlock />
          <HeaderActions onLogin={onLogin} onRegister={onRegister} />
        </Box>

        <Box
          component="main"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.04fr) minmax(300px, 0.96fr)' },
            gap: { xs: 2.1, sm: 3.2, md: 5.4 },
            alignItems: 'center',
            py: { xs: 2.55, sm: 4.4, md: 6.4 }
          }}
        >
          <Box sx={{ maxWidth: 650 }}>
            <Typography sx={{ color: ORANGE, fontSize: { xs: 11.5, sm: 12.5, md: 13 }, fontWeight: 900, lineHeight: 1.2 }}>
              SERVIFOOD CATERING
            </Typography>
            <Typography
              component="h1"
              sx={{
                mt: { xs: 0.85, sm: 1.1, md: 1.25 },
                color: '#ffffff',
                fontSize: { xs: 28, sm: 39, md: 50 },
                fontWeight: 950,
                lineHeight: { xs: 1.12, md: 1.08 },
                maxWidth: 660
              }}
            >
              La operación de ServiFood, organizada en un solo lugar.
            </Typography>
            <Typography
              sx={{
                mt: { xs: 1.15, md: 1.8 },
                color: 'rgba(236,244,255,0.80)',
                fontSize: { xs: 15, sm: 16.5, md: 18 },
                lineHeight: { xs: 1.48, md: 1.58 },
                maxWidth: 575
              }}
            >
              Accedé a documentación, indicadores y herramientas internas según tu perfil.
            </Typography>
            <Box sx={{ mt: { xs: 1.75, md: 2.8 }, width: { xs: '100%', sm: 'auto' } }}>
              <Button
                variant="contained"
                onClick={onLogin}
                sx={{ ...primaryButtonSx, minHeight: { xs: 40, sm: 46, md: 48 }, px: { xs: 2.2, sm: 3, md: 3.2 }, width: { xs: '100%', sm: 'auto' } }}
              >
                Ingresar a la plataforma
              </Button>
            </Box>
            <Typography sx={{ mt: { xs: 1, md: 1.5 }, color: 'rgba(235,245,255,0.58)', fontSize: { xs: 12.8, sm: 13.8, md: 14.5 }, lineHeight: 1.45, maxWidth: 540 }}>
              Cada cuenta visualiza únicamente las herramientas habilitadas para su rol.
            </Typography>
          </Box>

          <HeroVisual />
        </Box>

        <Box component="section" sx={{ py: { xs: 2.6, sm: 3.5, md: 4.8 }, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <Box sx={{ maxWidth: 760 }}>
            <Typography component="h2" sx={{ color: '#ffffff', fontSize: { xs: 23, sm: 28, md: 34 }, fontWeight: 950, lineHeight: 1.16 }}>
              Herramientas conectadas para el trabajo diario
            </Typography>
            <Typography sx={{ mt: { xs: 0.85, md: 1.15 }, color: 'rgba(235,245,255,0.70)', fontSize: { xs: 14.2, sm: 15.5, md: 17 }, lineHeight: { xs: 1.45, md: 1.55 } }}>
              Una plataforma centralizada para acompañar la operación y facilitar el seguimiento interno.
            </Typography>
          </Box>

          <Box
            sx={{
              mt: { xs: 1.8, md: 2.6 },
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
              gap: { xs: 1, sm: 1.25, md: 1.6 }
            }}
          >
            {moduleCards.map((module) => (
              <ModuleCard key={module.title} {...module} />
            ))}
          </Box>
        </Box>

        <Box
          component="footer"
          sx={{
            py: { xs: 1.45, sm: 2.1, md: 2.8 },
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: { xs: 0.25, sm: 0.7 },
            color: 'rgba(235,245,255,0.68)'
          }}
        >
          <Typography sx={{ color: 'rgba(255,255,255,0.86)', fontSize: { xs: 13.8, md: 15 }, fontWeight: 850 }}>
            ServiFood Catering
          </Typography>
          <Typography sx={{ fontSize: { xs: 12.8, md: 14 } }}>
            Plataforma interna de gestión y cumplimiento.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

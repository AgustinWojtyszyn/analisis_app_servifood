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

const benefitModules = [
  {
    icon: BarChart3,
    title: 'Calidad y análisis',
    description: 'Indicadores claros para tomar decisiones.'
  },
  {
    icon: FolderCheck,
    title: 'Documentación y cumplimiento',
    description: 'Documentos SGC y políticas en un mismo lugar.'
  },
  {
    icon: HeartPulse,
    title: 'Salud operativa y accesos',
    description: 'Perfiles, permisos y seguimiento interno.'
  }
];

const primaryButtonSx = {
  minHeight: { xs: 40, sm: 42 },
  px: { xs: 2.1, sm: 2.6 },
  borderRadius: 1,
  backgroundColor: ORANGE,
  boxShadow: 'none',
  color: '#ffffff',
  fontSize: { xs: 14, sm: 14.5 },
  fontWeight: 850,
  whiteSpace: 'nowrap',
  '&:hover': {
    backgroundColor: ORANGE_DARK,
    boxShadow: '0 6px 14px rgba(251,140,0,0.20)'
  }
};

const secondaryButtonSx = {
  minHeight: { xs: 40, sm: 42 },
  px: { xs: 2, sm: 2.4 },
  borderRadius: 1,
  color: '#ffffff',
  borderColor: 'rgba(255,255,255,0.28)',
  backgroundColor: 'rgba(255,255,255,0.035)',
  fontSize: { xs: 14, sm: 14.5 },
  fontWeight: 800,
  whiteSpace: 'nowrap',
  '&:hover': {
    borderColor: 'rgba(255,255,255,0.52)',
    backgroundColor: 'rgba(255,255,255,0.075)'
  }
};

function BrandMark() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.05, sm: 1.35, md: 1.65 }, minWidth: 0 }}>
      <Box
        component="img"
        src={servifoodLogo}
        alt="ServiFood Catering Logo"
        sx={{
          width: { xs: 58, sm: 70, md: 82 },
          height: { xs: 58, sm: 70, md: 82 },
          objectFit: 'contain',
          flex: '0 0 auto'
        }}
      />
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ color: '#ffffff', fontSize: { xs: 18, sm: 21, md: 24 }, fontWeight: 950, lineHeight: 1.08 }}>
          ServiFood Catering
        </Typography>
        <Typography sx={{ mt: 0.35, color: 'rgba(235,245,255,0.70)', fontSize: { xs: 13, sm: 14.2 }, fontWeight: 750 }}>
          Plataforma interna
        </Typography>
      </Box>
    </Box>
  );
}

function ActionButtons({ onLogin, onRegister }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: 'stretch',
        justifyContent: { sm: 'flex-end' },
        gap: { xs: 0.7, sm: 1 },
        width: { xs: '100%', sm: 'auto' }
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

function VisualSupport() {
  return (
    <Box
      aria-label="Módulos principales"
      sx={{
        alignSelf: 'center',
        width: '100%',
        maxWidth: { xs: '100%', md: 420 },
        ml: { md: 'auto' }
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gap: { xs: 0.85, sm: 1 },
          p: { xs: 1.15, sm: 1.4, md: 1.6 },
          borderRadius: 1,
          backgroundColor: 'rgba(255,255,255,0.055)',
          border: '1px solid rgba(255,255,255,0.09)'
        }}
      >
        {visualModules.map(({ icon: Icon, title, description }) => (
          <Box
            key={title}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '32px 1fr', sm: '36px 1fr' },
              alignItems: 'center',
              gap: { xs: 0.9, sm: 1.05 },
              py: { xs: 0.45, sm: 0.55 },
              px: { xs: 0.35, sm: 0.45 }
            }}
          >
            <Box
              sx={{
                width: { xs: 32, sm: 36 },
                height: { xs: 32, sm: 36 },
                borderRadius: 1,
                display: 'grid',
                placeItems: 'center',
                color: '#ffffff',
                backgroundColor: 'rgba(251,140,0,0.13)'
              }}
            >
              <Icon size={18} strokeWidth={2.1} aria-hidden="true" />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ color: '#ffffff', fontSize: { xs: 14.2, sm: 15 }, fontWeight: 900, lineHeight: 1.18 }}>
                {title}
              </Typography>
              <Typography sx={{ mt: 0.1, color: 'rgba(235,245,255,0.66)', fontSize: { xs: 12.7, sm: 13.2 }, lineHeight: 1.34 }}>
                {description}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function BenefitCard({ icon: Icon, title, description }) {
  return (
    <Box
      sx={{
        p: { xs: 1.45, sm: 1.7, md: 2 },
        borderRadius: 1,
        backgroundColor: 'rgba(255,255,255,0.055)',
        border: '1px solid rgba(255,255,255,0.08)'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.05 }}>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: 1,
            display: 'grid',
            placeItems: 'center',
            color: '#ffffff',
            backgroundColor: 'rgba(251,140,0,0.12)'
          }}
        >
          <Icon size={18} strokeWidth={2.1} aria-hidden="true" />
        </Box>
        <Typography component="h3" sx={{ color: '#ffffff', fontSize: { xs: 16.5, md: 18 }, fontWeight: 900, lineHeight: 1.2 }}>
          {title}
        </Typography>
      </Box>
      <Typography sx={{ mt: 0.85, color: 'rgba(235,245,255,0.70)', fontSize: { xs: 13.7, md: 14.5 }, lineHeight: 1.45 }}>
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
        background: 'linear-gradient(150deg, #071347 0%, #10275f 52%, #1d4595 100%)',
        color: '#ffffff',
        overflowX: 'hidden'
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 1160, mx: 'auto', px: { xs: 1.75, sm: 3, md: 4 }, py: { xs: 1.8, sm: 2.6, md: 3.4 } }}>
        <Box
          component="section"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.08fr) minmax(320px, 0.92fr)' },
            columnGap: { md: 5.6, lg: 7 },
            rowGap: { xs: 2.6, sm: 3.2 },
            alignItems: 'center',
            minHeight: { md: 'calc(100vh - 210px)' },
            pt: { xs: 0.4, md: 1.2 },
            pb: { xs: 3.8, sm: 5, md: 6.4 }
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Box
              component="header"
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'stretch', sm: 'center' },
                justifyContent: 'space-between',
                gap: { xs: 1.35, sm: 2.4 },
                mb: { xs: 3.2, sm: 4.4, md: 5.8 }
              }}
            >
              <BrandMark />
              <ActionButtons onLogin={onLogin} onRegister={onRegister} />
            </Box>

            <Box sx={{ maxWidth: 640 }}>
              <Typography
                component="h1"
                sx={{
                  color: '#ffffff',
                  fontSize: { xs: 31, sm: 43, md: 52 },
                  fontWeight: 950,
                  lineHeight: { xs: 1.1, md: 1.06 }
                }}
              >
                La operación de ServiFood, organizada en un solo lugar.
              </Typography>
              <Typography
                sx={{
                  mt: { xs: 1.35, sm: 1.7 },
                  color: 'rgba(236,244,255,0.82)',
                  fontSize: { xs: 15.5, sm: 17.2, md: 18 },
                  lineHeight: 1.55,
                  maxWidth: 560
                }}
              >
                Accedé a documentación, indicadores y herramientas internas según tu perfil.
              </Typography>
              <Box sx={{ mt: { xs: 2, sm: 2.5 }, width: { xs: '100%', sm: 'auto' } }}>
                <Button
                  variant="contained"
                  onClick={onLogin}
                  sx={{ ...primaryButtonSx, minHeight: { xs: 42, sm: 46 }, px: { xs: 2.4, sm: 3.1 }, width: { xs: '100%', sm: 'auto' } }}
                >
                  Ingresar a la plataforma
                </Button>
              </Box>
              <Typography sx={{ mt: 1.15, color: 'rgba(235,245,255,0.56)', fontSize: { xs: 12.8, sm: 13.8 }, lineHeight: 1.45, maxWidth: 520 }}>
                Cada cuenta visualiza únicamente las herramientas habilitadas para su rol.
              </Typography>
            </Box>
          </Box>

          <VisualSupport />
        </Box>

        <Box
          component="section"
          sx={{
            py: { xs: 3.4, sm: 4.5, md: 5.2 },
            borderTop: '1px solid rgba(255,255,255,0.075)'
          }}
        >
          <Box sx={{ maxWidth: 720 }}>
            <Typography component="h2" sx={{ color: '#ffffff', fontSize: { xs: 24, sm: 30, md: 35 }, fontWeight: 950, lineHeight: 1.14 }}>
              Herramientas conectadas para el trabajo diario
            </Typography>
            <Typography sx={{ mt: 1, color: 'rgba(235,245,255,0.70)', fontSize: { xs: 14.4, sm: 16, md: 17 }, lineHeight: 1.5 }}>
              Una plataforma centralizada para acompañar la operación y facilitar el seguimiento interno.
            </Typography>
          </Box>

          <Box
            sx={{
              mt: { xs: 2.2, md: 2.8 },
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
              gap: { xs: 1.05, sm: 1.25, md: 1.5 }
            }}
          >
            {benefitModules.map((module) => (
              <BenefitCard key={module.title} {...module} />
            ))}
          </Box>
        </Box>

        <Box
          component="footer"
          sx={{
            py: { xs: 1.8, md: 2.5 },
            borderTop: '1px solid rgba(255,255,255,0.075)',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 0.35,
            color: 'rgba(235,245,255,0.64)'
          }}
        >
          <Typography sx={{ color: 'rgba(255,255,255,0.84)', fontSize: { xs: 13.8, md: 15 }, fontWeight: 850 }}>
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

import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  FolderCheck,
  HeartPulse
} from 'lucide-react';
import servifoodLogo from '../assets/servifood_logo_white_text_HQ.png';

const pillars = [
  {
    icon: BarChart3,
    title: 'Calidad y análisis',
    description: 'Información operativa transformada en indicadores claros para tomar decisiones.',
    items: [
      'Carga y clasificación de planillas',
      'Historial de análisis',
      'Gráficos e indicadores',
      'Reglas de clasificación'
    ]
  },
  {
    icon: FolderCheck,
    title: 'Documentación y cumplimiento',
    description: 'Documentación centralizada para mantener orden, trazabilidad y seguimiento.',
    items: [
      'Documentos SGC',
      'Certificaciones',
      'Políticas internas',
      'Registros operativos'
    ]
  },
  {
    icon: HeartPulse,
    title: 'Salud operativa y accesos',
    description: 'Seguimiento diario del equipo con permisos adecuados para cada cuenta.',
    items: [
      'Declaraciones de salud',
      'Gestión administrativa',
      'Usuarios y perfiles',
      'Accesos según rol'
    ]
  }
];

const profileAreas = [
  {
    title: 'Colaboradores',
    description: 'Acceso simple a las funciones necesarias para el trabajo diario.',
    items: ['Declaración de Salud', 'Políticas internas']
  },
  {
    title: 'Personal autorizado',
    description: 'Herramientas internas para seguimiento, documentación y administración.',
    items: [
      'Calidad e indicadores',
      'Documentos SGC y certificaciones',
      'Reglas, usuarios y seguimiento administrativo'
    ]
  }
];

const primaryButtonSx = {
  minWidth: { xs: '100%', sm: 136 },
  px: 3.2,
  py: 1.14,
  borderRadius: 1.5,
  backgroundColor: '#fb8c00',
  boxShadow: '0 12px 24px rgba(251,140,0,0.30)',
  color: '#ffffff',
  fontWeight: 850,
  '&:hover': {
    backgroundColor: '#f57c00',
    boxShadow: '0 14px 28px rgba(251,140,0,0.36)',
    transform: 'translateY(-1px)'
  },
  transition: 'transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease'
};

const secondaryButtonSx = {
  minWidth: { xs: '100%', sm: 158 },
  px: 2.6,
  py: 1.04,
  borderRadius: 1.5,
  color: '#ffffff',
  borderColor: 'rgba(255,255,255,0.66)',
  backgroundColor: 'rgba(255,255,255,0.08)',
  fontWeight: 800,
  '&:hover': {
    borderColor: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.14)'
  }
};

function ButtonPair({ onLogin, onRegister, primaryLabel = 'Ingresar' }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: 'center',
        gap: 1.2
      }}
    >
      <Button variant="contained" onClick={onLogin} sx={primaryButtonSx}>
        {primaryLabel}
      </Button>
      {onRegister && (
        <Button variant="outlined" onClick={onRegister} sx={secondaryButtonSx}>
          Solicitar registro
        </Button>
      )}
    </Box>
  );
}

function EcosystemVisual() {
  const nodes = [
    { label: 'Operación', icon: Activity },
    { label: 'Documentación', icon: FileText },
    { label: 'Seguimiento', icon: ClipboardCheck }
  ];

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: { xs: 360, md: 430 },
        borderRadius: 3,
        border: '1px solid rgba(255,255,255,0.16)',
        background:
          'linear-gradient(150deg, rgba(255,255,255,0.14), rgba(255,255,255,0.07)), radial-gradient(circle at 70% 16%, rgba(251,140,0,0.18), transparent 28%)',
        boxShadow: '0 26px 54px rgba(2,10,35,0.30)',
        overflow: 'hidden',
        p: { xs: 2.2, md: 3 },
        display: 'grid',
        alignContent: 'center'
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: { xs: 18, md: 24 },
          borderRadius: 2.5,
          border: '1px solid rgba(125,211,252,0.18)'
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: { xs: 96, md: 120 },
          left: '50%',
          width: { xs: 1, md: '68%' },
          height: { xs: 150, md: 1 },
          background: 'linear-gradient(90deg, transparent, rgba(125,211,252,0.44), transparent)',
          transform: { xs: 'translateX(-50%)', md: 'translateX(-50%)' }
        }}
      />
      <Box sx={{ position: 'relative', zIndex: 1, display: 'grid', gap: { xs: 2.1, md: 3 } }}>
        <Box
          sx={{
            mx: 'auto',
            width: { xs: 174, md: 202 },
            minHeight: { xs: 150, md: 172 },
            borderRadius: 3,
            border: '1px solid rgba(255,255,255,0.18)',
            backgroundColor: 'rgba(8,22,79,0.62)',
            boxShadow: '0 20px 42px rgba(3,11,38,0.26)',
            display: 'grid',
            placeItems: 'center',
            textAlign: 'center',
            px: 2
          }}
        >
          <Box
            component="img"
            src={servifoodLogo}
            alt="ServiFood Catering Logo"
            sx={{ width: { xs: 96, md: 116 }, height: { xs: 96, md: 116 }, objectFit: 'contain' }}
          />
          <Typography sx={{ mt: -0.5, color: '#ffffff', fontSize: { xs: 15, md: 16 }, fontWeight: 900 }}>
            Ecosistema de calidad
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
            gap: { xs: 1.2, md: 1.4 }
          }}
        >
          {nodes.map(({ label, icon: Icon }, index) => (
            <Box
              key={label}
              sx={{
                p: 1.35,
                borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.16)',
                backgroundColor: index === 1 ? 'rgba(251,140,0,0.15)' : 'rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: 1.1
              }}
            >
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: 1.3,
                  display: 'grid',
                  placeItems: 'center',
                  color: '#ffffff',
                  backgroundColor: 'rgba(251,140,0,0.18)',
                  border: '1px solid rgba(251,140,0,0.26)'
                }}
              >
                <Icon size={19} strokeWidth={2.2} aria-hidden="true" />
              </Box>
              <Typography sx={{ color: '#ffffff', fontSize: 14.5, fontWeight: 850 }}>{label}</Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ display: 'grid', gap: 0.8 }}>
          {['Registro trazable', 'Checklist operativo', 'Seguimiento autorizado'].map((item) => (
            <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'rgba(235,245,255,0.80)', fontSize: 14 }}>
              <CheckCircle2 size={17} color="#fb8c00" strokeWidth={2.3} aria-hidden="true" />
              <span>{item}</span>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function PillarCard({ icon: Icon, title, description, items }) {
  return (
    <Box
      sx={{
        p: { xs: 2.2, md: 2.4 },
        borderRadius: 2,
        border: '1px solid rgba(255,255,255,0.15)',
        backgroundColor: 'rgba(255,255,255,0.08)',
        boxShadow: '0 16px 34px rgba(3,11,38,0.18)',
        transition: 'transform 160ms ease, border-color 160ms ease, background-color 160ms ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          borderColor: 'rgba(251,140,0,0.36)',
          backgroundColor: 'rgba(255,255,255,0.105)'
        }
      }}
    >
      <Box sx={{ width: 42, height: 3, borderRadius: 99, backgroundColor: '#fb8c00', mb: 1.8 }} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1.5,
            display: 'grid',
            placeItems: 'center',
            color: '#ffffff',
            backgroundColor: 'rgba(125,211,252,0.14)',
            border: '1px solid rgba(125,211,252,0.22)'
          }}
        >
          <Icon size={22} strokeWidth={2.15} aria-hidden="true" />
        </Box>
        <Typography component="h3" sx={{ color: '#ffffff', fontSize: 20, fontWeight: 900, lineHeight: 1.14 }}>
          {title}
        </Typography>
      </Box>
      <Typography sx={{ mt: 1.35, color: 'rgba(235,245,255,0.83)', fontSize: 15, lineHeight: 1.52 }}>
        {description}
      </Typography>
      <Box component="ul" sx={{ mt: 1.7, mb: 0, pl: 2.35, display: 'grid', gap: 0.7, color: 'rgba(255,255,255,0.90)' }}>
        {items.map((item) => (
          <Typography key={item} component="li" sx={{ pl: 0.25, fontSize: 14.5, lineHeight: 1.42 }}>
            {item}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

function ProfileArea({ title, description, items }) {
  return (
    <Box sx={{ p: { xs: 2, md: 2.6 }, minWidth: 0 }}>
      <Typography component="h3" sx={{ color: '#ffffff', fontSize: { xs: 21, md: 24 }, fontWeight: 900, lineHeight: 1.15 }}>
        {title}
      </Typography>
      <Typography sx={{ mt: 0.9, color: 'rgba(235,245,255,0.82)', fontSize: 15.5, lineHeight: 1.52 }}>
        {description}
      </Typography>
      <Box component="ul" sx={{ mt: 1.7, mb: 0, pl: 2.3, color: 'rgba(255,255,255,0.90)', display: 'grid', gap: 0.72 }}>
        {items.map((item) => (
          <Typography key={item} component="li" sx={{ pl: 0.25, fontSize: 14.8, lineHeight: 1.42 }}>
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
          'radial-gradient(circle at 18% 8%, rgba(14,165,233,0.26) 0, rgba(14,165,233,0) 28%), radial-gradient(circle at 86% 18%, rgba(251,140,0,0.13) 0, rgba(251,140,0,0) 23%), linear-gradient(155deg, #071347 0%, #112b72 50%, #294da8 100%)',
        color: '#ffffff',
        overflowX: 'hidden'
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 1240, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, md: 3 } }}>
        <Box
          component="header"
          sx={{
            mb: { xs: 3, md: 4 },
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: 1.6,
            flexDirection: { xs: 'column', sm: 'row' }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Box
              component="img"
              src={servifoodLogo}
              alt="ServiFood Catering Logo"
              sx={{ width: { xs: 54, md: 62 }, height: { xs: 54, md: 62 }, objectFit: 'contain' }}
            />
            <Box>
              <Typography sx={{ color: '#ffffff', fontSize: 15.5, fontWeight: 900, lineHeight: 1.1 }}>
                ServiFood Catering
              </Typography>
              <Typography sx={{ mt: 0.3, color: 'rgba(235,245,255,0.72)', fontSize: 13.5, fontWeight: 650 }}>
                Plataforma interna
              </Typography>
            </Box>
          </Box>
          <Box sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <ButtonPair onLogin={onLogin} onRegister={onRegister} />
          </Box>
        </Box>

        <Box
          component="section"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1.02fr 0.98fr' },
            gap: { xs: 3.2, lg: 4.5 },
            alignItems: 'center',
            pb: { xs: 4, md: 5.2 }
          }}
        >
          <Box>
            <Typography sx={{ color: '#fb8c00', fontSize: 13, fontWeight: 900, letterSpacing: 1.4 }}>
              SERVIFOOD CATERING
            </Typography>
            <Typography
              component="h1"
              sx={{
                mt: 1.2,
                color: '#ffffff',
                fontSize: { xs: 36, sm: 48, md: 60 },
                fontWeight: 950,
                lineHeight: 1.02,
                maxWidth: 660
              }}
            >
              Gestión, cumplimiento y calidad en un solo lugar
            </Typography>
            <Typography
              sx={{
                mt: 2,
                color: 'rgba(236,244,255,0.88)',
                fontSize: { xs: 16.5, md: 19 },
                lineHeight: 1.58,
                maxWidth: 630
              }}
            >
              Una plataforma centralizada para organizar documentación, monitorear indicadores y acompañar la operación diaria de ServiFood.
            </Typography>
            <Box sx={{ mt: 3 }}>
              <ButtonPair onLogin={onLogin} onRegister={onRegister} primaryLabel="Ingresar a la plataforma" />
            </Box>
            <Typography sx={{ mt: 1.4, color: 'rgba(235,245,255,0.74)', fontSize: 15, lineHeight: 1.5 }}>
              Cada cuenta visualiza únicamente las herramientas habilitadas para su perfil.
            </Typography>
          </Box>

          <EcosystemVisual />
        </Box>

        <Box component="section" sx={{ py: { xs: 3.4, md: 4.4 } }}>
          <Box sx={{ maxWidth: 760 }}>
            <Typography component="h2" sx={{ color: '#ffffff', fontSize: { xs: 28, md: 38 }, fontWeight: 950, lineHeight: 1.1 }}>
              Un ecosistema conectado para la operación diaria
            </Typography>
            <Typography sx={{ mt: 1.25, color: 'rgba(235,245,255,0.82)', fontSize: { xs: 16, md: 17.5 }, lineHeight: 1.55 }}>
              Las herramientas se organizan en tres pilares que acompañan el trabajo operativo y administrativo.
            </Typography>
          </Box>
          <Box
            sx={{
              mt: 2.6,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
              gap: 1.8
            }}
          >
            {pillars.map((pillar) => (
              <PillarCard key={pillar.title} {...pillar} />
            ))}
          </Box>
        </Box>

        <Box component="section" sx={{ py: { xs: 3.3, md: 4.4 } }}>
          <Box
            sx={{
              borderRadius: 2.5,
              border: '1px solid rgba(255,255,255,0.16)',
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.11), rgba(255,255,255,0.07)), linear-gradient(90deg, rgba(251,140,0,0.12), rgba(125,211,252,0.08))',
              boxShadow: '0 18px 40px rgba(3,11,38,0.20)',
              overflow: 'hidden'
            }}
          >
            <Box sx={{ p: { xs: 2.2, md: 3 }, borderBottom: '1px solid rgba(255,255,255,0.13)' }}>
              <Typography component="h2" sx={{ color: '#ffffff', fontSize: { xs: 27, md: 36 }, fontWeight: 950, lineHeight: 1.12 }}>
                Una experiencia adaptada a cada cuenta
              </Typography>
              <Typography sx={{ mt: 1.1, color: 'rgba(235,245,255,0.82)', fontSize: { xs: 15.8, md: 17 }, lineHeight: 1.55, maxWidth: 850 }}>
                El acceso es único. Después de iniciar sesión, la plataforma muestra automáticamente las herramientas habilitadas para cada perfil.
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                '& > *:first-of-type': {
                  borderRight: { xs: 'none', md: '1px solid rgba(255,255,255,0.13)' },
                  borderBottom: { xs: '1px solid rgba(255,255,255,0.13)', md: 'none' }
                }
              }}
            >
              {profileAreas.map((area) => (
                <ProfileArea key={area.title} {...area} />
              ))}
            </Box>
          </Box>
        </Box>

        <Box
          component="section"
          sx={{
            mt: { xs: 3.4, md: 4.4 },
            mb: { xs: 2.4, md: 3 },
            p: { xs: 2.5, md: 3.3 },
            borderRadius: 2.5,
            border: '1px solid rgba(251,140,0,0.26)',
            background: 'linear-gradient(145deg, rgba(251,140,0,0.15), rgba(255,255,255,0.08))',
            boxShadow: '0 20px 42px rgba(3,11,38,0.22)',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr auto' },
            gap: 2,
            alignItems: 'center'
          }}
        >
          <Box>
            <Typography component="h2" sx={{ color: '#ffffff', fontSize: { xs: 27, md: 38 }, fontWeight: 950, lineHeight: 1.1 }}>
              Todo el ecosistema ServiFood, centralizado
            </Typography>
            <Typography sx={{ mt: 1.1, color: 'rgba(235,245,255,0.84)', fontSize: { xs: 15.8, md: 17 }, lineHeight: 1.55, maxWidth: 760 }}>
              Ingresá con tu cuenta y accedé automáticamente a las herramientas habilitadas para tu perfil.
            </Typography>
          </Box>
          <Box sx={{ justifySelf: { xs: 'stretch', md: 'end' } }}>
            <ButtonPair onLogin={onLogin} onRegister={onRegister} />
          </Box>
        </Box>

        <Box component="footer" sx={{ py: { xs: 2.4, md: 3 }, textAlign: 'center', color: 'rgba(235,245,255,0.68)' }}>
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

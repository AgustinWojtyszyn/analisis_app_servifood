import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import {
  Award,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  FileUp,
  FolderCheck,
  HeartPulse,
  History,
  Settings2,
  ShieldCheck,
  UserCircle,
  Users
} from 'lucide-react';
import servifoodLogo from '../assets/servifood_logo_white_text_HQ.png';

const collaboratorCards = [
  {
    icon: HeartPulse,
    title: 'Declaración de Salud',
    description: 'Completá y revisá tu declaración personal de salud de manera rápida y segura.'
  },
  {
    icon: ClipboardCheck,
    title: 'Políticas',
    description: 'Consultá las políticas internas vigentes y confirmá su lectura.'
  }
];

const managementCards = [
  {
    icon: FileUp,
    title: 'Cargar archivos',
    description: 'Subí planillas para clasificar desvíos y generar resultados operativos trazables.'
  },
  {
    icon: History,
    title: 'Historial',
    description: 'Consultá análisis anteriores, estados y resultados exportables.'
  },
  {
    icon: BarChart3,
    title: 'Gráficos e indicadores',
    description: 'Visualizá patrones por categoría, área, estado e impacto operativo.'
  },
  {
    icon: Settings2,
    title: 'Configurar reglas',
    description: 'Administrá criterios de clasificación y acciones sugeridas.'
  },
  {
    icon: Users,
    title: 'Gestión de usuarios',
    description: 'Controlá roles, perfiles y estados de acceso.'
  },
  {
    icon: ClipboardCheck,
    title: 'Gestor de Declaraciones',
    description: 'Consultá el estado diario del equipo y administrá registros de salud.'
  },
  {
    icon: FolderCheck,
    title: 'Documentos SGC',
    description: 'Consultá procedimientos, registros, estrategias y archivos asociados.'
  },
  {
    icon: Award,
    title: 'Certificaciones',
    description: 'Gestioná vencimientos, responsables y alertas preventivas.'
  },
  {
    icon: UserCircle,
    title: 'Perfil',
    description: 'Consultá y actualizá la información de tu cuenta.'
  },
  {
    icon: BookOpen,
    title: 'Tutorial',
    description: 'Accedé a una guía de uso de la plataforma.'
  }
];

const sectionLabelSx = {
  color: '#7dd3fc',
  fontSize: 13,
  fontWeight: 850,
  letterSpacing: 1.1,
  textTransform: 'uppercase'
};

const sectionTitleSx = {
  mt: 0.8,
  color: '#ffffff',
  fontSize: { xs: 28, sm: 34, md: 40 },
  fontWeight: 900,
  lineHeight: 1.12
};

const sectionDescriptionSx = {
  mt: 1.4,
  color: 'rgba(235,245,255,0.78)',
  fontSize: { xs: 15.5, md: 17 },
  lineHeight: 1.6
};

function FeatureCard({ icon: Icon, title, description, variant = 'solid' }) {
  const isLight = variant === 'light';

  return (
    <Box
      sx={{
        minHeight: isLight ? 180 : 214,
        p: { xs: 2.2, md: isLight ? 2.6 : 2.8 },
        borderRadius: 2,
        border: isLight ? '1px solid rgba(125,211,252,0.24)' : '1px solid rgba(255,255,255,0.16)',
        background: isLight
          ? 'linear-gradient(145deg, rgba(255,255,255,0.14), rgba(255,255,255,0.07))'
          : 'linear-gradient(145deg, rgba(255,255,255,0.16), rgba(255,255,255,0.08))',
        boxShadow: isLight ? '0 12px 28px rgba(5,18,56,0.14)' : '0 18px 34px rgba(4,13,42,0.23)',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        transition: 'transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          borderColor: isLight ? 'rgba(125,211,252,0.42)' : 'rgba(167,139,250,0.48)',
          boxShadow: isLight ? '0 16px 34px rgba(5,18,56,0.18)' : '0 22px 40px rgba(4,13,42,0.27)'
        }
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 1.5,
          display: 'grid',
          placeItems: 'center',
          color: '#ffffff',
          background: isLight
            ? 'linear-gradient(135deg, rgba(14,165,233,0.95), rgba(34,197,94,0.85))'
            : 'linear-gradient(135deg, rgba(251,140,0,0.96), rgba(124,58,237,0.82))',
          boxShadow: isLight ? '0 10px 18px rgba(14,165,233,0.22)' : '0 10px 18px rgba(251,140,0,0.18)'
        }}
      >
        <Icon size={23} strokeWidth={2.2} aria-hidden="true" />
      </Box>
      <Box>
        <Typography component="h3" sx={{ color: '#ffffff', fontWeight: 850, fontSize: 19, lineHeight: 1.2 }}>
          {title}
        </Typography>
        <Typography sx={{ mt: 1, color: 'rgba(235,245,255,0.76)', fontSize: 14.5, lineHeight: 1.55 }}>
          {description}
        </Typography>
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
          'radial-gradient(circle at 14% 8%, rgba(14,165,233,0.34) 0, rgba(14,165,233,0) 28%), radial-gradient(circle at 88% 26%, rgba(124,58,237,0.28) 0, rgba(124,58,237,0) 24%), linear-gradient(155deg, #08164f 0%, #15317c 48%, #2d52af 100%)',
        color: '#ffffff',
        overflowX: 'hidden'
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 1180, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, py: { xs: 3.5, md: 5 } }}>
        <Box component="section" sx={{ textAlign: 'center', maxWidth: 940, mx: 'auto', pt: { xs: 1, md: 2 }, pb: { xs: 5, md: 7 } }}>
          <Box
            component="img"
            src={servifoodLogo}
            alt="ServiFood Catering Logo"
            sx={{
              width: { xs: 132, sm: 156, md: 176 },
              height: { xs: 132, sm: 156, md: 176 },
              objectFit: 'contain',
              display: 'block',
              mx: 'auto'
            }}
          />
          <Typography
            component="h1"
            sx={{
              mt: { xs: 1.5, md: 2 },
              color: '#ffffff',
              fontSize: { xs: 33, sm: 45, md: 58 },
              fontWeight: 950,
              lineHeight: 1.04
            }}
          >
            ServiFood — Plataforma de gestión y cumplimiento
          </Typography>
          <Typography
            sx={{
              mt: 2,
              color: 'rgba(236,244,255,0.84)',
              fontSize: { xs: 16, md: 19 },
              maxWidth: 780,
              mx: 'auto',
              lineHeight: 1.6
            }}
          >
            Centralizamos herramientas operativas, documentación, declaraciones de salud e indicadores de calidad en un único entorno seguro.
          </Typography>

          <Box sx={{ mt: { xs: 3, md: 3.8 }, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'center', alignItems: 'center', gap: 1.5 }}>
            <Button
              variant="contained"
              onClick={onLogin}
              sx={{
                width: { xs: '100%', sm: 'auto' },
                minWidth: 168,
                px: 4.2,
                py: 1.35,
                fontWeight: 850,
                borderRadius: 1.5,
                backgroundColor: '#fb8c00',
                boxShadow: '0 14px 26px rgba(251,140,0,0.30)',
                '&:hover': {
                  backgroundColor: '#f57c00',
                  boxShadow: '0 16px 30px rgba(251,140,0,0.36)',
                  transform: 'translateY(-1px)'
                },
                transition: 'transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease'
              }}
            >
              Ingresar
            </Button>
            {onRegister && (
              <Button
                variant="outlined"
                onClick={onRegister}
                sx={{
                  width: { xs: '100%', sm: 'auto' },
                  px: 2.8,
                  py: 1.05,
                  fontWeight: 760,
                  borderRadius: 1.5,
                  color: '#f1f6ff',
                  borderColor: 'rgba(241,246,255,0.54)',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  '&:hover': {
                    borderColor: '#ffffff',
                    backgroundColor: 'rgba(255,255,255,0.09)'
                  }
                }}
              >
                Solicitar registro
              </Button>
            )}
          </Box>
          <Typography sx={{ mt: 1.8, color: 'rgba(235,245,255,0.70)', fontSize: 14.5 }}>
            Acceso habilitado según el perfil autorizado de cada persona.
          </Typography>
        </Box>

        <Box component="section" sx={{ py: { xs: 4.5, md: 6 } }}>
          <Box sx={{ maxWidth: 720 }}>
            <Typography sx={sectionLabelSx}>Herramientas para colaboradores</Typography>
            <Typography component="h2" sx={sectionTitleSx}>
              Portal del colaborador
            </Typography>
            <Typography sx={sectionDescriptionSx}>
              Accesos simples para completar obligaciones operativas y consultar información vigente.
            </Typography>
          </Box>
          <Box sx={{ mt: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2.2 }}>
            {collaboratorCards.map((card) => (
              <FeatureCard key={card.title} {...card} variant="light" />
            ))}
          </Box>
        </Box>

        <Box component="section" sx={{ py: { xs: 4.5, md: 6.5 } }}>
          <Box sx={{ maxWidth: 780 }}>
            <Typography sx={{ ...sectionLabelSx, color: '#a78bfa' }}>Herramientas autorizadas</Typography>
            <Typography component="h2" sx={sectionTitleSx}>
              Gestión interna
            </Typography>
            <Typography sx={sectionDescriptionSx}>
              Herramientas habilitadas para administración, seguimiento y cumplimiento según el rol asignado.
            </Typography>
          </Box>
          <Box
            sx={{
              mt: 3.2,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
              gap: 2.2
            }}
          >
            {managementCards.map((card) => (
              <FeatureCard key={card.title} {...card} />
            ))}
          </Box>
        </Box>

        <Box
          component="section"
          sx={{
            my: { xs: 4, md: 5.5 },
            p: { xs: 2.4, sm: 3, md: 3.4 },
            borderRadius: 2,
            border: '1px solid rgba(34,197,94,0.28)',
            background: 'linear-gradient(135deg, rgba(34,197,94,0.16), rgba(14,165,233,0.10) 48%, rgba(255,255,255,0.08))',
            boxShadow: '0 18px 38px rgba(2,11,38,0.22)',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '72px 1fr' },
            gap: { xs: 2, md: 2.6 },
            alignItems: 'center'
          }}
        >
          <Box
            sx={{
              width: 60,
              height: 60,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              color: '#ffffff',
              background: 'linear-gradient(135deg, rgba(34,197,94,0.95), rgba(14,165,233,0.85))',
              boxShadow: '0 12px 24px rgba(34,197,94,0.22)'
            }}
          >
            <ShieldCheck size={32} strokeWidth={2.15} aria-hidden="true" />
          </Box>
          <Box>
            <Typography component="h2" sx={{ color: '#ffffff', fontSize: { xs: 23, md: 28 }, fontWeight: 900, lineHeight: 1.16 }}>
              Accesos protegidos según perfil
            </Typography>
            <Typography sx={{ mt: 1, color: 'rgba(235,245,255,0.78)', fontSize: { xs: 15, md: 16.5 }, lineHeight: 1.6 }}>
              Cada cuenta visualiza únicamente las herramientas habilitadas para su rol. Los colaboradores acceden a sus funciones operativas, mientras que nutricionistas y administradores disponen de módulos internos autorizados.
            </Typography>
          </Box>
        </Box>

        <Box
          component="section"
          sx={{
            my: { xs: 5, md: 7 },
            p: { xs: 2.6, sm: 3.4, md: 4.2 },
            borderRadius: 2,
            textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.18)',
            background: 'linear-gradient(145deg, rgba(255,255,255,0.14), rgba(255,255,255,0.07))',
            boxShadow: '0 20px 42px rgba(3,11,38,0.24)'
          }}
        >
          <Typography component="h2" sx={{ color: '#ffffff', fontSize: { xs: 27, sm: 34, md: 42 }, fontWeight: 950, lineHeight: 1.12 }}>
            Todo el ecosistema operativo en un solo lugar
          </Typography>
          <Typography sx={{ mt: 1.6, color: 'rgba(235,245,255,0.78)', fontSize: { xs: 15.5, md: 17.5 }, lineHeight: 1.6 }}>
            Ingresá con tu cuenta para acceder a las herramientas habilitadas para tu perfil.
          </Typography>
          <Box sx={{ mt: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'center', gap: 1.5 }}>
            <Button
              variant="contained"
              onClick={onLogin}
              sx={{
                width: { xs: '100%', sm: 'auto' },
                px: 4,
                py: 1.35,
                fontWeight: 850,
                borderRadius: 1.5,
                backgroundColor: '#fb8c00',
                boxShadow: '0 14px 26px rgba(251,140,0,0.30)',
                '&:hover': {
                  backgroundColor: '#f57c00',
                  boxShadow: '0 16px 30px rgba(251,140,0,0.36)',
                  transform: 'translateY(-1px)'
                },
                transition: 'transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease'
              }}
            >
              Ingresar a la plataforma
            </Button>
            {onRegister && (
              <Button
                variant="outlined"
                onClick={onRegister}
                sx={{
                  width: { xs: '100%', sm: 'auto' },
                  px: 2.8,
                  py: 1.05,
                  fontWeight: 760,
                  borderRadius: 1.5,
                  color: '#f1f6ff',
                  borderColor: 'rgba(241,246,255,0.54)',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  '&:hover': {
                    borderColor: '#ffffff',
                    backgroundColor: 'rgba(255,255,255,0.09)'
                  }
                }}
              >
                Solicitar registro
              </Button>
            )}
          </Box>
        </Box>

        <Box component="footer" sx={{ pt: { xs: 1, md: 2 }, pb: { xs: 3, md: 4 }, textAlign: 'center', color: 'rgba(235,245,255,0.62)' }}>
          <Typography sx={{ fontWeight: 850, color: 'rgba(255,255,255,0.86)', fontSize: 15.5 }}>
            ServiFood Catering
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: 13.5 }}>
            Plataforma interna de gestión y cumplimiento
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

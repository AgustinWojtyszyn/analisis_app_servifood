import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import {
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  FolderCheck,
  HeartPulse,
  LockKeyhole,
  ShieldCheck,
  UsersRound
} from 'lucide-react';
import servifoodLogo from '../assets/servifood_logo_white_text_HQ.png';

const BLUE = '#123b7a';
const BLUE_DARK = '#08224f';
const BLUE_DEEP = '#071347';
const BLUE_MID = '#1a3b8f';
const BLUE_SOFT = '#eaf1ff';
const ORANGE = '#fb8c00';
const ORANGE_DARK = '#ef7f00';
const TEXT = '#12213f';
const MUTED = '#5d6980';
const SURFACE = '#ffffff';
const PAGE = '#edf3fb';

const primaryButtonSx = {
  minHeight: { xs: 38, sm: 42 },
  px: { xs: 1.8, sm: 2.8 },
  borderRadius: 1.25,
  backgroundColor: ORANGE,
  boxShadow: '0 10px 18px rgba(251,140,0,0.18)',
  color: '#ffffff',
  fontSize: { xs: 13.5, sm: 14.5 },
  fontWeight: 850,
  textTransform: 'none',
  whiteSpace: 'nowrap',
  '&:hover': {
    backgroundColor: ORANGE_DARK,
    boxShadow: '0 12px 22px rgba(251,140,0,0.22)'
  },
  '&:focus-visible': {
    outline: `3px solid rgba(251,140,0,0.35)`,
    outlineOffset: 2
  }
};

const secondaryButtonSx = {
  minHeight: { xs: 38, sm: 42 },
  px: { xs: 1.7, sm: 2.4 },
  borderRadius: 1.25,
  color: '#ffffff',
  borderColor: 'rgba(255,255,255,0.36)',
  backgroundColor: 'rgba(255,255,255,0.08)',
  fontSize: { xs: 13.5, sm: 14.5 },
  fontWeight: 800,
  textTransform: 'none',
  whiteSpace: 'nowrap',
  '&:hover': {
    borderColor: 'rgba(255,255,255,0.62)',
    backgroundColor: 'rgba(255,255,255,0.14)'
  },
  '&:focus-visible': {
    outline: `3px solid rgba(255,255,255,0.28)`,
    outlineOffset: 2
  }
};

const benefits = [
  {
    icon: FolderCheck,
    title: 'Información centralizada',
    description: 'Documentación e indicadores disponibles en un solo lugar.'
  },
  {
    icon: LockKeyhole,
    title: 'Accesos según perfil',
    description: 'Cada cuenta visualiza únicamente las herramientas habilitadas.'
  },
  {
    icon: ClipboardCheck,
    title: 'Seguimiento operativo',
    description: 'Datos organizados para facilitar el trabajo diario.'
  }
];

const functionalBlocks = [
  {
    title: 'Indicadores claros para tomar mejores decisiones',
    description: 'Centralizá la información operativa, consultá historiales y visualizá indicadores de calidad de forma ordenada.',
    visual: 'quality'
  },
  {
    title: 'Documentación SGC organizada y accesible',
    description: 'Consultá documentos, certificaciones y políticas internas con una estructura clara y trazable.',
    visual: 'documents',
    reverse: true
  },
  {
    title: 'Herramientas adecuadas para cada perfil',
    description: 'Gestioná declaraciones de salud, usuarios y permisos con accesos adaptados a las necesidades de cada cuenta.',
    visual: 'access'
  }
];

function HeaderActions({ onLogin, onRegister }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: { xs: 'stretch', sm: 'flex-end' },
        gap: { xs: 0.75, sm: 1 },
        flexWrap: 'nowrap',
        width: { xs: '100%', sm: 'auto' }
      }}
    >
      {onRegister && (
        <Button variant="outlined" onClick={onRegister} sx={{ ...secondaryButtonSx, flex: { xs: '1 1 0', sm: '0 0 auto' } }}>
          Solicitar registro
        </Button>
      )}
      <Button variant="contained" onClick={onLogin} sx={{ ...primaryButtonSx, flex: { xs: '1 1 0', sm: '0 0 auto' } }}>
        Ingresar
      </Button>
    </Box>
  );
}

function Header({ onLogin, onRegister }) {
  return (
    <Box
      component="header"
      sx={{
        background: `linear-gradient(135deg, ${BLUE_DEEP} 0%, ${BLUE} 100%)`,
        borderBottom: '1px solid rgba(255,255,255,0.12)'
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 1180,
          mx: 'auto',
          px: { xs: 1.75, sm: 3, md: 4 },
          py: { xs: 1.15, sm: 1.55 },
          display: 'flex',
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 1, sm: 2.5 }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.05, sm: 1.3 }, minWidth: 0 }}>
          <Box
            component="img"
            src={servifoodLogo}
            alt="ServiFood Catering Logo"
            sx={{ width: { xs: 58, sm: 68, md: 76 }, height: { xs: 58, sm: 68, md: 76 }, objectFit: 'contain', flex: '0 0 auto' }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ color: '#ffffff', fontSize: { xs: 18, sm: 20.5, md: 23 }, fontWeight: 950, lineHeight: 1.08 }}>
              ServiFood Catering
            </Typography>
            <Typography sx={{ mt: 0.3, color: 'rgba(235,245,255,0.72)', fontSize: { xs: 12.8, sm: 13.8 }, fontWeight: 760 }}>
              Plataforma interna
            </Typography>
          </Box>
        </Box>
        <HeaderActions onLogin={onLogin} onRegister={onRegister} />
      </Box>
    </Box>
  );
}

function BrowserFrame({ children, title = 'Panel interno' }) {
  return (
    <Box
      sx={{
        backgroundColor: '#102d69',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: { xs: 2, md: 2.5 },
        boxShadow: '0 24px 56px rgba(2,12,35,0.24)',
        overflow: 'hidden'
      }}
    >
      <Box sx={{ px: 1.4, py: 1, borderBottom: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', gap: 0.7, backgroundColor: 'rgba(6,19,71,0.42)' }}>
        {[0, 1, 2].map((dot) => (
          <Box key={dot} sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: dot === 0 ? ORANGE : 'rgba(255,255,255,0.34)' }} />
        ))}
        <Typography sx={{ ml: 0.6, color: 'rgba(235,245,255,0.78)', fontSize: 12.5, fontWeight: 750 }}>{title}</Typography>
      </Box>
      {children}
    </Box>
  );
}

function MiniBadge({ children, tone = 'blue' }) {
  return (
    <Box
      sx={{
        px: 0.85,
        py: 0.35,
        borderRadius: 99,
        backgroundColor: tone === 'orange' ? 'rgba(251,140,0,0.16)' : 'rgba(147,197,253,0.16)',
        color: tone === 'orange' ? '#ffd6a4' : 'rgba(235,245,255,0.88)',
        fontSize: 11.5,
        fontWeight: 850,
        width: 'fit-content'
      }}
    >
      {children}
    </Box>
  );
}

function HeroMockup() {
  return (
    <Box sx={{ position: 'relative', maxWidth: 520, mx: { xs: 'auto', md: 0 } }}>
      <BrowserFrame title="Vista operativa">
        <Box sx={{ p: { xs: 1.35, sm: 1.8, md: 2.2 }, display: 'grid', gap: { xs: 1.15, sm: 1.4 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
            <Box>
              <Typography sx={{ color: '#ffffff', fontSize: { xs: 15.5, sm: 17 }, fontWeight: 950, lineHeight: 1.16 }}>Indicadores</Typography>
              <Typography sx={{ mt: 0.25, color: 'rgba(235,245,255,0.66)', fontSize: { xs: 12.2, sm: 13 }, lineHeight: 1.35 }}>Seguimiento general</Typography>
            </Box>
            <MiniBadge tone="orange">Actualizado</MiniBadge>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.1fr 0.9fr' }, gap: 1.2 }}>
            <Box sx={{ p: 1.25, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <Box sx={{ height: { xs: 104, sm: 126 }, display: 'flex', alignItems: 'end', gap: 0.7 }}>
                {[42, 70, 54, 88, 64, 78].map((height, index) => (
                  <Box
                    key={height + index}
                    sx={{
                      flex: 1,
                      height: `${height}%`,
                      borderRadius: '7px 7px 2px 2px',
                      backgroundColor: index === 3 ? ORANGE : 'rgba(147,197,253,0.60)'
                    }}
                  />
                ))}
              </Box>
            </Box>
            <Box sx={{ display: 'grid', gap: 1 }}>
              {[
                ['Documentos SGC', FileText],
                ['Seguimiento', ClipboardCheck],
                ['Declaraciones de salud', HeartPulse]
              ].map(([label, Icon]) => (
                <Box key={label} sx={{ p: 1, borderRadius: 1.4, backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', gap: 0.9 }}>
                  <Box sx={{ width: 30, height: 30, borderRadius: 1, display: 'grid', placeItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', color: '#dbeafe' }}>
                    <Icon size={16} strokeWidth={2.1} aria-hidden="true" />
                  </Box>
                  <Typography sx={{ color: 'rgba(255,255,255,0.90)', fontSize: 12.8, fontWeight: 850, lineHeight: 1.2 }}>{label}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </BrowserFrame>
    </Box>
  );
}

function QualityVisual() {
  return (
    <BrowserFrame title="Calidad y análisis">
      <Box sx={{ p: { xs: 1.35, md: 1.8 }, display: 'grid', gap: 1.1 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.85 }}>
          {['Historial', 'Estado', 'Calidad'].map((label, index) => (
            <Box key={label} sx={{ p: 1, borderRadius: 1.4, backgroundColor: index === 1 ? 'rgba(251,140,0,0.12)' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <Typography sx={{ color: 'rgba(235,245,255,0.72)', fontSize: 11.5, fontWeight: 750 }}>{label}</Typography>
              <Box sx={{ mt: 0.8, height: 6, borderRadius: 99, backgroundColor: index === 1 ? ORANGE : 'rgba(147,197,253,0.72)' }} />
            </Box>
          ))}
        </Box>
        <Box sx={{ p: 1.2, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <Box sx={{ height: { xs: 112, md: 136 }, display: 'flex', alignItems: 'end', gap: 0.8 }}>
            {[38, 52, 78, 60, 86].map((height, index) => (
              <Box key={height} sx={{ flex: 1, height: `${height}%`, borderRadius: '8px 8px 2px 2px', backgroundColor: index === 4 ? ORANGE : 'rgba(147,197,253,0.66)' }} />
            ))}
          </Box>
        </Box>
      </Box>
    </BrowserFrame>
  );
}

function DocumentsVisual() {
  return (
    <BrowserFrame title="Documentos SGC">
      <Box sx={{ p: { xs: 1.35, md: 1.8 }, display: 'grid', gap: 1 }}>
        {['Manual SGC', 'Certificaciones', 'Políticas internas'].map((label, index) => (
          <Box key={label} sx={{ p: 1.15, borderRadius: 1.5, backgroundColor: index === 0 ? 'rgba(147,197,253,0.16)' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 34, height: 34, borderRadius: 1, display: 'grid', placeItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', color: index === 0 ? '#dbeafe' : 'rgba(235,245,255,0.72)' }}>
              <FileText size={17} strokeWidth={2.1} aria-hidden="true" />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ color: '#ffffff', fontSize: 13.5, fontWeight: 900 }}>{label}</Typography>
              <Box sx={{ mt: 0.55, width: index === 2 ? '52%' : '72%', height: 5, borderRadius: 99, backgroundColor: 'rgba(147,197,253,0.36)' }} />
            </Box>
            <MiniBadge>{index === 0 ? 'SGC' : 'Vigente'}</MiniBadge>
          </Box>
        ))}
      </Box>
    </BrowserFrame>
  );
}

function AccessVisual() {
  return (
    <BrowserFrame title="Perfiles y accesos">
      <Box sx={{ p: { xs: 1.35, md: 1.8 }, display: 'grid', gap: 1 }}>
        {[
          ['Administración', 'Acceso completo', ShieldCheck],
          ['Nutrición', 'Documentos y salud', UsersRound],
          ['Colaborador', 'Herramientas habilitadas', CheckCircle2]
        ].map(([role, detail, Icon], index) => (
          <Box key={role} sx={{ display: 'grid', gridTemplateColumns: '34px 1fr auto', alignItems: 'center', gap: 1, p: 1.05, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <Box sx={{ width: 34, height: 34, borderRadius: 1, display: 'grid', placeItems: 'center', backgroundColor: index === 0 ? 'rgba(251,140,0,0.12)' : 'rgba(147,197,253,0.15)', color: index === 0 ? ORANGE : '#dbeafe' }}>
              <Icon size={17} strokeWidth={2.1} aria-hidden="true" />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ color: '#ffffff', fontSize: 13.5, fontWeight: 900 }}>{role}</Typography>
              <Typography sx={{ mt: 0.1, color: 'rgba(235,245,255,0.66)', fontSize: 12.3 }}>{detail}</Typography>
            </Box>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: index === 2 ? '#16a34a' : ORANGE }} />
          </Box>
        ))}
      </Box>
    </BrowserFrame>
  );
}

function FunctionalVisual({ type }) {
  if (type === 'documents') return <DocumentsVisual />;
  if (type === 'access') return <AccessVisual />;
  return <QualityVisual />;
}

function BenefitItem({ icon: Icon, title, description }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '34px 1fr', sm: '38px 1fr' }, gap: 1.1, alignItems: 'start' }}>
      <Box sx={{ width: { xs: 34, sm: 38 }, height: { xs: 34, sm: 38 }, borderRadius: 1.2, display: 'grid', placeItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', color: '#dbeafe' }}>
        <Icon size={18} strokeWidth={2.1} aria-hidden="true" />
      </Box>
      <Box>
        <Typography component="h3" sx={{ color: '#ffffff', fontSize: { xs: 16, md: 17 }, fontWeight: 900, lineHeight: 1.22 }}>
          {title}
        </Typography>
        <Typography sx={{ mt: 0.45, color: 'rgba(235,245,255,0.70)', fontSize: { xs: 13.5, md: 14.4 }, lineHeight: 1.45 }}>
          {description}
        </Typography>
      </Box>
    </Box>
  );
}

function FunctionalBlock({ title, description, visual, reverse = false, index = 0 }) {
  const isDark = index === 1;
  return (
    <Box
      component="section"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 0.92fr) minmax(300px, 1.08fr)' },
        gap: { xs: 2.4, md: 5.2 },
        alignItems: 'center',
        py: { xs: 4.2, sm: 5.4, md: 7 },
        px: { xs: 1.45, sm: 2.2, md: 3 },
        my: { xs: 2, md: 3 },
        borderRadius: { xs: 2, md: 3 },
        background: isDark
          ? `linear-gradient(135deg, ${BLUE_DARK} 0%, ${BLUE} 100%)`
          : 'linear-gradient(135deg, rgba(255,255,255,0.82) 0%, #eaf1ff 100%)',
        border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(18,59,122,0.08)'
      }}
    >
      <Box sx={{ order: { xs: 1, md: reverse ? 2 : 1 }, maxWidth: 520 }}>
        <Typography component="h2" sx={{ color: isDark ? '#ffffff' : BLUE_DARK, fontSize: { xs: 25, sm: 31, md: 38 }, fontWeight: 950, lineHeight: 1.12 }}>
          {title}
        </Typography>
        <Typography sx={{ mt: 1.25, color: isDark ? 'rgba(235,245,255,0.72)' : MUTED, fontSize: { xs: 15, sm: 16, md: 17 }, lineHeight: 1.62 }}>
          {description}
        </Typography>
      </Box>
      <Box sx={{ order: { xs: 2, md: reverse ? 1 : 2 } }}>
        <FunctionalVisual type={visual} />
      </Box>
    </Box>
  );
}

export default function PublicLanding({ onLogin, onRegister }) {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: PAGE, overflowX: 'hidden' }}>
      <Header onLogin={onLogin} onRegister={onRegister} />

      <Box component="main">
        <Box
          component="section"
          sx={{
            background:
              `radial-gradient(circle at 78% 18%, rgba(59,130,246,0.20), transparent 30%), linear-gradient(145deg, ${BLUE_DEEP} 0%, ${BLUE} 58%, ${BLUE_MID} 100%)`,
            borderBottom: '1px solid rgba(255,255,255,0.12)'
          }}
        >
          <Box
            sx={{
              width: '100%',
              maxWidth: 1180,
              mx: 'auto',
              px: { xs: 1.75, sm: 3, md: 4 },
              py: { xs: 4.1, sm: 6.1, md: 8.2 },
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 0.95fr) minmax(340px, 1.05fr)' },
              gap: { xs: 3.3, md: 6.2 },
              alignItems: 'center'
            }}
          >
            <Box sx={{ maxWidth: 610 }}>
              <Typography sx={{ color: ORANGE, fontSize: { xs: 12, sm: 12.5 }, fontWeight: 950, lineHeight: 1.2 }}>
                SERVIFOOD CATERING
              </Typography>
              <Typography component="h1" sx={{ mt: 1.1, color: '#ffffff', fontSize: { xs: 32, sm: 44, md: 54 }, fontWeight: 950, lineHeight: { xs: 1.09, md: 1.05 } }}>
                La operación de ServiFood, organizada en un solo lugar.
              </Typography>
              <Typography sx={{ mt: { xs: 1.45, md: 1.8 }, color: 'rgba(235,245,255,0.82)', fontSize: { xs: 16, sm: 17.5, md: 18.5 }, lineHeight: 1.58, maxWidth: 560 }}>
                Accedé a documentación, indicadores y herramientas internas según tu perfil.
              </Typography>
              <Box sx={{ mt: { xs: 2.2, md: 3 }, width: { xs: '100%', sm: 'auto' } }}>
                <Button
                  variant="contained"
                  onClick={onLogin}
                  sx={{ ...primaryButtonSx, minHeight: { xs: 42, sm: 48 }, px: { xs: 2.4, sm: 3.4 }, width: { xs: '100%', sm: 'auto' } }}
                >
                  Ingresar a la plataforma
                </Button>
              </Box>
              <Typography sx={{ mt: 1.15, color: 'rgba(235,245,255,0.58)', fontSize: { xs: 13, sm: 14 }, lineHeight: 1.45, maxWidth: 520 }}>
                Cada cuenta visualiza únicamente las herramientas habilitadas para su rol.
              </Typography>
            </Box>
            <HeroMockup />
          </Box>
        </Box>

        <Box component="section" sx={{ background: `linear-gradient(135deg, ${BLUE} 0%, #1d4b9d 100%)` }}>
          <Box
            sx={{
              width: '100%',
              maxWidth: 1180,
              mx: 'auto',
              px: { xs: 1.75, sm: 3, md: 4 },
              py: { xs: 3.4, sm: 4.2, md: 5.3 },
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
              gap: { xs: 2.1, md: 3.6 }
            }}
          >
            {benefits.map((benefit) => (
              <BenefitItem key={benefit.title} {...benefit} />
            ))}
          </Box>
        </Box>

        <Box sx={{ width: '100%', maxWidth: 1180, mx: 'auto', px: { xs: 1.75, sm: 3, md: 4 } }}>
          {functionalBlocks.map((block, index) => (
            <FunctionalBlock key={block.title} {...block} index={index} />
          ))}
        </Box>

        <Box component="section" sx={{ backgroundColor: BLUE, color: '#ffffff' }}>
          <Box
            sx={{
              width: '100%',
              maxWidth: 1180,
              mx: 'auto',
              px: { xs: 1.75, sm: 3, md: 4 },
              py: { xs: 4, sm: 5.2, md: 6.2 },
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr auto' },
              gap: { xs: 2, md: 3 },
              alignItems: 'center'
            }}
          >
            <Box sx={{ maxWidth: 720 }}>
              <Typography component="h2" sx={{ color: '#ffffff', fontSize: { xs: 26, sm: 34, md: 40 }, fontWeight: 950, lineHeight: 1.12 }}>
                Todo lo necesario para acompañar la operación diaria.
              </Typography>
              <Typography sx={{ mt: 1.1, color: 'rgba(255,255,255,0.78)', fontSize: { xs: 15, sm: 16.5 }, lineHeight: 1.55 }}>
                Ingresá con tu cuenta y accedé a las herramientas habilitadas para tu perfil.
              </Typography>
            </Box>
            <Button variant="contained" onClick={onLogin} sx={{ ...primaryButtonSx, justifySelf: { xs: 'stretch', sm: 'start', md: 'end' } }}>
              Ingresar
            </Button>
          </Box>
        </Box>
      </Box>

      <Box component="footer" sx={{ backgroundColor: BLUE_DARK, color: '#ffffff' }}>
        <Box
          sx={{
            width: '100%',
            maxWidth: 1180,
            mx: 'auto',
            px: { xs: 1.75, sm: 3, md: 4 },
            py: { xs: 2.2, md: 2.8 },
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 0.45
          }}
        >
          <Typography sx={{ color: '#ffffff', fontSize: { xs: 14, md: 15 }, fontWeight: 850 }}>
            ServiFood Catering
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.68)', fontSize: { xs: 13, md: 14 } }}>
            Plataforma interna de gestión y cumplimiento.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

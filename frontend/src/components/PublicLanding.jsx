import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import {
  ArrowRight,
  BarChart3,
  Bell,
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

const NAVY = '#06163d';
const NAVY_2 = '#08285f';
const BLUE = '#0f4da1';
const BLUE_SOFT = '#eaf1fa';
const BLUE_SURFACE = '#f5f8fc';
const ORANGE = '#ff8500';
const ORANGE_DARK = '#e97400';
const TEXT = '#0a1938';
const MUTED = '#4f607d';
const BORDER = 'rgba(13, 54, 111, 0.12)';

const shellSx = {
  width: '100%',
  maxWidth: 1280,
  mx: 'auto',
  px: { xs: 2.5, sm: 4, md: 5 }
};

const primaryButtonSx = {
  minHeight: 48,
  px: 3.5,
  borderRadius: 999,
  background: `linear-gradient(135deg, ${ORANGE} 0%, #ff9c27 100%)`,
  color: '#fff',
  fontWeight: 900,
  fontSize: 14,
  textTransform: 'none',
  boxShadow: '0 12px 28px rgba(255,133,0,.24)',
  '&:hover': {
    background: `linear-gradient(135deg, ${ORANGE_DARK} 0%, ${ORANGE} 100%)`,
    boxShadow: '0 16px 34px rgba(255,133,0,.3)'
  }
};

const secondaryButtonSx = {
  minHeight: 46,
  px: 3.25,
  borderRadius: 999,
  color: '#fff',
  borderColor: 'rgba(255,255,255,.34)',
  backgroundColor: 'rgba(255,255,255,.02)',
  fontWeight: 800,
  fontSize: 14,
  textTransform: 'none',
  '&:hover': {
    borderColor: 'rgba(255,255,255,.75)',
    backgroundColor: 'rgba(255,255,255,.08)'
  }
};

const features = [
  {
    icon: BarChart3,
    title: 'Información centralizada',
    description: 'Documentación e indicadores disponibles en un solo lugar.'
  },
  {
    icon: UsersRound,
    title: 'Accesos según perfil',
    description: 'Cada cuenta visualiza únicamente las herramientas habilitadas.'
  },
  {
    icon: ClipboardCheck,
    title: 'Seguimiento operativo',
    description: 'Datos organizados para facilitar el trabajo diario.'
  },
  {
    icon: ShieldCheck,
    title: 'Cumplimiento y seguridad',
    description: 'Una plataforma confiable para una operación responsable.'
  }
];

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function Brand() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.8, minWidth: 0 }}>
      <Box
        component="img"
        src={servifoodLogo}
        alt="ServiFood Catering"
        sx={{ width: { xs: 58, sm: 66 }, height: 'auto', objectFit: 'contain', flex: '0 0 auto' }}
      />
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ color: '#fff', fontWeight: 900, fontSize: { xs: 17, sm: 19 }, lineHeight: 1.05 }}>
          ServiFood Catering
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,.64)', fontSize: 12.5, mt: 0.4, fontWeight: 600 }}>
          Plataforma interna
        </Typography>
      </Box>
    </Box>
  );
}

function Header({ onLogin, onRegister }) {
  return (
    <Box
      component="header"
      sx={{
        position: 'relative',
        zIndex: 10,
        backgroundColor: 'rgba(5,19,57,.96)',
        borderBottom: '1px solid rgba(255,255,255,.08)',
        backdropFilter: 'blur(16px)'
      }}
    >
      <Box
        sx={{
          ...shellSx,
          minHeight: { xs: 78, md: 88 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 3
        }}
      >
        <Brand />

        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.5, ml: 'auto' }}>
          {[
            ['Inicio', 'top'],
            ['Características', 'features'],
            ['Soporte', 'final-cta']
          ].map(([label, id]) => (
            <Button
              key={label}
              onClick={() => scrollToSection(id)}
              sx={{
                color: 'rgba(255,255,255,.76)',
                minWidth: 'auto',
                px: 1.7,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: 13.5,
                '&:hover': { color: '#fff', backgroundColor: 'rgba(255,255,255,.06)' }
              }}
            >
              {label}
            </Button>
          ))}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          {onRegister && (
            <Button
              variant="outlined"
              onClick={onRegister}
              sx={{ ...secondaryButtonSx, display: { xs: 'none', sm: 'inline-flex' }, minHeight: 42, px: 2.5 }}
            >
              Solicitar registro
            </Button>
          )}
          <Button variant="contained" onClick={onLogin} sx={{ ...primaryButtonSx, minHeight: 42, px: { xs: 2.4, sm: 3 } }}>
            Ingresar
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

function BrowserBar({ title, dark = false }) {
  return (
    <Box
      sx={{
        minHeight: 40,
        px: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        borderBottom: dark ? '1px solid rgba(255,255,255,.08)' : `1px solid ${BORDER}`,
        backgroundColor: dark ? 'rgba(2,14,45,.5)' : '#fbfcfe'
      }}
    >
      {[ORANGE, dark ? 'rgba(255,255,255,.22)' : '#c9d2df', dark ? 'rgba(255,255,255,.22)' : '#c9d2df'].map((color, index) => (
        <Box key={`${color}-${index}`} sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: color }} />
      ))}
      <Typography sx={{ ml: 0.75, fontSize: 11, fontWeight: 800, color: dark ? 'rgba(255,255,255,.72)' : MUTED }}>
        {title}
      </Typography>
    </Box>
  );
}

function MetricCard({ icon: Icon, label, value, detail, tone = 'blue' }) {
  const isOrange = tone === 'orange';
  const isGreen = tone === 'green';
  const accent = isOrange ? ORANGE : isGreen ? '#17a673' : '#2d75dd';

  return (
    <Box sx={{ p: 1.65, borderRadius: 2.3, backgroundColor: '#fff', border: `1px solid ${BORDER}`, minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
        <Box sx={{ width: 32, height: 32, borderRadius: 1.5, display: 'grid', placeItems: 'center', backgroundColor: `${accent}16`, color: accent, flex: '0 0 auto' }}>
          <Icon size={17} strokeWidth={2.2} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ color: MUTED, fontSize: 10.5, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {label}
          </Typography>
          <Typography sx={{ color: TEXT, fontSize: 22, lineHeight: 1.05, fontWeight: 950, mt: 0.35 }}>
            {value}
          </Typography>
        </Box>
      </Box>
      <Typography sx={{ color: MUTED, fontSize: 9.5, mt: 1 }}>{detail}</Typography>
    </Box>
  );
}

function HeroDashboard() {
  const sidebar = [
    ['Inicio', FolderCheck],
    ['Indicadores', BarChart3],
    ['Documentos SGC', FileText],
    ['Seguimiento', ClipboardCheck],
    ['Declaraciones', HeartPulse],
    ['Usuarios', UsersRound]
  ];

  return (
    <Box sx={{ position: 'relative', width: '100%', maxWidth: 650, mx: 'auto' }}>
      <Box
        sx={{
          position: 'absolute',
          inset: '12% -4% -10% 12%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(38,115,232,.36), transparent 67%)',
          filter: 'blur(26px)'
        }}
      />
      <Box
        sx={{
          position: 'relative',
          borderRadius: { xs: 2.8, md: 3.5 },
          overflow: 'hidden',
          backgroundColor: '#eef3f9',
          border: '1px solid rgba(255,255,255,.2)',
          boxShadow: '0 34px 70px rgba(0,0,0,.34)'
        }}
      >
        <Box sx={{ px: 2, minHeight: 47, display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0a2861', color: '#fff', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box component="img" src={servifoodLogo} alt="" sx={{ width: 30, height: 30, objectFit: 'contain' }} />
            <Typography sx={{ fontSize: 11.5, fontWeight: 900 }}>ServiFood Catering</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Bell size={15} />
            <Box sx={{ width: 25, height: 25, borderRadius: '50%', display: 'grid', placeItems: 'center', backgroundColor: '#387add', fontSize: 9, fontWeight: 900 }}>SC</Box>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '122px 1fr' }, minHeight: { xs: 420, sm: 390 } }}>
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, flexDirection: 'column', gap: 0.55, p: 1.25, backgroundColor: '#0b2f70' }}>
            {sidebar.map(([label, Icon], index) => (
              <Box
                key={label}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.9,
                  px: 1,
                  py: 1,
                  borderRadius: 1.2,
                  backgroundColor: index === 0 ? 'rgba(52,126,234,.38)' : 'transparent',
                  color: index === 0 ? '#fff' : 'rgba(255,255,255,.66)'
                }}
              >
                <Icon size={13} />
                <Typography sx={{ fontSize: 8.6, fontWeight: 800 }}>{label}</Typography>
              </Box>
            ))}
          </Box>

          <Box sx={{ p: { xs: 2, sm: 2.2 }, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 1.8 }}>
              <Box>
                <Typography sx={{ color: TEXT, fontSize: { xs: 19, sm: 22 }, fontWeight: 950, lineHeight: 1.05 }}>Bienvenido</Typography>
                <Typography sx={{ color: MUTED, fontSize: 9.5, mt: 0.55 }}>Toda la información de tu operación, en un solo lugar.</Typography>
              </Box>
              <Typography sx={{ color: MUTED, fontSize: 8.5, display: { xs: 'none', md: 'block' } }}>Vista operativa</Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.1 }}>
              <MetricCard icon={FileText} label="Documentos SGC" value="24" detail="Actualizados" />
              <MetricCard icon={UsersRound} label="Usuarios activos" value="112" detail="Este mes" tone="orange" />
              <MetricCard icon={HeartPulse} label="Declaraciones" value="98%" detail="Completadas" tone="green" />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.45fr .9fr' }, gap: 1.2, mt: 1.25 }}>
              <Box sx={{ borderRadius: 2.2, border: `1px solid ${BORDER}`, backgroundColor: '#fff', p: 1.65 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ color: TEXT, fontSize: 10.5, fontWeight: 900 }}>Seguimiento operativo</Typography>
                  <Typography sx={{ color: MUTED, fontSize: 8.5 }}>Últimos 7 días</Typography>
                </Box>
                <Box sx={{ height: 112, mt: 1.5, display: 'flex', alignItems: 'flex-end', gap: 1.15 }}>
                  {[38, 64, 51, 78, 58, 86, 72].map((height, index) => (
                    <Box key={`${height}-${index}`} sx={{ flex: 1, height: `${height}%`, borderRadius: '4px 4px 1px 1px', backgroundColor: index === 5 ? ORANGE : '#a9c8f5' }} />
                  ))}
                </Box>
              </Box>
              <Box sx={{ borderRadius: 2.2, border: `1px solid ${BORDER}`, backgroundColor: '#fff', p: 1.45 }}>
                <Typography sx={{ color: TEXT, fontSize: 10.5, fontWeight: 900, mb: 1 }}>Accesos rápidos</Typography>
                {['Documentos SGC', 'Declaraciones', 'Gestionar usuarios'].map((label, index) => (
                  <Box key={label} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: index < 2 ? `1px solid ${BORDER}` : 'none' }}>
                    <Typography sx={{ color: MUTED, fontSize: 8.8, fontWeight: 750 }}>{label}</Typography>
                    <ArrowRight size={12} color="#5a82bd" />
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
      <Box sx={{ width: '92%', height: 12, mx: 'auto', borderRadius: '0 0 100% 100%', background: 'linear-gradient(180deg, #a6b2c2 0%, #4a5b71 100%)', boxShadow: '0 12px 18px rgba(0,0,0,.26)' }} />
    </Box>
  );
}

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <Box sx={{ textAlign: 'center', px: 2 }}>
      <Box
        sx={{
          width: 54,
          height: 54,
          borderRadius: 2.4,
          display: 'grid',
          placeItems: 'center',
          mx: 'auto',
          mb: 2,
          color: '#dceaff',
          background: 'linear-gradient(145deg, rgba(44,118,229,.42), rgba(51,62,184,.18))',
          border: '1px solid rgba(126,180,255,.22)',
          boxShadow: '0 14px 26px rgba(1,12,43,.2)'
        }}
      >
        <Icon size={25} strokeWidth={2} />
      </Box>
      <Typography sx={{ color: '#fff', fontWeight: 900, fontSize: 16.5, mb: 0.8 }}>{title}</Typography>
      <Typography sx={{ color: 'rgba(255,255,255,.68)', fontSize: 13.2, lineHeight: 1.55, maxWidth: 245, mx: 'auto' }}>{description}</Typography>
    </Box>
  );
}

function AnalyticsPreview() {
  return (
    <Box sx={{ borderRadius: 3, overflow: 'hidden', backgroundColor: '#fff', border: `1px solid ${BORDER}`, boxShadow: '0 22px 50px rgba(15,55,110,.12)' }}>
      <BrowserBar title="Indicadores y análisis" />
      <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
          {[
            ['Operación', '95%', '+12%'],
            ['Calidad', '87%', '+5%'],
            ['Documentación', '100%', '+2%'],
            ['Usuarios', '112', '+18%']
          ].map(([label, value, delta], index) => (
            <Box key={label} sx={{ p: { xs: 1, sm: 1.4 }, borderRadius: 1.7, border: `1px solid ${BORDER}`, minWidth: 0 }}>
              <Typography sx={{ color: MUTED, fontSize: { xs: 7.5, sm: 9 }, fontWeight: 800 }}>{label}</Typography>
              <Typography sx={{ color: TEXT, fontSize: { xs: 15, sm: 20 }, fontWeight: 950, lineHeight: 1.1, mt: 0.4 }}>{value}</Typography>
              <Typography sx={{ color: index === 1 ? ORANGE_DARK : '#15936a', fontSize: { xs: 7.5, sm: 9 }, mt: 0.3, fontWeight: 800 }}>{delta}</Typography>
            </Box>
          ))}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.4fr .65fr' }, gap: 1.2, mt: 1.3 }}>
          <Box sx={{ height: 170, p: 1.5, borderRadius: 2, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'flex-end', gap: 1.2 }}>
            {[42, 58, 72, 67, 81, 94].map((height, index) => (
              <Box key={`${height}-${index}`} sx={{ flex: 1, height: `${height}%`, borderRadius: '5px 5px 1px 1px', backgroundColor: index === 5 ? ORANGE : '#c9d9ef' }} />
            ))}
          </Box>
          <Box sx={{ minHeight: 170, p: 1.5, borderRadius: 2, border: `1px solid ${BORDER}`, display: 'grid', placeItems: 'center' }}>
            <Box sx={{ width: 100, height: 100, borderRadius: '50%', background: `conic-gradient(${BLUE} 0 87%, ${ORANGE} 87% 95%, #dbe4f0 95% 100%)`, display: 'grid', placeItems: 'center' }}>
              <Box sx={{ width: 70, height: 70, borderRadius: '50%', backgroundColor: '#fff', display: 'grid', placeItems: 'center' }}>
                <Typography sx={{ color: TEXT, fontWeight: 950, fontSize: 20 }}>87%</Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function DocumentsPreview() {
  return (
    <Box sx={{ borderRadius: 3, overflow: 'hidden', background: 'linear-gradient(145deg, #0c397c, #09275b)', border: '1px solid rgba(255,255,255,.1)', boxShadow: '0 24px 52px rgba(0,0,0,.2)' }}>
      <BrowserBar title="Documentos SGC" dark />
      <Box sx={{ p: 2.3, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '125px 1fr' }, gap: 1.6 }}>
        <Box sx={{ display: { xs: 'none', sm: 'grid' }, alignContent: 'start', gap: 0.65 }}>
          {['Todos los documentos', 'Manuales', 'Certificaciones', 'Políticas internas', 'Procedimientos'].map((label, index) => (
            <Box key={label} sx={{ px: 1.2, py: 1, borderRadius: 1.2, backgroundColor: index === 0 ? 'rgba(59,130,246,.3)' : 'transparent', color: index === 0 ? '#fff' : 'rgba(255,255,255,.6)' }}>
              <Typography sx={{ fontSize: 8.8, fontWeight: 800 }}>{label}</Typography>
            </Box>
          ))}
        </Box>
        <Box>
          <Box sx={{ height: 34, borderRadius: 1.3, backgroundColor: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.08)', mb: 1.3 }} />
          {[
            ['Manual SGC', 'v2.1 · 12/04/2025'],
            ['Política de Calidad', 'v1.3 · 02/04/2025'],
            ['Procedimiento Operativo', 'v1.0 · 28/03/2025']
          ].map(([title, version]) => (
            <Box key={title} sx={{ display: 'grid', gridTemplateColumns: '34px 1fr auto', alignItems: 'center', gap: 1.1, p: 1.15, mb: 0.8, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.08)' }}>
              <Box sx={{ width: 31, height: 31, borderRadius: 1.2, display: 'grid', placeItems: 'center', color: '#dceaff', backgroundColor: 'rgba(93,158,255,.2)' }}><FileText size={15} /></Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ color: '#fff', fontSize: 10.5, fontWeight: 850 }}>{title}</Typography>
                <Typography sx={{ color: 'rgba(255,255,255,.52)', fontSize: 8.3, mt: 0.3 }}>{version}</Typography>
              </Box>
              <Box sx={{ px: 1, py: 0.45, borderRadius: 99, backgroundColor: 'rgba(34,197,94,.16)', color: '#8ce8ab', fontSize: 8, fontWeight: 900 }}>Vigente</Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function UsersPreview() {
  return (
    <Box sx={{ borderRadius: 3, overflow: 'hidden', backgroundColor: '#fff', border: `1px solid ${BORDER}`, boxShadow: '0 22px 50px rgba(15,55,110,.12)' }}>
      <BrowserBar title="Perfiles y accesos" />
      <Box sx={{ p: { xs: 2, sm: 2.4 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.4 }}>
          <Typography sx={{ color: TEXT, fontSize: 12.5, fontWeight: 900 }}>Gestión de usuarios</Typography>
          <Box sx={{ px: 1.2, py: 0.65, borderRadius: 1, backgroundColor: BLUE, color: '#fff', fontSize: 8.5, fontWeight: 850 }}>+ Nuevo usuario</Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.6, mb: 1.4, overflow: 'hidden' }}>
          {['Todos (112)', 'Administración (12)', 'Nutrición (28)', 'Colaborador (72)'].map((tab, index) => (
            <Box key={tab} sx={{ px: 1.1, py: 0.55, borderRadius: 99, whiteSpace: 'nowrap', backgroundColor: index === 0 ? '#e7f0ff' : '#f4f7fb', color: index === 0 ? BLUE : MUTED, fontSize: 7.8, fontWeight: 850 }}>{tab}</Box>
          ))}
        </Box>
        {[
          ['MG', 'María González', 'Administración', 'Hoy, 10:24'],
          ['CR', 'Carlos Ruiz', 'Nutrición', 'Hoy, 09:18'],
          ['AT', 'Ana Torres', 'Colaborador', 'Ayer, 16:03']
        ].map(([initials, name, role, last], index) => (
          <Box key={name} sx={{ display: 'grid', gridTemplateColumns: '34px 1.35fr 1fr .65fr .8fr', alignItems: 'center', gap: 0.8, minHeight: 48, borderTop: index === 0 ? `1px solid ${BORDER}` : 'none', borderBottom: `1px solid ${BORDER}` }}>
            <Box sx={{ width: 27, height: 27, borderRadius: '50%', backgroundColor: '#dcebff', color: BLUE, display: 'grid', placeItems: 'center', fontSize: 8, fontWeight: 950 }}>{initials}</Box>
            <Typography sx={{ color: TEXT, fontSize: { xs: 7.5, sm: 9.2 }, fontWeight: 850 }}>{name}</Typography>
            <Typography sx={{ color: MUTED, fontSize: { xs: 7, sm: 8.5 } }}>{role}</Typography>
            <Box sx={{ justifySelf: 'start', px: 0.8, py: 0.35, borderRadius: 99, backgroundColor: '#e5f7ee', color: '#16855f', fontSize: 7.2, fontWeight: 900 }}>Activo</Box>
            <Typography sx={{ color: MUTED, fontSize: { xs: 6.8, sm: 8.2 }, textAlign: 'right' }}>{last}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function Showcase({ eyebrow, title, description, action, dark = false, reverse = false, children, id }) {
  return (
    <Box
      id={id}
      component="section"
      sx={{
        borderRadius: { xs: 3.5, md: 5 },
        overflow: 'hidden',
        background: dark ? 'linear-gradient(145deg, #0e438c 0%, #082758 100%)' : `linear-gradient(145deg, ${BLUE_SURFACE}, ${BLUE_SOFT})`,
        border: dark ? '1px solid rgba(255,255,255,.08)' : `1px solid ${BORDER}`,
        boxShadow: dark ? '0 20px 50px rgba(0,0,0,.16)' : '0 20px 50px rgba(9,48,104,.08)'
      }}
    >
      <Box sx={{ p: { xs: 3, sm: 4.5, md: 5.5 }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1.25fr' }, alignItems: 'center', gap: { xs: 4, md: 6 } }}>
        <Box sx={{ order: { xs: 1, md: reverse ? 2 : 1 }, maxWidth: 490 }}>
          <Typography sx={{ color: dark ? ORANGE : '#3e70b4', fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: 1.8, mb: 1.5 }}>{eyebrow}</Typography>
          <Typography component="h2" sx={{ color: dark ? '#fff' : TEXT, fontSize: { xs: 28, sm: 34, md: 40 }, lineHeight: 1.08, fontWeight: 950, mb: 2 }}>{title}</Typography>
          <Typography sx={{ color: dark ? 'rgba(255,255,255,.72)' : MUTED, fontSize: { xs: 14.5, sm: 15.5 }, lineHeight: 1.65, maxWidth: 460 }}>{description}</Typography>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.8, color: ORANGE, mt: 2.4, fontWeight: 900, fontSize: 13.5 }}>
            {action}<ArrowRight size={16} />
          </Box>
        </Box>
        <Box sx={{ order: { xs: 2, md: reverse ? 1 : 2 }, minWidth: 0 }}>{children}</Box>
      </Box>
    </Box>
  );
}

export default function PublicLanding({ onLogin, onRegister }) {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: NAVY, overflowX: 'hidden' }}>
      <Box id="top" />
      <Header onLogin={onLogin} onRegister={onRegister} />

      <Box component="main">
        <Box
          component="section"
          sx={{
            position: 'relative',
            overflow: 'hidden',
            background: `radial-gradient(circle at 15% 18%, rgba(31,99,199,.25), transparent 26%), radial-gradient(circle at 84% 18%, rgba(29,114,223,.22), transparent 28%), linear-gradient(145deg, ${NAVY} 0%, #07245a 54%, ${NAVY_2} 100%)`
          }}
        >
          <Box sx={{ position: 'absolute', width: 420, height: 420, borderRadius: '50%', top: -260, left: '20%', border: '80px solid rgba(48,128,239,.08)', pointerEvents: 'none' }} />
          <Box
            sx={{
              ...shellSx,
              position: 'relative',
              py: { xs: 7, sm: 9, md: 10.5 },
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '.88fr 1.12fr' },
              gap: { xs: 7, lg: 6 },
              alignItems: 'center'
            }}
          >
            <Box sx={{ maxWidth: 610 }}>
              <Typography sx={{ color: ORANGE, fontSize: 12, fontWeight: 950, letterSpacing: 2.1, textTransform: 'uppercase', mb: 2 }}>
                Plataforma interna
              </Typography>
              <Typography component="h1" sx={{ color: '#fff', fontSize: { xs: 38, sm: 54, md: 63 }, lineHeight: 1.02, letterSpacing: '-.025em', fontWeight: 950, mb: 2.7 }}>
                La operación de ServiFood, organizada en un solo lugar.
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,.78)', fontSize: { xs: 16, sm: 18 }, lineHeight: 1.65, maxWidth: 560 }}>
                Accedé a documentación, indicadores y herramientas internas según tu perfil. Todo lo que necesitás para una operación más ágil, segura y eficiente.
              </Typography>

              <Box sx={{ mt: 3.5, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, gap: 1.4 }}>
                <Button variant="contained" onClick={onLogin} endIcon={<ArrowRight size={17} />} sx={primaryButtonSx}>
                  Ingresar a la plataforma
                </Button>
                {onRegister && (
                  <Button variant="outlined" onClick={onRegister} sx={secondaryButtonSx}>
                    Solicitar registro
                  </Button>
                )}
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.3, mt: 3 }}>
                {['Seguro', 'Accesible', 'Siempre disponible'].map((label) => (
                  <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.7, color: 'rgba(255,255,255,.7)' }}>
                    <CheckCircle2 size={15} color="#8db9f2" />
                    <Typography sx={{ fontSize: 12.3, fontWeight: 700 }}>{label}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            <HeroDashboard />
          </Box>
        </Box>

        <Box id="features" component="section" sx={{ background: 'linear-gradient(180deg, #0b3477 0%, #0a2d67 100%)', borderTop: '1px solid rgba(255,255,255,.07)', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          <Box sx={{ ...shellSx, py: { xs: 6, md: 7.5 } }}>
            <Typography sx={{ color: '#fff', textAlign: 'center', fontSize: { xs: 21, sm: 25 }, fontWeight: 900, mb: 4.5 }}>
              Todo lo que necesitás, en un entorno seguro y centralizado
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: { xs: 4.5, md: 3 } }}>
              {features.map((feature) => <FeatureCard key={feature.title} {...feature} />)}
            </Box>
          </Box>
        </Box>

        <Box sx={{ background: `radial-gradient(circle at 10% 35%, rgba(35,104,206,.18), transparent 23%), linear-gradient(180deg, ${NAVY} 0%, #08265b 50%, ${NAVY} 100%)` }}>
          <Box sx={{ ...shellSx, py: { xs: 5, md: 7 }, display: 'grid', gap: { xs: 3, md: 3.5 } }}>
            <Showcase
              id="analytics"
              eyebrow="Indicadores y análisis"
              title="Indicadores claros para tomar mejores decisiones"
              description="Centralizá la información operativa, consultá históricos y visualizá indicadores de calidad de forma simple y ordenada."
              action="Conocer indicadores"
            >
              <AnalyticsPreview />
            </Showcase>

            <Showcase
              id="documents"
              eyebrow="Documentación SGC"
              title="Documentación organizada y siempre accesible"
              description="Consultá manuales, certificaciones y políticas internas con una estructura clara, trazable y disponible según tu perfil."
              action="Explorar documentos"
              dark
              reverse
            >
              <DocumentsPreview />
            </Showcase>

            <Showcase
              id="profiles"
              eyebrow="Perfiles y accesos"
              title="Herramientas adecuadas para cada perfil"
              description="Gestioná declaraciones de salud, usuarios y permisos con accesos adaptados a las necesidades de cada cuenta."
              action="Ver perfiles y accesos"
            >
              <UsersPreview />
            </Showcase>
          </Box>
        </Box>

        <Box
          id="final-cta"
          component="section"
          sx={{
            position: 'relative',
            overflow: 'hidden',
            background: `linear-gradient(145deg, #07143f 0%, #081d50 58%, ${NAVY} 100%)`,
            borderTop: '1px solid rgba(255,255,255,.06)'
          }}
        >
          <Box sx={{ position: 'absolute', left: '-8%', bottom: -150, width: '58%', height: 280, borderRadius: '50%', border: '60px solid rgba(32,102,205,.2)', transform: 'rotate(7deg)' }} />
          <Box sx={{ position: 'absolute', right: '-12%', bottom: -190, width: '60%', height: 320, borderRadius: '50%', border: '75px solid rgba(41,118,226,.14)', transform: 'rotate(-5deg)' }} />
          <Box sx={{ ...shellSx, position: 'relative', py: { xs: 8, md: 10 }, textAlign: 'center' }}>
            <Typography sx={{ color: ORANGE, fontSize: 11, fontWeight: 950, letterSpacing: 2, textTransform: 'uppercase', mb: 1.6 }}>
              ServiFood Catering
            </Typography>
            <Typography component="h2" sx={{ color: '#fff', fontSize: { xs: 30, sm: 40, md: 46 }, lineHeight: 1.08, fontWeight: 950, maxWidth: 780, mx: 'auto' }}>
              Todo lo necesario para acompañar la operación diaria.
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,.7)', fontSize: { xs: 14.5, sm: 16 }, mt: 2, maxWidth: 640, mx: 'auto', lineHeight: 1.6 }}>
              Ingresá con tu cuenta y accedé a las herramientas habilitadas para tu perfil.
            </Typography>
            <Button variant="contained" onClick={onLogin} endIcon={<ArrowRight size={17} />} sx={{ ...primaryButtonSx, mt: 3.5 }}>
              Ingresar a la plataforma
            </Button>
            <Box sx={{ mt: 4.5, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: { xs: 2, sm: 4 } }}>
              {[
                ['Operación más eficiente', ClipboardCheck],
                ['Información segura', LockKeyhole],
                ['Equipo alineado', UsersRound]
              ].map(([label, Icon]) => (
                <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: 'rgba(255,255,255,.62)' }}>
                  <Icon size={15} />
                  <Typography sx={{ fontSize: 12.2, fontWeight: 700 }}>{label}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>

      <Box component="footer" sx={{ backgroundColor: '#030a20', borderTop: '1px solid rgba(255,255,255,.06)' }}>
        <Box sx={{ ...shellSx, minHeight: 98, py: 2.5, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', justifyContent: 'space-between', gap: 2.2 }}>
          <Brand />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2.2 }}>
            {['Soporte', 'Términos de uso', 'Privacidad'].map((label) => (
              <Typography key={label} sx={{ color: 'rgba(255,255,255,.55)', fontSize: 11.5 }}>{label}</Typography>
            ))}
          </Box>
          <Typography sx={{ color: 'rgba(255,255,255,.42)', fontSize: 11.2, textAlign: { xs: 'center', md: 'right' } }}>
            © 2026 ServiFood Catering · Plataforma interna
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

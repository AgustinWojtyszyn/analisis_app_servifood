import React from 'react';
import { Box, Button, Typography, alpha } from '@mui/material';
import { FileText, ClipboardCheck, LockKeyhole, HeartPulse, CheckCircle2 } from 'lucide-react';
import servifoodLogo from '../assets/servifood_logo_white_text_HQ.png';

// Sistema de Tokens Visuales
const TOKENS = {
  bg: {
    root: '#050e33',
    surface: '#081b4a',
    footer: '#020617',
  },
  accent: {
    orange: {
      main: '#f58300',
      hover: '#d67200',
    },
  },
  text: {
    primary: '#f8fafc',
    secondary: '#94a3b8',
  },
  border: 'rgba(255, 255, 255, 0.06)'
};

// Sistema de Espaciado (Desktop / Mobile)
const SPACING = {
  container: {
    maxWidth: 1200,
    mx: 'auto',
    px: { xs: 2.5, md: 5 } // 20px mobile / 40px desktop
  },
  section: {
    py: { xs: 8, md: 12 } // 64px mobile / 96px desktop
  },
  gap: { xs: 4, md: 8 } // 32px mobile / 64px desktop
};

// Botón Primario Institucional
const primaryButtonSx = {
  backgroundColor: TOKENS.accent.orange.main,
  color: '#ffffff',
  fontSize: { xs: '0.875rem', sm: '1rem' },
  fontWeight: 700,
  py: 1.5,
  px: 4,
  borderRadius: 2,
  textTransform: 'none',
  boxShadow: '0 4px 14px rgba(245, 131, 0, 0.25)',
  transition: 'all 0.2s ease-in-out',
  whiteSpace: 'nowrap',
  '&:hover': {
    backgroundColor: TOKENS.accent.orange.hover,
    boxShadow: '0 6px 20px rgba(245, 131, 0, 0.35)',
    transform: 'translateY(-1px)'
  }
};

const Header = ({ onLogin, onRegister }) => (
  <Box
    component="header"
    sx={{
      backgroundColor: alpha(TOKENS.bg.root, 0.95),
      backdropFilter: 'blur(10px)',
      borderBottom: `1px solid ${TOKENS.border}`,
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}
  >
    <Box
      sx={{
        ...SPACING.container,
        py: { xs: 2, md: 2.5 },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          component="img"
          src={servifoodLogo}
          alt="ServiFood Catering Logo"
          sx={{ height: { xs: 40, md: 52 }, width: 'auto' }}
        />
        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
          <Typography sx={{ color: TOKENS.text.primary, fontSize: '1.125rem', fontWeight: 800, lineHeight: 1 }}>
            ServiFood Catering
          </Typography>
          <Typography sx={{ color: TOKENS.text.secondary, fontSize: '0.75rem', mt: 0.5, fontWeight: 500 }}>
            Plataforma Interna
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5 }}>
        {onRegister && (
          <Button
            onClick={onRegister}
            sx={{
              color: TOKENS.text.secondary,
              fontWeight: 600,
              textTransform: 'none',
              display: { xs: 'none', sm: 'inline-flex' },
              '&:hover': { color: TOKENS.text.primary, backgroundColor: alpha('#ffffff', 0.05) }
            }}
          >
            Solicitar acceso
          </Button>
        )}
        <Button
          onClick={onLogin}
          sx={{
            ...primaryButtonSx,
            py: { xs: 1, md: 1.25 },
            px: { xs: 3, md: 3.5 },
            fontSize: { xs: '0.875rem' }
          }}
        >
          Ingresar
        </Button>
      </Box>
    </Box>
  </Box>
);

const AbstractIconGraphic = ({ icon: Icon, tone = 'blue' }) => {
  const isOrange = tone === 'orange';
  return (
    <Box
      sx={{
        width: 120,
        height: 120,
        borderRadius: 4,
        background: `linear-gradient(135deg, ${alpha(isOrange ? TOKENS.accent.orange.main : '#ffffff', 0.1)} 0%, transparent 100%)`,
        border: `1px solid ${alpha(isOrange ? TOKENS.accent.orange.main : '#ffffff', 0.2)}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: isOrange ? TOKENS.accent.orange.main : TOKENS.text.primary,
        boxShadow: `0 24px 48px ${alpha(isOrange ? TOKENS.accent.orange.main : '#000000', 0.15)}`,
      }}
    >
      <Icon size={48} strokeWidth={1.5} />
    </Box>
  );
};

const FeatureBlock = ({ title, description, icon, reverse, isSurface }) => (
  <Box sx={{ backgroundColor: isSurface ? TOKENS.bg.surface : TOKENS.bg.root, borderTop: isSurface ? `1px solid ${TOKENS.border}` : 'none', borderBottom: isSurface ? `1px solid ${TOKENS.border}` : 'none' }}>
    <Box
      sx={{
        ...SPACING.container,
        ...SPACING.section,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        gap: SPACING.gap,
        alignItems: 'center',
      }}
    >
      <Box sx={{ order: { xs: 2, md: reverse ? 2 : 1 } }}>
        <Typography component="h2" sx={{ color: TOKENS.text.primary, fontSize: { xs: '1.75rem', md: '2.5rem' }, fontWeight: 800, lineHeight: 1.2, mb: 2 }}>
          {title}
        </Typography>
        <Typography sx={{ color: TOKENS.text.secondary, fontSize: { xs: '1rem', md: '1.125rem' }, lineHeight: 1.6, maxWidth: 500 }}>
          {description}
        </Typography>
      </Box>
      <Box sx={{ order: { xs: 1, md: reverse ? 1 : 2 }, display: 'flex', justifyContent: { xs: 'center', md: reverse ? 'flex-start' : 'flex-end' } }}>
        <AbstractIconGraphic icon={icon} tone={isSurface ? 'orange' : 'blue'} />
      </Box>
    </Box>
  </Box>
);

export default function PublicLanding({ onLogin, onRegister }) {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: TOKENS.bg.root, display: 'flex', flexDirection: 'column' }}>
      <Header onLogin={onLogin} onRegister={onRegister} />

      <Box component="main" sx={{ flexGrow: 1 }}>
        {/* HERO SECTION */}
        <Box sx={{ position: 'relative', overflow: 'hidden' }}>
          {/* Subtle Glow */}
          <Box sx={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: '60vw', height: '60vh', background: 'radial-gradient(circle, rgba(29, 78, 216, 0.15) 0%, transparent 70%)', zIndex: 0, pointerEvents: 'none' }} />
          
          <Box
            sx={{
              ...SPACING.container,
              py: { xs: 10, md: 16 },
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1.2fr 0.8fr' },
              gap: SPACING.gap,
              alignItems: 'center',
              position: 'relative',
              zIndex: 1
            }}
          >
            <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
              <Typography sx={{ color: TOKENS.accent.orange.main, fontSize: '0.875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, mb: 2 }}>
                Gestión Operativa Integral
              </Typography>
              <Typography component="h1" sx={{ color: TOKENS.text.primary, fontSize: { xs: '2.5rem', sm: '3rem', md: '4rem' }, fontWeight: 800, lineHeight: 1.1, mb: 3 }}>
                Plataforma de Calidad y Procesos Internos
              </Typography>
              <Typography sx={{ color: TOKENS.text.secondary, fontSize: { xs: '1.125rem', md: '1.25rem' }, lineHeight: 1.6, maxWidth: { xs: '100%', md: 540 }, mx: { xs: 'auto', md: 0 }, mb: 5 }}>
                Acceso centralizado a documentación SGC, seguimiento de indicadores y herramientas operativas para personal autorizado.
              </Typography>
              <Button onClick={onLogin} sx={primaryButtonSx}>
                Ingresar a la plataforma
              </Button>
            </Box>
            
            <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'flex-end' }}>
               <Box sx={{ width: 280, height: 280, borderRadius: '50%', border: `1px dashed ${alpha('#ffffff', 0.15)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <Box sx={{ width: 180, height: 180, borderRadius: '50%', border: `1px dashed ${alpha(TOKENS.accent.orange.main, 0.3)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <LockKeyhole size={56} color={TOKENS.text.primary} strokeWidth={1} />
                  </Box>
               </Box>
            </Box>
          </Box>
        </Box>

        {/* FUNCIONALIDADES (Alternadas) */}
        <FeatureBlock
          title="Calidad y Seguimiento de Indicadores"
          description="Visualice de manera clara y ordenada los registros históricos de análisis, facilitando el control de calidad en cada etapa operativa."
          icon={ClipboardCheck}
          isSurface={true}
          reverse={false}
        />

        <FeatureBlock
          title="Documentación SGC Trazable"
          description="Consulte manuales, normativas y certificaciones vigentes en un repositorio centralizado, asegurando el cumplimiento de los estándares corporativos."
          icon={FileText}
          isSurface={false}
          reverse={true}
        />

        <FeatureBlock
          title="Accesos Seguros y Sectorizados"
          description="Gestione declaraciones de salud y permisos mediante perfiles estructurados que garantizan que cada usuario acceda solo a la información pertinente a su rol."
          icon={HeartPulse}
          isSurface={true}
          reverse={false}
        />

        {/* CTA FINAL */}
        <Box sx={{ backgroundColor: TOKENS.bg.root, py: { xs: 10, md: 14 }, textAlign: 'center', position: 'relative' }}>
           <Box sx={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '80%', height: '1px', background: `linear-gradient(90deg, transparent 0%, ${alpha('#ffffff', 0.1)} 50%, transparent 100%)` }} />
           <Box sx={SPACING.container}>
              <Typography component="h2" sx={{ color: TOKENS.text.primary, fontSize: { xs: '1.5rem', md: '2.25rem' }, fontWeight: 800, mb: 2 }}>
                Acceso Exclusivo para Personal
              </Typography>
              <Typography sx={{ color: TOKENS.text.secondary, fontSize: '1rem', mb: 5 }}>
                Esta plataforma es de uso interno exclusivo para la gestión de procesos de ServiFood.
              </Typography>
              <Button onClick={onLogin} sx={primaryButtonSx}>
                Iniciar Sesión Segura
              </Button>
           </Box>
        </Box>
      </Box>

      {/* FOOTER MINIMO */}
      <Box component="footer" sx={{ backgroundColor: TOKENS.bg.footer, py: 4, borderTop: `1px solid rgba(255,255,255,0.03)` }}>
        <Box sx={{ ...SPACING.container, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'center', md: 'flex-start' }, gap: 2, textAlign: { xs: 'center', md: 'left' } }}>
          <Box>
             <Typography sx={{ color: TOKENS.text.primary, fontSize: '0.875rem', fontWeight: 700 }}>
               ServiFood Catering
             </Typography>
             <Typography sx={{ color: TOKENS.text.secondary, fontSize: '0.75rem', mt: 0.5 }}>
               Plataforma Interna de Gestión y Cumplimiento.
             </Typography>
          </Box>
          <Typography sx={{ color: alpha(TOKENS.text.secondary, 0.5), fontSize: '0.75rem' }}>
             &copy; {new Date().getFullYear()} ServiFood. Todos los derechos reservados.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

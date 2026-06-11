import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import {
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
const BLUE_SOFT = '#e4ebf5'; // Gris azulado muy suave (reemplaza blanco puro)
const BLUE_SURFACE = '#dbe4f0'; // Gris azulado integrado con la paleta para bloques claros
const ORANGE = '#f58300'; // Naranja CTA corporativo
const ORANGE_DARK = '#d67200';
const TEXT_DARK = '#0f172a'; // Contraste mejorado para textos oscuros
const TEXT_MUTED = '#334155'; // Contraste mejorado para textos secundarios
const PAGE = '#0b1940'; // Fondo institucional que envuelve a la landing (azul profundo)

const primaryButtonSx = {
  minHeight: { xs: 44, sm: 48 }, // Botón cómodo pero no gigante
  px: { xs: 3, sm: 4 },
  borderRadius: 1.5,
  backgroundColor: ORANGE,
  boxShadow: '0 4px 12px rgba(245,131,0,0.2)',
  color: '#ffffff',
  fontSize: { xs: 14, sm: 15 },
  fontWeight: 800,
  textTransform: 'none',
  whiteSpace: 'nowrap',
  lineHeight: 1,
  transition: 'all 0.2s',
  '&:hover': {
    backgroundColor: ORANGE_DARK,
    boxShadow: '0 6px 16px rgba(245,131,0,0.3)'
  },
  '&:focus-visible': {
    outline: `3px solid rgba(245,131,0,0.4)`,
    outlineOffset: 2
  }
};

const secondaryButtonSx = {
  minHeight: { xs: 40, sm: 44 },
  px: { xs: 2.5, sm: 3 },
  borderRadius: 1.5,
  color: '#ffffff',
  borderColor: 'rgba(255,255,255,0.4)',
  backgroundColor: 'transparent',
  fontSize: { xs: 13.5, sm: 14.5 },
  fontWeight: 700,
  textTransform: 'none',
  whiteSpace: 'nowrap',
  lineHeight: 1,
  transition: 'all 0.2s',
  '&:hover': {
    borderColor: 'rgba(255,255,255,0.8)',
    backgroundColor: 'rgba(255,255,255,0.1)'
  },
  '&:focus-visible': {
    outline: `3px solid rgba(255,255,255,0.3)`,
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
        justifyContent: 'center',
        gap: { xs: 1.5, sm: 2 },
        width: { xs: '100%', sm: 'auto' }
      }}
    >
      {onRegister && (
        <Button variant="outlined" onClick={onRegister} sx={{ ...secondaryButtonSx, flex: { xs: 1, sm: 'none' } }}>
          Solicitar registro
        </Button>
      )}
      <Button variant="contained" onClick={onLogin} sx={{ ...primaryButtonSx, flex: { xs: 1, sm: 'none' }, minHeight: { xs: 40, sm: 44 } }}>
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
        backgroundColor: BLUE_DEEP, // Fondo azul institucional sólido
        borderBottom: '1px solid rgba(255,255,255,0.08)'
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 1240,
          mx: 'auto',
          px: { xs: 2.5, sm: 4, md: 5 }, // 20px padding lateral en mobile (entre 18 y 22 px)
          py: { xs: 2, sm: 2.5 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2.5, sm: 3 }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
          <Box
            component="img"
            src={servifoodLogo}
            alt="ServiFood Catering Logo"
            sx={{ width: { xs: 68, sm: 76, md: 84 }, height: 'auto', objectFit: 'contain', flex: '0 0 auto' }} // Logo levemente agrandado
          />
          <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography sx={{ color: '#ffffff', fontSize: { xs: 18, sm: 20, md: 22 }, fontWeight: 900, lineHeight: 1.15 }}>
              ServiFood Catering
            </Typography>
            <Typography sx={{ mt: 0.25, color: 'rgba(255,255,255,0.7)', fontSize: { xs: 12, sm: 13, md: 14 }, fontWeight: 600 }}>
              Plataforma interna
            </Typography>
          </Box>
        </Box>
        <HeaderActions onLogin={onLogin} onRegister={onRegister} />
      </Box>
    </Box>
  );
}

function BrowserFrame({ children, title = 'Panel interno', isDark = true }) {
  return (
    <Box
      sx={{
        backgroundColor: isDark ? '#102d69' : '#ffffff',
        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(18,59,122,0.1)',
        borderRadius: { xs: 2, md: 3 },
        boxShadow: isDark ? '0 20px 40px rgba(0,0,0,0.25)' : '0 20px 40px rgba(18,59,122,0.08)',
        overflow: 'hidden'
      }}
    >
      <Box sx={{ px: 2, py: 1.25, borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(18,59,122,0.08)', display: 'flex', alignItems: 'center', gap: 1, backgroundColor: isDark ? 'rgba(6,19,71,0.5)' : '#f8fafc' }}>
        {[0, 1, 2].map((dot) => (
          <Box key={dot} sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: dot === 0 ? ORANGE : isDark ? 'rgba(255,255,255,0.2)' : 'rgba(18,59,122,0.15)' }} />
        ))}
        <Typography sx={{ ml: 1, color: isDark ? 'rgba(255,255,255,0.7)' : TEXT_MUTED, fontSize: 13, fontWeight: 700 }}>{title}</Typography>
      </Box>
      {children}
    </Box>
  );
}

function MiniBadge({ children, tone = 'blue', isDark = true }) {
  return (
    <Box
      sx={{
        px: 1.2,
        py: 0.5,
        borderRadius: 99,
        backgroundColor: tone === 'orange' ? 'rgba(245,131,0,0.15)' : isDark ? 'rgba(147,197,253,0.15)' : 'rgba(18,59,122,0.08)',
        color: tone === 'orange' ? ORANGE : isDark ? 'rgba(255,255,255,0.9)' : BLUE,
        fontSize: 12,
        fontWeight: 800,
        width: 'fit-content'
      }}
    >
      {children}
    </Box>
  );
}

function HeroMockup() {
  return (
    <Box sx={{ position: 'relative', width: '100%', maxWidth: 540, mx: 'auto' }}>
      <BrowserFrame title="Vista operativa" isDark={true}>
        <Box sx={{ p: { xs: 2, sm: 2.5, md: 3 }, display: 'grid', gap: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
            <Box>
              <Typography sx={{ color: '#ffffff', fontSize: { xs: 16, sm: 18 }, fontWeight: 900, lineHeight: 1.2 }}>Indicadores</Typography>
              <Typography sx={{ mt: 0.5, color: 'rgba(255,255,255,0.7)', fontSize: { xs: 13, sm: 14 }, lineHeight: 1.4 }}>Seguimiento general</Typography>
            </Box>
            <MiniBadge tone="orange">Actualizado</MiniBadge>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.2fr 0.8fr' }, gap: 2 }}>
            <Box sx={{ p: 2, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Box sx={{ height: { xs: 120, sm: 140 }, display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                {[45, 75, 55, 90, 65, 80].map((height, index) => (
                  <Box
                    key={height + index}
                    sx={{
                      flex: 1,
                      height: `${height}%`,
                      borderRadius: '4px 4px 0 0',
                      backgroundColor: index === 3 ? ORANGE : 'rgba(255,255,255,0.15)'
                    }}
                  />
                ))}
              </Box>
            </Box>
            <Box sx={{ display: 'grid', gap: 1.5 }}>
              {[
                ['Documentos SGC', FileText],
                ['Seguimiento', ClipboardCheck],
                ['Declaraciones', HeartPulse]
              ].map(([label, Icon]) => (
                <Box key={label} sx={{ p: 1.5, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 32, height: 32, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)', color: '#ffffff' }}>
                    <Icon size={18} strokeWidth={2} />
                  </Box>
                  <Typography sx={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: 800, lineHeight: 1.2 }}>{label}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </BrowserFrame>
    </Box>
  );
}

function QualityVisual({ isDark }) {
  const bgCard = isDark ? 'rgba(255,255,255,0.06)' : '#ffffff';
  const borderCard = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(18,59,122,0.08)';
  const textColor = isDark ? 'rgba(255,255,255,0.7)' : TEXT_MUTED;
  const barColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(18,59,122,0.15)';

  return (
    <BrowserFrame title="Calidad y análisis" isDark={isDark}>
      <Box sx={{ p: { xs: 2, md: 3 }, display: 'grid', gap: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
          {['Historial', 'Estado', 'Calidad'].map((label, index) => (
            <Box key={label} sx={{ p: 1.5, borderRadius: 2, backgroundColor: index === 1 ? (isDark ? 'rgba(245,131,0,0.15)' : 'rgba(245,131,0,0.1)') : bgCard, border: `1px solid ${borderCard}` }}>
              <Typography sx={{ color: index === 1 && !isDark ? ORANGE_DARK : textColor, fontSize: 12, fontWeight: 800 }}>{label}</Typography>
              <Box sx={{ mt: 1, height: 6, borderRadius: 99, backgroundColor: index === 1 ? ORANGE : barColor }} />
            </Box>
          ))}
        </Box>
        <Box sx={{ p: 2, borderRadius: 2, backgroundColor: bgCard, border: `1px solid ${borderCard}` }}>
          <Box sx={{ height: { xs: 120, md: 150 }, display: 'flex', alignItems: 'flex-end', gap: 1.5 }}>
            {[40, 55, 80, 65, 90].map((height, index) => (
              <Box key={height} sx={{ flex: 1, height: `${height}%`, borderRadius: '6px 6px 0 0', backgroundColor: index === 4 ? ORANGE : barColor }} />
            ))}
          </Box>
        </Box>
      </Box>
    </BrowserFrame>
  );
}

function DocumentsVisual({ isDark }) {
  const bgCard = isDark ? 'rgba(255,255,255,0.06)' : '#ffffff';
  const borderCard = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(18,59,122,0.08)';
  const textColor = isDark ? '#ffffff' : TEXT_DARK;
  const iconBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(18,59,122,0.08)';
  const iconColor = isDark ? '#ffffff' : BLUE;
  const barColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(18,59,122,0.15)';

  return (
    <BrowserFrame title="Documentos SGC" isDark={isDark}>
      <Box sx={{ p: { xs: 2, md: 3 }, display: 'grid', gap: 1.5 }}>
        {['Manual SGC', 'Certificaciones', 'Políticas internas'].map((label, index) => (
          <Box key={label} sx={{ p: 1.5, borderRadius: 2, backgroundColor: index === 0 ? (isDark ? 'rgba(18,59,122,0.4)' : 'rgba(18,59,122,0.05)') : bgCard, border: `1px solid ${borderCard}`, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: iconBg, color: iconColor }}>
              <FileText size={20} strokeWidth={2} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ color: textColor, fontSize: 14, fontWeight: 900 }}>{label}</Typography>
              <Box sx={{ mt: 1, width: index === 2 ? '50%' : '75%', height: 6, borderRadius: 99, backgroundColor: barColor }} />
            </Box>
            <MiniBadge isDark={isDark}>{index === 0 ? 'SGC' : 'Vigente'}</MiniBadge>
          </Box>
        ))}
      </Box>
    </BrowserFrame>
  );
}

function AccessVisual({ isDark }) {
  const bgCard = isDark ? 'rgba(255,255,255,0.06)' : '#ffffff';
  const borderCard = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(18,59,122,0.08)';
  const textColor = isDark ? '#ffffff' : TEXT_DARK;
  const subtextColor = isDark ? 'rgba(255,255,255,0.6)' : TEXT_MUTED;
  const iconBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(18,59,122,0.08)';
  const iconColor = isDark ? '#ffffff' : BLUE;

  return (
    <BrowserFrame title="Perfiles y accesos" isDark={isDark}>
      <Box sx={{ p: { xs: 2, md: 3 }, display: 'grid', gap: 1.5 }}>
        {[
          ['Administración', 'Acceso completo', ShieldCheck],
          ['Nutrición', 'Documentos y salud', UsersRound],
          ['Colaborador', 'Herramientas habilitadas', CheckCircle2]
        ].map(([role, detail, Icon], index) => (
          <Box key={role} sx={{ display: 'grid', gridTemplateColumns: '40px 1fr auto', alignItems: 'center', gap: 2, p: 1.5, borderRadius: 2, backgroundColor: bgCard, border: `1px solid ${borderCard}` }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: index === 0 ? (isDark ? 'rgba(245,131,0,0.15)' : 'rgba(245,131,0,0.1)') : iconBg, color: index === 0 ? ORANGE : iconColor }}>
              <Icon size={20} strokeWidth={2} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ color: textColor, fontSize: 14, fontWeight: 900 }}>{role}</Typography>
              <Typography sx={{ mt: 0.25, color: subtextColor, fontSize: 13, fontWeight: 600 }}>{detail}</Typography>
            </Box>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: index === 2 ? '#16a34a' : ORANGE }} />
          </Box>
        ))}
      </Box>
    </BrowserFrame>
  );
}

function FunctionalVisual({ type, isDark }) {
  if (type === 'documents') return <DocumentsVisual isDark={isDark} />;
  if (type === 'access') return <AccessVisual isDark={isDark} />;
  return <QualityVisual isDark={isDark} />;
}

function BenefitItem({ icon: Icon, title, description }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'center', sm: 'flex-start' }, textAlign: { xs: 'center', sm: 'left' }, gap: 2 }}>
      <Box sx={{ width: 48, height: 48, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)', color: '#ffffff' }}>
        <Icon size={24} strokeWidth={2} />
      </Box>
      <Box>
        <Typography component="h3" sx={{ color: '#ffffff', fontSize: { xs: 17, md: 18 }, fontWeight: 900, mb: 1 }}>
          {title}
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: { xs: 14, md: 15 }, lineHeight: 1.5 }}>
          {description}
        </Typography>
      </Box>
    </Box>
  );
}

function FunctionalBlock({ title, description, visual, reverse = false, index = 0 }) {
  const isDark = index === 1; // El bloque central es oscuro, los otros son gris azulado suave (no blanco)
  return (
    <Box
      component="section"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        gap: { xs: 5, md: 8 },
        alignItems: 'center',
        py: { xs: 6, md: 8 },
        px: { xs: 2.5, sm: 4, md: 6 },
        my: { xs: 3, md: 4 },
        borderRadius: { xs: 3, md: 4 },
        background: isDark ? `linear-gradient(135deg, ${BLUE_DARK} 0%, ${BLUE} 100%)` : `linear-gradient(135deg, ${BLUE_SOFT} 0%, ${BLUE_SURFACE} 100%)`, // Reemplaza blanco genérico
        border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(18,59,122,0.06)',
        boxShadow: isDark ? '0 12px 32px rgba(0,0,0,0.2)' : '0 12px 32px rgba(18,59,122,0.06)'
      }}
    >
      <Box sx={{ order: { xs: 1, md: reverse ? 2 : 1 }, maxWidth: 520 }}>
        <Typography component="h2" sx={{ color: isDark ? '#ffffff' : TEXT_DARK, fontSize: { xs: 26, sm: 32, md: 36 }, fontWeight: 900, lineHeight: 1.15, mb: 2 }}>
          {title}
        </Typography>
        <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.8)' : TEXT_MUTED, fontSize: { xs: 15, sm: 16, md: 17 }, lineHeight: 1.6 }}>
          {description}
        </Typography>
      </Box>
      <Box sx={{ order: { xs: 2, md: reverse ? 1 : 2 } }}>
        <FunctionalVisual type={visual} isDark={isDark} />
      </Box>
    </Box>
  );
}

export default function PublicLanding({ onLogin, onRegister }) {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: PAGE, overflowX: 'hidden' }}>
      <Header onLogin={onLogin} onRegister={onRegister} />

      <Box component="main">
        {/* HERO */}
        <Box
          component="section"
          sx={{
            background: `radial-gradient(circle at 78% 18%, rgba(59,130,246,0.15), transparent 30%), linear-gradient(145deg, ${BLUE_DEEP} 0%, ${BLUE} 58%, ${BLUE_DARK} 100%)`,
            borderBottom: '1px solid rgba(255,255,255,0.05)'
          }}
        >
          <Box
            sx={{
              width: '100%',
              maxWidth: 1240,
              mx: 'auto',
              px: { xs: 2.5, sm: 4, md: 5 }, // Padding lateral mobile 20px
              py: { xs: 6, sm: 8, md: 10 },
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: { xs: 6, md: 8 },
              alignItems: 'center'
            }}
          >
            <Box sx={{ maxWidth: 560 }}> {/* Ancho máximo ajustado para respirar */}
              <Typography sx={{ color: ORANGE, fontSize: { xs: 12.5, sm: 13 }, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1.5, mb: 2 }}>
                ServiFood Catering
              </Typography>
              <Typography component="h1" sx={{ color: '#ffffff', fontSize: { xs: 32, sm: 44, md: 52 }, fontWeight: 900, lineHeight: 1.1, mb: 3 }}>
                La operación de ServiFood, organizada en un solo lugar.
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: { xs: 16, sm: 18, md: 19 }, lineHeight: 1.6, mb: 4 }}>
                Accedé a documentación, indicadores y herramientas internas según tu perfil.
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: { xs: '100%', sm: 'fit-content' } }}>
                <Button
                  variant="contained"
                  onClick={onLogin}
                  sx={{ ...primaryButtonSx, minHeight: { xs: 48, sm: 52 }, px: { xs: 3, sm: 4 }, width: '100%' }}
                >
                  Ingresar a la plataforma
                </Button>
                <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: { xs: 12.5, sm: 13.5 }, textAlign: 'center', mt: 0.5 }}>
                  Cada cuenta visualiza únicamente las herramientas habilitadas.
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: { xs: 'center', md: 'flex-end' } }}>
              <HeroMockup />
            </Box>
          </Box>
        </Box>

        {/* FRANJA DE BENEFICIOS */}
        <Box component="section" sx={{ background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_DARK} 100%)` }}>
          <Box
            sx={{
              width: '100%',
              maxWidth: 1240,
              mx: 'auto',
              px: { xs: 2.5, sm: 4, md: 5 },
              py: { xs: 5, sm: 6, md: 7 }, // Mayor separación para que el bloque sea compacto pero respire
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              gap: { xs: 4, md: 6 }
            }}
          >
            {benefits.map((benefit) => (
              <BenefitItem key={benefit.title} {...benefit} />
            ))}
          </Box>
        </Box>

        {/* BLOQUES FUNCIONALES */}
        <Box sx={{ width: '100%', maxWidth: 1240, mx: 'auto', px: { xs: 2.5, sm: 4, md: 5 }, py: { xs: 2, md: 4 } }}>
          {functionalBlocks.map((block, index) => (
            <FunctionalBlock key={block.title} {...block} index={index} />
          ))}
        </Box>

        {/* CTA FINAL */}
        <Box component="section" sx={{ backgroundColor: BLUE_DEEP, color: '#ffffff', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <Box
            sx={{
              width: '100%',
              maxWidth: 1240,
              mx: 'auto',
              px: { xs: 2.5, sm: 4, md: 5 },
              py: { xs: 6, sm: 8, md: 10 }, // Bloque más compacto
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 3
            }}
          >
            <Box sx={{ maxWidth: 720 }}>
              <Typography component="h2" sx={{ color: '#ffffff', fontSize: { xs: 28, sm: 36, md: 42 }, fontWeight: 900, lineHeight: 1.15, mb: 2 }}>
                Todo lo necesario para acompañar la operación diaria.
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: { xs: 15, sm: 17 }, lineHeight: 1.6 }}>
                Ingresá con tu cuenta y accedé a las herramientas habilitadas para tu perfil.
              </Typography>
            </Box>
            <Button variant="contained" onClick={onLogin} sx={{ ...primaryButtonSx, mt: 1 }}>
              Ingresar
            </Button>
          </Box>
        </Box>
      </Box>

      {/* FOOTER MINIMO */}
      <Box component="footer" sx={{ backgroundColor: '#040b24', color: '#ffffff', py: 3 }}>
        <Box
          sx={{
            width: '100%',
            maxWidth: 1240,
            mx: 'auto',
            px: { xs: 2.5, sm: 4, md: 5 },
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            textAlign: { xs: 'center', sm: 'left' },
            gap: 1
          }}
        >
          <Typography sx={{ color: '#ffffff', fontSize: { xs: 14, md: 15 }, fontWeight: 800 }}>
            ServiFood Catering
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: { xs: 13, md: 14 } }}>
            Plataforma interna de gestión y cumplimiento.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import {
  BarChart3,
  ClipboardCheck,
  FileText,
  FolderCheck,
  HeartPulse,
  ShieldCheck,
  UserRound,
  UsersRound
} from 'lucide-react';
import servifoodLogo from '../assets/servifood_logo_white_text_HQ.png';

function FeatureLine({ icon: Icon, children }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.1, color: 'rgba(236,244,255,0.88)', fontSize: 14.5 }}>
      <Icon size={18} strokeWidth={2.2} aria-hidden="true" />
      <span>{children}</span>
    </Box>
  );
}

function AccessBlock({ icon: Icon, title, features, cta, onClick, accent = '#fb8c00' }) {
  return (
    <Box
      sx={{
        borderRadius: 2,
        p: { xs: 2.4, md: 2.8 },
        backgroundColor: 'rgba(255,255,255,0.11)',
        border: '1px solid rgba(255,255,255,0.18)',
        boxShadow: '0 12px 26px rgba(8, 20, 58, 0.16)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 310
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4, mb: 2.2 }}>
        <Box
          sx={{
            width: 46,
            height: 46,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            backgroundColor: `${accent}33`,
            border: `1px solid ${accent}66`
          }}
        >
          <Icon size={24} strokeWidth={2.2} aria-hidden="true" />
        </Box>
        <Typography sx={{ color: '#ffffff', fontWeight: 850, fontSize: { xs: 22, md: 24 }, lineHeight: 1.15 }}>
          {title}
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gap: 1.25, flex: 1 }}>
        {features.map((item) => (
          <FeatureLine key={item.text} icon={item.icon}>{item.text}</FeatureLine>
        ))}
      </Box>

      <Button
        variant="contained"
        onClick={onClick}
        sx={{
          mt: 3,
          py: 1.15,
          fontWeight: 800,
          borderRadius: 1.5,
          backgroundColor: accent,
          '&:hover': { backgroundColor: accent }
        }}
      >
        {cta}
      </Button>
    </Box>
  );
}

export default function PublicLanding({ onLogin, onRegister }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        px: 2,
        py: { xs: 4, md: 5 },
        display: 'flex',
        justifyContent: 'center',
        background: 'linear-gradient(155deg, #101f63 0%, #203d8f 54%, #2d52af 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 1120, position: 'relative', zIndex: 1 }}>
        <Box sx={{ textAlign: 'center', maxWidth: 860, mx: 'auto' }}>
          <Box
            component="img"
            src={servifoodLogo}
            alt="ServiFood Catering Logo"
            sx={{
              width: { xs: 150, md: 180 },
              height: { xs: 150, md: 180 },
              objectFit: 'contain',
              display: 'block',
              mx: 'auto'
            }}
          />
          <Typography
            component="h1"
            sx={{
              mt: { xs: 1.5, md: 2 },
              fontSize: { xs: 35, sm: 44, md: 54 },
              fontWeight: 900,
              color: '#ffffff',
              lineHeight: 1.05
            }}
          >
            ServiFood — Plataforma de gestión y cumplimiento
          </Typography>
          <Typography
            sx={{
              mt: 2,
              color: 'rgba(236,244,255,0.84)',
              fontSize: { xs: 16, md: 18 },
              maxWidth: 760,
              mx: 'auto',
              lineHeight: 1.6
            }}
          >
            Centralización de declaraciones de salud, documentación del sistema de gestión y herramientas internas de análisis.
          </Typography>
        </Box>

        <Box sx={{ mt: { xs: 4.5, md: 5.5 }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
          <AccessBlock
            icon={UserRound}
            title="Portal del colaborador"
            cta="Ingresar como colaborador"
            onClick={onLogin}
            accent="#10b981"
            features={[
              { icon: HeartPulse, text: 'Declaración de salud.' },
              { icon: ShieldCheck, text: 'Consulta de políticas.' },
              { icon: ClipboardCheck, text: 'Acceso simple.' }
            ]}
          />
          <AccessBlock
            icon={UsersRound}
            title="Gestión interna"
            cta="Acceso interno"
            onClick={onLogin}
            accent="#fb8c00"
            features={[
              { icon: FolderCheck, text: 'Documentos SGC.' },
              { icon: FileText, text: 'Certificaciones.' },
              { icon: BarChart3, text: 'Análisis e indicadores.' },
              { icon: ShieldCheck, text: 'Herramientas para personal autorizado.' }
            ]}
          />
        </Box>

        {onRegister && (
          <Box sx={{ mt: 3.5, textAlign: 'center' }}>
            <Button
              variant="outlined"
              onClick={onRegister}
              sx={{
                px: 2.6,
                py: 1.05,
                fontWeight: 750,
                borderRadius: 1.5,
                color: '#f1f6ff',
                borderColor: 'rgba(241,246,255,0.62)',
                backgroundColor: 'rgba(255,255,255,0.03)',
                '&:hover': {
                  borderColor: '#ffffff',
                  backgroundColor: 'rgba(255,255,255,0.08)'
                }
              }}
            >
              Solicitar registro
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}

import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import RuleRoundedIcon from '@mui/icons-material/RuleRounded';
import PieChartRoundedIcon from '@mui/icons-material/PieChartRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import servifoodLogo from '../assets/servifood_logo_white_text_HQ.png';

const drawerWidth = 260;

const sectionIcons = {
  panel: <DashboardRoundedIcon />,
  upload: <UploadFileRoundedIcon />,
  history: <HistoryRoundedIcon />,
  results: <InsightsRoundedIcon />,
  rules: <RuleRoundedIcon />,
  charts: <PieChartRoundedIcon />,
  profile: <PersonRoundedIcon />,
  tutorial: <SchoolRoundedIcon />,
  adminUsers: <AdminPanelSettingsRoundedIcon />
};

export default function AppLayout({ user, onLogout, sections, currentSection, onSelectSection, children }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = useMemo(() => {
    const source = user?.name || user?.email || 'U';
    const parts = source.split(' ').filter(Boolean);
    return (parts[0]?.[0] || 'U') + (parts[1]?.[0] || '');
  }, [user]);

  const sectionMeta = useMemo(() => ({
    panel: {
      title: 'Panel Principal',
      subtitle: 'Subí archivos y gestioná tus resultados desde un solo flujo'
    },
    history: {
      title: 'Historial',
      subtitle: 'Consultá análisis anteriores y recuperá resultados'
    },
    charts: {
      title: 'Gráficos',
      subtitle: 'Visualizá patrones por gravedad, categoría y sector'
    },
    profile: {
      title: 'Mi Perfil',
      subtitle: 'Actualizá tu información de usuario'
    },
    tutorial: {
      title: 'Tutorial',
      subtitle: 'Guía rápida para usar la plataforma'
    },
    rules: {
      title: 'Configurar Reglas',
      subtitle: 'Administrá reglas de clasificación y acciones'
    },
    adminUsers: {
      title: 'Gestión de usuarios',
      subtitle: 'Controlá roles y estado de acceso del equipo'
    }
  }), []);

  const currentMeta = sectionMeta[currentSection] || {
    title: 'Análisis de Calidad',
    subtitle: 'Plataforma de análisis de calidad'
  };

  const handleSelect = (id) => {
    onSelectSection(id);
    if (!isDesktop) {
      setMobileOpen(false);
    }
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box
        sx={{
          px: 2.25,
          pt: 2.5,
          pb: 2
        }}
      >
        <Box
          component="img"
          src={servifoodLogo}
          alt="ServiFood Logo"
          sx={{
            width: '100%',
            maxWidth: 180,
            height: 92,
            objectFit: 'contain',
            display: 'block',
            mx: 'auto'
          }}
        />
        <Typography sx={{ mt: 1.25, color: 'rgba(255,255,255,0.88)', fontSize: 12, textAlign: 'center', fontWeight: 600 }}>
          Plataforma de análisis de calidad
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.14)' }} />

      <List sx={{ px: 1.5, py: 2.25, flex: 1 }}>
        {sections.map((section) => {
          const selected = currentSection === section.id;
          return (
            <ListItemButton
              key={section.id}
              selected={selected}
              onClick={() => handleSelect(section.id)}
              disabled={section.disabled}
              sx={{
                mb: 0.6,
                px: 1.4,
                py: 1,
                borderRadius: 2,
                '&.Mui-selected': {
                  backgroundColor: 'rgba(255, 255, 255, 0.16)',
                  color: '#ffffff',
                  '& .MuiListItemIcon-root': { color: '#ffffff' },
                  '& .MuiListItemText-primary': { fontWeight: 700 }
                },
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.11)'
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: selected ? '#ffffff' : 'rgba(255,255,255,0.74)' }}>
                {sectionIcons[section.id]}
              </ListItemIcon>
              <ListItemText
                primary={section.label}
                primaryTypographyProps={{ fontWeight: selected ? 700 : 600, fontSize: 14, color: selected ? '#ffffff' : 'rgba(255,255,255,0.86)' }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ px: 1.75, pb: 2.25 }}>
        <Box
          sx={{
            borderRadius: 2,
            border: '1px solid rgba(255,255,255,0.16)',
            backgroundColor: 'rgba(255,255,255,0.08)',
            px: 1.25,
            py: 1.05
          }}
        >
          <Typography sx={{ color: 'rgba(236,244,255,0.92)', fontWeight: 700, fontSize: 13.5 }}>
            Hola, {user?.name || 'equipo'}
          </Typography>
          <Typography sx={{ color: 'rgba(225,236,255,0.82)', fontSize: 12.5, mt: 0.2 }}>
            Sesión activa en la plataforma
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant={isDesktop ? 'permanent' : 'temporary'}
          open={isDesktop ? true : mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              borderRight: '1px solid rgba(255,255,255,0.14)',
              background: 'linear-gradient(180deg, #14316f 0%, #1c428d 100%)',
              boxShadow: 'none'
            }
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, width: { md: `calc(100% - ${drawerWidth}px)` }, minHeight: '100vh' }}>
        <Box sx={{ px: { xs: 1.5, sm: 2.5 }, pt: { xs: 1.5, sm: 2.25 } }}>
          <Box
            sx={{
              backgroundColor: '#ffffff',
              borderRadius: 2.5,
              border: '1px solid #dce6f6',
              px: { xs: 1.2, sm: 2.2 },
              py: { xs: 1.25, sm: 1.6 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.25
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.1, minWidth: 0 }}>
              {!isDesktop && (
                <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ color: 'primary.main' }}>
                  <MenuRoundedIcon />
                </IconButton>
              )}
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 900, fontSize: { xs: 23, sm: 28 }, color: '#0f2a66', lineHeight: 1.05 }}>
                  Análisis de Calidad
                </Typography>
                <Typography sx={{ mt: 0.35, color: '#516181', fontSize: { xs: 13.5, sm: 14.5 } }}>
                  Control y clasificación de incidencias en archivos Excel
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              startIcon={<LogoutRoundedIcon />}
              onClick={onLogout}
              sx={{ borderColor: 'rgba(29,78,216,0.35)', color: '#1f3a73', '&:hover': { borderColor: '#1d4ed8', backgroundColor: 'rgba(29,78,216,0.06)' } }}
            >
              Salir
            </Button>
          </Box>

          <Box
            sx={{
              mt: 1.1,
              mb: 2.35,
              backgroundColor: '#ffffff',
              borderRadius: 2.2,
              border: '1px solid #e4ecfa',
              px: { xs: 1.2, sm: 2 },
              py: 1.05,
              display: 'flex',
              alignItems: { xs: 'flex-start', sm: 'center' },
              justifyContent: 'space-between',
              gap: 1,
              flexDirection: { xs: 'column', sm: 'row' }
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 800, color: '#17346f', fontSize: { xs: 15.5, sm: 16.5 } }}>
                {currentMeta.title}
              </Typography>
              <Typography sx={{ color: '#637390', fontSize: 13.5, mt: 0.2 }}>
                {currentMeta.subtitle}
              </Typography>
            </Box>
            <Typography sx={{ color: '#4f6286', fontWeight: 700, fontSize: 13.5 }}>
              {user?.email || initials.toUpperCase()}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ px: { xs: 1.5, sm: 2.5 }, pb: { xs: 2, sm: 2.5 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}

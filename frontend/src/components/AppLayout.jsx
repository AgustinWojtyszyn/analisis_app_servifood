import React, { useMemo, useState } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import RuleRoundedIcon from '@mui/icons-material/RuleRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import servifoodLogo from '../assets/servifood_logo_white_text_HQ.png';

const drawerWidth = 260;

const sectionIcons = {
  panel: <DashboardRoundedIcon />,
  upload: <UploadFileRoundedIcon />,
  history: <HistoryRoundedIcon />,
  results: <InsightsRoundedIcon />,
  rules: <RuleRoundedIcon />
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
          px: 2,
          py: 2,
          background: 'linear-gradient(155deg, #10255c 0%, #1b3f95 58%, #2756ba 100%)'
        }}
      >
        <Box
          sx={{
            borderRadius: 2.5,
            p: 1.5,
            backgroundColor: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.16)',
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          <Box
            component="img"
            src={servifoodLogo}
            alt="ServiFood Logo"
            sx={{
              width: '100%',
              maxWidth: 168,
              height: 88,
              objectFit: 'contain'
            }}
          />
        </Box>
        <Typography sx={{ mt: 1.5, color: 'rgba(255,255,255,0.92)', fontSize: 12, textAlign: 'center', fontWeight: 600 }}>
          Plataforma de análisis de calidad
        </Typography>
      </Box>

      <Divider />

      <List sx={{ px: 1.5, py: 1.75, flex: 1 }}>
        {sections.map((section) => {
          const selected = currentSection === section.id;
          return (
            <ListItemButton
              key={section.id}
              selected={selected}
              onClick={() => handleSelect(section.id)}
              disabled={section.disabled}
              sx={{
                mb: 0.75,
                px: 1.25,
                py: 0.9,
                borderRadius: 2,
                '&.Mui-selected': {
                  backgroundColor: 'rgba(29, 78, 216, 0.14)',
                  color: 'primary.dark',
                  '& .MuiListItemIcon-root': { color: 'primary.dark' },
                  '& .MuiListItemText-primary': { fontWeight: 700 }
                },
                '&:hover': {
                  backgroundColor: 'rgba(29, 78, 216, 0.08)'
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: selected ? 'primary.dark' : 'text.secondary' }}>
                {sectionIcons[section.id]}
              </ListItemIcon>
              <ListItemText
                primary={section.label}
                primaryTypographyProps={{ fontWeight: selected ? 700 : 600, fontSize: 14 }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ p: 2.5, pt: 0 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            background: 'linear-gradient(145deg, #f6f9ff, #eef3ff)',
            border: '1px solid rgba(164, 181, 216, 0.4)'
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
            Usuario activo
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 700, mt: 0.5 }}>
            {user?.name || user?.email}
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          borderBottom: '1px solid',
          borderColor: 'divider',
          backdropFilter: 'blur(6px)',
          backgroundColor: '#ffffff',
          boxShadow: '0 4px 14px rgba(15, 23, 42, 0.08)'
        }}
      >
        <Toolbar sx={{ minHeight: 64 }}>
          {!isDesktop && (
            <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1.5 }}>
              <MenuRoundedIcon />
            </IconButton>
          )}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.1, fontSize: { xs: 22, sm: 26 } }}>
              Análisis de Calidad
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              Control y clasificación de incidencias en archivos Excel
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 34, height: 34, fontSize: 13 }}>{initials.toUpperCase()}</Avatar>
            <Typography variant="body2" sx={{ fontWeight: 700, display: { xs: 'none', sm: 'block' } }}>
              {user?.name || user?.email}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<LogoutRoundedIcon />}
              onClick={onLogout}
              sx={{ borderColor: 'rgba(29, 78, 216, 0.4)', '&:hover': { borderColor: 'primary.main' } }}
            >
              Salir
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

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
              borderRight: '1px solid',
              borderColor: 'divider',
              backgroundColor: '#ffffff',
              boxShadow: '0 8px 22px rgba(12, 33, 74, 0.14)'
            }
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px',
          minHeight: 'calc(100vh - 64px)'
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

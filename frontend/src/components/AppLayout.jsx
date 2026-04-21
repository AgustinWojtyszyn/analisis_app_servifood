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
      <Box sx={{ px: 2.5, py: 3 }}>
        <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: 1.2 }}>
          ServiFood
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5 }}>
          Analysis App
        </Typography>
      </Box>

      <Divider />

      <List sx={{ px: 1.5, py: 2, flex: 1 }}>
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
                borderRadius: 2.5,
                '&.Mui-selected': {
                  backgroundColor: 'rgba(29, 78, 216, 0.12)',
                  color: 'primary.dark',
                  '& .MuiListItemIcon-root': { color: 'primary.dark' }
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
            borderRadius: 2.5,
            background: 'linear-gradient(135deg, rgba(29,78,216,0.12), rgba(14,165,233,0.12))',
            border: '1px solid rgba(148, 163, 184, 0.25)'
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
          backdropFilter: 'blur(10px)',
          backgroundColor: '#ffffff',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.10)'
        }}
      >
        <Toolbar sx={{ minHeight: 72 }}>
          {!isDesktop && (
            <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1.5 }}>
              <MenuRoundedIcon />
            </IconButton>
          )}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
              Análisis de Calidad
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Control y clasificación de incidencias en archivos Excel
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>{initials.toUpperCase()}</Avatar>
            <Typography variant="body2" sx={{ fontWeight: 700, display: { xs: 'none', sm: 'block' } }}>
              {user?.name || user?.email}
            </Typography>
            <Button variant="outlined" startIcon={<LogoutRoundedIcon />} onClick={onLogout}>
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
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.10)'
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
          p: { xs: 2, sm: 3.5 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '72px',
          minHeight: 'calc(100vh - 72px)'
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

import React, { useMemo, useState } from 'react';
import {
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

      <Box sx={{ px: 2.25, pb: 2.25 }}>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.74)', fontWeight: 600 }}>
          Usuario activo
        </Typography>
        <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 700, mt: 0.25 }}>
          {user?.name || user?.email}
        </Typography>
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

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1.75, sm: 2.5 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh'
        }}
      >
        <Box
          sx={{
            mt: { xs: 1.25, sm: 2 },
            mb: { xs: 3.5, sm: 4.25 },
            maxWidth: 860,
            mx: 'auto',
            px: { xs: 1.25, sm: 1.5 },
            py: { xs: 1.1, sm: 1.25 },
            borderRadius: 2.5,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr auto 1fr' },
            alignItems: 'center',
            gap: { xs: 1.5, md: 2.25 }
          }}
        >
          <Box sx={{ display: { xs: 'none', md: 'block' } }} />

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.25, minWidth: 0, position: 'relative' }}>
            {!isDesktop && (
              <IconButton
                edge="start"
                onClick={() => setMobileOpen(true)}
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'rgba(255,255,255,0.95)'
                }}
              >
                <MenuRoundedIcon />
              </IconButton>
            )}
            <Box sx={{ minWidth: 0, textAlign: 'center', px: { xs: 4.5, md: 0 } }}>
              <Typography
                sx={{
                  fontWeight: 900,
                  lineHeight: 1.04,
                  fontSize: { xs: 32, sm: 38 },
                  letterSpacing: '-0.02em',
                  color: '#f8fbff'
                }}
              >
                Análisis de Calidad
              </Typography>
              <Typography
                sx={{
                  mt: 0.65,
                  color: 'rgba(232,242,255,0.86)',
                  fontSize: { xs: 14.5, sm: 16.5 },
                  fontWeight: 500
                }}
              >
                Control y clasificación de incidencias en archivos Excel
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', md: 'flex-end' }, gap: 1.2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 34, height: 34, fontSize: 13 }}>{initials.toUpperCase()}</Avatar>
            <Typography variant="body2" sx={{ fontWeight: 700, display: { xs: 'none', sm: 'block' }, color: '#f1f6ff' }}>
              {user?.name || user?.email}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<LogoutRoundedIcon />}
              onClick={onLogout}
              sx={{
                color: '#eaf2ff',
                borderColor: 'rgba(234,242,255,0.44)',
                '&:hover': { borderColor: '#ffffff', backgroundColor: 'rgba(255,255,255,0.08)' }
              }}
            >
              Salir
            </Button>
          </Box>
        </Box>
        {children}
      </Box>
    </Box>
  );
}

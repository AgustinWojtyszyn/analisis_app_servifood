import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Collapse,
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
import HealthAndSafetyRoundedIcon from '@mui/icons-material/HealthAndSafetyRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import AssignmentLateRoundedIcon from '@mui/icons-material/AssignmentLateRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import RestaurantMenuRoundedIcon from '@mui/icons-material/RestaurantMenuRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import servifoodLogo from '../assets/servifood_logo_white_text_HQ.png';

const drawerWidth = 260;

const sectionIcons = {
  collaboratorPortal: <HealthAndSafetyRoundedIcon />,
  internalManagement: <DashboardRoundedIcon />,
  upload: <UploadFileRoundedIcon />,
  history: <HistoryRoundedIcon />,
  results: <InsightsRoundedIcon />,
  rules: <RuleRoundedIcon />,
  charts: <PieChartRoundedIcon />,
  annualAnalysis: <CalendarMonthRoundedIcon />,
  customerNonconformities: <AssignmentLateRoundedIcon />,
  profile: <PersonRoundedIcon />,
  tutorial: <SchoolRoundedIcon />,
  adminUsers: <AdminPanelSettingsRoundedIcon />,
  declaration: <HealthAndSafetyRoundedIcon />,
  policies: <DescriptionRoundedIcon />,
  declarationHistory: <HistoryRoundedIcon />,
  adminHealthDeclarations: <AssignmentRoundedIcon />,
  nutritionModules: <RestaurantMenuRoundedIcon />,
  certifications: <WorkspacePremiumRoundedIcon />
};

const menuGroups = [
  {
    key: 'main',
    ids: ['collaboratorPortal', 'internalManagement', 'upload', 'history', 'charts', 'annualAnalysis', 'customerNonconformities']
  },
  {
    key: 'internal',
    label: 'Gestión interna',
    ids: ['declaration', 'adminHealthDeclarations', 'policies', 'nutritionModules', 'certifications']
  },
  {
    key: 'admin',
    label: 'Administración',
    ids: ['rules', 'adminUsers']
  },
  {
    key: 'bottom',
    ids: ['profile', 'tutorial']
  }
];

const collapsibleGroupKeys = ['internal', 'admin'];
const menuStorageKey = 'servifood.sidebar.openGroups';

function readOpenGroupsFromSession() {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.sessionStorage.getItem(menuStorageKey) || '{}') || {};
  } catch {
    return {};
  }
}

export default function AppLayout({ user, onLogout, sections, currentSection, onSelectSection, children }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState(() => readOpenGroupsFromSession());

  const initials = useMemo(() => {
    const source = user?.name || user?.email || 'U';
    const parts = source.split(' ').filter(Boolean);
    return (parts[0]?.[0] || 'U') + (parts[1]?.[0] || '');
  }, [user]);

  const sectionMeta = useMemo(() => ({
    collaboratorPortal: {
      title: 'Portal del colaborador',
      subtitle: 'Declaración de salud y políticas de seguridad'
    },
    internalManagement: {
      title: 'Gestión interna',
      subtitle: 'Accesos operativos habilitados según rol'
    },
    history: {
      title: 'Historial',
      subtitle: 'Consultá análisis anteriores y recuperá resultados'
    },
    charts: {
      title: 'Gráficos',
      subtitle: 'Visualiza patrones por area, tipo de desvio e ISO 22000'
    },
    annualAnalysis: {
      title: 'Análisis anual',
      subtitle: 'Resumen, calidad, logística y tabla completa de desvíos anuales'
    },
    customerNonconformities: {
      title: 'No conformidades de clientes',
      subtitle: 'Carga y análisis de reclamos de clientes desde Excel'
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
    },
    declaration: {
      title: 'Declaración de Salud',
      subtitle: 'Registro diario de salud del personal'
    },
    policies: {
      title: 'Políticas',
      subtitle: 'Lectura y aceptación de políticas internas'
    },
    declarationHistory: {
      title: 'Mi Historial',
      subtitle: 'Declaraciones de salud registradas'
    },
    adminHealthDeclarations: {
      title: 'Gestor Declaraciones',
      subtitle: 'Administración de solicitudes de salud del personal'
    },
    nutritionModules: {
      title: 'Documentos SGC',
      subtitle: 'Biblioteca y gestión documental del SGC'
    },
    certifications: {
      title: 'Certificaciones',
      subtitle: 'Control de vencimientos y triggers de aviso'
    }
  }), []);

  const isExecutiveHome = false;
  const currentMeta = sectionMeta[currentSection] || {
    title: 'Análisis de Desvíos',
    subtitle: 'Control y clasificación de desvíos de inocuidad, logística y legal'
  };

  const sectionById = useMemo(() => new Map(sections.map((section) => [section.id, section])), [sections]);
  const isCollaboratorMenu = sectionById.has('collaboratorPortal')
    && !sectionById.has('internalManagement')
    && !sectionById.has('upload');
  const effectiveMenuGroups = useMemo(() => (
    isCollaboratorMenu
      ? [{ key: 'main', ids: ['collaboratorPortal', 'declaration', 'policies'] }]
      : menuGroups
  ), [isCollaboratorMenu]);
  const groupedSections = useMemo(() => {
    return effectiveMenuGroups.map((group) => ({
      ...group,
      items: group.ids.map((id) => sectionById.get(id)).filter(Boolean)
    }));
  }, [effectiveMenuGroups, sectionById]);

  const currentGroupKey = useMemo(() => {
    return effectiveMenuGroups.find((group) => group.ids.includes(currentSection))?.key || null;
  }, [currentSection, effectiveMenuGroups]);

  const isGroupOpen = (groupKey) => {
    return currentGroupKey === groupKey || Boolean(openGroups[groupKey]);
  };

  const toggleGroup = (groupKey) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [groupKey]: !prev[groupKey] };
      try {
        window.sessionStorage.setItem(menuStorageKey, JSON.stringify(next));
      } catch {
        // Session state is optional.
      }
      return next;
    });
  };

  const handleSelect = (id) => {
    onSelectSection(id);
    if (!isDesktop) {
      setMobileOpen(false);
    }
  };

  const renderMenuItem = (section) => {
    const selected = currentSection === section.id;
    return (
      <ListItemButton
        key={section.id}
        selected={selected}
        onClick={() => handleSelect(section.id)}
        disabled={section.disabled}
        sx={{
          mb: 0.35,
          px: 1.2,
          py: 0.72,
          minHeight: 40,
          borderRadius: 1.7,
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
        <ListItemIcon sx={{ minWidth: 32, color: selected ? '#ffffff' : 'rgba(255,255,255,0.74)' }}>
          {sectionIcons[section.id]}
        </ListItemIcon>
        <ListItemText
          primary={section.id === 'declaration' && !isCollaboratorMenu ? 'Mi Declaración Salud' : section.label}
          primaryTypographyProps={{ fontWeight: selected ? 700 : 600, fontSize: 13.5, color: selected ? '#ffffff' : 'rgba(255,255,255,0.86)' }}
        />
      </ListItemButton>
    );
  };

  const renderGroup = (group) => {
    if (!group.items.length) return null;
    if (!collapsibleGroupKeys.includes(group.key)) {
      return group.items.map(renderMenuItem);
    }

    const open = isGroupOpen(group.key);
    const selected = group.ids.includes(currentSection);
    return (
      <Box key={group.key} sx={{ mb: 0.45 }}>
        <ListItemButton
          onClick={() => toggleGroup(group.key)}
          selected={selected}
          sx={{
            mb: 0.35,
            px: 1.2,
            py: 0.72,
            minHeight: 40,
            borderRadius: 1.7,
            '&.Mui-selected': {
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              '& .MuiListItemText-primary': { fontWeight: 700 }
            },
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.11)'
            }
          }}
        >
          <ListItemText
            primary={group.label}
            primaryTypographyProps={{ fontWeight: selected ? 700 : 650, fontSize: 13.2, color: selected ? '#ffffff' : 'rgba(255,255,255,0.86)' }}
          />
          <KeyboardArrowDownRoundedIcon
            sx={{
              fontSize: 19,
              color: 'rgba(255,255,255,0.72)',
              transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform 160ms ease'
            }}
          />
        </ListItemButton>
        <Collapse in={open} timeout="auto" unmountOnExit>
          <Box sx={{ pl: 0.5 }}>
            {group.items.map(renderMenuItem)}
          </Box>
        </Collapse>
      </Box>
    );
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box
        sx={{
          px: 2,
          pt: 1.6,
          pb: 1.25
        }}
      >
        <Box
          component="img"
          src={servifoodLogo}
          alt="ServiFood Logo"
          sx={{
            width: '100%',
            maxWidth: 150,
            height: 68,
            objectFit: 'contain',
            display: 'block',
            mx: 'auto'
          }}
        />
        <Box
          aria-hidden="true"
          sx={{
            display: isExecutiveHome ? 'none' : 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 0.75,
            mt: 0.65,
            color: '#f6c45a',
            fontSize: 12,
            lineHeight: 1
          }}
        >
          <Box component="span">★</Box>
          <Box component="span">★</Box>
          <Box component="span">★</Box>
        </Box>
        <Typography sx={{ display: isExecutiveHome ? 'none' : 'block', mt: 0.85, color: 'rgba(255,255,255,0.88)', fontSize: 11.5, textAlign: 'center', fontWeight: 600 }}>
          Plataforma de análisis de desvíos
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.14)' }} />

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        <List sx={{ px: 1.25, py: 1.25 }}>
          {groupedSections.find((group) => group.key === 'main')?.items.map(renderMenuItem)}
          {groupedSections
            .filter((group) => collapsibleGroupKeys.includes(group.key))
            .map(renderGroup)}
          <Box sx={{ mt: 0.7, pt: 0.7, borderTop: '1px solid rgba(255,255,255,0.10)' }}>
            {groupedSections.find((group) => group.key === 'bottom')?.items.map(renderMenuItem)}
          </Box>
        </List>
      </Box>

      <Box sx={{ px: 1.75, pt: 1.1, pb: 1.5 }}>
        <Box
          sx={{
            borderRadius: 2,
            border: isExecutiveHome ? 'none' : '1px solid rgba(255,255,255,0.16)',
            backgroundColor: isExecutiveHome ? 'transparent' : 'rgba(255,255,255,0.08)',
            px: 1.25,
            py: 1.05
          }}
        >
          <Typography sx={{ color: 'rgba(236,244,255,0.92)', fontWeight: 700, fontSize: 13.5 }}>
            Hola, {user?.name || 'equipo'}
          </Typography>
          <Typography sx={{ display: isExecutiveHome ? 'none' : 'block', color: 'rgba(225,236,255,0.82)', fontSize: 12.5, mt: 0.2 }}>
            Sesión activa en la plataforma
          </Typography>
          {isExecutiveHome && (
            <Button
              onClick={onLogout}
              startIcon={<LogoutRoundedIcon sx={{ fontSize: '16px !important' }} />}
              sx={{
                mt: 0.7,
                px: 0,
                minWidth: 0,
                color: 'rgba(229,238,250,0.72)',
                fontSize: 11.5,
                fontWeight: 700,
                textTransform: 'none',
                '&:hover': { bgcolor: 'transparent', color: '#ffffff' }
              }}
            >
              Salir
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', ...(isExecutiveHome ? { bgcolor: '#f6f7f9' } : {}) }}>
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
              background: isExecutiveHome ? 'linear-gradient(180deg, #102b52 0%, #173a67 100%)' : 'linear-gradient(180deg, #14316f 0%, #1c428d 100%)',
              ...(isExecutiveHome ? {
                borderRadius: 0,
                '& .MuiListItemText-primary': { fontSize: 12.5, fontWeight: 400, color: '#b9c5d6' },
                '& .MuiListItemIcon-root': { color: '#8597b1' },
                '& .MuiListItemIcon-root .MuiSvgIcon-root': { fontSize: 19 },
                '& .MuiListItemButton-root.Mui-selected': { bgcolor: '#ffffff0d' },
                '& .MuiListItemButton-root.Mui-selected .MuiListItemText-primary': { color: '#fff', fontWeight: 600 }
              } : {}),
              boxShadow: 'none'
            }
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, width: { md: `calc(100% - ${drawerWidth}px)` }, minHeight: '100vh' }}>
        <Box sx={{
          display: isExecutiveHome ? { xs: 'block', md: 'none' } : 'block',
          px: isExecutiveHome ? { xs: 1.5, sm: 2.5, xl: 4 } : { xs: 1.5, sm: 2.5 },
          pt: { xs: 1.2, sm: 1.5 },
          pb: isExecutiveHome ? 0.5 : { xs: 1.1, sm: 1.35 }
        }}>
          <Box
            sx={{
              minHeight: isExecutiveHome ? 38 : { xs: 62, sm: 66 },
              backgroundColor: '#ffffff',
              borderRadius: 2.4,
              border: isExecutiveHome ? 'none' : '1px solid #dce6f6',
              px: { xs: 1.2, sm: 1.7 },
              py: { xs: 0.9, sm: 1 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.2
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
              {!isDesktop && (
                <IconButton
                  edge="start"
                  aria-label="Abrir menú"
                  onClick={() => setMobileOpen(true)}
                  sx={{ color: 'primary.main', p: 0.75 }}
                >
                  <MenuRoundedIcon />
                </IconButton>
              )}
              <Box sx={{ minWidth: 0, display: isExecutiveHome ? 'none' : 'block' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, minWidth: 0, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                  <Typography
                    sx={{
                      fontWeight: 900,
                      fontSize: { xs: 19, sm: 22 },
                      color: '#0f2a66',
                      lineHeight: 1.05,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Análisis de Calidad
                  </Typography>
                  <Box
                    component="span"
                    sx={{
                      display: { xs: 'none', sm: 'inline-flex' },
                      alignItems: 'center',
                      maxWidth: 220,
                      px: 1,
                      py: 0.35,
                      borderRadius: 99,
                      backgroundColor: '#eef4ff',
                      color: '#28509b',
                      fontSize: 11.5,
                      fontWeight: 800,
                      lineHeight: 1.2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {currentMeta.title}
                  </Box>
                </Box>
                <Typography
                  sx={{
                    mt: 0.28,
                    color: '#4b5f7f',
                    fontSize: { xs: 11.5, sm: 12.5 },
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: { xs: 'normal', sm: 'nowrap' }
                  }}
                >
                  {currentMeta.subtitle}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.6, sm: 1 } }}>
              <Typography
                sx={{
                  display: { xs: 'none', lg: 'block' },
                  maxWidth: 250,
                  color: '#58709a',
                  fontWeight: 700,
                  fontSize: 12,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {user?.email || initials.toUpperCase()}
              </Typography>
              <Button
                variant="outlined"
                startIcon={<LogoutRoundedIcon />}
                onClick={onLogout}
                size="small"
                sx={{
                  minWidth: 0,
                  px: { xs: 1, sm: 1.25 },
                  py: 0.6,
                  borderRadius: 1.7,
                  borderColor: 'rgba(29,78,216,0.28)',
                  color: '#1f3a73',
                  fontSize: 12.5,
                  fontWeight: 800,
                  '&:hover': {
                    borderColor: '#1d4ed8',
                    backgroundColor: 'rgba(29,78,216,0.05)'
                  }
                }}
              >
                Salir
              </Button>
            </Box>
          </Box>
        </Box>

        <Box sx={{ px: { xs: 1.5, sm: 2.5 }, pb: { xs: 2, sm: 2.5 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}

import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
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
import AnalyticsRoundedIcon from '@mui/icons-material/AnalyticsRounded';

const drawerWidth = 256;

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

const defaultMenuGroups = [
  {
    key: 'operation',
    label: 'Operación',
    ids: ['internalManagement', 'upload']
  },
  {
    key: 'reports',
    label: 'Reportes y análisis',
    ids: ['history', 'charts', 'annualAnalysis', 'customerNonconformities']
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
    key: 'account',
    label: 'Cuenta y ayuda',
    ids: ['profile', 'tutorial']
  }
];

const collaboratorMenuGroups = [
  {
    key: 'operation',
    label: 'Operación',
    ids: ['collaboratorPortal', 'declaration', 'policies']
  }
];

export default function AppLayout({ user, onLogout, sections, currentSection, onSelectSection, children }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const sectionMeta = useMemo(() => ({
    collaboratorPortal: {
      title: 'Portal del colaborador',
      subtitle: 'Declaración de salud y políticas de seguridad'
    },
    internalManagement: {
      title: 'Inicio',
      subtitle: 'Accesos operativos habilitados según rol'
    },
    upload: {
      title: 'Cargar archivos',
      subtitle: 'Procesá nuevos archivos para análisis de calidad'
    },
    history: {
      title: 'Historial',
      subtitle: 'Consultá análisis anteriores y recuperá resultados'
    },
    charts: {
      title: 'Gráficos',
      subtitle: 'Visualizá patrones por área, tipo de desvío e ISO 22000'
    },
    annualAnalysis: {
      title: 'Análisis anual',
      subtitle: 'Resumen, calidad, logística y tabla completa de desvíos anuales'
    },
    customerNonconformities: {
      title: 'NC Clientes',
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
      subtitle: 'Control de vencimientos y avisos'
    }
  }), []);

  const currentMeta = sectionMeta[currentSection] || {
    title: 'Análisis de Calidad',
    subtitle: 'Control y clasificación de desvíos de inocuidad, logística y legal'
  };

  const sectionById = useMemo(
    () => new Map(sections.map((section) => [section.id, section])),
    [sections]
  );

  const isCollaboratorMenu = sectionById.has('collaboratorPortal')
    && !sectionById.has('internalManagement')
    && !sectionById.has('upload');

  const groupedSections = useMemo(() => {
    const groups = isCollaboratorMenu ? collaboratorMenuGroups : defaultMenuGroups;
    return groups
      .map((group) => ({
        ...group,
        items: group.ids.map((id) => sectionById.get(id)).filter(Boolean)
      }))
      .filter((group) => group.items.length > 0);
  }, [isCollaboratorMenu, sectionById]);

  const handleSelect = (id) => {
    onSelectSection(id);
    if (!isDesktop) setMobileOpen(false);
  };

  const renderMenuItem = (section) => {
    const selected = currentSection === section.id;
    const Icon = sectionIcons[section.id];

    return (
      <ListItemButton
        key={section.id}
        selected={selected}
        onClick={() => handleSelect(section.id)}
        disabled={section.disabled}
        sx={{
          minHeight: 44,
          mb: 0.5,
          px: 1.5,
          py: 1,
          borderRadius: 1.5,
          color: selected ? '#fff' : '#334155',
          transition: 'background-color 140ms ease, color 140ms ease, box-shadow 140ms ease',
          '& .MuiListItemIcon-root': {
            minWidth: 34,
            color: selected ? '#fff' : '#475569'
          },
          '& .MuiSvgIcon-root': {
            fontSize: 20
          },
          '&.Mui-selected': {
            backgroundColor: '#2563eb',
            color: '#fff',
            boxShadow: '0 5px 12px rgba(37,99,235,.22)'
          },
          '&.Mui-selected:hover': {
            backgroundColor: '#1d4ed8'
          },
          '&:hover': {
            backgroundColor: '#eff6ff',
            color: '#1d4ed8',
            '& .MuiListItemIcon-root': { color: '#2563eb' }
          }
        }}
      >
        <ListItemIcon>{Icon}</ListItemIcon>
        <ListItemText
          primary={section.id === 'declaration' && !isCollaboratorMenu ? 'Mi Declaración Salud' : section.label}
          primaryTypographyProps={{
            fontWeight: selected ? 800 : 700,
            fontSize: 14
          }}
        />
      </ListItemButton>
    );
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#fff' }}>
      <Box
        sx={{
          height: 72,
          px: 2,
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #e2e8f0'
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ lineHeight: 0.92, whiteSpace: 'nowrap' }}>
            <Typography component="span" sx={{ fontSize: 34, fontWeight: 900, letterSpacing: '-.055em', color: '#2563eb' }}>
              Servi
            </Typography>
            <Typography component="span" sx={{ fontSize: 34, fontWeight: 900, letterSpacing: '-.055em', color: '#f97316' }}>
              Food
            </Typography>
          </Box>
          <Box sx={{ mt: 0.55, display: 'flex', alignItems: 'center', gap: 0.65, color: '#94a3b8' }}>
            <AnalyticsRoundedIcon sx={{ fontSize: 12 }} />
            <Typography sx={{ fontSize: 9.5, fontWeight: 900, letterSpacing: '.15em', textTransform: 'uppercase' }}>
              Análisis de Calidad
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', px: 1.5, py: 2 }}>
        {groupedSections.map((group) => (
          <Box component="section" key={group.key} sx={{ mb: 2.2 }}>
            <Typography
              sx={{
                mb: 0.85,
                px: 1.5,
                color: '#94a3b8',
                fontSize: 10.5,
                fontWeight: 900,
                letterSpacing: '.17em',
                textTransform: 'uppercase'
              }}
            >
              {group.label}
            </Typography>
            <List disablePadding>
              {group.items.map(renderMenuItem)}
            </List>
          </Box>
        ))}
      </Box>

      <Box sx={{ borderTop: '1px solid #e2e8f0', px: 1.5, py: 1.5 }}>
        <Button
          fullWidth
          onClick={onLogout}
          startIcon={<LogoutRoundedIcon />}
          sx={{
            justifyContent: 'flex-start',
            minHeight: 44,
            px: 1.5,
            color: '#b91c1c',
            fontSize: 14,
            fontWeight: 800,
            '&:hover': {
              backgroundColor: '#fef2f2'
            }
          }}
        >
          Cerrar sesión
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100dvh',
        background:
          'radial-gradient(circle at 15% 0%, rgba(96,165,250,.18), transparent 30%), linear-gradient(135deg, #2563eb 0%, #1d4ed8 52%, #1e40af 100%)'
      }}
    >
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
              border: 0,
              borderRight: '4px solid #f97316',
              backgroundColor: '#fff',
              color: '#0f172a',
              boxShadow: '0 16px 34px rgba(15,23,42,.16)'
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
          minWidth: 0,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100dvh',
          p: { xs: 1.5, sm: 2, md: 2.5 }
        }}
      >
        <Box sx={{ mx: 'auto', width: '100%', maxWidth: 1600 }}>
          <Box
            sx={{
              minHeight: { xs: 72, sm: 82 },
              mb: 1.6,
              px: { xs: 1.5, sm: 2.2 },
              py: { xs: 1.2, sm: 1.4 },
              borderRadius: 2,
              border: '1px solid rgba(191,219,254,.28)',
              background: 'linear-gradient(90deg, #2563eb 0%, #1e40af 100%)',
              boxShadow: '0 10px 24px rgba(30,64,175,.18)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0 }}>
              {!isDesktop && (
                <IconButton
                  aria-label="Abrir menú"
                  onClick={() => setMobileOpen(true)}
                  sx={{
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,.22)',
                    backgroundColor: 'rgba(255,255,255,.08)',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,.16)' }
                  }}
                >
                  <MenuRoundedIcon />
                </IconButton>
              )}

              <Box sx={{ minWidth: 0 }}>
                <Typography
                  component="h1"
                  sx={{
                    color: '#fff',
                    fontWeight: 900,
                    fontSize: { xs: 24, sm: 31 },
                    lineHeight: 1.05,
                    letterSpacing: '-.035em'
                  }}
                >
                  {currentMeta.title}
                </Typography>
                <Typography
                  sx={{
                    mt: 0.45,
                    color: '#dbeafe',
                    fontSize: { xs: 12, sm: 13.5 },
                    fontWeight: 600,
                    lineHeight: 1.35
                  }}
                >
                  {currentMeta.subtitle}
                </Typography>
              </Box>
            </Box>

            <Typography
              sx={{
                display: { xs: 'none', lg: 'block' },
                maxWidth: 300,
                color: '#dbeafe',
                fontSize: 12.5,
                fontWeight: 700,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {user?.email || user?.name || ''}
            </Typography>
          </Box>

          <Box
            className="analysis-workspace"
            sx={{
              minHeight: 'calc(100dvh - 130px)',
              borderRadius: 2.5,
              border: '1px solid rgba(255,255,255,.28)',
              backgroundColor: '#fff',
              p: { xs: 1.25, sm: 1.6, md: 2 },
              boxShadow: '0 16px 36px rgba(15,23,42,.10)'
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

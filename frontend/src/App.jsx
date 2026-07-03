import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { ThemeProvider, CssBaseline, Box, Typography, Paper } from '@mui/material';
import { appTheme } from './styles/theme';
import LoginForm from './components/LoginForm';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import { SummaryGrid } from './components/Dashboard';
import AnalysisResults from './components/AnalysisResults';
import PublicLanding from './components/PublicLanding';
import CollaboratorPortal from './components/CollaboratorPortal';
import InternalManagementPortal from './components/InternalManagementPortal';
import AppLayout from './components/AppLayout';
import { supabase } from './lib/supabaseClient';
import { useAuth } from './hooks/useAuth';
import {
  getAllowedSectionsForRole,
  getFallbackSectionForRole,
  getInitialPathForRole,
  getInitialSectionForRole,
  normalizeRole,
  ROLES
} from './lib/roleRouting';
import { deleteAnalysis, getAnalysisById, updateAnalysisStatus } from './services/analysis';

const AdminUsersPage = lazy(() => import('./components/AdminUsersPage'));
const AnnualDeviationAnalysisPage = lazy(() => import('./components/AnnualDeviationAnalysisPage'));
const AnalysisHistory = lazy(() => import('./components/AnalysisHistory'));
const CertificationsPage = lazy(() => import('./pages/CertificationsPage'));
const ChartsPage = lazy(() => import('./components/ChartsPage'));
const CustomerNonconformitiesPage = lazy(() => import('./components/CustomerNonconformitiesPage'));
const FileUpload = lazy(() => import('./components/FileUpload'));
const HealthDeclarationHistoryPage = lazy(() => import('./components/HealthDeclarationHistoryPage'));
const HealthDeclarationPage = lazy(() => import('./components/HealthDeclarationPage'));
const HealthDeclarationsAdminPage = lazy(() => import('./components/HealthDeclarationsAdminPage'));
const HealthPoliciesPage = lazy(() => import('./components/HealthPoliciesPage'));
const NutritionModulesPage = lazy(() => import('./components/NutritionModulesPage'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));
const RulesConfig = lazy(() => import('./components/RulesConfig'));
const TutorialPage = lazy(() => import('./components/TutorialPage'));

function SectionFallback() {
  return (
    <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Typography sx={{ color: '#e2e8f0', fontWeight: 700 }}>Cargando...</Typography>
    </Box>
  );
}

const sectionPathMap = {
  collaboratorPortal: '/portal-colaborador',
  internalManagement: '/gestion-interna',
  upload: '/cargar',
  history: '/historial',
  rules: '/reglas',
  charts: '/graficos',
  annualAnalysis: '/analisis-anual',
  customerNonconformities: '/no-conformidades-clientes',
  profile: '/perfil',
  tutorial: '/tutorial',
  adminUsers: '/admin-usuarios',
  declaration: '/declaracion-salud',
  policies: '/politicas-seguridad',
  declarationHistory: '/mi-declaraciones',
  adminHealthDeclarations: '/admin-declaraciones-salud',
  nutritionModules: '/modulos-nutricionales',
  certifications: '/certificaciones'
};

const legacyProtectedPathAliases = new Set(['/inicio']);
const publicAuthPathMap = {
  '/signin': '/login',
  '/signup': '/register'
};

const publicPaths = new Set(['/', '/login', '/register', '/forgot-password', '/reset-password']);
const authOnlyPublicPaths = new Set(['/', '/login', '/register']);
const protectedPathAliases = {
  '/politicas': '/politicas-seguridad'
};

function normalizeProtectedPath(pathname) {
  return protectedPathAliases[pathname] || pathname;
}

function normalizePublicPath(pathname) {
  const mappedPath = publicAuthPathMap[pathname] || pathname;
  if (publicPaths.has(mappedPath)) {
    return mappedPath;
  }
  const protectedPath = normalizeProtectedPath(mappedPath);
  if (legacyProtectedPathAliases.has(protectedPath) || protectedPath.startsWith('/analisis/')) {
    return '/login';
  }
  if (Object.values(sectionPathMap).includes(protectedPath) || protectedPath === '/politicas-seguridad/confirmacion') {
    return '/login';
  }
  return '/';
}

function getSectionFromPath(pathname) {
  const normalizedPath = normalizeProtectedPath(pathname);
  if (legacyProtectedPathAliases.has(normalizedPath)) return 'legacyHome';
  if (normalizedPath.startsWith('/analisis/')) return 'history';
  if (normalizedPath === '/politicas-seguridad/confirmacion') return 'policies';
  const match = Object.entries(sectionPathMap).find(([, path]) => path === normalizedPath);
  return match?.[0] || null;
}

function MainApp({ user, onLogout }) {
  const [currentSection, setCurrentSection] = useState(() => getSectionFromPath(window.location.pathname));
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [reloadHistoryKey, setReloadHistoryKey] = useState(0);
  const postLoginRedirectUserIdRef = useRef(null);

  const effectiveRole = currentUserProfile?.role || user?.role || ROLES.USER;
  const normalizedRole = normalizeRole(effectiveRole);
  const isAdmin = normalizedRole === ROLES.ADMIN;
  const isNutritionist = normalizedRole === ROLES.NUTRITIONIST;
  const canViewNutritionModules = isAdmin || isNutritionist;
  const canViewCertifications = isAdmin || isNutritionist;
  const fallbackSection = getFallbackSectionForRole(normalizedRole);
  const fallbackPath = getInitialPathForRole(normalizedRole);

  const layoutUser = {
    ...user,
    role: normalizedRole,
    name: currentUserProfile?.full_name || user?.name
  };

  const sidebarSections = useMemo(() => {
    if (canViewNutritionModules && !isAdmin) {
      return [
        { id: 'internalManagement', label: 'Inicio' },
        { id: 'declaration', label: 'Declaración de Salud' },
        { id: 'policies', label: 'Políticas de Seguridad' },
        { id: 'nutritionModules', label: 'Documentos SGC' },
        { id: 'annualAnalysis', label: 'Análisis anual' },
        { id: 'certifications', label: 'Certificaciones' }
      ];
    }

    if (!isAdmin) {
      return [
        { id: 'collaboratorPortal', label: 'Inicio' },
        { id: 'declaration', label: 'Declaración de Salud' },
        { id: 'policies', label: 'Políticas de Seguridad' }
      ];
    }

    return [
      { id: 'internalManagement', label: 'Inicio' },
      { id: 'upload', label: 'Cargar archivos' },
      { id: 'history', label: 'Historial' },
      { id: 'charts', label: 'Gráficos' },
      { id: 'annualAnalysis', label: 'Análisis anual' },
      { id: 'customerNonconformities', label: 'NC Clientes' },
      { id: 'profile', label: 'Mi Perfil' },
      { id: 'tutorial', label: 'Ver Tutorial' },
      { id: 'rules', label: 'Configurar Reglas' },
      { id: 'adminUsers', label: 'Gestión de usuarios' },
      { id: 'declaration', label: 'Mi Declaración Salud' },
      { id: 'adminHealthDeclarations', label: 'Gestor Declaraciones' },
      { id: 'policies', label: 'Políticas' },
      { id: 'nutritionModules', label: 'Documentos SGC' },
      { id: 'certifications', label: 'Certificaciones' }
    ];
  }, [canViewNutritionModules, isAdmin]);

  const allowedSections = useMemo(() => {
    return getAllowedSectionsForRole(normalizedRole);
  }, [normalizedRole]);

  useEffect(() => {
    const handlePopState = () => {
      const normalizedPath = normalizeProtectedPath(window.location.pathname);
      const sectionFromPath = getSectionFromPath(normalizedPath);
      setCurrentSection(sectionFromPath);
      const id = normalizedPath.startsWith('/analisis/')
        ? normalizedPath.replace('/analisis/', '')
        : null;
      if (id) {
        loadAnalysis(id);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadCurrentProfile() {
      if (!user?.id) {
        setLoadingProfile(false);
        return;
      }

      setLoadingProfile(true);

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, is_active')
        .eq('id', user.id)
        .maybeSingle();

      if (!mounted) return;
      if (!error && data) {
        setCurrentUserProfile(data);
      } else {
        setCurrentUserProfile({
          id: user.id,
          email: user.email || null,
          full_name: user.name || null,
          role: ROLES.USER,
          is_active: true
        });
      }
      setLoadingProfile(false);
    }

    loadCurrentProfile();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (loadingProfile) return;

    const normalizedPath = normalizeProtectedPath(window.location.pathname);
    const sectionFromPath = getSectionFromPath(normalizedPath);

    if (authOnlyPublicPaths.has(normalizedPath) || sectionFromPath === 'legacyHome' || !sectionFromPath) {
      navigateToSection(fallbackSection, { replace: true });
      return;
    }

    if (!allowedSections.has(sectionFromPath)) {
      navigateToSection(fallbackSection, { replace: true });
      return;
    }

    setCurrentSection(sectionFromPath);

    if (isAdmin && window.location.pathname.startsWith('/analisis/')) {
      const id = window.location.pathname.replace('/analisis/', '');
      if (id) loadAnalysis(id);
    }
  }, [allowedSections, fallbackSection, isAdmin, loadingProfile]);

  const navigateToSection = (nextSection, options = {}) => {
    if (!allowedSections.has(nextSection)) {
      nextSection = fallbackSection;
    }

    const nextPath = sectionPathMap[nextSection] || fallbackPath;
    if (window.location.pathname !== nextPath) {
      if (options.replace) {
        window.history.replaceState({}, '', nextPath);
      } else {
        window.history.pushState({}, '', nextPath);
      }
    }
    setCurrentSection(nextSection);
  };

  useEffect(() => {
    if (loadingProfile) return;
    if (!user?.id) return;
    if (postLoginRedirectUserIdRef.current === user.id) return;

    postLoginRedirectUserIdRef.current = user.id;
    if (authOnlyPublicPaths.has(window.location.pathname) || window.location.pathname === '/inicio') {
      navigateToSection(getInitialSectionForRole(normalizedRole), { replace: true });
    }
  }, [loadingProfile, normalizedRole, user?.id]);

  const navigateToAnalysis = (analysisId) => {
    if (!isAdmin) {
      navigateToSection(fallbackSection, { replace: true });
      return;
    }

    const nextPath = `/analisis/${analysisId}`;
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    setCurrentSection('history');
  };

  const loadAnalysis = async (analysisId) => {
    try {
      const response = await getAnalysisById(analysisId);
      setSelectedAnalysis(response);
    } catch {
      setSelectedAnalysis(null);
    }
  };

  const handleUploadSuccess = async () => {
    setReloadHistoryKey((prev) => prev + 1);
    navigateToSection('history');
  };

  const handleSelectAnalysis = async (analysisId) => {
    await loadAnalysis(analysisId);
    navigateToAnalysis(analysisId);
  };

  const handleDeleteCurrentAnalysis = async () => {
    if (!selectedAnalysis?.id) return;

    const deleted = await deleteAnalysis(selectedAnalysis.id);
    if (deleted?.error) {
      alert('No se pudo eliminar el análisis actual');
      return;
    }

    setSelectedAnalysis(null);
    setReloadHistoryKey((prev) => prev + 1);
    navigateToSection('history');
  };

  const renderDetailById = () => {
    if (!selectedAnalysis) {
      return (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
            No se encontró el análisis
          </Typography>
          <Typography color="text.secondary">
            Volvé al historial y seleccioná un análisis válido.
          </Typography>
        </Paper>
      );
    }

    return (
      <>
        <SummaryGrid
          summary={selectedAnalysis?.summary}
          processedAt={selectedAnalysis?.processedAt || selectedAnalysis?.uploadDate || null}
          records={selectedAnalysis?.records || []}
        />
        <AnalysisResults
          records={selectedAnalysis?.records || []}
          analysisId={selectedAnalysis?.id}
          onExportSuccess={async (analysisId) => {
            if (analysisId) {
              try {
                await updateAnalysisStatus(analysisId, 'exported');
              } catch {
                // noop
              }
            }
            setReloadHistoryKey((prev) => prev + 1);
            navigateToSection('history');
          }}
          onReprocessExcel={() => navigateToSection('upload')}
          onDeleteCurrent={handleDeleteCurrentAnalysis}
        />
      </>
    );
  };

  const renderSection = () => {
    if (loadingProfile) {
      return (
        <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography sx={{ color: '#e2e8f0', fontWeight: 700 }}>Cargando perfil...</Typography>
        </Box>
      );
    }

    if (!allowedSections.has(currentSection)) {
      return (
        <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography sx={{ color: '#e2e8f0', fontWeight: 700 }}>Redirigiendo...</Typography>
        </Box>
      );
    }

    if (window.location.pathname.startsWith('/analisis/')) {
      if (!isAdmin) return null;
      return renderDetailById();
    }

    if (currentSection === 'declaration') {
      return <HealthDeclarationPage onOpenPolicies={() => navigateToSection('policies')} onAfterDelete={() => navigateToSection(isAdmin ? 'internalManagement' : 'declaration')} />;
    }

    if (currentSection === 'policies') {
      return <HealthPoliciesPage user={layoutUser} onGoDashboard={() => navigateToSection(fallbackSection)} />;
    }

    if (currentSection === 'declarationHistory') {
      if (!isAdmin) return null;
      return <HealthDeclarationHistoryPage />;
    }

    if (currentSection === 'adminHealthDeclarations') {
      if (!isAdmin) return null;
      return <HealthDeclarationsAdminPage />;
    }

    if (currentSection === 'nutritionModules') {
      if (!canViewNutritionModules) return null;
      return <NutritionModulesPage user={layoutUser} />;
    }

    if (currentSection === 'certifications') {
      if (!canViewCertifications) return null;
      return <CertificationsPage />;
    }

    if (currentSection === 'collaboratorPortal') {
      return <CollaboratorPortal user={layoutUser} onNavigate={navigateToSection} />;
    }

    if (currentSection === 'internalManagement') {
      return <InternalManagementPortal user={layoutUser} role={normalizedRole} onNavigate={navigateToSection} />;
    }

    if (currentSection === 'history') {
      return (
        <AnalysisHistory
          key={`history-${reloadHistoryKey}`}
          onSelectAnalysis={handleSelectAnalysis}
          isAdmin={isAdmin}
          onAfterDelete={(deletedIds = []) => {
            if (selectedAnalysis?.id && deletedIds.includes(selectedAnalysis.id)) {
              setSelectedAnalysis(null);
            }
          }}
          onAfterReprocess={async () => {
            setReloadHistoryKey((prev) => prev + 1);
            if (selectedAnalysis?.id) {
              await loadAnalysis(selectedAnalysis.id);
            }
          }}
        />
      );
    }

    if (currentSection === 'upload') {
      return <FileUpload onUploadSuccess={handleUploadSuccess} />;
    }

    if (currentSection === 'rules') {
      return <RulesConfig />;
    }

    if (currentSection === 'charts') {
      return (
        <ChartsPage
          records={selectedAnalysis?.records || []}
          summary={selectedAnalysis?.summary || null}
          analysisTotalRecords={selectedAnalysis?.totalRecords || 0}
        />
      );
    }

    if (currentSection === 'annualAnalysis') {
      if (!isAdmin && !isNutritionist) return null;
      return <AnnualDeviationAnalysisPage />;
    }

    if (currentSection === 'customerNonconformities') {
      if (!isAdmin) return null;
      return <CustomerNonconformitiesPage />;
    }

    if (currentSection === 'profile') {
      return <ProfilePage user={layoutUser} onProfileUpdated={(patch) => setCurrentUserProfile((prev) => ({ ...(prev || {}), ...patch }))} />;
    }

    if (currentSection === 'tutorial') {
      return <TutorialPage onGoToUpload={() => navigateToSection('upload')} />;
    }

    if (currentSection === 'adminUsers') {
      return <AdminUsersPage currentUserId={user?.id} onCurrentUserUpdated={(patch) => setCurrentUserProfile((prev) => ({ ...(prev || {}), ...patch }))} />;
    }

    return null;
  };

  return (
    loadingProfile ? (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#020617' }}>
        <Typography sx={{ color: '#e2e8f0', fontWeight: 700 }}>Cargando perfil...</Typography>
      </Box>
    ) : (
    <AppLayout
      user={layoutUser}
      onLogout={onLogout}
      sections={sidebarSections}
      currentSection={currentSection}
      onSelectSection={navigateToSection}
    >
      <Suspense fallback={<SectionFallback />}>
        {renderSection()}
      </Suspense>
    </AppLayout>
    )
  );
}

function PublicApp({ onLoginSuccess }) {
  const [currentPath, setCurrentPath] = useState(() => normalizePublicPath(window.location.pathname));
  const resolveAuthModePath = (mode) => {
    if (mode === 'register') return '/register';
    if (mode === 'forgotPassword') return '/forgot-password';
    return '/login';
  };

  useEffect(() => {
    const normalizedPath = normalizePublicPath(window.location.pathname);
    if (window.location.pathname !== normalizedPath) {
      window.history.replaceState({}, '', normalizedPath);
    }
    setCurrentPath(normalizedPath);

    const handlePopState = () => {
      const nextPath = normalizePublicPath(window.location.pathname);
      if (window.location.pathname !== nextPath) {
        window.history.replaceState({}, '', nextPath);
      }
      setCurrentPath(nextPath);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigatePublic = (nextPath) => {
    const normalizedPath = normalizePublicPath(nextPath);
    if (window.location.pathname !== normalizedPath) {
      window.history.pushState({}, '', normalizedPath);
    }
    setCurrentPath(normalizedPath);
  };

  if (currentPath === '/') {
    return (
      <PublicLanding
        onLogin={() => navigatePublic('/login')}
        onRegister={() => navigatePublic('/register')}
      />
    );
  }

  if (currentPath === '/login') {
    return (
      <LoginForm
        onLoginSuccess={onLoginSuccess}
        initialMode="login"
        onBackToLanding={() => navigatePublic('/')}
        onSwitchMode={(mode) => navigatePublic(resolveAuthModePath(mode))}
      />
    );
  }

  if (currentPath === '/register') {
    return (
      <LoginForm
        onLoginSuccess={onLoginSuccess}
        initialMode="register"
        onBackToLanding={() => navigatePublic('/')}
        onSwitchMode={(mode) => navigatePublic(resolveAuthModePath(mode))}
      />
    );
  }

  if (currentPath === '/forgot-password') {
    return <ForgotPasswordPage onBackToLogin={() => navigatePublic('/login')} />;
  }

  if (currentPath === '/reset-password') {
    return (
      <ResetPasswordPage
        onBackToLogin={() => navigatePublic('/login')}
        onRequestNewLink={() => navigatePublic('/forgot-password')}
      />
    );
  }

  return (
    <LoginForm
      onLoginSuccess={onLoginSuccess}
      initialMode="login"
      onSwitchMode={(mode) => navigatePublic(resolveAuthModePath(mode))}
    />
  );
}

export default function App() {
  const { user, login, logout, loading, isPasswordRecovery } = useAuth();
  const isResetPasswordRoute = window.location.pathname === '/reset-password';
  const handleLoginSuccess = (nextUser) => {
    login(nextUser);
  };
  const handleLogout = async () => {
    if (window.location.pathname !== '/') {
      window.history.replaceState({}, '', '/');
    }
    await logout();
    if (window.location.pathname !== '/') {
      window.history.replaceState({}, '', '/');
    }
  };

  if (loading) {
    return (
      <ThemeProvider theme={appTheme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <Typography>Cargando...</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      {(isResetPasswordRoute || isPasswordRecovery || !user)
        ? <PublicApp onLoginSuccess={handleLoginSuccess} />
        : (
          <MainApp
            user={user}
            onLogout={handleLogout}
          />
        )}
    </ThemeProvider>
  );
}

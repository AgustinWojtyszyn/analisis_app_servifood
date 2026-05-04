import React, { useEffect, useMemo, useState } from 'react';
import { ThemeProvider, CssBaseline, Box, Typography, Paper } from '@mui/material';
import { appTheme } from './styles/theme';
import LoginForm from './components/LoginForm';
import FileUpload from './components/FileUpload';
import { SummaryGrid } from './components/Dashboard';
import AnalysisResults from './components/AnalysisResults';
import AnalysisHistory from './components/AnalysisHistory';
import RulesConfig from './components/RulesConfig';
import ChartsPage from './components/ChartsPage';
import ProfilePage from './components/ProfilePage';
import TutorialPage from './components/TutorialPage';
import AdminUsersPage from './components/AdminUsersPage';
import AppLayout from './components/AppLayout';
import PublicLanding from './components/PublicLanding';
import HealthDeclarationPage from './components/HealthDeclarationPage';
import HealthPoliciesPage from './components/HealthPoliciesPage';
import HealthDeclarationHistoryPage from './components/HealthDeclarationHistoryPage';
import HealthDeclarationsAdminPage from './components/HealthDeclarationsAdminPage';
import { supabase } from './lib/supabaseClient';
import { useAuth } from './hooks/useAuth';
import { deleteAnalysis, getAnalysisById, updateAnalysisStatus } from './services/analysis';

const sectionPathMap = {
  panel: '/historial',
  upload: '/cargar',
  history: '/historial',
  rules: '/reglas',
  charts: '/graficos',
  profile: '/perfil',
  tutorial: '/tutorial',
  adminUsers: '/admin-usuarios',
  declaration: '/declaracion-salud',
  policies: '/politicas',
  declarationHistory: '/mi-declaraciones',
  adminHealthDeclarations: '/admin-declaraciones-salud'
};

const publicAuthPathMap = {
  '/signin': '/login',
  '/signup': '/register'
};

function normalizePublicPath(pathname) {
  const mappedPath = publicAuthPathMap[pathname] || pathname;
  if (mappedPath === '/' || mappedPath === '/login' || mappedPath === '/register') {
    return mappedPath;
  }
  return '/';
}

function getSectionFromPath(pathname) {
  if (pathname.startsWith('/analisis/')) return 'history';
  const match = Object.entries(sectionPathMap).find(([, path]) => path === pathname);
  return match?.[0] || 'history';
}

function MainApp({ user, onLogout }) {
  const [currentSection, setCurrentSection] = useState(() => getSectionFromPath(window.location.pathname));
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [reloadHistoryKey, setReloadHistoryKey] = useState(0);

  const effectiveRole = currentUserProfile?.role || user?.role || 'user';
  const isAdmin = effectiveRole === 'admin';

  const layoutUser = {
    ...user,
    role: effectiveRole,
    name: currentUserProfile?.full_name || user?.name
  };

  const sidebarSections = useMemo(() => {
    if (!isAdmin) {
      return [
        { id: 'history', label: 'Análisis de Calidad' },
        { id: 'declaration', label: 'Declaración de Salud' },
        { id: 'policies', label: 'Políticas' },
        { id: 'declarationHistory', label: 'Mi Historial' }
      ];
    }

    return [
      { id: 'panel', label: 'Dashboard' },
      { id: 'upload', label: 'Cargar archivos' },
      { id: 'charts', label: 'Gráficos' },
      { id: 'profile', label: 'Mi Perfil' },
      { id: 'tutorial', label: 'Ver Tutorial' },
      { id: 'rules', label: 'Configurar Reglas' },
      { id: 'adminUsers', label: 'Gestión de usuarios' },
      { id: 'declaration', label: 'Mi Declaración Salud' },
      { id: 'adminHealthDeclarations', label: 'Gestor Declaraciones' },
      { id: 'policies', label: 'Políticas' }
    ];
  }, [isAdmin]);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentSection(getSectionFromPath(window.location.pathname));
      const id = window.location.pathname.startsWith('/analisis/')
        ? window.location.pathname.replace('/analisis/', '')
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
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, is_active')
        .eq('id', user.id)
        .maybeSingle();

      if (!mounted) return;
      if (!error && data) {
        setCurrentUserProfile(data);
      }
    }

    loadCurrentProfile();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!isAdmin) {
      if (!['/historial', '/declaracion-salud', '/politicas', '/mi-declaraciones'].includes(window.location.pathname)) {
        navigateToSection('history');
      }
      return;
    }

    if (window.location.pathname.startsWith('/analisis/')) {
      const id = window.location.pathname.replace('/analisis/', '');
      if (id) loadAnalysis(id);
    }
  }, [isAdmin]);

  const navigateToSection = (nextSection) => {
    const nextPath = sectionPathMap[nextSection] || '/historial';
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    setCurrentSection(nextSection);
  };

  const navigateToAnalysis = (analysisId) => {
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
    if (window.location.pathname.startsWith('/analisis/')) {
      return renderDetailById();
    }

    if (currentSection === 'declaration') {
      return <HealthDeclarationPage onOpenPolicies={() => navigateToSection('policies')} onAfterDelete={() => navigateToSection(isAdmin ? 'panel' : 'declaration')} />;
    }

    if (currentSection === 'policies') {
      return <HealthPoliciesPage />;
    }

    if (currentSection === 'declarationHistory') {
      return <HealthDeclarationHistoryPage />;
    }

    if (currentSection === 'adminHealthDeclarations') {
      if (!isAdmin) return null;
      return <HealthDeclarationsAdminPage />;
    }

    if (currentSection === 'panel' || currentSection === 'history') {
      return <AnalysisHistory key={`history-${reloadHistoryKey}`} onSelectAnalysis={handleSelectAnalysis} isAdmin={isAdmin} />;
    }

    if (currentSection === 'upload') {
      return <FileUpload onUploadSuccess={handleUploadSuccess} />;
    }

    if (currentSection === 'rules') {
      return <RulesConfig />;
    }

    if (currentSection === 'charts') {
      return <ChartsPage records={selectedAnalysis?.records || []} summary={selectedAnalysis?.summary || null} />;
    }

    if (currentSection === 'profile') {
      return <ProfilePage user={layoutUser} onProfileUpdated={(patch) => setCurrentUserProfile((prev) => ({ ...(prev || {}), ...patch }))} />;
    }

    if (currentSection === 'tutorial') {
      return <TutorialPage />;
    }

    if (currentSection === 'adminUsers') {
      return <AdminUsersPage currentUserId={user?.id} onCurrentUserUpdated={(patch) => setCurrentUserProfile((prev) => ({ ...(prev || {}), ...patch }))} />;
    }

    return null;
  };

  return (
    <AppLayout
      user={layoutUser}
      onLogout={onLogout}
      sections={sidebarSections}
      currentSection={currentSection}
      onSelectSection={navigateToSection}
    >
      {renderSection()}
    </AppLayout>
  );
}

function PublicApp({ onLoginSuccess }) {
  const [currentPath, setCurrentPath] = useState(() => normalizePublicPath(window.location.pathname));

  useEffect(() => {
    const normalizedPath = normalizePublicPath(window.location.pathname);
    if (window.location.pathname !== normalizedPath) {
      window.history.replaceState({}, '', normalizedPath);
    }
    setCurrentPath(normalizedPath);

    const handlePopState = () => {
      setCurrentPath(normalizePublicPath(window.location.pathname));
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

  if (currentPath === '/login') {
    return (
      <LoginForm
        onLoginSuccess={onLoginSuccess}
        initialMode="login"
        onBackToLanding={() => navigatePublic('/')}
        onSwitchMode={(mode) => navigatePublic(mode === 'register' ? '/register' : '/login')}
      />
    );
  }

  if (currentPath === '/register') {
    return (
      <LoginForm
        onLoginSuccess={onLoginSuccess}
        initialMode="register"
        onBackToLanding={() => navigatePublic('/')}
        onSwitchMode={(mode) => navigatePublic(mode === 'register' ? '/register' : '/login')}
      />
    );
  }

  return <PublicLanding onLogin={() => navigatePublic('/login')} onRegister={() => navigatePublic('/register')} />;
}

export default function App() {
  const { user, login, logout, loading } = useAuth();

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
      {user ? <MainApp user={user} onLogout={logout} /> : <PublicApp onLoginSuccess={login} />}
    </ThemeProvider>
  );
}

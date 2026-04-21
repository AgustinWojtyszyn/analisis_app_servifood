import React, { useEffect, useState } from 'react';
import {
  ThemeProvider,
  CssBaseline,
  Box,
  Typography,
  Paper
} from '@mui/material';
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
import { supabase } from './lib/supabaseClient';
import { useAuth } from './hooks/useAuth';
import { getAnalysisById } from './services/analysis';

const sectionPathMap = {
  panel: '/',
  upload: '/cargar',
  history: '/historial',
  results: '/resultados',
  rules: '/reglas',
  charts: '/graficos',
  profile: '/perfil',
  tutorial: '/tutorial',
  adminUsers: '/admin-usuarios'
};

const pathSectionMap = Object.entries(sectionPathMap).reduce((acc, [section, path]) => {
  acc[path] = section;
  return acc;
}, {});

const publicAuthPathMap = {
  '/signin': '/login',
  '/signup': '/register'
};

function getSectionFromPath(pathname) {
  return pathSectionMap[pathname] || 'panel';
}

function normalizePublicPath(pathname) {
  const mappedPath = publicAuthPathMap[pathname] || pathname;
  if (mappedPath === '/' || mappedPath === '/login' || mappedPath === '/register') {
    return mappedPath;
  }
  return '/';
}

const baseSections = [
  { id: 'panel', label: 'Panel Principal' },
  { id: 'upload', label: 'Cargar Archivo' },
  { id: 'history', label: 'Historial' },
  { id: 'results', label: 'Resultados' },
  { id: 'rules', label: 'Configurar Reglas' },
  { id: 'charts', label: 'Gráficos' },
  { id: 'profile', label: 'Mi Perfil' },
  { id: 'tutorial', label: 'Ver Tutorial' }
];

function MainApp({ user, onLogout }) {
  const [currentSection, setCurrentSection] = useState(() => getSectionFromPath(window.location.pathname));
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);

  const effectiveRole = currentUserProfile?.role || user?.role || 'user';
  const isAdmin = effectiveRole === 'admin';
  const sidebarSections = isAdmin
    ? [...baseSections, { id: 'adminUsers', label: 'Gestión de usuarios' }]
    : baseSections;

  const layoutUser = {
    ...user,
    role: effectiveRole,
    name: currentUserProfile?.full_name || user?.name
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentSection(getSectionFromPath(window.location.pathname));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const authPaths = ['/login', '/register', '/signin', '/signup'];
    if (authPaths.includes(window.location.pathname)) {
      navigateToSection('panel');
    }
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

  const navigateToSection = (nextSection) => {
    const nextPath = sectionPathMap[nextSection] || '/';
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    setCurrentSection(nextSection);
  };

  const handleUploadSuccess = async (analysis) => {
    setCurrentAnalysis(analysis);
    navigateToSection('panel');
  };

  const handleProfileUpdated = (patch) => {
    setCurrentUserProfile((prev) => ({ ...(prev || {}), ...patch }));
  };

  const handleSelectAnalysis = async (analysisId) => {
    try {
      const response = await getAnalysisById(analysisId);
      setCurrentAnalysis(response);
      navigateToSection('results');
    } catch (err) {
      alert('Error cargando analisis');
    }
  };

  const resolvedSections = sidebarSections.map((section) => {
    if (section.id === 'results' && !currentAnalysis) {
      return { ...section, disabled: false };
    }
    return section;
  });

  useEffect(() => {
    if (currentSection === 'adminUsers' && !isAdmin) {
      navigateToSection('panel');
    }
  }, [currentSection, isAdmin]);

  const renderAnalysisContent = () => (
    <>
      <SummaryGrid summary={currentAnalysis?.summary} />
      <AnalysisResults records={currentAnalysis?.records || []} />
    </>
  );

  const renderSection = () => {
    if (currentSection === 'panel') {
      if (!currentAnalysis) {
        return (
          <Box
            sx={{
              minHeight: 'calc(100vh - 160px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Box sx={{ width: '100%', maxWidth: 860 }}>
              <Typography variant="h4" sx={{ fontWeight: 900, textAlign: 'center', color: '#ffffff', mb: 1 }}>
                Cargar archivo Excel
              </Typography>
              <Typography sx={{ textAlign: 'center', color: 'rgba(255,255,255,0.92)', mb: 3 }}>
                Subí tu archivo para analizar incidencias y obtener resultados claros en segundos.
              </Typography>
              <FileUpload onUploadSuccess={handleUploadSuccess} showHeader={false} />
              <Paper sx={{ p: 2.5, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No hay análisis aún. Empezá subiendo tu primer archivo.
                </Typography>
              </Paper>
            </Box>
          </Box>
        );
      }

      return renderAnalysisContent();
    }

    if (currentSection === 'upload') {
      return <FileUpload onUploadSuccess={handleUploadSuccess} />;
    }

    if (currentSection === 'history') {
      return <AnalysisHistory onSelectAnalysis={handleSelectAnalysis} />;
    }

    if (currentSection === 'results') {
      if (!currentAnalysis) {
        return (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
              No hay análisis aún
            </Typography>
            <Typography color="text.secondary">
              Cargá un archivo o seleccioná uno del historial para ver resultados.
            </Typography>
          </Paper>
        );
      }

      return renderAnalysisContent();
    }

    if (currentSection === 'rules') {
      if (!isAdmin) {
        return (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="textSecondary">
              Solo los administradores pueden configurar reglas
            </Typography>
          </Paper>
        );
      }
      return <RulesConfig />;
    }

    if (currentSection === 'charts') {
      return <ChartsPage records={currentAnalysis?.records || []} />;
    }

    if (currentSection === 'profile') {
      return <ProfilePage user={layoutUser} onProfileUpdated={handleProfileUpdated} />;
    }

    if (currentSection === 'tutorial') {
      return <TutorialPage />;
    }

    if (currentSection === 'adminUsers') {
      if (!isAdmin) {
        return (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="textSecondary">
              No tenés permisos para acceder a Gestión de usuarios.
            </Typography>
          </Paper>
        );
      }
      return <AdminUsersPage currentUserId={user?.id} onCurrentUserUpdated={handleProfileUpdated} />;
    }

    return null;
  };

  return (
    <AppLayout
      user={layoutUser}
      onLogout={onLogout}
      sections={resolvedSections}
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

  return (
    <PublicLanding
      onLogin={() => navigatePublic('/login')}
      onRegister={() => navigatePublic('/register')}
    />
  );
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
      {user ? (
        <MainApp user={user} onLogout={logout} />
      ) : (
        <PublicApp onLoginSuccess={login} />
      )}
    </ThemeProvider>
  );
}

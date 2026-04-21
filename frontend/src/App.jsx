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
import AppLayout from './components/AppLayout';
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
  tutorial: '/tutorial'
};

const pathSectionMap = Object.entries(sectionPathMap).reduce((acc, [section, path]) => {
  acc[path] = section;
  return acc;
}, {});

function getSectionFromPath(pathname) {
  return pathSectionMap[pathname] || 'panel';
}

const sections = [
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

  useEffect(() => {
    const handlePopState = () => {
      setCurrentSection(getSectionFromPath(window.location.pathname));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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

  const handleSelectAnalysis = async (analysisId) => {
    try {
      const response = await getAnalysisById(analysisId);
      setCurrentAnalysis(response);
      navigateToSection('results');
    } catch (err) {
      alert('Error cargando analisis');
    }
  };

  const resolvedSections = sections.map((section) => {
    if (section.id === 'results' && !currentAnalysis) {
      return { ...section, disabled: false };
    }
    return section;
  });

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
      if (user?.role !== 'admin') {
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
      return <ProfilePage user={user} />;
    }

    if (currentSection === 'tutorial') {
      return <TutorialPage />;
    }

    return null;
  };

  return (
    <AppLayout
      user={user}
      onLogout={onLogout}
      sections={resolvedSections}
      currentSection={currentSection}
      onSelectSection={navigateToSection}
    >
      {renderSection()}
    </AppLayout>
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
        <LoginForm onLoginSuccess={login} />
      )}
    </ThemeProvider>
  );
}

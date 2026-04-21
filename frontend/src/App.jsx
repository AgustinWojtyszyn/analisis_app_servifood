import React, { useState } from 'react';
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
import { SummaryGrid, CategoryGrid, EmployeeMetrics } from './components/Dashboard';
import DashboardHome from './components/DashboardHome';
import AnalysisResults from './components/AnalysisResults';
import AnalysisHistory from './components/AnalysisHistory';
import RulesConfig from './components/RulesConfig';
import AppLayout from './components/AppLayout';
import { useAuth } from './hooks/useAuth';
import { getAnalysisById } from './services/analysis';

const sections = [
  { id: 'panel', label: 'Panel Principal' },
  { id: 'upload', label: 'Cargar Archivo' },
  { id: 'history', label: 'Historial' },
  { id: 'results', label: 'Resultados' },
  { id: 'rules', label: 'Configurar Reglas' }
];

function MainApp({ user, onLogout }) {
  const [currentSection, setCurrentSection] = useState('panel');
  const [currentAnalysis, setCurrentAnalysis] = useState(null);

  const handleUploadSuccess = async (analysis) => {
    setCurrentAnalysis(analysis);
    setCurrentSection('results');
  };

  const handleSelectAnalysis = async (analysisId) => {
    try {
      const response = await getAnalysisById(analysisId);
      setCurrentAnalysis(response);
      setCurrentSection('results');
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

  const renderSection = () => {
    if (currentSection === 'panel') {
      return <DashboardHome user={user} currentAnalysis={currentAnalysis} />;
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

      return (
        <>
          <SummaryGrid summary={currentAnalysis.summary} />
          <CategoryGrid summary={currentAnalysis.summary} />
          <Box sx={{ mb: 3 }}>
            <EmployeeMetrics summary={currentAnalysis.summary} />
          </Box>
          <AnalysisResults records={currentAnalysis.records} />
        </>
      );
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

    return null;
  };

  return (
    <AppLayout
      user={user}
      onLogout={onLogout}
      sections={resolvedSections}
      currentSection={currentSection}
      onSelectSection={setCurrentSection}
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

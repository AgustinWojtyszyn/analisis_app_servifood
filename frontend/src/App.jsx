import React, { useState } from 'react';
import {
  ThemeProvider,
  CssBaseline,
  Container,
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { darkTheme } from './styles/theme';
import LoginForm from './components/LoginForm';
import FileUpload from './components/FileUpload';
import { SummaryGrid, CategoryGrid, EmployeeMetrics } from './components/Dashboard';
import AnalysisResults from './components/AnalysisResults';
import AnalysisHistory from './components/AnalysisHistory';
import RulesConfig from './components/RulesConfig';
import { useAuth } from './hooks/useAuth';
import { getAnalysisById } from './services/analysis';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function MainApp({ user, onLogout }) {
  const [currentTab, setCurrentTab] = useState(0);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);

  const handleUploadSuccess = async (analysis) => {
    setCurrentAnalysis(analysis);
    setCurrentTab(2);
  };

  const handleSelectAnalysis = async (analysisId) => {
    try {
      const response = await getAnalysisById(analysisId);
      setCurrentAnalysis(response);
      setCurrentTab(2);
    } catch (err) {
      alert('Error cargando analisis');
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" sx={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid #333' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flex: 1, fontWeight: 700 }}>
            Analysis App - Analisis de Excel
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user?.name} ({user?.role})
          </Typography>
          <Button
            color="inherit"
            startIcon={<LogoutIcon />}
            onClick={onLogout}
            size="small"
          >
            Salir
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ flex: 1, py: 4 }}>
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={currentTab}
            onChange={(e, newValue) => setCurrentTab(newValue)}
            aria-label="main tabs"
            sx={{
              borderBottom: '1px solid',
              borderBottomColor: 'divider',
              '& .MuiTab-root': {
                minHeight: 56
              }
            }}
          >
            <Tab label="Cargar Archivo" id="tab-0" />
            <Tab label="Historial" id="tab-1" />
            <Tab label="Resultados" id="tab-2" disabled={!currentAnalysis} />
            <Tab label="Configurar Reglas" id="tab-3" />
          </Tabs>
        </Paper>

        <TabPanel value={currentTab} index={0}>
          <FileUpload onUploadSuccess={handleUploadSuccess} />
          {currentAnalysis && (
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Ultimo Analisis
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Archivo:</strong> {currentAnalysis.filename}
              </Typography>
              <Typography variant="body2">
                <strong>Registros:</strong> {currentAnalysis.totalRecords}
              </Typography>
            </Paper>
          )}
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <AnalysisHistory onSelectAnalysis={handleSelectAnalysis} />
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          {currentAnalysis && (
            <>
              <SummaryGrid summary={currentAnalysis.summary} />
              <CategoryGrid summary={currentAnalysis.summary} />
              <Box sx={{ mb: 3 }}>
                <EmployeeMetrics summary={currentAnalysis.summary} />
              </Box>
              <AnalysisResults records={currentAnalysis.records} />
            </>
          )}
        </TabPanel>

        <TabPanel value={currentTab} index={3}>
          {user?.role === 'admin' ? (
            <RulesConfig />
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="textSecondary">
                Solo los administradores pueden configurar reglas
              </Typography>
            </Paper>
          )}
        </TabPanel>
      </Container>

      <Box
        component="footer"
        sx={{
          backgroundColor: '#1a1a1a',
          borderTop: '1px solid #333',
          p: 3,
          textAlign: 'center',
          color: 'text.secondary'
        }}
      >
        <Typography variant="body2">
          Analysis App
        </Typography>
      </Box>
    </Box>
  );
}

export default function App() {
  const { user, login, logout, loading } = useAuth();

  if (loading) {
    return (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <Typography>Cargando...</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      {user ? (
        <MainApp user={user} onLogout={logout} />
      ) : (
        <LoginForm onLoginSuccess={login} />
      )}
    </ThemeProvider>
  );
}

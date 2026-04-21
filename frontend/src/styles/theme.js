import { createTheme } from '@mui/material/styles';

export const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1d4ed8',
      light: '#60a5fa',
      dark: '#1e3a8a'
    },
    secondary: {
      main: '#0ea5e9',
      light: '#7dd3fc',
      dark: '#0369a1'
    },
    background: {
      default: '#eef4ff',
      paper: '#ffffff'
    },
    text: {
      primary: '#0f172a',
      secondary: '#475569'
    },
    divider: '#dbe4f4',
    success: {
      main: '#16a34a'
    },
    warning: {
      main: '#ea580c'
    },
    error: {
      main: '#dc2626'
    },
    info: {
      main: '#0284c7'
    }
  },
  typography: {
    fontFamily: '"Sora", "Nunito Sans", "Segoe UI", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600
    }
  },
  shape: {
    borderRadius: 14
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background:
            'linear-gradient(135deg, rgba(37,99,235,0.14) 0%, rgba(14,165,233,0.08) 45%, rgba(248,250,252,1) 100%)',
          minHeight: '100vh'
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 8px 30px rgba(15, 23, 42, 0.08)'
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 10px 30px rgba(29, 78, 216, 0.10)'
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 700
        }
      }
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#f3f7ff'
        }
      }
    }
  }
});

export const darkTheme = appTheme;

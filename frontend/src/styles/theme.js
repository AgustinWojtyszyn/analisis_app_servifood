import { createTheme } from '@mui/material/styles';

export const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2563eb',
      light: '#60a5fa',
      dark: '#1d4ed8'
    },
    secondary: {
      main: '#f97316',
      light: '#fb923c',
      dark: '#ea580c'
    },
    background: {
      default: '#2563eb',
      paper: '#ffffff'
    },
    text: {
      primary: '#0f172a',
      secondary: '#64748b'
    },
    divider: '#e2e8f0',
    success: { main: '#16a34a' },
    warning: { main: '#f59e0b' },
    error: { main: '#dc2626' },
    info: { main: '#0284c7' }
  },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    button: {
      fontWeight: 700,
      letterSpacing: 0,
      textTransform: 'none'
    },
    h1: { fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em' },
    h2: { fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.025em' },
    h3: { fontSize: '1.5rem', fontWeight: 750 },
    h4: { fontSize: '1.3rem', fontWeight: 750 },
    h5: { fontSize: '1.15rem', fontWeight: 700 },
    h6: { fontSize: '1rem', fontWeight: 700 }
  },
  shape: {
    borderRadius: 12
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background:
            'radial-gradient(circle at 14% 0%, rgba(96,165,250,.22), transparent 30%), linear-gradient(135deg, #2563eb 0%, #1d4ed8 52%, #1e40af 100%)',
          minHeight: '100vh',
          color: '#0f172a',
          WebkitFontSmoothing: 'antialiased'
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 10px rgba(15,23,42,.05)'
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 10px rgba(15,23,42,.05)'
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 40,
          borderRadius: 10,
          textTransform: 'none',
          fontWeight: 700,
          boxShadow: 'none'
        },
        containedPrimary: {
          boxShadow: '0 4px 10px rgba(37,99,235,.18)',
          '&:hover': {
            boxShadow: '0 5px 12px rgba(37,99,235,.22)'
          }
        },
        outlined: {
          borderColor: '#cbd5e1',
          '&:hover': {
            borderColor: '#93c5fd',
            backgroundColor: '#eff6ff'
          }
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 700
        },
        sizeSmall: {
          height: 24
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          minHeight: 42,
          borderRadius: 10,
          backgroundColor: '#ffffff',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#cbd5e1'
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#93c5fd'
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#3b82f6',
            borderWidth: 2
          }
        }
      }
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: '#64748b'
        }
      }
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          boxShadow: 'none'
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #e2e8f0',
          color: '#0f172a'
        },
        head: {
          color: '#475569',
          fontWeight: 800,
          backgroundColor: '#f8fafc'
        }
      }
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#f8fafc'
        }
      }
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: 3
        }
      }
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 700,
          minHeight: 44
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16
        }
      }
    }
  }
});

export const darkTheme = appTheme;

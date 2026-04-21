import { createTheme } from '@mui/material/styles';

export const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1d4ed8',
      light: '#3b82f6',
      dark: '#1e3a8a'
    },
    secondary: {
      main: '#0f4cbd',
      light: '#2563eb',
      dark: '#1e3a8a'
    },
    background: {
      default: '#112865',
      paper: '#ffffff'
    },
    text: {
      primary: '#0b1f4d',
      secondary: '#445069'
    },
    divider: '#d5deef',
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
    button: {
      fontWeight: 700,
      letterSpacing: 0.1
    },
    h1: {
      fontSize: '2.5rem',
      fontWeight: 800
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
      fontSize: '1.02rem',
      fontWeight: 700
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
            'radial-gradient(circle at 12% 8%, rgba(96, 165, 250, 0.25), transparent 40%), radial-gradient(circle at 85% 78%, rgba(56, 189, 248, 0.18), transparent 38%), linear-gradient(135deg, #10245b 0%, #1a3b8f 58%, #1f4ba6 100%)',
          minHeight: '100vh',
          color: '#0b1f4d'
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          boxShadow: '0 12px 30px rgba(12, 33, 76, 0.10)'
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          boxShadow: '0 12px 26px rgba(22, 46, 97, 0.12)',
          border: '1px solid rgba(218, 226, 243, 0.65)'
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: 'none',
          fontWeight: 700
        },
        containedPrimary: {
          boxShadow: '0 10px 18px rgba(29, 78, 216, 0.26)'
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
          height: 26
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: '#ffffff'
        }
      }
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid #e4ebf8'
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #e8eef9'
        }
      }
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#f4f7fe'
        }
      }
    }
  }
});

export const darkTheme = appTheme;

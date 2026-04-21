import { createTheme } from '@mui/material/styles';

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#64B5F6',
      light: '#90CAF9',
      dark: '#1976D2'
    },
    secondary: {
      main: '#81C784',
      light: '#A5D6A7',
      dark: '#388E3C'
    },
    background: {
      default: '#121212',
      paper: '#1E1E1E'
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#B0BEC5'
    },
    divider: '#37474F',
    success: {
      main: '#66BB6A'
    },
    warning: {
      main: '#FFA726'
    },
    error: {
      main: '#EF5350'
    },
    info: {
      main: '#29B6F6'
    }
  },
  typography: {
    fontFamily: 'Roboto, "Helvetica Neue", sans-serif',
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
    borderRadius: 8
  }
});

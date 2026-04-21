import React, { useState } from 'react';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Link as MuiLink
} from '@mui/material';
import { authService } from '../services/api';

export default function LoginForm({ onLoginSuccess }) {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let response;
      if (isRegister) {
        response = await authService.register(email, password, name);
      } else {
        response = await authService.login(email, password);
      }

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      onLoginSuccess(user);
    } catch (err) {
      setError(err.response?.data?.error || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          py: 3
        }}
      >
        <Card sx={{ width: '100%', boxShadow: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 3, fontWeight: 700 }}>
              {isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
            </Typography>

            <Typography variant="body2" color="textSecondary" align="center" sx={{ mb: 3 }}>
              Sistema de Análisis de Archivos Excel
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Box component="form" onSubmit={handleSubmit}>
              {isRegister && (
                <TextField
                  fullWidth
                  label="Nombre"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  margin="normal"
                  disabled={loading}
                  required
                />
              )}
              
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="normal"
                disabled={loading}
                required
              />

              <TextField
                fullWidth
                label="Contraseña"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                disabled={loading}
                required
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2, py: 1.5 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : (isRegister ? 'Crear Cuenta' : 'Iniciar Sesión')}
              </Button>

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2">
                  {isRegister ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}{' '}
                  <MuiLink
                    component="button"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsRegister(!isRegister);
                      setError('');
                    }}
                    sx={{ cursor: 'pointer' }}
                  >
                    {isRegister ? 'Inicia sesión' : 'Regístrate aquí'}
                  </MuiLink>
                </Typography>
              </Box>
            </Box>

            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="caption">
                <strong>Demo:</strong> admin@example.com / admin123
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}

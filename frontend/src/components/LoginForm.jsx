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
import { supabase } from '../lib/supabaseClient';
import { resolveAuthRedirectUrl } from '../lib/authRedirect';
import servifoodLogo from '../assets/servifood_logo_white_text_HQ.png';

function mapSupabaseUser(user) {
  if (!user) return null;

  const metadata = user.user_metadata || {};
  const appMetadata = user.app_metadata || {};

  return {
    id: user.id,
    email: user.email,
    name: metadata.name || metadata.full_name || user.email,
    role: appMetadata.role || 'user'
  };
}

export default function LoginForm({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const emailRedirectTo = resolveAuthRedirectUrl();

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo
          }
        });

        if (signUpError) {
          throw signUpError;
        }

        if (!data?.session) {
          setError('Cuenta creada. Revisa tu email para confirmar la cuenta.');
          return;
        }

        onLoginSuccess(mapSupabaseUser(data.session.user));
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        throw signInError;
      }

      onLoginSuccess(mapSupabaseUser(data.user));
    } catch (err) {
      setError(err?.message || 'Error de autenticacion');
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
        <Card
          sx={{
            width: '100%',
            boxShadow: '0 14px 30px rgba(15,23,42,0.18)',
            borderRadius: 3,
            overflow: 'hidden'
          }}
        >
          <Box
            sx={{
              px: 3,
              pt: 2.5,
              pb: 2,
              background: 'linear-gradient(150deg, #12306d 0%, #1b428f 58%, #2756ba 100%)',
              textAlign: 'center'
            }}
          >
            <Box
              component="img"
              src={servifoodLogo}
              alt="ServiFood Logo"
              sx={{ width: '100%', maxWidth: 210, height: 84, objectFit: 'contain', mx: 'auto', display: 'block' }}
            />
            <Typography sx={{ mt: 1, color: 'rgba(255,255,255,0.9)', fontSize: 13 }}>
              Plataforma de análisis de calidad
            </Typography>
          </Box>
          <CardContent sx={{ p: 3.5, backgroundColor: '#ffffff' }}>
            <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 3, fontWeight: 700 }}>
              {isRegister ? 'Crear Cuenta' : 'Iniciar Sesion'}
            </Typography>

            <Typography variant="body2" color="textSecondary" align="center" sx={{ mb: 3 }}>
              Sistema de Analisis de Archivos Excel
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
                label="Contrasena"
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
                sx={{ mt: 3, mb: 2, py: 1.5, backgroundColor: '#1d4ed8', '&:hover': { backgroundColor: '#1e3a8a' } }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : (isRegister ? 'Crear Cuenta' : 'Iniciar Sesion')}
              </Button>

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2">
                  {isRegister ? 'Ya tienes cuenta?' : 'No tienes cuenta?'}{' '}
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
                    {isRegister ? 'Inicia sesion' : 'Registrate aqui'}
                  </MuiLink>
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}

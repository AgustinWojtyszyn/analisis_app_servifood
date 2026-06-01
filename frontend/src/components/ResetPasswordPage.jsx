import React, { useEffect, useState } from 'react';
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
  InputAdornment,
  IconButton
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { supabase } from '../lib/supabaseClient';
import servifoodLogo from '../assets/servifood_logo_white_text_HQ.png';

const MIN_PASSWORD_LENGTH = 12;

function getAuthErrorMessage(err) {
  const msg = String(err?.message || '').toLowerCase();
  if (msg.includes('session')) return 'El enlace no es válido o expiró. Solicitá uno nuevo.';
  if (msg.includes('password')) return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  return 'No se pudo actualizar la contraseña. Intentá nuevamente.';
}

export default function ResetPasswordPage({ onBackToLogin }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function prepareRecoverySession() {
      try {
        const hash = window.location.hash?.startsWith('#') ? window.location.hash.slice(1) : '';
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const code = new URLSearchParams(window.location.search).get('code');

        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          window.history.replaceState({}, '', '/reset-password');
        } else if (code) {
          await supabase.auth.exchangeCodeForSession(code);
          window.history.replaceState({}, '', '/reset-password');
        }

        if (mounted) setSessionReady(true);
      } catch {
        if (mounted) {
          setError('El enlace no es válido o expiró. Solicitá uno nuevo.');
          setSessionReady(false);
        }
      }
    }

    prepareRecoverySession();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    setError('');
    setInfoMessage('');

    if (!sessionReady) {
      setError('El enlace no es válido o expiró. Solicitá uno nuevo.');
      return;
    }

    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }

    if (!confirmPassword) {
      setError('Confirmá la nueva contraseña.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    try {
      setIsSubmitting(true);
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setInfoMessage('Contraseña actualizada correctamente.');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', py: 3 }}>
        <Card sx={{ width: '100%', boxShadow: '0 14px 30px rgba(15,23,42,0.18)', borderRadius: 3, overflow: 'hidden' }}>
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
              alt="Servifood Logo"
              sx={{ width: '100%', maxWidth: 210, height: 84, objectFit: 'contain', mx: 'auto', display: 'block' }}
            />
            <Typography sx={{ mt: 1, color: 'rgba(255,255,255,0.9)', fontSize: 13 }}>
              Plataforma de análisis de calidad
            </Typography>
          </Box>
          <CardContent sx={{ p: 3.5, backgroundColor: '#ffffff' }}>
            <Typography variant="h5" component="h1" align="center" sx={{ mb: 2, fontWeight: 700 }}>
              Restablecer contraseña
            </Typography>
            <Typography variant="body2" color="textSecondary" align="center" sx={{ mb: 3 }}>
              Ingresá y confirmá tu nueva contraseña.
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {infoMessage && <Alert severity="success" sx={{ mb: 2 }}>{infoMessage}</Alert>}

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Nueva contraseña"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                disabled={isSubmitting}
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword((prev) => !prev)}
                        edge="end"
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        disabled={isSubmitting}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />

              <TextField
                fullWidth
                label="Confirmar nueva contraseña"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                margin="normal"
                disabled={isSubmitting}
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        edge="end"
                        aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        disabled={isSubmitting}
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 2, mb: 1.5, py: 1.5, backgroundColor: '#1d4ed8', '&:hover': { backgroundColor: '#1e3a8a' } }}
                disabled={isSubmitting}
              >
                {isSubmitting ? <CircularProgress size={24} /> : 'Actualizar contraseña'}
              </Button>

              <Box sx={{ textAlign: 'center' }}>
                <Button type="button" onClick={onBackToLogin} sx={{ textTransform: 'none', fontWeight: 600 }}>
                  Volver a iniciar sesión
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}

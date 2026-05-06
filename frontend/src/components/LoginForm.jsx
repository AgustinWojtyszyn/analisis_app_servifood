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
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
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

function sanitizeAuthErrorMessage(err) {
  const message = (err?.message || '').toLowerCase();
  const status = err?.status;

  if (message.includes('user already registered') || message.includes('already been registered')) {
    return 'Este email ya está registrado. Iniciá sesión o reenviá el correo de confirmación.';
  }

  if (message.includes('invalid login credentials')) {
    return 'Credenciales inválidas. Verificá email y contraseña.';
  }

  if (message.includes('email not confirmed')) {
    return 'Tu email todavía no está confirmado. Revisá tu correo o reenviá la confirmación.';
  }

  if (message.includes('password should be at least') || message.includes('password is too weak')) {
    return 'La contraseña es muy corta. Usá al menos 6 caracteres.';
  }

  if (status === 400 && (message.includes('redirect') || message.includes('site url') || message.includes('not allowed'))) {
    return 'Error de configuración de redirección de email. Contactá a soporte.';
  }

  return err?.message || 'Error de autenticación. Intentá nuevamente.';
}

export default function LoginForm({ onLoginSuccess, initialMode = 'login', onBackToLanding, onSwitchMode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(initialMode === 'register');
  const [name, setName] = useState('');

  React.useEffect(() => {
    setIsRegister(initialMode === 'register');
  }, [initialMode]);

  const validateInputs = () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError('Ingresá un email válido.');
      return false;
    }

    if (!password || password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return false;
    }

    if (isRegister && !name.trim()) {
      setError('Ingresá tu nombre.');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    const emailRedirectTo = resolveAuthRedirectUrl();
    console.info('[auth] register_attempt', { email: email.trim(), emailRedirectTo });

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { name: name.trim() },
        emailRedirectTo
      }
    });

    if (signUpError) {
      console.warn('[auth] register_error', {
        message: signUpError.message,
        status: signUpError.status
      });
      throw signUpError;
    }

    console.info('[auth] register_result', {
      hasUser: Boolean(data?.user),
      hasSession: Boolean(data?.session)
    });

    if (!data?.session) {
      setInfoMessage('Cuenta creada. Revisá tu correo para confirmar la cuenta.');
      return;
    }

    onLoginSuccess(mapSupabaseUser(data.session.user));
  };

  const handleLogin = async () => {
    console.info('[auth] login_attempt', { email: email.trim() });

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (signInError) {
      console.warn('[auth] login_error', {
        message: signInError.message,
        status: signInError.status
      });
      throw signInError;
    }

    console.info('[auth] login_result', {
      hasUser: Boolean(data?.user),
      hasSession: Boolean(data?.session)
    });

    onLoginSuccess(mapSupabaseUser(data.user));
  };

  const handleResendConfirmation = async () => {
    setError('');
    setInfoMessage('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Ingresá el email para reenviar la confirmación.');
      return;
    }

    try {
      setLoading(true);
      const emailRedirectTo = resolveAuthRedirectUrl();
      console.info('[auth] resend_confirmation_attempt', { email: trimmedEmail, emailRedirectTo });

      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: trimmedEmail,
        options: { emailRedirectTo }
      });

      if (resendError) {
        console.warn('[auth] resend_confirmation_error', {
          message: resendError.message,
          status: resendError.status
        });
        throw resendError;
      }

      setInfoMessage('Correo de confirmación reenviado. Revisá tu bandeja y spam.');
    } catch (err) {
      setError(sanitizeAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (!validateInputs()) {
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        await handleRegister();
        return;
      }

      await handleLogin();
    } catch (err) {
      setError(sanitizeAuthErrorMessage(err));
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
              alt="Servifood Logo"
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
            {infoMessage && <Alert severity="success" sx={{ mb: 2 }}>{infoMessage}</Alert>}

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

              {!isRegister && (
                <Button
                  type="button"
                  fullWidth
                  variant="text"
                  sx={{ mt: -1, mb: 1.5, textTransform: 'none' }}
                  onClick={handleResendConfirmation}
                  disabled={loading}
                >
                  Reenviar correo de confirmación
                </Button>
              )}

              <Box sx={{ textAlign: 'center' }}>
                {onBackToLanding && (
                  <Button
                    onClick={onBackToLanding}
                    startIcon={<ArrowBackRoundedIcon />}
                    sx={{ mb: 1.25, textTransform: 'none', fontWeight: 600 }}
                  >
                    Volver al inicio
                  </Button>
                )}
                <Typography variant="body2">
                  {isRegister ? 'Ya tienes cuenta?' : 'No tienes cuenta?'}{' '}
                  <MuiLink
                    component="button"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      const nextIsRegister = !isRegister;
                      if (onSwitchMode) {
                        onSwitchMode(nextIsRegister ? 'register' : 'login');
                      } else {
                        setIsRegister(nextIsRegister);
                      }
                      setError('');
                      setInfoMessage('');
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

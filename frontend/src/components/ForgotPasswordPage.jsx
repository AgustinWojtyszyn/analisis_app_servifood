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
  CircularProgress
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { supabase } from '../lib/supabaseClient';
import servifoodLogo from '../assets/servifood_logo_white_text_HQ.png';

const GENERIC_SUCCESS_MESSAGE = 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.';

function isValidEmail(value) {
  const email = String(value || '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function ForgotPasswordPage({ onBackToLogin }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    setError('');
    setInfoMessage('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Ingresá tu correo.');
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setError('Ingresá un correo válido.');
      return;
    }

    try {
      setIsSubmitting(true);
      await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      setInfoMessage(GENERIC_SUCCESS_MESSAGE);
    } catch {
      setInfoMessage(GENERIC_SUCCESS_MESSAGE);
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
              Recuperar contraseña
            </Typography>
            <Typography variant="body2" color="textSecondary" align="center" sx={{ mb: 3 }}>
              Ingresá tu correo para recibir un enlace de restablecimiento.
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {infoMessage && <Alert severity="success" sx={{ mb: 2 }}>{infoMessage}</Alert>}

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="normal"
                disabled={isSubmitting}
                required
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 2, mb: 1.5, py: 1.5, backgroundColor: '#1d4ed8', '&:hover': { backgroundColor: '#1e3a8a' } }}
                disabled={isSubmitting}
              >
                {isSubmitting ? <CircularProgress size={24} /> : 'Enviar enlace'}
              </Button>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, textAlign: 'center' }}>
                ¿No recordás tu correo? Contactá al administrador.
              </Typography>

              <Box sx={{ textAlign: 'center' }}>
                <Button
                  type="button"
                  onClick={onBackToLogin}
                  startIcon={<ArrowBackRoundedIcon />}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                  disabled={isSubmitting}
                >
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

import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  TextField,
  Typography
} from '@mui/material';
import { supabase } from '../lib/supabaseClient';

function formatDate(value) {
  if (!value) return 'N/D';
  try {
    return new Date(value).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'N/D';
  }
}

export default function ProfilePage({ user, onProfileUpdated }) {
  const userId = user?.id || null;
  const userEmail = user?.email || '';
  const userName = user?.name || '';
  const userRole = user?.role || 'user';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profile, setProfile] = useState({
    email: userEmail,
    full_name: userName,
    role: userRole,
    is_active: true,
    created_at: null
  });

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      if (!userId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, is_active, created_at')
        .eq('id', userId)
        .maybeSingle();

      if (!mounted) return;

      if (profileError) {
        setError(profileError.message || 'No se pudo cargar el perfil');
      } else if (data) {
        onProfileUpdated?.({ role: data.role, full_name: data.full_name, is_active: data.is_active });
        setProfile({
          email: data.email || userEmail || '',
          full_name: data.full_name || '',
          role: data.role || userRole || 'user',
          is_active: data.is_active ?? true,
          created_at: data.created_at || null
        });
      } else {
        setProfile((prev) => ({
          ...prev,
          email: userEmail || prev.email,
          full_name: userName || prev.full_name,
          role: userRole || prev.role
        }));
      }

      setLoading(false);
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [userId]);

  const handleSave = async () => {
    if (!userId) return;

    setSaving(true);
    setError('');
    setSuccess('');

    const { data: updatedRows, error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: profile.full_name })
      .eq('id', userId)
      .select('id');

    if (updateError) {
      setError(updateError.message || 'No se pudo guardar el perfil');
    } else if (!updatedRows?.length) {
      setError('No se encontró el perfil para actualizar.');
    } else {
      setSuccess('Perfil actualizado correctamente');
      onProfileUpdated?.({ full_name: profile.full_name });
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent sx={{ p: 3, textAlign: 'center' }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
          Mi Perfil
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2.5 }}>
          Gestioná tus datos personales y revisá tu estado de usuario.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Email" value={profile.email} InputProps={{ readOnly: true }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Nombre completo"
              value={profile.full_name}
              onChange={(e) => setProfile((prev) => ({ ...prev, full_name: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="Rol" value={profile.role} InputProps={{ readOnly: true }} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Estado"
              value={profile.is_active ? 'Activo' : 'Inactivo'}
              InputProps={{ readOnly: true }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Fecha de alta"
              value={formatDate(profile.created_at)}
              InputProps={{ readOnly: true }}
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 2.5, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}

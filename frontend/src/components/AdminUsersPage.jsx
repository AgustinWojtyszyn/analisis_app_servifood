import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Switch
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

export default function AdminUsersPage({ currentUserId, onCurrentUserUpdated }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const usersById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError('');

    const { data, error: loadError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, is_active, created_at')
      .order('created_at', { ascending: false });

    if (loadError) {
      setError(loadError.message || 'No se pudieron cargar los usuarios');
      setUsers([]);
    } else {
      setUsers(data || []);
    }

    setLoading(false);
  };

  const handleRoleChange = (id, role) => {
    setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, role } : user)));
  };

  const handleActiveChange = (id, isActive) => {
    setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, is_active: isActive } : user)));
  };

  const handleSave = async (id) => {
    const target = usersById.get(id);
    if (!target) return;

    setSavingId(id);
    setError('');
    setSuccess('');

    const { data, error: updateError } = await supabase
      .from('profiles')
      .update({ role: target.role, is_active: target.is_active })
      .eq('id', id)
      .select('id, role, is_active')
      .maybeSingle();

    if (updateError || !data) {
      setError(updateError?.message || 'No se pudo guardar el usuario');
    } else {
      setSuccess('Usuario actualizado correctamente');
      if (id === currentUserId) {
        onCurrentUserUpdated?.({ role: data.role, is_active: data.is_active });
      }
    }

    setSavingId(null);
  };

  return (
    <Card>
      <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
          Gestión de usuarios
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2.5 }}>
          Administrá permisos, rol y estado de acceso de los usuarios registrados.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Nombre</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Rol</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Activo</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Fecha alta</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Acción</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading && users.map((profile) => (
                <TableRow key={profile.id} hover>
                  <TableCell>{profile.email}</TableCell>
                  <TableCell>{profile.full_name || 'Sin nombre'}</TableCell>
                  <TableCell sx={{ minWidth: 130 }}>
                    <TextField
                      select
                      size="small"
                      value={profile.role || 'user'}
                      onChange={(e) => handleRoleChange(profile.id, e.target.value)}
                      fullWidth
                    >
                      <MenuItem value="user">user</MenuItem>
                      <MenuItem value="admin">admin</MenuItem>
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={Boolean(profile.is_active)}
                      onChange={(e) => handleActiveChange(profile.id, e.target.checked)}
                      inputProps={{ 'aria-label': `estado-${profile.email}` }}
                    />
                  </TableCell>
                  <TableCell>{formatDate(profile.created_at)}</TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleSave(profile.id)}
                      disabled={savingId === profile.id}
                    >
                      {savingId === profile.id ? 'Guardando...' : 'Guardar'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {loading && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Box sx={{ py: 2, textAlign: 'center', color: 'text.secondary' }}>Cargando usuarios...</Box>
                  </TableCell>
                </TableRow>
              )}
              {!loading && users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Box sx={{ py: 2, textAlign: 'center', color: 'text.secondary' }}>No hay usuarios disponibles.</Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}

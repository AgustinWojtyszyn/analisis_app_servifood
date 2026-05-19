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
import { deleteAdminUser, getAdminUsers, updateAdminUser } from '../services/adminUsersService';

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
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const usersById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getAdminUsers();
      setUsers(data || []);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los usuarios');
      setUsers([]);
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

    try {
      const data = await updateAdminUser(id, {
        role: target.role,
        is_active: Boolean(target.is_active)
      });
      setSuccess('Usuario actualizado correctamente');
      if (id === currentUserId) {
        onCurrentUserUpdated?.({ role: data.role, is_active: data.is_active });
      }
    } catch (err) {
      setError(err.message || 'No se pudo guardar el usuario');
    }

    setSavingId(null);
  };

  const handleDeleteUser = async (profile) => {
    if (!profile?.id) return;
    if (profile.id === currentUserId) {
      setError('No podés eliminar tu propio usuario desde esta pantalla');
      return;
    }

    const firstConfirm = window.confirm(`¿Seguro que querés eliminar al usuario ${profile.email}? Esta acción no se puede deshacer.`);
    if (!firstConfirm) return;

    const secondConfirm = window.prompt(`Escribí ELIMINAR para confirmar la baja de ${profile.email}:`);
    if (secondConfirm !== 'ELIMINAR') {
      setError('Confirmación inválida. No se eliminó el usuario.');
      return;
    }

    setDeletingId(profile.id);
    setError('');
    setSuccess('');

    try {
      await deleteAdminUser(profile.id);
      setUsers((prev) => prev.filter((user) => user.id !== profile.id));
      setSuccess('Usuario eliminado correctamente');
    } catch (err) {
      setError(err.message || 'No se pudo eliminar el usuario');
    }

    setDeletingId(null);
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
                      <MenuItem value="nutricionista">nutricionista</MenuItem>
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
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleSave(profile.id)}
                        disabled={savingId === profile.id || deletingId === profile.id}
                      >
                        {savingId === profile.id ? 'Guardando...' : 'Guardar'}
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => handleDeleteUser(profile)}
                        disabled={savingId === profile.id || deletingId === profile.id || profile.id === currentUserId}
                      >
                        {deletingId === profile.id ? 'Eliminando...' : 'Eliminar usuario'}
                      </Button>
                    </Box>
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

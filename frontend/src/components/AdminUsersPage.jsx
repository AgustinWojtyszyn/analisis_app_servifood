import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import PersonOffRoundedIcon from '@mui/icons-material/PersonOffRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import RestaurantRoundedIcon from '@mui/icons-material/RestaurantRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import { deleteAdminUser, getAdminUsers, updateAdminUser } from '../services/adminUsersService';

const ROLE_LABELS = {
  user: 'Usuario',
  nutricionista: 'Nutricionista',
  admin: 'Administrador'
};

function formatDate(value) {
  if (!value) return 'N/D';
  try {
    return new Date(value).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'N/D';
  }
}

function formatDateTime(value) {
  if (!value) return 'Nunca';
  try {
    return new Date(value).toLocaleString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'N/D';
  }
}

function snapshotUsers(users = []) {
  return Object.fromEntries((users || []).map((user) => [user.id, { ...user }]));
}

function StatCard({ icon: Icon, label, value, helper }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.25, borderRadius: 2.5, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: 'rgba(29,78,216,0.08)', color: 'primary.main', display: 'grid', placeItems: 'center' }}>
          <Icon fontSize="small" />
        </Box>
        <Box>
          <Typography color="text.secondary" sx={{ fontSize: 12.5, fontWeight: 800 }}>{label}</Typography>
          <Typography sx={{ fontSize: 25, lineHeight: 1.1, fontWeight: 900 }}>{value}</Typography>
        </Box>
      </Box>
      {helper && <Typography color="text.secondary" sx={{ mt: 1.25, fontSize: 12 }}>{helper}</Typography>}
    </Paper>
  );
}

export default function AdminUsersPage({ currentUserId, onCurrentUserUpdated }) {
  const [users, setUsers] = useState([]);
  const [baselineById, setBaselineById] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

  const stats = useMemo(() => {
    const active = users.filter((user) => Boolean(user.is_active)).length;
    const admins = users.filter((user) => user.role === 'admin' && user.is_active).length;
    const nutritionists = users.filter((user) => user.role === 'nutricionista' && user.is_active).length;
    const withoutLogin = users.filter((user) => user.auth_user_exists !== false && !user.last_sign_in_at).length;
    return { total: users.length, active, admins, nutritionists, withoutLogin };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((profile) => {
      const matchesSearch = !query || [
        profile.email,
        profile.full_name,
        profile.role,
        ROLE_LABELS[profile.role]
      ].some((value) => String(value || '').toLowerCase().includes(query));

      const role = String(profile.role || 'user').toLowerCase();
      const matchesRole = roleFilter === 'all' || role === roleFilter;

      const isActive = Boolean(profile.is_active);
      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'active' && isActive)
        || (statusFilter === 'inactive' && !isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [roleFilter, search, statusFilter, users]);

  const hasActiveFilters = Boolean(search.trim()) || roleFilter !== 'all' || statusFilter !== 'all';

  const isDirty = (profile) => {
    const baseline = baselineById[profile.id];
    if (!baseline) return false;
    return String(profile.role || 'user') !== String(baseline.role || 'user')
      || Boolean(profile.is_active) !== Boolean(baseline.is_active);
  };

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = await getAdminUsers();
      const normalized = data || [];
      setUsers(normalized);
      setBaselineById(snapshotUsers(normalized));
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los usuarios');
      setUsers([]);
      setBaselineById({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = (id, role) => {
    setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, role } : user)));
  };

  const handleActiveChange = (id, isActive) => {
    if (id === currentUserId && !isActive) {
      setError('No podés desactivar tu propio usuario');
      return;
    }
    setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, is_active: isActive } : user)));
  };

  const handleResetRow = (id) => {
    const baseline = baselineById[id];
    if (!baseline) return;
    setUsers((prev) => prev.map((user) => (user.id === id ? { ...baseline } : user)));
  };

  const handleSave = async (id) => {
    const target = usersById.get(id);
    if (!target || !isDirty(target)) return;

    if (id === currentUserId && target.role !== 'admin') {
      const confirmed = window.confirm('Estás por quitarte permisos de administrador. ¿Querés continuar?');
      if (!confirmed) {
        handleResetRow(id);
        return;
      }
    }

    setSavingId(id);
    setError('');
    setSuccess('');

    try {
      const data = await updateAdminUser(id, {
        role: target.role,
        is_active: Boolean(target.is_active)
      });
      const merged = { ...target, ...data };
      setUsers((prev) => prev.map((user) => (user.id === id ? merged : user)));
      setBaselineById((prev) => ({ ...prev, [id]: { ...merged } }));
      setSuccess(`Cambios guardados para ${target.email}`);
      if (id === currentUserId) {
        onCurrentUserUpdated?.({ role: data.role, is_active: data.is_active });
      }
    } catch (err) {
      handleResetRow(id);
      setError(err.message || 'No se pudo guardar el usuario');
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteUser = async (profile) => {
    if (!profile?.id) return;
    if (profile.id === currentUserId) {
      setError('No podés dar de baja tu propio usuario desde esta pantalla');
      return;
    }

    const firstConfirm = window.confirm(`¿Dar de baja a ${profile.email}? Se desactivará su acceso y se eliminará su cuenta de autenticación.`);
    if (!firstConfirm) return;

    const secondConfirm = window.prompt(`Escribí BAJA para confirmar la baja de ${profile.email}:`);
    if (secondConfirm !== 'BAJA') {
      setError('Confirmación inválida. No se modificó el usuario.');
      return;
    }

    setDeletingId(profile.id);
    setError('');
    setSuccess('');

    try {
      await deleteAdminUser(profile.id);
      const deactivated = {
        ...profile,
        role: 'user',
        is_active: false,
        auth_user_exists: false
      };
      setUsers((prev) => prev.map((user) => (user.id === profile.id ? deactivated : user)));
      setBaselineById((prev) => ({ ...prev, [profile.id]: { ...deactivated } }));
      setSuccess(`${profile.email} fue dado de baja correctamente`);
    } catch (err) {
      setError(err.message || 'No se pudo dar de baja el usuario');
      await loadUsers();
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setRoleFilter('all');
    setStatusFilter('all');
  };

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Card>
        <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5 }}>
                Gestión de usuarios
              </Typography>
              <Typography color="text.secondary">
                Administrá roles, estado de acceso y cuentas registradas. Las altas nuevas continúan realizándose desde el registro público.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<RefreshRoundedIcon />}
              onClick={loadUsers}
              disabled={loading}
              sx={{ textTransform: 'none', fontWeight: 800 }}
            >
              Actualizar
            </Button>
          </Box>
        </CardContent>
      </Card>

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 1.5 }}>
        <StatCard icon={GroupsRoundedIcon} label="Usuarios" value={stats.total} helper={`${stats.active} activos`} />
        <StatCard icon={VerifiedUserRoundedIcon} label="Administradores activos" value={stats.admins} helper="Protegido: siempre debe quedar al menos uno" />
        <StatCard icon={RestaurantRoundedIcon} label="Nutricionistas activos" value={stats.nutritionists} />
        <StatCard icon={PersonOffRoundedIcon} label="Sin primer ingreso" value={stats.withoutLogin} helper="Según datos disponibles de Auth" />
      </Box>

      <Card>
        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, 1fr) 180px 180px auto' },
              gap: 1.5,
              alignItems: 'center'
            }}
          >
            <TextField
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por email, nombre o rol"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" />
                  </InputAdornment>
                )
              }}
            />
            <TextField select size="small" label="Rol" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="user">Usuario</MenuItem>
              <MenuItem value="nutricionista">Nutricionista</MenuItem>
              <MenuItem value="admin">Administrador</MenuItem>
            </TextField>
            <TextField select size="small" label="Estado" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="active">Activos</MenuItem>
              <MenuItem value="inactive">Inactivos</MenuItem>
            </TextField>
            <Button variant="outlined" size="small" onClick={handleClearFilters} disabled={!hasActiveFilters} sx={{ minHeight: 40, whiteSpace: 'nowrap' }}>
              Limpiar filtros
            </Button>
          </Box>

          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Mostrando {filteredUsers.length} de {users.length} usuarios
          </Typography>

          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 1040 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Usuario</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Rol</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Acceso</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Cuenta</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Último ingreso</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Alta</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!loading && filteredUsers.map((profile) => {
                  const dirty = isDirty(profile);
                  const authMissing = profile.auth_user_exists === false;
                  const isSelf = profile.id === currentUserId;

                  return (
                    <TableRow key={profile.id} hover sx={{ bgcolor: dirty ? 'action.hover' : 'inherit' }}>
                      <TableCell>
                        <Typography sx={{ fontWeight: 800, fontSize: 13.5 }}>{profile.full_name || 'Sin nombre'}</Typography>
                        <Typography color="text.secondary" sx={{ fontSize: 12.5 }}>{profile.email}</Typography>
                        {isSelf && <Chip label="Tu cuenta" size="small" color="primary" variant="outlined" sx={{ mt: 0.7, height: 22 }} />}
                      </TableCell>
                      <TableCell sx={{ minWidth: 160 }}>
                        <TextField
                          select
                          size="small"
                          value={profile.role || 'user'}
                          onChange={(e) => handleRoleChange(profile.id, e.target.value)}
                          fullWidth
                          disabled={authMissing}
                        >
                          <MenuItem value="user">Usuario</MenuItem>
                          <MenuItem value="nutricionista">Nutricionista</MenuItem>
                          <MenuItem value="admin">Administrador</MenuItem>
                        </TextField>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={authMissing ? 'La cuenta de autenticación fue dada de baja' : isSelf ? 'No podés desactivar tu propia cuenta' : ''}>
                          <span>
                            <Switch
                              checked={Boolean(profile.is_active)}
                              onChange={(e) => handleActiveChange(profile.id, e.target.checked)}
                              disabled={authMissing || (isSelf && profile.is_active)}
                              inputProps={{ 'aria-label': `estado-${profile.email}` }}
                            />
                          </span>
                        </Tooltip>
                        <Chip
                          size="small"
                          label={profile.is_active ? 'Activo' : 'Inactivo'}
                          color={profile.is_active ? 'success' : 'default'}
                          variant={profile.is_active ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={authMissing ? 'Dada de baja' : profile.email_confirmed_at ? 'Confirmada' : 'Pendiente'}
                          color={authMissing ? 'default' : profile.email_confirmed_at ? 'success' : 'warning'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(profile.last_sign_in_at)}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(profile.created_at)}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                          <Button
                            variant={dirty ? 'contained' : 'outlined'}
                            size="small"
                            onClick={() => handleSave(profile.id)}
                            disabled={!dirty || savingId === profile.id || deletingId === profile.id || authMissing}
                            sx={{ textTransform: 'none', fontWeight: 800 }}
                          >
                            {savingId === profile.id ? 'Guardando...' : 'Guardar'}
                          </Button>
                          {dirty && (
                            <Button size="small" onClick={() => handleResetRow(profile.id)} disabled={savingId === profile.id} sx={{ textTransform: 'none' }}>
                              Deshacer
                            </Button>
                          )}
                          {!authMissing && (
                            <Button
                              variant="text"
                              color="error"
                              size="small"
                              onClick={() => handleDeleteUser(profile)}
                              disabled={savingId === profile.id || deletingId === profile.id || isSelf}
                              sx={{ textTransform: 'none', fontWeight: 800 }}
                            >
                              {deletingId === profile.id ? 'Dando de baja...' : 'Dar de baja'}
                            </Button>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {loading && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Box sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>Cargando usuarios...</Box>
                    </TableCell>
                  </TableRow>
                )}
                {!loading && users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Box sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>No hay usuarios disponibles.</Box>
                    </TableCell>
                  </TableRow>
                )}
                {!loading && users.length > 0 && filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Box sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>No hay usuarios que coincidan con los filtros.</Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}

import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { deleteHealthDeclarationById, exportHealthDeclarations, getAdminHealthDeclarations } from '../services/healthDeclarations';

function yesNo(value) {
  return value ? 'Sí' : 'No';
}

export default function HealthDeclarationsAdminPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getAdminHealthDeclarations();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'No se pudo cargar declaraciones');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    try {
      await deleteHealthDeclarationById(id);
      setRows((prev) => prev.filter((row) => row.id !== id));
    } catch (err) {
      setError(err.message || 'No se pudo eliminar');
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Gestor de Declaraciones de Salud</Typography>
          <Button variant="outlined" onClick={exportHealthDeclarations}>Exportar Excel</Button>
        </Box>

        {loading && <CircularProgress size={22} />}
        {!loading && error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}

        {!loading && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Síntomas</TableCell>
                  <TableCell>Fiebre</TableCell>
                  <TableCell>Contacto</TableCell>
                  <TableCell>Política</TableCell>
                  <TableCell>Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.userName}</TableCell>
                    <TableCell>{item.userEmail || '-'}</TableCell>
                    <TableCell>{new Date(item.declaredAt || item.createdAt).toLocaleString('es-AR')}</TableCell>
                    <TableCell>{yesNo(item.hasSymptoms)}</TableCell>
                    <TableCell>{yesNo(item.hasFever)}</TableCell>
                    <TableCell>{yesNo(item.recentContact)}</TableCell>
                    <TableCell>{item.policyAccepted ? 'Aceptada' : 'No'}</TableCell>
                    <TableCell>
                      <Button size="small" color="error" onClick={() => remove(item.id)}>Eliminar</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!rows.length && (
                  <TableRow>
                    <TableCell colSpan={8}>No hay declaraciones registradas.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}

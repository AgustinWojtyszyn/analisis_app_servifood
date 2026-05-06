import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { deleteHealthDeclarationById, exportHealthDeclarations, getAdminHealthDeclarations } from '../services/healthDeclarations';

function yesNo(value) {
  return value ? 'Sí' : 'No';
}

function getTrafficLightStyles(trafficLight) {
  const value = String(trafficLight || '').toLowerCase();
  if (value === 'rojo') {
    return {
      rowBg: '#fee2e2',
      cellBg: '#fee2e2',
      cellColor: '#991b1b'
    };
  }
  if (value === 'amarillo') {
    return {
      rowBg: '#fef9c3',
      cellBg: '#fef9c3',
      cellColor: '#854d0e'
    };
  }
  if (value === 'verde') {
    return {
      rowBg: '#dcfce7',
      cellBg: '#dcfce7',
      cellColor: '#166534'
    };
  }
  return {
    rowBg: 'transparent',
    cellBg: 'transparent',
    cellColor: 'inherit'
  };
}

export default function HealthDeclarationsAdminPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const visibleRows = rows.filter((row) => {
    const statusOk = statusFilter === 'all' || String(row.healthStatus || '').toLowerCase() === statusFilter;
    const declared = new Date(row.declaredAt || row.createdAt || 0);
    const fromOk = !fromDate || declared >= new Date(`${fromDate}T00:00:00`);
    const toOk = !toDate || declared <= new Date(`${toDate}T23:59:59`);
    return statusOk && fromOk && toOk;
  });
  const yellowOrRed = rows.filter((row) => ['Rojo', 'Amarillo'].includes(String(row.trafficLight || ''))).length;

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
        <Box sx={{ display: 'flex', gap: 1, mb: 1.25, flexWrap: 'wrap' }}>
          <TextField
            select
            size="small"
            label="Filtrar estado"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="all">Todos</MenuItem>
            <MenuItem value="apto">Apto</MenuItem>
            <MenuItem value="requiere evaluación">Requiere evaluación</MenuItem>
            <MenuItem value="no apto">No Apto</MenuItem>
          </TextField>
          <TextField
            size="small"
            type="date"
            label="Desde"
            InputLabelProps={{ shrink: true }}
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <TextField
            size="small"
            type="date"
            label="Hasta"
            InputLabelProps={{ shrink: true }}
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
          {yellowOrRed > 0 && <Alert severity="warning">Alertas activas: {yellowOrRed} casos Amarillo/Rojo</Alert>}
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
                  <TableCell>Estado</TableCell>
                  <TableCell>Semáforo</TableCell>
                  <TableCell>Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleRows.map((item) => (
                  <TableRow
                    key={item.id}
                    sx={() => {
                      const styles = getTrafficLightStyles(item.trafficLight);
                      return {
                        '& td': {
                          backgroundColor: styles.rowBg,
                          color: styles.cellColor
                        },
                        '&:hover td': {
                          backgroundColor: styles.rowBg
                        }
                      };
                    }}
                  >
                    <TableCell>{item.userName}</TableCell>
                    <TableCell>{item.userEmail || '-'}</TableCell>
                    <TableCell>{new Date(item.declaredAt || item.createdAt).toLocaleString('es-AR')}</TableCell>
                    <TableCell>{yesNo(item.hasSymptoms)}</TableCell>
                    <TableCell>{yesNo(item.hasFever)}</TableCell>
                    <TableCell>{yesNo(item.recentContact)}</TableCell>
                    <TableCell>{item.policyAccepted ? 'Aceptada' : 'No'}</TableCell>
                    <TableCell>{item.healthStatus || '-'}</TableCell>
                    <TableCell
                      sx={{
                        backgroundColor: getTrafficLightStyles(item.trafficLight).rowBg,
                        color: getTrafficLightStyles(item.trafficLight).cellColor,
                        fontWeight: 700
                      }}
                    >
                      {item.trafficLight || '-'}
                    </TableCell>
                    <TableCell>
                      <Button size="small" color="error" onClick={() => remove(item.id)}>Eliminar</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!visibleRows.length && (
                  <TableRow>
                    <TableCell colSpan={10}>No hay declaraciones registradas.</TableCell>
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

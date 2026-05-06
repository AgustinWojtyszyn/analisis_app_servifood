import React, { useEffect, useState } from 'react';
import { Alert, Card, CardContent, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { getMyHealthDeclarations } from '../services/healthDeclarations';

function yesNo(value) {
  return value ? 'Sí' : 'No';
}

function getTrafficLightStyles(trafficLight) {
  const value = String(trafficLight || '').toLowerCase();
  if (value === 'rojo') {
    return {
      rowBg: 'rgba(220, 38, 38, 0.14)',
      cellBg: '#dc2626',
      cellColor: '#ffffff'
    };
  }
  if (value === 'amarillo') {
    return {
      rowBg: 'rgba(245, 158, 11, 0.16)',
      cellBg: '#f59e0b',
      cellColor: '#111827'
    };
  }
  if (value === 'verde') {
    return {
      rowBg: 'rgba(22, 163, 74, 0.14)',
      cellBg: '#16a34a',
      cellColor: '#ffffff'
    };
  }
  return {
    rowBg: 'transparent',
    cellBg: 'transparent',
    cellColor: 'inherit'
  };
}

export default function HealthDeclarationHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getMyHealthDeclarations();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'No se pudo cargar el historial');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.5 }}>Mi Historial de Declaraciones</Typography>
        {loading && <CircularProgress size={22} />}
        {!loading && error && <Alert severity="error">{error}</Alert>}
        {!loading && !error && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Síntomas</TableCell>
                  <TableCell>Fiebre</TableCell>
                  <TableCell>Contacto</TableCell>
                  <TableCell>Política</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Semáforo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((item) => (
                  <TableRow
                    key={item.id}
                    sx={{
                      backgroundColor: getTrafficLightStyles(item.trafficLight).rowBg,
                      '&:hover': {
                        backgroundColor: getTrafficLightStyles(item.trafficLight).rowBg
                      }
                    }}
                  >
                    <TableCell>{new Date(item.declaredAt || item.createdAt).toLocaleString('es-AR')}</TableCell>
                    <TableCell>{yesNo(item.hasSymptoms)}</TableCell>
                    <TableCell>{yesNo(item.hasFever)}</TableCell>
                    <TableCell>{yesNo(item.recentContact)}</TableCell>
                    <TableCell>{item.policyAccepted ? 'Aceptada' : 'No'}</TableCell>
                    <TableCell>{item.healthStatus || '-'}</TableCell>
                    <TableCell
                      sx={{
                        backgroundColor: getTrafficLightStyles(item.trafficLight).cellBg,
                        color: getTrafficLightStyles(item.trafficLight).cellColor,
                        fontWeight: 700
                      }}
                    >
                      {item.trafficLight || '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>Sin declaraciones cargadas.</TableCell>
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

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

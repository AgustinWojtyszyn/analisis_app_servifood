import React, { useEffect, useState } from 'react';
import { Alert, Card, CardContent, CircularProgress, Typography } from '@mui/material';
import { getActiveHealthPolicy } from '../services/healthDeclarations';

export default function HealthPoliciesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [policy, setPolicy] = useState(null);

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getActiveHealthPolicy();
      setPolicy(data || null);
    } catch (err) {
      setError(err.message || 'No se pudo cargar la política activa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Políticas Internas</Typography>
        {loading && <CircularProgress size={22} />}
        {!loading && error && <Alert severity="error">{error}</Alert>}
        {!loading && !error && !policy && <Alert severity="info">No hay política activa configurada.</Alert>}
        {!loading && !error && policy && (
          <>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>{policy.title || policy.name || 'Política activa'}</Typography>
            <Typography sx={{ whiteSpace: 'pre-wrap' }} color="text.secondary">
              {policy.content || policy.text || 'Sin contenido cargado.'}
            </Typography>
            <Typography sx={{ mt: 2, whiteSpace: 'pre-wrap' }} color="text.secondary">
              {'La Declaración Jurada de Salud permite prevenir riesgos de transmisión a través de alimentos. Debe completarse antes de iniciar tareas y cualquier síntoma o lesión debe informarse al supervisor o al área de Calidad. La información declarada es confidencial.'}
            </Typography>
          </>
        )}
      </CardContent>
    </Card>
  );
}

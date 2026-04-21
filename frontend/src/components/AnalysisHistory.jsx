import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Alert,
  Typography,
  Skeleton
} from '@mui/material';
import { getAnalysisHistory, deleteAnalysis } from '../services/analysis';

export default function AnalysisHistory({ onSelectAnalysis }) {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const { data, error: historyError } = await getAnalysisHistory();

      if (historyError) {
        throw new Error(historyError.message || 'Error cargando historial');
      }

      setAnalyses(data || []);
    } catch (err) {
      setError(err.message || 'Error cargando historial');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const { error: deleteError } = await deleteAnalysis(id);
    if (deleteError) {
      setError(deleteError.message || 'No se pudo eliminar el analisis');
      return;
    }
    setAnalyses((prev) => prev.filter((item) => item.id !== id));
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Skeleton variant="text" width="30%" height={34} />
        <Skeleton variant="rounded" height={46} sx={{ mt: 1.5 }} />
        <Skeleton variant="rounded" height={46} sx={{ mt: 1 }} />
        <Skeleton variant="rounded" height={46} sx={{ mt: 1 }} />
      </Paper>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (analyses.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
          No hay análisis aún
        </Typography>
        <Typography color="text.secondary">
          Cuando subas tu primer Excel, aparecerá aquí en el historial.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ overflow: 'hidden' }}>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Archivo</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Fecha</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Registros</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {analyses.map((analysis) => (
              <TableRow key={analysis.id} hover>
                <TableCell>{analysis.filename}</TableCell>
                <TableCell>
                  {new Date(analysis.created_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </TableCell>
                <TableCell>{analysis.results?.totalRecords || 0}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => onSelectAnalysis(analysis.id)}
                    >
                      Ver Detalles
                    </Button>
                    <Button
                      variant="text"
                      color="error"
                      size="small"
                      onClick={() => handleDelete(analysis.id)}
                    >
                      Eliminar
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

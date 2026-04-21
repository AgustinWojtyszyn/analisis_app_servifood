import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Alert,
  CircularProgress,
  Paper
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { uploadExcel } from '../services/analysis';

export default function FileUpload({ onUploadSuccess }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setSelectedFile(file);
        setError('');
      } else {
        setError('Solo se aceptan archivos .xlsx o .xls');
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setSelectedFile(file);
        setError('');
      } else {
        setError('Solo se aceptan archivos .xlsx o .xls');
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Selecciona un archivo primero');
      return;
    }

    setUploading(true);
    setProgress(0);
    setStatus('Validando archivo...');
    setError('');
    setSuccess(false);

    try {
      const response = await uploadExcel(selectedFile, (nextProgress) => {
        setProgress(nextProgress);
      });

      setStatus('Procesando datos...');
      setProgress(100);
      setStatus('Analisis completado exitosamente');
      setSuccess(true);
      onUploadSuccess(response.analysis);
    } catch (err) {
      setError(err.message || 'Error cargando archivo');
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Card>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ mb: 0.5, fontWeight: 800 }}>
            Cargar Archivo Excel
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Subí un archivo para clasificar incidencias y generar métricas automáticamente.
          </Typography>

          <Paper
            component="label"
            htmlFor="file-input"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            sx={{
              p: { xs: 3, md: 5 },
              textAlign: 'center',
              border: '2px dashed',
              borderColor: dragActive ? 'primary.main' : 'divider',
              background: dragActive
                ? 'linear-gradient(140deg, rgba(37,99,235,0.16), rgba(14,165,233,0.12))'
                : 'linear-gradient(140deg, rgba(219,234,254,0.35), rgba(239,246,255,0.55))',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              mb: 3,
              borderRadius: 3,
              '&:hover': {
                borderColor: 'primary.main',
                transform: 'translateY(-1px)'
              }
            }}
          >
            <CloudUploadIcon sx={{ fontSize: 54, mb: 2, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
              Arrastra tu archivo aqui o haz clic para seleccionar
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Formatos soportados: .xlsx, .xls
            </Typography>

            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="file-input"
            />
          </Paper>

          {selectedFile && !success && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Archivo seleccionado: <strong>{selectedFile.name}</strong>
            </Alert>
          )}

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {success && (
            <Alert severity="success" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <CheckCircleIcon sx={{ mr: 1 }} />
              {status}
            </Alert>
          )}

          {uploading && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {status}
              </Typography>
              <LinearProgress variant="determinate" value={progress} sx={{ mb: 1 }} />
              <Typography variant="caption" color="textSecondary">
                {progress}%
              </Typography>
            </Box>
          )}

          {!success && (
            <Button
              variant="contained"
              size="large"
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              fullWidth
              sx={{ py: 1.6, boxShadow: '0 10px 24px rgba(37, 99, 235, 0.25)' }}
            >
              {uploading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Procesando...
                </>
              ) : (
                'Subir y Analizar'
              )}
            </Button>
          )}

          {success && (
            <Button
              variant="outlined"
              size="large"
              onClick={() => {
                setSelectedFile(null);
                setProgress(0);
                setStatus('');
                setSuccess(false);
              }}
              fullWidth
              sx={{ py: 1.5 }}
            >
              Cargar Otro Archivo
            </Button>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

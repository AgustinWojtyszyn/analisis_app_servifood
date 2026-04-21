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

export default function FileUpload({ onUploadSuccess, showHeader = true }) {
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
    <Box sx={{ mb: 3 }}>
      <Card>
        <CardContent sx={{ p: { xs: 2.5, md: 3.25 } }}>
          {showHeader && (
            <>
              <Typography variant="h5" sx={{ mb: 0.5, fontWeight: 800, fontSize: { xs: 24, md: 28 } }}>
                Cargar Archivo Excel
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                Subí un archivo para clasificar incidencias y generar métricas automáticamente.
              </Typography>
            </>
          )}

          <Paper
            component="label"
            htmlFor="file-input"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            sx={{
              p: { xs: 3, md: 4.5 },
              textAlign: 'center',
              border: '2px dashed',
              borderColor: dragActive ? 'primary.main' : 'divider',
              background: dragActive
                ? 'linear-gradient(145deg, rgba(29,78,216,0.15), rgba(37,99,235,0.11))'
                : 'linear-gradient(145deg, #f4f8ff, #ecf3ff)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              mb: 2.5,
              borderRadius: 3,
              '&:hover': {
                borderColor: 'primary.main',
                transform: 'translateY(-1px)',
                boxShadow: '0 10px 20px rgba(37, 99, 235, 0.12)'
              }
            }}
          >
            <CloudUploadIcon sx={{ fontSize: 54, mb: 2, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700, fontSize: { xs: 19, md: 21 } }}>
              Arrastra tu archivo aqui o haz clic para seleccionar
            </Typography>
            <Typography variant="body2" color="text.secondary">
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
              sx={{ py: 1.4, boxShadow: '0 10px 20px rgba(29, 78, 216, 0.24)' }}
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

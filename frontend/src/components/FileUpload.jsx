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
import ErrorIcon from '@mui/icons-material/Error';
import { analysisService } from '../services/api';

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
      const response = await analysisService.uploadFile(selectedFile, (progress) => {
        setProgress(progress);
      });

      setStatus('Procesando datos...');
      setProgress(80);

      // Simular procesamiento
      setTimeout(() => {
        setProgress(100);
        setStatus('¡Análisis completado exitosamente!');
        setSuccess(true);
        onUploadSuccess(response.data.analysis);
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error cargando archivo');
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Card>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
            Cargar Archivo Excel
          </Typography>

          {/* Drag & Drop Area */}
          <Paper
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            sx={{
              p: 4,
              textAlign: 'center',
              border: '2px dashed',
              borderColor: dragActive ? 'primary.main' : 'divider',
              backgroundColor: dragActive ? 'rgba(100, 181, 246, 0.1)' : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              mb: 3
            }}
          >
            <CloudUploadIcon sx={{ fontSize: 48, mb: 2, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ mb: 1 }}>
              Arrastra tu archivo aquí o haz clic para seleccionar
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

          {/* Selected File */}
          {selectedFile && !success && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Archivo seleccionado: <strong>{selectedFile.name}</strong>
            </Alert>
          )}

          {/* Error Alert */}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {/* Success Alert */}
          {success && (
            <Alert severity="success" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <CheckCircleIcon sx={{ mr: 1 }} />
              {status}
            </Alert>
          )}

          {/* Progress Section */}
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

          {/* Upload Button */}
          {!success && (
            <Button
              variant="contained"
              size="large"
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              fullWidth
              sx={{ py: 1.5 }}
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

          {/* Reset Button */}
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

import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Paper,
  Typography
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { uploadMultipleAnalysis } from '../services/analysis';

const MAX_FILES = 10;

function isExcel(file) {
  const name = String(file?.name || '').toLowerCase();
  return name.endsWith('.xlsx') || name.endsWith('.xls');
}

export default function FileUpload({ onUploadSuccess, showHeader = true }) {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [fileStatuses, setFileStatuses] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const counterLabel = `${files.length}/${MAX_FILES} archivos`;

  const canProcess = useMemo(() => files.length > 0 && !uploading, [files.length, uploading]);

  const resetStatuses = (nextFiles) => {
    setFileStatuses(nextFiles.map((file) => ({ filename: file.name, status: 'pendiente' })));
  };

  const applyFiles = (incoming) => {
    const list = Array.from(incoming || []);
    if (!list.length) return;

    if (list.length > MAX_FILES) {
      setError(`Máximo ${MAX_FILES} archivos por carga`);
      return;
    }

    const invalid = list.find((file) => !isExcel(file));
    if (invalid) {
      setError(`Archivo inválido: ${invalid.name}. Solo .xlsx/.xls`);
      return;
    }

    setError('');
    setFiles(list);
    resetStatuses(list);
  };

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
    applyFiles(e.dataTransfer?.files);
  };

  const handleFileChange = (e) => {
    applyFiles(e.target.files);
  };

  const handleRemove = (filename) => {
    const nextFiles = files.filter((file) => file.name !== filename);
    setFiles(nextFiles);
    resetStatuses(nextFiles);
  };

  const handleUpload = async () => {
    if (!files.length) {
      setError('Selecciona archivos primero');
      return;
    }

    setUploading(true);
    setError('');

    setFileStatuses((prev) => prev.map((item) => ({ ...item, status: 'procesando' })));

    try {
      const response = await uploadMultipleAnalysis(files);
      const resultMap = new Map((response?.results || []).map((r) => [r.filename, r]));

      setFileStatuses((prev) => prev.map((item) => {
        const result = resultMap.get(item.filename);
        if (!result) return { ...item, status: 'error', error: 'Sin respuesta del servidor' };
        if (result.success) return { ...item, status: 'listo', analysisId: result.analysisId };
        return { ...item, status: 'error', error: result.error || 'Error procesando' };
      }));

      onUploadSuccess?.(response);
    } catch (err) {
      setError(err.message || 'Error cargando archivos');
      setFileStatuses((prev) => prev.map((item) => ({ ...item, status: 'error', error: err.message || 'Error general' })));
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
                Cargar Archivos Excel
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                Podés subir hasta 10 archivos por lote. Cada archivo se procesa como un análisis independiente.
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
              borderRadius: 3
            }}
          >
            <CloudUploadIcon sx={{ fontSize: 54, mb: 2, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700, fontSize: { xs: 19, md: 21 } }}>
              Arrastra archivos aquí o haz clic para seleccionar
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Formatos soportados: .xlsx, .xls
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, fontWeight: 700 }}>
              {counterLabel}
            </Typography>

            <input
              type="file"
              multiple
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="file-input"
            />
          </Paper>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {fileStatuses.length > 0 && (
            <Paper variant="outlined" sx={{ mb: 2, p: 1.5 }}>
              {fileStatuses.map((item) => (
                <Box key={item.filename} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid #eef2f7' }}>
                  <Typography variant="body2">{item.filename}</Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 700 }}>
                      {item.status}
                    </Typography>
                    {item.status === 'pendiente' && (
                      <Button size="small" color="error" onClick={() => handleRemove(item.filename)}>Quitar</Button>
                    )}
                  </Box>
                </Box>
              ))}
            </Paper>
          )}

          <Button
            variant="contained"
            size="large"
            onClick={handleUpload}
            disabled={!canProcess}
            fullWidth
            sx={{ py: 1.4 }}
          >
            {uploading ? 'Procesando archivos...' : 'Procesar archivos'}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}

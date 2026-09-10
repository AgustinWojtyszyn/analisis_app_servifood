import multer from 'multer';
import { MAX_EXCEL_FILE_SIZE_MB } from './upload.js';

export function globalErrorHandler(err, _req, res, _next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: `Cada archivo no puede superar el tamaño máximo permitido de ${MAX_EXCEL_FILE_SIZE_MB} MB`
      });
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Se permite un máximo de 10 archivos por solicitud' });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Campo de archivo inesperado o exceso de archivos para este endpoint' });
    }

    return res.status(400).json({ error: `Error de carga de archivo: ${err.message}` });
  }

  console.error('Error:', err);
  return res.status(err?.status || 500).json({
    error: err?.message || 'Error interno del servidor'
  });
}

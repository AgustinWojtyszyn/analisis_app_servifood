import React from 'react';
import { Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('es-AR');
}

function filesLabel(value) {
  const count = Number(value || 0);
  if (count <= 0) return 'Sin archivos';
  if (count === 1) return '1 archivo';
  return `${count} archivos`;
}

export default function NutritionModulesTable({
  rows,
  canManage,
  onEdit,
  onDelete,
  onDownload,
  onExportExcel,
  onViewFiles,
  emptyMessage = 'No hay documentos disponibles.'
}) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Título</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Descripción</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Adjuntos</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Actualizado</TableCell>
            <TableCell sx={{ fontWeight: 700, minWidth: 260 }}>Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            return (
              <TableRow key={row.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{row.title}</TableCell>
                <TableCell>{row.description || '-'}</TableCell>
                <TableCell>{filesLabel(row.filesCount)}</TableCell>
                <TableCell>{formatDate(row.updatedAt || row.createdAt)}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                    <Button size="small" variant="outlined" onClick={() => onExportExcel(row)}>Excel</Button>
                    <Button size="small" variant="outlined" onClick={() => onDownload(row)}>Descargar documento</Button>
                    <Button size="small" variant="outlined" onClick={() => onViewFiles(row)}>Ver archivos</Button>
                    {canManage && (
                      <>
                        <Button size="small" variant="outlined" onClick={() => onEdit(row)}>Editar</Button>
                        <Button size="small" color="error" variant="outlined" onClick={() => onDelete(row)}>Borrar</Button>
                      </>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
          {!rows.length && (
            <TableRow>
              <TableCell colSpan={5}>{emptyMessage}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

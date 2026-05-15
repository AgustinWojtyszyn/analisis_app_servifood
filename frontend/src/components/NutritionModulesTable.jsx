import React from 'react';
import { Box, Button, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('es-AR');
}

function statusMeta(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'publicado') return { label: 'Publicado', color: 'success' };
  if (normalized === 'archivado') return { label: 'Archivado', color: 'default' };
  return { label: 'Borrador', color: 'warning' };
}

export default function NutritionModulesTable({ rows, canManage, onEdit, onPublish, onArchive, onDelete, onDownload, onExportExcel, onViewFiles }) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Título</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Descripción</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Adjuntos</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Actualizado</TableCell>
            <TableCell sx={{ fontWeight: 700, minWidth: 260 }}>Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const meta = statusMeta(row.status);
            return (
              <TableRow key={row.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{row.title}</TableCell>
                <TableCell>{row.description || '-'}</TableCell>
                <TableCell>
                  <Chip size="small" label={meta.label} color={meta.color} variant={meta.color === 'default' ? 'outlined' : 'filled'} />
                </TableCell>
                <TableCell>{row.filesCount || 0}</TableCell>
                <TableCell>{formatDate(row.updatedAt || row.createdAt)}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                    <Button size="small" variant="outlined" onClick={() => onExportExcel(row)}>Excel</Button>
                    <Button size="small" variant="outlined" onClick={() => onDownload(row)}>Descargar</Button>
                    <Button size="small" variant="outlined" onClick={() => onViewFiles(row)}>Ver archivos</Button>
                    {canManage && (
                      <>
                        <Button size="small" variant="outlined" onClick={() => onEdit(row)}>Editar</Button>
                        {String(row.status) !== 'publicado' && (
                          <Button size="small" color="success" variant="outlined" onClick={() => onPublish(row)}>Publicar</Button>
                        )}
                        {String(row.status) !== 'archivado' && (
                          <Button size="small" color="warning" variant="outlined" onClick={() => onArchive(row)}>Archivar</Button>
                        )}
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
              <TableCell colSpan={6}>No hay módulos disponibles.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

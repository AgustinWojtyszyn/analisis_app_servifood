import React from 'react';
import { Box, Button, Chip, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import CertificationStatusBadge from './CertificationStatusBadge';

export default function CertificationTable({ items = [], onEdit, onDelete, onCreate }) {
  if (!items.length) {
    return (
      <Box
        sx={{
          py: 6,
          px: 2,
          textAlign: 'center',
          border: '1px dashed #cfd8e6',
          borderRadius: 2,
          backgroundColor: '#f9fbff'
        }}
      >
        <Typography sx={{ fontWeight: 800, color: '#0f2a66', mb: 0.5 }}>
          No hay certificaciones cargadas todavía.
        </Typography>
        <Typography sx={{ color: '#5f6f88' }}>
          Creá una certificación para comenzar a controlar sus vencimientos.
        </Typography>
        <Button sx={{ mt: 1.4 }} variant="outlined" onClick={() => onCreate?.()}>
          Nueva certificación
        </Button>
      </Box>
    );
  }

  return (
    <TableContainer sx={{ border: '1px solid #d7e1f0', borderRadius: 2, overflow: 'hidden' }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: '#f3f6fb' }}>
            <TableCell>Nombre</TableCell>
            <TableCell>Módulo/Categoría</TableCell>
            <TableCell>Tipo</TableCell>
            <TableCell>Vencimiento</TableCell>
            <TableCell>Días restantes</TableCell>
            <TableCell>Estado</TableCell>
            <TableCell>Trigger</TableCell>
            <TableCell align="right">Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} hover>
              <TableCell>
                <Typography sx={{ fontWeight: 700 }}>{item.name}</Typography>
              </TableCell>
              <TableCell>{item.module || '-'}</TableCell>
              <TableCell>{item.type || '-'}</TableCell>
              <TableCell>{item.expirationDate || '-'}</TableCell>
              <TableCell>{Number.isFinite(item.daysUntilExpiration) ? item.daysUntilExpiration : '-'}</TableCell>
              <TableCell><CertificationStatusBadge status={item.status} /></TableCell>
              <TableCell>
                {item.shouldNotify
                  ? <Chip size="small" color="warning" label="Trigger detectado" />
                  : <Typography variant="caption" color="text.secondary">Sin trigger</Typography>}
              </TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button size="small" onClick={() => onEdit?.(item)}>Editar</Button>
                  <Button size="small" color="error" onClick={() => onDelete?.(item)}>Eliminar</Button>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

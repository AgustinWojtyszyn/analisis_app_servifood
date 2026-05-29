import React from 'react';
import { Box, Button, Chip, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import CertificationStatusBadge from './CertificationStatusBadge';

export default function CertificationTable({ items = [], onEdit, onDelete, onCreate, onSendTest, sendingTestId = '' }) {
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
    <TableContainer
      sx={{
        border: '1px solid #d7e1f0',
        borderRadius: 2,
        overflowX: 'auto',
        overflowY: 'hidden'
      }}
    >
      <Table size="small" sx={{ minWidth: 1120 }}>
        <TableHead>
          <TableRow sx={{ backgroundColor: '#f3f6fb' }}>
            <TableCell sx={{ py: 1.2, px: 1.8, fontWeight: 700, color: '#0f2a66', whiteSpace: 'nowrap' }}>Nombre</TableCell>
            <TableCell sx={{ py: 1.2, px: 1.8, fontWeight: 700, color: '#0f2a66', whiteSpace: 'nowrap' }}>Módulo/Categoría</TableCell>
            <TableCell sx={{ py: 1.2, px: 1.8, fontWeight: 700, color: '#0f2a66', whiteSpace: 'nowrap' }}>Tipo</TableCell>
            <TableCell sx={{ py: 1.2, px: 1.8, fontWeight: 700, color: '#0f2a66', whiteSpace: 'nowrap' }}>Vencimiento</TableCell>
            <TableCell sx={{ py: 1.2, px: 1.8, fontWeight: 700, color: '#0f2a66', whiteSpace: 'nowrap' }}>Días restantes</TableCell>
            <TableCell sx={{ py: 1.2, px: 1.8, fontWeight: 700, color: '#0f2a66', whiteSpace: 'nowrap' }}>Estado</TableCell>
            <TableCell sx={{ py: 1.2, px: 1.8, fontWeight: 700, color: '#0f2a66', whiteSpace: 'nowrap' }}>Trigger</TableCell>
            <TableCell align="right" sx={{ py: 1.2, px: 1.8, fontWeight: 700, color: '#0f2a66', minWidth: 260, whiteSpace: 'nowrap' }}>Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} hover>
              <TableCell sx={{ py: 1.1, px: 1.8 }}>
                <Typography sx={{ fontWeight: 700 }}>{item.name}</Typography>
              </TableCell>
              <TableCell sx={{ py: 1.1, px: 1.8 }}>{item.module || '-'}</TableCell>
              <TableCell sx={{ py: 1.1, px: 1.8 }}>{item.type || '-'}</TableCell>
              <TableCell sx={{ py: 1.1, px: 1.8, whiteSpace: 'nowrap' }}>{item.expirationDate || '-'}</TableCell>
              <TableCell sx={{ py: 1.1, px: 1.8 }}>{Number.isFinite(item.daysUntilExpiration) ? item.daysUntilExpiration : '-'}</TableCell>
              <TableCell sx={{ py: 1.1, px: 1.8 }}><CertificationStatusBadge status={item.status} /></TableCell>
              <TableCell sx={{ py: 1.1, px: 1.8 }}>
                {item.notificationStatus === 'sent' && (
                  <Chip size="small" color="success" label="Notificación enviada" />
                )}
                {item.notificationStatus === 'processing' && (
                  <Chip size="small" color="warning" label="Pendiente de envío" />
                )}
                {item.notificationStatus === 'pending' && (
                  <Chip size="small" color="warning" label="Listo para notificar" title="Listo para notificación automática piloto" />
                )}
                {item.notificationStatus === 'failed' && (
                  <Chip size="small" color="error" label="Error de envío" />
                )}
                {(item.notificationStatus === 'none' || !item.notificationStatus) && (
                  <Typography variant="caption" color="text.secondary">Sin aviso para hoy</Typography>
                )}
              </TableCell>
              <TableCell align="right" sx={{ py: 1.1, px: 1.8, minWidth: 260 }}>
                <Stack direction="row" spacing={0.8} justifyContent="flex-end" alignItems="center" sx={{ whiteSpace: 'nowrap' }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => onSendTest?.(item)}
                    disabled={sendingTestId === item.id}
                    sx={{ whiteSpace: 'nowrap', minWidth: 0, px: 1.2, py: 0.3, lineHeight: 1.2 }}
                  >
                    {sendingTestId === item.id ? 'Enviando...' : 'Probar envío'}
                  </Button>
                  <Button size="small" onClick={() => onEdit?.(item)} sx={{ whiteSpace: 'nowrap', minWidth: 0, px: 1.2, py: 0.3, lineHeight: 1.2 }}>Editar</Button>
                  <Button size="small" color="error" onClick={() => onDelete?.(item)} sx={{ whiteSpace: 'nowrap', minWidth: 0, px: 1.2, py: 0.3, lineHeight: 1.2 }}>Eliminar</Button>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

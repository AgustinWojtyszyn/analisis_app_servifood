import React, { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import CertificationStatusBadge from './CertificationStatusBadge';

function TriggerCell({ item }) {
  if (item.notificationStatus === 'sent') return <Chip size="small" color="success" label="Notificación enviada" />;
  if (item.notificationStatus === 'processing') return <Chip size="small" color="warning" label="Pendiente de envío" />;
  if (item.notificationStatus === 'pending') return <Chip size="small" color="warning" label="Pendiente de envío" title="Pendiente de envío automático piloto" />;
  if (item.notificationStatus === 'failed') return <Chip size="small" color="error" label="Error de envío" />;
  return <Typography variant="caption" color="text.secondary">Sin recordatorios pendientes</Typography>;
}

function DetailField({ label, children }) {
  const hasValue = children !== null && children !== undefined && children !== '';
  return (
    <Box>
      <Typography variant="caption" sx={{ display: 'block', color: '#637089', fontWeight: 800, mb: 0.35 }}>
        {label}
      </Typography>
      <Box sx={{ color: '#1f2d42', fontSize: 14, overflowWrap: 'anywhere' }}>{hasValue ? children : '-'}</Box>
    </Box>
  );
}

function formatReminderLabel(value) {
  const label = String(value || '').trim();
  if (!label || label === 'Sin aviso para hoy') return 'Sin recordatorios pendientes';
  if (label === 'Trigger detectado, pendiente de envío automático') return 'Recordatorio pendiente de envío automático';
  return label;
}

export default function CertificationTable({
  items = [],
  onEdit,
  onDelete,
  onCreate,
  onSendTest,
  sendingTestId = '',
  authorizedRecipients = []
}) {
  const [detailItem, setDetailItem] = useState(null);

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

  const stickyNameSx = {
    position: 'sticky',
    left: 0,
    zIndex: 2,
    backgroundColor: '#fff',
    minWidth: 260,
    maxWidth: 340,
    boxShadow: '8px 0 12px -12px rgba(15,42,102,0.55)'
  };
  const stickyActionsSx = {
    position: 'sticky',
    right: 0,
    zIndex: 2,
    backgroundColor: '#fff',
    minWidth: 150,
    boxShadow: '-8px 0 12px -12px rgba(15,42,102,0.55)'
  };
  const headCellSx = {
    py: 1.2,
    px: 1.8,
    fontWeight: 700,
    color: '#0f2a66',
    whiteSpace: 'nowrap',
    backgroundColor: '#f3f6fb'
  };
  const detailUrl = String(detailItem?.url || '').trim();

  return (
    <>
      <TableContainer
        sx={{
          border: '1px solid #d7e1f0',
          borderRadius: 2,
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
          scrollbarColor: '#9fb0ca #edf2f8',
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': { height: 10 },
          '&::-webkit-scrollbar-track': { backgroundColor: '#edf2f8', borderRadius: 8 },
          '&::-webkit-scrollbar-thumb': { backgroundColor: '#9fb0ca', borderRadius: 8 }
        }}
      >
        <Table size="small" sx={{ minWidth: 1080, tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headCellSx, ...stickyNameSx, zIndex: 4 }}>Nombre</TableCell>
              <TableCell sx={{ ...headCellSx, minWidth: 210, width: 220 }}>Módulo/Categoría</TableCell>
              <TableCell sx={{ ...headCellSx, minWidth: 140, width: 150 }}>Vencimiento</TableCell>
              <TableCell sx={{ ...headCellSx, minWidth: 140, width: 150 }}>Días restantes</TableCell>
              <TableCell sx={{ ...headCellSx, minWidth: 170, width: 180 }}>Estado</TableCell>
              <TableCell sx={{ ...headCellSx, minWidth: 210, width: 230 }}>Recordatorio</TableCell>
              <TableCell align="right" sx={{ ...headCellSx, ...stickyActionsSx, zIndex: 4 }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} hover sx={{ '&:hover td': { backgroundColor: '#f8fbff' } }}>
                <TableCell sx={{ py: 1.1, px: 1.8, ...stickyNameSx }}>
                  <Typography sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{item.name}</Typography>
                </TableCell>
                <TableCell sx={{ py: 1.1, px: 1.8, minWidth: 210, overflowWrap: 'anywhere' }}>{item.module || '-'}</TableCell>
                <TableCell sx={{ py: 1.1, px: 1.8, whiteSpace: 'nowrap', minWidth: 140 }}>{item.expirationDate || '-'}</TableCell>
                <TableCell sx={{ py: 1.1, px: 1.8, minWidth: 140 }}>{Number.isFinite(item.daysUntilExpiration) ? item.daysUntilExpiration : '-'}</TableCell>
                <TableCell sx={{ py: 1.1, px: 1.8, minWidth: 170 }}><CertificationStatusBadge status={item.status} /></TableCell>
                <TableCell sx={{ py: 1.1, px: 1.8, minWidth: 210 }}><TriggerCell item={item} /></TableCell>
                <TableCell align="right" sx={{ py: 1.1, px: 1.8, ...stickyActionsSx }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setDetailItem(item)}
                    sx={{ whiteSpace: 'nowrap', px: 1.2, py: 0.3, lineHeight: 1.2 }}
                  >
                    Ver detalle
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={Boolean(detailItem)} onClose={() => setDetailItem(null)} fullWidth maxWidth="md">
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }}>
            <Box>
              <Typography sx={{ fontWeight: 900, color: '#0f2a66', fontSize: 20 }}>
                {detailItem?.name || 'Certificación'}
              </Typography>
              <Typography sx={{ color: '#637089', fontSize: 13 }}>{detailItem?.module || 'Sin módulo/categoría'}</Typography>
            </Box>
            {detailItem && <CertificationStatusBadge status={detailItem.status} />}
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
              <DetailField label="Nombre">{detailItem?.name}</DetailField>
              <DetailField label="Módulo/Categoría">{detailItem?.module}</DetailField>
              <DetailField label="Tipo">{detailItem?.type}</DetailField>
              <DetailField label="Vencimiento">{detailItem?.expirationDate}</DetailField>
              <DetailField label="Días restantes">{Number.isFinite(detailItem?.daysUntilExpiration) ? detailItem.daysUntilExpiration : '-'}</DetailField>
              <DetailField label="Estado">{detailItem ? <CertificationStatusBadge status={detailItem.status} /> : '-'}</DetailField>
              <DetailField label="Área responsable">{detailItem?.responsibleArea}</DetailField>
              <DetailField label="Responsable">{detailItem?.responsiblePerson}</DetailField>
            </Box>

            <Divider />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
              <DetailField label="Recordatorio">{formatReminderLabel(detailItem?.humanTriggerLabel || detailItem?.notificationMessage)}</DetailField>
              <DetailField label="Estado del aviso">{detailItem ? <TriggerCell item={detailItem} /> : '-'}</DetailField>
              <DetailField label="Destinatarios del aviso">{authorizedRecipients.length ? authorizedRecipients.join(', ') : '-'}</DetailField>
              <DetailField label="Acciones disponibles">Abrir certificación, probar envío, editar o eliminar</DetailField>
            </Box>

            {detailItem?.description && (
              <>
                <Divider />
                <DetailField label="Descripción">{detailItem.description}</DetailField>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 0.8 }}>
          {detailUrl && (
            <Button size="small" variant="contained" href={detailUrl} target="_blank" rel="noopener noreferrer">
              Abrir certificación
            </Button>
          )}
          <Button
            size="small"
            variant="outlined"
            onClick={() => onSendTest?.(detailItem)}
            disabled={!detailItem || sendingTestId === detailItem.id}
          >
            {detailItem && sendingTestId === detailItem.id ? 'Enviando...' : 'Probar envío'}
          </Button>
          <Button
            size="small"
            onClick={() => {
              if (!detailItem) return;
              onEdit?.(detailItem);
              setDetailItem(null);
            }}
          >
            Editar
          </Button>
          <Button
            size="small"
            color="error"
            onClick={() => {
              if (!detailItem) return;
              const current = detailItem;
              setDetailItem(null);
              onDelete?.(current);
            }}
          >
            Eliminar
          </Button>
          <Button size="small" onClick={() => setDetailItem(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

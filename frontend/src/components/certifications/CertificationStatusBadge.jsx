import React from 'react';
import { Chip } from '@mui/material';

const map = {
  active: { label: 'Vigente', color: 'success' },
  upcoming_expiration: { label: 'Próxima a vencer', color: 'warning' },
  expires_tomorrow: { label: 'Vence mañana', color: 'error' },
  expires_today: { label: 'Vence hoy', color: 'error' },
  expired: { label: 'Vencida', color: 'error' }
};

export default function CertificationStatusBadge({ status }) {
  const config = map[status] || map.active;
  return <Chip size="small" label={config.label} color={config.color} variant="outlined" />;
}

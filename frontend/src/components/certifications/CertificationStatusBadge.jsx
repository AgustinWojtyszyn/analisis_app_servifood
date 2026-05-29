import React from 'react';
import { Chip } from '@mui/material';

const map = {
  active: { label: 'Vigente', color: 'success' },
  near_expiration: { label: 'Próxima a vencer', color: 'warning' },
  expires_in_7_days: { label: 'Vence en 7 días', color: 'warning' },
  expires_tomorrow: { label: 'Vence mañana', color: 'error' },
  expired: { label: 'Vencida', color: 'error' }
};

export default function CertificationStatusBadge({ status }) {
  const config = map[status] || map.active;
  return <Chip size="small" label={config.label} color={config.color} variant="outlined" />;
}

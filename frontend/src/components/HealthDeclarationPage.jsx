import React from 'react';
import { Alert, Card, CardContent, Typography } from '@mui/material';

export default function HealthDeclarationPage() {
  return (
    <Card>
      <CardContent>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
          Declaración de Salud
        </Typography>
        <Alert severity="info" sx={{ mb: 1.5 }}>
          Módulo en integración. Esta pantalla quedará conectada a `health_declarations`.
        </Alert>
        <Typography color="text.secondary">
          Próximo paso: formulario diario por usuario con validación de envío único por día.
        </Typography>
      </CardContent>
    </Card>
  );
}

import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography
} from '@mui/material';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import SettingsSuggestRoundedIcon from '@mui/icons-material/SettingsSuggestRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import FilterAltRoundedIcon from '@mui/icons-material/FilterAltRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';

const steps = [
  {
    title: 'Paso 1: Cargar archivo Excel',
    description: 'Subí tu archivo desde la sección de carga para iniciar el análisis.',
    icon: <UploadFileRoundedIcon />
  },
  {
    title: 'Paso 2: Procesamiento automático',
    description: 'La plataforma analiza los registros y aplica automáticamente las reglas de clasificación configuradas.',
    icon: <SettingsSuggestRoundedIcon />
  },
  {
    title: 'Paso 3: Revisar área clasificada, tipo y acción',
    description: 'Revisá el área asignada, el tipo de desvío y las acciones sugeridas para cada incidencia.',
    icon: <FactCheckRoundedIcon />
  },
  {
    title: 'Paso 4: Filtrar resultados',
    description: 'Usá la búsqueda, el área y el tipo de desvío para enfocarte en lo más relevante.',
    icon: <FilterAltRoundedIcon />
  },
  {
    title: 'Paso 5: Exportar resultados',
    description: 'Descargá la vista filtrada en CSV o Excel para compartir o documentar la información.',
    icon: <DownloadRoundedIcon />
  },
  {
    title: 'Paso 6: Consultar historial',
    description: 'Revisá análisis previos y retomá información cuando lo necesites.',
    icon: <HistoryRoundedIcon />
  }
];

export default function TutorialPage({ onGoToUpload }) {
  return (
    <Box>
      <Card sx={{ mb: 2.5 }}>
        <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
            Cómo usar la aplicación
          </Typography>
          <Typography color="text.secondary">
            Esta herramienta analiza registros de calidad desde archivos Excel para clasificar incidencias y facilitar su seguimiento.
          </Typography>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        {steps.map((step) => (
          <Grid item xs={12} md={6} key={step.title}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1 }}>
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'primary.main',
                      backgroundColor: 'rgba(29, 78, 216, 0.1)'
                    }}
                  >
                    {step.icon}
                  </Box>
                  <Typography sx={{ fontWeight: 700 }}>{step.title}</Typography>
                </Box>
                <Typography color="text.secondary" variant="body2">
                  {step.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ mt: 2.5 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Nota final</Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: { xs: 'stretch', sm: 'flex-end' }, justifyContent: 'space-between', flexDirection: { xs: 'column', sm: 'row' } }}>
            <Box>
              <Typography color="text.secondary" variant="body2">
                Una estructura de Excel clara y consistente mejora significativamente la calidad del análisis y la precisión de clasificación.
              </Typography>
              <Typography color="text.secondary" variant="body2" sx={{ mt: 0.75 }}>
                Para obtener mejores resultados, mantené encabezados claros y evitá modificar la estructura habitual del archivo.
              </Typography>
            </Box>
            <Button variant="contained" onClick={onGoToUpload} sx={{ alignSelf: { xs: 'stretch', sm: 'flex-end' }, whiteSpace: 'nowrap' }}>
              Ir a Cargar archivos
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Chip,
  TextField,
  Typography,
  Button
} from '@mui/material';
import CleaningServicesRoundedIcon from '@mui/icons-material/CleaningServicesRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import * as XLSX from 'xlsx';
import excelIcon from '../assets/excel.png';
import whatsappIcon from '../assets/whatsappicon.png';

const resultColors = {
  'Conforme': { bg: 'rgba(22, 163, 74, 0.12)', text: '#166534' },
  'No conforme': { bg: 'rgba(220, 38, 38, 0.12)', text: '#991b1b' },
  'Oportunidad de mejora': { bg: 'rgba(234, 88, 12, 0.12)', text: '#9a3412' }
};

const typeColors = {
  NC: { bg: 'rgba(220, 38, 38, 0.12)', text: '#991b1b' },
  OBS: { bg: 'rgba(245, 158, 11, 0.15)', text: '#92400e' },
  OM: { bg: 'rgba(14, 165, 233, 0.12)', text: '#0c4a6e' }
};

function normalizeCellValue(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(normalizeCellValue).filter(Boolean).join(' ');
  }

  if (typeof value === 'object') {
    if (Array.isArray(value.richText)) {
      return value.richText
        .map((part) => normalizeCellValue(part?.text))
        .filter(Boolean)
        .join('');
    }

    if (typeof value.text === 'string') {
      return value.text;
    }

    if (value.result != null) {
      return normalizeCellValue(value.result);
    }
  }

  return String(value);
}

function splitAreas(areaClasificada) {
  return normalizeCellValue(areaClasificada)
    .split(',')
    .map((area) => area.trim())
    .filter(Boolean);
}

export default function AnalysisResults({
  records,
  analysisId,
  onExportSuccess,
  onReprocessExcel,
  onDeleteCurrent
}) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterArea, setFilterArea] = useState('all');
  const [filterTipo, setFilterTipo] = useState('all');

  const resetLocalState = () => {
    setPage(0);
    setRowsPerPage(10);
    setSearchTerm('');
    setFilterArea('all');
    setFilterTipo('all');
  };

  if (!records || records.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
          No hay análisis aún
        </Typography>
        <Typography color="text.secondary">
          Cargá un archivo desde la sección “Cargar Archivo” para ver resultados.
        </Typography>
      </Paper>
    );
  }

  const availableAreas = [...new Set(records.flatMap((record) => splitAreas(record.areaClasificada)).filter(Boolean))];
  const availableTipos = [...new Set(records.map((record) => normalizeCellValue(record.tipoDesvio)).filter(Boolean))];

  const filteredRecords = records.filter((record) => {
    const textSearch = [
      record.areaProceso,
      record.actividadRealizada,
      record.tipoActividad,
      record.resultado,
      record.notaTecnica,
      record.areaClasificada,
      record.iso22000
    ].map((value) => normalizeCellValue(value).toLowerCase()).join(' | ');

    const area = normalizeCellValue(record.areaClasificada);
    const areaParts = splitAreas(area);
    const tipo = normalizeCellValue(record.tipoDesvio);

    const matchesSearch = textSearch.includes(searchTerm.toLowerCase());
    const matchesArea = filterArea === 'all' || areaParts.includes(filterArea);
    const matchesTipo = filterTipo === 'all' || tipo === filterTipo;

    return matchesSearch && matchesArea && matchesTipo;
  });

  const handleChangePage = (_event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const displayedRecords = filteredRecords.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleShareWhatsApp = async () => {
    const byTipo = filteredRecords.reduce((acc, record) => {
      const tipo = normalizeCellValue(record.tipoDesvio) || 'Conforme';
      acc[tipo] = (acc[tipo] || 0) + 1;
      return acc;
    }, {});

    const previewLimit = 12;
    const simplifiedRows = filteredRecords.slice(0, previewLimit).map((record, index) => {
      const area = normalizeCellValue(record.areaClasificada) || 'Sin área';
      const tipo = normalizeCellValue(record.tipoDesvio) || 'Conforme';
      const iso = normalizeCellValue(record.iso22000) || 'Sin ISO';
      return `${index + 1}. ${area} | ${tipo} | ${iso}`;
    });

    const remaining = filteredRecords.length - simplifiedRows.length;
    const message = [
      '*Resumen automático de desvíos*',
      `Registros filtrados: ${filteredRecords.length}`,
      `NC: ${byTipo.NC || 0} | OBS: ${byTipo.OBS || 0} | OM: ${byTipo.OM || 0} | Conformes: ${byTipo.Conforme || 0}`,
      '',
      '*Detalle:*',
      ...simplifiedRows,
      remaining > 0 ? `... y ${remaining} registros más` : ''
    ]
      .filter(Boolean)
      .join('\n');

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

    resetLocalState();
    await onExportSuccess?.(analysisId);
  };

  const handleExportExcel = async () => {
    const rows = filteredRecords.map((record) => ({
      Fecha: normalizeCellValue(record.fecha),
      'Área / Proceso': normalizeCellValue(record.areaProceso),
      'Actividad realizada': normalizeCellValue(record.actividadRealizada),
      'Hallazgo detectado': normalizeCellValue(record.hallazgoDetectado),
      'N° Acción': normalizeCellValue(record.numeroAccion),
      'Tipo de actividad': normalizeCellValue(record.tipoActividad),
      Resultado: normalizeCellValue(record.resultado),
      '¿Desvío?': normalizeCellValue(record.desvio),
      '¿Acción?': normalizeCellValue(record.accion),
      'Nota técnica': normalizeCellValue(record.notaTecnica),
      'Área clasificada': normalizeCellValue(record.areaClasificada),
      'Resultado clasificado': normalizeCellValue(record.resultadoClasificado),
      'Tipo de desvío': normalizeCellValue(record.tipoDesvio),
      'Vinculación SGIA / ISO 22000': normalizeCellValue(record.iso22000),
      'Estado de acción': normalizeCellValue(record.estadoAccion)
    }));

    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Resultados');
    XLSX.writeFile(workbook, `analysis-${new Date().toISOString().split('T')[0]}.xlsx`);

    resetLocalState();
    await onExportSuccess?.(analysisId);
  };

  const handleReprocessExcel = () => {
    const confirmed = window.confirm('¿Querés reprocesar con un nuevo Excel?');
    if (!confirmed) return;

    resetLocalState();
    onReprocessExcel?.();
  };

  const handleDeleteCurrent = async () => {
    const confirmed = window.confirm('¿Eliminar análisis actual?');
    if (!confirmed) return;

    resetLocalState();
    await onDeleteCurrent?.();
  };

  return (
    <Paper sx={{ p: { xs: 2, md: 2.75 }, boxShadow: '0 2px 12px rgba(15,23,42,0.05)' }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          flexDirection: { xs: 'column', md: 'row' },
          gap: 1.5,
          mb: 2.5
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: 19, md: 21 } }}>
          Registros procesados ({filteredRecords.length})
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 1.25
          }}
        >
          <Button
            variant="text"
            startIcon={<CleaningServicesRoundedIcon />}
            onClick={handleReprocessExcel}
            size="small"
            sx={{ borderRadius: 2, px: 1.5, py: 0.75 }}
          >
            Reprocesar Excel
          </Button>
          <Button
            variant="text"
            color="error"
            startIcon={<DeleteOutlineRoundedIcon />}
            onClick={handleDeleteCurrent}
            size="small"
            sx={{ borderRadius: 2, px: 1.5, py: 0.75 }}
          >
            Eliminar análisis actual
          </Button>
          <Button
            variant="contained"
            onClick={handleExportExcel}
            size="small"
            sx={{
              backgroundColor: '#1d6f42',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              borderRadius: 2,
              px: 1.75,
              py: 0.75,
              boxShadow: '0 2px 8px rgba(29, 111, 66, 0.25)',
              '&:hover': {
                backgroundColor: '#155c36',
                boxShadow: '0 6px 12px rgba(21, 92, 54, 0.32)',
                transform: 'translateY(-1px)'
              }
            }}
          >
            <img src={excelIcon} alt="" width={16} height={16} />
            Exportar Excel
          </Button>
          <Button
            variant="contained"
            onClick={handleShareWhatsApp}
            size="small"
            sx={{
              backgroundColor: '#25d366',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              borderRadius: 2,
              px: 1.75,
              py: 0.75,
              boxShadow: '0 2px 8px rgba(37, 211, 102, 0.24)',
              '&:hover': {
                backgroundColor: '#1ebc59',
                boxShadow: '0 6px 12px rgba(30, 188, 89, 0.30)',
                transform: 'translateY(-1px)'
              }
            }}
          >
            <img src={whatsappIcon} alt="" width={16} height={16} />
            Exportar por WhatsApp
          </Button>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 220px 170px' },
          gap: 1.5,
          mb: 2.5
        }}
      >
        <TextField
          placeholder="Buscar..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(0);
          }}
          size="small"
          fullWidth
        />
        <TextField
          select
          label="Área clasificada"
          value={filterArea}
          onChange={(e) => {
            setFilterArea(e.target.value);
            setPage(0);
          }}
          size="small"
          fullWidth
          SelectProps={{ native: true }}
        >
          <option value="all">Todas</option>
          {availableAreas.map((area) => (
            <option key={area} value={area}>{area}</option>
          ))}
        </TextField>
        <TextField
          select
          label="Tipo desvío"
          value={filterTipo}
          onChange={(e) => {
            setFilterTipo(e.target.value);
            setPage(0);
          }}
          size="small"
          fullWidth
          SelectProps={{ native: true }}
        >
          <option value="all">Todos</option>
          {availableTipos.map((tipo) => (
            <option key={tipo} value={tipo}>{tipo}</option>
          ))}
        </TextField>
      </Box>

      <TableContainer sx={{ overflowX: 'auto', backgroundColor: 'transparent' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Fecha</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Área / Proceso</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Actividad realizada</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Hallazgo detectado</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>N° Acción</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Área clasificada</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Resultado clasificado</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Tipo desvío</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>ISO 22000</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Estado acción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayedRecords.map((record, index) => (
              <TableRow
                key={index}
                hover
                sx={{
                  '&:last-child td': { border: 0 },
                  '&:hover': { backgroundColor: 'rgba(29, 78, 216, 0.025)' }
                }}
              >
                <TableCell>{normalizeCellValue(record.fecha)}</TableCell>
                <TableCell>{normalizeCellValue(record.areaProceso)}</TableCell>
                <TableCell sx={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {normalizeCellValue(record.actividadRealizada)}
                </TableCell>
                <TableCell sx={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {normalizeCellValue(record.hallazgoDetectado)}
                </TableCell>
                <TableCell sx={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {normalizeCellValue(record.numeroAccion)}
                </TableCell>
                <TableCell>{normalizeCellValue(record.areaClasificada)}</TableCell>
                <TableCell>
                  <Chip
                    label={normalizeCellValue(record.resultadoClasificado)}
                    size="small"
                    sx={{
                      backgroundColor: (resultColors[record.resultadoClasificado] || resultColors['No conforme']).bg,
                      color: (resultColors[record.resultadoClasificado] || resultColors['No conforme']).text
                    }}
                  />
                </TableCell>
                <TableCell>
                  {normalizeCellValue(record.tipoDesvio) ? (
                    <Chip
                      label={normalizeCellValue(record.tipoDesvio)}
                      size="small"
                      sx={{
                        backgroundColor: (typeColors[record.tipoDesvio] || typeColors.OBS).bg,
                        color: (typeColors[record.tipoDesvio] || typeColors.OBS).text
                      }}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">-</Typography>
                  )}
                </TableCell>
                <TableCell sx={{ maxWidth: 260 }}>
                  <Typography variant="body2">{normalizeCellValue(record.iso22000)}</Typography>
                </TableCell>
                <TableCell>{normalizeCellValue(record.estadoAccion).replace('_', ' ')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={filteredRecords.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
}

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  TextField,
  Typography,
  Button
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import GridOnRoundedIcon from '@mui/icons-material/GridOnRounded';
import CleaningServicesRoundedIcon from '@mui/icons-material/CleaningServicesRounded';
import * as XLSX from 'xlsx';

const severityColors = {
  baja: { color: 'success', bg: 'rgba(22, 163, 74, 0.12)', text: '#166534' },
  media: { color: 'warning', bg: 'rgba(234, 88, 12, 0.12)', text: '#9a3412' },
  alta: { color: 'error', bg: 'rgba(220, 38, 38, 0.12)', text: '#991b1b' }
};

const categoryColors = {
  logistica: { bg: 'rgba(37, 99, 235, 0.10)', text: '#1e3a8a' },
  logística: { bg: 'rgba(37, 99, 235, 0.10)', text: '#1e3a8a' },
  inocuidad: { bg: 'rgba(220, 38, 38, 0.10)', text: '#991b1b' },
  calidad: { bg: 'rgba(234, 88, 12, 0.10)', text: '#9a3412' },
  documentacion: { bg: 'rgba(14, 116, 144, 0.12)', text: '#155e75' },
  operativo: { bg: 'rgba(79, 70, 229, 0.10)', text: '#3730a3' },
  reclamo_externo: { bg: 'rgba(190, 24, 93, 0.10)', text: '#9d174d' },
  reclamo_interno: { bg: 'rgba(249, 115, 22, 0.10)', text: '#9a3412' },
  otros: { bg: 'rgba(148, 163, 184, 0.16)', text: '#334155' }
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

export default function AnalysisResults({ records, analysisId, onExportSuccess, onClearAnalysis }) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');

  const resetLocalState = () => {
    setPage(0);
    setRowsPerPage(10);
    setSearchTerm('');
    setFilterCategory('all');
    setFilterSeverity('all');
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

  const availableCategories = [...new Set(records.map((record) => normalizeCellValue(record.categoria)).filter(Boolean))];
  const availableSeverities = [...new Set(records.map((record) => normalizeCellValue(record.gravedad)).filter(Boolean))];

  const filteredRecords = records.filter(record => {
    const empleadoText = normalizeCellValue(record.empleado).toLowerCase();
    const descripcionText = normalizeCellValue(record.descripcion).toLowerCase();
    const sectorText = normalizeCellValue(record.sector).toLowerCase();
    const categoria = normalizeCellValue(record.categoria);
    const gravedad = normalizeCellValue(record.gravedad);

    const matchesSearch = 
      empleadoText.includes(searchTerm.toLowerCase()) ||
      descripcionText.includes(searchTerm.toLowerCase()) ||
      sectorText.includes(searchTerm.toLowerCase());
    
    const matchesCategory = 
      filterCategory === 'all' || categoria === filterCategory;
    const matchesSeverity =
      filterSeverity === 'all' || gravedad === filterSeverity;

    return matchesSearch && matchesCategory && matchesSeverity;
  });

  const handleChangePage = (event, newPage) => {
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

  const handleExport = async () => {
    const csv = [
      ['Empleado', 'Sector', 'Descripción', 'Categoría', 'Origen', 'Gravedad', 'Acción inmediata', 'Acción correctiva', 'Score', 'Notas'],
      ...filteredRecords.map(r => [
        normalizeCellValue(r.empleado),
        normalizeCellValue(r.sector),
        normalizeCellValue(r.descripcion),
        normalizeCellValue(r.categoria),
        normalizeCellValue(r.origen || 'interno'),
        normalizeCellValue(r.gravedad),
        normalizeCellValue(r.accionInmediata || r.accionSugerida),
        normalizeCellValue(r.accionCorrectiva),
        normalizeCellValue(r.score),
        normalizeCellValue(r.notas).replaceAll(',', ';')
      ])
    ]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analysis-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    resetLocalState();
    await onExportSuccess?.(analysisId);
  };

  const handleExportExcel = async () => {
    const rows = filteredRecords.map((record) => ({
      Empleado: normalizeCellValue(record.empleado),
      Sector: normalizeCellValue(record.sector),
      Descripción: normalizeCellValue(record.descripcion),
      Categoría: normalizeCellValue(record.categoria),
      Origen: normalizeCellValue(record.origen || 'interno'),
      Gravedad: normalizeCellValue(record.gravedad),
      'Acción inmediata': normalizeCellValue(record.accionInmediata || record.accionSugerida).replaceAll('_', ' '),
      'Acción correctiva': normalizeCellValue(record.accionCorrectiva),
      Score: normalizeCellValue(record.score)
    }));

    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Resultados');
    XLSX.writeFile(workbook, `analysis-${new Date().toISOString().split('T')[0]}.xlsx`);

    resetLocalState();
    await onExportSuccess?.(analysisId);
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
          Registros Procesados ({filteredRecords.length})
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="text"
            startIcon={<CleaningServicesRoundedIcon />}
            onClick={() => {
              resetLocalState();
              onClearAnalysis?.();
            }}
            size="small"
          >
            Limpiar dashboard
          </Button>
          <Button
            variant="outlined"
            startIcon={<GridOnRoundedIcon />}
            onClick={handleExportExcel}
            size="small"
            sx={{ '&:hover': { backgroundColor: 'rgba(29,78,216,0.08)' } }}
          >
            Exportar Excel
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            size="small"
            sx={{ '&:hover': { backgroundColor: 'rgba(29,78,216,0.08)' } }}
          >
            Exportar CSV
          </Button>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 200px 180px' },
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
          label="Categoría"
          value={filterCategory}
          onChange={(e) => {
            setFilterCategory(e.target.value);
            setPage(0);
          }}
          size="small"
          fullWidth
          SelectProps={{ native: true }}
        >
          <option value="all">Todas</option>
          {availableCategories.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </TextField>
        <TextField
          select
          label="Gravedad"
          value={filterSeverity}
          onChange={(e) => {
            setFilterSeverity(e.target.value);
            setPage(0);
          }}
          size="small"
          fullWidth
          SelectProps={{ native: true }}
        >
          <option value="all">Todas</option>
          {availableSeverities.map((severity) => (
            <option key={severity} value={severity}>{severity}</option>
          ))}
        </TextField>
      </Box>

      <TableContainer sx={{ overflowX: 'auto', backgroundColor: 'transparent' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Empleado</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Sector</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Descripción</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Categoría</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Origen</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Gravedad</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Acción inmediata</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Acción correctiva</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Score</TableCell>
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
                <TableCell>{normalizeCellValue(record.empleado)}</TableCell>
                <TableCell>{normalizeCellValue(record.sector)}</TableCell>
                <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {normalizeCellValue(record.descripcion)}
                </TableCell>
                <TableCell>
                  <Chip
                    label={normalizeCellValue(record.categoria)}
                    size="small"
                    sx={{
                      backgroundColor: (categoryColors[record.categoria] || categoryColors.otros).bg,
                      color: (categoryColors[record.categoria] || categoryColors.otros).text
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Chip label={normalizeCellValue(record.origen || 'interno')} size="small" />
                </TableCell>
                <TableCell>
                  <Chip
                    label={normalizeCellValue(record.gravedad)}
                    size="small"
                    sx={{
                      backgroundColor: (severityColors[record.gravedad] || severityColors.baja).bg,
                      color: (severityColors[record.gravedad] || severityColors.baja).text,
                      textTransform: 'capitalize'
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                    {normalizeCellValue(record.accionInmediata || record.accionSugerida).replaceAll('_', ' ')}
                  </Typography>
                </TableCell>
                <TableCell sx={{ maxWidth: 240 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {normalizeCellValue(record.accionCorrectiva || 'Definir mejora y seguimiento')}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {normalizeCellValue(record.score || 0)}
                  </Typography>
                </TableCell>
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

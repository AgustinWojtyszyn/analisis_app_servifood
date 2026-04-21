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

const severityColors = {
  baja: 'success',
  media: 'warning',
  alta: 'error'
};

const categoryColors = {
  logística: 'info',
  inocuidad: 'error',
  calidad: 'warning',
  reclamo_externo: 'error',
  reclamo_interno: 'warning',
  otros: 'default'
};

export default function AnalysisResults({ records }) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  if (!records || records.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="textSecondary">
          No hay registros para mostrar
        </Typography>
      </Paper>
    );
  }

  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      record.empleado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.sector?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = 
      filterCategory === 'all' || record.categoria === filterCategory;

    return matchesSearch && matchesCategory;
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

  const handleExport = () => {
    const csv = [
      ['Empleado', 'Sector', 'Descripción', 'Categoría', 'Gravedad', 'Acción Sugerida', 'Notas'],
      ...filteredRecords.map(r => [
        r.empleado,
        r.sector,
        r.descripcion,
        r.categoria,
        r.gravedad,
        r.accionSugerida,
        (r.notas || []).join('; ')
      ])
    ]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analysis-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Registros Procesados ({filteredRecords.length})
        </Typography>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExport}
          size="small"
        >
          Exportar CSV
        </Button>
      </Box>

      {/* Filtros */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          placeholder="Buscar por empleado, sector o descripción..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(0);
          }}
          size="small"
          sx={{ flex: 1 }}
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
          sx={{ minWidth: 150 }}
          SelectProps={{ native: true }}
        >
          <option value="all">Todas</option>
          <option value="logística">Logística</option>
          <option value="inocuidad">Inocuidad</option>
          <option value="calidad">Calidad</option>
          <option value="reclamo_externo">Reclamo Externo</option>
          <option value="reclamo_interno">Reclamo Interno</option>
          <option value="otros">Otros</option>
        </TextField>
      </Box>

      {/* Tabla */}
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#2c2c2c' }}>
              <TableCell sx={{ fontWeight: 600 }}>Empleado</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Sector</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Descripción</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Categoría</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Gravedad</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Acción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayedRecords.map((record, index) => (
              <TableRow key={index} hover sx={{ '&:last-child td': { border: 0 } }}>
                <TableCell>{record.empleado}</TableCell>
                <TableCell>{record.sector}</TableCell>
                <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {record.descripcion}
                </TableCell>
                <TableCell>
                  <Chip
                    label={record.categoria}
                    color={categoryColors[record.categoria] || 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={record.gravedad}
                    color={severityColors[record.gravedad]}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {record.accionSugerida.replace('_', ' ')}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Paginación */}
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

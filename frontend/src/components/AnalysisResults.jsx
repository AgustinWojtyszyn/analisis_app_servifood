import React, { Fragment, useEffect, useRef, useState } from 'react';
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
  Button,
  Tabs,
  Tab,
  Tooltip,
  Collapse,
  IconButton
} from '@mui/material';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded';
import CleaningServicesRoundedIcon from '@mui/icons-material/CleaningServicesRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import * as XLSX from 'xlsx';
import excelIcon from '../assets/excel.png';
import whatsappIcon from '../assets/whatsappicon.png';

const typeColors = {
  IN: { bg: 'rgba(220, 38, 38, 0.12)', text: '#991b1b' },
  LE: { bg: 'rgba(3, 105, 161, 0.16)', text: '#0c4a6e' },
  LGT: { bg: 'rgba(2, 132, 199, 0.16)', text: '#075985' },
  NC: { bg: 'rgba(220, 38, 38, 0.12)', text: '#991b1b' },
  OBS: { bg: 'rgba(245, 158, 11, 0.15)', text: '#92400e' },
  OM: { bg: 'rgba(139, 92, 246, 0.14)', text: '#5b21b6' }
};

const tabStyleByCategory = {
  todos: { bg: 'rgba(100, 116, 139, 0.16)', color: '#334155' },
  inocuidad: { bg: 'rgba(220, 38, 38, 0.15)', color: '#991b1b' },
  calidad: { bg: 'rgba(139, 92, 246, 0.16)', color: '#5b21b6' },
  logistica: { bg: 'rgba(2, 132, 199, 0.16)', color: '#075985' },
  legal: { bg: 'rgba(3, 105, 161, 0.16)', color: '#0c4a6e' },
  conformes: { bg: 'rgba(22, 163, 74, 0.15)', color: '#166534' },
  manual: { bg: 'rgba(245, 158, 11, 0.18)', color: '#92400e' }
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
    .split(/[\/,]/)
    .map((area) => area.trim())
    .filter(Boolean);
}

function getOriginalColumns(record) {
  const source = record?.columnasOriginales;
  if (!source || typeof source !== 'object' || Array.isArray(source)) return {};
  return source;
}

function findOriginalValueByAliases(record, aliases = []) {
  const original = getOriginalColumns(record);
  const entries = Object.entries(original);
  for (const alias of aliases) {
    const aliasNorm = normalizeCellValue(alias).toLowerCase().trim();
    const match = entries.find(([key]) => normalizeCellValue(key).toLowerCase().trim() === aliasNorm);
    if (match) return normalizeCellValue(match[1]);
  }
  return '';
}

function formatEstadoAccion(value) {
  const raw = normalizeCellValue(value).trim().toLowerCase();
  if (!raw || raw === '-') return 'Sin acción';
  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');

  if (normalized === 'sin_accion' || normalized === 'sinaccion') return 'Sin acción';
  if (normalized === 'en_proceso' || normalized === 'enproceso') return 'En proceso';
  if (normalized === 'cerrada' || normalized === 'cerrado') return 'Cerrado';
  if (normalized === 'archivada' || normalized === 'archivado') return 'Archivado';
  if (normalized === 'abierta' || normalized === 'abierto') return 'Abierto';
  return normalized.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
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
  const [activeCategory, setActiveCategory] = useState('todos');
  const [expandedRows, setExpandedRows] = useState({});
  const topScrollRef = useRef(null);
  const tableContainerRef = useRef(null);
  const [scrollContentWidth, setScrollContentWidth] = useState(1600);

  const resetLocalState = () => {
    setPage(0);
    setRowsPerPage(10);
    setSearchTerm('');
    setFilterArea('all');
    setActiveCategory('todos');
    setExpandedRows({});
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

  const categories = [
    { key: 'todos', label: 'Todos', short: 'Todos' },
    { key: 'inocuidad', label: 'Desvío de inocuidad', short: 'Inocuidad' },
    { key: 'calidad', label: 'Desvío de calidad', short: 'Calidad' },
    { key: 'logistica', label: 'Desvío de logística', short: 'Logística' },
    { key: 'legal', label: 'Desvío legal', short: 'Legal' },
    { key: 'conformes', label: 'Conformes', short: 'Conformes' },
    { key: 'manual', label: 'Revisión manual', short: 'Manual' }
  ];

  const availableAreas = [...new Set(records.flatMap((record) => splitAreas(record.areaClasificada)).filter(Boolean))];

  const countsByCategory = {
    todos: records.length,
    inocuidad: records.filter((record) => normalizeCellValue(record.categoriaDesvio) === 'Desvío de Inocuidad').length,
    calidad: records.filter((record) => normalizeCellValue(record.categoriaDesvio) === 'Desvío de Calidad').length,
    logistica: records.filter((record) => normalizeCellValue(record.categoriaDesvio) === 'Desvío de Logística').length,
    legal: records.filter((record) => normalizeCellValue(record.categoriaDesvio) === 'Desvío Legal').length,
    conformes: records.filter((record) => normalizeCellValue(record.resultadoClasificado) === 'Conforme').length,
    manual: records.filter((record) => normalizeCellValue(record.categoriaDesvio) === 'Revisar manualmente').length
  };

  const filteredRecords = records.filter((record) => {
    const textSearch = [
      record.areaProceso,
      record.actividadRealizada,
      record.tipoActividad,
      record.resultado,
      record.notaTecnica,
      record.areaClasificada,
      record.iso22000,
      record.categoriaDesvio,
      record.hallazgoDetectado,
      record.responsable,
      record.estadoAccion
    ].map((value) => normalizeCellValue(value).toLowerCase()).join(' | ');

    const areaParts = splitAreas(record.areaClasificada);
    const tipo = normalizeCellValue(record.tipoDesvio);
    const resultadoClasificado = normalizeCellValue(record.resultadoClasificado);
    const categoriaDesvio = normalizeCellValue(record.categoriaDesvio);

    const matchesSearch = textSearch.includes(searchTerm.toLowerCase());
    const matchesArea = filterArea === 'all' || areaParts.includes(filterArea);
    const matchesCategory = (() => {
      if (activeCategory === 'todos') return true;
      if (activeCategory === 'inocuidad') return categoriaDesvio === 'Desvío de Inocuidad';
      if (activeCategory === 'calidad') return categoriaDesvio === 'Desvío de Calidad';
      if (activeCategory === 'logistica') return categoriaDesvio === 'Desvío de Logística';
      if (activeCategory === 'legal') return categoriaDesvio === 'Desvío Legal';
      if (activeCategory === 'conformes') return resultadoClasificado === 'Conforme';
      if (activeCategory === 'manual') return categoriaDesvio === 'Revisar manualmente';
      return true;
    })();

    return matchesSearch && matchesArea && matchesCategory;
  });

  const exportConfigByFilter = {
    todos: { label: 'Exportar todos', fileName: 'analisis_todos.xlsx' },
    inocuidad: { label: 'Exportar desvío inocuidad', fileName: 'analisis_desvio_inocuidad.xlsx' },
    calidad: { label: 'Exportar desvío calidad', fileName: 'analisis_desvio_calidad.xlsx' },
    logistica: { label: 'Exportar desvío logística', fileName: 'analisis_desvio_logistica.xlsx' },
    legal: { label: 'Exportar desvío legal', fileName: 'analisis_desvio_legal.xlsx' },
    conformes: { label: 'Exportar conformes', fileName: 'analisis_conformes.xlsx' },
    manual: { label: 'Exportar revisión manual', fileName: 'analisis_revision_manual.xlsx' }
  };
  const activeExportConfig = exportConfigByFilter[activeCategory] || exportConfigByFilter.todos;

  const displayedRecords = filteredRecords.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (_event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const toggleExpandedRow = (rowKey) => {
    setExpandedRows((prev) => ({ ...prev, [rowKey]: !prev[rowKey] }));
  };

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
      `IN: ${byTipo.IN || 0} | LE: ${byTipo.LE || 0} | LGT: ${byTipo.LGT || 0}`,
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
    const baseHeaders = [
      'Fecha',
      'Hallazgo detectado',
      'Área clasificada',
      'Categoría desvío',
      'Tipo desvío',
      'ISO 22000',
      'Acción inmediata',
      'Acción correctiva',
      'Estado acción',
      'Responsable',
      'Área / Proceso',
      'Actividad realizada',
      'Descripción',
      'Observaciones',
      'N° Acción',
      'Nota técnica'
    ];

    const originalHeaders = [...new Set(
      filteredRecords.flatMap((record) => Object.keys(getOriginalColumns(record)))
    )];

    const rows = filteredRecords.map((record) => {
      const base = {
        Fecha: normalizeCellValue(record.fecha),
        'Hallazgo detectado': normalizeCellValue(record.hallazgoDetectado),
        'Área clasificada': normalizeCellValue(record.areaClasificada),
        'Categoría desvío': normalizeCellValue(record.categoriaDesvio),
        'Tipo desvío': normalizeCellValue(record.tipoDesvio),
        'ISO 22000': normalizeCellValue(record.iso22000),
        'Acción inmediata': normalizeCellValue(record.accionInmediata),
        'Acción correctiva': normalizeCellValue(record.accionCorrectiva),
        'Estado acción': normalizeCellValue(record.estadoAccion),
        Responsable: normalizeCellValue(record.responsable),
        'Área / Proceso': normalizeCellValue(record.areaProceso),
        'Actividad realizada': normalizeCellValue(record.actividadRealizada),
        Descripción: findOriginalValueByAliases(record, [
          'Descripción',
          'Descripcion',
          'Descripción del desvío',
          'Descripcion del desvio',
          'Detalle del desvío',
          'Detalle del desvio'
        ]) || normalizeCellValue(record.descripcion),
        Observaciones: findOriginalValueByAliases(record, ['Observaciones', 'Observación', 'Observacion']) || normalizeCellValue(record.observaciones),
        'N° Acción': findOriginalValueByAliases(record, ['N° Acción', 'N° Accion', 'Nro Acción', 'Nro Accion', 'Numero accion']) || normalizeCellValue(record.numeroAccion),
        'Nota técnica': findOriginalValueByAliases(record, ['Nota técnica', 'Nota tecnica']) || normalizeCellValue(record.notaTecnica)
      };

      const originals = getOriginalColumns(record);
      originalHeaders.forEach((key) => {
        base[key] = normalizeCellValue(originals[key]);
      });
      return base;
    });

    const sheet = XLSX.utils.json_to_sheet(rows, { header: [...baseHeaders, ...originalHeaders] });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Resultados');
    XLSX.writeFile(workbook, activeExportConfig.fileName);

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

  useEffect(() => {
    const topEl = topScrollRef.current;
    const tableEl = tableContainerRef.current;
    if (!topEl || !tableEl) return;

    const computeWidth = () => {
      const innerTable = tableEl.querySelector('table');
      if (innerTable) {
        setScrollContentWidth(innerTable.scrollWidth || 1600);
      }
    };

    computeWidth();
    window.addEventListener('resize', computeWidth);

    let syncing = false;
    const syncFromTop = () => {
      if (syncing) return;
      syncing = true;
      tableEl.scrollLeft = topEl.scrollLeft;
      syncing = false;
    };
    const syncFromTable = () => {
      if (syncing) return;
      syncing = true;
      topEl.scrollLeft = tableEl.scrollLeft;
      syncing = false;
    };

    topEl.addEventListener('scroll', syncFromTop);
    tableEl.addEventListener('scroll', syncFromTable);

    return () => {
      window.removeEventListener('resize', computeWidth);
      topEl.removeEventListener('scroll', syncFromTop);
      tableEl.removeEventListener('scroll', syncFromTable);
    };
  }, [filteredRecords.length, rowsPerPage, page]);

  return (
    <Paper sx={{ p: { xs: 1.25, md: 1.75 }, boxShadow: '0 2px 12px rgba(15,23,42,0.05)', overflowX: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: 19, md: 21 } }}>
          Registros procesados ({filteredRecords.length})
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.25 }}>
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
        </Box>
      </Box>

      <Box sx={{ mb: 1.5 }}>
        <Tabs
          value={activeCategory}
          onChange={(_event, value) => {
            setActiveCategory(value);
            setPage(0);
          }}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: 44,
            '.MuiTabs-indicator': { display: 'none' },
            '.MuiTabs-flexContainer': { gap: 1 }
          }}
        >
          {categories.map((category) => {
            const palette = tabStyleByCategory[category.key];
            const isActive = activeCategory === category.key;
            return (
              <Tab
                key={category.key}
                value={category.key}
                label={`${category.short} (${countsByCategory[category.key] || 0})`}
                sx={{
                  minHeight: 36,
                  height: 36,
                  borderRadius: 999,
                  px: 1.5,
                  py: 0.5,
                  minWidth: 0,
                  textTransform: 'none',
                  fontWeight: 700,
                  color: isActive ? palette.color : '#475569',
                  backgroundColor: isActive ? palette.bg : 'rgba(148,163,184,0.12)',
                  border: isActive ? `1px solid ${palette.color}33` : '1px solid rgba(148,163,184,0.22)'
                }}
              />
            );
          })}
        </Tabs>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 240px auto auto' }, gap: 1.25, mb: 2 }}>
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
        <Button
          variant="contained"
          onClick={handleExportExcel}
          disabled={filteredRecords.length === 0}
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
            },
            '&.Mui-disabled': {
              backgroundColor: '#9ca3af',
              color: '#f3f4f6',
              boxShadow: 'none'
            }
          }}
        >
          <img src={excelIcon} alt="" width={16} height={16} />
          {activeExportConfig.label}
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

      <Box ref={topScrollRef} sx={{ overflowX: 'auto', overflowY: 'hidden', mb: 0.75 }}>
        <Box sx={{ width: scrollContentWidth, height: 1 }} />
      </Box>

      <TableContainer ref={tableContainerRef} sx={{ overflowX: 'auto', backgroundColor: 'transparent', mx: { xs: -0.5, md: 0 }, width: '100%' }}>
        <Table sx={{ minWidth: 1600 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, width: 52 }} />
              <TableCell sx={{ fontWeight: 700 }}>Fecha</TableCell>
              <TableCell sx={{ fontWeight: 700, minWidth: 300 }}>Hallazgo detectado</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Área</TableCell>
              <TableCell sx={{ fontWeight: 700, minWidth: 180 }}>Categoría</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Tipo</TableCell>
              <TableCell sx={{ fontWeight: 700, minWidth: 170 }}>ISO</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Responsable</TableCell>
              <TableCell sx={{ fontWeight: 700, minWidth: 240 }}>Descripción</TableCell>
              <TableCell sx={{ fontWeight: 700, minWidth: 220 }}>Observaciones</TableCell>
              <TableCell sx={{ fontWeight: 700, minWidth: 130 }}>N° Acción</TableCell>
              <TableCell sx={{ fontWeight: 700, minWidth: 220 }}>Nota técnica</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayedRecords.map((record, index) => {
              const rowKey = `${page}-${index}-${normalizeCellValue(record.fecha)}-${normalizeCellValue(record.hallazgoDetectado).slice(0, 20)}`;
              const isExpanded = Boolean(expandedRows[rowKey]);
              const fullHallazgo = normalizeCellValue(record.hallazgoDetectado);
              return (
                <Fragment key={rowKey}>
                  <TableRow hover sx={{ '&:hover': { backgroundColor: 'rgba(29, 78, 216, 0.025)' } }}>
                    <TableCell>
                      <IconButton size="small" onClick={() => toggleExpandedRow(rowKey)} aria-label="ver detalle">
                        {isExpanded ? <KeyboardArrowUpRoundedIcon fontSize="small" /> : <KeyboardArrowDownRoundedIcon fontSize="small" />}
                      </IconButton>
                    </TableCell>
                    <TableCell>{normalizeCellValue(record.fecha)}</TableCell>
                    <TableCell>
                      <Tooltip title={fullHallazgo || '-'} arrow placement="top-start">
                        <Typography
                          variant="body2"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        >
                          {fullHallazgo || '-'}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{normalizeCellValue(record.areaClasificada) || '-'}</TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Typography variant="body2">{normalizeCellValue(record.categoriaDesvio) || '-'}</Typography>
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
                    <TableCell sx={{ maxWidth: 250 }}>
                      <Typography variant="body2">{normalizeCellValue(record.iso22000) || '-'}</Typography>
                    </TableCell>
                    <TableCell>{formatEstadoAccion(record.estadoAccion)}</TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Typography variant="body2">{normalizeCellValue(record.responsable) || '-'}</Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 280 }}>
                      <Typography variant="body2">
                        {findOriginalValueByAliases(record, [
                          'Descripción',
                          'Descripcion',
                          'Descripción del desvío',
                          'Descripcion del desvio',
                          'Detalle del desvío',
                          'Detalle del desvio'
                        ]) || normalizeCellValue(record.descripcion) || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 240 }}>
                      <Typography variant="body2">
                        {findOriginalValueByAliases(record, ['Observaciones', 'Observación', 'Observacion']) || normalizeCellValue(record.observaciones) || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {findOriginalValueByAliases(record, [
                        'N° Acción',
                        'N° Accion',
                        'Nro Acción',
                        'Nro Accion',
                        'Numero accion'
                      ]) || normalizeCellValue(record.numeroAccion) || '-'}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 240 }}>
                      <Typography variant="body2">
                        {findOriginalValueByAliases(record, ['Nota técnica', 'Nota tecnica']) || normalizeCellValue(record.notaTecnica) || '-'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={13}>
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ px: 2, py: 1.5, backgroundColor: 'rgba(148,163,184,0.08)', borderRadius: 1, mb: 1.25 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Detalle del registro</Typography>
                          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.25 }}>
                            <Box>
                              <Typography variant="caption" color="text.secondary">Acción inmediata</Typography>
                              <Typography variant="body2">{normalizeCellValue(record.accionInmediata) || '-'}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">Acción correctiva</Typography>
                              <Typography variant="body2">{normalizeCellValue(record.accionCorrectiva) || '-'}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">Área / Proceso original</Typography>
                              <Typography variant="body2">{normalizeCellValue(record.areaProceso) || '-'}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">Actividad realizada original</Typography>
                              <Typography variant="body2">{normalizeCellValue(record.actividadRealizada) || '-'}</Typography>
                            </Box>
                            <Box sx={{ gridColumn: { xs: 'auto', md: '1 / span 2' } }}>
                              <Typography variant="caption" color="text.secondary">Hallazgo completo</Typography>
                              <Typography variant="body2">{fullHallazgo || '-'}</Typography>
                            </Box>
                            <Box sx={{ gridColumn: { xs: 'auto', md: '1 / span 2' } }}>
                              <Typography variant="caption" color="text.secondary">Desvío interno/externo (origen)</Typography>
                              <Typography variant="body2">
                                {findOriginalValueByAliases(record, ['Desvío interno/externo', 'Desvio interno/externo', 'Origen', 'origen']) || '-'}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">Acción inmediata (origen)</Typography>
                              <Typography variant="body2">
                                {findOriginalValueByAliases(record, ['Acción inmediata', 'Accion inmediata']) || '-'}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">Acción correctiva propuesta (origen)</Typography>
                              <Typography variant="body2">
                                {findOriginalValueByAliases(record, ['Acción correctiva propuesta', 'Accion correctiva propuesta', 'Acción Correctiva Propuesta']) || '-'}
                              </Typography>
                            </Box>
                            <Box sx={{ gridColumn: { xs: 'auto', md: '1 / span 2' } }}>
                              <Typography variant="caption" color="text.secondary">Observaciones (origen)</Typography>
                              <Typography variant="body2">
                                {findOriginalValueByAliases(record, ['Observaciones', 'Observación', 'Observacion']) || '-'}
                              </Typography>
                            </Box>
                            {Object.keys(getOriginalColumns(record)).length > 0 && (
                              <Box sx={{ gridColumn: { xs: 'auto', md: '1 / span 2' } }}>
                                <Typography variant="caption" color="text.secondary">Datos originales</Typography>
                                <Box sx={{ mt: 0.5, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 0.6 }}>
                                  {Object.entries(getOriginalColumns(record)).map(([key, value]) => (
                                    <Typography key={`${rowKey}-${key}`} variant="body2">
                                      <strong>{key}:</strong> {normalizeCellValue(value) || '-'}
                                    </Typography>
                                  ))}
                                </Box>
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </Fragment>
              );
            })}
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

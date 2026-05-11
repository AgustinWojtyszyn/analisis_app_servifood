import React, { Fragment, useEffect, useMemo, useRef, useState } from 'react';
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
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded';
import CleaningServicesRoundedIcon from '@mui/icons-material/CleaningServicesRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import * as XLSX from 'xlsx';
import excelIcon from '../assets/excel.png';
import whatsappIcon from '../assets/whatsappicon.png';

const typeColors = {
  Interno: { bg: 'rgba(2, 132, 199, 0.16)', text: '#075985' },
  Externo: { bg: 'rgba(220, 38, 38, 0.12)', text: '#991b1b' }
};

const categoryColors = {
  Legales: { bg: 'rgba(3, 105, 161, 0.16)', text: '#0c4a6e' },
  'Logística': { bg: 'rgba(2, 132, 199, 0.16)', text: '#075985' },
  Calidad: { bg: 'rgba(126, 34, 206, 0.14)', text: '#5b21b6' },
  Mantenimiento: { bg: 'rgba(51, 65, 85, 0.16)', text: '#334155' },
  Inocuidad: { bg: 'rgba(220, 38, 38, 0.12)', text: '#991b1b' },
  'Recursos Humanos': { bg: 'rgba(22, 163, 74, 0.14)', text: '#166534' },
  'Revisar manualmente': { bg: 'rgba(100, 116, 139, 0.16)', text: '#334155' }
};

function normalizeCellValue(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(normalizeCellValue).filter(Boolean).join(' ');
  if (typeof value === 'object') {
    if (Array.isArray(value.richText)) return value.richText.map((part) => normalizeCellValue(part?.text)).filter(Boolean).join('');
    if (typeof value.text === 'string') return value.text;
    if (value.result != null) return normalizeCellValue(value.result);
  }
  return String(value);
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

function normalizeClassification(record = {}) {
  const raw = normalizeCellValue(
    record.clasificacionDesvio
      || record.classification_normalized
      || record.categoriaDesvio
      || record.classification_original
      || findOriginalValueByAliases(record, [
        'Clasificacion del desvio',
        'Clasificación del desvío',
        'Clasificacion del desvío',
        'Clasificación del desvio'
      ])
  ).trim().toLowerCase();

  if (raw.includes('legal')) return 'Legales';
  if (raw.includes('logistica')) return 'Logística';
  if (raw.includes('inocuidad')) return 'Inocuidad';
  if (raw.includes('mantenimiento')) return 'Mantenimiento';
  if (raw.includes('rrhh') || raw.includes('recursos humanos') || raw.includes('personal')) return 'Recursos Humanos';
  if (raw.includes('calidad')) return 'Calidad';
  return 'Revisar manualmente';
}

function normalizeTipo(record = {}) {
  const raw = normalizeCellValue(
    record.tipoDesvioOrigen
    || record.scope_normalized
    || record.scope_original
    || record.alcanceDesvio
    || findOriginalValueByAliases(record, ['Desvío interno/externo', 'Desvio interno/externo', 'Origen', 'origen'])
  ).trim().toLowerCase();
  return raw === 'externo' ? 'Externo' : 'Interno';
}

function normalizeEstado(record = {}) {
  const raw = normalizeCellValue(record.estadoAcciones || record.estadoAccion).trim().toLowerCase();
  return (raw === 'cerrado' || raw === 'cerrada') ? 'Cerrado' : 'Abierto';
}

function splitAreas(areaClasificada) {
  return normalizeCellValue(areaClasificada)
    .split(/[\/,]/)
    .map((area) => area.trim())
    .filter(Boolean);
}

export default function AnalysisResults({ records, analysisId, onExportSuccess, onReprocessExcel, onDeleteCurrent }) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterArea, setFilterArea] = useState('all');
  const [filterClassification, setFilterClassification] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeCategory, setActiveCategory] = useState('todos');
  const [exportMode, setExportMode] = useState('all');
  const [expandedRows, setExpandedRows] = useState({});
  const topScrollRef = useRef(null);
  const tableContainerRef = useRef(null);
  const [scrollContentWidth, setScrollContentWidth] = useState(1600);

  const categories = [
    { key: 'todos', short: 'Todos' },
    { key: 'Legales', short: 'Legales' },
    { key: 'Logística', short: 'Logística' },
    { key: 'Calidad', short: 'Calidad' },
    { key: 'Mantenimiento', short: 'Mantenimiento' },
    { key: 'Inocuidad', short: 'Inocuidad' },
    { key: 'Recursos Humanos', short: 'RRHH' },
    { key: 'Revisar manualmente', short: 'Manual' }
  ];

  const resetLocalState = () => {
    setPage(0);
    setRowsPerPage(10);
    setSearchTerm('');
    setFilterArea('all');
    setFilterClassification('all');
    setFilterStatus('all');
    setActiveCategory('todos');
    setExportMode('all');
    setExpandedRows({});
  };

  if (!records || records.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>No hay análisis aún</Typography>
        <Typography color="text.secondary">Cargá un archivo desde la sección “Cargar Archivo” para ver resultados.</Typography>
      </Paper>
    );
  }

  const availableAreas = [...new Set(records.flatMap((record) => splitAreas(record.areaSector || record.areaClasificada)).filter(Boolean))];

  const countsByCategory = useMemo(() => {
    const base = { todos: records.length };
    categories.forEach((category) => {
      if (category.key === 'todos') return;
      base[category.key] = records.filter((r) => normalizeClassification(r) === category.key).length;
    });
    return base;
  }, [records]);

  const filteredRecords = records.filter((record) => {
    const areaDisplay = normalizeCellValue(record.areaSector || record.areaClasificada);
    const classification = normalizeClassification(record);
    const tipo = normalizeTipo(record);
    const estado = normalizeEstado(record).toLowerCase();

    const textSearch = [
      record.fecha,
      areaDisplay,
      record.desvioDetectado || record.hallazgoDetectado,
      classification,
      tipo,
      record.accionInmediata,
      record.accionCorrectiva,
      record.iso22000,
      estado
    ].map((value) => normalizeCellValue(value).toLowerCase()).join(' | ');

    const matchesSearch = textSearch.includes(searchTerm.toLowerCase());
    const matchesArea = filterArea === 'all' || splitAreas(areaDisplay).includes(filterArea);
    const matchesClassification = filterClassification === 'all' || classification === filterClassification;
    const matchesStatus = filterStatus === 'all' || estado === filterStatus;
    const matchesCategory = activeCategory === 'todos' || classification === activeCategory;

    return matchesSearch && matchesArea && matchesClassification && matchesStatus && matchesCategory;
  });

  const displayedRecords = filteredRecords.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const recordsForExport = exportMode === 'filtered' ? filteredRecords : records;

  const exportConfigByFilter = {
    todos: { label: 'Exportar todos', fileName: 'analisis_todos.xlsx' },
    Legales: { label: 'Exportar Legales', fileName: 'analisis_desvio_legales.xlsx' },
    'Logística': { label: 'Exportar Logística', fileName: 'analisis_desvio_logistica.xlsx' },
    Calidad: { label: 'Exportar Calidad', fileName: 'analisis_desvio_calidad.xlsx' },
    Mantenimiento: { label: 'Exportar Mantenimiento', fileName: 'analisis_desvio_mantenimiento.xlsx' },
    Inocuidad: { label: 'Exportar Inocuidad', fileName: 'analisis_desvio_inocuidad.xlsx' },
    'Recursos Humanos': { label: 'Exportar RRHH', fileName: 'analisis_desvio_rrhh.xlsx' }
  };
  const activeExportConfig = exportConfigByFilter[activeCategory] || exportConfigByFilter.todos;

  const handleExportExcel = async () => {
    const baseHeaders = [
      'Fecha',
      'Área/Sector',
      'Desvío detectado',
      'Clasificación del desvío',
      'Tipo de desvío',
      'Acción inmediata',
      'Acción correctiva',
      'Relación ISO 22000',
      'Estado de acciones'
    ];

    const rows = recordsForExport.map((record) => ({
      Fecha: normalizeCellValue(record.fecha),
      'Área/Sector': normalizeCellValue(record.areaSector || record.areaClasificada),
      'Desvío detectado': normalizeCellValue(record.desvioDetectado || record.hallazgoDetectado),
      'Clasificación del desvío': normalizeClassification(record),
      'Tipo de desvío': normalizeTipo(record),
      'Acción inmediata': normalizeCellValue(record.immediate_action || record.accionInmediata),
      'Acción correctiva': normalizeCellValue(record.corrective_action || record.accionCorrectiva),
      'Relación ISO 22000': normalizeCellValue(record.relacionIso22000 || record.iso22000),
      'Estado de acciones': normalizeEstado(record)
    }));

    const sheet = XLSX.utils.json_to_sheet(rows, { header: baseHeaders });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Resultados');
    XLSX.writeFile(workbook, activeExportConfig.fileName);

    resetLocalState();
    await onExportSuccess?.(analysisId);
  };

  const handleShareWhatsApp = async () => {
    const byEstado = filteredRecords.reduce((acc, record) => {
      const estado = normalizeEstado(record);
      acc[estado] = (acc[estado] || 0) + 1;
      return acc;
    }, {});

    const message = [
      '*Resumen automático de desvíos*',
      `Registros filtrados: ${filteredRecords.length}`,
      `Abiertos: ${byEstado.Abierto || 0} | Cerrados: ${byEstado.Cerrado || 0}`
    ].join('\n');

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    resetLocalState();
    await onExportSuccess?.(analysisId);
  };

  useEffect(() => {
    const topEl = topScrollRef.current;
    const tableEl = tableContainerRef.current;
    if (!topEl || !tableEl) return;

    const computeWidth = () => {
      const innerTable = tableEl.querySelector('table');
      if (innerTable) setScrollContentWidth(innerTable.scrollWidth || 1500);
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
        <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: 19, md: 21 } }}>Registros procesados ({filteredRecords.length})</Typography>
        <Typography variant="body2" color="text.secondary">Mostrando {filteredRecords.length} de {records.length}</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.25 }}>
          <Button variant="text" startIcon={<CleaningServicesRoundedIcon />} onClick={() => onReprocessExcel?.()} size="small">Reprocesar Excel</Button>
          <Button variant="text" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => onDeleteCurrent?.()} size="small">Eliminar análisis actual</Button>
        </Box>
      </Box>

      <Tabs value={activeCategory} onChange={(_event, value) => { setActiveCategory(value); setPage(0); }} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile sx={{ mb: 1.5, '.MuiTabs-indicator': { display: 'none' }, '.MuiTabs-flexContainer': { gap: 1 } }}>
        {categories.map((category) => (
          <Tab key={category.key} value={category.key} label={`${category.short} (${countsByCategory[category.key] || 0})`} sx={{ minHeight: 36, height: 36, borderRadius: 999, px: 1.5, py: 0.5, minWidth: 0, textTransform: 'none', fontWeight: 700 }} />
        ))}
      </Tabs>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 240px 240px 180px' }, gap: 1.25, mb: 1.5 }}>
        <TextField placeholder="Buscar..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }} size="small" fullWidth />
        <TextField select label="Área/Sector" value={filterArea} onChange={(e) => { setFilterArea(e.target.value); setPage(0); }} size="small" fullWidth SelectProps={{ native: true }}>
          <option value="all">Todas</option>
          {availableAreas.map((area) => <option key={area} value={area}>{area}</option>)}
        </TextField>
        <TextField select label="Clasificación" value={filterClassification} onChange={(e) => { setFilterClassification(e.target.value); setPage(0); }} size="small" fullWidth SelectProps={{ native: true }}>
          <option value="all">Todas</option>
          {categories.filter((c) => c.key !== 'todos').map((c) => <option key={c.key} value={c.key}>{c.key}</option>)}
        </TextField>
        <TextField select label="Estado" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }} size="small" fullWidth SelectProps={{ native: true }}>
          <option value="all">Todos</option>
          <option value="abierto">Abierto</option>
          <option value="cerrado">Cerrado</option>
        </TextField>
      </Box>

      <Accordion sx={{ mb: 1.5, backgroundColor: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.22)' }}>
        <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>Sección avanzada</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '220px 1fr 1fr' }, gap: 1.25 }}>
            <TextField select label="Exportación" value={exportMode} onChange={(e) => setExportMode(e.target.value)} size="small" fullWidth SelectProps={{ native: true }}>
              <option value="all">Exportar todos</option>
              <option value="filtered">Exportar vista filtrada</option>
            </TextField>
            <Button variant="contained" onClick={handleExportExcel} disabled={recordsForExport.length === 0} size="small" sx={{ backgroundColor: '#1d6f42', color: '#fff' }}>
              <img src={excelIcon} alt="" width={16} height={16} style={{ marginRight: 8 }} />
              {exportMode === 'filtered' ? `${activeExportConfig.label} (vista)` : `${activeExportConfig.label} (todos)`}
            </Button>
            <Button variant="contained" onClick={handleShareWhatsApp} size="small" sx={{ backgroundColor: '#25d366', color: '#fff' }}>
              <img src={whatsappIcon} alt="" width={16} height={16} style={{ marginRight: 8 }} />
              Exportar por WhatsApp
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Box ref={topScrollRef} sx={{ overflowX: 'auto', overflowY: 'hidden', mb: 0.75 }}><Box sx={{ width: scrollContentWidth, height: 1 }} /></Box>

      <TableContainer ref={tableContainerRef} sx={{ overflowX: 'auto', backgroundColor: 'transparent', width: '100%' }}>
        <Table sx={{ minWidth: 1500 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, width: 52 }} />
              <TableCell sx={{ fontWeight: 700 }}>Fecha</TableCell>
              <TableCell sx={{ fontWeight: 700, minWidth: 300 }}>Desvío detectado</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Área/Sector</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Clasificación</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Tipo</TableCell>
              <TableCell sx={{ fontWeight: 700, minWidth: 170 }}>Relación ISO 22000</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
              <TableCell sx={{ fontWeight: 700, minWidth: 260 }}>Acción inmediata</TableCell>
              <TableCell sx={{ fontWeight: 700, minWidth: 300 }}>Acción correctiva</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayedRecords.map((record, index) => {
              const rowKey = `${page}-${index}-${normalizeCellValue(record.fecha)}-${normalizeCellValue(record.hallazgoDetectado).slice(0, 20)}`;
              const isExpanded = Boolean(expandedRows[rowKey]);
              const fullHallazgo = normalizeCellValue(record.desvioDetectado || record.hallazgoDetectado);
              const clasificacion = normalizeClassification(record);
              const tipo = normalizeTipo(record);
              const estado = normalizeEstado(record);

              return (
                <Fragment key={rowKey}>
                  <TableRow hover>
                    <TableCell>
                      <IconButton size="small" onClick={() => setExpandedRows((prev) => ({ ...prev, [rowKey]: !prev[rowKey] }))} aria-label="ver detalle">
                        {isExpanded ? <KeyboardArrowUpRoundedIcon fontSize="small" /> : <KeyboardArrowDownRoundedIcon fontSize="small" />}
                      </IconButton>
                    </TableCell>
                    <TableCell>{normalizeCellValue(record.fecha)}</TableCell>
                    <TableCell>
                      <Tooltip title={fullHallazgo || '-'} arrow placement="top-start">
                        <Typography variant="body2" sx={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{fullHallazgo || '-'}</Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{normalizeCellValue(record.areaSector || record.areaClasificada) || '-'}</TableCell>
                    <TableCell><Chip size="small" label={clasificacion} sx={{ backgroundColor: (categoryColors[clasificacion] || categoryColors.Calidad).bg, color: (categoryColors[clasificacion] || categoryColors.Calidad).text }} /></TableCell>
                    <TableCell><Chip size="small" label={tipo} sx={{ backgroundColor: (typeColors[tipo] || typeColors.Interno).bg, color: (typeColors[tipo] || typeColors.Interno).text }} /></TableCell>
                    <TableCell>{normalizeCellValue(record.relacionIso22000 || record.iso22000) || '-'}</TableCell>
                    <TableCell><Chip size="small" label={estado} /></TableCell>
                    <TableCell>{normalizeCellValue(record.immediate_action || record.accionInmediata) || '-'}</TableCell>
                    <TableCell>{normalizeCellValue(record.corrective_action || record.accionCorrectiva) || '-'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={10}>
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ px: 2, py: 1.5, backgroundColor: 'rgba(148,163,184,0.08)', borderRadius: 1, mb: 1.25 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Detalle del registro</Typography>
                          <Typography variant="body2">Área / Proceso original: {normalizeCellValue(record.areaProceso) || '-'}</Typography>
                          <Typography variant="body2">Actividad realizada original: {normalizeCellValue(record.actividadRealizada) || '-'}</Typography>
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
        onPageChange={(_event, newPage) => setPage(newPage)}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
      />
    </Paper>
  );
}

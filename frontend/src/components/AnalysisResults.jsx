import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Paper,
  TablePagination,
  Typography
} from '@mui/material';
import excelIcon from '../assets/excel.png';
import whatsappIcon from '../assets/whatsappicon.png';
import {
  ResultsHeader,
  CategoryTabs,
  ResultsFilters,
  AdvancedSection,
  ResultsTable
} from './analysisResults/AnalysisResultsSections.jsx';
import { readCanonicalIso } from '../lib/isoFields.js';
import { downloadAnalysisResultsWorkbook } from '../lib/analysisResultsExcel.js';

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
  const excelClassification = normalizeCellValue(
    record.classification_original
      || findOriginalValueByAliases(record, [
        'Clasificacion del desvio',
        'Clasificación del desvío',
        'Clasificacion del desvío',
        'Clasificación del desvio'
      ])
  ).trim();
  if (excelClassification && record?.preserveOriginalClassification) return excelClassification;

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
  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (normalized.includes('legal')) return 'Legales';
  if (normalized.includes('logistica')) return 'Logística';
  if (normalized.includes('inocuidad')) return 'Inocuidad';
  if (normalized.includes('mantenimiento')) return 'Mantenimiento';
  if (normalized.includes('rrhh') || normalized.includes('recursos humanos') || normalized.includes('personal')) return 'Recursos Humanos';
  if (normalized.includes('calidad')) return 'Calidad';
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
  const rawValue = normalizeCellValue(record.estadoAcciones || record.estadoAccion).trim();
  if (!rawValue) return 'No informado';
  const raw = rawValue.toLowerCase();
  if (raw === 'cerrado' || raw === 'cerrada') return 'Cerrado';
  if (raw === 'abierto' || raw === 'abierta') return 'Abierto';
  if (raw === 'no informado') return 'No informado';
  return rawValue;
}

function normalizeIsoForExport(value) {
  const raw = normalizeCellValue(value).trim();
  if (!raw || raw === '-') return '';
  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (normalized.includes('revisar manualmente') || normalized.includes('revision manual')) return 'Revisar manualmente';

  const codes = Array.from(normalized.matchAll(/\b\d+(?:\.\d+){0,2}\b/g)).map((m) => m[0]);
  if (codes.length === 0) return raw;

  const uniqueCodes = [...new Set(codes)];
  const selectPreferredCode = () => {
    if (uniqueCodes.includes('8.5.1')) return '8.5.1';
    if (uniqueCodes.includes('8.5.2')) return '8.5.2';
    if (uniqueCodes.some((c) => c.startsWith('8.5'))) return '8.5';
    if (uniqueCodes.some((c) => c.startsWith('8.2'))) return '8.2';
    if (uniqueCodes.includes('7.1')) return '7.1';
    if (uniqueCodes.includes('7.2')) return '7.2';
    if (uniqueCodes.includes('7.5')) return '7.5';
    if (uniqueCodes.includes('9.2')) return '9.2';
    if (uniqueCodes.includes('10.2')) return '10.2';
    return uniqueCodes[0];
  };

  const preferredCode = selectPreferredCode();
  const canonicalByCode = {
    '8.1': '8.1 Planificación y control operacional',
    '8.2': '8.2 PRP',
    '8.4': '8.4 Control de procesos, productos o servicios provistos externamente',
    '8.5': '8.5 HACCP',
    '8.5.1': '8.5.1 Control operacional',
    '8.5.2': '8.5.2 Trazabilidad',
    '8.7': '8.7 Control de las salidas no conformes',
    '7.1': '7.1 Recursos',
    '7.2': '7.2 Competencia',
    '7.5': '7.5 Información documentada',
    '9.2': '9.2 Auditoría interna',
    '10.2': '10.2 Acción correctiva'
  };

  return canonicalByCode[preferredCode] || preferredCode;
}

function splitAreas(areaClasificada) {
  return normalizeCellValue(areaClasificada)
    .split(/[\/,]/)
    .map((area) => area.trim())
    .filter(Boolean);
}

export default function AnalysisResults({ records, analysisId, onExportSuccess, onReprocessExcel, onDeleteCurrent }) {
  const safeRecords = useMemo(() => (Array.isArray(records) ? records : []), [records]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterArea, setFilterArea] = useState('all');
  const [filterClassification, setFilterClassification] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeCategory, setActiveCategory] = useState('todos');
  const [exportMode, setExportMode] = useState('all');
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [exportError, setExportError] = useState('');
  const [expandedRows, setExpandedRows] = useState({});
  const topScrollRef = useRef(null);
  const tableContainerRef = useRef(null);
  const [scrollContentWidth, setScrollContentWidth] = useState(1600);
  const classificationTraceEnabled = import.meta.env.VITE_CLASSIFICATION_FLOW_TRACE === '1';

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

  const availableAreas = [...new Set(safeRecords.flatMap((record) => splitAreas(record.areaSector || record.areaClasificada)).filter(Boolean))];

  const countsByCategory = useMemo(() => {
    const base = { todos: safeRecords.length };
    categories.forEach((category) => {
      if (category.key === 'todos') return;
      base[category.key] = safeRecords.filter((r) => normalizeClassification(r) === category.key).length;
    });
    return base;
  }, [safeRecords]);

  useEffect(() => {
    if (!classificationTraceEnabled) return;
    const sample = safeRecords.slice(0, 15).map((record) => ({
      rawRowNumber: record?.rawRowNumber ?? null,
      usedByUI: normalizeClassification(record),
      clasificacionDesvio: record?.clasificacionDesvio ?? null,
      classification_normalized: record?.classification_normalized ?? null,
      categoriaDesvio: record?.categoriaDesvio ?? null,
      classification: record?.classification ?? null,
      classification_original: record?.classification_original ?? null
    }));
    console.log('[FRONTEND CLASSIFICATION RENDER]', {
      analysisId,
      totalRecords: safeRecords.length,
      sample
    });
  }, [analysisId, safeRecords, classificationTraceEnabled]);

  const filteredRecords = safeRecords.filter((record) => {
    const areaDisplay = normalizeCellValue(record.areaSector || record.areaClasificada);
    const classification = normalizeClassification(record);
    const tipo = normalizeTipo(record);
    const estado = normalizeEstado(record).toLowerCase();
    const isoNormalized = normalizeIsoForExport(readCanonicalIso(record));

    const textSearch = [
      record.fecha,
      areaDisplay,
      record.desvioDetectado || record.hallazgoDetectado,
      classification,
      tipo,
      record.accionInmediata,
      record.accionCorrectiva,
      isoNormalized,
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

  const recordsForExport = exportMode === 'filtered' ? displayedRecords : safeRecords;

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
    if (isExportingExcel) return;
    setIsExportingExcel(true);
    setExportError('');
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
      'Relación ISO 22000': normalizeIsoForExport(readCanonicalIso(record)),
      'Estado de acciones': normalizeEstado(record)
    }));

    try {
      await downloadAnalysisResultsWorkbook({
        headers: baseHeaders,
        rows,
        fileName: activeExportConfig.fileName
      });

      resetLocalState();
      await onExportSuccess?.(analysisId);
    } catch (error) {
      console.error('Error exportando Excel:', error);
      setExportError('No se pudo exportar el Excel. Intentá nuevamente.');
    } finally {
      setIsExportingExcel(false);
    }
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

  if (safeRecords.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>No hay análisis aún</Typography>
        <Typography color="text.secondary">Cargá un archivo desde la sección “Cargar Archivo” para ver resultados.</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: { xs: 1.25, md: 1.75 }, boxShadow: '0 2px 12px rgba(15,23,42,0.05)', overflowX: 'auto' }}>
      <ResultsHeader
        filteredCount={filteredRecords.length}
        totalCount={safeRecords.length}
        onReprocessExcel={onReprocessExcel}
        onDeleteCurrent={onDeleteCurrent}
      />

      <CategoryTabs
        activeCategory={activeCategory}
        onCategoryChange={(_event, value) => { setActiveCategory(value); setPage(0); }}
        categories={categories}
        countsByCategory={countsByCategory}
      />

      <ResultsFilters
        searchTerm={searchTerm}
        onSearchChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
        filterArea={filterArea}
        onFilterAreaChange={(e) => { setFilterArea(e.target.value); setPage(0); }}
        availableAreas={availableAreas}
        filterClassification={filterClassification}
        onFilterClassificationChange={(e) => { setFilterClassification(e.target.value); setPage(0); }}
        categories={categories}
        filterStatus={filterStatus}
        onFilterStatusChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}
      />

      <AdvancedSection
        exportMode={exportMode}
        onExportModeChange={(e) => setExportMode(e.target.value)}
        handleExportExcel={handleExportExcel}
        recordsForExportLength={recordsForExport.length}
        activeExportLabel={exportMode === 'filtered' ? `${activeExportConfig.label} (vista actual)` : `${activeExportConfig.label} (todos)`}
        isExportingExcel={isExportingExcel}
        handleShareWhatsApp={handleShareWhatsApp}
        excelIcon={excelIcon}
        whatsappIcon={whatsappIcon}
      />

      {exportError && <Alert severity="error" sx={{ mb: 1.5 }}>{exportError}</Alert>}

      <Box ref={topScrollRef} sx={{ overflowX: 'auto', overflowY: 'hidden', mb: 0.75 }}><Box sx={{ width: scrollContentWidth, height: 1 }} /></Box>

      <ResultsTable
        tableContainerRef={tableContainerRef}
        displayedRecords={displayedRecords}
        page={page}
        expandedRows={expandedRows}
        onToggleRow={(rowKey) => setExpandedRows((prev) => ({ ...prev, [rowKey]: !prev[rowKey] }))}
        normalizeCellValue={normalizeCellValue}
        normalizeClassification={normalizeClassification}
        normalizeTipo={normalizeTipo}
        normalizeEstado={normalizeEstado}
        normalizeIsoForExport={normalizeIsoForExport}
        categoryColors={categoryColors}
        typeColors={typeColors}
      />

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

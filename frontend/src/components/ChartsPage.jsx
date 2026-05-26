import React, { useMemo } from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import { ChartsSections } from './charts/ChartsSections.jsx';

const palette = ['#1d4ed8', '#2563eb', '#0f766e', '#ea580c', '#7c3aed', '#0284c7', '#dc2626', '#334155', '#16a34a'];
const AREA_FALLBACK = 'Área no identificada';
const AREA_OTHERS_LABEL = 'Otros';
const PIE_COLORS = ['#1d4ed8', '#0f766e', '#ea580c', '#7c3aed', '#0284c7', '#dc2626'];
const TEXT_PRIMARY = '#0f172a';
const TEXT_SECONDARY = '#334155';
const TEXT_MUTED = '#475569';

function normalizeCategoryKey(value) {
  const raw = String(value || '').trim().toLowerCase();
  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!normalized) return 'Revisar manualmente';
  if (normalized.includes('legal')) return 'Legales';
  if (normalized.includes('logistica')) return 'Logística';
  if (normalized.includes('inocuidad')) return 'Inocuidad';
  if (normalized.includes('mantenimiento')) return 'Mantenimiento';
  if (normalized.includes('rrhh') || normalized.includes('recursos humanos') || normalized.includes('personal')) return 'Recursos Humanos';
  if (normalized.includes('calidad')) return 'Calidad';
  return 'Revisar manualmente';
}

function normalizeArea(value) {
  const raw = String(value || '').trim();
  if (!raw) return AREA_FALLBACK;
  return raw;
}

function normalizeCompare(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function pickFirstValue(record = {}, keys = []) {
  for (const key of keys) {
    const value = record?.[key];
    if (value != null && String(value).trim() !== '') return value;
  }
  return '';
}

function getOriginalColumns(record = {}) {
  const source = record?.columnasOriginales;
  if (!source || typeof source !== 'object' || Array.isArray(source)) return {};
  return source;
}

function findOriginalValueByAliases(record = {}, aliases = []) {
  const entries = Object.entries(getOriginalColumns(record));
  for (const alias of aliases) {
    const aliasNorm = normalizeCompare(alias);
    const match = entries.find(([key]) => normalizeCompare(key) === aliasNorm);
    if (match && String(match[1] || '').trim()) return match[1];
  }
  return '';
}

function normalizeIsoKey(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (!normalized || normalized === '-' || normalized.includes('revisar manualmente') || normalized.includes('revision manual')) return '';
  const codeMatch = normalized.match(/\b\d+(?:\.\d+){0,2}\b/);
  const code = codeMatch ? codeMatch[0] : '';
  if (!code) return shortLabel(raw, 40);

  const canonicalByCode = {
    '8.2': '8.2 PRP',
    '8.5': '8.5 HACCP',
    '8.5.1': '8.5.1 Control operacional',
    '8.5.2': '8.5.2 Trazabilidad',
    '7.1': '7.1 Recursos',
    '7.2': '7.2 Competencia',
    '7.5': '7.5 Información documentada',
    '9.2': '9.2 Auditoría interna',
    '10.2': '10.2 Acción correctiva'
  };

  return canonicalByCode[code] || code;
}

function shortLabel(value, max = 26) {
  const text = String(value || '').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function abbreviateAreaLabel(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return AREA_FALLBACK;
  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (/^area de pre elaborados$/i.test(normalized) || /^área de pre elaborados$/i.test(raw)) return 'Pre elaborados';
  if (/adium/i.test(raw)) return 'Adium';
  return shortLabel(raw, 20);
}

function abbreviateIsoLabel(value = '') {
  const raw = String(value || '').trim();
  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (!raw) return '';
  if (normalized.includes('8.5') && (normalized.includes('haccp') || normalized.includes('oprp') || normalized.includes('pcc'))) return '8.5 HACCP';
  if (normalized.includes('8.2') && normalized.includes('prp')) return '8.2 PRP';
  if (normalized.includes('7.5') && normalized.includes('informacion documentada')) return '7.5 Documentación';
  if (normalized.includes('7.2') && normalized.includes('competencia')) return '7.2 Competencia';
  if (normalized.includes('9.2') && normalized.includes('auditoria')) return '9.2 Auditoría';
  return shortLabel(raw, 30);
}

function wrapIsoLabelLines(value = '') {
  const short = abbreviateIsoLabel(value);
  if (short.length <= 22) return [short];
  const words = short.split(' ');
  const lines = [];
  let current = '';
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > 22) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines.slice(0, 2);
}

function normalizeAreaDisplayName(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return AREA_FALLBACK;
  const noParens = raw.replace(/\s*\(.+?\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  const normalized = noParens
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (normalized.includes('pre elaborados')) return 'Pre elaborados';
  if (normalized.includes('residuos')) return 'Residuos';
  if (normalized.includes('area caliente') || normalized.includes('agua caliente') || normalized === 'ac') return 'Área caliente';
  if (normalized.includes('area fria') || normalized.includes('camara') || normalized === 'af') return 'Área fría';
  if (normalized.includes('deposito')) return 'Depósito';
  if (normalized.includes('logistica')) return 'Logística';
  if (normalized.includes('lavadero') || normalized.includes('linea de lavado') || normalized.includes('linea lavado')) return 'Lavadero';
  if (normalized.includes('pasillo') || normalized.includes('area comun') || normalized.includes('areas comunes') || normalized.includes('comedor')) return 'Áreas comunes';

  const compact = noParens
    .replace(/^area de /i, '')
    .replace(/^área de /i, '')
    .trim();
  return compact || AREA_FALLBACK;
}

function parseAreaToken(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return { isUnknown: true };

  const noParens = raw.replace(/\s*\(.+?\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  const normalized = normalizeCompare(noParens);
  if (!normalized || normalized === '-' || normalized === 'n/a' || normalized === 'na') {
    return { isUnknown: true };
  }
  if (
    normalized === normalizeCompare(AREA_FALLBACK)
    || normalized.includes('no identificada')
    || normalized.includes('sin area')
    || normalized.includes('sin sector')
    || normalized.includes('desconocida')
  ) {
    return { isUnknown: true };
  }

  const cameraMatch = normalized.match(/\bcamara\s*(\d+)\b/);
  if (cameraMatch) {
    const num = Number(cameraMatch[1]);
    if (num >= 1 && num <= 99) {
      const label = `Cámara ${num}`;
      return { key: normalizeCompare(label), label, isUnknown: false };
    }
  }

  if (normalized === 'af' || normalized.includes('area fria')) {
    return { key: normalizeCompare('Área fría'), label: 'Área fría', isUnknown: false };
  }
  if (normalized === 'ac' || normalized.includes('area caliente') || normalized.includes('agua caliente')) {
    return { key: normalizeCompare('Área caliente'), label: 'Área caliente', isUnknown: false };
  }
  if (normalized.includes('deposito')) {
    return { key: normalizeCompare('Depósito'), label: 'Depósito', isUnknown: false };
  }
  if (normalized.includes('logistica')) {
    return { key: normalizeCompare('Logística'), label: 'Logística', isUnknown: false };
  }
  if (normalized.includes('lavadero') || normalized.includes('linea de lavado') || normalized.includes('linea lavado') || normalized.includes('bacha')) {
    return { key: normalizeCompare('Lavadero'), label: 'Lavadero', isUnknown: false };
  }
  if (normalized.includes('residuos') || normalized.includes('desechos') || normalized.includes('basura')) {
    return { key: normalizeCompare('Área de residuos'), label: 'Área de residuos', isUnknown: false };
  }
  if (normalized.includes('pre elaborados') || normalized.includes('preelaborados') || normalized.includes('pre elaborado')) {
    return { key: normalizeCompare('Área de pre elaborados'), label: 'Área de pre elaborados', isUnknown: false };
  }
  if (normalized.includes('areas comunes') || normalized.includes('area comun')) {
    return { key: normalizeCompare('Áreas comunes'), label: 'Áreas comunes', isUnknown: false };
  }

  const compact = noParens
    .replace(/^area de /i, '')
    .replace(/^área de /i, '')
    .trim();
  const label = normalizeAreaDisplayName(compact || noParens);
  return { key: normalizeCompare(label), label, isUnknown: false };
}

function normalizeScope(value = '') {
  const normalized = normalizeCompare(value);
  if (!normalized) return null;
  if (normalized.includes('externo')) return 'Externo';
  if (normalized.includes('interno')) return 'Interno';
  return null;
}

function buildTopWithOthers(items = [], maxItems = 8) {
  const sorted = [...items].sort((a, b) => Number(b.value || 0) - Number(a.value || 0));
  if (sorted.length <= maxItems) return sorted;
  const head = sorted.slice(0, maxItems);
  const tail = sorted.slice(maxItems);
  const others = tail.reduce((acc, item) => acc + Number(item.value || 0), 0);
  return others > 0 ? [...head, { name: 'Otros', value: others }] : head;
}

function IsoYAxisTick({ x, y, payload }) {
  const lines = wrapIsoLabelLines(payload?.value || '');
  return (
    <g transform={`translate(${x},${y})`}>
      {lines.map((line, idx) => (
        <text
          key={`${payload?.value}-${idx}`}
          x={0}
          y={idx * 16}
          dy={5}
          textAnchor="end"
          fill={TEXT_PRIMARY}
          fontSize={13}
          fontWeight={700}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

function tooltipStyle() {
  return {
    contentStyle: {
      backgroundColor: '#ffffff',
      border: '1px solid #cbd5e1',
      borderRadius: 10,
      color: TEXT_PRIMARY,
      fontWeight: 700,
      fontSize: 13
    },
    labelStyle: { color: TEXT_PRIMARY, fontWeight: 800, fontSize: 13 },
    itemStyle: { color: TEXT_SECONDARY, fontWeight: 700, fontSize: 13 }
  };
}

function objectToChartData(mapObject = {}) {
  return Object.entries(mapObject)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function splitAreas(areaClasificada) {
  return String(areaClasificada || '')
    .split(/[\/,]/)
    .map((area) => area.trim())
    .filter(Boolean);
}

function normalizeEstadoAccion(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw || raw === '-') return null;
  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');

  if (!normalized || normalized === '-') return null;
  if (normalized === 'abierta' || normalized === 'abierto') return 'abierto';
  if (normalized === 'cerrada' || normalized === 'cerrado') return 'cerrado';
  return null;
}

function normalizeEstadoAccionFromRecord(record = {}) {
  const value = pickFirstValue(record, ['estadoAcciones', 'estadoAccion', 'estado', 'actionStatus', 'status']);
  return normalizeEstadoAccion(value);
}

function normalizeNormaIsoLabel(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return 'Sin norma';
  const normalized = normalizeCompare(raw);
  if (!normalized || normalized === '-' || normalized === 'n/a' || normalized === 'na' || normalized === 'sin norma') {
    return 'Sin norma';
  }
  return raw;
}

export function buildISOChartData(records = []) {
  const chartMap = {};
  records.forEach((record) => {
    const normaValue = pickFirstValue(record, [
      'Norma',
      'Norma ISO',
      'ISO',
      'Norma relacionada',
      'Referencia normativa',
      'norma',
      'normaISO',
      'iso',
      'relacionIso22000',
      'relacionISO',
      'isoRelation',
      'iso22000'
    ]) || findOriginalValueByAliases(record, [
      'Norma',
      'Norma ISO',
      'ISO',
      'Norma relacionada',
      'Referencia normativa',
      'norma',
      'normaISO',
      'iso'
    ]);

    const norma = normalizeNormaIsoLabel(normaValue);
    chartMap[norma] = (chartMap[norma] || 0) + 1;
  });

  return objectToChartData(chartMap);
}

export default function ChartsPage({ records = [], summary = null, analysisTotalRecords = 0 }) {
  const hasAnalysisData = useMemo(() => {
    const totalRegistros = Number(summary?.totalRegistros ?? summary?.totalRecords ?? 0);
    const totalAnalisis = Number(analysisTotalRecords || 0);
    const totalDesvios = Number(summary?.totalDesvios ?? 0);
    const categorias = (
      Number(summary?.totalInocuidad ?? 0) +
      Number(summary?.totalLogistica ?? 0) +
      Number(summary?.totalCalidad ?? 0) +
      Number(summary?.totalLegal ?? 0) +
      Number(summary?.totalMantenimiento ?? 0) +
      Number(summary?.totalRRHH ?? 0)
    );
    return (
      (Array.isArray(records) && records.length > 0) ||
      totalAnalisis > 0 ||
      totalRegistros > 0 ||
      totalDesvios > 0 ||
      categorias > 0
    );
  }, [records, summary, analysisTotalRecords]);

  const data = useMemo(() => {
    const safeSummary = summary || {};
    const fallbackByArea = {};
    const fallbackByCategoria = {};
    const fallbackByIso = {};
    const fallbackActions = { abierto: 0, cerrado: 0 };
    const fallbackByScope = { Interno: 0, Externo: 0 };
    let unknownAreas = 0;
    records.forEach((record) => {
      const categoria = String(
        pickFirstValue(record, ['clasificacionDesvio', 'classification_normalized', 'categoriaDesvio', 'classification_original'])
      ).trim();
      const iso = normalizeIsoKey(
        pickFirstValue(record, ['relacionIso22000', 'relacionISO', 'isoRelation', 'iso22000', 'iso'])
      );
      const estadoAccion = normalizeEstadoAccionFromRecord(record);
      if (categoria) {
        const canonical = normalizeCategoryKey(categoria);
        fallbackByCategoria[canonical] = (fallbackByCategoria[canonical] || 0) + 1;
      }

      const areaRaw = pickFirstValue(record, ['areaSector', 'area_sector', 'area_normalized', 'areaClasificada', 'area', 'sector']);
      const areaRawFromOriginal = findOriginalValueByAliases(record, [
        'Área/Sector',
        'Area/Sector',
        'Área',
        'Area',
        'Sector',
        'Area proceso',
        'Área proceso'
      ]);
      const areaSource = areaRaw || areaRawFromOriginal;
      const areaList = splitAreas(areaSource);
      if (areaList.length === 0) {
        unknownAreas += 1;
      } else {
        areaList.map(normalizeArea).forEach((areaItem) => {
          const parsed = parseAreaToken(areaItem);
          if (parsed.isUnknown) {
            unknownAreas += 1;
            return;
          }
          fallbackByArea[parsed.key] = fallbackByArea[parsed.key] || { name: parsed.label, value: 0 };
          fallbackByArea[parsed.key].value += 1;
        });
      }

      if (iso) {
        fallbackByIso[iso] = (fallbackByIso[iso] || 0) + 1;
      }

      if (estadoAccion === 'cerrado') fallbackActions.cerrado += 1;
      if (estadoAccion === 'abierto') fallbackActions.abierto += 1;

      const scopeRaw = pickFirstValue(record, [
        'scope_normalized',
        'scope_original',
        'alcanceDesvio',
        'tipoDesvioOrigen',
        'origen'
      ]) || findOriginalValueByAliases(record, ['Desvío interno/externo', 'Desvio interno/externo', 'Origen', 'origen']);
      const scope = normalizeScope(scopeRaw);
      if (scope) fallbackByScope[scope] += 1;
    });

    const hasRecords = Array.isArray(records) && records.length > 0;
    const summaryByArea = safeSummary.byArea && Object.keys(safeSummary.byArea).length > 0 ? safeSummary.byArea : null;
    const summaryByCategoria = safeSummary.byCategoria && Object.keys(safeSummary.byCategoria).length > 0 ? safeSummary.byCategoria : null;
    const summaryByIso = safeSummary.byIso22000 && Object.keys(safeSummary.byIso22000).length > 0 ? safeSummary.byIso22000 : null;

    const summaryAreaParsed = Object.entries(summaryByArea || {}).reduce((acc, [name, value]) => {
      const parsed = parseAreaToken(name);
      const qty = Number(value || 0);
      if (!qty) return acc;
      if (parsed.isUnknown) {
        unknownAreas += qty;
        return acc;
      }
      acc[parsed.key] = acc[parsed.key] || { name: parsed.label, value: 0 };
      acc[parsed.key].value += qty;
      return acc;
    }, {});
    const areaMapSource = hasRecords ? fallbackByArea : (Object.keys(summaryAreaParsed).length ? summaryAreaParsed : fallbackByArea);
    const areaMerged = Object.values(areaMapSource).sort((a, b) => Number(b.value || 0) - Number(a.value || 0));
    const desviosPorArea = unknownAreas > 0
      ? [...areaMerged, { name: AREA_OTHERS_LABEL, value: unknownAreas }]
      : areaMerged;
    const categoriaRaw = hasRecords ? fallbackByCategoria : (summaryByCategoria || fallbackByCategoria);
    const categoriasCompletas = {
      Legales: Number(categoriaRaw.Legales ?? categoriaRaw['Desvío Legal'] ?? safeSummary.totalLegal ?? 0),
      'Logística': Number(categoriaRaw['Logística'] ?? categoriaRaw['Desvío de Logística'] ?? safeSummary.totalLogistica ?? 0),
      Calidad: Number(categoriaRaw.Calidad ?? categoriaRaw['Desvío de Calidad'] ?? safeSummary.totalCalidad ?? 0),
      Mantenimiento: Number(categoriaRaw.Mantenimiento ?? categoriaRaw['Desvío de Mantenimiento'] ?? 0),
      Inocuidad: Number(categoriaRaw.Inocuidad ?? categoriaRaw['Desvío de Inocuidad'] ?? safeSummary.totalInocuidad ?? 0),
      'Recursos Humanos': Number(categoriaRaw['Recursos Humanos'] ?? categoriaRaw['Desvío de Recursos Humanos'] ?? 0)
    };
    const desviosPorCategoria = objectToChartData(categoriasCompletas).filter((item) => item.value > 0);
    const desviosPorCategoriaCompleta = objectToChartData(categoriasCompletas).filter((item) => item.value > 0);
    const isoRaw = hasRecords ? fallbackByIso : (summaryByIso || fallbackByIso);
    const isoGrouped = Object.entries(isoRaw).reduce((acc, [key, value]) => {
      const canonicalIso = normalizeIsoKey(key);
      if (!canonicalIso) return acc;
      acc[canonicalIso] = (acc[canonicalIso] || 0) + Number(value || 0);
      return acc;
    }, {});
    const desviosPorIso = buildTopWithOthers(objectToChartData(isoGrouped), 10);
    const distribucionPorNormaIso = hasRecords ? buildISOChartData(records) : objectToChartData(isoGrouped);

    const resumenHallazgos = [
      { name: 'Desvíos reales', value: Number(safeSummary.totalDesvios || 0) },
      { name: 'Inocuidad', value: Number(safeSummary.totalInocuidad || 0) },
      { name: 'Logística', value: Number(safeSummary.totalLogistica || 0) },
      { name: 'Calidad', value: Number(safeSummary.totalCalidad || 0) },
      { name: 'Legal', value: Number(safeSummary.totalLegal || 0) },
      { name: 'Rev. manual', value: Number(safeSummary.totalRevisionManual || 0) }
    ];

    const summaryHasActions = !hasRecords && safeSummary.actions && (
      Number(safeSummary.actions.abiertas ?? 0) > 0 || Number(safeSummary.actions.cerradas ?? 0) > 0
    );
    const estadoAcciones = [
      { name: 'Abierto', value: Number(summaryHasActions ? (safeSummary.actions?.abiertas ?? 0) : fallbackActions.abierto) },
      { name: 'Cerrado', value: Number(summaryHasActions ? (safeSummary.actions?.cerradas ?? 0) : fallbackActions.cerrado) }
    ];
    const estadoAccionesActivos = estadoAcciones.filter((item) => Number(item.value || 0) > 0);
    const estadoSingle = estadoAccionesActivos.length === 1 ? estadoAccionesActivos[0] : null;
    const summaryScopeSource = safeSummary.byAlcance && Object.keys(safeSummary.byAlcance).length > 0
      ? safeSummary.byAlcance
      : {
          Interno: Number(safeSummary.totalInternos || 0),
          Externo: Number(safeSummary.totalExternos || 0)
        };
    const scopeMap = hasRecords ? fallbackByScope : {
      Interno: Number(summaryScopeSource.Interno ?? summaryScopeSource.interno ?? 0),
      Externo: Number(summaryScopeSource.Externo ?? summaryScopeSource.externo ?? 0)
    };
    const desviosInternoExterno = objectToChartData(scopeMap).filter((item) => Number(item.value || 0) > 0);

    return {
      resumenHallazgos,
      desviosPorArea,
      desviosInternoExterno,
      desviosPorCategoria,
      desviosPorCategoriaCompleta,
      desviosPorIso,
      distribucionPorNormaIso,
      estadoAcciones,
      estadoSingle,
      totalRecords: Number(safeSummary.totalRecords || records.length || 0)
    };
  }, [records, summary]);

  if (!hasAnalysisData) {
    return (
      <Card>
        <CardContent sx={{ p: 3.5, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5, color: TEXT_PRIMARY }}>
            No hay datos suficientes para mostrar gráficos
          </Typography>
          <Typography sx={{ color: TEXT_SECONDARY, fontWeight: 500 }}>
            Cargá un análisis para visualizar desvíos, resultados e ISO 22000.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <ChartsSections
      data={data}
      textPrimary={TEXT_PRIMARY}
      textMuted={TEXT_MUTED}
      textSecondary={TEXT_SECONDARY}
      palette={palette}
      pieColors={PIE_COLORS}
      tooltipStyle={tooltipStyle}
      abbreviateAreaLabel={abbreviateAreaLabel}
      IsoYAxisTick={IsoYAxisTick}
    />
  );
}

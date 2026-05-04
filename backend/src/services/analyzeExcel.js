import ExcelJS from 'exceljs';
import { classifyDeviationCasesFromRecords } from './caseClassifier.js';

const ENABLE_CLASSIFICATION_TRACE = process.env.CLASSIFICATION_TRACE === '1';
const ENABLE_FILLDOWN_TRACE = process.env.EXCEL_FILLDOWN_TRACE === '1';

const OPERATIVE_AREAS = [
  'Área fría',
  'Área caliente',
  'Depósito',
  'Cámara 1',
  'Cámara 2',
  'Cámara 3',
  'Cámara 4',
  'Cámara 5',
  'Cámara 6',
  'Cámara 7',
  'Baños',
  'Áreas comunes',
  'Comedor',
  'Logística',
  'Área de residuos',
  'Área de pre elaborados',
  'Lavadero',
  'Área no identificada'
];

const NC_KEYWORDS = [
  'incumplimiento',
  'no cumple',
  'no conformidad',
  'producto en mal estado',
  'mal estado',
  'faltante de mercaderia',
  'faltante',
  'sin rotular',
  'falta de limpieza',
  'sucio',
  'temperatura fuera de control',
  'fuera de control',
  'temperatura fuera de rango',
  'registro incompleto',
  'devolucion de cliente',
  'devolucion cliente',
  'incumplimiento de procedimiento',
  'falla que afecta inocuidad',
  'falla que afecta calidad',
  'plaga',
  'contaminacion',
  'vencido',
  'quebrado',
  'riesgo inocuidad'
];

const OBS_KEYWORDS = [
  'observar',
  'observacion',
  'a corregir',
  'corregir',
  'pendiente',
  'ajustar',
  'revisar',
  'mejorable',
  'desvio menor'
];

const OM_KEYWORDS = [
  'oportunidad de mejora',
  'mejora',
  'optimizar',
  'optimizacion',
  'implementacion',
  'implementar',
  'capacitacion preventiva',
  'capacitacion',
  'actualizacion documental',
  'actualizar procedimiento',
  'propuesta',
  'prevenir',
  'fortalecer'
];

const CONFORME_KEYWORDS = [
  'conforme',
  'sin desvio',
  'sin desviaciones',
  'ok',
  'correcto',
  'realizado correctamente',
  'cumple',
  'cumplido'
];

const ISO_RULES = [
  {
    requirement: '8.5 Control de peligros / HACCP / OPRP / PCC',
    keywords: ['haccp', 'oprp', 'pcc', 'peligro', 'limite critico', 'punto critico', 'inocuidad', 'temperatura']
  },
  {
    requirement: '8.9 Control de no conformidades de producto/proceso',
    keywords: ['no conformidad', 'desvio', 'producto en mal estado', 'rechazo', 'segregacion', 'bloqueo de lote']
  },
  {
    requirement: '9.1 Seguimiento, medicion, analisis y evaluacion',
    keywords: ['seguimiento', 'medicion', 'indicador', 'analisis', 'evaluacion', 'control']
  },
  {
    requirement: '9.2 Auditoria interna',
    keywords: ['auditoria interna', 'auditoria', 'hallazgo de auditoria']
  },
  {
    requirement: '10.2 No conformidad y accion correctiva',
    keywords: ['accion correctiva', 'ac', 'correccion', 'causa raiz', 'plan de accion', 'cerrar accion']
  },
  {
    requirement: '7.2 Competencia / capacitacion',
    keywords: ['capacitacion', 'entrenamiento', 'competencia', 'induccion']
  },
  {
    requirement: '7.5 Informacion documentada',
    keywords: ['registro', 'documentacion', 'procedimiento', 'instructivo', 'formulario', 'completar registro']
  },
  {
    requirement: '8.2 Programas prerrequisito / POES / BPM',
    keywords: ['poes', 'bpm', 'limpieza', 'higiene', 'desinfeccion', 'prerrequisito']
  },
  {
    requirement: '8.4 Control de proveedores externos',
    keywords: ['proveedor', 'externo', 'homologacion', 'evaluacion de proveedor', 'materia prima']
  }
];

function normalizeCellValue(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
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

function normalizeForMatch(value) {
  return normalizeCellValue(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsAny(text, keywords = []) {
  return keywords.some((keyword) => text.includes(normalizeForMatch(keyword)));
}

function parseBooleanLike(value) {
  const text = normalizeForMatch(value);
  if (!text) return null;

  const truthy = ['si', 'sí', 's', 'yes', 'y', 'true', '1', 'x'];
  const falsy = ['no', 'n', 'false', '0'];

  if (truthy.includes(text)) return true;
  if (falsy.includes(text)) return false;
  return null;
}

function isYesLike(value) {
  return parseBooleanLike(value) === true;
}

function isNoLike(value) {
  return parseBooleanLike(value) === false;
}

function isConformeLike(value) {
  const text = normalizeForMatch(value);
  return text === 'conforme';
}

function isNoConformeLike(value) {
  const text = normalizeForMatch(value);
  return text === 'no conforme' || text.includes('no conforme');
}

function normalizeHeaderKey(value, index) {
  const raw = normalizeCellValue(value).trim();
  if (!raw) return `__EMPTY_${index}`;
  return raw.replace(/\s+/g, ' ').trim();
}

function buildRowObjectFromExcel(headerValues, rowValues) {
  const row = {};
  const maxLength = Math.max(headerValues.length, rowValues.length);

  for (let i = 1; i < maxLength; i += 1) {
    const keyBase = normalizeHeaderKey(headerValues[i], i);
    let key = keyBase;
    let suffix = 1;
    while (Object.prototype.hasOwnProperty.call(row, key)) {
      key = `${keyBase}_${suffix}`;
      suffix += 1;
    }
    row[key] = normalizeCellValue(rowValues[i]);
  }

  return row;
}

function buildNormalizedRowKeyMap(row) {
  const keyMap = new Map();
  Object.keys(row || {}).forEach((key) => {
    const norm = normalizeForMatch(key);
    if (!keyMap.has(norm)) keyMap.set(norm, key);
  });
  return keyMap;
}

function getRowValueByCandidates(row, keyMap, candidates = []) {
  for (const candidate of candidates) {
    const norm = normalizeForMatch(candidate);
    const directKey = keyMap.get(norm);
    if (directKey) return normalizeCellValue(row[directKey]);
  }

  // Soporta casos con títulos extendidos, por ejemplo "Actividad realizada (detalle)"
  for (const candidate of candidates) {
    const norm = normalizeForMatch(candidate);
    const partialKey = [...keyMap.keys()].find((existing) => existing.startsWith(norm));
    if (partialKey) {
      const originalKey = keyMap.get(partialKey);
      return normalizeCellValue(row[originalKey]);
    }
  }

  return '';
}

function esTextoAccion(texto) {
  const t = normalizeForMatch(texto || '');
  return (
    t.startsWith('se controla') ||
    t.startsWith('se solicita') ||
    t.startsWith('se coordina') ||
    t.startsWith('se realizara') ||
    t.startsWith('se realizará') ||
    t.startsWith('se planifica') ||
    t.startsWith('se entrega') ||
    t.startsWith('se pasa a gerencia') ||
    t.startsWith('se evalu') ||
    t.startsWith('se incorpora') ||
    t.startsWith('se realiza seguimiento') ||
    t.includes('plan de accion') ||
    t.includes('cumplimiento')
  );
}

function normalizeDetectedAction(text) {
  const raw = normalizeCellValue(text || '').trim();
  if (!raw) return '';
  const norm = normalizeForMatch(raw);

  const cleanTail = (value) => value
    .replace(/^[\s,:;-]+/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (norm.startsWith('se solicita')) {
    const tail = cleanTail(raw.replace(/^\s*se solicita(\s+a\s+\w+)?\s*/i, ''));
    return tail ? `Solicitar ${tail}` : 'Solicitar acción';
  }
  if (norm.startsWith('se coordina')) {
    const tail = cleanTail(raw.replace(/^\s*se coordina\s*/i, ''));
    return tail ? `Coordinar ${tail}` : 'Coordinar acción';
  }
  if (norm.startsWith('se realizara') || norm.startsWith('se realizará')) {
    const tail = cleanTail(raw.replace(/^\s*se realizar[áa]\s*/i, ''));
    return tail ? `Realizar ${tail}` : 'Realizar acción';
  }
  if (norm.startsWith('se planifica')) {
    const tail = cleanTail(raw.replace(/^\s*se planifica\s*/i, ''));
    return tail ? `Planificar ${tail}` : 'Planificar acción';
  }
  if (norm.startsWith('se entrega')) {
    const tail = cleanTail(raw.replace(/^\s*se entrega\s*/i, ''));
    return tail ? `Entregar ${tail}` : 'Entregar acción';
  }
  if (norm.startsWith('se pasa a gerencia')) {
    const tail = cleanTail(raw.replace(/^\s*se pasa a gerencia\s*/i, ''));
    return tail ? `Elevar a gerencia ${tail}` : 'Elevar a gerencia';
  }
  return raw;
}

function splitHallazgos(textoBase) {
  const source = normalizeCellValue(textoBase).trim();
  if (!source) return [];

  const normalizedSource = source
    .replace(/\bfalta\s*;/gi, 'falta. ')
    .replace(/\r?\n/g, '. ')
    .replace(/;/g, '. ')
    .replace(/\.\s+/g, '.|')
    .replace(/\.\s*$/g, '');

  const parts = normalizedSource
    .split('|')
    .map((part) => part.trim())
    .filter((part) => part.length > 6);

  if (parts.length <= 1) return source ? [source] : [];

  const unique = [];
  for (const part of parts) {
    if (!unique.some((existing) => normalizeForMatch(existing) === normalizeForMatch(part))) {
      unique.push(part);
    }
  }
  return unique;
}

function isGestionSgiaText(texto) {
  const normalized = normalizeForMatch(texto);
  return normalized === 'gestion sgia' || normalized.includes('gestion sgia');
}

function isTextoNoValidoHallazgo(texto) {
  const t = normalizeForMatch(texto || '');
  return !t || t === 'n a' || t === 'na' || t === 'n d' || t === '-';
}

function isInvalidDetectedFinding(texto) {
  const t = normalizeForMatch(texto || '');
  return !t || t === '-';
}

function contieneArea(texto) {
  const t = normalizeForMatch(texto || '');
  if (!t) return false;

  return (
    t.includes('camara') ||
    t.includes('heladera') ||
    /\baf\b/.test(t) ||
    /\bac\b/.test(t) ||
    t.includes('deposito') ||
    t.includes('pasillo') ||
    t.includes('comedor') ||
    t.includes('residuos') ||
    t.includes('basura')
  );
}

function sanitizeHallazgo(hallazgo) {
  const value = normalizeCellValue(hallazgo || '').trim();
  if (!value || isTextoNoValidoHallazgo(value)) return 'Sin hallazgo detectado';
  if (isGestionSgiaText(value)) return 'Sin hallazgo detectado';
  const cleaned = value
    .replace(/\bcumplido\b/gi, '')
    .replace(/\bpendiente\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'Sin hallazgo detectado';
}

function hasOperationalDeviationSignal(text) {
  const normalized = normalizeIncidentText(text || '');
  if (!normalized || normalized.length <= 20) return false;
  const signals = [
    'falta',
    'faltaron',
    'faltante',
    'mal estado',
    'devuelve',
    'fallando',
    'no hay',
    'sucio',
    'demora',
    'demorada',
    'no funciona',
    'sin',
    'problema'
  ];
  return containsAny(normalized, signals);
}

function shouldUseAreaProcesoAsHallazgo({ actividadRealizada, areaProceso, hallazgoDetectado }) {
  const actividad = normalizeCellValue(actividadRealizada || '').trim();
  const area = normalizeCellValue(areaProceso || '').trim();
  const hallazgo = normalizeForMatch(hallazgoDetectado || '');
  const hallazgoVacio = !hallazgo || hallazgo === normalizeForMatch('Sin hallazgo detectado');
  return !actividad && hallazgoVacio && hasOperationalDeviationSignal(area);
}

function isRepeatedHeaderRow(rawRecord = {}) {
  const fecha = normalizeIncidentText(rawRecord.fecha || '');
  const hallazgo = normalizeIncidentText(rawRecord.hallazgoDetectado || '');
  const descripcion = normalizeIncidentText(rawRecord.descripcion || '');
  const actividad = normalizeIncidentText(rawRecord.actividadRealizada || '');
  const area = normalizeIncidentText(rawRecord.areaProceso || '');
  if (fecha === 'fecha') return true;
  if (hallazgo === 'descripcion del desvio' || hallazgo === 'descripción del desvío') return true;
  if (descripcion === 'descripcion del desvio' || descripcion === 'descripción del desvío') return true;
  if (actividad === 'actividad realizada' || area === 'area / proceso' || area === 'area / sector') return true;
  return false;
}

function applyOperationalOverrides({ hallazgoDetectado, areaClasificada, resultadoClasificado, tipoDesvio, iso22000 }) {
  const hallazgoText = normalizeIncidentText(hallazgoDetectado || '');
  let areaFinal = areaClasificada;
  let resultadoFinal = resultadoClasificado;
  let tipoFinal = tipoDesvio;
  let isoFinal = iso22000;

  if (containsAny(hallazgoText, [
    'faltaron almuerzos',
    'faltante de mercaderia',
    'demora de entrega',
    'cliente',
    'servicio',
    'scop',
    'easy',
    'hospital',
    'pocito',
    'la laja'
  ])) {
    areaFinal = 'Logística / Distribución';
  }

  if (containsAny(hallazgoText, ['mal estado', 'devuelve', 'ensaladas'])) {
    resultadoFinal = 'No conforme';
    tipoFinal = 'NC';
  }

  if (containsAny(hallazgoText, ['cucarachas', 'plagas', 'cebos'])) {
    resultadoFinal = 'No conforme';
    tipoFinal = 'NC';
    isoFinal = '8.2 Programas prerrequisito / POES / BPM';
  }

  if (containsAny(hallazgoText, ['fallando', 'no funciona', 'no hay agua caliente'])) {
    resultadoFinal = 'No conforme';
    tipoFinal = 'NC';
    if (containsAny(hallazgoText, ['fallando', 'no funciona'])) isoFinal = '7.1 Recursos';
    if (containsAny(hallazgoText, ['no hay agua caliente'])) isoFinal = '8.2 Programas prerrequisito / POES / BPM';
  }

  if (containsAny(hallazgoText, ['sucio', 'sin limpiar', 'restos de carne'])) {
    resultadoFinal = 'No conforme';
    tipoFinal = 'NC';
    isoFinal = '8.2 Programas prerrequisito / POES / BPM';
  }

  if (containsAny(hallazgoText, ['tomate en mal estado', 'ensaladas en mal estado'])) {
    isoFinal = '8.5 Control de peligros / HACCP / OPRP / PCC';
  }

  if (containsAny(hallazgoText, ['falta de personal', 'falto personal', 'faltó personal', 'sin personal'])) {
    resultadoFinal = 'No conforme';
    tipoFinal = 'NC';
    isoFinal = '7.1 Recursos';
  }
  if (containsAny(hallazgoText, ['ausencia de personal'])) {
    resultadoFinal = 'No conforme';
    tipoFinal = 'NC';
    isoFinal = '7.1 Recursos';
  }

  if (containsAny(hallazgoText, ['faltante', 'faltaron', 'demora de entrega'])) {
    isoFinal = 'Revisar manualmente';
  }

  if (hasOperationalDeviationSignal(hallazgoText) && resultadoFinal !== 'No conforme') {
    resultadoFinal = 'No conforme';
    tipoFinal = 'NC';
  }

  return {
    areaClasificada: areaFinal,
    resultadoClasificado: resultadoFinal,
    tipoDesvio: tipoFinal,
    iso22000: isoFinal
  };
}

function removeDuplicateActionChunks(text) {
  const parts = String(text || '')
    .split(/[|.;\n]/)
    .map((part) => normalizeDetectedAction(part).trim())
    .filter(Boolean);
  const unique = [];
  const seen = new Set();
  parts.forEach((part) => {
    const norm = normalizeIncidentText(part);
    if (!norm || seen.has(norm)) return;
    seen.add(norm);
    unique.push(part);
  });
  return unique.join('. ');
}

function getHallazgo(row, context = {}) {
  const nota = normalizeCellValue(context.notaTecnica || row?.['Nota técnica'] || '').trim();
  const actividad = normalizeCellValue(context.actividadRealizada || row?.['Actividad realizada'] || '').trim();
  const resultado = normalizeCellValue(context.resultado || row?.Resultado || '').trim();
  const desvio = normalizeCellValue(context.desvio || row?.['¿Desvío?'] || row?.['¿Desvio?'] || '').trim();
  const notaValida = nota && !isTextoNoValidoHallazgo(nota);
  const actividadValida = actividad && !isTextoNoValidoHallazgo(actividad);
  const notaTieneArea = contieneArea(nota);
  const actividadTieneArea = contieneArea(actividad);
  const esNcODetectado = isNoConformeLike(resultado) || isYesLike(desvio);
  const notaEsEstado = /\b(cumplido|pendiente)\b/i.test(nota);
  const actividadValidaNoAccion = actividadValida && !esTextoAccion(actividad) && !isGestionSgiaText(actividad);

  if (notaEsEstado && actividadValidaNoAccion) return actividad;

  // PRIORIDAD 1: texto que contiene área real
  if (actividadValida && actividadTieneArea && !isGestionSgiaText(actividad)) return actividad;
  if (notaValida && notaTieneArea && !isGestionSgiaText(nota)) return nota;

  // Si el registro ya es NC/desvío, conservar actividad útil aunque suene a acción.
  if (esNcODetectado && actividadValida && !isGestionSgiaText(actividad)) return actividad;

  // PRIORIDAD 2: texto no genérico
  if (actividadValida && !esTextoAccion(actividad) && !isGestionSgiaText(actividad)) return actividad;
  if (notaValida && !esTextoAccion(nota) && !isGestionSgiaText(nota)) return nota;

  // FALLBACK
  return 'Sin hallazgo detectado';
}

function getTextoHallazgo(_row, context = {}) {
  const hallazgoDirecto = normalizeCellValue(context.hallazgoDirecto || '').trim();
  if (hallazgoDirecto && !isTextoNoValidoHallazgo(hallazgoDirecto) && !isGestionSgiaText(hallazgoDirecto)) {
    return sanitizeHallazgo(hallazgoDirecto);
  }

  const hallazgo = sanitizeHallazgo(getHallazgo(_row, context));
  if (!hallazgo || isGestionSgiaText(hallazgo)) return 'Sin hallazgo detectado';
  const hallazgos = splitHallazgos(hallazgo);
  const joined = sanitizeHallazgo(hallazgos.join(' | ').trim());
  if (!joined || isGestionSgiaText(joined)) return 'Sin hallazgo detectado';
  return joined;
}

function getTextoAccion(row) {
  const candidatos = Object.entries(row)
    .filter(([, value]) => typeof value === 'string')
    .map(([key, value]) => ({
      key,
      keyNorm: normalizeForMatch(key),
      value: value.trim(),
      valueNorm: normalizeForMatch(value)
    }))
    .filter((item) => item.value.length > 3);

  const headerAccionRegex = /(accion|acción|correctiva|inmediata|plan de accion|seguimiento)/i;
  const porHeader = candidatos.filter((item) => headerAccionRegex.test(item.keyNorm));
  if (porHeader.length > 0) {
    porHeader.sort((a, b) => b.value.length - a.value.length);
    return normalizeDetectedAction(porHeader[0].value);
  }

  const porTexto = candidatos.filter((item) => esTextoAccion(item.valueNorm));
  if (porTexto.length > 0) {
    porTexto.sort((a, b) => b.value.length - a.value.length);
    return normalizeDetectedAction(porTexto[0].value);
  }

  return '';
}

function scoreWorksheetForDescriptions(sheet) {
  let longTextCells = 0;
  let totalTextLength = 0;
  let checked = 0;

  const maxRowsToScan = Math.min(sheet.rowCount || 0, 120);
  for (let r = 1; r <= maxRowsToScan; r += 1) {
    const rowValues = sheet.getRow(r).values || [];
    for (let c = 1; c < rowValues.length; c += 1) {
      const text = normalizeCellValue(rowValues[c]).trim();
      if (!text) continue;
      if (text.length > 20) {
        longTextCells += 1;
        totalTextLength += text.length;
      }
      checked += 1;
    }
  }

  return {
    longTextCells,
    totalTextLength,
    checked
  };
}

function detectHeaderRowIndex(sheet) {
  const maxRows = Math.min(sheet.rowCount || 0, 20);
  let bestRow = 1;
  let bestScore = -1;

  const headerSignalRegex = /(fecha|area|proceso|actividad|descripcion|desvio|desvío|observacion|observación|hallazgo|detalle|comentario|nota|accion|acción|resultado|tipo)/i;

  for (let r = 1; r <= maxRows; r += 1) {
    const rowValues = sheet.getRow(r).values || [];
    const cells = rowValues
      .slice(1)
      .map((value) => normalizeCellValue(value).trim())
      .filter(Boolean);

    if (cells.length === 0) continue;

    let score = 0;
    score += cells.length;
    score += cells.filter((cell) => headerSignalRegex.test(normalizeForMatch(cell))).length * 8;
    score += cells.filter((cell) => cell.length <= 40).length;

    if (score > bestScore) {
      bestScore = score;
      bestRow = r;
    }
  }

  return bestRow;
}

function selectBestWorksheet(workbook) {
  const sheets = workbook.worksheets || [];
  if (sheets.length === 0) return null;
  if (sheets.length === 1) return sheets[0];

  const headerSignalRegex = /(descripcion|desvio|desvío|observacion|observación|hallazgo|detalle|comentario|nota|accion|acción|resultado|tipo)/i;

  const ranked = sheets
    .map((sheet) => {
      const score = scoreWorksheetForDescriptions(sheet);
      const headerRowIndex = detectHeaderRowIndex(sheet);
      const headerValues = sheet.getRow(headerRowIndex).values || [];
      const headerMatchCount = headerValues
        .slice(1)
        .map((h) => normalizeCellValue(h))
        .filter((h) => headerSignalRegex.test(normalizeForMatch(h)))
        .length;

      return { sheet, score, headerRowIndex, headerMatchCount };
    })
    .sort((a, b) => {
      if (b.headerMatchCount !== a.headerMatchCount) {
        return b.headerMatchCount - a.headerMatchCount;
      }
      if (b.score.longTextCells !== a.score.longTextCells) {
        return b.score.longTextCells - a.score.longTextCells;
      }
      return b.score.totalTextLength - a.score.totalTextLength;
    });

  const chosen = ranked[0]?.sheet || sheets[0];
  return chosen;
}

function extractCamaras(texto) {
  const input = normalizeForMatch(texto || '');
  const regex = /camara\s*(n°|nº|numero)?\s*([0-9, y]+)/gi;
  const all = [];
  let match = regex.exec(input);

  while (match) {
    const numeros = (match[2] || '').match(/\d+/g) || [];
    all.push(...numeros);
    match = regex.exec(input);
  }

  const unique = [...new Set(all.filter((n) => /^\d+$/.test(n)))];
  return unique.map((n) => Number(n))
    .filter((n) => n >= 1 && n <= 7)
    .map((n) => `Cámara ${n}`);
}

const OPERATIONAL_AREAS = [
  'Área fría',
  'Área caliente',
  'Depósito',
  'Cámara 1',
  'Cámara 2',
  'Cámara 3',
  'Cámara 4',
  'Cámara 5',
  'Cámara 6',
  'Cámara 7',
  'Baños',
  'Áreas comunes',
  'Comedor',
  'Logística',
  'Área de residuos',
  'Área de pre elaborados',
  'Lavadero',
  'Área no identificada'
];

const OPERATIONAL_AREA_PRIORITY = OPERATIONAL_AREAS.filter((area) => area !== 'Área no identificada');
const OPERATIONAL_AREA_SET = new Set(OPERATIONAL_AREAS);

function toOperationalArea(area) {
  const raw = normalizeCellValue(area || '').trim();
  if (!raw) return null;
  const normalized = normalizeForMatch(raw);
  if (!normalized) return null;

  const cameraMatch = normalized.match(/camara\s*([0-9]+)/);
  if (cameraMatch) {
    const number = Number(cameraMatch[1]);
    if (number >= 1 && number <= 7) return `Cámara ${number}`;
    return 'Área fría';
  }

  if (normalized.includes('area fria')) return 'Área fría';
  if (normalized.includes('area caliente')) return 'Área caliente';
  if (normalized.includes('deposito')) return 'Depósito';
  if (normalized.includes('bano') || normalized.includes('banos') || normalized.includes('sanitario')) return 'Baños';
  if (normalized.includes('area comun') || normalized.includes('areas comunes')) return 'Áreas comunes';
  if (normalized.includes('comedor')) return 'Comedor';
  if (normalized.includes('logistica')) return 'Logística';
  if (normalized.includes('residuos') || normalized.includes('desecho') || normalized.includes('basura')) return 'Área de residuos';
  if (normalized.includes('pre elaborados') || normalized.includes('preelaborados') || normalized.includes('pre elaborado')) return 'Área de pre elaborados';
  if (normalized.includes('lavadero') || normalized.includes('bacha')) return 'Lavadero';
  if (normalized === normalizeForMatch('Planta') || normalized.includes('recorrida de planta')) return 'Áreas comunes';
  if (normalized === normalizeForMatch('Área no identificada')) return 'Área no identificada';

  // Áreas de soporte o no operativas no deben aparecer como área clasificada.
  if (
    normalized.includes('calidad')
    || normalized.includes('documentacion')
    || normalized.includes('rrhh')
    || normalized.includes('personal')
    || normalized.includes('higiene')
    || normalized.includes('sanitizacion')
    || normalized.includes('mantenimiento')
  ) {
    return null;
  }

  return null;
}

function sanitizeOperationalAreaList(parts = []) {
  const seen = new Set();
  const finalAreas = [];

  parts
    .flatMap((part) => String(part || '').split(','))
    .flatMap((part) => part.split('/'))
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const operational = toOperationalArea(part);
      if (!operational || !OPERATIONAL_AREA_SET.has(operational)) return;
      const key = normalizeForMatch(operational);
      if (seen.has(key)) return;
      seen.add(key);
      finalAreas.push(operational);
    });

  return finalAreas.length ? finalAreas : ['Área no identificada'];
}

function detectExactLocations(text) {
  const normalized = normalizeIncidentText(text);
  if (!normalized) {
    return {
      cameraLocations: [],
      heladeraAreas: [],
      hotEquipmentAreas: [],
      sectorAreas: [],
      clientAreas: []
    };
  }

  const cameraLocations = extractCamaras(normalized);
  const heladeraAreas = [];
  const hotEquipmentAreas = [];
  const sectorAreas = [];
  const clientAreas = [];

  const hasHeladera = normalized.includes('heladera') || normalized.includes('heladeras');
  const hasAF = /\baf\b/.test(` ${normalized} `) || normalized.includes('area fria') || normalized.includes('área fria');
  const hasAC = /\bac\b/.test(` ${normalized} `) || normalized.includes('area caliente') || normalized.includes('área caliente');
  if (hasHeladera && hasAF) heladeraAreas.push('Área fría');
  if (hasHeladera && hasAC) heladeraAreas.push('Área caliente');

  if (containsAny(normalized, [
    'horno',
    'hornos',
    'cocina',
    'coccion',
    'cocción',
    'marmita',
    'marmitas',
    'freidora',
    'freidoras',
    'plancha',
    'planchas',
    'olla',
    'ollas',
    'preparacion caliente',
    'preparación caliente',
    'linea caliente',
    'línea caliente',
    'costillas',
    'almuerzos calientes'
  ])) {
    hotEquipmentAreas.push('Área caliente');
  }

  if (containsAny(normalized, ['deposito', 'depósito'])) sectorAreas.push('Depósito');
  if (containsAny(normalized, ['pre elaborados', 'preelaborados', 'pre elaborado', 'pre-elaborados'])) {
    sectorAreas.push('Área de pre elaborados');
  }
  if (containsAny(normalized, ['linea de bachas', 'línea de bachas', 'bachas', 'lavadero', 'lavado'])) {
    sectorAreas.push('Lavadero');
  }
  if (containsAny(normalized, ['residuo', 'residuos', 'basura', 'desechos'])) {
    sectorAreas.push('Área de residuos');
  }
  if (containsAny(normalized, ['cebro exterior', 'cebros exteriores', 'cebo', 'cebos', 'exterior'])) {
    sectorAreas.push('Área de residuos');
  }
  if (containsAny(normalized, ['baño', 'bano', 'baños', 'banos', 'sanitario'])) {
    sectorAreas.push('Baños');
  }
  if (containsAny(normalized, ['comedor'])) {
    sectorAreas.push('Comedor');
  }
  if (containsAny(normalized, ['planta', 'recorrida de planta', 'area comun', 'área común', 'áreas comunes', 'pasillo'])) {
    sectorAreas.push('Áreas comunes');
  }
  if (containsAny(normalized, ['easy', 'scop', 'hospital mental', 'pocito', 'la laja'])) {
    clientAreas.push('Logística');
  }

  return {
    cameraLocations: [...new Set(cameraLocations)],
    heladeraAreas: [...new Set(heladeraAreas)],
    hotEquipmentAreas: [...new Set(hotEquipmentAreas)],
    sectorAreas: [...new Set(sectorAreas)],
    clientAreas: [...new Set(clientAreas)]
  };
}

const COMMON_TEXT_FIXES = [
  { from: /\bmercaderis\b/g, to: 'mercaderia' },
  { from: /\bvedura\b/g, to: 'verdura' },
  { from: /\bminmutos\b/g, to: 'minutos' },
  { from: /\bsanitiza\b/g, to: 'sanitizacion' },
  { from: /\brobocoupe\b/g, to: 'equipo maquina de proceso' }
];

const AREA_SCORING_RULES = [
  { area: 'Área fría', keywords: ['camara', 'camaras', 'heladera', 'heladeras', 'refrigerado', 'refrigeracion', 'frio', 'ensalada', 'tomate', 'verdura', 'materia prima perecedera'], score: 6 },
  { area: 'Área caliente', keywords: ['cocina', 'coccion', 'linea caliente', 'caliente', 'horno', 'marmita', 'fritura', 'costilla', 'almuerzo preparado', 'produccion caliente'], score: 6 },
  { area: 'Depósito', keywords: ['deposito', 'recepcion', 'stock', 'mercaderia', 'almacenamiento', 'almacenar', 'ingreso de mercaderia', 'faltante de insumos'], score: 5 },
  { area: 'Logística', keywords: ['faltaron almuerzos', 'faltante de mercaderia en cliente', 'demora', 'entrega al cliente', 'servicio demorado', 'cliente', 'easy', 'hospital mental', 'pocito', 'la laja', 'reparto', 'despacho', 'devolucion del cliente'], score: 7 },
  { area: 'Baños', keywords: ['baño', 'bano', 'baños', 'banos', 'sanitario'], score: 7 },
  { area: 'Áreas comunes', keywords: ['planta', 'recorrida de planta', 'pasillo', 'area comun', 'áreas comunes'], score: 4 },
  { area: 'Comedor', keywords: ['comedor', 'linea de servicio', 'línea de servicio'], score: 6 },
  { area: 'Área de residuos', keywords: ['residuo', 'residuos', 'basura', 'desecho'], score: 7 },
  { area: 'Área de pre elaborados', keywords: ['pre elaborados', 'preelaborados', 'pre elaborado', 'pre-elaborados'], score: 6 },
  { area: 'Lavadero', keywords: ['lavadero', 'bachas', 'linea de bachas', 'línea de bachas', 'lavado'], score: 7 }
];

const AREA_PRIORITY = OPERATIONAL_AREA_PRIORITY;

const NC_SIGNALS = [
  'mal estado',
  'producto defectuoso',
  'devolucion del cliente',
  'falta de limpieza',
  'contaminacion',
  'suciedad',
  'restos de carne',
  'falta de agua caliente',
  'no hay agua caliente',
  'sin agua caliente',
  'registros faltantes',
  'registros incompletos',
  'registro incompleto',
  'incompleto',
  'faltante de mercaderia',
  'faltaron almuerzos',
  'demora',
  'equipo critico fuera de uso',
  'incumplimiento de procedimiento',
  'auditoria con bajo cumplimiento',
  'fuera de uso',
  'falla',
  'no disponen de calzado',
  'falta de registros',
  'camaras sin control',
  'cámaras sin control'
];

const CONFORME_SIGNALS = [
  'sin hallazgo',
  'recorrida de planta',
  'control de registros',
  'control de orden limpieza y etiquetado',
  'control de historial de coccion',
  'control de historial de cocción',
  'se controla',
  'verificacion',
  'verificación',
  'revision sin hallazgo',
  'revisión sin hallazgo',
  'se crea respaldo documental',
  'se dicta capacitacion',
  'se implementa mejora',
  'se actualiza procedimiento',
  'conforme',
  'cumple'
];

const AUDIT_LOW_THRESHOLD = 70;
const AUDIT_MID_THRESHOLD = 85;

function normalizeIncidentText(value) {
  let text = normalizeForMatch(value || '');
  if (!text) return '';
  text = ` ${text} `;
  COMMON_TEXT_FIXES.forEach((fix) => {
    text = text.replace(fix.from, fix.to);
  });
  return text.replace(/\s+/g, ' ').trim();
}

function parseCompliancePercentage(text) {
  const raw = normalizeCellValue(text || '').toLowerCase();
  const normalized = normalizeIncidentText(text || '');
  if (!normalized && !raw) return null;
  const match = raw.match(/(\d{1,3})\s*%/) || normalized.match(/cumplimiento(?:\s+del|\s+de)?\s*(\d{1,3})\b/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value < 0 || value > 100) return null;
  return value;
}

function classifyAuditCompliance(text) {
  const normalized = normalizeIncidentText(text || '');
  if (!normalized) return null;
  const isAudit = containsAny(normalized, ['auditoria', 'auditoría']);
  const hasComplianceSignal = containsAny(normalized, ['cumplimiento']);
  if (!isAudit || !hasComplianceSignal) return null;

  const percentage = parseCompliancePercentage(normalized);
  if (percentage == null) {
    return { percentage: null, classification: 'Revisar manualmente', tipoDesvio: '-', reason: 'auditoria con cumplimiento sin porcentaje claro' };
  }
  if (percentage < AUDIT_LOW_THRESHOLD) {
    return { percentage, classification: 'No conforme', tipoDesvio: 'NC', reason: `auditoria con cumplimiento bajo (${percentage}%)` };
  }
  if (percentage < AUDIT_MID_THRESHOLD) {
    return { percentage, classification: 'Revisar manualmente', tipoDesvio: '-', reason: `auditoria con cumplimiento intermedio (${percentage}%)` };
  }
  return { percentage, classification: 'Conforme', tipoDesvio: '-', reason: `auditoria con cumplimiento aceptable (${percentage}%)` };
}

function hasExplicitNegativeSignal(text) {
  const normalized = normalizeIncidentText(text || '');
  if (!normalized) return false;
  const explicitTerms = [
    'falta de',
    'falta registro',
    'falta de registro',
    'falta de orden',
    'falta de etiquetado',
    'incompleto',
    'incompleta',
    'incompletos',
    'sin registro',
    'sin evidencia',
    'fuera de rango',
    'vencido',
    'vencida',
    'no funciona',
    'mal estado',
    'sucio',
    'sucia',
    'contaminado',
    'contaminada',
    'incumplimiento',
    'no cumple',
    'ausencia de',
    'ausencia de epp',
    'falta de epp',
    'falta de calzado',
    'falta de ropa de trabajo',
    'no dispone',
    'no disponen',
    'no cuenta con',
    'no cuentan con',
    'carece de',
    'carecen de',
    'sin epp',
    'sin calzado',
    'sin ropa de trabajo',
    'desvio',
    'desvío'
  ];

  return containsAny(normalized, explicitTerms)
    || /\bfalta\s+de\b/.test(normalized)
    || /\bfalta\s+registro(s)?\b/.test(normalized)
    || /\bregistros?\s+incompleto(s)?\b/.test(normalized)
    || /\bsin\s+registro(s)?\b/.test(normalized)
    || /\bsin\s+evidencia\b/.test(normalized)
    || /\bfuera\s+de\s+rango\b/.test(normalized)
    || /\bno\s+funciona(n)?\b/.test(normalized)
    || /\bmal\s+estado\b/.test(normalized)
    || /\bincumplimiento\b/.test(normalized)
    || /\bno\s+cumple\b/.test(normalized)
    || /\bno\s+disponen?\b/.test(normalized)
    || /\bno\s+cuentan?\s+con\b/.test(normalized)
    || /\bcarece(n)?\s+de\b/.test(normalized)
    || /\bsin\s+epp\b/.test(normalized)
    || /\bsin\s+calzado\b/.test(normalized)
    || /\bsin\s+ropa\s+de\s+trabajo\b/.test(normalized)
    || /\bausencia\s+de\b/.test(normalized)
    || /\bdesvi[oó]\b/.test(normalized);
}

function detectCriticalNegativeSignal(text) {
  const normalized = normalizeIncidentText(text || '');
  if (!normalized || isExplicitNoFindingText(normalized)) return null;

  const criticalTerms = [
    'sin rotular',
    'sin rotulacion',
    'sin rotulación',
    'falta rotular',
    'falta rotulacion',
    'falta rotulación',
    'falta de rotulacion',
    'falta de rotulación',
    'falta carteleria',
    'falta cartelería',
    'falta de carteleria',
    'falta de cartelería',
    'registro incompleto',
    'registros incompletos',
    'incompleto',
    'incompleta',
    'incompletos',
    'incompletas',
    'sin registro',
    'sin evidencia',
    'no dispone',
    'no disponen',
    'no cuenta con',
    'no cuentan con',
    'carece de',
    'carecen de',
    'sin epp',
    'sin calzado',
    'sin ropa de trabajo',
    'no limpias',
    'no limpia',
    'no se encuentran limpias',
    'sucio',
    'sucia',
    'sucios',
    'sucias',
    'contaminado',
    'contaminada',
    'contaminados',
    'contaminadas',
    'fuera de rango',
    'vencido',
    'vencida',
    'vencidos',
    'vencidas',
    'no cumple',
    'incumplimiento'
  ];

  const found = criticalTerms.find((term) => normalized.includes(normalizeIncidentText(term)));
  if (found) return found;
  return null;
}

function hasCriticalNegativeSignal(text) {
  return Boolean(detectCriticalNegativeSignal(text));
}

function hasMildObservationSignal(text) {
  const normalized = normalizeIncidentText(text || '');
  if (!normalized || hasCriticalNegativeSignal(normalized) || isExplicitNoFindingText(normalized)) return false;
  return containsAny(normalized, [
    'desorden',
    'desordenado',
    'desordenada',
    'desordenados',
    'desordenadas',
    'bines',
    'ocupando espacios',
    'objetos ajenos',
    'fuera de lugar'
  ]);
}

function isNeutralTechnicalMention(text) {
  const normalized = normalizeIncidentText(text || '');
  if (!normalized) return false;
  if (hasExplicitNegativeSignal(normalized)) return false;

  const neutralSignals = [
    'registro de temperatura',
    'control de camaras',
    'control de cámaras',
    'control de heladeras',
    'heladera',
    'heladeras',
    'verificacion de registros',
    'verificación de registros',
    'control de documentacion',
    'control de documentación',
    'recorrido de planta',
    'control de registros',
    'control de temperatura',
    'registro de camara',
    'registro de cámara'
  ];
  return containsAny(normalized, neutralSignals);
}

function classifyTechnicalControlRule(text) {
  const normalized = normalizeIncidentText(text || '');
  if (!normalized) return null;

  const technicalSignals = [
    'registro',
    'control',
    'verificacion',
    'temperatura',
    'camara',
    'heladera',
    'freezer'
  ];

  const explicitProblemIndicators = [
    'falta',
    'faltante',
    'sin registro',
    'incompleto',
    'incompleta',
    'fuera de rango',
    'vencido',
    'vencida',
    'no funciona',
    'no registra',
    'error',
    'incorrecto',
    'incorrecta',
    'mal',
    'desvio',
    'anomalia',
    'roto',
    'rota',
    'mal estado'
  ];

  const hasTechnicalSignal = containsAny(normalized, technicalSignals);
  if (!hasTechnicalSignal) return null;

  const hasExplicitProblem = containsAny(normalized, explicitProblemIndicators)
    || /\bfuera\s+de\s+rango\b/.test(normalized)
    || /\bsin\s+registro\b/.test(normalized)
    || /\bno\s+funciona(n)?\b/.test(normalized)
    || /\bno\s+registra(n)?\b/.test(normalized)
    || /\bmal\s+estado\b/.test(normalized)
    || /\banomalia(s)?\b/.test(normalized)
    || /\bdesvi[oó](s)?\b/.test(normalized);

  if (hasExplicitProblem) {
    return {
      resultadoClasificado: 'No conforme',
      tipoDesvio: 'NC',
      iso22000: '8.5.1 Control operacional',
      reason: 'NC por indicador explícito en registro técnico'
    };
  }

  return {
    resultadoClasificado: 'Conforme',
    tipoDesvio: '-',
    iso22000: '-',
    reason: 'Conforme por registro técnico neutro sin problema explícito'
  };
}

function classifyPriorityOperationalRule(text) {
  const normalized = normalizeIncidentText(text || '');
  if (!normalized) return null;

  if (containsAny(normalized, [
    'sin rotular',
    'sin rotulacion',
    'sin rotulación',
    'falta rotular',
    'falta de rotular',
    'alimentos sin rotular'
  ])) {
    return {
      resultadoClasificado: 'No conforme',
      tipoDesvio: 'NC',
      iso22000: '8.5.2 Trazabilidad',
      reason: 'NC por incumplimiento de trazabilidad/rotulado'
    };
  }

  if (containsAny(normalized, [
    'sucio',
    'sucia',
    'sucios',
    'sucias',
    'suciedad',
    'sin limpiar',
    'restos'
  ])) {
    return {
      resultadoClasificado: 'No conforme',
      tipoDesvio: 'NC',
      iso22000: '8.2 PRP Limpieza',
      reason: 'NC por incumplimiento de limpieza'
    };
  }

  if (containsAny(normalized, [
    'no funciona',
    'fallando',
    'falla equipo',
    'equipo fallando',
    'freezer no funciona',
    'heladera no funciona',
    'camara no funciona',
    'cámara no funciona'
  ])) {
    return {
      resultadoClasificado: 'No conforme',
      tipoDesvio: 'NC',
      iso22000: '8.5.1 Control operacional',
      reason: 'NC por falla de equipamiento operativo'
    };
  }

  if (containsAny(normalized, [
    'faltante',
    'faltaron',
    'falta de',
    'sin stock'
  ])) {
    return {
      resultadoClasificado: 'No conforme',
      tipoDesvio: 'NC',
      iso22000: '8.5.1 Control operacional',
      reason: 'NC por faltante operativo'
    };
  }

  if (containsAny(normalized, [
    'residuos',
    'basura acumulada',
    'cesto rebalsado',
    'cesto rebalsado',
    'bolsas rotas'
  ])) {
    return {
      resultadoClasificado: 'No conforme',
      tipoDesvio: 'NC',
      iso22000: '8.2 PRP Limpieza',
      reason: 'NC por gestión deficiente de residuos'
    };
  }

  return null;
}

function hasRowContinuationSignal(text) {
  const raw = normalizeCellValue(text || '').trim();
  if (!raw) return false;
  const normalized = normalizeIncidentText(raw);
  const strongTail = /[;:,]\s*$/.test(raw);
  const explicitContinuation = containsAny(normalized, [
    'falta',
    'se solicita',
    'los mismos completos',
    'completar a cada area',
    'completar a cada área'
  ]);
  return strongTail || explicitContinuation;
}

function isExplicitNoFindingText(text) {
  const normalized = normalizeIncidentText(text || '');
  if (!normalized) return false;
  const compact = normalized.replace(/\s+/g, ' ').trim();
  if ([
    'sin hallazgo detectado',
    'sin hallazgo',
    'sin hallazgos',
    'sin observaciones',
    'sin desvios',
    'sin desvio',
    'sin novedades',
    'correcto',
    'ok',
    'conforme'
  ].includes(compact)) {
    return true;
  }
  return containsAny(normalized, [
    'sin hallazgo detectado',
    'sin hallazgo',
    'sin hallazgos',
    'sin observaciones',
    'sin desvios',
    'sin desvio',
    'no se detectan hallazgos',
    'no se observan desvios',
    'no se observan desvíos'
  ]);
}

function classifyNormalizedRule(text) {
  const normalized = normalizeIncidentText(text || '');
  if (!normalized) return null;

  const build = (resultadoClasificado, tipoDesvio, iso22000, reason) => ({
    resultadoClasificado,
    tipoDesvio,
    iso22000,
    reason
  });

  const hasAny = (terms) => containsAny(normalized, terms);

  const hasNoFinding = isExplicitNoFindingText(normalized);
  if (hasNoFinding) return build('Conforme', '-', '-', 'Conforme por ausencia de hallazgo');

  if (hasAny([
    'producto no conforme',
    'producto nc',
    'productos no conformes',
    'carteleria de producto no conforme',
    'cartelería de producto no conforme'
  ])) {
    return build('No conforme', 'NC', '8.7 Control de salidas no conformes', 'NC por producto no conforme');
  }

  const hasResiduos = hasAny([
    'residuos',
    'basura',
    'contenedor',
    'contenedores',
    'carton',
    'cartón',
    'bolsas vacias',
    'bolsas vacías',
    'cajas vacias',
    'cajas vacías',
    'tacho',
    'tachos'
  ]);

  // Excepción pedida: residuos + identificación/cartelería sigue siendo residuos.
  if (hasResiduos && hasAny([
    'sin identificar',
    'sin identificacion',
    'sin identificación',
    'falta identificacion',
    'falta identificación',
    'carteleria',
    'cartelería'
  ])) {
    return build('No conforme', 'NC', '8.2 PRP Manejo residuos', 'NC por manejo de residuos');
  }

  if (hasAny([
    'sin rotular',
    'falta rotulacion',
    'falta rotulación',
    'rotulacion',
    'rotulación',
    'rotulo',
    'rótulo',
    'sin identificar',
    'sin identificacion',
    'sin identificación',
    'falta identificacion',
    'falta identificación',
    'etiqueta',
    'fecha de elaboracion',
    'fecha de elaboración',
    'fecha de vencimiento',
    'vencimiento'
  ])) {
    return build('No conforme', 'NC', '8.5.2 Trazabilidad', 'NC por trazabilidad/rotulación');
  }

  if (hasResiduos) {
    return build('No conforme', 'NC', '8.2 PRP Manejo residuos', 'NC por manejo de residuos');
  }

  // Cartelería/identificación general:
  // aplica cuando no cae en residuos ni producto no conforme.
  const hasCarteleriaGeneral = hasAny([
    'falta carteleria',
    'falta cartelería',
    'sin carteleria',
    'sin cartelería',
    'carteleria',
    'cartelería'
  ]);
  if (hasCarteleriaGeneral) {
    return build('No conforme', 'NC', '8.2 PRP Identificación', 'NC por falta de cartelería/identificación');
  }

  if (hasAny([
    'bandeja rota',
    'bandejas rotas',
    'envase sin integridad',
    'envases sin integridad',
    'sin integridad',
    'mal estado',
    'roto',
    'rota',
    'rotos',
    'rotas',
    'deteriorado',
    'deteriorada',
    'deteriorados',
    'deterioradas'
  ])) {
    return build('No conforme', 'NC', '7.1.3 Equipamiento', 'NC por integridad/equipamiento');
  }

  if (hasAny([
    'faltante',
    'faltantes',
    'faltaron',
    'falto',
    'faltó',
    'unidades',
    'menu',
    'menú',
    'viandas faltantes',
    'pedido incompleto',
    'pedidos incompletos',
    'bifes',
    'callia',
    'caliia'
  ])) {
    return build('No conforme', 'NC', '8.5.1 Control operacional', 'NC por faltante/control operacional');
  }

  if (hasAny([
    'sucio',
    'sucia',
    'sucios',
    'sucias',
    'falta limpieza',
    'limpieza deficiente',
    'higiene',
    'restos de alimentos',
    'restos de comida',
    'charcos',
    'piso sucio',
    'instalaciones sucias',
    'elementos sucios',
    'sector sucio'
  ])) {
    return build('No conforme', 'NC', '8.2 PRP Limpieza', 'NC por limpieza/higiene');
  }

  const hasOrderSignal = hasAny([
    'desorden',
    'desordenado',
    'desordenada',
    'desordenados',
    'desordenadas',
    'falta de orden',
    'orden en general',
    'heladeras desordenadas',
    'sector desordenado'
  ]);
  const hasDirectRisk = hasAny([
    'sucio', 'sucia', 'sucios', 'sucias',
    'rotulacion', 'rotulación', 'sin rotular', 'residuos', 'basura',
    'producto no conforme', 'roto', 'rota', 'rotos', 'rotas', 'deteriorado', 'deteriorada',
    'vencido', 'vencida', 'vencimiento', 'faltante', 'faltantes', 'faltaron', 'faltó', 'falto'
  ]);
  if (hasOrderSignal && !hasDirectRisk) {
    return build('Observación', 'OBS', '8.2 PRP Orden', 'OBS por orden sin riesgo directo');
  }

  const hasAjenosOPersonales = hasAny([
    'productos ajenos',
    'elementos ajenos',
    'objetos ajenos',
    'riñonera',
    'rinonera',
    'mochila',
    'bolso',
    'cartera',
    'ropa',
    'pertenencias personales'
  ]);
  const hasAreaProductiva = hasAny([
    'pre elaborado',
    'pre elaborados',
    'preelaborado',
    'preelaborados',
    'area fria',
    'área fría',
    'area caliente',
    'área caliente',
    'deposito',
    'depósito',
    'cocina',
    'elaboracion',
    'elaboración'
  ]);
  if (hasAjenosOPersonales && hasAreaProductiva) {
    return build('No conforme', 'NC', '8.2 PRP Higiene', 'NC por objetos/personales en área productiva');
  }

  const hasTechnicalSignal = hasAny([
    'registro',
    'control',
    'verificacion',
    'verificación',
    'temperatura',
    'camara',
    'cámara',
    'heladera',
    'freezer'
  ]);
  const hasTechnicalProblem = hasAny([
    'falta',
    'faltante',
    'sin registro',
    'incompleto',
    'incompleta',
    'fuera de rango',
    'vencido',
    'vencida',
    'no funciona',
    'no registra',
    'error',
    'incorrecto',
    'incorrecta',
    'mal',
    'desvio',
    'desvío',
    'anomalia',
    'anomalía'
  ]);
  if (hasTechnicalSignal && hasTechnicalProblem) {
    return build('No conforme', 'NC', '8.5.1 Control operacional', 'NC por problema técnico explícito');
  }
  if (hasTechnicalSignal) {
    return build('Conforme', '-', '-', 'Conforme por registro técnico neutro');
  }

  return build('Revisar manualmente', '-', 'Revisar manualmente', 'texto ambiguo o incompleto');
}

function parseRecordDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const raw = normalizeCellValue(value).trim();
  if (!raw) return null;

  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct;

  const dmy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]) - 1;
    let year = Number(dmy[3]);
    if (year < 100) year += 2000;
    const parsed = new Date(year, month, day);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

function isPastRecordDate(value) {
  const parsed = parseRecordDate(value);
  if (!parsed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parsed.getTime() < today.getTime();
}

function isMissingFindingText(value) {
  const text = normalizeIncidentText(value);
  return !text || text === 'sin hallazgo detectado' || text === 'sin hallazgo';
}

function buildClassificationText({ areaProceso, actividadRealizada, hallazgoDetectado }) {
  const area = normalizeCellValue(areaProceso || '').trim();
  const actividad = normalizeCellValue(actividadRealizada || '').trim();
  const hallazgo = normalizeCellValue(hallazgoDetectado || '').trim();

  const hallazgoUtil = isMissingFindingText(hallazgo) ? '' : hallazgo;
  const base = [area, actividad, hallazgoUtil].filter(Boolean).join(' | ');
  return normalizeIncidentText(base);
}

function countMatchedKeywords(text, keywords = []) {
  let score = 0;
  const matches = [];

  keywords.forEach((keyword) => {
    const token = normalizeIncidentText(keyword);
    if (!token) return;
    if (text.includes(token)) {
      score += token.includes(' ') ? 2 : 1;
      matches.push(keyword);
    }
  });

  return { score, matches };
}

function sortAreasByPriority(areaScores) {
  return [...areaScores.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return AREA_PRIORITY.indexOf(a[0]) - AREA_PRIORITY.indexOf(b[0]);
    });
}

function sortAreasByPriorityList(areaList = []) {
  const operational = sanitizeOperationalAreaList(areaList);
  if (operational.length === 1 && operational[0] === 'Área no identificada') return operational;

  operational.sort((a, b) => {
    const ia = AREA_PRIORITY.indexOf(a);
    const ib = AREA_PRIORITY.indexOf(b);
    const pa = ia === -1 ? 999 : ia;
    const pb = ib === -1 ? 999 : ib;
    return pa - pb;
  });
  return operational;
}

function detectAreasFromDescription(descripcionDetectada, areaProceso = '') {
  const text = normalizeIncidentText(descripcionDetectada);
  const areaProcesoText = normalizeIncidentText(areaProceso);
  const areaOriginalNorm = normalizeIncidentText(areaProceso);

  if (!text) return { areas: ['Área no identificada'], evidence: [] };

  // Prioridad 1: Cámara específica (siempre por encima de Área fría).
  const exact = detectExactLocations(text);
  if (exact.cameraLocations.length > 0) {
    return {
      areas: [exact.cameraLocations[0]],
      evidence: ['cámara específica detectada en hallazgo']
    };
  }

  // Caso especial solicitado: texto genérico de desorden/suciedad/charcos
  // solo debe ir a Lavadero si el área original ya lo indica.
  const hasGenericDirtyFloorSignals = containsAny(text, [
    'sector desordenado',
    'pisos sucios',
    'charcos de agua',
    'restos de alimentos en el piso'
  ]);
  if (hasGenericDirtyFloorSignals) {
    const originalArea = toOperationalArea(areaProceso);
    if (originalArea === 'Lavadero') {
      return { areas: ['Lavadero'], evidence: ['lavadero heredado desde área original'] };
    }
    return { areas: ['Área no identificada'], evidence: ['higiene general sin pista de área específica'] };
  }

  // Caso especial solicitado: "ambas cámaras" sin número explícito.
  if (containsAny(text, ['ambas camaras', 'ambas cámaras'])) {
    const originalArea = toOperationalArea(areaProceso);
    if (originalArea && originalArea.startsWith('Cámara')) {
      return {
        areas: [originalArea],
        evidence: ['cámaras múltiples con cámara específica heredada desde Excel']
      };
    }
    return {
      areas: ['Área fría'],
      evidence: ['cámaras múltiples sin número específico']
    };
  }

  // Prioridad 2: Baños.
  if (containsAny(text, ['baño', 'baños', 'bano', 'banos', 'sanitario', 'sanitarios', 'armario de baños', 'armario de banos'])) {
    return {
      areas: ['Baños'],
      evidence: ['señales de baños/sanitarios']
    };
  }

  // Prioridad 3: Área de residuos.
  if (containsAny(text, [
    'residuos',
    'basura',
    'contenedor',
    'contenedores',
    'carton',
    'cartón',
    'tacho',
    'tachos',
    'bolsas vacias',
    'bolsas vacías',
    'cajas vacias',
    'cajas vacías'
  ])) {
    return {
      areas: ['Área de residuos'],
      evidence: ['señales de residuos/basura']
    };
  }

  // Prioridad 4: Lavadero.
  const hasLavaderoSignals = containsAny(text, [
    'lavadero',
    'bacha',
    'bachas',
    'lavado',
    'utensilios sucios',
    'elementos sucios',
    'charcos de agua'
  ]);
  if (hasLavaderoSignals) {
    return {
      areas: ['Lavadero'],
      evidence: ['señales de lavadero/bachas/lavado']
    };
  }

  // Prioridad 5: Depósito.
  if (containsAny(text, [
    'deposito',
    'depósito',
    'almacen',
    'almacén',
    'mercaderia',
    'mercadería',
    'stock',
    'pedidos llegaron'
  ])) {
    return {
      areas: ['Depósito'],
      evidence: ['señales de depósito/almacén/stock']
    };
  }

  // Prioridad 6: Logística.
  if (containsAny(text, [
    'faltante',
    'faltantes',
    'faltaron',
    'faltó',
    'falto',
    'unidades',
    'menu',
    'menú',
    'pedido incompleto',
    'pedidos incompletos',
    'callia',
    'caliia',
    'bifes',
    'entrega'
  ])) {
    return {
      areas: ['Logística'],
      evidence: ['señales de logística/faltantes/entrega']
    };
  }

  // Prioridad 7: Área de pre elaborados.
  if (containsAny(text, [
    'pre elaborado',
    'pre elaborados',
    'preelaborado',
    'preelaborados',
    'riñonera',
    'rinonera',
    'productos ajenos'
  ])) {
    return {
      areas: ['Área de pre elaborados'],
      evidence: ['señales de pre elaborados']
    };
  }

  // Prioridad 8: Área caliente.
  if (containsAny(text, [
    'platina',
    'platinas',
    'caliente',
    'coccion',
    'cocción',
    'horno',
    'hornos',
    'olla',
    'ollas',
    'produccion caliente',
    'producción caliente',
    'preparacion caliente',
    'preparación caliente'
  ])) {
    return {
      areas: ['Área caliente'],
      evidence: ['señales de cocción/proceso caliente']
    };
  }

  // Prioridad 9: Área fría.
  if (containsAny(text, [
    'sandwich',
    'sanguches',
    'ensalada',
    'ensaladas',
    'postre',
    'postres',
    'vianda',
    'viandas',
    'heladera',
    'heladeras',
    'frio',
    'fría',
    'fria',
    'refrigerado',
    'refrigerados',
    'camara',
    'cámara'
  ])) {
    // Caso solicitado: frase genérica con charcos/suciedad debe quedar no identificada,
    // salvo que el área original ya indique Lavadero.
    return {
      areas: ['Área fría'],
      evidence: ['señales de productos/almacenamiento en frío']
    };
  }

  // Prioridad 10: Áreas comunes.
  if (containsAny(text, [
    'zona de circulacion',
    'zona de circulación',
    'circulacion',
    'circulación',
    'pasillo',
    'pasillos',
    'areas comunes',
    'áreas comunes',
    'sector comun',
    'sector común'
  ])) {
    return {
      areas: ['Áreas comunes'],
      evidence: ['señales de circulación/áreas comunes']
    };
  }

  return {
    areas: ['Área no identificada'],
    evidence: [areaProcesoText || areaOriginalNorm ? 'sin señales claras; área original no concluyente' : 'sin señales claras']
  };
}

function classifyOutcomeFromRow({ resultado, desvio, descripcionDetectada, tipoActividad, context = {} }) {
  const resultadoNorm = normalizeIncidentText(resultado);
  const resultadoEsConforme = isConformeLike(resultado);
  const resultadoEsNoConforme = isNoConformeLike(resultado);
  const desvioSi = isYesLike(desvio);
  const desvioNo = isNoLike(desvio);
  const text = normalizeIncidentText(descripcionDetectada || '');
  const isSinHallazgoText = isExplicitNoFindingText(text);
  const detectionLeadSignals = ['se detecta', 'se encuentran', 'se observa'];
  const technicalMentionSignals = ['registro de temperatura', 'registro', 'camaras', 'cámaras', 'heladeras', 'heladera', 'control', 'verificacion', 'verificación', 'temperatura'];

  const realNcSignals = [
    'cebos',
    'plagas',
    'cucarachas',
    'faltante',
    'incompleto',
    'sin registro',
    'sin temperatura',
    'sin rotular',
    'fuera de rango',
    'mal estado',
    'producto defectuoso',
    'defectuoso',
    'proveedor no cumple',
    'incumplimiento de proveedor',
    'falta de personal',
    'falto personal',
    'faltó personal',
    'ausencia de personal',
    'sin personal',
    'no funciona',
    'no cumple',
    'sucio',
    'vencido'
  ];
  const actionSignals = [
    'reponer',
    'se solicita',
    'pendiente',
    'se realizara',
    'se coordina',
    'se planifica',
    'gestionar',
    'se entrega',
    'se pasa a'
  ];
  const hasRealNcSignal = containsAny(text, realNcSignals)
    || hasExplicitNegativeSignal(text)
    || /\bfaltan?\s+(registros?|insumos?|productos?)\b/.test(text)
    || /\bincompleto(s)?\b/.test(text)
    || /\bsin\s+temperatura\b/.test(text)
    || /\bsin\s+registro(s)?\b/.test(text)
    || /\bsin\s+rotular\b/.test(text)
    || /\bfuera\s+de\s+rango\b/.test(text)
    || /\bmal\s+estado\b/.test(text)
    || /\bproducto\s+defectuoso\b/.test(text)
    || /\bproveedor\s+no\s+cumple\b/.test(text)
    || /\bno\s+cumple\b/.test(text)
    || /\bno\s+funciona(n)?\b/.test(text)
    || /\bsucio(s)?\b/.test(text)
    || /\bvencido(s)?\b/.test(text);
  const hasActionSignal = containsAny(text, actionSignals);
  const hasDetectionLeadSignal = containsAny(text, detectionLeadSignals);
  const hasAfOrAcMention = /\baf\b/.test(` ${text} `) || /\bac\b/.test(` ${text} `);
  const hasTechnicalMentionSignal = containsAny(text, technicalMentionSignals) || hasAfOrAcMention || isNeutralTechnicalMention(text);
  const inheritedNegativeContext = Boolean(context?.inheritedNegativeContext);
  const criticalNegativeSignal = detectCriticalNegativeSignal(text);
  const adminNeutralSignals = [
    'cumplido',
    'se solicita',
    'se colocan',
    'se realiza check',
    'se entrega',
    'se controla',
    'se revisa',
    'se sube al drive',
    'se coordina',
    'se planifica',
    'plan de accion',
    'plan de acción',
    'seguimiento',
    'renovacion',
    'renovación',
    'listado actualizado'
  ];
  const explicitOmSignals = ['oportunidad de mejora', 'mejora continua'];
  const controlSignals = ['se realiza control', 'se controla', 'orden y limpieza', 'se verifica'];
  const proveedorConformeSignals = ['se realiza contacto con proveedor', 'contacto con proveedor'];
  const hasControlSignal = containsAny(text, controlSignals);
  const hasProveedorConformeSignal = containsAny(text, proveedorConformeSignals);
  const hasAdminNeutralSignal = containsAny(text, adminNeutralSignals);
  const hasExplicitOmSignal = containsAny(text, explicitOmSignals);
  const hasDocSystemWorkSignal = containsAny(text, [
    'se trabaja en revision del sistema de gestion documental',
    'se trabaja en revisión del sistema de gestión documental',
    'se trabaja en revision del sistema documental',
    'se trabaja en revisión del sistema documental'
  ]);

  // Prioridad 1: ausencia explícita de hallazgo.
  if (isSinHallazgoText) {
    return {
      resultadoClasificado: 'Conforme',
      tipoDesvio: '-',
      reason: 'Conforme por sin hallazgo explícito'
    };
  }

  // Prioridad 2: auditoría con cumplimiento porcentual.
  const auditCompliance = classifyAuditCompliance(text);
  if (auditCompliance) {
    return {
      resultadoClasificado: auditCompliance.classification,
      tipoDesvio: auditCompliance.tipoDesvio,
      reason: auditCompliance.reason
    };
  }

  const normalizedRule = classifyNormalizedRule(text);
  if (normalizedRule) {
    return {
      resultadoClasificado: normalizedRule.resultadoClasificado,
      tipoDesvio: normalizedRule.tipoDesvio,
      reason: normalizedRule.reason
    };
  }

  const priorityOperationalRule = classifyPriorityOperationalRule(text);
  if (priorityOperationalRule) {
    return {
      resultadoClasificado: priorityOperationalRule.resultadoClasificado,
      tipoDesvio: priorityOperationalRule.tipoDesvio,
      reason: priorityOperationalRule.reason
    };
  }

  const technicalControlRule = classifyTechnicalControlRule(text);
  if (technicalControlRule) {
    return {
      resultadoClasificado: technicalControlRule.resultadoClasificado,
      tipoDesvio: technicalControlRule.tipoDesvio,
      reason: technicalControlRule.reason
    };
  }

  if (hasDetectionLeadSignal && hasRealNcSignal) {
    return {
      resultadoClasificado: 'No conforme',
      tipoDesvio: 'NC',
      reason: 'detección explícita de problema real'
    };
  }

  // Prioridad 3: señal crítica explícita.
  if (criticalNegativeSignal) {
    return {
      resultadoClasificado: 'No conforme',
      tipoDesvio: 'NC',
      reason: `NC por señal crítica: ${criticalNegativeSignal}`
    };
  }

  // Prioridad 4: contexto heredado controlado.
  if (inheritedNegativeContext && hasTechnicalMentionSignal && !hasRealNcSignal) {
    return {
      resultadoClasificado: 'No conforme',
      tipoDesvio: 'NC',
      reason: 'NC por contexto heredado de fila anterior'
    };
  }

  // Prioridad 5: señal leve de observación (sin señal crítica).
  if (hasMildObservationSignal(text)) {
    return {
      resultadoClasificado: 'Observación',
      tipoDesvio: 'OBS',
      reason: 'OBS por señal leve'
    };
  }

  // Prioridad 6: mención técnica neutra sin desvío explícito.
  if (hasTechnicalMentionSignal && !hasRealNcSignal && !resultadoEsNoConforme && !desvioSi) {
    return {
      resultadoClasificado: 'Conforme',
      tipoDesvio: '-',
      reason: 'Conforme por mención técnica neutra sin señal negativa'
    };
  }

  // Prioridad 7: NC operativo estándar.
  if (hasRealNcSignal) {
    return {
      resultadoClasificado: 'No conforme',
      tipoDesvio: 'NC',
      reason: 'override por desvio operativo real'
    };
  }

  if (hasControlSignal || hasProveedorConformeSignal) {
    return {
      resultadoClasificado: 'Conforme',
      tipoDesvio: '-',
      reason: hasProveedorConformeSignal ? 'gestion con proveedor sin problema explicito' : 'control operativo sin error'
    };
  }

  // Prioridad 8: resultado reportado en Excel.
  if (resultadoEsNoConforme || desvioSi) {
    return {
      resultadoClasificado: 'No conforme',
      tipoDesvio: 'NC',
      reason: desvioSi ? 'marca de desvío en la fila' : 'resultado original no conforme'
    };
  }

  // OM estricto: solo con texto explícito de mejora.
  if (resultadoEsConforme && hasExplicitOmSignal) {
    return {
      resultadoClasificado: 'Oportunidad de mejora',
      tipoDesvio: 'OM',
      reason: 'mejora explícita del sistema'
    };
  }

  // Prioridad 9: texto de acción/seguimiento sin problema real.
  if (hasActionSignal) {
    return {
      resultadoClasificado: 'Conforme',
      tipoDesvio: '-',
      reason: 'acción/seguimiento sin problema explícito'
    };
  }

  // Si origen es Conforme y no hay desvío, debe quedar Conforme.
  if (resultadoEsConforme && (desvioNo || !desvioSi)) {
    return {
      resultadoClasificado: 'Conforme',
      tipoDesvio: '-',
      reason: hasAdminNeutralSignal || hasDocSystemWorkSignal
        ? 'actividad conforme según resultado original'
        : 'resultado original conforme sin desvío'
    };
  }

  const ncMatch = countMatchedKeywords(text, NC_SIGNALS);
  if (ncMatch.score > 0) {
    return {
      resultadoClasificado: 'No conforme',
      tipoDesvio: 'NC',
      reason: ncMatch.matches[0] || 'señal de incumplimiento detectada'
    };
  }

  if (!text) {
    if (!resultadoNorm) {
      return { resultadoClasificado: 'Observación', tipoDesvio: 'OBS', reason: 'sin texto y resultado original vacío/ilegible' };
    }
    return { resultadoClasificado: 'Conforme', tipoDesvio: '-', reason: 'sin texto; se respeta resultado original informado' };
  }

  if (!resultadoNorm) {
      if (hasMildObservationSignal(text)) {
      return {
        resultadoClasificado: 'Observación',
        tipoDesvio: 'OBS',
        reason: 'OBS por señal leve'
      };
    }
      return {
      resultadoClasificado: 'Observación',
      tipoDesvio: 'OBS',
      reason: 'resultado original vacío o ilegible'
    };
  }

  return {
    resultadoClasificado: 'Conforme',
    tipoDesvio: '-',
    reason: 'sin señales de desvío; se respeta resultado original informado'
  };
}

function classifyIso22000FromDescription({ descripcionDetectada, actividadRealizada, areaClasificada, resultadoClasificado }) {
  const text = normalizeIncidentText([descripcionDetectada, actividadRealizada, areaClasificada].join(' | '));
  if (!text) return 'Revisar manualmente';

  const normalizedRule = classifyNormalizedRule(text);
  if (normalizedRule) return normalizedRule.iso22000;

  const priorityOperationalRule = classifyPriorityOperationalRule(text);
  if (priorityOperationalRule) return priorityOperationalRule.iso22000;

  const technicalControlRule = classifyTechnicalControlRule(text);
  if (technicalControlRule) return technicalControlRule.iso22000;

  if (containsAny(text, ['capacitacion', 'curso', 'formacion'])) return '7.2 Competencia / capacitación';
  if (containsAny(text, ['drive', 'documentacion', 'documentación', 'respaldo', 'informacion disponible', 'información disponible'])) return '7.5 Información documentada';
  if (containsAny(text, ['falta de personal', 'falto personal', 'faltó personal', 'ausencia de personal', 'sin personal'])) return '7.1 Recursos';
  if (containsAny(text, ['mal estado', 'ensalada', 'ensaladas', 'tomate'])) return '8.5 Control de peligros / HACCP / OPRP / PCC';
  if (containsAny(text, ['agua caliente', 'bachas', 'sanitiza', 'sanitizacion'])) return '8.2 Programas prerrequisito / POES / BPM';
  if (containsAny(text, ['equipo fallando', 'robocoupe fallando', 'no funciona equipo'])) return '7.1 Recursos';
  if (containsAny(text, ['cebos', 'plagas', 'exterior'])) return '8.2 Programas prerrequisito / POES / BPM';
  if (containsAny(text, ['no conformidad', 'accion correctiva'])) return '10.2 No conformidad y accion correctiva';
  if (containsAny(text, ['auditoria'])) return '9.2 Auditoría interna';
  if (isExplicitNoFindingText(text)) return '-';
  if (containsAny(text, ['registro', 'planilla', 'documentacion', 'drive'])) return '7.5 Información documentada';
  if (containsAny(text, ['proveedor', 'proveedores'])) return '8.4 Control de procesos, productos y servicios externos';
  if (containsAny(text, ['epp', 'recursos'])) return '7.1 Recursos';
  if (containsAny(text, ['limpieza', 'poes', 'bpm', 'plagas'])) return '8.2 Programas prerrequisito / POES / BPM';
  if (containsAny(text, ['camara', 'temperatura', 'conservacion'])) return '8.5 Control de peligros / HACCP / OPRP / PCC';
  if (resultadoClasificado === 'No conforme') return 'Revisar manualmente';
  return 'Revisar manualmente';
}

function resolveIsoWithContextFallback({ iso22000, hallazgoDetectado, actividadRealizada, areaClasificada, resultadoClasificado }) {
  if (normalizeCellValue(iso22000).trim() === '-') return '-';
  if (normalizeIncidentText(iso22000) && normalizeIncidentText(iso22000) !== 'revisar manualmente') return iso22000;
  const text = normalizeIncidentText([hallazgoDetectado, actividadRealizada, areaClasificada].join(' | '));
  if (!text) return 'Revisar manualmente';
  if (containsAny(text, ['capacitacion', 'curso', 'formacion'])) return '7.2 Competencia / capacitación';
  if (containsAny(text, ['drive', 'documentacion', 'documentación', 'respaldo', 'informacion disponible', 'información disponible', 'registro', 'planilla'])) {
    return '7.5 Información documentada';
  }
  if (containsAny(text, ['falta de personal', 'falto personal', 'faltó personal', 'ausencia de personal', 'sin personal'])) return '7.1 Recursos';
  if (containsAny(text, ['equipo fallando', 'robocoupe fallando', 'no funciona equipo', 'no funciona', 'fallando'])) return '7.1 Recursos';
  if (containsAny(text, ['mal estado', 'ensalada', 'ensaladas', 'tomate'])) return '8.5 Control de peligros / HACCP / OPRP / PCC';
  if (containsAny(text, ['sucio', 'suciedad', 'sin limpiar', 'limpieza', 'agua caliente', 'bachas', 'sanitiza', 'sanitizacion', 'plagas', 'cebos', 'cucarachas'])) {
    return '8.2 Programas prerrequisito / POES / BPM';
  }
  return 'Revisar manualmente';
}

function ensureSingleArea(areaClasificada = '') {
  const normalized = normalizeCellValue(areaClasificada).split('/').map((part) => part.trim()).filter(Boolean);
  if (normalized.length <= 1) return normalized[0] || 'Área no identificada';
  return normalized[0];
}

function validateFinalRecord(record = {}) {
  const validated = { ...record };
  const hallazgo = normalizeIncidentText(validated.hallazgoDetectado || '');
  const normalizedRule = classifyNormalizedRule([
    validated.hallazgoDetectado,
    validated.actividadRealizada
  ].join(' | '));
  const priorityOperationalRule = classifyPriorityOperationalRule([
    validated.hallazgoDetectado,
    validated.actividadRealizada
  ].join(' | '));
  const technicalControlRule = classifyTechnicalControlRule([
    validated.hallazgoDetectado,
    validated.actividadRealizada
  ].join(' | '));

  const explicitNoFinding = isExplicitNoFindingText(hallazgo);
  if (explicitNoFinding) {
    validated.resultadoClasificado = 'Conforme';
    validated.tipoDesvio = '-';
    validated.iso22000 = '-';
    validated.estadoAccion = 'sin_accion';
    validated.responsable = 'Responsable a definir';
    validated.accionInmediata = '';
    validated.accionCorrectiva = '';
    validated.areaClasificada = 'Área no identificada';
  }

  if (!explicitNoFinding && normalizedRule) {
    validated.resultadoClasificado = normalizedRule.resultadoClasificado;
    validated.tipoDesvio = normalizedRule.tipoDesvio;
    validated.iso22000 = normalizedRule.iso22000;
  } else if (!explicitNoFinding && priorityOperationalRule) {
    validated.resultadoClasificado = priorityOperationalRule.resultadoClasificado;
    validated.tipoDesvio = priorityOperationalRule.tipoDesvio;
    validated.iso22000 = priorityOperationalRule.iso22000;
  } else if (!explicitNoFinding && technicalControlRule) {
    validated.resultadoClasificado = technicalControlRule.resultadoClasificado;
    validated.tipoDesvio = technicalControlRule.tipoDesvio;
    validated.iso22000 = technicalControlRule.iso22000;
  }

  validated.areaClasificada = ensureSingleArea(validated.areaClasificada);
  if (!explicitNoFinding) {
    validated.iso22000 = resolveIsoWithContextFallback({
      iso22000: validated.iso22000,
      hallazgoDetectado: validated.hallazgoDetectado,
      actividadRealizada: validated.actividadRealizada,
      areaClasificada: validated.areaClasificada,
      resultadoClasificado: validated.resultadoClasificado
    });
  }

  return validated;
}

function extractImmediateAction(text) {
  const source = normalizeCellValue(text).trim();
  if (!source) return '';
  const sentences = source.split(/[.\n;]/).map((part) => part.trim()).filter(Boolean);
  const trigger = ['se solicita', 'se realiza', 'se coordina', 'se entrega', 'se implementa'];
  const matched = sentences.find((sentence) => containsAny(normalizeIncidentText(sentence), trigger));
  if (!matched) return '';
  const cleaned = normalizeDetectedAction(matched)
    .replace(/\bcalidad\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return removeDuplicateActionChunks(cleaned);
}

function buildCorrectiveActionFromProblem(text) {
  if (containsAny(text, ['falta registro', 'registro incompleto', 'sin registro', 'planilla'])) {
    return 'Implementar control diario de registros.';
  }
  if (containsAny(text, ['temperatura', 'camara', 'conservacion', 'fuera de'])) {
    return 'Implementar monitoreo diario de temperatura y verificación por turno.';
  }
  if (containsAny(text, ['sucio', 'limpieza', 'poes', 'plagas', 'cebos'])) {
    return 'Reforzar POES con checklist diario y verificación de cierre.';
  }
  if (containsAny(text, ['mal estado', 'vencido'])) {
    return 'Reforzar control de recepción y segregación de producto no conforme.';
  }
  if (containsAny(text, ['no funciona', 'falla', 'equipo'])) {
    return 'Programar mantenimiento correctivo y control de funcionamiento previo al uso.';
  }
  if (containsAny(text, ['faltante'])) {
    return 'Implementar doble verificación diaria de stock y despacho.';
  }
  return 'Definir acción correctiva específica según causa raíz del incumplimiento.';
}

function classifyResponsibleByArea(areaClasificada = '') {
  const area = normalizeIncidentText(areaClasificada);
  if (containsAny(area, ['area fria', 'camara'])) return 'Jefe de cocina';
  if (containsAny(area, ['area caliente'])) return 'Jefe de cocina';
  if (containsAny(area, ['deposito'])) return 'Encargado de depósito';
  if (containsAny(area, ['logistica'])) return 'Responsable de logística';
  if (containsAny(area, ['banos', 'areas comunes'])) return 'Mantenimiento';
  if (containsAny(area, ['area de residuos'])) return 'Higiene / Sanitización';
  if (containsAny(area, ['lavadero'])) return 'Encargado de limpieza';
  return 'Responsable a definir';
}

function detectActionScenario(text) {
  if (containsAny(text, ['devolucion del cliente', 'devuelve'])) return 'devolucion_cliente';
  if (containsAny(text, ['mal estado', 'producto defectuoso', 'vencido'])) return 'producto_mal_estado';
  if (containsAny(text, ['faltaron almuerzos', 'faltante de mercaderia', 'faltante'])) return 'faltante';
  if (containsAny(text, ['demora', 'demorado', 'retraso'])) return 'demora';
  if (containsAny(text, ['agua caliente', 'sanitizacion', 'bachas'])) return 'falta_agua_caliente';
  if (containsAny(text, ['sucio', 'suciedad', 'restos de carne', 'sin limpiar'])) return 'sector_sucio';
  if (containsAny(text, ['equipo fuera de uso', 'fallando', 'falla', 'maquina'])) return 'equipo_fallando';
  if (containsAny(text, ['registro', 'registros incompletos', 'falta de firma', 'documentacion'])) return 'registros_incompletos';
  if (containsAny(text, ['falto', 'ausencia', 'personal'])) return 'ausencia_personal';
  if (containsAny(text, ['capacitacion', 'mejora', 'preventiva'])) return 'mejora_preventiva';
  return 'general';
}

function hasSubstantialOverlap(baseText, candidateText) {
  const base = normalizeIncidentText(baseText || '');
  const candidate = normalizeIncidentText(candidateText || '');
  if (!base || !candidate) return false;
  if (base === candidate) return true;
  if (candidate.includes(base) || base.includes(candidate)) return true;
  return false;
}

function buildActions({ resultadoClasificado, text, hallazgoDetectado, accionInmediataOriginal, accionCorrectivaOriginal }) {
  const immediateExisting = normalizeCellValue(accionInmediataOriginal).replace(/\bcalidad\b/gi, '').trim();
  const correctiveExistingRaw = normalizeCellValue(accionCorrectivaOriginal).trim();
  const scenario = detectActionScenario(text);
  const detectedImmediate = extractImmediateAction(text);
  const normalizedText = normalizeIncidentText(text);
  const hallazgoText = normalizeCellValue(hallazgoDetectado).trim();
  const looksCopiedFromFinding = hasSubstantialOverlap(hallazgoText, correctiveExistingRaw) || hasSubstantialOverlap(text, correctiveExistingRaw);
  const correctiveExisting = looksCopiedFromFinding ? '' : correctiveExistingRaw;

  const byScenario = {
    producto_mal_estado: {
      immediate: 'Retener el producto/lote afectado, impedir su uso y verificar si hubo despacho al cliente.',
      corrective: 'Revisar control de recepción, condiciones de almacenamiento y evaluación de proveedor.'
    },
    devolucion_cliente: {
      immediate: 'Registrar la devolución, aislar producto involucrado y evaluar riesgo sanitario.',
      corrective: 'Investigar causa raíz y reforzar controles de almacenamiento y despacho.'
    },
    faltante: {
      immediate: 'Verificar cantidad faltante, informar al cliente y coordinar reposición o compensación.',
      corrective: 'Implementar doble control de despacho y validación contra pedido/cliente.'
    },
    demora: {
      immediate: 'Informar al cliente el nuevo horario estimado y registrar la causa de la demora.',
      corrective: 'Analizar causa raíz de la demora y ajustar planificación de producción/distribución.'
    },
    equipo_fallando: {
      immediate: 'Retirar el equipo de uso, identificarlo como fuera de servicio y comunicar a mantenimiento.',
      corrective: 'Programar mantenimiento correctivo y definir plan de contingencia para reemplazo del equipo.'
    },
    falta_agua_caliente: {
      immediate: 'Suspender la sanitización afectada hasta restablecer el recurso o aplicar método alternativo validado.',
      corrective: 'Revisar mantenimiento preventivo del sistema de agua caliente y establecer contingencia documentada.'
    },
    sector_sucio: {
      immediate: 'Detener uso del sector, ejecutar limpieza y sanitización inmediata, y registrar verificación.',
      corrective: 'Reforzar POES, asignar responsable de cierre de turno y verificar limpieza con checklist.'
    },
    registros_incompletos: {
      immediate: 'Solicitar completar registros faltantes y verificar datos críticos del turno.',
      corrective: 'Implementar control diario de documentación y responsable de revisión por área.'
    },
    ausencia_personal: {
      immediate: 'Redistribuir tareas para sostener el servicio y evitar impacto operativo.',
      corrective: 'Definir plan de reemplazos y cobertura mínima por turno.'
    },
    mejora_preventiva: {
      immediate: 'Coordinar la implementación de la mejora preventiva acordada y registrar responsable.',
      corrective: 'Estandarizar la mejora en procedimiento/documentación y verificar su eficacia.'
    },
    general: {
      immediate: 'Contener el desvío identificado y registrar evidencia del evento.',
      corrective: 'Aplicar análisis de causa raíz, definir responsable y establecer seguimiento documentado.'
    }
  };

  if (resultadoClasificado === 'Conforme') {
    return {
      accionInmediata: removeDuplicateActionChunks(immediateExisting || detectedImmediate || ''),
      accionCorrectiva: ''
    };
  }

  if (resultadoClasificado !== 'No conforme') {
    return {
      accionInmediata: removeDuplicateActionChunks(immediateExisting || detectedImmediate || ''),
      accionCorrectiva: ''
    };
  }

  const specificCorrective = buildCorrectiveActionFromProblem(normalizedText);
  const correctiveBase = correctiveExisting || specificCorrective || byScenario[scenario].corrective;
  const immediateBase = immediateExisting || detectedImmediate || byScenario[scenario].immediate;

  return {
    accionInmediata: removeDuplicateActionChunks(immediateBase),
    accionCorrectiva: removeDuplicateActionChunks(correctiveBase)
  };
}

function classifyActionStatusFromRow({
  actividadRealizada,
  accion,
  numeroAccion,
  notaTecnica,
  resultadoClasificado,
  accionDetectada,
  accionInmediata,
  accionCorrectiva,
  fechaRegistro
}) {
  const sourceActionText = normalizeIncidentText([
    actividadRealizada,
    accion,
    numeroAccion,
    notaTecnica,
    accionDetectada
  ].join(' | '));

  const tieneNumeroAccion = Boolean(normalizeCellValue(numeroAccion).trim());
  const hasImplicitActionVerb = containsAny(sourceActionText, [
    'se solicita',
    'se coordina',
    'se realiza',
    'se entrega',
    'se pasa a',
    'se planifica',
    'se implementa',
    'se coloca',
    'se sube',
    'se subio',
    'se controla'
  ]);

  const hasProgressEvidence = containsAny(sourceActionText, [
    'se realizara',
    'pendiente',
    'se solicita',
    'se coordina'
  ]);

  const hasClosedEvidence = containsAny(sourceActionText, [
    'cumplido',
    'terminado',
    'finalizado',
    'queda terminado'
  ]);

  const hasExecutedEvidence = containsAny(sourceActionText, [
    'se realiza',
    'se entrega',
    'se coloca',
    'se sube',
    'se subio'
  ]);

  if (hasClosedEvidence) return 'cerrada';
  if (hasProgressEvidence) return 'en_proceso';
  if (hasExecutedEvidence) return 'cerrada';

  // "sin_accion" solo cuando no hay numero y no hay verbos de accion.
  if (!tieneNumeroAccion && !hasImplicitActionVerb) return 'sin_accion';

  if (tieneNumeroAccion || hasImplicitActionVerb) return 'en_proceso';
  return 'sin_accion';
}

function buildClassificationExplanation({
  areaClasificada,
  resultadoClasificado,
  iso22000,
  areaEvidence,
  outcomeReason
}) {
  const areaReason = areaEvidence?.length
    ? `Área asignada por palabras clave: ${areaEvidence.slice(0, 3).join(', ')}.`
    : 'Área inferida por contexto operativo.';

  const outcome = outcomeReason
    ? `Resultado ${resultadoClasificado} por señal: ${outcomeReason}.`
    : `Resultado clasificado como ${resultadoClasificado}.`;

  return `${areaReason} ${outcome} ISO asociado: ${iso22000}.`.trim();
}

function classifyConfidence({ areaEvidenceCount, resultadoClasificado, classificationText, areaClasificada }) {
  const text = normalizeIncidentText(classificationText);
  if (!text || areaClasificada === 'Área no identificada' || resultadoClasificado === 'Revisar manualmente') return 'Baja';
  if (areaEvidenceCount >= 2 && (resultadoClasificado === 'No conforme' || resultadoClasificado === 'Oportunidad de mejora')) return 'Alta';
  if (areaEvidenceCount >= 1) return 'Media';
  return 'Baja';
}

function composeAreaClasificada({ areaProcesoOriginal, areaOperativaDetectada }) {
  const detectedRaw = normalizeCellValue(areaOperativaDetectada || '').trim();
  const original = normalizeCellValue(areaProcesoOriginal || '').trim();
  const detectedAreas = sanitizeOperationalAreaList([detectedRaw]);
  const nonUnknownDetected = detectedAreas.filter((area) => area !== 'Área no identificada');
  if (nonUnknownDetected.length > 0) {
    return sortAreasByPriorityList(nonUnknownDetected).join(' / ');
  }

  const fallbackAreas = sanitizeOperationalAreaList([original]).filter((area) => area !== 'Área no identificada');
  if (fallbackAreas.length > 0) {
    return sortAreasByPriorityList(fallbackAreas).join(' / ');
  }

  return 'Área no identificada';
}

function normalizeBrunoArea(areaValue, contextText = '') {
  const raw = normalizeCellValue(areaValue || '').trim();
  const area = normalizeIncidentText(raw);
  const context = normalizeIncidentText(contextText || '');
  if (!area || containsAny(area, ['n/a', 'na', 'sin area', 'sin sector', 'no aplica'])) return '';

  if (containsAny(area, ['areas comunes', 'áreas comunes'])) return 'Áreas comunes';
  if (containsAny(area, ['zona fria', 'área fria', 'area fria'])) return 'Área fría';
  if (containsAny(area, ['zona caliente', 'área caliente', 'area caliente'])) return 'Área caliente';
  if (containsAny(area, ['area lavadero', 'lavadero'])) return 'Lavadero';
  if (containsAny(area, ['deposito', 'depósito'])) return 'Depósito';
  if (containsAny(area, ['vestuarios', 'banos', 'baños', 'vestuarios/baños'])) return 'Baños';
  if (containsAny(area, ['area residuos', 'área residuos', 'residuos'])) return 'Área de residuos';
  if (containsAny(area, ['area pre elaborado', 'pre elaborado', 'preelaborado'])) return 'Área de pre elaborados';
  if (containsAny(area, ['logistica', 'logística'])) return 'Logística';
  if (containsAny(area, ['callia', 'caliia'])) return 'Logística';
  if (containsAny(area, ['comedor'])) return 'Comedor';
  if (containsAny(area, ['armarios', 'armario'])) {
    if (containsAny(`${area} ${context}`, ['armario de banos', 'armario de baños', 'baños'])) return 'Baños';
    return 'Áreas comunes';
  }
  if (containsAny(area, ['camaras 1 y 2', 'cámaras 1 y 2'])) return 'Cámara 1 / Cámara 2';
  if (containsAny(area, ['camaras 3,4,5,6', 'cámaras 3,4,5,6', 'camaras 3 4 5 6', 'cámaras 3 4 5 6'])) {
    return 'Cámara 3 / Cámara 4 / Cámara 5 / Cámara 6';
  }
  const cameraNumbers = [...new Set((area.match(/\b[1-6]\b/g) || []))];
  if (containsAny(area, ['camara', 'cámara']) && cameraNumbers.length > 0) {
    return cameraNumbers.map((n) => `Cámara ${n}`).join(' / ');
  }

  return '';
}

function parseOriginalTipoDesvio(value) {
  const text = normalizeIncidentText(value || '');
  if (!text) return '';
  if (containsAny(text, ['n/a', 'na'])) return 'NA';
  if (containsAny(text, ['no conforme', 'nc'])) return 'NC';
  if (containsAny(text, ['obs', 'observacion', 'observación'])) return 'OBS';
  if (containsAny(text, ['om', 'oportunidad de mejora'])) return 'OM';
  return '';
}

function shouldRefineWithExpert({
  confianza,
  areaClasificada,
  resultadoClasificado,
  tipoDesvio,
  iso22000,
  accionInmediata,
  accionCorrectiva,
  fechaRegistro
}) {
  // Fuente de verdad: clasificación principal de analyzeExcel.js.
  // El refinador queda deshabilitado para evitar que pise resultados finales.
  return false;
}

function buildAnalysisText(record) {
  return normalizeForMatch([
    record.hallazgoDetectado,
    record.accionDetectada,
    record.descripcion,
    record.observaciones,
    record.tipoActividad,
    record.resultado,
    record.desvio,
    record.accion,
    record.accionInmediata,
    record.accionCorrectiva,
    record.numeroAccion,
    record.notaTecnica
  ].map(normalizeCellValue).join(' | '));
}

/**
 * Analiza un archivo Excel y clasifica desvios en base a reglas textuales objetivas.
 */
export async function analyzeExcel(fileBuffer, _businessRules, progressCallback = null) {
  const results = [];

  const summary = {
    totalRecords: 0,
    totalCases: 0,
    totalDesvios: 0,
    totalConformes: 0,
    totalRevisionManual: 0,
    totalNC: 0,
    totalOBS: 0,
    totalOM: 0,
    byArea: {},
    byTipo: {},
    byIso22000: {},
    actions: {
      abiertas: 0,
      cerradas: 0,
      enProceso: 0,
      sinAccion: 0
    },
    timestamp: new Date().toISOString()
  };

  try {
    progressCallback?.(10, 'Validando archivo...');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);

    if (workbook.worksheets.length === 0) {
      throw new Error('El archivo Excel no contiene hojas');
    }

    const sheet = selectBestWorksheet(workbook);
    if (!sheet) {
      throw new Error('No se pudo seleccionar una hoja valida para analizar');
    }
    const headerRowIndex = detectHeaderRowIndex(sheet);
    const headerValues = sheet.getRow(headerRowIndex).values || [];
    const rows = [];
    const headerIndexes = detectHeaders(headerValues);

    progressCallback?.(30, 'Leyendo datos del Excel...');
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRowIndex) return;
      rows.push(row.values);
    });

    if (rows.length === 0) {
      throw new Error('El archivo Excel no contiene registros (solo encabezados)');
    }

    const totalRows = rows.length;

    const contextState = {
      negativeLeadWindow: 0,
      leadTopicText: '',
      maxLeadWindow: 3
    };
    const fillDownState = {
      fecha: '',
      areaProceso: '',
      actividadRealizada: '',
      tipoActividad: '',
      responsableOriginal: '',
      iso22000Original: '',
      tipoDesvioOriginal: ''
    };

    rows.forEach((rowValues, index) => {
      progressCallback?.(
        40 + Math.floor((index / totalRows) * 40),
        `Clasificando registro ${index + 1} de ${totalRows}...`
      );

      const getValue = (headerIndex) => {
        const indexToUse = Number.isInteger(headerIndex) ? headerIndex : null;
        return indexToUse == null ? '' : rowValues?.[indexToUse];
      };

      const row = buildRowObjectFromExcel(headerValues, rowValues);
      const rowKeyMap = buildNormalizedRowKeyMap(row);
      const accionDetectada = getTextoAccion(row);

      const actividadRealizadaRaw = getRowValueByCandidates(row, rowKeyMap, [
        'Actividad realizada',
        'Actividad realizada / Descripción',
        'Actividad realizada / Descripcion'
      ]) || normalizeCellValue(getValue(headerIndexes.actividadRealizada));

      const tipoActividadRaw = getRowValueByCandidates(row, rowKeyMap, [
        'Tipo de actividad',
        'Tipo actividad'
      ]) || normalizeCellValue(getValue(headerIndexes.tipoActividad));

      const areaProcesoRaw = getRowValueByCandidates(row, rowKeyMap, [
        'Área / Proceso',
        'Area / Proceso',
        'Área / Sector',
        'Area / Sector',
        'Área/Proceso',
        'Area/Proceso',
        'Sector',
        'Area'
      ]) || normalizeCellValue(getValue(headerIndexes.areaProceso));

      const resultadoRaw = getRowValueByCandidates(row, rowKeyMap, [
        'Resultado'
      ]) || normalizeCellValue(getValue(headerIndexes.resultado));

      const desvioRaw = getRowValueByCandidates(row, rowKeyMap, [
        '¿Desvío?',
        '¿Desvio?',
        'Desvío',
        'Desvio'
      ]) || normalizeCellValue(getValue(headerIndexes.desvio));

      const accionRaw = getRowValueByCandidates(row, rowKeyMap, [
        '¿Acción?',
        '¿Accion?',
        'Acción',
        'Accion'
      ]) || normalizeCellValue(getValue(headerIndexes.accion));

      const numeroAccionRaw = getRowValueByCandidates(row, rowKeyMap, [
        'N° Acción',
        'N° Accion',
        'Nro Acción',
        'Nro Accion',
        'Numero accion'
      ]) || normalizeCellValue(getValue(headerIndexes.numeroAccion));

      const notaTecnicaRaw = getRowValueByCandidates(row, rowKeyMap, [
        'Nota técnica',
        'Nota tecnica'
      ]) || normalizeCellValue(getValue(headerIndexes.notaTecnica));

      const fechaRaw = normalizeCellValue(getRowValueByCandidates(row, rowKeyMap, [
        'Fecha',
        'Fecha del desvío',
        'Fecha del desvio',
        'Fecha de registro'
      ]) || getValue(headerIndexes.fecha)).trim();

      const responsableOriginalRaw = normalizeCellValue(getRowValueByCandidates(row, rowKeyMap, ['Responsable', 'Responsable asignado']) || '').trim();
      const iso22000OriginalRaw = normalizeCellValue(getRowValueByCandidates(row, rowKeyMap, [
        'ISO 22000',
        'Iso 22000',
        'ISO',
        'Clausula ISO',
        'Cláusula ISO'
      ]) || '').trim();
      const tipoDesvioOriginalRaw = normalizeCellValue(getRowValueByCandidates(row, rowKeyMap, [
        'Clasificacion del desvio',
        'Clasificación del desvío',
        'Clasificacion del desvío',
        'Clasificación del desvio',
        'Tipo desvio',
        'Tipo desvío',
        'Tipo',
        'Clasificación',
        'Clasificacion'
      ]) || '').trim();

      const desvioDetectadoOriginal = normalizeCellValue(getRowValueByCandidates(row, rowKeyMap, [
        'Desvío detectado',
        'Desvio detectado',
        'Hallazgo detectado',
        'Descripción del desvío',
        'Descripcion del desvio',
        'Detalle del desvío',
        'Detalle del desvio'
      ]) || '').trim();
      const areaOriginal = normalizeCellValue(areaProcesoRaw).trim();

      const fecha = fechaRaw || fillDownState.fecha;
      const areaProceso = normalizeCellValue(areaProcesoRaw).trim() || fillDownState.areaProceso;
      const actividadRealizada = normalizeCellValue(actividadRealizadaRaw).trim() || fillDownState.actividadRealizada;
      const tipoActividad = normalizeCellValue(tipoActividadRaw).trim() || fillDownState.tipoActividad;
      const resultado = normalizeCellValue(resultadoRaw).trim();
      const desvio = normalizeCellValue(desvioRaw).trim();
      const accion = normalizeCellValue(accionRaw).trim();
      const numeroAccion = normalizeCellValue(numeroAccionRaw).trim();
      const notaTecnica = normalizeCellValue(notaTecnicaRaw).trim();
      const responsableOriginal = responsableOriginalRaw || fillDownState.responsableOriginal;
      const iso22000Original = iso22000OriginalRaw || fillDownState.iso22000Original;
      const tipoDesvioOriginal = tipoDesvioOriginalRaw || fillDownState.tipoDesvioOriginal;

      if (fecha) fillDownState.fecha = fecha;
      if (areaProceso) fillDownState.areaProceso = areaProceso;
      if (actividadRealizada) fillDownState.actividadRealizada = actividadRealizada;
      if (tipoActividad) fillDownState.tipoActividad = tipoActividad;
      if (responsableOriginal) fillDownState.responsableOriginal = responsableOriginal;
      if (iso22000Original) fillDownState.iso22000Original = iso22000Original;
      if (tipoDesvioOriginal) fillDownState.tipoDesvioOriginal = tipoDesvioOriginal;

      // Logging temporal bajo flag para validar fill down sin ensuciar producción.
      const hasRealRowSignal = Boolean(
        normalizeCellValue(desvioDetectadoOriginal).trim() ||
        normalizeCellValue(areaOriginal).trim() ||
        normalizeCellValue(tipoDesvioOriginalRaw).trim()
      );
      const invalidDetectedFinding = isInvalidDetectedFinding(desvioDetectadoOriginal);

      // Regla dura: descartar filas vacías/ruido antes de construir registro.
      if (!hasRealRowSignal || invalidDetectedFinding) {
        if (ENABLE_FILLDOWN_TRACE) {
          console.log('[fill-down-discarded]', {
            index: index + 1,
            motivo: !hasRealRowSignal ? 'sin_senales_reales' : 'desvio_detectado_invalido',
            desvioDetectadoOriginal,
            areaOriginal,
            tipoDesvioOriginal: tipoDesvioOriginalRaw
          });
        }
        return;
      }

      const rawRecord = {
        fecha,
        areaProceso,
        actividadRealizada,
        descripcion: getRowValueByCandidates(row, rowKeyMap, [
          'Descripción',
          'Descripcion',
          'Descripción del desvío',
          'Descripcion del desvio',
          'Detalle del desvío',
          'Detalle del desvio'
        ]) || normalizeCellValue(getValue(headerIndexes.descripcion)),
        tipoActividad,
        resultado,
        desvio,
        accion,
        numeroAccion,
        notaTecnica,
        observaciones: getRowValueByCandidates(row, rowKeyMap, [
          'Observaciones',
          'Observación',
          'Observacion'
        ]) || normalizeCellValue(getValue(headerIndexes.observaciones)),
        accionInmediata: getRowValueByCandidates(row, rowKeyMap, [
          'Acción inmediata',
          'Accion inmediata'
        ]) || normalizeCellValue(getValue(headerIndexes.accionInmediata)),
        accionCorrectiva: getRowValueByCandidates(row, rowKeyMap, [
          'Acción Correctiva Propuesta',
          'Accion Correctiva Propuesta',
          'Acción correctiva propuesta',
          'Accion correctiva propuesta',
          'Acción correctiva',
          'Accion correctiva'
        ]) || normalizeCellValue(getValue(headerIndexes.accionCorrectiva)),
        responsableOriginal,
        iso22000Original,
        tipoDesvioOriginal,
        columnasOriginales: row || {},
        textoBase: actividadRealizada,
        // Evitamos fallback automático: si pasó validación, usamos el desvío detectado original.
        hallazgoDetectado: sanitizeHallazgo(desvioDetectadoOriginal),
        accionDetectada
      };
      rawRecord.accionInmediata = rawRecord.accionInmediata || getRowValueByCandidates(row, rowKeyMap, ['Acción inmediata', 'Accion inmediata']) || '';
      rawRecord.accionCorrectiva = rawRecord.accionCorrectiva || getRowValueByCandidates(row, rowKeyMap, [
        'Acción Correctiva Propuesta',
        'Accion Correctiva Propuesta',
        'Acción correctiva propuesta',
        'Accion correctiva propuesta',
        'Acción correctiva',
        'Accion correctiva'
      ]) || '';

      if (isRepeatedHeaderRow(rawRecord)) {
        return;
      }

      const actividadLimpia = normalizeCellValue(rawRecord.actividadRealizada).trim();
      const notaLimpia = normalizeCellValue(rawRecord.notaTecnica).trim();
      rawRecord.hallazgoDetectado = sanitizeHallazgo(rawRecord.hallazgoDetectado);
      const hallazgoSinInfo = normalizeForMatch(rawRecord.hallazgoDetectado) === normalizeForMatch('Sin hallazgo detectado');
      const notaNoAporta = !notaLimpia || notaLimpia.length <= 10 || esTextoAccion(notaLimpia);
      const casoVacio = !actividadLimpia && notaNoAporta;

      if (shouldUseAreaProcesoAsHallazgo({
        actividadRealizada: rawRecord.actividadRealizada,
        areaProceso: rawRecord.areaProceso,
        hallazgoDetectado: rawRecord.hallazgoDetectado
      })) {
        rawRecord.hallazgoDetectado = sanitizeHallazgo(rawRecord.areaProceso);
        rawRecord.areaProceso = 'Sin área/proceso original';
      }

      const textForClassification = buildClassificationText({
        areaProceso: rawRecord.areaProceso,
        actividadRealizada: rawRecord.actividadRealizada,
        hallazgoDetectado: rawRecord.hallazgoDetectado
      });
      const auditComplianceRule = classifyAuditCompliance(textForClassification);
      const explicitNegativeInRow = hasExplicitNegativeSignal(textForClassification);
      const neutralTechnicalRow = isNeutralTechnicalMention(textForClassification);
      const criticalSignalFromClassificationText = detectCriticalNegativeSignal(textForClassification);
      const criticalSignalFromHallazgo = detectCriticalNegativeSignal(rawRecord.hallazgoDetectado);
      const criticalSignal = criticalSignalFromClassificationText || criticalSignalFromHallazgo;
      const explicitNoFindingRow = isExplicitNoFindingText(textForClassification);
      const inheritedNegativeContext = contextState.negativeLeadWindow > 0 && neutralTechnicalRow && !explicitNoFindingRow;
      if (ENABLE_CLASSIFICATION_TRACE) {
        console.log('INPUT:', textForClassification);
      }
      const explicitAreaFromExcel = normalizeBrunoArea(rawRecord.areaProceso, textForClassification);

      let areaResult = detectAreasFromDescription(textForClassification, rawRecord.areaProceso);
      let areaClasificada = areaResult.areas.join(', ');
      let areaEvidence = areaResult.evidence;
      let { resultadoClasificado, tipoDesvio, reason: outcomeReason } = classifyOutcomeFromRow({
        resultado: rawRecord.resultado,
        desvio: rawRecord.desvio,
        descripcionDetectada: textForClassification,
        tipoActividad: rawRecord.tipoActividad,
        context: {
          inheritedNegativeContext
        }
      });
      let iso22000 = classifyIso22000FromDescription({
        areaClasificada,
        descripcionDetectada: rawRecord.hallazgoDetectado,
        resultadoClasificado,
        actividadRealizada: rawRecord.actividadRealizada
      });
      if (explicitAreaFromExcel) {
        areaClasificada = explicitAreaFromExcel;
        areaEvidence = ['área/sector explícito informado en Excel'];
      }

      if (hallazgoSinInfo) {
        const actividadUtil = normalizeCellValue(rawRecord.actividadRealizada).trim();
        if (actividadUtil && !isTextoNoValidoHallazgo(actividadUtil)) {
          // Regla: si no hay hallazgo útil, usar actividad como hallazgo detectado.
          rawRecord.hallazgoDetectado = sanitizeHallazgo(actividadUtil);
          const textFallbackActividad = buildClassificationText({
            areaProceso: rawRecord.areaProceso,
            actividadRealizada: rawRecord.actividadRealizada,
            hallazgoDetectado: rawRecord.hallazgoDetectado
          });
          areaResult = detectAreasFromDescription(textFallbackActividad, rawRecord.areaProceso);
          areaClasificada = areaResult.areas.join(', ');
          areaEvidence = areaResult.evidence;
          iso22000 = classifyIso22000FromDescription({
            areaClasificada,
            descripcionDetectada: rawRecord.hallazgoDetectado,
            resultadoClasificado,
            actividadRealizada: rawRecord.actividadRealizada
          });
        } else {
          rawRecord.hallazgoDetectado = 'Sin hallazgo detectado';
          areaClasificada = 'Área no identificada';
          areaEvidence = ['sin hallazgo útil'];
        }
      }

      const keepAsOperationalFinding = hasOperationalDeviationSignal(rawRecord.hallazgoDetectado);
      if (casoVacio && !keepAsOperationalFinding) {
        rawRecord.hallazgoDetectado = 'Sin hallazgo detectado';
        areaClasificada = 'Área no identificada';
        resultadoClasificado = 'Revisar manualmente';
        tipoDesvio = '-';
        iso22000 = 'Revisar manualmente';
        areaEvidence = ['texto vacío'];
        outcomeReason = 'sin información suficiente';
      }

      const operationalOverride = applyOperationalOverrides({
        hallazgoDetectado: rawRecord.hallazgoDetectado,
        areaClasificada,
        resultadoClasificado,
        tipoDesvio,
        iso22000
      });
      areaClasificada = operationalOverride.areaClasificada;
      resultadoClasificado = operationalOverride.resultadoClasificado;
      tipoDesvio = operationalOverride.tipoDesvio;
      iso22000 = operationalOverride.iso22000;
      if (explicitAreaFromExcel) {
        areaClasificada = explicitAreaFromExcel;
      }

      const tipoOriginal = parseOriginalTipoDesvio(rawRecord.tipoDesvioOriginal || rawRecord.resultado);
      const hasStrongNeutralEvidence = neutralTechnicalRow && !explicitNegativeInRow && !inheritedNegativeContext;
      if (tipoOriginal === 'NC') {
        if (explicitNegativeInRow || inheritedNegativeContext || !hasStrongNeutralEvidence) {
          resultadoClasificado = 'No conforme';
          tipoDesvio = 'NC';
          outcomeReason = 'Resultado original del Excel aplicado (NC)';
        } else {
          resultadoClasificado = 'Conforme';
          tipoDesvio = '-';
          outcomeReason = 'texto técnico neutro; se evita override NC ambiguo del Excel';
        }
      } else if (tipoOriginal === 'OBS') {
        if (!criticalSignal) {
          resultadoClasificado = 'Observación';
          tipoDesvio = 'OBS';
          outcomeReason = 'OBS por tipo original y señal leve';
        } else {
          outcomeReason = `Tipo original del Excel ignorado por señal crítica: ${criticalSignal}`;
        }
      } else if (tipoOriginal === 'OM') {
        resultadoClasificado = 'Oportunidad de mejora';
        tipoDesvio = 'OM';
        outcomeReason = 'Resultado original del Excel aplicado (OM)';
      } else if (tipoOriginal === 'NA') {
        if (!criticalSignal) {
          resultadoClasificado = 'Conforme';
          tipoDesvio = '-';
          outcomeReason = 'Resultado original del Excel aplicado (NA)';
        } else {
          outcomeReason = `Tipo original del Excel ignorado por señal crítica: ${criticalSignal}`;
        }
      }

      // Prioridad obligatoria: auditoría + cumplimiento porcentual prevalece sobre overrides del Excel.
      if (auditComplianceRule) {
        resultadoClasificado = auditComplianceRule.classification;
        tipoDesvio = auditComplianceRule.tipoDesvio;
        outcomeReason = auditComplianceRule.reason;
      }

      if (criticalSignal && !explicitNoFindingRow) {
        resultadoClasificado = 'No conforme';
        tipoDesvio = 'NC';
        outcomeReason = `NC por señal crítica: ${criticalSignal}`;
      }

      if (normalizeCellValue(rawRecord.iso22000Original).trim()) {
        iso22000 = normalizeCellValue(rawRecord.iso22000Original).trim();
        if (!outcomeReason) outcomeReason = 'ISO original del Excel aplicado';
      }
      iso22000 = resolveIsoWithContextFallback({
        iso22000,
        hallazgoDetectado: rawRecord.hallazgoDetectado,
        actividadRealizada: rawRecord.actividadRealizada,
        areaClasificada,
        resultadoClasificado
      });

      const normalizedRule = classifyNormalizedRule(textForClassification);
      if (normalizedRule) {
        resultadoClasificado = normalizedRule.resultadoClasificado;
        tipoDesvio = normalizedRule.tipoDesvio;
        iso22000 = normalizedRule.iso22000;
        outcomeReason = normalizedRule.reason;
      }

      const priorityOperationalRule = classifyPriorityOperationalRule(textForClassification);
      if (priorityOperationalRule && !normalizedRule) {
        resultadoClasificado = priorityOperationalRule.resultadoClasificado;
        tipoDesvio = priorityOperationalRule.tipoDesvio;
        iso22000 = priorityOperationalRule.iso22000;
        outcomeReason = priorityOperationalRule.reason;
      }

      const technicalControlRule = classifyTechnicalControlRule(textForClassification);
      if (technicalControlRule && !priorityOperationalRule && !normalizedRule) {
        resultadoClasificado = technicalControlRule.resultadoClasificado;
        tipoDesvio = technicalControlRule.tipoDesvio;
        iso22000 = technicalControlRule.iso22000;
        outcomeReason = technicalControlRule.reason;
      }

      const actions = buildActions({
        resultadoClasificado,
        text: textForClassification,
        hallazgoDetectado: rawRecord.hallazgoDetectado,
        accionInmediataOriginal: rawRecord.accionInmediata,
        accionCorrectivaOriginal: rawRecord.accionCorrectiva
      });
      rawRecord.accionInmediata = actions.accionInmediata;
      rawRecord.accionCorrectiva = actions.accionCorrectiva;
      if (ENABLE_CLASSIFICATION_TRACE) {
        console.log('RESULTADO CLASIFICADO:', {
          row: index + 1,
          resultadoClasificado,
          tipoDesvio,
          areaClasificada,
          iso22000
        });
      }

      const finalAuditRule = classifyAuditCompliance([
        textForClassification,
        rawRecord.hallazgoDetectado,
        rawRecord.actividadRealizada
      ].join(' | '));
      if (finalAuditRule && finalAuditRule.classification === 'No conforme') {
        resultadoClasificado = 'No conforme';
        tipoDesvio = 'NC';
        iso22000 = '9.2 Auditoría interna';
        outcomeReason = 'NC por auditoría con cumplimiento menor a 70%';
      }

      const preExplicacionClasificacion = buildClassificationExplanation({
        areaClasificada,
        resultadoClasificado,
        iso22000,
        areaEvidence,
        outcomeReason
      });
      const preConfianza = classifyConfidence({
        areaEvidenceCount: areaEvidence.length,
        resultadoClasificado,
        classificationText: textForClassification,
        areaClasificada
      });

      const refinadoPorIA = false;

      const areaOperativaClasificada = areaClasificada;
      let areaClasificadaFinal = composeAreaClasificada({
        areaProcesoOriginal: rawRecord.areaProceso,
        areaOperativaDetectada: areaOperativaClasificada
      });
      const isAuditText = containsAny(normalizeIncidentText(textForClassification), ['auditoria', 'auditoría']);
      if (isAuditText) {
        areaClasificadaFinal = 'Área no identificada';
      }
      const responsable = normalizeCellValue(rawRecord.responsableOriginal).trim() || classifyResponsibleByArea(areaClasificadaFinal);

      const estadoAccion = classifyActionStatusFromRow({
        actividadRealizada: rawRecord.actividadRealizada,
        accion: rawRecord.accion,
        numeroAccion: rawRecord.numeroAccion,
        notaTecnica: rawRecord.notaTecnica,
        resultadoClasificado,
        accionDetectada: rawRecord.accionDetectada,
        accionInmediata: rawRecord.accionInmediata,
        accionCorrectiva: rawRecord.accionCorrectiva,
        fechaRegistro: rawRecord.fecha
      });

      const explicacionClasificacion = preExplicacionClasificacion;
      const confianza = preConfianza;

      const analisisTexto = buildAnalysisText(rawRecord);

      const finalRecord = validateFinalRecord({
        fecha: rawRecord.fecha || '',
        areaProceso: rawRecord.areaProceso || 'N/A',
        actividadRealizada: rawRecord.actividadRealizada || '',
        descripcion: rawRecord.descripcion || '',
        hallazgoDetectado: rawRecord.hallazgoDetectado || '',
        accionDetectada: rawRecord.accionDetectada || '',
        observaciones: rawRecord.observaciones || '',
        tipoActividad: rawRecord.tipoActividad || '',
        resultado: rawRecord.resultado || '',
        desvio: rawRecord.desvio || '',
        accion: rawRecord.accion || '',
        accionInmediata: rawRecord.accionInmediata || '',
        accionCorrectiva: rawRecord.accionCorrectiva || '',
        numeroAccion: rawRecord.numeroAccion || '',
        notaTecnica: rawRecord.notaTecnica || '',
        columnasOriginales: rawRecord.columnasOriginales || {},
        areaClasificada: areaClasificadaFinal,
        resultadoClasificado,
        tipoDesvio,
        iso22000,
        responsable,
        estadoAccion,
        refinadoPorIA,
        explicacionClasificacion,
        confianza,
        analisisTexto
      });

      // El resumen debe reflejar exactamente lo que se muestra en tabla.
      const finalResultado = normalizeCellValue(finalRecord.resultadoClasificado).trim();
      const finalTipo = normalizeCellValue(finalRecord.tipoDesvio).trim();
      const finalIso = normalizeCellValue(finalRecord.iso22000).trim() || 'Revisar manualmente';
      const finalEstadoAccion = normalizeCellValue(finalRecord.estadoAccion).trim();
      const isConforme = finalResultado === 'Conforme';
      const isRevisionManual = finalResultado === 'Revisar manualmente';
      const isDesvio = finalTipo === 'NC' || finalTipo === 'OBS' || finalTipo === 'OM';

      summary.totalRecords += 1;
      if (isConforme) summary.totalConformes += 1;
      if (isRevisionManual) summary.totalRevisionManual += 1;
      if (isDesvio) {
        summary.totalDesvios += 1;
        const areasForSummary = normalizeCellValue(finalRecord.areaClasificada)
          .split(',')
          .flatMap((value) => value.split('/'))
          .map((value) => value.trim())
          .filter(Boolean);
        const uniqueAreasForSummary = [...new Set(sanitizeOperationalAreaList(areasForSummary))];
        uniqueAreasForSummary.forEach((areaItem) => {
          summary.byArea[areaItem] = (summary.byArea[areaItem] || 0) + 1;
        });
        summary.byIso22000[finalIso] = (summary.byIso22000[finalIso] || 0) + 1;
        summary.byTipo[finalTipo] = (summary.byTipo[finalTipo] || 0) + 1;
      }

      if (finalTipo === 'NC') summary.totalNC += 1;
      if (finalTipo === 'OBS') summary.totalOBS += 1;
      if (finalTipo === 'OM') summary.totalOM += 1;

      if (finalEstadoAccion === 'abierta') summary.actions.abiertas += 1;
      if (finalEstadoAccion === 'cerrada') summary.actions.cerradas += 1;
      if (finalEstadoAccion === 'en_proceso') summary.actions.enProceso += 1;
      if (finalEstadoAccion === 'sin_accion') summary.actions.sinAccion += 1;

      results.push(finalRecord);
      console.log('FINAL RECORD:', finalRecord);

      const shouldOpenNegativeLead = hasRowContinuationSignal(rawRecord.hallazgoDetectado)
        && (explicitNegativeInRow || /falta\s*[;:,]?\s*$/i.test(normalizeCellValue(rawRecord.hallazgoDetectado)));
      if (explicitNoFindingRow) {
        contextState.negativeLeadWindow = 0;
        contextState.leadTopicText = '';
      } else if (shouldOpenNegativeLead) {
        contextState.negativeLeadWindow = contextState.maxLeadWindow;
        contextState.leadTopicText = normalizeIncidentText(textForClassification);
      } else if (contextState.negativeLeadWindow > 0) {
        const rowHasOwnCompleteSignal = explicitNegativeInRow || !neutralTechnicalRow;
        if (rowHasOwnCompleteSignal) {
          contextState.negativeLeadWindow = 0;
          contextState.leadTopicText = '';
        } else {
          contextState.negativeLeadWindow -= 1;
        }
      }
    });

    const cases = classifyDeviationCasesFromRecords(results);
    summary.totalCases = cases.length;

    progressCallback?.(95, 'Generando resumen...');
    progressCallback?.(100, 'Analisis completado');

    return {
      success: true,
      records: results,
      cases,
      summary
    };
  } catch (error) {
    progressCallback?.(0, `Error: ${error.message}`);
    return {
      success: false,
      error: error.message,
      records: [],
      summary: null
    };
  }
}

/**
 * Detecta encabezados del Excel con aliases para gestion diaria y reunion de desvios.
 */
export function detectHeaders(headerRow) {
  const headers = {};
  const headerValues = headerRow || [];

  const mapping = {
    fecha: ['fecha', 'date', 'fecha de registro', 'fecha del evento'],
    areaProceso: ['area', 'area / proceso', 'area/proceso', 'proceso', 'sector', 'departamento'],
    actividadRealizada: ['actividad realizada', 'actividad realizada / descripcion', 'actividad realizada / descripción'],
    descripcion: ['descripcion del desvio', 'descripcion desvio', 'descripcion', 'detalle del desvio', 'detalle desvio', 'hallazgo'],
    observaciones: ['observaciones', 'observacion', 'comentario', 'comentarios'],
    tipoActividad: ['tipo de actividad', 'tipo actividad', 'clasificacion', 'classification'],
    resultado: ['resultado', 'estado', 'resultado obtenido'],
    desvio: ['desvio', 'desvio?', 'desvio ?', '¿desvio?', '¿desvio ?', 'hay desvio', 'no conformidad'],
    accion: ['accion', 'accion?', 'accion ?', '¿accion?', '¿accion ?', 'plan de accion'],
    accionInmediata: ['accion inmediata', 'acción inmediata'],
    accionCorrectiva: ['accion correctiva', 'acción correctiva'],
    numeroAccion: ['n accion', 'n° accion', 'nro accion', 'numero accion', 'id accion'],
    notaTecnica: ['nota tecnica', 'nota', 'detalle tecnico']
  };

  const scoreHeaderMatch = (headerValue, aliasValue) => {
    if (headerValue === aliasValue) return 100;
    if (headerValue.startsWith(`${aliasValue} `) || headerValue.startsWith(`${aliasValue} /`) || headerValue.startsWith(`${aliasValue} (`)) return 80;
    if (headerValue.includes(aliasValue)) return 40;
    return 0;
  };

  for (const [key, aliases] of Object.entries(mapping)) {
    let bestIndex = undefined;
    let bestScore = 0;

    for (let i = 0; i < headerValues.length; i += 1) {
      const headerValue = normalizeForMatch(headerValues[i] || '');
      for (const alias of aliases) {
        const aliasNorm = normalizeForMatch(alias);
        const score = scoreHeaderMatch(headerValue, aliasNorm);
        if (score > bestScore) {
          bestScore = score;
          bestIndex = i;
        }
      }
    }

    if (Number.isInteger(bestIndex)) {
      headers[key] = bestIndex;
    }
  }

  return headers;
}

export { OPERATIVE_AREAS };

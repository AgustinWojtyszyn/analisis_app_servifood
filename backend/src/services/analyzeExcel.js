import ExcelJS from 'exceljs';

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
    t.startsWith('se evalu') ||
    t.startsWith('se incorpora') ||
    t.startsWith('se realiza seguimiento') ||
    t.includes('plan de accion') ||
    t.includes('cumplimiento')
  );
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
  return value;
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
    return porHeader[0].value;
  }

  const porTexto = candidatos.filter((item) => esTextoAccion(item.valueNorm));
  if (porTexto.length > 0) {
    porTexto.sort((a, b) => b.value.length - a.value.length);
    return porTexto[0].value;
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
  return unique.map((n) => `Cámara ${n}`);
}

function detectAreasFromDescription(descripcionDetectada) {
  const hallazgo = normalizeForMatch(descripcionDetectada || '');
  if (!hallazgo || hallazgo === normalizeForMatch('Sin hallazgo detectado')) return ['Área no identificada'];

  const areas = new Set();
  const includes = (value) => hallazgo.includes(value);
  const hasWord = (value) => new RegExp(`\\b${value}\\b`).test(hallazgo);

  const camaras = extractCamaras(hallazgo);
  camaras.forEach((cam) => areas.add(cam));
  if (includes('camara') && camaras.length === 0) {
    areas.add('Área fría');
  }

  if (includes('heladera') || /\baf\b/.test(hallazgo)) areas.add('Área fría');
  if ((includes('heladera') && /\bac\b/.test(hallazgo)) || /\bac\b/.test(hallazgo)) areas.add('Área caliente');

  if (includes('banos') || includes('vestuarios')) areas.add('Baños');
  if (includes('comedor')) areas.add('Comedor');

  const hasLogisticaSignal = (
    includes('movilidades') ||
    includes('camion') ||
    includes('despacho') ||
    includes('transporte') ||
    includes('reparto') ||
    includes('entrega') ||
    includes('remito') ||
    includes('ruta')
  );

  if (hasLogisticaSignal) areas.add('Logística');

  const hasDeposito = includes('deposito');
  const depositoSoloContexto = includes('encargado de deposito') && hasLogisticaSignal;
  if (hasDeposito && !depositoSoloContexto) {
    areas.add('Depósito');
  }

  if (
    includes('espacio exterior') ||
    includes('exterior') ||
    includes('pasillo') ||
    includes('aberturas') ||
    includes('vidrios') ||
    includes('pared') ||
    includes('piso')
  ) {
    areas.add('Áreas comunes');
  }

  if (includes('residuos') || includes('basura') || includes('tacho') || includes('contenedor')) {
    areas.add('Área de residuos');
  }

  if (includes('lavadero') || includes('bacha') || includes('utensilios') || includes('vajilla') || includes('ollas') || includes('bandejas')) {
    areas.add('Lavadero');
  }

  if (includes('pre elaborados') || includes('preelaborados') || includes('pre elaborado') || includes('pre-elaborados') || includes('mise en place')) {
    areas.add('Área de pre elaborados');
  }

  const uniqueAreas = [...areas].filter((area) => OPERATIVE_AREAS.includes(area));
  if (uniqueAreas.length === 0) return ['Área no identificada'];

  const sorted = uniqueAreas.sort((a, b) => OPERATIVE_AREAS.indexOf(a) - OPERATIVE_AREAS.indexOf(b));
  return sorted;
}

function classifyOutcomeFromRow({ resultado, desvio, descripcionDetectada }) {
  const resultadoNorm = normalizeForMatch(resultado);
  const desvioSi = isYesLike(desvio);
  const text = normalizeForMatch(descripcionDetectada || '');
  const mejoraSignal = containsAny(text, OM_KEYWORDS) || containsAny(text, ['mejora', 'oportunidad de mejora', 'optimizar', 'propuesta']);

  if (resultadoNorm === 'no conforme' || desvioSi) {
    return { resultadoClasificado: 'No conforme', tipoDesvio: 'NC' };
  }

  if (resultadoNorm === 'conforme' && mejoraSignal) {
    return { resultadoClasificado: 'Oportunidad de mejora', tipoDesvio: 'OM' };
  }

  if (resultadoNorm === 'conforme') {
    return { resultadoClasificado: 'Conforme', tipoDesvio: '-' };
  }

  return {
    resultadoClasificado: 'Revisar manualmente',
    tipoDesvio: '-'
  };
}

function classifyIso22000FromDescription({ areaClasificada, descripcionDetectada, tipoDesvio, resultadoClasificado, actividadRealizada }) {
  const text = normalizeForMatch([
    descripcionDetectada,
    areaClasificada,
    tipoDesvio,
    actividadRealizada
  ].join(' | '));

  if (!text) {
    return 'Sin clasificar';
  }

  if (containsAny(text, ['auditoria interna', 'auditoria'])) {
    return '9.2 Auditoria interna';
  }

  // Prioridad 1: capacitación
  if (containsAny(text, ['capacitacion', 'capacita', 'formacion', 'entrenamiento'])) {
    return '7.2 Competencia / capacitacion';
  }

  // Prioridad 2: información documentada
  if (containsAny(text, ['drive', 'documentacion', 'documento', 'registro', 'planilla', 'manual', 'certificado'])) {
    return '7.5 Informacion documentada';
  }

  // Prioridad 3: control de peligros
  if (containsAny(text, ['camara', 'heladera', 'temperatura'])) {
    return '8.5 Control de peligros / HACCP / OPRP / PCC';
  }

  // Prioridad 4: PRP / POES / BPM
  if (containsAny(text, ['limpieza', 'sucio', 'poes', 'bpm'])) {
    return '8.2 Programas prerrequisito / POES / BPM';
  }

  if (containsAny(text, ['plan de accion', 'no conforme'])) {
    return '10.2 No conformidad y accion correctiva';
  }

  // Nunca dejar "Sin clasificar" si hay texto útil.
  if (text && text !== normalizeForMatch('sin hallazgo detectado')) {
    return '9.1 Seguimiento, medicion, analisis y evaluacion';
  }

  return 'Sin clasificar';
}

function classifyActionStatusFromRow({ accion, numeroAccion, notaTecnica, resultado, accionDetectada }) {
  const actionText = normalizeForMatch([
    accion,
    numeroAccion,
    notaTecnica,
    accionDetectada
  ].map(normalizeCellValue).join(' | '));

  const accionMarcada = isYesLike(accion);
  const tieneNumeroAccion = Boolean(normalizeCellValue(numeroAccion).trim());
  const notaCumplido = /\bcumplid[oa]s?\b/.test(normalizeForMatch(notaTecnica));

  if (accionMarcada && tieneNumeroAccion) return 'abierta';
  if (isConformeLike(resultado) && notaCumplido) return accionMarcada ? 'cerrada' : 'sin_accion';
  if (!accionMarcada && isConformeLike(resultado)) return 'sin_accion';
  if (!actionText) return 'sin_accion';

  if (containsAny(actionText, ['cerrada', 'cerrado', 'finalizada', 'finalizado', 'completa', 'completada', 'implementada', 'verificada'])) {
    return 'cerrada';
  }

  if (containsAny(actionText, ['en proceso', 'en curso', 'proceso', 'seguimiento', 'avance', 'en desarrollo'])) {
    return 'en_proceso';
  }

  if (containsAny(actionText, ['abierta', 'abierto', 'pendiente', 'sin iniciar', 'por hacer'])) {
    return 'abierta';
  }

  return 'abierta';
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
    totalDesvios: 0,
    totalConformes: 0,
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

    rows.forEach((rowValues, index) => {
      progressCallback?.(
        40 + Math.floor((index / totalRows) * 40),
        `Clasificando registro ${index + 1} de ${totalRows}...`
      );

      const getValue = (headerIndex, fallbackIndex) => {
        const indexToUse = Number.isInteger(headerIndex) ? headerIndex : fallbackIndex;
        return indexToUse == null ? '' : rowValues?.[indexToUse];
      };

      const row = buildRowObjectFromExcel(headerValues, rowValues);
      const rowKeyMap = buildNormalizedRowKeyMap(row);
      const accionDetectada = getTextoAccion(row);

      const actividadRealizada = getRowValueByCandidates(row, rowKeyMap, [
        'Actividad realizada',
        'Actividad realizada / Descripción',
        'Actividad realizada / Descripcion'
      ]) || normalizeCellValue(getValue(headerIndexes.actividadRealizada, 3));

      const tipoActividad = getRowValueByCandidates(row, rowKeyMap, [
        'Tipo de actividad',
        'Tipo actividad'
      ]) || normalizeCellValue(getValue(headerIndexes.tipoActividad, 5));

      const areaProceso = getRowValueByCandidates(row, rowKeyMap, [
        'Área / Proceso',
        'Area / Proceso',
        'Área/Proceso',
        'Area/Proceso'
      ]) || normalizeCellValue(getValue(headerIndexes.areaProceso, 2));

      const resultado = getRowValueByCandidates(row, rowKeyMap, [
        'Resultado'
      ]) || normalizeCellValue(getValue(headerIndexes.resultado, 6));

      const desvio = getRowValueByCandidates(row, rowKeyMap, [
        '¿Desvío?',
        '¿Desvio?',
        'Desvío',
        'Desvio'
      ]) || normalizeCellValue(getValue(headerIndexes.desvio, 7));

      const accion = getRowValueByCandidates(row, rowKeyMap, [
        '¿Acción?',
        '¿Accion?',
        'Acción',
        'Accion'
      ]) || normalizeCellValue(getValue(headerIndexes.accion, 8));

      const numeroAccion = getRowValueByCandidates(row, rowKeyMap, [
        'N° Acción',
        'N° Accion',
        'Nro Acción',
        'Nro Accion',
        'Numero accion'
      ]) || normalizeCellValue(getValue(headerIndexes.numeroAccion, 9));

      const notaTecnica = getRowValueByCandidates(row, rowKeyMap, [
        'Nota técnica',
        'Nota tecnica'
      ]) || normalizeCellValue(getValue(headerIndexes.notaTecnica, 10));

      const rawRecord = {
        fecha: normalizeCellValue(getValue(headerIndexes.fecha, 1)),
        areaProceso,
        actividadRealizada,
        descripcion: normalizeCellValue(getValue(headerIndexes.descripcion, 4)),
        tipoActividad,
        resultado,
        desvio,
        accion,
        numeroAccion,
        notaTecnica,
        observaciones: normalizeCellValue(getValue(headerIndexes.observaciones, 11)),
        accionInmediata: normalizeCellValue(getValue(headerIndexes.accionInmediata, 12)),
        accionCorrectiva: normalizeCellValue(getValue(headerIndexes.accionCorrectiva, 13)),
        textoBase: actividadRealizada,
        hallazgoDetectado: getTextoHallazgo(row, {
          actividadRealizada,
          notaTecnica,
          desvio,
          resultado
        }),
        accionDetectada
      };

      const actividadLimpia = normalizeCellValue(rawRecord.actividadRealizada).trim();
      const notaLimpia = normalizeCellValue(rawRecord.notaTecnica).trim();
      rawRecord.hallazgoDetectado = sanitizeHallazgo(rawRecord.hallazgoDetectado);
      const hallazgoSinInfo = normalizeForMatch(rawRecord.hallazgoDetectado) === normalizeForMatch('Sin hallazgo detectado');
      const notaNoAporta = !notaLimpia || notaLimpia.length <= 10 || esTextoAccion(notaLimpia);
      const casoVacio = !actividadLimpia && notaNoAporta;

      let areaClasificada = detectAreasFromDescription(rawRecord.hallazgoDetectado).join(', ');
      let { resultadoClasificado, tipoDesvio } = classifyOutcomeFromRow({
        resultado: rawRecord.resultado,
        desvio: rawRecord.desvio,
        descripcionDetectada: rawRecord.hallazgoDetectado
      });
      let iso22000 = classifyIso22000FromDescription({
        areaClasificada,
        descripcionDetectada: rawRecord.hallazgoDetectado,
        tipoDesvio,
        resultadoClasificado,
        actividadRealizada: rawRecord.actividadRealizada  // Pasar actividad para clasificación ISO
      });
      let estadoAccion = classifyActionStatusFromRow({
        accion: rawRecord.accion,
        numeroAccion: rawRecord.numeroAccion,
        notaTecnica: rawRecord.notaTecnica,
        resultado: rawRecord.resultado,
        accionDetectada: rawRecord.accionDetectada
      });

      if (hallazgoSinInfo) {
        const esNcODetectado = isNoConformeLike(rawRecord.resultado) || isYesLike(rawRecord.desvio);
        const actividadUtil = normalizeCellValue(rawRecord.actividadRealizada).trim();
        if (esNcODetectado && actividadUtil && !isTextoNoValidoHallazgo(actividadUtil)) {
          rawRecord.hallazgoDetectado = sanitizeHallazgo(actividadUtil);
          areaClasificada = detectAreasFromDescription(rawRecord.hallazgoDetectado).join(', ');
          iso22000 = classifyIso22000FromDescription({
            areaClasificada,
            descripcionDetectada: rawRecord.hallazgoDetectado,
            tipoDesvio,
            resultadoClasificado,
            actividadRealizada: rawRecord.actividadRealizada
          });
        } else {
          rawRecord.hallazgoDetectado = 'Sin hallazgo detectado';
          areaClasificada = 'Área no identificada';
        }
      }

      if (casoVacio) {
        rawRecord.hallazgoDetectado = 'Sin hallazgo detectado';
        areaClasificada = 'Área no identificada';
        resultadoClasificado = 'Revisar manualmente';
        tipoDesvio = '-';
        iso22000 = 'Sin clasificar';
        estadoAccion = 'sin_accion';
      }

      console.log({
        actividad: row['Actividad realizada'],
        nota: row['Nota técnica'],
        hallazgoDetectado: rawRecord.hallazgoDetectado,
        areaClasificada,
        iso22000
      });

      const analisisTexto = buildAnalysisText(rawRecord);

      const isDesvio = resultadoClasificado !== 'Conforme' && resultadoClasificado !== 'Revisar manualmente';

      summary.totalRecords += 1;
      if (isDesvio) {
        summary.totalDesvios += 1;
        const areasForSummary = areaClasificada
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean);
        const uniqueAreasForSummary = [...new Set(areasForSummary.length ? areasForSummary : ['Área no identificada'])];
        uniqueAreasForSummary.forEach((areaItem) => {
          summary.byArea[areaItem] = (summary.byArea[areaItem] || 0) + 1;
        });
        summary.byIso22000[iso22000] = (summary.byIso22000[iso22000] || 0) + 1;

        if (tipoDesvio && tipoDesvio !== '-') {
          summary.byTipo[tipoDesvio] = (summary.byTipo[tipoDesvio] || 0) + 1;
        }
      } else {
        summary.totalConformes += 1;
      }

      if (tipoDesvio === 'NC') summary.totalNC += 1;
      if (tipoDesvio === 'OBS') summary.totalOBS += 1;
      if (tipoDesvio === 'OM') summary.totalOM += 1;

      if (estadoAccion === 'abierta') summary.actions.abiertas += 1;
      if (estadoAccion === 'cerrada') summary.actions.cerradas += 1;
      if (estadoAccion === 'en_proceso') summary.actions.enProceso += 1;
      if (estadoAccion === 'sin_accion') summary.actions.sinAccion += 1;

      results.push({
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
        areaClasificada,
        resultadoClasificado,
        tipoDesvio,
        iso22000,
        estadoAccion,
        analisisTexto
      });
    });

    progressCallback?.(95, 'Generando resumen...');
    progressCallback?.(100, 'Analisis completado');

    return {
      success: true,
      records: results,
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

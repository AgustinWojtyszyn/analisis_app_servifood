import ExcelJS from 'exceljs';

const SEVERITY_POINTS = {
  baja: 1,
  media: 2,
  alta: 3
};

const INTERNAL_DEFAULT_RULES = [
  {
    nombre: 'Control de cadena de frío',
    categoria: 'inocuidad',
    origen: 'interno',
    gravedad: 'alta',
    keywords: ['temperatura', 'camara', 'cámara', 'heladera', 'cadena de frio', 'vencido'],
    accion_inmediata: 'Bloquear lote y notificar responsable de inocuidad',
    accion_correctiva: 'Revisar cadena de frío y registrar acciones correctivas'
  },
  {
    nombre: 'Contaminación y plagas',
    categoria: 'inocuidad',
    origen: 'interno',
    gravedad: 'alta',
    keywords: ['contaminacion', 'plaga', 'inocuidad', 'riesgo'],
    accion_inmediata: 'Aislar área afectada y detener operación comprometida',
    accion_correctiva: 'Implementar plan de saneamiento y verificación'
  },
  {
    nombre: 'Seguridad operacional',
    categoria: 'operativo',
    origen: 'interno',
    gravedad: 'alta',
    keywords: ['sin equipo', 'sin epp'],
    accion_inmediata: 'Detener tarea y exigir equipamiento obligatorio',
    accion_correctiva: 'Capacitar personal y reforzar control de EPP'
  },
  {
    nombre: 'Documentación incompleta',
    categoria: 'documentacion',
    origen: 'interno',
    gravedad: 'media',
    keywords: ['registro incompleto', 'documentacion faltante', 'falta'],
    accion_inmediata: 'Solicitar regularización documental',
    accion_correctiva: 'Estandarizar registros y auditar cumplimiento'
  },
  {
    nombre: 'Desvíos de auditoría',
    categoria: 'calidad',
    origen: 'interno',
    gravedad: 'media',
    keywords: ['auditoria', 'auditoría', 'desvio', 'no conformidad', 'incumplimiento'],
    accion_inmediata: 'Registrar desvío y notificar referente del área',
    accion_correctiva: 'Implementar plan de acción y seguimiento de cierre'
  },
  {
    nombre: 'Demoras logísticas',
    categoria: 'logistica',
    origen: 'externo',
    gravedad: 'media',
    keywords: ['demora', 'retraso', 'atraso', 'entrega tarde'],
    accion_inmediata: 'Informar al cliente/sector afectado y reprogramar entrega',
    accion_correctiva: 'Optimizar planificación logística y controlar tiempos'
  }
];

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

function normalizeForMatch(value) {
  return normalizeCellValue(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSectorName(value) {
  const sector = normalizeCellValue(value).trim();
  if (!sector) return 'N/A';
  return sector.replace(/producci[oó]n/gi, 'Área caliente');
}

function parseKeywords(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function normalizeRuleModel(rule, index = 0) {
  const categoria = normalizeForMatch(rule?.categoria || rule?.category) || 'operativo';
  const gravedad = normalizeForMatch(rule?.gravedad || rule?.severity) || 'baja';
  const defaultImmediate = gravedad === 'alta' ? 'Contener incidente y escalar' : 'Registrar incidencia y notificar';
  const defaultCorrective = gravedad === 'alta' ? 'Ejecutar plan correctivo formal' : 'Definir mejoras y seguimiento';

  return {
    id: rule?.id ?? index + 1,
    nombre: rule?.nombre || rule?.name || `Regla ${index + 1}`,
    categoria,
    origen: normalizeForMatch(rule?.origen) || 'interno',
    gravedad,
    keywords: parseKeywords(rule?.keywords),
    accion_inmediata: rule?.accion_inmediata || rule?.suggestedAction || defaultImmediate,
    accion_correctiva: rule?.accion_correctiva || defaultCorrective
  };
}

function buildAnalysisText(fields) {
  const orderedSources = [
    fields.descripcion,
    fields.hallazgo,
    fields.detalle,
    fields.observacion,
    fields.comentarios,
    fields.tipo
  ]
    .map((value) => normalizeCellValue(value).trim())
    .filter(Boolean);

  const normalizedText = normalizeForMatch(orderedSources.join(' | '));
  const primaryDescription = orderedSources[0] || '';

  return { normalizedText, primaryDescription };
}

function classifyRecordByKeywords(analysisText, businessRules = []) {
  const normalizedDescription = normalizeForMatch(analysisText);

  if (!normalizedDescription) {
    return {
      categoria: 'operativo',
      origen: 'interno',
      gravedad: 'baja',
      accionInmediata: 'Registrar incidencia',
      accionCorrectiva: 'Revisar en próxima reunión operativa',
      accionSugerida: 'Registrar incidencia',
      reglaAplicada: null,
      nota: null
    };
  }

  const sourceRules = Array.isArray(businessRules) && businessRules.length > 0 ? businessRules : INTERNAL_DEFAULT_RULES;
  const normalizedRules = sourceRules.map(normalizeRuleModel);

  for (const rule of normalizedRules) {
    const matchedKeyword = rule.keywords.find((keyword) =>
      normalizedDescription.includes(normalizeForMatch(keyword))
    );

    if (matchedKeyword) {
      return {
        categoria: rule.categoria,
        origen: rule.origen,
        gravedad: rule.gravedad,
        accionInmediata: rule.accion_inmediata,
        accionCorrectiva: rule.accion_correctiva,
        accionSugerida: rule.accion_inmediata,
        reglaAplicada: rule.nombre,
        nota: `Coincidencia con keyword: "${matchedKeyword}"`
      };
    }
  }

  return {
    categoria: 'operativo',
    origen: 'interno',
    gravedad: 'baja',
    accionInmediata: 'Registrar incidencia',
    accionCorrectiva: 'Revisar en próxima reunión operativa',
    accionSugerida: 'Registrar incidencia',
    reglaAplicada: null,
    nota: null
  };
}

function getSeverityPoints(gravedad) {
  return SEVERITY_POINTS[gravedad] || SEVERITY_POINTS.baja;
}

function getFinalActionByScore(score) {
  return score < 3 ? 'aviso' : 'medida_correctiva';
}

/**
 * Analiza un archivo Excel y aplica las reglas de negocio
 * @param {Buffer} fileBuffer - Buffer del archivo Excel
 * @param {Array} businessRules - Reglas de negocio
 * @param {Function} progressCallback - Callback para reportar progreso
 * @returns {Object} Resultados del análisis
 */
export async function analyzeExcel(fileBuffer, businessRules, progressCallback = null) {
  const results = [];
  const categoryCount = {};
  const employeeIncidences = {};
  const severityCount = { baja: 0, media: 0, alta: 0 };
  const sectorScores = {};

  try {
    progressCallback?.(10, 'Validando archivo...');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);

    if (workbook.worksheets.length === 0) {
      throw new Error('El archivo Excel no contiene hojas');
    }

    const sheet = workbook.worksheets[0];
    const rows = [];
    const headerIndexes = detectHeaders(sheet.getRow(1).values);

    progressCallback?.(30, 'Leyendo datos del Excel...');
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      rows.push(row.values);
    });

    if (rows.length === 0) {
      throw new Error('El archivo Excel no contiene registros (solo encabezados)');
    }

    const totalRows = rows.length;
    rows.forEach((rowValues, index) => {
      progressCallback?.(40 + Math.floor((index / totalRows) * 40), `Analizando registro ${index + 1} de ${totalRows}...`);

      const getValue = (headerIndex, fallbackIndex) => {
        const indexToUse = Number.isInteger(headerIndex) ? headerIndex : fallbackIndex;
        return rowValues?.[indexToUse];
      };

      const fecha = getValue(headerIndexes.fecha, 1);
      const empleado = normalizeCellValue(getValue(headerIndexes.empleado, 2));
      const sector = normalizeSectorName(getValue(headerIndexes.sector, 3));
      const descripcion = normalizeCellValue(getValue(headerIndexes.descripcion, 4));
      const tipo = normalizeCellValue(getValue(headerIndexes.tipo, 5));
      const observacion = normalizeCellValue(getValue(headerIndexes.observacion, 6));
      const responsable = normalizeCellValue(getValue(headerIndexes.responsable, 7));
      const detalle = normalizeCellValue(getValue(headerIndexes.detalle, undefined));
      const hallazgo = normalizeCellValue(getValue(headerIndexes.hallazgo, undefined));
      const comentarios = normalizeCellValue(getValue(headerIndexes.comentarios, undefined));

      const { normalizedText, primaryDescription } = buildAnalysisText({
        descripcion,
        tipo,
        observacion,
        detalle,
        hallazgo,
        comentarios
      });

      const {
        categoria,
        origen,
        gravedad,
        accionInmediata,
        accionCorrectiva,
        accionSugerida,
        reglaAplicada,
        nota
      } = classifyRecordByKeywords(normalizedText, businessRules);

      const puntajeGravedad = getSeverityPoints(gravedad);
      const notas = [];
      if (reglaAplicada) notas.push(`Regla aplicada: ${reglaAplicada}`);
      if (nota) notas.push(nota);
      if (normalizedText) {
        notas.push('Clasificación por texto combinado: descripcion/hallazgo/detalle/observacion/comentarios/tipo');
      }

      categoryCount[categoria] = (categoryCount[categoria] || 0) + 1;
      severityCount[gravedad] = (severityCount[gravedad] || 0) + 1;
      sectorScores[sector] = (sectorScores[sector] || 0) + puntajeGravedad;

      if (empleado) {
        if (!employeeIncidences[empleado]) {
          employeeIncidences[empleado] = { count: 0, score: 0, records: [] };
        }
        employeeIncidences[empleado].count += 1;
        employeeIncidences[empleado].score += puntajeGravedad;
        employeeIncidences[empleado].records.push({ categoria, gravedad, puntaje: puntajeGravedad });
      }

      results.push({
        fecha: fecha || '',
        empleado: empleado || 'N/A',
        sector,
        descripcion: primaryDescription || descripcion || '',
        tipo: tipo || '',
        observacion: observacion || '',
        detalle: detalle || '',
        hallazgo: hallazgo || '',
        comentarios: comentarios || '',
        responsable: responsable || 'N/A',
        categoria,
        origen,
        gravedad,
        puntajeGravedad,
        accionInmediata,
        accionCorrectiva,
        accionSugerida,
        notas
      });
    });

    progressCallback?.(85, 'Calculando agregaciones...');
    const employeeMeasures = {};
    for (const [empleado, data] of Object.entries(employeeIncidences)) {
      employeeMeasures[empleado] = {
        count: data.count,
        score: data.score,
        medida: getFinalActionByScore(data.score),
        severities: data.records.map((r) => r.gravedad)
      };
    }

    const bySectorScore = Object.entries(sectorScores)
      .map(([sector, score]) => ({ sector, score }))
      .sort((a, b) => b.score - a.score);

    const highestRiskSector = bySectorScore[0] || null;

    progressCallback?.(95, 'Generando resumen...');
    const summary = {
      totalRecords: results.length,
      byCategory: categoryCount,
      bySeverity: severityCount,
      employeeMeasures,
      sectorPrioritization: {
        bySectorScore,
        highestRiskSector
      },
      timestamp: new Date().toISOString()
    };

    progressCallback?.(100, '¡Análisis completado!');

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
 * Detecta los encabezados del Excel
 */
export function detectHeaders(headerRow) {
  const headers = {};
  const headerValues = headerRow || [];

  const mapping = {
    fecha: ['fecha', 'date', 'fecha del evento'],
    empleado: ['empleado', 'employee', 'personal', 'responsable'],
    sector: ['sector', 'department', 'área', 'area'],
    descripcion: ['descripción', 'descripcion', 'description', 'descripcion del hallazgo', 'descripcion hallazgo'],
    detalle: ['detalle', 'detalles', 'detalle del hallazgo', 'detalle hallazgo'],
    hallazgo: ['hallazgo', 'finding'],
    comentarios: ['comentario', 'comentarios', 'comment', 'comments'],
    tipo: ['tipo', 'type', 'clasificación', 'classification'],
    observacion: ['observación', 'observacion', 'observation', 'nota', 'note'],
    responsable: ['responsable', 'supervisor', 'jefe', 'manager']
  };

  for (const [key, aliases] of Object.entries(mapping)) {
    for (let i = 0; i < headerValues.length; i++) {
      const headerValue = normalizeForMatch(headerValues[i] || '');
      if (aliases.some((alias) => headerValue.includes(normalizeForMatch(alias)))) {
        headers[key] = i;
      }
    }
  }

  return headers;
}

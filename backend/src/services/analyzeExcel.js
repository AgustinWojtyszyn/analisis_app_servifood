import ExcelJS from 'exceljs';

const DEFAULT_CLASSIFICATION_RULES = [
  {
    category: 'inocuidad',
    severity: 'alta',
    action: 'medida_correctiva',
    keywords: [
      'temperatura',
      'camara',
      'cámara',
      'heladera',
      'cadena de frio',
      'contaminacion',
      'vencido',
      'inocuidad',
      'plaga',
      'sin equipo',
      'sin epp',
      'riesgo'
    ]
  },
  {
    category: 'higiene_orden',
    severity: 'media',
    action: 'aviso',
    keywords: ['orden', 'etiquetado']
  },
  {
    category: 'gestion_documental',
    severity: 'media',
    action: 'aviso',
    keywords: ['registro incompleto', 'documentacion faltante']
  },
  {
    category: 'auditoria',
    severity: 'media',
    action: 'aviso',
    keywords: ['auditoria', 'auditoría', 'desvio', 'no conformidad', 'incumplimiento', 'falta']
  },
  {
    category: 'mejora',
    severity: 'baja',
    action: 'seguimiento',
    keywords: ['capacitacion', 'respaldo', 'drive', 'actualizacion', 'seguimiento', 'mejora']
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

function ensureActionForSeverity(action, severity) {
  const normalizedAction = normalizeForMatch(action);
  if (normalizedAction) {
    return action;
  }

  if (severity === 'alta') {
    return 'medida_correctiva';
  }

  if (severity === 'media') {
    return 'aviso';
  }

  return 'ninguna';
}

function classifyRecordByKeywords(analysisText, businessRules = []) {
  const normalizedDescription = normalizeForMatch(analysisText);

  if (!normalizedDescription) {
    return {
      categoria: 'otros',
      gravedad: 'baja',
      accionSugerida: 'ninguna',
      nota: null
    };
  }

  for (const rule of DEFAULT_CLASSIFICATION_RULES) {
    const matchedKeyword = rule.keywords.find((keyword) =>
      normalizedDescription.includes(normalizeForMatch(keyword))
    );

    if (matchedKeyword) {
      return {
        categoria: rule.category,
        gravedad: rule.severity,
        accionSugerida: ensureActionForSeverity(rule.action, rule.severity),
        nota: `Coincidencia keyword: "${matchedKeyword}"`
      };
    }
  }

  for (const rule of businessRules) {
    const keywords = Array.isArray(rule?.keywords) ? rule.keywords : [];
    const matchedKeyword = keywords.find((keyword) =>
      normalizedDescription.includes(normalizeForMatch(keyword))
    );

    if (matchedKeyword) {
      const gravedad = rule.severity || 'baja';
      return {
        categoria: rule.category || 'otros',
        gravedad,
        accionSugerida: ensureActionForSeverity(rule.suggestedAction, gravedad),
        nota: `Coincidencia con regla: "${rule.name || matchedKeyword}"`
      };
    }
  }

  return {
    categoria: 'otros',
    gravedad: 'baja',
    accionSugerida: ensureActionForSeverity('ninguna', 'baja'),
    nota: null
  };
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

  try {
    // Paso 1: Validar y cargar
    progressCallback?.(10, 'Validando archivo...');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);
    
    if (workbook.worksheets.length === 0) {
      throw new Error('El archivo Excel no contiene hojas');
    }

    const sheet = workbook.worksheets[0];
    const rows = [];
    const headerIndexes = detectHeaders(sheet.getRow(1).values);

    // Paso 2: Leer datos
    progressCallback?.(30, 'Leyendo datos del Excel...');
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      rows.push(row.values);
    });

    if (rows.length === 0) {
      throw new Error('El archivo Excel no contiene registros (solo encabezados)');
    }

    // Paso 3: Procesar y clasificar cada registro
    const totalRows = rows.length;
    rows.forEach((rowValues, index) => {
      progressCallback?.(40 + Math.floor((index / totalRows) * 40), `Analizando registro ${index + 1} de ${totalRows}...`);

      const getValue = (headerIndex, fallbackIndex) => {
        const indexToUse = Number.isInteger(headerIndex) ? headerIndex : fallbackIndex;
        return rowValues?.[indexToUse];
      };

      const fecha = getValue(headerIndexes.fecha, 1);
      const empleado = normalizeCellValue(getValue(headerIndexes.empleado, 2));
      const sector = normalizeCellValue(getValue(headerIndexes.sector, 3));
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

      // Inicializar registro
      let { categoria, gravedad, accionSugerida, nota } = classifyRecordByKeywords(normalizedText, businessRules);
      const notas = [];
      if (nota) {
        notas.push(nota);
      }
      if (normalizedText) {
        notas.push('Clasificado usando texto combinado: descripcion/hallazgo/detalle/observacion/comentarios/tipo');
      }

      // Contar por categoría
      categoryCount[categoria] = (categoryCount[categoria] || 0) + 1;
      severityCount[gravedad]++;

      // Contar incidencias por empleado
      if (empleado) {
        if (!employeeIncidences[empleado]) {
          employeeIncidences[empleado] = { count: 0, records: [] };
        }
        employeeIncidences[empleado].count++;
        employeeIncidences[empleado].records.push({ categoria, gravedad });
      }

      // Agregar registro procesado
      results.push({
        fecha: fecha || '',
        empleado: empleado || 'N/A',
        sector: sector || 'N/A',
        descripcion: primaryDescription || descripcion || '',
        tipo: tipo || '',
        observacion: observacion || '',
        detalle: detalle || '',
        hallazgo: hallazgo || '',
        comentarios: comentarios || '',
        responsable: responsable || 'N/A',
        categoria,
        gravedad,
        accionSugerida,
        notas
      });
    });

    // Paso 4: Detectar reincidencias y determinar medidas
    progressCallback?.(85, 'Detectando reincidencias...');
    const employeeMeasures = {};
    for (const [empleado, data] of Object.entries(employeeIncidences)) {
      const count = data.count;
      const medida = count >= 3 ? 'medida_correctiva' : 'aviso';

      employeeMeasures[empleado] = {
        count,
        medida,
        severities: data.records.map(r => r.gravedad)
      };
    }

    // Paso 5: Generar resumen
    progressCallback?.(95, 'Generando resumen...');
    const summary = {
      totalRecords: results.length,
      byCategory: categoryCount,
      bySeverity: severityCount,
      employeeMeasures,
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

  // Mapeo flexible de encabezados
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
      if (aliases.some(alias => headerValue.includes(normalizeForMatch(alias)))) {
        headers[key] = i;
      }
    }
  }

  return headers;
}

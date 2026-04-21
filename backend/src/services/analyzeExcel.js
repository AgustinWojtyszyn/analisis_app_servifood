import ExcelJS from 'exceljs';

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

      const [, fecha, empleado, sector, descripcion, tipo, observacion, responsable] = rowValues || [];

      // Inicializar registro
      let categoria = 'otros';
      let gravedad = 'baja';
      let accionSugerida = 'ninguna';
      const notas = [];

      // Aplicar reglas
      if (descripcion) {
        const descriptionLower = String(descripcion).toLowerCase();
        for (const regla of businessRules) {
          const match = regla.keywords.some(keyword =>
            descriptionLower.includes(keyword.toLowerCase())
          );

          if (match) {
            categoria = regla.category;
            gravedad = regla.severity;
            accionSugerida = regla.suggestedAction;
            notas.push(`Coincidencia con regla: "${regla.name}"`);
            break; // Usar la primera coincidencia
          }
        }
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
        descripcion: descripcion || '',
        tipo: tipo || '',
        observacion: observacion || '',
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
      let medida = 'ninguna';
      
      if (count === 1) {
        medida = 'aviso';
      } else if (count === 2) {
        medida = 'seguimiento';
      } else if (count >= 3) {
        medida = 'medida_correctiva';
      }

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
    descripcion: ['descripción', 'description', 'detalle', 'description', 'evento'],
    tipo: ['tipo', 'type', 'clasificación', 'classification'],
    observacion: ['observación', 'observation', 'nota', 'note'],
    responsable: ['responsable', 'supervisor', 'jefe', 'manager']
  };

  for (const [key, aliases] of Object.entries(mapping)) {
    for (let i = 0; i < headerValues.length; i++) {
      const headerValue = String(headerValues[i] || '').toLowerCase().trim();
      if (aliases.some(alias => headerValue.includes(alias))) {
        headers[key] = i;
      }
    }
  }

  return headers;
}

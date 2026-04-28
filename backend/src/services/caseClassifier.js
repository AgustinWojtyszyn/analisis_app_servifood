function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function includesAny(text, terms = []) {
  return terms.some((term) => text.includes(normalizeText(term)));
}

function extractCameraAreas(text) {
  const input = normalizeText(text);
  const regex = /camara\s*(n°|nº|numero)?\s*([0-9, y]+)/gi;
  const values = [];
  let match = regex.exec(input);
  while (match) {
    const nums = (match[2] || '').match(/\d+/g) || [];
    values.push(...nums.map((n) => `Cámara ${n}`));
    match = regex.exec(input);
  }
  return [...new Set(values)];
}

function buildRowUsefulText(row) {
  const area = String(row?.areaProceso || '').trim();
  const actividad = String(row?.actividadRealizada || '').trim();
  const hallazgo = String(row?.hallazgoDetectado || '').trim();

  const hallazgoNorm = normalizeText(hallazgo);
  const actividadNorm = normalizeText(actividad);
  const isShortNullToken = (value) => /^(n a|na|n d|nd|-)$/.test(value);
  const isHallazgoIrrelevant = !hallazgoNorm || hallazgoNorm === 'sin hallazgo detectado' || isShortNullToken(hallazgoNorm);
  const isActividadIrrelevant = !actividadNorm ||
    actividadNorm === 'sin hallazgo detectado' ||
    actividadNorm === 'sin novedad' ||
    actividadNorm === 'no aplica' ||
    isShortNullToken(actividadNorm);

  const combined = [area, isActividadIrrelevant ? '' : actividad, isHallazgoIrrelevant ? '' : hallazgo]
    .filter(Boolean)
    .join(' | ')
    .trim();

  const norm = normalizeText(combined);
  if (!norm) return '';

  const hasEventSignal = includesAny(norm, [
    'mal estado', 'faltante', 'demora', 'falla', 'fallando', 'sucio', 'contaminacion',
    'registro', 'incompleto', 'devolucion', 'ausencia', 'no hay agua caliente', 'heladera',
    'faltaron almuerzos',
    'camara', 'horno', 'marmita', 'costillas', 'almuerzos'
  ]);
  if (!hasEventSignal && norm.length < 20) return '';
  return combined;
}

function buildContextKeyFromText(text, fallbackIndex) {
  const norm = normalizeText(text);
  if (!norm) return `fila_${fallbackIndex}`;
  const terms = norm
    .split(' ')
    .filter((token) => token.length > 2)
    .filter((token) => !['area', 'proceso', 'actividad', 'hallazgo', 'detectado', 'linea', 'sector'].includes(token));
  const key = [...new Set(terms)].slice(0, 8).join('_');
  return key || `fila_${fallbackIndex}`;
}

function groupRowsIntoCases(records = []) {
  const grouped = new Map();

  records.forEach((record, index) => {
    const useful = buildRowUsefulText(record);
    if (!useful) return;

    const numeroAccionRaw = String(record?.numeroAccion || '').trim();
    const numeroAccion = numeroAccionRaw || '';
    const key = numeroAccion
      ? `accion:${normalizeText(numeroAccion)}`
      : `contexto:${buildContextKeyFromText(useful, index)}`;

    if (!grouped.has(key)) {
      grouped.set(key, { numeroAccion, rows: [] });
    }

    grouped.get(key).rows.push({
      areaProceso: String(record?.areaProceso || '').trim(),
      actividadRealizada: String(record?.actividadRealizada || '').trim(),
      hallazgoDetectado: String(record?.hallazgoDetectado || '').trim(),
      usefulText: useful
    });
  });

  return [...grouped.values()];
}

function classifyCaseArea(consolidatedText, rows = []) {
  const text = normalizeText(consolidatedText);
  const areas = [];
  const add = (value) => {
    if (!areas.includes(value)) areas.push(value);
  };

  extractCameraAreas(text).forEach(add);

  const hasHeladera = includesAny(text, ['heladera', 'heladeras']);
  const hasAF = /\baf\b/.test(` ${text} `) || includesAny(text, ['area fria', 'área fria']);
  const hasAC = /\bac\b/.test(` ${text} `) || includesAny(text, ['area caliente', 'área caliente']);
  if (hasHeladera && hasAF) add('Área fría');
  if (hasHeladera && hasAC) add('Área caliente');

  if (includesAny(text, [
    'horno', 'hornos', 'cocina', 'coccion', 'cocción', 'marmita', 'marmitas',
    'freidora', 'freidoras', 'plancha', 'planchas', 'olla', 'ollas',
    'preparacion caliente', 'preparación caliente', 'linea caliente', 'línea caliente',
    'costillas', 'almuerzos calientes', 'almuerzo caliente'
  ])) add('Área caliente');

  if (includesAny(text, ['robocoupe'])) add('Robocoupe');
  if (includesAny(text, ['deposito', 'depósito'])) add('Depósito');
  if (includesAny(text, ['planta'])) add('Planta');
  if (includesAny(text, ['pre elaborados', 'preelaborados', 'pre elaborado'])) add('Pre elaborados');
  if (includesAny(text, ['linea de bachas', 'línea de bachas', 'bachas'])) add('Línea de bachas');
  if (includesAny(text, ['easy'])) add('Easy');
  if (includesAny(text, ['scop'])) add('Scop');
  if (includesAny(text, ['hospital mental'])) add('Hospital Mental');
  if (includesAny(text, ['pocito'])) add('Pocito');
  if (includesAny(text, ['la laja'])) add('La Laja');

  const supportByText = includesAny(text, [
    'registro',
    'registros',
    'documentacion',
    'documental',
    'sistema documental',
    'revision documental',
    'historial',
    'control de registros',
    'capacitacion',
    'manual',
    'analisis de peligros',
    'pcc',
    'auditoria'
  ]);
  if (supportByText) add('Calidad / Documentación');

  if (areas.length > 0) {
    const support = 'Calidad / Documentación';
    const operational = areas.filter((area) => area !== support);
    const priority = ['Área fría', 'Área caliente', 'Depósito', 'Higiene / Sanitización', 'Mantenimiento', 'RRHH / Personal', 'Logística / Distribución', 'Planta'];
    operational.sort((a, b) => {
      const ia = priority.indexOf(a);
      const ib = priority.indexOf(b);
      const pa = ia === -1 ? 999 : ia;
      const pb = ib === -1 ? 999 : ib;
      return pa - pb;
    });
    if (areas.includes(support)) operational.push(support);
    return operational;
  }

  const inferred = normalizeText(rows.map((row) => row.areaProceso).join(' | '));
  if (includesAny(inferred, ['fria', 'frio', 'camara', 'heladera'])) return ['Área fría'];
  if (includesAny(inferred, ['caliente', 'cocina', 'coccion'])) return ['Área caliente'];
  if (includesAny(inferred, ['deposito'])) return ['Depósito'];
  if (includesAny(inferred, ['logistica', 'distribucion'])) return ['Easy'];
  return ['Planta'];
}

function classifyCaseOutcome(consolidatedText) {
  const text = normalizeText(consolidatedText);
  const controlSignals = ['se realiza control', 'se controla', 'orden y limpieza', 'se verifica'];
  const proveedorConformeSignals = ['se realiza contacto con proveedor', 'contacto con proveedor'];

  const nc = includesAny(text, [
    'cebos', 'plagas',
    'mal estado', 'devolucion', 'faltante', 'demora', 'falla', 'fallando',
    'faltaron almuerzos',
    'sucio', 'suciedad', 'contaminacion', 'restos de carne', 'incompleto',
    'incumplimiento', 'no hay agua caliente', 'sin agua caliente', 'fuera de uso',
    'no funciona', 'producto defectuoso', 'defectuoso', 'proveedor no cumple',
    'no disponen de calzado', 'falta de registros', 'camaras sin control', 'cámaras sin control'
  ]);
  if (nc) return { resultadoClasificado: 'No conforme', tipoDesvio: 'NC' };

  if (includesAny(text, controlSignals) || includesAny(text, proveedorConformeSignals)) {
    return { resultadoClasificado: 'Conforme', tipoDesvio: '-' };
  }

  const om = includesAny(text, [
    'oportunidad de mejora',
    'mejora continua'
  ]);
  if (om) return { resultadoClasificado: 'Oportunidad de mejora', tipoDesvio: 'OM' };

  const conforme = includesAny(text, [
    'recorrida de planta',
    'control de registros',
    'control de orden limpieza y etiquetado',
    'control de historial de coccion',
    'se controla',
    'verificacion',
    'revision sin hallazgo'
  ]);
  if (conforme) return { resultadoClasificado: 'Conforme', tipoDesvio: '-' };

  return { resultadoClasificado: 'Conforme', tipoDesvio: '-' };
}

function classifyCaseIso(consolidatedText) {
  const text = normalizeText(consolidatedText);
  if (includesAny(text, ['cebos', 'plagas', 'exterior'])) return '8.2 Programas prerrequisito / POES / BPM';
  if (includesAny(text, ['auditoria interna', 'auditoria'])) return '9.2 Auditoría interna';
  if (includesAny(text, ['capacitacion', 'competencia', 'formacion'])) return '7.2 Competencia / capacitación';
  if (includesAny(text, ['registro', 'registros', 'planilla', 'documentacion', 'falta de firma'])) return '7.5 Información documentada';
  if (includesAny(text, ['mal estado', 'camara', 'heladera', 'higiene', 'sanitizacion', 'agua caliente', 'contaminacion', 'sucio'])) return '8.5 Control de peligros / HACCP / OPRP / PCC';
  if (includesAny(text, ['demora', 'entrega', 'despacho', 'cliente', 'faltante de mercaderia', 'faltaron almuerzos'])) return '8.1 Planificación y control operacional';
  if (includesAny(text, ['proveedor', 'materia prima', 'recepcion', 'ingreso de mercaderia'])) return '8.4 Control de procesos, productos y servicios externos';
  if (includesAny(text, ['equipo', 'maquina', 'robocoupe', 'mantenimiento', 'ausencia de personal', 'personal'])) return '7.1 Recursos';
  return '8.1 Planificación y control operacional';
}

function detectCaseScenario(consolidatedText) {
  const text = normalizeText(consolidatedText);
  if (includesAny(text, ['registro', 'incompleto', 'falta de firma'])) return 'registros';
  if (includesAny(text, ['devolucion', 'devuelve'])) return 'devolucion';
  if (includesAny(text, ['mal estado'])) return 'mal_estado';
  if (includesAny(text, ['faltante', 'faltaron almuerzos'])) return 'faltante';
  if (includesAny(text, ['demora', 'demorado'])) return 'demora';
  if (includesAny(text, ['agua caliente', 'sanitizacion', 'bachas'])) return 'agua_caliente';
  if (includesAny(text, ['sucio', 'suciedad', 'restos de carne'])) return 'higiene';
  if (includesAny(text, ['robocoupe', 'falla', 'fallando', 'equipo fuera de uso'])) return 'equipo';
  if (includesAny(text, ['ausencia', 'falto', 'personal'])) return 'personal';
  return 'general';
}

function buildCaseActions(consolidatedText, resultadoClasificado) {
  if (resultadoClasificado === 'Conforme') {
    return {
      accionInmediata: '',
      accionCorrectiva: ''
    };
  }

  const scenario = detectCaseScenario(consolidatedText);
  const map = {
    registros: {
      accionInmediata: 'Verificar y completar registros faltantes en el turno, validando los datos críticos.',
      accionCorrectiva: 'Implementar control diario obligatorio de registros con responsable asignado por turno.'
    },
    devolucion: {
      accionInmediata: 'Registrar la devolución, aislar el producto involucrado y evaluar riesgo sanitario.',
      accionCorrectiva: 'Investigar causa raíz y reforzar controles de almacenamiento y despacho.'
    },
    mal_estado: {
      accionInmediata: 'Retener el lote afectado, bloquear su uso y verificar alcance de distribución.',
      accionCorrectiva: 'Reforzar controles de recepción y conservación, con reevaluación del proveedor.'
    },
    faltante: {
      accionInmediata: 'Confirmar el faltante, informar al cliente y coordinar reposición inmediata.',
      accionCorrectiva: 'Aplicar doble verificación de armado y despacho contra pedido confirmado.'
    },
    demora: {
      accionInmediata: 'Informar al cliente el horario estimado y registrar la causa operativa de la demora.',
      accionCorrectiva: 'Reprogramar planificación de producción/distribución según causa raíz documentada.'
    },
    agua_caliente: {
      accionInmediata: 'Suspender la sanitización afectada y aplicar contingencia validada hasta restablecer el recurso.',
      accionCorrectiva: 'Ejecutar mantenimiento del sistema de agua caliente y formalizar plan de contingencia.'
    },
    higiene: {
      accionInmediata: 'Detener uso del sector comprometido y ejecutar limpieza/sanitización con verificación.',
      accionCorrectiva: 'Reforzar POES con checklist de cierre y responsable por turno.'
    },
    equipo: {
      accionInmediata: 'Retirar el equipo de servicio, identificarlo y comunicar a mantenimiento.',
      accionCorrectiva: 'Programar reparación definitiva y definir equipo alternativo de contingencia.'
    },
    personal: {
      accionInmediata: 'Redistribuir tareas para sostener la operación sin afectar servicio ni inocuidad.',
      accionCorrectiva: 'Definir plan formal de reemplazos y cobertura mínima por turno.'
    },
    general: {
      accionInmediata: 'Contener el desvío detectado y registrar evidencia del evento operativo.',
      accionCorrectiva: 'Definir acción correctiva con causa raíz, responsable y fecha de verificación.'
    }
  };

  return map[scenario] || map.general;
}

function buildCaseConfidence(consolidatedText, areaList, resultadoClasificado) {
  const text = normalizeText(consolidatedText);
  if (!text) return 'Baja';
  if (areaList.length >= 2 && resultadoClasificado === 'No conforme') return 'Alta';
  if (areaList.length >= 1 && resultadoClasificado !== 'Conforme') return 'Alta';
  if (areaList.length >= 1) return 'Media';
  return 'Baja';
}

export function classifyDeviationCase(input = {}) {
  const numeroAccion = String(input?.numeroAccion || '').trim() || 'SIN_NUMERO';
  const rows = Array.isArray(input?.filas) ? input.filas : [];
  const usefulTexts = rows.map((row) => buildRowUsefulText(row)).filter(Boolean);
  const consolidatedText = usefulTexts.join(' | ');

  if (!consolidatedText) {
    return {
      numeroAccion,
      areaClasificada: 'Planta',
      resultadoClasificado: 'Conforme',
      tipoDesvio: '-',
      iso22000: '7.5 Información documentada',
      accionInmediata: 'Registrar el caso sin desvío y conservar trazabilidad del análisis.',
      accionCorrectiva: 'No requiere acción correctiva; mantener monitoreo operativo.',
      explicacion: 'No se detectaron eventos útiles al consolidar las filas del caso.',
      confianza: 'Baja'
    };
  }

  const areaList = classifyCaseArea(consolidatedText, rows);
  const { resultadoClasificado, tipoDesvio } = classifyCaseOutcome(consolidatedText);
  const iso22000 = classifyCaseIso(consolidatedText);
  const actions = buildCaseActions(consolidatedText, resultadoClasificado);
  const confianza = buildCaseConfidence(consolidatedText, areaList, resultadoClasificado);

  return {
    numeroAccion,
    areaClasificada: areaList.join(' / '),
    resultadoClasificado,
    tipoDesvio,
    iso22000,
    accionInmediata: actions.accionInmediata,
    accionCorrectiva: actions.accionCorrectiva,
    explicacion: `Caso consolidado con ${usefulTexts.length} evidencia(s) útiles; clasificación basada en contexto operativo completo.`,
    confianza
  };
}

export function classifyDeviationCasesFromRecords(records = []) {
  const groups = groupRowsIntoCases(records);
  return groups.map((group, index) => classifyDeviationCase({
    numeroAccion: group.numeroAccion || `CONTEXTO_${index + 1}`,
    filas: group.rows
  }));
}

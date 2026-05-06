import { normalizeCellValue, normalizeForMatch, normalizeIncidentText, containsAny } from '../../analyzeExcel/normalizers.js';

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
  if (containsAny(area, ['banos', 'areas comunes', 'pasillo principal'])) return 'Mantenimiento';
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

function resolveCorrectiveActionByPriority({ text = '', categoriaDesvio = '', iso22000 = '' }) {
  const normalized = normalizeIncidentText([text, categoriaDesvio, iso22000].filter(Boolean).join(' | '));

  if (containsAny(normalized, ['producto no conforme', 'no conforme', 'carteleria de producto no conforme', 'cartelería de producto no conforme'])) {
    return 'Identificar y sectorizar el producto no conforme. Colocar cartelería visible y reforzar el procedimiento de segregación.';
  }
  if (containsAny(normalized, ['desvio de logistica', 'desvío de logística', 'faltaron menu', 'faltaron menú', 'faltante de unidades', 'entrega incompleta', 'faltante', 'despacho'])) {
    return 'Verificar el faltante, corregir entrega o reposición si corresponde. Aplicar doble control antes del despacho.';
  }
  if (containsAny(normalized, ['sin rotular', 'rotulacion', 'rotulación', 'trazabilidad', '8.5.2 trazabilidad'])) {
    return 'Rotular inmediatamente los alimentos o productos involucrados. Reforzar capacitación y control diario de rótulos.';
  }
  if (containsAny(normalized, ['limpieza', 'sucio', 'sucia', 'restos', 'charcos', 'piso sucio', 'instalaciones no se encuentran limpias', '8.2 prp limpieza'])) {
    return 'Limpiar y desinfectar el sector afectado. Reforzar frecuencia de limpieza y control por checklist diario.';
  }
  if (containsAny(normalized, ['residuos', 'basura', 'contenedor', 'carteleria de residuos', 'cartelería de residuos', '8.2 prp manejo residuos'])) {
    return 'Ordenar y retirar residuos del sector. Identificar contenedores y reforzar la segregación por tipo de residuo.';
  }
  if (containsAny(normalized, ['desorden', 'desordenado', 'desordenada', 'falta de orden', 'heladeras desordenadas'])) {
    return 'Ordenar el sector y retirar elementos innecesarios. Reforzar rutina de orden y verificación por turno.';
  }
  if (containsAny(normalized, ['bandejas rotas', 'mal estado', 'envases sin integridad', 'equipamiento', 'equipo', 'no funciona'])) {
    return 'Retirar o reemplazar elementos en mal estado. Verificar disponibilidad de equipamiento apto antes del uso.';
  }
  if (containsAny(normalized, ['objetos personales', 'elementos personales', 'productos ajenos', 'ajenos al sector', 'rinonera', 'riñonera'])) {
    return 'Retirar elementos personales o ajenos al sector productivo. Implementar uso de lockers y reforzar control del área.';
  }
  if (containsAny(normalized, ['bano', 'baño', 'armario de banos', 'armario de baños', 'carteleria', 'cartelería'])) {
    return 'Colocar la cartelería correspondiente y verificar la identificación del sector. Reforzar el control visual con el responsable.';
  }

  return 'Corregir el desvío detectado, registrar la acción tomada y reforzar el criterio con el responsable del sector.';
}

function buildActions({ resultadoClasificado, text, hallazgoDetectado, accionInmediataOriginal, accionCorrectivaOriginal, categoriaDesvio = '', iso22000 = '' }) {
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

  const specificCorrective = resolveCorrectiveActionByPriority({
    text: `${normalizedText} | ${hallazgoDetectado}`,
    categoriaDesvio,
    iso22000
  }) || buildCorrectiveActionFromProblem(normalizedText);
  const correctiveBase = specificCorrective || correctiveExisting || byScenario[scenario].corrective;
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

  if (!tieneNumeroAccion && !hasImplicitActionVerb) return 'sin_accion';

  if (tieneNumeroAccion || hasImplicitActionVerb) return 'en_proceso';
  return 'sin_accion';
}

export {
  esTextoAccion,
  normalizeDetectedAction,
  removeDuplicateActionChunks,
  getTextoAccion,
  extractImmediateAction,
  buildCorrectiveActionFromProblem,
  classifyResponsibleByArea,
  detectActionScenario,
  hasSubstantialOverlap,
  resolveCorrectiveActionByPriority,
  buildActions,
  classifyActionStatusFromRow
};

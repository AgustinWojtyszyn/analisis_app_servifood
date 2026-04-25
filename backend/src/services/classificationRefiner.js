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

function isGenericAction(value) {
  const text = normalizeText(value);
  if (!text) return true;
  return includesAny(text, [
    'revisar proceso',
    'mejorar control',
    'tomar acciones',
    'hacer seguimiento',
    'corregir',
    'analizar',
    'verificar'
  ]) && text.length < 80;
}

function classifyArea(text, preDetectedArea = '') {
  const scores = new Map();
  const add = (area, points) => scores.set(area, (scores.get(area) || 0) + points);

  if (includesAny(text, ['demora', 'entrega', 'despacho', 'reparto', 'cliente', 'easy', 'hospital mental', 'pocito', 'la laja', 'faltaron almuerzos'])) {
    add('Logística / Distribución', 8);
  }

  if (includesAny(text, ['falla', 'fallando', 'equipo fuera de uso', 'maquina', 'robocoupe', 'reparacion', 'mantenimiento', 'deja de ocupar'])) {
    add('Mantenimiento', 8);
  }

  if (includesAny(text, ['sucio', 'suciedad', 'restos de carne', 'sin limpiar', 'sanitizacion', 'bachas', 'agua caliente', 'limpieza', 'poes'])) {
    add('Higiene / Sanitización', 9);
  }

  if (includesAny(text, ['camara', 'heladera', 'refrigeracion', 'frio', 'ensalada', 'tomate', 'verdura', 'materia prima perecedera'])) {
    add('Área fría', 7);
  }

  if (includesAny(text, ['cocina', 'coccion', 'linea caliente', 'horno', 'marmita', 'fritura', 'costilla'])) {
    add('Área caliente', 6);
  }

  if (includesAny(text, ['deposito', 'recepcion', 'stock', 'mercaderia', 'materia prima', 'proveedor', 'ingreso de mercaderia', 'faltante de insumos'])) {
    add('Depósito', 6);
  }

  if (includesAny(text, ['auditoria', 'registro', 'registros incompletos', 'falta de firma', 'procedimiento', 'documentacion', 'drive', 'control de registros'])) {
    add('Calidad / Documentación', 6);
  }

  if (includesAny(text, ['falto', 'ausencia', 'personal', 'capacitacion', 'encargado', 'responsable', 'operador'])) {
    add('RRHH / Personal', 5);
  }

  if (includesAny(text, ['mal estado', 'producto en mal estado']) && includesAny(text, ['tomate', 'ensalada', 'verdura'])) {
    add('Área fría', 6);
  }
  if (includesAny(text, ['mal estado', 'producto en mal estado']) && includesAny(text, ['envia', 'recepcion', 'proveedor', 'mercaderia'])) {
    add('Depósito', 6);
  }
  if (includesAny(text, ['devolucion', 'devuelve']) && includesAny(text, ['ensalada', 'tomate', 'verdura'])) {
    add('Área fría', 4);
    add('Logística / Distribución', 4);
  }

  if (scores.size === 0) {
    return preDetectedArea || 'Área no identificada';
  }

  if (includesAny(text, ['faltaron almuerzos', 'faltante de mercaderia en cliente', 'demora en entrega', 'servicio demorado'])) {
    return 'Logística / Distribución';
  }

  if (includesAny(text, ['agua caliente', 'sanitizacion', 'bachas']) || includesAny(text, ['sucio', 'suciedad', 'restos de carne', 'sin limpiar'])) {
    return 'Higiene / Sanitización';
  }

  if (includesAny(text, ['devolucion', 'devuelve']) && includesAny(text, ['ensalada', 'tomate', 'verdura'])) {
    return 'Área fría / Logística';
  }

  if (includesAny(text, ['envia', 'envio']) && includesAny(text, ['tomate', 'ensalada', 'verdura']) && includesAny(text, ['mal estado', 'producto en mal estado'])) {
    return 'Área fría / Depósito';
  }

  if (includesAny(text, ['registro de temperatura', 'registro']) && includesAny(text, ['camara', 'heladera']) && includesAny(text, ['incompleto', 'incompletos'])) {
    return 'Área fría';
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const topScore = ranked[0][1];
  const selected = ranked.filter(([, score], idx) => idx === 0 || score >= topScore - 1).slice(0, 2).map(([area]) => area);

  if (selected.includes('Área fría') && selected.includes('Depósito')) return 'Área fría / Depósito';
  if (selected.includes('Área fría') && selected.includes('Logística / Distribución')) return 'Área fría / Logística';
  return selected.join(' / ');
}

function classifyOutcome(text, preDetectedResult = '', preDetectedType = '') {
  if (!text) {
    return {
      resultadoFinal: 'Revisar manualmente',
      tipoFinal: '-',
      reason: 'texto vacio'
    };
  }

  const ncSignal = includesAny(text, [
    'mal estado',
    'defectuoso',
    'devolucion',
    'falta de limpieza',
    'contaminacion',
    'suciedad',
    'restos de carne',
    'falta de agua caliente',
    'no hay agua caliente',
    'registros incompletos',
    'registro incompleto',
    'incompleto',
    'faltante de mercaderia',
    'faltaron almuerzos',
    'demora',
    'fuera de uso',
    'incumplimiento',
    'auditoria con bajo cumplimiento'
  ]);

  if (ncSignal || normalizeText(preDetectedType) === 'nc' || normalizeText(preDetectedResult) === 'no conforme') {
    return { resultadoFinal: 'No conforme', tipoFinal: 'NC', reason: 'impacta inocuidad/cliente/operacion' };
  }

  const omSignal = includesAny(text, [
    'capacitacion',
    'mejora documental',
    'creacion de drive',
    'reorganizacion',
    'prevencion',
    'ajustes de proceso',
    'acciones preventivas'
  ]);

  if (omSignal) {
    return { resultadoFinal: 'Oportunidad de mejora', tipoFinal: 'OM', reason: 'mejora sin impacto critico directo' };
  }

  const conformeSignal = includesAny(text, [
    'se crea respaldo documental',
    'se dicta capacitacion',
    'se implementa mejora',
    'se actualiza procedimiento',
    'sin hallazgo',
    'conforme'
  ]);

  if (conformeSignal) {
    return { resultadoFinal: 'Conforme', tipoFinal: '-', reason: 'no se observa desvio operativo' };
  }

  return { resultadoFinal: 'Oportunidad de mejora', tipoFinal: 'OM', reason: 'texto util sin criticidad explicita' };
}

function classifyIso(text, areaFinal, resultadoFinal, preDetectedIso = '') {
  if (!text) return preDetectedIso || 'Sin clasificar';
  if (includesAny(text, ['auditoria interna', 'auditoria', 'cumplimiento bajo'])) return '9.2 Auditoría interna';
  if (includesAny(text, ['capacitacion', 'competencia', 'formacion', 'entrenamiento'])) return '7.2 Competencia / capacitación';
  if (includesAny(text, ['registro', 'planilla', 'falta de firma', 'documentacion', 'drive'])) return '7.5 Información documentada';
  if (includesAny(text, ['mal estado', 'contaminacion', 'limpieza', 'sanitizacion', 'camara', 'heladera', 'agua caliente', 'poes', 'sucio', 'suciedad', 'restos de carne'])) return '8.5 Control de peligros / HACCP / OPRP / PCC';
  if (includesAny(text, ['entrega', 'despacho', 'faltante', 'demora', 'cliente', 'reparto'])) return '8.1 Planificación y control operacional';
  if (includesAny(text, ['proveedor', 'recepcion', 'materia prima', 'ingreso de mercaderia'])) return '8.4 Control de procesos, productos y servicios externos';
  if (includesAny(text, ['equipo', 'maquina', 'mantenimiento', 'personal', 'ausencia'])) return '7.1 Recursos';

  if (areaFinal.includes('Logística')) return '8.1 Planificación y control operacional';
  if (areaFinal.includes('Depósito')) return '8.4 Control de procesos, productos y servicios externos';
  if (areaFinal.includes('Mantenimiento') || areaFinal.includes('RRHH')) return '7.1 Recursos';
  if (resultadoFinal === 'No conforme') return '8.5 Control de peligros / HACCP / OPRP / PCC';
  return preDetectedIso || '7.5 Información documentada';
}

function detectScenario(text) {
  if (includesAny(text, ['devolucion', 'devuelve'])) return 'devolucion';
  if (includesAny(text, ['mal estado', 'defectuoso'])) return 'mal_estado';
  if (includesAny(text, ['faltaron almuerzos', 'faltante de mercaderia', 'faltante'])) return 'faltante';
  if (includesAny(text, ['demora', 'demorado'])) return 'demora';
  if (includesAny(text, ['agua caliente', 'sanitizacion', 'bachas'])) return 'agua_caliente';
  if (includesAny(text, ['sucio', 'suciedad', 'restos de carne', 'sin limpiar'])) return 'sucio';
  if (includesAny(text, ['falla', 'fallando', 'fuera de uso', 'maquina', 'equipo'])) return 'equipo';
  if (includesAny(text, ['registro', 'registros incompletos', 'falta de firma', 'documentacion'])) return 'registros';
  if (includesAny(text, ['falto', 'ausencia', 'personal'])) return 'personal';
  if (includesAny(text, ['capacitacion', 'mejora', 'preventiva'])) return 'mejora';
  return 'general';
}

function buildActions(text, resultadoFinal, accionInmediataDetectada, accionCorrectivaDetectada) {
  const templates = {
    mal_estado: {
      inmediata: 'Retener el producto/lote afectado, impedir su uso y verificar si hubo despacho al cliente.',
      correctiva: 'Reforzar control de recepcion, almacenamiento y evaluacion de proveedor.'
    },
    devolucion: {
      inmediata: 'Registrar la devolucion, aislar el producto involucrado y evaluar riesgo sanitario.',
      correctiva: 'Investigar causa raiz y reforzar controles de almacenamiento y despacho.'
    },
    faltante: {
      inmediata: 'Verificar cantidad faltante, informar al cliente y coordinar reposicion o compensacion.',
      correctiva: 'Implementar doble control de despacho y validacion contra pedido/cliente.'
    },
    demora: {
      inmediata: 'Informar al cliente el nuevo horario estimado y registrar la causa de la demora.',
      correctiva: 'Analizar causa raiz de la demora y ajustar planificacion de produccion/distribucion.'
    },
    equipo: {
      inmediata: 'Retirar el equipo de uso, identificarlo como fuera de servicio y comunicar a mantenimiento.',
      correctiva: 'Programar mantenimiento correctivo y definir plan de contingencia para reemplazo del equipo.'
    },
    agua_caliente: {
      inmediata: 'Suspender la sanitizacion afectada hasta restablecer el recurso o aplicar metodo alternativo validado.',
      correctiva: 'Revisar mantenimiento preventivo del sistema de agua caliente y documentar contingencia.'
    },
    sucio: {
      inmediata: 'Detener uso del sector, ejecutar limpieza y sanitizacion inmediata, y registrar verificacion.',
      correctiva: 'Reforzar POES, asignar responsable de cierre y verificar limpieza con checklist.'
    },
    registros: {
      inmediata: 'Solicitar completar registros faltantes y verificar datos criticos del turno.',
      correctiva: 'Implementar control diario de documentacion y responsable de revision por area.'
    },
    personal: {
      inmediata: 'Redistribuir tareas para sostener la operacion sin afectar el servicio.',
      correctiva: 'Definir plan de reemplazos y cobertura minima por turno.'
    },
    mejora: {
      inmediata: 'Coordinar implementacion de la mejora y asignar responsable con fecha.',
      correctiva: 'Estandarizar la mejora en procedimiento/documentacion y verificar eficacia.'
    },
    general: {
      inmediata: 'Contener el desvio detectado y registrar evidencia del evento.',
      correctiva: 'Aplicar analisis de causa raiz y definir plan de accion con seguimiento.'
    }
  };

  if (resultadoFinal === 'Conforme') {
    return {
      accionInmediataFinal: accionInmediataDetectada || 'Sin accion inmediata requerida.',
      accionCorrectivaFinal: accionCorrectivaDetectada || 'Sin accion correctiva requerida.'
    };
  }

  const scenario = detectScenario(text);
  const keepImmediate = accionInmediataDetectada && !isGenericAction(accionInmediataDetectada);
  const keepCorrective = accionCorrectivaDetectada && !isGenericAction(accionCorrectivaDetectada);

  return {
    accionInmediataFinal: keepImmediate ? accionInmediataDetectada : templates[scenario].inmediata,
    accionCorrectivaFinal: keepCorrective ? accionCorrectivaDetectada : templates[scenario].correctiva
  };
}

function classifyConfidence(text, areaFinal, resultadoFinal) {
  if (!text || resultadoFinal === 'Revisar manualmente' || areaFinal === 'Área no identificada') return 'Baja';
  const strongSignals = [
    'mal estado', 'devolucion', 'faltante', 'demora', 'falla', 'sucio', 'restos de carne',
    'agua caliente', 'registro incompleto', 'registros incompletos', 'ausencia'
  ];
  const signalCount = strongSignals.filter((s) => text.includes(s)).length;
  if (signalCount >= 2) return 'Alta';
  if (signalCount === 1) return 'Media';
  return 'Media';
}

function compareNormalized(a, b) {
  return normalizeText(a) === normalizeText(b);
}

export function refinePreClassification(input) {
  const text = normalizeText(input?.texto || '');
  const areaFinal = classifyArea(text, input?.areaDetectada || '');
  const outcome = classifyOutcome(text, input?.resultadoDetectado || '', input?.tipoDetectado || '');
  const resultadoFinal = outcome.resultadoFinal;
  const tipoFinal = outcome.tipoFinal;
  const isoFinal = classifyIso(text, areaFinal, resultadoFinal, input?.isoDetectado || '');
  const actions = buildActions(
    text,
    resultadoFinal,
    input?.accionInmediataDetectada || '',
    input?.accionCorrectivaDetectada || ''
  );

  const confianza = classifyConfidence(text, areaFinal, resultadoFinal);
  const explicacion = `Area priorizada por evento real; resultado ${resultadoFinal} por impacto operativo; ISO asignado por especificidad (${isoFinal}).`;

  const cambioRealizado = !(
    compareNormalized(areaFinal, input?.areaDetectada || '') &&
    compareNormalized(resultadoFinal, input?.resultadoDetectado || '') &&
    compareNormalized(tipoFinal, input?.tipoDetectado || '') &&
    compareNormalized(isoFinal, input?.isoDetectado || '') &&
    compareNormalized(actions.accionInmediataFinal, input?.accionInmediataDetectada || '') &&
    compareNormalized(actions.accionCorrectivaFinal, input?.accionCorrectivaDetectada || '')
  );

  return {
    areaFinal: areaFinal || 'Área no identificada',
    resultadoFinal: resultadoFinal || 'Revisar manualmente',
    tipoFinal: tipoFinal || '-',
    isoFinal: isoFinal || 'Sin clasificar',
    accionInmediataFinal: actions.accionInmediataFinal || 'Contener el evento y registrar evidencia.',
    accionCorrectivaFinal: actions.accionCorrectivaFinal || 'Definir accion correctiva con causa raiz.',
    cambioRealizado,
    explicacion,
    confianza
  };
}

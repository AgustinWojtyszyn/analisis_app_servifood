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

function isYesLike(value) {
  const text = normalizeText(value);
  if (!text) return false;
  return ['si', 'yes', 'true', 'x', '1'].includes(text);
}

function isNoLike(value) {
  const text = normalizeText(value);
  if (!text) return false;
  return ['no', 'false', '0'].includes(text);
}

function isConformeLike(value) {
  return normalizeText(value) === 'conforme';
}

function isNoConformeLike(value) {
  const text = normalizeText(value);
  return text === 'no conforme' || text.includes('no conforme');
}

function extractCameraLocations(text) {
  const input = normalizeText(text || '');
  const regex = /camara\s*(n°|nº|numero)?\s*([0-9, y]+)/gi;
  const all = [];
  let match = regex.exec(input);

  while (match) {
    const nums = (match[2] || '').match(/\d+/g) || [];
    all.push(...nums);
    match = regex.exec(input);
  }

  return [...new Set(all.filter((n) => /^\d+$/.test(n)))].map((n) => `Cámara ${n}`);
}

function detectExactLocations(text) {
  const normalized = normalizeText(text);
  const cameraLocations = extractCameraLocations(normalized);
  const heladeraAreas = [];
  const hotEquipmentAreas = [];
  const sectorAreas = [];
  const clientAreas = [];

  const hasHeladera = normalized.includes('heladera') || normalized.includes('heladeras');
  const hasAF = /\baf\b/.test(` ${normalized} `) || normalized.includes('area fria');
  const hasAC = /\bac\b/.test(` ${normalized} `) || normalized.includes('area caliente');
  if (hasHeladera && hasAF) heladeraAreas.push('Área fría');
  if (hasHeladera && hasAC) heladeraAreas.push('Área caliente');

  if (includesAny(normalized, [
    'horno',
    'hornos',
    'cocina',
    'coccion',
    'marmita',
    'marmitas',
    'freidora',
    'freidoras',
    'plancha',
    'planchas',
    'olla',
    'ollas',
    'preparacion caliente',
    'linea caliente',
    'costillas',
    'almuerzos calientes'
  ])) {
    hotEquipmentAreas.push('Área caliente');
  }

  if (includesAny(normalized, ['deposito'])) sectorAreas.push('Depósito');
  if (includesAny(normalized, ['pre elaborados', 'preelaborados', 'pre elaborado', 'pre-elaborados'])) sectorAreas.push('Área de pre elaborados');
  if (includesAny(normalized, ['linea de bachas', 'bachas'])) sectorAreas.push('Higiene / Sanitización');
  if (includesAny(normalized, ['cebro exterior', 'cebros exteriores', 'cebo', 'cebos', 'exterior', 'residuo', 'residuos', 'basura', 'desecho'])) {
    sectorAreas.push('Área de residuos');
  }
  if (includesAny(normalized, ['easy', 'scop', 'hospital mental', 'pocito', 'la laja'])) {
    clientAreas.push('Logística / Distribución');
  }

  return {
    cameraLocations: [...new Set(cameraLocations)],
    heladeraAreas: [...new Set(heladeraAreas)],
    hotEquipmentAreas: [...new Set(hotEquipmentAreas)],
    sectorAreas: [...new Set(sectorAreas)],
    clientAreas: [...new Set(clientAreas)]
  };
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

function dedupeActionText(value) {
  const chunks = String(value || '')
    .split(/[|.;\n]/)
    .map((item) => String(item || '').trim())
    .filter(Boolean);
  const unique = [];
  const seen = new Set();
  chunks.forEach((chunk) => {
    const norm = normalizeText(chunk);
    if (!norm || seen.has(norm)) return;
    seen.add(norm);
    unique.push(chunk);
  });
  return unique.join('. ');
}

function classifyArea(text, preDetectedArea = '') {
  const exact = detectExactLocations(text);
  if (exact.cameraLocations.length > 0) return exact.cameraLocations.join(' / ');
  if (exact.heladeraAreas.length > 0) return exact.heladeraAreas.join(' / ');
  if (exact.hotEquipmentAreas.length > 0) return exact.hotEquipmentAreas.join(' / ');
  if (exact.sectorAreas.length > 0) return exact.sectorAreas.join(' / ');
  if (exact.clientAreas.length > 0) return exact.clientAreas.join(' / ');

  if (includesAny(text, ['cebro exterior', 'cebros exteriores', 'cebo', 'cebos', 'exterior'])) {
    return 'Área de residuos';
  }

  const nonPhysicalSignals = includesAny(text, [
    'proveedor',
    'evaluacion de proveedor',
    'drive',
    'documentacion',
    'evaluaciones',
    'capacitacion',
    'curso',
    'formacion'
  ]);
  const depositoPhysicalSignals = includesAny(text, [
    'deposito',
    'stock',
    'mercaderia',
    'almacenamiento',
    'almacenar',
    'bodega'
  ]);
  if (nonPhysicalSignals && !depositoPhysicalSignals && !includesAny(text, ['camara', 'heladera', 'cocina', 'residuo', 'basura', 'lavadero', 'comedor'])) {
    return 'Área no identificada';
  }

  const hasHygieneSignal = includesAny(text, ['limpieza', 'sucio', 'suciedad', 'restos de carne', 'sin limpiar', 'sanitizacion', 'higiene']);
  const hasColdSignal = includesAny(text, ['camara', 'heladera']);
  const hasHotSignal = includesAny(text, ['horno', 'cocina', 'coccion', 'linea caliente', 'marmita', 'freidora', 'plancha', 'costillas', 'almuerzos calientes']);

  if (hasHygieneSignal && hasColdSignal) return 'Higiene / Sanitización / Área fría';
  if (hasHygieneSignal && hasHotSignal) return 'Higiene / Sanitización / Área caliente';
  if (hasHygieneSignal) return 'Higiene / Sanitización';

  const scores = new Map();
  const add = (area, points) => scores.set(area, (scores.get(area) || 0) + points);

  if (includesAny(text, ['demora', 'entrega al cliente', 'entrega cliente', 'despacho', 'reparto', 'cliente', 'easy', 'hospital mental', 'pocito', 'la laja', 'faltaron almuerzos'])) {
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

  if (includesAny(text, ['deposito', 'recepcion', 'stock', 'mercaderia', 'almacenamiento', 'almacenar', 'ingreso de mercaderia', 'faltante de insumos'])) {
    add('Depósito', 6);
  }

  if (includesAny(text, ['auditoria', 'registro', 'registros incompletos', 'falta de firma', 'procedimiento', 'documentacion', 'documental', 'sistema documental', 'revision documental', 'drive', 'control de registros'])) {
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

function classifyOutcome(text, preDetectedResult = '', preDetectedType = '', context = {}) {
  const isSinHallazgoText = text === 'sin hallazgo detectado';
  const detectionLeadSignals = ['se detecta', 'se encuentran', 'se observa'];
  if (!text) {
    const resultadoOriginalNorm = normalizeText(context?.resultadoOriginal || '');
    const desvioOriginalSi = isYesLike(context?.desvioOriginal || '');
    if (resultadoOriginalNorm === 'no conforme' || resultadoOriginalNorm.includes('no conforme') || desvioOriginalSi) {
      return {
        resultadoFinal: 'No conforme',
        tipoFinal: 'NC',
        reason: desvioOriginalSi ? 'desvio original marcado' : 'resultado original no conforme'
      };
    }
    const resultadoOriginalVacio = !resultadoOriginalNorm;
    if (resultadoOriginalVacio) {
      return {
        resultadoFinal: 'Revisar manualmente',
        tipoFinal: '-',
        reason: 'texto vacio y resultado original vacio/ilegible'
      };
    }
    return {
      resultadoFinal: 'Conforme',
      tipoFinal: '-',
      reason: 'texto vacio; se respeta resultado original informado'
    };
  }

  const controlSignals = [
    'se controla',
    'se realiza control',
    'se verifica',
    'registro de temperatura',
    'se revisa',
    'se inspecciona'
  ];
  const realNcSignals = [
    'cebos',
    'plagas',
    'cucarachas',
    'falta registro',
    'registro incompleto',
    'no se registro',
    'sin registro',
    'sin control',
    'no dispone',
    'faltante de producto',
    'fuera de temperatura',
    'producto en mal estado',
    'producto defectuoso',
    'defectuoso',
    'sector sucio',
    'sucio',
    'falla',
    'no funciona',
    'fuera de uso',
    'alarma no funciona',
    'no cumple',
    'proveedor no cumple',
    'incumplimiento de proveedor',
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
  const hasControlSignal = includesAny(text, controlSignals);
  const hasDetectionLeadSignal = includesAny(text, detectionLeadSignals);
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
    'seguimiento',
    'renovacion',
    'listado actualizado'
  ];
  const explicitOmSignals = ['oportunidad de mejora', 'mejora continua'];
  const resultadoOriginal = context?.resultadoOriginal || '';
  const resultadoOriginalNorm = normalizeText(resultadoOriginal);
  const resultadoEsConforme = isConformeLike(resultadoOriginal);
  const resultadoEsNoConforme = isNoConformeLike(resultadoOriginal);
  const desvioOriginalSi = isYesLike(context?.desvioOriginal || '');
  const desvioOriginalNo = isNoLike(context?.desvioOriginal || '');
  const hasAdminNeutralSignal = includesAny(text, adminNeutralSignals);
  const hasExplicitOmSignal = includesAny(text, explicitOmSignals);
  const hasDocSystemWorkSignal = includesAny(text, [
    'se trabaja en revision del sistema de gestion documental',
    'se trabaja en revision del sistema documental'
  ]);
  const hasProveedorConformeSignal = includesAny(text, ['se realiza contacto con proveedor', 'contacto con proveedor']);
  const hasRealNcSignal = includesAny(text, realNcSignals)
    || /\bno se\s+registro\b/.test(text)
    || /\bno se\s+registra\b/.test(text)
    || /\bsin\s+registros?\b/.test(text)
    || /\bfaltan?\s+registros?\b/.test(text)
    || /\bregistros?\s+incompletos?\b/.test(text)
    || /\bfuera\s+de\s+temperatura\b/.test(text)
    || /\bproducto\s+en\s+mal\s+estado\b/.test(text)
    || /\bsector\s+sucio\b/.test(text)
    || /\bno\s+funciona\b/.test(text)
    || /\bfalla(n|ndo|do)?\b/.test(text)
    || /\bfuera\s+de\s+uso\b/.test(text)
    || /\bno\s+disponen?\b/.test(text);
  const hasActionSignal = includesAny(text, actionSignals);

  if (isSinHallazgoText) {
    return { resultadoFinal: 'Revisar manualmente', tipoFinal: '-', reason: 'texto explícito sin hallazgo' };
  }

  if (hasDetectionLeadSignal && hasRealNcSignal) {
    return { resultadoFinal: 'No conforme', tipoFinal: 'NC', reason: 'detección explícita de problema real' };
  }

  // Prioridad 1: NC real operativo (override fuerte).
  if (hasRealNcSignal) {
    return {
      resultadoFinal: 'No conforme',
      tipoFinal: 'NC',
      reason: hasControlSignal ? 'override NC real en actividad de control' : 'override por desvio operativo real'
    };
  }

  if (hasControlSignal || hasProveedorConformeSignal) {
    return { resultadoFinal: 'Conforme', tipoFinal: '-', reason: hasProveedorConformeSignal ? 'gestion con proveedor sin problema explicito' : 'control operativo sin error' };
  }

  // Prioridad 2: resultado reportado en Excel.
  if (resultadoEsNoConforme || desvioOriginalSi) {
    return { resultadoFinal: 'No conforme', tipoFinal: 'NC', reason: desvioOriginalSi ? 'desvio original marcado' : 'resultado original no conforme' };
  }

  if (resultadoEsConforme && hasExplicitOmSignal) {
    return { resultadoFinal: 'Oportunidad de mejora', tipoFinal: 'OM', reason: 'mejora explicita del sistema' };
  }

  // Prioridad 3: texto de accion/seguimiento (no NC), sin desvio real ni marca NC en origen.
  if (hasActionSignal) {
    return {
      resultadoFinal: 'Conforme',
      tipoFinal: '-',
      reason: 'texto de accion o seguimiento (no NC)'
    };
  }

  if (resultadoEsConforme && (desvioOriginalNo || !desvioOriginalSi)) {
    return { resultadoFinal: 'Conforme', tipoFinal: '-', reason: 'resultado original conforme sin desvio' };
  }

  if (hasControlSignal || hasAdminNeutralSignal || hasDocSystemWorkSignal) {
    if (!resultadoOriginalNorm) {
      return { resultadoFinal: 'Revisar manualmente', tipoFinal: '-', reason: 'resultado original vacio o ilegible' };
    }
    return { resultadoFinal: 'Conforme', tipoFinal: '-', reason: 'actividad administrativa/control sin desvio explicito' };
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

  if (!resultadoOriginalNorm) {
    return { resultadoFinal: 'Revisar manualmente', tipoFinal: '-', reason: 'resultado original vacio o ilegible' };
  }

  return { resultadoFinal: 'Conforme', tipoFinal: '-', reason: 'sin senales de desvio; se respeta resultado original informado' };
}

function classifyIso(text, areaFinal, resultadoFinal, preDetectedIso = '') {
  if (!text) return preDetectedIso || 'Sin clasificar';
  if (includesAny(text, ['cebos', 'plagas', 'exterior'])) return '8.2 Programas prerrequisito / POES / BPM';
  if (includesAny(text, ['auditoria interna', 'auditoria', 'cumplimiento bajo'])) return '9.2 Auditoría interna';
  if (includesAny(text, ['capacitacion', 'competencia', 'formacion', 'entrenamiento', 'curso', 'manual de manipuladores', 'manual de manipulador'])) return '7.2 Competencia / capacitación';
  if (includesAny(text, ['registro', 'planilla', 'falta de firma', 'documentacion', 'drive'])) return '7.5 Información documentada';
  if (includesAny(text, ['mal estado', 'contaminacion', 'limpieza', 'sanitizacion', 'camara', 'heladera', 'agua caliente', 'poes', 'sucio', 'suciedad', 'restos de carne'])) return '8.5 Control de peligros / HACCP / OPRP / PCC';
  if (includesAny(text, ['entrega al cliente', 'entrega cliente', 'despacho', 'faltante', 'demora', 'cliente', 'reparto'])) return '8.1 Planificación y control operacional';
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
      accionInmediataFinal: dedupeActionText(String(accionInmediataDetectada || '').replace(/\bcalidad\b/gi, '').trim()),
      accionCorrectivaFinal: ''
    };
  }

  const scenario = detectScenario(text);
  const keepImmediate = accionInmediataDetectada && !isGenericAction(accionInmediataDetectada);
  const keepCorrective = accionCorrectivaDetectada && !isGenericAction(accionCorrectivaDetectada);

  const correctiveFromProblem = (() => {
    if (includesAny(text, ['falta registro', 'registro incompleto', 'sin registro', 'planilla'])) return 'Implementar control diario de registros.';
    if (includesAny(text, ['temperatura', 'camara', 'conservacion', 'fuera de'])) return 'Implementar monitoreo diario de temperatura y verificación por turno.';
    if (includesAny(text, ['sucio', 'limpieza', 'poes', 'plagas', 'cebos'])) return 'Reforzar POES con checklist diario y verificación de cierre.';
    if (includesAny(text, ['mal estado', 'vencido'])) return 'Reforzar control de recepción y segregación de producto no conforme.';
    if (includesAny(text, ['no funciona', 'falla', 'equipo'])) return 'Programar mantenimiento correctivo y control de funcionamiento previo al uso.';
    if (includesAny(text, ['faltante'])) return 'Implementar doble verificación diaria de stock y despacho.';
    return 'Definir acción correctiva específica según causa raíz del incumplimiento.';
  })();

  return {
    accionInmediataFinal: dedupeActionText((keepImmediate ? accionInmediataDetectada : templates[scenario].inmediata || '').replace(/\bcalidad\b/gi, '').trim()),
    accionCorrectivaFinal: dedupeActionText((keepCorrective ? accionCorrectivaDetectada : correctiveFromProblem || templates[scenario].correctiva || '').trim())
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
  const outcome = classifyOutcome(text, input?.resultadoDetectado || '', input?.tipoDetectado || '', {
    tipoActividad: input?.tipoActividad || '',
    resultadoOriginal: input?.resultadoOriginal || '',
    desvioOriginal: input?.desvioOriginal || ''
  });
  const hasResultadoDetectado = Boolean(normalizeText(input?.resultadoDetectado || ''));
  const hasTipoDetectado = Boolean(normalizeText(input?.tipoDetectado || ''));
  const hasIsoDetectado = Boolean(normalizeText(input?.isoDetectado || ''));

  const resultadoComputed = outcome.resultadoFinal;
  const tipoComputed = outcome.tipoFinal;
  const resultadoFinal = hasResultadoDetectado ? input?.resultadoDetectado : resultadoComputed;
  const tipoFinal = hasTipoDetectado ? input?.tipoDetectado : tipoComputed;

  const isoComputed = classifyIso(text, areaFinal, resultadoComputed, input?.isoDetectado || '');
  const isoFinal = hasIsoDetectado ? input?.isoDetectado : isoComputed;
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
    accionInmediataFinal: actions.accionInmediataFinal || '',
    accionCorrectivaFinal: actions.accionCorrectivaFinal || '',
    cambioRealizado,
    explicacion,
    confianza
  };
}

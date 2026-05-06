import {
  normalizeCellValue,
  normalizeForMatch,
  normalizeIncidentText,
  containsAny,
  isYesLike,
  isNoLike,
  isConformeLike,
  isNoConformeLike
} from '../../../analyzeExcel/normalizers.js';

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
    'falta de', 'falta registro', 'falta de registro', 'falta de orden', 'falta de etiquetado', 'incompleto', 'incompleta', 'incompletos', 'sin registro', 'sin evidencia', 'fuera de rango', 'vencido', 'vencida', 'no funciona', 'mal estado', 'sucio', 'sucia', 'contaminado', 'contaminada', 'incumplimiento', 'no cumple', 'ausencia de', 'ausencia de epp', 'falta de epp', 'falta de calzado', 'falta de ropa de trabajo', 'no dispone', 'no disponen', 'no cuenta con', 'no cuentan con', 'carece de', 'carecen de', 'sin epp', 'sin calzado', 'sin ropa de trabajo', 'desvio', 'desvío'
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
    'sin rotular', 'sin rotulacion', 'sin rotulación', 'falta rotular', 'falta rotulacion', 'falta rotulación', 'falta de rotulacion', 'falta de rotulación', 'falta carteleria', 'falta cartelería', 'falta de carteleria', 'falta de cartelería', 'registro incompleto', 'registros incompletos', 'incompleto', 'incompleta', 'incompletos', 'incompletas', 'sin registro', 'sin evidencia', 'no dispone', 'no disponen', 'no cuenta con', 'no cuentan con', 'carece de', 'carecen de', 'sin epp', 'sin calzado', 'sin ropa de trabajo', 'no limpias', 'no limpia', 'no se encuentran limpias', 'sucio', 'sucia', 'sucios', 'sucias', 'contaminado', 'contaminada', 'contaminados', 'contaminadas', 'fuera de rango', 'vencido', 'vencida', 'vencidos', 'vencidas', 'no cumple', 'incumplimiento'
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
    'desorden', 'desordenado', 'desordenada', 'desordenados', 'desordenadas', 'bines', 'ocupando espacios', 'objetos ajenos', 'fuera de lugar'
  ]);
}

function isNeutralTechnicalMention(text) {
  const normalized = normalizeIncidentText(text || '');
  if (!normalized) return false;
  if (hasExplicitNegativeSignal(normalized)) return false;

  const neutralSignals = [
    'registro de temperatura', 'control de camaras', 'control de cámaras', 'control de heladeras', 'heladera', 'heladeras', 'verificacion de registros', 'verificación de registros', 'control de documentacion', 'control de documentación', 'recorrido de planta', 'control de registros', 'control de temperatura', 'registro de camara', 'registro de cámara'
  ];
  return containsAny(normalized, neutralSignals);
}

function classifyTechnicalControlRule(text) {
  const normalized = normalizeIncidentText(text || '');
  if (!normalized) return null;

  const technicalSignals = ['registro', 'control', 'verificacion', 'temperatura', 'camara', 'heladera', 'freezer'];
  const explicitProblemIndicators = ['falta', 'faltante', 'sin registro', 'incompleto', 'incompleta', 'fuera de rango', 'vencido', 'vencida', 'no funciona', 'no registra', 'error', 'incorrecto', 'incorrecta', 'mal', 'desvio', 'anomalia', 'roto', 'rota', 'mal estado'];

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

  if (containsAny(normalized, ['sin rotular', 'sin rotulacion', 'sin rotulación', 'falta rotular', 'falta de rotular', 'alimentos sin rotular'])) {
    return { resultadoClasificado: 'No conforme', tipoDesvio: 'NC', iso22000: '8.5.2 Trazabilidad', reason: 'NC por incumplimiento de trazabilidad/rotulado' };
  }
  if (containsAny(normalized, ['sucio', 'sucia', 'sucios', 'sucias', 'suciedad', 'sin limpiar', 'restos'])) {
    return { resultadoClasificado: 'No conforme', tipoDesvio: 'NC', iso22000: '8.2 PRP Limpieza', reason: 'NC por incumplimiento de limpieza' };
  }
  if (containsAny(normalized, ['no funciona', 'fallando', 'falla equipo', 'equipo fallando', 'freezer no funciona', 'heladera no funciona', 'camara no funciona', 'cámara no funciona'])) {
    return { resultadoClasificado: 'No conforme', tipoDesvio: 'NC', iso22000: '8.5.1 Control operacional', reason: 'NC por falla de equipamiento operativo' };
  }
  if (containsAny(normalized, ['faltante', 'faltaron', 'falta de', 'sin stock'])) {
    return { resultadoClasificado: 'No conforme', tipoDesvio: 'NC', iso22000: '8.5.1 Control operacional', reason: 'NC por faltante operativo' };
  }
  if (containsAny(normalized, ['residuos', 'basura acumulada', 'cesto rebalsado', 'cesto rebalsado', 'bolsas rotas'])) {
    return { resultadoClasificado: 'No conforme', tipoDesvio: 'NC', iso22000: '8.2 PRP Limpieza', reason: 'NC por gestión deficiente de residuos' };
  }

  return null;
}

function hasRowContinuationSignal(text) {
  const raw = normalizeCellValue(text || '').trim();
  if (!raw) return false;
  const normalized = normalizeIncidentText(raw);
  const strongTail = /[;:,]\s*$/.test(raw);
  const explicitContinuation = containsAny(normalized, ['falta', 'se solicita', 'los mismos completos', 'completar a cada area', 'completar a cada área']);
  return strongTail || explicitContinuation;
}

function isExplicitNoFindingText(text) {
  const normalized = normalizeIncidentText(text || '');
  if (!normalized) return false;
  const compact = normalized.replace(/\s+/g, ' ').trim();
  if (['sin hallazgo detectado', 'sin hallazgo', 'sin hallazgos', 'sin observaciones', 'sin desvios', 'sin desvio', 'sin novedades', 'correcto', 'ok', 'conforme'].includes(compact)) {
    return true;
  }
  return containsAny(normalized, ['sin hallazgo detectado', 'sin hallazgo', 'sin hallazgos', 'sin observaciones', 'sin desvios', 'sin desvio', 'no se detectan hallazgos', 'no se observan desvios', 'no se observan desvíos']);
}

function isExplicitNoFindingRawValue(text) {
  const normalized = normalizeIncidentText(text || '');
  if (!normalized) return false;
  return ['sin hallazgo detectado', 'sin observaciones', 'sin desvios', 'sin desvio', 'sin novedades', 'conforme', 'ok', 'correcto'].includes(normalized);
}

function isAutoGeneratedConformeRecord(record = {}) {
  const hallazgo = normalizeForMatch(record.hallazgoDetectado || '');
  const area = normalizeForMatch(record.areaClasificada || '');
  const responsable = normalizeForMatch(record.responsable || '');
  const descripcion = normalizeCellValue(record.descripcion || '').trim();
  const observaciones = normalizeCellValue(record.observaciones || '').trim();
  const notaTecnica = normalizeCellValue(record.notaTecnica || '').trim();

  const emptyLike = (value) => {
    const normalized = normalizeForMatch(value || '');
    return !normalized || normalized === '-' || normalized === 'n a' || normalized === 'na';
  };

  return hallazgo === normalizeForMatch('Sin hallazgo detectado')
    && area === normalizeForMatch('Área no identificada')
    && responsable === normalizeForMatch('Responsable a definir')
    && emptyLike(descripcion)
    && emptyLike(observaciones)
    && emptyLike(notaTecnica);
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

  if (hasAny(['producto no conforme', 'producto nc', 'productos no conformes', 'carteleria de producto no conforme', 'cartelería de producto no conforme'])) {
    return build('No conforme', 'NC', '8.7 Control de salidas no conformes', 'NC por producto no conforme');
  }

  if (hasAny(['habilitacion', 'habilitación', 'habilitacion municipal', 'habilitación municipal', 'carnet', 'carnet manipulador', 'libreta sanitaria', 'documentacion legal', 'documentación legal', 'certificado vencido', 'requisito legal', 'incumplimiento legal', 'normativa legal'])) {
    return build('No conforme', 'NC', 'Requisito legal / Documentación legal', 'NC por incumplimiento legal/documental');
  }

  const hasResiduos = hasAny(['residuos', 'basura', 'contenedor', 'contenedores', 'carton', 'cartón', 'bolsas vacias', 'bolsas vacías', 'cajas vacias', 'cajas vacías', 'tacho', 'tachos']);

  if (hasResiduos && hasAny(['sin identificar', 'sin identificacion', 'sin identificación', 'falta identificacion', 'falta identificación', 'carteleria', 'cartelería'])) {
    return build('No conforme', 'NC', '8.2 PRP Manejo residuos', 'NC por manejo de residuos');
  }

  if (hasAny(['sin rotular', 'falta rotulacion', 'falta rotulación', 'rotulacion', 'rotulación', 'rotulo', 'rótulo', 'sin identificar', 'sin identificacion', 'sin identificación', 'falta identificacion', 'falta identificación', 'etiqueta', 'fecha de elaboracion', 'fecha de elaboración', 'fecha de vencimiento', 'vencimiento'])) {
    return build('No conforme', 'NC', '8.5.2 Trazabilidad', 'NC por trazabilidad/rotulación');
  }

  if (hasResiduos) {
    return build('No conforme', 'NC', '8.2 PRP Manejo residuos', 'NC por manejo de residuos');
  }

  const hasCarteleriaGeneral = hasAny(['falta carteleria', 'falta cartelería', 'sin carteleria', 'sin cartelería', 'carteleria', 'cartelería']);
  if (hasCarteleriaGeneral) {
    return build('No conforme', 'NC', '8.2 PRP Identificación', 'NC por falta de cartelería/identificación');
  }

  if (hasAny(['bandeja rota', 'bandejas rotas', 'envase sin integridad', 'envases sin integridad', 'sin integridad', 'mal estado', 'roto', 'rota', 'rotos', 'rotas', 'deteriorado', 'deteriorada', 'deteriorados', 'deterioradas'])) {
    return build('No conforme', 'NC', '7.1.3 Equipamiento', 'NC por integridad/equipamiento');
  }

  if (hasAny(['faltante', 'faltantes', 'faltaron', 'falto', 'faltó', 'unidades', 'menu', 'menú', 'viandas faltantes', 'pedido incompleto', 'pedidos incompletos', 'bifes', 'callia', 'caliia'])) {
    return build('No conforme', 'NC', '8.5.1 Control operacional', 'NC por faltante/control operacional');
  }

  if (hasAny(['sucio', 'sucia', 'sucios', 'sucias', 'falta limpieza', 'limpieza deficiente', 'higiene', 'restos de alimentos', 'restos de comida', 'charcos', 'piso sucio', 'instalaciones sucias', 'elementos sucios', 'sector sucio'])) {
    return build('No conforme', 'NC', '8.2 PRP Limpieza', 'NC por limpieza/higiene');
  }

  const hasOrderSignal = hasAny(['desorden', 'desordenado', 'desordenada', 'desordenados', 'desordenadas', 'falta de orden', 'orden en general', 'heladeras desordenadas', 'sector desordenado']);
  const hasDirectRisk = hasAny(['sucio', 'sucia', 'sucios', 'sucias', 'rotulacion', 'rotulación', 'sin rotular', 'residuos', 'basura', 'producto no conforme', 'roto', 'rota', 'rotos', 'rotas', 'deteriorado', 'deteriorada', 'vencido', 'vencida', 'vencimiento', 'faltante', 'faltantes', 'faltaron', 'faltó', 'falto']);
  if (hasOrderSignal && !hasDirectRisk) {
    return build('No conforme', 'NC', '8.2 PRP Orden', 'NC por falta de orden');
  }

  const hasAjenosOPersonales = hasAny(['productos ajenos', 'elementos ajenos', 'objetos ajenos', 'riñonera', 'rinonera', 'mochila', 'bolso', 'cartera', 'ropa', 'pertenencias personales']);
  const hasAreaProductiva = hasAny(['pre elaborado', 'pre elaborados', 'preelaborado', 'preelaborados', 'area fria', 'área fría', 'area caliente', 'área caliente', 'deposito', 'depósito', 'cocina', 'elaboracion', 'elaboración']);
  if (hasAjenosOPersonales && hasAreaProductiva) {
    return build('No conforme', 'NC', '8.2 PRP Higiene', 'NC por objetos/personales en área productiva');
  }

  const hasTechnicalSignal = hasAny(['registro', 'control', 'verificacion', 'verificación', 'temperatura', 'camara', 'cámara', 'heladera', 'freezer']);
  const hasTechnicalProblem = hasAny(['falta', 'faltante', 'sin registro', 'incompleto', 'incompleta', 'fuera de rango', 'vencido', 'vencida', 'no funciona', 'no registra', 'error', 'incorrecto', 'incorrecta', 'mal', 'desvio', 'desvío', 'anomalia', 'anomalía']);
  if (hasTechnicalSignal && hasTechnicalProblem) {
    return build('No conforme', 'NC', '8.5.1 Control operacional', 'NC por problema técnico explícito');
  }
  if (hasTechnicalSignal) {
    return build('Conforme', '-', '-', 'Conforme por registro técnico neutro');
  }

  return build('Revisar manualmente', '-', 'Revisar manualmente', 'texto ambiguo o incompleto');
}

function normalizeToTriadClassification({ categoriaDesvio = '', resultadoClasificado = '', tipoDesvio = '' }) {
  const categoria = normalizeCellValue(categoriaDesvio).trim();
  if (categoria === 'Desvío Legal') return { resultadoClasificado, tipoDesvio: tipoDesvio || 'NC', categoriaDesvio: 'Desvío Legal' };
  if (categoria === 'Desvío de Logística') return { resultadoClasificado, tipoDesvio: tipoDesvio || 'NC', categoriaDesvio: 'Desvío de Logística' };
  if (categoria === 'Desvío de Inocuidad') return { resultadoClasificado, tipoDesvio: tipoDesvio || 'NC', categoriaDesvio: 'Desvío de Inocuidad' };

  const tipo = normalizeCellValue(tipoDesvio).trim();
  if (['NC', 'OBS', 'OM'].includes(tipo)) return { resultadoClasificado, tipoDesvio: tipo, categoriaDesvio: 'Desvío de Inocuidad' };
  if (tipo === '-') return { resultadoClasificado, tipoDesvio: '-', categoriaDesvio: categoria || 'Conforme' };

  return { resultadoClasificado, tipoDesvio, categoriaDesvio };
}

function normalizeFinalOutcomeAndType({ resultadoClasificado = '', tipoDesvio = '' }) {
  const tipo = normalizeCellValue(tipoDesvio).trim().toUpperCase();
  const allowedTipo = new Set(['IN', 'LE', 'LGT', 'NC', 'OBS', 'OM', '-']);
  const normalizedTipo = allowedTipo.has(tipo) ? tipo : '-';

  if (normalizedTipo === '-') return { resultadoClasificado: 'Conforme', tipoDesvio: '-' };
  return { resultadoClasificado: 'No conforme', tipoDesvio: normalizedTipo };
}

function mapTipoFromCategoria(categoriaDesvio = '', fallbackTipo = '') {
  const categoria = normalizeCellValue(categoriaDesvio).trim();
  if (categoria === 'Desvío de Inocuidad') return 'IN';
  if (categoria === 'Desvío Legal') return 'LE';
  if (categoria === 'Desvío de Logística') return 'LGT';
  return normalizeCellValue(fallbackTipo).trim();
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
    'cebos','plagas','cucarachas','faltante','incompleto','sin registro','sin temperatura','sin rotular','fuera de rango','mal estado','producto defectuoso','defectuoso','proveedor no cumple','incumplimiento de proveedor','falta de personal','falto personal','faltó personal','ausencia de personal','sin personal','no funciona','no cumple','sucio','vencido'
  ];
  const actionSignals = ['reponer', 'se solicita', 'pendiente', 'se realizara', 'se coordina', 'se planifica', 'gestionar', 'se entrega', 'se pasa a'];
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
  const adminNeutralSignals = ['cumplido', 'se solicita', 'se colocan', 'se realiza check', 'se entrega', 'se controla', 'se revisa', 'se sube al drive', 'se coordina', 'se planifica', 'plan de accion', 'plan de acción', 'seguimiento', 'renovacion', 'renovación', 'listado actualizado'];
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

  if (isSinHallazgoText) return { resultadoClasificado: 'Conforme', tipoDesvio: '-', reason: 'Conforme por sin hallazgo explícito' };

  const auditCompliance = classifyAuditCompliance(text);
  if (auditCompliance) return { resultadoClasificado: auditCompliance.classification, tipoDesvio: auditCompliance.tipoDesvio, reason: auditCompliance.reason };

  const normalizedRule = classifyNormalizedRule(text);
  if (normalizedRule) return { resultadoClasificado: normalizedRule.resultadoClasificado, tipoDesvio: normalizedRule.tipoDesvio, reason: normalizedRule.reason };

  const priorityOperationalRule = classifyPriorityOperationalRule(text);
  if (priorityOperationalRule) return { resultadoClasificado: priorityOperationalRule.resultadoClasificado, tipoDesvio: priorityOperationalRule.tipoDesvio, reason: priorityOperationalRule.reason };

  const technicalControlRule = classifyTechnicalControlRule(text);
  if (technicalControlRule) return { resultadoClasificado: technicalControlRule.resultadoClasificado, tipoDesvio: technicalControlRule.tipoDesvio, reason: technicalControlRule.reason };

  if (hasDetectionLeadSignal && hasRealNcSignal) return { resultadoClasificado: 'No conforme', tipoDesvio: 'NC', reason: 'detección explícita de problema real' };
  if (criticalNegativeSignal) return { resultadoClasificado: 'No conforme', tipoDesvio: 'NC', reason: `NC por señal crítica: ${criticalNegativeSignal}` };
  if (inheritedNegativeContext && hasTechnicalMentionSignal && !hasRealNcSignal) return { resultadoClasificado: 'No conforme', tipoDesvio: 'NC', reason: 'NC por contexto heredado de fila anterior' };
  if (hasMildObservationSignal(text)) return { resultadoClasificado: 'Observación', tipoDesvio: 'OBS', reason: 'OBS por señal leve' };

  if (hasTechnicalMentionSignal && !hasRealNcSignal && !resultadoEsNoConforme && !desvioSi) {
    return { resultadoClasificado: 'Conforme', tipoDesvio: '-', reason: 'Conforme por mención técnica neutra sin señal negativa' };
  }

  if (hasRealNcSignal) return { resultadoClasificado: 'No conforme', tipoDesvio: 'NC', reason: 'override por desvio operativo real' };

  if (hasControlSignal || hasProveedorConformeSignal) {
    return {
      resultadoClasificado: 'Conforme',
      tipoDesvio: '-',
      reason: hasProveedorConformeSignal ? 'gestion con proveedor sin problema explicito' : 'control operativo sin error'
    };
  }

  if (resultadoEsNoConforme || desvioSi) return { resultadoClasificado: 'No conforme', tipoDesvio: 'NC', reason: desvioSi ? 'marca de desvío en la fila' : 'resultado original no conforme' };

  if (resultadoEsConforme && hasExplicitOmSignal) return { resultadoClasificado: 'Oportunidad de mejora', tipoDesvio: 'OM', reason: 'mejora explícita del sistema' };
  if (hasActionSignal) return { resultadoClasificado: 'Conforme', tipoDesvio: '-', reason: 'acción/seguimiento sin problema explícito' };

  if (resultadoEsConforme && (desvioNo || !desvioSi)) {
    return {
      resultadoClasificado: 'Conforme',
      tipoDesvio: '-',
      reason: hasAdminNeutralSignal || hasDocSystemWorkSignal ? 'actividad conforme según resultado original' : 'resultado original conforme sin desvío'
    };
  }

  const ncMatch = countMatchedKeywords(text, NC_SIGNALS);
  if (ncMatch.score > 0) return { resultadoClasificado: 'No conforme', tipoDesvio: 'NC', reason: ncMatch.matches[0] || 'señal de incumplimiento detectada' };

  if (!text) {
    if (!resultadoNorm) return { resultadoClasificado: 'Observación', tipoDesvio: 'OBS', reason: 'sin texto y resultado original vacío/ilegible' };
    return { resultadoClasificado: 'Conforme', tipoDesvio: '-', reason: 'sin texto; se respeta resultado original informado' };
  }

  if (!resultadoNorm) {
    if (hasMildObservationSignal(text)) return { resultadoClasificado: 'Observación', tipoDesvio: 'OBS', reason: 'OBS por señal leve' };
    return { resultadoClasificado: 'Observación', tipoDesvio: 'OBS', reason: 'resultado original vacío o ilegible' };
  }

  return { resultadoClasificado: 'Conforme', tipoDesvio: '-', reason: 'sin señales de desvío; se respeta resultado original informado' };
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

export {
  NC_SIGNALS,
  CONFORME_SIGNALS,
  AUDIT_LOW_THRESHOLD,
  AUDIT_MID_THRESHOLD,
  parseCompliancePercentage,
  classifyAuditCompliance,
  hasExplicitNegativeSignal,
  detectCriticalNegativeSignal,
  hasCriticalNegativeSignal,
  hasMildObservationSignal,
  isNeutralTechnicalMention,
  classifyTechnicalControlRule,
  classifyPriorityOperationalRule,
  hasRowContinuationSignal,
  isExplicitNoFindingText,
  isExplicitNoFindingRawValue,
  isAutoGeneratedConformeRecord,
  classifyNormalizedRule,
  normalizeToTriadClassification,
  normalizeFinalOutcomeAndType,
  mapTipoFromCategoria,
  countMatchedKeywords,
  classifyOutcomeFromRow,
  parseOriginalTipoDesvio
};

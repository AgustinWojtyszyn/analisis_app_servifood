import { normalizeCellValue, normalizeIncidentText } from '../../services/analyzeExcel/normalizers.js';
import {
  classifyIso22000FromDescription,
  resolveIsoWithContextFallback,
  mergeCompositeIsoLabels
} from '../../services/excel/analyzeExcel/classifiers/isoClassifier.js';
import { ENABLE_REPROCESS_ISO_TRACE } from './context.js';

export function isIsoManual(value = '') {
  const normalized = normalizeCellValue(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return normalized.includes('revisar manualmente') || normalized.includes('revision manual');
}

export function isInvalidStoredIso(value = '') {
  const normalized = normalizeCellValue(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!normalized || normalized === '-' || normalized === 'n/a' || normalized === 'na') return true;
  if (normalized.includes('revisar manualmente') || normalized.includes('revision manual')) return true;
  if (normalized.includes('requisito no identificado')) return true;
  if (normalized.includes('sin norma')) return true;
  return false;
}

export function resolveRecordIsoWithCurrentRules(record = {}) {
  const pickFirstText = (...candidates) => {
    for (const value of candidates) {
      const normalized = normalizeCellValue(value || '').trim();
      if (normalized && normalized !== '-') return normalized;
    }
    return '';
  };
  const usedFields = [];
  const pickField = (label, ...candidates) => {
    const value = pickFirstText(...candidates);
    if (value) usedFields.push(label);
    return value;
  };
  const hallazgoDetectado = pickFirstText(
    record?.hallazgoDetectado,
    record?.desvioDetectado,
    record?.rawDesvioDetectado,
    record?.hallazgo,
    record?.desvio,
    record?.finding
  );
  const fecha = pickField('fecha', record?.fecha, record?.date);
  const desvioDetectado = pickField('desvioDetectado', hallazgoDetectado, record?.['Desvío detectado']);
  const areaClasificada = pickField(
    'areaSector',
    record?.areaSector,
    record?.areaClasificada,
    record?.areaProceso,
    record?.['Área/Sector']
  );
  const clasificacion = pickField(
    'clasificacion',
    record?.clasificacionDesvio,
    record?.classification_normalized,
    record?.classification_original,
    record?.['Clasificación']
  );
  const tipo = pickField(
    'tipo',
    record?.tipoDesvioOrigen,
    record?.tipoDesvio,
    record?.scope_normalized,
    record?.alcanceDesvio,
    record?.tipo
  );
  const estado = pickField('estado', record?.estadoAcciones, record?.estadoAccion, record?.estado);
  const actividadRealizada = pickField('actividadRealizada',
    record?.actividadRealizada, record?.textoBase, record?.actividad, record?.activity
  );
  const descripcion = pickField('descripcion', record?.descripcion, record?.description);
  const observaciones = pickField('observaciones', record?.observaciones, record?.comments, record?.notas);
  const accionInmediata = pickField('accionInmediata',
    record?.accionInmediata,
    record?.immediate_action,
    record?.accion_inmediata
  );
  const accionCorrectiva = pickField('accionCorrectiva',
    record?.accionCorrectiva,
    record?.corrective_action,
    record?.accion_correctiva
  );
  const resultadoClasificado = normalizeCellValue(record?.resultadoClasificado || '').trim();

  const descripcionDetectada = [desvioDetectado, descripcion, observaciones]
    .filter(Boolean)
    .join(' | ');
  const actividadConAcciones = [actividadRealizada, accionInmediata, accionCorrectiva, clasificacion, tipo, estado, areaClasificada, fecha]
    .filter(Boolean)
    .join(' | ');

  const sourceText = [descripcionDetectada, actividadConAcciones].filter(Boolean).join(' | ');
  const sourceTextPreview = sourceText.slice(0, 240);
  const strongText = normalizeIncidentText(sourceText);

  if (!strongText || strongText.length < 8) {
    return { iso: 'Revisar manualmente', matchedRule: 'insufficient_text', decisionReason: 'manual_insufficient_data', usedFields, sourceTextPreview };
  }

  const explicitIso = pickFirstText(record?.relacionIso22000, record?.iso22000, record?.iso, record?.normaISO);

  const hasAny = (terms = []) => terms.some((term) => strongText.includes(normalizeIncidentText(term)));
  const clasificacionNorm = normalizeIncidentText(clasificacion);
  const hasInocuidadSignal = hasAny(['contaminacion', 'contaminación', 'inocuidad', 'plaga', 'temperatura critica', 'temperatura crítica', 'alimento no apto']);
  const hasLegalSignal = hasAny(['habilitacion', 'habilitación', 'contrato', 'legal', 'normativa']);
  if ((clasificacionNorm.includes('legal') && hasInocuidadSignal) || (clasificacionNorm.includes('inocu') && hasLegalSignal)) {
    return { iso: 'Revisar manualmente', matchedRule: 'strong_contradiction', decisionReason: 'manual_contradiction', usedFields, sourceTextPreview };
  }

  const hasAbsenceSignal = hasAny(['falto', 'faltó', 'falta sin aviso', 'ausencia', 'no asistio', 'no asistió']);
  const hasTrainingSignal = hasAny(['capacitacion', 'capacitación', 'capacitar', 'reemplazo', 'puesto']);
  if (hasAbsenceSignal && hasTrainingSignal) {
    return { iso: '7.2 Competencia', matchedRule: 'staff_absence_training_signal', decisionReason: 'keyword_rule', usedFields, sourceTextPreview };
  }
  const hasOperationalDelaySignal = hasAny([
    'salio tarde', 'salió tarde', 'tarde', 'demora', 'demoraron', 'refrigerio', 'entrega', 'transporte', 'retiro', 'logistica', 'logística',
    'camion', 'camión', 'despacho', 'segunda movilidad', 'movilidad'
  ]);
  const hasDispatchFailureSignal = hasAny([
    'no se envio', 'no se envió', 'no se enviaron', 'faltante de menu', 'faltante de menú',
    'faltaron postres', 'no se enviaron postres', 'error de envio', 'error de envío'
  ]);
  const hasSupplierActorSignal = hasAny([
    'proveedor', 'devuelve al proveedor', 'devolucion al proveedor', 'devolución al proveedor', 'se devuelve',
    'reclamo al proveedor', 'reclamo proveedor', 'producto recibido', 'pedido recibido'
  ]);
  const hasSupplierProductSignal = hasAny([
    'mercaderia', 'mercadería', 'masa de tartas', 'masa de panqueque', 'fecha de vencimiento',
    'vencimiento no legible', 'vencimiento ilegible', 'rotulado', 'etiqueta ilegible', 'exceso de grasa',
    'fruta pasada', 'manzanas chicas', 'manzanas verdes'
  ]);
  const hasStrongInternalHaccpSignal = hasAny([
    'fuera de refrigeracion', 'fuera de refrigeración', 'decomiso', 'temperatura critica', 'temperatura crítica',
    'contaminacion interna', 'contaminación interna', 'manipulado internamente'
  ]);
  const hasPrpSignal = hasAny([
    'higiene', 'limpieza', 'desinfeccion', 'desinfección', 'mesadas', 'mesones',
    'cajas de carton', 'cajas de cartón', 'carton en mesadas', 'cartón en mesadas'
  ]);

  if (hasOperationalDelaySignal || hasDispatchFailureSignal) {
    return { iso: '8.5.1 Control operacional', matchedRule: 'operational_delay_signal', decisionReason: 'keyword_rule', usedFields, sourceTextPreview };
  }
  if (hasSupplierActorSignal && hasSupplierProductSignal && !hasStrongInternalHaccpSignal) {
    return { iso: '8.4 Control de procesos, productos o servicios provistos externamente', matchedRule: 'supplier_external_priority_signal', decisionReason: 'keyword_rule', usedFields, sourceTextPreview };
  }
  if (hasPrpSignal) {
    return { iso: '8.2 PRP', matchedRule: 'prp_hygiene_signal', decisionReason: 'keyword_rule', usedFields, sourceTextPreview };
  }
  if (hasInocuidadSignal) {
    return { iso: '8.5 HACCP', matchedRule: 'inocuidad_signal', decisionReason: 'keyword_rule', usedFields, sourceTextPreview };
  }
  if (hasAny(['maquina', 'máquina', 'equipo', 'luz', 'oficina', 'mantenimiento', 'instalacion', 'instalación'])) {
    return { iso: '8.5.1 Control operacional', matchedRule: 'maintenance_operational_signal', decisionReason: 'keyword_rule', usedFields, sourceTextPreview };
  }
  const hasCookingPattern = /(carne.*(rigida|rigida|dura))|((rigida|dura).*carne)/.test(strongText);
  if (hasAny(['coccion', 'cocción', 'horno', 'temperatura de coccion', 'temperatura de cocción']) || hasCookingPattern) {
    return { iso: '8.5.1 Control operacional', matchedRule: 'cooking_operational_signal', decisionReason: 'keyword_rule', usedFields, sourceTextPreview };
  }
  if (hasAny(['planificacion', 'planificación', 'menu', 'menú', 'postre', 'postres', 'variedad', 'semana'])) {
    return { iso: '8.1 Planificación y control operacional', matchedRule: 'planning_menu_signal', decisionReason: 'keyword_rule', usedFields, sourceTextPreview };
  }
  if (hasOperationalDelaySignal || hasDispatchFailureSignal) {
    return { iso: '8.5.1 Control operacional', matchedRule: 'operational_delay_signal', decisionReason: 'keyword_rule', usedFields, sourceTextPreview };
  }
  if (hasAny(['falta personal', 'falta de personal', 'faltar personal', 'reubicar personal', 'reorganizar personal', 're organizar personal', 'prioridades'])) {
    return { iso: '8.5.1 Control operacional', matchedRule: 'staff_secondary_operational_signal', decisionReason: 'keyword_rule', usedFields, sourceTextPreview };
  }
  if (hasAny([
    'proveedor', 'reclamo proveedor', 'fruta', 'verdura',
    'manzana', 'manzanas', 'chicas', 'verdes', 'pasada', 'mal estado', 'producto recibido', 'insumo', 'materia prima'
  ])) {
    return { iso: '8.4 Control de procesos, productos o servicios provistos externamente', matchedRule: 'supplier_external_input_signal', decisionReason: 'keyword_rule', usedFields, sourceTextPreview };
  }
  if (hasAny(['capacitacion', 'capacitación', 'conducta', 'empleado', 'rrhh'])) {
    return { iso: '7.2 Competencia / capacitación', matchedRule: 'hr_training_signal', decisionReason: 'keyword_rule', usedFields, sourceTextPreview };
  }
  if (hasLegalSignal) {
    return { iso: 'Requisito legal / Documentación legal', matchedRule: 'legal_signal', decisionReason: 'keyword_rule', usedFields, sourceTextPreview };
  }

  const isoBase = classifyIso22000FromDescription({
    descripcionDetectada,
    actividadRealizada: actividadConAcciones,
    areaClasificada,
    resultadoClasificado
  });

  const isoResolved = resolveIsoWithContextFallback({
    iso22000: isoBase,
    hallazgoDetectado: descripcionDetectada,
    actividadRealizada: actividadConAcciones,
    areaClasificada,
    resultadoClasificado
  });

  const mergedIso = mergeCompositeIsoLabels({
    iso22000: isoResolved,
    hallazgoDetectado: descripcionDetectada,
    actividadRealizada: actividadConAcciones,
    areaClasificada
  });

  if (!isIsoManual(mergedIso)) {
    return { iso: mergedIso, matchedRule: 'classifier_merge', decisionReason: 'keyword_rule', usedFields, sourceTextPreview };
  }

  const collectTextLeaves = (input, depth = 0, acc = []) => {
    if (depth > 5 || input == null) return acc;
    if (typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') {
      const value = normalizeCellValue(input).trim();
      if (value && value !== '-') acc.push(value);
      return acc;
    }
    if (Array.isArray(input)) {
      for (const item of input) collectTextLeaves(item, depth + 1, acc);
      return acc;
    }
    if (typeof input === 'object') {
      for (const [key, value] of Object.entries(input)) {
        const keyNorm = normalizeCellValue(key).toLowerCase();
        if (/(traceability|fuente_del_valor|valor_original_excel|valor_final_usado)/.test(keyNorm)) continue;
        collectTextLeaves(value, depth + 1, acc);
      }
      return acc;
    }
    return acc;
  };

  const wideContext = Array.from(new Set(collectTextLeaves(record)))
    .join(' | ');

  if (!wideContext) return { iso: mergedIso, matchedRule: 'insufficient_wide_context', decisionReason: 'manual_insufficient_data', usedFields, sourceTextPreview };

  const wideIso = resolveIsoWithContextFallback({
    iso22000: classifyIso22000FromDescription({
      descripcionDetectada: wideContext,
      actividadRealizada: wideContext,
      areaClasificada,
      resultadoClasificado
    }),
    hallazgoDetectado: wideContext,
    actividadRealizada: wideContext,
    areaClasificada,
    resultadoClasificado
  });

  const normalizedWideIso = normalizeCellValue(wideIso).trim() || mergedIso;
  if (!isIsoManual(normalizedWideIso)) {
    return { iso: normalizedWideIso, matchedRule: 'wide_context_classifier', decisionReason: 'keyword_rule', usedFields, sourceTextPreview };
  }

  const serializedContext = normalizeIncidentText(JSON.stringify(record || {}));
  const hasAnySerialized = (terms = []) => terms.some((term) => serializedContext.includes(normalizeIncidentText(term)));

  if (hasAnySerialized([
    'coccion', 'proceso de coccion', 'carne dura', 'carne rigida', 'horno', 'temperatura de coccion'
  ])) {
    return { iso: '8.5.1 Control operacional', matchedRule: 'serialized_cooking_signal', decisionReason: 'keyword_rule', usedFields, sourceTextPreview };
  }

  if (hasAnySerialized([
    'demora', 'tarde', 'entrega tarde', 'faltante de personal', 'falta de personal',
    'reubicacion de personal', 'reorganizar personal', 're organizar al personal',
    'prioridades operativas', 'definir prioridades', 'planificacion de menu',
    'falta de variedad de postres', 'envio repetido de postres', 'postre toda la semana',
    'refrigerio salio tarde', 'menu toda la semana'
  ])) {
    return { iso: '8.5.1 Control operacional', matchedRule: 'serialized_operational_delay_signal', decisionReason: 'keyword_rule', usedFields, sourceTextPreview };
  }

  if (explicitIso && !isInvalidStoredIso(explicitIso)) {
    return { iso: explicitIso, matchedRule: 'excel_iso_field', decisionReason: 'excel_field', usedFields, sourceTextPreview };
  }

  return { iso: normalizedWideIso, matchedRule: 'no_reliable_rule', decisionReason: 'manual_insufficient_data', usedFields, sourceTextPreview };
}

export function normalizeIsoManualCounters(summary = {}, records = []) {
  const safeSummary = summary && typeof summary === 'object' ? summary : {};
  const recordList = Array.isArray(records) ? records : [];
  const manualCount = recordList.reduce((acc, record) => {
    const iso = normalizeCellValue(record?.relacionIso22000 || record?.iso22000).trim() || 'Revisar manualmente';
    return acc + (isIsoManual(iso) ? 1 : 0);
  }, 0);
  return {
    ...safeSummary,
    totalRevisionManual: manualCount
  };
}

export function recalculateIsoForStoredResults(results = {}, options = {}) {
  const { collectDebug = false, analysisId = null } = options;
  const originalRecords = Array.isArray(results?.records) ? results.records : [];
  const debugRecords = [];
  if (originalRecords.length === 0) {
    return {
      nextResults: {
        ...results,
        reprocessedWithCurrentIsoRules: true,
        isoReprocessedAt: new Date().toISOString()
      },
      recordsProcessed: 0,
      manualBefore: 0,
      manualAfter: 0,
      changed: false,
      debugRecords
    };
  }

  let manualBefore = 0;
  let manualAfter = 0;
  let changed = false;

  const byIso22000 = {};

  const nextRecords = originalRecords.map((record, index) => {
    const prevIso = normalizeCellValue(record?.relacionIso22000 || record?.iso22000).trim() || 'Revisar manualmente';
    if (isIsoManual(prevIso)) manualBefore += 1;

    const resolved = resolveRecordIsoWithCurrentRules(record) || {};
    const nextIsoComputed = normalizeCellValue(resolved?.iso || '').trim() || 'Revisar manualmente';
    const nextIso = normalizeCellValue(nextIsoComputed).trim() || 'Revisar manualmente';
    if (isIsoManual(nextIso)) manualAfter += 1;
    byIso22000[nextIso] = (byIso22000[nextIso] || 0) + 1;

    if (nextIso !== prevIso) changed = true;

    if (collectDebug || ENABLE_REPROCESS_ISO_TRACE) {
      const sourceText = [
        record?.hallazgoDetectado,
        record?.desvioDetectado,
        record?.rawDesvioDetectado,
        record?.descripcion,
        record?.observaciones,
        record?.accionInmediata,
        record?.immediate_action,
        record?.accionCorrectiva,
        record?.corrective_action,
        record?.actividadRealizada,
        record?.textoBase
      ].map((v) => normalizeCellValue(v).trim()).filter(Boolean).join(' | ');

      debugRecords.push({
        analysisId,
        recordIndex: index,
        desvioDetectado: normalizeCellValue(record?.desvioDetectado || record?.hallazgoDetectado || '').trim() || null,
        recordDate: normalizeCellValue(record?.fecha).trim() || null,
        prevIso,
        previousValueFromDisplayedField: prevIso,
        nextIso,
        changed: nextIso !== prevIso,
        fieldUpdated: 'relacionIso22000',
        sourceTextPreview: normalizeCellValue(resolved?.sourceTextPreview).trim() || sourceText.slice(0, 240),
        usedFields: Array.isArray(resolved?.usedFields) ? resolved.usedFields : [],
        decisionReason: normalizeCellValue(resolved?.decisionReason).trim() || 'keyword_rule',
        matchedRule: normalizeCellValue(resolved?.matchedRule).trim() || 'unknown'
      });
    }

    const nextTraceability = record?.traceability && typeof record.traceability === 'object'
      ? {
          ...record.traceability,
          relacionIso22000: {
            ...(record.traceability.relacionIso22000 || {}),
            valor_final_usado: nextIso,
            fuente_del_valor: 'heuristica'
          }
        }
      : record?.traceability;

    return {
      ...record,
      iso22000: nextIso,
      relacionIso22000: nextIso,
      ...(nextTraceability ? { traceability: nextTraceability } : {})
    };
  });

  const baseSummary = results?.summary && typeof results.summary === 'object' ? results.summary : {};
  const previousSummaryManual = Number(baseSummary.totalRevisionManual || 0);
  if (previousSummaryManual !== manualAfter) changed = true;

  const nextSummary = normalizeIsoManualCounters({
    ...baseSummary,
    byIso22000
  }, nextRecords);

  const nextResults = {
    ...results,
    records: nextRecords,
    summary: nextSummary,
    reprocessedWithCurrentIsoRules: true,
    isoReprocessedAt: new Date().toISOString()
  };

  return {
    nextResults,
    recordsProcessed: nextRecords.length,
    manualBefore,
    manualAfter: Number(nextSummary.totalRevisionManual || 0),
    changed,
    debugRecords
  };
}

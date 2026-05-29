import { normalizeCellValue, normalizeIncidentText } from '../analyzeExcel/normalizers.js';
import {
  classifyIso22000FromDescription,
  resolveIsoWithContextFallback,
  mergeCompositeIsoLabels
} from '../excel/analyzeExcel/classifiers/isoClassifier.js';

const ENABLE_REPROCESS_ISO_TRACE = process.env.REPROCESS_ISO_TRACE === '1';

function isIsoManual(value = '') {
  const normalized = normalizeCellValue(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return normalized.includes('revisar manualmente') || normalized.includes('revision manual');
}

function isInvalidStoredIso(value = '') {
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

function resolveRecordIsoWithCurrentRules(record = {}) {
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
  const hallazgoDetectado = pickFirstText(record?.hallazgoDetectado, record?.desvioDetectado, record?.rawDesvioDetectado, record?.hallazgo, record?.desvio, record?.finding);
  const fecha = pickField('fecha', record?.fecha, record?.date);
  const desvioDetectado = pickField('desvioDetectado', hallazgoDetectado, record?.['Desvío detectado']);
  const areaClasificada = pickField('areaSector', record?.areaSector, record?.areaClasificada, record?.areaProceso, record?.['Área/Sector']);
  const clasificacion = pickField('clasificacion', record?.clasificacionDesvio, record?.classification_normalized, record?.classification_original, record?.['Clasificación']);
  const tipo = pickField('tipo', record?.tipoDesvioOrigen, record?.tipoDesvio, record?.scope_normalized, record?.alcanceDesvio, record?.tipo);
  const estado = pickField('estado', record?.estadoAcciones, record?.estadoAccion, record?.estado);
  const actividadRealizada = pickField('actividadRealizada', record?.actividadRealizada, record?.textoBase, record?.actividad, record?.activity);
  const descripcion = pickField('descripcion', record?.descripcion, record?.description);
  const observaciones = pickField('observaciones', record?.observaciones, record?.comments, record?.notas);
  const accionInmediata = pickField('accionInmediata', record?.accionInmediata, record?.immediate_action, record?.accion_inmediata);
  const accionCorrectiva = pickField('accionCorrectiva', record?.accionCorrectiva, record?.corrective_action, record?.accion_correctiva);
  const resultadoClasificado = normalizeCellValue(record?.resultadoClasificado || '').trim();
  const descripcionDetectada = [desvioDetectado, descripcion, observaciones].filter(Boolean).join(' | ');
  const actividadConAcciones = [actividadRealizada, accionInmediata, accionCorrectiva, clasificacion, tipo, estado, areaClasificada, fecha].filter(Boolean).join(' | ');
  const sourceText = [descripcionDetectada, actividadConAcciones].filter(Boolean).join(' | ');
  const sourceTextPreview = sourceText.slice(0, 240);
  const strongText = normalizeIncidentText(sourceText);
  if (!strongText || strongText.length < 8) return { iso: 'Revisar manualmente', matchedRule: 'insufficient_text', decisionReason: 'manual_insufficient_data', usedFields, sourceTextPreview };
  const explicitIso = pickFirstText(record?.relacionIso22000, record?.iso22000, record?.iso, record?.normaISO);
  const hasAny = (terms = []) => terms.some((term) => strongText.includes(normalizeIncidentText(term)));
  const hasOperationalDelaySignal = hasAny(['salio tarde', 'salió tarde', 'tarde', 'demora', 'demoraron', 'refrigerio', 'entrega', 'transporte', 'retiro', 'logistica', 'logística', 'camion', 'camión', 'despacho', 'segunda movilidad', 'movilidad']);
  const hasDispatchFailureSignal = hasAny(['no se envio', 'no se envió', 'no se enviaron', 'faltante de menu', 'faltante de menú', 'faltaron postres', 'no se enviaron postres', 'error de envio', 'error de envío']);
  const hasSupplierActorSignal = hasAny(['proveedor', 'devuelve al proveedor', 'devolucion al proveedor', 'devolución al proveedor', 'se devuelve', 'reclamo al proveedor', 'reclamo proveedor', 'producto recibido', 'pedido recibido']);
  const hasSupplierProductSignal = hasAny(['mercaderia', 'mercadería', 'masa de tartas', 'masa de panqueque', 'fecha de vencimiento', 'vencimiento no legible', 'vencimiento ilegible', 'rotulado', 'etiqueta ilegible', 'exceso de grasa', 'fruta pasada', 'manzanas chicas', 'manzanas verdes']);
  const hasStrongInternalHaccpSignal = hasAny(['fuera de refrigeracion', 'fuera de refrigeración', 'decomiso', 'temperatura critica', 'temperatura crítica', 'contaminacion interna', 'contaminación interna', 'manipulado internamente']);
  if (hasOperationalDelaySignal || hasDispatchFailureSignal) return { iso: '8.5.1 Control operacional', matchedRule: 'operational_delay_signal', decisionReason: 'keyword_rule', usedFields, sourceTextPreview };
  if (hasSupplierActorSignal && hasSupplierProductSignal && !hasStrongInternalHaccpSignal) return { iso: '8.4 Control de procesos, productos o servicios provistos externamente', matchedRule: 'supplier_external_priority_signal', decisionReason: 'keyword_rule', usedFields, sourceTextPreview };
  const isoBase = classifyIso22000FromDescription({ descripcionDetectada, actividadRealizada: actividadConAcciones, areaClasificada, resultadoClasificado });
  const isoResolved = resolveIsoWithContextFallback({ iso22000: isoBase, hallazgoDetectado: descripcionDetectada, actividadRealizada: actividadConAcciones, areaClasificada, resultadoClasificado });
  const mergedIso = mergeCompositeIsoLabels({ iso22000: isoResolved, hallazgoDetectado: descripcionDetectada, actividadRealizada: actividadConAcciones, areaClasificada });
  if (!isIsoManual(mergedIso)) return { iso: mergedIso, matchedRule: 'classifier_merge', decisionReason: 'keyword_rule', usedFields, sourceTextPreview };
  if (explicitIso && !isInvalidStoredIso(explicitIso)) return { iso: explicitIso, matchedRule: 'excel_iso_field', decisionReason: 'excel_field', usedFields, sourceTextPreview };
  return { iso: mergedIso, matchedRule: 'no_reliable_rule', decisionReason: 'manual_insufficient_data', usedFields, sourceTextPreview };
}

function normalizeIsoManualCounters(summary = {}, records = []) {
  const safeSummary = summary && typeof summary === 'object' ? summary : {};
  const recordList = Array.isArray(records) ? records : [];
  const manualCount = recordList.reduce((acc, record) => {
    const iso = normalizeCellValue(record?.relacionIso22000 || record?.iso22000).trim() || 'Revisar manualmente';
    return acc + (isIsoManual(iso) ? 1 : 0);
  }, 0);
  return { ...safeSummary, totalRevisionManual: manualCount };
}

function recalculateIsoForStoredResults(results = {}, options = {}) {
  const { collectDebug = false, analysisId = null } = options;
  const originalRecords = Array.isArray(results?.records) ? results.records : [];
  const debugRecords = [];
  if (originalRecords.length === 0) {
    return { nextResults: { ...results, reprocessedWithCurrentIsoRules: true, isoReprocessedAt: new Date().toISOString() }, recordsProcessed: 0, manualBefore: 0, manualAfter: 0, changed: false, debugRecords };
  }
  let manualBefore = 0;
  let manualAfter = 0;
  let changed = false;
  const byIso22000 = {};
  const nextRecords = originalRecords.map((record, index) => {
    const prevIso = normalizeCellValue(record?.relacionIso22000 || record?.iso22000).trim() || 'Revisar manualmente';
    if (isIsoManual(prevIso)) manualBefore += 1;
    const resolved = resolveRecordIsoWithCurrentRules(record) || {};
    const nextIso = normalizeCellValue(resolved?.iso || '').trim() || 'Revisar manualmente';
    if (isIsoManual(nextIso)) manualAfter += 1;
    byIso22000[nextIso] = (byIso22000[nextIso] || 0) + 1;
    if (nextIso !== prevIso) changed = true;
    if (collectDebug || ENABLE_REPROCESS_ISO_TRACE) {
      debugRecords.push({ analysisId, recordIndex: index, prevIso, nextIso, changed: nextIso !== prevIso, fieldUpdated: 'relacionIso22000', sourceTextPreview: normalizeCellValue(resolved?.sourceTextPreview).trim() || null, usedFields: Array.isArray(resolved?.usedFields) ? resolved.usedFields : [], decisionReason: normalizeCellValue(resolved?.decisionReason).trim() || 'keyword_rule', matchedRule: normalizeCellValue(resolved?.matchedRule).trim() || 'unknown' });
    }
    const nextTraceability = record?.traceability && typeof record.traceability === 'object' ? { ...record.traceability, relacionIso22000: { ...(record.traceability.relacionIso22000 || {}), valor_final_usado: nextIso, fuente_del_valor: 'heuristica' } } : record?.traceability;
    return { ...record, iso22000: nextIso, relacionIso22000: nextIso, ...(nextTraceability ? { traceability: nextTraceability } : {}) };
  });
  const baseSummary = results?.summary && typeof results.summary === 'object' ? results.summary : {};
  const nextSummary = normalizeIsoManualCounters({ ...baseSummary, byIso22000 }, nextRecords);
  return { nextResults: { ...results, records: nextRecords, summary: nextSummary, reprocessedWithCurrentIsoRules: true, isoReprocessedAt: new Date().toISOString() }, recordsProcessed: nextRecords.length, manualBefore, manualAfter: Number(nextSummary.totalRevisionManual || 0), changed, debugRecords };
}

export async function reprocessIsoAllService({ supabaseAdmin, user, query, isAdminUser }) {
  const debugMode = String(query?.debug || '').trim() === '1';
  const isAdmin = isAdminUser(user);
  const requestedUserId = normalizeCellValue(query?.userId || '').trim();
  let dbQuery = supabaseAdmin.from('analysis_history').select('id, user_id, filename, status, results').order('created_at', { ascending: false });
  const shouldConstrainToRequester = !isAdmin || Boolean(requestedUserId);
  if (!isAdmin) dbQuery = dbQuery.eq('user_id', user.id);
  else if (requestedUserId) dbQuery = dbQuery.eq('user_id', requestedUserId);
  const { data, error } = await dbQuery;
  if (error) {
    const err = new Error(error?.message || 'Error en Supabase');
    err.supabaseContext = 'reprocess_iso_all_select';
    err.supabaseError = error;
    throw err;
  }
  const rows = Array.isArray(data) ? data : [];
  if (rows.length === 0) return { success: true, analysesFound: 0, analysesProcessed: 0, recordsProcessed: 0, recordsProcessedTotal: 0, manualBefore: 0, manualAfter: 0, updatedAnalyses: 0, analysesDebug: [] };
  let analysesProcessed = 0; let recordsProcessed = 0; let manualBefore = 0; let manualAfter = 0; let updatedAnalyses = 0;
  const debug = [];
  for (const row of rows) {
    analysesProcessed += 1;
    const currentResults = row?.results && typeof row.results === 'object' ? row.results : {};
    const recalculated = recalculateIsoForStoredResults(currentResults, { collectDebug: debugMode, analysisId: row.id });
    recordsProcessed += recalculated.recordsProcessed;
    manualBefore += recalculated.manualBefore;
    manualAfter += recalculated.manualAfter;
    let updateQuery = supabaseAdmin.from('analysis_history').update({ results: recalculated.nextResults }).eq('id', row.id);
    if (shouldConstrainToRequester) updateQuery = updateQuery.eq('user_id', requestedUserId || user.id);
    const updateRes = await updateQuery;
    if (updateRes.error) {
      const err = new Error(updateRes.error?.message || 'Error en Supabase');
      err.supabaseContext = 'reprocess_iso_all_update';
      err.supabaseError = updateRes.error;
      throw err;
    }
    if (recalculated.changed) updatedAnalyses += 1;
    if (debugMode) debug.push({ analysisId: row.id, filename: row?.filename || null, status: row?.status || null, recordsPathRead: Array.isArray(currentResults?.records) ? 'results.records' : 'results.records (missing)', recordsPathWritten: 'results.records', recordsCount: recalculated.recordsProcessed, updatedRecordsCount: recalculated.debugRecords.filter((r) => r.changed).length, recordsProcessed: recalculated.recordsProcessed, manualBefore: recalculated.manualBefore, manualAfter: recalculated.manualAfter, changed: recalculated.changed, persisted: true, persistError: null, postSaveValue: null, postSaveMatchesExpected: null, records: recalculated.debugRecords });
  }
  const response = { success: true, analysesFound: rows.length, analysesProcessed, recordsProcessed, recordsProcessedTotal: recordsProcessed, manualBefore, manualAfter, updatedAnalyses };
  if (debugMode) { response.debug = debug; response.analysesDebug = debug; }
  return response;
}

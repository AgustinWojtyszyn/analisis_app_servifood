import { normalizeCellValue } from '../../services/analyzeExcel/normalizers.js';
import { normalizeStoredAnalysisResults } from '../analysisController.mappers.js';
import {
  returnSupabaseError,
  ensureSupabaseConfigured,
  isAdminUser
} from '../analysisController.utils.js';
import {
  ENABLE_REPROCESS_CLASSIFICATION_TRACE,
  ENABLE_REPROCESS_ISO_TRACE,
  getSupabaseAdmin
} from './context.js';
import { recalculateIsoForStoredResults } from './analysisHelpers.js';
import { readCanonicalIso } from '../../services/excel/analyzeExcel/isoFieldUtils.js';

export async function reprocessHistoryClassifications(req, res) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!ensureSupabaseConfigured(res, supabaseAdmin)) return;

    const { data, error } = await supabaseAdmin
      .from('analysis_history')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return returnSupabaseError(res, 'reprocess_history_select', error);
    }

    let updated = 0;
    for (const row of (data || [])) {
      const normalized = normalizeStoredAnalysisResults(row.results || {});
      if (ENABLE_REPROCESS_CLASSIFICATION_TRACE) {
        console.log('[REPROCESS UPDATE TRY]', {
          analysisId: row.id,
          records: Array.isArray(row?.results?.records) ? row.results.records.length : 0,
          totalLogisticaBefore: row?.results?.summary?.totalLogistica ?? null,
          totalLogisticaAfter: normalized?.summary?.totalLogistica ?? null,
          byCategoriaAfter: normalized?.summary?.byCategoria || {}
        });
      }
      const updateRes = await supabaseAdmin
        .from('analysis_history')
        .update({ results: normalized })
        .eq('id', row.id)
        .eq('user_id', req.user.id);
      if (!updateRes.error) {
        updated += 1;
        if (ENABLE_REPROCESS_CLASSIFICATION_TRACE) {
          const verifyRes = await supabaseAdmin
            .from('analysis_history')
            .select('results')
            .eq('id', row.id)
            .eq('user_id', req.user.id)
            .single();
          const persistedSummary = verifyRes?.data?.results?.summary || {};
          console.log('[REPROCESS PERSISTED]', {
            analysisId: row.id,
            updated: true,
            totalLogisticaPersisted: persistedSummary.totalLogistica ?? null,
            byCategoriaPersisted: persistedSummary.byCategoria || {}
          });
        }
      } else if (ENABLE_REPROCESS_CLASSIFICATION_TRACE) {
        console.log('[REPROCESS PERSIST FAILED]', {
          analysisId: row.id,
          error: updateRes.error?.message || 'unknown_error'
        });
      }
    }

    return res.json({ success: true, total: (data || []).length, updated });
  } catch (error) {
    console.error('Error reprocesando historial:', error);
    return res.status(500).json({ error: 'Error reprocesando historial' });
  }
}

export async function reprocessIsoAll(req, res) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!ensureSupabaseConfigured(res, supabaseAdmin)) return;

    const debugMode = String(req.query?.debug || '').trim() === '1';
    const isAdmin = isAdminUser(req.user);
    const requestedUserId = normalizeCellValue(req.query?.userId || '').trim();

    let query = supabaseAdmin
      .from('analysis_history')
      .select('id, user_id, filename, status, results')
      .order('created_at', { ascending: false });
    const shouldConstrainToRequester = !isAdmin || Boolean(requestedUserId);
    if (!isAdmin) {
      query = query.eq('user_id', req.user.id);
    } else if (requestedUserId) {
      query = query.eq('user_id', requestedUserId);
    }

    const { data, error } = await query;

    if (error) {
      return returnSupabaseError(res, 'reprocess_iso_all_select', error);
    }

    const rows = Array.isArray(data) ? data : [];
    const analysesFound = rows.length;
    if (rows.length === 0) {
      return res.json({
        success: true,
        analysesFound: 0,
        analysesProcessed: 0,
        recordsProcessed: 0,
        recordsProcessedTotal: 0,
        manualBefore: 0,
        manualAfter: 0,
        updatedAnalyses: 0,
        analysesDebug: []
      });
    }

    let analysesProcessed = 0;
    let recordsProcessed = 0;
    let manualBefore = 0;
    let manualAfter = 0;
    let updatedAnalyses = 0;
    const debug = [];

    for (const row of rows) {
      analysesProcessed += 1;
      const currentResults = row?.results && typeof row.results === 'object' ? row.results : {};
      const recordsPathRead = Array.isArray(currentResults?.records) ? 'results.records' : 'results.records (missing)';
      const recalculated = recalculateIsoForStoredResults(currentResults, {
        collectDebug: debugMode,
        analysisId: row.id
      });

      recordsProcessed += recalculated.recordsProcessed;
      manualBefore += recalculated.manualBefore;
      manualAfter += recalculated.manualAfter;

      let updateQuery = supabaseAdmin
        .from('analysis_history')
        .update({ results: recalculated.nextResults })
        .eq('id', row.id);
      if (shouldConstrainToRequester) {
        updateQuery = updateQuery.eq('user_id', requestedUserId || req.user.id);
      }
      const updateRes = await updateQuery;

      if (updateRes.error) {
        return returnSupabaseError(res, 'reprocess_iso_all_update', updateRes.error);
      }

      let persisted = true;
      let persistError = null;
      let postSaveValue = null;
      let postSaveMatchesExpected = null;
      const changedRecords = recalculated.debugRecords.filter((r) => r.changed);

      if (debugMode || ENABLE_REPROCESS_ISO_TRACE) {
        let verifyQuery = supabaseAdmin
          .from('analysis_history')
          .select('results')
          .eq('id', row.id);
        if (shouldConstrainToRequester) {
          verifyQuery = verifyQuery.eq('user_id', requestedUserId || req.user.id);
        }
        const verifySingle = await verifyQuery.single();
        if (verifySingle.error) {
          persisted = false;
          persistError = verifySingle.error?.message || 'verify_failed';
        } else {
          const persistedRecords = Array.isArray(verifySingle?.data?.results?.records) ? verifySingle.data.results.records : [];
          if (changedRecords.length > 0) {
            const firstChanged = changedRecords[0];
            const persistedRecord = persistedRecords[firstChanged.recordIndex] || {};
            postSaveValue = readCanonicalIso(persistedRecord);
            postSaveMatchesExpected = postSaveValue === firstChanged.nextIso;
          } else {
            postSaveValue = null;
            postSaveMatchesExpected = true;
          }
        }
      }

      if (recalculated.changed) {
        updatedAnalyses += 1;
      }

      if (debugMode) {
        debug.push({
          analysisId: row.id,
          filename: row?.filename || null,
          status: row?.status || null,
          recordsPathRead,
          recordsPathWritten: 'results.records',
          recordsCount: recalculated.recordsProcessed,
          updatedRecordsCount: recalculated.debugRecords.filter((r) => r.changed).length,
          recordsProcessed: recalculated.recordsProcessed,
          manualBefore: recalculated.manualBefore,
          manualAfter: recalculated.manualAfter,
          changed: recalculated.changed,
          persisted,
          persistError,
          postSaveValue,
          postSaveMatchesExpected,
          records: recalculated.debugRecords
        });
      } else if (ENABLE_REPROCESS_ISO_TRACE) {
        console.log('[REPROCESS_ISO_ALL]', {
          analysisId: row.id,
          filename: row?.filename || null,
          status: row?.status || null,
          recordsPathRead,
          recordsPathWritten: 'results.records',
          recordsCount: recalculated.recordsProcessed,
          updatedRecordsCount: recalculated.debugRecords.filter((r) => r.changed).length,
          recordsProcessed: recalculated.recordsProcessed,
          manualBefore: recalculated.manualBefore,
          manualAfter: recalculated.manualAfter,
          changed: recalculated.changed,
          persisted,
          persistError,
          postSaveValue,
          postSaveMatchesExpected,
          sample: recalculated.debugRecords.slice(0, 3)
        });
      }
    }

    const response = {
      success: true,
      analysesFound,
      analysesProcessed,
      recordsProcessed,
      recordsProcessedTotal: recordsProcessed,
      manualBefore,
      manualAfter,
      updatedAnalyses
    };
    if (debugMode) {
      response.debug = debug;
      response.analysesDebug = debug;
    }

    return res.json(response);
  } catch (error) {
    console.error('Error reprocesando ISO global:', error);
    return res.status(500).json({ error: 'Error reprocesando ISO de todos los análisis' });
  }
}

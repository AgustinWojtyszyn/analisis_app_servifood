import { mapAnalysisRowToApi } from '../analysisController.mappers.js';
import {
  returnSupabaseError,
  isStatusColumnMissing,
  isUpdatedAtColumnMissing,
  ensureSupabaseConfigured,
  isAdminUser,
  parseHistoryRequestParams
} from '../analysisController.utils.js';
import { getSupabaseAdmin, STATUS_VALUES } from './context.js';

const MAX_BULK_DELETE_IDS = 100;
const MAX_DELETE_ALL_BATCH_SIZE = 100;
const DELETABLE_ANALYSIS_STATUSES = new Set(['exported', 'archived']);

function normalizeBulkDeleteIds(rawIds = []) {
  const input = Array.isArray(rawIds) ? rawIds : [];
  const normalized = [];
  const invalidIds = [];
  const duplicateIds = [];
  const seen = new Set();

  input.forEach((value) => {
    const id = typeof value === 'string' ? value.trim() : '';
    if (!id) {
      invalidIds.push(value);
      return;
    }
    if (seen.has(id)) {
      duplicateIds.push(id);
      return;
    }
    seen.add(id);
    normalized.push(id);
  });

  return { ids: normalized, invalidIds, duplicateIds, requestedCount: input.length };
}

export async function getAnalysis(req, res) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!ensureSupabaseConfigured(res, supabaseAdmin)) return;

    const { id } = req.params;
    const isAdmin = isAdminUser(req.user);
    let query = supabaseAdmin
      .from('analysis_history')
      .select('*')
      .eq('id', id);

    if (!isAdmin) {
      query = query.eq('user_id', req.user.id);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return res.status(404).json({ error: 'Análisis no encontrado' });
    }

    return res.json(mapAnalysisRowToApi(data));
  } catch (error) {
    console.error('Error obteniendo análisis:', error);
    return res.status(500).json({ error: 'Error obteniendo análisis' });
  }
}

export async function getHistory(req, res) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!ensureSupabaseConfigured(res, supabaseAdmin)) return;

    const {
      page,
      limit,
      search,
      status,
      userId,
      minRecords,
      maxRecords,
      minNC,
      minOBS,
      minConformes,
      fromDateIso,
      toDateIso,
      sortConfig,
      rangeFrom,
      rangeTo
    } = parseHistoryRequestParams(req.query || {});
    const isAdmin = isAdminUser(req.user);

    let query = supabaseAdmin
      .from('analysis_history')
      .select('*', { count: 'exact' });

    if (!isAdmin) {
      query = query.eq('user_id', req.user.id);
    } else if (userId) {
      query = query.eq('user_id', userId);
    }

    if (search) {
      query = query.or(`filename.ilike.%${search}%,status.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (fromDateIso) {
      query = query.gte('created_at', fromDateIso);
    }

    if (toDateIso) {
      query = query.lte('created_at', toDateIso);
    }

    if (minRecords != null) {
      query = query.filter('results->totalRecords', 'gte', String(minRecords));
    }

    if (maxRecords != null) {
      query = query.filter('results->totalRecords', 'lte', String(maxRecords));
    }

    if (minNC != null) {
      query = query.filter('results->summary->totalNC', 'gte', String(minNC));
    }

    if (minOBS != null) {
      query = query.filter('results->summary->totalOBS', 'gte', String(minOBS));
    }

    if (minConformes != null) {
      query = query.filter('results->summary->totalConformes', 'gte', String(minConformes));
    }

    query = query
      .order(sortConfig.column, { ascending: sortConfig.ascending, nullsFirst: false })
      .range(rangeFrom, rangeTo);

    const { data, error, count } = await query;

    if (error) {
      return returnSupabaseError(res, 'get_history', error);
    }
    const total = Number(count || 0);
    const mapped = (data || []).map((item) => mapAnalysisRowToApi(item));

    return res.json({
      data: mapped,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1
    });
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    return res.status(500).json({ error: 'Error obteniendo historial' });
  }
}

export async function deleteAnalysis(req, res) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!ensureSupabaseConfigured(res, supabaseAdmin)) return;

    const { id } = req.params;

    const isAdmin = isAdminUser(req.user);

    let query = supabaseAdmin
      .from('analysis_history')
      .delete()
      .eq('id', id);

    if (!isAdmin) {
      query = query.eq('user_id', req.user.id);
    }

    const { error } = await query;

    if (error) {
      return returnSupabaseError(res, 'delete_analysis', error);
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Error eliminando análisis:', error);
    return res.status(500).json({ error: 'Error eliminando análisis' });
  }
}

export async function deleteAnalysisBulk(req, res) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!ensureSupabaseConfigured(res, supabaseAdmin)) return;

    const { ids, invalidIds, duplicateIds, requestedCount } = normalizeBulkDeleteIds(req.body?.ids);
    if (!ids.length) {
      return res.status(400).json({ error: 'Debes enviar ids para eliminar' });
    }

    if (ids.length > MAX_BULK_DELETE_IDS) {
      return res.status(400).json({ error: `No se pueden eliminar más de ${MAX_BULK_DELETE_IDS} análisis por lote` });
    }

    const isAdmin = isAdminUser(req.user);
    const requestedSet = new Set(ids);
    const selectResult = await supabaseAdmin
      .from('analysis_history')
      .select('id, user_id')
      .in('id', ids);

    if (selectResult.error) {
      return returnSupabaseError(res, 'delete_analysis_bulk_select', selectResult.error);
    }

    const foundRows = Array.isArray(selectResult.data) ? selectResult.data : [];
    const foundIds = new Set(foundRows.map((row) => row.id).filter(Boolean));
    const nonexistentIds = ids.filter((id) => !foundIds.has(id));
    const unauthorizedRows = isAdmin
      ? []
      : foundRows.filter((row) => row.user_id !== req.user.id);
    const authorizedIds = foundRows
      .filter((row) => isAdmin || row.user_id === req.user.id)
      .map((row) => row.id)
      .filter((id) => requestedSet.has(id));

    let deletedIds = [];
    let failedIds = [];
    if (authorizedIds.length > 0) {
      const deleteQuery = supabaseAdmin
        .from('analysis_history')
        .delete()
        .select('id')
        .in('id', authorizedIds);

      const { data, error } = await deleteQuery;

      if (error) {
        return returnSupabaseError(res, 'delete_analysis_bulk', error);
      }

      deletedIds = Array.isArray(data) ? data.map((row) => row.id).filter(Boolean) : [];
      const deletedSet = new Set(deletedIds);
      failedIds = authorizedIds.filter((id) => !deletedSet.has(id));
    }

    return res.json({
      success: true,
      requestedIds: ids,
      requestedCount,
      invalidIds,
      duplicateIds,
      deletedCount: deletedIds.length,
      deletedIds,
      nonexistentIds,
      unauthorizedCount: unauthorizedRows.length,
      unauthorizedIds: isAdmin ? [] : undefined,
      failedCount: failedIds.length,
      failedIds
    });
  } catch (error) {
    console.error('Error eliminando análisis en lote:', error);
    return res.status(500).json({ error: 'Error eliminando análisis en lote' });
  }
}

export async function deleteAllAnalyses(req, res) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!ensureSupabaseConfigured(res, supabaseAdmin)) return;

    const { confirmText = '', userId = '' } = req.body || {};
    if (confirmText !== 'BORRAR') {
      return res.status(400).json({ error: 'Confirmación inválida. Debe ser BORRAR' });
    }

    const isAdmin = isAdminUser(req.user);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Acceso solo para administradores' });
    }

    const targetUserId = typeof userId === 'string' ? userId.trim() : '';
    let selectQuery = supabaseAdmin
      .from('analysis_history')
      .select('id, user_id, status');

    if (targetUserId) {
      selectQuery = selectQuery.eq('user_id', targetUserId);
    }

    const selectResult = await selectQuery;

    if (selectResult.error) {
      return returnSupabaseError(res, 'delete_all_analyses_select', selectResult.error);
    }

    const rows = Array.isArray(selectResult.data) ? selectResult.data : [];
    const candidateRows = rows.filter((row) => DELETABLE_ANALYSIS_STATUSES.has(String(row?.status || '').toLowerCase()));
    const skippedRows = rows.filter((row) => !DELETABLE_ANALYSIS_STATUSES.has(String(row?.status || '').toLowerCase()));
    const candidateIds = [...new Set(candidateRows.map((row) => row.id).filter(Boolean))];
    const skippedActiveIds = skippedRows.map((row) => row.id).filter(Boolean);
    const deletedIds = [];
    const failedIds = [];
    const skippedChangedIds = [];
    const errors = [];

    for (let index = 0; index < candidateIds.length; index += MAX_DELETE_ALL_BATCH_SIZE) {
      const batchIds = candidateIds.slice(index, index + MAX_DELETE_ALL_BATCH_SIZE);
      let deleteQuery = supabaseAdmin
        .from('analysis_history')
        .delete()
        .select('id')
        .in('id', batchIds)
        .in('status', [...DELETABLE_ANALYSIS_STATUSES]);

      if (targetUserId) {
        deleteQuery = deleteQuery.eq('user_id', targetUserId);
      }

      const deleteResult = await deleteQuery;
      if (deleteResult.error) {
        failedIds.push(...batchIds);
        errors.push({
          ids: batchIds,
          message: deleteResult.error?.message || 'Error eliminando análisis procesados'
        });
        continue;
      }

      const batchDeletedIds = Array.isArray(deleteResult.data)
        ? deleteResult.data.map((row) => row.id).filter(Boolean)
        : [];
      deletedIds.push(...batchDeletedIds);
      const deletedSet = new Set(batchDeletedIds);
      skippedChangedIds.push(...batchIds.filter((id) => !deletedSet.has(id)));
    }

    const allSkippedIds = [...new Set([...skippedActiveIds, ...skippedChangedIds])];

    return res.json({
      success: true,
      userId: targetUserId || null,
      candidatesCount: candidateIds.length,
      deletedCount: deletedIds.length,
      deletedIds,
      skippedActiveCount: allSkippedIds.length,
      skippedActiveIds: allSkippedIds,
      failedCount: failedIds.length,
      failedIds,
      errors,
      notFoundIds: [],
      warning: failedIds.length > 0 || allSkippedIds.length > 0 ? 'partial_delete' : null
    });
  } catch (error) {
    console.error('Error eliminando todos los análisis:', error);
    return res.status(500).json({ error: 'Error eliminando todos los análisis' });
  }
}

export async function getActiveAnalysis(req, res) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!ensureSupabaseConfigured(res, supabaseAdmin)) return;

    let query = await supabaseAdmin
      .from('analysis_history')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    if (query.error && isStatusColumnMissing(query.error)) {
      return res.json(null);
    }

    if (query.error) {
      return returnSupabaseError(res, 'get_active_analysis', query.error);
    }

    const activeAnalysis = query.data?.[0];
    if (!activeAnalysis) {
      return res.json(null);
    }

    return res.json(mapAnalysisRowToApi(activeAnalysis));
  } catch (error) {
    console.error('Error obteniendo análisis activo:', error);
    return res.status(500).json({ error: 'Error obteniendo análisis activo' });
  }
}

export async function deleteActiveAnalysis(req, res) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!ensureSupabaseConfigured(res, supabaseAdmin)) return;

    const activeResult = await supabaseAdmin
      .from('analysis_history')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('status', 'active');

    if (activeResult.error && isStatusColumnMissing(activeResult.error)) {
      return res.json({ success: true, deletedCount: 0, warning: 'schema_column_missing' });
    }

    if (activeResult.error) {
      return returnSupabaseError(res, 'delete_active_analysis_select', activeResult.error);
    }

    const activeIds = (activeResult.data || []).map((row) => row.id).filter(Boolean);
    if (activeIds.length === 0) {
      return res.json({ success: true, deletedCount: 0 });
    }

    const deleteResult = await supabaseAdmin
      .from('analysis_history')
      .delete()
      .eq('user_id', req.user.id)
      .in('id', activeIds);

    if (deleteResult.error) {
      return returnSupabaseError(res, 'delete_active_analysis_delete', deleteResult.error);
    }

    return res.json({ success: true, deletedCount: activeIds.length });
  } catch (error) {
    console.error('Error eliminando análisis activo:', error);
    return res.status(500).json({ error: 'Error eliminando análisis activo' });
  }
}

export async function updateAnalysisStatus(req, res) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!ensureSupabaseConfigured(res, supabaseAdmin)) return;

    const { id } = req.params;
    const { status } = req.body || {};

    if (!STATUS_VALUES.has(status)) {
      return res.status(400).json({ error: 'Status inválido. Valores: active, exported, archived' });
    }

    const updateResult = await supabaseAdmin
      .from('analysis_history')
      .update({ status })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (updateResult.error && (isStatusColumnMissing(updateResult.error) || isUpdatedAtColumnMissing(updateResult.error))) {
      return res.status(200).json({ success: true, status: null, warning: 'schema_column_missing' });
    }

    if (updateResult.error) {
      return returnSupabaseError(res, 'update_analysis_status', updateResult.error);
    }

    return res.json({
      success: true,
      analysis: mapAnalysisRowToApi(updateResult.data)
    });
  } catch (error) {
    console.error('Error actualizando estado de análisis:', error);
    return res.status(500).json({ error: 'Error actualizando estado de análisis' });
  }
}

export async function archiveAnalysis(req, res) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!ensureSupabaseConfigured(res, supabaseAdmin)) return;

    const { id } = req.params;

    const currentResult = await supabaseAdmin
      .from('analysis_history')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (currentResult.error) {
      if (String(currentResult.error.code || '') === 'PGRST116') {
        return res.status(404).json({ error: 'Análisis no encontrado' });
      }
      return returnSupabaseError(res, 'archive_analysis_find', currentResult.error);
    }

    const current = currentResult.data;
    if (!current) {
      return res.status(404).json({ error: 'Análisis no encontrado' });
    }

    if (current.status === 'archived') {
      return res.status(200).json({
        success: true,
        message: 'El análisis ya estaba archivado',
        data: mapAnalysisRowToApi(current)
      });
    }

    if (current.status !== 'active') {
      return res.status(409).json({
        success: false,
        error: `No se puede archivar un análisis con estado ${current.status || 'desconocido'}`
      });
    }

    const updateResult = await supabaseAdmin
      .from('analysis_history')
      .update({ status: 'archived' })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select('*')
      .single();

    if (updateResult.error && (isStatusColumnMissing(updateResult.error) || isUpdatedAtColumnMissing(updateResult.error))) {
      return res.status(200).json({
        success: true,
        message: 'Archivado aplicado con compatibilidad de esquema',
        data: mapAnalysisRowToApi({ ...current, status: 'archived' }),
        warning: 'schema_column_missing'
      });
    }

    if (updateResult.error) {
      return returnSupabaseError(res, 'archive_analysis_update', updateResult.error);
    }

    return res.status(200).json({
      success: true,
      message: 'Análisis archivado correctamente',
      data: mapAnalysisRowToApi(updateResult.data)
    });
  } catch (error) {
    console.error('Error archivando análisis:', error?.message || error);
    return res.status(500).json({ error: 'Error archivando análisis' });
  }
}

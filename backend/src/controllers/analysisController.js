import '../config/env.js';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import { analyzeExcel } from '../services/analyzeExcel.js';
import defaultRules from '../../../shared/businessRules/defaultRules.json' with { type: 'json' };

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;
const prisma = new PrismaClient();
const STATUS_VALUES = new Set(['active', 'exported', 'archived']);

function returnSupabaseError(res, context, error, fallbackMessage = 'Error en Supabase') {
  const details = {
    message: error?.message || fallbackMessage,
    code: error?.code || null,
    details: error?.details || null,
    hint: error?.hint || null
  };
  console.error(`[Supabase:${context}]`, details);
  return res.status(500).json({ error: details.message });
}

function normalizeKeywords(value) {
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.keywords)) return parsed.keywords;
    } catch {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }

  return [];
}

function parseRuleMetadata(rawKeywords) {
  if (Array.isArray(rawKeywords)) return { keywords: rawKeywords };

  if (typeof rawKeywords === 'string') {
    try {
      const parsed = JSON.parse(rawKeywords);
      if (Array.isArray(parsed)) return { keywords: parsed };
      if (parsed && typeof parsed === 'object') {
        return {
          keywords: normalizeKeywords(parsed.keywords),
          origen: parsed.origen,
          accion_inmediata: parsed.accion_inmediata,
          accion_correctiva: parsed.accion_correctiva,
          peso: parsed.peso
        };
      }
    } catch {
      return { keywords: normalizeKeywords(rawKeywords) };
    }
  }

  return { keywords: [] };
}

async function getRulesForAnalysis() {
  try {
    const dbRules = await prisma.businessRule.findMany({
      where: { enabled: true },
      orderBy: { createdAt: 'asc' }
    });

    if (!dbRules.length) return defaultRules;

    return dbRules.map((rule) => {
      const metadata = parseRuleMetadata(rule.keywords);
      return {
        id: rule.id,
        nombre: rule.name,
        categoria: rule.category,
        origen: metadata.origen || 'interno',
        gravedad: rule.severity,
        keywords: normalizeKeywords(metadata.keywords),
        accion_inmediata: metadata.accion_inmediata || rule.suggestedAction || 'aviso',
        accion_correctiva: metadata.accion_correctiva || '',
        peso: metadata.peso
      };
    });
  } catch {
    return defaultRules;
  }
}

function isStatusColumnMissing(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('status') && (
    message.includes('does not exist') ||
    message.includes('column') ||
    message.includes('schema cache')
  );
}

function isUpdatedAtColumnMissing(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('updated_at') && (
    message.includes('does not exist') ||
    message.includes('has no field') ||
    message.includes('record \"new\"') ||
    message.includes('record \"old\"') ||
    message.includes('column')
  );
}

function mapAnalysisRowToApi(row) {
  const summary = row.results?.summary || null;
  const processedAt = summary?.processedAt || row.created_at;
  return {
    id: row.id,
    filename: row.filename,
    status: row.status || null,
    uploadDate: row.created_at,
    processedAt,
    totalRecords: row.results?.totalRecords || 0,
    summary,
    records: row.results?.records || []
  };
}

/**
 * Subir y procesar archivo Excel
 */
export async function uploadAndAnalyze(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Excel file is required' });
    }

    const filename = req.file.originalname;

    if (!filename.endsWith('.xlsx') && !filename.endsWith('.xls')) {
      return res.status(400).json({ error: 'Solo se aceptan archivos .xlsx o .xls' });
    }

    const activeRules = await getRulesForAnalysis();
    const analysisResult = await analyzeExcel(req.file.buffer, activeRules);

    if (!analysisResult.success) {
      return res.status(400).json({ error: analysisResult.error });
    }

    const results = analysisResult.records;

    // Log con timestamp para verificar resultados nuevos
    const processingTimestamp = new Date().toISOString();
    console.log('='.repeat(60));
    console.log('RESULTADOS NUEVOS - Timestamp:', processingTimestamp);
    console.log('Total registros:', results.length);
    console.log('Primeros 5 registros:');
    console.log(JSON.stringify(results.slice(0, 5), null, 2));
    console.log('='.repeat(60));

    const resultPayload = {
      totalRecords: results.length,
      summary: {
        ...analysisResult.summary,
        totalRecords: results.length,
        processedAt: processingTimestamp
      },
      records: results
    };

    const archiveActiveResult = await supabaseAdmin
      .from('analysis_history')
      .update({ status: 'archived' })
      .eq('user_id', req.user.id)
      .eq('status', 'active');

    if (
      archiveActiveResult.error &&
      !isStatusColumnMissing(archiveActiveResult.error) &&
      !isUpdatedAtColumnMissing(archiveActiveResult.error)
    ) {
      return returnSupabaseError(res, 'archive_active', archiveActiveResult.error);
    }

    console.log('RESULTADOS NUEVOS', results.slice(0, 10));

    let insertResult = await supabaseAdmin
      .from('analysis_history')
      .insert({
        user_id: req.user.id,
        filename,
        status: 'active',
        results: resultPayload
      })
      .select()
      .single();

    if (insertResult.error && isStatusColumnMissing(insertResult.error)) {
      insertResult = await supabaseAdmin
        .from('analysis_history')
        .insert({
          user_id: req.user.id,
          filename,
          results: resultPayload
        })
        .select()
        .single();
    }

    if (insertResult.error) {
      return returnSupabaseError(res, 'insert_analysis_history', insertResult.error);
    }

    const data = insertResult.data;
    console.log('RESULTADOS GUARDADOS EN SUPABASE', (data?.results?.records || []).slice(0, 10));
    console.log('ANALISIS ACTIVO ACTUAL', { id: data?.id, userId: req.user.id, processedAt: data?.results?.summary?.processedAt || null });

    return res.json({
      success: true,
      analysisId: data.id,
      analysis: mapAnalysisRowToApi(data)
    });
  } catch (error) {
    console.error('Error en análisis:', error);
    return res.status(500).json({ error: 'Error procesando archivo: ' + error.message });
  }
}

/**
 * Obtener resultado de análisis
 */
export async function getAnalysis(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('analysis_history')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Análisis no encontrado' });
    }

    return res.json(mapAnalysisRowToApi(data));
  } catch (error) {
    console.error('Error obteniendo análisis:', error);
    return res.status(500).json({ error: 'Error obteniendo análisis' });
  }
}

/**
 * Obtener historial de análisis del usuario
 */
export async function getHistory(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const { data, error } = await supabaseAdmin
      .from('analysis_history')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return returnSupabaseError(res, 'get_history', error);
    }

    const historyData = (data || []).map((item) => mapAnalysisRowToApi(item));

    return res.json(historyData);
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    return res.status(500).json({ error: 'Error obteniendo historial' });
  }
}

/**
 * Eliminar análisis del usuario
 */
export async function deleteAnalysis(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('analysis_history')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) {
      return returnSupabaseError(res, 'delete_analysis', error);
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Error eliminando análisis:', error);
    return res.status(500).json({ error: 'Error eliminando análisis' });
  }
}

/**
 * Obtener análisis activo del usuario
 */
export async function getActiveAnalysis(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

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

/**
 * Eliminar análisis activo del usuario
 */
export async function deleteActiveAnalysis(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

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

/**
 * Actualizar estado de análisis
 */
export async function updateAnalysisStatus(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

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

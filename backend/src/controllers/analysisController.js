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

    const resultPayload = {
      totalRecords: analysisResult.records.length,
      summary: analysisResult.summary,
      records: analysisResult.records
    };

    const { data, error } = await supabaseAdmin
      .from('analysis_history')
      .insert({
        user_id: req.user.id,
        filename,
        results: resultPayload
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({
      success: true,
      analysisId: data.id,
      analysis: {
        id: data.id,
        filename: data.filename,
        uploadDate: data.created_at,
        totalRecords: resultPayload.totalRecords,
        summary: resultPayload.summary,
        records: resultPayload.records
      }
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

    return res.json({
      id: data.id,
      filename: data.filename,
      uploadDate: data.created_at,
      totalRecords: data.results?.totalRecords || 0,
      summary: data.results?.summary || null,
      records: data.results?.records || []
    });
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
      return res.status(500).json({ error: error.message });
    }

    const historyData = (data || []).map((item) => ({
      id: item.id,
      filename: item.filename,
      uploadDate: item.created_at,
      totalRecords: item.results?.totalRecords || 0,
      summary: item.results?.summary || null
    }));

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
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Error eliminando análisis:', error);
    return res.status(500).json({ error: 'Error eliminando análisis' });
  }
}

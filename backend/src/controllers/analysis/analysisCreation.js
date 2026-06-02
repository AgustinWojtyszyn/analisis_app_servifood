import { mapAnalysisRowToApi } from '../analysisController.mappers.js';
import {
  buildBatchUploadResponse,
  processExcelFile,
  ensureSupabaseConfigured
} from '../analysisController.utils.js';
import {
  ENABLE_DEBUG_EXCEL_ANALYSIS,
  getSupabaseAdmin,
  getUploadDependencies
} from './context.js';

export async function uploadAndAnalyze(req, res) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!ensureSupabaseConfigured(res, supabaseAdmin)) return;

    if (!req.file) {
      return res.status(400).json({ error: 'Excel file is required' });
    }

    if (ENABLE_DEBUG_EXCEL_ANALYSIS) {
      console.log({
        endpoint: 'POST /analysis/upload-excel',
        hasFile: !!req.file,
        fileField: req.file?.fieldname || null,
        originalname: req.file?.originalname || null,
        mimetype: req.file?.mimetype || null,
        size: req.file?.size || null,
        bodyKeys: Object.keys(req.body || {})
      });
    }

    const deps = getUploadDependencies();
    const analysis = await processExcelFile({
      file: req.file,
      userId: req.user.id,
      analyzeExcel: deps.analyzeExcel,
      prisma: deps.prisma,
      defaultRules: deps.defaultRules,
      supabaseAdmin: deps.supabaseAdmin,
      mapAnalysisRowToApi
    });

    return res.json({
      success: true,
      analysisId: analysis.id,
      analysis
    });
  } catch (error) {
    if (Number(error?.status) === 413) {
      return res.status(413).json({ error: error.message || 'El archivo supera el tamaño máximo permitido.' });
    }
    if (Number(error?.status) === 400) {
      return res.status(400).json({ error: error.message || 'El archivo Excel está dañado o no puede procesarse.' });
    }
    console.error('Error en análisis:', error?.message || error);
    return res.status(500).json({ error: 'Error procesando archivo' });
  }
}

export async function uploadAndAnalyzeMultiple(req, res) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!ensureSupabaseConfigured(res, supabaseAdmin)) return;

    const files = req.files || [];
    const uploadDiagnostics = {
      hasFile: !!req.file,
      hasFiles: Array.isArray(files) && files.length > 0,
      receivedFilesCount: Array.isArray(files) ? files.length : 0,
      fieldNames: Array.isArray(files) ? files.map((f) => f.fieldname) : [],
      fileNames: Array.isArray(files) ? files.map((f) => f.originalname) : [],
      sizes: Array.isArray(files) ? files.map((f) => f.size) : []
    };
    if (ENABLE_DEBUG_EXCEL_ANALYSIS) {
      console.log({
        endpoint: 'POST /analysis/upload-multiple',
        hasFiles: Array.isArray(files) && files.length > 0,
        filesCount: Array.isArray(files) ? files.length : 0,
        fields: Array.isArray(files) ? files.map((f) => f.fieldname) : [],
        names: Array.isArray(files) ? files.map((f) => f.originalname) : [],
        bodyKeys: Object.keys(req.body || {})
      });
    }
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'Debes enviar al menos un archivo Excel' });
    }

    if (files.length > 10) {
      return res.status(400).json({ error: 'Máximo 10 archivos por carga' });
    }

    const results = [];

    for (const file of files) {
      try {
        if (ENABLE_DEBUG_EXCEL_ANALYSIS) {
          console.log('BATCH FILE RECEIVED', {
            fileName: file.originalname,
            mimetype: file.mimetype,
            size: file.size
          });
        }
        const deps = getUploadDependencies();
        const analysis = await processExcelFile({
          file,
          userId: req.user.id,
          analyzeExcel: deps.analyzeExcel,
          prisma: deps.prisma,
          defaultRules: deps.defaultRules,
          supabaseAdmin: deps.supabaseAdmin,
          mapAnalysisRowToApi
        });
        const recordsLength = Array.isArray(analysis?.records) ? analysis.records.length : 0;
        if (recordsLength === 0) {
          const emptyResult = {
            fileName: file.originalname,
            filename: file.originalname,
            success: false,
            stage: 'post_processing',
            error: 'Archivo procesado sin registros detectados',
            diagnostics: ENABLE_DEBUG_EXCEL_ANALYSIS
              ? { upload: uploadDiagnostics, excel: analysis?.diagnostics || null }
              : null,
            analysisId: analysis?.id || null
          };
          if (ENABLE_DEBUG_EXCEL_ANALYSIS) {
            console.log('BATCH FILE RESULT', {
              fileName: file.originalname,
              success: emptyResult.success,
              recordsLength,
              diagnostics: emptyResult.diagnostics
            });
          }
          results.push(emptyResult);
          continue;
        }
        if (ENABLE_DEBUG_EXCEL_ANALYSIS) {
          console.log('BATCH FILE RESULT', {
            fileName: file.originalname,
            success: true,
            recordsLength,
            diagnostics: analysis?.diagnostics || null
          });
        }
        results.push({
          fileName: file.originalname,
          filename: file.originalname,
          success: true,
          analysisId: analysis.id,
          totalRecords: recordsLength,
          records: analysis.records || [],
          diagnostics: ENABLE_DEBUG_EXCEL_ANALYSIS
            ? { upload: uploadDiagnostics, excel: analysis.diagnostics || null }
            : null,
          analysis
        });
      } catch (error) {
        if (ENABLE_DEBUG_EXCEL_ANALYSIS) {
          console.log('BATCH FILE RESULT', {
            fileName: file.originalname,
            success: false,
            recordsLength: 0,
            diagnostics: error?.diagnostics || null
          });
        }
        results.push({
          fileName: file.originalname,
          filename: file.originalname,
          success: false,
          stage: error?.stage || 'processing',
          diagnostics: ENABLE_DEBUG_EXCEL_ANALYSIS
            ? { upload: uploadDiagnostics, excel: error?.diagnostics || null }
            : null,
          error: error.message || 'Error procesando archivo'
        });
      }
    }

    const payload = buildBatchUploadResponse(results);
    return res.json(payload);
  } catch (error) {
    console.error('Error en carga múltiple:', error);
    return res.status(500).json({ error: 'Error procesando carga múltiple' });
  }
}

export async function uploadAndAnalyzeService({ req, processExcelFile, analyzeExcel, prisma, defaultRules, supabaseAdmin, mapAnalysisRowToApi }) {
  const analysis = await processExcelFile({
    file: req.file,
    userId: req.user.id,
    analyzeExcel,
    prisma,
    defaultRules,
    supabaseAdmin,
    mapAnalysisRowToApi
  });
  return {
    success: true,
    analysisId: analysis.id,
    analysis
  };
}

export async function uploadAndAnalyzeMultipleService({
  req,
  processExcelFile,
  analyzeExcel,
  prisma,
  defaultRules,
  supabaseAdmin,
  mapAnalysisRowToApi,
  buildBatchUploadResponse,
  enableDebugExcelAnalysis
}) {
  const files = req.files || [];
  const uploadDiagnostics = {
    hasFile: !!req.file,
    hasFiles: Array.isArray(files) && files.length > 0,
    receivedFilesCount: Array.isArray(files) ? files.length : 0,
    fieldNames: Array.isArray(files) ? files.map((f) => f.fieldname) : [],
    fileNames: Array.isArray(files) ? files.map((f) => f.originalname) : [],
    sizes: Array.isArray(files) ? files.map((f) => f.size) : []
  };
  const results = [];
  for (const file of files) {
    try {
      const analysis = await processExcelFile({
        file,
        userId: req.user.id,
        analyzeExcel,
        prisma,
        defaultRules,
        supabaseAdmin,
        mapAnalysisRowToApi
      });
      const recordsLength = Array.isArray(analysis?.records) ? analysis.records.length : 0;
      if (recordsLength === 0) {
        results.push({
          fileName: file.originalname,
          filename: file.originalname,
          success: false,
          stage: 'post_processing',
          error: 'Archivo procesado sin registros detectados',
          diagnostics: enableDebugExcelAnalysis ? { upload: uploadDiagnostics, excel: analysis?.diagnostics || null } : null,
          analysisId: analysis?.id || null
        });
        continue;
      }
      results.push({
        fileName: file.originalname,
        filename: file.originalname,
        success: true,
        analysisId: analysis.id,
        totalRecords: recordsLength,
        records: analysis.records || [],
        diagnostics: enableDebugExcelAnalysis ? { upload: uploadDiagnostics, excel: analysis.diagnostics || null } : null,
        analysis
      });
    } catch (error) {
      results.push({
        fileName: file.originalname,
        filename: file.originalname,
        success: false,
        stage: error?.stage || 'processing',
        diagnostics: enableDebugExcelAnalysis ? { upload: uploadDiagnostics, excel: error?.diagnostics || null } : null,
        error: error.message || 'Error procesando archivo'
      });
    }
  }
  return buildBatchUploadResponse(results);
}

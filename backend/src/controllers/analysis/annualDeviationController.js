import ExcelJS from 'exceljs';
import { getSupabaseAdmin } from './context.js';
import { ensureSupabaseConfigured, returnSupabaseError } from '../analysisController.utils.js';
import { parseAnnualDeviationWorkbook, SHEET_TYPES } from '../../services/annualDeviation/annualDeviationService.js';
import { safeExcelCell } from '../../utils/safeExcelCell.js';

const SUMMARY_TABLE_BY_TYPE = {
  [SHEET_TYPES.QUALITY]: 'annual_quality_summary',
  [SHEET_TYPES.LOGISTICS]: 'annual_logistics_summary'
};

function mapUpload(row = {}) {
  return {
    id: row.id,
    userId: row.user_id,
    filename: row.filename,
    uploadedAt: row.uploaded_at,
    year: row.year,
    summary: row.summary || {},
    sheetNames: row.sheet_names || {},
    metadata: row.metadata || {}
  };
}

function mapDeviationRow(row = {}) {
  return {
    id: row.id,
    uploadId: row.upload_id,
    sheetType: row.sheet_type,
    rowIndex: row.row_index,
    dateMonth: row.date_month,
    month: row.month,
    monthNumber: row.month_number,
    year: row.year,
    areaSector: row.area_sector,
    areaSectorKey: row.area_sector_key,
    deviation: row.deviation,
    deviationKey: row.deviation_key,
    classification: row.classification,
    classificationKey: row.classification_key,
    sourceType: row.source_type,
    sourceTypeKey: row.source_type_key,
    immediateAction: row.immediate_action,
    correctiveAction: row.corrective_action,
    status: row.status,
    observations: row.observations,
    original: row.row_data || {},
    sheetName: row.original_row?.sheetName || ''
  };
}

function buildRowInsert(uploadId, row) {
  return {
    upload_id: uploadId,
    sheet_type: row.sheetType,
    row_index: row.rowIndex,
    date_month: row.dateMonth || null,
    month: row.month || null,
    month_number: row.monthNumber || null,
    year: row.year || null,
    area_sector: row.areaSector || null,
    area_sector_key: row.areaSectorKey || null,
    deviation: row.deviation || null,
    deviation_key: row.deviationKey || null,
    classification: row.classification || null,
    classification_key: row.classificationKey || null,
    source_type: row.sourceType || null,
    source_type_key: row.sourceTypeKey || null,
    immediate_action: row.immediateAction || null,
    corrective_action: row.correctiveAction || null,
    status: row.status || null,
    observations: row.observations || null,
    row_data: row.original || {},
    original_row: {
      sheetName: row.sheetName,
      rowIndex: row.rowIndex,
      dateMonth: row.dateMonth
    }
  };
}

async function insertSummaryRows(supabaseAdmin, uploadId, sheetType, summary) {
  const table = SUMMARY_TABLE_BY_TYPE[sheetType];
  if (!table) return;

  const rows = (summary?.byDeviation || []).map((item) => ({
    upload_id: uploadId,
    deviation_key: item.key,
    deviation_label: item.name,
    count: item.value,
    percentage: item.percentage
  }));

  if (!rows.length) return;
  const { error } = await supabaseAdmin.from(table).insert(rows);
  if (error) throw error;
}

async function fetchUploadWithRows(supabaseAdmin, id) {
  const uploadRes = await supabaseAdmin
    .from('annual_deviation_uploads')
    .select('*')
    .eq('id', id)
    .single();

  if (uploadRes.error || !uploadRes.data) {
    const error = new Error('Carga anual no encontrada');
    error.status = 404;
    throw error;
  }

  const rowsRes = await supabaseAdmin
    .from('annual_deviation_rows')
    .select('*')
    .eq('upload_id', id)
    .order('sheet_type', { ascending: true })
    .order('row_index', { ascending: true });

  if (rowsRes.error) throw rowsRes.error;

  return {
    ...mapUpload(uploadRes.data),
    rows: (rowsRes.data || []).map(mapDeviationRow)
  };
}

export async function uploadAnnualDeviationExcel(req, res) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!ensureSupabaseConfigured(res, supabaseAdmin)) return;
    if (!req.file) return res.status(400).json({ error: 'Debes subir un archivo .xlsx anual.' });

    const parsed = await parseAnnualDeviationWorkbook(req.file.buffer);
    const uploadPayload = {
      user_id: req.user.id,
      filename: req.file.originalname,
      year: parsed.year,
      summary: parsed.summary,
      sheet_names: parsed.sheetNames,
      metadata: {
        warnings: parsed.warnings,
        diagnostics: parsed.diagnostics,
        validThroughMonth: parsed.validThroughMonth,
        originalSize: req.file.size,
        processedRows: parsed.rows.length
      }
    };

    const uploadRes = await supabaseAdmin
      .from('annual_deviation_uploads')
      .insert(uploadPayload)
      .select('*')
      .single();

    if (uploadRes.error) return returnSupabaseError(res, 'annual_upload_insert', uploadRes.error);

    const uploadId = uploadRes.data.id;
    const rowInserts = parsed.rows.map((row) => buildRowInsert(uploadId, row));
    if (rowInserts.length) {
      const { error } = await supabaseAdmin.from('annual_deviation_rows').insert(rowInserts);
      if (error) return returnSupabaseError(res, 'annual_rows_insert', error);
    }

    try {
      await insertSummaryRows(supabaseAdmin, uploadId, SHEET_TYPES.QUALITY, parsed.summary.quality);
      await insertSummaryRows(supabaseAdmin, uploadId, SHEET_TYPES.LOGISTICS, parsed.summary.logistics);
    } catch (error) {
      return returnSupabaseError(res, 'annual_summary_insert', error);
    }

    const fullUpload = await fetchUploadWithRows(supabaseAdmin, uploadId);
    return res.json({ success: true, upload: fullUpload, warnings: parsed.warnings });
  } catch (error) {
    if (Number(error?.status) === 400) {
      return res.status(400).json({
        error: error.message,
        details: error.details || null
      });
    }
    console.error('Error procesando Excel anual:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Error procesando Excel anual' });
  }
}

export async function listAnnualDeviationUploads(req, res) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!ensureSupabaseConfigured(res, supabaseAdmin)) return;

    let query = supabaseAdmin
      .from('annual_deviation_uploads')
      .select('*')
      .order('uploaded_at', { ascending: false })
      .limit(50);

    if (req.query.year) query = query.eq('year', Number(req.query.year));

    const { data, error } = await query;
    if (error) return returnSupabaseError(res, 'annual_uploads_list', error);
    return res.json({ data: (data || []).map(mapUpload) });
  } catch (error) {
    console.error('Error listando cargas anuales:', error);
    return res.status(500).json({ error: 'Error listando cargas anuales' });
  }
}

export async function getAnnualDeviationUpload(req, res) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!ensureSupabaseConfigured(res, supabaseAdmin)) return;
    const upload = await fetchUploadWithRows(supabaseAdmin, req.params.id);
    return res.json(upload);
  } catch (error) {
    if (Number(error?.status) === 404) return res.status(404).json({ error: error.message });
    return returnSupabaseError(res, 'annual_upload_get', error);
  }
}

export async function exportAnnualDeviationExcel(req, res) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!ensureSupabaseConfigured(res, supabaseAdmin)) return;
    const upload = await fetchUploadWithRows(supabaseAdmin, req.params.id);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ServiFood';
    workbook.created = new Date();

    const summarySheet = workbook.addWorksheet('Resumen anual');
    summarySheet.addRows([
      ['Archivo', upload.filename],
      ['Año', upload.year],
      ['Total de desvíos', upload.summary?.total || 0],
      [],
      ['Mes', 'Cantidad'],
      ...(upload.summary?.byMonth || []).map((item) => [item.name, item.value]),
      [],
      ['Clasificación', 'Cantidad'],
      ...(upload.summary?.byClassification || []).map((item) => [item.name, item.value])
    ].map((row) => row.map(safeExcelCell)));

    const headers = ['Hoja', 'Fila', 'Fecha / mes', 'Mes', 'Área / sector', 'Desvío detectado', 'Clasificación', 'Interno / externo', 'Acción inmediata', 'Acción correctiva', 'Estado', 'Observaciones'];
    const tableSheet = workbook.addWorksheet('Tabla completa');
    tableSheet.addRow(headers.map(safeExcelCell));
    upload.rows.forEach((row) => {
      tableSheet.addRow([
        row.sheetType,
        row.rowIndex,
        row.dateMonth,
        row.month,
        row.areaSector,
        row.deviation,
        row.classification,
        row.sourceType,
        row.immediateAction,
        row.correctiveAction,
        row.status,
        row.observations
      ].map(safeExcelCell));
    });
    tableSheet.getRow(1).font = { bold: true };

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="analisis_anual_${upload.year || 'desvios'}.xlsx"`);
    return res.send(buffer);
  } catch (error) {
    if (Number(error?.status) === 404) return res.status(404).json({ error: error.message });
    console.error('Error exportando análisis anual:', error);
    return res.status(500).json({ error: 'Error exportando análisis anual' });
  }
}

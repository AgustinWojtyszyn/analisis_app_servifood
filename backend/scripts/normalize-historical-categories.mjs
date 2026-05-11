import '../src/config/env.js';
import { createClient } from '@supabase/supabase-js';
import { normalizeCategory } from '../src/services/excel/analyzeExcel/categoryNormalization.js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

function normalizeRecordCategory(record = {}) {
  const source = record.categoriaDesvio
    || record.clasificacionDesvio
    || record.classification_normalized
    || record.classification_original
    || '';
  const canonical = normalizeCategory(source);
  return {
    ...record,
    categoriaDesvio: canonical,
    clasificacionDesvio: canonical,
    classification_normalized: canonical
  };
}

function recalcSummary(records = [], base = {}) {
  const byCategoria = {};
  for (const record of records) {
    const key = normalizeCategory(
      record.categoriaDesvio
        || record.clasificacionDesvio
        || record.classification_normalized
        || record.classification_original
    );
    byCategoria[key] = (byCategoria[key] || 0) + 1;
  }
  return {
    ...base,
    byCategoria,
    totalInocuidad: Number(byCategoria.Inocuidad || 0),
    totalLogistica: Number(byCategoria['Logística'] || 0),
    totalCalidad: Number(byCategoria.Calidad || 0),
    totalLegal: Number(byCategoria.Legales || 0),
    totalMantenimiento: Number(byCategoria.Mantenimiento || 0),
    totalRRHH: Number(byCategoria['Recursos Humanos'] || 0),
    totalRevisionManual: Number(byCategoria['Revisar manualmente'] || 0)
  };
}

async function run() {
  const { data, error } = await supabase
    .from('analysis_history')
    .select('id,user_id,results')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error leyendo analysis_history:', error.message);
    process.exit(1);
  }

  let scanned = 0;
  let updated = 0;
  for (const row of (data || [])) {
    scanned += 1;
    const records = Array.isArray(row?.results?.records) ? row.results.records : [];
    if (!records.length) continue;

    const normalizedRecords = records.map(normalizeRecordCategory);
    const nextSummary = recalcSummary(normalizedRecords, row?.results?.summary || {});
    const nextResults = {
      ...row.results,
      records: normalizedRecords,
      summary: nextSummary
    };

    const changed = JSON.stringify(nextResults) !== JSON.stringify(row.results);
    if (!changed) continue;

    const { error: updateError } = await supabase
      .from('analysis_history')
      .update({ results: nextResults })
      .eq('id', row.id)
      .eq('user_id', row.user_id);

    if (updateError) {
      console.error(`Error actualizando ${row.id}:`, updateError.message);
      continue;
    }
    updated += 1;
  }

  console.log(JSON.stringify({ success: true, scanned, updated }, null, 2));
}

run();

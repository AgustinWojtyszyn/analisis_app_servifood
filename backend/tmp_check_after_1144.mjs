import './src/config/env.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const filename = 'Registro_Desvios_Auditoria_Diaria_13-04-2026 BS.xlsx';

// 11:44 America/Argentina/Buenos_Aires == 14:44 UTC
const cutoffUtc = '2026-05-04T14:44:00.000Z';

const { data, error } = await supabase
  .from('analysis_history')
  .select('id, filename, created_at, results')
  .ilike('filename', `%${filename}%`)
  .gte('created_at', cutoffUtc)
  .order('created_at', { ascending: false })
  .limit(20);

if (error) {
  console.log(JSON.stringify({ error: error.message, cutoffUtc }, null, 2));
  process.exit(0);
}

if (!data || data.length === 0) {
  console.log(JSON.stringify({ error: 'No runs found after cutoff', cutoffUtc }, null, 2));
  process.exit(0);
}

const run = data[0];
const summary = run?.results?.summary || {};
const records = run?.results?.records || [];
const audit = summary?.excelAudit || null;

const norm = (v) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const emptyLike = (v) => {
  const x = norm(v);
  return !x || x === '-' || x === 'na' || x === 'n a';
};

const invalidPattern = records.filter((r) => (
  norm(r?.hallazgoDetectado) === 'sin hallazgo detectado' &&
  norm(r?.areaClasificada) === 'area no identificada' &&
  norm(r?.responsable) === 'responsable a definir' &&
  emptyLike(r?.descripcion) &&
  emptyLike(r?.observaciones) &&
  emptyLike(r?.notaTecnica)
));

const rawPresence = {
  withRawRowNumber: records.filter((r) => r?.rawRowNumber != null && r?.rawRowNumber !== '').length,
  withRawDesvioDetectado: records.filter((r) => String(r?.rawDesvioDetectado ?? '').trim() !== '').length,
  totalRecords: records.length
};

const totalRegistros = Number(summary.totalRecords || run?.results?.totalRecords || records.length || 0);
const totalConformes = Number(summary.totalConformes || 0);
const totalInocuidad = Number(summary.totalInocuidad || 0);
const totalCalidad = Number(summary.totalCalidad || 0);
const totalLogistica = Number(summary.totalLogistica || 0);
const totalLegal = Number(summary.totalLegal || 0);
const totalDesvios = Number(summary.totalDesvios || (totalInocuidad + totalCalidad + totalLogistica + totalLegal));

console.log(JSON.stringify({
  analysis_id: run.id,
  filename: run.filename,
  created_at: run.created_at,
  processed_at: summary.processedAt || null,
  rawPresence,
  invalidPatternCount: invalidPattern.length,
  resumenFinal: {
    totalRegistros,
    totalConformes,
    totalInocuidad,
    totalCalidad,
    totalLogistica,
    totalLegal,
    totalDesvios
  },
  excelAudit: audit
}, null, 2));

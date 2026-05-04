import './src/config/env.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const filename = 'Registro_Desvios_Auditoria_Diaria_13-04-2026 BS.xlsx';

const { data, error } = await supabase
  .from('analysis_history')
  .select('id, filename, created_at, results')
  .ilike('filename', `%${filename}%`)
  .order('created_at', { ascending: false })
  .limit(10);

if (error) {
  console.log(JSON.stringify({ error: error.message }, null, 2));
  process.exit(0);
}

if (!data || data.length === 0) {
  console.log(JSON.stringify({ error: 'No runs found' }, null, 2));
  process.exit(0);
}

const latest = data[0];
const summary = latest?.results?.summary || {};
const records = latest?.results?.records || [];
const audit = summary?.excelAudit || {};

const totalRegistros = Number(summary.totalRecords || latest?.results?.totalRecords || records.length || 0);
const totalConformes = Number(summary.totalConformes || 0);
const totalInocuidad = Number(summary.totalInocuidad || 0);
const totalCalidad = Number(summary.totalCalidad || 0);
const totalLogistica = Number(summary.totalLogistica || 0);
const totalLegal = Number(summary.totalLegal || 0);
const totalDesvios = Number(summary.totalDesvios || (totalInocuidad + totalCalidad + totalLogistica + totalLegal));

const norm = (v) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const emptyLike = (v) => {
  const x = norm(v);
  return !x || x === '-' || x === 'na' || x === 'n a';
};

const invalidPatternRows = records.filter((r) => {
  return norm(r?.hallazgoDetectado) === 'sin hallazgo detectado'
    && norm(r?.areaClasificada) === 'area no identificada'
    && norm(r?.responsable) === 'responsable a definir'
    && emptyLike(r?.descripcion)
    && emptyLike(r?.observaciones)
    && emptyLike(r?.notaTecnica)
    && emptyLike(r?.tipoDesvio)
    && emptyLike(r?.iso22000);
});

const top10 = records.slice(0, 10).map((r) => ({
  rawRowNumber: r?.rawRowNumber ?? '-',
  rawDesvioDetectado: r?.rawDesvioDetectado ?? '-',
  hallazgoDetectado: r?.hallazgoDetectado ?? '-',
  area: r?.areaClasificada ?? '-',
  resultado: r?.resultadoClasificado ?? '-',
  categoria: r?.categoriaDesvio ?? '-',
  tipo: r?.tipoDesvio ?? '-',
  iso: r?.iso22000 ?? '-'
}));

console.log(JSON.stringify({
  run: { id: latest.id, filename: latest.filename, created_at: latest.created_at },
  auditoria: {
    totalFilasLeidas: Number(audit.totalFilasLeidas ?? 0),
    totalRegistrosCreados: Number(audit.totalRegistrosCreados ?? 0),
    filasDescartadasDesvioVacio: Number(audit.filasDescartadasDesvioVacio ?? 0),
    conformesExplicitosReales: Number(audit.conformesExplicitosReales ?? 0),
    totalConformesAutoGenerados: Number(audit.totalConformesAutoGenerados ?? 0),
    ejemplosConformesAutoGenerados: audit.ejemplosConformesAutoGenerados || []
  },
  resumen: {
    totalRegistros,
    totalConformes,
    totalInocuidad,
    totalCalidad,
    totalLogistica,
    totalLegal,
    totalDesvios
  },
  confirmaciones: {
    totalConformesAutoGeneradosEsCero: Number(audit.totalConformesAutoGenerados ?? 0) === 0,
    sinPatronInvalido: invalidPatternRows.length === 0,
    totalPatronInvalidoEncontrado: invalidPatternRows.length
  },
  formulas: {
    cierreRegistros: totalRegistros === (totalConformes + totalInocuidad + totalCalidad + totalLogistica + totalLegal),
    cierreDesvios: totalDesvios === (totalInocuidad + totalCalidad + totalLogistica + totalLegal)
  },
  primeros10RegistrosCreados: top10
}, null, 2));

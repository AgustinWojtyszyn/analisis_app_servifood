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

console.log(JSON.stringify((data || []).map((r) => ({
  id: r.id,
  created_at_utc: r.created_at,
  processed_at: r?.results?.summary?.processedAt || null,
  totalRecords: r?.results?.totalRecords || r?.results?.summary?.totalRecords || null,
  hasExcelAudit: Boolean(r?.results?.summary?.excelAudit)
})), null, 2));

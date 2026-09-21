import { supabase } from '../lib/supabaseClient';
import { normalizeArea, normalizeGeneric, normalizeMonth, normalizeStatus } from '../lib/customerNonconformities';

// Reuse the existing table and its admin-only RLS. Local Excel previews stay local.
export async function getStoredCustomerNonconformities() {
  const rows = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.from('customer_nonconformities').select('*')
      .order('id', { ascending: true }).range(offset, offset + pageSize - 1);
    if (error) throw new Error('No se pudieron consultar las NC persistidas. Podés seguir analizando un Excel local.');
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows.map((row) => ({
    id: row.id, month: normalizeMonth(row.month), year: row.year, claim: row.claim,
    hazardType: normalizeGeneric(row.hazard_type), severity: row.severity,
    probableCause: row.probable_cause, area: normalizeArea(row.area), client: row.client,
    status: normalizeStatus(row.status), sourceFileName: row.source_file_name, importedAt: row.imported_at
  }));
}

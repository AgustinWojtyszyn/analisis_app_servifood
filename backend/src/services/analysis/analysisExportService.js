import { buildBulkExportWorkbookBuffer } from './bulkExportWorkbook.js';

export async function buildBulkExportWorkbook(data = []) {
  return buildBulkExportWorkbookBuffer(data);
}

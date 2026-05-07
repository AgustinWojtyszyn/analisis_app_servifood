import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { analyzeExcel } from '../src/services/analyzeExcel.js';

test('Fechas dd/mm sin año heredan contextYear del archivo (2025)', async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Hoja1');
  ws.addRow(['Fecha', 'Área / Sector', 'Desvío detectado']);
  ws.addRow(['2025-12-01', '', 'No se enviaron pizzas al Easy']);
  ws.addRow(['6/12', '', 'Llega fruta sin sanitizar a Adium']);
  ws.addRow(['7/12', '', 'Falta de cajones para despacho']);

  const buffer = await wb.xlsx.writeBuffer();
  const result = await analyzeExcel(buffer, {});
  assert.equal(result.success, true);
  assert.equal(result.records.length, 3);
  assert.equal(result.records[1].fecha, '2025-12-06');
  assert.equal(result.records[2].fecha, '2025-12-07');
  assert.equal(result.records.some((r) => String(r.fecha || '').startsWith('2026-')), false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { analyzeExcel } from '../src/services/analyzeExcel.js';

async function buildWorkbookBuffer() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Registro');

  ws.addRow(['Reporte de diciembre']);
  ws.addRow([]);
  ws.addRow(['Fecha', 'Área / Sector', 'Desvío\ndetectado', 'Estado']);

  ws.addRow(['06/12/2025', 'Logística', 'Falta de cajones para despacho', '']);
  ws.addRow(['', '', 'No se enviaron pizzas al Easy', '']);
  ws.addRow(['', '', 'No se enviaron los almuerzos para celiacos para Monteverde', '']);
  ws.addRow(['', '', 'Banana oxidada o pasada en bandejas de refrigerio', '']);
  ws.addRow(['', '', 'Se detecta elaboracion de supremas no conformes por falta de coccion y dorado', '']);
  ws.addRow(['', '', '-', '']);
  ws.addRow(['Fecha', 'Área / Sector', 'Desvío detectado', 'Estado']);
  ws.addRow(['07/12', 'Producción', 'No se envio junto con el recorrido la limonada y fruta a SCOP', '']);
  ws.addRow(['', '', 'No se envio junto con el recorrido y fruta al Easy', '']);
  ws.addRow(['', '', '', '']);
  ws.addRow(['', '', 'Se rompe el batidor', '']);

  ws.mergeCells('A4:A8');
  ws.mergeCells('B4:B8');

  const ws2 = wb.addWorksheet('Resumen');
  ws2.addRow(['Resumen']);
  ws2.addRow(['Total', '9']);

  return wb.xlsx.writeBuffer();
}

test('Pipeline reads all valid deviation rows with fill-down and ignores invalid rows', async () => {
  const buffer = await buildWorkbookBuffer();
  const result = await analyzeExcel(buffer, {});

  assert.equal(result.success, true);
  assert.equal(result.records.length, 8);

  const findings = result.records.map((r) => String(r.hallazgoDetectado || ''));
  assert.ok(findings.includes('Falta de cajones para despacho'));
  assert.ok(findings.includes('No se enviaron pizzas al Easy'));
  assert.ok(findings.includes('No se enviaron los almuerzos para celiacos para Monteverde'));
  assert.ok(findings.includes('Banana oxidada o pasada en bandejas de refrigerio'));
  assert.ok(findings.includes('Se detecta elaboracion de supremas no conformes por falta de coccion y dorado'));

  const rowWithEmptyDate = result.records.find((r) => r.hallazgoDetectado === 'No se enviaron pizzas al Easy');
  assert.equal(rowWithEmptyDate?.fecha, '2025-12-06');

  const shortDateRow = result.records.find((r) => r.hallazgoDetectado.includes('limonada y fruta a SCOP'));
  assert.equal(shortDateRow?.fecha, '2025-12-07');
});

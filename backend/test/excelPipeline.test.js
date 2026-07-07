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

  const nonConformeWithActions = result.records.find((r) =>
    String(r?.resultadoClasificado || '').trim() === 'No conforme'
    && String(r?.accionInmediata || '').trim()
    && String(r?.accionCorrectiva || '').trim()
  );
  assert.ok(nonConformeWithActions, 'Debe existir al menos un registro NC con ambas acciones');
  assert.notEqual(
    String(nonConformeWithActions.accionInmediata || '').trim().toLowerCase(),
    String(nonConformeWithActions.accionCorrectiva || '').trim().toLowerCase(),
    'Acción inmediata y acción correctiva no deben ser idénticas'
  );
});

async function buildWorkbookBufferWithCategories(categoryValues = []) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Registro');

  ws.addRow(['Fecha', 'Área / Sector', 'Desvío detectado', 'Clasificación del desvío', 'Estado']);
  categoryValues.forEach((category, index) => {
    ws.addRow([
      '10/01/2026',
      'Calidad',
      `Hallazgo de prueba ${index + 1}`,
      category,
      'Abierto'
    ]);
  });

  return wb.xlsx.writeBuffer();
}

test('Pipeline preserves Incumplimientos de procedimiento from Excel classification column', async () => {
  const buffer = await buildWorkbookBufferWithCategories(['  INCUMPLIMIENTO de PROCEDIMIENTO  ']);
  const result = await analyzeExcel(buffer, {});

  assert.equal(result.success, true);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].clasificacionDesvio, 'Incumplimientos de procedimiento');
  assert.equal(result.records[0].categoriaDesvio, 'Incumplimientos de procedimiento');
  assert.equal(result.records[0].classification_normalized, 'Incumplimientos de procedimiento');
  assert.equal(result.summary.byCategoria['Incumplimientos de procedimiento'], 1);
  assert.equal(result.summary.totalProcedimiento, 1);
});

test('Pipeline preserves Medio ambiente from Excel classification column', async () => {
  const buffer = await buildWorkbookBufferWithCategories(['  medioambiente  ']);
  const result = await analyzeExcel(buffer, {});

  assert.equal(result.success, true);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].clasificacionDesvio, 'Medio ambiente');
  assert.equal(result.records[0].categoriaDesvio, 'Medio ambiente');
  assert.equal(result.records[0].classification_normalized, 'Medio ambiente');
  assert.equal(result.summary.byCategoria['Medio ambiente'], 1);
  assert.equal(result.summary.totalMedioAmbiente, 1);
});

test('Pipeline reads deviation rows from multiple valid worksheets', async () => {
  const wb = new ExcelJS.Workbook();
  const annual = wb.addWorksheet('Desvíos anuales');
  annual.addRow(['Fecha', 'Área / Sector', 'Desvío detectado', 'Clasificación del desvío']);
  annual.addRow(['05/03/2026', 'Calidad', 'Vianda con gramaje incorrecto', 'Calidad']);

  const quality = wb.addWorksheet('Calidad');
  quality.addRow(['Fecha', 'Área / Sector', 'Desvío detectado', 'Clasificación del desvío']);
  quality.addRow(['06/03/2026', 'Área fría', 'Banana oxidada en refrigerio', 'Calidad']);

  const logistics = wb.addWorksheet('Logística');
  logistics.addRow(['Fecha', 'Área / Sector', 'Desvío detectado', 'Clasificación del desvío']);
  logistics.addRow(['07/03/2026', 'Logística', 'No se enviaron postres al cliente', 'Logística']);

  const summary = wb.addWorksheet('Resumen');
  summary.addRow(['Desvío', 'Cantidad', 'Porcentaje']);
  summary.addRow(['Calidad', '2', '66%']);

  const result = await analyzeExcel(Buffer.from(await wb.xlsx.writeBuffer()), {});

  assert.equal(result.success, true);
  assert.equal(result.records.length, 3);
  const findings = result.records.map((record) => record.hallazgoDetectado);
  assert.ok(findings.includes('Vianda con gramaje incorrecto'));
  assert.ok(findings.includes('Banana oxidada en refrigerio'));
  assert.ok(findings.includes('No se enviaron postres al cliente'));
  assert.equal(result.summary.totalCalidad, 2);
  assert.equal(result.summary.totalLogistica, 1);
});

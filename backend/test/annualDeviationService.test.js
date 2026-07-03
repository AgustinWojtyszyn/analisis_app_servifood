import assert from 'node:assert/strict';
import { test } from 'node:test';
import ExcelJS from 'exceljs';
import { parseAnnualDeviationWorkbook } from '../src/services/annualDeviation/annualDeviationService.js';

async function buildWorkbookBuffer() {
  const workbook = new ExcelJS.Workbook();

  const annual = workbook.addWorksheet('Desvíos anuales');
  annual.addRow(['Mes', 'Area / sector', 'Desvio detectado', 'Clasificacion', 'Interno / externo', 'Accion inmediata', 'Accion correctiva', 'Estado', 'Observaciones']);
  annual.addRow(['Enero', 'Deposito', 'Faltante de rótulo', 'calidad', 'interno', 'Separar lote', 'Capacitar', 'Abierto', '']);
  annual.addRow(['Febrero', 'area fria', 'Entrega tardía', 'logistica', 'externo', 'Avisar cliente', 'Revisar ruta', 'Cerrado', '']);

  const quality = workbook.addWorksheet('Calidad');
  quality.addRow(['Mes', 'Área', 'Desvío', 'Clasificación']);
  quality.addRow(['Enero', 'Deposito', 'Faltante de rótulo', 'Calidad']);
  quality.addRow(['Enero', 'Depósito', 'Faltante de rótulo', 'Calidad']);

  const logistics = workbook.addWorksheet('Desvios de logistica');
  logistics.addRow(['Mes', 'Sector', 'Desvio', 'Clasificacion']);
  logistics.addRow(['Febrero', 'Distribución', 'Entrega tardía', 'Logística']);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

test('parseAnnualDeviationWorkbook detects sheets, normalizes keys and builds summaries', async () => {
  const buffer = await buildWorkbookBuffer();
  const parsed = await parseAnnualDeviationWorkbook(buffer);

  assert.equal(parsed.rows.length, 5);
  assert.equal(parsed.sheetNames.annual, 'Desvíos anuales');
  assert.equal(parsed.sheetNames.quality, 'Calidad');
  assert.equal(parsed.sheetNames.logistics, 'Desvios de logistica');
  assert.equal(parsed.summary.total, 2);
  assert.deepEqual(parsed.summary.byMonth.map((item) => [item.name, item.value]), [['Enero', 1], ['Febrero', 1]]);

  const annualDeposit = parsed.rows.find((row) => row.areaSector === 'Depósito');
  assert.equal(annualDeposit.areaSectorKey, 'deposito');
  assert.equal(annualDeposit.classification, 'Calidad');

  assert.equal(parsed.summary.quality.total, 2);
  assert.equal(parsed.summary.quality.topDeviations[0].value, 2);
  assert.equal(parsed.summary.logistics.total, 1);
});

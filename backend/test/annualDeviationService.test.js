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

function addSummaryThenDetailSheet(workbook, name, classification, totalRows, summaryRows) {
  const sheet = workbook.addWorksheet(name);
  sheet.addRow([`${classification} - resumen`]);
  sheet.addRow(['Desvio', 'Cantidad', 'Porcentaje']);
  for (let i = 1; i <= summaryRows; i += 1) {
    sheet.addRow([`Desvío agrupado ${i}`, i, `${i}%`]);
  }
  sheet.addRow([]);
  sheet.addRow(['Mes', 'Area / sector', 'Desvio detectado', 'Clasificacion', 'Estado']);

  for (let i = 1; i <= totalRows; i += 1) {
    if (i === 1 || i === 20) {
      sheet.addRow([i === 1 ? 'Enero' : 'Febrero']);
    }
    sheet.addRow(['', i % 2 === 0 ? 'Deposito' : 'area fria', `${classification} detalle ${i}`, classification.toUpperCase(), i % 2 === 0 ? 'Cerrado' : 'Abierto']);
  }

  return sheet;
}

test('parseAnnualDeviationWorkbook counts all Bruno-like quality and logistics detail rows below summaries', async () => {
  const workbook = new ExcelJS.Workbook();
  const annual = workbook.addWorksheet('Desvios anuales');
  annual.addRow(['Mes', 'Area / sector', 'Desvio detectado', 'Clasificacion']);
  for (let i = 1; i <= 39; i += 1) {
    annual.addRow([i <= 20 ? 'Enero' : 'Febrero', 'Deposito', `Calidad anual ${i}`, i % 2 ? 'calidad' : 'CALIDAD']);
  }
  for (let i = 1; i <= 46; i += 1) {
    annual.addRow([i <= 23 ? 'Marzo' : 'Abril', 'Logistica', `Logística anual ${i}`, i % 2 ? 'Logistica' : 'Logística']);
  }

  addSummaryThenDetailSheet(workbook, 'Desvios de calidad', 'Calidad', 39, 12);
  addSummaryThenDetailSheet(workbook, 'Desvios de logistica', 'Logística', 46, 11);

  const parsed = await parseAnnualDeviationWorkbook(Buffer.from(await workbook.xlsx.writeBuffer()));

  assert.equal(parsed.sheets.quality.rows.length, 39);
  assert.equal(parsed.sheets.logistics.rows.length, 46);
  assert.equal(parsed.summary.quality.total, 39);
  assert.equal(parsed.summary.logistics.total, 46);
});

test('parseAnnualDeviationWorkbook uses annual classified rows when specific sheets only contain grouped summaries', async () => {
  const workbook = new ExcelJS.Workbook();
  const annual = workbook.addWorksheet('Desvíos anuales');
  annual.addRow(['Mes', 'Area / sector', 'Desvio detectado', 'Clasificacion']);
  for (let i = 1; i <= 39; i += 1) {
    annual.addRow(['Enero', 'Deposito', `Calidad anual ${i}`, i % 2 ? 'Calidad' : 'calidad']);
  }
  for (let i = 1; i <= 46; i += 1) {
    annual.addRow(['Febrero', 'Distribución', `Logistica anual ${i}`, i % 2 ? 'Logistica' : 'Logística']);
  }

  const quality = workbook.addWorksheet('Calidad');
  quality.addRow(['Desvio', 'Cantidad', 'Porcentaje']);
  for (let i = 1; i <= 12; i += 1) quality.addRow([`Calidad agrupado ${i}`, i, `${i}%`]);

  const logistics = workbook.addWorksheet('Logística');
  logistics.addRow(['Desvio', 'Cantidad', 'Porcentaje']);
  for (let i = 1; i <= 11; i += 1) logistics.addRow([`Logística agrupado ${i}`, i, `${i}%`]);

  const parsed = await parseAnnualDeviationWorkbook(Buffer.from(await workbook.xlsx.writeBuffer()));

  assert.equal(parsed.sheets.quality.rows.length, 12);
  assert.equal(parsed.sheets.logistics.rows.length, 11);
  assert.equal(parsed.summary.quality.total, 39);
  assert.equal(parsed.summary.quality.source, 'annual_classification');
  assert.equal(parsed.summary.logistics.total, 46);
  assert.equal(parsed.summary.logistics.source, 'annual_classification');
});

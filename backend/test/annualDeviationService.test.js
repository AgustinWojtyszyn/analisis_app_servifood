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

  assert.equal(parsed.sheets.quality.rows.length, 0);
  assert.equal(parsed.sheets.logistics.rows.length, 0);
  assert.equal(parsed.summary.quality.total, 39);
  assert.equal(parsed.summary.quality.source, 'annual_classification');
  assert.equal(parsed.summary.logistics.total, 46);
  assert.equal(parsed.summary.logistics.source, 'annual_classification');
  assert.ok(parsed.warnings.some((warning) => warning.includes('resumen agrupado')));
});

test('parseAnnualDeviationWorkbook uses annual classified rows when specific sheets have fewer valid details', async () => {
  const workbook = new ExcelJS.Workbook();
  const annual = workbook.addWorksheet('Desvios anuales');
  annual.addRow(['Mes', 'Area / sector', 'Desvio detectado', 'Clasificacion']);
  for (let i = 1; i <= 39; i += 1) {
    annual.addRow(['Enero', 'Deposito', `Calidad anual ${i}`, i % 2 ? 'calidad' : 'CALIDAD']);
  }
  for (let i = 1; i <= 46; i += 1) {
    annual.addRow(['Febrero', 'Logistica', `Logística anual ${i}`, i % 2 ? 'Logistica' : 'Logística']);
  }

  const quality = workbook.addWorksheet('Desvios de calidad');
  quality.addRow(['Mes', 'Area / sector', 'Desvio detectado', 'Clasificacion']);
  for (let i = 1; i <= 12; i += 1) {
    quality.addRow(['Enero', 'Deposito', `Calidad detalle ${i}`, 'Calidad']);
  }

  const logistics = workbook.addWorksheet('Desvios de logistica');
  logistics.addRow(['Mes', 'Area / sector', 'Desvio detectado', 'Clasificacion']);
  for (let i = 1; i <= 11; i += 1) {
    logistics.addRow(['Febrero', 'Logistica', `Logística detalle ${i}`, 'Logística']);
  }

  const parsed = await parseAnnualDeviationWorkbook(Buffer.from(await workbook.xlsx.writeBuffer()));

  assert.equal(parsed.sheets.quality.rows.length, 12);
  assert.equal(parsed.summary.quality.specificSheetTotal, 12);
  assert.equal(parsed.summary.quality.annualClassificationTotal, 39);
  assert.equal(parsed.summary.quality.total, 39);
  assert.equal(parsed.summary.quality.source, 'annual_classification');
  assert.equal(parsed.sheets.logistics.rows.length, 11);
  assert.equal(parsed.summary.logistics.specificSheetTotal, 11);
  assert.equal(parsed.summary.logistics.annualClassificationTotal, 46);
  assert.equal(parsed.summary.logistics.total, 46);
  assert.equal(parsed.summary.logistics.source, 'annual_classification');
});

test('parseAnnualDeviationWorkbook uses specific quality sheet for KPIs when it has detail rows', async () => {
  const workbook = new ExcelJS.Workbook();
  const annual = workbook.addWorksheet('Desvíos anuales');
  annual.addRow(['Mes', 'Area / sector', 'Desvio detectado', 'Clasificacion']);
  annual.addRow(['Enero', 'Depósito', 'Manzana oxidada', 'Calidad']);
  annual.addRow(['Enero', 'Área fría', 'Postre mal rotulado', 'Calidad']);

  const quality = workbook.addWorksheet('Calidad');
  quality.addRow(['Mes', 'Área', 'Desvío', 'Clasificación']);
  quality.addRow(['Enero', 'Depósito', 'Manzana oxidada', 'Calidad']);
  quality.addRow(['Enero', 'Cámara 1', 'Banana pasada', 'Calidad']);
  quality.addRow(['Enero', 'Área fría', 'Postre mal rotulado', 'Calidad']);

  const logistics = workbook.addWorksheet('Logística');
  logistics.addRow(['Mes', 'Área', 'Desvío', 'Clasificación']);
  logistics.addRow(['Febrero', 'Logística', 'Entrega tarde', 'Logística']);

  const parsed = await parseAnnualDeviationWorkbook(Buffer.from(await workbook.xlsx.writeBuffer()));

  assert.equal(parsed.summary.quality.total, 3);
  assert.deepEqual(
    parsed.summary.quality.byDeviation.map((item) => item.name).sort(),
    ['Banana pasada', 'Manzana oxidada', 'Postre mal rotulado'].sort()
  );
});

test('parseAnnualDeviationWorkbook uses specific logistics sheet for KPIs when it has detail rows', async () => {
  const workbook = new ExcelJS.Workbook();
  const annual = workbook.addWorksheet('Desvíos anuales');
  annual.addRow(['Mes', 'Area / sector', 'Desvio detectado', 'Clasificacion']);
  annual.addRow(['Marzo', 'Logística', 'No sale postre', 'Logística']);

  const quality = workbook.addWorksheet('Calidad');
  quality.addRow(['Mes', 'Área', 'Desvío', 'Clasificación']);
  quality.addRow(['Marzo', 'Calidad', 'Vianda con gramaje bajo', 'Calidad']);

  const logistics = workbook.addWorksheet('Desvíos de logística');
  logistics.addRow(['Mes', 'Área', 'Desvío', 'Clasificación']);
  logistics.addRow(['Marzo', 'Distribución', 'No sale postre', 'Logística']);
  logistics.addRow(['Marzo', 'Distribución', 'Falta pan en recorrido', 'Logística']);

  const parsed = await parseAnnualDeviationWorkbook(Buffer.from(await workbook.xlsx.writeBuffer()));

  assert.equal(parsed.summary.logistics.total, 2);
  assert.deepEqual(
    parsed.summary.logistics.byDeviation.map((item) => item.name).sort(),
    ['Falta pan en recorrido', 'No sale postre'].sort()
  );
});

test('parseAnnualDeviationWorkbook processes multiple sheets of the same type', async () => {
  const workbook = new ExcelJS.Workbook();
  const annual = workbook.addWorksheet('Desvíos anuales');
  annual.addRow(['Mes', 'Area / sector', 'Desvio detectado', 'Clasificacion']);
  annual.addRow(['Abril', 'Depósito', 'Registro incompleto', 'Calidad']);

  const qualityOne = workbook.addWorksheet('Calidad enero');
  qualityOne.addRow(['Mes', 'Área', 'Desvío', 'Clasificación']);
  qualityOne.addRow(['Enero', 'Depósito', 'Etiqueta rota', 'Calidad']);

  const qualityTwo = workbook.addWorksheet('Calidad febrero');
  qualityTwo.addRow(['Mes', 'Área', 'Desvío', 'Clasificación']);
  qualityTwo.addRow(['Febrero', 'Área fría', 'Ensalada no fresca', 'Calidad']);

  const logisticsOne = workbook.addWorksheet('Logística enero');
  logisticsOne.addRow(['Mes', 'Área', 'Desvío', 'Clasificación']);
  logisticsOne.addRow(['Enero', 'Logística', 'Entrega tarde', 'Logística']);

  const logisticsTwo = workbook.addWorksheet('Logística febrero');
  logisticsTwo.addRow(['Mes', 'Área', 'Desvío', 'Clasificación']);
  logisticsTwo.addRow(['Febrero', 'Logística', 'Falta bebida', 'Logística']);

  const parsed = await parseAnnualDeviationWorkbook(Buffer.from(await workbook.xlsx.writeBuffer()));

  assert.equal(parsed.sheets.quality.rows.length, 2);
  assert.equal(parsed.sheets.logistics.rows.length, 2);
  assert.deepEqual(parsed.sheetNames.quality, ['Calidad enero', 'Calidad febrero']);
  assert.equal(parsed.summary.quality.total, 2);
  assert.equal(parsed.summary.logistics.total, 2);
});

function addRequiredSheets(workbook) {
  const quality = workbook.addWorksheet('Calidad');
  quality.addRow(['Mes', 'Área', 'Desvío', 'Clasificación']);
  quality.addRow(['Enero', 'Depósito', 'Control calidad', 'Calidad']);

  const logistics = workbook.addWorksheet('Logística');
  logistics.addRow(['Mes', 'Área', 'Desvío', 'Clasificación']);
  logistics.addRow(['Enero', 'Logística', 'Control logística', 'Logística']);
}

test('parseAnnualDeviationWorkbook omits rows after expected period from main KPIs', async () => {
  const workbook = new ExcelJS.Workbook();
  const annual = workbook.addWorksheet('Desvíos anuales');
  annual.addRow(['Mes', 'Area / sector', 'Desvio detectado', 'Clasificacion']);
  annual.addRow(['Junio', 'Depósito', 'Registro válido', 'Calidad']);
  annual.addRow(['Julio', 'Depósito', 'Registro fuera de período', 'Calidad']);
  addRequiredSheets(workbook);

  const parsed = await parseAnnualDeviationWorkbook(Buffer.from(await workbook.xlsx.writeBuffer()), {
    referenceDate: new Date('2026-07-07T12:00:00Z')
  });

  assert.equal(parsed.validThroughMonth, 6);
  assert.equal(parsed.summary.total, 1);
  assert.equal(parsed.rows.filter((row) => row.sheetType === 'annual').length, 1);
  assert.ok(parsed.warnings.some((warning) => warning.includes('fuera del período esperado') && warning.includes('Julio')));
  assert.deepEqual(
    parsed.diagnostics.kpi.omittedRows.map((row) => [row.sheetName, row.rowIndex, row.month, row.reason]),
    [['Desvíos anuales', 3, 'Julio', 'fuera_del_periodo_esperado']]
  );
});

test('parseAnnualDeviationWorkbook sends rows without month to diagnostics instead of main KPIs', async () => {
  const workbook = new ExcelJS.Workbook();
  const annual = workbook.addWorksheet('Desvíos anuales');
  annual.addRow(['Mes', 'Area / sector', 'Desvio detectado', 'Clasificacion']);
  annual.addRow(['Junio', 'Depósito', 'Registro válido', 'Calidad']);
  annual.addRow(['', 'Recursos humanos', 'Registro sin mes', 'Recursos humanos']);
  addRequiredSheets(workbook);

  const parsed = await parseAnnualDeviationWorkbook(Buffer.from(await workbook.xlsx.writeBuffer()), {
    referenceDate: new Date('2026-07-07T12:00:00Z')
  });

  assert.equal(parsed.summary.total, 1);
  assert.equal(parsed.rows.filter((row) => row.sheetType === 'annual').length, 1);
  assert.ok(parsed.warnings.some((warning) => warning.includes('no tener mes detectable')));
  assert.deepEqual(
    parsed.diagnostics.kpi.omittedRows.map((row) => [row.sheetName, row.rowIndex, row.dateMonth, row.reason]),
    [['Desvíos anuales', 3, '', 'sin_mes']]
  );
});

function monthForHalfYear(index) {
  return ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio'][(index - 1) % 6];
}

async function buildHalfYearWorkbookWithOutOfPeriodRows() {
  const workbook = new ExcelJS.Workbook();
  const annual = workbook.addWorksheet('Desvios anuales');
  annual.addRow(['Mes', 'Area / sector', 'Desvio detectado', 'Clasificacion']);
  for (let i = 1; i <= 39; i += 1) {
    annual.addRow([monthForHalfYear(i), 'Depósito', `Calidad anual ${i}`, 'Calidad']);
  }
  for (let i = 1; i <= 46; i += 1) {
    annual.addRow([monthForHalfYear(i), 'Logística', `Logística anual ${i}`, 'Logística']);
  }
  for (let i = 1; i <= 29; i += 1) {
    annual.addRow([monthForHalfYear(i), 'Mantenimiento', `Otro desvío ${i}`, 'Mantenimiento']);
  }
  annual.addRow(['Julio', 'Depósito', 'Calidad anual fuera de período', 'Calidad']);
  annual.addRow(['', 'Recursos humanos', 'Registro anual sin mes', 'Recursos humanos']);

  const quality = workbook.addWorksheet('Desvios de calidad');
  quality.addRow(['Mes', 'Área', 'Desvío', 'Clasificación']);
  for (let i = 1; i <= 39; i += 1) {
    quality.addRow([monthForHalfYear(i), 'Depósito', `Calidad detalle ${i}`, 'Calidad']);
  }
  quality.addRow(['Julio', 'Depósito', 'Calidad detalle fuera de período', 'Calidad']);

  const logistics = workbook.addWorksheet('Desvios de logistica');
  logistics.addRow(['Mes', 'Área', 'Desvío', 'Clasificación']);
  for (let i = 1; i <= 46; i += 1) {
    logistics.addRow([monthForHalfYear(i), 'Logística', `Logística detalle ${i}`, 'Logística']);
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

test('parseAnnualDeviationWorkbook keeps expected annual quality and logistics KPI counts for half-year fixture', async () => {
  const parsed = await parseAnnualDeviationWorkbook(await buildHalfYearWorkbookWithOutOfPeriodRows(), {
    referenceDate: new Date('2026-07-07T12:00:00Z')
  });

  assert.equal(parsed.summary.total, 114);
  assert.equal(parsed.summary.quality.total, 39);
  assert.equal(parsed.summary.quality.specificSheetTotal, 39);
  assert.equal(parsed.summary.logistics.total, 46);
  assert.equal(parsed.summary.logistics.specificSheetTotal, 46);
  assert.equal(parsed.diagnostics.kpi.rawParsedRows, 202);
  assert.equal(parsed.diagnostics.kpi.processedRows, 199);
});

test('parseAnnualDeviationWorkbook reports all omitted KPI rows with sheet row month and reason', async () => {
  const parsed = await parseAnnualDeviationWorkbook(await buildHalfYearWorkbookWithOutOfPeriodRows(), {
    referenceDate: new Date('2026-07-07T12:00:00Z')
  });

  assert.deepEqual(
    parsed.diagnostics.kpi.omittedRows.map((row) => ({
      sheetName: row.sheetName,
      rowIndex: row.rowIndex,
      month: row.month,
      dateMonth: row.dateMonth,
      reason: row.reason
    })),
    [
      {
        sheetName: 'Desvios anuales',
        rowIndex: 116,
        month: 'Julio',
        dateMonth: 'Julio',
        reason: 'fuera_del_periodo_esperado'
      },
      {
        sheetName: 'Desvios anuales',
        rowIndex: 117,
        month: '',
        dateMonth: '',
        reason: 'sin_mes'
      },
      {
        sheetName: 'Desvios de calidad',
        rowIndex: 41,
        month: 'Julio',
        dateMonth: 'Julio',
        reason: 'fuera_del_periodo_esperado'
      }
    ]
  );
  assert.equal(parsed.warnings.filter((warning) => warning.includes('omitida de KPIs principales')).length, 3);
});

test('parseAnnualDeviationWorkbook groups annual source type only as Interno and Externo', async () => {
  const workbook = new ExcelJS.Workbook();
  const annual = workbook.addWorksheet('Desvíos anuales');
  annual.addRow(['Mes', 'Area / sector', 'Desvio detectado', 'Clasificacion', 'Interno / externo']);
  annual.addRow(['Enero', 'Depósito', 'Registro interno', 'Calidad', 'interno']);
  annual.addRow(['Enero', 'Logística', 'Registro externo', 'Logística', 'externo']);
  annual.addRow(['Febrero', 'Depósito', 'Otro interno', 'Calidad', 'Interno']);
  addRequiredSheets(workbook);

  const parsed = await parseAnnualDeviationWorkbook(Buffer.from(await workbook.xlsx.writeBuffer()));

  assert.deepEqual(
    parsed.summary.bySourceType.map((item) => [item.name, item.value]),
    [['Interno', 2], ['Externo', 1]]
  );
});

test('parseAnnualDeviationWorkbook excludes numbers, areas and classifications from source type', async () => {
  const workbook = new ExcelJS.Workbook();
  const annual = workbook.addWorksheet('Desvíos anuales');
  annual.addRow(['Mes', 'Area / sector', 'Desvio detectado', 'Clasificacion', 'Tipo']);
  annual.addRow(['Enero', 'Depósito', 'Número en tipo', 'Calidad', '12.5']);
  annual.addRow(['Enero', 'Área fría', 'Área en tipo', 'Logística', 'Área fría']);
  annual.addRow(['Febrero', 'Logística', 'Clasificación en tipo', 'Calidad', 'Calidad']);
  annual.addRow(['Febrero', 'Depósito', 'Porcentaje en tipo', 'Calidad', '44%']);
  addRequiredSheets(workbook);

  const parsed = await parseAnnualDeviationWorkbook(Buffer.from(await workbook.xlsx.writeBuffer()));

  assert.deepEqual(parsed.summary.bySourceType, []);
  assert.deepEqual(parsed.rows.filter((row) => row.sheetType === 'annual').map((row) => row.sourceType), ['', '', '', '']);
});

test('parseAnnualDeviationWorkbook normalizes source type spaces and capitalization', async () => {
  const workbook = new ExcelJS.Workbook();
  const annual = workbook.addWorksheet('Desvíos anuales');
  annual.addRow(['Mes', 'Area / sector', 'Desvio detectado', 'Clasificacion', 'Origen']);
  annual.addRow(['Enero', 'Depósito', 'Registro interno', 'Calidad', '  INTERNO  ']);
  annual.addRow(['Enero', 'Logística', 'Registro externo', 'Logística', ' externo ']);
  addRequiredSheets(workbook);

  const parsed = await parseAnnualDeviationWorkbook(Buffer.from(await workbook.xlsx.writeBuffer()));

  assert.deepEqual(
    parsed.summary.bySourceType.map((item) => [item.name, item.value]),
    [['Externo', 1], ['Interno', 1]]
  );
});

test('parseAnnualDeviationWorkbook keeps source type summary empty when no valid source data exists', async () => {
  const workbook = new ExcelJS.Workbook();
  const annual = workbook.addWorksheet('Desvíos anuales');
  annual.addRow(['Mes', 'Area / sector', 'Desvio detectado', 'Clasificacion', 'Interno / externo']);
  annual.addRow(['Enero', 'Depósito', 'Registro sin origen', 'Calidad', '']);
  annual.addRow(['Febrero', 'Logística', 'Registro con origen inválido', 'Logística', 'Depósito']);
  addRequiredSheets(workbook);

  const parsed = await parseAnnualDeviationWorkbook(Buffer.from(await workbook.xlsx.writeBuffer()));

  assert.equal(parsed.summary.total, 2);
  assert.deepEqual(parsed.summary.bySourceType, []);
});

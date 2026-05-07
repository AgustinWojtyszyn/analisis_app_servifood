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

test('Anti-regresión: con año actual simulado 2026, mantiene contextYear 2025', async (t) => {
  const OriginalDate = Date;
  const fixedNow = new OriginalDate('2026-06-01T12:00:00Z');
  class MockDate extends OriginalDate {
    constructor(...args) {
      if (args.length === 0) {
        super(fixedNow.getTime());
        return;
      }
      super(...args);
    }
    static now() {
      return fixedNow.getTime();
    }
  }
  global.Date = MockDate;
  t.after(() => {
    global.Date = OriginalDate;
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Hoja1');
  ws.addRow(['Fecha', 'Área / Sector', 'Desvío detectado']);
  ws.addRow(['01/12/2025', '', 'No se enviaron pizzas al Easy']);
  ws.addRow(['6/12', '', 'Llega fruta sin sanitizar a Adium']);
  ws.addRow(['30/12', '', 'Falta de cajones para despacho']);

  const buffer = await wb.xlsx.writeBuffer();
  const result = await analyzeExcel(buffer, {}, null, { analysisYear: 2025 });
  assert.equal(result.success, true);
  assert.equal(result.records[1].fecha, '2025-12-06');
  assert.equal(result.records[2].fecha, '2025-12-30');
  assert.equal(result.records.some((r) => String(r.fecha || '').startsWith('2026-')), false);
});

test('parsea dd/mm por contexto inferido de mes en filename (diciembre, año actual 2026 => 2025)', async (t) => {
  const OriginalDate = Date;
  const fixedNow = new OriginalDate('2026-05-15T12:00:00Z');
  class MockDate extends OriginalDate {
    constructor(...args) {
      if (args.length === 0) {
        super(fixedNow.getTime());
        return;
      }
      super(...args);
    }
    static now() {
      return fixedNow.getTime();
    }
  }
  global.Date = MockDate;
  t.after(() => {
    global.Date = OriginalDate;
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Hoja1');
  ws.addRow(['Fecha', 'Área / Sector', 'Desvío detectado']);
  ws.addRow(['1/12', '', 'No se enviaron pizzas al Easy']);
  ws.addRow(['2/12', '', 'Llega fruta sin sanitizar a Adium']);
  ws.addRow(['3/12', '', 'Falta de cajones para despacho']);
  const result = await analyzeExcel(await wb.xlsx.writeBuffer(), {}, null, {
    filename: 'Registro de desvios diciembre.xlsx',
    uploadedAt: '2026-05-15T12:00:00Z'
  });
  assert.equal(result.records[0].fecha, '2025-12-01');
  assert.equal(result.records[1].fecha, '2025-12-02');
  assert.equal(result.records[2].fecha, '2025-12-03');
});

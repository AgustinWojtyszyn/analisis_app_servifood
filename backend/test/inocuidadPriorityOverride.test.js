import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { analyzeExcel } from '../src/services/analyzeExcel.js';

async function buildPriorityWorkbookBuffer() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Registro');

  ws.addRow(['Fecha', 'Área / Sector', 'Desvío detectado', 'Acción inmediata', 'Acción correctiva', 'Clasificación del desvío']);
  ws.addRow([
    '12/05/2026',
    'Logística',
    'Se merman 100 raciones de ensalada de fruta por no enviarla en el postre del día',
    'Se decomisa debido a que no son enviadas dentro de las 24 hs de vida util.',
    '',
    'Logística'
  ]);

  return wb.xlsx.writeBuffer();
}

test('Prioridad sanitaria: decomisa + vida util gana sobre clasificación logística original', async () => {
  const buffer = await buildPriorityWorkbookBuffer();
  const result = await analyzeExcel(buffer, {});

  assert.equal(result.success, true);
  assert.equal(result.records.length, 1);

  const row = result.records[0];
  assert.equal(row.categoriaDesvio, 'Desvío de Inocuidad');
  assert.equal(row.clasificacionDesvio, 'Inocuidad');
  assert.equal(row.relacionIso22000 || row.iso22000, '8.5 HACCP');
});

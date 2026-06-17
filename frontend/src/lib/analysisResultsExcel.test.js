import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import {
  ANALYSIS_RESULTS_SHEET_NAME,
  buildAnalysisResultsWorkbookBuffer
} from './analysisResultsExcel.js';

async function readWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
}

describe('analysisResultsExcel', () => {
  it('genera workbook con hoja, encabezados, filas y valores vacíos', async () => {
    const headers = ['Fecha', 'Desvío detectado', 'Relación ISO 22000', 'Estado de acciones'];
    const buffer = await buildAnalysisResultsWorkbookBuffer({
      headers,
      rows: [
        {
          Fecha: '2026-06-17',
          'Desvío detectado': 'Ñandú con texto especial',
          'Relación ISO 22000': '8.5 HACCP',
          'Estado de acciones': 'Abierto'
        },
        {
          Fecha: '2026-06-18',
          'Desvío detectado': undefined,
          'Relación ISO 22000': '',
          'Estado de acciones': null
        }
      ]
    });

    const workbook = await readWorkbook(buffer);
    const sheet = workbook.getWorksheet(ANALYSIS_RESULTS_SHEET_NAME);

    expect(sheet).toBeTruthy();
    expect(sheet.getRow(1).values.slice(1)).toEqual(headers);
    expect(sheet.getRow(2).values.slice(1)).toEqual([
      '2026-06-17',
      'Ñandú con texto especial',
      '8.5 HACCP',
      'Abierto'
    ]);
    expect(sheet.getRow(3).values.slice(1)).toEqual(['2026-06-18', '', '', '']);
    expect(sheet.actualRowCount).toBe(3);
  });
});

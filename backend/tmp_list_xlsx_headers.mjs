import ExcelJS from 'exceljs';
import path from 'path';

const files = [
  'dataset_step3_carteleria_higiene.xlsx',
  'dataset_area_step3.xlsx',
  'ejemplo_analisis.xlsx',
  'dataset_validacion.xlsx',
  'dataset_area_step3_fixed.xlsx',
  'dataset_prioridad_casos.xlsx',
  'dataset_normalizacion_reglas.xlsx',
  'dataset_tecnico_regla.xlsx'
].map((f) => path.resolve(process.cwd(), f));

for (const file of files) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.worksheets[0];
  const headers = (ws.getRow(1).values || []).slice(1).map((v) => String(v ?? '').trim());
  console.log('\n' + path.basename(file));
  console.log(headers.join(' | '));
}

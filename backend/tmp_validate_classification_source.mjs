import fs from 'fs/promises';
import ExcelJS from 'exceljs';
import { analyzeExcel } from './src/services/analyzeExcel.js';

const excelPath = process.argv[2] || '/home/aggustin/.vscode/analisis_app_servifood/ejemplo_analisis.xlsx';

function norm(v='') { return String(v ?? '').trim(); }
function isValid(v='') {
  const t = norm(v).toLowerCase();
  return Boolean(t) && !['-','na','n a','nd','n d','s/d','s d','revisar manualmente','revision manual'].includes(t);
}

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(excelPath);
const ws = wb.worksheets[0];
const header = (ws.getRow(1).values || []).slice(1).map((v) => norm(v).toLowerCase());
const classificationIdx = header.findIndex((h) => [
  'clasificacion del desvio','clasificación del desvío','clasificacion del desvío','clasificación del desvio','clasificacion','clasificación','categoria','categoría','categoria del desvio','categoría del desvío'
].includes(h)) + 1;
if (!classificationIdx) {
  console.log(JSON.stringify({ excelPath, error: 'No se encontró columna de clasificación en header row 1', header }, null, 2));
  process.exit(0);
}

const excelCounts = new Map();
for (let r = 2; r <= ws.rowCount; r += 1) {
  const cell = ws.getCell(r, classificationIdx).value;
  const value = norm(cell?.text ?? cell);
  if (!isValid(value)) continue;
  excelCounts.set(value, (excelCounts.get(value) || 0) + 1);
}

const buffer = await fs.readFile(excelPath);
const analyzed = await analyzeExcel(buffer, {}, null, { filename: excelPath.split('/').pop() });
const outputCounts = new Map();
for (const row of analyzed.records || []) {
  const source = norm(row?.classification_original);
  if (!isValid(source)) continue;
  const final = norm(row?.clasificacionDesvio || row?.categoriaDesvio || row?.classification_original);
  outputCounts.set(final, (outputCounts.get(final) || 0) + 1);
}

const allKeys = [...new Set([...excelCounts.keys(), ...outputCounts.keys()])].sort();
const diffs = allKeys
  .map((k) => ({ clasificacion: k, excel: excelCounts.get(k) || 0, salida: outputCounts.get(k) || 0 }))
  .filter((x) => x.excel !== x.salida);

console.log(JSON.stringify({
  excelPath,
  columnIndex: classificationIdx,
  excelTotal: [...excelCounts.values()].reduce((a,b)=>a+b,0),
  salidaTotal: [...outputCounts.values()].reduce((a,b)=>a+b,0),
  diferencias: diffs.slice(0, 50),
  coincide: diffs.length === 0
}, null, 2));

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import ExcelJS from 'exceljs';
import { analyzeExcel } from './src/services/analyzeExcel.js';

const tmpFile = path.join(os.tmpdir(), 'tmp_clasificacion_fuente_verdad.xlsx');
const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet('Datos');
ws.addRow(['Fecha','Área / Sector','Clasificacion del desvio','Desvío interno/externo','Estado','ISO 22000','Acción inmediata','Acción correctiva','Responsable','Desvío detectado']);
ws.addRow(['2026-03-10','Logística','Calidad','Interno','Cerrado','8.5.1','Retener lote','Capacitar recepción','Juan Pérez','Texto menciona higiene y proveedor']);
ws.addRow(['2026-03-11','Depósito','Calidad/Mantenimiento','Interno','Abierto','8.5.1','Aislar producto','Plan de mejora','Ana Ruiz','Texto menciona máquina']);
ws.addRow(['2026-03-12','Cocina','','Externo','Cerrado','','','', 'Luis', 'Sin clasificacion en excel']);
await wb.xlsx.writeFile(tmpFile);

const buffer = await fs.readFile(tmpFile);
const result = await analyzeExcel(buffer, {}, null, { filename: path.basename(tmpFile) });
const rows = result.records || [];

const pick = rows.map((r) => ({
  row: r.rawRowNumber,
  clasificacionDesvio: r.clasificacionDesvio,
  categoriaDesvio: r.categoriaDesvio,
  classification_original: r.classification_original,
  preserveOriginalClassification: r.preserveOriginalClassification,
  alcanceDesvio: r.alcanceDesvio,
  scope_original: r.scope_original,
  areaSector: r.areaSector,
  estadoAcciones: r.estadoAcciones,
  relacionIso22000: r.relacionIso22000,
  immediate_action: r.immediate_action,
  corrective_action: r.corrective_action,
  responsable: r.responsable,
  trace_clasif: r?.traceability?.clasificacion?.valor_original_excel,
  trace_tipo: r?.traceability?.tipo?.valor_original_excel
}));

const sourceCounts = { 'Calidad': 1, 'Calidad/Mantenimiento': 1 };
const outputCounts = rows.reduce((acc, r) => {
  const k = String(r.classification_original || '').trim();
  if (!k) return acc;
  acc[k] = (acc[k] || 0) + 1;
  return acc;
}, {});

console.log(JSON.stringify({ tmpFile, total: rows.length, rows: pick, sourceCounts, outputCounts }, null, 2));

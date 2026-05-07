import fs from 'node:fs/promises';
import path from 'node:path';
import { analyzeExcel } from './src/services/analyzeExcel.js';

const excelArg = process.argv[2];
if (!excelArg) {
  console.error('Uso: node backend/tmp_validate_critical_cases.mjs <archivo.xlsx>');
  process.exit(1);
}

const excelPath = path.resolve(excelArg);
const buffer = await fs.readFile(excelPath);
const result = await analyzeExcel(buffer, {});
if (!result?.success) throw new Error(result?.error || 'analyzeExcel failed');

const records = result.records || [];

const rules = [
  {
    id: 'inocuidad_fruta_riesgo',
    expected: 'Desvío de Inocuidad',
    test: (t) => /fruta|banana|manzana|pera|naranja/.test(t) && /(sin sanitizar|picad|pasad|oxidad|mal estado|deteriorad)/.test(t)
  },
  {
    id: 'logistica_no_envio',
    expected: 'Desvío de Logística',
    test: (t) => /(no se envi|no se envio|falt[oó] enviar|no sale|sale tarde|lleg[ao] tarde)/.test(t) && /(fruta|producto|refrigerio|vianda|pizza|limonada)/.test(t)
  },
  {
    id: 'logistica_falta_stock_mp',
    expected: 'Desvío de Logística',
    test: (t) => /(falta de materia prima|materia prima faltante|falta de stock|sin stock)/.test(t)
  },
  {
    id: 'inocuidad_mp_mal_estado',
    expected: 'Desvío de Inocuidad',
    test: (t) => /materia prima/.test(t) && /(mal estado|deteriorad|vencid|podrid)/.test(t)
  },
  {
    id: 'inocuidad_coccion',
    expected: 'Desvío de Inocuidad',
    test: (t) => /(coccion|cocci[oó]n|crudo|mal cocid|falta de cocci[oó]n|temperatura insuficiente)/.test(t)
  },
  {
    id: 'inocuidad_celiacos',
    expected: 'Desvío de Inocuidad',
    test: (t) => /(celiac|cel[ií]ac|sin tacc|dieta especial|alergen|al[eé]rgen)/.test(t)
  },
  {
    id: 'legal_documentacion_ingreso',
    expected: 'Desvío Legal',
    test: (t) => /(documentaci[oó]n|plataforma|habilitaci[oó]n|permiso|credencial|ingreso no autorizado|no pudo ingresar|seguro art|art vigente|certificado|libreta sanitaria)/.test(t)
  },
  {
    id: 'calidad_gramaje_peso_presentacion',
    expected: 'Desvío de Calidad',
    test: (t) => /(gramaje|peso|presentaci[oó]n|aspecto|dorado|organol[eé]ptic|quemad)/.test(t)
  }
];

function norm(t = '') {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const out = [];
for (const rule of rules) {
  const matched = records
    .map((r, idx) => {
      const text = norm([r.hallazgoDetectado, r.actividadRealizada, r.descripcion, r.observaciones, r.accionInmediata, r.accionCorrectiva].filter(Boolean).join(' | '));
      if (!rule.test(text)) return null;
      return {
        row: r.rawRowNumber ?? idx + 1,
        text: [r.hallazgoDetectado, r.actividadRealizada, r.descripcion, r.observaciones].filter(Boolean).join(' | '),
        actual: r.categoriaDesvio,
        expected: rule.expected,
        ok: r.categoriaDesvio === rule.expected
      };
    })
    .filter(Boolean);

  const sample = matched.slice(0, 6);
  out.push({
    rule: rule.id,
    expected: rule.expected,
    matches: matched.length,
    ok: matched.filter((m) => m.ok).length,
    fail: matched.filter((m) => !m.ok).length,
    sample
  });
}

console.log(JSON.stringify({
  excelPath,
  totalRecords: records.length,
  summary: result.summary,
  checks: out
}, null, 2));

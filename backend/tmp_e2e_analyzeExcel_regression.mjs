import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { analyzeExcel } from './src/services/analyzeExcel.js';

function stableStringify(value) {
  const seen = new WeakSet();
  const normalize = (v) => {
    if (v === null || typeof v !== 'object') return v;
    if (seen.has(v)) return '[Circular]';
    seen.add(v);
    if (Array.isArray(v)) return v.map(normalize);
    const out = {};
    Object.keys(v).sort().forEach((k) => {
      out[k] = normalize(v[k]);
    });
    return out;
  };
  return JSON.stringify(normalize(value), null, 2);
}

function collectDiffs(baseline, current, maxDiffs = 30) {
  const diffs = [];

  const visit = (a, b, path) => {
    if (diffs.length >= maxDiffs) return;

    const aIsObj = a !== null && typeof a === 'object';
    const bIsObj = b !== null && typeof b === 'object';

    if (!aIsObj || !bIsObj) {
      if (!Object.is(a, b)) {
        diffs.push({ path, baseline: a, actual: b });
      }
      return;
    }

    if (Array.isArray(a) || Array.isArray(b)) {
      const aArr = Array.isArray(a) ? a : [];
      const bArr = Array.isArray(b) ? b : [];
      const max = Math.max(aArr.length, bArr.length);
      for (let i = 0; i < max && diffs.length < maxDiffs; i += 1) {
        visit(aArr[i], bArr[i], `${path}[${i}]`);
      }
      return;
    }

    const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)])).sort();
    for (const key of keys) {
      if (diffs.length >= maxDiffs) break;
      const nextPath = path ? `${path}.${key}` : key;
      visit(a[key], b[key], nextPath);
    }
  };

  visit(baseline, current, '');
  return diffs;
}

function hasCriticalUndefined(record = {}) {
  const criticalFields = [
    'hallazgoDetectado',
    'areaClasificada',
    'resultadoClasificado',
    'tipoDesvio',
    'categoriaDesvio',
    'iso22000',
    'responsable',
    'estadoAccion'
  ];
  const missing = criticalFields.filter((field) => record[field] === undefined);
  return {
    hasMissing: missing.length > 0,
    missing
  };
}

async function main() {
  const excelPathArg = process.argv[2];
  const baselinePathArg = process.argv[3];

  if (!excelPathArg) {
    console.error('Uso: node backend/tmp_e2e_analyzeExcel_regression.mjs <archivo.xlsx> [baseline.json]');
    process.exit(1);
  }

  const excelPath = path.resolve(excelPathArg);
  const baselinePath = path.resolve(
    baselinePathArg || path.join('backend', 'tmp_e2e_analyzeExcel_baseline.json')
  );

  const buffer = await fs.readFile(excelPath);
  const result = await analyzeExcel(buffer, {});

  if (!result || result.success !== true) {
    throw new Error(`analyzeExcel no devolvio success=true. error=${result?.error || 'sin detalle'}`);
  }

  const records = Array.isArray(result.records) ? result.records : [];
  const cases = Array.isArray(result.cases) ? result.cases : [];
  const summary = result.summary || null;

  if (!summary || typeof summary !== 'object') {
    throw new Error('summary ausente o invalido');
  }

  const totalRegistros = Number(summary.totalRecords ?? summary.totalRegistros ?? NaN);
  if (!Number.isFinite(totalRegistros)) {
    throw new Error('summary.totalRecords (o equivalente) no es numerico');
  }

  if (records.length !== totalRegistros) {
    throw new Error(`records.length (${records.length}) != totalRegistros (${totalRegistros})`);
  }

  const undefinedCriticalRows = records
    .map((r, i) => {
      const check = hasCriticalUndefined(r);
      if (!check.hasMissing) return null;
      return {
        index: i,
        fecha: r?.fecha ?? null,
        hallazgo: r?.hallazgoDetectado ?? null,
        undefinedFields: check.missing,
        nearby: {
          resultado: r?.resultado ?? null,
          tipoDesvio: r?.tipoDesvio ?? null,
          categoriaDesvio: r?.categoriaDesvio ?? null,
          iso22000: r?.iso22000 ?? null,
          areaClasificada: r?.areaClasificada ?? null,
          responsable: r?.responsable ?? null,
          estadoAccion: r?.estadoAccion ?? null
        }
      };
    })
    .filter(Boolean);
  if (undefinedCriticalRows.length > 0) {
    throw new Error(`hay ${undefinedCriticalRows.length} records con campos criticos undefined :: ${JSON.stringify(undefinedCriticalRows)}`);
  }

  const payload = {
    records,
    cases,
    summary
  };

  const outputStable = stableStringify(payload);

  let compared = false;
  let matched = null;
  let diffPreview = [];

  try {
    const baselineRaw = await fs.readFile(baselinePath, 'utf8');
    compared = true;
    matched = baselineRaw === outputStable;
    if (!matched) {
      const baselineJson = JSON.parse(baselineRaw);
      const currentJson = JSON.parse(outputStable);
      diffPreview = collectDiffs(baselineJson, currentJson, 30);
    }
  } catch {
    compared = false;
  }

  if (!compared) {
    await fs.writeFile(baselinePath, outputStable, 'utf8');
  }

  console.log(JSON.stringify({
    ok: true,
    excelPath,
    baselinePath,
    records: records.length,
    cases: cases.length,
    totalRecordsSummary: totalRegistros,
    compared,
    matched,
    baselineCreated: !compared,
    diffCountShown: diffPreview.length,
    diffs: diffPreview
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});

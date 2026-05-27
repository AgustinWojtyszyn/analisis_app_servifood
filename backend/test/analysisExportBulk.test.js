import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { exportBulkAnalyses, __setSupabaseAdminForTests } from '../src/controllers/analysisController.js';

function createMockRes() {
  const headers = {};
  return {
    statusCode: 200,
    body: null,
    buffer: null,
    headers,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    setHeader(name, value) {
      headers[name] = value;
      return this;
    },
    send(payload) {
      this.buffer = payload;
      return this;
    }
  };
}

function createSupabaseMock({ analyses = [] } = {}) {
  const state = { analyses: analyses.map((row) => ({ ...row })) };

  function applyFilters(rows, filters = []) {
    return rows.filter((row) => filters.every((f) => {
      if (f.type === 'eq') return row[f.column] === f.value;
      if (f.type === 'in') return Array.isArray(f.values) && f.values.includes(row[f.column]);
      return true;
    }));
  }

  class Query {
    constructor(table) {
      this.table = table;
      this.filters = [];
      this.orderConfig = null;
    }

    select() { return this; }

    eq(column, value) {
      this.filters.push({ type: 'eq', column, value });
      return this;
    }

    in(column, values) {
      this.filters.push({ type: 'in', column, values });
      return this;
    }

    order(column, opts = {}) {
      this.orderConfig = { column, ascending: Boolean(opts.ascending) };
      return this;
    }

    then(resolve, reject) {
      try {
        let rows = applyFilters(state.analyses, this.filters).map((row) => ({ ...row }));
        if (this.orderConfig) {
          const { column, ascending } = this.orderConfig;
          rows = rows.sort((a, b) => {
            const av = a[column] || '';
            const bv = b[column] || '';
            if (av === bv) return 0;
            return ascending ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
          });
        }
        resolve({ data: rows, error: null });
      } catch (err) {
        if (reject) reject(err);
      }
    }
  }

  return {
    from(table) {
      return new Query(table);
    }
  };
}

async function readRows(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.getWorksheet('Analisis');
  const headerRow = sheet.getRow(1).values.slice(1).map((v) => String(v || '').trim());
  const values = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const cells = row.values.slice(1);
    if (!cells.length) return;
    const asObject = {};
    headerRow.forEach((header, index) => {
      asObject[header] = cells[index];
    });
    values.push(asObject);
  });
  return values;
}

function buildRecord({ desvio, iso, relacionIso, tipo = 'Externo', clasificacion = 'Calidad' }) {
  return {
    fecha: '2026-05-01',
    desvioDetectado: desvio,
    areaSector: 'Deposito',
    clasificacionDesvio: clasificacion,
    tipoDesvioOrigen: tipo,
    iso22000: iso,
    relacionIso22000: relacionIso,
    estadoAcciones: 'Cerrado',
    accionInmediata: 'Acción inmediata',
    accionCorrectiva: 'Acción correctiva'
  };
}

test('exportBulkAnalyses usa analysisId y no mezcla análisis con filename duplicado', async () => {
  __setSupabaseAdminForTests(createSupabaseMock({
    analyses: [
      {
        id: 'a-marzo',
        user_id: 'u1',
        filename: 'Analisis de desvios Mayo.xlsx',
        created_at: '2026-05-10T10:00:00.000Z',
        results: { records: [buildRecord({ desvio: 'manzanas chicas y verdes', iso: 'Revisar manualmente', relacionIso: '8.4 Control de procesos, productos o servicios provistos externamente' })] }
      },
      {
        id: 'a-mayo',
        user_id: 'u1',
        filename: 'Analisis de desvios Mayo.xlsx',
        created_at: '2026-05-11T10:00:00.000Z',
        results: { records: [buildRecord({ desvio: 'postres toda la semana', iso: '8.1', relacionIso: '8.1 Planificación y control operacional' })] }
      }
    ]
  }));

  const req = { user: { id: 'u1', role: 'admin', isAdmin: true }, body: { ids: ['a-marzo', 'a-mayo'] } };
  const res = createMockRes();
  await exportBulkAnalyses(req, res);

  assert.equal(res.statusCode, 200);
  const rows = await readRows(res.buffer);
  assert.equal(rows.length, 2);
  const desvios = rows.map((r) => String(r['Desvío detectado'] || ''));
  assert.ok(desvios.includes('manzanas chicas y verdes'));
  assert.ok(desvios.includes('postres toda la semana'));
});

test('exportBulkAnalyses prioriza relacionIso22000 sobre iso22000 en la exportación', async () => {
  __setSupabaseAdminForTests(createSupabaseMock({
    analyses: [
      {
        id: 'a1',
        user_id: 'u1',
        filename: 'ADIUM MAYO.xlsx',
        created_at: '2026-05-10T10:00:00.000Z',
        results: { records: [buildRecord({ desvio: 'caso proveedor', iso: 'Revisar manualmente', relacionIso: '8.4 Control de procesos, productos o servicios provistos externamente' })] }
      }
    ]
  }));

  const req = { user: { id: 'u1', role: 'admin', isAdmin: true }, body: { ids: ['a1'] } };
  const res = createMockRes();
  await exportBulkAnalyses(req, res);

  assert.equal(res.statusCode, 200);
  const rows = await readRows(res.buffer);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]['Relación ISO 22000'], '8.4 Control de procesos, productos o servicios provistos externamente');
});

test('exportBulkAnalyses de usuario no admin no exporta análisis ajenos', async () => {
  __setSupabaseAdminForTests(createSupabaseMock({
    analyses: [
      {
        id: 'own-1',
        user_id: 'u1',
        filename: 'ADIUM MAYO.xlsx',
        created_at: '2026-05-10T10:00:00.000Z',
        results: { records: [buildRecord({ desvio: 'propio', iso: '8.5 HACCP', relacionIso: '8.5 HACCP' })] }
      },
      {
        id: 'other-1',
        user_id: 'u2',
        filename: 'ADIUM MAYO.xlsx',
        created_at: '2026-05-10T11:00:00.000Z',
        results: { records: [buildRecord({ desvio: 'ajeno', iso: '8.5.1 Control operacional', relacionIso: '8.5.1 Control operacional' })] }
      }
    ]
  }));

  const req = { user: { id: 'u1', role: 'user', isAdmin: false }, body: { ids: ['own-1', 'other-1'] } };
  const res = createMockRes();
  await exportBulkAnalyses(req, res);

  assert.equal(res.statusCode, 200);
  const rows = await readRows(res.buffer);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]['Desvío detectado'], 'propio');
});

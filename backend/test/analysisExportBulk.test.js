import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { exportBulkAnalyses, __setSupabaseAdminForTests } from '../src/controllers/analysisController.js';
import { buildBulkExportWorkbook } from '../src/services/analysis/analysisExportService.js';

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

async function readWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
}

function buildRecord({
  desvio,
  iso,
  relacionIso,
  tipo = 'Externo',
  clasificacion = 'Calidad',
  fecha = '2026-05-01',
  area = 'Deposito',
  estado = 'Cerrado',
  inmediata = 'Acción inmediata',
  correctiva = 'Acción correctiva'
}) {
  return {
    fecha,
    desvioDetectado: desvio,
    areaSector: area,
    clasificacionDesvio: clasificacion,
    tipoDesvioOrigen: tipo,
    iso22000: iso,
    relacionIso22000: relacionIso,
    estadoAcciones: estado,
    accionInmediata: inmediata,
    accionCorrectiva: correctiva
  };
}

function assertBulkExportResponse(res) {
  assert.equal(res.statusCode, 200);
  assert.equal(
    res.headers['Content-Type'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  assert.match(
    res.headers['Content-Disposition'],
    /^attachment; filename="analisis_bulk_\d+\.xlsx"$/
  );
  assert.ok(Buffer.isBuffer(res.buffer));
  assert.ok(res.buffer.length > 0);
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

  assertBulkExportResponse(res);
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

  assertBulkExportResponse(res);
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

  assertBulkExportResponse(res);
  const rows = await readRows(res.buffer);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]['Desvío detectado'], 'propio');
});

test('exportBulkAnalyses normaliza código 8.7 a etiqueta completa', async () => {
  __setSupabaseAdminForTests(createSupabaseMock({
    analyses: [
      {
        id: 'a-87',
        user_id: 'u1',
        filename: 'Compras mayo.xlsx',
        created_at: '2026-05-12T10:00:00.000Z',
        results: { records: [buildRecord({ desvio: 'Faltan Platinas para trabajar', iso: '8.7', relacionIso: '8.7' })] }
      }
    ]
  }));

  const req = { user: { id: 'u1', role: 'admin', isAdmin: true }, body: { ids: ['a-87'] } };
  const res = createMockRes();
  await exportBulkAnalyses(req, res);

  assertBulkExportResponse(res);
  const rows = await readRows(res.buffer);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]['Relación ISO 22000'], '8.7 Control de las salidas no conformes');
});

test('exportBulkAnalyses mantiene hoja, encabezados y orden de columnas', async () => {
  __setSupabaseAdminForTests(createSupabaseMock({
    analyses: [
      {
        id: 'headers-1',
        user_id: 'u1',
        filename: 'Headers.xlsx',
        created_at: '2026-05-12T10:00:00.000Z',
        results: { records: [buildRecord({ desvio: 'Desvío con encabezados', iso: '8.5.1', relacionIso: '8.5.1' })] }
      }
    ]
  }));

  const req = { user: { id: 'u1', role: 'admin', isAdmin: true }, body: { ids: ['headers-1'] } };
  const res = createMockRes();
  await exportBulkAnalyses(req, res);

  assertBulkExportResponse(res);
  const workbook = await readWorkbook(res.buffer);
  const sheet = workbook.getWorksheet('Analisis');
  assert.ok(sheet, 'Debe existir la hoja Analisis');
  assert.deepEqual(sheet.getRow(1).values.slice(1), [
    'analysisId',
    'filename',
    'processedAt',
    'Fecha',
    'Área/Sector',
    'Desvío detectado',
    'Clasificación del desvío',
    'Tipo de desvío',
    'Relación ISO 22000',
    'Estado de acciones',
    'Acción inmediata',
    'Acción correctiva'
  ]);
});

test('exportBulkAnalyses con cero registros genera workbook válido sin filas de datos', async () => {
  __setSupabaseAdminForTests(createSupabaseMock({
    analyses: [
      {
        id: 'empty-1',
        user_id: 'u1',
        filename: 'Sin registros.xlsx',
        created_at: '2026-05-12T10:00:00.000Z',
        results: { records: [] }
      }
    ]
  }));

  const req = { user: { id: 'u1', role: 'admin', isAdmin: true }, body: { ids: ['empty-1'] } };
  const res = createMockRes();
  await exportBulkAnalyses(req, res);

  assertBulkExportResponse(res);
  const workbook = await readWorkbook(res.buffer);
  const sheet = workbook.getWorksheet('Analisis');
  assert.ok(sheet);
  assert.equal(sheet.actualRowCount, 0);
});

test('exportBulkAnalyses conserva caracteres especiales y valores vacíos', async () => {
  __setSupabaseAdminForTests(createSupabaseMock({
    analyses: [
      {
        id: 'chars-1',
        user_id: 'u1',
        filename: 'Caracteres.xlsx',
        created_at: '2026-05-12T10:00:00.000Z',
        results: {
          records: [
            buildRecord({
              desvio: 'Ñandú, café y símbolo % / cliente “A”',
              iso: '',
              relacionIso: '',
              area: '',
              estado: '',
              inmediata: '',
              correctiva: null
            })
          ]
        }
      }
    ]
  }));

  const req = { user: { id: 'u1', role: 'admin', isAdmin: true }, body: { ids: ['chars-1'] } };
  const res = createMockRes();
  await exportBulkAnalyses(req, res);

  assertBulkExportResponse(res);
  const rows = await readRows(res.buffer);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]['Desvío detectado'], 'Ñandú, café y símbolo % / cliente “A”');
  assert.equal(rows[0]['Área/Sector'], '');
  assert.equal(rows[0]['Acción inmediata'], '');
  assert.equal(rows[0]['Acción correctiva'], '');
});

test('exportBulkAnalyses conserva fecha y números según normalización actual', async () => {
  __setSupabaseAdminForTests(createSupabaseMock({
    analyses: [
      {
        id: 'types-1',
        user_id: 'u1',
        filename: 'Tipos.xlsx',
        created_at: '2026-05-12T10:00:00.000Z',
        results: {
          records: [
            buildRecord({
              fecha: 45678,
              desvio: 12345,
              iso: '8.5.1',
              relacionIso: '8.5.1'
            })
          ]
        }
      }
    ]
  }));

  const req = { user: { id: 'u1', role: 'admin', isAdmin: true }, body: { ids: ['types-1'] } };
  const res = createMockRes();
  await exportBulkAnalyses(req, res);

  assertBulkExportResponse(res);
  const rows = await readRows(res.buffer);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].Fecha, '45678');
  assert.equal(rows[0]['Desvío detectado'], '12345');
});

test('exportBulkAnalyses genera archivo grande representativo', async () => {
  const records = Array.from({ length: 750 }, (_, index) => buildRecord({
    fecha: `2026-05-${String((index % 28) + 1).padStart(2, '0')}`,
    desvio: `Desvío representativo ${index + 1}`,
    iso: '8.5.1',
    relacionIso: '8.5.1'
  }));
  __setSupabaseAdminForTests(createSupabaseMock({
    analyses: [
      {
        id: 'large-1',
        user_id: 'u1',
        filename: 'Grande.xlsx',
        created_at: '2026-05-12T10:00:00.000Z',
        results: { records }
      }
    ]
  }));

  const req = { user: { id: 'u1', role: 'admin', isAdmin: true }, body: { ids: ['large-1'] } };
  const res = createMockRes();
  const started = Date.now();
  await exportBulkAnalyses(req, res);
  const elapsedMs = Date.now() - started;

  assertBulkExportResponse(res);
  assert.ok(res.buffer.length > 10000);
  assert.ok(elapsedMs < 10000, `Exportación demasiado lenta: ${elapsedMs}ms`);
  const rows = await readRows(res.buffer);
  assert.equal(rows.length, 750);
});

test('buildBulkExportWorkbook genera workbook reutilizable con ExcelJS', async () => {
  const buffer = await buildBulkExportWorkbook([
    {
      id: 'svc-1',
      user_id: 'u1',
      filename: 'Servicio.xlsx',
      created_at: '2026-05-12T10:00:00.000Z',
      results: { records: [buildRecord({ desvio: 'Export desde servicio', iso: '8.5.1', relacionIso: '8.5.1' })] }
    }
  ]);

  assert.ok(Buffer.isBuffer(buffer));
  const workbook = await readWorkbook(buffer);
  assert.ok(workbook.getWorksheet('Analisis'));
  const rows = await readRows(buffer);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]['Desvío detectado'], 'Export desde servicio');
});

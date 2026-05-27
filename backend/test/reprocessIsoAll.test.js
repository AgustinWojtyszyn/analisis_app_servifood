import test from 'node:test';
import assert from 'node:assert/strict';
import { reprocessIsoAll, __setSupabaseAdminForTests } from '../src/controllers/analysisController.js';

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

function createSupabaseMock({ records = [] } = {}) {
  const state = { records: records.map((row) => ({ ...row })) };

  function applyFilters(row, filters = []) {
    return filters.every((f) => {
      if (f.type === 'eq') return row[f.column] === f.value;
      return true;
    });
  }

  class Query {
    constructor(table) {
      this.table = table;
      this.filters = [];
      this.operation = 'select';
      this.payload = null;
      this.sort = null;
    }

    select() {
      this.operation = 'select';
      return this;
    }

    eq(column, value) {
      this.filters.push({ type: 'eq', column, value });
      return this;
    }

    order(column, { ascending } = {}) {
      this.sort = { column, ascending: Boolean(ascending) };
      return this;
    }

    update(payload) {
      this.operation = 'update';
      this.payload = payload || {};
      return this;
    }

    then(resolve, reject) {
      try {
        if (this.table !== 'analysis_history') {
          resolve({ data: [], error: null });
          return;
        }

        if (this.operation === 'select') {
          let rows = state.records.filter((row) => applyFilters(row, this.filters)).map((row) => ({ ...row }));
          if (this.sort) {
            const { column, ascending } = this.sort;
            rows = rows.sort((a, b) => {
              const av = a?.[column] || '';
              const bv = b?.[column] || '';
              if (av === bv) return 0;
              if (ascending) return av > bv ? 1 : -1;
              return av < bv ? 1 : -1;
            });
          }
          resolve({ data: rows, error: null });
          return;
        }

        if (this.operation === 'update') {
          const targets = state.records.filter((row) => applyFilters(row, this.filters));
          targets.forEach((row) => {
            Object.assign(row, this.payload);
          });
          resolve({ data: targets.map((row) => ({ ...row })), error: null });
          return;
        }

        resolve({ data: [], error: null });
      } catch (err) {
        if (reject) reject(err);
      }
    }
  }

  return {
    state,
    from(table) {
      return new Query(table);
    }
  };
}

function buildAnalysisRecord({ id, userId, text, iso = 'Revisar manualmente', keepField = 'keep' }) {
  return {
    id,
    user_id: userId,
    created_at: new Date().toISOString(),
    results: {
      summary: {
        totalRevisionManual: 1,
        processedAt: '2026-01-01T10:00:00.000Z'
      },
      records: [
        {
          fecha: '2026-01-01',
          hallazgoDetectado: text,
          areaSector: 'Cocina',
          clasificacionDesvio: 'Desvío de Calidad',
          tipoDesvio: 'NC',
          estadoAcciones: 'abierto',
          accionInmediata: 'accion in',
          accionCorrectiva: 'accion cor',
          iso22000: iso,
          relacionIso22000: iso,
          keepField
        }
      ]
    }
  };
}

test('reprocessIsoAll reprocesa múltiples análisis del usuario y devuelve resumen correcto', async () => {
  const mock = createSupabaseMock({
    records: [
      buildAnalysisRecord({
        id: 'a1',
        userId: 'u1',
        text: 'adium reclama que la carne del menu estaba rigida y dura'
      }),
      buildAnalysisRecord({
        id: 'a2',
        userId: 'u1',
        text: 'Refrigerio de Adium Salio tarde'
      }),
      buildAnalysisRecord({
        id: 'b1',
        userId: 'u2',
        text: 'Reclamo de adium porque se les envió queso y dulce y ensalada de frutas como postre toda la semana'
      })
    ]
  });
  __setSupabaseAdminForTests(mock);

  const req = { user: { id: 'u1' } };
  const res = createMockRes();

  await reprocessIsoAll(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.success, true);
  assert.equal(res.body?.analysesProcessed, 2);
  assert.equal(res.body?.recordsProcessed, 2);
  assert.equal(res.body?.manualBefore, 2);
  assert.equal(res.body?.manualAfter, 0);
  assert.equal(res.body?.updatedAnalyses, 2);

  const a1 = mock.state.records.find((row) => row.id === 'a1');
  const a2 = mock.state.records.find((row) => row.id === 'a2');
  const b1 = mock.state.records.find((row) => row.id === 'b1');

  assert.equal(a1.results.records[0].relacionIso22000, '8.5.1 Control operacional');
  assert.equal(a2.results.records[0].relacionIso22000, '8.1 Planificación y control operacional');

  assert.equal(a1.results.summary.totalRevisionManual, 0);
  assert.equal(a2.results.summary.totalRevisionManual, 0);

  assert.equal(a1.results.reprocessedWithCurrentIsoRules, true);
  assert.ok(a1.results.isoReprocessedAt);

  // No toca análisis de otros usuarios.
  assert.equal(b1.results.records[0].relacionIso22000, 'Revisar manualmente');
});

test('reprocessIsoAll no modifica campos originales del registro', async () => {
  const mock = createSupabaseMock({
    records: [
      buildAnalysisRecord({
        id: 'a1',
        userId: 'u1',
        text: 'Reclamo de adium porque se les envió queso y dulce y ensalada de frutas como postre toda la semana',
        keepField: 'no_tocar'
      })
    ]
  });
  __setSupabaseAdminForTests(mock);

  const before = { ...mock.state.records[0].results.records[0] };

  const req = { user: { id: 'u1' } };
  const res = createMockRes();
  await reprocessIsoAll(req, res);

  const after = mock.state.records[0].results.records[0];
  assert.equal(after.fecha, before.fecha);
  assert.equal(after.hallazgoDetectado, before.hallazgoDetectado);
  assert.equal(after.areaSector, before.areaSector);
  assert.equal(after.clasificacionDesvio, before.clasificacionDesvio);
  assert.equal(after.tipoDesvio, before.tipoDesvio);
  assert.equal(after.estadoAcciones, before.estadoAcciones);
  assert.equal(after.accionInmediata, before.accionInmediata);
  assert.equal(after.accionCorrectiva, before.accionCorrectiva);
  assert.equal(after.keepField, 'no_tocar');
  assert.equal(after.relacionIso22000, '8.1 Planificación y control operacional');
});

test('reprocessIsoAll responde éxito cuando no hay análisis', async () => {
  const mock = createSupabaseMock({ records: [] });
  __setSupabaseAdminForTests(mock);

  const req = { user: { id: 'u1' } };
  const res = createMockRes();
  await reprocessIsoAll(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.success, true);
  assert.equal(res.body?.analysesProcessed, 0);
  assert.equal(res.body?.recordsProcessed, 0);
  assert.equal(res.body?.manualBefore, 0);
  assert.equal(res.body?.manualAfter, 0);
  assert.equal(res.body?.updatedAnalyses, 0);
});

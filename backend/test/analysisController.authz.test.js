import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAnalysis,
  archiveAnalysis,
  deleteAnalysisBulk,
  deleteAllAnalyses,
  __setSupabaseAdminForTests
} from '../src/controllers/analysisController.js';

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

function createSupabaseMock({ records = [], deleteError = null, beforeDelete = null } = {}) {
  const state = { records: [...records], beforeDeleteCalled: false };

  function applyFilters(row, filters = []) {
    return filters.every((f) => {
      if (f.type === 'eq') return row[f.column] === f.value;
      if (f.type === 'in') return Array.isArray(f.values) && f.values.includes(row[f.column]);
      return true;
    });
  }

  class Query {
    constructor(table) {
      this.table = table;
      this.filters = [];
      this.operation = 'select';
      this.updatePayload = null;
      this.selectColumns = '*';
    }

    select(columns = '*') {
      this.selectColumns = columns;
      return this;
    }

    eq(column, value) {
      this.filters.push({ type: 'eq', column, value });
      return this;
    }

    in(column, values) {
      this.filters.push({ type: 'in', column, values });
      return this;
    }

    update(payload) {
      this.operation = 'update';
      this.updatePayload = payload || {};
      return this;
    }

    delete() {
      this.operation = 'delete';
      return this;
    }

    async single() {
      const rows = state.records.filter((row) => applyFilters(row, this.filters));
      if (this.operation === 'select') {
        if (!rows.length) return { data: null, error: { code: 'PGRST116', message: 'not found' } };
        return { data: { ...rows[0] }, error: null };
      }

      if (this.operation === 'update') {
        if (!rows.length) return { data: null, error: { code: 'PGRST116', message: 'not found' } };
        const target = rows[0];
        Object.assign(target, this.updatePayload);
        return { data: { ...target }, error: null };
      }

      return { data: null, error: null };
    }

    then(resolve, reject) {
      try {
        if (this.operation === 'select') {
          const rows = state.records.filter((row) => applyFilters(row, this.filters));
          const data = this.selectColumns === 'id, user_id'
            ? rows.map((r) => ({ id: r.id, user_id: r.user_id }))
            : rows.map((r) => ({ ...r }));
          resolve({ data, error: null });
          return;
        }
        if (this.operation === 'delete') {
          if (typeof beforeDelete === 'function' && !state.beforeDeleteCalled) {
            state.beforeDeleteCalled = true;
            beforeDelete(state.records);
          }
          if (deleteError) {
            resolve({ data: null, error: deleteError });
            return;
          }
          const toDelete = state.records.filter((row) => applyFilters(row, this.filters));
          state.records = state.records.filter((row) => !applyFilters(row, this.filters));
          const data = this.selectColumns === 'id'
            ? toDelete.map((r) => ({ id: r.id }))
            : toDelete.map((r) => ({ ...r }));
          resolve({ data, error: null });
          return;
        }
        resolve({ data: [], error: null });
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

test('archiveAnalysis no archiva análisis de otro usuario', async () => {
  const supabase = createSupabaseMock({
    records: [
      { id: 'a1', user_id: 'owner-1', status: 'active', results: {} }
    ]
  });
  __setSupabaseAdminForTests(supabase);

  const req = { params: { id: 'a1' }, user: { id: 'owner-2' } };
  const res = createMockRes();

  await archiveAnalysis(req, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body?.error, 'Análisis no encontrado');
});

test('getAnalysis no devuelve análisis de otro usuario cuando no es admin', async () => {
  const supabase = createSupabaseMock({
    records: [
      { id: 'a1', user_id: 'owner-1', status: 'active', results: {} }
    ]
  });
  __setSupabaseAdminForTests(supabase);

  const req = { params: { id: 'a1' }, user: { id: 'owner-2', role: 'user', isAdmin: false } };
  const res = createMockRes();

  await getAnalysis(req, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body?.error, 'Análisis no encontrado');
});

test('archiveAnalysis archiva solo análisis propio', async () => {
  const supabase = createSupabaseMock({
    records: [
      { id: 'a1', user_id: 'owner-1', status: 'active', results: {} }
    ]
  });
  __setSupabaseAdminForTests(supabase);

  const req = { params: { id: 'a1' }, user: { id: 'owner-1' } };
  const res = createMockRes();

  await archiveAnalysis(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.success, true);
  assert.equal(res.body?.data?.status, 'archived');
});

test('deleteAnalysisBulk admin elimina análisis propio', async () => {
  const supabase = createSupabaseMock({
    records: [
      { id: 'a1', user_id: 'admin-1', status: 'active', results: {} }
    ]
  });
  __setSupabaseAdminForTests(supabase);

  const req = { body: { ids: ['a1'] }, user: { id: 'admin-1', role: 'admin', isAdmin: true } };
  const res = createMockRes();

  await deleteAnalysisBulk(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.success, true);
  assert.equal(res.body?.deletedCount, 1);
  assert.deepEqual(res.body?.deletedIds, ['a1']);
});

test('deleteAnalysisBulk admin elimina análisis de otro usuario', async () => {
  const supabase = createSupabaseMock({
    records: [
      { id: 'b1', user_id: 'owner-2', status: 'active', results: {} }
    ]
  });
  __setSupabaseAdminForTests(supabase);

  const req = { body: { ids: ['b1'] }, user: { id: 'admin-1', role: 'admin', isAdmin: true } };
  const res = createMockRes();

  await deleteAnalysisBulk(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.deletedCount, 1);
  assert.deepEqual(res.body?.deletedIds, ['b1']);
});

test('deleteAnalysisBulk usuario común elimina análisis propio', async () => {
  const supabase = createSupabaseMock({
    records: [
      { id: 'a1', user_id: 'u1', status: 'active', results: {} }
    ]
  });
  __setSupabaseAdminForTests(supabase);

  const req = { body: { ids: ['a1'] }, user: { id: 'u1', role: 'user', isAdmin: false } };
  const res = createMockRes();

  await deleteAnalysisBulk(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.deletedCount, 1);
  assert.equal(res.body?.unauthorizedCount, 0);
});

test('deleteAnalysisBulk usuario común no elimina análisis ajeno', async () => {
  const supabase = createSupabaseMock({
    records: [
      { id: 'b1', user_id: 'u2', status: 'active', results: {} }
    ]
  });
  __setSupabaseAdminForTests(supabase);

  const req = { body: { ids: ['b1'] }, user: { id: 'u1', role: 'user', isAdmin: false } };
  const res = createMockRes();

  await deleteAnalysisBulk(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.success, true);
  assert.equal(res.body?.deletedCount, 0);
  assert.equal(res.body?.unauthorizedCount, 1);
  assert.equal(res.body?.unauthorizedIds, undefined);
});

test('deleteAnalysisBulk lote mixto de usuario común elimina propios y reporta ajenos', async () => {
  const supabase = createSupabaseMock({
    records: [
      { id: 'a1', user_id: 'u1', status: 'active', results: {} },
      { id: 'a2', user_id: 'u1', status: 'active', results: {} },
      { id: 'b1', user_id: 'u2', status: 'active', results: {} }
    ]
  });
  __setSupabaseAdminForTests(supabase);

  const req = { body: { ids: ['a1', 'a2', 'b1'] }, user: { id: 'u1', role: 'user', isAdmin: false } };
  const res = createMockRes();

  await deleteAnalysisBulk(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.deletedCount, 2);
  assert.equal(res.body?.unauthorizedCount, 1);
  assert.deepEqual(res.body?.deletedIds.sort(), ['a1', 'a2']);
});

test('deleteAnalysisBulk reporta ids inexistentes', async () => {
  const supabase = createSupabaseMock({
    records: [
      { id: 'a1', user_id: 'u1', status: 'active', results: {} }
    ]
  });
  __setSupabaseAdminForTests(supabase);

  const req = { body: { ids: ['a1', 'missing'] }, user: { id: 'u1', role: 'user', isAdmin: false } };
  const res = createMockRes();

  await deleteAnalysisBulk(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.deletedCount, 1);
  assert.deepEqual(res.body?.nonexistentIds, ['missing']);
});

test('deleteAnalysisBulk rechaza lista vacía o payload inválido', async () => {
  const supabase = createSupabaseMock({ records: [] });
  __setSupabaseAdminForTests(supabase);

  const invalidPayloads = [{ ids: [] }, { ids: null }, {}];
  for (const body of invalidPayloads) {
    const req = { body, user: { id: 'u1', role: 'admin', isAdmin: true } };
    const res = createMockRes();
    await deleteAnalysisBulk(req, res);
    assert.equal(res.statusCode, 400);
  }
});

test('deleteAnalysisBulk deduplica ids duplicados sin doble conteo', async () => {
  const supabase = createSupabaseMock({
    records: [
      { id: 'a1', user_id: 'u1', status: 'active', results: {} }
    ]
  });
  __setSupabaseAdminForTests(supabase);

  const req = { body: { ids: ['a1', 'a1'] }, user: { id: 'u1', role: 'admin', isAdmin: true } };
  const res = createMockRes();

  await deleteAnalysisBulk(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.requestedCount, 2);
  assert.deepEqual(res.body?.requestedIds, ['a1']);
  assert.deepEqual(res.body?.duplicateIds, ['a1']);
  assert.equal(res.body?.deletedCount, 1);
});

test('deleteAnalysisBulk mantiene contrato compatible para frontend', async () => {
  const supabase = createSupabaseMock({
    records: [
      { id: 'a1', user_id: 'u1', status: 'active', results: {} }
    ]
  });
  __setSupabaseAdminForTests(supabase);

  const req = { body: { ids: ['a1'] }, user: { id: 'u1', role: 'admin', isAdmin: true } };
  const res = createMockRes();

  await deleteAnalysisBulk(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.success, true);
  assert.equal(typeof res.body?.deletedCount, 'number');
  assert.ok(Array.isArray(res.body?.requestedIds));
  assert.ok(Array.isArray(res.body?.deletedIds));
  assert.ok(Array.isArray(res.body?.nonexistentIds));
  assert.ok(Array.isArray(res.body?.failedIds));
});

test('deleteAllAnalyses admin elimina todos los análisis finalizados', async () => {
  const supabase = createSupabaseMock({
    records: [
      { id: 'a1', user_id: 'u1', status: 'exported', results: {} },
      { id: 'a2', user_id: 'u2', status: 'archived', results: {} }
    ]
  });
  __setSupabaseAdminForTests(supabase);

  const req = { body: { confirmText: 'BORRAR' }, user: { id: 'admin', role: 'admin', isAdmin: true } };
  const res = createMockRes();

  await deleteAllAnalyses(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.deletedCount, 2);
  assert.deepEqual(res.body?.deletedIds.sort(), ['a1', 'a2']);
  assert.equal(supabase.from('analysis_history') instanceof Object, true);
});

test('deleteAllAnalyses no elimina análisis en procesamiento/active', async () => {
  const supabase = createSupabaseMock({
    records: [
      { id: 'a1', user_id: 'u1', status: 'active', results: {} }
    ]
  });
  __setSupabaseAdminForTests(supabase);

  const req = { body: { confirmText: 'BORRAR' }, user: { id: 'admin', role: 'admin', isAdmin: true } };
  const res = createMockRes();

  await deleteAllAnalyses(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.deletedCount, 0);
  assert.equal(res.body?.skippedActiveCount, 1);
  assert.deepEqual(res.body?.skippedActiveIds, ['a1']);
});

test('deleteAllAnalyses lote con finalizados y activos borra solo finalizados', async () => {
  const supabase = createSupabaseMock({
    records: [
      { id: 'a1', user_id: 'u1', status: 'exported', results: {} },
      { id: 'a2', user_id: 'u1', status: 'active', results: {} },
      { id: 'a3', user_id: 'u1', status: 'archived', results: {} }
    ]
  });
  __setSupabaseAdminForTests(supabase);

  const req = { body: { confirmText: 'BORRAR' }, user: { id: 'admin', role: 'admin', isAdmin: true } };
  const res = createMockRes();

  await deleteAllAnalyses(req, res);

  assert.equal(res.body?.deletedCount, 2);
  assert.equal(res.body?.skippedActiveCount, 1);
  assert.deepEqual(res.body?.skippedActiveIds, ['a2']);
});

test('deleteAllAnalyses respeta filtro opcional por userId', async () => {
  const supabase = createSupabaseMock({
    records: [
      { id: 'a1', user_id: 'u1', status: 'exported', results: {} },
      { id: 'b1', user_id: 'u2', status: 'exported', results: {} }
    ]
  });
  __setSupabaseAdminForTests(supabase);

  const req = { body: { confirmText: 'BORRAR', userId: 'u1' }, user: { id: 'admin', role: 'admin', isAdmin: true } };
  const res = createMockRes();

  await deleteAllAnalyses(req, res);

  assert.equal(res.body?.deletedCount, 1);
  assert.deepEqual(res.body?.deletedIds, ['a1']);
  assert.equal(res.body?.userId, 'u1');
});

test('deleteAllAnalyses usuario no admin recibe 403', async () => {
  const supabase = createSupabaseMock({
    records: [
      { id: 'a1', user_id: 'u1', status: 'exported', results: {} }
    ]
  });
  __setSupabaseAdminForTests(supabase);

  const req = { body: { confirmText: 'BORRAR' }, user: { id: 'u1', role: 'user', isAdmin: false } };
  const res = createMockRes();

  await deleteAllAnalyses(req, res);

  assert.equal(res.statusCode, 403);
});

test('deleteAllAnalyses rechaza payload inválido', async () => {
  const supabase = createSupabaseMock({ records: [] });
  __setSupabaseAdminForTests(supabase);

  const req = { body: { confirmText: 'NO' }, user: { id: 'admin', role: 'admin', isAdmin: true } };
  const res = createMockRes();

  await deleteAllAnalyses(req, res);

  assert.equal(res.statusCode, 400);
});

test('deleteAllAnalyses responde éxito cuando no hay análisis eliminables', async () => {
  const supabase = createSupabaseMock({
    records: [
      { id: 'a1', user_id: 'u1', status: 'active', results: {} }
    ]
  });
  __setSupabaseAdminForTests(supabase);

  const req = { body: { confirmText: 'BORRAR' }, user: { id: 'admin', role: 'admin', isAdmin: true } };
  const res = createMockRes();

  await deleteAllAnalyses(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.candidatesCount, 0);
  assert.equal(res.body?.deletedCount, 0);
  assert.equal(res.body?.warning, 'partial_delete');
});

test('deleteAllAnalyses omite análisis que cambia a active antes del borrado', async () => {
  const supabase = createSupabaseMock({
    records: [
      { id: 'a1', user_id: 'u1', status: 'exported', results: {} }
    ],
    beforeDelete(records) {
      records[0].status = 'active';
    }
  });
  __setSupabaseAdminForTests(supabase);

  const req = { body: { confirmText: 'BORRAR' }, user: { id: 'admin', role: 'admin', isAdmin: true } };
  const res = createMockRes();

  await deleteAllAnalyses(req, res);

  assert.equal(res.body?.deletedCount, 0);
  assert.equal(res.body?.skippedActiveCount, 1);
  assert.deepEqual(res.body?.skippedActiveIds, ['a1']);
});

test('deleteAllAnalyses reporta error parcial de base de datos', async () => {
  const supabase = createSupabaseMock({
    records: [
      { id: 'a1', user_id: 'u1', status: 'exported', results: {} }
    ],
    deleteError: { message: 'delete failed' }
  });
  __setSupabaseAdminForTests(supabase);

  const req = { body: { confirmText: 'BORRAR' }, user: { id: 'admin', role: 'admin', isAdmin: true } };
  const res = createMockRes();

  await deleteAllAnalyses(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.deletedCount, 0);
  assert.equal(res.body?.failedCount, 1);
  assert.deepEqual(res.body?.failedIds, ['a1']);
  assert.equal(res.body?.errors[0]?.message, 'delete failed');
});

test('deleteAllAnalyses mantiene contrato compatible', async () => {
  const supabase = createSupabaseMock({
    records: [
      { id: 'a1', user_id: 'u1', status: 'archived', results: {} }
    ]
  });
  __setSupabaseAdminForTests(supabase);

  const req = { body: { confirmText: 'BORRAR' }, user: { id: 'admin', role: 'admin', isAdmin: true } };
  const res = createMockRes();

  await deleteAllAnalyses(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.success, true);
  assert.equal(typeof res.body?.deletedCount, 'number');
  assert.ok(Array.isArray(res.body?.deletedIds));
  assert.ok(Array.isArray(res.body?.skippedActiveIds));
  assert.ok(Array.isArray(res.body?.failedIds));
  assert.ok(Array.isArray(res.body?.errors));
});

test('deleteAllAnalyses no elimina análisis fuera del filtro solicitado', async () => {
  const supabase = createSupabaseMock({
    records: [
      { id: 'a1', user_id: 'u1', status: 'archived', results: {} },
      { id: 'b1', user_id: 'u2', status: 'archived', results: {} }
    ]
  });
  __setSupabaseAdminForTests(supabase);

  const req = { body: { confirmText: 'BORRAR', userId: 'u2' }, user: { id: 'admin', role: 'admin', isAdmin: true } };
  const res = createMockRes();

  await deleteAllAnalyses(req, res);

  assert.deepEqual(res.body?.deletedIds, ['b1']);
});

test('deleteAllAnalyses solicitudes concurrentes no producen doble conteo ni error crítico', async () => {
  const supabase = createSupabaseMock({
    records: [
      { id: 'a1', user_id: 'u1', status: 'archived', results: {} }
    ]
  });
  __setSupabaseAdminForTests(supabase);

  const req = { body: { confirmText: 'BORRAR' }, user: { id: 'admin', role: 'admin', isAdmin: true } };
  const first = createMockRes();
  const second = createMockRes();

  await deleteAllAnalyses(req, first);
  await deleteAllAnalyses(req, second);

  assert.equal(first.body?.deletedCount, 1);
  assert.equal(second.statusCode, 200);
  assert.equal(second.body?.deletedCount, 0);
});

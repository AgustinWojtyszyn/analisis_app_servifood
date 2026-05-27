import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAnalysis,
  archiveAnalysis,
  deleteAnalysisBulk,
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

function createSupabaseMock({ records = [] } = {}) {
  const state = { records: [...records] };

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
        if (this.operation === 'delete') {
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

test('deleteAnalysisBulk no cuenta ids inexistentes o ajenos', async () => {
  const supabase = createSupabaseMock({
    records: [
      { id: 'a1', user_id: 'u1', status: 'active', results: {} },
      { id: 'a2', user_id: 'u1', status: 'active', results: {} },
      { id: 'b1', user_id: 'u2', status: 'active', results: {} }
    ]
  });
  __setSupabaseAdminForTests(supabase);

  const req = { body: { ids: ['a1', 'b1', 'missing'] }, user: { id: 'u1' } };
  const res = createMockRes();

  await deleteAnalysisBulk(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.success, true);
  assert.equal(res.body?.deletedCount, 1);
});

test('deleteAnalysisBulk solo elimina análisis del usuario autenticado', async () => {
  const supabase = createSupabaseMock({
    records: [
      { id: 'a1', user_id: 'u1', status: 'active', results: {} },
      { id: 'a2', user_id: 'u1', status: 'active', results: {} },
      { id: 'b1', user_id: 'u2', status: 'active', results: {} }
    ]
  });
  __setSupabaseAdminForTests(supabase);

  const req = { body: { ids: ['a1', 'a2', 'b1'] }, user: { id: 'u1' } };
  const res = createMockRes();

  await deleteAnalysisBulk(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.deletedCount, 2);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { __setSupabaseAdminForTests, getHistory } from '../src/controllers/analysisController.js';
import {
  HISTORY_SELECT_COLUMNS,
  buildCompactSummary,
  mapHistoryRowToApi
} from '../src/controllers/analysis/analysisHistory.js';

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

function createHistorySupabaseMock(row) {
  const state = {
    selectColumns: null,
    selectOptions: null,
    range: null
  };

  class Query {
    select(columns, options) {
      state.selectColumns = columns;
      state.selectOptions = options;
      return this;
    }

    eq() { return this; }
    or() { return this; }
    gte() { return this; }
    lte() { return this; }
    filter() { return this; }
    order() { return this; }

    range(from, to) {
      state.range = [from, to];
      return this;
    }

    then(resolve) {
      resolve({ data: [row], error: null, count: 1 });
    }
  }

  return {
    state,
    client: {
      from(table) {
        assert.equal(table, 'analysis_history');
        return new Query();
      }
    }
  };
}

test('HISTORY_SELECT_COLUMNS evita cargar el JSON completo de results', () => {
  assert.doesNotMatch(HISTORY_SELECT_COLUMNS, /\*/);
  assert.match(HISTORY_SELECT_COLUMNS, /summary:results->summary/);
  assert.match(HISTORY_SELECT_COLUMNS, /total_records:results->totalRecords/);
  assert.doesNotMatch(HISTORY_SELECT_COLUMNS, /results->records/);
  assert.doesNotMatch(HISTORY_SELECT_COLUMNS, /results->cases/);
  assert.doesNotMatch(HISTORY_SELECT_COLUMNS, /results->diagnostics/);
});

test('buildCompactSummary conserva solo métricas necesarias para la tabla', () => {
  const compact = buildCompactSummary({
    totalRecords: 100,
    totalDesvios: 8,
    totalInternos: 5,
    totalExternos: 3,
    totalRevisionManual: 2,
    totalNC: 4,
    totalOBS: 4,
    totalConformes: 92,
    byAlcance: { Interno: 5, Externo: 3 },
    excelAudit: { ejemplosRegistrosCreados: new Array(50).fill({ heavy: true }) },
    noFindingAudit: { ejemplosDescartadas: new Array(50).fill({ heavy: true }) }
  });

  assert.equal(compact.totalRecords, 100);
  assert.equal(compact.totalDesvios, 8);
  assert.deepEqual(compact.byAlcance, { Interno: 5, Externo: 3 });
  assert.equal('excelAudit' in compact, false);
  assert.equal('noFindingAudit' in compact, false);
});

test('mapHistoryRowToApi no expone records, cases ni diagnostics', () => {
  const mapped = mapHistoryRowToApi({
    id: 'analysis-1',
    filename: 'septiembre.xlsx',
    status: 'archived',
    user_id: 'user-1',
    created_at: '2026-09-10T13:00:00.000Z',
    total_records: 250,
    summary: {
      processedAt: '2026-09-10T13:01:00.000Z',
      totalRecords: 250,
      totalDesvios: 12,
      records: new Array(100).fill({ shouldNotLeak: true })
    }
  });

  assert.equal(mapped.id, 'analysis-1');
  assert.equal(mapped.totalRecords, 250);
  assert.equal(mapped.summary.totalDesvios, 12);
  assert.equal('records' in mapped, false);
  assert.equal('cases' in mapped, false);
  assert.equal('diagnostics' in mapped, false);
  assert.equal('records' in mapped.summary, false);
});

test('getHistory usa proyección liviana y conserva paginación', async () => {
  const mock = createHistorySupabaseMock({
    id: 'analysis-1',
    filename: 'septiembre.xlsx',
    status: 'active',
    user_id: 'admin-1',
    created_at: '2026-09-10T13:00:00.000Z',
    total_records: 20,
    summary: { totalRecords: 20, totalDesvios: 3 }
  });
  __setSupabaseAdminForTests(mock.client);

  const req = {
    query: { page: 1, limit: 10 },
    user: { id: 'admin-1', role: 'admin', isAdmin: true }
  };
  const res = createMockRes();

  await getHistory(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(mock.state.selectColumns, HISTORY_SELECT_COLUMNS);
  assert.deepEqual(mock.state.selectOptions, { count: 'exact' });
  assert.deepEqual(mock.state.range, [0, 9]);
  assert.equal(res.body.total, 1);
  assert.equal(res.body.data.length, 1);
  assert.equal('records' in res.body.data[0], false);
});

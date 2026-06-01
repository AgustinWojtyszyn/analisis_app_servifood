import test from 'node:test';
import assert from 'node:assert/strict';
import {
  __setSupabaseAdminForTests,
  createHealthDeclarationHandler
} from '../src/routes/healthDeclarations.js';

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

function createSupabaseMock({ declarations = [], profiles = [] } = {}) {
  const tables = {
    health_declarations: declarations.map((row) => ({ ...row })),
    profiles: profiles.map((row) => ({ ...row }))
  };

  const clone = (row) => ({ ...row });
  const nowIso = () => new Date().toISOString();

  const applyFilters = (rows, filters) => rows.filter((row) => filters.every((f) => {
    if (f.type === 'eq') return row[f.column] === f.value;
    if (f.type === 'in') return Array.isArray(f.values) && f.values.includes(row[f.column]);
    return true;
  }));

  class SelectQuery {
    constructor(table) {
      this.table = table;
      this.filters = [];
      this.orderBy = null;
      this.limitValue = null;
      this.singleMode = null;
    }

    select() { return this; }
    eq(column, value) { this.filters.push({ type: 'eq', column, value }); return this; }
    in(column, values) { this.filters.push({ type: 'in', column, values }); return this; }
    order(column, opts = {}) { this.orderBy = { column, ascending: Boolean(opts.ascending) }; return this; }
    limit(value) { this.limitValue = Number(value); return this; }
    maybeSingle() { this.singleMode = 'maybeSingle'; return this._runSingle(); }
    single() { this.singleMode = 'single'; return this._runSingle(); }

    _rows() {
      let rows = applyFilters(tables[this.table] || [], this.filters);
      if (this.orderBy) {
        const { column, ascending } = this.orderBy;
        rows = rows.sort((a, b) => {
          const av = a[column] || '';
          const bv = b[column] || '';
          if (av === bv) return 0;
          return ascending ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
        });
      }
      if (Number.isFinite(this.limitValue) && this.limitValue >= 0) {
        rows = rows.slice(0, this.limitValue);
      }
      return rows;
    }

    _runSingle() {
      const rows = this._rows();
      if (this.singleMode === 'single') {
        if (rows.length !== 1) {
          return Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' } });
        }
        return Promise.resolve({ data: clone(rows[0]), error: null });
      }
      if (rows.length === 0) return Promise.resolve({ data: null, error: null });
      return Promise.resolve({ data: clone(rows[0]), error: null });
    }

    then(resolve, reject) {
      try {
        const rows = this._rows().map(clone);
        resolve({ data: rows, error: null });
      } catch (error) {
        if (reject) reject(error);
      }
    }
  }

  class InsertQuery {
    constructor(table, payload) {
      this.table = table;
      this.payload = payload;
    }

    select() {
      return {
        single: async () => {
          await new Promise((r) => setTimeout(r, 5));
          const row = { ...this.payload };
          const rows = tables[this.table];
          const duplicate = rows.find((item) =>
            item.user_id === row.user_id && item.declaration_date === row.declaration_date
          );
          if (duplicate) {
            return {
              data: null,
              error: { code: '23505', message: 'duplicate key value violates unique constraint "health_declarations_user_date_unique"' }
            };
          }
          const created = {
            id: `dec_${rows.length + 1}`,
            created_at: nowIso(),
            ...row
          };
          rows.push(created);
          return { data: clone(created), error: null };
        }
      };
    }
  }

  return {
    tables,
    from(table) {
      return {
        select: () => new SelectQuery(table).select(),
        insert: (payload) => new InsertQuery(table, payload)
      };
    }
  };
}

function buildReq({ userId = 'u1', body = {} } = {}) {
  return {
    user: { id: userId },
    body
  };
}

function validPayload() {
  return {
    hasSymptoms: false,
    hasFever: false,
    recentContact: false,
    commitInform: true,
    policyAccepted: true,
    symptomsDetail: {
      cough: false,
      soreThroat: false,
      difficultyBreathing: false,
      vomiting: false,
      diarrhea: false,
      jaundice: false,
      skinLesions: false,
      uncoveredWounds: false
    }
  };
}

function todayLocalDateString() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

test('primer envío válido crea declaración', async () => {
  const supabase = createSupabaseMock({
    profiles: [{ id: 'u1', email: 'u1@example.com', full_name: 'U1' }]
  });
  __setSupabaseAdminForTests(supabase);

  const req = buildReq({ userId: 'u1', body: validPayload() });
  const res = createMockRes();

  await createHealthDeclarationHandler(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body?.success, true);
  assert.equal(supabase.tables.health_declarations.length, 1);
});

test('segundo envío mismo usuario y día devuelve conflicto y no duplica', async () => {
  const supabase = createSupabaseMock({
    profiles: [{ id: 'u1', email: 'u1@example.com', full_name: 'U1' }]
  });
  __setSupabaseAdminForTests(supabase);

  const req = buildReq({ userId: 'u1', body: validPayload() });
  const res1 = createMockRes();
  await createHealthDeclarationHandler(req, res1);
  assert.equal(res1.statusCode, 201);

  const res2 = createMockRes();
  await createHealthDeclarationHandler(req, res2);
  assert.equal(res2.statusCode, 409);
  assert.equal(res2.body?.code, 'DECLARATION_ALREADY_EXISTS');
  assert.match(String(res2.body?.message || ''), /ya registraste/i);
  assert.equal(supabase.tables.health_declarations.length, 1);
});

test('concurrencia: dos requests simultáneos insertan una sola fila', async () => {
  const supabase = createSupabaseMock({
    profiles: [{ id: 'u1', email: 'u1@example.com', full_name: 'U1' }]
  });
  __setSupabaseAdminForTests(supabase);

  const reqA = buildReq({ userId: 'u1', body: validPayload() });
  const reqB = buildReq({ userId: 'u1', body: validPayload() });
  const resA = createMockRes();
  const resB = createMockRes();

  await Promise.allSettled([
    createHealthDeclarationHandler(reqA, resA),
    createHealthDeclarationHandler(reqB, resB)
  ]);

  const codes = [resA.statusCode, resB.statusCode].sort();
  assert.deepEqual(codes, [201, 409]);
  assert.ok(!codes.includes(500));
  assert.equal(supabase.tables.health_declarations.length, 1);
  const today = todayLocalDateString();
  const rowsToday = supabase.tables.health_declarations.filter((row) => row.user_id === 'u1' && row.declaration_date === today);
  assert.equal(rowsToday.length, 1);
});

test('usuarios distintos pueden declarar el mismo día', async () => {
  const supabase = createSupabaseMock({
    profiles: [
      { id: 'u1', email: 'u1@example.com', full_name: 'U1' },
      { id: 'u2', email: 'u2@example.com', full_name: 'U2' }
    ]
  });
  __setSupabaseAdminForTests(supabase);

  const res1 = createMockRes();
  const res2 = createMockRes();
  await createHealthDeclarationHandler(buildReq({ userId: 'u1', body: validPayload() }), res1);
  await createHealthDeclarationHandler(buildReq({ userId: 'u2', body: validPayload() }), res2);

  assert.equal(res1.statusCode, 201);
  assert.equal(res2.statusCode, 201);
  assert.equal(supabase.tables.health_declarations.length, 2);
});

test('mismo usuario puede declarar en días distintos', async () => {
  const yesterday = new Date(Date.now() - (24 * 60 * 60 * 1000)).toISOString();
  const yesterdayDate = (() => {
    const d = new Date(Date.now() - (24 * 60 * 60 * 1000));
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(d);
    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    return `${year}-${month}-${day}`;
  })();

  const supabase = createSupabaseMock({
    profiles: [{ id: 'u1', email: 'u1@example.com', full_name: 'U1' }],
    declarations: [{
      id: 'old1',
      user_id: 'u1',
      declaration_date: yesterdayDate,
      declared_at: yesterday,
      created_at: yesterday,
      has_symptoms: false,
      has_fever: false,
      recent_contact: false,
      commit_inform: true,
      policy_accepted: true
    }]
  });
  __setSupabaseAdminForTests(supabase);

  const res = createMockRes();
  await createHealthDeclarationHandler(buildReq({ userId: 'u1', body: validPayload() }), res);

  assert.equal(res.statusCode, 201);
  assert.equal(supabase.tables.health_declarations.length, 2);
});

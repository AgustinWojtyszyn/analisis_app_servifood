import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import {
  __setPrismaForTests,
  createRule,
  deleteRule,
  getRules,
  updateRule
} from '../src/controllers/rulesController.js';

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

function validRuleBody(overrides = {}) {
  return {
    name: 'Regla persistente',
    keywords: ['temperatura', 'frío'],
    category: 'Inocuidad',
    severity: 'alta',
    ...overrides
  };
}

after(() => {
  __setPrismaForTests(null);
});

test('GET /rules conserva fallback de lectura si Prisma falla', async () => {
  __setPrismaForTests({
    businessRule: {
      findMany: async () => {
        throw new Error('database unavailable');
      }
    }
  });

  const res = createMockRes();
  await getRules({}, res);

  assert.equal(res.statusCode, 200);
  assert.ok(Array.isArray(res.body));
  assert.ok(res.body.length > 0);
});

test('crear regla devuelve 503 si Prisma no puede persistir', async () => {
  __setPrismaForTests({
    businessRule: {
      create: async () => {
        throw new Error('database unavailable');
      }
    }
  });

  const res = createMockRes();
  await createRule({ body: validRuleBody() }, res);

  assert.equal(res.statusCode, 503);
  assert.match(res.body.error, /no se pudo guardar/i);
});

test('editar regla devuelve 503 si la escritura falla', async () => {
  const storedRule = {
    id: 7,
    name: 'Regla persistente',
    keywords: JSON.stringify({ keywords: ['temperatura'] }),
    category: 'Inocuidad',
    severity: 'alta',
    suggestedAction: 'Avisar',
    enabled: true
  };

  __setPrismaForTests({
    businessRule: {
      findUnique: async () => storedRule,
      update: async () => {
        throw new Error('database unavailable');
      }
    }
  });

  const res = createMockRes();
  await updateRule({ params: { id: '7' }, body: { severity: 'media' } }, res);

  assert.equal(res.statusCode, 503);
  assert.match(res.body.error, /no se pudo guardar/i);
});

test('eliminar regla devuelve 503 si Prisma falla y no simula éxito', async () => {
  __setPrismaForTests({
    businessRule: {
      delete: async () => {
        throw new Error('database unavailable');
      }
    }
  });

  const res = createMockRes();
  await deleteRule({ params: { id: '7' } }, res);

  assert.equal(res.statusCode, 503);
  assert.notEqual(res.body?.success, true);
});

test('crear regla conserva 409 para nombres duplicados', async () => {
  __setPrismaForTests({
    businessRule: {
      create: async () => {
        const error = new Error('unique constraint');
        error.code = 'P2002';
        throw error;
      }
    }
  });

  const res = createMockRes();
  await createRule({ body: validRuleBody() }, res);

  assert.equal(res.statusCode, 409);
  assert.match(res.body.error, /ya existe/i);
});

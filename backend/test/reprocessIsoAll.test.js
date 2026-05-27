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

    single() {
      this.expectSingle = true;
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
          if (this.expectSingle) {
            resolve({ data: rows[0] || null, error: rows[0] ? null : { message: 'Not found' } });
            return;
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

function buildCustomAnalysisRecord({ id, userId, status = 'active', record }) {
  return {
    id,
    user_id: userId,
    status,
    created_at: new Date().toISOString(),
    results: {
      summary: {
        totalRevisionManual: 1,
        processedAt: '2026-01-01T10:00:00.000Z'
      },
      records: [record]
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
  assert.equal(res.body?.analysesFound, 2);
  assert.equal(res.body?.analysesProcessed, 2);
  assert.equal(res.body?.recordsProcessed, 2);
  assert.equal(res.body?.recordsProcessedTotal, 2);
  assert.equal(res.body?.manualBefore, 2);
  assert.equal(res.body?.manualAfter, 0);
  assert.equal(res.body?.updatedAnalyses, 2);

  const a1 = mock.state.records.find((row) => row.id === 'a1');
  const a2 = mock.state.records.find((row) => row.id === 'a2');
  const b1 = mock.state.records.find((row) => row.id === 'b1');

  assert.equal(a1.results.records[0].relacionIso22000, '8.5.1 Control operacional');
  assert.equal(a2.results.records[0].relacionIso22000, '8.5.1 Control operacional');

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
  assert.equal(res.body?.analysesFound, 0);
  assert.equal(res.body?.analysesProcessed, 0);
  assert.equal(res.body?.recordsProcessed, 0);
  assert.equal(res.body?.recordsProcessedTotal, 0);
  assert.equal(res.body?.manualBefore, 0);
  assert.equal(res.body?.manualAfter, 0);
  assert.equal(res.body?.updatedAnalyses, 0);
});

test('reprocessIsoAll usa descripción/acciones aunque hallazgo esté vacío', async () => {
  const mock = createSupabaseMock({
    records: [
      {
        id: 'a1',
        user_id: 'u1',
        created_at: new Date().toISOString(),
        results: {
          summary: { totalRevisionManual: 1, processedAt: '2026-01-01T10:00:00.000Z' },
          records: [
            {
              fecha: '2026-01-01',
              hallazgoDetectado: '',
              descripcion: 'Refrigerio de Adium Salio tarde',
              accionInmediata: 'Al faltar personal se tuvo que reubicar personal y se demoró el envío',
              areaSector: 'Area Fria',
              clasificacionDesvio: 'Desvío de Logística',
              tipoDesvio: 'NC',
              estadoAcciones: 'cerrado',
              iso22000: 'Revisar manualmente',
              relacionIso22000: 'Revisar manualmente'
            }
          ]
        }
      }
    ]
  });
  __setSupabaseAdminForTests(mock);

  const req = { user: { id: 'u1' } };
  const res = createMockRes();
  await reprocessIsoAll(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.success, true);
  assert.equal(mock.state.records[0].results.records[0].relacionIso22000, '8.5.1 Control operacional');
});

test('reprocessIsoAll: luz y máquina en oficina no queda en manual', async () => {
  const mock = createSupabaseMock({
    records: [
      buildCustomAnalysisRecord({
        id: 'm1',
        userId: 'u1',
        record: {
          fecha: '2026-05-20',
          hallazgoDetectado: 'Se deja prendido luz y maquina en oficina',
          areaSector: 'Mantenimiento',
          clasificacionDesvio: 'Calidad',
          tipoDesvio: 'NC',
          estadoAcciones: 'abierto',
          relacionIso22000: 'Revisar manualmente'
        }
      })
    ]
  });
  __setSupabaseAdminForTests(mock);

  const req = { user: { id: 'u1' } };
  const res = createMockRes();
  await reprocessIsoAll(req, res);

  assert.equal(res.statusCode, 200);
  assert.notEqual(mock.state.records[0].results.records[0].relacionIso22000, 'Revisar manualmente');
});

test('reprocessIsoAll: área mantenimiento clasifica a control operacional', async () => {
  const mock = createSupabaseMock({
    records: [
      buildCustomAnalysisRecord({
        id: 'm2',
        userId: 'u1',
        record: {
          fecha: '2026-05-21',
          hallazgoDetectado: 'Falla en equipo de producción',
          areaSector: 'Mantenimiento',
          clasificacionDesvio: 'Calidad',
          tipoDesvio: 'NC',
          estadoAcciones: 'abierto',
          relacionIso22000: 'Revisar manualmente'
        }
      })
    ]
  });
  __setSupabaseAdminForTests(mock);

  const req = { user: { id: 'u1' } };
  const res = createMockRes();
  await reprocessIsoAll(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(mock.state.records[0].results.records[0].relacionIso22000, '8.5.1 Control operacional');
});

test('reprocessIsoAll: sin texto útil queda en revisar manualmente', async () => {
  const mock = createSupabaseMock({
    records: [
      buildCustomAnalysisRecord({
        id: 'm3',
        userId: 'u1',
        record: {
          fecha: '',
          hallazgoDetectado: '',
          descripcion: '',
          observaciones: '',
          accionInmediata: '',
          accionCorrectiva: '',
          relacionIso22000: 'Revisar manualmente'
        }
      })
    ]
  });
  __setSupabaseAdminForTests(mock);

  const req = { user: { id: 'u1' } };
  const res = createMockRes();
  await reprocessIsoAll(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(mock.state.records[0].results.records[0].relacionIso22000, 'Revisar manualmente');
});

test('reprocessIsoAll reprocesa también análisis archived/históricos', async () => {
  const mock = createSupabaseMock({
    records: [
      buildCustomAnalysisRecord({
        id: 'h1',
        userId: 'u1',
        status: 'archived',
        record: {
          fecha: '2026-05-14',
          descripcion: 'Refrigerio de Adium Salio tarde',
          accionInmediata: 'Al faltar personal se tuvo que reubicar el personal',
          relacionIso22000: 'Revisar manualmente'
        }
      })
    ]
  });
  __setSupabaseAdminForTests(mock);

  const req = { user: { id: 'u1' } };
  const res = createMockRes();
  await reprocessIsoAll(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(mock.state.records[0].status, 'archived');
  assert.equal(mock.state.records[0].results.records[0].relacionIso22000, '8.5.1 Control operacional');
});

test('reprocessIsoAll debug incluye sourceTextPreview y decisionReason', async () => {
  const mock = createSupabaseMock({
    records: [
      buildCustomAnalysisRecord({
        id: 'd1',
        userId: 'u1',
        record: {
          fecha: '2026-05-20',
          hallazgoDetectado: 'Se deja prendido luz y maquina en oficina',
          areaSector: 'Mantenimiento',
          clasificacionDesvio: 'Calidad',
          tipoDesvio: 'NC',
          estadoAcciones: 'abierto',
          relacionIso22000: 'Revisar manualmente'
        }
      })
    ]
  });
  __setSupabaseAdminForTests(mock);

  const req = { user: { id: 'u1' }, query: { debug: '1' } };
  const res = createMockRes();
  await reprocessIsoAll(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(Array.isArray(res.body?.debug), true);
  assert.equal(Array.isArray(res.body?.analysesDebug), true);
  const analysisDebug = res.body.debug?.[0];
  assert.ok(analysisDebug?.analysisId);
  assert.ok(analysisDebug?.recordsPathRead);
  assert.equal(analysisDebug?.recordsPathWritten, 'results.records');
  assert.equal(typeof analysisDebug?.persisted, 'boolean');
  const row = res.body.debug?.[0]?.records?.[0];
  assert.equal(typeof row?.recordIndex, 'number');
  assert.equal(typeof row?.changed, 'boolean');
  assert.ok(row?.sourceTextPreview);
  assert.ok(row?.decisionReason);
  assert.ok(row?.matchedRule);
  assert.ok(row?.previousValueFromDisplayedField);
  assert.equal(row?.fieldUpdated, 'relacionIso22000');
  assert.equal(Array.isArray(row?.usedFields), true);
});

test('reprocessIsoAll admin procesa active y archived de múltiples usuarios cuando no filtra userId', async () => {
  const mock = createSupabaseMock({
    records: [
      buildCustomAnalysisRecord({
        id: 'adm-1',
        userId: 'u1',
        status: 'active',
        record: {
          hallazgoDetectado: 'Refrigerio de Adium Salio tarde',
          relacionIso22000: 'Revisar manualmente'
        }
      }),
      buildCustomAnalysisRecord({
        id: 'adm-2',
        userId: 'u2',
        status: 'archived',
        record: {
          hallazgoDetectado: 'Reclamo de adium porque se les envió queso y dulce y ensalada de frutas como postre toda la semana',
          relacionIso22000: 'Revisar manualmente'
        }
      })
    ]
  });
  __setSupabaseAdminForTests(mock);
  const req = { user: { id: 'admin-1', role: 'admin', isAdmin: true } };
  const res = createMockRes();
  await reprocessIsoAll(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.analysesFound, 2);
  assert.equal(res.body?.analysesProcessed, 2);
  assert.equal(res.body?.recordsProcessedTotal, 2);
  assert.equal(res.body?.updatedAnalyses, 2);
  const a1 = mock.state.records.find((row) => row.id === 'adm-1');
  const a2 = mock.state.records.find((row) => row.id === 'adm-2');
  assert.equal(a1.results.records[0].relacionIso22000, '8.5.1 Control operacional');
  assert.equal(a2.results.records[0].relacionIso22000, '8.1 Planificación y control operacional');
});

test('reprocessIsoAll summary totalRevisionManual usa mismo campo ISO que tabla', async () => {
  const mock = createSupabaseMock({
    records: [
      buildCustomAnalysisRecord({
        id: 'sum-1',
        userId: 'u1',
        record: {
          fecha: '2026-05-20',
          hallazgoDetectado: 'Texto ambiguo sin reglas',
          clasificacionDesvio: 'Calidad',
          relacionIso22000: 'Revisar manualmente',
          iso22000: 'Revisar manualmente'
        }
      })
    ]
  });
  __setSupabaseAdminForTests(mock);
  const req = { user: { id: 'u1' } };
  const res = createMockRes();
  await reprocessIsoAll(req, res);
  assert.equal(res.statusCode, 200);
  const summary = mock.state.records[0].results.summary;
  assert.equal(Number(summary.totalRevisionManual || 0), 1);
});

test('reprocessIsoAll caso real: postres toda la semana => 8.1 planificación', async () => {
  const mock = createSupabaseMock({
    records: [
      buildCustomAnalysisRecord({
        id: 'real-1',
        userId: 'u1',
        status: 'archived',
        record: {
          fecha: '2026-05-14',
          hallazgoDetectado: 'Reclamo de adium porque se les envió queso y dulce y ensalada de frutas como postre toda la semana',
          areaSector: 'Planificación',
          clasificacionDesvio: 'Calidad',
          tipoDesvioOrigen: 'Externo',
          relacionIso22000: 'Revisar manualmente'
        }
      })
    ]
  });
  __setSupabaseAdminForTests(mock);
  const req = { user: { id: 'u1' } };
  const res = createMockRes();
  await reprocessIsoAll(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(mock.state.records[0].results.records[0].relacionIso22000, '8.1 Planificación y control operacional');
});

test('reprocessIsoAll caso real: refrigerio salió tarde => 8.5.1 operacional', async () => {
  const mock = createSupabaseMock({
    records: [
      buildCustomAnalysisRecord({
        id: 'real-2',
        userId: 'u1',
        status: 'active',
        record: {
          fecha: '2026-05-26',
          hallazgoDetectado: 'Refrigerio de Adium Salio tarde',
          areaSector: 'Area Fria',
          clasificacionDesvio: 'Logistica',
          tipoDesvioOrigen: 'Interno',
          accionInmediata: 'Al faltar personal se tuvo que elaborar sanguches para estación de servicio y se demoraron los sanguches para adium. Se tuvo que reubicar el personal',
          accionCorrectiva: 'Al re organizar al personal, definir prioridades para evitar reclamos',
          relacionIso22000: 'Revisar manualmente'
        }
      })
    ]
  });
  __setSupabaseAdminForTests(mock);
  const req = { user: { id: 'u1' } };
  const res = createMockRes();
  await reprocessIsoAll(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(mock.state.records[0].results.records[0].relacionIso22000, '8.5.1 Control operacional');
});

test('reprocessIsoAll caso real: manzanas chicas y verdes + reclamo proveedor => 8.4 o fallback 8.5.1, nunca manual', async () => {
  const mock = createSupabaseMock({
    records: [
      buildCustomAnalysisRecord({
        id: 'real-3',
        userId: 'u1',
        status: 'active',
        record: {
          fecha: '2026-05-19',
          hallazgoDetectado: 'Adium reclama que las manzanas estaban chicas y verdes',
          areaSector: 'deposito',
          clasificacionDesvio: 'calidad',
          tipoDesvioOrigen: 'Externo',
          accionCorrectiva: 'Se le hace reclamo al proveedor.',
          relacionIso22000: 'Revisar manualmente'
        }
      })
    ]
  });
  __setSupabaseAdminForTests(mock);
  const req = { user: { id: 'u1' } };
  const res = createMockRes();
  await reprocessIsoAll(req, res);
  assert.equal(res.statusCode, 200);
  const iso = mock.state.records[0].results.records[0].relacionIso22000;
  assert.notEqual(iso, 'Revisar manualmente');
  assert.ok(
    iso === '8.4 Control de procesos, productos o servicios provistos externamente'
    || iso === '8.5.1 Control operacional'
  );
});

test('reprocessIsoAll caso real: faltó personal + capacitación/reemplazo => 7.2 Competencia', async () => {
  const mock = createSupabaseMock({
    records: [
      buildCustomAnalysisRecord({
        id: 'real-4',
        userId: 'u1',
        status: 'active',
        record: {
          fecha: '2026-05-20',
          hallazgoDetectado: 'Faltó Mauricio Amarfil (encargado de ensaladas)',
          areaSector: 'Area Fria',
          clasificacionDesvio: 'Logistica',
          tipoDesvioOrigen: 'Interno',
          accionCorrectiva: 'Capacitar personas para poder reemplazar por puesto.',
          relacionIso22000: 'Revisar manualmente'
        }
      })
    ]
  });
  __setSupabaseAdminForTests(mock);
  const req = { user: { id: 'u1' } };
  const res = createMockRes();
  await reprocessIsoAll(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(mock.state.records[0].results.records[0].relacionIso22000, '7.2 Competencia');
});

test('reprocessIsoAll proveedor externo: masa de tartas con vencimiento ilegible => 8.4', async () => {
  const mock = createSupabaseMock({
    records: [
      buildCustomAnalysisRecord({
        id: 'real-5',
        userId: 'u1',
        status: 'active',
        record: {
          hallazgoDetectado: 'Se devuelve al proveedor la porteña masa de tartas por no tener fecha de vencimiento legible',
          clasificacionDesvio: 'Calidad',
          tipoDesvioOrigen: 'Externo',
          relacionIso22000: 'Revisar manualmente'
        }
      })
    ]
  });
  __setSupabaseAdminForTests(mock);
  const req = { user: { id: 'u1' } };
  const res = createMockRes();
  await reprocessIsoAll(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(mock.state.records[0].results.records[0].relacionIso22000, '8.4 Control de procesos, productos o servicios provistos externamente');
});

test('reprocessIsoAll proveedor externo: devolución por exceso de grasa => 8.4', async () => {
  const mock = createSupabaseMock({
    records: [
      buildCustomAnalysisRecord({
        id: 'real-6',
        userId: 'u1',
        status: 'active',
        record: {
          hallazgoDetectado: 'Se devuelve al proveedor MG el pedido de matambres por exceso de grasa',
          clasificacionDesvio: 'Calidad',
          tipoDesvioOrigen: 'Externo',
          relacionIso22000: 'Revisar manualmente'
        }
      })
    ]
  });
  __setSupabaseAdminForTests(mock);
  const req = { user: { id: 'u1' } };
  const res = createMockRes();
  await reprocessIsoAll(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(mock.state.records[0].results.records[0].relacionIso22000, '8.4 Control de procesos, productos o servicios provistos externamente');
});

test('reprocessIsoAll HACCP interno: decomiso por fuera de refrigeración se mantiene en 8.5', async () => {
  const mock = createSupabaseMock({
    records: [
      buildCustomAnalysisRecord({
        id: 'real-7',
        userId: 'u1',
        status: 'active',
        record: {
          hallazgoDetectado: 'Se decomisa platina de papas fritas por encontrarse fuera de refrigeracion',
          clasificacionDesvio: 'Inocuidad',
          tipoDesvioOrigen: 'Interno',
          relacionIso22000: 'Revisar manualmente'
        }
      })
    ]
  });
  __setSupabaseAdminForTests(mock);
  const req = { user: { id: 'u1' } };
  const res = createMockRes();
  await reprocessIsoAll(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(mock.state.records[0].results.records[0].relacionIso22000, '8.5 HACCP');
});

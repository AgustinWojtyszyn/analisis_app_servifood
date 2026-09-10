import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildComparisonChanges,
  buildInsights,
  buildMetricChange,
  buildPeriodAggregate,
  parseComparisonRequest
} from '../src/controllers/analysis/analysisComparison.js';

test('parseComparisonRequest interpreta días de Argentina sin depender del timezone del servidor', () => {
  const parsed = parseComparisonRequest({
    periodAFrom: '2026-09-01',
    periodATo: '2026-09-10',
    periodBFrom: '2026-08-01',
    periodBTo: '2026-08-10'
  });

  assert.equal(parsed.error, undefined);
  assert.equal(parsed.periodA.days, 10);
  assert.equal(parsed.periodA.fromIso, '2026-09-01T03:00:00.000Z');
  assert.equal(parsed.periodA.toIso, '2026-09-11T02:59:59.999Z');
});

test('parseComparisonRequest rechaza rangos inválidos o mayores a un año', () => {
  const reversed = parseComparisonRequest({
    periodAFrom: '2026-09-10',
    periodATo: '2026-09-01',
    periodBFrom: '2026-08-01',
    periodBTo: '2026-08-10'
  });
  assert.match(reversed.error, /fecha inicial/i);

  const tooLong = parseComparisonRequest({
    periodAFrom: '2025-01-01',
    periodATo: '2026-01-02',
    periodBFrom: '2026-01-01',
    periodBTo: '2026-01-10'
  });
  assert.match(tooLong.error, /366 días/i);
});

test('buildPeriodAggregate suma métricas, categorías y acciones de varios análisis', () => {
  const aggregate = buildPeriodAggregate([
    {
      summary: {
        totalRecords: 10,
        totalDesvios: 4,
        totalConformes: 6,
        totalNC: 2,
        totalOBS: 2,
        totalCalidad: 3,
        byCategoria: { Calidad: 3, Logística: 1 },
        byArea: { Cocina: 2 },
        actions: { abiertas: 1, cerradas: 3, enProceso: 0, sinAccion: 0 }
      }
    },
    {
      results: {
        summary: {
          totalRecords: 5,
          totalDesvios: 1,
          totalConformes: 4,
          totalNC: 1,
          totalCalidad: 1,
          byCategoria: { Calidad: 1 },
          byArea: { Cocina: 1, Depósito: 1 },
          actions: { abiertas: 0, cerradas: 1, enProceso: 0, sinAccion: 0 }
        }
      }
    }
  ]);

  assert.equal(aggregate.totalAnalyses, 2);
  assert.equal(aggregate.totalRecords, 15);
  assert.equal(aggregate.totalDesvios, 5);
  assert.equal(aggregate.totalConformes, 10);
  assert.equal(aggregate.totalNC, 3);
  assert.equal(aggregate.byCategoria.Calidad, 4);
  assert.equal(aggregate.byArea.Cocina, 3);
  assert.equal(aggregate.actions.cerradas, 4);
  assert.equal(aggregate.conformityRate, 66.67);
  assert.equal(aggregate.deviationRate, 33.33);
  assert.equal(aggregate.actionClosureRate, 80);
});

test('buildMetricChange maneja base cero sin inventar porcentajes infinitos', () => {
  assert.deepEqual(buildMetricChange(5, 0), {
    current: 5,
    previous: 0,
    absolute: 5,
    percentage: null,
    direction: 'up'
  });

  assert.equal(buildMetricChange(15, 10).percentage, 50);
  assert.equal(buildMetricChange(5, 10).percentage, -50);
});

test('comparación genera cambios e insights con sentido operativo', () => {
  const current = {
    totalAnalyses: 2,
    totalRecords: 100,
    totalDesvios: 10,
    totalConformes: 90,
    totalNC: 2,
    totalOBS: 3,
    totalOM: 1,
    totalInocuidad: 1,
    totalCalidad: 4,
    totalLogistica: 2,
    totalLegal: 0,
    totalRevisionManual: 0,
    conformityRate: 90,
    deviationRate: 10,
    actionClosureRate: 80
  };
  const previous = {
    ...current,
    totalDesvios: 20,
    totalConformes: 80,
    totalNC: 5,
    conformityRate: 80,
    deviationRate: 20,
    actionClosureRate: 60
  };

  const changes = buildComparisonChanges(current, previous);
  assert.equal(changes.totalNC.absolute, -3);
  assert.equal(changes.conformityRate.absolute, 10);

  const insights = buildInsights(current, previous);
  assert.ok(insights.some((item) => item.tone === 'positive' && /desvíos bajó/i.test(item.text)));
  assert.ok(insights.some((item) => item.tone === 'positive' && /conformidad mejoró/i.test(item.text)));
});

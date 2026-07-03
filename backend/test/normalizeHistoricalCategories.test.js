import test from 'node:test';
import assert from 'node:assert/strict';
import { recalcSummary } from '../scripts/normalize-historical-categories.mjs';

test('recalcSummary recalcula totales de procedimiento y medio ambiente', () => {
  const summary = recalcSummary([
    { classification_normalized: 'incumplimientos_procedimiento' },
    { classification_normalized: 'medio_ambiente' },
    { categoriaDesvio: 'Ambiental' },
    { clasificacionDesvio: 'Procedimiento' }
  ], {});

  assert.equal(summary.byCategoria['Incumplimientos de procedimiento'], 2);
  assert.equal(summary.byCategoria['Medio ambiente'], 2);
  assert.equal(summary.totalProcedimiento, 2);
  assert.equal(summary.totalMedioAmbiente, 2);
});

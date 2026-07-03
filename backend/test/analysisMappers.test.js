import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStoredAnalysisResults } from '../src/controllers/analysisController.mappers.js';

test('normalizeStoredAnalysisResults preserva historicos con solo classification_normalized medio ambiente', () => {
  const result = normalizeStoredAnalysisResults({
    records: [
      {
        classification_normalized: 'medio_ambiente',
        hallazgoDetectado: 'Texto historico sin señales suficientes'
      }
    ],
    summary: {}
  });

  assert.equal(result.records[0].classification_normalized, 'Medio ambiente');
  assert.equal(result.records[0].categoriaDesvio, 'Medio ambiente');
  assert.equal(result.records[0].clasificacionDesvio, 'Medio ambiente');
  assert.equal(result.summary.byCategoria['Medio ambiente'], 1);
  assert.equal(result.summary.totalMedioAmbiente, 1);
});

test('normalizeStoredAnalysisResults preserva historicos con solo classification_normalized procedimiento', () => {
  const result = normalizeStoredAnalysisResults({
    records: [
      {
        classification_normalized: 'incumplimientos_procedimiento',
        hallazgoDetectado: 'Texto historico sin señales suficientes'
      }
    ],
    summary: {}
  });

  assert.equal(result.records[0].classification_normalized, 'Incumplimientos de procedimiento');
  assert.equal(result.records[0].categoriaDesvio, 'Incumplimientos de procedimiento');
  assert.equal(result.records[0].clasificacionDesvio, 'Incumplimientos de procedimiento');
  assert.equal(result.summary.byCategoria['Incumplimientos de procedimiento'], 1);
  assert.equal(result.summary.totalProcedimiento, 1);
});

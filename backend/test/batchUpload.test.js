import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBatchUploadResponse } from '../src/controllers/analysisController.js';

test('buildBatchUploadResponse with one successful file', () => {
  const payload = buildBatchUploadResponse([
    {
      filename: 'Registro de desvios diciembre.xlsx',
      success: true,
      analysisId: 'abc-123',
      totalRecords: 34,
      records: Array.from({ length: 34 }, (_, i) => ({ id: i + 1 }))
    }
  ]);

  assert.equal(payload.success, true);
  assert.equal(payload.totalFiles, 1);
  assert.equal(payload.successfulFiles, 1);
  assert.equal(payload.failedFiles, 0);
  assert.equal(payload.results[0].totalRecords, 34);
  assert.equal(payload.errors.length, 0);
});

test('buildBatchUploadResponse with processed file but zero records as failure', () => {
  const payload = buildBatchUploadResponse([
    {
      filename: 'Registro de desvios diciembre.xlsx',
      success: false,
      stage: 'post_processing',
      error: 'Archivo procesado sin registros detectados'
    }
  ]);

  assert.equal(payload.success, false);
  assert.equal(payload.totalFiles, 1);
  assert.equal(payload.successfulFiles, 0);
  assert.equal(payload.failedFiles, 1);
  assert.equal(payload.errors[0].fileName, 'Registro de desvios diciembre.xlsx');
  assert.equal(payload.errors[0].message, 'Archivo procesado sin registros detectados');
  assert.equal(payload.errors[0].stage, 'post_processing');
});

test('buildBatchUploadResponse preserves real processing error', () => {
  const payload = buildBatchUploadResponse([
    {
      filename: 'Registro de desvios diciembre.xlsx',
      success: false,
      stage: 'processing',
      error: 'No se detectó columna Desvío detectado'
    }
  ]);

  assert.equal(payload.success, false);
  assert.equal(payload.failedFiles, 1);
  assert.equal(payload.errors[0].message, 'No se detectó columna Desvío detectado');
  assert.equal(payload.errors[0].stage, 'processing');
});

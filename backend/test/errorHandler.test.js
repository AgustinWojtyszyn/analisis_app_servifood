import test from 'node:test';
import assert from 'node:assert/strict';
import multer from 'multer';
import { globalErrorHandler } from '../src/middlewares/errorHandler.js';

function createResponseRecorder() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    }
  };
}

test('globalErrorHandler conserva cuatro argumentos para que Express lo reconozca', () => {
  assert.equal(globalErrorHandler.length, 4);
});

test('globalErrorHandler devuelve 403 JSON para errores CORS con status explícito', () => {
  const res = createResponseRecorder();
  const error = new Error('CORS: Origin no permitido');
  error.status = 403;

  globalErrorHandler(error, {}, res, () => {});

  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.payload, { error: 'CORS: Origin no permitido' });
});

test('globalErrorHandler transforma LIMIT_FILE_SIZE en 413 JSON', () => {
  const res = createResponseRecorder();
  const error = new multer.MulterError('LIMIT_FILE_SIZE');

  globalErrorHandler(error, {}, res, () => {});

  assert.equal(res.statusCode, 413);
  assert.match(res.payload.error, /tamaño máximo permitido/i);
});

test('globalErrorHandler transforma campo inesperado de Multer en 400 JSON', () => {
  const res = createResponseRecorder();
  const error = new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'archivo');

  globalErrorHandler(error, {}, res, () => {});

  assert.equal(res.statusCode, 400);
  assert.match(res.payload.error, /campo de archivo inesperado/i);
});

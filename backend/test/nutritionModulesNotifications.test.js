import test from 'node:test';
import assert from 'node:assert/strict';
import { formatArgentinaDateTime } from '../src/services/nutritionModulesNotifications.js';

test('formatArgentinaDateTime convierte UTC a horario de Argentina (ART)', () => {
  const result = formatArgentinaDateTime('2026-05-27T13:00:00.000Z');
  assert.match(result, /27\/05\/2026/);
  assert.match(result, /10:00/);
});


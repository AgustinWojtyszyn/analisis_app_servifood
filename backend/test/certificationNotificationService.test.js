import test from 'node:test';
import assert from 'node:assert/strict';
import { getCertificationNotificationTrigger } from '../src/services/certificationNotificationService.js';

const now = new Date('2026-05-29T15:00:00.000Z'); // 12:00 ART

test('getCertificationNotificationTrigger detecta vencimiento en 7 dias', () => {
  const result = getCertificationNotificationTrigger('2026-06-05', now);
  assert.equal(result.status, 'expires_in_7_days');
  assert.equal(result.shouldNotify, true);
  assert.equal(result.triggerType, 'seven_days_before');
  assert.equal(result.daysUntilExpiration, 7);
});

test('getCertificationNotificationTrigger detecta vencimiento mañana', () => {
  const result = getCertificationNotificationTrigger('2026-05-30', now);
  assert.equal(result.status, 'expires_tomorrow');
  assert.equal(result.shouldNotify, true);
  assert.equal(result.triggerType, 'one_day_before');
  assert.equal(result.daysUntilExpiration, 1);
});

test('getCertificationNotificationTrigger detecta proxima sin trigger', () => {
  const result = getCertificationNotificationTrigger('2026-06-03', now);
  assert.equal(result.status, 'near_expiration');
  assert.equal(result.shouldNotify, false);
  assert.equal(result.triggerType, null);
  assert.equal(result.daysUntilExpiration, 5);
});

test('getCertificationNotificationTrigger detecta vencida', () => {
  const result = getCertificationNotificationTrigger('2026-05-28', now);
  assert.equal(result.status, 'expired');
  assert.equal(result.shouldNotify, false);
  assert.equal(result.triggerType, null);
  assert.equal(result.daysUntilExpiration, -1);
});

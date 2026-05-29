import test from 'node:test';
import assert from 'node:assert/strict';
import { getCertificationNotificationTrigger } from '../src/services/certificationNotificationService.js';

const now = new Date('2026-05-29T15:00:00.000Z'); // 12:00 ART

test('vence en 10 dias: sin trigger', () => {
  const result = getCertificationNotificationTrigger('2026-06-08', now);
  assert.equal(result.status, 'active');
  assert.equal(result.shouldNotify, false);
  assert.equal(result.triggerType, null);
  assert.equal(result.daysUntilExpiration, 10);
});

test('vence en 8 dias: sin trigger', () => {
  const result = getCertificationNotificationTrigger('2026-06-06', now);
  assert.equal(result.status, 'active');
  assert.equal(result.shouldNotify, false);
  assert.equal(result.triggerType, null);
  assert.equal(result.daysUntilExpiration, 8);
});

test('vence en 7 dias: early_warning', () => {
  const result = getCertificationNotificationTrigger('2026-06-05', now);
  assert.equal(result.status, 'near_expiration');
  assert.equal(result.shouldNotify, true);
  assert.equal(result.triggerType, 'early_warning');
  assert.equal(result.daysUntilExpiration, 7);
});

test('vence en 6 dias: early_warning', () => {
  const result = getCertificationNotificationTrigger('2026-06-04', now);
  assert.equal(result.status, 'near_expiration');
  assert.equal(result.shouldNotify, true);
  assert.equal(result.triggerType, 'early_warning');
  assert.equal(result.daysUntilExpiration, 6);
});

test('vence en 2 dias: early_warning', () => {
  const result = getCertificationNotificationTrigger('2026-05-31', now);
  assert.equal(result.status, 'near_expiration');
  assert.equal(result.shouldNotify, true);
  assert.equal(result.triggerType, 'early_warning');
  assert.equal(result.daysUntilExpiration, 2);
});

test('vence mañana: urgent_warning', () => {
  const result = getCertificationNotificationTrigger('2026-05-30', now);
  assert.equal(result.status, 'expires_tomorrow');
  assert.equal(result.shouldNotify, true);
  assert.equal(result.triggerType, 'urgent_warning');
  assert.equal(result.daysUntilExpiration, 1);
});

test('vence hoy: urgent_warning', () => {
  const result = getCertificationNotificationTrigger('2026-05-29', now);
  assert.equal(result.status, 'expires_today');
  assert.equal(result.shouldNotify, true);
  assert.equal(result.triggerType, 'urgent_warning');
  assert.equal(result.daysUntilExpiration, 0);
});

test('vencida ayer: expired sin trigger', () => {
  const result = getCertificationNotificationTrigger('2026-05-28', now);
  assert.equal(result.status, 'expired');
  assert.equal(result.shouldNotify, false);
  assert.equal(result.triggerType, null);
  assert.equal(result.daysUntilExpiration, -1);
});

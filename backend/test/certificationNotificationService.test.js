import test from 'node:test';
import assert from 'node:assert/strict';
import { getCertificationNotificationTrigger } from '../src/services/certificationNotificationService.js';

const now = new Date('2026-05-29T15:00:00.000Z'); // 12:00 ART

test('vence en 46 dias: sin trigger', () => {
  const result = getCertificationNotificationTrigger('2026-07-14', now);
  assert.equal(result.status, 'active');
  assert.equal(result.shouldNotify, false);
  assert.equal(result.triggerType, null);
  assert.equal(result.daysUntilExpiration, 46);
});

test('vence en 45 dias: trigger semanal', () => {
  const result = getCertificationNotificationTrigger('2026-07-13', now);
  assert.equal(result.status, 'upcoming_expiration');
  assert.equal(result.shouldNotify, true);
  assert.equal(result.triggerType, 'weekly_window_slot_0');
  assert.equal(result.daysUntilExpiration, 45);
});

test('vence en 44 dias: mismo slot semanal inicial', () => {
  const result = getCertificationNotificationTrigger('2026-07-12', now);
  assert.equal(result.status, 'upcoming_expiration');
  assert.equal(result.shouldNotify, true);
  assert.equal(result.triggerType, 'weekly_window_slot_0');
  assert.equal(result.daysUntilExpiration, 44);
});

test('vence en 10 dias: trigger semanal', () => {
  const result = getCertificationNotificationTrigger('2026-06-08', now);
  assert.equal(result.status, 'upcoming_expiration');
  assert.equal(result.shouldNotify, true);
  assert.equal(result.triggerType, 'weekly_window_slot_5');
  assert.equal(result.daysUntilExpiration, 10);
});

test('vence en 30 dias: trigger semanal', () => {
  const result = getCertificationNotificationTrigger('2026-06-28', now);
  assert.equal(result.status, 'upcoming_expiration');
  assert.equal(result.shouldNotify, true);
  assert.equal(result.triggerType, 'weekly_window_slot_2');
  assert.equal(result.daysUntilExpiration, 30);
});

test('vence en 23 dias: trigger semanal', () => {
  const result = getCertificationNotificationTrigger('2026-06-21', now);
  assert.equal(result.status, 'upcoming_expiration');
  assert.equal(result.shouldNotify, true);
  assert.equal(result.triggerType, 'weekly_window_slot_3');
  assert.equal(result.daysUntilExpiration, 23);
});

test('vence en 16 dias: trigger semanal', () => {
  const result = getCertificationNotificationTrigger('2026-06-14', now);
  assert.equal(result.status, 'upcoming_expiration');
  assert.equal(result.shouldNotify, true);
  assert.equal(result.triggerType, 'weekly_window_slot_4');
  assert.equal(result.daysUntilExpiration, 16);
});

test('vence en 8 dias: trigger semanal', () => {
  const result = getCertificationNotificationTrigger('2026-06-06', now);
  assert.equal(result.status, 'upcoming_expiration');
  assert.equal(result.shouldNotify, true);
  assert.equal(result.triggerType, 'weekly_window_slot_5');
  assert.equal(result.daysUntilExpiration, 8);
});

test('vence en 7 dias: trigger semanal', () => {
  const result = getCertificationNotificationTrigger('2026-06-05', now);
  assert.equal(result.status, 'upcoming_expiration');
  assert.equal(result.shouldNotify, true);
  assert.equal(result.triggerType, 'weekly_window_slot_5');
  assert.equal(result.daysUntilExpiration, 7);
});

test('vence en 9 dias: trigger semanal', () => {
  const result = getCertificationNotificationTrigger('2026-06-07', now);
  assert.equal(result.status, 'upcoming_expiration');
  assert.equal(result.shouldNotify, true);
  assert.equal(result.triggerType, 'weekly_window_slot_5');
  assert.equal(result.daysUntilExpiration, 9);
});

test('vence en 2 dias: trigger semanal', () => {
  const result = getCertificationNotificationTrigger('2026-05-31', now);
  assert.equal(result.status, 'upcoming_expiration');
  assert.equal(result.shouldNotify, true);
  assert.equal(result.triggerType, 'weekly_window_slot_6');
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

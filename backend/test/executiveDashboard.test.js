import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dashboardMonths, buildDeviationOverview, buildNonconformityOverview,
  buildCertificationOverview, buildExecutiveAlerts, loadExecutiveDashboard, readAllPages
} from '../src/services/dashboard/executiveDashboard.js';

const now = new Date('2026-09-21T15:00:00Z');
const upload = { id: 'annual', year: 2026, metadata: { validThroughMonth: 9 } };
const row = (month, area = 'Cocina', overrides = {}) => ({ uploadId: 'annual', sheetType: 'annual', monthNumber: month, month: String(month), year: 2026, areaSector: area, classification: 'Calidad', ...overrides });

test('six months cross years and use Argentina date at midnight UTC', () => {
  const months = dashboardMonths(new Date('2026-01-01T01:00:00Z'));
  assert.equal(months.at(-1).key, '2025-12');
  assert.equal(months[0].key, '2025-07');
  assert.equal(dashboardMonths(new Date('2026-02-01T12:00:00Z'))[0].key, '2025-09');
});

test('canonical annual source excludes duplicate specialty sheets and shares percentage formula', () => {
  const result = buildDeviationOverview([upload], [row(8), row(9), row(9), row(9, 'Depósito'), row(9, 'Cocina', { sheetType: 'quality' })], now);
  assert.equal(result.current.total, 3);
  assert.equal(result.change.percentage, 200);
  assert.equal(result.topSectors[0].name, 'Cocina');
  assert.equal(result.topSectors[0].value, 2);
  assert.ok(Math.abs(result.topSectors.reduce((sum, item) => sum + item.share, 0) - 100) < 0.001);
});

test('coverage distinguishes unknown, covered zero and unavailable percentages', () => {
  const missing = buildDeviationOverview([], [], now);
  assert.equal(missing.current.total, null);
  assert.equal(missing.change, null);
  const covered = buildDeviationOverview([upload], [row(9)], now);
  assert.equal(covered.previous.total, 0);
  assert.equal(covered.change.percentage, null);
  const stale = buildDeviationOverview([{ ...upload, metadata: { validThroughMonth: 8 } }], [row(9)], now);
  assert.equal(stale.current.total, null);
  const unspecified = buildDeviationOverview([{ ...upload, metadata: {} }], [row(8)], now);
  assert.equal(unspecified.current.total, null);
});

test('NC distinguishes open, explicitly overdue and unknown without inventing deadlines', () => {
  const result = buildNonconformityOverview([{ status: 'Abierto' }, { status: 'Cerrada' }, { status: 'Vencida' }, { status: 'Pendiente' }, { status: null }]);
  assert.equal(result.open, 3);
  assert.equal(result.overdue, 1);
  assert.equal(result.unknown, 1);
  assert.equal(result.deadlineSupported, false);
});

test('certifications include today and day 30, exclude expired/day 31 and surface invalid dates', () => {
  const result = buildCertificationOverview([
    ['old', '2026-09-20'], ['today', '2026-09-21'], ['soon', '2026-09-28'],
    ['limit', '2026-10-21'], ['later', '2026-10-22'], ['invalid', null]
  ].map(([name, expiration_date]) => ({ id: name, name, expiration_date })), now);
  assert.equal(result.count, 3);
  assert.equal(result.expired, 1);
  assert.equal(result.urgent[0].daysUntilExpiration, 0);
  assert.equal(result.urgent[2].daysUntilExpiration, 30);
  assert.equal(result.invalidDates, 1);
});

test('alerts prioritize urgent facts and bound output to 3–5 without fabricating incidents', () => {
  const result = buildExecutiveAlerts({
    deviations: buildDeviationOverview([], [], now), nonconformities: buildNonconformityOverview([]),
    certifications: buildCertificationOverview([], now), errors: {}
  });
  assert.equal(result.length, 3);
  assert.ok(result.every((alert) => alert.severity === 'info'));
  const urgent = buildExecutiveAlerts({
    deviations: buildDeviationOverview([upload], [row(8), row(9), row(9)], now),
    nonconformities: buildNonconformityOverview([{ status: 'Vencida' }]),
    certifications: buildCertificationOverview([{ name: 'ISO', expiration_date: '2026-09-20' }, { name: 'Control', expiration_date: '2026-09-21' }], now), errors: {}
  });
  assert.equal(urgent.length, 5);
  assert.equal(urgent[0].severity, 'error');
  assert.ok(urgent.some((alert) => alert.id === 'nc-overdue'));
});

test('sustained category growth uses completed months, never the partial current month', () => {
  const rows = [row(6), row(7), row(7), row(8), row(8), row(8), row(9)];
  const alerts = buildExecutiveAlerts({ deviations: buildDeviationOverview([upload], rows, now), errors: {} });
  assert.ok(alerts.some((alert) => alert.id === 'category-growth'));
});

test('pagination reads beyond database cap and propagates query errors', async () => {
  const rows = Array.from({ length: 1001 }, (_, id) => ({ id }));
  const result = await readAllPages(() => ({ range: async (from, to) => ({ data: rows.slice(from, to + 1) }) }));
  assert.equal(result.length, 1001);
  await assert.rejects(readAllPages(() => ({ range: async () => ({ error: new Error('database unavailable') }) })), /unavailable/);
});

test('one failing source preserves successful sources and exposes partial availability', async () => {
  const db = { from: (table) => {
    const query = {
      select: () => query, order: () => query, eq: () => query,
      limit: async () => ({ data: [] }),
      range: async () => table === 'customer_nonconformities'
        ? { error: new Error('missing table') } : { data: [] }
    };
    return query;
  } };
  const result = await loadExecutiveDashboard(db, now);
  assert.equal(result.nonconformities, null);
  assert.equal(result.certifications.count, 0);
  assert.equal(result.deviations.current.total, null);
  assert.ok(result.errors.nonconformities);
  assert.equal(result.generatedAt, now.toISOString());
});

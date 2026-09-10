import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDateEnd,
  parseDateStart,
  parseHistoryRequestParams
} from '../src/controllers/analysisController.utils.js';
import {
  getArgentinaDayEndIso,
  getArgentinaDayStartIso
} from '../src/utils/argentinaDateUtils.js';

test('Argentina day boundaries map local midnight/end-of-day to UTC correctly', () => {
  assert.equal(
    getArgentinaDayStartIso('2026-09-10'),
    '2026-09-10T03:00:00.000Z'
  );
  assert.equal(
    getArgentinaDayEndIso('2026-09-10'),
    '2026-09-11T02:59:59.999Z'
  );
});

test('history date parsers no longer depend on server timezone', () => {
  assert.equal(parseDateStart('2026-09-10'), '2026-09-10T03:00:00.000Z');
  assert.equal(parseDateEnd('2026-09-10'), '2026-09-11T02:59:59.999Z');
});

test('history date parsers reject invalid or ambiguous date formats', () => {
  assert.equal(parseDateStart(''), null);
  assert.equal(parseDateEnd(''), null);
  assert.equal(parseDateStart('10/09/2026'), null);
  assert.equal(parseDateEnd('2026-02-31'), null);
});

test('parseHistoryRequestParams applies full Argentina date range', () => {
  const parsed = parseHistoryRequestParams({
    from: '2026-09-01',
    to: '2026-09-10',
    page: 1,
    limit: 10
  });

  assert.equal(parsed.fromDateIso, '2026-09-01T03:00:00.000Z');
  assert.equal(parsed.toDateIso, '2026-09-11T02:59:59.999Z');
  assert.equal(parsed.rangeFrom, 0);
  assert.equal(parsed.rangeTo, 9);
});

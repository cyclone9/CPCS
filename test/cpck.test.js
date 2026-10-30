import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpckClosed, CPCK_PAUSE_MS } from '../src/js/model.js';
import { S } from '../src/js/strings.js';

const NOW = 1_800_000_000_000;

test('the banner stays closed for 24 hours', () => {
  assert.equal(cpckClosed(String(NOW), NOW), true);
  assert.equal(cpckClosed(String(NOW - CPCK_PAUSE_MS + 1), NOW), true);
});

test('the banner shows again at exactly 24 hours', () => {
  assert.equal(cpckClosed(String(NOW - CPCK_PAUSE_MS), NOW), false);
  assert.equal(cpckClosed(String(NOW - CPCK_PAUSE_MS - 1000), NOW), false);
});

test('missing, garbage or future values show the banner', () => {
  for (const stored of [null, undefined, '', ' ', 'garbage', '12abc', 'NaN', '-5', '1.5', String(NOW + 1)]) {
    assert.equal(cpckClosed(stored, NOW), false, String(stored));
  }
});

test('the banner alt text carries the CPCK tagline word for word', () => {
  const tagline = 'شماره‌ی کارت و شبا، دم دست.';
  assert.ok(S.cpckAlt.includes(tagline));
});

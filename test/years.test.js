import { test } from 'node:test';
import assert from 'node:assert/strict';
import { yearRange, START_YEAR } from '../src/js/years.js';

test('copyright years', () => {
  assert.equal(START_YEAR, 2026);
  assert.equal(yearRange(2026), '2026');
  assert.equal(yearRange(2027), '2026–2027');
  assert.equal(yearRange(2031), '2026–2031');
  assert.equal(yearRange(2024), '2026');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cameFromCpck, cpckClosed, CPCK_PAUSE_MS } from '../src/js/model.js';
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

test('a visit from the CPCK app is recognised by utm_source and utm_medium', () => {
  assert.equal(cameFromCpck('?utm_source=cpck&utm_medium=android_app&utm_campaign=about&utm_content=cpcs_tool'), true);
  assert.equal(cameFromCpck('?utm_source=cpck&utm_medium=android_app'), true);
  assert.equal(cameFromCpck('?utm_campaign=other&utm_medium=android_app&utm_source=cpck'), true);
});

test('other visits are not from the CPCK app', () => {
  for (const search of ['', '?', '?utm_source=other', '?utm_source=cpck', '?utm_source=cpck&utm_medium=social', '?utm_source=cpck2&utm_medium=android_app', '?utm_source=CPCK&utm_medium=android_app', '?utm_medium=android_app', '?utm_source=&utm_medium=android_app', '?source=cpck&medium=android_app']) {
    assert.equal(cameFromCpck(search), false, search);
  }
});

test('the banner alt text carries the CPCK tagline word for word', () => {
  const tagline = 'شماره‌ی کارت و شبا، دم دست.';
  assert.ok(S.cpckAlt.includes(tagline));
});

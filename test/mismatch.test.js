import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assess } from '../src/js/model.js';
import { banks, makeCard, makeIban } from './helpers.js';

// Made-up numbers only. Saman: BIN 621986, IBAN code 056. Mellat: BIN 610433, IBAN code 012.
const SAMAN_CARD = makeCard('621986');
const MELLAT_CARD = makeCard('610433');
const base = { number: '', ibanOn: true, iban: '', manualKey: '' };

test('an IBAN of the card\'s own bank is ready', () => {
  const a = assess(banks, { ...base, number: SAMAN_CARD, iban: makeIban('056') });
  assert.equal(a.mismatch, false);
  assert.equal(a.ready, true);
});

test('a Saman card with a Mellat IBAN is blocked', () => {
  const a = assess(banks, { ...base, number: SAMAN_CARD, iban: makeIban('012') });
  assert.equal(a.mismatch, true);
  assert.equal(a.mismatchBank.slug, 'SAMAN');
  assert.equal(a.ready, false);
});

test('picking the IBAN\'s bank by hand does not lift the block', () => {
  const mellat = banks.find((b) => b.slug === 'MELLAT');
  const a = assess(banks, { ...base, number: SAMAN_CARD, iban: makeIban('012'), manualKey: mellat.iban_code ?? '012' });
  assert.equal(a.mismatch, true);
  assert.equal(a.mismatchBank.slug, 'SAMAN');
  assert.equal(a.ready, false);
});

test('a bank picked by hand that differs from the IBAN is blocked too', () => {
  const a = assess(banks, { ...base, number: MELLAT_CARD, iban: makeIban('012'), manualKey: '056' });
  assert.equal(a.mismatch, true);
  assert.equal(a.ready, false);
});

test('bluBank picked by hand with a Saman card and IBAN is ready', () => {
  const a = assess(banks, { ...base, number: SAMAN_CARD, iban: makeIban('056'), manualKey: 'BLU' });
  assert.equal(a.mismatch, false);
  assert.equal(a.ready, true);
});

test('with the IBAN off, its bank does not matter', () => {
  const a = assess(banks, { ...base, ibanOn: false, number: SAMAN_CARD, iban: makeIban('012') });
  assert.equal(a.mismatch, false);
  assert.equal(a.ready, true);
});

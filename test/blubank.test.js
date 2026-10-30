import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bluBankOf, byCode } from '../src/js/banks.js';
import { assess } from '../src/js/model.js';
import { toPersianDigits } from '../src/js/validate.js';
import { banks, makeCard, makeIban } from './helpers.js';

const base = { number: '', ibanOn: false, iban: '', manualKey: '' };
const SAMAN_CARD = makeCard('621986');

test('a Saman card on BIN 621986 can show bluBank', () => {
  const a = assess(banks, { ...base, number: SAMAN_CARD });
  assert.equal(a.bank.slug, 'SAMAN');
  assert.equal(a.bluBank.slug, 'BLU');
  assert.equal(a.bluBank.color, a.bank.color);
});

test('Persian digits and six typed digits are enough, as for bank detection', () => {
  assert.equal(assess(banks, { ...base, number: toPersianDigits(SAMAN_CARD) }).bluBank.slug, 'BLU');
  assert.equal(assess(banks, { ...base, number: '621986' }).bluBank.slug, 'BLU');
  assert.equal(assess(banks, { ...base, number: '62198' }).bluBank, null);
  assert.equal(assess(banks, base).bluBank, null);
});

test('another BIN, even with Saman as the bank, cannot', () => {
  assert.equal(assess(banks, { ...base, number: makeCard('603799') }).bluBank, null);
  assert.equal(assess(banks, { ...base, number: makeCard('603799'), manualKey: '056' }).bluBank, null);
  assert.equal(bluBankOf(banks, byCode(banks, '056'), makeCard('111111')), null);
  assert.equal(bluBankOf(banks, null, SAMAN_CARD), null);
});

test('another bank picked by hand switches it off', () => {
  assert.equal(assess(banks, { ...base, number: SAMAN_CARD, manualKey: '017' }).bluBank, null);
  assert.equal(assess(banks, { ...base, number: SAMAN_CARD, manualKey: 'BLU' }).bluBank, null);
});

test('Saman picked by hand on the same card keeps it', () => {
  assert.equal(assess(banks, { ...base, number: SAMAN_CARD, manualKey: '056' }).bluBank.slug, 'BLU');
});

test('a Saman IBAN gives no mismatch on a card that can show bluBank', () => {
  const a = assess(banks, { ...base, number: SAMAN_CARD, ibanOn: true, iban: makeIban('056') });
  assert.equal(a.mismatch, false);
  assert.equal(a.ready, true);
  assert.equal(assess(banks, { ...base, number: SAMAN_CARD, manualKey: 'BLU', ibanOn: true, iban: makeIban('056') }).mismatch, false);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  toLatinDigits, toPersianDigits, digitsOnly, groupFour, luhnValid, checkCard,
  ibanDigits, ibanMod97, checkIban, ibanBankCode, ibanCheckDigits,
} from '../src/js/validate.js';
import { makeCard, makeIban } from './helpers.js';

test('Persian and Arabic-Indic digits become Latin', () => {
  assert.equal(toLatinDigits('۰۱۲۳۴۵۶۷۸۹'), '0123456789');
  assert.equal(toLatinDigits('٠١٢٣٤٥٦٧٨٩'), '0123456789');
  assert.equal(toLatinDigits('۶۰۳۷-٩٩ ab'), '6037-99 ab');
});

test('Latin digits become Persian', () => {
  assert.equal(toPersianDigits('6037 9900'), '۶۰۳۷ ۹۹۰۰');
  assert.equal(toPersianDigits('IR06'), 'IR۰۶');
});

test('pasted numbers with spaces and dashes', () => {
  assert.equal(digitsOnly(' 6037-99۹۹ ٠٠ '), '6037999900');
  assert.equal(groupFour('6037999900001111'), '6037 9999 0000 1111');
  assert.equal(groupFour('603799'), '6037 99');
});

test('Luhn accepts made-up valid numbers from known BINs', () => {
  for (const bin of ['603799', '610433', '621986', '636214', '589210']) {
    const n = makeCard(bin);
    assert.equal(n.length, 16);
    assert.ok(luhnValid(n), n);
    assert.equal(checkCard(n).state, 'valid');
  }
});

test('Luhn rejects a changed digit and a swapped pair', () => {
  const n = makeCard('603799');
  const last = (Number(n[15]) + 1) % 10;
  assert.equal(checkCard(n.slice(0, 15) + last).state, 'luhn');
  const swapped = n.slice(0, 6) + n[7] + n[6] + n.slice(8);
  if (swapped !== n) assert.equal(luhnValid(swapped), false);
});

test('card states', () => {
  assert.equal(checkCard('').state, 'empty');
  assert.equal(checkCard('6037 99').state, 'short');
  const n = makeCard('603799');
  assert.equal(checkCard(toPersianDigits(groupFour(n))).state, 'valid');
  assert.equal(checkCard(n + '9999').digits, n, 'extra digits are cut at 16');
});

test('IBAN mod-97 on made-up IBANs', () => {
  for (const code of ['017', '012', '056', '062']) {
    const iban = makeIban(code);
    assert.equal(iban.length, 26);
    assert.equal(ibanMod97(iban), 1);
    assert.equal(checkIban(iban).state, 'valid');
  }
});

test('mod-97 matches the ISO 13616 example', () => {
  assert.equal(ibanMod97('GB82WEST12345698765432'), 1);
  const iban = makeIban('017');
  assert.equal(ibanCheckDigits(iban.slice(4)), iban.slice(2, 4));
});

test('IBAN with a wrong digit fails the checksum', () => {
  const iban = makeIban('017');
  const bad = iban.slice(0, 20) + ((Number(iban[20]) + 1) % 10) + iban.slice(21);
  assert.equal(checkIban(bad).state, 'checksum');
});

test('IBAN input: prefix optional, Persian digits, spaces', () => {
  const iban = makeIban('054');
  const typed = toPersianDigits(groupFour(iban.slice(2)));
  assert.equal(ibanDigits(typed), iban.slice(2));
  assert.equal(checkIban(typed).iban, iban);
  assert.equal(checkIban('ir' + iban.slice(2)).state, 'valid');
  assert.equal(checkIban('IR12').state, 'short');
  assert.equal(checkIban('').state, 'empty');
});

test('IBAN bank code sits right after the check digits', () => {
  assert.equal(ibanBankCode(makeIban('017')), '017');
  assert.equal(ibanBankCode(makeIban('095')), '095');
  assert.equal(ibanBankCode('IR12'), null);
  assert.equal(ibanCheckDigits('0170000000000000000123').length, 2);
});

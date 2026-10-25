import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchBanks, selectable } from '../src/js/banks.js';
import { banks } from './helpers.js';

const list = selectable(banks);
const slugs = (q) => searchBanks(list, q).map((b) => b.slug);

test('an empty query or a bare prefix lists every selectable bank', () => {
  assert.equal(slugs('').length, list.length);
  assert.equal(slugs('  ').length, list.length);
  assert.equal(slugs('بانک').length, list.length);
});

test('ZWNJ and spaces are ignored', () => {
  assert.deepEqual(slugs('پست‌بانک'), ['POST']);
  assert.deepEqual(slugs('پستبانک'), ['POST']);
  assert.ok(slugs('ایران‌زمین').includes('IRANZAMIN'));
  assert.ok(slugs('اقتصاد   نوین').includes('EGHTESAD_NOVIN'));
});

test('Arabic ي and ك match Persian ی and ک', () => {
  assert.ok(slugs('ملي').includes('MELLI'));
  assert.deepEqual(slugs('كارآفرين'), ['KARAFARIN']);
});

test('the English name matches, ignoring case', () => {
  assert.deepEqual(slugs('MELLAT'), ['MELLAT']);
  assert.deepEqual(slugs('blubank'), ['BLU']);
  assert.ok(slugs('middle east').includes('KHAVARMIANEH'));
});

test('the «بانک» and «موسسه اعتباری» prefixes are ignored', () => {
  assert.deepEqual(slugs('بانک ملت'), ['MELLAT']);
  assert.deepEqual(slugs('موسسه اعتباری ملل'), ['MELAL']);
  assert.deepEqual(slugs('مؤسسه اعتباری ملل'), ['MELAL']);
  assert.equal(slugs('سپه')[0], 'SEPAH');
});

test('IBAN codes match in Latin, Persian and Arabic digits', () => {
  assert.deepEqual(slugs('017'), ['MELLI']);
  assert.deepEqual(slugs('۰۱۷'), ['MELLI']);
  assert.deepEqual(slugs('٠١٧'), ['MELLI']);
  assert.deepEqual(slugs('056').sort(), ['BLU', 'SAMAN']);
});

test('banks dropped by the owner are not found by name or code', () => {
  for (const q of ['صنعت و معدن', 'توسعه صادرات', 'توسعه تعاون', 'موسسه اعتباری توسعه', 'ونزوئلا', 'industry', 'venezuela', '011', '020', '022', '051', '095']) {
    assert.deepEqual(slugs(q), [], q);
  }
});

test('no match gives an empty list', () => {
  assert.deepEqual(slugs('zzz'), []);
});

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

test('the banks re-added on 2026-10-26 are found by name and code', () => {
  for (const [q, slug] of [
    ['صنعت و معدن', 'SANAT_VA_MADAN'], ['industry', 'SANAT_VA_MADAN'], ['011', 'SANAT_VA_MADAN'],
    ['توسعه صادرات', 'EXPORT_DEVELOPMENT'], ['export', 'EXPORT_DEVELOPMENT'], ['020', 'EXPORT_DEVELOPMENT'],
    ['توسعه تعاون', 'TOSEAH_TAAVON'], ['022', 'TOSEAH_TAAVON'],
    ['ونزوئلا', 'IRAN_VENEZUELA'], ['venezuela', 'IRAN_VENEZUELA'], ['095', 'IRAN_VENEZUELA'],
  ]) {
    assert.equal(slugs(q)[0], slug, q);
  }
});

test('the Tose\'e credit institution\'s name and IBAN code find Tose\'e Ta\'avon', () => {
  for (const q of ['051', 'موسسه اعتباری توسعه', 'اعتباری توسعه', 'Tose\'e Credit']) {
    assert.equal(slugs(q)[0], 'TOSEAH_TAAVON', q);
  }
  assert.ok(!slugs('051').includes('TOSEAH'));
});

test('no match gives an empty list', () => {
  assert.deepEqual(slugs('zzz'), []);
});

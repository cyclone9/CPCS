import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { detectByBin, detectByIbanCode, selectable, ibanCodeOf, byCode, formerName } from '../src/js/banks.js';
import { ibanBankCode, groupFour, toPersianDigits } from '../src/js/validate.js';
import { assess } from '../src/js/model.js';
import { banks, makeCard, makeIban } from './helpers.js';

const MERGED_BINS = ['627381', '636949', '639599', '505801', '636214', '507677'];
const MERGED_CODES = ['052', '062', '063', '065', '073', '080'];
// Owner, 2026-10-26: dropped, then re-added the same day with their CPIK logos.
const READDED = { SANAT_VA_MADAN: ['011', ['627961']], EXPORT_DEVELOPMENT: ['020', ['207177', '627648']],
  TOSEAH_TAAVON: ['022', ['502908']], IRAN_VENEZUELA: ['095', ['581874']] };
const base = { number: '', ibanOn: false, iban: '', manualKey: '' };

test('a current bank is detected from its BIN', () => {
  const m = detectByBin(banks, makeCard('603799'));
  assert.equal(m.bank.slug, 'MELLI');
  assert.equal(m.supported, true);
  assert.equal(m.successor, null);
});

test('a renamed bank is detected normally', () => {
  const m = detectByBin(banks, makeCard('504172'));
  assert.equal(m.bank.slug, 'RESALAT');
  assert.equal(m.supported, true);
});

test('a merged bank is unsupported and only named, Ghavamin included', () => {
  for (const bin of MERGED_BINS) {
    const m = detectByBin(banks, makeCard(bin));
    assert.equal(m.supported, false, bin);
    assert.ok(m.successor, bin);
  }
  const ayandeh = detectByBin(banks, makeCard('636214'));
  assert.equal(formerName(ayandeh.bank), 'بانک آینده');
  assert.equal(ayandeh.successor.slug, 'MELLI');
  assert.equal(detectByBin(banks, makeCard('639599')).bank.slug, 'GHAVAMIN');
});

test('an unknown BIN or a short prefix gives no bank', () => {
  assert.equal(detectByBin(banks, makeCard('123456')), null);
  assert.equal(detectByBin(banks, '60379'), null);
});

test('the bank is detected from an IBAN code; merged codes are unsupported', () => {
  assert.equal(detectByIbanCode(banks, ibanBankCode(makeIban('054'))).bank.slug, 'PARSIAN');
  for (const code of MERGED_CODES) assert.equal(detectByIbanCode(banks, code).supported, false, code);
  assert.equal(detectByIbanCode(banks, '999'), null);
});

test('the bank list has supported banks and bluBank, no merged ones', () => {
  const list = selectable(banks);
  assert.ok(list.some((b) => b.slug === 'BLU'));
  assert.ok(!list.some((b) => MERGED_CODES.includes(b.code)));
  assert.equal(ibanCodeOf(list.find((b) => b.slug === 'BLU')), '056');
});

test('valid card from an active bank: drawn and downloadable', () => {
  const a = assess(banks, { ...base, number: toPersianDigits(groupFour(makeCard('610433'))) });
  assert.equal(a.bank.slug, 'MELLAT');
  assert.equal(a.ready, true);
});

test('invalid card: download disabled', () => {
  const n = makeCard('610433');
  assert.equal(assess(banks, { ...base, number: n.slice(0, 15) + ((Number(n[15]) + 1) % 10) }).ready, false);
  assert.equal(assess(banks, { ...base, number: n.slice(0, 12) }).ready, false);
});

test('merged BIN: warning, no bank drawn, download disabled even with a bank picked', () => {
  for (const bin of MERGED_BINS) {
    const a = assess(banks, { ...base, number: makeCard(bin) });
    assert.equal(a.card.state, 'valid', bin);
    assert.equal(a.cardUnsupported, true, bin);
    assert.equal(a.bank, null, bin);
    assert.equal(a.ready, false, bin);
  }
  const picked = assess(banks, { ...base, number: makeCard('636214'), manualKey: '017' });
  assert.equal(picked.cardUnsupported, true);
  assert.equal(picked.ready, false);
});

test('merged IBAN code: warning and download disabled while the IBAN option is on', () => {
  const number = makeCard('603799');
  for (const code of MERGED_CODES) {
    const a = assess(banks, { ...base, number, ibanOn: true, iban: makeIban(code) });
    assert.equal(a.ibanCheck.state, 'valid', code);
    assert.equal(a.ibanUnsupported, true, code);
    assert.equal(a.ready, false, code);
    assert.equal(assess(banks, { ...base, number, ibanOn: false, iban: makeIban(code) }).ready, true, code);
  }
});

test('IBAN option: needs a valid IBAN; a different bank only warns', () => {
  const number = makeCard('603799');
  assert.equal(assess(banks, { ...base, number, ibanOn: true, iban: '' }).ready, false);
  const same = assess(banks, { ...base, number, ibanOn: true, iban: toPersianDigits(makeIban('017').slice(2)) });
  assert.equal(same.ready, true);
  assert.equal(same.mismatch, false);
  const other = assess(banks, { ...base, number, ibanOn: true, iban: makeIban('054') });
  assert.equal(other.mismatch, true);
  assert.equal(other.ready, true);
});

test('unknown BIN: valid number, but no bank and no download, even with a bank picked by hand', () => {
  const number = makeCard('123456');
  const a = assess(banks, { ...base, number });
  assert.equal(a.bank, null);
  assert.equal(a.cardUnknown, true);
  assert.equal(a.ready, false);
  assert.equal(assess(banks, { ...base, number, manualKey: 'BLU' }).ready, false);
  assert.equal(assess(banks, { ...base, number: makeCard('621986'), manualKey: 'BLU' }).ready, true);
});

test('re-added banks are detected from their BINs and IBAN codes, with a logo and a colour', () => {
  for (const [slug, [code, bins]] of Object.entries(READDED)) {
    for (const bin of bins) {
      const m = detectByBin(banks, makeCard(bin));
      assert.equal(m.bank.slug, slug, bin);
      assert.equal(m.supported, true, bin);
      const a = assess(banks, { ...base, number: makeCard(bin), ibanOn: true, iban: makeIban(code) });
      assert.equal(a.bank.slug, slug, bin);
      assert.equal(a.mismatch, false, bin);
      assert.equal(a.ready, true, bin);
    }
    assert.equal(detectByIbanCode(banks, code).bank.slug, slug, code);
    assert.ok(selectable(banks).some((b) => b.slug === slug), slug);
    const b = banks.find((x) => x.slug === slug);
    assert.ok(b.logo, slug);
    assert.notEqual(b.color, '#2A1C21', slug);
  }
});

test('Tose\'e credit institution BIN and IBAN code detect as Tose\'e Ta\'avon, fully supported', () => {
  const number = makeCard('628157');
  const m = detectByBin(banks, number);
  assert.equal(m.bank.slug, 'TOSEAH_TAAVON');
  assert.equal(m.supported, true);
  assert.equal(m.successor, null);
  assert.equal(detectByIbanCode(banks, '051').bank.slug, 'TOSEAH_TAAVON');
  for (const [num, code] of [[number, '051'], [number, '022'], [makeCard('502908'), '051']]) {
    const a = assess(banks, { ...base, number: num, ibanOn: true, iban: makeIban(code) });
    assert.equal(a.bank.slug, 'TOSEAH_TAAVON', code);
    assert.equal(a.ibanMatch.bank.slug, 'TOSEAH_TAAVON', code);
    assert.equal(a.cardUnsupported, false, code);
    assert.equal(a.ibanUnsupported, false, code);
    assert.equal(a.mismatch, false, code);
    assert.equal(a.ready, true, code);
  }
  assert.ok(!banks.some((b) => b.slug === 'TOSEAH' || b.code === '051'), 'no entry of its own');
});

test('banks.json is consistent', () => {
  const bins = banks.flatMap((b) => b.bins);
  assert.equal(new Set(bins).size, bins.length, 'BINs are unique');
  for (const b of banks) {
    assert.equal(b.supported, b.status !== 'merged' && b.enabled, b.slug);
    if (b.status === 'merged') assert.ok(byCode(banks, b.merged_into), b.slug);
    if (b.supported) assert.match(b.color, /^#[0-9A-F]{6}$/, b.slug);
    else assert.equal(b.logo, null, b.slug);
  }
  assert.deepEqual(banks.filter((b) => !b.supported).map((b) => b.code).sort(), MERGED_CODES);
  assert.equal(banks.length, 36);
  assert.equal(bins.length, 49);
});

test('every bank logo has its SVG in assets/banks/', () => {
  for (const b of banks) {
    if (b.logo) assert.ok(existsSync(new URL(`../assets/banks/${b.logo}.svg`, import.meta.url)), b.slug);
  }
  const logo = (slug) => banks.find((b) => b.slug === slug).logo;
  assert.equal(logo('REFAH'), 'bank-refah');
  assert.equal(logo('MEHR_IRAN'), 'bank-mehriran');
  assert.equal(logo('MELAL'), 'bank-melal');
});

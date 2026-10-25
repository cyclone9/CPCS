// Bank lookup over the list in data/banks.json. Pure: the list is passed in, so tests can use it directly.
// Only supported (active) banks are drawn. Merged or disabled banks are kept so a warning can name them.
import { toLatinDigits } from './validate.js';

/**
 * @typedef {{code: string|null, slug: string, fa: string, en: string, status: 'active'|'renamed'|'merged',
 *   enabled: boolean, supported: boolean, bins: string[], logo: string|null, color?: string, old_fa?: string,
 *   old_en?: string, merged_into?: string, same_as?: string, manual?: boolean}} Bank
 * @typedef {{bank: Bank, supported: boolean, successor: Bank|null}} Match
 *   successor is the bank a merged bank joined; it is only named, never drawn
 */

export function byCode(banks, code) {
  return banks.find((b) => b.code === code) ?? null;
}

function match(banks, bank) {
  if (!bank) return null;
  return {
    bank,
    supported: bank.supported,
    successor: bank.status === 'merged' ? byCode(banks, bank.merged_into) : null,
  };
}

/** @returns {Match|null} from the first six digits; null when fewer than six or unknown */
export function detectByBin(banks, digits) {
  if (!digits || digits.length < 6) return null;
  const bin = digits.slice(0, 6);
  return match(banks, banks.find((b) => b.bins.includes(bin)));
}

/** @returns {Match|null} from a 3-digit IBAN bank code */
export function detectByIbanCode(banks, code) {
  if (!code) return null;
  return match(banks, byCode(banks, code));
}

/** The name an unsupported bank went by: its old name when it merged, else its name. */
export function formerName(bank) {
  return bank.old_fa ?? bank.fa;
}

/** Banks the user can pick by hand: supported banks only, bluBank included. */
export function selectable(banks) {
  const collator = new Intl.Collator('fa');
  return banks.filter((b) => b.supported).sort((a, b) => collator.compare(a.fa, b.fa));
}

/** The code a bank answers to in an IBAN (bluBank uses Saman's). */
export function ibanCodeOf(bank) {
  return bank?.same_as ?? bank?.code ?? null;
}

/** Stable key for a bank in the select, since manual banks have no code. */
export function keyOf(bank) {
  return bank.code ?? bank.slug;
}

const FOLD = { 'ي': 'ی', 'ى': 'ی', 'ك': 'ک', 'ؤ': 'و', 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ة': 'ه' };
// Compared with spaces and ZWNJ removed, so these are the folded forms.
const PREFIXES = ['موسسهاعتباری', 'بانک', 'bankof', 'bank'];

/** Folds a name or a query for matching: Latin digits, lower case, one form per letter, no spaces, ZWNJ or marks. */
export function foldForSearch(text) {
  return toLatinDigits(text)
    .toLowerCase()
    .replace(/[يىكؤأإآة]/g, (c) => FOLD[c])
    .replace(/[\s‌‍ـً-ْ'’‘\-.]/g, '');
}

function stripPrefix(folded) {
  const p = PREFIXES.find((x) => folded.startsWith(x));
  return p ? folded.slice(p.length) : folded;
}

/**
 * Banks whose Persian or English name, or IBAN code, matches the query; the list's order is kept,
 * names that start with the query first. An empty query (or just a prefix such as «بانک») returns the whole list.
 */
export function searchBanks(list, query) {
  const q = foldForSearch(query);
  const core = stripPrefix(q);
  if (!core) return list.slice();
  const digits = /^[0-9]+$/.test(q);
  const hits = [];
  for (const b of list) {
    if (digits) {
      if (ibanCodeOf(b)?.startsWith(q)) hits.push({ b, rank: 0 });
      continue;
    }
    let rank = Infinity;
    for (const name of [b.fa, b.en]) {
      const full = foldForSearch(name);
      const bare = stripPrefix(full);
      if (bare.startsWith(core)) rank = Math.min(rank, 0);
      else if (bare.includes(core) || full.includes(q)) rank = Math.min(rank, 1);
    }
    if (rank !== Infinity) hits.push({ b, rank });
  }
  return hits.sort((x, y) => x.rank - y.rank).map((h) => h.b);
}

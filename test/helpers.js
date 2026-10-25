// Builders for made-up card numbers and IBANs. Nothing here is a real account.
import { readFileSync } from 'node:fs';

export const banks = JSON.parse(readFileSync(new URL('../src/data/banks.json', import.meta.url), 'utf8'));

/** A 16-digit number with the given prefix, padded with a fixed pattern, and a correct Luhn digit. */
export function makeCard(prefix) {
  const body = (prefix + '0123456789').slice(0, 15);
  for (let d = 0; d <= 9; d++) {
    const n = body + d;
    if (luhnSum(n) % 10 === 0) return n;
  }
  throw new Error('unreachable');
}

function luhnSum(n) {
  let s = 0;
  for (let i = 0; i < n.length; i++) {
    let d = Number(n[n.length - 1 - i]);
    if (i % 2) d = d * 2 > 9 ? d * 2 - 9 : d * 2;
    s += d;
  }
  return s;
}

/** "IR" + check digits + bank code + made-up account digits. */
export function makeIban(code) {
  const bban = (code + '0000000000000000000123').slice(0, 22);
  return 'IR' + checkDigits(bban) + bban;
}

// Computed with BigInt, independently of the app's chunked mod-97. I=18, R=27.
function checkDigits(bban) {
  const rem = BigInt(bban + '1827' + '00') % 97n;
  return String(98n - rem).padStart(2, '0');
}

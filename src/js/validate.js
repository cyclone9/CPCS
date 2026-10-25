// Pure checks and digit handling for card numbers and IBANs. No DOM, so node --test can import it.

const PERSIAN_ZERO = 0x06f0; // ۰ Extended Arabic-Indic
const ARABIC_ZERO = 0x0660; // ٠ Arabic-Indic

/** Persian and Arabic-Indic digits to Latin; everything else unchanged. */
export function toLatinDigits(text) {
  return String(text).replace(/[۰-۹٠-٩]/g, (d) => {
    const c = d.charCodeAt(0);
    return String(c - (c >= PERSIAN_ZERO ? PERSIAN_ZERO : ARABIC_ZERO));
  });
}

/** Latin digits to Persian (۰-۹); everything else unchanged. */
export function toPersianDigits(text) {
  return String(text).replace(/[0-9]/g, (d) => String.fromCharCode(PERSIAN_ZERO + Number(d)));
}

/** Only the digits of the input, as Latin digits. */
export function digitsOnly(text) {
  return toLatinDigits(text).replace(/[^0-9]/g, '');
}

/** "1234567890" -> "1234 5678 90" */
export function groupFour(text) {
  return String(text).replace(/(.{4})(?=.)/g, '$1 ');
}

export function luhnValid(digits) {
  if (!/^[0-9]+$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = digits.charCodeAt(digits.length - 1 - i) - 48;
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export const CARD_LENGTH = 16;

/**
 * @returns {{digits: string, state: 'empty'|'short'|'luhn'|'valid'}}
 */
export function checkCard(input) {
  const digits = digitsOnly(input).slice(0, CARD_LENGTH);
  if (!digits) return { digits, state: 'empty' };
  if (digits.length < CARD_LENGTH) return { digits, state: 'short' };
  return { digits, state: luhnValid(digits) ? 'valid' : 'luhn' };
}

export const IBAN_DIGITS = 24;

/** The 24 digits after "IR", from input with or without the prefix, spaces, dashes or Persian digits. */
export function ibanDigits(input) {
  const s = toLatinDigits(input).toUpperCase().replace(/^\s*IR/, '');
  return s.replace(/[^0-9]/g, '').slice(0, IBAN_DIGITS);
}

/** ISO 13616 / ISO 7064 mod 97-10 on a full IBAN such as "IR06...". */
export function ibanMod97(iban) {
  const moved = iban.slice(4) + iban.slice(0, 4);
  let rem = 0;
  for (const ch of moved) {
    const v = ch >= 'A' && ch <= 'Z' ? String(ch.charCodeAt(0) - 55) : ch;
    for (const d of v) rem = (rem * 10 + (d.charCodeAt(0) - 48)) % 97;
  }
  return rem;
}

/**
 * @returns {{iban: string, state: 'empty'|'short'|'checksum'|'valid'}} iban is "IR" + the digits so far
 */
export function checkIban(input) {
  const digits = ibanDigits(input);
  const iban = digits ? 'IR' + digits : '';
  if (!digits) return { iban, state: 'empty' };
  if (digits.length < IBAN_DIGITS) return { iban, state: 'short' };
  return { iban, state: ibanMod97(iban) === 1 ? 'valid' : 'checksum' };
}

/**
 * The bank's 3-digit code: the first three BBAN digits (IBAN characters 5-7, right after the
 * check digits). Every code starts with 0, which is the "leading zero" people see in "IRkk 0bbb".
 */
export function ibanBankCode(iban) {
  return /^IR[0-9]{5}/.test(iban) ? iban.slice(4, 7) : null;
}

/** Computes the two check digits for "IR" + 22 BBAN digits. Used by the tests to build made-up IBANs. */
export function ibanCheckDigits(bban) {
  const rem = ibanMod97('IR00' + bban);
  return String(98 - rem).padStart(2, '0');
}

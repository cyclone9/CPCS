// What the form's inputs mean: the bank to draw, the warnings, and whether a download is allowed. No DOM.
import { checkCard, checkIban, ibanBankCode } from './validate.js';
import { bluBankOf, detectByBin, detectByIbanCode, ibanCodeOf, keyOf } from './banks.js';

/**
 * @param {import('./banks.js').Bank[]} banks
 * @param {{number: string, ibanOn: boolean, iban: string, manualKey: string}} input  manualKey '' = automatic
 */
export function assess(banks, { number, ibanOn, iban, manualKey }) {
  const card = checkCard(number);
  const cardMatch = detectByBin(banks, card.digits);
  const cardUnsupported = Boolean(cardMatch && !cardMatch.supported);
  // Only cards of known, active banks are drawn for download; picking a bank by hand doesn't lift this.
  const cardUnknown = card.digits.length >= 6 && !cardMatch;

  const manual = manualKey ? banks.find((b) => b.supported && keyOf(b) === manualKey) ?? null : null;
  // A merged or disabled bank is never drawn and never stands in for its successor.
  const bank = manual ?? (cardMatch?.supported ? cardMatch.bank : null);

  const ibanCheck = ibanOn ? checkIban(iban) : null;
  const ibanMatch = ibanCheck?.state === 'valid' ? detectByIbanCode(banks, ibanBankCode(ibanCheck.iban)) : null;
  const ibanUnsupported = Boolean(ibanMatch && !ibanMatch.supported);
  const mismatch = Boolean(bank && ibanMatch?.supported && ibanCodeOf(bank) !== ibanCodeOf(ibanMatch.bank));

  const ready = card.state === 'valid' && !cardUnsupported && !cardUnknown && (!ibanOn || (ibanCheck.state === 'valid' && !ibanUnsupported));

  const bluBank = bluBankOf(banks, bank, card.digits);

  return { card, cardMatch, cardUnsupported, cardUnknown, bank, bluBank, ibanCheck, ibanMatch, ibanUnsupported, mismatch, ready };
}

export const CPCK_PAUSE_MS = 24 * 60 * 60 * 1000;

/** Whether the CPCK banner stays closed. A future timestamp (clock moved back) doesn't count, so it can't hide the banner for good. */
export function cpckClosed(stored, now) {
  if (!/^\d+$/.test(stored)) return false;
  const age = now - Number(stored);
  return age >= 0 && age < CPCK_PAUSE_MS;
}

/** Whether this visit came from the CPCK app. Source and medium both count, so a CPCK link elsewhere doesn't pass; the app can change its campaign and content. */
export function cameFromCpck(search) {
  const params = new URLSearchParams(search);
  return params.get('utm_source') === 'cpck' && params.get('utm_medium') === 'android_app';
}

/** The stored card choices that are still valid. allowed maps each key to the values offered now, so anything else is dropped. */
export function parseChoices(raw, allowed) {
  let stored;
  try {
    stored = JSON.parse(raw);
  } catch {
    return {};
  }
  const choices = {};
  for (const [key, values] of Object.entries(allowed)) {
    if (values.includes(stored?.[key])) choices[key] = stored[key];
  }
  return choices;
}

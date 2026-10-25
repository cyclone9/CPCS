// The copyright years. Pure, so node --test can import it.

export const START_YEAR = 2026;

/** "2026" in the first year (or when the clock is behind it), then "2026–2027" and so on, with an en dash. */
export function yearRange(current, start = START_YEAR) {
  return current > start ? `${start}–${current}` : String(start);
}

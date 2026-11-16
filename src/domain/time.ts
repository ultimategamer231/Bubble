/**
 * Calendar-day helpers. A "date key" is a local calendar day as `YYYY-MM-DD`.
 * All maths is done in UTC on the already-shifted timestamp, so results never depend
 * on the timezone of the machine running the code.
 */

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

const pad2 = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

/**
 * Local calendar day of `epochMs` for a zone `tzOffsetMin` minutes east of UTC
 * (Monrovia = 0, Berlin in winter = 60, New York in winter = -300).
 */
export function localDateOf(epochMs: number, tzOffsetMin: number): string {
  const d = new Date(epochMs + tzOffsetMin * MINUTE_MS);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** Days since 1970-01-01 for a date key. */
export function dayNumber(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function dateKeyFromDayNumber(day: number): string {
  const d = new Date(day * DAY_MS);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export function addDays(dateKey: string, days: number): string {
  return dateKeyFromDayNumber(dayNumber(dateKey) + days);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(dateKey: string): number {
  return new Date(dayNumber(dateKey) * DAY_MS).getUTCDay();
}

/** Milliseconds from `epochMs` until the next local midnight (always 1…86 400 000). */
export function msUntilNextMidnight(epochMs: number, tzOffsetMin: number): number {
  const local = epochMs + tzOffsetMin * MINUTE_MS;
  return DAY_MS - (((local % DAY_MS) + DAY_MS) % DAY_MS);
}

/**
 * Statistics (docs/DATA_MODEL.md → Statistics). Pure functions over history rows.
 * Only bubbles count: type FOCUS + status COMPLETED. Breaks, cancelled and interrupted
 * sessions are ignored everywhere. Days come from the stored `localDate`, never recomputed.
 */
import { addDays, dayNumber, weekdayOf } from '../time';

/** The fields of a history row that statistics need. */
export type StatRow = {
  type: string;
  status: string;
  localDate: string;
  focusedMs: number;
};

export const isBubble = (row: Pick<StatRow, 'type' | 'status'>): boolean =>
  row.type === 'FOCUS' && row.status === 'COMPLETED';

export type Totals = { sessions: number; focusedMs: number };

/** Bubbles and focus time for one day. */
export function totalsForDay(rows: readonly StatRow[], dateKey: string): Totals {
  return totals(rows.filter((r) => r.localDate === dateKey));
}

/** Bubbles and focus time over all rows given. */
export function totals(rows: readonly StatRow[]): Totals {
  let sessions = 0;
  let focusedMs = 0;
  for (const r of rows) {
    if (!isBubble(r)) continue;
    sessions += 1;
    focusedMs += r.focusedMs;
  }
  return { sessions, focusedMs };
}

export type DayBar = {
  dateKey: string;
  /** 0 = Sunday … 6 = Saturday. */
  weekday: number;
  focusedMs: number;
  /** Whole minutes, floored (what the bar label shows). */
  minutes: number;
  sessions: number;
  isToday: boolean;
};

/** Seven entries ending today, oldest first, zero-filled. */
export function lastSevenDays(rows: readonly StatRow[], today: string): DayBar[] {
  const byDay = new Map<string, Totals>();
  for (const r of rows) {
    if (!isBubble(r)) continue;
    const t = byDay.get(r.localDate) ?? { sessions: 0, focusedMs: 0 };
    byDay.set(r.localDate, { sessions: t.sessions + 1, focusedMs: t.focusedMs + r.focusedMs });
  }
  const out: DayBar[] = [];
  for (let i = 6; i >= 0; i--) {
    const dateKey = addDays(today, -i);
    const t = byDay.get(dateKey) ?? { sessions: 0, focusedMs: 0 };
    out.push({
      dateKey,
      weekday: weekdayOf(dateKey),
      focusedMs: t.focusedMs,
      minutes: wholeMinutes(t.focusedMs),
      sessions: t.sessions,
      isToday: i === 0,
    });
  }
  return out;
}

/** The set of days that have at least one bubble. */
export function bubbleDays(rows: readonly StatRow[]): Set<string> {
  const days = new Set<string>();
  for (const r of rows) if (isBubble(r)) days.add(r.localDate);
  return days;
}

/**
 * Consecutive days with a bubble, ending today — or ending yesterday when today has none
 * yet (the streak stays alive until today is over). 0 if neither day has a bubble.
 */
export function currentStreak(days: ReadonlySet<string>, today: string): number {
  let cursor = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Longest run of consecutive bubble days ever. */
export function bestStreak(days: ReadonlySet<string>): number {
  const sorted = [...days].map(dayNumber).sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let previous = Number.NaN;
  for (const day of sorted) {
    run = day === previous + 1 ? run + 1 : 1;
    if (run > best) best = run;
    previous = day;
  }
  return best;
}

export const wholeMinutes = (ms: number): number => Math.floor(ms / 60_000);

/** `1 h 40 m`, `25 m`, `0 m` — for totals. No decimals. */
export function formatTotal(ms: number): string {
  const minutes = wholeMinutes(ms);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} m`;
  return `${h} h ${m} m`;
}

/** `25 min`, `1 h 30 min` — for a single session's length. */
export function formatSessionLength(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export type InsightsSummary = {
  today: Totals;
  currentStreak: number;
  bestStreak: number;
  week: DayBar[];
  allTime: Totals;
};

/** Everything the Insights screen shows, from all history rows and today's date. */
export function summarize(rows: readonly StatRow[], today: string): InsightsSummary {
  const days = bubbleDays(rows);
  return {
    today: totalsForDay(rows, today),
    currentStreak: currentStreak(days, today),
    bestStreak: bestStreak(days),
    week: lastSevenDays(rows, today),
    allTime: totals(rows),
  };
}

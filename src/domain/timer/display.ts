/** Read-only helpers for showing a timer. Pure. */
import { remainingMsAt } from './reduce';
import type { ActiveTimer, Now } from './types';

/** Share of the session that has passed, 0…1 (liquid level). */
export function progressAt(state: ActiveTimer, now: Now): number {
  if (state.durationMs <= 0) return 0;
  const done = 1 - remainingMsAt(state, now) / state.durationMs;
  return Math.min(1, Math.max(0, done));
}

/** Whole seconds left, rounded up so the display reads 25:00 at the start and 00:00 only at the end. */
export function remainingSeconds(remainingMs: number): number {
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

const pad2 = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

/** `mm:ss`, or `h:mm:ss` from one hour up. */
export function formatClock(remainingMs: number): string {
  const total = remainingSeconds(remainingMs);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`;
}

/** Focus time banked so far (excludes pauses). */
export function focusedMsAt(state: ActiveTimer, now: Now): number {
  return state.durationMs - remainingMsAt(state, now);
}

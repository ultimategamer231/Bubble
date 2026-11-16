/**
 * The timer state machine. One pure function, no side effects, no clocks of its own.
 *
 *   reduce(state, command, now, settings) → { next, effects }
 *
 * Rules that everything else relies on (docs/ARCHITECTURE.md §3–§5):
 * - Remaining time while running = deadline − now. Nothing counts down.
 * - Every command is idempotent, and a command for an old session ID is ignored.
 * - A session only becomes COMPLETED by catching up with the clock ("reconcile"), which
 *   every command does first. That produces exactly one RecordSession per session ID.
 * - A RUNNING session found after a reboot is INTERRUPTED (no bubble). PAUSED survives.
 * - A focus session never starts unless the user is there to see it.
 */
import { bubbleColorIndex } from '../bubbles';
import { normalizeIntent, type Settings } from '../settings';
import { localDateOf } from '../time';
import {
  SESSION_SCHEMA_VERSION,
  type ActiveTimer,
  type Command,
  type Effect,
  type Now,
  type ReduceResult,
  type SessionOutcome,
  type SessionRecord,
  type SessionType,
} from './types';

const MINUTE_MS = 60_000;

/**
 * Focus may auto-start after a break only if the break's end is noticed this quickly while
 * the app is open — i.e. the user really was there when it ended.
 */
export const AUTO_START_FOCUS_MAX_LATE_MS = 5_000;

/** Safety cap on chained transitions in one foreground Reconcile. */
const MAX_FOREGROUND_CHAIN = 4;

// ── Helpers ────────────────────────────────────────────────────────────────

export function durationMsFor(type: SessionType, settings: Settings): number {
  const minutes =
    type === 'FOCUS'
      ? settings.focusMin
      : type === 'SHORT_BREAK'
        ? settings.shortBreakMin
        : settings.longBreakMin;
  return minutes * MINUTE_MS;
}

/** Which break follows a focus session, given the focus count after it finished. */
export function breakTypeAfter(cycleCompleted: number, settings: Settings): SessionType {
  return cycleCompleted >= settings.longBreakEvery ? 'LONG_BREAK' : 'SHORT_BREAK';
}

/** A long break (taken or skipped) closes the cycle. */
function cycleAfterBreak(breakType: SessionType, cycleCompleted: number): number {
  return breakType === 'LONG_BREAK' ? 0 : cycleCompleted;
}

/** A fresh, not-yet-started session. */
function prepare(
  type: SessionType,
  sessionId: string,
  settings: Settings,
  carry: Pick<ActiveTimer, 'intent' | 'cycleCompleted' | 'interruptedNoticePending'>,
): ActiveTimer {
  const durationMs = durationMsFor(type, settings);
  return {
    sessionId,
    type,
    status: 'IDLE',
    intent: carry.intent,
    durationMs,
    remainingMs: durationMs,
    deadlineElapsedMs: null,
    bootCount: null,
    startedAtEpochMs: null,
    focusedMsBeforePause: 0,
    cycleCompleted: carry.cycleCompleted,
    interruptedNoticePending: carry.interruptedNoticePending,
  };
}

/** The very first state on a fresh install. */
export function createInitialTimer(sessionId: string, settings: Settings): ActiveTimer {
  return prepare('FOCUS', sessionId, settings, {
    intent: null,
    cycleCompleted: 0,
    interruptedNoticePending: false,
  });
}

/** Starts `timer` (which must be IDLE) with a deadline of `fromElapsedMs + duration`. */
function run(
  timer: ActiveTimer,
  fromElapsedMs: number,
  startedAtEpochMs: number,
  now: Now,
): ActiveTimer {
  return {
    ...timer,
    status: 'RUNNING',
    remainingMs: timer.durationMs,
    deadlineElapsedMs: fromElapsedMs + timer.durationMs,
    bootCount: now.bootCount,
    startedAtEpochMs,
    focusedMsBeforePause: 0,
    interruptedNoticePending: false,
  };
}

/** Time left right now. */
export function remainingMsAt(state: ActiveTimer, now: Now): number {
  if (state.status !== 'RUNNING' || state.deadlineElapsedMs === null) return state.remainingMs;
  return Math.min(state.durationMs, Math.max(0, state.deadlineElapsedMs - now.elapsedMs));
}

/** True when a RUNNING session can no longer be trusted because the phone restarted. */
export function isInterruptedByReboot(state: ActiveTimer, now: Now): boolean {
  if (state.status !== 'RUNNING' || state.deadlineElapsedMs === null) return false;
  if (now.bootCount !== state.bootCount) return true;
  // Monotonic clock is behind the moment this run started: it must have been reset.
  const runStartedElapsedMs =
    state.deadlineElapsedMs - (state.durationMs - state.focusedMsBeforePause);
  return now.elapsedMs < runStartedElapsedMs;
}

function record(
  state: ActiveTimer,
  status: SessionOutcome,
  focusedMs: number,
  endedAtEpochMs: number,
  now: Now,
): SessionRecord {
  const isBubble = state.type === 'FOCUS' && status === 'COMPLETED';
  return {
    id: state.sessionId,
    type: state.type,
    status,
    intent: state.type === 'FOCUS' ? state.intent : null,
    plannedMs: state.durationMs,
    focusedMs: Math.min(state.durationMs, Math.max(0, Math.round(focusedMs))),
    startedAtEpochMs: state.startedAtEpochMs ?? endedAtEpochMs,
    endedAtEpochMs,
    localDate: localDateOf(endedAtEpochMs, now.tzOffsetMin),
    tzOffsetMin: now.tzOffsetMin,
    cycleIndex: state.cycleCompleted,
    bubbleColor: isBubble ? bubbleColorIndex(state.sessionId) : null,
    schemaVersion: SESSION_SCHEMA_VERSION,
  };
}

/**
 * Everything the phone should show for a state: alarm, ongoing notification, widget.
 * Safe to run again at any time; this is how effects are re-applied after a crash.
 */
export function platformEffectsFor(state: ActiveTimer): Effect[] {
  switch (state.status) {
    case 'RUNNING':
      return [
        {
          type: 'ScheduleAlarm',
          sessionId: state.sessionId,
          deadlineElapsedMs: state.deadlineElapsedMs!,
        },
        { type: 'ShowOngoing', sessionId: state.sessionId },
        { type: 'UpdateWidget' },
      ];
    case 'PAUSED':
      return [
        { type: 'CancelAlarm' },
        { type: 'ShowOngoing', sessionId: state.sessionId },
        { type: 'UpdateWidget' },
      ];
    default:
      return [
        { type: 'CancelAlarm' },
        { type: 'ClearNotifications', which: 'ongoing' },
        { type: 'UpdateWidget' },
      ];
  }
}

const unchanged = (state: ActiveTimer): ReduceResult => ({ next: state, effects: [] });

/** The user moved on by hand: also remove any completion alert still showing. */
const userMoved = (next: ActiveTimer, before: Effect[] = []): ReduceResult => ({
  next,
  effects: [...before, { type: 'ClearNotifications', which: 'all' }, ...platformEffectsFor(next)],
});

// ── Catching up with the clock ─────────────────────────────────────────────

type Step = { next: ActiveTimer; data: Effect[] } | null;

/**
 * At most one transition: RUNNING → interrupted, or RUNNING → completed (possibly straight
 * into an auto-started next session). Returns null when nothing is due.
 */
function catchUp(
  state: ActiveTimer,
  now: Now,
  settings: Settings,
  foreground: boolean,
  newSessionId: string,
): Step {
  if (state.status !== 'RUNNING' || state.deadlineElapsedMs === null) return null;

  if (isInterruptedByReboot(state, now)) {
    // We only know the time banked before the last pause; the rest can't be proven.
    const session = record(state, 'INTERRUPTED', state.focusedMsBeforePause, now.epochMs, now);
    const next =
      state.type === 'FOCUS'
        ? prepare('FOCUS', newSessionId, settings, { ...state, interruptedNoticePending: true })
        : prepare('FOCUS', newSessionId, settings, {
            ...state,
            cycleCompleted: cycleAfterBreak(state.type, state.cycleCompleted),
          });
    return {
      next,
      data: [
        { type: 'RecordSession', session },
        { type: 'ClearNotifications', which: 'all' },
      ],
    };
  }

  const lateMs = now.elapsedMs - state.deadlineElapsedMs;
  if (lateMs < 0) return null;

  // The true finish time, even if we only noticed later (ARCHITECTURE §5).
  const endedAtEpochMs = now.epochMs - lateMs;
  const session = record(state, 'COMPLETED', state.durationMs, endedAtEpochMs, now);
  const finished: ActiveTimer = {
    ...state,
    status: 'COMPLETED',
    remainingMs: 0,
    deadlineElapsedMs: null,
    bootCount: null,
    focusedMsBeforePause: state.durationMs,
  };

  if (state.type === 'FOCUS') {
    const cycleCompleted = state.cycleCompleted + 1;
    const breakType = breakTypeAfter(cycleCompleted, settings);
    if (settings.autoStartBreaks) {
      // The break is chained from the focus deadline, so no time is lost in between.
      const next = run(
        prepare(breakType, newSessionId, settings, { ...state, cycleCompleted }),
        state.deadlineElapsedMs,
        endedAtEpochMs,
        now,
      );
      return {
        next,
        data: [
          { type: 'RecordSession', session },
          { type: 'ShowCompletion', session, nextBreak: null },
        ],
      };
    }
    return {
      next: { ...finished, cycleCompleted },
      data: [
        { type: 'RecordSession', session },
        { type: 'ShowCompletion', session, nextBreak: breakType },
      ],
    };
  }

  // A break ended.
  const cycleCompleted = cycleAfterBreak(state.type, state.cycleCompleted);
  const data: Effect[] = [
    { type: 'RecordSession', session },
    { type: 'ShowCompletion', session, nextBreak: null },
  ];
  const userIsHere = foreground && lateMs <= AUTO_START_FOCUS_MAX_LATE_MS;
  if (settings.autoStartFocus && userIsHere) {
    const next = run(
      prepare('FOCUS', newSessionId, settings, { ...state, cycleCompleted }),
      state.deadlineElapsedMs,
      endedAtEpochMs,
      now,
    );
    if (next.intent !== null) data.push({ type: 'RememberIntent', intent: next.intent });
    return { next, data };
  }
  return { next: { ...finished, cycleCompleted }, data };
}

function reconcile(
  state: ActiveTimer,
  cmd: Extract<Command, { type: 'Reconcile' }>,
  now: Now,
  settings: Settings,
): ReduceResult {
  const ids = [cmd.newSessionId, ...(cmd.extraSessionIds ?? [])];
  // Backgrounded: never chain more than one transition per call.
  const limit = cmd.foreground ? Math.min(ids.length, MAX_FOREGROUND_CHAIN) : 1;
  let next = state;
  const data: Effect[] = [];
  for (let i = 0; i < limit; i++) {
    const step = catchUp(next, now, settings, cmd.foreground, ids[i]);
    if (step === null) break;
    next = step.next;
    data.push(...step.data);
  }
  // A prepared session follows the current settings until it is started.
  if (next.status === 'IDLE') {
    const durationMs = durationMsFor(next.type, settings);
    if (durationMs !== next.durationMs) next = { ...next, durationMs, remainingMs: durationMs };
  }
  return { next, effects: [...data, ...platformEffectsFor(next)] };
}

// ── Commands ───────────────────────────────────────────────────────────────

export function reduce(
  state: ActiveTimer,
  cmd: Command,
  now: Now,
  settings: Settings,
): ReduceResult {
  if (cmd.type === 'Reconcile') return reconcile(state, cmd, now, settings);

  // Stale: the sender was looking at a session that no longer exists.
  if (cmd.sessionId !== undefined && cmd.sessionId !== state.sessionId) return unchanged(state);

  // Catch up first. If the session ended in the meantime, the world the user acted on is
  // gone, so the command itself is dropped.
  const step = catchUp(state, now, settings, false, cmd.newSessionId);
  if (step !== null) {
    return { next: step.next, effects: [...step.data, ...platformEffectsFor(step.next)] };
  }

  switch (cmd.type) {
    case 'Start': {
      let idle: ActiveTimer;
      if (state.status === 'IDLE') {
        // Duration is locked here; later settings changes don't touch this session.
        const durationMs = durationMsFor(state.type, settings);
        idle = { ...state, durationMs, remainingMs: durationMs };
      } else if (state.status === 'COMPLETED') {
        idle = prepareNext(state, cmd.newSessionId, settings);
      } else {
        return unchanged(state);
      }
      const next = run(idle, now.elapsedMs, now.epochMs, now);
      const before: Effect[] =
        next.type === 'FOCUS' && next.intent !== null
          ? [{ type: 'RememberIntent', intent: next.intent }]
          : [];
      return userMoved(next, before);
    }

    case 'Pause': {
      if (state.status !== 'RUNNING') return unchanged(state);
      const remainingMs = remainingMsAt(state, now);
      const next: ActiveTimer = {
        ...state,
        status: 'PAUSED',
        remainingMs,
        deadlineElapsedMs: null,
        bootCount: null,
        focusedMsBeforePause: state.durationMs - remainingMs,
      };
      return { next, effects: platformEffectsFor(next) };
    }

    case 'Resume': {
      if (state.status !== 'PAUSED') return unchanged(state);
      const next: ActiveTimer = {
        ...state,
        status: 'RUNNING',
        deadlineElapsedMs: now.elapsedMs + state.remainingMs,
        bootCount: now.bootCount,
      };
      return { next, effects: platformEffectsFor(next) };
    }

    case 'Reset': {
      if (state.status !== 'RUNNING' && state.status !== 'PAUSED') return unchanged(state);
      const session = cancelled(state, now);
      return userMoved(prepare(state.type, cmd.newSessionId, settings, state), [
        { type: 'RecordSession', session },
      ]);
    }

    case 'Skip': {
      if (state.status === 'RUNNING' || state.status === 'PAUSED') {
        const session = cancelled(state, now);
        const next =
          state.type === 'FOCUS'
            ? // Abandoned focus: no bubble, cycle doesn't advance, on to the break.
              prepare(
                breakTypeAfter(state.cycleCompleted, settings),
                cmd.newSessionId,
                settings,
                state,
              )
            : prepare('FOCUS', cmd.newSessionId, settings, {
                ...state,
                cycleCompleted: cycleAfterBreak(state.type, state.cycleCompleted),
              });
        return userMoved(next, [{ type: 'RecordSession', session }]);
      }
      if (state.status === 'COMPLETED' && state.type === 'FOCUS') {
        // "Skip break" on the completion card: straight to the next focus.
        const skipped = breakTypeAfter(state.cycleCompleted, settings);
        return userMoved(
          prepare('FOCUS', cmd.newSessionId, settings, {
            ...state,
            cycleCompleted: cycleAfterBreak(skipped, state.cycleCompleted),
          }),
        );
      }
      if (state.type !== 'FOCUS') {
        // A prepared or finished break: on to the next focus.
        return userMoved(
          prepare('FOCUS', cmd.newSessionId, settings, {
            ...state,
            cycleCompleted:
              state.status === 'IDLE'
                ? cycleAfterBreak(state.type, state.cycleCompleted)
                : state.cycleCompleted,
          }),
        );
      }
      return unchanged(state); // an unstarted focus has nothing to skip
    }

    case 'PrepareNext': {
      if (state.status !== 'COMPLETED') return unchanged(state);
      return userMoved(prepareNext(state, cmd.newSessionId, settings));
    }

    case 'SetIntent': {
      const intent = normalizeIntent(cmd.intent);
      if (intent === state.intent) return unchanged(state);
      const next = { ...state, intent };
      const active = state.status === 'RUNNING' || state.status === 'PAUSED';
      const remember: Effect[] =
        active && state.type === 'FOCUS' && intent !== null
          ? [{ type: 'RememberIntent', intent }]
          : [];
      return { next, effects: [...remember, ...platformEffectsFor(next)] };
    }

    case 'AckInterrupted': {
      if (!state.interruptedNoticePending) return unchanged(state);
      return { next: { ...state, interruptedNoticePending: false }, effects: [] };
    }
  }
}

/** What comes after a COMPLETED session: focus → its break, break → the next focus. */
function prepareNext(state: ActiveTimer, sessionId: string, settings: Settings): ActiveTimer {
  return state.type === 'FOCUS'
    ? prepare(breakTypeAfter(state.cycleCompleted, settings), sessionId, settings, state)
    : prepare('FOCUS', sessionId, settings, state);
}

function cancelled(state: ActiveTimer, now: Now): SessionRecord {
  return record(state, 'CANCELLED', state.durationMs - remainingMsAt(state, now), now.epochMs, now);
}

/**
 * Timer domain types. Pure data — no React, no Expo imports.
 * See docs/ARCHITECTURE.md §3–§5 and docs/DATA_MODEL.md.
 */

export type SessionType = 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK';

/**
 * Status of the active timer row.
 * A session's life is IDLE → RUNNING ⇄ PAUSED → COMPLETED. CANCELLED and INTERRUPTED are
 * terminal outcomes that are written to history; the active row moves straight on to the
 * next prepared (IDLE) session, so it never rests in those two.
 */
export type TimerStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED';

export type SessionOutcome = 'COMPLETED' | 'CANCELLED' | 'INTERRUPTED';

/** The single `active_timer` row. */
export type ActiveTimer = {
  sessionId: string;
  type: SessionType;
  status: TimerStatus;
  /** Current focus intent. Kept across breaks so the next focus starts with it. */
  intent: string | null;
  /** Total length. Follows settings while IDLE, locked from Start. */
  durationMs: number;
  /** Time left. Authoritative when IDLE / PAUSED / COMPLETED (0). */
  remainingMs: number;
  /** Monotonic deadline (elapsedRealtime). Set only while RUNNING. */
  deadlineElapsedMs: number | null;
  /** Boot count captured at Start/Resume. Set only while RUNNING. */
  bootCount: number | null;
  /** Wall clock at first Start. Null until started. */
  startedAtEpochMs: number | null;
  /** Running time accumulated before the last pause/resume. */
  focusedMsBeforePause: number;
  /** Focus sessions completed in the current long-break cycle. */
  cycleCompleted: number;
  /** Show the "phone restarted" banner once. */
  interruptedNoticePending: boolean;
};

/** A reading of the device clocks (ARCHITECTURE §5). */
export type Now = {
  /** SystemClock.elapsedRealtime(): monotonic, resets on reboot. */
  elapsedMs: number;
  /** Wall clock. Used only for labels, never to measure duration. */
  epochMs: number;
  bootCount: number;
  /** Minutes east of UTC. */
  tzOffsetMin: number;
};

type Base = {
  /**
   * The session the sender was looking at. When present and different from the current
   * session, the command is stale and ignored (widget/notification buttons always send it).
   */
  sessionId?: string;
  /**
   * A fresh UUID from the caller. The reducer stays pure, so any command that ends up
   * creating a session (directly, or by catching up with the clock first) uses this one.
   */
  newSessionId: string;
};

export type Command =
  | ({ type: 'Start' } & Base)
  | ({ type: 'Pause' } & Base)
  | ({ type: 'Resume' } & Base)
  | ({ type: 'Reset' } & Base)
  | ({ type: 'Skip' } & Base)
  | ({ type: 'SetIntent'; intent: string | null } & Base)
  | ({ type: 'PrepareNext' } & Base)
  | ({ type: 'AckInterrupted' } & Base)
  /**
   * Brings the state up to date with the clock. `foreground` says whether the user has the
   * app open right now (controls focus auto-start and how many transitions may chain).
   * `extraSessionIds` are spare IDs for chained transitions in the foreground.
   */
  | { type: 'Reconcile'; foreground: boolean; newSessionId: string; extraSessionIds?: string[] };

export type CommandType = Command['type'];

/** One row for the `sessions` table. */
export type SessionRecord = {
  id: string;
  type: SessionType;
  status: SessionOutcome;
  intent: string | null;
  plannedMs: number;
  focusedMs: number;
  startedAtEpochMs: number;
  endedAtEpochMs: number;
  /** YYYY-MM-DD of endedAtEpochMs in the zone at recording time. Never recomputed. */
  localDate: string;
  tzOffsetMin: number;
  cycleIndex: number;
  /** 0–5 for a bubble (FOCUS + COMPLETED), otherwise null. */
  bubbleColor: number | null;
  schemaVersion: number;
};

export type Effect =
  /** Insert the row (INSERT OR IGNORE) in the same transaction as the state write. */
  | { type: 'RecordSession'; session: SessionRecord }
  /** Add to recent intents (same transaction). */
  | { type: 'RememberIntent'; intent: string }
  | { type: 'ScheduleAlarm'; sessionId: string; deadlineElapsedMs: number }
  | { type: 'CancelAlarm' }
  | { type: 'ShowOngoing'; sessionId: string }
  /** Completion alert for the session that just finished. */
  | { type: 'ShowCompletion'; session: SessionRecord; nextBreak: SessionType | null }
  | { type: 'ClearNotifications'; which: 'ongoing' | 'all' }
  | { type: 'UpdateWidget' };

export type EffectType = Effect['type'];

export type ReduceResult = { next: ActiveTimer; effects: Effect[] };

export const SESSION_SCHEMA_VERSION = 1;

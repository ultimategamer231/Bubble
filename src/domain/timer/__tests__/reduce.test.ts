import { DEFAULT_SETTINGS, type Settings } from '../../settings';
import { focusedMsAt, formatClock, progressAt, remainingSeconds } from '../display';
import {
  AUTO_START_FOCUS_MAX_LATE_MS,
  breakTypeAfter,
  createInitialTimer,
  durationMsFor,
  isInterruptedByReboot,
  platformEffectsFor,
  reduce,
  remainingMsAt,
} from '../reduce';
import type { ActiveTimer, Command, Effect, Now, SessionRecord } from '../types';

const MIN = 60_000;
const T0 = 5_000_000;
const E0 = 1_800_000_000_000; // 2027-01-15T08:00:00Z

/** Fake clock: `at(ms)` is that long after the start, same boot. */
const at = (ms: number, extra: Partial<Now> = {}): Now => ({
  elapsedMs: T0 + ms,
  epochMs: E0 + ms,
  bootCount: 3,
  tzOffsetMin: 0,
  ...extra,
});

/** Drives the reducer and keeps every recorded row. */
class Harness {
  state: ActiveTimer;
  rows: SessionRecord[] = [];
  effects: Effect[] = [];
  private n = 0;
  constructor(public settings: Settings = DEFAULT_SETTINGS) {
    this.state = createInitialTimer('s0', settings);
  }
  private id = () => `n${++this.n}`;
  send(
    cmd: { type: Exclude<Command['type'], 'Reconcile' | 'SetIntent'>; sessionId?: string },
    now: Now,
  ) {
    return this.apply({ ...cmd, newSessionId: this.id() } as Command, now);
  }
  intent(intent: string | null, now: Now) {
    return this.apply({ type: 'SetIntent', intent, newSessionId: this.id() }, now);
  }
  reconcile(now: Now, foreground = false) {
    return this.apply(
      {
        type: 'Reconcile',
        foreground,
        newSessionId: this.id(),
        extraSessionIds: [this.id(), this.id(), this.id()],
      },
      now,
    );
  }
  private apply(cmd: Command, now: Now) {
    const result = reduce(this.state, cmd, now, this.settings);
    this.state = result.next;
    this.effects = result.effects;
    for (const e of result.effects) if (e.type === 'RecordSession') this.rows.push(e.session);
    return result;
  }
  get bubbles() {
    return this.rows.filter((r) => r.type === 'FOCUS' && r.status === 'COMPLETED');
  }
  /** Runs one whole focus session starting at `start` and returns its end offset. */
  completeFocus(start: number): number {
    this.send({ type: 'Start' }, at(start));
    const end = start + this.state.durationMs;
    this.reconcile(at(end));
    return end;
  }
}

describe('A1 start', () => {
  it('sets deadline = now + duration and shows the full time', () => {
    const h = new Harness();
    expect(h.state).toMatchObject({ status: 'IDLE', type: 'FOCUS', remainingMs: 25 * MIN });
    h.send({ type: 'Start' }, at(0));
    expect(h.state).toMatchObject({
      status: 'RUNNING',
      deadlineElapsedMs: T0 + 25 * MIN,
      bootCount: 3,
      startedAtEpochMs: E0,
    });
    expect(formatClock(remainingMsAt(h.state, at(0)))).toBe('25:00');
    expect(formatClock(remainingMsAt(h.state, at(1)))).toBe('25:00');
    expect(formatClock(remainingMsAt(h.state, at(1000)))).toBe('24:59');
    expect(progressAt(h.state, at(5 * MIN))).toBeCloseTo(0.2);
    expect(focusedMsAt(h.state, at(5 * MIN))).toBe(5 * MIN);
  });
});

describe('A2 pause / A3 resume', () => {
  it('freezes remaining while paused and resumes from it', () => {
    const h = new Harness();
    h.send({ type: 'Start' }, at(0));
    h.send({ type: 'Pause' }, at(12 * MIN + 20_000));
    expect(h.state).toMatchObject({ status: 'PAUSED', remainingMs: 12 * MIN + 40_000 });
    // An hour passes while paused: nothing changes.
    h.reconcile(at(72 * MIN));
    expect(h.state).toMatchObject({ status: 'PAUSED', remainingMs: 12 * MIN + 40_000 });
    expect(remainingMsAt(h.state, at(72 * MIN))).toBe(12 * MIN + 40_000);
    h.send({ type: 'Resume' }, at(72 * MIN));
    expect(h.state.deadlineElapsedMs).toBe(T0 + 72 * MIN + 12 * MIN + 40_000);
    // Pause time never counts as focus time.
    h.send({ type: 'Pause' }, at(73 * MIN));
    expect(h.state.focusedMsBeforePause).toBe(13 * MIN + 20_000);
  });

  it('is exact to the second after any sequence (FR-02)', () => {
    const h = new Harness();
    h.send({ type: 'Start' }, at(0));
    let t = 0;
    let focused = 0;
    for (let i = 0; i < 20; i++) {
      t += 37_123; // run
      focused += 37_123;
      h.send({ type: 'Pause' }, at(t));
      t += 91_777; // paused
      h.send({ type: 'Resume' }, at(t));
    }
    expect(remainingMsAt(h.state, at(t))).toBe(25 * MIN - focused);
  });
});

describe('A4 reset and skip', () => {
  it('reset during focus records CANCELLED and no bubble', () => {
    const h = new Harness();
    h.send({ type: 'Start' }, at(0));
    h.send({ type: 'Reset' }, at(2 * MIN));
    expect(h.rows).toHaveLength(1);
    expect(h.rows[0]).toMatchObject({ status: 'CANCELLED', focusedMs: 2 * MIN, bubbleColor: null });
    expect(h.bubbles).toHaveLength(0);
    expect(h.state).toMatchObject({ status: 'IDLE', type: 'FOCUS', cycleCompleted: 0 });
    expect(h.state.sessionId).not.toBe('s0');
  });

  it('skip during a break prepares the next focus; reset during a break restarts it', () => {
    const h = new Harness();
    const end = h.completeFocus(0);
    h.send({ type: 'Start' }, at(end));
    expect(h.state).toMatchObject({ type: 'SHORT_BREAK', status: 'RUNNING' });
    h.send({ type: 'Reset' }, at(end + MIN));
    expect(h.state).toMatchObject({ type: 'SHORT_BREAK', status: 'IDLE', cycleCompleted: 1 });
    h.send({ type: 'Start' }, at(end + MIN));
    h.send({ type: 'Skip' }, at(end + 2 * MIN));
    expect(h.state).toMatchObject({ type: 'FOCUS', status: 'IDLE', cycleCompleted: 1 });
    expect(h.bubbles).toHaveLength(1);
  });

  it('skip break on the completion card goes straight to the next focus', () => {
    const h = new Harness();
    const end = h.completeFocus(0);
    h.send({ type: 'Skip' }, at(end));
    expect(h.state).toMatchObject({ type: 'FOCUS', status: 'IDLE', cycleCompleted: 1 });
    expect(h.rows).toHaveLength(1); // no break row: it never started
  });

  it('skip does nothing on an unstarted focus; reset does nothing when idle or completed', () => {
    const h = new Harness();
    expect(h.send({ type: 'Skip' }, at(0)).effects).toEqual([]);
    expect(h.send({ type: 'Reset' }, at(0)).effects).toEqual([]);
    h.completeFocus(0);
    expect(h.send({ type: 'Reset' }, at(30 * MIN)).effects).toEqual([]);
    expect(h.state.status).toBe('COMPLETED');
  });

  it('skipping a finished break is the same as preparing the next focus', () => {
    const h = new Harness();
    const end = h.completeFocus(0);
    h.send({ type: 'Start' }, at(end));
    h.reconcile(at(end + 5 * MIN));
    expect(h.state).toMatchObject({ type: 'SHORT_BREAK', status: 'COMPLETED' });
    h.send({ type: 'Skip' }, at(end + 6 * MIN));
    expect(h.state).toMatchObject({ type: 'FOCUS', status: 'IDLE', cycleCompleted: 1 });
  });
});

describe('A5 long-break cycle', () => {
  it.each([2, 4, 8])('long break after %i completed focus sessions', (every) => {
    const h = new Harness({ ...DEFAULT_SETTINGS, longBreakEvery: every });
    let t = 0;
    for (let i = 1; i <= every; i++) {
      t = h.completeFocus(t);
      expect(h.state.cycleCompleted).toBe(i);
      h.send({ type: 'Start' }, at(t));
      expect(h.state.type).toBe(i === every ? 'LONG_BREAK' : 'SHORT_BREAK');
      t += h.state.durationMs;
      h.reconcile(at(t));
    }
    expect(h.state).toMatchObject({ type: 'LONG_BREAK', status: 'COMPLETED', cycleCompleted: 0 });
    expect(h.bubbles).toHaveLength(every);
  });

  it('skipped and cancelled focus sessions do not advance the cycle', () => {
    const h = new Harness({ ...DEFAULT_SETTINGS, longBreakEvery: 2 });
    let t = h.completeFocus(0); // 1 of 2
    h.send({ type: 'Skip' }, at(t)); // skip the break
    h.send({ type: 'Start' }, at(t));
    h.send({ type: 'Skip' }, at(t + 10 * MIN)); // abandon focus
    expect(h.state).toMatchObject({ type: 'SHORT_BREAK', cycleCompleted: 1 });
    h.send({ type: 'Skip' }, at(t + 10 * MIN));
    h.send({ type: 'Start' }, at(t + 10 * MIN));
    h.send({ type: 'Reset' }, at(t + 11 * MIN)); // cancel focus
    expect(h.state).toMatchObject({ type: 'FOCUS', cycleCompleted: 1 });
    t = h.completeFocus(t + 12 * MIN); // 2 of 2
    expect(h.state.cycleCompleted).toBe(2);
    expect(breakTypeAfter(h.state.cycleCompleted, h.settings)).toBe('LONG_BREAK');
    // Skipping the long break still closes the cycle.
    h.send({ type: 'Skip' }, at(t));
    expect(h.state).toMatchObject({ type: 'FOCUS', status: 'IDLE', cycleCompleted: 0 });
  });

  it('skipping a prepared long break closes the cycle', () => {
    const h = new Harness({ ...DEFAULT_SETTINGS, longBreakEvery: 2 });
    let t = h.completeFocus(0);
    h.send({ type: 'Skip' }, at(t));
    t = h.completeFocus(t);
    h.send({ type: 'PrepareNext' }, at(t));
    expect(h.state).toMatchObject({ type: 'LONG_BREAK', status: 'IDLE', cycleCompleted: 2 });
    h.send({ type: 'Skip' }, at(t));
    expect(h.state).toMatchObject({ type: 'FOCUS', status: 'IDLE', cycleCompleted: 0 });
  });
});

describe('A7 duplicates / A8 stale commands', () => {
  it('Start×2 and Pause×2 are no-ops the second time', () => {
    const h = new Harness();
    h.send({ type: 'Start' }, at(0));
    const before = h.state;
    expect(h.send({ type: 'Start' }, at(1000)).next).toBe(before);
    h.send({ type: 'Pause' }, at(2000));
    const paused = h.state;
    expect(h.send({ type: 'Pause' }, at(3000)).next).toBe(paused);
    expect(h.send({ type: 'Start' }, at(3000)).next).toBe(paused);
    h.send({ type: 'Resume' }, at(4000));
    const resumed = h.state;
    expect(h.send({ type: 'Resume' }, at(5000)).next).toBe(resumed);
    expect(h.send({ type: 'PrepareNext' }, at(5000)).next).toBe(resumed);
  });

  it('Reconcile×20 past the deadline completes exactly once', () => {
    const h = new Harness();
    h.send({ type: 'Start' }, at(0));
    for (let i = 0; i < 20; i++) h.reconcile(at(25 * MIN + i));
    expect(h.rows).toHaveLength(1);
    expect(h.bubbles).toHaveLength(1);
    expect(h.state).toMatchObject({ status: 'COMPLETED', cycleCompleted: 1 });
  });

  it('a command with an old session ID is a no-op', () => {
    const h = new Harness();
    h.send({ type: 'Start' }, at(0));
    h.send({ type: 'Reset' }, at(MIN)); // new session prepared
    const state = h.state;
    for (const type of ['Start', 'Pause', 'Resume', 'Reset', 'Skip', 'PrepareNext'] as const) {
      expect(h.send({ type, sessionId: 's0' }, at(2 * MIN))).toEqual({ next: state, effects: [] });
    }
    // The current ID is accepted.
    h.send({ type: 'Start', sessionId: state.sessionId }, at(2 * MIN));
    expect(h.state.status).toBe('RUNNING');
  });
});

describe('A9 background reconcile', () => {
  it('10 minutes in the background leaves the right remaining time', () => {
    const h = new Harness();
    h.send({ type: 'Start' }, at(0));
    h.reconcile(at(10 * MIN));
    expect(h.state.status).toBe('RUNNING');
    expect(remainingMsAt(h.state, at(10 * MIN))).toBe(15 * MIN);
    expect(h.rows).toHaveLength(0);
  });

  it('past the deadline completes once with the true finish time', () => {
    const h = new Harness();
    h.send({ type: 'Start' }, at(0));
    // Noticed 3 hours late, and the user changed timezone meanwhile.
    h.reconcile(at(25 * MIN + 180 * MIN, { tzOffsetMin: 120 }));
    expect(h.rows).toHaveLength(1);
    expect(h.rows[0]).toMatchObject({
      status: 'COMPLETED',
      focusedMs: 25 * MIN,
      startedAtEpochMs: E0,
      endedAtEpochMs: E0 + 25 * MIN,
      tzOffsetMin: 120,
    });
    expect(h.effects.map((e) => e.type)).toContain('ShowCompletion');
  });
});

describe('A10 reboot', () => {
  it('RUNNING with a changed boot count becomes INTERRUPTED with a pending notice', () => {
    const h = new Harness();
    h.send({ type: 'Start' }, at(0));
    h.send({ type: 'Pause' }, at(4 * MIN));
    h.send({ type: 'Resume' }, at(5 * MIN));
    const afterBoot: Now = {
      elapsedMs: 20_000,
      epochMs: E0 + 9 * MIN,
      bootCount: 4,
      tzOffsetMin: 0,
    };
    expect(isInterruptedByReboot(h.state, afterBoot)).toBe(true);
    h.reconcile(afterBoot);
    expect(h.rows[0]).toMatchObject({
      status: 'INTERRUPTED',
      focusedMs: 4 * MIN,
      bubbleColor: null,
    });
    expect(h.bubbles).toHaveLength(0);
    expect(h.state).toMatchObject({
      status: 'IDLE',
      type: 'FOCUS',
      interruptedNoticePending: true,
    });
    // The banner shows once.
    h.send({ type: 'AckInterrupted' }, afterBoot);
    expect(h.state.interruptedNoticePending).toBe(false);
    expect(h.send({ type: 'AckInterrupted' }, afterBoot).effects).toEqual([]);
  });

  it('detects a reset monotonic clock even if the boot count looks the same', () => {
    const h = new Harness();
    h.send({ type: 'Start' }, at(0));
    const now: Now = { elapsedMs: 1000, epochMs: E0 + MIN, bootCount: 3, tzOffsetMin: 0 };
    h.reconcile(now);
    expect(h.rows[0].status).toBe('INTERRUPTED');
  });

  it('starting again clears a notice that was never acknowledged', () => {
    const h = new Harness();
    h.send({ type: 'Start' }, at(0));
    const afterBoot: Now = {
      elapsedMs: 20_000,
      epochMs: E0 + 9 * MIN,
      bootCount: 4,
      tzOffsetMin: 0,
    };
    h.send({ type: 'Pause' }, afterBoot); // any command catches up first
    expect(h.state).toMatchObject({ status: 'IDLE', interruptedNoticePending: true });
    h.send({ type: 'Start' }, afterBoot);
    expect(h.state).toMatchObject({
      status: 'RUNNING',
      interruptedNoticePending: false,
      bootCount: 4,
    });
  });

  it('an interrupted break quietly prepares the next focus', () => {
    const h = new Harness({ ...DEFAULT_SETTINGS, longBreakEvery: 2 });
    let t = h.completeFocus(0);
    h.send({ type: 'Skip' }, at(t));
    t = h.completeFocus(t);
    h.send({ type: 'Start' }, at(t)); // long break
    h.reconcile({ elapsedMs: 5000, epochMs: E0 + t + MIN, bootCount: 9, tzOffsetMin: 0 });
    expect(h.rows.at(-1)).toMatchObject({ type: 'LONG_BREAK', status: 'INTERRUPTED' });
    expect(h.state).toMatchObject({
      type: 'FOCUS',
      status: 'IDLE',
      cycleCompleted: 0,
      interruptedNoticePending: false,
    });
  });

  it('PAUSED is untouched by a reboot', () => {
    const h = new Harness();
    h.send({ type: 'Start' }, at(0));
    h.send({ type: 'Pause' }, at(MIN));
    const paused = h.state;
    const afterBoot: Now = { elapsedMs: 100, epochMs: E0 + 50 * MIN, bootCount: 4, tzOffsetMin: 0 };
    expect(isInterruptedByReboot(h.state, afterBoot)).toBe(false);
    expect(h.reconcile(afterBoot).next).toBe(paused);
    expect(h.rows).toHaveLength(0);
  });
});

describe('A11 auto-start', () => {
  const auto: Settings = { ...DEFAULT_SETTINGS, autoStartBreaks: true, autoStartFocus: true };

  it('break auto-starts in the background, chained from the focus deadline', () => {
    const h = new Harness(auto);
    h.send({ type: 'Start' }, at(0));
    h.reconcile(at(25 * MIN + 90_000));
    expect(h.state).toMatchObject({
      type: 'SHORT_BREAK',
      status: 'RUNNING',
      deadlineElapsedMs: T0 + 30 * MIN,
      startedAtEpochMs: E0 + 25 * MIN,
    });
    expect(remainingMsAt(h.state, at(25 * MIN + 90_000))).toBe(5 * MIN - 90_000);
  });

  it('never chains more than one transition per backgrounded reconcile, and never starts focus', () => {
    const h = new Harness(auto);
    h.send({ type: 'Start' }, at(0));
    const later = at(4 * 60 * MIN);
    h.reconcile(later);
    expect(h.rows).toHaveLength(1);
    expect(h.state).toMatchObject({ type: 'SHORT_BREAK', status: 'RUNNING' });
    h.reconcile(later);
    expect(h.rows).toHaveLength(2);
    expect(h.state).toMatchObject({ type: 'SHORT_BREAK', status: 'COMPLETED' });
    for (let i = 0; i < 5; i++) h.reconcile(later);
    expect(h.rows).toHaveLength(2);
    expect(h.bubbles).toHaveLength(1);
    expect(h.state.status).toBe('COMPLETED');
  });

  it('focus auto-starts only in the foreground, right as the break ends', () => {
    const h = new Harness(auto);
    h.send({ type: 'Start' }, at(0));
    h.reconcile(at(25 * MIN), true);
    expect(h.state).toMatchObject({ type: 'SHORT_BREAK', status: 'RUNNING' });
    h.reconcile(at(30 * MIN + AUTO_START_FOCUS_MAX_LATE_MS), true);
    expect(h.state).toMatchObject({
      type: 'FOCUS',
      status: 'RUNNING',
      deadlineElapsedMs: T0 + 55 * MIN,
      cycleCompleted: 1,
    });
  });

  it('opening the app long after everything ended chains at most to a finished break', () => {
    const h = new Harness(auto);
    h.intent('Thesis', at(0));
    h.send({ type: 'Start' }, at(0));
    h.reconcile(at(3 * 60 * MIN), true); // foreground, but hours late
    expect(h.rows.map((r) => `${r.type}:${r.status}`)).toEqual([
      'FOCUS:COMPLETED',
      'SHORT_BREAK:COMPLETED',
    ]);
    expect(h.state).toMatchObject({ type: 'SHORT_BREAK', status: 'COMPLETED', intent: 'Thesis' });
    expect(h.bubbles).toHaveLength(1);
  });

  it('remembers the carried intent when focus auto-starts', () => {
    const h = new Harness(auto);
    h.intent('Thesis', at(0));
    h.send({ type: 'Start' }, at(0));
    h.reconcile(at(25 * MIN), true);
    const { effects } = h.reconcile(at(30 * MIN), true);
    expect(effects).toContainEqual({ type: 'RememberIntent', intent: 'Thesis' });
    expect(h.state).toMatchObject({ type: 'FOCUS', status: 'RUNNING', intent: 'Thesis' });
  });

  it('with auto-start off the next session is prepared, not started', () => {
    const h = new Harness();
    h.completeFocus(0);
    expect(h.state.status).toBe('COMPLETED');
    h.send({ type: 'PrepareNext' }, at(26 * MIN));
    expect(h.state).toMatchObject({ type: 'SHORT_BREAK', status: 'IDLE', remainingMs: 5 * MIN });
  });
});

describe('A12 settings changes', () => {
  it('do not alter a running or paused session, and apply to the next one', () => {
    const h = new Harness();
    h.send({ type: 'Start' }, at(0));
    h.settings = { ...DEFAULT_SETTINGS, focusMin: 60, shortBreakMin: 10 };
    h.reconcile(at(MIN));
    h.send({ type: 'Pause' }, at(2 * MIN));
    h.send({ type: 'Resume' }, at(3 * MIN));
    expect(h.state.durationMs).toBe(25 * MIN);
    h.reconcile(at(26 * MIN));
    expect(h.rows[0]).toMatchObject({ plannedMs: 25 * MIN, focusedMs: 25 * MIN });
    h.send({ type: 'Start' }, at(26 * MIN));
    expect(h.state).toMatchObject({ type: 'SHORT_BREAK', durationMs: 10 * MIN });
  });

  it('an idle session follows the settings', () => {
    const h = new Harness();
    h.settings = { ...DEFAULT_SETTINGS, focusMin: 45 };
    h.reconcile(at(0));
    expect(h.state).toMatchObject({ status: 'IDLE', durationMs: 45 * MIN, remainingMs: 45 * MIN });
    expect(durationMsFor('LONG_BREAK', h.settings)).toBe(15 * MIN);
  });
});

describe('A13 intent on the timer', () => {
  it('is trimmed, capped at 60 characters, and empty becomes null', () => {
    const h = new Harness();
    h.intent('   Chapter 4 notes   ', at(0));
    expect(h.state.intent).toBe('Chapter 4 notes');
    h.intent('x'.repeat(80), at(0));
    expect(h.state.intent).toHaveLength(60);
    h.intent('    ', at(0));
    expect(h.state.intent).toBeNull();
    expect(h.intent(null, at(0)).effects).toEqual([]); // unchanged → no-op
  });

  it('is saved on the session and remembered when it starts or changes mid-session', () => {
    const h = new Harness();
    h.intent('Read', at(0));
    expect(h.effects.map((e) => e.type)).not.toContain('RememberIntent');
    expect(h.send({ type: 'Start' }, at(0)).effects[0]).toEqual({
      type: 'RememberIntent',
      intent: 'Read',
    });
    expect(h.intent('Write', at(MIN)).effects[0]).toEqual({
      type: 'RememberIntent',
      intent: 'Write',
    });
    h.intent(null, at(2 * MIN));
    h.intent('Write up', at(2 * MIN));
    h.reconcile(at(25 * MIN));
    expect(h.rows[0].intent).toBe('Write up');
    // Breaks don't store an intent, but the next focus keeps it.
    h.send({ type: 'Start' }, at(25 * MIN));
    h.reconcile(at(30 * MIN));
    expect(h.rows[1]).toMatchObject({ type: 'SHORT_BREAK', intent: null });
    h.send({ type: 'Start' }, at(30 * MIN));
    expect(h.state).toMatchObject({ type: 'FOCUS', intent: 'Write up' });
  });
});

describe('effects and display helpers', () => {
  it('derives platform effects from state alone', () => {
    const h = new Harness();
    expect(platformEffectsFor(h.state).map((e) => e.type)).toEqual([
      'CancelAlarm',
      'ClearNotifications',
      'UpdateWidget',
    ]);
    h.send({ type: 'Start' }, at(0));
    expect(platformEffectsFor(h.state)[0]).toEqual({
      type: 'ScheduleAlarm',
      sessionId: 's0',
      deadlineElapsedMs: T0 + 25 * MIN,
    });
  });

  it('tells the completion alert which break comes next', () => {
    const h = new Harness({ ...DEFAULT_SETTINGS, longBreakEvery: 2 });
    let t = h.completeFocus(0);
    expect(h.effects.find((e) => e.type === 'ShowCompletion')).toMatchObject({
      nextBreak: 'SHORT_BREAK',
    });
    h.send({ type: 'Skip' }, at(t));
    t = h.completeFocus(t);
    expect(h.effects.find((e) => e.type === 'ShowCompletion')).toMatchObject({
      nextBreak: 'LONG_BREAK',
    });
  });

  it('formats clocks', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(999)).toBe('00:01');
    expect(formatClock(12 * MIN + 40_000)).toBe('12:40');
    expect(formatClock(60 * MIN)).toBe('1:00:00');
    expect(formatClock(180 * MIN)).toBe('3:00:00');
    expect(formatClock(-5)).toBe('00:00');
    expect(remainingSeconds(1001)).toBe(2);
  });

  it('progress is clamped and safe for odd input', () => {
    const h = new Harness();
    expect(progressAt(h.state, at(0))).toBe(0);
    h.send({ type: 'Start' }, at(0));
    expect(progressAt(h.state, at(99 * MIN))).toBe(1);
    expect(progressAt({ ...h.state, durationMs: 0 }, at(0))).toBe(0);
    expect(remainingMsAt(h.state, at(-MIN))).toBe(25 * MIN);
  });
});

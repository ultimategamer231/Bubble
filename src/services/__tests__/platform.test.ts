import { DEFAULT_SETTINGS, type Settings } from '@/domain/settings';
import {
  createInitialTimer,
  reduce,
  type ActiveTimer,
  type Command,
  type Now,
} from '@/domain/timer';

import { completionText, focusSummary, ongoingTitle, pausedText } from '../copy';
import { applyPlatformEffects, type Platform } from '../platform';

const MIN = 60_000;
const now = (ms: number): Now => ({
  elapsedMs: 1_000_000 + ms,
  epochMs: 1_800_000_000_000 + ms,
  bootCount: 1,
  tzOffsetMin: 0,
});

function fakePlatform(at: () => Now) {
  const calls: unknown[][] = [];
  const log =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push([name, ...args]);
      return 'exact' as const;
    };
  const platform: Platform = {
    now: at,
    scheduleAlarm: log('scheduleAlarm'),
    cancelAlarm: log('cancelAlarm'),
    showOngoing: log('showOngoing'),
    showCompletion: log('showCompletion'),
    clearNotifications: log('clearNotifications'),
    updateWidget: log('updateWidget'),
  };
  return { platform, calls };
}

function step(
  state: ActiveTimer,
  cmd: Omit<Command, 'newSessionId'>,
  t: number,
  settings: Settings = DEFAULT_SETTINGS,
) {
  const clock = now(t);
  const { next, effects } = reduce(
    state,
    { ...cmd, newSessionId: `n${t}` } as Command,
    clock,
    settings,
  );
  const { platform, calls } = fakePlatform(() => clock);
  applyPlatformEffects(effects, next, settings, platform);
  return { next, calls };
}

describe('notification copy (UI_UX §5)', () => {
  it('titles', () => {
    expect(ongoingTitle({ type: 'FOCUS', intent: 'Chapter 4 notes' })).toBe(
      'Focus · Chapter 4 notes',
    );
    expect(ongoingTitle({ type: 'FOCUS', intent: null })).toBe('Focus');
    expect(ongoingTitle({ type: 'SHORT_BREAK', intent: 'Chapter 4 notes' })).toBe('Short break');
    expect(ongoingTitle({ type: 'LONG_BREAK', intent: null })).toBe('Long break');
    expect(pausedText(12 * MIN + 40_000)).toBe('Paused · 12:40 left');
  });

  it('completion text', () => {
    expect(focusSummary(25 * MIN, 'Chapter 4 notes')).toBe('25 min on “Chapter 4 notes”');
    expect(focusSummary(25 * MIN, null)).toBe('25 min of focus');
    expect(completionText({ type: 'FOCUS', durationMs: 25 * MIN, intent: null }, true)).toEqual({
      title: 'Bubble earned',
      body: '25 min of focus',
      actionLabel: 'Start break',
      actionCommand: 'Start',
    });
    expect(
      completionText({ type: 'FOCUS', durationMs: 25 * MIN, intent: null }, false).actionLabel,
    ).toBeNull();
    expect(
      completionText({ type: 'SHORT_BREAK', durationMs: 5 * MIN, intent: null }, true),
    ).toMatchObject({
      title: 'Break’s over',
      actionLabel: 'Start focus',
    });
  });
});

describe('applyPlatformEffects', () => {
  const idle = { ...createInitialTimer('s0', DEFAULT_SETTINGS), intent: 'Read' };

  it('start: clears old alerts, schedules the alarm with its alert text, shows a running countdown', () => {
    const { calls } = step(idle, { type: 'Start' }, 0);
    expect(calls).toEqual([
      ['clearNotifications', 'all'],
      [
        'scheduleAlarm',
        's0',
        1_000_000 + 25 * MIN,
        {
          title: 'Bubble earned',
          body: '25 min on “Read”',
          actionLabel: 'Start break',
          actionCommand: 'Start',
        },
      ],
      ['showOngoing', 's0', 'Focus · Read', null, true, 1_000_000 + 25 * MIN],
      ['updateWidget', expect.objectContaining({ status: 'RUNNING' })],
    ]);
  });

  it('pause: cancels the alarm and shows the paused text without a countdown', () => {
    const running = step(idle, { type: 'Start' }, 0).next;
    const { calls } = step(running, { type: 'Pause' }, 12 * MIN + 20_000);
    expect(calls[0]).toEqual(['cancelAlarm']);
    expect(calls[1]).toEqual([
      'showOngoing',
      's0',
      'Focus · Read',
      'Paused · 12:40 left',
      false,
      0,
    ]);
  });

  it('completion: shows the alert with a Start break button, then clears the countdown', () => {
    const running = step(idle, { type: 'Start' }, 0).next;
    const { calls, next } = step(
      running,
      { type: 'Reconcile', foreground: false } as never,
      25 * MIN,
    );
    expect(next.status).toBe('COMPLETED');
    expect(calls.map((c) => c[0])).toEqual([
      'showCompletion',
      'cancelAlarm',
      'clearNotifications',
      'updateWidget',
    ]);
    expect(calls[0]).toEqual([
      'showCompletion',
      's0',
      expect.objectContaining({ title: 'Bubble earned', actionLabel: 'Start break' }),
    ]);
  });

  it('auto-started break: no button on the focus alert, and the break alarm offers Start focus', () => {
    const settings = { ...DEFAULT_SETTINGS, autoStartBreaks: true };
    const running = step(idle, { type: 'Start' }, 0, settings);
    expect(running.calls[1][3]).toMatchObject({ actionLabel: null });
    const { calls, next } = step(
      running.next,
      { type: 'Reconcile', foreground: false } as never,
      25 * MIN,
      settings,
    );
    expect(next).toMatchObject({ type: 'SHORT_BREAK', status: 'RUNNING' });
    expect(calls[0]).toEqual([
      'showCompletion',
      's0',
      expect.objectContaining({ actionLabel: null }),
    ]);
    expect(calls[1]).toEqual([
      'scheduleAlarm',
      next.sessionId,
      1_000_000 + 30 * MIN,
      expect.objectContaining({ title: 'Break’s over', actionLabel: 'Start focus' }),
    ]);
  });

  it('a finished break offers Start focus', () => {
    let s = step(idle, { type: 'Start' }, 0).next;
    s = step(s, { type: 'Reconcile', foreground: false } as never, 25 * MIN).next;
    s = step(s, { type: 'Start' }, 25 * MIN).next;
    const { calls } = step(s, { type: 'Reconcile', foreground: false } as never, 30 * MIN);
    expect(calls[0]).toEqual([
      'showCompletion',
      s.sessionId,
      {
        title: 'Break’s over',
        body: 'Ready when you are.',
        actionLabel: 'Start focus',
        actionCommand: 'Start',
      },
    ]);
  });
});

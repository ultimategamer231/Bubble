/**
 * Text for notifications (docs/UI_UX.md §5). Pure functions so the wording is tested once
 * and shared by the alarm payload, the ongoing notification and the completion alert.
 */
import { formatSessionLength } from '@/domain/stats';
import { formatClock, type ActiveTimer, type SessionType } from '@/domain/timer';

export type ButtonCommand = 'Start' | 'Pause' | 'Resume' | 'Reset' | 'Skip';

export type CompletionText = {
  title: string;
  body: string;
  actionLabel: string | null;
  actionCommand: ButtonCommand | null;
};

const MODE_LABEL: Record<SessionType, string> = {
  FOCUS: 'Focus',
  SHORT_BREAK: 'Short break',
  LONG_BREAK: 'Long break',
};

export const modeLabel = (type: SessionType): string => MODE_LABEL[type];

/** `Focus · Chapter 4 notes`, `Focus`, `Short break`. */
export function ongoingTitle(state: Pick<ActiveTimer, 'type' | 'intent'>): string {
  const label = MODE_LABEL[state.type];
  return state.type === 'FOCUS' && state.intent ? `${label} · ${state.intent}` : label;
}

/** `Paused · 12:40 left` */
export const pausedText = (remainingMs: number): string =>
  `Paused · ${formatClock(remainingMs)} left`;

/** `25 min on "Chapter 4 notes"` or `25 min of focus`. */
export function focusSummary(durationMs: number, intent: string | null): string {
  const length = formatSessionLength(durationMs);
  return intent ? `${length} on “${intent}”` : `${length} of focus`;
}

/**
 * The completion alert for a session of this type.
 * `offerNext` is false when the next session starts by itself (no button needed).
 */
export function completionText(
  session: { type: SessionType; durationMs: number; intent: string | null },
  offerNext: boolean,
): CompletionText {
  if (session.type === 'FOCUS') {
    return {
      title: 'Bubble earned',
      body: focusSummary(session.durationMs, session.intent),
      actionLabel: offerNext ? 'Start break' : null,
      actionCommand: offerNext ? 'Start' : null,
    };
  }
  return {
    title: 'Break’s over',
    body: 'Ready when you are.',
    actionLabel: offerNext ? 'Start focus' : null,
    actionCommand: offerNext ? 'Start' : null,
  };
}

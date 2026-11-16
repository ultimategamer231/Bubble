/**
 * The only doorway from app code to Android. Everything above this file talks to the
 * `Platform` interface, so tests (and the future iOS build) can supply their own.
 */
import type { Settings } from '@/domain/settings';
import {
  remainingMsAt,
  type ActiveTimer,
  type Effect,
  type Now,
  type SessionType,
} from '@/domain/timer';

import { completionText, ongoingTitle, pausedText, type CompletionText } from './copy';

export type AlarmMode = 'exact' | 'inexact';

export interface Platform {
  now(): Now;
  scheduleAlarm(sessionId: string, deadlineElapsedMs: number, text: CompletionText): AlarmMode;
  cancelAlarm(): void;
  showOngoing(
    sessionId: string,
    title: string,
    text: string | null,
    running: boolean,
    deadlineElapsedMs: number,
  ): void;
  showCompletion(sessionId: string, text: CompletionText): void;
  clearNotifications(which: 'ongoing' | 'all'): void;
  /** Phase 6. */
  updateWidget(state: ActiveTimer): void;
}

/** True when the session after `type` would start by itself, so no button is offered. */
function nextStartsItself(type: SessionType, settings: Settings): boolean {
  // Focus never auto-starts in the background, where notification buttons matter.
  return type === 'FOCUS' ? settings.autoStartBreaks : false;
}

/**
 * Carries out the platform side of a reducer result. Runs after the database commit.
 * Every call is idempotent, so running the same effects again is harmless.
 */
export function applyPlatformEffects(
  effects: readonly Effect[],
  state: ActiveTimer,
  settings: Settings,
  platform: Platform,
): void {
  for (const effect of effects) {
    switch (effect.type) {
      case 'ScheduleAlarm':
        // The alert text is saved with the alarm so it can be shown without JavaScript.
        platform.scheduleAlarm(
          effect.sessionId,
          effect.deadlineElapsedMs,
          completionText(state, !nextStartsItself(state.type, settings)),
        );
        break;
      case 'CancelAlarm':
        platform.cancelAlarm();
        break;
      case 'ShowOngoing': {
        const running = state.status === 'RUNNING';
        platform.showOngoing(
          state.sessionId,
          ongoingTitle(state),
          running ? null : pausedText(remainingMsAt(state, platform.now())),
          running,
          state.deadlineElapsedMs ?? 0,
        );
        break;
      }
      case 'ShowCompletion':
        platform.showCompletion(
          effect.session.id,
          completionText(
            {
              type: effect.session.type,
              durationMs: effect.session.plannedMs,
              intent: effect.session.intent,
            },
            effect.session.type === 'FOCUS'
              ? effect.nextBreak !== null
              : state.status !== 'RUNNING',
          ),
        );
        break;
      case 'ClearNotifications':
        platform.clearNotifications(effect.which);
        break;
      case 'UpdateWidget':
        platform.updateWidget(state);
        break;
      case 'RecordSession':
      case 'RememberIntent':
        break; // data effects: written by the controller inside the transaction
    }
  }
}

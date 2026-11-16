/** The real Platform, backed by modules/focus-native. */
import FocusNative from '../../modules/focus-native';

import type { Platform } from './platform';

export const nativePlatform: Platform = {
  now: () => FocusNative.now(),
  scheduleAlarm: (sessionId, deadlineElapsedMs, text) =>
    FocusNative.scheduleAlarm(
      sessionId,
      deadlineElapsedMs,
      text.title,
      text.body,
      text.actionLabel,
      text.actionCommand,
    ),
  cancelAlarm: () => FocusNative.cancelAlarm(),
  showOngoing: (sessionId, title, text, running, deadlineElapsedMs) =>
    FocusNative.showOngoing(sessionId, title, text, running, deadlineElapsedMs),
  showCompletion: (sessionId, text) =>
    FocusNative.showCompletion(
      sessionId,
      text.title,
      text.body,
      text.actionLabel,
      text.actionCommand,
    ),
  clearNotifications: (which) => FocusNative.clearNotifications(which),
  updateWidget: () => {
    // Phase 6: the widget does not exist yet.
  },
};

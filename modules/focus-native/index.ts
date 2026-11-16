/**
 * TypeScript face of the Kotlin module. Every method is synchronous (JSI).
 * App code should not import this directly: use src/services/platform.ts, which can be
 * swapped for a fake in tests.
 */
import { requireNativeModule } from 'expo';

export type NativeNow = {
  elapsedMs: number;
  epochMs: number;
  bootCount: number;
  tzOffsetMin: number;
};

export type ButtonCommand = 'Start' | 'Pause' | 'Resume' | 'Reset' | 'Skip';

export type FocusNativeModule = {
  now(): NativeNow;
  isDebugBuild(): boolean;

  canScheduleExactAlarms(): boolean;
  /** Returns how the alarm was scheduled. */
  scheduleAlarm(
    sessionId: string,
    deadlineElapsedMs: number,
    title: string,
    body: string,
    actionLabel: string | null,
    actionCommand: ButtonCommand | null,
  ): 'exact' | 'inexact';
  cancelAlarm(): void;
  openExactAlarmSettings(): void;

  areNotificationsEnabled(): boolean;
  openNotificationSettings(): void;
  showOngoing(
    sessionId: string,
    title: string,
    text: string | null,
    running: boolean,
    deadlineElapsedMs: number,
  ): void;
  showCompletion(
    sessionId: string,
    title: string,
    body: string,
    actionLabel: string | null,
    actionCommand: ButtonCommand | null,
  ): void;
  clearNotifications(which: 'ongoing' | 'all'): void;
  setAlertPrefs(sound: boolean, vibration: boolean): void;

  /** Wallpaper colours on Android 12+, otherwise null. */
  getDynamicPalette(): Record<string, string> | null;

  // Debug / spike helpers
  getEventLog(): string[];
  clearEventLog(): void;
  logEvent(message: string): void;
  spikeLoad(): string | null;
  spikeSave(json: string | null): void;
};

export default requireNativeModule<FocusNativeModule>('FocusNative');

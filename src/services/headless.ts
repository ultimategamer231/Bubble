/**
 * Background entry point. Android starts this task (through FocusHeadlessService) when a
 * notification button is tapped, the completion alarm fires, or the phone finishes booting
 * — whether or not the app is open. It must be registered as soon as the JS bundle loads,
 * which is why index.js imports this file before the router.
 */
import { AppRegistry, AppState } from 'react-native';

import { dispatchSpike, type SpikeCommand } from '@/spike/spikeController';

import FocusNative from '../../modules/focus-native';

export const HEADLESS_TASK = 'FocusCommand';

export type HeadlessData = {
  command: string;
  sessionId?: string | null;
  source?: string | null;
  receivedAtElapsedMs?: number;
};

const BUTTON_COMMANDS = ['Start', 'Pause', 'Resume', 'Reset', 'Skip'] as const;

/** Turns the native payload into a command, or null if it isn't one we accept. */
export function toCommand(data: HeadlessData, foreground: boolean): SpikeCommand | null {
  if (data.command === 'Reconcile') return { type: 'Reconcile', foreground };
  const type = BUTTON_COMMANDS.find((c) => c === data.command);
  // Buttons must say which session they were drawn for; stale ones are dropped by the reducer.
  if (!type || !data.sessionId) return null;
  return { type, sessionId: data.sessionId };
}

export async function runHeadlessTask(data: HeadlessData): Promise<void> {
  const cmd = toCommand(data, AppState.currentState === 'active');
  if (cmd === null) return;
  await dispatchSpike(cmd, data.source ?? 'headless');
  if (typeof data.receivedAtElapsedMs === 'number' && data.receivedAtElapsedMs > 0) {
    const tookMs = Math.round(FocusNative.now().elapsedMs - data.receivedAtElapsedMs);
    FocusNative.logEvent(`${data.source ?? 'headless'}/${data.command} applied in ${tookMs} ms`);
  }
}

export function registerHeadlessTask(): void {
  AppRegistry.registerHeadlessTask(HEADLESS_TASK, () => runHeadlessTask);
}

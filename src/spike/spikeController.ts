/**
 * PHASE 2 SPIKE — temporary. Replaced by src/services/TimerController.ts in Phase 3.
 *
 * A tiny stand-in for the controller so the native pieces can be proven on a real phone:
 * it runs the real reducer, but keeps the timer state as JSON in native SharedPreferences
 * instead of SQLite. Only the debug screen and the headless task use it.
 */
import { randomUUID } from 'expo-crypto';

import { DEFAULT_SETTINGS, type Settings } from '@/domain/settings';
import {
  createInitialTimer,
  reduce,
  type ActiveTimer,
  type Command,
  type SessionRecord,
} from '@/domain/timer';
import { nativePlatform } from '@/services/nativePlatform';
import { applyPlatformEffects } from '@/services/platform';

import FocusNative from '../../modules/focus-native';

export type SpikeState = { timer: ActiveTimer; settings: Settings; recorded: SessionRecord[] };

/** Commands the spike accepts, without the IDs the controller fills in. */
export type SpikeCommand =
  | { type: 'Start' | 'Pause' | 'Resume' | 'Reset' | 'Skip'; sessionId?: string }
  | { type: 'Reconcile'; foreground: boolean };

const listeners = new Set<(state: SpikeState) => void>();
let queue: Promise<unknown> = Promise.resolve();

export function loadSpike(): SpikeState {
  const raw = FocusNative.spikeLoad();
  if (raw) {
    try {
      return JSON.parse(raw) as SpikeState;
    } catch {
      // fall through to a fresh state
    }
  }
  return {
    timer: createInitialTimer(randomUUID(), DEFAULT_SETTINGS),
    settings: DEFAULT_SETTINGS,
    recorded: [],
  };
}

export function subscribeSpike(listener: (state: SpikeState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function run(mutate: (state: SpikeState) => SpikeState): Promise<SpikeState> {
  // One at a time: the same promise-chain mutex the real controller will use.
  const next = queue.then(() => {
    const state = mutate(loadSpike());
    FocusNative.spikeSave(JSON.stringify(state));
    listeners.forEach((l) => l(state));
    return state;
  });
  queue = next.catch(() => undefined);
  return next;
}

export function dispatchSpike(cmd: SpikeCommand, source: string): Promise<SpikeState> {
  return run((state) => {
    const full = { ...cmd, newSessionId: randomUUID() } as Command;
    const now = nativePlatform.now();
    const { next, effects } = reduce(state.timer, full, now, state.settings);
    const recorded = effects.flatMap((e) => (e.type === 'RecordSession' ? [e.session] : []));
    FocusNative.logEvent(
      `js ${source}: ${cmd.type} → ${next.type}/${next.status}` +
        (recorded.length ? ` (recorded ${recorded.map((r) => r.status).join(',')})` : ''),
    );
    applyPlatformEffects(effects, next, state.settings, nativePlatform);
    return { ...state, timer: next, recorded: [...recorded, ...state.recorded].slice(0, 10) };
  });
}

/** Changes the spike's focus length (minutes). Applies to the next session. */
export function setSpikeFocusMinutes(focusMin: number): Promise<SpikeState> {
  return run((state) => ({ ...state, settings: { ...state.settings, focusMin } })).then(() =>
    dispatchSpike({ type: 'Reconcile', foreground: true }, 'settings'),
  );
}

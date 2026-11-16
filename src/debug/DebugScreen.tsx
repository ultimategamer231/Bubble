/**
 * FOCUS_BUBBLE_DEBUG_SCREEN — Phase 2 native spike controls.
 * Bundled only in development and CI debug builds (see app/debug.tsx); never in release.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  PermissionsAndroid,
  Platform as RNPlatform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { minTouch, radius, space, type as typeScale } from '@/design/tokens';
import { useTheme } from '@/design/useTheme';
import { formatClock, remainingMsAt } from '@/domain/timer';
import { ongoingTitle } from '@/services/copy';
import {
  dispatchSpike,
  loadSpike,
  setSpikeFocusMinutes,
  subscribeSpike,
  type SpikeState,
} from '@/spike/spikeController';

import FocusNative from '../../modules/focus-native';

function formatLogLine(line: string): string {
  const cut = line.indexOf('|');
  const at = new Date(Number(line.slice(0, cut)));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}  ${line.slice(cut + 1)}`;
}

function Button({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.button, { backgroundColor: theme.primary }]}
    >
      <Text style={[styles.buttonText, { color: theme.onPrimary }]}>{label}</Text>
    </Pressable>
  );
}

function Line({ children }: { children: string }) {
  const theme = useTheme();
  return <Text style={[styles.line, { color: theme.text }]}>{children}</Text>;
}

function Heading({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <Text accessibilityRole="header" style={[styles.heading, { color: theme.textMuted }]}>
      {children}
    </Text>
  );
}

const readLog = (): string[] => FocusNative.getEventLog().slice().reverse();

export function DebugScreen() {
  const theme = useTheme();
  const [state, setState] = useState<SpikeState>(loadSpike);
  const [, setTick] = useState(0);
  const [log, setLog] = useState<string[]>(readLog);
  const [palette, setPalette] = useState<Record<string, string> | null>(() =>
    FocusNative.getDynamicPalette(),
  );
  const [permission, setPermission] = useState('');

  const refresh = useCallback(() => {
    setState(loadSpike());
    setLog(readLog());
    setPalette(FocusNative.getDynamicPalette());
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeSpike(refresh);
    const timer = setInterval(refresh, 1000);
    const appState = AppState.addEventListener('change', (s) => {
      if (s === 'active') void dispatchSpike({ type: 'Reconcile', foreground: true }, 'foreground');
    });
    return () => {
      unsubscribe();
      clearInterval(timer);
      appState.remove();
    };
  }, [refresh]);

  const now = FocusNative.now();
  const { timer } = state;
  const send = (type: 'Start' | 'Pause' | 'Resume' | 'Reset' | 'Skip') =>
    void dispatchSpike({ type, sessionId: timer.sessionId }, 'debug screen');

  const askPermission = async () => {
    if (RNPlatform.OS !== 'android' || Number(RNPlatform.Version) < 33) {
      setPermission('Not needed below Android 13');
      return;
    }
    const result = await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS');
    setPermission(result);
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
          Native spike (debug build)
        </Text>

        <Heading>Timer</Heading>
        <Line>{`${ongoingTitle(timer)} — ${timer.status}`}</Line>
        <Line>{`Remaining ${formatClock(remainingMsAt(timer, now))} of ${state.settings.focusMin} min focus`}</Line>
        <Line>{`Cycle ${timer.cycleCompleted} · notice pending: ${timer.interruptedNoticePending}`}</Line>
        <View style={styles.row}>
          <Button label="Start" onPress={() => send('Start')} />
          <Button label="Pause" onPress={() => send('Pause')} />
          <Button label="Resume" onPress={() => send('Resume')} />
          <Button label="End" onPress={() => send('Reset')} />
          <Button label="Skip" onPress={() => send('Skip')} />
        </View>
        <View style={styles.row}>
          <Button label="Focus = 1 min" onPress={() => void setSpikeFocusMinutes(1)} />
          <Button label="Focus = 5 min" onPress={() => void setSpikeFocusMinutes(5)} />
          <Button label="Focus = 25 min" onPress={() => void setSpikeFocusMinutes(25)} />
        </View>

        <Heading>Permissions</Heading>
        <Line>{`Notifications allowed: ${FocusNative.areNotificationsEnabled()} ${permission}`}</Line>
        <Line>{`Precise alerts (exact alarms): ${FocusNative.canScheduleExactAlarms()}`}</Line>
        <View style={styles.row}>
          <Button label="Ask for notifications" onPress={() => void askPermission()} />
          <Button
            label="Notification settings"
            onPress={() => FocusNative.openNotificationSettings()}
          />
          <Button
            label="Precise alerts settings"
            onPress={() => FocusNative.openExactAlarmSettings()}
          />
        </View>

        <Heading>Clock</Heading>
        <Line>{`elapsed ${Math.round(now.elapsedMs)} ms · boot #${now.bootCount} · UTC${now.tzOffsetMin >= 0 ? '+' : ''}${now.tzOffsetMin / 60}`}</Line>

        <Heading>Wallpaper palette</Heading>
        {palette === null ? (
          <Line>Not available (needs Android 12+)</Line>
        ) : (
          <View style={styles.row}>
            {Object.entries(palette).map(([name, hex]) => (
              <View
                key={name}
                accessibilityLabel={`${name} ${hex}`}
                style={[styles.swatch, { backgroundColor: hex, borderColor: theme.outline }]}
              />
            ))}
          </View>
        )}

        <Heading>Recorded sessions (latest first)</Heading>
        {state.recorded.length === 0 ? <Line>None yet</Line> : null}
        {state.recorded.map((r) => (
          <Line
            key={r.id}
          >{`${r.type} ${r.status} · ${Math.round(r.focusedMs / 1000)} s · ${r.localDate}`}</Line>
        ))}

        <Heading>Event log (latest first)</Heading>
        <View style={styles.row}>
          <Button
            label="Clear log"
            onPress={() => {
              FocusNative.clearEventLog();
              refresh();
            }}
          />
        </View>
        {log.map((line, i) => (
          <Line key={`${i}-${line}`}>{formatLogLine(line)}</Line>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: space.lg, gap: space.sm },
  title: { fontSize: typeScale.title, fontWeight: '700' },
  heading: { fontSize: typeScale.label, fontWeight: '600', marginTop: space.lg },
  line: { fontSize: typeScale.label },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  button: {
    minHeight: minTouch,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: typeScale.label, fontWeight: '600' },
  swatch: { width: 32, height: 32, borderRadius: radius.chip, borderWidth: 1 },
});

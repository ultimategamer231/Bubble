# focus-native

The only place in Focus Bubble with Android-native (Kotlin) code. It gives JavaScript the
few things React Native can't do by itself: a reboot-proof clock, an alarm that fires when the
app is closed, a notification whose countdown is ticked by Android, and a way to run a bit
of JavaScript in the background.

**No timer logic lives here.** Kotlin never decides what a tap means. It passes commands to
JavaScript (`TimerController` → `reduce`) and draws what JavaScript tells it to.

## How a background tap travels

```
notification button ─▶ CommandReceiver ─┐
alarm at the deadline ─▶ AlarmReceiver ─┼─▶ FocusHeadlessService ─▶ JS task "FocusCommand"
phone finished booting ─▶ BootReceiver ─┘        (src/services/headless.ts → controller → reduce)
```

The alarm receiver also posts the "Bubble earned" notification and plays the sound **before**
any JavaScript runs, using text that was saved when the alarm was set. So the alert appears
even if starting JavaScript is slow or refused.

## Files

| File | In plain words |
|---|---|
| `expo-module.config.json` | Tells Expo this folder is a native module and which class to load. |
| `index.ts` | The TypeScript description of every native method. App code uses `src/services/platform.ts`, not this file directly. |
| `plugin/withFocusNative.js` | Runs during `expo prebuild`. Adds the five allowed permissions, the three receivers and the background service to the generated `AndroidManifest.xml`. Only the boot receiver is exported. |
| `android/build.gradle` | Build settings and the two libraries used (React Native, AndroidX core for notifications) plus JUnit for tests. |
| `…/FocusNativeModule.kt` | The bridge. Each `Function("name")` is callable from JavaScript, synchronously. It only forwards to the files below. |
| `…/FocusContract.kt` | Shared names (intent actions, extras, channel and notification IDs) and the two checks that decide whether an incoming intent is really ours. |
| `…/Clock.kt` | Reads the clocks: time since boot (never jumps), wall clock, boot count (goes up on each restart) and timezone offset. Also converts a boot-clock deadline to wall-clock time for the notification countdown. |
| `…/Alarms.kt` | Sets or cancels the single "session ends" alarm. Uses an exact alarm if the user allowed "Alarms & reminders", otherwise an inexact one that Android may deliver late when the phone is idle. |
| `…/Notifications.kt` | Creates the two channels ("Running session", silent; "Session alerts", high) and builds the ongoing countdown notification and the completion notification, including their buttons. |
| `…/AlertPlayer.kt` | `AlertGate` holds the rules (sound only if enabled, ringer normal and Do Not Disturb off; vibration if enabled and not silent). `AlertPlayer` plays the chime and vibration. |
| `…/Receivers.kt` | The three broadcast receivers shown in the diagram. Each validates the intent, writes a log line and starts the headless service. |
| `…/FocusHeadlessService.kt` | Starts React Native's background-task runner for the `FocusCommand` JS task, holding a wake lock only while it runs. Logs if Android refuses to start it. |
| `…/DynamicPalette.kt` | Reads the wallpaper ("Material You") colours on Android 12+; returns nothing on older versions. |
| `…/Prefs.kt` | A small native key-value store for what receivers need while JavaScript isn't running: the saved alert text, which session already made a sound, the sound/vibration switches, and the debug event log. (During Phase 2 only it also holds the spike's timer state; from Phase 3 the timer lives in SQLite.) |
| `android/src/main/res/` | Status-bar icon (bubble outline), channel names and button labels, notification accent colour, and `raw/focus_chime.wav` (a soft two-note chime generated for this app). |
| `android/src/test/…/FocusNativeLogicTest.kt` | JUnit tests for the pure rules: sound/vibration gating, intent validation, clock conversion, colour formatting. Run in CI by `./gradlew testDebugUnitTest`. |

## Rules for changing this module
- Keep Kotlin small and commented; put decisions in TypeScript.
- Every PendingIntent is `FLAG_IMMUTABLE` and carries the session ID it was drawn for.
- No new permission without updating `docs/ARCHITECTURE.md §8` and `plugin/withFocusNative.js` together.
- Update this README when a file is added or its job changes.

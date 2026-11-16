Resume here: Phase 2 PR — get CI green, merge, publish `phase-2`, send the 📱 Phase 2 gate (native spike checklist, combined with the still-open Phase 0 launch check), then stop.

# Progress

## Status
| Phase | State | PR | CI run | APK/release | Owner result |
|---|---|---|---|---|---|
| Bootstrap | Done | — (direct seed of empty repo, owner-approved) | — | — | — |
| 0 — Scaffold, CI, first APK | Merged; 📱 gate sent | [#1](https://github.com/ultimategamer231/Bubble/pull/1) | [ci 43946375830](https://github.com/ultimategamer231/Bubble/actions/runs/43946375830) · [android 43946375786](https://github.com/ultimategamer231/Bubble/actions/runs/43946375786) | [phase-0-fix1](https://github.com/ultimategamer231/Bubble/releases/tag/phase-0-fix1) · 121,326,550 bytes (`phase-0` is superseded: no JS bundle) | waiting |
| 1 — Pure domain | Done | [#2](https://github.com/ultimategamer231/Bubble/pull/2) | [ci 43953509699](https://github.com/ultimategamer231/Bubble/actions/runs/43953509699) · [android 43953509692](https://github.com/ultimategamer231/Bubble/actions/runs/43953509692) | n/a (no phone gate) | n/a |
| 2 — Native spike | In review | pending | pending | pending | pending |
| 3 — Data + TimerController | Not started | | | | |
| 4 — UI | Not started | | | | |
| 5 — Notifications & reliability | Not started | | | | |
| 6 — Widget | Not started | | | | |
| 7 — QA + signed release | Not started | | | | |

## Test device (owner)
Samsung, Android 14 / One UI 6 (owner-stated 2026-11-16). Exact model: **not yet given — ask at the Phase 0 gate.**

## Environment notes (apply to every phase)
- Cloud sandbox: Node v22.23.4, npm 10.9.9, git 2.43.0. No Android SDK or emulator; Gradle runs only in GitHub Actions.
- `gh` CLI is installed but **not authenticated** here (`gh auth status` → "The token in GH_TOKEN is invalid"). PRs, checks, merges, workflow runs and release lookups are done through the session's GitHub integration instead; same operations, different client.
- `git push` of branches works. **Deleting remote branches is refused** by the session's git proxy (`git push origin --delete tmp/push-check` → "remote end hung up unexpectedly"), so merged phase branches (`phase-0-scaffold`, `phase-1-domain-core`), the superseded `phase-1-domain` and `tmp/push-check` stay on the remote until the owner deletes them (or enables Settings → General → "Automatically delete head branches").
- Repo is public (owner-stated), so release APKs download without signing in.

## Log

### Bootstrap — 2026-11-16
- Repo was completely empty (no commits, no `main`). The spec pack arrived as an uploaded zip (`FocusBubble_Starter_v2.zip`, one `FocusBubble_ClaudeCode_Starter/` folder, 36 entries, no conflicts).
- Owner decisions (asked up front): seed `main` directly once; phone is Android 14 / One UI 6; repo is public; use `phase-N-<slug>` branches.
- Extracted the pack to the repo root and pushed it as the first commit on `main` (`1094fff`). `git ls-files` shows `CLAUDE.md`, `README.md`, `.gitignore`, `.claude/`, `docs/`, `design/`.
- Read `CLAUDE.md`, `README.md` and every file in `docs/`, plus `design/README.md`, `design/canvas.json` and `design/SystemSurfaces.dc.html` (icon draft). The remaining screen mockups are read at the start of Phase 4, when they are built against.
- Toolchain: `node -v` v22.23.4 · `npm -v` 10.9.9 · `git --version` 2.43.0 · `npm view expo version` 58.0.25 · `gh auth status` not authenticated (see above) · throwaway branch push OK, delete refused (see above).

### Phase 0 — 2026-11-16
Work done
- `npx create-expo-app@latest` (SDK 58 default template) run in a scratch folder to read the current template; the app here was then built from it without any demo screens, components, fonts or images.
- Expo SDK **58.0.25**, React Native **0.88.1**, React 19.3.0, TypeScript 6.0, Expo Router, New Architecture + Hermes (template defaults). All Expo/RN packages added with `npx expo install`.
- `app.config.ts`: name, slug, package `com.corexlr.focusbubble`, version 1.0.0 / versionCode 1, orientation `default`, `userInterfaceStyle: automatic`, splash `#F4FAF9` (dark `#0C1719`), adaptive icon (teal bubble; sources in `assets/icon-src/`, rendered by `render.cjs`), `platforms: ['android']`.
- `plugins/withReleaseNoInternet.js`: writes `android/app/src/release/AndroidManifest.xml` with `INTERNET` `tools:node="remove"`.
- `src/design/tokens.ts` (all BRAND.md values), shell screen `app/index.tsx` (brand background + "Focus Bubble" in Nunito 700). Nunito 600/700 embedded natively via the `expo-font` plugin (`assets/fonts/`, OFL licence included).
- ESLint (expo flat config + prettier), Prettier, Jest (`jest-expo`, Testing Library), 2 tests.
- `.github/workflows/ci.yml` and `android.yml` (Node 22, Temurin JDK 17, prebuild → `testDebugUnitTest lintDebug assembleDebug`, artifact, optional `release_tag` pre-release).

Values read from the prebuilt project (`npx expo prebuild --platform android --clean --no-install`)
- compileSdk **37**, targetSdk **36**, buildTools 37.0.0, NDK 27.1.12297006, Kotlin 2.2.0, Gradle 9.4.1 (from React Native 0.88's version catalog). targetSdk 36 meets Play's new-app requirement.
- minSdk: SDK default is 24; pinned to **26** with `expo-build-properties` (PRD §4, decision T-12).
- JDK: React Native 0.88's Gradle plugin uses `jvmToolchain(17)` and errors with "requires JDK17 or higher" → CI uses Temurin 17.
- Main manifest permissions after prebuild: `INTERNET`, `VIBRATE` (+ storage and overlay permissions explicitly removed). Release overlay removes `INTERNET`. `android:allowBackup="false"` (T-13).

Local results
- `npx tsc --noEmit` → exit 0
- `npx eslint .` → exit 0
- `npx jest --ci` → 2 suites, 2 tests passed
- `npx expo-doctor` → "20/20 checks passed. No issues detected!"

CI history
- Run 1 (https://github.com/ultimategamer231/Bubble/actions/runs/43942189226): `ci.yml` green; `android.yml` **failed** at `:app:lintDebug` — `styles.xml:13: Error: android:windowSplashScreenBehavior requires API level 33 (current min is 26) [NewApi]` (Expo-generated splash style). Fix: `plugins/withLintCleanStyles.js` adds `tools:targetApi="33"`; verified in the local prebuild output. Also limited CI to arm ABIs (T-18).

- Run 2 on `f93e3bd`: [ci 43946375830](https://github.com/ultimategamer231/Bubble/actions/runs/43946375830) green, [android 43946375786](https://github.com/ultimategamer231/Bubble/actions/runs/43946375786) green (18.5 min) → PR #1 squash-merged as `9f777dd`.
- Release run [43949781983](https://github.com/ultimategamer231/Bubble/actions/runs/43949781983) (`release_tag=phase-0`) green → https://github.com/ultimategamer231/Bubble/releases/tag/phase-0, asset `FocusBubble-phase-0-debug.apk`, **119,321,997 bytes**.
- **Defect found before the gate was sent:** downloaded the asset and listed it (`unzip -l p0.apk | grep -c index.android.bundle` → `0`). A stock debug build contains no JavaScript and expects Metro on a computer, so this APK would show an error screen on the owner's phone. Not sent to the owner.
- Fix (in the Phase 1 PR): `plugins/withStandaloneDebug.js` + CI flag `-PfocusBubble.standaloneDebug=true` bundle the JS into the debug APK; React Native 0.88 falls back to the embedded bundle when Metro is unreachable (`ReactHostImpl.kt`, `isMetroRunning` branch). CI now fails if `assets/index.android.bundle` is missing. Republish as `phase-0-fix1` (tag `phase-0` is left in place; it cannot be deleted from this session).
- The debug APK is large (≈114 MB) because debug native libraries are unstripped and two ABIs are included. Release builds (Phase 7) are stripped and minified; the 25 MB limit applies to the release AAB.

Decisions: T-12 to T-18, T-23 (see DECISIONS.md); O-05 resolved (repo public).
Blockers: none.
- `phase-0-fix1` published from `main` `f92b97c` after PR #2 merged: https://github.com/ultimategamer231/Bubble/releases/tag/phase-0-fix1, asset `FocusBubble-phase-0-fix1-debug.apk`, **121,326,550 bytes**, sha256 `1e2f00a7…c42d`. Verified by download: `unzip -l` shows `assets/index.android.bundle` (1,970,228 bytes) and both Nunito fonts.
- 📱 Gate sent 2026-11-16. **Owner result: not reported.** On 2026-11-16 the owner replied "Start phase 2 … do a self audit, I trust your judgement" without checklist results. Phase 0 device items therefore stay **NOT RUN (owner)**; they are folded into the Phase 2 gate, whose first item is the same install-and-launch check. Self-audit evidence (not a device result): APK contents verified by download, as above.

### Phase 1 — 2026-11-16
Work done (pure TypeScript, no React/Expo imports in `src/domain`)
- `src/domain/timer`: `types.ts`, `reduce.ts` (all commands, catch-up/reconcile, auto-start rules, reboot rule, derived platform effects), `display.ts`, `__fixtures__/vectors.json` (14 hand-written golden vectors; expected values authored from the spec, not generated by the reducer).
- `src/domain/settings.ts` (defaults, ranges, validation, intent normalisation, recent intents), `src/domain/time.ts` (local dates, midnight), `src/domain/hash.ts` (FNV-1a, mulberry32).
- `src/domain/stats`: totals, 7-day series, current/best streak, formatting. `src/domain/bubbles`: size, colour index, deterministic bottom-up layout, 12 + "+N".
- Jest coverage threshold: `src/domain` ≥ 90% lines (enforced in `jest.config.js`).

Local results
- `npx jest --ci --coverage` → 7 suites, 101 tests passed; `src/domain` 100% lines, 100% functions, ≥98.7% branches.
- `npx tsc --noEmit` → exit 0 · `npx eslint .` → exit 0.
- QA_TEST_PLAN §A items 1–16: all covered by tests named after the item (`A1 start`, `A5 long-break cycle`, …; A16 = `golden vectors`).

Decisions: T-19 to T-22. Blockers: none.
CI: PR #2 green — [ci 43953509699](https://github.com/ultimategamer231/Bubble/actions/runs/43953509699), [android 43953509692](https://github.com/ultimategamer231/Bubble/actions/runs/43953509692) (11.5 min, includes the new bundle check). Squash-merged as `f92b97c`.
Next: Phase 0 gate (owner), then Phase 2 native spike.

### Phase 2 — 2026-11-16 (in review)
Work done
- `modules/focus-native` (local Expo module, autolinked: `npx expo-modules-autolinking resolve --platform android` lists `com.corexlr.focusbubble.focusnative.FocusNativeModule`).
  - Kotlin: `FocusNativeModule`, `FocusContract`, `Clock`, `Alarms` (exact with inexact fallback), `Notifications` (two channels, chronometer countdown, Pause/Resume/End, completion + button), `AlertPlayer`/`AlertGate` (silent/DND gating), `Receivers` (alarm, command, boot), `FocusHeadlessService`, `DynamicPalette`, `Prefs`.
  - `plugin/withFocusNative.js`: permissions (exactly ARCHITECTURE §8), receivers, service. Only `BootReceiver` is exported.
  - `README.md`: every file explained in plain language. JUnit: `FocusNativeLogicTest` (6 tests).
  - Completion sound: `res/raw/focus_chime.wav`, 30,912 bytes, synthesised for this app (resolves O-02).
- JS: `src/services/platform.ts` (Platform interface + `applyPlatformEffects`), `nativePlatform.ts`, `copy.ts` (notification wording), `headless.ts` (task `FocusCommand`), `index.js` entry (registers the task before the router).
- Spike only (removed in Phase 3): `src/spike/spikeController.ts` runs the real reducer with state kept in native SharedPreferences, so commands work with the app process dead.
- Hidden debug screen `app/debug.tsx` → `src/debug/DebugScreen.tsx`.

Local results
- `npx tsc --noEmit` exit 0 · `npx eslint .` exit 0 · `npx jest --ci` → 9 suites, 113 tests passed.
- `npx expo prebuild --platform android --clean --no-install`: main manifest permissions = `INTERNET` (debug/Metro; removed in release), `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, `SCHEDULE_EXACT_ALARM`, `VIBRATE`, `WAKE_LOCK`; 3 receivers + 1 service present.
- Debug screen absent from release-style bundles: `npx expo export:embed --platform android --dev false --minify true` → marker string "Native spike (debug build)" count: flag `EXPO_PUBLIC_DEBUG_SCREEN=1` → 1; `=0` → 0; unset → 0.
- Kotlin cannot be compiled in this sandbox (no Android SDK); it is compiled, linted and unit-tested only in CI.

Decisions: T-24 to T-27; O-02 resolved. Blockers: none.
Next: CI → merge → `phase-2` APK → 📱 gate → decide headless JS vs Kotlin mirror.

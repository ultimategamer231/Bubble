# Decision Log

Format: ID · decision · reason · status. Claude Code appends new entries; it never silently changes a Confirmed one.

## Confirmed by the owner (Nov 2026)
| ID | Decision | Reason |
|---|---|---|
| D-01 | Public, free Google Play app; no ads, no IAP | Reputation/portfolio value; simplest policy and data-safety story |
| D-02 | Package `com.corexlr.focusbubble`; publisher Corex Digital Solutions (organization account) with personal account as fallback | Corex brand; package is permanent |
| D-03 | React Native + Expo instead of native Kotlin | Owner's strongest languages are JS/TS; keeps iOS possible |
| D-04 | Android only for v1.0; shared TS code iOS-ready | Scope |
| D-05 | Global English audience, mid-to-high-end phones primary, budget phones must still work | |
| D-06 | Visual identity leans into the bubble: timer is a bubble that fills; jar collection | Differentiation |
| D-07 | Brand palette by default; wallpaper colours optional (Android 12+), applied to primary roles only | Brand survives Material You |
| D-08 | v1.0 includes Focus intent and Bubble collection; ambient sounds move to v1.1; distraction blocker rejected | Launch sooner; Play permission risk |
| D-09 | Abandoned sessions don't earn a bubble; nothing is popped or taken away | Calm, non-punitive; accidental resets happen |
| D-10 | Claude Code runs in the cloud; Gradle builds in GitHub Actions; owner tests on his own phone | No Android SDK in the sandbox |

## Technical decisions (from the spec rewrite)
| ID | Decision | Reason |
|---|---|---|
| T-01 | One SQLite DB for active timer, history and settings | Atomic completion; readable from headless JS |
| T-02 | One local Expo Module (`focus-native`) for all Android-native code | One place to review Kotlin |
| T-03 | No `expo-notifications`; native notifications with system chronometer | Live countdown without per-second updates |
| T-04 | No foreground service in v1.0 | Policy/battery; revisit with ambient sounds |
| T-05 | `SCHEDULE_EXACT_ALARM` optional + inexact fallback; never `USE_EXACT_ALARM` | Play restricts USE_EXACT_ALARM to alarm-clock/calendar apps |
| T-06 | Completion sound/vibration played by the app (respecting silent/DND), even if notifications are denied | In-app toggles keep working; resolves old open question |
| T-07 | Reboot: RUNNING → INTERRUPTED, PAUSED survives | Monotonic clock resets on boot |
| T-08 | Day attribution by completion local date, stored at write time, never recomputed | Deterministic stats |
| T-09 | Focus never auto-starts while the user is away | Prevents unearned bubbles |
| T-10 | Navigation: Focus / Jar / Insights tabs, Settings via gear | Jar replaces the History tab |
| T-11 | Headless JS for widget/notification commands, Kotlin-mirror fallback decided in Phase 2 | Single state machine if possible |

## Decisions made during the build
| ID | Date | Decision | Reason |
|---|---|---|---|
| T-12 | 2026-11-16 | Expo SDK 58.0.25 / React Native 0.88.1. compileSdk 37, targetSdk 36 (SDK defaults). minSdk pinned to **26** with `expo-build-properties` | The SDK's own minSdk is 24, lower than PRD §4 (Android 8.0), so the PRD value is enforced |
| T-13 | 2026-11-16 | `android:allowBackup="false"` | "Nothing leaves the phone" (PRD §2): Android auto-backup would copy the database to the user's Google account. Consequence: history does not transfer to a new phone. Owner can reverse this before launch |
| T-14 | 2026-11-16 | Nunito 600/700 TTFs are committed in `assets/fonts/` and embedded natively by the `expo-font` config plugin (no runtime font loading) | No flash of the system font, nothing to await at launch, no extra dependency |
| T-15 | 2026-11-16 | Routes live in root `app/` (ARCHITECTURE §2), not the template's `src/app/`. `react-dom` is pinned at the SDK version as a dependency although the app is Android-only | Follows the architecture doc. `react-dom` is an optional peer of expo-router's dependencies; without the pin npm resolves a newer one and fails the install. It is not bundled into the Android app |
| T-16 | 2026-11-16 | Workflow: `main` was seeded directly once (empty repo, owner-approved). Phase APKs are published by running `android.yml` manually with `release_tag`, which creates the tag and pre-release with `GITHUB_TOKEN` | The cloud session cannot push tags reliably or use `gh`; RELEASE.md's "push a tag" step is replaced by the workflow input |
| T-17 | 2026-11-17 | Test device: **Samsung Galaxy A24 (SM-A245F), Android 13, One UI 5.1** (owner screenshot). Supersedes the earlier "Android 14 / One UI 6" | QA checklists are tailored to One UI 5.1. Android 14+ specifics (exact alarms denied by default, dismissable ongoing notification) cannot be owner-verified on this phone and will be marked NOT RUN in the QA report unless a second device is available |
| T-18 | 2026-11-16 | CI builds only `arm64-v8a` and `armeabi-v7a` (no x86 emulator ABIs). `plugins/withLintCleanStyles.js` annotates Expo's generated splash style so `lintDebug` passes on minSdk 26 | No emulator is used anywhere; first CI build took 22 min with four ABIs. The lint error (`windowSplashScreenBehavior requires API 33`) comes from generated code and is harmless at runtime |
| T-19 | 2026-11-16 | Reducer shape: commands carry `newSessionId`; added `AckInterrupted` command and `RememberIntent` effect; a command that arrives after the deadline completes the session and is then dropped; the active timer never rests in CANCELLED/INTERRUPTED | Keeps `reduce` pure and idempotent; the user's tap applied to a session that had already ended would otherwise act on the wrong one |
| T-20 | 2026-11-16 | "In the foreground when the break ends" (auto-start focus) = a foreground Reconcile that notices the break's end within 5 s. Later than that, the break rests as COMPLETED and focus waits for a tap | ARCHITECTURE §3: the app never starts a focus session the user isn't present for |
| T-21 | 2026-11-16 | The focus intent is carried across breaks into the next focus session (break rows store no intent). Skipping or finishing a long break resets the cycle; skipping a focus never advances it | People usually continue the same task; the docs didn't say |
| T-22 | 2026-11-16 | Break completions also raise a completion alert (`ShowCompletion` with the break row) | UI_UX §5 only words the focus alert, but a break that ends silently in the background is useless. Copy: "Break's over" / "Ready when you are." |
| T-23 | 2026-11-16 | Phase test APKs are debug builds with the JS bundle embedded (`-PfocusBubble.standaloneDebug=true`, `plugins/withStandaloneDebug.js`) | A stock debug APK needs Metro on a computer; the owner tests on a phone alone. Still a debug build (debuggable, debug-signed, INTERNET present), so the Phase 2 debug screen is available in it |
| T-24 | 2026-11-16 | One headless task, `FocusCommand`, carries both button commands and `Reconcile` (ARCHITECTURE §2 named two tasks). `isAllowedInForeground = true` | One code path; a notification button can also be tapped while the app is open |
| T-25 | 2026-11-16 | Debug screen is bundled only when `__DEV__` or `EXPO_PUBLIC_DEBUG_SCREEN=1` (set by CI for debug APKs). Verified by grepping production bundles | "Absent from release" must mean the code is not shipped, not merely hidden |
| T-26 | 2026-11-16 | Added dependency `expo-crypto` (session UUIDs); Hermes has no `crypto.randomUUID`. `package.json` `main` is now `index.js` so the headless task registers before the router | Not on the excluded list; installed with `npx expo install` |
| T-27 | 2026-11-16 | Owner skipped the Phase 0 phone gate ("start phase 2 … self audit"). Phase 0 device items are recorded NOT RUN and re-checked as item 1 of the Phase 2 gate | Never mark a device item PASS without the owner |

## Open (decide during build; non-blocking)
| ID | Question | Default until decided |
|---|---|---|
| O-01 | Final app icon artwork | Teal bubble on light aqua (see mockups) |
| O-02 | Completion sound file | **Resolved 2026-11-16:** two-note chime synthesised for the app (`focus_chime.wav`, 31 KB, no third-party licence). Owner may replace it |
| O-03 | Exact bubble size constants | `PRD.md §8` formula |
| O-04 | Organization vs personal Play account | Organization if D-U-N-S arrives by end of Phase 6 |
| O-05 | Repo public or private | **Resolved 2026-11-16: public** (owner). Release APKs download without sign-in. |

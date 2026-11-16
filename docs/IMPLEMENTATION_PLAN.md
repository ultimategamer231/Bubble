# Implementation Plan

Sequential phases. Each phase ends with a **gate**: automated evidence (command output / CI run URL) **and**, where marked 📱, a check done by the owner on his Android phone. Claude Code stops at every 📱 gate, posts the APK link and the exact checklist, and waits.

Log every phase in `docs/PROGRESS.md`: what was done, commands + results, CI run URLs, files changed, blockers, decisions, next step. Commit at the end of each phase; tag `phase-N` to publish the test APK.

Effort is a rough guide in focused working days (owner + Claude Code), not a promise.

| Phase | Name | Est. | Risk |
|---|---|---|---|
| 0 | Repo, scaffold, CI, first APK on phone | 1 | Low |
| 1 | Pure domain: timer, stats, bubbles | 1–2 | Low |
| 2 | **Native spike** (highest risk, proven early) | 2–3 | **High** |
| 3 | Data layer + TimerController | 1–2 | Medium |
| 4 | UI: Focus, Jar, Insights, Settings | 3–5 | Medium |
| 5 | Notifications & reliability complete | 2 | Medium |
| 6 | Widget | 2–3 | High |
| 7 | QA hardening + signed release | 2–3 | Medium |
| 8 | Play launch | 1 + waiting (≥14 days if personal account) | External |

---

## Phase 0 — Repo, scaffold, CI
- Verify Node LTS, npm, `gh` auth, network access to npm and GitHub. Report the exact error if any is missing.
- `npx create-expo-app@latest` (TypeScript, Expo Router). Confirm the Expo SDK and that its Android `targetSdkVersion` meets Play's new-app requirement (`PLAY_LAUNCH.md`). Package `com.corexlr.focusbubble` (see D-02).
- ESLint, Prettier, `tsc --noEmit`, Jest (`jest-expo`) with one passing test.
- `.github/workflows/ci.yml` (typecheck, lint, test on every push) and `android.yml` (prebuild → `./gradlew assembleDebug`; on tag `phase-*` publish a GitHub pre-release with `FocusBubble-phase-N-debug.apk`).
- Config plugin stub that removes `INTERNET` from release builds.
- App shows a placeholder Focus screen with the brand background and Nunito title (not fake data; just the shell).
- **Gate:** CI green (paste run URL); 📱 owner installs the phase-0 APK and confirms it launches.

## Phase 1 — Pure domain (no React, no native)
- `src/domain/timer`: types, `reduce`, all commands, auto-start rules, reboot rule, golden test vectors JSON.
- `src/domain/stats`: day attribution, totals, streak/best streak, 7-day series.
- `src/domain/bubbles`: size, colour, deterministic layout.
- **Gate:** `npx jest --coverage` with ≥90% line coverage on `src/domain`; all tests in `QA_TEST_PLAN.md §A` pass.

## Phase 2 — Native spike (`modules/focus-native`)
Prove the risky platform parts before building UI on top of them.
- Expo Module skeleton + config plugin (manifest entries, receivers, channels).
- `now()` sync; alarm schedule/cancel with exact/inexact fallback; ongoing chronometer notification with Pause/Resume/End actions; `CommandReceiver` → `HeadlessJsTaskService` → JS task logs and applies the command to a temporary in-memory reducer; boot receiver → headless Reconcile; `getDynamicPalette()`.
- A hidden debug screen (dev builds only, removed from release) to trigger each capability.
- `modules/focus-native/README.md`: plain-language explanation of every Kotlin file for an owner who reads Kotlin occasionally.
- **Gate:** JUnit tests pass in CI; 📱 owner runs the spike checklist (`QA_TEST_PLAN.md §C-Spike`), especially: notification Pause works with the app swiped away; alarm fires with screen off. Result decides **headless JS vs Kotlin-mirror fallback** → record in `DECISIONS.md`.

## Phase 3 — Data + TimerController
- `expo-sqlite` DB, migrations, repositories, `TimerController` (mutex, transaction, post-commit effects), headless tasks wired to the controller, settings validation.
- **Gate:** controller + race + migration tests pass; CI green.

## Phase 4 — UI
- Tokens from `BRAND.md`; screens per `UI_UX.md` and `design/` mockups: Focus (all states, intent, completion card, confirmations, permission sheet), Jar (today's jar, bubble popover, grouped history, empty states), Insights, Settings.
- Bubble timer with liquid fill + wobble; reduced-motion path; landscape; 200% font.
- Component tests for each screen state.
- **Gate:** tests green; 📱 owner checks screens against mockups in light + dark, at largest font size, with TalkBack on the Focus screen.

## Phase 5 — Notifications & reliability
- Permission flow, sound/vibration gating, precise-alerts row, completion notification + Start-break action, interrupted banner, process-death recovery, midnight rollover.
- **Gate:** 📱 owner runs `QA_TEST_PLAN.md §C` reliability items (background 10 min, kill app, airplane mode, deny permission, reboot mid-session).

## Phase 6 — Widget
- `AppWidgetProvider`, RemoteViews layout (light/dark), Chronometer, progress-ring bitmap, snapshot pipeline, in-flight "…" state, widget preview image.
- **Gate:** 📱 widget checklist: start/pause/resume from widget with app dead; widget matches app within 3 s; survives reboot; resize 4×2 → 3×2.

## Phase 7 — QA hardening & release build
- Full `QA_TEST_PLAN.md` pass; permission audit (`aapt dump permissions`); AAB size check; remove debug screen; R8/Hermes on; privacy policy page; store listing assets (`PLAY_LAUNCH.md`); version `1.0.0` (versionCode 1).
- Signed AAB via CI with secrets (`RELEASE.md`).
- **Gate:** signed AAB artifact + debug APK in a `v1.0.0-rc1` pre-release; QA report table with PASS / FAIL / NOT RUN for every item.

## Phase 8 — Play launch
Follow `PLAY_LAUNCH.md`. Not a coding phase; Claude Code prepares text, checklists and fixes from tester feedback.

## Rules for every phase
- No roadmap feature (ambient sounds, extra widgets, tile, DND, goals, export) without the owner's written approval.
- No placeholder data in production code. No inert buttons.
- Never claim a build, test or device result without evidence.

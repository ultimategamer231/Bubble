Resume here: Phase 0 — wait for CI on the Phase 0 PR, merge, publish `phase-0` APK, then stop at the 📱 Phase 0 gate.

# Progress

## Status
| Phase | State | PR | CI run | APK/release | Owner result |
|---|---|---|---|---|---|
| Bootstrap | Done | — (direct seed of empty repo, owner-approved) | — | — | — |
| 0 — Scaffold, CI, first APK | In progress | pending | pending | pending | pending |
| 1 — Pure domain | Not started | | | | |
| 2 — Native spike | Not started | | | | |
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
- `git push` of branches works. **Deleting remote branches is refused** by the session's git proxy (`git push origin --delete tmp/push-check` → "remote end hung up unexpectedly"), so merged phase branches and `tmp/push-check` stay on the remote until the owner deletes them (or enables Settings → General → "Automatically delete head branches").
- Repo is public (owner-stated), so release APKs download without signing in.

## Log

### Bootstrap — 2026-11-16
- Repo was completely empty (no commits, no `main`). The spec pack arrived as an uploaded zip (`FocusBubble_Starter_v2.zip`, one `FocusBubble_ClaudeCode_Starter/` folder, 36 entries, no conflicts).
- Owner decisions (asked up front): seed `main` directly once; phone is Android 14 / One UI 6; repo is public; use `phase-N-<slug>` branches.
- Extracted the pack to the repo root and pushed it as the first commit on `main` (`1094fff`). `git ls-files` shows `CLAUDE.md`, `README.md`, `.gitignore`, `.claude/`, `docs/`, `design/`.
- Read `CLAUDE.md`, `README.md` and every file in `docs/`, plus `design/README.md`, `design/canvas.json` and `design/SystemSurfaces.dc.html` (icon draft). The remaining screen mockups are read at the start of Phase 4, when they are built against.
- Toolchain: `node -v` v22.23.4 · `npm -v` 10.9.9 · `git --version` 2.43.0 · `npm view expo version` 58.0.25 · `gh auth status` not authenticated (see above) · throwaway branch push OK, delete refused (see above).

### Phase 0 — 2026-11-16 (in progress)
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

Decisions: T-12 to T-17 (see DECISIONS.md); O-05 resolved (repo public).
Blockers: none.
Next: CI green on the PR → merge → run `android.yml` on `main` with `release_tag=phase-0` → verify the release asset → 📱 gate.

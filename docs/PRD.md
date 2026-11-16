# Product Requirements — Focus Bubble v1.0

Scope authority. If another doc conflicts with this one, this one wins; record the conflict in `DECISIONS.md`.

## 1. Vision
A calm Pomodoro timer for Android that you can start in two taps, that names what you're working on, and that turns every finished focus session into a bubble you can see collecting in a jar. It works offline, needs no account, and has no ads or tracking.

## 2. Why someone picks this over Forest, Flora, Focus To-Do
| Competitor pattern | Focus Bubble position |
|---|---|
| Account / cloud sync pushed early | Never. Nothing leaves the phone. |
| Ads or paywalled core features | Free, no ads, no paywall. |
| Punitive mechanics (tree dies when you leave) | **No punishment.** Abandoned sessions simply don't earn a bubble. Accidental resets aren't humiliating. |
| Busy task managers bolted on | One optional line: *what are you focusing on?* |
| Abstract statistics | A visible jar of bubbles per day, plus honest numbers. |

Positioning line (store listing seed): *"A gentle focus timer. Every session you finish becomes a bubble."*

## 3. Audience
Global, English. Students, developers, remote/office workers. Mid-to-high-end Android phones are the primary target. Budget phones must still work correctly (see §9) but are not the optimisation target.

## 4. Platform and product boundaries
- Android first. React Native + Expo (managed workflow with Continuous Native Generation and config plugins). Shared TypeScript code stays iOS-ready; Android-native pieces live in one local Expo module. No iOS build in v1.0.
- Minimum Android 8.0 (API 26). Target SDK = whatever Google Play requires for **new apps at submission time** (Android 16 / API 36 as of Nov 2026). Verify again before release.
- No login, backend, cloud sync, analytics SDK, crash-reporting SDK, ads, in-app purchases or INTERNET permission in v1.0.
- All data local. English UI only; all strings centralised so translation is possible later.
- Free on Google Play, published under Corex Digital Solutions (organization account) if verification completes in time, otherwise a personal account. See `PLAY_LAUNCH.md`.

## 5. v1.0 requirements
| ID | Requirement | Pri | Acceptance |
|---|---|---|---|
| FR-01 | Start a focus session in ≤2 taps from launch | P0 | Cold launch → Start = 1 tap; with intent typed = 2 taps + typing |
| FR-02 | Pause / resume / reset / skip | P0 | Remaining time exact to the second after any sequence |
| FR-03 | Focus → short break → … → long break cycle | P0 | Long break after N completed focus sessions (default 4) |
| FR-04 | Configurable durations | P1 | Focus 1–180, short 1–60, long 1–90 minutes; persisted; never mutates an active session |
| FR-05 | Correct time in background, after process death, after app kill | P0 | Deadline on monotonic clock; reconcile on resume |
| FR-06 | Completion alert | P0 | Notification + optional sound/vibration where permitted; in-app completion card always |
| FR-07 | **Focus intent** | P0 | Optional text (≤60 chars) before or during a session; last 5 distinct intents offered as chips; saved on the session |
| FR-08 | **Bubble collection** | P0 | Every completed FOCUS session adds exactly one bubble to that day's jar; nothing else adds or removes bubbles |
| FR-09 | Session history | P0 | Completed focus sessions grouped by local day with intent, duration, time |
| FR-10 | Insights | P1 | Today minutes, today sessions, current streak, best streak, last-7-days bars |
| FR-11 | Ongoing notification while running | P1 | Shows mode, intent and a live system-ticked countdown; Pause/Resume action |
| FR-12 | Home-screen widget (one size, 4×2 / resizable to 3×2) | P1 | Shows mode, remaining time, intent; Start / Pause / Resume works without opening the app |
| FR-13 | Brand theme light/dark | P1 | Focus Bubble palette default; follow system light/dark; optional "Use wallpaper colours" toggle on Android 12+ |
| FR-14 | Offline | P0 | Every feature works in airplane mode |
| FR-15 | Delete all data | P1 | Settings → Delete all history (confirm, irreversible) |
| FR-16 | Accessibility | P0 | TalkBack, 200% font scale, reduced motion, 48dp targets, contrast ≥4.5:1 for text |

## 6. Defaults
Focus 25 · short break 5 · long break 15 · long break every 4 completed focus sessions · auto-start next OFF · sound ON · vibration OFF · keep screen on OFF · theme follows system · wallpaper colours OFF.

## 7. Behaviour rules
- First launch lands on Focus. No onboarding carousel, no account, no permission prompt at launch.
- Notification permission (Android 13+) is requested the **first time the user taps Start**, preceded by a one-screen explanation sheet. Denial never blocks the timer.
- Completion happens exactly once per session ID. One bubble per completed focus session.
- Reset/quit of a focus session with ≥1 minute elapsed asks for confirmation; copy states that this session won't earn a bubble. No bubble is lost, popped or animated away.
- Skip during focus = abandon (no bubble) and move to the next break; skip during break = move to the next focus.
- Breaks never count toward focus totals, bubbles or streaks.
- Auto-start OFF: next session is prepared, not started.
- Navigation, rotation and theme change never affect the active session.
- Settings changes apply to the **next** session only; the UI says so.
- Pause time never counts as focus time.
- A running session that cannot be proven correct after a reboot is marked INTERRUPTED (no bubble) and the user is told why, once. Paused sessions survive reboots unchanged.

## 8. Bubble collection rules (FR-08)
- One jar per local calendar day. Today's jar is shown on the Jar tab; previous days are listed below it.
- Bubble size scales with session length: `diameter = clamp(28dp + minutes × 0.8dp, 32dp, 72dp)` (25 min ≈ 48dp). Exact constants may be tuned on device; the rule "longer session = bigger bubble" is fixed.
- Bubble colour is picked deterministically from the 6-colour bubble palette (`BRAND.md`) by hashing the session ID, so a jar looks the same every time it's opened.
- Bubble placement is deterministic per day (seeded by date + session order); no physics engine in v1.0.
- Tapping a bubble shows intent, duration and finish time.
- A jar holds up to 12 bubbles visually; above 12, it shows 12 plus a "+N" badge. Counts are always exact.
- Milestones are out of scope for v1.0.

## 9. Non-functional requirements
- Cold start to interactive Focus screen: ≤1.5 s on a mid-range 2023 phone; ≤3 s on a 3 GB RAM budget phone.
- Release AAB download size ≤25 MB (Hermes, ProGuard/R8, no unused native libs).
- No long-held wake locks (only the few-second one HeadlessJsTaskService holds while a task runs). No foreground service in v1.0.
- Battery: running a 25-minute session with the screen off must not keep the CPU awake (system-ticked notification and widget chronometers only).

## 10. Out of scope for v1.0 (roadmap)
- **v1.1:** offline ambient sounds (rain, café, white noise) with a media-playback foreground service; second widget size (2×2 bubble); Quick Settings tile; optional Do Not Disturb during focus.
- **v1.2:** daily goals, tags/categories, data export (CSV), milestones in the jar, Kpelle/French localisation research.
- **Later:** iOS build, Wear OS.
- **Rejected:** app/distraction blocker (Accessibility/usage-access permissions are a Play policy risk and against the "calm, low-permission" promise), accounts, ads, IAP in v1.

## 11. Success metrics (manual, no analytics)
No analytics SDK, so metrics come from Play Console and reviews only:
- Play Console: installs, uninstalls, ANR rate <0.47%, crash rate <1.09% (Play "bad behaviour" thresholds; verify current values).
- Rating ≥4.4 after the first 50 ratings.
- Closed-test feedback: ≥10 of 12 testers complete at least 5 sessions in 14 days.

## 12. Definition of done
`QA_TEST_PLAN.md` passes with evidence; `RELEASE.md` produces a signed AAB and a debug APK; `PLAY_LAUNCH.md` checklist complete; nothing claimed without a command output or on-device check.

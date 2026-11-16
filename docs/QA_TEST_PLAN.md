# QA & Acceptance Test Plan

Acceptance authority. Report every item as **PASS / FAIL / NOT RUN (reason)** with evidence (command output, CI run URL, or "owner verified on <phone model, Android version>, <date>"). Never mark a device item PASS unless the owner confirmed it.

## A. Unit tests — pure domain (Jest, fake clock)
1. Start from IDLE sets deadline = now + duration; display correct.
2. Pause freezes remaining; time passing while paused changes nothing.
3. Resume sets a new deadline from remaining.
4. Reset/Skip during focus → CANCELLED, no RecordSession of a bubble; skip during break → next focus prepared.
5. Long break after N completed focus sessions (N = 2, 4, 8); skipped/cancelled focus doesn't advance the cycle.
6. Durations 1 and 180 min work; 0, 181, NaN, negative rejected.
7. Duplicate/reentrant commands: Start×2, Pause×2, Reconcile×20 → exactly one completion.
8. Stale command with old session ID is a no-op.
9. Background reconcile: 10 min elapsed → correct remaining; past deadline → completed once with true finish epoch.
10. Reboot: bootCount changed while RUNNING → INTERRUPTED; while PAUSED → unchanged.
11. Auto-start: break auto-starts in background; focus auto-starts only in foreground; never more than one chained transition per backgrounded Reconcile.
12. Settings change during a session doesn't alter its duration.
13. Intent: trimmed, ≤60 chars, empty → NULL; recent intents dedupe/limit 5.
14. Stats: today totals exclude breaks/cancelled/interrupted; 7-day series zero-filled; streak with gap, with today empty (yesterday keeps it alive), across midnight (23:50→00:15 counts for the new day), with timezone change (stored dates unchanged).
15. Bubbles: size clamp; colour stable for same ID; layout deterministic (snapshot) and non-overlapping beyond tolerance; >12 bubbles → 12 + "+N".
16. Golden vectors file passes (and passes in Kotlin too if the fallback is used).

## B. Integration tests (Jest + SQLite or repo fakes + fake platform)
1. Completion writes exactly one `sessions` row and updates `active_timer` in one transaction (inject failure between → nothing partially written).
2. Race: 20 concurrent Reconciles + widget Pause → one row, valid final state.
3. Migration from v1 fixture DB preserves all rows.
4. Platform effects are re-applied after a simulated crash between commit and effects.
5. Delete-all clears history and recent intents, leaves the active session.
6. Settings invalid values fall back to defaults.

## C-Spike. Device checks after Phase 2 (owner's phone)
- [ ] Ongoing notification shows a ticking countdown with the app in the background.
- [ ] Notification Pause works after the app is swiped away from recents (record the delay in seconds).
- [ ] Alarm fires with screen off ~5 min, with Precise alerts ON and OFF (record the delay).
- [ ] Reboot during a running session → after unlock, widget/notification don't show nonsense.
- [ ] Wallpaper palette is read (Android 12+).

## C. Manual acceptance (owner's phone; also a budget phone if available)
Reliability
- [ ] Airplane mode: every feature works.
- [ ] Start 25 min, background 10 min → remaining correct to ±1 s.
- [ ] Pause 5 min → no time lost or gained.
- [ ] Kill the app from recents mid-session → reopen shows correct state.
- [ ] Session completes with the app closed → one notification, one bubble, correct finish time.
- [ ] Deny notifications → no crash, timer works, in-app completion card shows, sound still plays (if enabled).
- [ ] Phone on silent / DND → no sound.
- [ ] Reboot mid-session → INTERRUPTED banner once, no bubble.
- [ ] Midnight rollover while the app is open → Jar and Insights switch day.
- [ ] Battery: 25-min session with screen off; Settings → Battery shows no abnormal usage.
UI
- [ ] Every screen matches the mockups in light and dark.
- [ ] Largest font size + display size: nothing clipped.
- [ ] TalkBack: Focus, Jar and Settings fully operable; timer not announced every second.
- [ ] Reduced motion (Remove animations ON): no wobble or drop animation.
- [ ] Landscape on Focus.
- [ ] Wallpaper colours toggle changes primary only; bubbles and coral stay brand.
- [ ] No inert buttons; no placeholder text in release.
Widget
- [ ] Add widget; Start/Pause/Resume work with the app process dead.
- [ ] Widget and app agree within 3 s after any action from either.
- [ ] Resize 4×2 ↔ 3×2.
- [ ] Widget after reboot.

## D. Build gates (CI)
`npx tsc --noEmit` · `npx eslint .` · `npx jest --ci` · `./gradlew testDebugUnitTest` · `./gradlew lintDebug` · `./gradlew assembleDebug` · `./gradlew bundleRelease` (Phase 7) · permission dump matches `ARCHITECTURE.md §8` · AAB size ≤25 MB.

## E. Reporting
`docs/PROGRESS.md` holds the running table. Phase 7 produces `docs/QA_REPORT.md` with every item above and its status.

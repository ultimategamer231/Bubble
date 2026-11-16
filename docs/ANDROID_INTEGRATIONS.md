# Android Platform Integrations

Implementation details are in `ARCHITECTURE.md §6`. This file covers behaviour, limits and what we promise users.

## Notifications (v1.0)
- Android 13+: `POST_NOTIFICATIONS` is requested on the first Start tap, after the explainer sheet (`UI_UX.md`). Never at launch. Never re-prompted automatically.
- Two channels: **Running session** (silent, low) and **Session alerts** (high). Channel names and descriptions are user-visible in system settings, so write them properly.
- Ongoing notification is ticked by the system (chronometer). Android 14+ lets users swipe away non-foreground-service ongoing notifications; that's fine: the timer keeps running and the completion alert still fires.
- Denied: the timer, widget and in-app completion card all keep working. Completion sound/vibration still play (decision D-07).

## Completion timing — what we promise
- **The time shown is always exact** when you open the app, widget or notification (monotonic deadline).
- **The alert is exact** when "Precise alerts" (`SCHEDULE_EXACT_ALARM`) is granted. Android 14+ denies this by default for new installs, so most users start without it.
- Without it, the alert can arrive late while the phone is idle (Doze). The Settings row explains this; we never claim otherwise.
- OEM battery managers (Xiaomi, Oppo, Vivo, Samsung "deep sleeping apps", Transsion/Tecno/Infinix) may delay or block alarms. Document what was observed on the test phone in `PROGRESS.md`. No "disable battery optimisation" nag in v1.0; one help line in About → "Alerts arriving late?" linking to dontkillmyapp.com in the browser.

## Widget (v1.0, one size)
- Custom `AppWidgetProvider` + `RemoteViews` (see `ARCHITECTURE.md`). The live countdown is a `Chronometer` ticked by the launcher, so the app never wakes every second.
- The widget never owns state. It renders the last snapshot pushed from `TimerController` and sends commands with the session ID it rendered.
- `updatePeriodMillis = 0` (no periodic polling). Updates happen on state change, boot, alarm and app foreground.
- Stale snapshot protection: if the snapshot's `bootCount` differs from the current boot, render "Open Focus Bubble" until Reconcile runs.
- Must work with the app process dead, from a cold launcher, on API 26 and on the newest Android on your phone.

## Boot
`RECEIVE_BOOT_COMPLETED` → headless Reconcile → RUNNING becomes INTERRUPTED, PAUSED stays PAUSED (ongoing notification re-posted), widget refreshed.

## Exported components audit
Only the launcher activity, the widget provider and the boot receiver are `exported="true"`. `CommandReceiver` and the alarm receiver are not exported and are only reached via the app's own PendingIntents (`FLAG_IMMUTABLE`). Every incoming intent validates action + session ID.

## v1.1 candidates (not now)
| Feature | Platform notes |
|---|---|
| Ambient sounds | Needs a `mediaPlayback` foreground service + `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, audio focus handling and bundled audio (watch AAB size; consider Play Asset Delivery). This is also the point to reconsider a foreground service for the timer itself. |
| Second widget (2×2 bubble) | Reuse the snapshot renderer. |
| Quick Settings tile | `TileService` via config plugin; dispatches the same `FocusCommand`. |
| Do Not Disturb during focus | Needs user-granted notification-policy access; Android 15+ changed DND rule APIs (`AutomaticZenRule`). Never present this as Digital Wellbeing "Focus mode". |

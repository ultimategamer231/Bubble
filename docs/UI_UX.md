# UI/UX Specification

Visual source of truth: mockups in `design/` (static HTML exported from the design canvas). Tokens: `BRAND.md`. If a mockup and this doc disagree, this doc wins on behaviour and the mockup wins on visuals; log the conflict in `DECISIONS.md`.

## Navigation
Bottom navigation, 3 tabs + settings icon:
1. **Focus** (timer)
2. **Jar** (bubble collection + history)
3. **Insights**

Settings opens from a gear icon in the Focus top bar (not a tab). Back from Settings returns to the previous tab. Navigation never touches the timer. Android back on a root tab exits to home (the session keeps running).

Rationale: the original 4-tab layout split History and a bare list; the jar now is the history.

## Global states every screen must handle
Light, dark, wallpaper colours on/off, font scale 100% and 200%, reduced motion, landscape (phones: timer left, controls right), small width 320dp, edge-to-edge with gesture and 3-button nav.

---

## 1. Focus screen

### Layout (top → bottom)
1. Top bar: mode pill on the left (`Focus` teal / `Short break` coral / `Long break` coral), gear icon on the right (label "Settings").
2. Intent field (idle only) — single line, placeholder *"What are you focusing on?"* (optional), max 60 chars, clear button. Under it: up to 5 recent intents as chips; tapping one fills the field.
   - Running/paused: intent shows as text under the mode pill; tap opens an edit sheet. Empty intent shows *"Add what you're focusing on"* in muted text.
   - Breaks: no intent field; text *"Breathe. Stretch. Look away from the screen."*
3. **Bubble timer** (≈ 72% of screen width, max 320dp): outline circle, liquid fill = elapsed/total, digits `mm:ss` centred (`h:mm:ss` if ≥60 min). Below the digits, small label: `of 25 min`.
4. Primary button (pill, full width up to 320dp): `Start focus` / `Pause` / `Resume` / `Start break` / `Start next focus`.
5. Secondary row: `Reset` (text button) and `Skip` (text button). Hidden when idle and nothing to reset.
6. Cycle dots: N dots (N = long-break interval). Filled dot = completed focus in current cycle. Label for TalkBack: "2 of 4 focus sessions before long break".
7. Today strip: `Today · 3 bubbles · 1 h 15 m` → taps to Jar.

### States
| State | Primary | Secondary | Notes |
|---|---|---|---|
| Idle (focus prepared) | Start focus | — | Intent field editable |
| Running | Pause | Reset, Skip | Liquid wobble (unless reduced motion) |
| Break running | Pause (coral) | Reset, Skip break | Coral liquid; no intent field |
| Paused | Resume | Reset, Skip | Digits at 60% opacity, label "Paused" above digits; no wobble |
| Completed focus | Start break | Skip break | Completion card (below) |
| Completed break | Start next focus | — | Card: "Break's over. Ready when you are." |
| Interrupted (after reboot) | Start focus | — | One-time banner: "Your phone restarted during a session, so we couldn't confirm it finished. It wasn't counted." [Got it] |

### Completion card (focus)
Replaces the today strip and cycle dots area; timer shows a full bubble.
- Title: **"Bubble earned"**
- Body: `25 min on "Chapter 4 notes"` (or `25 min of focus` if no intent)
- Line: `Today: 4 bubbles · Streak: 6 days`
- Primary: `Start 5 min break` (or `Start 15 min long break`)
- Text button: `Skip break`
- Motion: the bubble lifts 8dp and a mini-bubble drops into the Jar tab icon, which shows a +1 badge for 3 s (≤600 ms total, none with reduced motion).

### Confirmations
- Reset/Skip during focus with ≥60 s elapsed → dialog
  - Title: "End this session?"
  - Body: "You've focused for 12 min. This session won't earn a bubble."
  - Buttons: `Keep going` (default) / `End session`
- Under 60 s elapsed: no dialog.
- Reset during a break: no dialog.

### Notification permission sheet (first Start tap on Android 13+ only)
Bottom sheet, shown once, before the system prompt:
- Title: "Get a nudge when time's up"
- Body: "Focus Bubble uses one notification to show your countdown and tell you when a session ends. Nothing else."
- Buttons: `Allow notifications` → system prompt; `Not now` → start timer without notifications.
- After denial: never re-prompt automatically. Settings shows status + "Open system settings".

### Precise alerts row (Android 12+, only if exact alarm not granted)
Shown once, in Settings → Notifications, not as a popup:
"Precise alerts: Off. Without this, the end-of-session alert may arrive up to a few minutes late when your phone is idle. The timer itself stays exact." [Turn on] → `ACTION_REQUEST_SCHEDULE_EXACT_ALARM`.

---

## 2. Jar screen (collection + history)

### Layout
1. Title "Jar". Subtitle: `Monday, 16 November`.
2. **Today's jar** — illustrated rounded jar (vector), bubbles placed per `PRD.md §8`. Under it: `4 bubbles · 1 h 40 m focused`.
3. Tap a bubble → small popover: intent (or "No intent"), `25 min`, `Finished 14:32`.
4. Section "Earlier" — list grouped by day, newest first:
   - Day header: `Yesterday` / `Sat, 14 Nov` + right-aligned `3 bubbles · 1 h 15 m`.
   - Rows: colored dot (that bubble's colour) · intent or "Focus session" · `25 min` · `14:32`.
5. Infinite scroll, 30 days per page.

### Empty states
- No sessions ever: empty jar illustration + "Your jar is empty. Finish a focus session to add your first bubble." + button `Start focus` (navigates to Focus).
- Today empty but history exists: empty jar + "No bubbles yet today." History list still shows below.

---

## 3. Insights screen
Cards (stacked, one column):
1. **Today** — big number `1 h 40 m`, sub `4 sessions`.
2. **Streak** — `6 days` current, `Best: 11 days`. Help text (info icon): "A day counts when you earn at least one bubble. Today counts once you finish a session; until then your streak from yesterday stays alive."
3. **Last 7 days** — 7 vertical bars (minutes), day initials, today highlighted in `primary`, zero days show a 2dp stub and `0`. Tapping a bar shows exact minutes. Accessible as a list: "Mon 45 minutes, Tue 0 minutes, …".
4. **All time** — `142 bubbles · 61 h 20 m`.
No decimals, no percentages, no "productivity score".

Empty: all cards show zeros with "Insights fill in as you finish sessions."

---

## 4. Settings screen
Sections and rows:
- **Timer**: Focus length (stepper + tap-to-type, 1–180), Short break (1–60), Long break (1–90), Long break after (2–8 focus sessions). Footer note when a session is active: "Changes apply from your next session."
- **Session behaviour**: Auto-start breaks (off), Auto-start focus after break (off), Keep screen on while running (off).
- **Notifications**: Status row (Allowed / Off → Open system settings), Completion sound (on), Vibration (off), Precise alerts row (see above).
- **Appearance**: Theme (System / Light / Dark), Use wallpaper colours (Android 12+ only; hidden otherwise).
- **Data**: Delete all history → dialog "Delete all sessions and bubbles? This can't be undone." [Cancel] [Delete].
- **About**: Version, Privacy ("Everything stays on this phone. No account, no tracking, no ads." → opens the privacy policy in the system browser; outbound links need no INTERNET permission), Alerts arriving late? (opens dontkillmyapp.com), Licences, Rate on Google Play.

Validation: out-of-range input shows an inline error with that field's range (e.g. "Choose 1–180 minutes") and doesn't save.

---

## 5. Ongoing notification (running/paused)
- Small icon: monochrome bubble.
- Title: `Focus · Chapter 4 notes` / `Short break`
- Content: system-ticked countdown chronometer (no per-second app updates).
- Paused: content "Paused · 12:40 left", no chronometer.
- Actions: `Pause` / `Resume`, `End`.
- Tap → opens Focus.
- Completion replaces it with: Title "Bubble earned", body `25 min on "Chapter 4 notes"`, action `Start break`.

## 6. Widget (one size, default 4×2, resizable down to 3×2)
- Left: small bubble ring showing progress (re-rendered on state change only; the ring is a snapshot, the digits tick via system chronometer).
- Right: mode label, time remaining (chronometer when running; static when paused/idle), intent (1 line, ellipsized).
- Button: `Start` / `Pause` / `Resume` (single action). Whole widget tap opens app.
- Idle: `Ready · 25:00`, `Start`.
- Matches light/dark of the system.
- Content descriptions on every element.

## 7. Accessibility acceptance
- Timer exposes one accessible element: "Focus, 12 minutes 40 seconds remaining, running". Live region announces only state changes and each whole 5 minutes, never every second.
- Logical TalkBack order follows the layout tables above.
- Every icon-only control has a label.
- 200% font: no clipping; intent chips wrap; Settings rows wrap to two lines.
- Contrast per `BRAND.md`.

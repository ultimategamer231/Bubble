# Data Model & Statistics

One SQLite database: `focusbubble.db` (expo-sqlite). Times in ms. All writes go through repositories called by `TimerController`.

## Table `sessions` (history; append-only except delete-all)
| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID v4 created when the session is prepared |
| `type` | TEXT | `FOCUS` \| `SHORT_BREAK` \| `LONG_BREAK` |
| `status` | TEXT | `COMPLETED` \| `CANCELLED` \| `INTERRUPTED` |
| `intent` | TEXT NULL | Trimmed, ≤60 chars, NULL if empty |
| `planned_ms` | INTEGER | Duration at start |
| `focused_ms` | INTEGER | Actual running time excluding pauses (= planned_ms when completed) |
| `started_at_epoch` | INTEGER | Wall clock at first Start |
| `ended_at_epoch` | INTEGER | Completion/cancel time (derived per `ARCHITECTURE.md §5`) |
| `local_date` | TEXT | `YYYY-MM-DD` of `ended_at_epoch` in the device timezone **at the moment of recording** |
| `tz_offset_min` | INTEGER | Offset used to compute `local_date` |
| `cycle_index` | INTEGER | Position in the long-break cycle |
| `bubble_color` | INTEGER | 0–5, palette index (FOCUS + COMPLETED only, else NULL) |
| `schema_version` | INTEGER | Row format version |

Indexes: `(type, status, local_date)`, `(ended_at_epoch)`.
`INSERT OR IGNORE` on `id` guarantees one row per session. Breaks and cancelled/interrupted focus are stored (honest record) but excluded from every statistic and from the jar.

**A bubble = a row where `type='FOCUS' AND status='COMPLETED'`.** There is no separate bubbles table.

## Table `active_timer` (exactly one row, `id = 1`)
| Column | Notes |
|---|---|
| `session_id` | Current/prepared session |
| `type` | FOCUS / SHORT_BREAK / LONG_BREAK |
| `status` | IDLE / RUNNING / PAUSED / COMPLETED / CANCELLED / INTERRUPTED |
| `intent` | Current intent |
| `duration_ms` | Locked at Start (settings changes don't affect it) |
| `remaining_ms` | Valid when IDLE/PAUSED |
| `deadline_elapsed_ms` | Valid when RUNNING |
| `boot_count` | Captured at Start/Resume |
| `started_at_epoch` | First Start |
| `focused_ms_before_pause` | Accumulated running time |
| `cycle_completed` | Focus sessions completed in the current cycle |
| `interrupted_notice_pending` | 0/1 — show the reboot banner once |
| `updated_at_epoch` | Debug only |

## Table `settings` (key/value TEXT; parsed + validated by `SettingsRepo`)
| Key | Default | Range |
|---|---|---|
| `focus_min` | 25 | 1–180 |
| `short_break_min` | 5 | 1–60 |
| `long_break_min` | 15 | 1–90 |
| `long_break_every` | 4 | 2–8 |
| `auto_start_breaks` | false | |
| `auto_start_focus` | false | |
| `keep_screen_on` | false | |
| `sound` | true | |
| `vibration` | false | |
| `theme` | `system` | system/light/dark |
| `wallpaper_colors` | false | ignored below API 31 |
| `notif_sheet_shown` | false | permission explainer shown once |
| `recent_intents` | `[]` | JSON array, max 5, most recent first, case-insensitive dedupe |

Invalid stored values fall back to defaults and are rewritten.

## Statistics (pure functions in `src/domain/stats`, inputs = rows + "today" local date)
- **Day attribution:** by `local_date` (completion date in the timezone at recording time). A session started 23:50 and completed 00:15 belongs to the new day. Stored dates are never recomputed when the timezone changes (documented consequence: travelling can make one calendar day look long or short).
- **Today minutes:** `SUM(focused_ms)` of bubbles where `local_date = today`, floored to whole minutes for display.
- **Today sessions:** count of bubbles today.
- **Last 7 days:** 7 entries ending today, zero-filled.
- **Current streak:** consecutive days with ≥1 bubble ending today; if today has none, ending yesterday (streak stays alive until today ends). 0 if neither.
- **Best streak:** longest run ever.
- **All time:** count of bubbles and sum of minutes.
- "Today" = current local date from `now()`; the UI recomputes at local midnight (timer to next midnight, plus on app foreground).

## Bubble rendering data (pure, `src/domain/bubbles`)
- `size(minutes)` per `PRD.md §8`.
- `color = bubble_color` (assigned at completion = hash(session_id) mod 6, stored so the palette order can change later without recolouring history).
- `layout(dateKey, sessions[])` → positions inside the jar's inner rect, seeded PRNG (`mulberry32(hash(dateKey))`), packed bottom-up with no overlaps beyond 15% of a diameter. Same input → same output (snapshot test).

## Atomicity
Completion = one transaction: `INSERT OR IGNORE sessions` + `UPDATE active_timer` (+ prepare next). A race test fires Reconcile ×20 concurrently plus widget Pause and asserts exactly one row and a valid final state.

## Delete all history
One transaction: `DELETE FROM sessions`, reset `cycle_completed`, clear `recent_intents`. The active session is left alone.

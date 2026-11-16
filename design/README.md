# Mockups (reference only)

Source files of the v1.0 mockups. The live canvas is linked in the root `README.md` (private to the owner; Claude Code can't open it, so it reads these files instead).

Each `*.dc.html` is one 390×844 phone screen (Settings is 390×1720, a full scroll capture; SystemSurfaces is 960×720) written as plain HTML with inline styles. Read them for **layout, spacing, sizes, colours and copy**. Don't ship or import them; build real React Native components from `docs/BRAND.md` tokens.

| File | Screen |
|---|---|
| `Main.dc.html` | Focus · idle (intent field, recent chips) |
| `FocusRunning.dc.html` | Focus · running |
| `FocusPaused.dc.html` | Focus · paused |
| `FocusComplete.dc.html` | Focus · bubble earned (completion card, +1 on Jar tab) |
| `FocusBreak.dc.html` | Short break · running (coral) |
| `Jar.dc.html` | Jar · today's jar, bubble popover, history |
| `JarEmpty.dc.html` | Jar · first-run empty state |
| `Insights.dc.html` | Insights |
| `Settings.dc.html` | Settings (all sections) |
| `PermissionSheet.dc.html` | Notification explainer on first Start |
| `EndDialog.dc.html` | End session confirmation |
| `FocusRunningDark.dc.html`, `JarDark.dc.html`, `InsightsDark.dc.html` | Dark theme |
| `SystemSurfaces.dc.html` | Widget (light running / dark idle), notifications, app icon draft |

Mockup numbers (bubbles, minutes, intents) are illustrative. In the app every number comes from real data. The mockups show different moments of one day, so totals differ between screens on purpose.

`docs/UI_UX.md` wins on behaviour; these files win on visuals.

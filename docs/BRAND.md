# Brand & Design Tokens

The mockups (`design/` + the canvas linked in `README.md`) are the visual source of truth. This file holds the exact token values. Implement tokens once in `src/design/tokens.ts`; no hex values anywhere else.

## Personality
Calm, round, light. Soft but not childish. Water/air, not candy. One playful element: the bubble. Everything else is quiet.

## Bubble motif — where it appears (and where it doesn't)
| Use | Description |
|---|---|
| Focus timer | The timer *is* a bubble: a circle with a thin outline whose inside fills from the bottom with translucent liquid as focus time passes. Full = done. |
| Completion | The full bubble lifts slightly and a small copy of it drops into the jar icon on the bottom nav (≤600 ms; skipped with reduced motion). |
| Jar tab | Today's jar shows one bubble per completed focus session. |
| App icon | A single teal bubble with a white highlight, on a light aqua background. |
| Widget | A small bubble progress ring + time. |
| **Not used** | Backgrounds, cards, buttons, settings, list rows, empty decoration. No glassmorphism, no gradients except the timer liquid's subtle 2-stop fill. |

## Colour — light
| Token | Hex | Use |
|---|---|---|
| `bg` | `#F4FAF9` | App background |
| `surface` | `#FFFFFF` | Cards, sheets, nav bar |
| `surfaceVariant` | `#E4F1EF` | Chips, input fields, progress track |
| `outline` | `#C3D3D2` | Dividers, bubble outline track |
| `text` | `#1B2B2E` | Primary text (13.9:1 on bg) |
| `textMuted` | `#5A6E70` | Secondary text (5.1:1 on bg) |
| `primary` | `#0B7A77` | Focus mode, primary buttons, active nav (5.2:1 with white) |
| `onPrimary` | `#FFFFFF` | |
| `primaryContainer` | `#BFECE7` | Selected chip, active nav pill |
| `onPrimaryContainer` | `#00302E` | |
| `liquidFocus` | `#7FD8D1` → `#34B3AC` | Timer fill gradient (digits sit on top; see "Text inside the bubble") |
| `coral` | `#C2493A` | Break mode text/buttons (4.9:1 with white) |
| `coralContainer` | `#FFDAD4` | Break chips, break badges |
| `liquidBreak` | `#FFC2B8` → `#FF8E7E` | Break fill gradient (decorative) |
| `danger` | `#B3261E` | Delete-all only |

## Colour — dark
| Token | Hex |
|---|---|
| `bg` | `#0C1719` |
| `surface` | `#142427` |
| `surfaceVariant` | `#1D3236` |
| `outline` | `#2F4A4E` |
| `text` | `#E3EEEE` |
| `textMuted` | `#9AB0B1` (7.0:1 on surface) |
| `primary` | `#5FD4CC` |
| `onPrimary` | `#003734` (7.4:1) |
| `primaryContainer` | `#0B4F4C` |
| `onPrimaryContainer` | `#BFECE7` |
| `liquidFocus` | `#0E4F4C` → `#17736E` |
| `coral` | `#FF8E7E` |
| `coralContainer` | `#5C2A23` |
| `liquidBreak` | `#5C2A23` → `#8A3B30` |
| `danger` | `#F2B8B5` |

## Text inside the bubble
Digits and the small label sit on top of the liquid, so both always use `text` (never `textMuted`). Verified: light `text` on `#34B3AC` = 5.7:1; dark `text` on `#17736E` = 4.8:1. `textMuted` on the light liquid is only 2.1:1, so it's banned inside the bubble.

## Bubble palette (jar bubbles, decorative only)
Light: `#7FD8D1` `#9CC8F5` `#B9A6F2` `#FFB4A6` `#F7D07A` `#9BE0A8`
Dark: same hues at 85% lightness against `bg`; check each has ≥3:1 against `bg` (non-text graphic contrast).

## Wallpaper colours (optional, Android 12+)
When "Use wallpaper colours" is ON, map Material You system palette to `primary`/`primaryContainer`/`surfaceVariant` only. `coral`, liquids and the bubble palette stay brand-fixed so the identity survives.

## Typography
- **Display (timer digits, screen titles):** Nunito (SIL OFL), weights 600/700, bundled via `expo-font`. Timer digits must use tabular figures (`fontVariant: ['tabular-nums']`); verify on device that digits don't shift width. If they shift, fall back to system font for digits only.
- **Body/UI:** system font (Roboto on most devices).
- Scale (sp): timer 64 (48 on screens <360dp wide), title 22, section 16/600, body 16, label 14, caption 12. All text scales with system font size; the timer caps at 1.3× to stay on screen, with a test at 200%.

## Shape, spacing, elevation
- 4dp grid; gaps 8/12/16/24/32.
- Radius: chips/inputs 12, cards/sheets 20, buttons full pill, bubbles circular.
- Elevation: flat. Cards use `surface` on `bg`, no shadows except bottom sheets (level 1).
- Touch targets ≥48dp.

## Motion
- Liquid level updates every 1 s with a 300 ms ease; a slow surface wobble (amplitude ≤2dp, 4 s loop) only while RUNNING.
- Reduced motion (system setting): no wobble, no completion lift/drop, instant level changes.
- Animation never drives time logic.

## Voice & copy
Short, warm, never guilt-tripping. Use "session", "bubble", "jar". Never "failed", "lost", "killed", "streak broken!". Sentence case everywhere.

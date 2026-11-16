# Focus Bubble — Android (React Native + Expo)

A gentle focus timer. Every session you finish becomes a bubble.

Free on Google Play: no account, no ads, no tracking, works offline. Built by Corex Digital Solutions.

This repository starts as a **spec + agent-instruction pack**. Claude Code builds the actual app here, phase by phase.

## Start here
1. Create a private GitHub repo `focus-bubble` and push everything in this pack to its root.
2. Open the repo in Claude Code (web/cloud). Make sure the session can reach GitHub (`gh`) and npm.
3. Paste the prompt in `.claude/START_HERE.md`.
4. At each 📱 gate, Claude Code posts a GitHub pre-release with a debug APK. Install it on your phone, run the checklist it gives you, and reply with results.
5. Before Phase 7, add the release signing secrets (`docs/RELEASE.md`). Before Phase 8, have the Play account route decided (`docs/PLAY_LAUNCH.md`).

## Mockups
- Live canvas (private to you): https://claude.ai/artifact/BXPXiQQtPviHjbQMrTdWQa
- Source copies Claude Code reads: `design/`

## Documents
| File | Purpose |
|---|---|
| `CLAUDE.md` | Permanent instructions and guardrails for Claude Code |
| `docs/PRD.md` | Scope, requirements, bubble rules, roadmap (scope authority) |
| `docs/BRAND.md` | Colours, type, shapes, motion, voice |
| `docs/UI_UX.md` | Screens, states, exact copy, accessibility |
| `docs/ARCHITECTURE.md` | Stack, state machine, native module, build pipeline (technical authority) |
| `docs/DATA_MODEL.md` | SQLite schema, statistics, bubble data |
| `docs/ANDROID_INTEGRATIONS.md` | Notifications, alarms, widget, boot; what we promise users |
| `docs/IMPLEMENTATION_PLAN.md` | Phases 0–8 with gates and estimates |
| `docs/QA_TEST_PLAN.md` | Unit, integration, device and build checks (acceptance authority) |
| `docs/RELEASE.md` | Test APKs, signing, release AAB |
| `docs/PLAY_LAUNCH.md` | Developer account routes, policy forms, listing, testing tracks |
| `docs/DECISIONS.md` | Confirmed decisions, technical decisions, open questions |
| `design/` | Mockup sources |

## Owner to-dos outside the code
- Finish Corex registration → request a D-U-N-S number (needed for an organization Play account).
- Generate and back up the upload keystore (Phase 7).
- Publish the privacy policy at corexlr.com/focusbubble/privacy (text drafted by Claude Code).
- Recruit 12 closed testers if the personal-account route is used.

# Google Play Launch Plan

Owner tasks unless marked [CC] (Claude Code prepares). Re-verify every Play rule here at launch time; policies change.

## 1. Developer account — two routes
| | Route A: Organization (Corex Digital Solutions) — **preferred** | Route B: Personal (Foday) — fallback |
|---|---|---|
| Needs | Registered business, D-U-N-S number for Corex, business website (corexlr.com) and email, $25 | Government ID, $25 |
| Closed-test rule | Exempt | **12 testers opted in for 14 continuous days** before you can apply for production; Google checks real engagement |
| Shown as | "Corex Digital Solutions" | Your legal name |
| Blocker today | Corex registration not finished (TIN pending) → D-U-N-S can't be issued until it is; D-U-N-S issuance can take up to ~30 days | None |

**Plan:** Start the D-U-N-S request as soon as Corex registration completes. If the D-U-N-S isn't in hand by the end of Phase 6, switch to Route B and start recruiting 12 testers (classmates, LCC staff/students, iTech colleagues, Corex contacts) during Phase 7 so the 14 days run in parallel with final fixes. An app can later be transferred from a personal to an organization account through Play's app transfer process. Check the current transfer rules first.

## 2. App identity
- Package name: `com.corexlr.focusbubble` (permanent once uploaded).
- App name on Play: "Focus Bubble – Focus Timer" (≤30 chars). Check that no existing app uses the exact name.

## 3. Policy & App content [CC drafts, owner submits]
- **Privacy policy URL** (required): host at `https://www.corexlr.com/focusbubble/privacy`. Content: no data collected, nothing leaves the device, no third parties, how to delete (uninstall or Settings → Delete all history), contact `info@corexlr.com`.
- **Data safety form:** "No data collected", "No data shared". This is true only if the release has no INTERNET permission and no SDKs that collect data. Verify with the permission dump.
- **Target audience:** 13+ (avoid the Families programme obligations of under-13 targeting). Not designed for children.
- **Content rating:** IARC questionnaire → expect "Everyone".
- **Ads:** "No ads".
- **Exact alarm declaration:** answer accurately if Console asks about `SCHEDULE_EXACT_ALARM` (user-initiated focus timer alerts).
- **Target API:** new apps must target Android 16 (API 36) or higher as of Nov 2026. Confirm on the Play target-API page at submission.

## 4. Store listing [CC drafts text, owner/Corex designs graphics]
- Short description (≤80): "A gentle focus timer. Every session you finish becomes a bubble."
- Full description (≤4000): what it does, no account/ads/tracking, works offline, widget, how bubbles work, privacy line.
- Graphics: app icon 512×512, feature graphic 1024×500, 4–8 phone screenshots (from the real app, not mockups) in light + dark, showing Focus running, completion card, Jar, Insights, widget.
- Category: Productivity. Contact email: `info@corexlr.com`. Website: corexlr.com.

## 5. Testing tracks
1. **Internal testing** (up to 100 testers, instant): owner + Corex team. Smoke test the Play-signed build.
2. **Closed testing**: Route B → 12+ testers, 14 continuous days, collect feedback via a Google Form. Route A → optional but recommended for 7 days.
3. **Production**: staged rollout 20% → 50% → 100% over a week, watching Play Console crash/ANR rates.

## 6. Launch checklist
- [ ] Account verified (route recorded in `DECISIONS.md`)
- [ ] Privacy policy live
- [ ] App content forms complete
- [ ] Listing text and graphics uploaded
- [ ] Signed AAB uploaded to internal track; Play-signed install tested on owner's phone
- [ ] Closed test complete (Route B) / production access granted
- [ ] Production rollout started; first-week vitals reviewed

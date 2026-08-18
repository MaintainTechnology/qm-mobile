repo: MaintainTechnology/qm-mobile
branch: main
path: (repo root — still a scaffold: .gitignore + LICENSE only)

## Source of truth
The design is built from the **local codebase** (`QuoteMate/quoteMate/`), not the
GitHub repo: `qm-mobile` on GitHub holds no application code yet, so there is no
native source to match. Web app read from `quotemate-automation/`.

## Last sync
date: 2026-08-14T04:24Z
tree: 7ad765712a97 (github_get_tree resolved hash — not a commit sha)
commit: (none recorded — no app commits exist upstream)

### Updated in this project
- Sync check: no upstream application code yet, so no screens were rebuilt.
- Upstream gained a `.gitignore` since the previous sync (generic Node/JS ignore
  list — it does not yet name Expo, `.expo/`, or any native build output).
- Design unchanged this turn; it remains grounded in the local Next.js app.

## Screen map
Only files actually read are cited. All from the local repo.

| Mobile screen | Built from |
| --- | --- |
| Welcome | `DESIGN.md`, `app/globals.css` |
| Sign in | `app/signup/page.tsx` (INPUT / Field / RequiredLegend / ErrorBanner), `app/signin/page.tsx` |
| Onboarding 01–04 | `app/onboard/page.tsx`, `app/_components/funnel-shell.tsx` |
| Home (Overview) | `app/dashboard/page.tsx` (greeting + KPI hero, attention card, number card, chats rail — lines ~2990–3500) |
| Quotes, Quote review | `app/dashboard/page.tsx` (`buildNav`, quote counts), `app/api/quote/[id]/edit/route.test.ts` (tier + line-item shape) |
| Chats, SMS thread | `app/dashboard/page.tsx` (chats rail), `app/api/sms/inbound/route.ts` (AI turn-taking, structure confirm) |
| Calendar, Follow-ups | `app/dashboard/page.tsx` (`buildNav` Daily band) |
| Roof hub ("Roof tools") | `app/dashboard/page.tsx` tab copy (line ~2523), `app/dashboard/roofing/` component list, `app/dashboard/roofing/measure/page.tsx` (MATERIALS / PITCHES / INTENTS, "Measure all structures") |
| Roof measure | `app/m/[token]/page.tsx`, `app/m/[token]/MeasurementReview.tsx` (TIER_NAME, MiniStat set, confirm-counts + measurement editors, combined total, solar & skylights, re-scan), `app/m/[token]/RoofLayoutSection.tsx` (rotate / compass), `app/dashboard/roofing/_components/RoofMap.tsx` + `GoogleStaticMap.tsx` (aerial + overlay) |
| Menu bands | `app/dashboard/page.tsx` `buildNav()` — Daily / Trades / Price book / Business |
| Price book (General pricing · Services · Catalogue · Roof rates) | `app/dashboard/page.tsx` tab copy lines 2503–2532 |
| Marketing, Flyer, Videos | `app/dashboard/page.tsx` `buildNav()` Business band |
| Files, History | `app/dashboard/page.tsx` (line ~2473 archive copy) |
| Account, Payouts, Billing | `app/dashboard/page.tsx` (lines ~2449, ~2497) |
| Customer quote + deposit | `app/q/roof/[token]/page.tsx` (tier bands, structures listed vs priced) |
| Tokens (colour, type, radii) | `app/globals.css` (incl. the light-theme `.text-accent` rule at ~line 858) |
| Brand mark | `app/_components/BrandMark.tsx` |

### Not yet grounded
Estimating, Catalogue detail, Recipes, Flyer designer and Videos screens are
reachable from Menu but not yet built — their web tab bodies have not been read.
Paint tools and Signage compliance hubs exist in the web app and are not in the
mobile design yet.

## Sync history
### 2026-08-14 (initial)
- Built the mobile design from the local codebase; GitHub repo held LICENSE only.
- Recreated the web dashboard, marketing hero and onboard funnel as a reference.
- Rebuilt the roof-measure screen against the real `/m/[token]` review model.

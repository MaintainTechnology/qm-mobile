# Review notes — specs/web-parity.md

Round 1 (2026-08-21): three parallel gates ran over the completed build — a requirement-by-
requirement spec verification, `quotemax-domain-reviewer` (money/GST/lifecycle), and
`field-ux-reviewer` (on-site usability). 34 findings total; all addressed except the explicit
waivers below. Verified after fixes: typecheck + lint + 119/119 tests, expo-doctor 18/18,
iOS + Android exports.

## Blockers found and fixed

- **A2 resume loop unreachable** — tabs guard redirected to bare `/sign-up` without
  `resume=1&uid=`; signed-in tenant-less tradies ping-ponged between layouts. Fixed in
  `src/app/(tabs)/_layout.tsx` + success-screen exemption in `src/app/(auth)/_layout.tsx`.
- **Roof "Save as quote" client-summed price** — combined tier totals were computed on the
  client. Verified the web route trusts `price.tiers` verbatim and has no server-side combined
  pricing, so mobile now restricts promotion to a single included structure and forwards that
  structure's server tiers verbatim (multi-structure promotion points to the web dashboard).
- **Null job-quote total rendered as A$0.00** — inspection-routed jobs now lead with the
  site-visit notice and render `—`, never a zero price.
- **Labour rates clobbered sibling trades** — the menu editor wrote one field set to every labour
  trade. Now renders per-trade sections seeded from each trade's own pricing book and PATCHes only
  changed trades.
- **Fixture data on the live dashboard** — fake site visits, fake chats, fabricated
  "$73,522 ready to release" push banner, and inert CALL/DRIVE/copy buttons removed or wired to
  real data.
- **Stalled-network hangs** — `apiRequest` now times out at 15 s into the existing retry UIs;
  tabs cold-start shows a spinner instead of a blank shell.

## Majors/minors: all fixed

Stat-definition parity (avg over all quotes, case-insensitive accepted,
`awaiting_tradie_approval` in every review-backlog set), optimistic approve/send with rollback,
tier line-items in the quote detail (verbatim, web field names), single-armed confirm-to-send
action, resend-verification-code, `optionalNumber` garbage→omitted (never 0), catalogue price
labels via money.ts with GST basis, keyboard avoidance on Roof/Menu, 48 pt glove-floor tap
targets on chips/retries/toggles, ≥12 pt status/meta text, "inc GST" qualifiers on all money
KPIs, share affordance for quote links, chat-draft preservation.

## Waivers (explicit, per definition-of-done 2)

1. **Wizard state persistence across app kills** (field-ux major): requires a storage dependency
   (`@react-native-async-storage/async-storage`) the stack table doesn't include. Adding a
   dependency is a stack decision for the owner — CLAUDE.md requires the table change first.
   Recommended follow-up; not built this round.
2. **G2 endpoint wording**: the spec originally said rate cards PATCH `/api/tenant/me`; the
   backend's UpdateSchema silently strips rate-card fields, so the build targets the dedicated
   `/api/tenant/roofing-rates` and `/api/tenant/painting-rates` routes instead. The spec was
   amended to match verified backend behaviour — recorded here as the authorised deviation.

## Round 2

All three gates re-ran after the round-1 fixes, plus a full `/code-review` at high effort
(8 finder angles): spec **PASS**, domain **PASS** (4 minors), UX **FAIL** (1 major + 7 minors),
code-review 35 findings. All 53 items were fixed in a consolidated round, headlined by:

- False "Saved." on rate cards (200-with-`ok:false` now surfaces the server error) — the UX major
- Stale tenant/me 404 bounced tradies from the success screen back into the wizard — cache
  removed before routing
- Sign-out now clears the query cache (no cross-tenant data on a shared device)
- Rate-card saves merge overlay maps instead of clobbering keys the web dashboard set
- Per-call request timeouts (activation 180 s, measure 120 s, job-quote 90 s, approve/send 45 s)
  so slow non-idempotent successes are never client-aborted and double-fired
- Duplicate-email resume path made reachable (live Clerk client, not a stale hook snapshot);
  resume deep-links verified against a tenant probe; resume-mode step jumps clamped
- One shared `apiErrorMessage`, one `isInReview` predicate, money rounding re-contained in
  money.ts, RevenueCat `NOT_PRESENTED` treated as entitled, Clerk added to the stack table,
  reply-send updates the chats cache from the response instead of refetching the inbox,
  "Roof" tab renamed "Tools"

## Round 3 (final gate)

Verification reviewer confirmed every round-2 fix at file:line and swept the changed screens:
**PASS**, no new blockers or majors. Its one watch note (pin quote-action `ok` to literal true)
was applied. Final state: 122/122 tests, typecheck + lint clean, expo-doctor 18/18, iOS and
Android exports green.

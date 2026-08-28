# Task 02 corrective pass 01 — implementer report

Date: 2026-08-28

This is implementation evidence for independent re-review. It does not declare Task 02 passed.

## Commits

- Backend runtime commit (`codex/mobile-full-parity-backend`): `4fb146beb0fed145a6b44138c28a01fc2acb34b3`
- Mobile implementation commit (`main`): `189ff6a431c64fddb0c81d1c03d325c2a14a23df`

### Backend mixed-commit caveat

An external/automated commit ran while final verification was in progress and swept the backend
Task 02 files into `4fb146be` together with unrelated workspace state. The implementer did not run
that commit and did not reset, rebase, amend, or otherwise rewrite the shared history.

Task-owned files present in `4fb146be`:

- `quotemate-automation/app/api/aircon/pdf/route.test.ts`
- `quotemate-automation/app/api/aircon/pdf/route.ts`
- `quotemate-automation/app/api/tenant/bom/bom-consumers.test.ts`
- `quotemate-automation/app/api/tenant/bom/route.test.ts`
- `quotemate-automation/app/api/tenant/bom/route.ts`
- `quotemate-automation/app/api/tenant/commercial-painting/price/route.test.ts`
- `quotemate-automation/app/api/tenant/commercial-painting/price/route.ts`
- `quotemate-automation/app/api/tenant/commercial-painting/save-quote/route.test.ts`
- `quotemate-automation/app/api/tenant/commercial-painting/save-quote/route.ts`
- `quotemate-automation/app/dashboard/aircon/page.tsx`
- `quotemate-automation/app/dashboard/page.tsx`
- `quotemate-automation/app/q/aircon/[token]/page.tsx`
- `quotemate-automation/lib/aircon/gst-consumers.test.ts`
- `quotemate-automation/lib/aircon/gst-copy.ts`
- `quotemate-automation/lib/aircon/recommendation-schema.ts`
- `quotemate-automation/lib/aircon/report-html.test.ts`
- `quotemate-automation/lib/aircon/report-html.ts`
- `quotemate-automation/lib/estimate/run-recipe-authority.test.ts`
- `quotemate-automation/lib/estimate/run.ts`

Unrelated files also swept into `4fb146be`:

- `.claude-flow/policy/state.json`
- `.claude/settings.json`
- `quotemate-automation/.claude-flow/daemon-state.json`
- `quotemate-automation/.claude-flow/metrics/backup.json`
- `quotemate-automation/.claude-flow/metrics/codebase-map.json`
- `quotemate-automation/.claude-flow/metrics/consolidation.json`
- `quotemate-automation/.claude-flow/metrics/harness-loop.json`
- `quotemate-automation/.claude-flow/metrics/performance.json`
- `quotemate-automation/.claude-flow/metrics/security-audit.json`
- `quotemate-automation/.claude-flow/metrics/test-gaps.json`
- `quotemate-automation/.claude-flow/policy/state.json`
- `ruvector.db`

## Corrections implemented

1. Commercial-paint `save-quote` is draft-only. It no longer imports or calls the PDF/SMS
   dispatch path, even with a valid customer phone. Customer details remain stored on the intake.
2. Air-con PDF accepts only `recommendationId`, reloads a tenant-scoped persisted recommendation,
   deeply validates the priced payload, and refuses tenantless, missing, malformed, unpriced, and
   cross-tenant inputs before render or archive. Web and mobile callers use the saved server ID.
3. A blocked commercial-paint reprice verifies the stale BOM clear and fails closed if either the
   extraction or run reset fails. Save reloads the current corrected takeoff, prices it server-side,
   and rejects stale or changed BOMs.
4. A recipe-authority loader/builder exception returns the existing inspection result immediately;
   retrieval and the model path are not called.
5. `/api/tenant/bom` exposes finite, active tenant catalogue categories keyed by trade. Web and
   mobile consumers use that contract. Mobile terminal readiness counts only unconditionally
   required lines; optional and non-empty `include_when` lines do not block.
6. Air-con dashboard, public quote, report content, and report footer derive GST wording from each
   priced recommendation's `gst_registered` value.
7. Mobile commercial-paint repricing revokes Save authority at reprice start. Only an awaited
   refetch containing a BOM for the current extraction restores Save; all error classes remain
   fail-closed.

## RED evidence

- Save-route valid-price regression observed one dispatch call before dispatch removal.
- Air-con PDF tests showed a caller-authored priced object rendered successfully and the saved-ID
  flow was absent before the route was replaced.
- Commercial-paint tests failed before stale-clear verification and current-takeoff repricing were
  added; a changed/unmatched current takeoff could still use the old stored BOM.
- Recipe exception regression reached the later catalogue/model path before the catch became a
  terminal inspection return.
- Backend BOM test expected a trade-keyed map but received no such field. Mobile readiness RED
  failed because `missingRequiredPriceCategories` did not exist.
- GST consumer tests failed on the hard-coded dashboard/public strings, and report GST-false output
  still contained inc-GST copy.
- Mobile air-con RED had two failures: missing persistence was accepted and the ID-only request
  helper did not exist.
- The stale-save component regressions were authored before production changes. The initial full
  screen RED transform was bounded and terminated before Jest emitted assertions; the old component
  had neither the verification prop nor the refetch proof helper. The completed GREEN run below
  exercises transport, 500, schema, unknown, stale-extraction, and current-extraction cases.

## GREEN evidence

Backend affected suite:

```text
npm test -- app/api/tenant/commercial-painting/price/route.test.ts app/api/tenant/commercial-painting/save-quote/route.test.ts app/api/aircon/pdf/route.test.ts app/api/aircon/recommend/route.test.ts app/api/aircon/plan/route.test.ts app/api/tenant/bom/route.test.ts app/api/tenant/bom/bom-consumers.test.ts lib/aircon/report-html.test.ts lib/aircon/gst-consumers.test.ts lib/aircon/save-recommendation.test.ts lib/estimate/run-recipe-authority.test.ts lib/estimate/catalogue.test.ts lib/estimate/deterministic-bom.test.ts
Result: 13 files passed, 104 tests passed.
```

Backend compiler and diff check:

```text
npm run typecheck
Result: exit 0, no diagnostics (rerun after the web BOM caller migration).

git show --check --oneline 4fb146be
Result: exit 0, no whitespace errors.
```

Mobile focused results:

```text
src/features/trades/hub/sections/bom-readiness.test.ts
Result: 1 passed.

src/features/trades/hub/sections/recipes-api.test.ts
Result: 26 passed.

src/features/trades/aircon/schema.test.ts
Result: 25 passed.

src/features/trades/commercial-painting/CommercialPaintingScreen.test.tsx
Result: 9 passed.

src/features/trades/aircon/AirconToolScreen.test.tsx
Result: 3 passed.
```

Mobile compiler, lint, and diff check:

```text
npm run typecheck
Result: exit 0, no diagnostics.

npm run lint
Result: exit 0, no diagnostics.

git show --check --oneline 189ff6a
Result: exit 0, no whitespace errors.
```

## Harness note

The known Task 06 Jest open-handle debt remains: the recipes and screen suites sometimes print
completed passing assertions and then do not exit. Those processes were bounded and interrupted
only after the completed test totals above were emitted. `--forceExit` was not used and is not
claimed as proof.

## Scope boundaries

- No customer auto-send was added; the corrective pass removes the commercial save auto-dispatch.
- No rounding, money helper, strategy, trade, deployment, or infrastructure change was made.
- Backend dollars remain ex GST; the changes only correct point-of-use GST descriptions.
- No shared history was rewritten after the external mixed backend commit.

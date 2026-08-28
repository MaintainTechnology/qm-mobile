# Task 02 implementer report — pricing authority and GST

Date: 2026-08-28

Implementation commits:

- Backend (`codex/mobile-full-parity-backend`): `de67722551de24537c29b4d2003689def3191648`
- Mobile (`main`): `5dfa277c21337516e93929f2d864b9d99d2127eb`

This is implementation evidence for independent review. It does not declare the task passed.

## Contract implemented

### Commercial painting

- Added a pure authority result that blocks unmatched surfaces with `inspection_required` and missing/seed tenant rates with `tenant_pricing_required`.
- The price route resolves the relevant tenant pricing book, uses its `gst_registered`, runs the authority gate before persistence, and clears stale priced state on a blocked re-price.
- The save route reloads current tenant pricing authority and rejects stale GST-registration metadata before creating a quote.
- Customer HTML, SMS and PDF footer copy use the BOM's GST state; no-GST tenants are labelled `no GST charged`.
- Mobile classifies the two stable 422 codes, prevents Save for absent/unmatched/blocked BOMs, renders inspection or rate-setup actions, and uses dynamic GST labels.

### Present-recipe authority

- Added a strict active, finite tenant-only material resolver for jobs with an adopted recipe.
- A present recipe with a missing tenant category terminates in inspection routing before retrieval or model generation; it cannot continue to shared catalogue or Opus pricing.
- Jobs with no recipe retain the previous model path.
- Mobile recipe copy no longer promises generic fallback pricing. Missing prices show `PRICE NEEDED`, explain inspection routing, and provide a direct native Catalogue action.

### Air-conditioning

- Added the `pricing_status` discriminant with priced and `tenant_pricing_required` variants; the unpriced variant has no monetary options.
- Added strict complete-card parsing. Partial, malformed, absent, or tenant-less contexts remain unpriced and cannot be persisted.
- Both recommend and plan routes use the same tenant-card loader. Sizing, plan extraction and assessment advice still run in the unpriced branch.
- Priced recommendations preserve the tenant card's GST state; persistence and PDF input accept only the priced variant.
- Mobile parses both variants, suppresses all price/PDF output when unpriced, and labels priced output `INC GST` or `NO GST CHARGED` at point of use.

### Existing mobile money surfaces

- Service list price and custom-service editor: `ex GST`.
- Hourly rate and call-out minimum: `ex GST`.
- History averages and browse rows: `inc GST`.
- Existing money conversion and rounding helpers were not changed.

## RED evidence

Commercial painting backend:

- Pure authority tests: 4 failures before helper implementation.
- Price-route boundary: 4 failures before the route gate/dynamic-GST persistence changes.
- Save-route boundary: 2 failures (blocked inputs returned 200) before the save-time authority reload.
- Report/SMS copy: 2 failures before dynamic GST wording.

Recipe backend:

- Catalogue strict resolver: 3 failures before tenant-only selection.
- Deterministic BOM: 1 failure before the typed missing-tenant-category result.
- `runEstimation`: 1 failure before terminal preflight; the test spies on `generateText`.

Aircon backend:

- Engine: 4 failures for the missing discriminator, strict parser and unpriced helper.
- Real recommend/plan route boundaries: 4 failures because absent/tenant-less cards still returned `priced` and attempted persistence.

Mobile:

- Commercial-paint API and aircon schema: 3 failures before the authority helpers and discriminated schema.
- Screen tests initially failed because pricing block components/branches and dynamic labels did not exist.
- Recipe authority component failed module resolution before the PRICE NEEDED/Catalogue action was implemented.
- Point-of-use label suite: 2 failures before service/labour/history basis labels were added.

## GREEN evidence

Backend focused command:

```text
npm test -- lib/commercial-painting/price.test.ts lib/commercial-painting/notify.test.ts lib/commercial-painting/save-quote-helpers.test.ts app/api/tenant/commercial-painting/price/route.test.ts app/api/tenant/commercial-painting/save-quote/route.test.ts lib/estimate/catalogue.test.ts lib/estimate/deterministic-bom.test.ts lib/estimate/run-recipe-authority.test.ts lib/aircon/recommend.test.ts lib/aircon/save-recommendation.test.ts app/api/aircon/recommend/route.test.ts app/api/aircon/plan/route.test.ts
Result: 12 files passed, 161 tests passed.
```

Backend compiler:

```text
npm run typecheck
Result: exit 0, no diagnostics.
```

Mobile focused command:

```text
npx jest --runInBand --watch=false --forceExit src/features/trades/commercial-painting/api.test.ts src/features/trades/commercial-painting/CommercialPaintingScreen.test.tsx src/features/trades/aircon/schema.test.ts src/features/trades/aircon/AirconToolScreen.test.tsx src/features/trades/hub/sections/RecipePricingAuthority.test.tsx src/features/trades/hub/sections/recipes-api.test.ts src/features/PricingBasisLabels.test.tsx
Result: 7 suites passed, 74 tests passed.
```

The repository's Jest process reports a pre-existing open handle after emitting completed results, so the focused command used `--forceExit`; no test or route remained pending.

Mobile compiler and lint:

```text
npm run typecheck
Result: exit 0, no diagnostics.

npm run lint
Result: exit 0; two import-order warnings in the new commercial-paint test were then fixed.

npx eslint <all Task 02 mobile files>
Result: exit 0, no output.
```

Diff checks:

```text
git diff --cached --check
Result: exit 0 in both repositories before their implementation commits.
```

## Assumptions and boundaries

- Tenant-less aircon requests are unpriced, as directed by the tenant-authority contract.
- A complete aircon split card supplies finite positive bands for `2.5`, `3.5`, `5`, `7`, and `8`; the discount is finite from 0 through 1; all ducted inputs are finite positive values; GST registration is explicit.
- Commercial-paint rate-book precedence is the commercial-paint trade row, then tenant primary trade, then tenant fallback row.
- A recipe that exists is tenant-authoritative for material prices; a job with no recipe retains its previous flow.
- No money rounding, auto-send, deployment, strategy, trade scope, or pricing fabrication was changed.
- Pre-existing backend `.claude-flow` changes, `.claude/settings.json`, and `ruvector.db` were left untracked/uncommitted and untouched by the Task 02 commits.

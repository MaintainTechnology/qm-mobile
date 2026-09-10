# Commercial paint pricing proof and recovery contract

Scope: BE04 server pricing authority and the owned web receipt consumer for `mobile-parity-release-build-spec.md`. This is local source and database-fixture evidence; it does not certify deployment, native parity, or device behavior. The native unsafe Save gate remains closed until its consumer and device checks pass.

## Corrected behavior

- A priced takeoff records the exact owned run metadata, raw and corrected extraction inputs, selected rate rows, the commercial-paint pricing book and explicit labour intent. Its digest covers all of them and the pricing algorithm version.
- Omitted labour means current tenant labour. A supplied valid labour override is recorded as an override. Save never silently converts inherited labour into an override; changing tenant labour invalidates either basis, including when the explicit override happens to equal the old tenant value.
- GST comes from the owned commercial-paint pricing book with a boolean registration value. A missing or other-trade book cannot supply tax authority.
- Save recomputes and compares proof and BOM, then PostgreSQL compares the complete source again inside the atomic draft transaction. Rate/book table locks cover inserted/deleted rows as well as updates; run and extraction rows are locked in order. No PDF or provider request runs while these locks are held.
- Every Price stores a strictly increasing `priced_at`, including identical inputs. The reviewed identity is the pair `pricingProof` and `pricedAt`. ISO timestamps are normalized to UTC with six fractional digits, preserving PostgreSQL microseconds.
- The deterministic draft identity remains unchanged and is derived from the reviewed pricing instant. Recovering an existing reviewed draft precedes checks against today's BOM or rates. A lost Save followed by identical repricing therefore recovers the original draft rather than creating another one.
- Submitted customer identity is checked exactly when POST recovers a prior draft, including clearing a formerly populated phone. Read-only GET recovery needs ownership and the opaque reviewed identity, without storing customer details in the receipt.
- Saving creates a draft for human review. Delivery is `{ attempted: false }`; no SMS, payment, or automatic approval is added.

## Consumer contract

All routes are authenticated under `/api/tenant/commercial-painting`.

### Price

`POST /price`: existing run/extraction request plus optional `labourRatePerHr`. A successful response includes:

```ts
{
  ok: true,
  bom: PricedPaintBom,
  pricingProof: string, // 64 lowercase hex characters
  pricedAt: string,     // canonical UTC ISO timestamp, six fractional digits
  labourBasis: { mode: 'tenant' | 'override', ratePerHr: number | null },
  gst_registered: boolean,
  rateRows: number,
  usesSeedDefaults: boolean
}
```

`GET /run/:id` returns the owned historical BOM and proof. `extraction.pricing_review` is either `{ pricingProof, pricedAt }` or `null`. Legacy BOMs stay readable; a new Save requires a fresh proof and reviewed timestamp.

### Save and recovery

`POST /save-quote` requires `paintRunId`, `extractionId`, `pricingProof` and `pricedAt` for a new draft, and accepts existing optional customer name and phone fields. Keep the reviewed pair from the displayed Price result; do not substitute the newest extraction timestamp after an uncertain Save.

Successful new and recovered POST responses include:

```ts
{
  ok: true, paintRunId, extractionId, pricingProof, pricedAt,
  quoteId, shareToken, quoteViewUrl, pdfUrl,
  delivery: { attempted: false }
}
```

Recovered responses also have `alreadySaved: true`. Historical callers without a reviewed timestamp may recover an already existing verified draft, but cannot create a new one. The PDF remains best-effort after the atomic draft transaction.

Legacy recovery limitation: a pre-219 deterministic save whose request omitted `pricedAt` and whose `sheets_used.saved_quote` projection never persisted may have been keyed by the raw timestamp spelling rather than the new canonical spelling. That historical draft may require opening the existing owned quote from the queue; the route fails closed rather than creating another draft. This exact previous deterministic writer has not been proven deployed, and neither it nor migration 219 was deployed in this work. This limitation does not affect verified recovery using the new reviewed `pricingProof`/`pricedAt` pair and does not earn full legacy recovery acceptance.

`GET /save-quote?paintRunId=...&extractionId=...&pricingProof=...&pricedAt=...` reconciles the retained reviewed pass. A saved response adds `status: 'saved'` to the identity and saved quote fields above. Absence returns exactly `{ ok: true, status: 'not_found', paintRunId, extractionId, pricingProof, pricedAt }`.

`not_found` does **not** prove that an earlier in-flight POST cannot still commit. Keep an uncertain receipt until a validated saved response or another conclusive reconciliation. Transport errors, malformed responses, dependency failures and `saved_quote_unverifiable` also retain the receipt. A later rejected retry cannot erase uncertainty from an earlier request.

`GET /save-quote?scope=1` returns `{ ok: true, userId, tenantId }` from the authenticated server resolver with `Cache-Control: private, no-store`. Caller-provided user/tenant parameters do not select the scope. Missing identity/tenant is 401. Clients should scope opaque receipts to these IDs and fence callbacks on account changes. No customer name, phone, address or BOM belongs in receipt storage.

## Migration and compatibility

Migration `219_commercial_paint_pricing_proof.sql` requires the existing paint tables/quote schema and migrations 107, 201 and 211. It adds nullable JSONB `plan_extractions.paint_pricing_proof` and three service-role-only, security-invoker RPCs returning JSONB with no default arguments:

| RPC signature | Purpose |
| --- | --- |
| `commercial_paint_pricing_source(uuid,uuid,uuid)` | Read one owned current source snapshot; SQL STABLE |
| `persist_commercial_paint_pricing(uuid,uuid,uuid,jsonb,jsonb,jsonb)` | Atomically store/clear the reviewed BOM and proof |
| `save_commercial_paint_quote(uuid,uuid,uuid,jsonb,jsonb,jsonb,timestamptz,jsonb,jsonb)` | Compare source/proof/generation and atomically insert/recover intake and draft |

Writer RPCs use default VOLATILE behavior. All have `search_path=pg_catalog,public`; execution is revoked from public, anon and authenticated. The preexisting service-role table privileges remain required. Migration 211's released-source guard is preserved. Migration 218's readiness/catalog integration is owned by the separate SMS task and must pin these signatures, normalized bodies and the proof column before runtime readiness can pass.

Apply the migration before enabling the new server/client contract. Missing RPC/column/proof fails closed. No migration was applied in this work. The down migration removes the three RPCs while retaining proof history; disable new pricing/Save controls before rollback. Existing published commercial quotes remain immutable.

## Validation and review

- Direct broad gate: 140/140 across actual proof/price/save handlers with PGlite migration 211+219, existing price and Save route suites, pure pricer, payload helpers and commercial release guard.
- Final scope-only addition: 53/53 across proof/real-handler SQL tests (47) and Save route tests (6). New cases verify server-selected account/tenant scope, account switches, no pricing I/O and unauthenticated rejection.
- Web receipt consumer: 18/18 (seven actual Chromium component scenarios with offline HTTP boundaries and eleven receipt helper cases), plus scoped tab/editor/helper/test lint. Independent source review passed after correcting initial rollback rejection classification and separating disabled recovery controls from the actual Pricing state label. Cases include lost response/reload recovery by GET only, exact reviewed pass, denied storage, foreign/absent readback, account switch and an old account's late success.
- Parent independent pricing review: 108/108 across proof45, price15, Save6, pricer32 and payload10 before the scope-only addition. The two concrete review findings—same-input repricing generation and cleared-phone recovery—were fixed and passed independent review.
- Final server scoped ESLint passed without warnings and full web TypeScript passed after the read-only scope addition (both exit 0).
- Database fixtures cover real transaction rollback, inserted rate rows, changed takeoff/rates/GST/job metadata, newest extraction, released runs, inherited versus explicit labour, proof/BOM tampering, old-screen Save, lost acknowledgement, identical repricing recovery, customer conflicts and microsecond preservation.

## Server source freeze fingerprints

SHA256 at the server handoff; paths below are relative to `C:/Users/dalig/Downloads/QuoteMate/quoteMate/quotemate-automation`.

| Source | SHA256 |
| --- | --- |
| `lib/commercial-painting/pricing-proof.ts` | `02388203206e5b7f1aeae47c7336b1ad5cf679d493a3007a2ba22ede5735c09f` |
| `lib/commercial-painting/pricing-context.ts` | `158b9f0bb9b8e44f6f9554cdc91bcdc20ff5df3cd694eb3e01597fb5707e8abf` |
| `lib/commercial-painting/saved-quote.ts` | `668bab6f03198dbd31d8e8962b5f9d5629c02c3a06b1e3a7de1ee74964b51795` |
| `app/api/tenant/commercial-painting/price/route.ts` | `4be36879e1da5a1931f6dc10a9ecc33d519d7b1bcde4e4413fd403b4da2a36b4` |
| `app/api/tenant/commercial-painting/save-quote/route.ts` | `7a4a3520f8215808499c02fb1836ca5765f49ea88a160973122733e030028980` |
| `app/api/tenant/commercial-painting/run/[id]/route.ts` | `192483cb9a878cedbe3db80337b283c609403d8a7e2666f6d19092692908f831` |
| `sql/migrations/219_commercial_paint_pricing_proof.sql` | `17f5ccffc6104b09baf78ee5403a4916c28ee1443def1d21143c63d6da005de0` |
| `sql/migrations/219_commercial_paint_pricing_proof_down.sql` | `27fe5d4713834a93e892a280ae5c133210b173b88f72c38f31cec22993a13e93` |

RPC body SHA256 normalizes CRLF to LF, matching migration 218's `pg_proc.prosrc` calculation:

| RPC | Normalized body SHA256 |
| --- | --- |
| `commercial_paint_pricing_source` | `f03af634edb911ea7ecb8724a1da1223fbd9f7beace74c3bbe35a728eef6ae42` |
| `persist_commercial_paint_pricing` | `973797a9f7ee6d4f56071c1cf206bc52edd69c2212744ef2941c9a9cd94c2bb5` |
| `save_commercial_paint_quote` | `039e2730b98298411136a53d3268f50f3f00e0a0ce32d23889643fa4f833cd27` |

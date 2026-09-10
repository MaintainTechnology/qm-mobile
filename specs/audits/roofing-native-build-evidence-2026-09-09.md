# Roofing native build evidence — 9 September 2026

Contract: `specs/mobile-parity-release-build-spec.md`, principally T03, T04, T18, X02, X03 and X04. This is bounded implementation evidence for the roofing changes, to be combined with the main release ledger and independent review.

## Implemented scope

| Spec item | Implementation and evidence |
|---|---|
| T03: address and building selection | Native address suggestions retain manual address/postcode/state fallback. Initial and building-specific material, pitch, intent and year inputs use the existing measurement request contract. Overrides use provider building IDs; unsupported invented height input was not added. Explicit inclusion and customer name/phone persist on quiet Save. |
| T03: measurement review and saved jobs | Saved-job rows open private `/roofing/[id]`. The owned reader validates tenant and exact row/token identity. The editor displays saved source metrics, tiers, solar summary, inclusion, footprint selection diagram and existing public-token aerial imagery with failure fallback. Supported corrections follow the existing PATCH contract exactly; zero accessories and blank removable overrides stay distinct. |
| T04: immutable correction and promotion | Selection and corrections send the expected stored revision. A returned immutable successor is reopened by its measurement token. Promotion starts after explicit native review and sends only measurement token plus current pricing revision. Creation now routes into that one durable promotion workflow. Quiet creation remains separate from customer delivery. |
| X02: unknown mutation recovery | Secure opaque receipts precede owned correction/promotion. A returned successor token is retained before readback. Unknown responses block replay. Initial Save retains its verified run and selection; the additive owned GET supports deterministic run-token lookup. GET reconciliation checks the exact tenant/run and a complete saved response before clearing recovery. An incomplete saved response retains its receipt and offers a private-job link. |
| X03/X04: account-scoped working copies | `src/lib/working-draft-storage.ts` supplies shape-validated, encrypted SecureStore chunks and commit-last manifests, scoped by user/tenant/purpose/record. It preserves the existing seven-day working-copy period and revokes old handles on account cleanup. Roofing input and correction wrappers keep working values, including invalid correction text. Creation and correction screens prevent navigation while the latest local write is unconfirmed and expose storage retry. |
| X02: read and lifecycle failures | Tenant failures offer retry. Cached owned measurements are labelled when current reads fail; mutations wait for a successful refresh. Draft hydration is fenced against a successor lookup race. StrictMode effect replay and late unmount completion are covered. |

## Automated evidence

- Final combined native roofing/schema/receipt/adapter/account-cleanup/tools API run passed 93 tests in eight suites (14.197 seconds). Command: `node node_modules/jest/bin/jest.js --ci --runInBand src/features/trades/roofing src/lib/working-draft-storage.test.ts src/lib/account-storage.test.ts src/features/trades/tools/tools-api.test.ts`.
- Canonical request fingerprint and delayed old-draft/successor hydration regressions passed.
- Final creation screen: 13 passing interaction tests. Final owned editor: 13 passing interaction tests. These exercise actual native screens with provider, navigation, storage and network boundaries mocked. Recovery tests include failed initial draft hydration and refresh/discard while the previous-action receipt is still unread.
- Encrypted generic store plus account cleanup: 14 passing tests; independently reviewed by the root and Studio agents. Cases include UTF-8 chunks, hashes, commit-last recovery, failed writes, scope separation, expiry, capacity and immediate handle revocation.
- Web actual owned GET handler: 14 passing tests. Existing actual promotion handler: 15 passing tests. No PATCH/POST immutable-successor or pricing-authority contract was weakened.
- Native scoped lint passed after the final changes. Type checking is recorded in the parent release ledger after the final candidate check.

## Remaining acceptance evidence and contract limits

- T03/T04/T18 still require real iOS and Android interaction evidence, licensed provider configuration and imagery-source verification. The footprint diagram does not edit geometry or authorize prices.
- The existing web AI solar-photo rescan was not newly exposed while the relevant SEC03/DEC04 consent decision remains open. Saved solar evidence is reviewable.
- An unknown correction response without its successor token remains safely blocked: the existing server does not expose an exact successor-operation lookup. It needs a durable server operation identity and readback contract for complete recovery.
- An initial Save that never committed and whose verified run later expires cannot be conclusively retired by a missing-row GET alone. The receipt remains; absence is not evidence that an in-flight save cannot commit.
- No deployment, migration application, live provider operation, customer send or store submission was performed for this slice.

# Support and public Help — bounded U07 build

Date: 9 September 2026. Specification: `specs/mobile-parity-release-build-spec.md`, U07, X03, X04, X05 and the SEC02 dependency. This is a bounded mobile implementation, not full U07 or release acceptance.

## Mobile behavior implemented

- The five existing topics and exact name/email/phone/message bounds are preserved. Sending remains an explicit public `/api/contact` request; no fabricated tenant, credentials, server ticket or provider integration is introduced.
- Working copies use the existing encrypted, chunked, seven-day working-draft store. Public enquiries omit tenant identity. Guest and actual Clerk-user partitions are separate. Existing real-tenant scope hashes remain byte-identical. Logout/account cleanup still purges all working copies.
- The previous device-wide Support draft cannot be assigned to a trustworthy owner. It is removed with serialized, verified cleanup on Support load and account cleanup. Failed cleanup is visible; an unread/corrupt draft never becomes a writable empty success state.
- Input changes persist immediately. Send flushes the immutable working copy before recording its receipt and invoking HTTP. Already durable unchanged copies are not rewritten by background or flush events, preserving the edit-based retention window. Back/Help navigation stays guarded until all queued writes finish, including rapid A→B→A edits. Storage errors have a deliberate local retry; this retry never sends a message.
- Each send records a verified opaque local receipt before HTTP: version, local request UUID, input SHA-256 and outcome only. No name, email, phone, message, credentials or server share token is included. These operation receipts have no timeout/expiry and are intentionally preserved by logout cleanup.
- A synchronous latch prevents duplicate taps. The UI remounts for the exact Clerk account/session; operation epochs and abort propagation reject old/unmounted/ABA completions. Fields are read-only during send or unresolved outcome. Confirmed cleanup is matched to the submitted input hash; an unrelated working copy is retained.
- A validated server acknowledgement is described as provider acceptance, not proof of delivery into a support inbox. Another enquiry requires explicit acknowledgement of that confirmed result. Exact known pre-send validation/rate-limit/missing-inbox responses permit deliberate correction/retry. Transport, timeout, malformed response and ambiguous provider failures retain the unknown fence.
- Welcome and Support now expose the public Help catalogue. `/sections/help` has a public destination classification and a signed-out Back fallback. Existing 49 approved/categorized static assets remain unchanged; historical/gated documents and the conditional illustrative calculator remain gated.

## Required paired server work after the shared-source freeze

1. **Support operation/status contract.** Current `web/app/api/contact/route.ts` calls `sendEmail` directly and returns only `{ ok: true }`; `lib/email/resend.ts` has no per-operation idempotency key. A provider can accept the email before the mobile acknowledgement is lost. Add a durable opaque operation/recovery capability, immutable payload binding, atomic claim, provider acceptance evidence and a public privacy-safe status contract; use the same contract in both owned callers. Unknown requests must never acquire a new request identity through a timeout, retry or remount. Test provider acceptance plus lost response, concurrent retries, different payload under the same identity, read failures and non-sensitive recovery. Do not expose enquiry content through a guessable public status ID.

   Until that server contract exists, this mobile build **cannot query or safely retry an unknown support send**. It keeps a local device reference and blocks another send in that guest/account partition. The reference is not a server ticket, no status GET is fabricated, and there is no automatic expiry or override. This is a deliberate incomplete recovery state, not full Support parity.

2. **Truthful unsubscribe persistence.** Current `web/app/api/email/unsubscribe/[token]/route.ts` ignores the resolved Supabase `upsert.error` and can return the “unsubscribed” HTML page without storing suppression. Inspect the returned write result and return an actionable error/retry state when it fails; preserve signature authorization and idempotency for only the signed tenant/email pair. Add actual-handler resolved SQL rejection, network failure, replay and token-isolation tests. A read-only fixture execution of the existing handler reproduced HTTP 200 and a success claim after an injected returned database error. No web source was changed in this mobile slice.

## Remaining requirements and evidence limits

- SEC02 remains open: the web legal company name, ABN, address and contact emails are still placeholders. No business facts or policy publication were invented. Approved readable policies must be connected before/after auth once the real content is available.
- The illustrative 17-control painting calculator is not exposed; its conditional acceptance is not claimed complete. Native interactive document/viewer behavior, recipe accordions/theme behavior and installed-device browser/share evidence remain separate work.
- Browser-public unsubscribe remains the intended installation-free disposition. Deployed associations and signed-device link handling are not certified by these tests.
- No live support messages, provider requests, migrations, deployments or app-store actions were performed.

## Local verification

- Nine suites, 62 tests passed: actual native Support screen/controller with mocked HTTP and real encrypted-store logic; Support receipt and working-copy helpers; contact validation; shared working-draft/identity cleanup; Help census; public destination registry.
- Adversarial screen cases cover lost acknowledgement/remount, direct A→B and A→B→A late callbacks, simultaneous taps, unread storage, failed storage plus Back gate, offline submission, immutable pre-send persistence, unchanged background retention and rapid edit/write ordering.
- Support-scoped ESLint passed. Full mobile TypeScript runs reported only concurrent agent-owned CP/Studio test edits at the time of the runs; a final shared TypeScript gate belongs to the integrated candidate, not this report.

Independent review by the coordinating task is required before marking this bounded mobile slice passed. Full U07 remains incomplete for the server/legal/device requirements above.

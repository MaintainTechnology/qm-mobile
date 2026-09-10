# U07/X02 Support operation continuation

Status: **source candidate only; full specification FAIL/incomplete.** No live send, provider configuration, migration or deployment was performed. The current mobile routes still use their prior Support implementation. The replacement is staged outside mobile discovery at `C:/Users/dalig/.codex/worktrees/qm-parity-server-20260909/native-support-operations-prototype`.

The fixed full-scope rubric remains in `../mobile-parity-build-progress.md`. Last closed score:24.1/100, trajectory20.9→24.1. New source or unrun tests receive no verification/release credit.

## Required behavior and candidate

U07 requires accessible Support and truthful error/recovery states. X02 requires bounded transport, authoritative outcome handling and no blind replay. SEC02/REL04 require private content and tokens to stay out of monitoring. The new225 server/native contract uses an opaque request UUID, exact five-field input hash and32-byte private status capability. Protected local receipts outlive the separate seven-day working copy. Existing unknown v1 references were never server tickets and remain fenced across an upgrade.

The native candidate writes and reads back the protected receipt before POST. Reopening only GETs a retained outcome. Explicit retry first GETs; terminal results skip POST, and malformed/conflicting responses block replay. An explicit cancellation can only create an absent-request tombstone. An already claimed request retains its real unknown/accepted/rejected state. Terminal acknowledgement compares the full observed receipt and requires verified local deletion. A newer account or request invalidates captured callbacks.

The paired isolated225 server claims a provider dispatch once, checks the capability/input identity before duplicate handling, and preserves the claim beyond the provider's finite idempotency window. Signed callbacks bind request/input/proof/destination and immutable provider ID. No message text, raw capability or raw IP is stored in the operation receipt table. Legal/retention/provider deployment decisions and live acceptance remain open.

## Independent source review and corrections

- The first native retry implementation called POST directly. Review required GET before every explicit retry; the hook now settles terminal recovery first and sends only the original still-unknown command.
- Monitoring can collect custom request headers even with default PII disabled. The exact header is now `X-Contact-Capability-Token`, with explicit isolated server/edge event/transaction/span scrubbing. Native already drops request/extra/context/span data and disables tracing. Actual installed-SDK tests are authored, not passed.
- An old app's recorded confirmation is labelled as such. The UI does not present it as a new225 provider acknowledgement.
- A recovered rejection cannot claim an expired draft still exists. Original-copy availability is proved by the exact displayed draft hash and receipt; proof is synchronously invalidated when either displayed object changes.
- Cancellation alerts capture the displayed request. Confirmation rechecks the current reference and account/session; the secret is never shown in the UI or URL.
- Root independently reviewed225 SQL, request/provider helpers and routes. No additional definite source issue was found in transaction identity, cancellation or immutable callback handling. This is not a SQL/runtime PASS.
- Independent transport review found a stalled stream could remain locked after timeout. Outer lifecycle cleanup now cancels/releases the reader, including late fetch bodies, without awaiting unbounded cancellation. Corresponding assertions are authored. This repaired transport was independently re-read with no further concrete finding; execution remains open.
- The public-host review found same-event edit/Send → Back could use old rendered storage/action flags. The model now supplies a synchronous lifecycle/storage/action guard, used by the always-mounted navigation listener and explicit Help/menu actions. Failed initial hydration permits exit because editing was disabled. Exact same-event and delayed obsolete hash completion cases are authored, unrun.

## Authored checks and integration still required

Native prototype files contain contract/hash/capability cases, actual SecureStore adapter recovery tests, real hook/working-copy regressions, actual typed-client/Expo-fetch boundary tests and actual screen confirmation/expired-copy/account/offline/navigation cases. They remain **UNRUN**. Screen tests mock the external transport; API tests exercise the real typed client with the native fetch boundary mocked.

The earlier global API patch was removed after inspecting the installed React Native and Expo54 implementations. Global React Native fetch does not enforce its redirect option; the self-contained replacement uses the already-installed `expo/fetch` with redirects rejected and cookies omitted on all three methods. It never loads session credentials, has a bounded response body and whole-operation timeout, strictly binds the response identity, and reports only controlled errors/static route values. No dependency or global authenticated-API change is needed. Exact framework reference: [Expo54 fetch documentation](https://docs.expo.dev/versions/v54.0.0/sdk/expo/). Native redirect/cookie/device behaviour and the replacement transport's independent review are still pending.

Isolated server225 has seven prepared test files covering actual PGlite migration113+225, handlers, installed Resend/Sentry SDKs, proxy-header trust, public routing and four Chromium form journeys. Those gates, native integration, a fresh full mobile check and independent integrated review remain required. Current mobile check02 did not reach Jest. Its failure and the previous101-suite/937-test baseline do not cover this candidate.

A separate public-startup prototype is being built so Support/unsubscribe can be reached when Clerk initialization fails. It must never mount private cache/purchases/push/biometric children or treat a loading account as signed out. Full public launch, return-to-account, cleanup failure, same-account recovery and signed-device acceptance remain open.

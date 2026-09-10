# C13 business-image build and independent review

Date: 9 September 2026. Current status: source reviewed; execution pending. This is not a complete C13, X05 or release PASS.

## Contract and implementation

The native Account card supplies logo/photo selection, preview, explicit replacement, recovery and cancellation through `/api/tenant/business-media`. It does not use the legacy upload route as a fallback. The paired handler and migrations222/224 are in the isolated parity server checkout and have not been integrated or deployed.

The request binds a canonical tenant/user, request UUID, image kind, observed media revision, source MIME and exact source SHA-256. The input hash uses the same fixed-order JSON text in native and server, pinned by the shared synthetic fixture digest `93572def8181fae4d18a7b5d103301fd1f9bb19f4743497aa329d958996981b4`.

Only opaque identity/hash/status data enters the native SecureStore receipt. Image bytes, source filename, URI, bearer token and returned asset URL are not persisted there. The selected byte snapshot and its preview remain in memory. A seven-day working-copy expiry cannot erase an outstanding image-operation receipt.

Native file reading checks actual size at or below2MiB, verifies the file handle's consumed offset and post-read size, and closes the handle on success or failure. The exact installed SDK54 Android implementation may return a zero-padded allocation on a short read; checking only returned buffer length would not prove a complete read. The bounded header guard checks actual PNG/JPEG/WebP dimensions against picker metadata, allows orientation swapping, and rejects animation, oversized dimensions and malformed container bounds before preview. This header guard is not a full image decoder. The paired server performs full decoding and metadata-free proportional WebP optimization.

SQL224 begins the operation before immutable storage upload, freezes the optimized hash/path, and completes only after exact stored-byte readback. The media revision rotates for legacy and new logo/photo writes. Completion rechecks ownership and revision and atomically invalidates draft-only PDF caches using222; issued objects remain intact. Cancellation creates a terminal tombstone even if the original POST has not appeared yet. A previously completed operation wins cancellation and returns its historical completion separately from the account's current image/version.

## Independent findings handed back to build

| Finding | Fix in current source | Verification |
|---|---|---|
| UUID casing split receipt keys and rejected valid response scope. | Canonical tenant UUIDs across storage, hook scope and response comparison. | Cross-case lost-response regression authored; unrun. |
| Matching path on a foreign HTTPS host could reach the image loader. | Preview URLs must match the configured Supabase HTTPS origin and exact storage path. | Foreign/configuration/path regressions authored; unrun. |
| A malformed complete receipt could clear recovery without an asset belonging to its operation. | Validate tenant/kind/request/output-hash WebP path and configured-origin URL before storing a terminal status. | Adversarial complete-receipt regressions authored; unrun. |
| A terminal local receipt could be downgraded by a contradictory server reply. | Conflicting status preserves the terminal reference and surfaces recovery failure. | Terminal monotonicity regressions authored; unrun. |
| Stale confirmation callbacks could cancel/discard a replacement operation or selection. | Cancel binds the displayed request ID; discard and rebase bind the captured selection and current revision. | Hook and actual editor regressions authored; unrun. |
| Short/padded reads and excessive encoded dimensions could enter preview. | Verify handle offset/size and bounded actual image headers before hashing/base64/preview. | Reader and header regressions authored; unrun. |

## Coverage and remaining gates

| Spec item | Current disposition |
|---|---|
| C13 logo/headshot pick/preview/replace, failed operation retains current asset/input | Implemented and independently source reviewed. Native hook/writer/editor and paired real SQL/decoder tests still need execution. |
| Requirements3/6/7, X02 owned persistence and unknown outcomes | Exact operation identity, retained-before-send receipt, GET-only remount, exact retry, cancellation and terminal acknowledgement are implemented. Full route/provider/device acceptance remains open. |
| Requirement8, X03 account isolation | Scope/session/epoch fences and opaque per-account recovery are implemented and covered by authored account-switch/token/picker/body regressions. No current passing test claim. |
| X05 bounded media and temporary-file cleanup | Byte/header/server-decoder bounds are implemented. Picker-owned plaintext cache cleanup, process-death leftovers and installed-device file/picker/share behaviour remain open. |
| AUTH04 shared onboarding media/remove | Not completed by this Account editor. Shared address entry is a separate implemented candidate; onboarding media/remove remains open. |
| C13 Account/Home/report branding readback | Query invalidation and paired draft-cache invalidation are implemented. Current-tree tests and actual Home/report/reopen proof remain open. |

The system picker itself creates a cache copy. The reader creates no additional plaintext file, but that does not prove the picker copy was deleted. Exact installed iOS/Android implementations normally use `Paths.cache/ImagePicker/<UUID>.<extension>`; an iOS scoped-cache branch can use the cache root. No broad cache-directory deletion or deletion of a user original was added. This remains a concrete X05 cleanup task.

## Queued verification

- Complete mobile `npm run check`:365-row spec validation, TypeScript, canonical zero-warning ESLint, and full Jest in one worker. Not run against this final tree yet.
- New native test files: business-media file/writer/hook/editor plus bounded image-header regressions. Source ready, unrun.
- Isolated `tests/business-media-operations.test.ts`: actual route, PGlite222/224, Sharp decoder and storage-byte assertions. Authored, unrun.
- Signed iOS/Android picker, interruption/relaunch, upload/cancel and branding evidence: absent.

The fixed full-scope score remains24.1/100 until a new verification checkpoint. No release gate is closed by this document.

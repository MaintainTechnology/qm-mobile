# U07 native email unsubscribe — bounded build evidence

Status: implementation and tests prepared; focused runtime/static checks and independent native review pending the shared test slot. This is not full U07 or release certification.

| Specification requirement | Candidate implementation |
| --- | --- |
| U07 token acknowledgement/recovery without tradie sign-in | Public `/unsubscribe` screen uses the existing signed suppression URL. The token remains opaque. Only an explicit Unsubscribe tap invokes the idempotent GET; mount, reopen, reconnect and foreground do not invoke it. |
| X01 safe cold/warm link and guest navigation | Registry and native-intent handling accept the two approved HTTPS hosts, the existing `/api/email/unsubscribe/<token>` path, `/app/unsubscribe` and custom-scheme routes. Token shape, one-token query and allowed parameters are checked. Invalid links go to recovery. Back uses history or the guest/signed-in fallback. |
| X02 authoritative acknowledgement | Exact `{ok:true,status:'unsubscribed'}` JSON is required. Returned invalid-link errors, server failure, malformed replies, interruption and offline actions cannot display success. A deliberate retry reuses the same idempotent suppression capability. |
| X03 lifecycle and privacy | Synchronous duplicate guard, request abort, component identity and epoch/token fencing prevent stale account/link acknowledgements. The token has no query-cache, draft, analytics or log write. Static diagnostics redact the request path. |
| SEC02/SEC03 public scope | Optional `anonymous:true` transport bypasses saved session storage and Authorization and explicitly omits ambient cookies. Combining it with a Bearer token is rejected by the type and runtime contracts. Server signature authority remains responsible for only the suppression operation; native code does not decode contact or tenant identity. |
| X07 existing native presentation | Shared SectionScreen/Card/Notice/action components retain typography, safe areas, accessible controls, scrollable text and guest access. |

The 1,024-character signed-token transport bound matches the existing native opaque-token ceiling. Its base64url payload and 43-character signature are syntax checks, not proof of authority or email validation.

The screen and public resolver do not wait for Clerk to load; authenticated resolver destinations still wait. The root app startup boundary continues to require Clerk hydration before mounting routes so private query state cannot hydrate under an unknown identity. Complete provider-outage cold-start access therefore remains an X02/startup gap requiring separate design and integration tests. The screen-level loading tests must not be presented as end-to-end outage proof.

The paired isolated server adds explicit JSON negotiation while preserving escaped HTML confirmation, `Vary: Accept`, private/no-store and no-referrer headers. The server candidate and its source tests were read independently; no remaining scoped source finding was identified. The parent ran four actual test files: unsubscribe route9, signed tokens7, association routes2 and association payload4; all22 passed in6.81 seconds, exit0. Scoped ESLint on all five changed server runtime/test files also exited0. The initial invocation used an unsupported Vitest4 `--minWorkers` option and exited before running tests; the corrected one-worker invocation above supplied the passing evidence.

Android source now claims only `/api/email/unsubscribe/` for the two existing approved hosts. The paired isolated AASA addition is separate. Neither association is claimed deployed or proven on installed devices. Browser completion remains available for people without the app.

Primary documentation checked before implementation: [Expo SDK 54](https://docs.expo.dev/versions/v54.0.0/), [SDK 54 Router](https://docs.expo.dev/versions/v54.0.0/sdk/router/) and [native intent customization](https://docs.expo.dev/router/advanced/native-intent/). The installed Router 6.0.24 API was also inspected.

Verification pending: focused native unsubscribe/transport/deep-link tests, existing destination/monitoring regressions, final TypeScript/lint, independent native review and installed iOS/Android cold/warm link/back evidence. No live suppression, deployment, external message or migration push was performed.

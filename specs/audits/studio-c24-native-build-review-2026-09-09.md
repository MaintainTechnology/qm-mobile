# C24 native Brand Studio — build and review evidence

Status: implemented and independently reviewed; final focused runtime checks passed. Final TypeScript/lint reruns remain pending after test-only annotation/import repairs. This report does not certify an App Store release or signed-device export.

## Coverage against mobile-parity-release-build-spec.md

| Requirement | Implementation and evidence |
| --- | --- |
| C24 fixed five-slide rail and preview | Native `/sections/studio`, reachable from Marketing. Cover, Benefits, Steps, Testimonial and CTA retain the existing order. Authenticated POST previews use the actual BE10 renderer. |
| C24 editable fields, approved photo/None, scrim and footer | `StudioFields.tsx` maps the exact five existing shapes, 13 approved photo IDs, positions, scrims, eyebrows and footer arrays. Scalar, tuple and label edits apply to the latest selected-slide value. |
| C24 selected slide only and protected Reset | Fixed-index functional edits preserve other slides. Reset requires confirmation and resets all five starter slides while retaining selection, matching the web action. |
| C24 failed preview/export preserves edits | Errors retain the encrypted working copy. Obsolete previews are hidden; cancelled/late results cannot open a share sheet. Unsupported bundled-font characters remain editable and are rejected before server work. |
| C24 current PNG and ordered carousel PDF | The real PNG stream is bounded and CRC/dimension validated. `pdf-lib` 1.17.1 embeds all five ordered 1080 × 1350 PNGs before creating the complete PDF. Sharing uses the SDK 54 File/Directory and native Sharing APIs. |
| X03 account and lifecycle boundaries | User/session/tenant remounts, fresh Bearer headers, request cancellation, and synchronous render/export revocation through the account cleanup boundary. Private previews stay in memory. Dedicated temporary export files are removed after sharing, interruption, editor reopen and identity cleanup. Failed final deletion blocks another export until explicit cleanup succeeds. |
| X04 durable working copy | One user/tenant/purpose/record-scoped SecureStore working copy via the shared chunked adapter. Seven-day retention, failed-load protection, explicit discard, failed-save retry and pending-write accounting protect rapid edit/revert and Back/share handoff. No remotely stored projects or project library. |

## Actual output inspection

The fixture in `evidence/studio-c24/output.fixture.mjs` calls the unchanged web render handler with isolated owner-auth only, blocks network access, and passes each real PNG through the actual mobile `createStudioPdf` implementation. It changes no frozen web source.

`inspect-output.py` independently opens the resulting PDF using pypdf and PDFium. All five pages contain one image, have exact 1080 × 1350 dimensions and appear in Cover → Benefits → Steps → Testimonial → CTA order. Every embedded image and every decoded PDF raster matches its source PNG pixel-for-pixel (RMS difference zero). The contact sheet was visually inspected: branded layouts, copy and approved photos are present; no blank page.

- `evidence/studio-c24/quotemax-carousel.pdf`
- `evidence/studio-c24/contact-sheet.png`
- `evidence/studio-c24/render-evidence.json`
- `evidence/studio-c24/pixel-inspection.json`

This proves the local real-render/PDF composition path. Native iOS/Android save destinations, physical-device memory/lifecycle behaviour, accessibility/large text and signed-build integration still require device evidence.

## Verification record

- Initial complete native Studio checkpoint: 35 tests passed across six suites.
- Independent review fixes: five targeted regression cases passed (same-batch edits, cleanup failure and explicit retry, native AbortSignal compatibility, synchronous revocation).
- Final focused gate: 107 tests passed across 15 suites, including all 41 Studio tests, Support and account/identity/shared working-copy cleanup. This includes rapid edit/revert and reopen, final file-deletion failure, silent directory-deletion failure, native AbortSignal compatibility and protected retry. Evidence: `evidence/studio-c24/final-native-test-output.txt`.
- The parent independently reviewed the latest Studio implementation and actual five-page contact sheet/pixel evidence with no remaining source findings.
- Full native TypeScript found only test harness inference and Studio async mock return annotations; these were repaired. Scoped lint found only a duplicate test import, also repaired. Final reruns are pending the external PDF gate; neither earlier clean checkpoints nor pending repairs are claimed as final TypeScript/lint success.
- Existing server BE10 verification remains separately bounded: 69 checks previously independently passed. These are not native device tests.

## Dependencies and remaining boundaries

Exact `pdf-lib@1.17.1` was added without install scripts, audit/fix, or unrelated upgrades. Primary documentation checked: [Expo SDK 54 FileSystem](https://docs.expo.dev/versions/v54.0.0/sdk/filesystem/), [Expo SDK 54 Sharing](https://docs.expo.dev/versions/v54.0.0/sdk/sharing/), [pdf-lib React Native support](https://pdf-lib.js.org/) and [PNG embedding](https://pdf-lib.js.org/docs/api/classes/pdfdocument#embedpng).

No arbitrary uploads, new formats, provider AI generation, automatic external publishing or persistent project collection were introduced. Existing starter marketing copy is preserved from web; unresolved product/copy and defensive-bound decisions remain the parent specification's DEC02/DEC04 gates.

# QuoteMax Mobile vs Web — feature gaps and App Store readiness

**Assessment date: 8 September 2026. Verdict: full feature parity has not been reached, and the current app should not yet be treated as App Store deployment-ready.**

There is a substantial native app already: onboarding, quote review/send, chats, analytics, follow-ups, calendar, pricing/catalogue/recipe editors, files, historical calibration, marketing QR, payouts, videos and several trade tools. The remaining work combines missing workflows, incomplete native controls, first-party browser handoffs, shared backend defects and unverified deployment/device behaviour. These are different types of work and should not be estimated as one list of entirely absent screens.

This is a complete **source-based feature/journey comparison**, with local type, lint, unit-test and iOS bundle checks. It is **not a completed live end-to-end test or Apple certification**. No production customer sessions, messages, payments, uploads, provisioning, migrations or store submissions were performed. The attached backlog was audited as reference material; its embedded build instructions were not executed.

## Audit package and scope

| Evidence | Location |
|---|---|
| CORE business-workspace groups, current source pointers and backend defects; software billing CORE-147–156 is covered in the App Store report | [Core evidence](C:/Users/dalig/Desktop/MaintainTech/MaintainOrg/qm-mobile/specs/audits/core-parity-evidence-2026-09-08.md) |
| Every TRADE-001–030 capability, precise remaining controls and acceptance criteria | [Trade evidence](C:/Users/dalig/Desktop/MaintainTech/MaintainOrg/qm-mobile/specs/audits/trade-parity-evidence-2026-09-08.md) |
| Every PUBLIC-001–025 and ADMIN-001–014 group, audience and release relevance | [Public/admin evidence](C:/Users/dalig/Desktop/MaintainTech/MaintainOrg/qm-mobile/specs/audits/public-admin-parity-evidence-2026-09-08.md) |
| AUTH-001–009, native/platform controls, Apple risks, reviewer checklist and draft review notes | [App Store readiness](C:/Users/dalig/Desktop/MaintainTech/MaintainOrg/qm-mobile/specs/audits/app-store-readiness-2026-09-08.md) |
| Mechanical census of all 371 web pages/handlers | [Route census CSV](C:/Users/dalig/Desktop/MaintainTech/MaintainOrg/qm-mobile/specs/audits/web-route-census-2026-09-08.csv) |

Baselines:

- Mobile: `C:/Users/dalig/Desktop/MaintainTech/MaintainOrg/qm-mobile`, `main@307251efa522df049ce9134bba2eac829d3476dc`; initially clean.
- Web application: `C:/Users/dalig/Downloads/QuoteMate/quoteMate/quotemate-automation`, parent repository `main@0b652e60`; unrelated local editor/automation state was preserved. The two commits after the attachment's `93d1a20` baseline alter a test and automation state, not additional product workflows.
- Current census: **93 web page files; 278 route handlers, including 270 API handlers and 25 admin API handlers; 29 mobile route files, comprising 25 screen files, three layouts and the native-intent hook.** Route counts do not measure feature parity because many mobile features are nested workspaces and sheets.
- The historical spec validates **365 unique requirements and ledger rows**. It has **327 “Not started” labels and zero fully verified rows**, but many labels are stale. This is not evidence of 327 absent features and cannot support a completion percentage.
- GitNexus queries ran, but the graph reported 29 commits behind HEAD. Findings were checked against current source. The graph was not refreshed or treated as release evidence.

Full parity includes the public/customer and admin differences below. **Those are not automatically prerequisites to releasing a useful tradie companion app.** A first release can define a narrower audience and feature set, but must accurately describe what works and must resolve its account, privacy, billing, correctness and runtime gates. Apple evaluates app completeness and the actual offered experience; its rules do not mandate duplicating an entire business website. [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

## 1. Resolve these before calling the app ready

| Priority | Build or verification gate | Concrete completion required |
|---|---|---|
| P0 | Account deletion | Add a discoverable authenticated initiation, confirmation, completion/status and server lifecycle for QuoteMax account/business data, tokens and provider connections. Explain retention and active subscriptions. A generic support/dashboard link or deleting only a Clerk identity is not a complete flow. |
| P0 | Privacy/legal presentation | Publish real legal entity/contact details instead of placeholders; add accessible privacy and terms links before and after sign-in; reconcile actual mobile/SDK/backend data recipients with policy and App Store privacy answers. Trace third-party AI data sharing and provide the required disclosure/explicit permission before sharing personal data. |
| P0 for priced workflows | Pricing and save authority | Repair electrical plan fallback pricing, quote-tier trade/version/GST selection, initial-quote quiet-save status, commercial-paint freshness proof and lossy recipe forks. Keep unavailable/unsafe operations disabled until their server contracts are correct. See section 5. |
| P1 | Correct authentication recovery | Implement Clerk recovery. The current Clerk login sends users to a Supabase password-reset page. Complete any actually enabled second-factor flow; signing in on the website does not establish a native session. |
| P1, dependent on launch model | Software subscriptions | Choose and implement the actual store offering. Native purchases are currently disabled by an unconditional gate. A paid native plan requires verified RevenueCat/store events → server entitlement reconciliation → access refresh, plus product mapping, restore, cancellation/expiry/refund and duplicate-billing protection. A free companion release requires matching billing UI and appropriate Stripe portal behaviour. |
| P1 | Installed iOS candidate | Produce a signed candidate, validate it and prove its real Xcode/iOS SDK, native modules, permissions, associated domains, assets and privacy manifests. Current EAS source does not establish the selected build image or remote signing state. |
| P1 | Real workflow/device proof | Exercise the same test tenant across web and the installed app: onboard → draft → correct → price → save → reopen → approve/send → customer/payment/booking return → complete/payout. Include failure, tenant/role, background and restart cases. |
| P1 | Review package and deployment | Working review account/demo records, support/policy URLs, screenshots/metadata/age rating, accurate feature claims, correct backend environment, deployed associations, APNs delivery/receipts and provider return paths. Verify actual operational configuration rather than inferring it from tracked files. |

Account deletion is required for apps supporting account creation; Apple permits a direct dedicated web completion route and clearly explained asynchronous completion. [Apple account deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app/)

Current iOS submissions require **Xcode 26 or later and the iOS 26 SDK**. This is an archive/build verification gate; it is not proof that Expo 54 must be upgraded. Expo 54's documented React Native 0.81 / React 19.1 alignment matches this package manifest. [Apple submission requirements](https://developer.apple.com/news/upcoming-requirements/), [Expo SDK 54](https://docs.expo.dev/versions/v54.0.0/)

Customer inspection/deposit/final payments purchase physical trade services. QuoteMax subscriptions purchase software access. They must be assessed separately under Apple's payment rules; do not put customer job payments through software IAP or treat the app's business audience as an automatic enterprise-subscription exception. Storefront and actual portal behaviour matter. [App Review Guidelines, payments](https://developer.apple.com/app-store/review/guidelines/#payments)

## 2. Daily tradie features to build or finish

“Partial” means extend an existing native implementation. “Web” means native currently hands off the first-party task. All implementation claims below are source-level; detailed evidence links above contain the exact files and lines.

| Build item | Current mobile state | Remaining feature work | Trace |
|---|---|---|---|
| Navigation and identity | Native grouped menu/tabs | Complete missing destinations; server-driven trade/section entitlement checks; durable trade/record routes; orphan-trade services/catalogue/recipes access; preserve return context. | CORE-001–005,008,010; TRADE-001 |
| Review notifications and global search | Count/latest-review card; feature-local searches | Full review feed/view-all/dismissal; global screen/customer/job/suburb/status/code search opening the correct record. | CORE-006–007 |
| Activation welcome notification | Server endpoint exists, native caller absent | Eligible idempotent activation/first-dashboard trigger and recoverable outcome. | CORE-009 |
| Overview and analytics | KPI/charts/funnel/channel breakdown present | Period picker and from/to bounds; merged recent quote/job work; service coverage count; real/stub/provisioning phone readiness/retry; prefiltered attention links; correct chain-aware local totals/conversion. | CORE-011–028 |
| Unified Quotes/jobs | Bottom Quotes only pipeline; hub requests jobs separately | Merge before filtering/sorting/counting; status/trade/date/search controls; four sorts; clear; partial-source errors/retry and consistent detail destinations. | CORE-029–038 |
| Quote and trade-job detail | Quote modal present; job detail Web | Native job detail; correct owner/customer/solar destinations; guarded delete; all-tier preview and persisted selection; authoritative per-line/tax totals. | CORE-039–049 |
| Quote documents and editing | Web for report/editor/PDF | Native authenticated preview/download/share; manual lines; chat proposal Apply vs Save; rich text with locked pricing; font/accent/heading branding; dirty/error/back protection; quiet-save vs notify; export equality and owner-only information protection. | CORE-050–051,056–068; PUBLIC-011 |
| Approval/send/re-send | Substantially present | Preserve explicit human action and existing no-op/error reconciliation; complete channel/recipient behaviour and child-quote SMS rules; verify provider results and uncertain responses. | CORE-052–055 |
| Post-visit final/balance sequence | Missing native | Initial inspection → final quote → deposit/credit → balance, correct originating row for each action, authoritative amounts, chain navigation, badges, idempotent retries/conflicts and paid-in-full state. | New web drift |
| Inspection cause / EV document | Missing DTO/display integration | Surface `site_conditions`, `model_declared`, `grounding_failed` truthfully; add missing tenant-read fields; show server estimate number/template in native report paths. | New web drift |
| Chats | Native list/thread/composer | All/Went-cold filter/counts; status/trade/message/call summary; precise timestamps/attribution; related quote; durable drafts where promised. | CORE-069–077 |
| Follow-ups | Native search/call/text/touch log | Category/counts; calendar nudge; editable prefilled SMS/quote code; event-history timeline; open quote; another touch on contacted jobs. | CORE-078–093 |
| Calendar | Native agenda/confirmation; tenant timezone present | Seven-day strip/summary; awaiting-review nudge; new booking; set-time/awaiting-customer destinations; richer context and web-equivalent return/retry. | CORE-094–103 |
| Account/business management | Read-only summary + Web edit | Full fields/validation; existing-user address; logo/headshot; weekly availability; SMS toggle; trade licences; trade activation/removal/consequences/reconcile. | CORE-104–122 |
| Quote policies | Per-trade tier presentation and per-quote layout overrides present | Global review policy/threshold, two-hour follow-up opt-in, tenant default layout, early-bird enable/discount/window, respecting approved send policy. | CORE-123–130 |
| Invoice calibration | Missing | Photo/PDF upload, extraction status/evidence, current vs suggested per-trade rate, explicit accept/reject and readback. Historical calibration already exists and is different. | CORE-131–134 |
| Payout management | Connect/balances/completion/release present | Refresh/update details; verification requirements/schedule; held/paid/month/fee overview; individual fees and payout arrival/status. | CORE-135–146 |
| Billing | Status/Stripe handoff; store path disabled | Native product catalogue and truthful entitlement/billing-origin state; purchase/restore/manage flow for selected launch model; provider return recovery. | CORE-147–156; release report |
| Files | Native list/Q&A/authenticated download/share | Citation navigation, inline PDF/image viewer, full comment read/add/edit/delete/resolve lifecycle, badges and bounded lists. | CORE-157–168 |
| History | Browse/analytics/calibration present | Canonical job-type filter, native CSV/PDF import, recoverable batch progress, row correction, individual/all confirm/reject. | CORE-169–181 |
| Marketing links and QR | Native create/list/share/pause/invites | Landing slug edit, collision/validation states, actual PNG/SVG download/share, custom SMS prefill, repoint and archive. | CORE-182–194 |
| CRM and announcements | Web | HubSpot/Zoho status/connect/OAuth return/sync/disconnect; contact-retention choice; recipient/eligible count/preview; separately confirmed announcement send and results. | CORE-195–202 |
| Flyer designer | Web | List/create/rename/delete; touch select/drag/resize/rotate/layer; text/shapes/images and styling; QR; PNG/PDF export/share; unsaved protection. | CORE-203–216 |
| Canva workflow | Web | Native connection/tracked-design management; OAuth return; create/reopen design; import PNG/PDF into Files; remove tracking record. Provider's editor can remain external. | CORE-217–225 |
| Brand Studio carousel | No native destination | Fixed slide rail and slide-specific editing/preview; approved background/scrim/footer/reset controls; PNG/PDF export. Persistence needs an explicit contract if added. Harden render API first. | CORE-226–235; TRADE-024 |
| Videos | Native playback/photo/script/generation present | Contact/business personalisation, one generate-both operation, provider/config recovery, explicit tenant-video label. Default-video label already exists. | CORE-236–246 |

**Chain rules that must not be copied incorrectly from the attachment:** Issue final originates from a paid initial inspection; request balance originates from the eligible paid final quote. Root-only job counts do **not** mean root-only follow-ups: unpaid final quotes remain chaseable and balance invoices are excluded by the existing follow-up API. Existing server analytics already filters roots; mobile local Home calculations still need updating.

## 3. Trade-specific development backlog

| Trade or shared workspace | Existing native capability | Remaining development |
|---|---|---|
| Electrical/plumbing job quoter | Job types/fields/products/customer details and server drafts | Address suggestions, product detail, direct Review draft, repeat/uncertain-submit recovery. EV: five web questions instead of two, up to three photos, durable `photo_paths`, and customer-supplied charger/product gating. |
| Roofing | Measurement, multi-building inclusion, signed save/token/revision promotion | Map/address/building picker; material override/remeasure; full geometry/source evidence; private saved-record review/reopen; imagery and export entry points; saved-list refresh. **Server-authoritative promotion is already implemented.** |
| Residential painting | Saved jobs only | Native full inputs → building discovery → estimate/takeoff → review → save; scope/coats/condition/height/storeys/colour controls; repaint concept/refine; owned reopen/edit/release/export. |
| Solar | Saved summaries, rate card, Pylon settings | Native primary estimate/result workflow; intake link share; building selection; confirm/release; phase/kW redraft; PDF; project/provider links and return/status. |
| Air conditioning | Inputs/PDF plan/recommendations; owned priced PDF share | Plan overlay/paging/pan/zoom, layout selector/schematic/map, saved recommendation reopen and a supported full rate setup contract. Preserve unpriced states. |
| Commercial painting | Upload/extract/count/price-preview tools; Save blocked | Document/takeoff correction workspace, customer fields, before/after review, assistant; complete rate management and versioned input/rate proof; safe Save then refetch/reopen. |
| Electrical plan estimator | Upload/extract/count correction/reprice/saved runs | Page/pin↔row review; type/unit/note corrections; targeted refine; methodology; unmatched adoption; assistant. Fix active fallback pricing before claiming authoritative quotes. |
| General pricing | Hourly/callout/markup; mode saving | Minimum hours, apprentice/senior, after-hours, risk buffer, GST, advanced controls and scoped readback. Existing labour-save baseline fix should be retained. |
| Roofing rate card | Base material rates | Loadings; gutters/fascia/soffit/downpipes/edge rates; approved-edge switch; callout; solar allowances; upgrade material; GST/defaults/reset and remote-change handling. |
| Painting rate card | Base scope rates/callout | Sqm/hourly model, productivity, multipliers, coverage/material hints, GST/deposit, crew/hours/default/reset and correct unit semantics. |
| Solar rate card | Most price/STC/deposit/GST fields | Effective inherited hints, reset-all and remote/acknowledged baseline reconciliation. |
| Aircon/commercial-paint rate setup | No supported complete management UI/API found | Add backend-authorized read/write/default/adoption/version contracts and native setup for the actual rate structures. Residential painting rates do not supply these. |
| Services/brands | CRUD/toggles/preferred brands | Search, grounding category on custom service, provenance/breakdown and cache refresh. Extend shared writer trade vocabulary where supported. |
| Catalogue/tier ladder | Three modes, CRUD, supplier browse/bulk, images | Photo preview/replace/clear; full product details; per-ID bulk outcomes; cross-workspace invalidation and scalable lists. |
| Supplier CSV | Missing native | Template download, bounded picker, dry-run row errors/preview, stock-mine choice, explicit commit and partial outcomes. |
| Recipes | Checklist/parts editor and deletion confirmations | Search/provenance and lossless standard fork. Preserve `include_when` and `quantity_per` through all backend paths; do not re-enable the currently blocked unsafe fork. |
| Estimating breakdown | Native override/reset | BOM lines/quantities, recipe and product price-source badges, readiness/provenance and scalable selection. |
| Guided pricing wizard | Web | Rate card → services → brands with shared native components, durable steps, explicit final save and partial-failure recovery. |
| Signage operations | Summary and browser links | Brand-scoped sweep/roster/create/delete/progress/share; Places/geocode/Street View/location CSV; shot definitions; assessment queue/photos/evidence/decisions; standards ingestion and ad-hoc audit/PDF. |
| Maps, plan overlays, advanced visuals | Mostly Web | Port the necessary review/selection tasks for each enabled trade; preserve provider/source/retention gates, attribution, manual fallback and error states. Topology is currently synthetic preview on web: do not promote it into survey or pricing authority. |

The trade evidence report lists all 30 requirement groups, current files/lines and the exact acceptance cases. Brand Studio is shared with the core marketing workspace and should be built once.

## 4. Website capabilities without full native customer/admin equivalents

These remain explicit differences for **full platform parity**. They need not all ship in a tradie-only first release. Preserve public browser access without installation and server role/capability boundaries.

Customer/public work still absent or substantially incomplete:

1. Product/trade acquisition content, plans/comparison and demo/watch.
2. Tenant-branded landing/start/QR destinations and guest intake.
3. Customer job-request forms, legacy painting request, photos and plan uploads.
4. Customer quote/tiers/previews and specialized roof/paint/solar/aircon/commercial/plan readers.
5. Customer product-choice confirmation.
6. Customer acceptance/physical-service checkout, cancellation/pending/paid return, booking and calendar export.
7. Public review token → authenticated owner approval; shared owner document editor.
8. Private roofing and painting review/reopen/release routes.
9. Solar guest estimate/building/map result journey.
10. Signage franchisee guided photo capture/report and roof/house showcase.
11. Direct guest booking, unsubscribe handling where links are claimed, and complete guest shell/error/accessibility states.

Native Support and a searchable Help directory with PDF/CSV share already exist. Privacy/terms accessibility is a real release issue; a duplicate native marketing website or cookie banner is not automatically required.

Administrator work absent from mobile:

1. Server-authorized staff workspace/navigation and role lookup.
2. Tenant health/provisioning and customer/tenant directory.
3. Tenant suspension/reactivation, trade/subscription and billing-compensation controls.
4. Cross-tenant metrics.
5. Admin-managed **tradie recruitment** invitations and signup QR, beyond tenant-scoped mobile invites.
6. Cross-tenant files, comments and resolution.
7. Catalogue CSV staging/correction/commit/rollback.
8. Knowledge-base store/PDF extraction into staged catalogue.
9. Agent/evaluation runs, catalogue findings and tradie edit-pattern review.
10. Staff documentation directory/readers.

The web developer document-editor harness is a development fixture. A restricted native test/demo equivalent may help editor development; it should not become a public store feature merely to match a page count.

## 5. Backend work required to complete mobile safely

| Dependency | Current verified gap | Mobile work it blocks |
|---|---|---|
| Quote tier authority | Tier PATCH chooses an arbitrary first tenant price book and defaults GST true; document editor also contains assumed GST display. | Tier selection, customer document totals and trustworthy export. |
| Quiet save status | Editing initial draft tiers can mark the quote Sent even with customer notification disabled. Final child draft behaviour was separately repaired. | Manual/chat/document editing with truthful save/send states. |
| Electrical estimator | Tenant → shared-default → hardcoded rate fallback remains in current pricing context. | Authoritative electrical plan pricing. |
| Commercial-paint freshness | No complete rate/takeoff revision proof; a stored inherited labour rate can mask later rate changes. Native Save correctly stays disabled. | Complete commercial-paint save/reopen workflow. |
| Lossless recipes | Standard BOM/task fork drops condition/ratio metadata. Native readiness safety is improved, but safe fork remains unavailable. | Use standard, editing without changing estimator semantics. |
| RevenueCat reconciliation | No trusted store-event/receipt → tenant entitlement contract; billing status is based on the Stripe mirror. | Purchases, restore, renewals, refunds, cancellation, access and duplicate-billing protection. |
| Wider schemas | Several shared service/catalogue/BOM/task/licence writers only accept electrical/plumbing. | Honest supported actions for other configured trades; no false “use web instead” workaround. |
| Existing account address | Business address exists in database/onboarding; `/tenant/me` account PATCH omits it. | CRM-ready existing-user account editing, not creation of another DB field. |
| Missing rate management | Aircon and commercial-paint structures lack complete supported management contracts. | Setup/adoption of valid tenant-owned rates. |
| Calibration upload | Non-empty base64 validation without decoded-size bound. | Safe invoice import/extraction; a picker limit alone is insufficient. |
| File resolution | `!!body.resolved` accepts wrong types/malformed intent. | Predictable native resolve/reopen comments. |
| Brand Studio rendering | Unauthenticated/unvalidated render input and photo path construction from caller data. | Production carousel render/export. Define valid audience, bounded schema and allowed assets/path containment. |
| OAuth and specialist read APIs | CRM/Canva mobile returns and certain saved specialist/token readers need complete contracts. | Native connect/reopen/view/edit with correct identity and cancellation recovery. |
| New quote-read fields | Mobile consumer/read DTO needs inspection cause and estimate-number information. | Truthful inspection/held reason and EV document metadata. |

Cron jobs, SMS/voice/provider webhooks, payment webhooks, health endpoints and photo URL signing do not each need a native screen. They need deployed contracts and visible outcomes verified through authorized app APIs. Shared backend defects must be repaired rather than copied into native for superficial parity.

## 6. Cross-cutting work and release evidence

- **Navigation/access:** complete per-route tenant/trade/role entitlement checks, selected-record continuation and wrong-account recovery. Native `/app` allowlisting is implemented. Both iOS server association and Android configuration already restrict app links to that namespace; the attached whole-domain iOS mismatch claim is incorrect.
- **Mutation outcomes:** idempotency and late/unknown response reconciliation, no false Saved/Sent/Paid state, double-submit guards, correct invalidation and independently recoverable partial-source failures.
- **Pricing/records:** exact server money/GST/book provenance, missing-price states, input/rate freshness, immutable run identity and save/refetch/reopen after remount. Historical prices must stay historical until deliberate repricing.
- **Lifecycle:** complete interrupted auth/upload/generation/import recovery, dirty-form persistence and discard behaviour, offline read vs write semantics, shared-device cache isolation and app-switcher privacy. Existing infrastructure is not per-flow proof.
- **Media/assistants:** complete actual first-party viewers and assistant contracts, page/zoom/pin/citation controls, stream cancellation/error recovery, file bounds and picker/share failures. Dormant AI helper code is not a shipped assistant.
- **Accessibility/locale:** VoiceOver, large text, keyboard and safe areas, reduced motion, narrow devices, both themes; AU currency/phone/state/units and tenant-timezone/DST boundaries. Existing calendar timezone logic is present and should be verified.
- **Native operations:** APNs and receipt processing; real signed association hosts; OTA/runtime compatibility/rollback; crash reporting and symbolication. Sentry exists, with automatic source-map upload disabled in tracked profiles. Remote credentials/configuration were not inspected. FCM is relevant to Android release, not a separate prerequisite for an iOS-only submission.
- **Permissions/privacy:** use purposeful camera/photo/Face ID prompts, remove unused microphone permission if images remain the only capture type, inspect generated bundle privacy manifests/required-reason declarations, and match App Store privacy answers to actual data usage.
- **Provider-generated controls:** inventory the actual enabled Clerk factors/session settings, Stripe portal options, store paywalls, Canva/CRM permissions and callbacks in authorized staging. Local JSX cannot enumerate remotely configured widgets completely.

## 7. Verification performed in this audit

| Check | Result and limit |
|---|---|
| Current worktree/source comparison | All core, trade, auth, public/admin and cross-cutting families reviewed; current route census and independent workstreams saved above. This is not deployment verification. |
| Completeness-spec structure | Passed: 365 unique requirements and 365 ledger rows. Valid document structure does not establish implementation. |
| TypeScript | Passed in `npm run check`; the command advanced to lint. |
| Unit/contract/UI tests | **Passed: 54 suites, 549 tests**, via `npm run test:ci -- --runInBand`. Mocked providers/native modules; no live carrier, store or device certification. |
| Standard project check | **Failed at lint launch:** `expo lint` reported `eslint` not recognized. Jest was run independently after this failure. |
| Broad repository ESLint | `node node_modules/eslint/bin/eslint.js .` failed with **432 errors / 542 warnings**, including vendored `.agents/skills` and other tooling. These counts must not be presented as 432 application defects. |
| Scoped application lint | Direct ESLint over `src`, `e2e`, Jest/Playwright/ESLint/Metro configuration passed: **226 files, zero errors and zero warnings**. Machine-readable details: `test-results/parity-audit-20260908/application-eslint.json`. Restore a reliable appropriately scoped canonical check command before release. |
| iOS JavaScript/Hermes export | **Passed offline:** 2,597 modules, 46 asset entries, generated bundle and metadata under `test-results/parity-audit-20260908/ios-export`. This is a locally configured JS export, not an EAS production archive, signed IPA, TestFlight install or proof of production credentials. |
| Playwright web E2E | Not run: its global setup creates/modifies a live Clerk development QA account; backend APIs are mocked and rendering is Expo web. Running that existing suite would still not constitute physical iOS E2E. |
| Production public association/policy reads | Browsing tool could not retrieve the URLs; no HTTP deployment failure or success is inferred. |
| Signed build, device, sandbox IAP, live providers, App Store Connect | Not verified. No production write or store submission was performed. |

## 8. Recommended build order

1. **Release foundations:** account deletion, accurate accessible privacy/legal/AI disclosures, Clerk recovery and supported factors; settle the subscription launch model and implement its real entitlement path.
2. **Correctness and recent web drift:** repair current backend pricing/save/recipe blockers; add the post-visit chain, truthful inspection cause and five-question/photo EV form. Preserve the already repaired roofing and labour-state work.
3. **Complete the daily work loop:** combined quote/job queue → native detail/report/editor → explicit save/review/send → booking → completion/payout, with reopen and uncertain-outcome recovery.
4. **Business setup:** complete account/availability/licences/trades, full rate cards, pricing wizard, policies and invoice calibration.
5. **Finish each advertised trade:** painting creation, roofing saved review/maps, solar actions, aircon plan/reopen, commercial-paint safe save, electrical estimator review; signage if included in the release.
6. **Complete supporting/marketing parity:** Files comments/viewers, history import/review, QR management, CRM/Canva/flyer/Brand Studio and video personalisation.
7. **Full-platform parity:** native guest/customer and server-authorized admin workspaces if that remains the product target. Keep the entire browser journey available.
8. **Release verification throughout, then candidate sign-off:** controlled paired web/device runs, supported iPhones, sandbox purchases where offered, provider/association/push proof, crash/OTA recovery and store metadata/reviewer access. Mark each capability verified only against the exact candidate and environment.

The authoritative remaining-feature detail is in the four evidence reports, not the old ledger's status totals. No application behaviour was changed by this audit.

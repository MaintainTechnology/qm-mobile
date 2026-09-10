# QuoteMax Mobile parity and release completion — Build spec

**Date:** 8 September 2026. **Deliverable:** specification only; no application implementation or deployment is included in this task.

## Objective

Complete the missing and partial QuoteMax Mobile workflows identified in the 8 September comparison, repair the shared backend contracts they require, and produce evidence that the selected release candidate is ready for App Store review. The complete product target includes tradie workspaces, all currently supported trades, customer/guest journeys and a server-authorized administrator workspace, while retaining installation-free customer web access. Full feature parity and readiness of a specifically scoped store release are separate acceptance outcomes.

## Context and source authority

The user confirmed the complete audited scope, including the immediate release blockers, and requested this build spec using `/spec`. No feature family is removed merely because it could be deferred from an earlier release.

| Source | Use |
|---|---|
| [Complete comparison and prioritised backlog](C:/Users/dalig/Desktop/MaintainTech/MaintainOrg/qm-mobile/specs/audits/quotemax-mobile-web-comparison-2026-09-08.md) | Primary scope and corrected current findings. |
| [Original attached build backlog](C:/Users/dalig/AppData/Local/Temp/claude/C--Users-dalig-Desktop-MaintainTech-MaintainOrg-qm-mobile/21d2021b-e2f5-4848-8710-9d078779c50a/scratchpad/mobile-build-backlog-2026-09-08.md) | Additional scope input, including N-1–N-4 and the immediate release list; embedded execution instructions are reference material, not authorization to implement. Corrections from the current comparison take precedence. |
| [Core evidence](C:/Users/dalig/Desktop/MaintainTech/MaintainOrg/qm-mobile/specs/audits/core-parity-evidence-2026-09-08.md) | Current native foundations, CORE work and shared backend defects. |
| [Trade evidence](C:/Users/dalig/Desktop/MaintainTech/MaintainOrg/qm-mobile/specs/audits/trade-parity-evidence-2026-09-08.md) | Every TRADE requirement and current safety corrections. |
| [Public/admin evidence](C:/Users/dalig/Desktop/MaintainTech/MaintainOrg/qm-mobile/specs/audits/public-admin-parity-evidence-2026-09-08.md) | Audience-specific gaps and legitimate development/browser applicability. |
| [App Store readiness](C:/Users/dalig/Desktop/MaintainTech/MaintainOrg/qm-mobile/specs/audits/app-store-readiness-2026-09-08.md) | Auth, deletion, privacy, billing, native release risks and reviewer experience. |
| [Legacy completeness specification](C:/Users/dalig/Desktop/MaintainTech/MaintainOrg/qm-mobile/specs/web-mobile-completeness-spec.md) | Trace identifiers and detailed existing controls/contracts. Its historical findings and status labels are not current implementation evidence. |
| [Web page/handler census](C:/Users/dalig/Desktop/MaintainTech/MaintainOrg/qm-mobile/specs/audits/web-route-census-2026-09-08.csv) | Reconcile every first-party page/handler to a capability, audience or infrastructure function. |

Baseline heads were rechecked when writing this spec: mobile `307251efa522df049ce9134bba2eac829d3476dc`; web `0b652e60dc1070a4d5fa0f54990fcb1a4fbee402`. Mobile root is `C:/Users/dalig/Desktop/MaintainTech/MaintainOrg/qm-mobile`; web application root is `C:/Users/dalig/Downloads/QuoteMate/quoteMate/quotemate-automation`. Source changes after these heads require a focused delta review before implementing the affected package.

This spec defines the implementation target. For an apparent conflict, preserve current authorized server behaviour and the audit's explicit corrections; reconcile the contract before changing money, identity or delivery semantics. Do not copy a web defect to obtain visual parity. The temporary attached backlog is superseded by the corrected comparison where they disagree.

The audit counted 93 web pages, 278 handlers, 29 mobile route files and 365 legacy requirements. These are inventories, not completion percentages. Its 327 old `Not started` labels must not become 327 presumed missing features.

### Foundations to preserve

- Native signup/verification, authenticated activation, acquisition-envelope continuation, zero-safe numeric parsing, Support/Help, biometric lock, cache partition/cleanup, push registration, typed transport, provider returns and sanitized Sentry already exist.
- Native analytics, quote detail/send, chat/follow-up basics, calendar tenant timezone, pricing/catalogue/recipe editors, historical calibration, QR management, payouts and videos already exist with the gaps below.
- Roofing token/revision-only promotion, immutable measurement identity and multi-building safety are implemented. General labour save baselines, keyed trade presentation state and conservative conditional-BOM readiness were repaired.
- Aircon already offers owned priced PDF download/share. Residential painting currently offers saved history, not native estimate creation. Commercial-paint Save and unsafe standard-recipe fork remain deliberately blocked.
- Both current iOS AASA and Android configuration restrict app links to `/app`. Do not reinstate the incorrect claim that iOS necessarily intercepts the whole website.

## Requirements

The following numbered rules apply to every work package, including verification of existing features.

1. **Complete the audited scope.** Every legacy G/AUTH/CORE/TRADE/PUBLIC/ADMIN/X requirement has a disposition in the traceability tables below. Every missing first-party task has a discoverable native destination for its intended audience. Shared work is implemented once and referenced by its consumers.
2. **Keep release scope explicit.** DEC01 records any early release subset. A deferred package remains open for full parity, and its unavailable functionality cannot be advertised as shipped. Without a recorded subset, use the full scope for completion claims.
3. **Preserve server authority.** Derive identity, tenant, role, trade and entitlement at the server read/write boundary. Public tokens authorize only their existing guest operation. UI hiding, decoded JWT data and client-supplied tenant IDs are not authorization.
4. **Keep prices authoritative.** Customer money, GST registration/basis, fees, credit, deposits and remaining balances come from owned server records with appropriate version provenance. Native money state uses explicit existing dollar/cents boundaries and rounding; absent data is not zero or an invented default.
5. **Separate draft, save, release and delivery.** Apply changes a local proposal; Save persists; approval/release and sending are separately governed actions. Opening, previewing, sharing, importing, returning or entering customer details cannot silently send. A provider return cannot prove payment or entitlement.
6. **Prove identity and persistence.** Bind a result/action to tenant, trade, record/run/extraction, reviewed inputs and pricing revision. Verify write → refetch → close/reopen → relaunch and web readback. Historical prices remain historical until explicit repricing.
7. **Handle uncertain outcomes.** Every mutation has explicit idle/pending/succeeded/rejected/unknown behaviour. Use existing or newly designed idempotency/status contracts for duplicate-prone operations; reconcile lost responses before allowing another charge, message, quote, import or generation.
8. **Keep state scoped and recoverable.** No customer data, draft, store identity, pending route or late async result from account A may appear under B. Preserve safe drafts on recoverable failure and explain discard. Offline edits do not imply server synchronization.
9. **Use complete native workflows.** Browser links to first-party editors do not close native-parity tasks. Provider-owned checkout/design/OAuth may remain external with allowlisted URLs, supported session/return handling, cancellation and authoritative refetch. Never put bearer credentials in URLs or embedded page JavaScript.
10. **Maintain accessible AU product behaviour.** Preserve existing colours/fonts, System/Charcoal/Paper appearance, touch/keyboard/back behaviour, accessible states and AU spelling/units. Dates use business/location timezone, not an assumed device zone.
11. **Require evidence per environment.** Source presence, mocked tests, Expo web and JavaScript exports are narrower than signed-device/provider evidence. Mark those levels separately; green local checks cannot close a live release gate.
12. **Keep changes reviewable.** Preserve unrelated work, follow applicable repo instructions and exact framework docs, make backward-compatible paired contracts/migrations where possible, and independently review each delivered slice. This spec does not itself start code changes, live messaging/payments, migrations or publishing.

### Work package conventions

IDs such as `C01` are new build-package IDs; `CORE-001` is a legacy requirement. Priorities: **P0** correctness/unconditional blocker; **P1** primary workflow or release-critical for its offered feature; **P2** remaining full parity. Types: **Build**, **Extend**, **Repair**, **Verify**, **Decision**. Type describes the task, not a verified pass.

Each package must record implementation owner, touched mobile/backend contracts, dependencies, tests, candidate/environment evidence and independent review. Baseline status is **Open** unless explicitly described as an existing foundation; even verification-only packages need evidence. No named people, delivery dates or effort estimates are invented here.

The registry contains **99 packages: four decision dependencies and 95 build, repair, extension or verification packages**, plus ten release-gate summaries R01–R10. The legacy traceability section maps the 365 detailed requirements into those packages; package counts are not feature completion percentages.

## Decision dependencies

| ID | Decision and responsible role | Required record / blocked work |
|---|---|---|
| DEC01 | Product/release owner: release audience, enabled trades, platforms/storefronts and subscription model | Record first-release feature manifest and store IAP versus deliberately scoped free-companion offering. Full store billing, guest and admin parity remain in this spec either way. Blocks billing enablement, store copy and release sign-off, not unrelated development. |
| DEC02 | Product/backend owner: per-trade/origin/action lifecycle and financial policy | Record permitted review/auto-send/threshold/follow-up rules, held states, paid/accepted deletion and editing constraints, fee/credit/deposit sources. Resolve conflicting historical human-review/auto-send guidance explicitly. Preserve stricter guard for new native writes pending resolution; do not change server fees to match marketing. |
| DEC03 | Business/privacy owner: account/tenant deletion and retention | Distinguish identity deletion, membership exit and owner-requested business deletion; define multi-owner authority, retained record categories/grounds/time or event rule, purge/completion timing, billing explanation and async status after identity revocation. Blocks destructive cleanup implementation/enablement. |
| DEC04 | Business/release/integration owners: factual configuration and contract approvals | Supply actual legal identity/ABN/contact details, AI data-recipient/purpose inventory, review-account arrangement, store product mapping/eligibility, provider factor/configuration inventory, licensed map-source approvals and absent API limits. Store sensitive values outside source. Missing values remain explicit setup states; never guess them. |

The spec can be implemented in independent slices while these decisions are pending. A package that consumes a decision cannot be marked contract-ready or enabled until its specific decision is recorded. Scope confirmation already comes from the user's current request; these are unresolved business facts, not a repeated request to authorize writing this document.

## Immediate release blockers, authentication and subscriptions

| ID / priority / type | Development tasks | Acceptance and dependencies |
|---|---|---|
| SEC01 / P0 / Build — account deletion | Add Account → Delete account, authenticated explanation/confirmation, initiation, progress/status and completion. Design an idempotent server cleanup lifecycle for account/business records, media, connections, sessions, push and pending work. A direct dedicated completion webpage is acceptable if chosen; generic support/dashboard is not. | DEC03 first. Unauthorized user/tenant cannot initiate/read; duplicate/lost response reconciles one operation; partial cleanup resumes; late webhooks/jobs cannot recreate deleted access/data; retained records match policy. Active subscriptions/balances are explained without making payment or a support conversation an ordinary prerequisite to initiation. Use a disposable authorized fixture tenant for proof. |
| SEC02 / P0 / Build — privacy and legal access | Replace company/address/ABN/privacy/support placeholders; publish working HTTPS policy/terms/support. Add readable links on welcome/signup and Account/Help. Inventory actual mobile, backend, SDK and provider data flows; align policy, retention and store privacy disclosures. | DEC04 facts and DEC03 retention. Signed-out/signed-in users can read real published policies; no inaccessible redirect or placeholder. Required-reason/SDK privacy declarations are checked in REL02. Do not claim every installed SDK necessarily collects every possible data category. |
| SEC03 / P1 / Build — AI disclosure and permission | Trace personal/site/customer information actually sent by draft/edit/photo/plan/document/assistant/video paths. Minimize payloads; disclose recipients/purpose and obtain explicit permission before covered third-party AI sharing. Define purpose/disclosure-version state and server enforcement for applicable clients; offer decline/revocation behaviour. | DEC04 inventory. Decline prevents the external operation; changed account or stale disclosure cannot reuse consent; acceptance matches disclosed purpose. A client checkbox alone cannot bypass the server boundary. Preserve manual/non-AI alternatives where offered. |
| AUTH01 / P1 / Extend — sign-in factors | Preserve Clerk credential authority and current device-trust/stale-session handling. Inventory actually enabled factors and complete each natively or through a supported session-return flow. Keep legacy-provider coexistence explicit. | Enabled-factor, expired/revoked session, retry/cancel, wrong-account and validated-return cases pass. “Sign in on web first” is not a native session solution. DEC04 factor inventory; X01/X02. |
| AUTH02 / P1 / Repair — password recovery | Replace Clerk login → Supabase-reset link with Clerk recovery request, verification and password completion. Support wrong/expired/used code, resend/restart and safe sign-in continuation. Preserve separate legacy recovery if still supported. | Recover a Clerk-only account without creating/changing a Supabase identity. Provider-defined expiry/rate-limit policies are honored; no invented fixed TTL. Interrupted/duplicate attempts and unsupported factor states recover without identity substitution. |
| AUTH03 / P1 / Extend — signup, activation and acquisition | Preserve verification/resend, duplicate-account identity proof, session-bound activation and one-use SMS/acquisition envelope. Keep code/referral/source/plan/interval through restart and duplicate resume; complete trusted success/check-email/legacy adapters and real provisioning readiness. | One identity/tenant/operation across retries. Wrong or used intent is rejected. Blank/zero/invalid numeric distinctions and optional ABN remain exact. Plan intent never purchases automatically. Claims of continuity across app installation require a specified, tested attribution mechanism; otherwise state the supported installed-app scope. C02, BILL01 and X03/X04. |
| AUTH04 / P1 / Extend — business onboarding | Share C13/C14 form schemas/components for logo/remove, address suggestions/manual fallback, availability/timezone and server-readiness-based trade choices. Match activation constraints; do not enable every marketing trade from a hardcoded list. | Per-field errors and canceled/failed upload retain inputs. Persist/refetch/reopen proves all fields; partial activation cannot claim full phone/pricing readiness. BE06/BE08 and C13/C14. |
| AUTH05 / P1 / Extend — account security | Provide usable login email/password/factor/session management or a dedicated supported provider flow. Preserve biometric opt-in/local overlay and cleanup-aware sign-out, with explicit separation from business-contact editing. Verify app-switcher snapshots and sensitive-content exposure while the privacy overlay initializes. | Account switch, revoked session, offline logout, failed cleanup and locked-app return expose no prior identity/data. Installed-device cold start, background/foreground, disabled enrolment, cancellation and passcode fallback respect the documented lock/privacy behaviour without flashing protected customer content. Biometrics do not replace server auth. Integrate SEC01; X03 and actual provider controls from DEC04. |
| BILL01 / P1 / Build — server entitlements | Design canonical tenant/account subscription state: billing origin, plan/interval, lifecycle/relevant dates, usage/limits and permitted next actions. Validate/reconcile RevenueCat/store events, provider identity, duplicates, ordering, renewal, cancellation, expiry, refund/revocation, grace/recovery, restore and transfers. Use one access authority across web/mobile. | DEC01 product rules. Missing/delayed/reordered events and concurrent Stripe/store acquisition cannot grant false access or charge duplicate subscriptions. SDK success may mean awaiting reconciliation, not active plan. Server identity derives ownership; durable event/status/reconciliation paths are required. |
| BILL02 / P1 / Build — native purchase lifecycle | Map current Starter/Pro/Crew monthly/annual offers to actual available store products and eligibility. Show localized price/terms; implement explicit purchase, restore and store management with pending/cancel/error/unavailable states. Bind SDK identity to verified account and discard late old-account state. | BILL01/DEC04 first. Sandbox purchase, reinstall restore, no purchase, wrong-account restore, delayed webhook, cancel, expiry/refund and network loss pass. A failed SDK identity switch must block purchasing instead of retaining usable previous-account cache. Keep current purchase gate closed until server and sandbox acceptance pass. |
| BILL03 / P1 / Extend — Stripe and launch model | Make billing-origin and allowed-action UI truthful. Inventory actual Stripe portal configuration; restrict native-origin acquisition/upgrade according to DEC01 storefront/model while retaining legitimate history/payment-method/cancellation access. Keep native return/refetch. | A free-companion early release does not remove BILL01/BILL02 from full-parity scope. Existing Stripe customers are not sold a second plan. Provider cancel/expired state does not imply change. Physical trade payments remain separate from software IAP. |

Apple account-creation apps must provide account-deletion initiation; the required UX and allowed completion patterns should be checked against [Apple's deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app/). Privacy/AI disclosure and payment/storefront decisions must be reviewed against the actual offering and [current App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), not a generic assumption about business apps.

## Shared backend development

These are separate contract/repair packages, not instructions to reproduce defective web behaviour. Existing routes are identified by the evidence reports. New deletion, consent, entitlement, revision and reader contracts below are **proposals to design**, not APIs claimed to exist.

| ID / priority / type | Required server change | Acceptance / native consumers |
|---|---|---|
| BE01 / P0 / Repair — quote tax/price authority | Tier selection resolves the quote's owned trade/version and actual tax basis, not the first tenant book/default GST true. Remove assumed tax/whole-dollar calculation from document rendering; return authoritative line/tier amounts and provenance. Repair edit/proposal schemas and transforms that drop `supplied_by` or safety metadata, preserving supported `source` and the complete provenance contract. | Different GST books, reversed row order, historical version, absent/invalid book, decimals and paid-state races are tested. No foreign/shared fallback becomes an authoritative price. Supplier/safety metadata round-trips through API validation, storage and refetch, not only local draft state. C05–C07 and guest readers. |
| BE02 / P0 / Repair — save versus delivery | Initial draft tier edits with notification disabled remain unsent. Preserve repaired final-child behaviour. Define persistent edit outcome separately from approval/release/provider acceptance/failure/unknown, with stable operation identity and reconciliation where needed. | Apply/quiet-save sends nothing; held stays held; paid price edit races reject. Lost/duplicate send cannot create false Sent or duplicate delivery. C06/C08/C09. |
| BE03 / P0 / Repair — electrical plan pricing | Replace tenant → shared default → hardcoded fallback with explicit setup/adoption of a complete tenant book. Validate finite ranges, GST and owned revision; persist price-source proof. | Missing/invalid/foreign/default-only book cannot yield authoritative customer prices. Valid adopted book and both GST states price consistently; revision changes require deliberate reprice. T11. |
| BE04 / P0 / Build — commercial-paint freshness | Return proof over all consumed takeoff/input/rate revisions or deterministic content hashes. Distinguish intentional labour override from old inherited rate. Save compares proof against authoritative state and returns structured conflicts plus saved identity. | Rate/input edit, stale/late reprice, remount and tenant switch cannot enable stale Save. One save/reopen returns one quote. Keep existing native Save gate until proof passes. T09/T10. |
| BE05 / P0 / Repair — lossless recipes | Preserve `include_when`, `quantity_per` and every estimator-consumed condition/ratio through baseline read, fork, storage, normal edits and refetch for BOM/tasks. Verify schema before adding fields; use one documented resolver semantics. | Before/after fork produces equal resolved lines/checklists for match/mismatch/unknown, optional/required, normalized strings, accessory/headline context and ratios. Invalid required prices remain unready. Keep Use standard disabled until verified. T14. |
| BE06 / P1 / Extend — schema/read DTOs | Support permitted trades in service/catalogue/BOM/task/licence writers and capability metadata. Add existing-user business-address PATCH without recreating its existing DB column. Return typed chain relationships, inspection cause and estimate number needed by mobile. Preserve unrelated fields. | Unsupported keys fail clearly; supported multi-trade data round-trips without another trade's book. Existing account address reaches CRM readiness. Current/old clients remain compatible. C01/C09/C13/C14; T01/T13/T14. |
| BE07 / P0 for priced aircon/commercial-paint launch / Build — rate-management contracts | Add supported owned read/adopt/edit/validate/reset/write/version contracts for aircon overlays and commercial-paint `paint_rates`. Show effective inherited values and explicit adoption; make corresponding web management use the same authority or document supported provisioning. | An entitled new tenant can configure valid prices without ad hoc DB edits. Missing/invalid/default-only data stays unpriced/setup-required. Residential-paint/generic rates are not substitutes. T08 and T12. |
| BE08 / P1 / Repair — file bounds and lifecycle | Bound encoded, decoded, per-file and aggregate payloads, verify content/MIME and ownership before expensive storage/provider work. For invoice calibration enforce current 3 MB raw allowance plus correct encoded/decoded limits. Record other operation-specific policies in the contract index. | Oversize, corrupt, wrong MIME, unknown size, expired signed URL and canceled upload fail predictably; no extraction before validation. Native caps mirror server caps. Existing upload identities/retries are reused where possible. C16/C19/C22, T02 and upload consumers. |
| BE09 / P1 / Repair — explicit resolve state | Require valid JSON and a literal boolean `resolved`; reject omission, strings and malformed payloads. Resolution applies to the file's comment thread, not a new per-comment state. Preserve existing file ownership and individual author edit/delete authorization. | `{resolved:false}` reopens the intended file thread; string `"false"`, omitted/malformed values cannot silently mutate. C18/AD05. |
| BE10 / P1 / Repair — Brand Studio rendering | Define tenant/audience/entitlement contract; validate bounded slide/format schema and approved asset IDs. Constrain photo paths to permitted assets, remove arbitrary caller path reads and return controlled errors before rendering. | Unauthorized/invalid/oversized/path-escaping input is rejected before render/filesystem/provider work. Valid exports preserve order/layout. No exploitation or live paid rendering is needed for fixture tests. C24. |
| BE11 / P1 / Build — missing readers and mobile returns | Design missing tenant-owned saved aircon/specialist readers, public-token → owned-record resolution, and CRM/Canva native return/state adapters. Inventory before adding endpoints; reuse existing correct APIs rather than duplicate them. | Private IDs are non-enumerating and owner/role checked; tokens confer only intended guest capabilities. OAuth state is account-bound, single-use/expiry-checked, cancelable and followed by server refetch. C01/C05/C21/C23; T07; U02/U03/U06. |

### Contract design gate and delivery ordering

Before a consumer is enabled, its implementation must record: existing/proposed route and method; request/response/error schema; identity and ownership; feature/role gate; valid status transitions; field/default/null semantics; money units/provenance; server size/list/time bounds; idempotency/retry/status lookup; cache invalidations; migration/backfill/compatibility and test fixtures. An undefined contract blocks that consumer, not all other work.

Deploy compatible server reads/writes before enabling dependent native controls. Migrations need schema verification, tenant isolation, reversible/backward-compatible rollout or an explicit recovery plan. Verify the deployed migration set from environment evidence; do not blindly apply all migration numbers listed in an old backlog. New APIs, storage tables, TTLs and model/provider capabilities are not assumed from their mention here.

## Tradie business workspace

Every row inherits Requirements 1–12 and the common edge-case matrix. Preserve the existing native foundation identified by the audit; complete these deltas.

| ID / priority | Required development tasks | Observable acceptance / dependencies |
|---|---|---|
| C01 / P1 — navigation, review feed and search | Keep five tabs/grouped Menu/identity/appearance. Add all owned destinations, typed record/trade/section return context and server-entitled orphan-trade access. Build review feed/count/view-all/open/dismiss and global screen/customer/job/suburb/status/code search, including pricing wizard. | Every permitted task is reachable without typed URLs; forbidden/missing destinations never open another record. Search, empty results, dismiss/back and account change work. BE06/BE11, X01, T01. |
| C02 / P1 — activation and phone readiness | Call existing idempotent welcome operation at eligible activation/first-dashboard boundary. Show real/stub/provisioning/failed phone state, share only usable number, and expose explicit provisioning retry. | Re-render/restart never repeatedly sends welcome or retries provisioning. HTTP 200 with incomplete/stub state is not live readiness. AUTH03 and actual welcome/retry contracts. |
| C03 / P1 — reporting and recent work | Keep analytics/charts; add All/Year/Month/Week and tenant-zone Monday-start bounds with coordinated from/to for period-based reporting. Merge recent quotes/jobs with source-specific destinations/retry, service enabled/total count, account/photo shortcut and prefiltered attention links. Correct local chain count/value/conversion semantics. | Initial/final/balance chain counts once as a job; eligible final conversion attributes to root. Server analytics root filtering is preserved. Live pending-review backlog stays live regardless of selected creation-date window; bounded weekly trends retain their accurate separate period labels. Failed jobs retain visible quotes plus incomplete-data state; DST/period boundaries agree with web. C09. |
| C04 / P1 — unified queue | Reuse one tagged quote/job collection in Quotes and hubs; merge before filters/sorts/counts. Search all normalized terms; status All/In review/Sent/Deposit paid/Inspection with Accepted distinctions and held aliases; trade/date filters; newest/oldest/high/low sorts; stable ties, clear and independent errors. | New job sorts before old quote; missing price never sorts as fabricated zero. Counts/rows describe same filtered data; clear restores context. Date boundaries and one failed source are tested. X06. |
| C05 / P1 — details and guarded deletion | Extend native quote detail with all-tier preview, authoritative line amounts, trade-scoped historical hints and inspection aliases. Add native saved-job detail, separate owner/customer actions and solar-specific routing; confirm supported quote/job deletion with paid/linked/concurrent guards. | Correct record/back context survives refresh. Failed/protected deletion retains record. Paid layout-only changes remain allowed only where server permits. BE01/BE11, DEC02. |
| C06 / P1 — report, manual and chat editing | Build one shared authenticated owner HTML/PDF/report workspace with preview/fallback download/share and owner-only toolbar. Add persisted tier selection, label and line description/qty/ex-GST price/add/remove; preserve unit/timeframe in state and payload without inventing independent web-equivalent controls. Chat current unsaved tiers → proposed before/after with grounding warnings → Apply local → Save. Show owner risk flags/assumptions before approval. Keep at least one valid line. | Apply persists/sends nothing. Grounding rejection preserves the draft and specific evidence; only a separately confirmed, server-permitted owner override can use the existing force exception, with audit flag and chosen notification behaviour. Never override automatically or permit AI to invent prices. Quiet save remains unsent, held stays held, paid race rejects price changes. Reopen preserves source/supplier/safety metadata and actual tax; customer exports exclude private review material. Current bounds: description 1–200, label 1–120, unit ≤20, timeframe ≤60; nonnegative decimal qty/price. BE01/BE02/DEC02; solar uses specialized flow. |
| C07 / P1 — narrative and branding | Title/H1, Heading/H2, bold/italic/underline/highlight/bullets; selection and keyboard behaviour; pricing nodes locked. System/serif/sans/mono, established five accents, plain/underline/bar headings. Explicit document/style save, dirty/back protection, sanitization and report/PDF cache refresh. | Save/reopen/export retains narrative/styles and locked pricing; no owner-only content in customer output. Disabled/unsupported adapters cannot appear enabled. C06/BE01; record whether full-document flag is rollout or authorization and enforce consistently. |
| C08 / P1 — delivery reconciliation | Preserve two-step review/send/re-send and overrides; share guarded component with editor. Complete held-approval channel/recipient semantics, validate destinations, apply child SMS-only rules, and separate saved/accepted/failed/unknown delivery outcomes. | Preview/share/back never dispatches. Duplicate taps/concurrent/lost response reconciles before re-send. `already_actioned` or successful HTTP with no delivery cannot become Sent. BE02, DEC02. |
| C09 / P1 — final/balance chain and new metadata | Typed initial/final/balance/parent/child reads and actions; Issue final from paid initial inspection, Request balance from eligible paid final deposit/credit. Display server credit/remaining money, chain links, Final quote/Balance/Paid in full, existing-child recovery and typed conflicts. Add inspection causes and EV estimate number/template. | Wrong row cannot offer action; retries create no extra children/charges. Unpaid final quotes remain follow-up eligible, balance invoices excluded; root filtering is for reporting. `grounding_failed` cannot show site-condition reassurance or become auto-send. BE02/BE06; server amounts only. |
| C10 / P1 — chats | All/Went-cold filters/counts using actual SMS/non-registration/abandoned predicate; status/trade/in-out/turn/duration summary, exact timestamps/customer-AI-owner attribution, related quote. Preserve conversation drafts and specify durable retention through X04. | Aged active chat is not cold; voice stays read-only. Trimmed SMS is nonempty and ≤1,600. Failed/unknown send preserves its draft; only confirmed success clears correct conversation. |
| C11 / P1 — follow-ups | Category/count filters, paid/booked Calendar nudge, editable quote/lead-specific suggested SMS with short code, open quote, event timeline and Log another touch without forced reopen. Preserve call/text/log/notes/load-more foundations. | Unquoted lead never calls quote-only endpoints; opening composer never sends/overwrites draft. Preserve ≤640 SMS, ≤500 notes and six outcomes. Final quotes remain chaseable; balance excluded; another touch preserves chase state. C09/BE02. |
| C12 / P1 — calendar and booking | Seven-day current-week selection; booking/site-visit/job/callback summary; review-filtered nudge; native New booking, Set time and customer/awaiting-booking destinations. Preserve tenant-zone agenda/confirm/refresh and reuse guest booking contracts. | DST matches business zone; concurrent confirmation yields recoverable conflict, not duplicate action. Return refreshes exact event. Use server site-visit amount. U04/BE11; general month navigation/reschedule/cancel are not invented baseline features. |
| C13 / P1 — business identity/media | Native business/owner/contact/state/optional ABN/address edits with explicit save and field errors; SMS-estimator toggle; logo/headshot pick/preview/replace. Share onboarding form primitives. Preserve provisioned phone and Clerk identity distinction. | Persist/refetch updates Account/Home/report branding; failed media/save retains old asset/dirty input. Existing field bounds: business 2–80, first name 1–40, email ≤120, mobile 8–20; eight AU states; logo/photo ≤2 MB and safe server-supported formats. BE06/BE08. |
| C14 / P1 — availability/licences/trades | Seven day toggles and strict HH:MM start/end, start before end; expose effective absence/default correctly. Per-supported-trade licence type/number/state/expiry; staged manageable trades, minimum one, save/removal consequences and reconciliation. | All fields read back; failed mutation never appears saved. Switching trades retains correct scoped edits; unedited licence entries/books preserved; historical work retained on deactivation. BE06/DEC02; use actual server default, not device-invented slots. |
| C15 / P1 — quote policy | Tenant review/inherited policy and positive inc-GST threshold; two-hour follow-up opt-in; tenant itemised/summary default; early-bird enable/discount/window. Preserve per-trade presentation and per-quote overrides as distinct settings. | Current bounds: discount 0–15 in 0.5 steps, 1–336 hours, positive discount when enabled. Disabled values remain stored; accepted money unchanged. Paid/booked/replied/one-per-quote suppression holds. DEC02 before conflicting automated behaviour; BE06 readback/propagation. |
| C16 / P1 — invoice calibration | Separate photo/PDF invoice upload/extraction/report from existing History calibration. Show current/suggested trade rate/evidence and explicit accept/reject with authoritative refetch. | JPG/PNG/WebP/HEIC/PDF ≤3 MB raw; server encoded/decoded/type bounds before provider work. Processing/no-match/error differ; upload never adopts rates; accept revalidates current server records. BE08. |
| C17 / P1 — payouts | Refresh Stripe status/update details after setup; schedule/verification needs; held/paid/month/fee summaries and caps; collected/fee/net/paid-time detail; transfer versus bank payout/arrival/failure. Preserve completion/release/blocked/in-flight distinctions. | Unknown is not zero; complete is not released, released is not bank-paid. Ready accounts can update details and reconcile return; fee copy matches authoritative amounts. DEC02, BILL03 provider-return pattern. |
| C18 / P1 — files/comments | Citation-to-document navigation, inline PDF/image with fallback; comment author/role/time/read/add/edit-own/delete-own; file-thread resolve/reopen/status, badge/count update and bounded rendering. Preserve Q&A and authenticated binary sharing. | Missing/foreign citation denied; failed text retained; new comment reopens its file thread; own-comment permissions server enforced; nonempty ≤5,000 and explicit delete. Strict resolve boolean acceptance targets the file thread. BE09/X05; no invented generic upload button. |
| C19 / P1 — history import/review | Canonical 22-job-type filter; CSV/PDF ≤10 MB; durable batch status/poll/background recovery; row date/tax/confidence/status/evidence; corrections and individual/all confirm/reject; explicit bounded review save. Preserve analytics/calibration and enrich confidence/recency/trade context. | Parsed ≠ confirmed; rejected rows cannot affect analytics/calibration. Interrupted import resumes batch; failed save retains edits. Current review allows 1–5,000 owned updates; revalidate actual contract before enablement. BE08/X04. |
| C20 / P2 — marketing QR/invites | Slug edit, reserved/format/collision states; SMS prefill; PNG/SVG bytes/save/share; repoint campaign without losing scans; confirmed archive. Preserve tenant recruitment code lifecycle and accurate signup copy. | Slug 2–40, prefill ≤140. Missing live number/slug blocks incompatible destination; preview/create sends no message. Repoint preserves ID; archive disables stale actions; admin recruitment stays separate. |
| C21 / P2 — CRM/announcements | Native provider configured/connected/readiness/count/sync status; HubSpot/Zoho OAuth; explicit sync/disconnect with retain/delete imported contacts; unsent/all-resend recipient mode, eligible count, safe subject/HTML preview, separately confirmed send and partial report. | Cancel/expired/wrong-account callback cannot connect; preview sends nothing; retry does not re-send successful recipients; disconnect retains campaign history. BE06/BE11/BE02; address correction unblocks readiness. |
| C22 / P2 — flyer designer | List/create three existing templates/rename/save/delete; touch select/drag/resize/rotate/layer; text/rect/image inspector/fonts/size/colour/align; camera/library replace; QR; PNG/PDF export/share and saved export records; dirty-state protection. | Save/reopen geometry/IDs match; actual loaded assets/dimensions match export; stale/blank export cannot succeed. Text size 8–200 and PNG/JPEG/WebP ≤5 MB use current contracts. Failed media retains prior image; back/Canva protects draft. BE08/X05. |
| C23 / P2 — Canva lifecycle | Connection/tracked design list; OAuth/PKCE/state return; connect/disconnect; existing gallery suggestions; tracked blank create, external reopen, PNG/PDF import into Files/downloads and confirmed tracking removal. | External gallery choice is not falsely tracked; callback doesn't auto-import/publish. Expiry/partial export recover; removing tracking does not claim deleting remote design. Preserve flyer draft. BE11/C18/C22. |
| C24 / P2 — Brand Studio | One native fixed-slide rail/live preview with cover/benefits/steps/testimonial/CTA fields; approved photo/None, established scrim/footer controls and protected reset; current-slide PNG/ordered carousel PDF. | Only selected slide changes; failed preview/export retains edits; ordering/dimensions/no blank pages proven. BE10 first. Persistent projects, arbitrary photos and added slide formats are not silently introduced as parity requirements. |
| C25 / P2 — video personalization | Preserve native player/scripts/reference photos/generation/polling/default label. Add contact_name/business context, one server `slot:'both'` request with both scripts, tenant-video label and provider/config recovery. | Trade/slot changes never mix draft/job state. Generate-both is one operation, not two uncontrolled charges; failure preserves scripts/media. Existing 220-character scripts/up-to-two references retained. Status resumption is tested; a GET that resumes server work is not treated as a harmless health probe. |

## Trade workspaces

Extend existing native trade workspaces unless the row explicitly introduces an absent workflow. Preserve historical estimates and active tenant catalogue/rate authority throughout.

| ID / priority | Development tasks | Acceptance and dependencies |
|---|---|---|
| T01 / P1 — trade navigation | Complete every enabled trade workspace, direct record return, active-trade switching and Services/Catalogue/Estimating/Recipes access for supported trades without a dedicated hub. | Refresh/navigation uses the server's permitted trades. Removal/expiry cannot leave writable stale screens; deep links open the correct owned trade and record. C01/BE06/X01. |
| T02 / P1 — job drafting and EV charger | Finish native job fields, address suggestions/manual fallback, selected-product image/brand/range/price-basis preview and draft-to-review. Add EV vehicle/charger requirement, customer supply, install location, switchboard distance and phase using exact registry keys/options. Support up to three JPEG/PNG/WebP photos, ≤8 MB each; submit durable `photo_paths` and supported fresh vision URLs rather than persisting expiring URLs as identity. | Customer-supplied charger clears/hides the catalogue pin and removes the supplied material requirement. Preserve explicit three-phase inspection routing; ambiguous supply yields review, not a guessed charger or price. Bind submission to immutable input/media identity; double taps/lost responses cannot duplicate jobs. Failed/cancelled photo retains the draft. Direct Review draft opens the returned owned record without sending; verify estimate number and inspection cause. BE01/BE02/BE06/BE08/C06/C09/SEC03. |
| T03 / P1 — roofing completion | Complete native address/building/map selection, aerial/measurement review, material choices, areas/pitch/edges/drainage/solar and every currently exposed metric adjustment. Add private saved-run reopen, customer details, preview/release and list invalidation. | All selected buildings and overrides persist through reopen and price calculation. Failed calculation/save retains inputs. Public customer results and private owner controls remain distinct. T04/T18/BE01/BE11. |
| T04 / P0 for roofing release — authority regression verification | Verify the existing owned token/revision promotion, immutable measurement identity and one-winner behaviour. Do not rebuild the repaired mechanism or reintroduce client result promotion. | Editing address, buildings, geometry, material or reviewed measurement invalidates prior promotion. Stale/foreign/replayed token and simultaneous approval are rejected or reconcile to the same result; reload fetches owned state. T03/X04/REL05. |
| T05 / P1 — residential painting creation | Add native create/measure/refine/price/review/save beside existing history: address/postcode/state, building/takeoff selection, manual floor-area fallback, walls/ceilings/trim/exterior, coats/condition/height/storeys/colour and supported productivity/crew inputs. Add repaint concept preview/refinement, customer details, private edit/release/resend and owned export. Review painting's own snapshot/save authority independently from roofing. | Use current web contract and tenant rates, not invented paint assumptions. Bind immutable input/result identity and block stale edits; correction survives save/reopen and customer tokens cannot mutate owner state. Empty/unpriced/changed takeoff requires correction/repricing. Visual-provider failure remains independent; concepts are illustrative, not guaranteed colour or measured geometry. T12/T18/BE01/BE11/SEC03. |
| T06 / P1 — solar owner journey | Complete customer intake-link copy/share, project/building selection, compute/results, phase/kW inputs, review/confirm/release, redraft and saved-project navigation. Add native report/PDF, customer destinations and Pylon/OpenSolar project links/status with supported provider returns. | Flagged/unreviewable estimate cannot release. Redraft cannot silently mutate a released version; result belongs to selected project/building/input version. Confirm/release use authoritative state and explicit action. Provider provisioning failure is distinct from estimate failure and cannot trigger duplicate project creation. Historical results stay readable. T12/T18/U06/BE11. |
| T07 / P1 — aircon results | Complete authenticated saved-estimate visual reader, plan-page selection, pan/zoom, unit/layout overlay, schematic/map and owned record reopen. Preserve existing priced PDF download/share and pricing controls. | Visual labels/positions and line totals match the saved plan/run and exported PDF; missing media is recoverable. Guest content has no private owner controls. T08/BE07/BE11/X05. |
| T08 / P0 for priced aircon/commercial-paint launch — specialist rate management | Provide distinct native aircon and commercial-paint rate configuration/adoption surfaces backed by the corresponding owned server rate contract and version. | Empty/invalid/unchanged/zero are handled according to field contract. Successful save refetches a new version; failure retains the edit. Suggested rates are not adopted merely by opening/reading. BE07/T10. |
| T09 / P1 — commercial-paint workflow | Complete stored plan/sheet PDF/image viewer and takeoff editing: surface, room, unit, quantity, system, confidence context, separate/excluded lines, notes and labour override. Add customer details, quote preview, repaint before/after preview/refinement and run-specific assistant proposals. Make Apply separate from persistence/release. | Corrected takeoff saves before pricing; refinement never discards unaccepted corrections or crosses extraction identity. Low-confidence/unmatched lines remain visible. Viewer, review, saved quote and PDF agree on areas/units/scope. Contact fields never send automatically. Preserve disabled quote Save until T10 passes. T08/T10/BE11/X05/SEC03. |
| T10 / P0 for commercial-paint Save — safe persistence | Implement the missing authoritative freshness proof, then enable Save only when extraction, all edited inputs, selected rates and labour override provenance match a current server calculation. | Change a rate during review, remount, revise labour, apply assistant output or receive an old result: Save rejects stale proof and requires recalculation. An intentional override cannot mask stale adopted rates. Saved amounts/inputs survive reopen and web readback. BE04/T08/T09/X04 first. |
| T11 / P0 authority; P1 interface — electrical plan estimator | Repair fallback pricing first. Complete native PDF/image sheet viewer, pin-to-row linkage, type/unit/quantity/notes correction, model/refine controls, methodology/evidence, unresolved and unmatched-item review, assistant proposal and explicit save/export. | Missing tenant labour/catalogue/readiness blocks a priced quote or yields the supported inspection state. Never substitute shared/hardcoded rates. Pin/row identity, page, units, edited quantities and include conditions survive correction/save; stale extraction output cannot overwrite current work. BE03/BE05/T14/X04/X05/SEC03. |
| T12 / P1 — four rate-card families | General: minimum hours, apprentice/senior/after-hours/risk/GST and advanced disclosure. Roofing: material rates/upgrade, storey/asbestos/complexity, gutter/fascia/soffit/downpipe, ridge/hip/valley/box-gutter, approved-edge switch, callout floor, base/per-array solar allowance, GST and inherited hints/resets. Painting: sqm/hourly model, productivity/multipliers/coats/condition, paint/primer coverage and price-per-litre, sundries/uplift/crew/hours/GST/deposit. Solar: finish inherited hints, reset-all and remote/save-baseline refresh; preserve existing rates/fields. | Each family has field-by-field server schema mapping, units, bounded parsing and dirty-baseline tests. Blank is not zero; valid zero/false persist. Reset to defaults clears the appropriate overrides to server-defined inheritance; discard/revert uses the last confirmed saved baseline. Save failure cannot clear dirty state; remote changes reconcile. Inactive model values persist; display-only paint takeoff hints cannot silently alter customer quote tiers. BE01/BE06/X04. |
| T13 / P1 — services, catalogue and supplier CSV | Complete service search/source/provenance/grounding and custom service controls; catalogue photo preview/replace/clear, full product identity/price basis, search/filter and per-ID bulk outcomes. CSV: template download, bounded file selection, row/column dry-run errors and new/existing counts, “also stock mine” and distinct reviewed commit. | Distinguish custom/shared/imported identity and preserve unknown product properties. Changed CSV invalidates preview; preview writes nothing. Report mixed bulk outcomes, recover upload-then-save failure and duplicate/partial adoption without silently overwriting tenant prices. Price/category/active changes invalidate all affected recipe/estimating/coverage consumers for the correct tenant/trade. BE05/BE06/BE08/X06. |
| T14 / P0 fork safety; P1 editor — recipes and estimating | Preserve conservative readiness. Complete recipe search/source, full BOM quantities/units/conditions, overrides and saved editor controls. Repair standard-to-tenant forks before enabling them; expose accurate estimating completeness and unresolved requirements. | `include_when`, `quantity_per`, task metadata and nested condition semantics survive fork/edit/reload and calculate identically against matching fixtures. Unknown/invalid readiness remains blocked; no dropped conditions or substituted pricing. BE03/BE05/T13. |
| T15 / P1 — pricing setup wizard | Replace the web handoff with the existing three-step rate card → services → brands workflow. Include common-brand fill/clear, progress/back/cancel, persistent unsaved steps and an explicit final scoped save with partial-failure recovery. Reuse trade-specific book and custom/shared service/brand identity. | Missing matching book never borrows another trade. Resume/back/background retains the intended unsaved steps; double completion or partial server success cannot report all steps saved. Final save/refetch/reopen proves the exact rates, services and brands. Catalogue/recipe readiness remains separate configuration work rather than replacing wizard steps. T12/T13/BE06/X04. |
| T16 / P2; P1 if signage ships — signage operations | Add brand/region/shot selection, sweep create/roster/progress/generated request-link sharing and confirmed delete. Location workspace: Places/manual address/geocode, Street View/static-map preview, fields/add, bounded CSV roster import and delete. Shot-definition editor: unique slot/label/instruction rows, add/remove and ordered save. Queue: fleet filters, photos/lightbox, per-rule verdict/source agreement/conflicts, notes and deliberate Approve/Needs changes/Escalate. | Org/HQ/brand authorization and exact roster/assessment identity persist through reopen. Generated upload links do not mean SMS was sent. Address changes invalidate coordinates; CSV reports invalid/duplicate/added rows. Shot changes do not silently rewrite issued requests. Stale/conflicting decisions reconcile; missing photo is not approval. Location PATCH and shot drag-reorder are not assumed existing contracts. BE08/X04/X05/T18/SEC03. |
| T17 / P2; P1 if signage ships — signage standards and audits | Add standards PDF selection/extraction → proposed-rule review → separate explicit commit. Add shot-specific photo selection/capture, ad-hoc AI audit with provenance and native PDF share/save. Add franchisee token-bound guided shot upload/checklist/progress/retry and report reader, distinct from the marketing Brand Studio. Use tested native or authorized server PDF extraction, not an assumed browser-library port. | Extraction preview never commits automatically. Enforce per-file/aggregate bounds and cancel/retry; keep source photos/rules/verdicts aligned. Show partial/degraded errors and label unsaved/non-certifying reports appropriately. Guest tokens permit only their guided request/report; HQ/owner mutations remain restricted. Missing evidence is unavailable, not a pass. T16/BE08/U03/X05/SEC03. |
| T18 / P1 for enabled visual trades — shared visual capabilities | Provide map/building selection, plan/image/PDF pan/zoom, selected geometry/measurement overlays and supported correction tools. Preserve source attribution, provider licensing/configuration gates and manual fallback. | Unsupported/unlicensed data sources stay disabled; manual measurements are labelled and supported only where the server permits them. Multi-building, tiny/overlapping/invalid geometry and stale source results cannot silently alter priced scope. Capability-gated synthetic topology is labelled illustrative preview, never survey evidence or pricing authority; it need not be removed as a legitimate preview. DEC04/X05/X08. |

Brand Studio is C24, including legacy TRADE-024. Reuse that workspace rather than building a second trade-specific carousel editor.

## Customer, guest and public journeys

Full parity includes these native journeys where applicable. Preserve existing browser access for customers who do not install the app. First-party links need a deliberate audience/route policy; widening associated domains without the corresponding native readers and token safety is not completion.

| ID / priority | Development tasks | Acceptance and dependencies |
|---|---|---|
| U01 / P2 — acquisition and discovery | Complete appropriate native entry destinations for product/trade selection, supported demos and acquisition/referral continuation; provide truthful routes to signup, existing sign-in and customer guest actions. | No web marketing claim is copied as an enabled native feature without evidence. Campaign intent survives supported signup/activation interruption; calculator/demo output is labelled illustrative. AUTH03/T01/U07. |
| U02 / P2 — customer intake | Resolve tenant slug/QR/referral destination; native customer start, generic quote request and legacy painting request with identity/address/job/scope fields, camera/library photos and token-bound electrical-plan/PDF upload. Preserve no-install web completion. | Expired/paused/archived/wrong-tenant links give safe recovery. Intake cannot inherit tradie-owner privileges or submit to a prior tenant after link change. Upload progress/retry/cancel and rejection retain valid input; duplicate submission reconciles one request. BE08/T02/SEC03/REL03. |
| U03 / P2 — guest and owner report readers | Build token-authorized generic quote, roofing, painting, aircon, commercial-paint and electrical-plan report readers with product choice cards/details/images, explicit server-confirmed selection, supported tier choices, plan/schematic/media viewing and downloads. Implement authenticated owner resolution from shared links through a dedicated owned contract. | Guest token never authorizes owner correction, approval, release or deletion. Owner controls appear only after server ownership resolution. Distinguish unavailable/expired/accepted/superseded links; supported selection persists through refetch. Keep owner all-tier review separate from customer-visible selected structure. BE01/BE11/C05/C06/C07/C08/T07/T09/T11/X05. |
| U04 / P1 if offered at launch; otherwise P2 — acceptance, job payment and booking | Complete customer acceptance, physical-service inspection/deposit/final checkout, payment return/status, booking selection/confirmation, paid/unpaid/expired recovery and calendar ICS; include existing direct booking journey. | Return URL alone cannot mark paid or reserve a slot. Server reconciles payment, amount, quote version and booking; two customers cannot obtain one exclusive slot. Cancel/retry/expired slot preserve a recoverable state. Payment remains physical-service checkout, separate from software IAP. BE01/C09/C12/REL03/REL05. |
| U05 / P2 — showcase | Provide native shared showcase with existing project/media navigation and permitted calls to action. | Only the published tenant/project scope is visible. Empty/withdrawn/broken media and private IDs cannot leak owner or other-tenant data. U03/X05. |
| U06 / P2 — solar customer journey | Add tenant-slug self-service solar intake, supported form inputs, map/building selection, sun/shade display and guest calculation/results using the existing public contracts. Add project/proposal/confirmation and supported booking/checkout/PDF destinations. Keep owner redraft/release and financial overrides separately authenticated. | Guest computation is restricted to its supported public scope; it cannot invoke owner-only actions. Tokens reveal only their project/version. Input/building changes invalidate stale calculations; superseded/cancelled/paid projects show server state after return/relaunch. T06/T18/U04/BE11. |
| U07 / P2 extensions; policy/support access P0 — guest shell and help | Preserve native Support/Help. Complete applicable public help/docs, feedback and contextual guidance, illustrative calculator controls where exposed, and token-based unsubscribe acknowledgement/recovery. Keep policy/support accessible before and after auth. | Help reflects the actual offered features. If the existing calculator is exposed, preserve its 17-input/m²/hourly-rate/two-mode contract and distinguish illustration from tenant pricing. Historical gated docs remain gated. Native unsubscribe or a deliberate browser route must honour the token without requiring tradie sign-in. Cookie UI is applicable to actual browser tracking; do not invent a native cookie banner. SEC02/X01/X05. |

Public quote document editing uses C06/C07/C08; private roofing/painting creation uses T03/T05; shared signage audits use T17. Supported provider/browser handoffs require return/error evidence and do not remove the corresponding native first-party work from full parity.

## Administrator workspace

These are full-parity P2 packages unless a launch manifest offers them. Build a separate staff-authorized native area; tenant owner status does not confer platform administration. Reuse native readers where possible and keep administrative mutations explicitly scoped.

| ID | Development tasks | Acceptance and dependencies |
|---|---|---|
| AD01 — staff shell, tenants and health | Native staff entry, navigation, tenant directory/search/detail and operational health/status. Enforce staff checks on every backing read/mutation. | Anonymous/customer/tradie owners cannot enumerate tenants or query administrative data through direct routes. Search/pagination/error states expose the same permitted records as web. X01/X06. |
| AD02 — tenant administration | Add suspension/reactivation, billing compensation, trade changes and subscription administration, plus configuration/readiness views. Scope each mutation with confirmation, audit outcome and refetch. | Target tenant remains explicit through confirmation; switching tenant or losing staff access invalidates pending edits. Invalid/stale actions fail without changing another record. Financial compensation uses authorized existing contracts and DEC02 policy; no invented credit/refund mechanism. AD01/BE06/X02. |
| AD03 — cross-tenant metrics | Native admin metrics, period/filter controls and drill-downs using current admin aggregation contracts. | Date boundaries, empty series and partial failures are accurate; client-side tenant state cannot narrow or widen server authorization. AD01/X06. |
| AD04 — platform tradie invitations | Native create/list/revoke/reissue, recruitment/signup QR and current code/invite lifecycle for platform recruitment. | Distinguish platform invitations from tenant marketing/recruitment in C20 and from staff account invitations. Expired/used/revoked state is authoritative; preview/reopen does not send or provision. AD01/AUTH03/X02. |
| AD05 — cross-tenant files | Staff file inspection and existing comment/review controls through scoped admin contracts and shared native viewer. | Tenant labels remain visible; unauthorized raw file URLs cannot bypass checks. A literal resolved boolean changes only the intended file's comment thread; individual comment edit/delete retains separate author/role permissions. AD01/C18/BE09/X05. |
| AD06 — ingestion and knowledge management | Admin supplier/catalogue CSV template/upload, staged dry-run diff/corrections/commit/rollback/history. Knowledge-base store/document selection, PDF ingestion/extraction progress and extraction into staged catalogue review. | Staged extraction is not live publication; invalid/partial jobs retain actionable row-level state. Commit/retry/rollback use supported durable operations and preserve unrelated data. Distinguish admin loader from tenant supplier CSV. AD01/BE08/X02/X05. |
| AD07 — agent operations | Native evaluation trigger/run/status/detail/rubric views, catalogue finding evidence/approve/dismiss, and tradie edit-pattern review with authorized promotion to catalogue actions. Include existing filters and cost/side-effect guards. | Failed/partial/unknown run is not success. Evidence stays bound to its run/tenant; suggestions need the authorized human action before accepted changes. Duplicate triggers/promotions reconcile and refetch their outcomes. AD01/X02/X04/X06/SEC03. |
| AD08 — staff documentation | Native staff docs index/detail/navigation and applicable interactive examples/media. | Server role gate covers source data and direct links; restricted examples cannot be exposed by a public route or file URL. AD01/U07/X05. |
| AD09 — editor fixture applicability | Port the web editor fixture's relevant behaviours into development/test coverage for the native editor. Keep developer-only routes unreachable in production. | Exercise manual/chat Apply, Save, rich text, price locks and rendering equivalence with deterministic fixtures. This is a development surface, not a new advertised customer/admin feature. C06/C07/REL01/REL05. |

## Shared native reliability

| ID / priority | Development or verification tasks | Acceptance and dependencies |
|---|---|---|
| X01 / P1 — navigation and audience states | Complete stable destinations, pending-intent consumption, auth/tenant/trade/role/entitlement gates, contextual back/return and loading/empty/error/unavailable states across added routes. | Cold/warm link, sign-in required, wrong role, removed trade, expired token and cancelled provider flow reach a safe deterministic destination. A stale route cannot revive under another account. AUTH03/BE06/BE11/REL03. |
| X02 / P0 for money/delivery; P1 elsewhere — transport and mutation reconciliation | Preserve typed transport; ensure timeouts/abort cover response-body parsing, structured errors and long jobs. Add per-operation deduplication/status reconciliation where missing. | Timeout after server success, malformed/truncated JSON, offline transition and 401/403/409/429 cannot be represented as success or trigger blind replay. Re-enable a repeat only after authoritative outcome handling. BE01/BE02/BILL01/C08/C09. |
| X03 / P1 — lifecycle and cache | Revalidate on foreground/reconnect according to feature needs; partition persisted/cache/push state by identity/tenant and clear on logout/deletion/account change. Define honest offline read/write support. | Background refresh, late response, push tap, expired session and rapid A→B switch cannot leak A's data or replay its mutation. Cached data is labelled stale where consequential; unsupported offline actions remain blocked. AUTH05/SEC01/REL03. |
| X04 / P0 for priced results; P1 drafts — durable edit identity | Complete scoped draft persistence and confirmed baselines; bind async proposals/calculations to input/run/rate versions. Protect unsaved edits on back, trade changes, app interruption and provider handoff. | Refetch does not overwrite dirty edits without explicit conflict handling. Failed Save retains draft/baseline; successful Save survives reopen. Stale response, changed rates, two tabs/devices and relaunch cannot make an old result saveable. BE04/T04/T10. |
| X05 / P1 — media, files and streaming | Shared native picker/camera, upload validation, image/PDF viewer, authenticated download/share, citation navigation and streaming response controls. Respect each endpoint's real formats/limits and permissions. | Denied/limited permission, HEIC or other unsupported format, corrupt/oversize/partial file, expired URL and failed share recover without data loss. Validate before expensive provider work; stop/close streaming cannot attach a late result to another record. BE08/SEC03. |
| X06 / P1 — bounded lists | Consistent server pagination/search/filter/sort/count contracts; add missing bounded reads and stable tie-breakers for long quote/job/chat/history/catalogue/admin lists. | Fixtures larger than one page and equal timestamps have no missing/duplicate rows. Counts describe the selected universe; changing filters resets pagination. A failed constituent source stays visible as partial data. C04/AD01. |
| X07 / P1 — accessibility, AU presentation and startup | Verify and repair screen-reader labels/focus, keyboard/back behaviour, touch targets, dynamic text, reduced-motion support where relevant, safe areas, themes, startup/error recovery, money/date/unit formatting and branding. | On tested compact/large devices and enlarged text, essential actions remain reachable with no clipped totals or inaccessible errors. Business timezone/date-only meaning survives a different device timezone. Recovery from startup failure does not require reinstalling or silently discard drafts. REL02/REL05. |
| X08 / P1 for offered providers — capability/configuration gates | Centralize actual configured/available/authorized states for map sources, imagery, topology, auth/provider widgets and other licensed integrations. Preserve explicit manual/offline alternatives where supported. | Missing key, quota, denied licence, unsupported platform and provider outage are distinct from no result. Frontend flags cannot override server provider authorization. Verify actual deployed capability before advertising it. DEC04/T18/REL03. |

## Release engineering and proof

All release evidence must identify candidate build/version, mobile/backend revisions, environment, tester, device/OS and outcome. Store credentials, tokens and personal test data outside this document.

| ID / priority | Tasks | Acceptance |
|---|---|---|
| REL01 / P1 — reproducible local and CI verification | Repair the canonical `npm run check` lint launcher/scope so contributors and CI can run it reliably on supported environments. Scope lint to project-owned code and explicitly exclude vendored tooling without hiding owned errors. Include relevant paired backend contract tests and the legacy spec validator. | Canonical check exits zero from a clean supported checkout with documented dependencies. Record actual commands/results. Existing focused checks remain green; no blanket error suppression or removed behavioural test is used to obtain a pass. |
| REL02 / P1 — installed candidate | Build a signed iOS release candidate with verified app ID, signing/profile, EAS project ownership, distribution, version/build number, native modules, permissions, entitlements, icon/splash, privacy manifests and runtime configuration. Disable image-picker's unused microphone permission while capture remains images-only; an actual audio feature instead needs an accurate purpose and tested workflow. Confirm archive uses the submission-required Xcode/iOS SDK. Verify Android native packaging/device behaviour for the full two-platform parity target. | Install/launch/upgrade/relaunch on supported real devices; inspect generated archive permissions and test actual prompts/modules, including absence of an unused recording request. As checked 8 September 2026, Apple requires Xcode 26+ and iOS 26 SDK. JavaScript export is insufficient. Do not upgrade Expo solely from that requirement; prove compatible tooling, then change dependencies only if needed. Android store submission is not automatically an iOS release prerequisite. |
| REL03 / P1 — deployed backend, links and notifications | Verify approved environment URLs/keys, compatible schema/migrations, auth callbacks, provider redirects, `/app` associations and token routes, operational jobs/cron, APNs push delivery/receipt handling and recovery. Verify FCM/Android links for Android scope. Implement only missing pieces shown by evidence. | Signed installed app opens each supported cold/warm route with the right tenant/record. Verify notification permission denial, register/rotate/logout cleanup and foreground/background/terminated taps. Associated-domain files are publicly served with correct app identity. A tracked config file or registration unit test is not delivery proof. Record provider/outcome configuration without exposing secrets. |
| REL04 / P1 — observability and rollback | Verify release DSN/environment, symbol/source-map upload, privacy redaction, crash/error recovery and diagnostic correlation for supported workflows. Verify update channel/runtime compatibility, rollout and rollback procedure. | Test error is observable against the right candidate without customer text/tokens/media or unsafe dynamic route values, including Support paths. Demonstrate rollback/recovery using a designated nonproduction candidate. Startup/config failure shows a usable recovery state. |
| REL05 / P1 — matched end-to-end acceptance | Create deterministic local/mock contract fixtures and approved staging fixture accounts/records; execute web and installed-native versions of the same business journeys, including role/tenant/rate/async/failure tests below. Attach durable server readback and device/provider evidence. | Every enabled release workflow passes its positive and negative cases on the candidate. Record skipped/blocked cases and why; none count as passed. Existing browser setup that creates a live Clerk account must be isolated or replaced with a designated test arrangement before use. No production customer sends, charges or data changes are part of routine verification. |
| REL06 / P1 — App Store package and review | Prepare accurate name/description/feature manifest, screenshots from the actual app, support/privacy/terms URLs, age-rating answers, privacy disclosures and applicable trader information. Provide working reviewer access, representative records and precise review notes for restricted features, purchases/restore, deletion and test steps. Validate candidate and operational support/rollback ownership. | Reviewer can reach the offered functions without unavailable phone provisioning, personal staff access or undocumented setup. Metadata omits unfinished features; relevant agreements/products are configured for the selected model. Verify current Apple rules at submission. Product/release owner signs the candidate evidence record. Submission/publishing is a separate authorized action, not an automatic consequence of this spec. |

Apple submission and account requirements must be rechecked at release time: [submission requirements](https://developer.apple.com/news/upcoming-requirements/), [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/). Provider-owned physical-service payments and software subscriptions retain their separate purposes and entitlement rules.

### Immediate release-blocker ledger

The ledger below translates the comparison's immediate blockers and underlying backend findings into build gates. An affected feature can be deferred only through DEC01 with its unsafe entry/actions disabled and its claims removed; this never closes its full-parity work. Account deletion/privacy and correctness of anything still enabled cannot be waived by a narrower feature manifest.

| Gate | Required packages | Release condition |
|---|---|---|
| R01 — account deletion | DEC03, SEC01, AUTH05, X03 | Verified initiation, authorized lifecycle, subscription explanation, retention disclosure and completion/status. |
| R02 — real policies and AI sharing | DEC04, SEC02, SEC03, U07, REL06 | Real legal/contact information; accessible policies; accurate recipient/data disclosures; enforceable required consent before sharing. |
| R03 — quote amounts and draft/delivery state | DEC02, BE01, BE02, C06, C07, C08, C09, X02 | Correct trade/version/GST and chain amounts; quiet-save remains unsent; explicit send and lost-response reconciliation. Applies to every enabled priced/sending workflow. |
| R04 — unsafe specialist pricing/forks | BE03, BE04, BE05, T10, T11, T14 | Electrical fallback removed; commercial-paint freshness and lossless forks proven before those operations can be enabled. Roofing T04 regression stays green. |
| R05 — correct auth and recovery | AUTH01, AUTH02, AUTH03, AUTH05 | Enabled factors complete in native session; Clerk recovery works; interrupted activation/return cannot strand or mix accounts. |
| R06 — offered software billing | DEC01, BILL01, BILL02, BILL03 | Verified model, server entitlements, purchase/restore/lifecycle or correctly scoped free-companion UI. Unconditional purchase gate stays closed until required proof. |
| R07 — safe exposed APIs | BE06, BE08, BE09, BE10 and consumers | Repair/verify authorization, permitted-trade/address/DTO contracts, upload limits, resolved boolean and Studio render boundaries before exposing affected operations. An existing exposed security defect is not resolved solely by hiding a new screen. |
| R08 — reproducible signed candidate | REL01, REL02, REL04 | Canonical checks pass, candidate archive meets Apple tooling requirements, installed runtime and error/rollback evidence exist. |
| R09 — actual environment and provider operation | BE07, BE11 where consumed; REL03 | Correct deployed contracts/configuration, links, callbacks, required migrations/jobs and APNs behaviour, with real outcome evidence. |
| R10 — workflow and review readiness | REL05, REL06 and every package enabled by DEC01 | Matched business journeys and negative cases pass; reviewer access/assets/disclosures agree with the candidate. |

### Original attachment reconciliation

The original backlog's feature work is retained, with the current audit's corrections applied rather than copied as new defects.

| Attachment item | Spec disposition |
|---|---|
| N-1 post-visit money chain | C09/BE01/BE02/BE06. Correct Request balance origin is the eligible paid final quote; root-only reporting does not exclude unpaid final follow-ups. Amounts/credits come from server records, not the attachment's example fee. |
| N-2 EV questions/photos | T02/BE08: five exact registry answers, supply pin gating, durable photo paths and reviewed draft. |
| N-3 inspection cause; N-4 EV estimate display | C09/BE06/C06: typed causes, truthful held copy and server estimate number/template. |
| B06/B07/B08/B10/B11/B12/B14/B16/B19 and wider trade writers | BE01/BE02, BE06, C11 event-history GET, BE08, C17 completion-schema verification, BILL01–BILL03, BE09, C21/BE11/REL03 and BE10 respectively. Address already exists; payout completion handling is partly repaired. Verify before rebuilding. |
| Account/provider recovery and source-only verification gaps | AUTH01–AUTH05, SEC01–SEC03 and REL01–REL06. Add deletion and AI consent from the newer complete comparison even though the attachment's store list did not fully enumerate them. |
| Association asymmetry, keys, APNs/FCM, migrations and cron | REL03. Both tracked platforms already restrict `/app`; verify actual hosting/signing/providers/jobs/schema. Do not assert 503 from an unavailable probe or push migrations 191–197 blindly. Android-only credentials are conditional on Android scope. |
| Sentry DSN/maps/Support privacy, legal identity and fee copy | REL04, SEC02, DEC02/C17. Reconcile actual fee versus “No cut” copy using authoritative business policy; verify sanitized Support routes and uploaded release symbols. |
| Empty submit profile, reviewer material and device evidence | REL02/REL05/REL06. Establish a valid chosen submission workflow and real candidate evidence; an empty tracked submit block alone does not establish unusable remote credentials or require a particular submission method. |

Attachment instructions to start implementation or deployment are not executed by this specification task.

## Delivery order and dependency rules

1. **Record decisions and contracts.** Resolve DEC01–DEC04 only for the packages being enabled next; inventory existing endpoint schemas and test fixtures. Assign package owners and isolate unrelated checkout changes. Do not treat the decision ledger as permission to guess missing facts.
2. **Repair authority and account gates.** Deliver SEC01–SEC03, AUTH recovery, BE01–BE06/BE08–BE10 and BILL01 design in parallel where independent. Keep unsafe Save/fork/purchase gates intact. Establish REL01 and test fixtures early.
3. **Complete daily business work.** Deliver C01–C18, including the document editor, explicit delivery and final/balance chain. Ship paired DTO/ownership contracts first; native consumers must tolerate supported older/backward-compatible states. Develop billing reconciliation and native store flows against sandbox fixtures.
4. **Complete trades.** T12–T15 and BE07 supply authoritative configuration; T18/X05 supply shared visual controls; complete T02–T11/T16–T17 against those contracts. T10 depends on BE04 proof, and T14 fork enablement depends on BE05 proof.
5. **Complete supporting and audience workflows.** C19–C25, U01–U07 and AD01–AD09 can proceed in parallel by shared dependency. C24 requires BE10; guest acceptance requires correct C09/C12 server state; administrative reuse never weakens the staff boundary.
6. **Close release evidence continuously.** Exercise REL02–REL05 as slices become available, then complete REL06 for the selected manifest. A UI implementation pass does not move a release gate to passed without its evidence.

The priority column guides sequencing and risk; P2 still belongs to full parity. A milestone may be called “scoped release candidate” only with the approved manifest and outstanding full-parity tasks disclosed. No time or staffing estimate is implied.

## Constraints and non-goals

- Build within the existing Expo/React Native mobile and Next.js/shared backend architecture. Read the exact [Expo SDK 54 documentation](https://docs.expo.dev/versions/v54.0.0/) before implementation, per repository instructions. Verify installed versions and contracts at implementation time.
- Preserve Clerk credential authority, server tenant/role/trade authorization and existing customer physical-service checkout. No guessed prices, silent repricing, unsupported licensed data or client-only entitlement/consent controls.
- Reuse existing native components, style system, transport and shared viewers. Framework rewrite, broad redesign, replacement provider and speculative schema redesign are outside this scope unless a documented blocker requires an approved change.
- No new month calendar/rescheduling feature, generic Files uploader, arbitrary Brand Studio photo/project persistence, additional slide formats or remote Canva deletion is implied where the web does not provide it. Preserve the audited scope and explicitly approve additions.
- Guest/public and admin parity remain in scope; browser marketing-only tracking and development-only fixtures receive explicit applicability dispositions rather than being turned into unnecessary native product features.
- No budget, delivery date, latency SLA, retention duration or provider quota was supplied. Use documented current contracts; absent bounds are DEC04 contract decisions, not invented implementation defaults. Record payload/latency measurements for representative large fixtures and agree any necessary new limit before enablement.
- This document is a build specification. It does not implement features, certify Apple approval, run live customer operations, deploy migrations, charge accounts or submit the app.

## Edge cases to handle

| Situation | Expected behaviour |
|---|---|
| Sign in on web after native second-factor/recovery handoff | Establish native Clerk session using the supported return contract, or show a recoverable incomplete state; web login alone is not native success. |
| Expired/replayed activation, invite, QR or provider callback; wrong account selected | Validate audience/state/expiry server-side, consume intent at most once, and return to an appropriate safe destination without automatic send, purchase or duplicate activation. |
| Account A signs out while upload/calculation/push response is pending, then B signs in | Abort/ignore A's late results and clear scoped state/tokens. B sees none of A's drafts, files, entitlements or pending destination. |
| User requests deletion with active subscription, multiple memberships or sole ownership | Explain billing/retention and apply DEC03's authorized identity/member/tenant lifecycle; no forced support call or subscription cancellation prerequisite to initiation. Provide secure completion/status after access is revoked. |
| Consent declined/withdrawn, changed recipient/purpose or old policy version | Enforce the applicable consent boundary on the server; block new disallowed personal-data sharing, preserve permitted workflows and request new consent where required. |
| Empty, zero, false, negative, decimal, NaN-like or out-of-range pricing input | Apply the specific schema; preserve valid zero/false; reject invalid or missing required values visibly. Never coerce a blank field into a financially meaningful default. |
| Two owned trade books disagree, GST registration is false, or rate changes after review | Select the correct owned trade/version/tax basis; invalidate stale proof. Refetch/reprice explicitly; do not adopt the first book or infer universal GST. |
| Recipe contains nested conditions and per-unit quantities | Fork/edit/calculation preserve semantics losslessly or remain blocked. Unknown readiness is not treated as price-ready. |
| Calculation completes after input/run/building/phase/trade changes | Discard or label it stale; it cannot enable Save/approval for current inputs. Preserve the user's newer edit. |
| Paid initial inspection has an unpaid final, paid final or balance child | Show the correct action on its originating row. Reconcile credit/deposit/balance from server. Count the root once in jobs while retaining unpaid final follow-ups; exclude balance invoices from that chase queue. |
| Save succeeds but body parsing/network response fails | Display pending/unknown, reconcile by owned operation/record status, and recover one persisted result. Do not announce failure as proof that retry is harmless. |
| Send/purchase/import/generate is double-tapped or retried after app termination | Use durable deduplication/status; produce one intended side effect and reconcile partial success before another attempt. |
| RevenueCat/store/Stripe webhook is delayed, duplicated, reordered, refunded or belongs to a prior user | Server converges to the correct entitled identity/state. Client refresh follows that authority; return URL/client receipt alone does not grant durable access or duplicate billing. |
| File exactly at/over cap, false MIME, huge base64, corrupt PDF, unsupported HEIC, expired download URL | Validate supported type plus encoded/decoded/per-file/aggregate limits before costly work. Show actionable rejection and preserve remaining input; refresh authenticated download where allowed. |
| Long list exceeds one page, items share timestamps, one quote/job source fails | Stable cursor/tie-breakers prevent omissions/duplicates; filters/counts apply to the merged intended set; show and retry partial-source failure. |
| Offline/foreground return during a dirty edit or provider flow | Preserve scoped draft, label stale status and refetch authoritative result before money/delivery actions. Do not overwrite dirty input or claim unsupported offline synchronization. |
| Device timezone differs from business timezone, DST boundary or date-only booking | Preserve business-local day/time and explicit offset semantics; display, server booking and ICS agree. |
| Customer slot is taken while paying/confirming, quote superseded or token expired | Reconcile current quote/payment/slot and offer supported recovery; do not silently accept another version, double-book or charge again. |
| Studio caller supplies unauthorized tenant, invalid render shape or arbitrary path/photo | Reject before rendering/file access. Only bounded approved assets and authorized input reach the renderer. |
| Staff loses role while tenant detail is open; public token points to owner record | Server rejects privileged operation; UI exits/refreshes access and shows no private fields. No generic authenticated fallback grants admin or owner access. |
| Font enlargement, screen reader, denied permission, provider outage or missing config | Keep essential controls/readable errors accessible; provide an accurate supported retry/settings/manual alternative without pretending the feature completed. |

## Verification fixtures and evidence

Use a shared fixture manifest, without credentials in source, so each native result can be compared with the same web record. Fixtures must include:

| Fixture family | Minimum required coverage |
|---|---|
| Identity and audience | Anonymous guest; valid/expired/revoked token; tenant owner/member as supported; unauthorized other tenant; staff and nonstaff; incomplete activation; enabled MFA/recovery; account switch; deleted identity; multi-owner/membership cases. |
| Trade and configuration | Electrical, plumbing, roofing, signage, painting, commercial painting, aircon and solar, plus supported no-hub/orphan-trade access; single/multiple/no active trade; removed trade; missing licence/provider/capability; no catalogue; incomplete and valid conditional recipes. Confirm exact registry keys at implementation time. |
| Pricing and quote lifecycle | Two tenants with conflicting rates and two trade books within one tenant; GST registered/unregistered; zero/blank boundaries; current/stale rates; explicit labour override; inspection causes; draft/approved/sent/accepted/paid/superseded; initial→final→balance chain with credit and partial/full payment states. |
| Trade visuals | Multiple buildings; address/geometry/material changes; stale roof token; electrical unresolved catalogue/conditions; EV customer-supply and ambiguous phase; painting takeoff revisions; aircon plan/layout; commercial-paint extraction/input/rate revisions; solar phase/kW/redraft; signage partial assessment evidence. |
| Data scale and media | Empty/one/more-than-page lists and equal timestamps; mixed quote/job pages; batch import valid/invalid/partial rows; bounds at and above every documented file limit; corrupt/disallowed files; failed download/share/stream. |
| Asynchrony and providers | Timeout before/after side effect; malformed response body; duplicate/reordered callbacks; pending/failed/unknown/completed generation; delayed store entitlement/refund; OAuth cancellation/expiry; background/kill/relaunch/reconnect and two-device conflicting edits. |
| Devices and release | Signed iOS compact/large-screen coverage and minimum/current supported OS; relevant iPad coverage if declared; Android real-device coverage for full parity; different business/device timezones; enlarged text/screen reader; denied/limited permissions; push cold/warm/background; install/upgrade/rollback. Record actual supported versions, not placeholders at sign-off. |

Each task's evidence record must contain: package and legacy IDs; before/after behaviour; implementation revisions and contract versions; commands/results; negative tests; server write/refetch/reopen/web readback; device/build/provider environment; remaining restrictions; independent reviewer and disposition. Use **Open → Contract-ready → Implemented → Locally verified → Device/provider verified → Accepted**, with **Blocked** and **Deferred from scoped release** available. A mock test can close only its local evidence item. For tasks without device/provider relevance, document why that evidence is not applicable and who reviewed the disposition.

Example ledger fields for the implementation phase:

| Package | Owner | State | Dependencies / decision record | Code and test evidence | Server/readback evidence | Candidate/device/provider evidence | Review / remaining issue |
|---|---|---|---|---|---|---|---|
| Package ID | Assign during build | Open | Link resolved contracts or blocker | Revisions and test log | Owned fixture and observed result | Build ID or reviewed applicability | Reviewer and outcome |

### Baseline evidence, not release sign-off

The 8 September audit recorded TypeScript passing; 54 Jest suites/549 tests passing; direct app-scoped ESLint over 226 files with zero errors/warnings; and an offline iOS JavaScript export with 2,597 modules and 46 assets. The canonical `npm run check` failed because Expo's lint launcher could not resolve ESLint. Broad repository lint also included vendored-tooling noise (432 errors/542 warnings), which is not a count of app defects.

The legacy specification validator passed for 365 identifiers/ledger rows, but none was fully verified across the required evidence levels. These observations are dated baseline inputs; writing this spec did not rerun application tests. No signed IPA, installed-device journey, provider sandbox purchase, live backend parity or App Store review was established by those local checks.

## Legacy requirement traceability

The following tables assign **all 365 existing IDs** to build/verification packages. Ranges are inclusive. Mapping does not mark a legacy row complete; use the evidence and corrected scope above. Requirements with shared behaviour reference multiple packages; no duplicate implementation is implied.

| Legacy global IDs (7) | Packages / disposition |
|---|---|
| G-001 | DEC02, C08, C15, BE02 — review/delivery policy. |
| G-002 | DEC01, C01, U01–U07, AD01–AD09 — explicit full audience scope and release manifest. |
| G-003 | DEC01, BE06, T01 — permitted trade scope. |
| G-004 | DEC02, BE01, C09, C17 — authoritative fees, credit and payment lifecycle. |
| G-005 | X04, REL05 and Foundations to preserve — current behaviour and durable parity evidence. |
| G-006 | BILL01, BILL02, BILL03 — software subscription origin and policy. |
| G-007 | T18, X08 — licensed capabilities and manual fallback. |

| Legacy auth IDs (9) | Packages |
|---|---|
| AUTH-001 | AUTH01, X01 |
| AUTH-002 | AUTH02 |
| AUTH-003 | AUTH03 |
| AUTH-004 | AUTH03, C02 |
| AUTH-005 | AUTH04, C13, C14 |
| AUTH-006 | AUTH03, BILL01, BILL02, BILL03 |
| AUTH-007 | AUTH03, X01, REL03, BE11 |
| AUTH-008 | AUTH03, REL03 |
| AUTH-009 | AUTH05, SEC01, X03 |

| Legacy core IDs (246) | Packages |
|---|---|
| CORE-001–CORE-008, CORE-010 | C01 |
| CORE-009, CORE-020–CORE-022 | C02 |
| CORE-011–CORE-019, CORE-023–CORE-028 | C03 |
| CORE-029–CORE-038 | C04 |
| CORE-039–CORE-049 | C05, C09 |
| CORE-050–CORE-051, CORE-056–CORE-061 | C06 |
| CORE-052–CORE-055, CORE-068 | C08, BE02 |
| CORE-062–CORE-067 | C07, BE01 |
| CORE-069–CORE-077 | C10 |
| CORE-078–CORE-093 | C11, C09 |
| CORE-094–CORE-103 | C12 |
| CORE-104–CORE-112, CORE-115–CORE-116 | C13, BE06 |
| CORE-113–CORE-114, CORE-117–CORE-122 | C14, BE06 |
| CORE-123–CORE-130 | C15, DEC02 |
| CORE-131–CORE-134 | C16, BE08 |
| CORE-135–CORE-146 | C17 |
| CORE-147–CORE-156 | BILL01, BILL02, BILL03 |
| CORE-157–CORE-168 | C18, BE09 |
| CORE-169–CORE-181 | C19 |
| CORE-182–CORE-194 | C20 |
| CORE-195–CORE-202 | C21, BE11 |
| CORE-203–CORE-216 | C22 |
| CORE-217–CORE-225 | C23, BE11 |
| CORE-226–CORE-235 | C24, BE10 |
| CORE-236–CORE-246 | C25 |

| Legacy trade IDs (30) | Packages |
|---|---|
| TRADE-001 | T01 |
| TRADE-002 | T02 |
| TRADE-003 | T03 |
| TRADE-004 | T04 — verify repaired authority, not a missing implementation. |
| TRADE-005 | T05 |
| TRADE-006 | T06 |
| TRADE-007 | T07 |
| TRADE-008 | T08, BE07 |
| TRADE-009 | T09 |
| TRADE-010 | T10, BE04 |
| TRADE-011–TRADE-012 | T11, BE03 |
| TRADE-013–TRADE-016 | T12 |
| TRADE-017–TRADE-019 | T13 |
| TRADE-020–TRADE-022 | T14, BE05 |
| TRADE-023 | T15 |
| TRADE-024 | C24 |
| TRADE-025–TRADE-028 | T16 |
| TRADE-029 | T17 |
| TRADE-030 | T18 |

| Legacy public IDs (25) | Packages / applicability |
|---|---|
| PUBLIC-001 | U01 |
| PUBLIC-002 | BILL01, BILL02, BILL03 |
| PUBLIC-003 | U01 |
| PUBLIC-004 | U07 — preserve implemented Support and complete relevant gaps. |
| PUBLIC-005 | SEC02, U07 |
| PUBLIC-006 | U01, U07 — browser-only cookie/tracking behaviour requires explicit applicability. |
| PUBLIC-007–PUBLIC-009 | U02 |
| PUBLIC-010 | U03 |
| PUBLIC-011 | C06, C07, C08 |
| PUBLIC-012 | U04 |
| PUBLIC-013 | U03, BE11, C08 — authenticated owner resolution is separate from token access. |
| PUBLIC-014–PUBLIC-017 | U03, T07, T09 |
| PUBLIC-018 | U05 |
| PUBLIC-019 | T17 |
| PUBLIC-020 | T03 |
| PUBLIC-021 | T05 |
| PUBLIC-022 | U06 |
| PUBLIC-023 | U04 |
| PUBLIC-024–PUBLIC-025 | U07 |

| Legacy admin IDs (14) | Packages / applicability |
|---|---|
| ADMIN-001–ADMIN-003 | AD01 |
| ADMIN-004 | AD02 |
| ADMIN-005 | AD03 |
| ADMIN-006 | AD04 |
| ADMIN-007 | AD05 |
| ADMIN-008–ADMIN-009 | AD06 |
| ADMIN-010–ADMIN-012 | AD07 |
| ADMIN-013 | AD08 |
| ADMIN-014 | AD09 — development/test fixture, not a production feature promise. |

| Legacy cross-cutting IDs (34) | Packages |
|---|---|
| X-001 | X01, C01 |
| X-002 | X01, REL03 |
| X-003 | REL03, X03 |
| X-004 | X03 |
| X-005 | X03, X04 |
| X-006 | X03, AUTH05, BILL02, SEC01 |
| X-007 | X02 |
| X-008 | X02, BE02 |
| X-009 | X01, X02 |
| X-010 | X01, BE06 |
| X-011 | BILL01, BILL02, BILL03 |
| X-012 | X02, BE01, BE03, BE04, C09 |
| X-013 | X04, BE04, T04, T10 |
| X-014 | DEC02, X02, C08, C09 |
| X-015 | X07 |
| X-016 | REL04 |
| X-017 | X05, BE08 |
| X-018 | X05 |
| X-019 | X01, X05, BE11 |
| X-020 | X07, REL02 |
| X-021 | X07, REL05 |
| X-022 | X07 |
| X-023 | X06 |
| X-024 | X04 |
| X-025 | X05, SEC03 |
| X-026 | X05, T18 |
| X-027–X-029 | X08, T18 |
| X-030 | REL03, REL05 |
| X-031 | U07, AD08, X05 |
| X-032 | U07 |
| X-033 | REL01, REL02 |
| X-034 | X08, AUTH01, AUTH05, BILL03, C23 |

Additional audit findings are explicitly included even where the historical 365 IDs did not enumerate them: SEC01/SEC02/SEC03 deletion/legal/AI consent; AUTH02 provider-mismatch recovery; BILL01–BILL03 launch-model reconciliation; C09 final/balance/inspection-cause/estimate-number drift; T02 EV questions; BE01–BE11 concrete server defects/contracts; and REL01–REL06 candidate/deployment/device/review evidence. Resolve each census page/handler to these capabilities or a documented infrastructure/development/browser disposition; a route count itself is never a missing-feature count.

## Definition of done

### Per work package

- [ ] The specified behaviour and negative cases are implemented or the current implementation is verified against current source; referenced decision/contract dependencies are recorded.
- [ ] Server authorization, field validation, pricing/delivery invariants and operation recovery are covered at the real action boundary using isolated external I/O where appropriate.
- [ ] Save/refetch/reopen/relaunch and matching web readback pass wherever persistence is involved; changed input/rates and wrong-tenant/stale-result cases pass.
- [ ] Relevant canonical local checks pass without hiding owned errors; evidence includes exact revisions, commands and test outcomes.
- [ ] Required signed-device/provider evidence passes, or an explicit reviewed applicability explanation is attached for a task that does not need it.
- [ ] An independent reviewer finds no unresolved blocker for this package; failure/review findings are fixed and the affected evidence is repeated before acceptance.

### Complete product parity

- [ ] All build/repair/extend/verify packages in this spec are accepted, and every legacy requirement has current evidence or a reviewed non-product applicability disposition. No missing native first-party feature is closed merely because a browser link exists.
- [ ] All eight audited trade hubs, supported no-hub trade access, tradie workflows, applicable customer/guest journeys and staff administration have audience-correct native completion with server authority.
- [ ] Every new drift item and backend dependency has passing contract and persistence proof; no protected operation was enabled without its prerequisites.
- [ ] The 371-entry route census is reconciled and any later web/mobile source delta reviewed. The legacy ledger reflects actual evidence, with no stale blanket status or invented percentage.
- [ ] Matched web/native end-to-end fixture journeys pass on iOS and Android for the full target, including failure/restart/provider return and cross-tenant/role cases.

### App Store release candidate

- [ ] DEC01 identifies exactly the offered audience/features/trades/storefronts and billing model; every offered package is accepted and every deferred full-parity task remains visible in the backlog.
- [ ] R01–R10 are passed for the actual candidate and exposed server surface. Any non-applicability is justified against the offered feature and current store rule; privacy/account/security obligations are not waived by feature deferral.
- [ ] The installed signed archive satisfies current submission tooling and native runtime requirements. Production-equivalent backend/provider configuration, associations, APNs, auth and supported returns are verified.
- [ ] Enabled priced workflows complete draft → correct → authoritative price → quiet-save → reopen → explicit approve/send → customer/payment/booking return → completion/payout as applicable, with durable server readback. Software purchase/restore/refund evidence is separate where offered.
- [ ] Reviewer access, realistic records, screenshots, metadata, legal/support URLs, privacy/AI disclosures, age rating and review notes match the tested app.
- [ ] Release owner has candidate validation, monitoring/support ownership and a demonstrated recovery/rollback procedure; no unresolved P0/P1 release defect remains.

Passing the candidate checklist means evidence-backed readiness for submission under the recorded scope. Apple approval is an external outcome. A scoped candidate does not close the separate complete-parity checklist.

## Open decisions

DEC01–DEC04 remain the only product/configuration decisions intentionally left open by this spec: initial release manifest and subscription offering; unresolved lifecycle/financial policy; deletion/retention authority; and factual legal/provider/configuration values and missing contract bounds. Record each decision beside its ID before enabling dependent functionality. These do not block implementing independent work and do not imply that the already-requested specification needs another scope-confirmation round.

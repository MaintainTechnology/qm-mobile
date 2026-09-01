# QuoteMax mobile completeness specification

**Audit date:** 31 August 2026. **Document state:** implementation specification, not a declaration that the app has feature parity.

## One command for the implementation LLM

Copy the following instruction into an LLM coding agent with access to both repositories:

```text
Implement C:\Users\dalig\Desktop\MaintainTech\MaintainOrg\qm-mobile\specs\web-mobile-completeness-spec.md end to end. Read the entire specification, both repositories' applicable instructions, current design tokens and existing uncommitted changes first. Refresh its route and feature inventory against the actual working trees. Preserve existing native functionality and unrelated edits. Implement every missing, partial and browser-only requirement for its authorised audience, including the necessary shared-backend contracts, in the dependency order specified. A website link, placeholder, fabricated response, client-calculated authoritative price, false Saved result, or saved record that cannot be reopened does not complete a native requirement. Do not copy unsafe or obsolete website behaviour; preserve server authority, tenant isolation, pricing provenance and all approval/source gates. Keep customer links usable without installation and keep administrator operations restricted to administrators. Record conflicts and externally blocked requirements explicitly; continue independent work rather than treating one blocker as a reason to stop the whole implementation. Verify every numbered requirement and every inventoried route/control with the required source, contract, persisted-state and iOS/Android evidence; run an independent review and fix actionable findings. Update the implementation ledger in this file as work proceeds. Do not claim complete parity while any required requirement remains missing, unverified or blocked. Do not send real customer messages, charge accounts, run production migrations, or publish/deploy/store-submit without the separately required authorisation. Finish with the changed files, verification evidence and an exact list of any remaining blockers.
```

The command is an implementation brief, not a guarantee that production credentials, source licences, owner policy decisions or store approvals are available. Those gates are identified below so an agent cannot silently bypass them. The user's request already authorises the full feature scope: do not ask again merely because an older mobile planning document excluded public or administrator surfaces. Preserve each existing audience and permission boundary.

### How to use this large specification

Read the baseline, safeguards and execution plan first. Then work through the numbered feature matrices in dependency order, consulting the corresponding page, API and control appendices as each feature is implemented. Read in bounded sections and keep the ledger current across context resets; do not drop later sections because they do not fit one context window. The appendices are completeness checklists, not instructions to copy website markup into React Native.

There are **365 numbered requirements and safeguards**. These include existing capabilities to preserve, missing/partial capabilities to implement, backend repairs and verification duties; they are not 365 missing features.

| Section | Requirement range | What to use it for |
| --- | --- | --- |
| [Decisions and safeguards](#decisions-and-safeguards-that-precede-enablement) | G-001–G-007 | Scope, source permissions, trade policy and entitlement boundaries |
| [Authentication and onboarding](#authentication-and-onboarding-requirements) | AUTH-001–AUTH-009 | Credentials, verification, complete forms, activation and continuation |
| [Public and customer journeys](#public-and-customer-requirements) | PUBLIC-001–PUBLIC-025 | Marketing, intake, quotes, payments, booking, uploads, private review and public results |
| [Administrator workflows](#administrator-requirements) | ADMIN-001–ADMIN-014 | Server-authorised tenant, catalogue, document, agent and evaluation operations |
| [Business tabs and shared workflows](#core-dashboard-and-business-feature-parity-audit) | CORE-001–CORE-246 | Daily work, account, queues, quote editing, pricing policy, billing, files, CRM and marketing |
| [Trade tools and pricing](#trade-tools-and-pricing-website-to-native-completeness-requirements) | TRADE-001–TRADE-030 | Every entitled trade, detailed fields, catalogues, recipes, estimating and design tools |
| [Cross-cutting requirements](#cross-cutting-requirements-and-backend-boundaries) | X-001–X-034 | Sessions, navigation, network, pricing authority, persistence, media and native platform behaviour |
| [Delivery order](#implementation-order-and-delivery-contract), [acceptance](#acceptance-suite) and [ledger](#implementation-ledger) | All numbered IDs | Implement, verify and resume without losing work |
| [Complete page census](#appendix-a--complete-website-page-census), [static documents](#appendix-b--static-pages-and-downloadable-references), [API census](#appendix-c--complete-route-handler-and-method-census), [website controls](#appendix-d--website-control-completeness-index) and [native reverse mapping](#appendix-e--native-to-website-comparison-and-preservation-index) | All audited source surfaces | Check that no page, small control or existing native feature disappears |

## Baseline, evidence and scope

| Item | Audited baseline |
| --- | --- |
| Website workspace | `C:\Users\dalig\Downloads\QuoteMate\quoteMate` |
| Website application (`web/` in source references) | `C:\Users\dalig\Downloads\QuoteMate\quoteMate\quotemate-automation` |
| Mobile workspace (`mobile/` in source references) | `C:\Users\dalig\Desktop\MaintainTech\MaintainOrg\qm-mobile` |
| Website revision | `4fb146beb0fed145a6b44138c28a01fc2acb34b3`, branch `codex/mobile-full-parity-backend` |
| Mobile revision | `563eb54f1dad7b0520eba46097ed6c23db113dcc`, branch `main`, **plus existing uncommitted UI and test changes** |
| User-supplied URL | [quotemax.com.au/Website](https://quotemax.com.au/Website): HTTP 404, independently checked with an HTTP HEAD request on the audit date |
| Accessible public reference | [QuoteMax homepage](https://quotemax.com.au/): publicly retrieved; signed-in and token-protected flows were audited from source, not exercised against production |
| App-router inventory | 91 website page files; 273 route handlers, of which 267 are `/api/*`; six additional redirect/calendar-download handlers |
| Additional public assets | 41 HTML documents, seven PDFs and one CSV, including interactive documentation outside App Router |
| Control census | 1,377 website and 289 native JSX control instances identified mechanically; not a count of distinct features or a parity score |
| Mobile route inventory | 20 screen route files and three layouts; substantial functionality also lives in nested tabs, sheets and feature components, so route counts are **not** parity percentages |
| Existing specifications | `mobile/specs/web-parity.md` and its review notes describe an earlier, deliberately limited milestone. Their exclusions and old test passes do not establish present completeness. This specification expands the inventory and required implementation scope. |

Source references use `web/path:line` and `mobile/path:line` with the roots above. They refer to the audited working tree, not necessarily committed files. Re-find symbols if line numbers move. Never use old README status text, a route name, a mock screenshot, a matching component name or a successful HTTP response as proof that a whole workflow works.

The audit combines a filesystem census, source tracing of pages/components/actions/contracts, comparison with current native implementations, and read-only public-site inspection. It includes small controls, conditional states, alternate quote types, historical/imported records, server-rendered detail views, provider callbacks, public static documents and administrative tools. It did **not** log in as another user, inspect production customer data, submit forms, send SMS/email, place calls, purchase a plan or publish anything. Production configuration and native device behaviour remain acceptance checks, not assumed passes.

### Status vocabulary

| Status | Meaning and implementation obligation |
| --- | --- |
| Present / Native | Native source contains this capability. Preserve it and verify its full contract and lifecycle; this is not a runtime pass. |
| Partial | Some controls, fields, states, data sources or persistence are absent or differ. Complete all enumerated deltas. |
| Browser-only / External-only | Mobile opens a website for a first-party task. A native requirement remains open until users can perform and complete it in the app. |
| Missing | No equivalent native implementation was found in the scanned sources. Build the specified surface and contracts. |
| Shared-backend dependency | A server contract, authority check or integration is missing/unsafe/insufficient. Repair or add the backend contract before enabling the native action. |
| Role-separated / Public / Admin | The capability belongs to another audience, not to every signed-in tradie. Implement its audience-correct native destination and verify the existing authority boundary. |
| Gated / Decision required | Feature, licence, entitlement, authority or product-policy gate applies. Preserve an honest unavailable state and record the blocker; do not count it as implemented live functionality. |
| Backend-only / Infrastructure | Webhook, scheduler, provider adapter or asset endpoint, not an extra app screen. Verify the corresponding user outcome without copying privileged execution into the app. |
| Unverified | Source, deployment, device or external-service evidence is insufficient. Obtain the specified evidence; do not mark complete. |

### Audience rules: nothing silently disappears

1. **Tradie and authorised team work:** all first-party dashboard tasks must be usable from native navigation, including advanced settings and all entitled trade tools. Generic “open dashboard” links do not satisfy parity.
2. **Customer and public token journeys:** implement native guest/customer counterparts for installed-app users while retaining working browser links with no installation requirement. Preserve every public action's token/role authority. Native owner previews show the same customer-visible document without silently accepting, paying or booking on the customer's behalf. Installation is optional; the native counterpart is part of the requested implementation scope (`G-002`). Retaining web access alone must never be labelled native parity.
3. **Administration:** implement an administrator workspace only for identities authorised by the server. Hiding a menu is not an authorisation check. Missing server roles or contracts are implementation dependencies, not permission to expose the operations to tradies. Any later user-approved reduction of scope must remain an explicit exclusion and prevents a claim that every website feature is native.
4. **Provider-owned flows:** Stripe checkout/Connect/portal, store purchases, OAuth and external mapping/design-provider editors may use the provider's required browser or native SDK. The app must initiate safely, explain the hand-off, validate the return, refresh the authoritative state and recover from cancellation. A provider hand-off is different from replacing a first-party editor with the whole website.
5. **Documentation and development fixtures:** keep each page in the census. Provide appropriate read-only help/doc viewing or an explicitly restricted developer/demo destination. A historical document's proposed feature is not evidence of a shipped product feature; do not invent production behaviour from diagrams or examples.

## Decisions and safeguards that precede enablement

| ID | Finding | Required resolution and proof |
| --- | --- | --- |
| G-001 | Repository guidance conflicts on automatic sending. Root `AGENTS.md` requires human approval; `docs/strategy.md` contains later per-trade exceptions, including v21 painting auto-release, and the website exposes related settings. | Record the applicable owner-approved policy per trade, origin and action before changing release/send behaviour. Preserve stricter approval protection for new native writes until resolved. Do not remove existing server guards, turn a preview/save into a send, or silently alter policy in a parity patch. A strategy change requires a new iteration and the repository's strategy review. |
| G-002 | `mobile/PRODUCT.md` and `CLAUDE.md` describe a tradie companion and web customer pages; this request explicitly expands implementation scope to every website feature, including public/customer/admin surfaces. | Follow the current user request without asking for the same scope approval again. Implement tradie work, owner previews, native guest/customer counterparts and a server-authorised administrator workspace. Keep public browser access installation-free. Record each route's audience and enforce its existing identity/capability boundary; do not turn an owner preview into customer consent or give tradies administrator powers. Update conflicting scope documentation during implementation without changing unrelated product policy. |
| G-003 | Old scope tables restrict trade expansion, while current code includes painting, solar, commercial painting, signage and air conditioning. | Mirror the current server feature catalogue and entitlements for existing features; do not add new trades or enable disabled ones based on a hardcoded mobile list. Log any required policy change separately. Test each known trade, multi-trade accounts and unknown future slugs. |
| G-004 | Marketing/native product copy says QuoteMax takes no cut, whereas payout-related copy and older economic documents discuss fees; site-visit and tier-deposit rules differ by trade. | Resolve against current server billing/quote state and owner policy. Show server fee, GST, deposit/site-visit and remaining-balance values. Do not hardcode an audit-date price, a 2% fee, a universal 30% deposit, or the same payment path for every trade. |
| G-005 | Old parity notes, pricing safety reviews and diagrams contain resolved and unresolved findings from older revisions. | Reproduce against the current baseline before marking a finding open or closed. Required regression cases include current tenant-rate changes after extraction, `include_when` truth semantics, save verification after unmount/relaunch, unpriced air-con and persisted quote identity. Focused green tests alone do not close these cases. |
| G-006 | Native store entitlements, website Stripe subscriptions and server feature gates can diverge. | Establish a server-verified entitlement reconciliation contract before treating native purchase success as access granted. Store callbacks/webhooks, receipt validation and production configuration are dependencies, not client-trusted fields. |
| G-007 | Topology has a real UI but its inspected endpoint returns a **synthetic preview**, not an operational property-analysis or approval engine. | Implement the existing preview and gate states faithfully. Do not turn fixture geometry into a quote input or enable a paid source because an API key exists. Live topology beyond current website capability is a separate gated change. |

## Public, authentication, customer-token and administrator parity audit

Date: 2026-08-31. Read-only source audit; this section defines implementation work and does not implement it.

### Scope, evidence and interpretation

Web root (web/): C:/Users/dalig/Downloads/QuoteMate/quoteMate/quotemate-automation.
Mobile root (mobile/): C:/Users/dalig/Desktop/MaintainTech/MaintainOrg/qm-mobile.
Outer repository (repo/): C:/Users/dalig/Downloads/QuoteMate/quoteMate.

This section covers 74 of the 91 App Router pages in Appendix A: every page except the 17 /dashboard pages. It also inventories the public /r, /s, unsubscribe and calendar response routes and the shared owner editor used by both public quotes and the dashboard. CORE covers the dashboard document editor, CRM, business account, billing, marketing management, calendar and file-management interfaces. TRADE covers authenticated trade tools. The appendices and X requirements cover the complete API/static-asset census and infrastructure.

Evidence is current source, not a successful production end-to-end run. The audit verified that https://quotemax.com.au/Website returns HTTP 404 with X-Matched-Path /404; the apex site and checked-out source are the baseline. No real customer token was opened, no auth bypass attempted, and no upload, send, provisioning, subscription, payment, agent run or admin mutation was executed. Some server-rendered GETs trigger tracking, preview generation, provider repairs or checkout creation; source reading intentionally avoids those effects.

Status vocabulary:
- NATIVE-PARTIAL: a native implementation exists but loses controls, states, fields or semantics.
- BROWSER-HANDOFF: native delegates a QuoteMax task to a browser; this is not native functional parity.
- NATIVE-MISSING: no native equivalent or route was found.
- WEB-RETAINED: public content or a customer capability flow must remain usable in a normal phone browser without installing or signing into the tradie app. The requested native equivalent is also required and must preserve the same audience/capability boundaries without removing the browser path.
- PROVIDER-HANDOFF: legitimate provider-controlled Checkout, Stripe Connect, OAuth, OS SMS/call/calendar or external map/document action. Native must own launch, error, cancellation and authenticated return/reconciliation.
- CONTRACT-GATE: existing source has a missing read contract, security/governance dependency, incomplete state proof, placeholder content or another issue that prevents simply copying the UI.
- DOCUMENTATION/DEMO: reference material or a harness, not proof of a working production feature.

Native baseline evidence used throughout:
- N1: mobile/src/app/_layout.tsx:79 registers the Expo stack; mobile/src/app/(tabs)/_layout.tsx:19 redirects signed-out users and :28 defines the five tradie tabs. The complete mobile/src/app file census has no public /q, /r, /m, /p, /solar, /t, /book, /upload, /share, /studio, /admin, /docs or legal routes.
- N2: mobile/src/features/quotes/QuoteDetailModal.tsx:370 constructs a generic deposit path; :375 opens the customer page; :380 opens the web document editor; :383 opens a PDF URL; :388 shares a URL. mobile/src/features/trades/hub/LinkOut.tsx:15 is a plain Linking.openURL wrapper, not an authenticated native detail screen.
- N3: mobile/src/features/menu/MenuScreen.tsx:36 hardcodes the homepage as SUPPORT_URL, and :241-247 exposes Help & support through that generic browser link.
- N4: mobile/src/features/trades/tools/tools-api.ts:198 chooses /p/{estimate_token}, :199 falls back to /q/paint/{public_token}; :205-207 chooses /q/roof/{public_token}?full=1 before /m/{measure_token}. RoofingSavedJobs.tsx:53 and PaintingSavedJobs.tsx:54 open those browser paths.
- N5: mobile/src/features/trades/tools/SolarTools.tsx:138 opens /q/solar/{token}, :140 opens Felt, and :172 offers Open solar on the web. There is no native solar public/customer detail flow.
- N6: mobile/app.json:8 declares the quotemax scheme. The file contains no iOS associatedDomains or Android HTTPS intentFilters. mobile/src/features/auth/SignInScreen.tsx:98 and :127 replace navigation with / after authentication, losing an external destination.
- N7: mobile/src/features/auth/SignUpScreen.tsx:136 reads only resume and uid route parameters, :267 validates invitation codes with channel web, and mobile/src/features/auth/onboard-fields.ts:207 accepts only clerkUserId and invitationCode as payload options.

All N1-N7 references are source findings, not an assertion that operating-system associations, production provider settings or database migrations were inspected live.

### Non-negotiable audience and safety rules

1. A normal tradie is not a QuoteMax administrator. Native admin navigation and every admin API action require an independently server-confirmed admin role. Never derive it from possession of a tenant, a UI flag, local storage, a deep-link parameter or a pricing plan.
2. Customer links remain web usable. Implement native owner previews and the requested customer/guest counterparts with their distinct capabilities; a quote, booking, upload, acceptance, unsubscribe or franchisee photo request must still work without an app install or Clerk account. An owner preview never confers customer-consent authority.
3. Public share tokens, private roofing measure tokens, private painting estimate tokens, signup intent tokens and authentication/session tokens are different capabilities. Do not substitute or expose one in another URL, share sheet, log or analytics event.
4. Public quote display, tradie review, customer acceptance, notification delivery, payment settlement and appointment booking are separate states. A successful request, a redirect or a released_at timestamp is not proof of SMS delivery or payment.
5. Currency remains server-authoritative. Keep ex-GST stored amounts, conditional GST, inc-GST customer labels, selected tier, discounts, recorded deposit percentage, indicative versus firm classification, historical paid amounts and price-hold gates. Do not generate a client price when the server has none.
6. Do not generalise all trades to one payment funnel. The source currently has $99 site-visit funnels, real tier deposits, read-only estimates and contact-to-accept tenders. See PUBLIC-012.
7. Root AGENTS.md still says no fourth trade and no automatic quote sends; repo/docs/strategy.md has later decisions, including v9 trade expansion, v11 commercial paint, v12 solar release, v19/v20 visit-first flows and v21 residential painting auto-send. Specifically repo/docs/strategy.md:1457 introduces v21 and :1493 records painting release-at-draft. This is a governance reconciliation gate, not permission to remove current safeguards or invent a uniform no-auto-send rule. New native send controls must reflect the approved per-trade decision after the documents are reconciled.

### Authentication and onboarding requirements

#### AUTH-001 — Sign-in and provider coexistence

Status: NATIVE-PARTIAL + CONTRACT-GATE. Audience: tradie and separately entitled administrator.

Web baseline: web/app/sign-in/[[...sign-in]]/page.tsx:47 mounts Clerk SignIn with dashboard fallback; web/app/signin/page.tsx:21 only reads redirectTo and :25 validates an internal path before redirecting to the Clerk route. web/app/AuthNav.tsx:25 resolves Clerk and legacy Supabase sessions; :64 signs both out. /signup, /signup/verify, /forgot-password and /auth/* remain Supabase paths, while /sign-up is the current custom Clerk path.

Native: mobile/src/features/auth/SignInScreen.tsx:49 uses Clerk. :64 supports an email-code device-trust factor, :97 activates a completed session and :103 sends every unsupported status to a “Sign in on the web first” dead end. N6 shows return intent is lost.

Required controls/states:
- Email/password, show/hide password, loading, invalid credentials, network retry and stale-session recovery.
- Required factor selection and entry for the factors actually enabled in Clerk. The source proves email-code device trust exists; it does not prove SMS/TOTP/recovery-code/social/passkey factors are enabled in the production Clerk instance.
- OTP entry, paste/autofill, resend cooldown, expired/incorrect code, back/change-account, explicit session completion and resume destination.
- A migration-aware experience for legacy Supabase accounts. Do not create a second unrelated tenant or reset the wrong identity provider.

Contract readiness: Clerk SDK sign-in is available; production factor configuration and legacy account-link coverage are not verified. The native response state machine must be based on configured Clerk statuses and current SDK contracts, not on a fixed “complete or device trust” assumption.

Acceptance:
- Sign in with a current Clerk account, legacy-linked account, duplicate-email account and every enabled factor in non-production fixtures.
- No unsupported-factor message leaves a user believing a browser sign-in automatically authenticated the app.
- Preserve a validated owner deep link through factor entry and cancellation; refresh permissions after account switch.
- Treat tenant-not-found differently from timeout, 401, 403 and 5xx; do not restart onboarding for general lookup failures.

#### AUTH-002 — Password recovery and account credentials

Status: BROWSER-HANDOFF + CONTRACT-GATE.

Web: web/app/forgot-password/page.tsx:33 calls Supabase resetPasswordForEmail with /auth/reset-password; web/app/auth/reset-password/page.tsx:78 resolves the recovery session, :100 checks confirmation and :112 updates Supabase credentials. It supports code, token_hash and implicit legacy callbacks. The current Clerk sign-in widget has its own provider flow.

Native: mobile/src/features/auth/SignInScreen.tsx:209 opens https://www.quotemax.com.au/forgot-password from a Clerk login. That page does not reset a Clerk-only password. mobile/src/features/sections/AccountScreen.tsx:112 also delegates password changes to the web dashboard.

Required: a native recovery entry matched to the account provider; email submission with a non-enumerating response; recovery-code/link handling; new password plus confirmation; validation and expired-link states; successful credential change followed by safe sign-in and return-intent recovery. Preserve legacy recovery URLs for legacy accounts during migration.

Contract readiness: provider-specific contracts exist, but a provider-routing/account-migration decision is required. Do not infer provider from a public email lookup or leak whether an account exists.

Acceptance: recover a Clerk-only account entirely through the supported Clerk flow; recover a legacy account without altering another provider; test invalid/used/expired recovery links, mismatched confirmation, app killed during recovery and another account already signed in. No success state before the provider confirms the change.

#### AUTH-003 — Signup credentials, verification and duplicate identity

Status: NATIVE-PARTIAL.

Web Clerk signup controls: web/app/sign-up/[[...sign-up]]/page.tsx:410 business name, :422 first name, :434 email, :445 mobile and :459 password; :309 sends email code, :329 verifies it, and :198 proves an existing email through sign-in before selecting resume or active-account behavior. SMS intent can lock the verified mobile at :85. The legacy web/app/signup/page.tsx:104 calls /api/auth/signup and :132 signs into Supabase; /signup/verify provides SMS OTP entry/resend/paste/backspace handling.

Native: mobile/src/features/auth/SignUpScreen.tsx:223 validates the step, :348 handles duplicate email, :419 creates a Clerk signup, :456 verifies email, :500 resends and :540 switches account. This is substantive partial parity, not a missing signup.

Gaps/tasks:
- Preserve source campaign, invitation, plan/interval and verified intent fields across creation, verification, restart and duplicate-account resume (AUTH-006).
- Align maximum lengths and canonical server validation rather than only local minimums. Keep optional mobile behavior from activation; the two existing web signup entrypoints disagree on requiring it, so acquisition copy and validation need an explicit shared contract.
- Keep verification status and identity proof separate from business activation. Do not automatically overwrite a business because the typed email matches it.
- Avoid rendering an active session into the main tabs before activation results are handled; allow a meaningful back/cancel/account-switch path.
- Retain provider-specific legacy callback entrypoints while migrating acquisition links from /signup to /sign-up deliberately.

Acceptance: current verification, resend throttle, expired/invalid code, duplicate account with wrong password, duplicate account with complete tenant, duplicate account with clean 404 tenant and a transient tenant outage; process death at each stage; no password/OTP persisted in URLs or query caches.

#### AUTH-004 — Activation identity proof and provisioning lifecycle

Status: NATIVE-PARTIAL + CONTRACT-GATE. This is backend work required before claiming safe parity.

Web: web/app/api/onboard/activate/route.ts:48 parses a request; :74 validates invitation code; :96 accepts form.owner_user_id, :105 accepts form.clerk_user_id, :127 exempts a supplied intent_token from unresolved-owner rejection; :146 inserts a service-role tenant. No bearer/session resolution is present in that handler. Its comments describe linkage, not proof that the supplied identity belongs to the caller. Native sends a bearer at mobile/src/features/auth/SignUpScreen.tsx:284, but a header unused by the server provides no protection.

Required contract:
- Authenticate ordinary activation and derive/verify identity from the session; bind any legacy owner ID to the authenticated provider mapping.
- A legitimate SMS-first path must validate the signed/unguessable intent, its verified phone, status, expiry, invitation and one-time consumption before creating or linking an account. A nonempty intent string must not be treated as identity proof.
- Preserve idempotent activation and retry behavior. Repeated requests after network loss must resolve the same tenant rather than creating more tenants or purchasing more numbers.
- Keep field errors, required-step failure, incomplete provisioning, stub/live distinction, warning detail and retry capability explicit. An HTTP 200 with a warning is not a fully operational tenant.
- Do not send a test/welcome message or buy a number from the audit/test environment without a separate fixture/provider plan.

Source provisioning states: web/app/api/onboard/activate/route.ts:199 pricing rows; :266 required-step failure; :353 invitation consumption; :375 intent consumption; :424 provisioning failure; web/app/admin/tenants/page.tsx:148 distinguishes live from stub. Native mobile/src/features/auth/SuccessScreen.tsx:88 retries provisioning and :115 activates the pending Clerk session for dashboard entry.

Acceptance: forged IDs/intent fail before service-role writes; authenticated identity cannot claim another email/tenant; missing/revoked/exhausted code fails without partial live resources; repeat/retry is remount-safe and idempotent; genuine SMS intent retains verified provenance; failed provisioning remains incomplete with a retry explanation.

#### AUTH-005 — Full business onboarding fields and exact numeric semantics

Status: NATIVE-PARTIAL + CONTRACT-GATE for numeric loss and authoritative readiness.

Web: web/app/onboard/page.tsx:398 loads /api/onboard/trades, :724 contact name, :734 website, :745 address autocomplete, :770 trades, :795 optional mobile, :809 optional state, :820 ABN, :868 licence body, :884 licence number, :893 licence expiry; :945-1012 labour fields; :1039-1074 painting model/rates; :1108 roofing rates; :1133 GST; :1156 default availability; :1169 review. Logo selection begins :1446, upload :1483; PNG/JPEG/WebP/SVG, 2 MB maximum, remove/replace allowed.

Native: mobile/src/features/auth/SignUpScreen.tsx:66 hardcodes four trade options; mobile/src/features/auth/onboard-fields.ts:136 lacks logo/default-availability/intent fields; :224-245 maps pricing values. It has core business/contact/trade/licence and trade-rate fields but plain-text address, no logo picker, no weekly availability editor and no readiness fetch.

Field acceptance contract from web/lib/onboard/schema.ts:54:
- business name 2-80; first name 1-40; optional last name max40; email max120; optional mobile validates Australian format when supplied.
- Trades 1-4 from electrical/plumbing/painting/roofing in the current activation schema; optional AU state. ABN optional max20; licence body max20, number max40, expiry carried. Do not widen trades merely because marketing and admin list additional modules.
- Contact name max80, website max200 and validated format, business address max200, logo URL max500/path max300.
- Labour hourly/call-out positive and required with markup for electrical/plumbing; markup 0-100. Optional apprentice/senior nonnegative, after-hours multiplier 1-3, minimum labour 0-8 hours, risk 0-100.
- Painting sqm/hourly selection; walls/ceilings/trim/exterior positive <=200, painting call-out 0-5000, hourly positive <=2000.
- Seven roofing material rates positive <=500 when supplied; unsupported/blank material must remain unavailable, not become a free job.
- GST boolean and server AvailabilitySchema; if omitted the server supplies its state-timezone working-week default rather than a user-chosen calendar.

Concrete defect: mobile/src/features/auth/onboard-fields.ts:127 returns undefined for every numeric zero, while the server permits zero for markup, apprentice/senior, risk, minimum hours and painting call-out. This can reject a valid zero markup as missing or silently restore nonzero defaults. Blank, valid zero, invalid text and positive-only fields must be parsed differently; negative/junk must surface field errors rather than become valid money.

Required native controls: owner identity summary; optional logo upload/remove; address suggestions with manual fallback; readiness-aware trade selection; optional state/mobile; licence fields appropriate to selected trade/state; conditional pricing panels; correct zero-preserving numeric keyboards; default weekly availability/timezone; full review with edit-back links; validation focus and server error-to-step mapping.

Acceptance: field-by-field round trip against the shared schema, including zero and blank, supplied-invalid ABN/mobile/website, max bounds, multi-trade conditional requirements, no ready trades, readiness outage and timezone transition. Do not require an ABN or mobile where activation permits omission. Refetch stored tenant/pricing/availability after activation to prove what was saved.

#### AUTH-006 — Invitation, SMS onboarding and plan acquisition continuity

Status: NATIVE-MISSING for intent continuity; existing code entry is NATIVE-PARTIAL.

Web: web/app/sign-up/[[...sign-up]]/page.tsx:101 resolves /api/onboard/intent/{token}; web/app/onboard/page.tsx:185 retains intent, :201 invitation and locked-code state, :542 validates with channel sms for a locked SMS flow, and :562 auto-checks it. web/app/_components/PricingTiers.tsx:129 retains plan and interval then sends signed-out users to signup; /s/{shortCode} can be a signup/referral entry (PUBLIC-007).

Native N7 loses intent/code/plan/interval/referral state and always classifies validation as web.

Required: one typed acquisition envelope with a validated internal return target; separate invitation code, intent token, source/referral and selected plan/interval. Resolve SMS intent server-side, display verified phone read-only when required, retain it through auth and activation, and consume once. Do not accept a client-supplied phone as proof of the inbound SMS owner. Readiness/plan gating remains server-authoritative.

Acceptance: web pricing to native signup to verification to activation retains plan; app-not-installed path remains web; valid/expired/used SMS intent, paused/revoked/exhausted code and code changed during signup get accurate errors; quota is consumed only once; no SMS-origin code is incorrectly treated as a web code.

#### AUTH-007 — Deep links and authenticated return intent

Status: NATIVE-MISSING + CONTRACT-GATE.

Web destinations include /q/{token}/approve, /q/{token}?edit=1, /dashboard/quote/{token}, private /m and /p, campaign signup and provider return routes. web/app/q/[token]/TradieEditor.tsx:244 preserves redirectTo correctly. web/app/q/[token]/approve/ApproveAction.tsx:108 instead constructs /signin?next=..., while web/app/signin/page.tsx:21 reads redirectTo only: this is a concrete existing return-link mismatch to fix, not copy.

Native N1/N6 lacks HTTPS associations and a token/audience route resolver. A generic quotemax scheme alone is insufficient for an HTTPS SMS/email link. Sign-in and the auth layout replace the destination with home.

Required routing table:
- Validated owner edit/approve/private-review links: retain intent through sign-in and biometric lock, verify server ownership/role, then open the native task.
- Public customer q/book/upload/share/studio/quote-request links: work without authentication or installation and have required native counterparts using the same audience and token capability. A signed-in tradie session does not expand a customer's capability or replace customer consent.
- Admin links: separate admin check, fail closed for ordinary tradie sessions.
- Signup/referral/intent links: AUTH-006.
- Provider return/cancel links: AUTH-008/PUBLIC-012.
- Invalid/unknown/expired links: clear recovery page, safe back/home, no leakage of token or account data.

Contract readiness: OS-associated HTTPS domains/intent filters and website association files need verification/configuration; there is no audited universal resolver that turns each public token into a safe owner-native entity. Define a server-scoped resolve/read endpoint where needed. Never exchange a web browser cookie for native auth by passing a long-lived token in a URL.

Acceptance: cold/warm/terminated app, already signed in as correct/wrong user, locked app, token revoked, provider callback delayed, multiple links and external redirect attempts. Verify accepted hosts and paths; reject protocol-relative/external return targets.

#### AUTH-008 — Success, check-email and Stripe Connect return adapters

Status: NATIVE-PARTIAL + PROVIDER-HANDOFF.

Web /onboard/check-email supports email resend/cooldown; /onboard/success shows business, dedicated number, provisioning steps, warnings, retry and dashboard, with an owner-test SMS body. Native mobile/src/features/auth/SuccessScreen.tsx:46 reads result query parameters, :88 retries, :115 activates session, :172 opens SMS but does not carry the web test body. Both need honest pending/error states.

Web /onboard/stripe/refresh calls /api/stripe/connect/start at web/app/onboard/stripe/refresh/page.tsx:33; /onboard/stripe/return is an informational adapter at :55 that points to dashboard payouts. Native mobile/src/features/sections/PayoutsScreen.tsx:129 already requests Connect start. This external provider UI is legitimate; a browser landing on the web dashboard without native reconciliation is incomplete.

Required: source-specific confirmation status; resend/retry without duplicate provisioning; exact trusted dedicated number; native SMS launch with explicit user action and correct message purpose; provider cancellation/error/return handling; refresh payouts from the server after return. Do not mark KYC/payouts enabled merely because a return URL loaded.

Acceptance: email resend rate limit, failed step retry, missing number, stub number, complete activation with a still-pending Clerk session, app killed between provisioning and dashboard entry, Connect refresh link expiry, incomplete verification and account switch during provider handoff.

#### AUTH-009 — Account/session UI and biometric boundary

Status: NATIVE-PARTIAL. CORE owns business profile fields; the X requirements cover session/cache/push infrastructure.

Web /account is a Clerk account probe, not the full dashboard business settings: web/app/account/page.tsx:21 calls currentUser and redirects signed-out visitors, then displays identity and UserButton. Clerk UserButton can expose provider account/session controls depending on configuration; that configuration was not exercised.

Native mobile/src/features/sections/AccountScreen.tsx:59 exposes biometric lock and :112 sends deeper credential tasks to the web. mobile/src/features/auth/BiometricGate.tsx:7 explicitly identifies Clerk as the security boundary; :85 shares sign-out cleanup, :95 gates the overlay. Root mobile layout :80 preserves underlying navigation while locked.

Required: distinguish business-profile editing from provider identity/email/password/factor/session management. Provide native supported credential/session controls or a deliberate authenticated provider-managed account journey with return, rather than a generic dashboard link. Biometric privacy lock must never be used as server authorization or admin proof.

Acceptance: biometric enable requires successful authentication; cancel/retry/unavailable-device behavior remains accessible; sign-out completes server/native cleanup and clears owner/admin data; changing account cannot restore the previous user's deep link without reauthorization. The X infrastructure acceptance criteria govern push registration and cached-query retirement.

### Public and customer requirements

#### PUBLIC-001 — Acquisition homepage and trade landing content

Status: NATIVE-MISSING + WEB-RETAINED. Audience: prospective tradie/public; signed-in visitors get dashboard-aware CTAs.

Web controls/content: web/app/page.tsx:53 composes hero, how it works, trade carousel, outcome/stat sections, pricing, FAQ, closing signup, app-download teaser, testimonials and contact. Hero is at :97, how-it-works :396, trade section :497, FAQ :679 and app-download :767. web/app/_components/site.tsx:18 navigation links to how/pricing/FAQ/contact and the trades menu; :67 footer includes product, trades, account/documentation and legal links. web/app/AuthNav.tsx:95 distinguishes compact navigation, hero CTA and account/session states.

Five trade pages are data-driven wrappers around web/app/trades/_template.tsx:32 and web/app/trades/_data.ts:27-29: electrical, plumbing, roofing, solar and painting. Each has trade-specific hero/problem, examples of auto-quote versus inspection work, process, benefits, signup, pricing and cross-trade links. They are not five separate quoting engines. The examples are marketing content, not authorization to add a new native trade or price from an example.

Carousel controls: web/app/_components/TradeCarousel.tsx provides previous, next, slide selectors and pause/resume; timed progress pauses for hover/focus, and reduced-motion users are not forced through animation. FAQ disclosure state must remain operable with keyboard and screen readers.

Native evidence: N1/N3; native WelcomeScreen is a concise welcome/auth screen and does not contain this help/product information. Do not label a generic homepage link as native content parity.

Required: a discoverable native About/How it works/trade capability reference using approved source content, sensible native sections and real signup/account destinations; preserve the complete website acquisition flow. Native need not reproduce decorative marketing motion, desktop navigation or repeated landing-page CTA blocks.

Content gates: web/app/_components/Testimonials.tsx:22 marks testimonials as PLACEHOLDER; no invented person/outcome may become a production endorsement. web/app/page.tsx:816 disables store badges as coming soon. Do not create fake App Store/Play Store links. Native/product plan claims and marketing trade scope require reconciliation with current billing and strategy.

Acceptance: every substantive landing section and outbound action has an explicit destination; active/signed-out CTAs behave correctly; carousel can pause and respects reduced motion; noninteractive sample quote/phone imagery is identified as illustrative; no disabled teaser masquerades as a working install button.

#### PUBLIC-002 — Pricing, plan comparison and acquisition-to-checkout

Status: NATIVE-PARTIAL via CORE billing; NATIVE-MISSING for acquisition continuity; PROVIDER-HANDOFF for Stripe.

Source: web/app/pricing/page.tsx and web/app/_components/PricingTiers.tsx:28 default to annual billing; :73 computes effective monthly annual price, :78 saving, :129 persists plan intent, :143 posts /api/billing/checkout with bearer and {plan, interval}. A returned url opens Stripe; an updated subscription routes to dashboard billing; missing tenant goes through signup. web/app/_components/pricing-data.ts:27 defines Starter 49/month or 490/year, Pro 129/1290, Crew 299/2990, AUD ex GST; :102 limits the 14-day free trial to Starter monthly in the current data.

Controls/content: monthly/annual toggle; Starter/Pro/Crew cards, feature lists, selected plan CTA and busy/error states; comparison rows for channels, monthly quote fair-use, voice minutes, numbers, trades, seats, draft/preview/deposit features, estimator modules, branding, support and overage; expandable plan FAQs; signup/contact links. Keep all plan-specific button labels and trial eligibility tied to authoritative data. Do not hardcode Crew 249 from mobile/PRODUCT.md:31; that document explicitly says re-check the facts.

Current comparison values from web/app/_components/pricing-data.ts:109 (content baseline, not proof of live provider entitlement):

| Feature | Starter | Pro | Crew |
| --- | --- | --- | --- |
| Channels | SMS / WhatsApp | SMS + Voice | SMS + Voice |
| Quotes per month | ~40 fair use | ~150 fair use | ~400 fair use |
| Voice minutes per month | Add-on | 300 | 1,000 |
| Dedicated AU numbers | 1 | 1 | Up to 3 |
| Trades | 1 | Up to 2 | Up to 4 |
| Dashboard seats | 1 | 2 | 5 |
| Drafted quotes, preview/sample images, deposit collection | Included | Included | Included |
| Specialised solar/roof/paint estimators | None | 1 module | All |
| Quote-page branding | Logo | Full brand | Full brand + custom domain |
| Support | Email | Priority | Priority + onboarding call |
| Extra voice minutes | Unavailable/not specified | A$0.50 per minute | A$0.40 per minute |

Native evidence: N7 loses selected acquisition plan; CORE owns mobile/src/features/sections/BillingScreen.tsx. Its existing billing controls do not replace pre-auth pricing/plan selection.

Contract readiness: checkout JSON exists and provider session URL is legitimate; a single plan-catalogue DTO/shared configuration is needed to avoid acquisition, billing and documentation drift. Stripe price/feature availability was not queried live.

Acceptance: annual/monthly selection survives signup; correct plan/interval reaches the server; trial claims match server eligibility; no client-generated price controls the charge; cancellations and already-subscribed updates reconcile from the server; billing-feature comparison labels are accessible at narrow widths.

#### PUBLIC-003 — Watch/demo page, content readiness and truthful CTA

Status: NATIVE-MISSING + CONTRACT-GATE + WEB-RETAINED.

Source: web/app/watch/page.tsx:34 defines VIDEO_SRC as empty; :35 has no poster, and :38 defines BOOKING_HREF as /signup. Page sections include video placeholder, chapter overview (:180), benefits (:233), ROI explanation (:295), objections (:348), go-live steps (:399), closing CTA (:447) and sticky CTA (:477). The actual CTA at :492 says Book a call but opens signup, not a calendar.

Required: a native discoverable demo/help presentation and a working accessible media player only when an approved asset, captions/transcript and poster exist. Chapter copy is currently static explanatory content, not proof of a playable chapter-seek API. Do not fabricate media or booking availability.

Acceptance: no fake play control when no video exists; agreed CTA copy and actual destination match; available media supports pause/resume, sound controls, captions, background interruption and reduced motion. Until content is supplied, mark the media capability pending with honest placeholder copy; website remains readable.

#### PUBLIC-004 — Contact and support form

Status: BROWSER-HANDOFF + NATIVE-PARTIAL + CONTRACT-GATE. Audience: prospect/tradie; no account required.

Web source: web/app/_components/ContactForm.tsx:21 topics General enquiry, Pricing and plans, My trade is not listed, Partnership and Something else; :56 posts /api/contact. Inputs at :124 name required <=100, :136 email required <=200, :151 optional phone <=40, :163 topic, :180 message 10-4000; :198 company honeypot. On failure focus the error; success replaces the form with a receipt message. Contact is an anchor/section, not a missing /contact page.

API: web/app/api/contact/route.ts validates JSON, email and bounds, silently accepts honeypot submissions without sending, applies an IP limit (five/hour in source), and returns validation, throttling, missing-delivery-configuration and provider failures. Do not embed provider credentials.

Native N3 opens the homepage without focusing contact or providing the form.

Required: native Help & support with the same fields, explicit optional labels, topic selector, accessible submission state, retry preserving text and honest sent confirmation. Topic/support links should point to real approved addresses. User must explicitly press Send; this audit sends nothing.

Acceptance: empty/invalid/long fields, rate limit, offline, provider failure and successful non-production receipt; prevent duplicate taps; preserve draft across keyboard dismissal and return from legal/help links; never show sent on a failed API result.

#### PUBLIC-005 — Terms, privacy and cookie policy

Status: NATIVE-MISSING + WEB-RETAINED + CONTRACT-GATE for content approval.

Routes: /legal/terms, /legal/privacy, /legal/cookies. Shared web/app/legal/_components/LegalShell.tsx provides title/update stamp, section contents anchors and links among policies. Terms covers service/account use, quotes/payments, acceptable use, IP, liability, termination and jurisdiction. Privacy covers collected data, use/disclosure/storage/overseas processing, access/correction, complaints and changes. Cookie policy covers essential storage, third parties and management. Policies link to configured contact email and relevant external authority information; these are legal content, not client-side legal advice.

Critical content gate: web/app/legal/_components/company.ts:10 legal name, :14 ABN, :16 address, :18 privacy email and :20 support email are explicit template placeholders. The source asks for company details and legal review. Do not publish these as complete policy data or invent legal identity.

Native evidence: N1/N3; no policy route or discoverable versioned policy viewer exists.

Required: complete, reviewed source policies reachable before signup and from native settings/help; native reader with selectable text, meaningful headings/TOC, long-text scrolling, external links and current version/date. Keep accessible web URLs for customers and provider/store disclosures. If consent is legally required, record the approved version and choice through a real contract rather than inventing a checkbox.

Acceptance: approved legal details replace placeholders everywhere; internal section navigation and privacy/support links work; large text and screen reader reading order remain usable; offline/cached versions are labelled; native privacy/permission statements match actual SDK collection under the X requirements.

#### PUBLIC-006 — Cookie choices, marketing navigation and web theme

Status: WEB-RETAINED; native equivalent depends on actual collection, not cookie-banner cloning.

Web source: web/app/_components/CookieConsent.tsx offers accept, reject and details, persists choice locally and dismisses the banner. Policy source says essential-only/no advertising analytics; do not add analytics because a banner exists. web/app/_components/MobileNav.tsx opens/closes the mobile menu, handles escape/backdrop and scroll lock. web/app/layout.tsx:42 sets en-AU and :70 restores qm-theme, defaulting to light; quote pages separately persist qm-quote-theme in QuoteChrome.tsx:49.

Native mobile/src/lib/useTheme.tsx and MenuScreen already support System/Charcoal/Paper; N1/N3 show there is no native help/privacy content. A mobile app should expose meaningful privacy preferences matching its own telemetry/permissions, not replicate browser cookie mechanics without purpose.

Required: preserve web menu/search-free link organization, selected theme and consent choices; native policies and permission explanation belong in settings/help, with any telemetry controls defined from real infrastructure. Do not merge browser theme/local consent with another user's tenant data.

Acceptance: accepted/rejected choices survive browser reload, storage-unavailable mode remains usable, no nonessential tracking starts before applicable consent, menu/focus/modal reading order is accessible and quote-page theme/PDF choice matches the selected view. The X requirements cover SDK/push privacy inventory.

#### PUBLIC-007 — Branded public intake, start links and QR redirects

Status: NATIVE-MISSING + WEB-RETAINED; OS SMS launch is PROVIDER-HANDOFF.

Routes/controls:
- /start/{tenantId}: web/app/start/[tenantId]/page.tsx:25 validates the tenant identifier, :29 resolves the tenant; shows business identity and dedicated number with an SMS entry action at :70. It is a lightweight start page, not a quote form.
- /t/{slug}: web/app/t/[slug]/page.tsx:59 resolves the tenant slug and :64 rejects an inactive tenant; capability-filtered services and branded profile/lead content. web/app/t/[slug]/LeadForm.tsx:115 toggles optional service selection; :133 selects up to five photos; :151 description; :164 optional name; :168 optional suburb; :174 required Australian mobile; :187 honeypot; :65 submits multipart /api/t/{slug}/lead.
- /s/{shortCode}: web/app/s/[shortCode]/route.ts:36 resolves a case-insensitive code, :42 redirects unknown/archived to home, :45 renders paused notice, :58 records scan asynchronously; :78 redirects landing/signup; :88 returns an SMS launch interstitial with manual fallback.
- web/lib/marketing/qr.ts:67 destinations are landing /t/{slug}?qr=..., signup with ref attribution (:72) or SMS with optional encoded prefill (:75). No destination is permission to silently send a message.

Validation: web/app/api/t/[slug]/lead/route.ts:20 max five JPEG/PNG/WebP photos, 5 MB each; :99 mobile validation, :105 at least one photo, :127 rate limit and :148 upload error. Preserve field and image attribution/tenant routing. An unavailable service must not be invented.

Native N1 lacks entry or customer intake; CORE covers owner creation of branded sites/QRs.

Required: keep branded phone-browser intake and implement its native equivalent without adding auth requirements; owner native marketing tools generate and preview the correct public links. Preserve signup referral/intent under AUTH-006. Native SMS/call actions require a visible user gesture and failure handling.

Acceptance: unknown/suspended tenant, unknown/paused/archived QR, each destination type, missing SMS number, image permissions/type/size/count, mobile validation, selected service, upload failure/retry and duplicate submit. Scan tracking failure cannot strand the consumer. Do not log the full private capability in analytics.

#### PUBLIC-008 — Customer quote-request forms and legacy paint request

Status: NATIVE-MISSING + WEB-RETAINED. These are customer capabilities, not authenticated owner estimators.

Source: web/app/quote-request/[token]/page.tsx:35 reads trade_lead_requests; expired/invalid/already-submitted links produce a dead end rather than a second estimate. web/app/quote-request/[token]/QuoteRequestForm.tsx:130 uploads photos; :187 submits the form. web/lib/quote-request/fields.ts:18 lists electrical/plumbing/roofing/painting. Each branch uses its existing server schema, not a new client-selected trade.

Shared fields/actions: address autocomplete with manual fallback, postcode, AU state, optional first name <=80, best contact time (anytime/morning/afternoon/evening), optional notes <=1000, up to five optional photos uploaded separately, submit/progress/error and truthful routed/texted completion state.

Trade variants:
- Roofing: full_reroof/patch_repair/leak_trace/gutter_replace; material family colorbond/concrete_tile/terracotta_tile/cement_sheet/unknown; if colorbond, corrugated/trimdek/spandek/kliplok wire values; pitch shallow/standard/steep/very_steep/unknown; storeys 1/2/3. UI explains inspection-triggering answers. Storeys declaration is recorded context, not a replacement for measured roof geometry.
- Painting: walls/ceilings/trim/exterior multi-select; 1/2/3 coats; sound/minor/bare/poor condition; standard/high/extra_high/raked ceiling; storeys; colour-change boolean; optional positive manual floor area <=2000 m² (web/lib/painting/request-schema.ts:51). Rates remain owner-book values, never customer-specified prices.
- Electrical: downlights/power_points/ceiling_fans/other; integer quantity 1-200 when provided; flat/raked/high/unknown ceiling; storeys; existing switch within 5 m yes/no/unsure.
- Plumbing: hot_water/blocked_drain/tap/toilet/other; hot-water gas/electric/unsure required for that job; optional integer capacity 10-1000 L; indoor/outdoor/unsure location.

Contract evidence: web/lib/quote-request/schema.ts:57 shared fields, :67 roofing, :72 electrical, :81 plumbing; :90 requires hot-water energy while allowing unsure. POST web/app/api/quote-request/[token]/route.ts:123 rejects replay, :137 validates by stored trade, :145 conditionally claims pending->submitted and :158 has a failure rollback path. API issues must map to the correct field; inspected source indicates new generic flow deliberately hardens the old paint-only behavior.

Legacy /paint-request/{token}: web/app/paint-request/[token]/page.tsx:16 mounts PaintRequestForm; that component :55 GETs context and :77 POSTs the legacy painting shape. It retains address/coats/surfaces/condition/height/storeys/colour/manual-area controls and completed/expired states but lacks generic first-name/contact-time/photo/notes enhancements. Maintain old links as compatible adapters; do not create a duplicate quote on replay.

Native N1; existing owner RoofMeasure/Painting screens are not equivalents to a token-bound customer request.

Acceptance: every branch and conditional option, unsure/inspection routes, expired/used/invalid token, photo upload separately succeeding/failing, server estimate failure, simultaneous/repeated submissions and user-visible delivery state. Customer without app/account completes the entire form.

#### PUBLIC-009 — General photo upload and PDF plan upload

Status: NATIVE-MISSING + WEB-RETAINED.

General /upload/{token}: web/app/upload/[token]/page.tsx:23 resolves a voice-call photo_request_token or SMS-conversation token; completed/invalid states must remain distinct. The form accepts camera/gallery JPEG/PNG/WebP, maximum five images and 5 MB each, previews/removal and multipart submission to /api/upload/{token} (:54). A successful upload may trigger quote processing/previews; “uploaded” is not “quote sent.”

Plan /upload/plan/{token}: web/app/upload/plan/[token]/page.tsx:21 validates expiry and used/uploaded state; form accepts a PDF only, max32 MB, then posts multipart to /api/upload/plan/{token} (:41). Queued analysis is a real intermediate state, not a priced quote.

Native N1 lacks these customer routes. Owner file upload elsewhere does not bind customer token/context or support the same recovery states.

Required: preserve both browser routes and their source-specific outcomes, and implement native photo/PDF selection using native document/media pickers, explicit permissions, correct MIME/size checks and token-bound requests. Never upload to another tenant because a signed-in tradie is present.

Acceptance: camera denied, gallery denied, cancel picker, unsupported format, zero/too many/oversize files, slow upload, token expired during selection, already completed, processor failure and app/browser interruption. Preserve local preview/removal safely; no base64/media/capability in analytics or persistent query cache. Keep “analysis pending” visible rather than guessing extracted quantities.

#### PUBLIC-010 — Generic customer quote, preview and PDF

Status: BROWSER-HANDOFF for native owner preview; WEB-RETAINED for customers; CONTRACT-GATE for a complete native read model.

Source: web/app/q/[token]/page.tsx:185 loads the quote by share_token, :246 loads intake, :267 uses raw intake trade for visit-first policy, :278 can redirect solar, :299 enriches linked roofing and :318 commercial paint. It presents the actual customer document, not just an owner queue row.

Required rendered data:
- Business logo/contact/credentials, document/reference/status/issued information; customer/property context and scope.
- Customer photos, generated concept previews and product/sample imagery, with loading/no-photos/failed states and visible illustrative disclaimers.
- Job details, labour/material line items, quantities, units, tools/method/compliance, assumptions/risks/exclusions and estimated timeframe.
- Tradie profile/photo/video/website/contact when available.
- Single versus all tiers; correct featured/selected tier; label, scope, line totals, subtotal ex GST, recorded discount, conditional GST, total inc GST, deposit/visit policy and price-hold/early-booking state.
- Existing payment/acceptance/booking states; no-slot notice; accept/pay/book/thanks links only when allowed.
- Roofing and commercial enrichment must preserve source linkage and measurement/tender context. Do not flatten those into generic electrical copy.

Web page's five-section generic layout begins :1127; customer photos/preview at :1248, pricing summary around :1735 and acceptance :1944. The owner editor mounts separately at :1959 and must never become visible merely because the visitor has a public token.

Shared controls:
- web/app/q/_chrome/QuoteChrome.tsx:49 restores quote-specific theme, :55 toggles it and :69 downloads only the pathname/theme from /api/q/download; download has busy/failure behavior. The current call drops presentation query parameters, so it is not proof that the PDF matches the viewed roof scope. Native should use its theme tokens and a proper authenticated/capability download/share path.
- web/app/q/[token]/CustomerPhotosBlock.tsx:28 max-five/5 MB/MIME checks; :72 posts /api/upload/{uploadToken}; :208 picker and :246 fallback standalone upload. Photo thumbnails open originals.
- web/app/q/[token]/PreviewSection.tsx:35 polls every5s up to90s; :74 GETs /api/q/{shareToken}/preview-status; no_photos/failed/time-out remain honest and samples/images are viewable.
- Public page GET can advance status to viewed and trigger deferred previews (:548, :560). An owner preview must not accidentally count as customer acceptance, and native read endpoints need an explicit decision about tracking side effects.

Native N2 provides only browser links and a simplified internal detail modal. It lacks the full customer document/media/booking presentation.

Contract readiness: existing public SSR can read all data server-side, but no complete audited JSON DTO for this whole public presentation was found. Add a typed, versioned read contract scoped to the token/audience. An explicitly labelled browser preview is only a temporary fallback while that native requirement remains open, never completion. Never put service-role database credentials in native code. Public PDF/preview endpoints already exist; signed-URL expiry must be handled.

PDF contract prerequisite: web/app/api/q/download/route.ts:29 allowlists a pathname without query parameters, and :45 rebuilds the render target with only pdf=1 and theme. Together with QuoteChrome.tsx:69 this loses roofing s/pick/full, so a narrowed scope or full legacy view can export a different document or redirect to a promoted generic quote. Add typed, individually allowlisted presentation parameters and bind the read DTO and PDF to the same immutable quote revision, tier, included-structure subset and approved view mode. Validate narrowing server-side; never permit arbitrary render URLs, widened structure access or secret owner tokens in public PDF links.

Acceptance: fixture snapshots for every trade, tier mode, GST mode, draft/held/inspection/expired/paid/booked/unknown-token state, missing media and large totals; PDF and on-screen numbers, tier, selected structures and document identity match, including roof s/pick/full and promoted-quote redirects; media polls stop after timeout/unmount; owner/customer state boundaries hold. A browser handoff cannot satisfy the native owner-preview/editor acceptance criterion.

#### PUBLIC-011 — Shared owner manual and AI quote editor

Status: BROWSER-HANDOFF + NATIVE-MISSING. Audience: authenticated owner of an unpaid, editable quote; never a customer or merely any signed-in user. CORE references this requirement for its document editor.

Source: web/app/q/[token]/TradieEditor.tsx:179 GETs /api/quote/{id}/check-owner with bearer; :217 reports canEdit only for owner and unpaid. ?edit=1 auto-opens after proof (:202) and sign-in return is preserved (:244).

Visible manual controls:
- Existing good/better/best tier panels, editable tier label (:562).
- Per-line description (:598), nonnegative decimal quantity step0.01 (:610), nonnegative ex-GST unit price step0.01 (:624); calculated line total, subtotal ex GST and conditional inc-GST total.
- Remove line (:645), disabled for final line; add custom line (:659), tagged source tradie_manual (:409-428).
- Close/cancel, review Save, Save and notify customer, Save quietly, go back. Unit/timeframe/provenance are carried in state/payload but are not independently visible manual fields in this source.
- On 422 grounding_failed, show specific tier/line/price evidence, allow correction or an explicit owner force override (:739), carrying the chosen notification behavior. No silent automatic override.

Save contract: :294 builds tier label/timeframe/line_items, :324 notify_customer, :328 explicit force; :333 gets a fresh bearer; :334 POST /api/quote/{id}/edit. The API web/app/api/quote/[id]/edit/route.ts:63 limits description1-200, label1-120, optional unit<=20/timeframe<=60, nonnegative quantity/unit price and at least one line; :178 rejects paid, :199 checks owner, :332 rejects a misconfigured catalogue pricing book, :457 returns structured grounding failure. Successful edits refresh the customer document/PDF, historical pricing audit and affected provider links server-side. Client totals are review-only.

AI controls: web/app/q/[token]/QuoteEditChat.tsx:78 suggestion chips, input/submit, progress/errors and message thread; :143 POSTs instruction plus CURRENT unsaved tiers, not only original quote; :165 renders proposed tiers/diff/ungrounded warning; :197 Apply changes merges into the local manual draft only. A later explicit Save persists it. Paid, inspection-only and missing-pricing-book errors are separate at :155-160. Diff shows tier and before/after quantity/price/removal/addition; applying a proposal cannot silently notify a customer.

Critical trade exception: web/app/q/solar/[token]/page.tsx:372 routes owners back to SolarTab rather than this editor because solar_estimates and the twin quotes row must remain synchronized. Native must use the dedicated solar redraft/confirm contract, not expose a generic line editor that changes only the charged quote.

Native N2 :380 only opens the web editor. There is no native manual/proposal-diff editor.

Contract gates:
- Preserve source, supplied_by and safety metadata through all materialisation/proposal/save transforms. Current UI sends extra provenance at TradieEditor.tsx:318-320, but web API LineItemSchema:63-70 only recognises source; explicit server round-trip support is needed before claiming preservation.
- The existing force exception is a conscious owner override with an audit flag, not permission for an AI to set prices. Root's tenant-authority and governance rules still apply.
- Recheck owner, paid state and latest quote/pricing version on save; a stale editor cannot overwrite a settled quote.
- Separate saved prices from customer sending on the server. web/app/api/quote/[id]/edit/route.ts:597 changes draft to sent whenever a tier price changes, even when notify_customer:false. This is a current contract defect, not a native status transition to copy. A save-only edit must not newly stamp Sent, release a held quote or trigger delivery; preserve any genuine prior delivery history separately. Reconcile legacy status semantics through the per-trade policy gate rather than inventing notification evidence.
- Notification is deferred in after() at web/app/api/quote/[id]/edit/route.ts:679; failure is logged at :919 while :927 returns saved tiers/total without a delivery result or operation ID. Add durable, idempotent delivery operation/status and a tenant-scoped read/reconciliation contract. A save response proves persistence only; native must distinguish saved, notification pending, provider accepted, failed and outcome unknown, recover that state after reopening, and avoid blind resend after a lost response. Show the resolved recipient, supported delivery channel and consequences before an explicit notify action; this does not invent an email/recipient editor for the currently SMS-only edit notification.

Acceptance: >1 minute editing/session refresh, unknown/other tenant, payment racing save, zero-valued legitimate custom line, last-line removal, multi-tier edit, AI proposal apply without save, notification versus quiet save, grounding rejection/explicit override, failed save preserving draft, fresh refetch/PDF proof and solar routing. A quiet price-changing save must remain unsent if previously unsent and send zero messages; a held quote must remain held. Test notification failure after successful save, process death/lost response, concurrent duplicate notify, and reopen reconciliation without duplicate dispatch. Source-faithful fields do not justify silent loss of supplier/safety provenance or false delivery status.

#### PUBLIC-012 — Customer payment, booking, paid return and calendar

Status: WEB-RETAINED + PROVIDER-HANDOFF; required native owner visibility and customer continuation are NATIVE-MISSING and must preserve their separate authority.

This policy matrix is mandatory and must be tested against the stored trade and source route:

| Surface | Price/payment semantics in current source | Source evidence |
| --- | --- | --- |
| Generic /q/{token}, raw electrical/plumbing | The only online payment is the refundable $99 site visit, even with priced tiers or lapsed price hold. Old good/better/best links redirect to inspection. | web/app/q/[token]/page.tsx:729; web/app/r/[token]/[tier]/route.ts:307 and resolveGenericMintTier call |
| Generic inspection quote | $99 visit; no price-hold barrier for the visit. | web/app/q/[token]/page.tsx:715; web/app/r/[token]/[tier]/route.ts:334 |
| Generic other priced quote, including some promoted roofing/commercial rows | Actual tier deposit governed by stored deposit_pct and price hold. Do not assume every roofing-linked generic row has the dedicated roof route's policy. | web/app/q/[token]/page.tsx:739; web/app/r/[token]/[tier]/route.ts:234 |
| Dedicated /q/roof/{token} | Indicative roof price; only inspection tier accepted by roof mint, $99 visit. | web/app/r/roof/[token]/[tier]/route.ts:36 |
| Dedicated /q/paint/{token} | Inspection or released row can pay $99; held row returns to quote. Legacy tier pay links redirect to inspection; historical paid deposits remain recorded money. | web/app/r/paint/[token]/[tier]/route.ts:49, :55, :81 |
| Solar /q/solar/{token} | Confirmed clean quote uses tier deposit via its twin quotes row; genuinely held/flagged/inspection path can offer $99; clean auto-confirm still processing does not flash a temporary visit CTA. | web/app/q/solar/[token]/page.tsx:323, :339, :358, :369 |
| /q/commercial-paint/{token} | Direct tender page says no online deposit/contact to accept; promoted generic quote can differ. | web/app/q/commercial-paint/[token]/page.tsx:235 |
| /q/aircon and /q/plan | Indicative/read-only output; no functioning online charge action proved. | web/app/q/aircon/[token]/page.tsx:155; web/app/q/plan/[token]/page.tsx:132 |

Shared controls and states:
- web/app/q/_chrome/AcceptBlock.tsx:38 records /api/q/{token}/accept with tier, then navigates to the supplied payment URL. It currently proceeds even when recording fails (:52). Acceptance scope/version and persistence failure need a deliberate legal/product contract; do not call a failed record “accepted.”
- /r/{token}/{tier} validates tier, token, already-paid, expiry and available windows, then mints a fresh Stripe session. It tries to expire the replaced session and can fall back to a stored link if mint fails. Do not open this GET just to prefetch a screen: it creates a payment session.
- /q/{token}/paid is a return adapter, not a standalone payment UI. web/app/q/[token]/paid/page.tsx:86 reconciles session_id server-side, then :117-121 chooses thanks/book/quote. Query-string success alone is not settlement proof.
- /q/{token}/book, /q/roof/{token}/book and /q/paint/{token}/book enforce paid/unpaid/already-booked behavior, read tenant availability/booked slots and render the same BookingCalendar.
- web/app/q/_chrome/BookingCalendar.tsx:121 submits the selected slot to the source-specific booking API; month/day/time choices, timezone and disabled unavailable slots must stay explicit. web/app/q/_chrome/booking-next.ts:24 validates the returned next URL as internal.
- Thanks pages show business, property, visit date/window/timezone, reference and the actual recorded paid amount, not a reconstructed nominal $99. They expose Google/Outlook/calendar-file links and a document/PDF route. web/app/q/[token]/thanks/page.tsx:284, roof thanks:308, paint thanks:215.
- Dedicated roof/paint visit.ics routes read paid_at and scheduled_at and delegate a gated text/calendar attachment to visitIcsResponse. Generic thanks uses its own calendar helper; do not invent a missing /q/{token}/visit.ics page.
- /q/{token}/cancelled is a retry/back-to-quote view, not an automatic refund or a paid-state mutation.

Native N2 shares a generic /r URL; no customer booking/paid return/thanks/calendar UI exists. If a tradie previews payment details natively, use read-only server status and never pre-create a charge just to display it.

Contract gates: no-slots checks are present but generic mint source allows payment on an unknown slot-count lookup; concurrent/obsolete provider sessions and snapshot consistency need the shared payment safeguards. Solar display currently calculates 30% while generic mint honors stored deposit_pct; reconcile from one server amount before native parity. Never trust browser redirect parameters as payment proof.

Acceptance: no app/account customer journey; pay-first then select window then thanks; no-slot/refreshed slot conflict; expired priced quote vs non-expiring visit fee; already paid no recharge; each legacy tier redirect; provider cancel/failure/delayed webhook/app termination; partial availability lookup; timezone/DST; actual historical paid amount; accepted version; duplicate acceptance/booking/session creation. All money-changing fixture runs require a test provider setup.

#### PUBLIC-013 — Owner approval from a public review URL

Status: NATIVE-PARTIAL for existing queue approval; NATIVE-MISSING for correct external link resolution.

Web: web/app/q/[token]/approve/page.tsx:45 resolves token and :135 renders ApproveAction; :137 offers Edit first. web/app/q/[token]/approve/ApproveAction.tsx:28 resolves auth, :45 refreshes token, :53 POSTs /api/quote/{id}/approve. Public token permits opening the review page, not authorizing owner approval. Already-approved/pending states differ, and success must reflect send response.

Native has own approve/send controls in QuoteDetailModal, but N6 cannot resolve the external approval URL or preserve intent. AUTH-007 records the existing /signin?next mismatch.

Required: route a validated owner approval link into the correct tenant's native quote review, with current scope/tier/GST/recipient/delivery evidence, Edit first and explicit Approve/send. No quick action from a notification may bypass human review where required. Preserve pending versus approved versus sent versus delivery failure.

Acceptance: signed-out owner sign-in returns correctly; other owner/ordinary customer cannot approve; pricing changes during review require refresh; network ambiguity does not send twice; already-approved link does not duplicate delivery; per-trade review rules follow the reconciled governance decision.

#### PUBLIC-014 — Dedicated roofing customer quote

Status: BROWSER-HANDOFF + WEB-RETAINED + CONTRACT-GATE for full native read DTO.

Web source: web/app/q/roof/[token]/page.tsx:194 reads public_token; :214 can redirect a promoted compatible quote; :264 computes customer building confirmation; :284 uses only cached layout; :312 partitions included quotable/inspection/excluded structures. It must never sum excluded structures or present a zero total as a real quote.

Modes/controls:
- Unconfirmed building confirmation presentation with satellite/property/building identity and SMS reply instructions. Customer confirmation is not permission for autonomous tradie approval.
- Confirmed five-section view: roof/property overview, job/structure details, tradie identity, indicative price and $99 site visit.
- ?pick=1 renders building selection information read-only; ?full=1 opens detailed legacy measurement presentation; ?s= narrows the persisted included set but cannot widen it.
- Satellite/roof maps, structure metrics/source/confidence, material/pitch/storeys/access, solar remove-and-reinstate allowance, exclusions and scope/price breakdown.
- Cached roof layout map/legend; no customer-view generation request merely because layout is absent.
- Paid/booked summary and calendar, paid-unbooked Book a time, unpaid Pay $99, PDF/theme and back links.

Anchors: :659 confirmed view; :849 scheduled calendar, :890 booking, :900 visit pay; :975 unconfirmed view; :1049 RoofMap, :1197 acceptance and :1296 cached layout.

Native N4 opens the full browser customer view preferentially, so it does not expose the private review controls and is not native detailed parity.

Contract readiness: SSR-only composite read includes selected structures and authoritative money; native needs the same selection resolver/cached assets/fee policy DTO. Retain browser and selection-preserving redirects, and keep public token distinct from measure_token. PUBLIC-010's PDF prerequisite applies: QuoteChrome.tsx:69 and web/app/api/q/download/route.ts:29/:45 currently drop s/pick/full. Implement typed, validated presentation parameters and one immutable quote/tier/subset identity across on-screen view and download; a promoted generic redirect must not silently replace the requested full roof document.

Acceptance: multi-building, excluded structure, all-inspection, no reliable price, confirmed/unconfirmed, query narrowing/widening attempt, promoted generic quote, missing cached layout, solar addon, no slots/paid/booked, historic payment and PDF consistency. Independently compare narrowed s, forced pick and full-view exports against their exact displayed structures, revision, tier and money; malformed/widening render parameters must fail safely. No anonymous GET triggers measurement generation or authorization changes in a newly introduced read API.

#### PUBLIC-015 — Residential painting customer quote

Status: BROWSER-HANDOFF + WEB-RETAINED.

Web source: web/app/q/paint/[token]/page.tsx:120 reads public_token; :175 applies tenant single/all tier visibility; :208 separates paid, scheduled and released; :237 determines price visibility. The current v21 pipeline often releases at draft, but held/legacy/inspection states still exist and must render correctly.

Modes/data: five-section normal view and ?full=1 extended view; address/property/street/satellite/repaint concept; surfaces and quantities; scope/coats/preparation/condition/height/storeys; pricing model and measurement confidence/source; tier labels, GST-aware totals, labour/material/time assumptions and exclusions; business/contact/trust media. Clear distinction between an illustrative repaint concept and a measured fact.

Actions: public PDF/theme, site-visit acceptance/pay only when allowed, booked summary/calendar, book after payment, back to quote. A held quote must not leak priced tiers or expose legacy per-tier deposit actions. A historical paid tier/deposit must display recorded data without reinterpreting the amount as $99.

Private edits/release belong to PUBLIC-021; public TradieJobBanner at :1004 is owner context, not a public approval control. Acceptance at :1027/:1143 respects price/release visibility.

Native N4 opens /p if it has a private estimate token, otherwise /q/paint. No native customer renderer exists.

Contract readiness: read DTO must include routing/released_at/quote_sent_at/paid_at/scheduled_at distinctly and enforce public visibility server-side. Existing book/thanks/payment routes are usable web contracts. Do not apply the historical v19 held-default policy blindly over v21; governance gate applies.

Acceptance: held, released-unsent, released-sent, inspection-only, single/all tiers, GST modes, edited unpaid versus immutable paid, historic deposit, no slots, confirmation return and PDF; no private capability appears in customer HTML/share metadata or native customer sharing.

#### PUBLIC-016 — Air-con, commercial-paint and plan output pages

Status: BROWSER-HANDOFF/WEB-RETAINED; native presentation missing; not all outputs are payable quotes.

- /q/aircon/{token}: web/app/q/aircon/[token]/page.tsx:42 reads the saved recommendation. Show split/ducted/bulkhead recommendation variants, zones/rooms/floor area/load/climate/confidence, system bands and assumptions. At :155 the price is explicitly indicative; :163 says book an assessment but the current GoodToKnow content has no actual booking action. Contract gate: a functional assessment destination must be defined rather than porting inert CTA copy. No deposit or fixed-price promise.
- /q/commercial-paint/{token}: web/app/q/commercial-paint/[token]/page.tsx:35 reads paint_runs and latest extraction/BOM; :150 handles not-yet-priced. Show site/run identity, measured surface table, areas/coats/materials/labour/equipment and ex-GST/GST/inc-GST tender; :235 says no online deposit/contact to accept. Its TierCards ctaLabel at :249 has no href in that entry. Define a real contact/accept workflow if desired; do not invent online payment. A promoted generic quote uses its own policy (PUBLIC-012).
- /q/plan/{token}: web/app/q/plan/[token]/page.tsx:35 reads plan_extractions.share_token; item counts/confidence/sheets/types, indicative cost breakdown, assumptions and report PDF. :132 says tradie reviews before final; :228 links the report. It does not establish approval, binding final pricing or checkout. Loading/unpriced/no-PDF/unknown token are real states.

Native N1/N2: generic quote/browser links and trade tools do not render these distinct customer documents. TRADE handles underlying owner estimator controls.

Required: native owner preview with source-specific sections and clear status, using typed server read DTOs; retain normal customer browser pages. Make empty outputs and missing contacts actionable without fabricating quantities or final prices.

Acceptance: each system/output variant, no estimate yet, missing PDF, unknown token, indicative vs firm terminology, units and source-confidence displays, tax modes and large tables at narrow text sizes; inert source CTAs remain explicitly recorded gaps until a real contract is implemented.

#### PUBLIC-017 — Customer product-choice page

Status: NATIVE-MISSING + WEB-RETAINED.

Web: web/app/q/choose/[token]/page.tsx:26 resolves product_choice on sms_conversations. web/app/q/choose/[token]/ChoiceCards.tsx:45 POSTs /api/q/choose/{token} with catalogue_id; :70 posts defer:true for choosing on site. Cards show actual candidate product identity/brand/image/details/price supplied by the stored catalogue selection, selected/declined states, choose action and errors. Selection must not invent or substitute a product outside the offered set.

Native N1 has no route. A catalogue management screen is not a customer selection flow.

Contract readiness: choice mutation exists and the public page supplies context; add/read a typed choice DTO for the required native counterpart. Token belongs to a specific conversation and offered candidate set, not a tenant-wide arbitrary catalogue update.

Acceptance: choose each offered product, defer, repeat click/reopen, already chosen/declined, invalid token/candidate, missing product image, ambiguous network result and product no longer available. Browser customer path remains install-free and server owns any resulting quote recalculation.

#### PUBLIC-018 — Shareable roof/house showcase

Status: NATIVE-MISSING + WEB-RETAINED.

Web: web/app/share/[token]/page.tsx:61 resolves a public roof row and :68 requires a ready showcase; rendered payload intentionally omits quote amounts, customer address and tradie contact/payment details. web/app/share/[token]/opengraph-image.tsx builds generic social imagery; SharedHouse mounts a view-only 3D model/poster/stills and chosen roof/wall appearance. This is separate from sharing the quote URL.

Private/public roof showcase controls include material/roof/wall choices in HouseShowcase, orbit/zoom/colour controls in HouseViewer and browser native-share/clipboard fallback via ShareHouse.tsx:53. These cosmetic controls must not change measured roof topology or quote pricing.

Native N1/N4 lacks the share route and showcase state; sharing /q is not equivalent and may disclose more information.

Contract readiness: approved, cached, signed 3D assets and a privacy-filtered read DTO are needed for native display. The X requirements cover source/licensing/3D generation gates. Never expose measure_token, internal storage credentials or customer identity in share metadata.

Acceptance: ready/not-ready/invalid state; expired signed asset refresh; decorative colour/material query sanitisation; OS share cancel/failure/clipboard fallback; OG and rendered payload contain no address/contact/price/private token; no costly generation or quote mutation on a public showcase view.

#### PUBLIC-019 — Franchisee guided photo request and report

Status: NATIVE-MISSING + WEB-RETAINED. Audience: token-holding franchisee/customer, not admin by implication.

Routes: /studio/{token}/upload and /studio/{token}/report. web/app/studio/[token]/upload/page.tsx:34 GETs /api/signage/request/{token}; the server returns brand/studio and the request-specific shot list. Each shot has label/instructions, picker, previews and coverage progress (:160). :82 uploads multipart keyed by shot slot; successful processing redirects to report. Images are downscaled at :284 (2000px JPEG quality0.82) with safe fallback.

web/app/api/signage/request/[token]/route.ts:26 permits maximum12 JPEG/PNG/WebP photos, <=5 MB each; :127 binds fields to the brand shot set; :136 rejects no photos; request mode/state is returned at :107. It accepts one or more per slot; do not invent a stricter “every slot required” rule without server change.

Report at web/app/studio/[token]/report/page.tsx:39 polls the token contract, distinguishes collecting/queued/processing/assessed/invalid states and renders compliant/fix/review findings with source/rule/knowledge-base citations and counts. It is not the HQ human-review approval interface; TRADE covers that.

Native N1 lacks the token upload/report. Existing owner signage tools cannot substitute the franchisee experience.

Required: keep a reliable phone-browser capture flow and implement a native picker/camera/report reader using the same token/brand/slot schema and truthful processing progress. No login/install barrier, no staff controls on the report.

Acceptance: varied brand shot lists, partial coverage, replaced selection, camera cancellation/HEIC conversion fallback, 413/size/type errors, lost connection, report still processing/failed, invalid capability and retry. Every finding keeps evidence/source/citation and uncertainty, not colour alone.

#### PUBLIC-020 — Private roofing measurement review

Status: BROWSER-HANDOFF + NATIVE-MISSING + CONTRACT-GATE. Audience: private measure-token holder under current web capability model; promotion additionally requires authenticated owner.

Source: web/app/m/[token]/page.tsx:170 resolves measure_token, not public_token; it shows saved input/property/customer/measurement state, maps, structures, roof pricing, source/confidence, linked quote and fallback failure state. Public customer data must not be given this private URL.

Controls in web/app/m/[token]/MeasurementReview.tsx:
- Include/exclude per structure, canonical recalculated included total and inspection flags; :305 PATCH included_indices with rollback/error handling.
- Metric editor :719 hips, :720 valleys, :721 box gutter length, :731 pitch degrees, :735 sloped area, :740 roof form, :753 storeys, :768 gutter length, :772 downpipes, :776 fascia, :780 soffit; Apply :791 POST/PATCH to the saved measurement (:242). Valid zero is meaningful for absent edges/accessories.
- Add up to six reference photos (:541), POST re-scan at :208, display existing solar detection/addon and reprice outcome. Do not replace measurements with a client estimate.
- Customer-view link :360, PDF :369, linked editor :381, promote/save-as-quote :389. Promotion :166 requires bearer and measure_token :169 so it updates/links the saved record rather than creating an unrelated quote.
- Cached layout section, generate/retry state and structure-selection synchronization; 3D capture/manual/upload/generating/ready/error modes, per-view capture/retake, model viewing and cosmetic roof/wall/material controls. Root defines source/licensing/topology authorization gates for these tools.

Validation/contract: web/app/api/roofing/measurement/[token]/route.ts:29 allows hips/valleys0-50; box gutter0-500; gutter/fascia/soffit0-1000; downpipes0-60; pitch1-75; sloped area1-10000; storeys1-10; structure/edge collections1-64. Mutation trusts the private token (:88/:206). Some failed updates return HTTP200 with ok:false (:120/:155/:262); native must inspect the body. Existing stored-data read is SSR rather than a complete authenticated native detail DTO.

The accepted roof-form vocabulary at the same API :44 is gable/hip/skillion/gable_hip/complex/unknown. Null edge/accessory corrections and omitted fields have distinct semantics; measurement clearing is not generally supported. Native selectors must use the actual schema rather than a guessed “flat roof” value.

Specific gate: web/app/api/roofing/q/[token]/layout-plan/route.ts:46 accepts POST using a public token and ignores the request argument; it does not establish owner authorization simply because /m contains the button. Define generation entitlement/provider/source controls on the server before reproducing it natively.

Native N4 prefers public full view; mobile/src/features/trades/roofing/RoofMeasureScreen.tsx:103-158 saves/promotes current inputs without a saved private-review read/edit flow. TRADE owns capture/estimator parity, this requirement owns saved result review.

Acceptance: reopen a saved measurement, edit zero and bounded metrics, reject invalid indices, rapid includes update, stale saved data, photo rescan failure, reprice after selection, no double-counted addon, promote once with correct saved token, wrong owner rejection, cached layout/3D failure/cancellation and all provider gates. Native must refetch saved result after successful mutation and distinguish cosmetic edits from price-affecting edits.

#### PUBLIC-021 — Private painting review, edit and release/resend

Status: BROWSER-HANDOFF + NATIVE-MISSING. Audience: private estimate-token holder in existing web contract; never public-token holder.

Web: web/app/p/[token]/page.tsx:69 looks up estimate_token; photos/concept/measurement/result at :240-264, edit panel :295, send control :298, public view :303 and PDF :312. Private/public tokens are intentionally distinct.

web/app/p/[token]/EditQuotePanel.tsx:136 edits tier label, :152 price inc GST, :168 scope; save :76 POSTs /api/painting/edit/{estimateToken}, cancel restores source. Per-tier labels/scopes are optional; supplied inc-GST price must be positive. API web/app/api/painting/edit/[token]/route.ts:41 permits label<=120, scope<=600, inc_gst positive<=1,000,000 and1-3 tier edits; :84 rejects already-paid quote, :97 rejects inspection-only. Successful priced edits expire/drop legacy payment sessions and preserve public token.

web/app/p/[token]/SendToCustomerButton.tsx:42 calls /api/painting/release/{estimateToken}; :45/72 explicit resend:true can resend an already released quote. Display sent only when j.ok and j.sent===true (:49), not released_at. web/app/api/painting/release/[token]/route.ts:63 reads released_at and quote_sent_at separately, :100 performs the send, :117 returns sent. Existing automatic v21 release and failed-send recovery mean a Send control can be retry/resend, not necessarily first approval.

Native N4 opens /p through browser; no native tier edit, release/resend state or updated detail refetch exists.

Contract readiness: mutations exist under private-token capability; before exposing in native owner workflows, define owner-scoped read/mutation resolution and token handling without making the token public. Preserve source server guards and explicit consent on resend. UI currently rounds initial displayed incGST in EditQuotePanel.tsx:41; ensure native retains exact stored cents and does not save a rounded total unintentionally.

Acceptance: unopened/released-unsent/sent/resend/error states; explicit resend recipient/context; edited label/scope versus price; exact cents; paid/inspection rejection; route with public token denied; repeated ambiguous send reconciles server delivery stamp; no automatic send triggered by merely opening the native result.

#### PUBLIC-022 — Solar self-service, public result and maps

Status: BROWSER-HANDOFF + NATIVE-MISSING + WEB-RETAINED. TRADE owns owner SolarTab/redraft/confirm controls.

Entry source: web/app/solar/[tenantSlug]/page.tsx:32 validates tenant; :48 allows ?path=felt only when the server flag permits it, otherwise instant. SolarAddressForm fields/actions:
- Street address typeahead with manual fallback; /api/solar/places query after4chars/250ms and details selection. Postcode, AU state, Find my roof; detect POST at :231 returns buildings and center.
- Always-on satellite pan/zoom map when a center exists; select detected building or tap a custom roof centroid. No coverage does not fabricate a structure.
- Optional name/mobile, optional quarterly bill; panel grade standard_panels/premium_panels/unknown; phase unknown/single/three; optional desired size kW with6/10/14 quick chips and free input.
- Expand manual override: orientation north/north_east/east/south_east/south/south_west/west/north_west/flat/unknown; roof size small/medium/large; storeys1/2/3.
- Submit/progress/error; builder at web/lib/solar/form-payload.ts:9 omits inapplicable values and :109 forwards a finite selected centroid; POST estimate at SolarAddressForm.tsx:285 returns shareUrl.
- Validation web/lib/solar/request-schema.ts:18: address/postcode minimum3, valid AU state; name1-120, mobile6-20 if provided; bill positive<=10000; requested kW positive <=100 via web/lib/solar/limits.ts:30; target building ID1-120 and bounded latitude/longitude. The page's postcode input requires4digits; reconcile client/server bounds rather than guess. Verify the persisted database bound matches the shared100kW limit before calling larger-system entry complete.

Public /q/solar/{token}: web/app/q/solar/[token]/page.tsx:129 resolves saved estimate; :157 applies confirmation/guardrail visibility. Data covers roof/source confidence/flags, proposed layout, panel strings/components, actual hardware/datasheet links, annual/monthly output, tariffs/bill savings, STC rebate/net price, payback/25-year projection, environmental estimates, assumptions and installer-compliance caveats. Stored and illustrative/forecast quantities remain labelled; no financial guarantee is implied.

Modes/controls:
- Instant versus Felt map variant, static roof image/concept and pan/zoom map; sun-shade marker explanations using SunShadeMap/Overlay, keyboard-close/open behavior and legends.
- BuildingPickerSection.tsx:55 POSTs select-building by building_id or centroid and refreshes all estimate data; readOnly/confirmed at :52 prevents switching. 409 released lock and422 no coverage are displayed, not ignored.
- HeatmapAutoRefresh polls missing assets/clean auto-confirm with a bound; held/flagged versus clean-pending versus confirmed must not flash the wrong payable action.
- Single/all tier mode; real tier/deposit path or held inspection path (PUBLIC-012); datasheet links/PDF/theme/contact. Payment lives on the twin quotes row (:339), not an invented solar_estimates.paid_at.
- Owner navigation at :372 deliberately returns to SolarTab for synchronized redraft/confirm, not generic manual edit.

Native N5 only lists metrics/flags and launches quote/Felt/browser; mobile/src/features/trades/tools/solar-api.ts:48-72 does not model canConfirm/canRedraft/buildings/provider project links in the native UI. Entry and public visualization/read DTOs are not implemented.

Contract readiness: estimate/detect/places/select-building endpoints exist, but full native read/policy shape, provider map SDK/source licence checks and stored deposit-display reconciliation are required. The X requirements cover provider/source governance. API failures must not fall through to guessed roof geometry or a different building.

Acceptance: all enum/manual/size/panel/phase variants, custom versus detected roof, address unavailable, requested size beyond bound, coverage/held/clean-auto-confirm/confirmed, building lock/race, timeout/failure maps, inaccessible external provider, GST/STC/deposit reconciliation and twin-row consistency; public user completes without app/account.

#### PUBLIC-023 — Direct public booking request

Status: NATIVE-MISSING + WEB-RETAINED. This is distinct from paid quote booking.

Web: web/app/book/[tenantId]/page.tsx:15 validates tenant ID and :51 checks active tenant, then resolves available slots. BookingForm.tsx:68 POSTs /api/book/{tenantId} with name, phone, optional email/suburb/address/description and selected slot; :123-163 defines the fields, required name/mobile/slot and success/error states.

API web/app/api/book/[tenantId]/route.ts:60 normalizes inputs, :70 requires name, :73 validates AU mobile, :79 validates parseable future date, :97 validates tenant and :103 checks the submitted slot is in current tenant availability, returning409 on an unavailable slot. It creates intake/booking records; it is not a charge or automatically approved final quote.

Native N1; CORE's owner Calendar is not customer appointment intake.

Required: preserve the browser request flow and implement native token/tenant-bound booking without sign-in. Show actual available times, business/property context and confirmation. Do not reuse paid-quote “deposit received” language.

Acceptance: invalid/inactive tenant, no slots, slot in past/not listed/racing availability, optional fields blank, invalid mobile, network retry and duplicate submit. Success only after server record confirmation; no payment state fabricated.

#### PUBLIC-024 — Public email unsubscribe

Status: WEB-RETAINED + CONTRACT-GATE for truthful persistence.

Source: web/app/api/email/unsubscribe/[token]/route.ts:25 GETs the signed token; :28 handles invalid/expired, :35 upserts tenant/email suppression idempotently and returns HTML confirmation. This is a user-facing route even though no page.tsx exists. It must remain clickable from email without login or app installation and must not be intercepted into a signed-in tradie screen.

Native N1 has no route; that absence is acceptable only with an explicit public-web disposition and tested link handling. A native notification setting is not email suppression for the token's tenant/address.

Readiness concern: the handler awaits the Supabase upsert but does not inspect its returned error; resolved database errors may produce a false success page. Require a verified suppression result/structured error before claiming completion, while keeping replay idempotent.

Acceptance: valid link, replay, invalid/signature-modified/expired link, database rejection and network failure. Unsubscribe affects only the signed tenant/email pair; no raw token or address is disclosed to unrelated screens/analytics. Any native display remains a public result viewer, not an auth gate.

#### PUBLIC-025 — Global shell, missing routes, errors and accessibility

Status: NATIVE-PARTIAL; complements the X infrastructure requirements.

Web: web/app/layout.tsx:42 lang en-AU, Clerk/provider/font/global metadata; web/app/not-found.tsx offers home/dashboard/sign-in/pricing recovery; web/app/global-error.tsx:16 reports to Sentry and :54 reloads using a dependency-light fallback. There is no independent live global loading feature implied by a docs example; dashboard loading is CORE's scope. Public quote chrome is separate from marketing chrome and controls its own theme/PDF/sticky action.

Native N1 restores fonts/splash/providers but has no explicit public-route resolver or bespoke public +not-found/error pages in its file census. Current five-tab shell and native settings theme are substantive existing UI, not missing parity.

Required:
- Explicit native invalid-link/not-found, session-loading, offline, empty, forbidden and recoverable error states; safe retry/back/home without repeated provisioning or payment.
- Audience-aware navigation: customer public flow cannot be redirected to welcome simply because the tradie app is signed out. Root route intent/auth guard work must cover screens outside the tab group as well.
- VoiceOver/TalkBack labels for actions/options/state; meaningful heading/reading order; announce form errors, pending progress and route changes; accessible selected values and non-colour statuses.
- Large-text and 320px layouts, 48dp touch targets/56dp primary CTA where design specifies, safe areas, keyboard avoidance, logical focus after sheets/dialogs, reduced motion and usable map/list alternatives. Use native fonts/colours rather than copying historic orange/navy docs styling.
- Context-preserving external launch with errors, cancellation and back/return behavior. LinkOut.tsx:15 currently fires Linking.openURL without a complete failure/return contract; that cannot hide a native missing-feature state.

Acceptance: every route family in the appendix reaches the right audience/state from cold start; no loop on expired auth or unavailable provider; public landing/footer/legal content is discoverable; accessibility and keyboard tests cover substantive interactive states, not merely static screenshots.

### Administrator requirements

#### ADMIN-001 — Staff authorization and administrator navigation

Status: NATIVE-MISSING + CONTRACT-GATE. Audience: server-authorized QuoteMax staff only.

Web/app/admin/layout.tsx:54 gets fresh auth, :60 calls /api/admin/whoami and :69 admits children only for is_admin. Unauthenticated users go to sign-in; non-admin/error goes away from admin. Navigation includes admin home, tenants/customers, invites, metrics, files, loader, agents and docs, plus return to tradie dashboard and sign-out. /admin itself is a destination directory, not a hidden separate management API: web/app/admin/page.tsx:43 metrics, :52 loader, :61 agents, :73 eval, :82 findings, :91 patterns, :100 dashboard, :109 customers, :118 docs, :127 tenant health, :136 invites.

Actual security boundary: web/lib/admin-loader/auth.ts:18 reads admin_users and fails closed on missing user/DB failure; web/lib/admin-loader/route-auth.ts:23 maps verified Clerk/Supabase identity to the allowed admin subject. web/app/api/admin/whoami/route.ts:26 and sensitive admin APIs perform server checks. Client layout is UX gating, not authorization.

Native N1 has no staff navigation, role model or admin pages. Do not simply add admin links to every tenant's Menu. A Clerk-only tenant with no admin allow-list mapping must not be granted staff access as a workaround.

Required: a separately role-gated native staff workspace with the action inventory below, fresh server role check, safe loading/forbidden/error state and deliberate return to tradie workspace. Every request still authorizes server-side and tenant selection is explicit. Scope the X infrastructure to retire staff data on logout, role revoke or account switch.

Acceptance: unauthenticated, ordinary tradie, expired auth, allowed admin, revoked admin, role-lookup failure and Clerk/legacy-mapped admin. Replaying a staff API from a normal native account returns403 and no cross-tenant data. Static example/template documents are not sensitive admin data and must be separately classified.

#### ADMIN-002 — Tenant health and provisioning readiness

Status: NATIVE-MISSING; read-only staff UI with an existing contract.

Web/app/admin/tenants/page.tsx:63 GETs /api/admin/tenant-health, :106 refreshes. Displays overall total/ready/incomplete counts, trade readiness and specific missing prerequisites, tenant ID/business/trades/status, per-check label/details/info versus blocking failure. :148-165 distinguishes LIVE real Twilio/Vapi provisioning from STUB mode and missing activation configuration.

Native N1 has no staff tenant-health view; owner Home analytics are a different audience/data set.

Required: native staff read-only health view with refresh, filterable/readable tenants, accessible readiness details and explicit stub/live state. Do not add provisioning-switch mutations merely because the page mentions environment flags.

Acceptance: signed-out/403/loading/error/empty/mixed-ready tenants; every failed check readable without hover; real versus stub unmistakable; refresh preserves selected tenant; stale data labelled. No admin credentials/environment values leak into native logs.

#### ADMIN-003 — Customer/tenant directory and filters

Status: NATIVE-MISSING.

Web/app/admin/customers/page.tsx:47 GETs /api/admin/customers; :132 search; :140 status all/onboarding/active/suspended; :146 trade filter from known-trades catalogue; :154 plan all/none/starter/pro/crew. Table displays business, trades, status, plan/subscription state, comp status/created information and opens /admin/customers/{id}. Empty, no matches, unauthorized and error states are distinct. This “customers” directory is staff management of subscribed tradie businesses, not the tradie's consumer CRM (CORE).

Contract: web/app/api/admin/customers/route.ts:24 checks role before service-role query. Native N1 lacks the route.

Acceptance: combine search/status/trade/plan filters, preserve unknown trade labels and no-plan rows, navigate/back with filter state, large directory/narrow screen. No normal tenant can enumerate it. Do not merge it into owner CRM or treat subscription tier as admin privilege.

#### ADMIN-004 — Tenant detail, suspension, billing comp, trades and subscription

Status: NATIVE-MISSING. Several actions affect live access or funds and need explicit staff confirmation.

Read-only identity/billing/provisioning:
- web/app/admin/customers/[id]/page.tsx:106 GET detail; :306 identity email/mobile/state/ABN/licence/created/activated; :317 plan/interval/subscription/current period/trial/cancellation/comp.
- :331 Twilio SMS/voice, Vapi assistant, Stripe customer/subscription/Connect IDs are read-only. Do not invent editable credential fields.

Mutations:
- :363 reactivate via PATCH {action:set_status,status:active}; :379 suspend via status:suspended. Suspend requires typing the business name; reactivate still confirms.
- :405 billing comp/uncomp uses {action:set_billing_exempt,exempt}; explain that it bypasses enforcement.
- :431 known-trade checkbox selection; options from web/lib/admin/trades.ts:25 are electrical/plumbing/roofing/signage/painting/commercial_painting/aircon/solar. Preserve unknown assigned trades (:448); :464 update_trades after explicit confirmation. These eight staff tool slugs are distinct from the four current signup trades. Do not expand available trades without governance/provisioning readiness.
- :480 plan starter/pro/crew; :489 interval month/year; :200 POST /subscription. Start/change plan (:503) requires typed business-name confirmation and explains Stripe/proration or trial. Success is “submitted/syncing via webhook,” not immediate paid/active proof.
- :516 audit history with action/date/before/after; confirmation modal :549, typed exact match at :574, cancel and busy/error behavior.

Server readiness: web/app/api/admin/customers/[id]/route.ts:61 validates discriminated actions, :77 checks admin before mutation and audits actual changes; subscription/route.ts:48 checks admin, :145 audits, :154 returns syncing:true. Native N1 missing.

Acceptance: every action as allowed staff and denied tradie, wrong typed phrase, cancellation, duplicate tap, network ambiguity, failed Stripe change, delayed webhook and concurrent tenant changes. No funds action executes during simple detail load. Refetch tenant and audit after confirmed mutation; do not optimistically claim changed entitlement before authoritative result.

#### ADMIN-005 — Platform metrics dashboard

Status: NATIVE-MISSING; read-only aggregation contract exists.

Web/app/admin/metrics/page.tsx:20 options4/8/12/26weeks, :28 default8, :29 excludes test data by default; :48 GETs /api/admin/metrics?weeks=&includeTest=. :297 period controls, :312 Test shown/Real only toggle, :325 Refresh.

Content: weekly scorecard against targets with active tradies, new signups, quotes requested, turnaround, acceptance and repeat usage; not-tracked cards for satisfaction/referrals/founder conversations (:209). All-time quotes/requests/unique consumers/calls/SMS chats/tradies, weekly quotes/requests/signups charts, channel/trade distribution, per-tenant usage/status table. Preserve missing/not-tracked as unknown rather than0.

Native N1; mobile ActivityAnalytics is owner scope and cannot substitute a cross-tenant staff view.

Acceptance: each period/test flag, empty series, null metrics, zero denominators, trend comparison, refresh races and forbidden role. Charts need readable data alternatives, not colour-only status; never import fixture/sample traffic into real-only totals.

#### ADMIN-006 — Staff invitation codes and signup QRs

Status: NATIVE-PARTIAL through shared owner Invite feature, but staff-only scope is missing. CORE owns ordinary owner invites/marketing QRs.

Web/app/admin/invites/page.tsx:74 reads /api/dashboard/invites/codes, :78 uses server is_platform_admin; :86 reads QR list. Controls:
- Campaign required, positive quota, scope tenant (“My campaign”) or platform (“Platform-wide”) only when entitled, optional custom code. Generate at :103.
- Show code/status/quota/use/campaign information; copy; send email or SMS (:124 {channel,to}); recipient field; send/cancel/busy/error confirmation; pause/resume/revoke (:137).
- Signup QR label, generate :149 with destination_type signup; PNG/SVG download (:325/326), copy /s short link, pause/resume/archive.
- “Signup QR” is acquisition for a new tradie, not a customer quote-request QR. Preserve that destination and attribution.

Native N1 has no admin workspace; existing owner invite screens must not unlock platform scope client-side. APIs are tenant-scoped with additional server staff capability for platform codes; reuse the real contract, not a separate insecure admin flag.

Acceptance: tenant vs platform scope authorization; custom code collision, invalid quota/recipient, exhausted/revoked/paused code, send failure, copy/download errors, status transitions and QR scan behavior. No external invitation sends occur without a deliberate user/staff action.

#### ADMIN-007 — Cross-tenant documents and comment resolution

Status: NATIVE-MISSING for staff scope; CORE owns owner Files/comments.

Web/app/admin/files/page.tsx:51 loads tenant selector via /api/admin/tenants; :94 reads /api/admin/files?tenantId=; list displays document/title/kind/trade/date, comment count and resolved state. :226 opens a comments drawer; :274 mounts shared CommentsThread with /api/admin/files/{documentId}. This staff page does not itself expose an additional upload/delete-document form; do not infer one from owner Files.

Shared controls web/app/_components/CommentsThread.tsx:81 load, :106 post trimmed comment, :127 edit owned comment, :148 delete permitted comment, :166 resolve/reopen. Show server author_label/is_own/author_role, date/edited state, composer, inline edit Save/Cancel and errors. Server authorization decides ownership and staff scope.

Native N1 lacks tenant selection/admin API namespaces. Reusing native owner comments UI is appropriate only with explicit role-scoped endpoints and cache keys.

Acceptance: choose tenant, change tenant while request pending, empty list, not-found/forbidden document, own/other author rules, concurrent comment edits, delete/resolve failure and refetch counts. Close/reopen drawer preserves safe context; no cross-tenant comments remain visible after account/role change.

#### ADMIN-008 — CSV catalogue loader, new trade and commit/rollback

Status: NATIVE-MISSING + CONTRACT-GATE for governance. This is a staged staff data-management workflow, not a general file uploader.

Web/app/admin/loader/page.tsx:275 state holds service/material/category CSV inputs. Upload controls at :1100 and templates at :1075. Three stages: upload, preview diff, commit/rollback; step rail state at :831.

Optional new-trade panel:
- Trade name (lowercased slug), display name, install/job-based acknowledgement, GST registered.
- Required/optional default pricing fields: hourly, call-out, apprentice, senior, markup, risk buffer, minimum labour, licence label.
- Optional prompt pack: estimator system prompt, SMS scope blurb, SMS trade rules, voice greeting and voice system prompt. These are executable policy inputs, not harmless copy.
- :648 requires job-based acknowledgement; :657 validates finite/nonnegative defaults and :673 positive hourly.
- :719 POSTs /api/admin/loader/upload with idempotencyKey, CSV text and optional newTrade.
- Structural CSV errors, rejected rows and new/update/forced-disabled/smoke-failed counts; staged rows show target table, payload/diff/source and rejection reasons.
- :771 Approve staged batch, :779 receives reprice_confirmation_required then explicitly confirms live repricing before reposting confirmReprice:true.
- :805 Rollback committed batch, return already_committed/already_rolled_back honestly; :601 reset for next import.

Server web/app/api/admin/loader/upload/route.ts:51 bounds defaults (hourly<=10000, callout<=100000, apprentice/senior<=10000, markup/risk<=500, minimum labour<=100); prompts at :65 have length limits (60000/4000/4000/2000/20000); :73 idempotency key8-200 and CSV strings<=2,000,000; :98 admin gate. Batch GET/approve/rollback APIs enforce stage and transaction preconditions. Static template route returns fixed CSV examples and is not evidence of exposed live catalogue data.

Native N1 lacks the complete workflow. Root AGENTS scope/prompt-eval requirements and later trade-data strategy conflict must be reconciled before a new-trade/prompt action is enabled. Do not auto-propose or commit a new trade during parity work.

Acceptance: each CSV independently/combined, malformed headers/rows, existing service repricing confirmation, disabled/smoke-failed rows, new trade defaults and rejected unsupported trade, same idempotency key replay, preview fetch failure, commit/rollback conflict, process death/remount with batch recovery and audit evidence. Staged/AI-extracted rows are never live until an authorized explicit commit.

#### ADMIN-009 — Knowledge-base store/PDF extraction into staged catalogue

Status: NATIVE-MISSING + CONTRACT-GATE for provider configuration.

Same loader page: web/app/admin/loader/page.tsx:357 lists stores; :383 lists selected store documents; :411 creates a named store; :438 validates PDF with100 MB cap; :462 uploads multipart file/storeId/displayName; :486 extracts with a fresh idempotency key and optional trade/source/document metadata filter. Fields: store, new display name, document or whole-store choice, PDF, trade hint (infer/electrical/plumbing/carpentry/HVAC/solar/painting/locksmith), optional source label. These hint values are not automatic native trade enablement.

Response reports staged service/material counts, parse errors, model and source; :536 fetches batch preview into ADMIN-008. If extraction succeeds but preview fails, the source retains batch ID and suggests /admin/loader/batches (:591), which is absent from the91page census. Required gap: implement a real recoverable batch list/detail route or recovery lookup, not a dead link.

Backend APIs exist for stores/documents/upload/extract; web/app/api/admin/loader/trade-book/extract/route.ts:36 validates request, :57 role-gates, :89 can report provider unconfigured, :118 parse/extraction failure and :139 replay. Provider indexing may take10-60s; extraction30-90s. Never embed the provider key in native.

Acceptance: missing provider config, create store, unsupported/oversize PDF, indexing pending, doc selection, malformed extraction, empty/partial rows, interrupted extraction, idempotent retry and recoverable staged batch. Native must use document picker/progress and preserve the same staff review/commit gates; a WebView or external loader link is still a handoff.

#### ADMIN-010 — Agent overview and evaluation runs

Status: NATIVE-MISSING; existing staff-only API, external agent service readiness unverified.

Overview web/app/admin/agents/page.tsx:47 reads /api/admin/agents/queue; :81 triggers eval/catalogue/tradie-learn. Displays latest eval score/run status, pending finding/pattern counts, per-agent purpose/status/Run now, links to drilldowns and recent activity. Score colour thresholds are presentation, not release permission.

Eval web/app/admin/agents/eval/page.tsx:52 loads runs, :71 GETs /api/admin/agents/eval-runs/{id}; :119 Run now. Select a run, inspect overall score/status/start/end/model/error and per-fixture price/material/tier/scope/routing scores with notes. No UI control edits hold-out fixtures or accepts a model change merely because a score exists.

Trigger web/app/api/admin/agents/trigger/[agent]/route.ts:35 checks staff, allow-lists eval/catalogue/tradie-learn and proxies to configured quality-agent service; optional body is forwarded, provider secrets stay server-side. Queue returns pending counts independently of chosen filter and per-query errors.

Native N1 lacks agent UI. Prompt/evaluation governance remains separate from a Run now capability.

Acceptance: runs queued/running/complete/failed, timeout and absent service, selecting runs while fetches race, fixture details/null score, unauthorized trigger, duplicate taps and cache refresh after result. Do not claim offline/production evaluation success from the existence of the source route.

#### ADMIN-011 — Catalogue-agent finding review

Status: NATIVE-MISSING. Review approval is not application to live prices.

Web/app/admin/agents/catalogue/page.tsx:34 queries queue by finding status; :67 Run now catalogue agent; :94 PATCH /api/admin/agents/findings/catalogue/{id} {status:approved|rejected}. Show source table/row, finding type/confidence/date, current versus suggested JSON/value diff (:209/210), status and approved/rejected actions only where applicable.

Server web/app/api/admin/agents/findings/[type]/[id]/route.ts:25 accepts approved/rejected/applied, :38 checks admin, :64 updates review metadata. It does not itself implement a separate catalogue-apply operation or enforce every lifecycle transition described in its comment. The web review UI offers Approve/Reject, not Apply. Do not equate approved with changed catalogue or add a native Apply button that merely stamps applied.

Native N1 missing. Required: status filters, readable diffs/provenance, explicit review action/error/refetch; shared action state avoids accidental double review.

Acceptance: pending/approved/rejected/applied filter states as supported by server, empty queue, wrong role/type/id, conflict/review retry, agent failure, and exact distinction between suggested/approved/applied. Add lifecycle/actual-application proof on server if native introduces a real application workflow.

#### ADMIN-012 — Tradie edit-pattern review

Status: NATIVE-MISSING; review workflow, not automatic tenant rate mutation.

Web/app/admin/agents/tradie-edits/page.tsx:29 defaults168hour lookback; input :130 bounds1-720; :67 POSTs trigger/tradie-learn {lookback_hours}; :34 queue status filter; :94 PATCH findings/tradie-edit/{id} approved/rejected. Render tenant, trade, job type, edited field, direction, median delta, sample count, observed time period and status; explicit approve/reject.

Backend shares ADMIN-011 staff role and review metadata. Trigger currently forwards request body; server-side validation of native bounds is required if not enforced by the external service. Approval alone does not amend pricing books or retrain prompts.

Native N1 missing. Acceptance: every status/lookback bound, insufficient samples, unknown trade/field, positive/negative delta, empty queue, failure/timeout, concurrent review, unauthorized account and no hidden tenant-pricing mutation.

#### ADMIN-013 — Staff documentation directory and public planning pages

Status: NATIVE-MISSING for staff/help directory; DOCUMENTATION/DEMO + WEB-RETAINED for actual documents.

Web/app/admin/docs/page.tsx:32 eight categories, :44 static DOCS catalogue; :105 independent whoami check; :121 searches title/description/file/category case-insensitively; :162 search input; :175 result counts; :225 opens /docs/{file}. Categories: Start here & overview, Onboarding, Pricing & quote engine, SMS channel, Architecture & data, Supplements & knowledge base, Build/status/internal, Investor.

Important audience distinction explicitly documented at :12-14: only the discovery directory is admin-gated; the individual files in public/docs remain publicly reachable. Do not falsely claim static documents are confidential because this directory hides them. Appendix B inventories 49 static assets: 41 HTML documents, seven PDFs and one CSV including nested investor content; this section does not duplicate every historical file.

App Router planning pages:
- /docs/tradie-onboarding-plan, /docs/tradie-onboarding-plan-sms
- /docs/tradie-onboarding-architecture
- /docs/sms-onboarding-flow, /docs/sms-onboarding-architecture

These are readable plan/architecture/flow diagrams with cross-document/home links, not live signup/provisioning agents. Source link anchors: web/app/docs/tradie-onboarding-plan/page.tsx:143; plan-sms:145; tradie architecture:282; SMS flow:167; SMS architecture:334. No auth gate was found in these page components. Footer also links planning material.

Native N1/N3 has no curated help/documentation reader. Required: approved, searchable native staff/help catalogue with roles matching actual content confidentiality; document title/type/version/date and accessible reader/download. Public educational documents remain web readable. Historical specs and embedded code examples must not be counted as shipping product features.

Acceptance: query/no-match, correct file type/download, missing/old document clearly labelled, nested investor link, staff directory denied to tradie while approved public docs remain accessible, and no unreviewed operational/security content promoted to general Help. The X requirements cover static-document control appendix.

#### ADMIN-014 — Development document-editor harness

Status: DOCUMENTATION/DEMO + CONTRACT-GATE; not a production parity target.

Web/app/dev/doc-editor/page.tsx:3 calls itself a dev-only harness with no auth/DB; :11 constructs fake ReportDoc/prices and :41 mounts QuoteDocumentWorkspace; :45 pricing action is window.alert. It exposes real editor/branding/formatting UI on sample content but is not evidence of a saved real quote. No environment guard appears in this route.

Native N1 has no equivalent, and must not gain production sample-price tools just to match a page count. Keep a native test/storybook harness only in development if useful; CORE owns production document editor parity.

Acceptance: runtime/dev-only gating is explicit, production cannot present this harness as a customer quote, sample values never enter real pricing or screenshots presented as live data, and native editor validation uses isolated fixtures. This page is accounted for as a harness, not silently excluded.

### Public, authentication and administrator page mapping

The table accounts for all74owned App Router pages. Native absence is established by N1; handoffs by N2-N5; auth gaps by N6-N7. Each requirement provides contract readiness and acceptance tasks.

| Web route | Route module | Requirement IDs | Audience | Current native/disposition status |
| --- | --- | --- | --- | --- |
| / | web/app/page.tsx:1 | PUBLIC-001 | Prospective tradie/public | WEB-RETAINED; native acquisition/reference gaps |
| /account | web/app/account/page.tsx:1 | AUTH-009 | Applicant or signed-in account | NATIVE-PARTIAL; adapter/contract gaps in linked requirements |
| /admin | web/app/admin/page.tsx:1 | ADMIN-001 | Server-authorized staff | NATIVE-MISSING; separate role-gated workspace |
| /admin/agents | web/app/admin/agents/page.tsx:1 | ADMIN-010 | Server-authorized staff | NATIVE-MISSING; separate role-gated workspace |
| /admin/agents/catalogue | web/app/admin/agents/catalogue/page.tsx:1 | ADMIN-011 | Server-authorized staff | NATIVE-MISSING; separate role-gated workspace |
| /admin/agents/eval | web/app/admin/agents/eval/page.tsx:1 | ADMIN-010 | Server-authorized staff | NATIVE-MISSING; separate role-gated workspace |
| /admin/agents/tradie-edits | web/app/admin/agents/tradie-edits/page.tsx:1 | ADMIN-012 | Server-authorized staff | NATIVE-MISSING; separate role-gated workspace |
| /admin/customers | web/app/admin/customers/page.tsx:1 | ADMIN-003 | Server-authorized staff | NATIVE-MISSING; separate role-gated workspace |
| /admin/customers/[id] | web/app/admin/customers/[id]/page.tsx:1 | ADMIN-004 | Server-authorized staff | NATIVE-MISSING; separate role-gated workspace |
| /admin/docs | web/app/admin/docs/page.tsx:1 | ADMIN-013 | Server-authorized staff | NATIVE-MISSING; separate role-gated workspace |
| /admin/files | web/app/admin/files/page.tsx:1 | ADMIN-007 | Server-authorized staff | NATIVE-MISSING; separate role-gated workspace |
| /admin/invites | web/app/admin/invites/page.tsx:1 | ADMIN-006 | Server-authorized staff | NATIVE-MISSING; separate role-gated workspace |
| /admin/loader | web/app/admin/loader/page.tsx:1 | ADMIN-008, ADMIN-009 | Server-authorized staff | NATIVE-MISSING; separate role-gated workspace |
| /admin/metrics | web/app/admin/metrics/page.tsx:1 | ADMIN-005 | Server-authorized staff | NATIVE-MISSING; separate role-gated workspace |
| /admin/tenants | web/app/admin/tenants/page.tsx:1 | ADMIN-002 | Server-authorized staff | NATIVE-MISSING; separate role-gated workspace |
| /auth/callback | web/app/auth/callback/page.tsx:1 | AUTH-001, AUTH-007 | Provider-specific auth/recovery | NATIVE-PARTIAL; adapter/contract gaps in linked requirements |
| /auth/reset-password | web/app/auth/reset-password/page.tsx:1 | AUTH-002 | Provider-specific auth/recovery | NATIVE-PARTIAL; adapter/contract gaps in linked requirements |
| /book/[tenantId] | web/app/book/[tenantId]/page.tsx:1 | PUBLIC-023 | Public customer/token holder | WEB-RETAINED; native equivalent missing |
| /dev/doc-editor | web/app/dev/doc-editor/page.tsx:1 | ADMIN-014 | Development harness | DOCUMENTATION/DEMO; environment gate |
| /docs/sms-onboarding-architecture | web/app/docs/sms-onboarding-architecture/page.tsx:1 | ADMIN-013 | Public reference document | DOCUMENTATION; static presentation and cross-links |
| /docs/sms-onboarding-flow | web/app/docs/sms-onboarding-flow/page.tsx:1 | ADMIN-013 | Public reference document | DOCUMENTATION; static presentation and cross-links |
| /docs/tradie-onboarding-architecture | web/app/docs/tradie-onboarding-architecture/page.tsx:1 | ADMIN-013 | Public reference document | DOCUMENTATION; static presentation and cross-links |
| /docs/tradie-onboarding-plan | web/app/docs/tradie-onboarding-plan/page.tsx:1 | ADMIN-013 | Public reference document | DOCUMENTATION; static presentation and cross-links |
| /docs/tradie-onboarding-plan-sms | web/app/docs/tradie-onboarding-plan-sms/page.tsx:1 | ADMIN-013 | Public reference document | DOCUMENTATION; static presentation and cross-links |
| /forgot-password | web/app/forgot-password/page.tsx:1 | AUTH-002 | Provider-specific auth/recovery | NATIVE-PARTIAL; adapter/contract gaps in linked requirements |
| /legal/cookies | web/app/legal/cookies/page.tsx:1 | PUBLIC-005, PUBLIC-006 | Public policy | WEB-RETAINED; native reader missing; content gate |
| /legal/privacy | web/app/legal/privacy/page.tsx:1 | PUBLIC-005 | Public policy | WEB-RETAINED; native reader missing; content gate |
| /legal/terms | web/app/legal/terms/page.tsx:1 | PUBLIC-005 | Public policy | WEB-RETAINED; native reader missing; content gate |
| /m/[token] | web/app/m/[token]/page.tsx:1 | PUBLIC-020 | Private token capability; owner operations | BROWSER-HANDOFF; native saved review missing |
| /onboard | web/app/onboard/page.tsx:1 | AUTH-004, AUTH-005, AUTH-006 | Applicant or signed-in account | NATIVE-PARTIAL; adapter/contract gaps in linked requirements |
| /onboard/check-email | web/app/onboard/check-email/page.tsx:1 | AUTH-008 | Applicant or signed-in account | NATIVE-PARTIAL; adapter/contract gaps in linked requirements |
| /onboard/stripe/refresh | web/app/onboard/stripe/refresh/page.tsx:1 | AUTH-008 | Applicant or signed-in account | NATIVE-PARTIAL; adapter/contract gaps in linked requirements |
| /onboard/stripe/return | web/app/onboard/stripe/return/page.tsx:1 | AUTH-008 | Applicant or signed-in account | NATIVE-PARTIAL; adapter/contract gaps in linked requirements |
| /onboard/success | web/app/onboard/success/page.tsx:1 | AUTH-008 | Applicant or signed-in account | NATIVE-PARTIAL; adapter/contract gaps in linked requirements |
| /p/[token] | web/app/p/[token]/page.tsx:1 | PUBLIC-021 | Private token capability; owner operations | BROWSER-HANDOFF; native saved review missing |
| /paint-request/[token] | web/app/paint-request/[token]/page.tsx:1 | PUBLIC-008 | Public customer/token holder | WEB-RETAINED; native equivalent missing |
| /pricing | web/app/pricing/page.tsx:1 | PUBLIC-002 | Prospective tradie/public | WEB-RETAINED; native acquisition/reference gaps |
| /q/[token] | web/app/q/[token]/page.tsx:1 | PUBLIC-010, PUBLIC-011, PUBLIC-012 | Public customer; separately verified owner controls | WEB-RETAINED; native complete reader/action flow missing |
| /q/[token]/approve | web/app/q/[token]/approve/page.tsx:1 | PUBLIC-013 | Public view; owner-only approval | Native queue action partial; deep-link resolution missing |
| /q/[token]/book | web/app/q/[token]/book/page.tsx:1 | PUBLIC-012 | Public customer; separately verified owner controls | WEB-RETAINED; native complete reader/action flow missing |
| /q/[token]/cancelled | web/app/q/[token]/cancelled/page.tsx:1 | PUBLIC-012 | Public customer; separately verified owner controls | WEB-RETAINED; native complete reader/action flow missing |
| /q/[token]/paid | web/app/q/[token]/paid/page.tsx:1 | PUBLIC-012 | Public customer; separately verified owner controls | WEB-RETAINED; native complete reader/action flow missing |
| /q/[token]/thanks | web/app/q/[token]/thanks/page.tsx:1 | PUBLIC-012 | Public customer; separately verified owner controls | WEB-RETAINED; native complete reader/action flow missing |
| /q/aircon/[token] | web/app/q/aircon/[token]/page.tsx:1 | PUBLIC-016 | Public customer; separately verified owner controls | WEB-RETAINED; native complete reader/action flow missing |
| /q/choose/[token] | web/app/q/choose/[token]/page.tsx:1 | PUBLIC-017 | Public customer; separately verified owner controls | WEB-RETAINED; native complete reader/action flow missing |
| /q/commercial-paint/[token] | web/app/q/commercial-paint/[token]/page.tsx:1 | PUBLIC-016 | Public customer; separately verified owner controls | WEB-RETAINED; native complete reader/action flow missing |
| /q/paint/[token] | web/app/q/paint/[token]/page.tsx:1 | PUBLIC-015, PUBLIC-012 | Public customer; separately verified owner controls | WEB-RETAINED; native complete reader/action flow missing |
| /q/paint/[token]/book | web/app/q/paint/[token]/book/page.tsx:1 | PUBLIC-015, PUBLIC-012 | Public customer; separately verified owner controls | WEB-RETAINED; native complete reader/action flow missing |
| /q/paint/[token]/thanks | web/app/q/paint/[token]/thanks/page.tsx:1 | PUBLIC-015, PUBLIC-012 | Public customer; separately verified owner controls | WEB-RETAINED; native complete reader/action flow missing |
| /q/plan/[token] | web/app/q/plan/[token]/page.tsx:1 | PUBLIC-016 | Public customer; separately verified owner controls | WEB-RETAINED; native complete reader/action flow missing |
| /q/roof/[token] | web/app/q/roof/[token]/page.tsx:1 | PUBLIC-014, PUBLIC-012 | Public customer; separately verified owner controls | WEB-RETAINED; native complete reader/action flow missing |
| /q/roof/[token]/book | web/app/q/roof/[token]/book/page.tsx:1 | PUBLIC-014, PUBLIC-012 | Public customer; separately verified owner controls | WEB-RETAINED; native complete reader/action flow missing |
| /q/roof/[token]/thanks | web/app/q/roof/[token]/thanks/page.tsx:1 | PUBLIC-014, PUBLIC-012 | Public customer; separately verified owner controls | WEB-RETAINED; native complete reader/action flow missing |
| /q/solar/[token] | web/app/q/solar/[token]/page.tsx:1 | PUBLIC-022, PUBLIC-012 | Public customer; separately verified owner controls | WEB-RETAINED; native complete reader/action flow missing |
| /quote-request/[token] | web/app/quote-request/[token]/page.tsx:1 | PUBLIC-008 | Public customer/token holder | WEB-RETAINED; native equivalent missing |
| /share/[token] | web/app/share/[token]/page.tsx:1 | PUBLIC-018 | Public customer/token holder | WEB-RETAINED; native equivalent missing |
| /sign-in/[[...sign-in]] | web/app/sign-in/[[...sign-in]]/page.tsx:1 | AUTH-001 | Applicant or signed-in account | NATIVE-PARTIAL; adapter/contract gaps in linked requirements |
| /sign-up/[[...sign-up]] | web/app/sign-up/[[...sign-up]]/page.tsx:1 | AUTH-003, AUTH-006 | Applicant or signed-in account | NATIVE-PARTIAL; adapter/contract gaps in linked requirements |
| /signin | web/app/signin/page.tsx:1 | AUTH-007 | Applicant or signed-in account | NATIVE-PARTIAL; adapter/contract gaps in linked requirements |
| /signup | web/app/signup/page.tsx:1 | AUTH-001, AUTH-003, AUTH-006 | Applicant or signed-in account | NATIVE-PARTIAL; adapter/contract gaps in linked requirements |
| /signup/verify | web/app/signup/verify/page.tsx:1 | AUTH-003 | Applicant or signed-in account | NATIVE-PARTIAL; adapter/contract gaps in linked requirements |
| /solar/[tenantSlug] | web/app/solar/[tenantSlug]/page.tsx:1 | PUBLIC-022 | Public customer/token holder | WEB-RETAINED; native equivalent missing |
| /start/[tenantId] | web/app/start/[tenantId]/page.tsx:1 | PUBLIC-007 | Public customer/token holder | WEB-RETAINED; native equivalent missing |
| /studio/[token]/report | web/app/studio/[token]/report/page.tsx:1 | PUBLIC-019 | Public customer/token holder | WEB-RETAINED; native equivalent missing |
| /studio/[token]/upload | web/app/studio/[token]/upload/page.tsx:1 | PUBLIC-019 | Public customer/token holder | WEB-RETAINED; native equivalent missing |
| /t/[slug] | web/app/t/[slug]/page.tsx:1 | PUBLIC-007 | Public customer/token holder | WEB-RETAINED; native equivalent missing |
| /trades/electrical | web/app/trades/electrical/page.tsx:1 | PUBLIC-001 | Prospective tradie/public | WEB-RETAINED; native acquisition/reference gaps |
| /trades/painting | web/app/trades/painting/page.tsx:1 | PUBLIC-001 | Prospective tradie/public | WEB-RETAINED; native acquisition/reference gaps |
| /trades/plumbing | web/app/trades/plumbing/page.tsx:1 | PUBLIC-001 | Prospective tradie/public | WEB-RETAINED; native acquisition/reference gaps |
| /trades/roofing | web/app/trades/roofing/page.tsx:1 | PUBLIC-001 | Prospective tradie/public | WEB-RETAINED; native acquisition/reference gaps |
| /trades/solar | web/app/trades/solar/page.tsx:1 | PUBLIC-001 | Prospective tradie/public | WEB-RETAINED; native acquisition/reference gaps |
| /upload/[token] | web/app/upload/[token]/page.tsx:1 | PUBLIC-009 | Public customer/token holder | WEB-RETAINED; native equivalent missing |
| /upload/plan/[token] | web/app/upload/plan/[token]/page.tsx:1 | PUBLIC-009 | Public customer/token holder | WEB-RETAINED; native equivalent missing |
| /watch | web/app/watch/page.tsx:1 | PUBLIC-003 | Prospective tradie/public | WEB-RETAINED; native acquisition/reference gaps |


No /dashboard page is omitted from this specification: the other 17 pages belong to CORE/TRADE. Page-source :1 above identifies the route module; detailed implementation anchors and mobile evidence are in each linked requirement. Five trade routes share one template; five /docs routes are static explanatory presentations with cross-links; /signin, auth callback, paid and provider-return routes are adapters rather than independent app features.

#### User-facing responses outside the page.tsx census

| Route/asset family | Requirement | Audience/disposition | Evidence and action |
| --- | --- | --- | --- |
| /r/{token}/{tier} | PUBLIC-012 | Public payment mint/redirect; provider handoff | web/app/r/[token]/[tier]/route.ts:291 GET; side effect, not prefetch/read |
| /r/roof/{token}/{tier} | PUBLIC-012, PUBLIC-014 | Public roof visit mint | web/app/r/roof/[token]/[tier]/route.ts:33 GET; inspection only |
| /r/paint/{token}/{tier} | PUBLIC-012, PUBLIC-015 | Public painting visit mint/legacy tier adapter | web/app/r/paint/[token]/[tier]/route.ts:46 GET |
| /s/{shortCode} | PUBLIC-007 | Public QR redirect/SMS interstitial | web/app/s/[shortCode]/route.ts:30 GET; :88 HTML fallback |
| /q/roof/{token}/visit.ics | PUBLIC-012 | Public paid/booked calendar attachment | web/app/q/roof/[token]/visit.ics/route.ts:26 |
| /q/paint/{token}/visit.ics | PUBLIC-012 | Public paid/booked calendar attachment | web/app/q/paint/[token]/visit.ics/route.ts:26 |
| /api/email/unsubscribe/{token} | PUBLIC-024 | Public one-click suppression and HTML result | web/app/api/email/unsubscribe/[token]/route.ts:25 |
| /api/q/download and per-source PDF endpoints | PUBLIC-010, PUBLIC-012 | Public/owner document download with correct capability/authorization | web/app/q/_chrome/QuoteChrome.tsx:69; native N2 |
| /share/{token}/opengraph-image | PUBLIC-018 | Public privacy-filtered social preview | web/app/share/[token]/opengraph-image.tsx:1 |
| public/docs HTML/PDF/CSV and investor assets | ADMIN-013 | Static reference; public/internal intended audience varies | Appendix B; web/app/admin/docs/page.tsx:44 |
| Global not-found/global-error/layout/navigation/cookie UI | PUBLIC-006, PUBLIC-025 | Public/app shell state | web/app/not-found.tsx:1; web/app/global-error.tsx:1; web/app/layout.tsx:42 |

#### Required completion evidence for this section

- Route/audience coverage: all 74 page rows plus response-route family has a tested native/public-web/provider/document disposition; links from existing SMS/email/QRs still work.
- A feature is native complete only after its real fields/options/validation/state/actions work against the authorized server contract. Opening the corresponding QuoteMax web page does not prove native parity.
- Customer install-free web behavior and staff server-role checks are independently tested. Staff operations never become ordinary tradie capabilities.
- Schema/contract tests cover zero/blank/bounds, token classes, owner proof, paid/held state, route return targets, batch idempotency and structured ok:false responses.
- Provider-dependent tests use non-production authorized fixtures. Source reads, test doubles and static screenshots do not prove live Clerk factors, Stripe prices, Twilio delivery, knowledge-base availability or map/source entitlement.
- Manual iOS/Android acceptance includes cold/warm deep links, account switch, biometric lock, process restart, large text, screen readers, keyboard/safe-area layout, upload/share/download cancellation and provider return.
- No new money/send/publish/role mutation is inferred from a read action. Customer acceptance, owner review, notification delivery, settled payment and booking confirmation have separate truth.
- Unknowns requiring decisions remain visible: AGENTS/strategy reconciliation; Clerk/Supabase migration and enabled factors; activation owner/SMS-intent proof; legal identity/media assets; full native read DTOs; generation/provider licensing gates; inert assessment/contact CTAs; admin batch recovery; provider live configuration; current database migration state.

This is a source-level control/route specification for the owned scope, with runtime/provider/database unknowns called out above. It is not a claim that these flows passed production testing.

## Core dashboard and business-feature parity audit

Audit date: 2026-08-31. This is a read-only source audit of the current dirty working trees; it does not assert production, device, entitlement, or end-to-end correctness. Existing UI work was preserved. No production APIs, messages, payments, or other mutations were invoked.

Evidence prefixes: `web/` means `C:/Users/dalig/Downloads/QuoteMate/quoteMate/quotemate-automation/`; `mobile/` means `C:/Users/dalig/Desktop/MaintainTech/MaintainOrg/qm-mobile/`. Line anchors refer to the inspected working-tree source. Parent repository policy files are written as `web/../AGENTS.md` and `web/../docs/strategy.md`. An absent-feature conclusion combines the named native screen with the route/API/control census, rather than claiming that an empty grep proves behavior.

Current-status legend:
- **N**: native source implements this capability; behavior remains to be verified.
- **P**: some native controls/data exist, but the named part is incomplete.
- **W**: this capability is available only through an external website/provider handoff in the app.
- **M**: no reachable native implementation or equivalent handoff found.
- **D**: native/web semantic divergence or a policy/backend conflict must be resolved.
- **X**: not a reachable baseline feature; explicitly excluded rather than silently adding scope.

Requirements use stable `CORE-###` IDs. Each row names concrete work or preservation criteria. Contract keys `B01` onward refer to the payload/readiness register after the matrices. Every N row still requires tenant-safe, failure-state and device verification; N is not a completion claim. Every first-party W/M/P requirement must be completed natively. Existing first-party website links may remain only as temporary recovery paths with the corresponding requirement still open; they are never an alternative acceptance outcome. Provider-owned Stripe/Canva/OAuth screens remain legitimate external steps when native initiation, cancellation, validated return and authoritative status refresh are implemented. A W row is not full native parity. Native camera, share sheets, pull-to-refresh and safe back navigation are acceptable adaptations; reproducing a desktop sidebar, popup or mouse-only interaction is not required.

### Business surface census

| Website surface | Current native destination | Coverage boundary |
|---|---|---|
| `/dashboard?tab=overview` | Menu → Overview (`HomeScreen`) | Statistics, activity, service/phone readiness, recent work and action links. Home itself is now the trade Hub. |
| `?tab=quotes`; quotes inside each trade hub | Quotes tab and Home/Tools Hub quote queue | Generic quote/job list, filters, detail, document links and delivery. Trade-specific editors belong to TRADE; shared manual/chat editor to PUBLIC-011. |
| `?tab=chats` | Chats tab | SMS/voice transcript and manual SMS composer. |
| `?tab=followups` | Menu → Follow-ups | Quote and unquoted-lead chase queue, call/text/log/reopen/history/messages. |
| `?tab=calendar` | Menu → Calendar | Tenant-zone bookings, review/payment nudges, booking links and confirm action. Customer booking pages belong to PUBLIC. |
| `?tab=account` | Menu → Account | Business identity, trade activation/removal, licences, branding, availability, SMS estimator. Auth/password/biometrics belong to PUBLIC/auth. No staff/team membership workflow was found. |
| `?tab=pricing` / shared pricing cards embedded in trade hubs | Menu → General pricing (native rate cards only) | Review policy, follow-up timer, tier presentation, quote display default, early bird, invoice calibration. Rate editors, pricing wizard, catalogue, services, recipes and estimating belong to TRADE. |
| `?tab=payouts` | Menu → Payouts | Stripe Connect readiness, paid jobs, explicit completion/release, payout recovery/status. |
| `?tab=billing` | Menu → Billing | Subscription/usage, web Stripe management, native RevenueCat integration and reconciliation gap. |
| `?tab=files` | Menu → Files | Authenticated downloads, Q&A, preview and comment lifecycle. |
| `?tab=historical-quotes` | Menu → Quote history | Import/review, analytics, browse filters, historical calibration. Distinct from invoice calibration. |
| `?tab=invites` marketing landing cards | Menu marketing group | Links to customer QR page, CRM and Brand Studio; flyer/videos are separate tabs. |
| `/dashboard/invites` | Menu → Invitations | Current website is customer QR/landing configuration. Native also exposes tradie recruitment invite codes, which website moved to admin. |
| `/dashboard/crm` | Menu → CRM on the web | HubSpot/Zoho OAuth, sync/disconnect, contacts summary and announcement preview/confirmed send. |
| `?tab=flyer` | Menu → Flyer designer on the web | Native template canvas, QR insertion, asset uploads, persistence/exports, Canva integrations all remain website-side. |
| `/dashboard/studio` | No native row or screen found | Brand Studio carousel editor and exports. Distinct from Flyer/Canva and public `/studio/[token]` signage pages. |
| `?tab=videos` | Menu → Videos | Per-trade welcome/thank-you generation and playback. |
| `/dashboard/quote/[token]` | Quote detail → PDF / Edit on the web | Adapter-dependent report viewer, tier change, document/branding editor and shared TradieEditor. |
| Global dashboard shell | Five native tabs, Menu, section back controls | Profile, theme, notifications review feed, global command search, tab deep links and welcome-email side effect. |

The complete dashboard Tab union is at `web/app/dashboard/page.tsx:381`; render dispatch at `web/app/dashboard/page.tsx:1033`; navigation groups at `web/app/dashboard/page.tsx:2019`. Besides the owned rows it includes pricing/services/catalogue/estimating/recipes, legacy roofing/signage/painting/commercial-painting/aircon/estimator/solar, and trade hubs `hub-elec`, `hub-plumb`, `hub-roof`, `hub-sign`, `hub-paint`, `hub-commercial_painting`, `hub-aircon`, `hub-solar`; those specialized capabilities are covered by TRADE. Native registry is `mobile/src/features/sections/registry.ts:25`. The appendices contain the complete 91-page/273-handler census and mechanical JSX-control index.

### Requirement matrix

246 stable CORE requirements. Current source classifications: P: 37; N: 59; M: 56; X: 4; D: 14; W: 76. These are source classifications, not completion percentages.

#### Global navigation, identity and dashboard lifecycle

| ID | Feature / control | Current status | Website evidence | Native evidence | Backend / dependencies | Work and checkable acceptance |
|---|---|---|---|---|---|---|
| CORE-001 | Reach every signed-in business page | **P** | `web/app/dashboard/page.tsx:2019` | `mobile/src/features/sections/registry.ts:25` | B01 | Keep five tabs and grouped Menu; implement a discoverable native destination for every owned first-party route, including Brand Studio. Label retained temporary website fallbacks honestly, keep their native requirements open, and preserve all routes without requiring a typed URL. |
| CORE-002 | Tab and selected-record deep links | **P** | `web/app/dashboard/page.tsx:505` | `mobile/src/app/(tabs)/quotes.tsx:27` | B01 | Preserve ?tab routing on web and quoteId/conversation selection on mobile. Returning from a provider/website must restore the relevant screen and refresh changed data; do not equate arbitrary dashboard query links with native routing. |
| CORE-003 | Profile identity, account shortcut, sign out | **N** | `web/app/dashboard/page.tsx:1488` | `mobile/src/features/menu/MenuScreen.tsx:85` | B01 | Retain business identity → Account and explicit sign out; verify account switch clears tenant data through existing cleanup. Web dropdown Escape/focus-return becomes accessible native navigation, not a required copied popup. |
| CORE-004 | Appearance selection and persistence | **N** | `web/app/dashboard/page.tsx:1271` | `mobile/src/features/menu/MenuScreen.tsx:163` | Local preference | Preserve System / Charcoal / Paper radio choices, selected announcement, persisted preference and no unreadable transition flashes. Web light/dark control is covered by this native adaptation. |
| CORE-005 | Section back and refresh behavior | **N** | `web/app/dashboard/page.tsx:8834` | `mobile/src/features/sections/SectionScreen.tsx:40` | B01 | Back must pop when history exists and otherwise return to Menu; pull-to-refresh must stay available with long/empty content and not reset unrelated form drafts. |
| CORE-006 | Review notifications dropdown | **M** | `web/app/dashboard/page.tsx:1630` | `mobile/src/features/menu/MenuScreen.tsx:145` | B01 | Add an in-app review feed/count and View all destination equivalent to the web's derived pending-quote list. Preserve zero-state and dismissal. This is not a persisted notification inbox; push delivery alone does not satisfy it. |
| CORE-007 | Global command palette and quick quote lookup | **M** | `web/app/dashboard/page.tsx:1766` | `mobile/src/features/menu/MenuScreen.tsx:145` | B01 | Expose searchable navigation and recent quote hits: match navigation labels and customer/job/suburb/status; include pricing wizard; empty results and dismiss/back. Web Cmd/Ctrl+K, Enter and Escape are desktop affordances, not mandatory phone keystrokes. |
| CORE-008 | Navigation feature gates and enabled trades | **P** | `web/app/dashboard/page.tsx:1033` | `mobile/src/features/sections/registry.ts:25` | B01 | Reconcile enabled-trade/tab availability with server tenant state. Hidden/disabled routes must have a clear fallback and must not grant access by manual deep link; TRADE owns individual hub gates. |
| CORE-009 | Welcome-email first-dashboard side effect | **M** | `web/app/dashboard/page.tsx:639` | `mobile/src/app/_layout.tsx:73` | B02 | Implement the same native activation-boundary caller through the existing server-idempotent operation. Send only when the server's active/eligible-tenant policy permits it, once per tenant; never on every render or sign-in. |
| CORE-010 | Desktop sidebar collapse and floating overlays | **X** | `web/app/dashboard/page.tsx:1271` | `mobile/src/app/(tabs)/_layout.tsx:1` | Local navigation | No sidebar clone is required. Preserve reachability, active route, back behavior and screen-reader names instead; no additional business feature is hidden behind the native replacement. |

#### Overview and activity analytics

| ID | Feature / control | Current status | Website evidence | Native evidence | Backend / dependencies | Work and checkable acceptance |
|---|---|---|---|---|---|---|
| CORE-011 | All-time quoted, converted, conversion, average and review metrics | **N** | `web/app/dashboard/page.tsx:2750` | `mobile/src/features/home/HomeScreen.tsx:119` | B01 | Keep server-backed values and correct AUD/inc-GST labels. Verify empty denominators, zero values, absent totals and accepted/paid status semantics; no invented revenue or guessed tax. |
| CORE-012 | Period picker: all / year / month / week | **M** | `web/app/dashboard/page.tsx:3562` | `mobile/src/features/home/HomeScreen.tsx:119` | B03 | Add the four exact period choices and carry selected bounds into period-sensitive statistics/activity. Week starts Monday; live review backlog remains live rather than disappearing outside the selected creation window. |
| CORE-013 | Overview / Your activity mode switch | **P** | `web/app/dashboard/page.tsx:3011` | `mobile/src/features/home/ActivityAnalytics.tsx:29` | B03 | Native renders activity inline and fixed last-eight-weeks data. A compact equivalent is acceptable, but selected period and loading/error isolation must be preserved rather than silently mixing all-time money with a differently labelled trend. |
| CORE-014 | Enabled services / total service count | **M** | `web/app/dashboard/page.tsx:2798` | `mobile/src/features/home/HomeScreen.tsx:273` | B01 | Expose enabled/total service coverage and an actionable native Services destination. A link alone does not replace the count; do not derive availability from trade count. |
| CORE-015 | Recent work merges pipeline quotes and trade jobs | **P** | `web/app/dashboard/page.tsx:2849` | `mobile/src/features/home/HomeScreen.tsx:397` | B01, B04 | Native shows three pipeline quotes only. Include recent trade jobs in one chronological list and preserve record-specific edit/view destinations; count differences such as three vs five can be a deliberate responsive limit, not a reason to omit an entire source. |
| CORE-016 | Recent-work error and reload | **P** | `web/app/dashboard/page.tsx:3119` | `mobile/src/features/home/HomeScreen.tsx:397` | B04 | Give trade-job fetches independent loading/error/retry, retaining any successful quote data. A failed second source must not look like an empty complete work history. |
| CORE-017 | Actionable review item and fallback trade job | **P** | `web/app/dashboard/page.tsx:3360` | `mobile/src/features/home/HomeScreen.tsx:267` | B01, B04 | Keep exact quote navigation; include actionable trade-job fallback and consistent held-review statuses. Do not navigate to an arbitrary first record when the selected item disappears. |
| CORE-018 | Recent chats preview and open conversation | **N** | `web/app/dashboard/page.tsx:3433` | `mobile/src/features/home/HomeScreen.tsx:480` | B05 | Retain recent chat preview, channel and age, exact conversation navigation, loading/error/retry and empty state. Confirm refreshing after a reply moves the conversation into correct recency order. |
| CORE-019 | Business photo and Account shortcut | **P** | `web/app/dashboard/page.tsx:3289` | `mobile/src/features/home/HomeScreen.tsx:223` | B07 | Expose the business/owner photo state and an actionable Account shortcut when absent; native photo editing currently hands off to the website. |
| CORE-020 | SMS/voice provisioning readiness indicators | **D** | `web/app/dashboard/page.tsx:2800` | `mobile/src/features/home/HomeScreen.tsx:129` | B01, B02 | Native checks non-null numbers; web recognizes stub/provisioning values. Share an authoritative readiness model so vapi-stub/fallback numbers never show a live service. |
| CORE-021 | Business number copy/share | **N** | `web/app/dashboard/page.tsx:3655` | `mobile/src/features/home/HomeScreen.tsx:337` | B01 | Native share sheet is a valid adaptation of Copy number. Use the customer-facing number, disable absent/stub values, and show recoverable share/copy errors without leaking auth tokens. |
| CORE-022 | Retry phone provisioning | **M** | `web/app/dashboard/page.tsx:3724` | `mobile/src/features/home/HomeScreen.tsx:337` | B02 | Add the existing retry action only when number provisioning failed/incomplete; show pending, provider/server failure and refreshed readiness. Never retry automatically on each page focus. |
| CORE-023 | Eight activity counters | **N** | `web/app/dashboard/_components/OverviewAnalytics.tsx:160` | `mobile/src/features/home/ActivityAnalytics.tsx:89` | B03 | Retain People texting, People calling, Chats, Calls, Requests, Quotes, Processed and Customers, using the corresponding API headline fields. No synthetic zeros for unavailable data; confirm the displayed period matches. |
| CORE-024 | Speed-to-quote and lead funnel | **N** | `web/app/dashboard/_components/OverviewAnalytics.tsx:174` | `mobile/src/features/home/ActivityAnalytics.tsx:131` | B03 | Preserve median/returned speed semantics, no-quotes state and funnel denominators. Do not re-compute a differently defined metric from the recent-list subset. |
| CORE-025 | Weekly requests and quotes charts | **N** | `web/app/dashboard/_components/OverviewAnalytics.tsx:181` | `mobile/src/features/home/ActivityAnalytics.tsx:134` | B03 | Retain ordered week labels, zero weeks and accessible values for both series; selected period support depends on the period requirement above. |
| CORE-026 | Channel split and top job types | **N** | `web/app/dashboard/_components/OverviewAnalytics.tsx:200` | `mobile/src/features/home/ActivityAnalytics.tsx:145` | B03 | Retain channel proportions and top-job categories, meaningful labels and empty data states; charts must not depend on colour alone. |
| CORE-027 | Needs-attention review / cold-chat / inspection links | **P** | `web/app/dashboard/_components/OverviewAnalytics.tsx:227` | `mobile/src/features/home/ActivityAnalytics.tsx:162` | B03, B05 | Native attention buttons lead to unfiltered Quotes/Chats. Carry the intended review, cold-chat or inspection filter and preserve it on back; no extra sends or calls occur from the insight card. |
| CORE-028 | Analytics period bounds and load failures | **P** | `web/app/dashboard/_components/OverviewAnalytics.tsx:28` | `mobile/src/features/home/ActivityAnalytics.tsx:29` | B03 | Native fixes the analytics path to eight weeks. Add from/to support and retain independently retryable errors, stale-data indication and empty charts. Verify server weeks bounds rather than widening them client-side. |

#### Generic quotes and trade-job queue

| ID | Feature / control | Current status | Website evidence | Native evidence | Backend / dependencies | Work and checkable acceptance |
|---|---|---|---|---|---|---|
| CORE-029 | One queue merges both sources before sorting | **D** | `web/app/dashboard/page.tsx:8563` | `mobile/src/features/trades/hub/QuoteQueueSection.tsx:325` | B01, B04 | Native renders sorted pipeline quotes and then appends trade jobs. Build a tagged union, filter/sort once, use stable ties and correct destinations. A newest job must precede an older quote; unknown values must not rank as zero-priced work. |
| CORE-030 | Status filters: All / In review / Sent / Deposit paid / Inspection | **P** | `web/app/dashboard/page.tsx:8358` | `mobile/src/features/quotes/status.ts:16`; `mobile/src/features/trades/hub/QuoteQueueSection.tsx:202` | B01, B04 | Hub has five status filters; bottom Quotes has only All / In review / Sent / Accepted and no jobs. Define consistent labels, separate paid from accepted, and make all five web queues reachable while retaining useful Accepted coverage. |
| CORE-031 | Held-review status vocabulary | **D** | `web/app/dashboard/page.tsx:8358` | `mobile/src/features/quotes/status.ts:28` | B01 | Web's local filter omits awaiting_tradie_approval, which native includes. Keep the safer held-review behavior and reconcile shared statuses rather than copying the omission. Cover draft/drafted/review/awaiting_review/awaiting_tradie_approval. |
| CORE-032 | Counts include every matching record source | **D** | `web/app/dashboard/page.tsx:8651` | `mobile/src/features/trades/hub/QuoteQueueSection.tsx:172` | B01, B04 | Native status counts only cover pipeline quotes while total includes jobs. Derive status chips and displayed totals from the same merged dataset and clearly indicate partial-source failure. |
| CORE-033 | Quote/job search across all terms | **P** | `web/app/dashboard/page.tsx:8632` | `mobile/src/features/trades/hub/QuoteQueueSection.tsx:155` | B01, B04 | Apply search to jobs as well as quotes, including customer/name, suburb, scope/job type, trade, short code and status where available. Match every normalized search term; clearing search restores all permitted records. |
| CORE-034 | Trade filter: all or a present trade | **P** | `web/app/dashboard/page.tsx:8665` | `mobile/src/features/trades/hub/QuoteQueueSection.tsx:148` | B01, B04 | Hub selected trade provides partial coverage; bottom Quotes cannot narrow by trade. Add an all-trades/contextual selector when multiple trades are present without including inactive/foreign-tenant jobs. |
| CORE-035 | Sort: newest / oldest / highest value / lowest value | **P** | `web/app/dashboard/page.tsx:8394` | `mobile/src/features/trades/hub/QuoteQueueSection.tsx:256` | B01, B04 | Retain four native sort-radio values behind the Sort button, but apply them to the merged result set. Verify oldest/newest and both amount directions with equal timestamps and missing job amounts. |
| CORE-036 | From and To date filters | **M** | `web/app/dashboard/page.tsx:8705` | `mobile/src/features/trades/hub/QuoteQueueSection.tsx:129` | B01, B04 | Add inclusive date bounds, reciprocal min/max validation and clear action. Decide tenant-zone calendar boundaries explicitly; do not filter with ambiguous UTC date strings around midnight. |
| CORE-037 | Clear filters and no matches recovery | **P** | `web/app/dashboard/page.tsx:8725` | `mobile/src/features/trades/hub/QuoteQueueSection.tsx:309` | B01, B04 | Provide one clear/reset action restoring search/status/trade/date filters as appropriate. Distinguish no work from no matching work and incomplete fetches. |
| CORE-038 | Trade-job loading, error, retry and refresh | **P** | `web/app/dashboard/page.tsx:8478` | `mobile/src/features/trades/hub/QuoteQueueSection.tsx:139` | B04 | Native requests jobs but does not render job-query loading/errors/retry. Preserve successful pipeline results while showing a recoverable partial-data state, and refresh both sources after writes/return from web. |
| CORE-039 | Selected row, native detail and Back | **N** | `web/app/dashboard/page.tsx:8594` | `mobile/src/app/(tabs)/quotes.tsx:27`; `mobile/src/features/quotes/QuoteDetailModal.tsx:402` | B01 | Retain quoteId deep link, accessible row selection, detail close and return to list context. Handle deleted/missing selected IDs without silently showing an unrelated quote. |
| CORE-040 | Trade-job detail summary | **W** | `web/app/dashboard/page.tsx:9202` | `mobile/src/features/trades/hub/QuoteQueueSection.tsx:79` | B04 | Native job rows open tradieHref/href in a browser instead of an in-app detail. Add native customer/scope/status/price summary and correctly routed actions; specialized trade editing remains a TRADE dependency. |
| CORE-041 | Trade-job customer and tradie editor links | **W** | `web/app/dashboard/page.tsx:9268` | `mobile/src/features/trades/hub/QuoteQueueSection.tsx:88` | B04 | Keep customer-view and owner-edit purposes distinct. Respect per-trade destinations and browser return refresh; do not route solar to the generic line-item editor. |
| CORE-042 | Delete an unpaid generic quote | **M** | `web/app/dashboard/page.tsx:8882` | `mobile/src/features/quotes/QuoteDetailModal.tsx:365` | B06 | Add an explicit destructive confirmation with cancel, pending lock and error. Refresh queue/detail only after server success; handle paid/changed-state conflict. Do not assume accepted-but-unpaid deletion is permitted because the route currently only checks paid_at. |
| CORE-043 | Delete a trade-tool job | **M** | `web/app/dashboard/page.tsx:9225` | `mobile/src/features/trades/hub/QuoteQueueSection.tsx:79` | B04 | Expose only supported deletable states and require confirmation; submit {trade,id} to the scoped trade-job endpoint, not generic quote DELETE. Preserve paid/protected jobs and surface linked-record rejection. |
| CORE-044 | Quote customer, work, service, drafted and routing metadata | **N** | `web/app/dashboard/page.tsx:9384` | `mobile/src/features/quotes/QuoteDetailModal.tsx:211` | B01 | Retain customer/name/suburb, scope, job/trade, creation, timeframe and review routing data without truncating the only copy of important text. Missing data should remain absent or explicit, never guessed. |
| CORE-045 | Tier previews and line-item totals | **P** | `web/app/dashboard/page.tsx:9451` | `mobile/src/features/quotes/QuoteDetailModal.tsx:108` | B01, B06 | Native renders the selected/first tier only; web can inspect every priced tier. Add priced-tier preview independent from persistent tier selection, and show quantity/unit price/line amount plus authoritative inc-GST total without deriving tax from an assumed 1.1 multiplier. |
| CORE-046 | Quote-level layout override: default / itemised / summary | **N** | `web/app/dashboard/page.tsx:9786` | `mobile/src/features/quotes/QuoteDetailModal.tsx:225` | B06 | Preserve null inheritance, both explicit modes, pending disable and rollback on failure. Layout-only edits are allowed by this endpoint after payment; do not incorrectly gate them with price-edit restrictions. |
| CORE-047 | Historical price hint by job type and trade | **P** | `web/app/dashboard/page.tsx:9602` | `mobile/src/features/quotes/QuoteDetailModal.tsx:176` | B13 | Native hint request uses job_type only; pass the trade context when known and show sample/confidence/range accurately. Suggestions remain advisory and must not silently reprice a quote. |
| CORE-048 | Sent / deposit / accepted activity timeline | **N** | `web/app/dashboard/page.tsx:9456` | `mobile/src/features/quotes/QuoteDetailModal.tsx:326` | B01 | Retain actual timestamp-derived events and their labels; do not imply a complete audited event feed when both clients synthesize it from quote fields. |
| CORE-049 | Intake transcript and inspection state | **P** | `web/app/dashboard/page.tsx:9704` | `mobile/src/features/quotes/QuoteDetailModal.tsx:630` | B01 | Preserve transcript readability and both needs_inspection / inspection_required aliases. Native badge/measurement-link logic currently checks only one alias; correct mixed legacy records without enabling forbidden direct payment paths. |
| CORE-050 | Customer page and measurement detail links | **W** | `web/app/dashboard/page.tsx:9704` | `mobile/src/features/quotes/QuoteDetailModal.tsx:365` | B01, PUBLIC-010, TRADE | Implement native public/customer and specialized measurement counterparts with correct owner/customer distinctions and PUBLIC/TRADE contracts. Existing website links are temporary fallbacks, not completion; preserve installation-free public browser access, URL allowlists and missing-token states. |
| CORE-051 | PDF / Edit and PDF download actions | **W** | `web/app/dashboard/page.tsx:9704` | `mobile/src/features/quotes/QuoteDetailModal.tsx:380` | B06 | Quote detail delegates report viewing/editing/download to web URLs. Provide authenticated native preview/share/download with correct HTML/PDF adapter handling; a browser link alone does not implement document editing. |
| CORE-052 | Deposit link copy/share | **N** | `web/app/dashboard/page.tsx:9746` | `mobile/src/features/quotes/QuoteDetailModal.tsx:386` | PUBLIC payment flows | Native Share is equivalent to Copy deposit link. Use the server-selected tier and applicable public payment flow; do not invent a deposit amount or reuse obsolete percentage logic for flat-fee site visits. |
| CORE-053 | Explicit two-step approve/send/resend | **N** | `web/app/dashboard/page.tsx:9664` | `mobile/src/features/quotes/QuoteDetailModal.tsx:431` | B06 | Retain human action: initial tap only arms, second 'Tap again to confirm' commits, disarm after timeout/record change, no duplicate mutation. Hide customer-committed states and refresh only after authoritative success. |
| CORE-054 | SMS / Email delivery and recipient override | **P** | `web/app/dashboard/quote/[token]/SendQuotePanel.tsx:1` | `mobile/src/features/quotes/QuoteDetailModal.tsx:469` | B06 | Native supports channel and Customer mobile / Customer email fields for send, but held approval takes the SMS-only approve endpoint and has no channel/override UI. Unify held delivery with authorized send semantics or expose required choice safely; missing/invalid recipients must block before dispatch. |
| CORE-055 | Send failures and already-actioned outcomes | **P** | `web/app/api/quote/[id]/approve/route.ts:98` | `mobile/src/features/quotes/api.ts:34` | B06 | Model already_actioned, rejected state, provider failure and timeout distinctly. Do not optimistically show Sent from a no-op or ambiguous response; restore draft/recipient and reconcile actual server state before retrying. |
| CORE-056 | Trade-specific owner editing protection | **D** | `web/app/q/solar/[token]/page.tsx:372` | `mobile/src/features/quotes/QuoteDetailModal.tsx:380` | PUBLIC-011, TRADE | Generic editor parity must dispatch by trade/capability. Solar edits must re-draft/confirm through its synchronized estimate workflow; never mutate twin quote lines while leaving displayed solar prices/deposit stale. |

#### Standalone quote report and document workspace

| ID | Feature / control | Current status | Website evidence | Native evidence | Backend / dependencies | Work and checkable acceptance |
|---|---|---|---|---|---|---|
| CORE-057 | Owner and capability-dependent report toolbar | **W** | `web/app/dashboard/quote/[token]/QuoteReportViewerClient.tsx:119` | `mobile/src/features/quotes/QuoteDetailModal.tsx:380` | B06, PUBLIC-011, TRADE | Implement native owner-only Manual edit, Chat edit, Send, Tier and Download actions with the required editor/viewer workflows. Existing first-party browser handoffs may remain only as temporary recovery paths and do not close this requirement. Check ownership, paid state, inspection routing and adapter capabilities independently; public bearer-token viewing is not owner authorization. |
| CORE-058 | HTML body / PDF iframe / fallback download modes | **W** | `web/app/dashboard/quote/[token]/QuoteReportViewerClient.tsx:257` | `mobile/src/features/quotes/QuoteDetailModal.tsx:380` | B06 | Render each adapter bodyMode correctly and recover from preview failure with a valid download. Distinguish generic HTML report from specialized PDFs; no assumption that every quote has a usable pdf_url. |
| CORE-059 | Recommended tier selection persists server totals | **M** | `web/app/dashboard/quote/[token]/TierSelect.tsx:29`; `web/app/api/quote/[id]/tier/route.ts:81` | `mobile/src/features/quotes/QuoteDetailModal.tsx:108` | B06 | Build the native selector for priced tiers, hidden with fewer than two; PATCH {tier}, show pending/error and roll back failures. First repair the server's arbitrary tenant pricing_book.limit(1) lookup and default GST=true: resolve the quote's stored trade/version or authoritative GST snapshot and fail clearly when unavailable. Test two books with differing GST and reversed row order, changed historical versions and missing books; save/refetch/reopen/PDF must retain the quote's correct tax basis. Keep paid/inspection guards. |
| CORE-060 | Shared manual line-item editor and chat proposal editor | **W** | `web/app/dashboard/quote/[token]/QuoteReportViewerClient.tsx:308` | `mobile/src/features/quotes/QuoteDetailModal.tsx:380` | B06, PUBLIC-011 | Implement PUBLIC-011's exact line/tier fields, add/remove limits, unsaved-draft chat input, proposal Apply vs Save distinction, notify/quiet-save confirmation and explicit ungrounded override. First repair its shared save/delivery contract: a quiet price edit must not newly mark a draft Sent, held state must remain held, and explicit notification must expose a durable outcome/operation for reconciliation. No inferred pricing or automatic notification. |
| CORE-061 | Owner risk flags and assumptions | **W** | `web/app/dashboard/quote/[token]/QuoteReportViewerClient.tsx:232` | `mobile/src/features/quotes/QuoteDetailModal.tsx:211` | B06 | Keep owner-only risk/assumption visibility in the native report workspace; do not show private review material in a customer share/export or omit it before approval. |
| CORE-062 | Full document editor feature gate | **W** | `web/app/dashboard/quote/[token]/page.tsx:81` | `mobile/src/features/quotes/QuoteDetailModal.tsx:380` | B06 | Respect FULL_QUOTE_DOC and adapter support. Current route can save documents without checking this UI flag; decide whether it is a rollout gate or authorization gate before shipping a native editor. |
| CORE-063 | Narrative rich-text controls | **W** | `web/app/dashboard/quote/[token]/QuoteDocumentEditor.tsx:113` | `mobile/src/features/quotes/QuoteDetailModal.tsx:380` | B06 | Support the actual toolbar: Title/H1, Heading/H2, Bold, Italic, Underline, Highlight and Bullets, with selected state and keyboard-safe selection. Preserve document schema/sanitization; do not confuse editable narrative with locked money atoms. |
| CORE-064 | Locked pricing block and pricing-edit link | **W** | `web/app/dashboard/quote/[token]/QuoteDocumentEditor.tsx:83` | `mobile/src/features/quotes/QuoteDetailModal.tsx:380` | B06, PUBLIC-011 | Keep pricing nodes non-editable inside the narrative editor and route changes to the authorized pricing editor. Round-trip document content without dropping locked nodes or changing price/tier metadata. |
| CORE-065 | Document branding: font, accent and heading style | **W** | `web/app/dashboard/quote/[token]/BrandingControl.tsx:12` | `mobile/src/features/quotes/QuoteDetailModal.tsx:380` | B06 | Expose fonts system / serif / sans / mono; accents #FF5F00 / #0F1722 / #2563EB / #16A34A / #9333EA; headings plain / underline / bar. Persist validated report_style and match preview/export. These document colours are not a new app-chrome palette. |
| CORE-066 | Document save and unsaved changes | **W** | `web/app/dashboard/quote/[token]/QuoteDocumentWorkspace.tsx:39` | `mobile/src/features/quotes/QuoteDetailModal.tsx:380` | B06 | POST {report_doc,report_style} only on explicit save, show dirty/pending/error states, keep draft on failed save, and prevent silent loss on close/back. Successful save invalidates PDF cache and refreshes report. |
| CORE-067 | Document GST and provenance safety | **D** | `web/app/dashboard/quote/[token]/QuoteDocumentEditor.tsx:33` | `mobile/src/features/quotes/QuoteDetailModal.tsx:595` | B06, PUBLIC-011 | Do not port the document editor's hard-coded ×1.1/whole-dollar display assumption. Use authoritative tenant GST basis/line totals; preserve supplied_by/source/safety metadata across manual/chat saves, including the backend schema hardening noted in PUBLIC-011. |
| CORE-068 | Report send panel and success/return state | **W** | `web/app/dashboard/quote/[token]/SendQuotePanel.tsx:1` | `mobile/src/features/quotes/QuoteDetailModal.tsx:431` | B06 | Reuse the guarded native send flow when report viewing becomes native. Preserve SMS/email overrides, resend labels, pending/error, post-send refresh and close without sending; document edits never imply send. |

#### Chats and manual customer messaging

| ID | Feature / control | Current status | Website evidence | Native evidence | Backend / dependencies | Work and checkable acceptance |
|---|---|---|---|---|---|---|
| CORE-069 | SMS and voice conversation list | **N** | `web/app/dashboard/page.tsx:15264` | `mobile/src/features/chats/ChatsScreen.tsx:29` | B05 | Retain channel, customer/phone, preview and recency ordering with list/thread back navigation. Server currently returns a bounded recent list; do not describe it as all historical conversations. |
| CORE-070 | All / Went cold list filter and counts | **M** | `web/app/dashboard/page.tsx:15515` | `mobile/src/features/chats/ChatsScreen.tsx:62` | B05 | Add All / Went cold and counts using the exact predicate: SMS, conversation_type not tradie_registration, status abandoned (case-insensitive). Honor Overview's cold-chat navigation and do not classify voice or merely old conversations as cold. |
| CORE-071 | Thread metadata and status | **P** | `web/app/dashboard/page.tsx:15767` | `mobile/src/features/chats/ChatThread.tsx:67` | B05 | Native shows channel/phone/age but omits web status, trade context, in/out counts, SMS turn count and voice duration. Display applicable values without inventing duration for SMS or treating manual replies as AI turns. |
| CORE-072 | Open related quote from conversation | **M** | `web/app/dashboard/page.tsx:15846` | `mobile/src/features/chats/ChatThread.tsx:67` | B01, B05 | Expose a related-quote action when intake linkage exists; resolve exact owned quote when possible and handle deleted/uncreated quote without showing a false link. |
| CORE-073 | Transcript bubbles and actor/timestamp details | **P** | `web/app/dashboard/page.tsx:15875` | `mobile/src/features/chats/ChatThread.tsx:188` | B05 | Keep direction and text, add accessible exact date/time and distinguish customer, AI and manual owner reply when the payload supports it. Do not label all outbound messages as personally authored by the owner. |
| CORE-074 | Manual SMS composer and send | **N** | `web/app/dashboard/page.tsx:15795` | `mobile/src/features/chats/ChatThread.tsx:53` | B05 | Trim empty input, enforce 1,600-character server cap with useful validation, keep explicit send, and disable while pending. Voice conversations must remain read-only; send from the tenant's provisioned number only. |
| CORE-075 | Per-conversation drafts across navigation | **N** | `web/app/dashboard/page.tsx:15465` | `mobile/src/features/chats/ChatsScreen.tsx:41` | B05 | Keep drafts keyed by conversation, preserve them when switching/backing out and on errors, and clear only the successful conversation's draft. Do not promise process-death persistence unless implemented/tested. |
| CORE-076 | Manual reply error and optimistic transcript recovery | **N** | `web/app/dashboard/page.tsx:15465` | `mobile/src/features/chats/chats-api.ts:65` | B05 | Keep message in composer when server/provider rejects, prevent duplicate sends and reconcile optimistic transcript after success/timeout. Server may send successfully but fail message logging; ambiguous outcomes must not be retried blindly. |
| CORE-077 | Chats initial, stale, empty and refresh states | **N** | `web/app/dashboard/page.tsx:15401` | `mobile/src/features/chats/ChatsScreen.tsx:62` | B05 | Preserve initial spinner/skeleton, retry, stale-data warning, no-chats state and pull-to-refresh. Refresh on returning from related quote or successful reply without discarding other chat drafts. |

#### Follow-ups: queue, call/text, notes and history

| ID | Feature / control | Current status | Website evidence | Native evidence | Backend / dependencies | Work and checkable acceptance |
|---|---|---|---|---|---|---|
| CORE-078 | Quote follow-ups plus unquoted SMS leads | **N** | `web/app/dashboard/page.tsx:13951` | `mobile/src/features/sections/FollowupsScreen.tsx:45` | B08 | Retain separate identifiers/kinds and requested includeActioned=1,minAgeHours=0 semantics. Unquoted leads cannot use quote-only notes/history/reopen routes. |
| CORE-079 | To chase / contacted groups and counts | **N** | `web/app/dashboard/page.tsx:14152` | `mobile/src/features/sections/FollowupsScreen.tsx:332` | B08 | Keep chronological priority, accurate counts, last-contact state and distinction between no follow-ups and none matching current search. |
| CORE-080 | Search name, suburb, phone and follow-up short code | **N** | `web/app/dashboard/page.tsx:14269` | `mobile/src/features/sections/FollowupsScreen.tsx:344` | B08 | Search the relevant normalized fields for quote and lead rows, retain typed query while refreshing, and clear it explicitly. Hidden rows must not change the displayed count incorrectly. |
| CORE-081 | Category filter and dynamic counts | **M** | `web/app/dashboard/page.tsx:14278` | `mobile/src/features/sections/FollowupsScreen.tsx:332` | B08 | Add the existing category options derived from available rows, counts, clear/reset and invalid-selection fallback. Do not leave the screen empty when refreshed data removes the selected category. |
| CORE-082 | Paid/booked jobs nudge to Calendar | **M** | `web/app/dashboard/page.tsx:13995` | `mobile/src/features/sections/FollowupsScreen.tsx:332` | B09 | Expose the web calendar-derived payment/booking nudge and route to relevant Calendar work. Keep loading failures isolated from the main chase queue. |
| CORE-083 | Follow-up row customer/status/inspection/price/age context | **N** | `web/app/dashboard/page.tsx:14344` | `mobile/src/features/sections/FollowupsScreen.tsx:91` | B08 | Keep contact/name/suburb/job, inspection indicator, delivered quote or lead state, authoritative price and age; unquoted leads must not display an invented quote total. |
| CORE-084 | Call bridges owner's mobile to customer | **N** | `web/app/dashboard/page.tsx:14090` | `mobile/src/features/sections/FollowupsScreen.tsx:106` | B08 | Retain explicit Call intent, owner-first explanation, pending/error/result and missing-phone disable. POST only the owned quoteId or conversationId; never allow arbitrary destination/caller ID in the body. |
| CORE-085 | Text compose, cancel and send | **N** | `web/app/dashboard/page.tsx:14893` | `mobile/src/features/sections/FollowupsScreen.tsx:111` | B08 | Keep explicit text action, 640-character cap, trim/empty checks, pending lock, cancel and error recovery. Refresh conversation/follow-up state only after successful send; no auto-send when opening composer. |
| CORE-086 | Suggested SMS copy with quote short code | **M** | `web/app/dashboard/page.tsx:14901` | `mobile/src/features/sections/FollowupsScreen.tsx:94` | B08 | Native starts with a blank draft. Offer the same editable quote/lead-specific starting text and short code without sending automatically or replacing an in-progress manual draft. |
| CORE-087 | Open quote from follow-up row | **M** | `web/app/dashboard/page.tsx:14449` | `mobile/src/features/sections/FollowupsScreen.tsx:91` | B01, B08 | Add an owned quote-detail/customer-view action with clear destination; leads without a quote must not show it. |
| CORE-088 | Expand SMS messages and reply recency | **N** | `web/app/dashboard/page.tsx:15141` | `mobile/src/features/sections/FollowupThread.tsx:47` | B08 | Retain lazily loaded messages for quoteId/conversationId, loading/error/empty states and last customer-reply context. Invalidate the exact thread after a sent follow-up. |
| CORE-089 | Log touch outcomes and optional note | **N** | `web/app/dashboard/page.tsx:14649` | `mobile/src/features/sections/FollowupsScreen.tsx:36` | B08 | Retain left_voicemail / spoke / no_answer / wants_callback / not_interested / other choices, note max 500, explicit save/cancel and error. Note action is quote-only and must not trigger a call/text. |
| CORE-090 | Log another touch on contacted quote | **M** | `web/app/dashboard/page.tsx:14495` | `mobile/src/features/sections/FollowupsScreen.tsx:195` | B08 | Native contacted rows offer Reopen but no Log another. Allow another note without first changing chase state; preserve the existing audit trail and avoid unnecessary status transitions. |
| CORE-091 | Reopen a contacted quote | **N** | `web/app/dashboard/page.tsx:14025` | `mobile/src/features/sections/FollowupsScreen.tsx:121` | B08 | Submit {quoteId,action:'reopen'}, show pending/error and move the row/counts only after success; handle concurrently paid/removed quotes safely. |
| CORE-092 | Follow-up history/event expander | **M** | `web/app/dashboard/page.tsx:14791` | `mobile/src/features/sections/FollowupsScreen.tsx:91` | B08 | Fetch quote-only GET events and display call/text/note outcomes, summary, note, actor/time as provided, empty/error/retry. Messages and last-contact fields are not a replacement for the event history. |
| CORE-093 | Pagination / show more / filter reset | **N** | `web/app/dashboard/page.tsx:14163` | `mobile/src/features/sections/FollowupsScreen.tsx:444` | B08 | Native ten-row Show more is a valid adaptation of web pagination. Reset visible page when search/category changes, preserve group counts, and disclose server caps instead of presenting unbounded completeness. |

#### Calendar and booking operations

| ID | Feature / control | Current status | Website evidence | Native evidence | Backend / dependencies | Work and checkable acceptance |
|---|---|---|---|---|---|---|
| CORE-094 | Upcoming, past, paid-unscheduled and awaiting-booking groups | **N** | `web/app/dashboard/_components/CalendarTab.tsx:631` | `mobile/src/features/sections/CalendarScreen.tsx:142` | B09 | Retain distinct job/site-visit/callback booking states, paid jobs needing a time, pending customer booking and show/hide past. Empty groups must not hide other actionable groups. |
| CORE-095 | Tenant business timezone for labels and grouping | **D** | `web/app/dashboard/_components/CalendarTab.tsx:55` | `mobile/src/features/sections/CalendarScreen.tsx:56` | B09 | Native formats/group slots in device-local time, ignoring returned tenantTz. Use tenant business zone for date/time, week/day grouping and labels; verify an AU tenant viewed from a different device zone and DST boundary. |
| CORE-096 | This-week seven-day strip and selected-day jump | **M** | `web/app/dashboard/_components/CalendarTab.tsx:537` | `mobile/src/features/sections/CalendarScreen.tsx:142` | B09 | Add the seven current-week day choices, today/selected states and jump/filter behavior. The inspected website has no previous/next-month calendar navigation; do not invent that as a parity obligation. |
| CORE-097 | Calendar week summary metrics | **M** | `web/app/dashboard/_components/CalendarTab.tsx:388` | `mobile/src/features/sections/CalendarScreen.tsx:142` | B09 | Expose the website's this-week bookings, site visits, jobs and callbacks counts with correct $99 site-visit context. Use the same tenant-zone week and classification as event rows. |
| CORE-098 | Quotes awaiting review nudge | **M** | `web/app/dashboard/_components/CalendarTab.tsx:596` | `mobile/src/features/sections/CalendarScreen.tsx:142` | B09, B01 | Add the review-count action and route to a review-filtered queue. Reconcile backend count's narrow drafted status with actual held-review vocabulary before treating it as complete. |
| CORE-099 | New booking action | **W** | `web/app/dashboard/_components/CalendarTab.tsx:435` | `mobile/src/features/sections/CalendarScreen.tsx:179` | B09, PUBLIC booking | Implement a native New booking entry and booking workflow using PUBLIC's tenant availability, token and validation contracts. Existing per-job Set time website links are temporary fallbacks and do not complete generic booking or scheduling parity. |
| CORE-100 | Event / paid-job / awaiting-booking destinations | **W** | `web/app/dashboard/_components/CalendarTab.tsx:803` | `mobile/src/features/sections/CalendarScreen.tsx:179` | B09, PUBLIC booking | Route event viewing, paid-job scheduling and awaiting-customer-booking actions to their native PUBLIC/CORE counterparts while preserving record/token context and installation-free browser links. A first-party browser fallback remains an open gap; do not mislabel viewing as confirmation. |
| CORE-101 | Confirm requested booking | **N** | `web/app/dashboard/_components/CalendarTab.tsx:303` | `mobile/src/features/sections/CalendarScreen.tsx:69` | B09 | POST calendar/{id}/confirm only for requested events; show pending, conflict/error and refreshed state. Native already has a clearer error than web; preserve it and accept 409 concurrent-state conflict without duplicate confirmation. |
| CORE-102 | Calendar refresh, retry and load states | **N** | `web/app/dashboard/_components/CalendarTab.tsx:425` | `mobile/src/features/sections/CalendarScreen.tsx:165` | B09 | Pull-to-refresh is equivalent to web Sync. Keep initial skeleton, retry, no-bookings state, past toggle and partial-data handling; provider return must refresh booking/payment state. |
| CORE-103 | Reschedule/cancel/admin calendar controls | **X** | `web/app/dashboard/_components/CalendarTab.tsx:231` | `mobile/src/features/sections/CalendarScreen.tsx:142` | PUBLIC booking | No general owner reschedule/cancel UI was found in this tab. Customer booking-page actions are inventoried by PUBLIC; do not invent a full CRM calendar-management feature as baseline parity. |

#### Business account, branding, availability and trades

| ID | Feature / control | Current status | Website evidence | Native evidence | Backend / dependencies | Work and checkable acceptance |
|---|---|---|---|---|---|---|
| CORE-104 | Read business identity and contact summary | **N** | `web/app/dashboard/page.tsx:4228` | `mobile/src/features/menu/AccountCard.tsx:34` | B01, B07 | Retain business/owner/email/trades/state/AI-line summary and accurate absent values. Read-only identity is not completion of the editable Account page. |
| CORE-105 | Edit business name | **W** | `web/app/dashboard/page.tsx:4336` | `mobile/src/features/sections/AccountScreen.tsx:96` | B07 | Add native business_name field with existing 2–80-character validation and explicit save; read back canonical value. Account currently links to the entire web Account page. |
| CORE-106 | Edit owner's first name | **W** | `web/app/dashboard/page.tsx:4345` | `mobile/src/features/sections/AccountScreen.tsx:96` | B07 | Add owner_first_name 1–40-character field and server error mapping. Do not confuse this with the separate video contact_name or Clerk legal identity. |
| CORE-107 | Edit owner email | **W** | `web/app/dashboard/page.tsx:4353` | `mobile/src/features/sections/AccountScreen.tsx:96` | B07 | Add owner_email email validation/max 120 and explicit save; this business contact update is not a Clerk login/email-change operation. |
| CORE-108 | Edit owner mobile | **W** | `web/app/dashboard/page.tsx:4361` | `mobile/src/features/sections/AccountScreen.tsx:96` | B07 | Add owner_mobile existing 8–20-character schema checks and useful AU format guidance. Refresh click-to-call readiness; do not silently overwrite the provisioned customer-facing Twilio number. |
| CORE-109 | Edit state / territory | **W** | `web/app/dashboard/page.tsx:4369` | `mobile/src/features/sections/AccountScreen.tsx:96` | B07 | Offer NSW / VIC / QLD / WA / SA / TAS / ACT / NT and save canonical code. Reflect any business-zone-dependent scheduling behavior without rewriting previously stored slots. |
| CORE-110 | Optional ABN | **W** | `web/app/dashboard/page.tsx:4383` | `mobile/src/features/sections/AccountScreen.tsx:96` | B07 | Blank ABN must remain accepted. Existing tenant schema accepts optional text up to 20; any new checksum/normalization requirement needs an explicit backend/product decision rather than a native-only rejection. |
| CORE-111 | Account save, pending, error and saved feedback | **W** | `web/app/dashboard/page.tsx:4401` | `mobile/src/features/sections/AccountScreen.tsx:96` | B07 | Save edited tenant fields through PATCH /me, prevent repeated submissions, preserve values after rejection, and refresh displayed account data only on success. Keep field-level errors and accessible saved feedback. |
| CORE-112 | SMS estimator enable/disable | **W** | `web/app/dashboard/page.tsx:3998` | `mobile/src/features/sections/AccountScreen.tsx:96` | B07 | Add sms_estimator_enabled toggle with explicit pending/error/saved state and default false. It controls SMS intake behavior; no send or number-provisioning side effect is implied by a UI toggle. |
| CORE-113 | Default weekly availability day toggles | **W** | `web/app/dashboard/page.tsx:4170` | `mobile/src/features/sections/AccountScreen.tsx:96` | B07 | Support Monday through Sunday enabled state and current business-zone default. Preserve off days and the versioned availability object; do not invent a timezone selector that the web editor does not expose. |
| CORE-114 | Default availability start/end times | **W** | `web/app/_components/AvailabilityEditor.tsx:55` | `mobile/src/features/sections/AccountScreen.tsx:96` | B07 | Expose each enabled day's start/end, validate strict HH:MM and start before end, save the whole default_availability object and show retryable failures. Default is weekdays 07:00–15:00 with weekends off when no schedule exists. |
| CORE-115 | Upload/replace business logo | **W** | `web/app/dashboard/page.tsx:4073` | `mobile/src/features/sections/AccountScreen.tsx:96` | B07 | Use a native picker and multipart file upload to /tenant/logo. Enforce PNG/JPG/WEBP/SVG and ≤2MB, preview retained/current image, show pending/error, and refresh branding without silently removing the old image on failure. |
| CORE-116 | Upload/replace owner photo | **W** | `web/app/dashboard/page.tsx:4073` | `mobile/src/features/sections/AccountScreen.tsx:96` | B07 | Use /tenant/photo with the same allowed MIME/2MB constraints and tenant ownership. Preserve existing photo/fallback and distinguish owner photo from business logo. |
| CORE-117 | Licence fields per active trade | **W** | `web/app/dashboard/page.tsx:5122` | `mobile/src/features/sections/AccountScreen.tsx:96` | B07 | Expose each active trade's licence type, number, issuing state and expiry date, preserving unedited entries and Save errors. Empty optional details remain allowed where server schema allows them. |
| CORE-118 | Licence API supports only elec/plumb keys | **D** | `web/lib/tenant/update-schema.ts:14` | `mobile/src/features/sections/AccountScreen.tsx:96` | B07 | The web iterates active trades but licences_by_trade schema uses the elec/plumb enum. Extend and validate backend licence coverage for every currently supported active trade before enabling its native save. Until repaired, keep an honest unavailable state and an open requirement; hiding the fields is not parity and submitted fields must not be silently dropped. |
| CORE-119 | Select enabled trades and staged changes | **W** | `web/app/dashboard/page.tsx:5318` | `mobile/src/features/sections/AccountScreen.tsx:96` | B07, TRADE | Use available/manageable trades from server, staged selections, min-one-trade validation and explicit dirty Save. Do not treat a local hub selector as business trade activation. |
| CORE-120 | Confirm trade removal and reconcile | **W** | `web/app/dashboard/page.tsx:5491` | `mobile/src/features/sections/AccountScreen.tsx:96` | B07, TRADE | Show removal consequences and Cancel/Confirm; POST reconcile {trades}, handle activated/deactivated/warning response and refresh books/navigation. Retain historical quotes and do not broaden supported trades without policy review. |
| CORE-121 | Legacy ActivateTradeCard reachability | **X** | `web/app/dashboard/page.tsx:5559` | `mobile/src/features/sections/AccountScreen.tsx:96` | B07, TRADE | Function/prop exists but no reachable <ActivateTradeCard> render was found. The active manage-trades flow is the parity baseline; do not add a second activation wizard merely from dead component code. |
| CORE-122 | Password/security and team boundaries | **X** | `web/app/dashboard/_components/ChangePasswordCard.tsx:1` | `mobile/src/features/sections/AccountScreen.tsx:23` | PUBLIC/auth | Password/Clerk/biometric/session behavior is owned by PUBLIC/auth. No staff member invite, role management or seat assignment UI/API baseline was found here; recruitment codes are not team invitations. |

#### Tenant-wide quote policy and invoice calibration

| ID | Feature / control | Current status | Website evidence | Native evidence | Backend / dependencies | Work and checkable acceptance |
|---|---|---|---|---|---|---|
| CORE-123 | Review policy choices | **M** | `web/app/dashboard/page.tsx:5855` | `mobile/src/features/sections/PricingBookScreen.tsx:1` | B07 | Add auto_send / always_review / review_over_threshold and inherited/default presentation exactly as persisted. Resolve policy conflict before exposing auto-send; current native General pricing has rate cards, not these controls. |
| CORE-124 | Review amount threshold | **M** | `web/app/dashboard/page.tsx:5893` | `mobile/src/features/sections/PricingBookScreen.tsx:1` | B07 | Expose inc-GST threshold only when threshold mode applies, validate positive UI amount and backend bounds, retain saved threshold when another mode is selected, and submit only authorized changed policy. |
| CORE-125 | Review policy save and book propagation | **M** | `web/app/dashboard/page.tsx:5910` | `mobile/src/features/sections/PricingBookScreen.tsx:1` | B07 | Save only dirty state, show busy/error/success, and verify PATCH /me fan-out updates applicable pricing books. Native cache invalidation must include /me and trade pricing readers. |
| CORE-126 | Two-hour follow-up opt-in | **M** | `web/app/dashboard/page.tsx:6023` | `mobile/src/features/sections/PricingBookScreen.tsx:1` | B07 | Expose followup_2h_enabled default false, explicit save and error recovery. Respect paid/booked/replied suppression and one-per-quote semantics; this is an automated customer message and needs the recorded policy decision. |
| CORE-127 | Per-trade quote tier presentation mode | **P** | `web/app/dashboard/page.tsx:6151` | `mobile/src/features/trades/hub/sections/PricingSection.tsx:74` | B07, TRADE | Native already offers single / good_better_best / good / better / best for electrical, plumbing, roofing, painting, commercial_painting and solar with a book. It saves on selection instead of web's staged Save. Preserve explicit selected/error state, latest-value ordering and cache refresh; failure must not be mistaken for persisted success. Fix the local initialMode not resynchronizing on trade change (TRADE-013); displayed choice must match the newly selected trade's persisted book. |
| CORE-128 | Tenant default itemised / summary display | **M** | `web/app/dashboard/page.tsx:6273` | `mobile/src/features/sections/PricingBookScreen.tsx:1` | B07 | Add quote_display default itemised/summary with save/pending/error. Existing quote-level layout override must remain unchanged; null quotes inherit the updated default only through the established rendering contract. |
| CORE-129 | Early-bird enabled state | **M** | `web/app/dashboard/page.tsx:6750` | `mobile/src/features/sections/PricingBookScreen.tsx:1` | B07 | Add enabled toggle and save policy explicitly. Preserve unrelated overlay keys and keep disabled saved settings available without applying discounts to existing accepted quotes. |
| CORE-130 | Early-bird discount and acceptance window | **M** | `web/app/dashboard/page.tsx:6785` | `mobile/src/features/sections/PricingBookScreen.tsx:1` | B07 | Expose discount_pct (0–15, UI step .5) and window_hours (1–336; web input steps whole hours); enabled requires a positive discount. Display actual defaults (10%,24h) only when absent and never compute customer price client-side. |
| CORE-131 | Invoice calibration uploads and report list | **M** | `web/app/dashboard/page.tsx:6451` | `mobile/src/features/sections/PricingBookScreen.tsx:1` | B10 | Provide the separate /tenant/calibration workflow: uploaded invoices, extraction state, per-trade observations and suggestions. Native History's historical-quote calibration is not this feature. |
| CORE-132 | Upload invoice file for extraction | **M** | `web/app/dashboard/page.tsx:6518` | `mobile/src/features/sections/PricingBookScreen.tsx:1` | B10 | Pick JPG/PNG/WEBP/HEIC/PDF, enforce web raw-file ≤3MB constraint, and POST base64 without prefix plus mime_type. Show unsupported/oversize/upload/extraction errors and refresh reports; never infer an hourly price before server extraction. |
| CORE-133 | Review calibration evidence and estimator comparison | **M** | `web/app/dashboard/page.tsx:6650` | `mobile/src/features/sections/PricingBookScreen.tsx:1` | B10 | Show matched items/counts, extracted observations, current versus suggested rate and estimator comparison per trade so acceptance is informed. Distinguish no matches, rejected suggestions and processing failures. |
| CORE-134 | Accept or reject calibration suggestion | **M** | `web/app/dashboard/page.tsx:6573` | `mobile/src/features/sections/PricingBookScreen.tsx:1` | B10 | POST {trade,accept:true\|false} only on explicit owner choice. Server recomputes from current authoritative pricing/invoices and logs decision; native must not send a user-edited guessed rate or auto-accept on upload. |

#### Stripe Connect and job payouts

| ID | Feature / control | Current status | Website evidence | Native evidence | Backend / dependencies | Work and checkable acceptance |
|---|---|---|---|---|---|---|
| CORE-135 | Connect setup and return from Stripe | **W** | `web/app/dashboard/page.tsx:4457` | `mobile/src/features/sections/PayoutsScreen.tsx:127` | B11 | Native exposes a provider handoff for incomplete Connect setup. Preserve not-started/incomplete/verifying/ready distinctions, clear purpose and return refresh; never collect bank credentials inside QuoteMax UI. |
| CORE-136 | Refresh Stripe account status | **M** | `web/app/dashboard/page.tsx:4490` | `mobile/src/features/sections/PayoutsScreen.tsx:127` | B11 | Add POST connect/refresh or an equivalent explicit reconciliation step. GET payouts reads tenant readiness flags and does not replace web's refresh mutation; pull-to-refresh alone can leave setup appearing incomplete. |
| CORE-137 | Update payout details when ready | **M** | `web/app/dashboard/page.tsx:4608` | `mobile/src/features/sections/PayoutsScreen.tsx:127` | B11 | Offer the existing connect/start account-link flow for an already-ready account. Native currently shows continue/setup only when not ready; bank changes still belong in Stripe's controlled UI. |
| CORE-138 | Connected bank and available/pending balance | **N** | `web/app/dashboard/page.tsx:5073` | `mobile/src/features/sections/PayoutsScreen.tsx:127` | B11 | Retain bank/last-four and server Stripe balances in AUD, distinguish unknown from zero and show provider lookup failures without falsely promising available funds. |
| CORE-139 | Payout schedule and outstanding requirements | **M** | `web/app/dashboard/page.tsx:5073` | `mobile/src/features/sections/PayoutsScreen.tsx:37` | B11 | Display payout schedule and actionable currently-due/verification requirements from the returned account object. Explain verifying versus blocked rather than presenting only a boolean Ready. |
| CORE-140 | Held / paid out / this month / platform fee summary | **M** | `web/app/dashboard/page.tsx:5007` | `mobile/src/features/sections/PayoutsScreen.tsx:127` | B11 | Add server-backed summary and disclosed recent-200 cap. Keep paid date/time boundaries and 2% fee semantics; do not sum unsupported states or imply all-time totals from a truncated window. |
| CORE-141 | Awaiting versus released job lists | **P** | `web/app/dashboard/page.tsx:4825` | `mobile/src/features/sections/PayoutsScreen.tsx:63` | B11 | Retain actual paid amount/net and release state; add fee breakdown, paid timestamp and truncation context. Released does not necessarily mean bank payout is paid. |
| CORE-142 | Mark complete and release payout | **N** | `web/app/dashboard/page.tsx:4852` | `mobile/src/features/sections/PayoutsScreen.tsx:63` | B11 | Keep explicit owner action, in-flight disable and error handling, server tenant/paid checks and no automatic completion on navigation. Do not claim funds released merely because completion was recorded. |
| CORE-143 | Retry release after completion was already recorded | **D** | `web/app/dashboard/page.tsx:4931` | `mobile/src/features/sections/PayoutsScreen.tsx:99` | B11 | Native hides the action when completed_at exists. Server records completion before settlement/eligibility checks, so keep a Release payout/retry action for completed-but-unreleased jobs after a blocked response or failure. |
| CORE-144 | Represent completion/release response outcomes | **D** | `web/app/api/quote/[id]/complete/route.ts:104` | `mobile/src/features/sections/PayoutsScreen.tsx:59` | B11 | Replace the empty completion schema with ok/completed/released/block/in_flight/payout outcomes as actually returned. A 200 with released:false must show its reason and next action, not silently disappear after invalidation. |
| CORE-145 | Live payout status, arrival and failure recovery | **M** | `web/app/dashboard/page.tsx:4955` | `mobile/src/features/sections/PayoutsScreen.tsx:25` | B11 | Render Stripe payout pending / in_transit / paid / failed / canceled and arrival date when available. Distinguish transfer/release from payout status; refresh asynchronously and retain support/retry guidance for failure. |
| CORE-146 | Platform-fee product copy conflict | **D** | `web/app/dashboard/_components/BillingTab.tsx:441`; `web/app/dashboard/page.tsx:5038` | `mobile/src/features/sections/PayoutsScreen.tsx:127` | B11, B12 | Web billing says 'No cut of jobs' while payouts and release logic charge 2%. Resolve the product/pricing statement explicitly and keep web/native fee copy aligned with the actual server calculation; do not change transaction behavior to match a slogan. |

#### Subscription billing, usage and provider reconciliation

| ID | Feature / control | Current status | Website evidence | Native evidence | Backend / dependencies | Work and checkable acceptance |
|---|---|---|---|---|---|---|
| CORE-147 | Current plan, lifecycle and renewal/trial date | **N** | `web/app/dashboard/_components/BillingTab.tsx:88` | `mobile/src/features/sections/BillingScreen.tsx:102` | B12 | Retain active/trialing/past_due/cancel-at-period-end/no-plan states and dates, support absent Stripe customer, and never label a cancelled or past-due entitlement as fully active without server policy. |
| CORE-148 | Usage: quotes and voice allowance | **P** | `web/app/dashboard/_components/BillingTab.tsx:319` | `mobile/src/features/sections/BillingScreen.tsx:171` | B12 | Retain actual usage/limits and fair-use/no-hard-mid-job-cut explanation. Show voice 'not included' where appropriate rather than silently omitting it; do not invent usage from local device calls. |
| CORE-149 | Manage existing Stripe subscription | **W** | `web/app/dashboard/_components/BillingTab.tsx:201` | `mobile/src/features/sections/BillingScreen.tsx:103` | B12 | Use authenticated portal URL creation, then provider browser handoff and return refresh. Handle no_customer, expired URL and unavailable portal without clearing current plan. |
| CORE-150 | Starter / Pro / Crew and monthly / annual choice | **P** | `web/app/dashboard/_components/BillingTab.tsx:343` | `mobile/src/features/sections/BillingScreen.tsx:113` | B12 | Web exposes interval, published ex-GST pricing/features, annual saving and existing-plan selection; native delegates offers to RevenueCat. Verify offering products map to the same plans/intervals and actual eligibility, without hard-coded cross-store price claims. |
| CORE-151 | Trial, existing plan switch and preselected plan intent | **P** | `web/app/dashboard/_components/BillingTab.tsx:51` | `mobile/src/features/sections/BillingScreen.tsx:113` | B12 | Preserve explicit checkout intent, monthly Starter trial eligibility, switch confirmation/proration and already-current/no-op behavior. A plan in a deep link must select/review, never automatically purchase. |
| CORE-152 | Native paywall integration | **N** | `mobile/src/lib/purchases.ts:179` | `mobile/src/features/sections/BillingScreen.tsx:113` | B12 | Existing native code presents the RevenueCat paywall and handles SDK result. Verify configured products, Clerk-bound identity, cancellation/error and UI pending states using sandbox only; source integration alone does not prove backend entitlements. |
| CORE-153 | RevenueCat purchase → backend entitlements | **D** | `web/app/api/billing/status/route.ts:11` | `mobile/src/features/sections/BillingScreen.tsx:113` | B12; G-006 / X-011 reconciliation | Native reports 'Plan updated' then refetches Stripe-backed status. No RevenueCat webhook/reconciliation handler appears in current 267 /api census or app/lib references. Add server-verified entitlement mapping/revocation/idempotency before treating purchase success as a usable subscription. |
| CORE-154 | Avoid duplicate Stripe and app-store subscriptions | **D** | `web/app/api/billing/checkout/route.ts:55` | `mobile/src/features/sections/BillingScreen.tsx:185` | B12; G-006 / X-011 provider rules | Native Change plan always invokes RevenueCat even for a live Stripe subscriber. Introduce authoritative billing-origin/subscription ownership and appropriate manage/switch path; show migration/existing-subscription guidance rather than selling a second plan. |
| CORE-155 | Restore purchases and native customer management | **M** | `mobile/src/lib/purchases.ts:210` | `mobile/src/features/sections/BillingScreen.tsx:185` | B12 | Restore/customer-center helpers exist but are not wired to Billing controls. Expose correct platform-supported management/restore, reconcile results with server access and show no-purchase/wrong-account/error states. |
| CORE-156 | Billing request errors and return notifications | **P** | `web/app/dashboard/_components/BillingTab.tsx:64` | `mobile/src/features/sections/BillingScreen.tsx:102` | B12 | Preserve initial/retry/stale UI plus successful subscribed/switched feedback and cancellation/error on return. Avoid repeated paywall or portal launches during a pending action and avoid success text before authoritative reconciliation. |

#### Files, document Q&A, previews and comments

| ID | Feature / control | Current status | Website evidence | Native evidence | Backend / dependencies | Work and checkable acceptance |
|---|---|---|---|---|---|---|
| CORE-157 | Owned file list, metadata and refresh | **N** | `web/app/dashboard/_components/FilesTab.tsx:85` | `mobile/src/features/sections/FilesScreen.tsx:106` | B14 | Retain title/source/trade/date/size metadata, initial/error/retry/empty states and refresh. Auth scope is tenant-owned documents, not arbitrary storage URLs. |
| CORE-158 | Ask your documents: query, answer and error | **N** | `web/app/dashboard/_components/FilesTab.tsx:293` | `mobile/src/features/sections/FilesScreen.tsx:107` | B14 | Keep trimmed question, pending/error/retry, answer and no-documents/no-evidence handling. This is one-query Q&A on both clients, not an existing multi-turn assistant requiring conversation history. |
| CORE-159 | Citations open the matching document | **P** | `web/app/dashboard/_components/FilesTab.tsx:382` | `mobile/src/features/sections/FilesScreen.tsx:190` | B14 | Native renders citation titles as text. Make citations actionable using document_id (server supports it), with ownership validation and safe fallback when the document is no longer listed; do not match ambiguous titles only. |
| CORE-160 | Authenticated download and share | **N** | `web/app/dashboard/_components/FilesTab.tsx:210` | `mobile/src/features/sections/FilesScreen.tsx:114` | B14 | Retain bearer-authenticated binary fetch → local cache/share, filename/MIME handling and pending/error. A plain Linking URL cannot carry Authorization; do not regress to a public download of private files. |
| CORE-161 | Inline PDF/image viewer | **W** | `web/app/dashboard/_components/FilesTab.tsx:573` | `mobile/src/features/sections/FilesScreen.tsx:297` | B14 | Add native document/image preview with loading/error, close/back and download fallback. Website 'Viewer & comments' link is not a native viewer. |
| CORE-162 | Comment count and resolved/open indicator | **P** | `web/app/dashboard/_components/FilesTab.tsx:500` | `mobile/src/features/sections/FilesScreen.tsx:242` | B14 | Native exposes count but not resolved state. Show comment status and a direct thread action tied to document ID, including zero-comments state. |
| CORE-163 | Read file comment thread | **W** | `web/app/_components/CommentsThread.tsx:81` | `mobile/src/features/sections/FilesScreen.tsx:297` | B14 | Fetch only this owned file's comments; display author/role/time, body, resolved indicator and loading/error/retry. Refresh document count/status after closing thread. |
| CORE-164 | Add a comment | **W** | `web/app/_components/CommentsThread.tsx:106` | `mobile/src/features/sections/FilesScreen.tsx:297` | B14 | POST {body}, enforce nonempty/max 5,000, retain text on failure, and append only authoritative result. A new comment reopens the discussion under the existing backend rule. |
| CORE-165 | Edit own comment and cancel edit | **W** | `web/app/_components/CommentsThread.tsx:127` | `mobile/src/features/sections/FilesScreen.tsx:297` | B14 | Offer edit only for own comments; PATCH {body}, preserve edit draft/error and Cancel, and never allow changing another user's/admin's comment via local UI assumptions. |
| CORE-166 | Delete own comment | **W** | `web/app/_components/CommentsThread.tsx:148` | `mobile/src/features/sections/FilesScreen.tsx:297` | B14 | Use explicit destructive confirmation, pending/error and server-enforced own-comment permission. Reflect backend soft deletion rather than deleting the entire file or thread. |
| CORE-167 | Resolve / reopen discussion | **W** | `web/app/_components/CommentsThread.tsx:166` | `mobile/src/features/sections/FilesScreen.tsx:297` | B14 | POST {resolved:boolean}, show pending/error and updated badge; do not mistake resolve for deleting comments. Keep tenant authorization and refresh count/status. |
| CORE-168 | Files pagination and long-list behavior | **P** | `web/app/dashboard/_components/FilesTab.tsx:128` | `mobile/src/features/sections/FilesScreen.tsx:204` | B14 | Web uses paged display; native renders returned documents in a scroll view. Provide bounded rendering/show-more for large tenant libraries with access to every returned item and visible backend result limits. |

#### Historical quote import, review and calibration

| ID | Feature / control | Current status | Website evidence | Native evidence | Backend / dependencies | Work and checkable acceptance |
|---|---|---|---|---|---|---|
| CORE-169 | Analytics by job type | **P** | `web/app/dashboard/_components/HistoricalQuotesTab.tsx:102` | `mobile/src/features/sections/HistoryScreen.tsx:267` | B13 | Native displays average inc-GST price, count and min/max; add applicable web confidence/recency/trade context. These are arithmetic averages, not medians; only confirmed records contribute. |
| CORE-170 | Browse confirmed quotes and text search | **N** | `web/app/dashboard/_components/HistoricalQuotesTab.tsx:120` | `mobile/src/features/sections/HistoryScreen.tsx:297` | B13 | Keep q search and description/date/price rows with loading/error/empty/retry. Missing price shows unavailable, never $0.00; use server filtering rather than only currently visible rows. |
| CORE-171 | Job type dropdown/filter | **M** | `web/app/dashboard/_components/HistoricalQuotesTab.tsx:566` | `mobile/src/features/sections/HistoryScreen.tsx:298` | B13 | Add All plus the 22 canonical job types listed in the option appendix; send job_type alongside q and reset paging when filters change. Server-only trade/from/to filters are not currently exposed web controls. |
| CORE-172 | Import CSV / PDF | **W** | `web/app/dashboard/_components/HistoricalQuotesTab.tsx:324` | `mobile/src/features/sections/HistoryScreen.tsx:356` | B13 | Use native document picker, multipart file, CSV/PDF validation and ≤10MB; display immediate batch acknowledgement, pending/error and filename. Current native link delegates the entire import/review flow to web. |
| CORE-173 | Batch parsing and polling/recovery | **W** | `web/app/dashboard/_components/HistoricalQuotesTab.tsx:160` | `mobile/src/features/sections/HistoryScreen.tsx:356` | B13 | Persist the current batch ID through screen navigation, poll while parsing, show row_count/status/error and resume safely after background/return. Do not display a successful import before parsing/review completes. |
| CORE-174 | Imported row evidence and categorisation | **W** | `web/app/dashboard/_components/HistoricalQuotesTab.tsx:382` | `mobile/src/features/sections/HistoryScreen.tsx:356` | B13 | Show raw description, date, ex/inc-GST/basis, proposed job type, confidence and status. Users must review server extraction rather than silently treating every parsed row as confirmed. |
| CORE-175 | Correct imported row job type | **W** | `web/app/dashboard/_components/HistoricalQuotesTab.tsx:399` | `mobile/src/features/sections/HistoryScreen.tsx:356` | B13 | Expose the canonical category selector per row, preserve edits across review navigation and send changed job_type with its exact row ID only. |
| CORE-176 | Confirm / reject row and confirm all | **W** | `web/app/dashboard/_components/HistoricalQuotesTab.tsx:362` | `mobile/src/features/sections/HistoryScreen.tsx:356` | B13 | Keep explicit Confirm, Reject and Confirm all controls, visible status and ability to review before save. No auto-confirm on upload and no rejected records in analytics/calibration. |
| CORE-177 | Save reviewed batch | **W** | `web/app/dashboard/_components/HistoricalQuotesTab.tsx:237` | `mobile/src/features/sections/HistoryScreen.tsx:356` | B13 | POST {updates:[{id,job_type?,status}]} for 1–5000 owned rows, show pending/errors and refresh browse/analytics after success. Keep unsaved selections after validation/ownership failures. |
| CORE-178 | Historical calibration preview | **N** | `web/app/dashboard/_components/HistoricalQuotesTab.tsx:276` | `mobile/src/features/sections/HistoryScreen.tsx:77` | B13 | POST preview, show current/proposed ex-GST unit prices, sample counts and new/existing assembly state. This is separate from invoice hourly calibration and must never derive its own prices. |
| CORE-179 | Select proposed job types to apply | **N** | `web/app/dashboard/_components/HistoricalQuotesTab.tsx:283` | `mobile/src/features/sections/HistoryScreen.tsx:150` | B13 | Retain selectable proposals, count and no-selection disable. Make clear that the preselected proposals do not apply until the explicit action; verify selection persists during an error. |
| CORE-180 | Apply historical pricing with owner approval | **N** | `web/app/dashboard/_components/HistoricalQuotesTab.tsx:295` | `mobile/src/features/sections/HistoryScreen.tsx:101` | B13 | POST only {job_types}; server recomputes from current confirmed history and authorised selection. Refresh pricing readers after success and show partial/error outcomes; no raw client price payload or automatic save. |
| CORE-181 | History independent analytics/browse errors and empty recovery | **N** | `web/app/dashboard/_components/HistoricalQuotesTab.tsx:80` | `mobile/src/features/sections/HistoryScreen.tsx:251` | B13 | Retain separate loading/error/retry and meaningful no-history/no-matches states; import link remains available when analytics is empty. Returning from web import must refresh both analytics and browse. |

#### Customer marketing QR codes, landing slug and recruitment-code divergence

| ID | Feature / control | Current status | Website evidence | Native evidence | Backend / dependencies | Work and checkable acceptance |
|---|---|---|---|---|---|---|
| CORE-182 | Marketing landing destinations | **P** | `web/app/dashboard/page.tsx:1167` | `mobile/src/features/sections/registry.ts:97` | B15–B18 | Implement native QR/landing configuration, CRM, Brand Studio, Flyer and Videos destinations. Native currently lacks Brand Studio and links CRM/Flyer to web; retaining those temporary links does not complete their workflows. |
| CORE-183 | Customer QR list, scans and lifecycle status | **N** | `web/app/dashboard/invites/page.tsx:49` | `mobile/src/features/sections/InvitesScreen.tsx:225` | B15 | Retain customer QR entries, label, short code, destination, scan count and status; exclude signup/recruitment and archived items from the customer-facing list as current logic does. Show independent QR fetch error/retry. |
| CORE-184 | Show and edit public landing slug | **P** | `web/app/dashboard/invites/page.tsx:169` | `mobile/src/features/sections/InvitesScreen.tsx:269` | B15 | Native shows the landing URL but has no slug editor. Add validated 2–40-character slug save, reserved-name/format/conflict errors and successful canonical URL refresh. Existing QR links should follow server redirect rules rather than being rebuilt blindly. |
| CORE-185 | Create customer QR label and destination | **N** | `web/app/dashboard/invites/page.tsx:184` | `mobile/src/features/sections/InvitesScreen.tsx:339` | B15 | Retain nonempty label ≤60 and sms / landing choices, pending/error, and created-row refresh. Surface missing provisioned SMS number or unavailable landing slug; no signup destination in this customer control. |
| CORE-186 | Custom SMS prefill for QR | **M** | `web/app/dashboard/invites/page.tsx:194` | `mobile/src/features/sections/InvitesScreen.tsx:339` | B15 | Add editable prefill_body ≤140 for SMS QR creation, preserve server default when absent and ignore it for landing destination. Do not confuse this with sending a message now. |
| CORE-187 | Copy/share redirect link | **N** | `web/app/dashboard/invites/page.tsx:220` | `mobile/src/features/sections/InvitesScreen.tsx:87` | B15 | Native Share of redirect and image URLs is a valid link-sharing adaptation; show failures and do not claim an actual image attachment unless downloaded/shared as a file. |
| CORE-188 | Download QR PNG and SVG assets | **M** | `web/app/dashboard/invites/page.tsx:218` | `mobile/src/features/sections/InvitesScreen.tsx:87` | B15 | Offer authenticated/permitted QR image retrieval with chosen format and native save/share; current text URLs do not provide both image downloads. Preserve transparent/high-resolution export intent and correct QR destination. |
| CORE-189 | Repoint existing QR destination | **M** | `web/app/dashboard/invites/page.tsx:221` | `mobile/src/features/sections/InvitesScreen.tsx:62` | B15 | Add SMS/landing repoint action while preserving QR short code/scans. PATCH the existing QR record, validate destination prerequisites and refresh without creating a replacement campaign. |
| CORE-190 | Pause / resume QR | **N** | `web/app/dashboard/invites/page.tsx:222` | `mobile/src/features/sections/InvitesScreen.tsx:63` | B15 | Retain explicit active↔paused mutation, pending/error and updated status. A paused QR remains a record and must not be mislabeled archived or deleted. |
| CORE-191 | Archive QR | **M** | `web/app/dashboard/invites/page.tsx:224` | `mobile/src/features/sections/InvitesScreen.tsx:63` | B15 | Add explicit archive action and confirmation/recovery guidance consistent with server archived state. Native currently cannot archive; ensure removed rows do not remain actionable from stale local data. |
| CORE-192 | Recruitment invite-code scope differs from current website | **D** | `web/app/dashboard/invites/page.tsx:1` | `mobile/src/features/sections/InvitesScreen.tsx:356` | B15, PUBLIC/admin | Website moved invitation codes/recruitment QR to admin; native still lists/creates/sends server-authorized tenant codes and says 'send it to a customer'. Preserve currently authorized native capabilities, correct recruitment-recipient copy, and implement role-correct native admin parity through PUBLIC. Do not silently remove controls or grant admin authority; these are tradie signup codes, not customer quotes or staff seats. |
| CORE-193 | Existing native code creation/share/send behavior | **N** | `web/app/api/dashboard/invites/codes/route.ts:58` | `mobile/src/features/sections/InvitesScreen.tsx:106` | B15, PUBLIC/admin | Preserve currently server-authorized campaign, fixed quota_total:100 creation, used/total/status, signup-link Share and explicit email/SMS send with recipient validation. Complete the existing website's admin code controls under PUBLIC's separate server role boundary; backend-only schema fields alone do not authorize tenant-visible admin controls. |
| CORE-194 | Marketing mutations and independent loading states | **N** | `web/app/dashboard/invites/page.tsx:49` | `mobile/src/features/sections/InvitesScreen.tsx:225` | B15 | Keep QR and invite-code queries/errors independent, prevent repeated create/send operations, preserve text on rejection and invalidate the correct list. No customer message is sent by QR creation, preview or opening the screen. |

#### CRM connections and customer announcement campaign

| ID | Feature / control | Current status | Website evidence | Native evidence | Backend / dependencies | Work and checkable acceptance |
|---|---|---|---|---|---|---|
| CORE-195 | CRM status, connection and contact summary | **W** | `web/app/dashboard/crm/page.tsx:82` | `mobile/src/features/sections/registry.ts:166` | B16 | Implement native status for HubSpot/Zoho availability, connected account, last sync, imported contacts, unsubscribed count and campaign readiness. Menu's first-party website link is only a temporary fallback and this requirement remains open until that native screen works; provider-owned OAuth may still use its validated external flow. |
| CORE-196 | Connect HubSpot or Zoho | **W** | `web/app/dashboard/crm/page.tsx:101` | `mobile/src/features/sections/registry.ts:166` | B16 | Request provider-specific OAuth URL, open a secure provider session, validate callback/state and refresh on return. Handle unconfigured provider, cancelled/expired auth and wrong account without dropping a working connection. |
| CORE-197 | Sync CRM contacts now | **W** | `web/app/dashboard/crm/page.tsx:115` | `mobile/src/features/sections/registry.ts:166` | B16 | POST {provider}, show progress/result/errors and refreshed contact/sync counts. Do not run an import automatically simply because the user opens a settings page. |
| CORE-198 | Disconnect provider, keep or remove contacts | **W** | `web/app/dashboard/crm/page.tsx:137` | `mobile/src/features/sections/registry.ts:166` | B16 | Require explicit disconnect confirmation and preserve the keep/deleteContacts choice; delete tokens and only the permitted imported contacts as requested. Do not delete campaign audit history implicitly. |
| CORE-199 | Announcement recipient mode: unsent / all | **W** | `web/app/dashboard/crm/page.tsx:348` | `mobile/src/features/sections/registry.ts:166` | B16 | Expose unsent default versus all/resend clearly, showing opted-out/invalid/existing-send exclusions and eligible count. The all mode must not be selected implicitly after a failed send. |
| CORE-200 | Announcement preview subject, HTML and eligible count | **W** | `web/app/dashboard/crm/page.tsx:155` | `mobile/src/features/sections/registry.ts:166` | B16 | POST preview mode before sending; render subject/customer-facing HTML sample safely with recipient count and missing-business-data guidance. Preview may upsert a campaign record but must never dispatch mail. |
| CORE-201 | Confirmed announcement send and partial result | **W** | `web/app/dashboard/crm/page.tsx:177` | `mobile/src/features/sections/registry.ts:166` | B16 | Require explicit review/confirmation then POST {mode,confirm:true}; disable zero-recipient/pending send. Show sent/failed/partial outcome, retain idempotency/suppression/unsubscribe rules and avoid blind resend of already-successful recipients. |
| CORE-202 | CRM configuration, no-access and retry states | **W** | `web/app/dashboard/crm/page.tsx:437` | `mobile/src/features/sections/registry.ts:166` | B16 | Preserve signed-out/no-tenant/unconfigured-provider/missing business_address or SMS number states, retry and return navigation. Do not show a working Send action merely because a provider is connected. |

#### Flyer designer and persistence/export controls

| ID | Feature / control | Current status | Website evidence | Native evidence | Backend / dependencies | Work and checkable acceptance |
|---|---|---|---|---|---|---|
| CORE-203 | Flyer list, templates and selection | **W** | `web/app/dashboard/_components/FlyerDesignerTab.tsx:66` | `mobile/src/features/sections/registry.ts:107` | B17 | Implement native flyer list/create, template selection and document entry. Existing first-party browser links are temporary fallbacks and do not complete this requirement. Preserve bold-promo / clean-services / contact-card, preview, updated time and selected document; do not add speculative templates. |
| CORE-204 | Create flyer from template | **W** | `web/app/dashboard/_components/FlyerDesignerTab.tsx:182` | `mobile/src/features/sections/registry.ts:107` | B17 | POST {template_id}, create a tenant-owned branded document, and open only the successful result. Handle invalid template/unavailable brand data without substituting placeholder customer details. |
| CORE-205 | Delete saved flyer | **W** | `web/app/dashboard/_components/FlyerDesignerTab.tsx:242` | `mobile/src/features/sections/registry.ts:107` | B17 | Expose explicit delete with confirmation, pending/error and server ownership. Do not silently reload as if deletion succeeded when the API rejects it. |
| CORE-206 | Edit flyer name and explicit Save | **W** | `web/app/dashboard/_components/FlyerDesignerTab.tsx:447` | `mobile/src/features/sections/registry.ts:107` | B17 | PATCH {name,document} on Save, retain dirty state/errors and guard against silent loss on Back. Reopening must reproduce the saved document, not regenerate it from the template. |
| CORE-207 | Canvas element selection and deselection | **W** | `web/app/dashboard/flyer/_components/FlyerCanvasEditor.tsx:180` | `mobile/src/features/sections/registry.ts:107` | B17 | Provide touch-accessible selection, tap-empty deselection and selected inspector. Retain stable element IDs, z-order and selection when resizing the viewport; desktop Konva alone is not a native editor. |
| CORE-208 | Drag, resize and rotate elements | **W** | `web/app/dashboard/flyer/_components/FlyerCanvasEditor.tsx:211` | `mobile/src/features/sections/registry.ts:107` | B17 | Preserve document-coordinate transforms, safe minimum sizes and image/text proportions. Verify touch handles on phone; zoom/gesture adaptation must not alter export dimensions or pricing content elsewhere. |
| CORE-209 | Add text element | **W** | `web/app/dashboard/_components/FlyerDesignerTab.tsx:476` | `mobile/src/features/sections/registry.ts:107` | B17 | Add a uniquely identified editable text element at a sensible canvas location and immediately expose its controls; no save/export until an explicit user action. |
| CORE-210 | Upload and add/replace image | **W** | `web/app/dashboard/_components/FlyerDesignerTab.tsx:257` | `mobile/src/features/sections/registry.ts:107` | B17 | Native picker uploads multipart file through the tenant endpoint and inserts returned src; Replace updates the selected image without losing geometry. Allow PNG/JPEG/WEBP ≤5MB; show MIME/size/storage errors and missing-image fallback. |
| CORE-211 | Insert existing QR or generate new landing QR | **W** | `web/app/dashboard/_components/FlyerDesignerTab.tsx:499` | `mobile/src/features/sections/registry.ts:107` | B15, B17 | Offer active existing QR selector and explicit Generate QR, using {label:'Flyer QR',destination_type:'landing'} as current flow. Bind the image to the selected code, not a random QR or direct private URL. |
| CORE-212 | Edit text, font and size | **W** | `web/app/dashboard/_components/FlyerDesignerTab.tsx:532` | `mobile/src/features/sections/registry.ts:107` | B17 | Expose text, fonts Inter / Arial / Georgia / Trebuchet MS / Courier New / Impact, and size 8–200. App chrome retains QuoteMax design fonts; flyer document fonts are user content and must round-trip. |
| CORE-213 | Text colour and alignment | **W** | `web/app/dashboard/_components/FlyerDesignerTab.tsx:560` | `mobile/src/features/sections/registry.ts:107` | B17 | Expose fill colour and left / center / right alignment for selected text. Preview and exported glyph placement must match; preserve existing formatting not represented by current inspector. |
| CORE-214 | Rectangle fill and element delete | **W** | `web/app/dashboard/_components/FlyerDesignerTab.tsx:583` | `mobile/src/features/sections/registry.ts:107` | B17 | Show rectangle fill only for rectangles, replace image only for images, and delete selected element without deleting the entire flyer. Clear stale selection after delete. |
| CORE-215 | PNG and PDF export plus saved export URLs | **W** | `web/app/dashboard/_components/FlyerDesignerTab.tsx:343` | `mobile/src/features/sections/registry.ts:107` | B17 | Render current canvas at correct dimensions, create PNG/PDF, POST export payload and offer native share/save. Verify images/fonts are loaded and failures are visible; no blank/stale export should be labelled successful. |
| CORE-216 | Flyer editor loading, error, back and external assets | **W** | `web/app/dashboard/_components/FlyerDesignerTab.tsx:104` | `mobile/src/features/sections/registry.ts:107` | B17 | Retain list/editor modes, Back to flyers, unsaved-state protection, independent upload/save/export pending states and denied asset/CORS handling. Opening Canva must not silently discard a local flyer edit. |

#### Canva-connected flyer workflow

| ID | Feature / control | Current status | Website evidence | Native evidence | Backend / dependencies | Work and checkable acceptance |
|---|---|---|---|---|---|---|
| CORE-217 | Configured/connected status and tracked designs | **W** | `web/app/dashboard/flyer/_components/CanvaStudio.tsx:74` | `mobile/src/features/sections/registry.ts:107` | B18 | Read configuration/connection and saved design statuses, distinguish unavailable integration from disconnected account, and refresh after OAuth/import. All Canva work currently lives inside the browser flyer page. |
| CORE-218 | Connect Canva and OAuth return | **W** | `web/app/dashboard/flyer/_components/CanvaStudio.tsx:118` | `mobile/src/features/sections/registry.ts:107` | B18 | Use existing PKCE/state-backed connect URL through a provider auth session. Replace popup/focus/message assumptions with a tested mobile return path; cancellation/expired state must not fabricate a connection. |
| CORE-219 | Disconnect Canva | **W** | `web/app/dashboard/flyer/_components/CanvaStudio.tsx:132` | `mobile/src/features/sections/registry.ts:107` | B18 | Expose explicit disconnect, pending/error and status refresh. Remove server connection tokens through the existing endpoint; do not delete all flyers or Canva designs as a side effect. |
| CORE-220 | Suggested Canva template gallery links | **W** | `web/app/dashboard/flyer/_components/CanvaStudio.tsx:271` | `mobile/src/features/sections/registry.ts:107` | B18 | Keep the six configured suggestions: services-rundown / limited-offer / before-after / contact-card / seasonal-special / now-hiring and their external gallery URLs. Choosing a gallery template is external editing, not automatically a tracked/imported QuoteMax design. |
| CORE-221 | Create tracked blank Canva flyer | **W** | `web/app/dashboard/flyer/_components/CanvaStudio.tsx:143` | `mobile/src/features/sections/registry.ts:107` | B18 | POST {} (optional title exists server-side), open returned editUrl, record only successful tenant-owned result and refresh list. Never claim arbitrary manually created Canva designs are already linked. |
| CORE-222 | Reopen tracked design in Canva | **W** | `web/app/dashboard/flyer/_components/CanvaStudio.tsx:331` | `mobile/src/features/sections/registry.ts:107` | B18 | Open the saved edit_url with safe host handling and clear external-edit purpose. Returning should refresh design state without importing or publishing automatically. |
| CORE-223 | Import PNG/PDF from Canva | **W** | `web/app/dashboard/flyer/_components/CanvaStudio.tsx:165` | `mobile/src/features/sections/registry.ts:107` | B18 | POST {} to designs/{id}/import (default PNG/PDF; optional formats supported), show per-design Importing/error, and refresh exports/files on success. Handle partial export failure, expired provider tokens and unsaved external edits. |
| CORE-224 | Delete tracked design and download imports | **W** | `web/app/dashboard/flyer/_components/CanvaStudio.tsx:188` | `mobile/src/features/sections/registry.ts:107` | B18 | Support removing the tenant's local design record with confirmation/error and downloading its imported PNG/PDF URLs. Do not promise deletion of the remote Canva design unless server actually performs it. |
| CORE-225 | Back to Flyer and import refresh coupling | **W** | `web/app/dashboard/flyer/_components/CanvaStudio.tsx:204` | `mobile/src/features/sections/registry.ts:107` | B17, B18 | Retain Back to flyers and onImported refresh while preserving unrelated flyer state. OAuth, import and designer have separate pending/error state; opening them must not send marketing material. |

#### Brand Studio carousel page

| ID | Feature / control | Current status | Website evidence | Native evidence | Backend / dependencies | Work and checkable acceptance |
|---|---|---|---|---|---|---|
| CORE-226 | Reach and initialize Brand Studio | **M** | `web/app/dashboard/studio/page.tsx:43` | `mobile/src/features/sections/registry.ts:97` | B19 | Add a reachable native Brand Studio screen with its editor/export workflows. An initial website link can only be a temporary fallback with this requirement still open. This separate /dashboard/studio page is absent from Menu; it is not the flyer or signage studio. |
| CORE-227 | Select carousel slide and live preview | **M** | `web/app/dashboard/studio/page.tsx:134` | `mobile/src/features/sections/registry.ts:97` | B19 | Render the existing default slide sequence with selected thumbnail and debounced preview. Current page fixes format to li-carousel; do not invent a format-picker parity requirement. |
| CORE-228 | Cover fields | **M** | `web/app/dashboard/studio/page.tsx:166` | `mobile/src/features/sections/registry.ts:97` | B19 | Support eyebrow lines, two-part headline emphasis, subheading and proof line; multiline entry must preserve structured slide fields and update the selected slide only. |
| CORE-229 | Benefits slide fields | **M** | `web/app/dashboard/studio/page.tsx:188` | `mobile/src/features/sections/registry.ts:97` | B19 | Expose heading and per-benefit title/text plus closing subtext. Preserve every existing card rather than flattening the carousel to a single caption. |
| CORE-230 | Steps slide fields | **M** | `web/app/dashboard/studio/page.tsx:205` | `mobile/src/features/sections/registry.ts:97` | B19 | Expose heading and each step's icon/title/text where present, retaining order and structured schema. Do not treat decorative step icons as new business features. |
| CORE-231 | Quote/testimonial slide fields | **M** | `web/app/dashboard/studio/page.tsx:224` | `mobile/src/features/sections/registry.ts:97` | B19 | Edit testimonial quote and attribution separately, preview the correct selected slide and preserve user copy on render failure. |
| CORE-232 | CTA slide fields | **M** | `web/app/dashboard/studio/page.tsx:232` | `mobile/src/features/sections/registry.ts:97` | B19 | Expose heading, subtext, button copy and footer. Editing the visual CTA does not send a campaign, post online or schedule an advertisement. |
| CORE-233 | Photo, scrim and shared footer | **M** | `web/app/dashboard/studio/page.tsx:241` | `mobile/src/features/sections/registry.ts:97` | B19 | Offer None plus hero-main / team-crew / sparky-yellow / tools-flatlay / ute-tablet / electrician / plumber / plumber2 / roofer / roofer2 / solar / painter / carpenter; scrim top / left / faint; shared footer-bar toggle. No custom photo-upload control exists on this page. |
| CORE-234 | Reset slides | **M** | `web/app/dashboard/studio/page.tsx:122` | `mobile/src/features/sections/registry.ts:97` | B19 | Restore the current default slide model only on explicit reset with loss-of-edits protection. Current website data is local state; native persistence would be a separate deliberate enhancement. |
| CORE-235 | Export selected PNG / entire carousel PDF | **M** | `web/app/dashboard/studio/page.tsx:123` | `mobile/src/features/sections/registry.ts:97` | B19 | Use /api/studio/render with format/d payload for each required slide, expose native save/share and clear progress/errors. Export current edited slide(s), correct ordering/dimensions and no silent blank pages. |

#### Personalized welcome and thank-you videos

| ID | Feature / control | Current status | Website evidence | Native evidence | Backend / dependencies | Work and checkable acceptance |
|---|---|---|---|---|---|---|
| CORE-236 | Per-trade video selector and profile defaults | **N** | `web/app/dashboard/_components/VideosTab.tsx:188` | `mobile/src/features/sections/VideosScreen.tsx:348` | B20 | Retain enabled trade options, correct per-trade welcome/thank-you/default URLs and selected trade refresh. Verify switching trades never mixes scripts/images or generation states. |
| CORE-237 | Welcome and thank-you video playback | **N** | `web/app/dashboard/_components/VideosTab.tsx:705` | `mobile/src/features/sections/VideosScreen.tsx:58` | B20 | Keep native video playback with ready/default/missing/error states, controls and aspect ratio. External Watch link is additional access, not the only native playback implementation. |
| CORE-238 | Edit welcome and thank-you scripts | **N** | `web/app/dashboard/_components/VideosTab.tsx:738` | `mobile/src/features/sections/VideosScreen.tsx:209` | B20 | Retain separate scripts, 220-character cap, editable defaults, generation-state pending lock and helpful empty/invalid-script errors. Text edits do not generate until the explicit action. |
| CORE-239 | Business contact name for generated videos | **M** | `web/app/dashboard/_components/VideosTab.tsx:492` | `mobile/src/features/sections/VideosScreen.tsx:101` | B20 | Expose contact_name and persist it through the generation contract where supplied. It is not automatically equivalent to owner_first_name; keep script/name validation and refresh tenant/profile context. |
| CORE-240 | Extra business context/details | **M** | `web/app/dashboard/_components/VideosTab.tsx:513` | `mobile/src/features/sections/VideosScreen.tsx:101` | B20 | Add editable details/extraContext passed to generation with existing bounds/behavior. Native per-slot script and images alone do not reproduce the website's contextual prompt input. |
| CORE-241 | Owner photo selection, preview and removal | **N** | `web/app/dashboard/_components/VideosTab.tsx:535` | `mobile/src/features/sections/VideosScreen.tsx:151` | B20 | Retain camera/library choice, preview/removal, permission/cancel/error and MIME/≤7MB checks. Native applies per-slot photos whereas web has shared studio context; make the scope clear. |
| CORE-242 | Extra images selection and removal | **P** | `web/app/dashboard/_components/VideosTab.tsx:571` | `mobile/src/features/sections/VideosScreen.tsx:238` | B20 | Retain native additional photo controls and explain/use server accepted limit (current backend uses at most two). Do not imply every selected image participates when extra/invalid uploads are silently ignored server-side. |
| CORE-243 | Generate / regenerate one slot | **N** | `web/app/dashboard/_components/VideosTab.tsx:767` | `mobile/src/features/sections/VideosScreen.tsx:119` | B20 | POST multipart slot/trade/script/photos only after explicit generation, show pending/queued/error and disable incompatible edits. Failed generation must retain script and selected images for retry. |
| CORE-244 | Generate both videos with shared context | **M** | `web/app/dashboard/_components/VideosTab.tsx:385` | `mobile/src/features/sections/VideosScreen.tsx:101` | B20 | Add the web slot:'both' operation with both scripts and shared contact/details/photo context, or a clearly equivalent coordinated action. Do not fire two uncontrolled parallel jobs or charge/generate twice on repeated taps. |
| CORE-245 | Generation polling, resume and state explanation | **N** | `web/app/dashboard/_components/VideosTab.tsx:188` | `mobile/src/features/sections/VideosScreen.tsx:351` | B20 | Retain polling while generating, ready/error/default source and last-updated context. GET videos can resume in-flight server work, so background refresh is not evidence of a read-only no-side-effect endpoint. |
| CORE-246 | Video configuration/loading/errors and fallback content | **P** | `web/app/dashboard/_components/VideosTab.tsx:87` | `mobile/src/features/sections/VideosScreen.tsx:348` | B20 | Preserve missing provider/configuration errors, default-vs-owned source labels, stale data, retry and no-video states. Clearly identify default/demo content so it is not mistaken for a tenant-generated personalized clip. |


### Backend contracts and readiness register

These routes are present in source unless explicitly marked **missing**. Presence is not a successful live integration test. Reuse the app's Clerk bearer transport and tenant-scoped cache keys; do not put service keys, provider secrets or tenant IDs supplied by the UI in authorization decisions. The appendices and X requirements cover the complete API census, network/retry/offline/push behaviour and external-provider return architecture.

#### B01 — Tenant dashboard read model and record navigation

`GET /api/tenant/me` returns the signed-in tenant, pricing books/services, pipeline quotes and related display data. It is the shared source for identity, overview and native quote screens: `web/app/api/tenant/me/route.ts:1`, `mobile/src/lib/tenant.ts:1`. It is not the trade-job source and must not be described as including every tool-created job. Preserve existing quote status, token, tenant and customer-context fields when extending Zod schemas. Return-navigation refresh and quoteId selection are native app responsibilities, not properties of a web `?tab=` URL.

#### B02 — Provisioning retry and welcome email

- `POST /api/onboard/retry-provision`, no business payload: resolves tenant from bearer and runs/retries provisioning. Even its already-provisioned path can repair the SMS webhook; this is a mutation, not a health probe. Returns explicit provisioning mode/stub and success/error information, including 200 bodies that are not a fully live service. Sources: `web/app/api/onboard/retry-provision/route.ts:32`, `web/app/api/onboard/retry-provision/route.ts:64`, `web/app/api/onboard/retry-provision/route.ts:139`.
- `POST /api/tenant/welcome-email`, no recipient payload: tenant-owned one-time welcome via `sendWelcomeEmailOnce`; duplicate/not-ready is an outcome, provider failure may be 502. Dashboard fires it at the activation boundary. Sources: `web/app/api/tenant/welcome-email/route.ts:27`, `web/app/dashboard/page.tsx:639`. Native caller is absent in the inspected API census; implement it at the same eligible activation boundary using existing server policy/idempotency.

#### B03 — Overview analytics

`GET /api/tenant/analytics?weeks=8&from=<ISO>&to=<ISO>` accepts optional valid instants and clamps weeks to **4–26**. It loads tenant quotes/intakes/calls/SMS/customers and returns headline, speedToQuoteMinutes, funnel, weeklyTrend, channelSplit, top job types and needsAttention. Sources: `web/app/api/tenant/analytics/route.ts:27`, `web/app/api/tenant/analytics/route.ts:42`, `web/app/api/tenant/analytics/route.ts:53`, `web/app/api/tenant/analytics/route.ts:85`; `web/app/dashboard/_components/OverviewAnalytics.tsx:28`. Native `analyticsPath` currently fixes eight weeks. Web All-time avoids from/to while its trend still uses eight weekly buckets; do not mistake the trend window for the selected headline period. The exact cold predicate is SMS + non-registration + abandoned, not simply old messages.

#### B04 — Trade jobs and owner destinations

`GET /api/tenant/trade-jobs` returns tagged trade-created jobs with customer/owner links and deletion constraints. `DELETE /api/tenant/trade-jobs` takes **{trade,id}**; ownership and per-trade paid/protected-state checks remain server responsibilities. `GET /api/tenant/trade-jobs/owner-link` is a distinct owner-link capability, not a generic quote edit endpoint. Sources: `web/app/api/tenant/trade-jobs/route.ts:1`, `web/app/api/tenant/trade-jobs/owner-link/route.ts:1`, `web/app/dashboard/page.tsx:8478`, `web/app/dashboard/page.tsx:9225`. TRADE owns individual schemas and save/edit flows; CORE owns merging/searching/sorting/counting their list records.

#### B05 — Chats and manual SMS

`GET /api/tenant/chats` merges scoped SMS/voice conversations into the bounded recent result; do not promise an unlimited archive. `POST /api/tenant/chats/{id}/reply` accepts **{body:string}**, resolves authenticated tenant and delegates to `sendTradieReply`. Trimmed empty body and length >1600 are 422; wrong/missing owned conversation is 404; dispatch failure is 502. It sends through the tenant's messaging transport, records outbound message and updates recency, but deliberately does **not** increment the AI turn counter. Sending can succeed while transcript logging fails, so an ambiguous response needs reconciliation before another chargeable send. Sources: `web/app/api/tenant/chats/route.ts:1`, `web/app/api/tenant/chats/[id]/reply/route.ts:21`, `web/lib/sms/tradie-reply.ts:14`, `web/lib/sms/tradie-reply.ts:24`, `web/lib/sms/tradie-reply.ts:84`.

#### B06 — Generic quote mutations, report and delivery

- `DELETE /api/quote/{id}`: authenticated owner, existing quote, paid_at guard, expire linked Checkout sessions before deleting, atomic not-paid condition and linked cleanup. UI additionally hides accepted/deposit-paid records; reconcile accepted-but-unpaid deletion policy instead of assuming both layers match. Source: `web/app/api/quote/[id]/route.ts:34`.
- `PATCH /api/quote/{id}/display-mode`: **{display_mode:null|'itemised'|'summary'}**; owner-scoped layout-only update, intentionally allowed on paid quotes. Source: `web/app/api/quote/[id]/display-mode/route.ts:35`.
- `PATCH /api/quote/{id}/tier`: **{tier:<existing priced tier>}** has owner, unpaid and non-inspection checks and clears PDF cache, but its current tax basis is **unsafe**. It loads neither quote trade nor pricing version (`web/app/api/quote/[id]/tier/route.ts:55`), picks an arbitrary tenant pricing_book row with .limit(1), and defaults missing GST to true (`web/app/api/quote/[id]/tier/route.ts:81`, `web/app/api/quote/[id]/tier/route.ts:88`). Unlike the partial trade-scoping fix in edit (`web/app/api/quote/[id]/edit/route.ts:218`), tier changes can therefore alter the quote's GST treatment. Backend prerequisite: resolve the quote-associated stored trade/version or authoritative GST snapshot, reject unresolved context instead of guessing, and preserve historical pricing authority. Acceptance must cover differing-GST books with reversed query order, a changed historical version and a missing book; selection→save→refetch→reopen and regenerated PDF retain correct totals/tax.
- `POST /api/quote/{id}/document`: **{report_doc?,report_style?}**, requires a change, owner, unpaid and non-inspection; sanitizes document, validates bounded styles and clears stale PDF. Source: `web/app/api/quote/[id]/document/route.ts:28`. The UI FULL_QUOTE_DOC flag at `web/app/dashboard/quote/[token]/page.tsx:81` is not checked in this route; classify it explicitly before using it as an access-control claim.
- Manual line editing and chat proposal contracts are specified once in **PUBLIC-011**. Preserve tier metadata/grounding, explicit force override and notify_customer confirmation. **Shared-backend prerequisites:** edit currently marks a changed draft Sent even with notify_customer:false (`web/app/api/quote/[id]/edit/route.ts:597`); notification is deferred at `web/app/api/quote/[id]/edit/route.ts:679`, failure logged at `web/app/api/quote/[id]/edit/route.ts:919` and the response at `web/app/api/quote/[id]/edit/route.ts:927` has no delivery outcome/operation ID. Repair quiet saves so they never newly mark Sent and held state is retained; explicit notify must show the resolved recipient and actually supported SMS channel, use a durable idempotent delivery operation, and expose read reconciliation. Test quiet save, send failure, reopen and duplicate/concurrent requests separately; do not invent email editing support. Shared editor rendering is `web/app/dashboard/quote/[token]/QuoteReportViewerClient.tsx:308`; native is only a browser link at `mobile/src/features/quotes/QuoteDetailModal.tsx:380`.
- `POST /api/quote/{id}/send`: **{channel:'sms'|'email',to?:string}**. Owner, valid pre-payment state, required/validated destination, four-source contact resolution and provider result gate; status advances only after successful dispatch, with follow-up event logging. Source: `web/app/api/quote/[id]/send/route.ts:60`, `web/app/api/quote/[id]/send/route.ts:138`, `web/app/api/quote/[id]/send/route.ts:180`, `web/app/api/quote/[id]/send/route.ts:297`, `web/app/api/quote/[id]/send/route.ts:382`.
- `POST /api/quote/{id}/approve`: path ID is authoritative; body is ignored. Only awaiting_tradie_approval actually approves/sends; other statuses can return already_actioned. It is SMS-only and fails without a customer mobile; sending via /send is the existing channel-capable alternative. Sources: `web/app/api/quote/[id]/approve/route.ts:53`, `web/app/api/quote/[id]/approve/route.ts:98`, `web/app/api/quote/[id]/approve/route.ts:141`, `web/app/api/quote/[id]/approve/route.ts:256`. Native schema/optimistic transition must model no-op and provider failure distinctly.
- Public quote/payment/booking pages and specialized trade edit adapters are PUBLIC/TRADE dependencies. In particular solar owner editing must keep solar_estimates and twin quotes synchronized; `web/app/q/solar/[token]/page.tsx:372` deliberately avoids generic TradieEditor.

#### B07 — Account, trade management and pricing policy

`PATCH /api/tenant/me` uses `UpdateSchema` at `web/lib/tenant/update-schema.ts:70`; implementation starts at `web/app/api/tenant/me/route.ts:638`.

- **{tenant:{business_name,owner_first_name,owner_email,owner_mobile,state,abn}}**, all patch fields optional; name 2–80, owner first name 1–40, email ≤120/valid email, phone 8–20, state enum eight AU states, ABN blank or max20. Business contact email is separate from Clerk authentication. There is no business_address editor/property in this Account patch despite CRM requiring it.
- **{tenant:{sms_estimator_enabled:boolean}}** and **{tenant:{default_availability:WeeklyAvailability}}**. Availability version/timezone/days are validated; enabled days require valid HH:MM and start<end. Sources: `web/lib/quote/availability.ts:32`, `web/lib/quote/availability.ts:112`; UI `web/app/_components/AvailabilityEditor.tsx:55`.
- **{licences_by_trade:{[trade]:{licence_type?,licence_number?,licence_state?,licence_expiry?}}}**, type max40/number max60/state enum-or-empty/date text. **Readiness gap:** this map still uses electrical/plumbing-only TRADE_ENUM although web iterates broader active trades; `web/lib/tenant/update-schema.ts:54`, `web/lib/tenant/update-schema.ts:107`.
- **{review_policy:'auto_send'|'always_review'|'review_over_threshold',review_threshold_inc_gst?:number}**, threshold 0–1,000,000 server bound, positive web threshold-mode validation. **{followup_2h_enabled:boolean}** and **{quote_display:'itemised'|'summary'}** fan out to owned books. Preserve inherited defaults and policy gates.
- **{quote_tier_mode_by_trade:{[trade]:'single'|'good_better_best'|'good'|'better'|'best'}}** changes only specified books; server validates supported trades/ownership at runtime and invalidates appropriate PDF state. Native card already exists (CORE-127 / TRADE-013); fix stale local choice on trade switch rather than rebuilding it.
- **{early_bird:{enabled,discount_pct,window_hours}}**: 0–15%,1–336h; enabled positive UI check. Schema coerces numbers but does not itself require integer hours; preserve backend contract while UI steps whole hours. Merge early_bird into overlays instead of replacing unrelated pricing metadata.
- `GET /api/tenant/trades/available` and `POST /api/tenant/trades/reconcile` **{trades:[...]}** power staged add/remove with at least one retained trade, activated/deactivated/warning result and historical-data preservation. Sources: `web/app/dashboard/page.tsx:854`, `web/app/dashboard/page.tsx:887`, `web/app/api/tenant/trades/reconcile/route.ts:1`.
- `POST /api/tenant/logo` or `/photo`: multipart **file**, PNG/JPEG/WEBP/SVG ≤2MB, authenticated tenant, returns **{ok,publicUrl,path}**. Shared handler: `web/lib/tenant/image-upload.ts:23`, `web/lib/tenant/image-upload.ts:44`, `web/lib/tenant/image-upload.ts:50`, `web/lib/tenant/image-upload.ts:74`. No new remove-image operation was found in the owned Account UI.

#### B08 — Follow-up queue and communication/event actions

- `GET /api/tenant/followups?includeActioned=1&minAgeHours=0`: delivered unpaid/unaccepted quotes plus qualifying unquoted SMS leads, bounded at 500 quotes/300 leads, row kind and meta retained. `POST /api/tenant/followups` accepts **{quoteId,action:'mark_contacted'|'reopen'}**. Sources: `web/app/api/tenant/followups/route.ts:53`, `web/app/api/tenant/followups/route.ts:231`, `web/app/api/tenant/followups/route.ts:291`.
- `POST /api/tenant/followups/call`: **{quoteId}** or **{conversationId}**, owner phone first and customer resolved server-side, provisioned voice caller ID, AU-mobile validation; 409 missing setup,404 ownership/not-found,422 invalid customer,502 provider failure. This initiates a real call, not a read-only phone lookup. Source: `web/app/api/tenant/followups/call/route.ts:46`.
- `POST /api/tenant/followups/text`: **{quoteId,text}** or **{conversationId,text}**, trimmed/sliced640, required SMS number and scoped valid AU mobile; sends/logs thread, pins quote follow-up context and records text_sent event. Source: `web/app/api/tenant/followups/text/route.ts:45`, `web/app/api/tenant/followups/text/route.ts:137`, `web/app/api/tenant/followups/text/route.ts:260`.
- `GET /api/tenant/followups/messages?quoteId=...` or `?conversationId=...`: scoped message thread and reply recency; not the same as event history. Source: `web/app/api/tenant/followups/messages/route.ts:1`.
- `GET /api/tenant/followups/events?quoteId=...` returns up to200 scoped events. `POST` accepts **{quoteId,kind:'note',outcome,note?}**; outcomes left_voicemail/spoke/no_answer/wants_callback/not_interested/other, note max500, records the touch and updates contacted state. Sources: `web/app/api/tenant/followups/events/route.ts:29`, `web/app/api/tenant/followups/events/route.ts:54`, `web/app/api/tenant/followups/events/route.ts:91`. No events GET caller exists in the native screen; message expansion does not fulfill it.

#### B09 — Calendar

`GET /api/tenant/calendar` returns events, toSchedule, awaitingBooking, review count, tenantId and **tenantTz**; actual field names must be retained from its response at `web/app/api/tenant/calendar/route.ts:336`. It combines booking/job sources and tenant-local schedule context. Native declares only the used subset and currently formats with device timezone. `POST /api/tenant/calendar/{quoteId}/confirm`, bodyless (native redundant quoteId body is ignored), atomically changes requested→confirmed with tenant guard; wrong state/not-found is409. Sources: `web/app/api/tenant/calendar/[quoteId]/confirm/route.ts:14`, `web/app/api/tenant/calendar/[quoteId]/confirm/route.ts:32`. Review count's narrow drafted filter at `web/app/api/tenant/calendar/route.ts:238` needs vocabulary reconciliation. Public booking tokens/schedules are PUBLIC dependencies.

#### B10 — Invoice calibration (not historical quote calibration)

`GET /api/tenant/calibration` returns uploaded invoice/extraction/report/suggestion data; `POST /api/tenant/calibration/upload` accepts **{image_base64,mime_type}**, JPEG/PNG/WEBP/HEIC/PDF. The current web UI rejects raw files >3MB before base64 conversion; server BodySchema only requires nonempty base64 plus allowed MIME, so add/verify equivalent server decoded-size bounds before claiming hardened upload limits. Sources: `web/app/api/tenant/calibration/route.ts:49`, `web/app/api/tenant/calibration/upload/route.ts:39`, `web/app/dashboard/page.tsx:6526`.

`POST /api/tenant/calibration/accept` accepts **{trade,accept:boolean}**. Tenant scope, current invoice/pricing recomputation and acceptance/rejection audit are server-side; accepted_by/rejected_by uses the legacy Supabase owner UUID rather than inserting a Clerk string into a UUID FK. Sources: `web/app/api/tenant/calibration/accept/route.ts:43`, `web/app/api/tenant/calibration/accept/route.ts:48`, `web/app/api/tenant/calibration/accept/route.ts:147`, `web/app/api/tenant/calibration/accept/route.ts:204`, `web/app/api/tenant/calibration/accept/route.ts:231`. Native has no invoice-calibration UI/caller; implementation depends on server schemas, upload picker, current-price refresh and explicit owner approval.

#### B11 — Connect/payout readiness and release

`GET /api/tenant/payouts` returns recent scoped paid jobs, account/bank/balance/schedule/requirements and live payout data with bounded Stripe lookups; recent job cap200 and payout lookup cap100. Sources: `web/app/api/tenant/payouts/route.ts:89`, `web/app/api/tenant/payouts/route.ts:159`, `web/app/api/tenant/payouts/route.ts:213`, `web/app/api/tenant/payouts/route.ts:243`. Tenant readiness flags are not automatically reconciled by this read.

`POST /api/stripe/connect/start` returns Stripe account-link URL; `POST /api/stripe/connect/refresh` explicitly synchronizes tenant flags and handles stale account state. Both use bearer-owned tenant, with environment/provider configuration errors. Sources: `web/app/api/stripe/connect/start/route.ts:42`, `web/app/api/stripe/connect/refresh/route.ts:54`.

`POST /api/quote/{id}/complete` first verifies owner/paid state, then records completion and evaluates settlement/payout readiness. A200 **{ok:true,completed:true,released:false,block:...}** is a recoverable blocked release, not failure to mark complete and not a payout success. It claims release atomically to avoid duplicates; provider failure can leave completion recorded while release is retryable. Sources: `web/app/api/quote/[id]/complete/route.ts:41`, `web/app/api/quote/[id]/complete/route.ts:82`, `web/app/api/quote/[id]/complete/route.ts:104`, `web/app/api/quote/[id]/complete/route.ts:128`, `web/app/api/quote/[id]/complete/route.ts:168`, `web/app/api/quote/[id]/complete/route.ts:198`. Native's empty schema and completed_at-null button gate are material gaps (CORE-143/144). Platform fee is calculated by server; copy conflict cannot authorize changing it.

#### B12 — Billing and native entitlements

`GET /api/billing/status` reads tenant subscription_plan/status/interval/renewal/trial/cancellation and usage/planLimits from the Stripe-backed mirror. `POST /api/billing/checkout` **{plan:'starter'|'pro'|'crew',interval:'month'|'year'}** updates a live Stripe subscription in place (with unchanged no-op) or creates a hosted Checkout session. `POST /api/billing/portal` creates a URL for an existing Stripe customer. Sources: `web/app/api/billing/status/route.ts:11`, `web/app/api/billing/checkout/route.ts:23`, `web/app/api/billing/checkout/route.ts:42`, `web/app/api/billing/portal/route.ts:1`.

Native `mobile/src/lib/purchases.ts:93`, `mobile/src/lib/purchases.ts:154`, `mobile/src/lib/purchases.ts:179`, `mobile/src/lib/purchases.ts:210`, `mobile/src/lib/purchases.ts:225` configures RevenueCat, binds Clerk identity and has paywall/customer-center/restore helpers. Only paywall is connected in Billing. **Missing backend readiness:** no RevenueCat webhook/verified purchase-reconciliation API is in current handler census; Billing refetches the unrelated Stripe mirror after SDK success. Required work: signed provider event verification, stable tenant/customer mapping, entitlement grant/revoke/refund/expiration reconciliation, idempotency and billing-origin guard before another subscription is sold. G-006 and X-011 require app-store/provider policy verification; do not assume linking Stripe from iOS is automatically compliant or that a local SDK result grants server permissions.

#### B13 — Historical quotes import/review/read/calibration

- `GET /api/tenant/historical-quotes`: q/job_type and server-side trade/from/to query support; current web UI exposes q+job_type. `GET /analytics` and `GET /hint?job_type=...&trade=...` use confirmed history. Sources: `web/app/api/tenant/historical-quotes/route.ts:1`, `web/app/api/tenant/historical-quotes/analytics/route.ts:10`, `web/app/api/tenant/historical-quotes/hint/route.ts:1`.
- `POST /import`: multipart **file**, CSV/PDF, nonempty≤10MB; creates batch and schedules parsing, returns **{batchId,status:'parsing'}**. `GET /batches/{batchId}` is tenant-scoped and returns batch+rows. Sources: `web/app/api/tenant/historical-quotes/import/route.ts:16`, `web/app/api/tenant/historical-quotes/import/route.ts:61`, `web/app/api/tenant/historical-quotes/batches/[batchId]/route.ts:10`.
- `POST /review`: **{updates:[{id,job_type?,status:'confirmed'|'rejected'}]}**,1–5000 rows, validated UUID/category and owned batch/rows. Source: `web/app/api/tenant/historical-quotes/review/route.ts:12`.
- `POST /calibration/preview`, bodyless, returns authoritative proposal/current price/sample metadata. `POST /calibration/apply`: **{job_types:[...]}**,1–50, recomputes against current confirmed history before upserting accepted custom assemblies. Sources: `web/app/api/tenant/historical-quotes/calibration/preview/route.ts:13`, `web/app/api/tenant/historical-quotes/calibration/apply/route.ts:21`, `web/app/api/tenant/historical-quotes/calibration/apply/route.ts:34`. Native already has this explicit preview/select/apply path; importer and review are browser-only.

#### B14 — Files, Q&A and comments

`GET /api/tenant/files` returns scoped metadata/counts; `GET /files/{id}/download` validates ownership before private storage and returns binary data. Native must use bearer fetch → cached file → share, not Linking. `POST /files/chat` **{query}** returns answer/citations (including document_id), with no-docs and retrieval failure handling. Sources: `web/app/api/tenant/files/route.ts:33`, `web/app/api/tenant/files/[id]/download/route.ts:67`, `web/app/api/tenant/files/chat/route.ts:57`, `web/app/api/tenant/files/chat/route.ts:129`.

`GET/POST /files/{id}/comments` reads thread/adds **{body}**; `PATCH/DELETE /files/{id}/comments/{commentId}` edits **{body}** or soft-deletes only own comment on an owned file. `POST /files/{id}/resolve` **{resolved:boolean}** toggles discussion status. Body text max5000; new comment reopens the thread. Sources: `web/app/api/tenant/files/[id]/comments/route.ts:21`, `web/app/api/tenant/files/[id]/comments/[commentId]/route.ts:24`, `web/app/api/tenant/files/[id]/resolve/route.ts:14`, `web/lib/filestore/comments.ts:16`, `web/lib/filestore/comments.ts:217`. Resolve currently truthiness-coerces its body; strict boolean validation should precede a claim that arbitrary payloads are rejected. Native comments/preview are only a web link.

#### B15 — Customer QR marketing and recruitment codes

`GET/POST /api/dashboard/marketing/qr`: create **{label,destination_type:'sms'|'landing'|'signup',prefill_body?,campaign?}**, label1–60/prefill≤140/campaign≤40, prerequisite number/slug checks. Customer UI exposes only sms/landing. `PATCH /qr/{id}` supports optional label/destination/prefill/status active|paused|archived; `GET /qr/{id}/image?format=png|svg` supplies assets. Sources: `web/app/api/dashboard/marketing/qr/route.ts:13`, `web/app/api/dashboard/marketing/qr/route.ts:26`, `web/app/api/dashboard/marketing/qr/[id]/route.ts:9`, `web/app/api/dashboard/marketing/qr/[id]/image/route.ts:1`.

`GET/PATCH /api/dashboard/marketing/slug`, patch **{slug}**, trimmed2–40, normalizes/validates format/reserved names and409 collision. Source: `web/app/api/dashboard/marketing/slug/route.ts:18`.

Recruitment codes: `GET/POST /api/dashboard/invites/codes`, optional scope/campaign/quota_total/description/expires_at/custom_code; non-admin must stay tenant scoped, platform scope admin only. `PATCH /codes/{id}` manages code lifecycle; `POST /codes/{id}/send` **{channel:'email'|'sms',to}**, checks ownership/active/recipient and explicitly sends a signup invitation. Sources: `web/app/api/dashboard/invites/codes/route.ts:58`, `web/app/api/dashboard/invites/codes/[id]/send/route.ts:53`. Web customer page deliberately moved code UI to admin; native still exposes a subset. Preserve existing server-authorized native tenant-code functionality while implementing the website's admin controls under the PUBLIC role boundary; do not silently remove functionality or expand permissions.

#### B16 — CRM and announcement

`GET /api/tenant/crm/status`, `GET /crm/connect/{provider}` (hubspot|zoho), OAuth `/callback`, `POST /crm/sync` **{provider}**, `POST /crm/disconnect` **{provider,deleteContacts:boolean}**. Readiness needs provider env credentials, OAuth callback/redirect registration, tenant-owned tokens and safe mobile return flow. Sources: `web/app/api/tenant/crm/status/route.ts:11`, `web/app/api/tenant/crm/connect/[provider]/route.ts:1`, `web/app/api/tenant/crm/disconnect/route.ts:11`, `web/app/dashboard/crm/page.tsx:101`.

`GET /api/tenant/campaigns/announcement` reads current campaign; `POST` **{mode:'unsent'|'all',confirm?:true}** defaults to preview unless confirm is exactly true. Requires business_address, twilio_sms_number and business_name, filters contacts/unsubscribes/prior successful sends and returns preview subject/HTML/eligible count or send results. Preview may create a campaign row but does not mail recipients. Sources: `web/app/api/tenant/campaigns/announcement/route.ts:73`, `web/app/api/tenant/campaigns/announcement/route.ts:85`, `web/app/api/tenant/campaigns/announcement/route.ts:91`, `web/app/api/tenant/campaigns/announcement/route.ts:98`, `web/app/api/tenant/campaigns/announcement/route.ts:161`. Missing business_address is a real readiness dependency because current Account PATCH lacks that field. No native CRM API implementation exists; do not bypass confirmation/unsubscribe rules while replacing web handoff.

#### B17 — Native flyer documents and exports

`GET/POST /api/dashboard/flyer`; create **{template_id,name?}** (name1–80). `GET/PATCH/DELETE /flyer/{id}`; patch optional **{name,document}** with document schema and tenant ownership. `POST /flyer/upload` multipart **file**, PNG/JPEG/WEBP≤5MB. `POST /flyer/{id}/export` **{png:<data:image/...>,pdf?:<data:application/pdf...>}**, stores rendered assets and returns URLs. Sources: `web/app/api/dashboard/flyer/route.ts:15`, `web/app/api/dashboard/flyer/[id]/route.ts:30`, `web/lib/flyer/api-logic.ts:11`, `web/lib/flyer/api-logic.ts:26`, `web/lib/flyer/upload.ts:7`, `web/app/api/dashboard/flyer/[id]/export/route.ts:24`.

Native editor dependency is a touch-capable document renderer/editor/export pipeline compatible with current schema, not a blind import of react-konva into React Native. Reuse authoritative template/document model, image URL policy and server persistence. Three templates at `web/lib/flyer/templates.ts:21`; fonts at `web/lib/flyer/schema.ts:18`. Public QR asset handling is B15.

#### B18 — Canva

`GET /api/dashboard/flyer/canva/status`, `GET /connect`, OAuth `GET /callback`, `POST /disconnect`; `POST /designs` accepts **{}** or optional title1–120 and returns id/editUrl/viewUrl; `DELETE /designs/{id}` removes the owned tracked record; `POST /designs/{id}/import` accepts **{}** (default PNG/PDF) or **{formats:['png'|'pdf',...]}**, validates ownership and exports/imports to tenant storage. Sources: `web/app/api/dashboard/flyer/canva/connect/route.ts:20`, `web/app/api/dashboard/flyer/canva/designs/route.ts:19`, `web/app/api/dashboard/flyer/canva/designs/[id]/import/route.ts:23`, `web/lib/canva/api-logic.ts:11`. Missing connection409, upstream creation/export502 and partial failures need useful UI. External Canva editing remains external even if native connection/list/import screens are added.

#### B19 — Brand Studio rendering

`GET /api/studio/render?format=li-carousel&d=<base64 JSON slide>` returns a rendered image; absent d uses a default slide index, invalid JSON400. Current renderer casts JSON to Slide rather than strict schema validation, and photo paths are read from public assets: add allowlisted/validated slide/photo input and bounded payload before accepting arbitrary mobile-supplied data. Sources: `web/app/api/studio/render/route.ts:15`, `web/app/api/studio/render/route.ts:26`, `web/app/api/studio/render/route.ts:34`. Web page holds edits in local React state and exports PNG/client-built PDF; there is **no existing tenant-persistent Brand Studio project API**. Persistence/cloud syncing is additional backend scope if required, not something this audit can mark ready.

#### B20 — Videos

`GET /api/tenant/videos?trade=...` returns owned/default welcome/thank-you slots, state and contact defaults; it can resume in-flight jobs. `POST /api/tenant/videos/generate` accepts multipart **slot:'welcome'|'thankyou'|'both'**, **trade**, **script_welcome?**, **script_thankyou?**, **owner_photo?**, repeated **extra_image**, **contact_name?**, **details?**. Sources: `web/app/api/tenant/videos/route.ts:43`, `web/app/api/tenant/videos/route.ts:70`, `web/app/api/tenant/videos/generate/route.ts:43`, `web/app/api/tenant/videos/generate/route.ts:56`, `web/app/api/tenant/videos/generate/route.ts:91`, `web/app/api/tenant/videos/generate/route.ts:125`, `web/app/api/tenant/videos/generate/route.ts:150`, `web/app/api/tenant/videos/generate/route.ts:158`. Trade must be enabled; scripts≤220, photo PNG/JPEG/WEBP≤7MB; only up to two extra images are used and invalid extras currently skip. One in-flight generation per tenant limits cost; guard native repeated/both actions. Requires configured generation provider/storage/background execution, owner permission and polling; no real generation was invoked for this audit.

### Dynamic options, keyboard behavior and intentionally excluded controls

- **History job types (22):** downlights, power_points, ceiling_fans, smoke_alarms, outdoor_lighting, switchboard, oven_cooktop, ev_charger, fault_finding, renovation, blocked_drain, hot_water, tap_repair, tap_replace, toilet_repair, toilet_replace, gas_fitting, burst_pipe, bathroom_renovation, cctv_inspection, prv_install, other. Source: `web/app/dashboard/_components/HistoricalQuotesTab.tsx:18`. These drive import-review correction and browse filter, not an unrestricted arbitrary job category field.
- **Global desktop keys:** Cmd/Ctrl+K opens the palette; Escape dismisses palette/profile/notification/period overlays; Enter activates the current palette choice and keyboard-openable rows. Sources: `web/app/dashboard/page.tsx:1309`, `web/app/dashboard/page.tsx:1522`, `web/app/dashboard/page.tsx:1673`, `web/app/dashboard/page.tsx:1793`, `web/app/dashboard/page.tsx:3586`; native equivalents are accessible press, dismiss, focus return and hardware-back behavior. No copy of a desktop keyboard shortcut is necessary for phone-only use.
- **Chat status presentation:** open→Live, structuring→Drafting, done→Completed, abandoned→Went cold, otherwise Unknown/raw state; voice does not qualify as cold. Source: `web/app/dashboard/page.tsx:15721`.
- **Document typography/content versus app design tokens:** report fonts/accent swatches and flyer template fonts are deliberately editable document content, not authority to replace QuoteMax's Manrope/JetBrains Mono app chrome.
- **No existing baseline for staff/team management:** account trade selection, Crew billing and recruitment codes do not constitute member invitation, roles or seat management. Adding those needs separate product/backend requirements.
- **No existing baseline for calendar full CRUD:** this tab shows bookings, links to scheduling and confirms requested visits; it does not expose a complete reschedule/cancel/calendar editor.
- **No existing baseline for Brand Studio cloud projects/social publishing:** current studio is local slide editing and export only.
- **Dead/legacy code:** ActivateTradeCard exists without a reachable JSX render; shared trade/hub orphan tab implementations still need TRADE inventory, but dead UI should not be promoted to new visible workflow solely to reach a nominal parity count.
- **Native additions are not web gaps:** System appearance preference, biometric lock, camera/library choice, native video player, share sheet and pull-to-refresh are valid native adaptations. Their security/platform testing is covered by X/PUBLIC.

### Product-policy and readiness decisions that must remain explicit

1. **Review and auto-send conflict.** `web/../AGENTS.md:18`, `web/../AGENTS.md:24`, `web/../AGENTS.md:69` still state portal-first/no auto-send v1. Current strategy records the v6 electrical/plumbing auto-send shift (`web/../docs/strategy.md:579`), review-required roofing exception (`web/../docs/strategy.md:830`), clean-only solar auto-release (`web/../docs/strategy.md:910`) and v21 painting auto-send (`web/../docs/strategy.md:1457`). Existing native explicit send/approve safety must not be removed to copy an inferred global rule; do not silently force all production trades back to old policy either. Canonical policy must name trade, eligibility, review flags, tenant opt-in and responsible authorization. No strategy/source policy was changed during this audit.
2. **Fee copy versus actual funds.** CORE-146 records billing 'No cut of jobs' versus server/payout 2% fee. Resolve product copy and intended fee explicitly; changing a calculation is not UI parity work.
3. **RevenueCat versus Stripe authority.** CORE-153/154 need server entitlement reconciliation and billing-origin rules before native purchase is considered complete. SDK success is not evidence that the authenticated API grants the plan.
4. **Quote safety and tax.** Preserve server pricing, quote-associated stored GST/version basis, accepted/paid restrictions, manual-edit provenance and explicit ungrounded/notify approvals. CORE-059/B06 requires repairing the tier endpoint's arbitrary book/default-GST lookup before native selection; CORE-067 records hard-coded document tax display. PUBLIC-011 and B06 require repairing quiet-save status and durable notify outcome as well as edit payload provenance loss. Solar's synchronized specialized editor is mandatory (CORE-056).
5. **Schema mismatch is backend work.** Licences for expanded trades (CORE-118), CRM missing business_address path (B07/B16), invoice upload decoded-size validation (B10), loose comment resolved-body coercion (B14), and unvalidated Brand Studio slide/photo input (B19) must not be papered over with native labels.
6. **Recruitment invitation scope.** CORE-192 records web/admin relocation versus current native code creation/send. Preserve existing server-authorized tenant-code functionality, correct recipient copy and implement admin controls under their existing server role. No admin capability should be unlocked because a server schema contains optional fields.
7. **Read-only audit is not read-only endpoint classification.** Welcome email, call/text, manual reply, approve/send, purchase/release, campaign confirm and video generation are externally consequential. Even GET videos can resume generation and campaign preview can create a row. No such endpoints were called to produce this audit.

### Suggested implementation sequence and dependency gates

| Work package | Requirements | Dependencies and completion evidence |
|---|---|---|
| Correct existing semantic gaps first | CORE-020, CORE-029–038, CORE-047/049, CORE-055/056, CORE-069–076, CORE-095, CORE-127, CORE-143/144 | Pure fixtures for merged queue/search/counts/sort/date bounds, stub-number detection, held status, exact filtered navigation, tenant timezone and already-completed payout retry. Preserve current UI styling and successful native actions. |
| Resolve money/policy authority | CORE-053–056, CORE-123–130, CORE-143–156 | Confirm canonical per-trade send/fee rules; backend RevenueCat verification and billing-origin guard; quote edit provenance and tax audit. Sandbox tests must prove no send on initial arm, no duplicate charge/release and no entitlement from an unverified local result. |
| Native Account and business settings | CORE-105–122, CORE-123–134 | Extend bounded account forms, file picker, trade reconcile/confirmation; backend licence breadth and address prerequisite. Failed save retains draft; refreshed API shows same saved values and correct provider readiness. |
| Native report/document editing | CORE-040–068 | PUBLIC-011 plus TRADE adapter dispatch, private preview/download, sanitized document/style payloads and server pricing. Test owner/non-owner/paid/inspection/flagged cases and persisted reopened document/export; preview or Apply must never send. |
| Close daily-operation gaps | CORE-069–104 | Cold-chat filter/linking, metadata, follow-up categories/default text/history, calendar week/zone/nudges/new-booking. Mock external call/text APIs; test actual per-record request, cancellation and error recovery. |
| Files and import review | CORE-157–181 | Native viewer/comment lifecycle, document IDs/citations, multipart import and durable batch context, confirmed-only history. Test foreign tenant 404/403, edit permissions, failed upload/batch/review and explicit calibration approval. |
| Customer marketing and CRM | CORE-182–202 | Scope decision for recruitment codes, QR asset/prefill/repoint/archive, OAuth native return, business_address configuration and unsubscribed-contact suppression. Preview and mode change send zero messages; confirmed mocked send reports partial results correctly. |
| Flyer, Canva and Brand Studio | CORE-203–235 | Touch document engine/export, branded asset validation, OAuth, tracked-design import, bounded studio renderer and optional persistence decision. Test round-trip save/open, loaded-font/image export, separate local-vs-provider failures and cancel/back preservation. |
| Complete video configuration | CORE-236–246 | contact_name/details, both-slot operation, honest extra-image limit and provider job state. Test mocked generation only, one in-flight action and correct per-trade/default/owned labels. |

These packages are proposals derived from the source gaps, not authorization to send messages, charge money, generate paid provider assets, modify strategy, or deploy.

### Business feature verification requirements

- Validate every N/P control using tenant-scoped fixtures before calling it behavior-complete. Existing UI-polish Playwright results do not prove missing features, provider reconciliation, device security or every business edge case.
- For each screen: initial loading, true empty, filtered empty, stale successful data plus failed refresh, retry, offline/timeout, back with draft, keyboard at narrow width, Dynamic Type/screen reader and light/dark states. A modal/footer primary action must remain reachable with keyboard and safe-area insets.
- For each mutation: exact body/method/path, changed-state/ownership errors, pending repeated taps, cancellation where applicable, successful invalidation, already-actioned/no-op and ambiguous timeout. No real call/SMS/email/payout/purchase/generation is required for these acceptance tests.
- Private downloads must use authenticated transport and safe local-file sharing. Provider web handoffs require allowlisted destinations and a return/refresh path; external browser screens remain W until corresponding native flows exist.
- Test mixed trades, missing fields, old status aliases, long names/descriptions, date/timezone boundaries, capped result sets and partial source failures. Source constants and comments must agree with actual function branches.
- Use this CORE matrix together with TRADE, PUBLIC and the complete route/control appendices. Shared IDs PUBLIC-011 and TRADE-013 are dependencies, not duplicate implementations.

## Trade tools and pricing: website-to-native completeness requirements

Audit date: 2026-08-31. It is a source audit of the current dirty working trees, not a runtime parity certification. Existing UI polish was preserved; no production APIs, uploads, sends or data mutations were executed for this audit.

Source-root notation used throughout:

- **W** = `C:/Users/dalig/Downloads/QuoteMate/quoteMate/quotemate-automation`.
- **N** = `C:/Users/dalig/Desktop/MaintainTech/MaintainOrg/qm-mobile`.
- `W/path:line` and `N/path:line` identify current source anchors, not external documentation. Relevant components were read, including nested controls; merely finding an API consumer does not count as a working native feature.

Status meanings: **present (source-only)** = reachable native controls implement the described function, not yet demonstrated on an installed device in this audit; **partial** = some controls/outcomes exist but named behaviour is missing; **browser-only** = the app hands the user to a website; **missing** = no reachable native equivalent found; **backend-shared** = both clients depend on a contract or defect that native styling cannot fix; **gated** = available only behind an entitlement, configuration, source approval or development gate. Statuses can coexist.

The full website inventory remains in scope even when earlier mobile planning documents called a feature a non-goal. This spec does not authorise new trades, source licensing, automatic sending, live 3D generation, production deployment or weakened permissions. General tenant policy controls, quote approval/send and billing are in the CORE requirements. Customer/public token flows are in PUBLIC-020/021/022 and the other public requirements. The X requirements own final authentication, legal/source and capability decisions.

### Implementation priority and dependency order

1. Repair shared price authority, conditional-recipe preservation and fresh-save proof before extending money-touching native actions: TRADE-004, TRADE-008, TRADE-010, TRADE-012, TRADE-013 and TRADE-021.
2. Complete the field/control contracts already backed by tenant APIs: job drafts, full rate cards, services, catalogue import, estimating explanation, commercial review, solar actions and estimator review.
3. Implement native painting and signage workflows with durable route identity, upload recovery and explicit human decisions.
4. Add approved map/plan/3D surfaces and Brand Studio only after their separate permission, platform and service dependencies have been met. Do not disguise an external browser as completed native parity.

### TRADE-001 — Trade workspaces, route identity and capability gates

**Status: partial; several child workflows browser-only/gated.**

The website supports eight trade hubs: electrical, plumbing, roofing, signage, painting, commercial_painting, aircon and solar. Each has Quotes, Tools, Pricing, Services, Catalogue, Recipes and Estimating. The native registry and HubScreen expose those seven sections for the tenant's enabled trades. Electrical Tools includes both a structured job form and the plan estimator; plumbing has the job form; the other trades dispatch to their respective tools/history panels. Evidence: `W/app/dashboard/page.tsx:428`, `W/app/dashboard/page.tsx:17053`; `N/src/features/trades/hub/sections.ts:15`, `:62`; `N/src/features/trades/hub/HubScreen.tsx:56`.

Native trade and section selection currently live in local component state. Browser exits frequently target a generic hub rather than the specific run or selected section; pull-to-refresh at HubScreen refreshes tenant/me, not necessarily the active tool query. A native selection is not proof that its writers accept the trade: `N/src/features/trades/hub/write-gate.ts` restricts recipe/catalogue/service creation to electrical/plumbing; `W/lib/tenant/update-schema.ts:14` still uses that two-trade enum for those writes, while `:20` permits eight trade keys for pricing-book/tier updates.

**Required implementation / acceptance:**

- Assign durable native route parameters for trade, section and saved record/run. Back navigation, process restart, authenticated universal links and return from a browser must restore context; never restore one tenant's cached context into another session.
- Preserve all seven sections and their empty/error/loading states. Do not present disabled trade writers as functional merely because a hub exists. Where the API itself rejects the trade, say that configuration is unsupported; “manage on the web” is not a valid workaround for the same rejected API.
- Key every editable section by tenant + trade + record, or explicitly synchronise state without discarding dirty edits. Switching electrical→plumbing must not carry pending rates, tier mode, catalogue selection or recipe form data across trades.
- Refresh each active query on explicit refresh and after relevant mutations/browser return. The saved roofing/painting/solar/commercial lists must reflect new records without app restart.
- Preserve source-only versus device-verified status for each family below. Core quote list/approval work is owned by the core requirements, not duplicated here.

### TRADE-002 — Structured electrical/plumbing job drafting

**Status: partial; core native form and draft API are present (source-only).**

Website: `/dashboard/job/[trade]`, only electrical/plumbing, guarded by the corresponding FeatureGate. `W/app/dashboard/job/_components/JobQuoteForm.tsx:128` supplies job-type-specific controls, optional product pinning, address autocomplete, customer contact and notes; successful drafts navigate to `/dashboard/quote/{shareToken}` at `:291`. Native equivalent: `N/src/features/trades/jobquote/JobQuoteScreen.tsx:31`, `job-fields.ts`, `schema.ts`, `api.ts`.

**Control inventory:** electrical job types include downlights, power points, ceiling fans, smoke alarms, outdoor lighting, switchboard, oven/cooktop, EV charger, fault finding, renovation and other; plumbing includes blocked drain, hot water, tap repair/replacement, toilet repair/replacement, gas fitting, burst pipe, bathroom renovation, CCTV inspection and PRV installation. `other` currently resolves to electrical, not a plumbing fallback. Each type must preserve the exact canonical enum values, required counts, select choices and free-text questions in `job-fields.ts` and the website form/IntakeSchema. These include count, room, ceiling type, replacement/new, colour, distance to existing power, circuit, supplied-by, smoke class, appliance, phase, sensor, fault symptom, blockage severity, energy source, litres, tap/toilet symptom and toilet style where applicable. Shared fields are address, suburb, notes, customer name/mobile/email and optional catalogue product. The exhaustive dynamic job table is below.

**Contract:** `POST /api/tenant/job-quote` with `{job_type,address,suburb,answers,notes,customer_name,customer_mobile,customer_email,product_name?,product_id?}`. Address/suburb must be nonempty; any applicable count must be finite and positive. Server lengths: notes 4,000, name 200, mobile 40, email 200, product name 300; product ID is UUID. The canonical job type determines trade, not free text. Product pinning is re-resolved under tenant + trade + active + valid price; client prices are not accepted. Success carries quote/intake IDs, nullable share token and inspection/pinning information. Evidence: `W/app/api/tenant/job-quote/route.ts:44`, `:79`, `:94`, `:124`; `N/src/features/trades/jobquote/JobQuoteScreen.tsx:94`; `N/src/features/trades/jobquote/api.ts`.

**Gaps and acceptance:**

- Add native address suggestions and selection→suburb population, retaining manual address/suburb fallback. Website uses `AddressAutocomplete`; native has plain text fields at `JobQuoteScreen.tsx:223`.
- Match selected-product photo, brand, range, price basis and customer-supplied handling; website product preview is at `JobQuoteForm.tsx:386`. A displayed price is read-only tenant data.
- On successful draft, provide an immediate native “Review draft” action to the exact returned record, and retain the inspection-required outcome. Native currently shows a summary/instruction to use Quotes at `:279`, without the website's direct open action.
- Bind loading/success/uncertain-result state to the submitted request. Prevent another tap from creating a duplicate after a success or a timeout with uncertain completion. The current native button becomes usable with unchanged input after success; the server has no request-idempotency key in this contract. A backend idempotency/reconciliation extension is needed to guarantee safe retries, not a client timer.
- Handle 401/no tenant, entitlement/feature denial, validation details, product no-longer-available, pipeline failure and timeout separately. Do not clear the user's form on error; on an uncertain timeout prompt inspection of the draft list before retry.
- Drafting must never send. Do not call the internal `/api/estimate/draft` cron-authorised route from native; it is not a tenant mobile API (`W/app/api/estimate/draft/route.ts:77`).

### TRADE-003 — Roofing measurement, buildings and saved review

**Status: partial; native basic form/measure/save exist; map, enriched review and multi-building quotation remain browser-only/missing.**

Website `/dashboard/roofing/measure` has address autocomplete/manual entry; postcode; AU state; existing roof material; pitch; intent; optional construction year; address lookup or map-centre reverse geocode; multi-building map selection; per-building material override and remeasurement; per-building surface area, perimeter, pitch/provenance, provider attributes, flags/routing and tier prices; included/excluded building totals; property context, Street View/static map/3D; photo verification; solar detection/removal allowances; measurement save, quote promotion and PDF. After successful measurement the current web page auto-saves then navigates to `/m/{measure_token}`, with inline results mainly a save-failure fallback. Evidence: `W/app/dashboard/roofing/measure/page.tsx:102`, `:166`, `:228`, `:265`, `:302`, `:369`, `:420`, `:661`, `:853`.

Native `RoofMeasureScreen.tsx:43` exposes address/postcode/state/material/pitch/intent/year, measure, structure inclusion, result amounts/routing, save job and save as quote. `RoofingSavedJobs.tsx` lists server-denormalised saved rows and opens the browser. `tools-api.ts:145` reads saved jobs; `roofJobHref` currently prefers `/q/roof/{public_token}?full=1` over the private `/m/{measure_token}` review page. See PUBLIC-020 for private review, metric/photo editing and promotion, and TRADE-030 for gated topology/3D.

**Existing contracts:**

| Endpoint | Request/result and conditions |
|---|---|
| `POST /api/roofing/measure-all` | `{address:{address,postcode,state},inputs,perBuilding?,perBuildingEdges?,use_mock_provider?}`. Address 3–300 chars, postcode exactly four digits, AU state enum. Materials colorbond_corrugated/colorbond_trimdek/colorbond_spandek/colorbond_kliplok/concrete_tile/terracotta_tile/cement_sheet/unknown; pitch shallow/standard/steep/very_steep/unknown; intent full_reroof/patch_repair/leak_trace/gutter_replace/ridge_cap/flashing_repair/unknown; optional year 1850–2100. Per-building edge edits permit hips/valleys 0–50 and box gutter 0–500 in current schema. Returns structures with deterministic quotes/provider metadata. Mock/source flags are not user pricing authority. |
| `GET /api/roofing/suggest-address` | Address suggestion UI's configured endpoint; keep provider failures nonfatal to manual entry. |
| `POST /api/roofing/reverse-geocode` | Website map-centre lookup contract; return structured address/coordinate resolution, not a priced result. |
| `POST /api/roofing/save` | `{address,provider,structures,quote?,included_indices?,customer_name?,customer_phone?,solar_photos?}`; 1–12 structures, up to 64 indices, customer name 160/phone 40, up to six photo entries. Returns `{ok,id,public_token,measure_token}`. `ok:false` can accompany HTTP 200 and must be treated as failure. |
| `GET /api/roofing/save` | Saved measurement summary list for current owner; display denormalised totals and server routing, never recompute client totals. |
| `POST /api/roofing/save-as-quote` | Existing payload includes client `address/inputs/metrics/price` and optional `measure_token`; unsafe price-authority shortfall is TRADE-004. |

Schema/handler anchors: `W/lib/roofing/request-schema.ts:13`, `:55`, `:82`; `W/app/api/roofing/measure-all/route.ts:39`; `W/app/api/roofing/save/route.ts:76`, `:193`, `:218`; `N/src/features/trades/roofing/api.ts:33`.

**Required acceptance:**

- Port building map/list selection, contextual imagery, material override and remeasure affordances, all metric/provenance/flag/routing readouts, combined included totals and PDF/review entry. Retain provider attribution, independent image loading failures and manual-form fallback. Do not conflate source-derived area with human-approved quote scope.
- Add explicit request identity to the measurement result. Current `RoofMeasureScreen.tsx:103` and `:129` save the **current form address** with the **previous result's inputs/metrics/price**. Editing address, postcode, state or pricing inputs after a result must mark it stale and disable promotion, or save the immutable submitted snapshot after clear confirmation. An old building must never be saved under a newly typed address.
- Native quote promotion currently permits only one included priced structure (`:124`); implement server-authoritative multi-building promotion matching web reviewed inclusion, not a client sum of arbitrary tiers. Preserve included selection across remeasurement only when structure identity is proven.
- Save must invalidate the saved-roof history query, use returned private review token, and offer exact-record reopen. Current `useSaveRoof` does not invalidate `ROOFING_SAVED_KEY`; returned tokens are not used to open detail.
- Carry `measure_token` for idempotent promotion after measurement save, with owner checks and 409/reload handling. Native currently omits it even after save. Repeated promotion of the same reviewed measurement must not create new quotes.
- Require at least one deliberate included building for promotion, preserve exclusions through reload, and test primary/default-selection sanitisation against the server.

### TRADE-004 — Roof and measurement price authority before quote creation

**Status: backend-shared blocker; do not reproduce current web vulnerability as parity.**

`W/app/api/roofing/save-as-quote/route.ts:69` accepts `price` from the client, casts it to `RoofingQuotePrice`, and later creates tier objects/quote money from that object (`:215`). `W/lib/roofing/save-as-quote-schema.ts` validates shape and tier count but does not establish that the submitted prices came from the current tenant's current rate card. The optional measurement-token path at `:120` claims/deduplicates an owned measurement; it does not make arbitrary submitted prices authoritative. Measurement save also accepts an unknown client quote snapshot (`W/lib/roofing/request-schema.ts:82`). A single-structure native restriction does not fix this.

**Required backend contract and acceptance:**

- Promote a tenant-owned, server-persisted measurement revision or re-run server pricing from validated raw measurement/approved scope. Bind included buildings, metrics, tenant, pricing-book version/rate revision, GST choice and human approval to that revision.
- Reject client attempts to replace tier totals, GST, routing or tenant/rate provenance. Reject nonfinite/negative/invalid rate inputs; block absent or unauthorised pricing rather than manufacturing seed quotes.
- Recheck current approved inputs and rate freshness at promotion; return an explicit stale-pricing conflict requiring review/reprice when rates or included geometry changed. Historical already-created quotes remain pinned to their historical version.
- Make measurement→quote linkage transactionally idempotent. Test cross-tenant token/ID, duplicate taps, response loss, rate change between measure/save/promote, altered client tiers and changed inclusion. Sending remains a later human action.
- Document whether stored measurement-only snapshots are untrusted/indicative until repriced. Public display must not accidentally expose trusted-looking monetary quotes from unverified snapshots. Coordinate PUBLIC-020 and crosscutting source gates.

### TRADE-005 — Residential painting measurement and visual review

**Status: browser-only for creation/review; native saved history present (source-only).**

Native `N/src/features/trades/tools/PaintingSavedJobs.tsx` has a saved-job list, server totals/status, browser row links and “Open painting tool”. There is no native residential measurement form, building selection, scope editor, repaint preview or 3D viewer. Website `/dashboard/painting` is a distinct feature from commercial painting.

**Website controls to reproduce:** address autocomplete/manual/postcode/state; scope toggles walls/ceilings/trim/exterior with at least one selected; coats 1/2/3; surface condition sound/minor/bare/poor; ceiling standard/high/extra_high/raked; storeys 1/2/3; colour-change switch; manual floor area override; property/building discovery and radio selection; remeasure chosen structure; original facade/Street View; AI substrate/material detection with confidence; result floor/paint area, floor-area source, structure, storeys, eave/property details and confidence; scope-by-scope quantities, rate/tier/loadings, paint/labour takeoff and routing; initial colour repaint preview, colour/swatches, before/after, refinement instruction/history/undo; optional approved 3D toggle. Save auto-redirects to `/p/{estimate_token}`; edit/release/resend at that private page is PUBLIC-021. Evidence: `W/app/dashboard/painting/page.tsx:65`, `:159`, `:211`, `:265`, `:286`, `:342`, `:461`, `:595`, `:701`; `painting/_components/MaterialCheck.tsx:28`, `PaintResultView.tsx:11`, `Paint3DTilesViewer.tsx`.

**Contracts / bounds:** `POST /api/painting/estimate {address,inputs}`; `POST /api/painting/structures` for address structures; `POST /api/painting/save {address,source,inputs,estimate,customer_name?,customer_phone?}`; `GET /api/painting/save` for owner history. `W/lib/painting/request-schema.ts` requires address 3–300, four-digit postcode, AU states, at least one allowed scope, allowed coats/conditions/ceiling/storeys, optional positive manual floor area ≤2,000 m². Room data allows at most 200 rooms with IDs, name ≤120, defined room type, optional width/length ≤100 and floor area ≤5,000, included/source/confidence. Structure IDs/labels are bounded. Saving accepts an unknown estimate snapshot; use the same server-authority discipline as TRADE-004 rather than treating arbitrary client money as reviewed.

**Required acceptance:** implement native inputs and result sections with one immutable request/result identity; stale changes disable promotion; server save returns exact-record review and refreshes history. Property lookup failure retains manual mode. Image/preview failure must never destroy measured scope or block an otherwise valid quote. Preview copy must identify a concept, not a colour specification or measured facade. Keep paint pricing/takeoff display-only distinctions. Do not turn photo AI confidence into an automatic approval. Recover/reopen the job, private token and input revision after app restart. Source-gated model generation follows TRADE-030 and the X/G gates.

### TRADE-006 — Solar quote list, calculator actions, building selection and integrations

**Status: partial; native history and Pylon hardware settings present; calculator, quote controls, maps/PDF and planner surfaces browser-only/missing.**

`W/app/dashboard/_components/SolarTab.tsx:115` is the website tenant workspace. It has Instant/Felt mode tabs, disabled-integration messaging, distinct copyable share URLs, refresh, recent estimate rows, pricing/routing/STC flags, Pylon lead link, OpenSolar project link, quote/PDF/Felt links, selected-building imagery and picker, explicit confirm/release, phase override, desired kW and re-draft. Actions refresh the list. `PylonHardwareCard.tsx` configures module/inverter/battery SKUs with verification.

Native `N/src/features/trades/tools/SolarTools.tsx:48` renders recent estimates, server totals, routing, STC/Pylon/Felt status, customer quote/Felt browser links, hardware fields and a browser-only “3D designer” card. It does **not** expose share/copy Instant/Felt choices, selected-building editing, confirm/release, phase/kW redraft, PDF, Pylon lead or OpenSolar project actions. `solar-api.ts` exports only list and hardware consumers. A loose response schema retaining extra fields does not mean those controls exist.

**Contracts:**

- `GET /api/tenant/solar` returns estimates plus share URL/integration state; response eligibility such as `canConfirm`/`canRedraft` must drive actions, never just quote age or a guessed status. Source anchors: `W/app/dashboard/_components/SolarTab.tsx:166`, `:210`, `:629`, `:685`.
- `POST /api/solar/confirm/{token}` is an explicit confirmation UI action that also queues customer SMS/MMS after the response; it is not a save-only operation. `SolarTab.tsx:245` updates confirmed state after success, but the current handler proves identity only (`W/app/api/solar/confirm/[token]/route.ts:50`), selects by public token without comparing tenant ownership (`:60`), stamps confirmation by ID without an atomic unconfirmed claim (`:85`), and queues customer sending (`:93`). Its `{ok:true,confirmed_at}` response does not prove delivery. **Shared-backend prerequisite:** derive the owner tenant, enforce solar entitlement and record ownership, atomically claim the reviewed estimate version, reconcile repeat/ambiguous requests and return durable release/delivery-operation state before enabling a native confirm action. A public token plus any signed-in identity is not sufficient authority. Preserve guardrail rejection and show the recipient and send consequences before the human action.
- `POST /api/solar/redraft/{token}` with optional `{phase:'single'|'three',desired_kw:number|null}`; `SolarTab.tsx:299`, `:746`, `:784`. The route reloads stored data/current solar config and refuses already-confirmed records at the initial read (409), but independently has the same identity-only/public-token ownership gap (`W/app/api/solar/redraft/[token]/route.ts:58`, `:84`). It then writes the estimate by ID (`:203`) and best-effort updates the twin quotes row by share token (`:224`), logging rather than failing a twin-write error; provider work follows in `after()`. **Shared-backend prerequisite:** enforce owner tenant and solar entitlement, validate overrides explicitly rather than silently ignoring invalid JSON/values, protect the unconfirmed/version precondition at commit, and make estimate/twin-price persistence atomic or expose a recoverable unsynchronised state that blocks confirm/payment. Use the current `MAX_REQUESTED_SYSTEM_KW`, not a client-invented cap.
- `POST /api/solar/q/{token}/select-building {building_id}`; `:349`. Re-read server geometry/price/routing after selection; handle 409 locked/422 ineligible.
- `GET/PUT /api/tenant/pylon/settings` with `{module_sku,inverter_sku,battery_sku}`; native present at `SolarTools.tsx:230`. Blank values clear to null; invalid SKU reports 422; unavailable integration 404 is a capability state, not empty success.
- Public calculator `/solar/[tenantSlug]`, its detect/estimate APIs and `/q/solar/[token]` public review are PUBLIC-022. Those controls include address lookup, detected/selected roof, free map centroid pick, manual orientation/roof-size/storeys fallback, panel quality, phase, requested kW, customer name/mobile and optional quarterly bill. Native must offer an authenticated entry preserving intended tenant and return context if implemented, not invent an alternate calculator endpoint.

**Acceptance:** verify new versus confirmed/released estimates, insufficient roof area/manual cases, disabled Felt/Pylon/OpenSolar, changed selected building, 401/403/409/422, no changes after failure, and exact IDs after browser return. Exercise confirm and redraft as the owner, another signed-in tenant and a disabled solar tenant; two concurrent confirms, redraft racing confirm, twin-write failure, response loss and customer-send failure must not create duplicate sends or mismatched charged/displayed prices. Keep public customer select-building as its distinct capability flow; do not owner-gate it merely to repair these owner actions. Display only server money/STC values with their GST basis. Preserve the distinction between panel-layout viewing and freely editing panel positions: current evidence establishes calculator/building selection plus public panel-plan/Felt integrations, not a general tenant JSON API for an arbitrary 3D panel editor.

### TRADE-007 — Air-conditioning recommendation and plan review

**Status: partial; native form, plan upload, priced/unpriced result and saved-ID PDF present (source-only).**

Website `/dashboard/aircon`: address/postcode/state; bedrooms/bathrooms/living counts; storeys; optional floor area; ceiling; insulation; existing system situation; optional budget; optional PDF/image plan; recommend; reset; PDF; property/location/map information; plan rooms/areas/sources/warnings; per-room sizing; alternatives with confidence/routing/reasons/pros and deterministic price breakdown; ducted/split floor-plan overlay and system schematic. `W/app/dashboard/aircon/page.tsx:125`, `:181`, `:427`, `:505`, `:611`, `:672`, `:839`, `:911`; `W/app/dashboard/_components/FloorPlanOverlay.tsx:90`.

Native `N/src/features/trades/aircon/AirconToolScreen.tsx:54` exposes these form fields, file picker, sizing/plan tables, priced/unpriced options, recommendation reset and native share/download PDF. Native does not display the floor-plan visual overlays, ducted/split layout selector, schematic, static map or persisted recommendation detail/reopen workspace. Core Quotes may link a public recommendation, but that is not a native plan-review screen.

**Contracts / bounds:** `POST /api/aircon/recommend {address,inputs}`; `POST /api/aircon/plan` multipart `plan` + JSON `address`/`inputs`; `POST /api/aircon/pdf {recommendationId}`. Address 3–300/four-digit postcode/AU state; each room count integer 0–20; at least a bedroom or living room; storeys 1–3; optional positive area ≤2,000; ceiling standard/high/raked; insulation good/average/poor/unknown; situation none/replacing/adding; positive optional budget ≤200,000. Plan PDF/JPEG/PNG/WebP ≤32 MB. Errors include invalid address/inputs, unsupported/oversize plan, extraction failed 502, unreadable plan or no conditioned rooms 422. `W/lib/aircon/request-schema.ts`, `W/app/api/aircon/plan/route.ts:40`; native strict parsers `schema.ts:21`.

**Current safety that must be preserved:** recommend and plan load a complete tenant-authored card (`W/lib/aircon/pricing-context.ts:6`, `recommend.ts:333`); otherwise return unpriced sizing, not seeded monetary alternatives, and do not persist a priced quote. PDF resolves tenant-owned `aircon_recommendations` by ID, parses a priced stored snapshot and ignores arbitrary client money (`W/app/api/aircon/pdf/route.ts:84`). Native only enables PDF for a priced saved result at `AirconToolScreen.tsx:114`. This is current implemented safety, not an unresolved old client-price-PDF issue.

**Acceptance:** add native plan/image paging/pan/zoom and the exact existing layout legend/control; preserve uncertainty and assumption labels. Add owned recommendation reopen with an explicit API capability assessment: the current tool API has POST operations, not a ready-made full native detail GET. A new owned detail contract may be required; do not scrape public HTML. Reopen must use the original saved price version, while a deliberate reprice uses current rates. PDF 401/404/422/503, sharing unavailable/cancelled, stalled response body, local-file cleanup and wrong-tenant IDs must be covered. Complete the rate setup dependency in TRADE-008.

### TRADE-008 — Missing tenant setup for aircon and commercial-paint rates

**Status: backend-shared product shortfall, not just a missing native form.**

Aircon unpriced copy tells users to complete pricing, but the inspected tenant rate writers expose roofing, residential painting, solar and generic hourly books; no tenant `aircon_rate_card` editor/writer was found. `W/lib/aircon/pricing-context.ts:12` reads `pricing_book.overlays.aircon_rate_card` from the primary-trade book (or first row when no primary), and `recommend.ts:333` demands all split head rates, ducted rates, discount and an explicit GST boolean. Generic labour settings cannot satisfy this card.

Commercial painting uses `paint_rates`, not residential `painting_rate_card`: labour coverage per system/method, per-item labour, material spread/price, height/prep/sundries/labour/crew modifiers and lift equipment. `W/lib/commercial-painting/rates.ts:57`, `:166`, `:188`; `types.ts:130`. Its authority gate rejects seeded/default rates or missing pricing book (`price.ts:299`), yet no tenant-facing adoption/CRUD UI/API for these rows was found in the owned website dashboard. A per-quote labour override cannot adopt the rest of the card. Explicit GST currently comes from `findCommercialPaintPricingBook`, which prefers commercial_painting then primary/first tenant book (`pricing-context.ts:24`); that fallback must be documented and reviewed rather than silently replaced by another trade's GST policy.

**Required work:** design an authenticated tenant-owned rate read/validate/adopt/update contract before promising “configure here” in native. Define which book owns each trade card, provenance/version, effective/default versus adopted state, finite positive required rates, allowed zero modifiers, bounds, optional equipment and GST authority. Add both website and native guided setup with effective values and explicit adoption confirmation. Server validates and reprices; no source/API/default values are silently guessed in the client. Verify missing/partial/malformed/zero/negative/nonfinite cards stay unpriced; adoption followed by reload and real pricing must prove the card became authoritative. Historical quote versions must remain unchanged. This is a new backend capability, not an existing endpoint claimed by this audit.

### TRADE-009 — Commercial painting tender workspace and corrections

**Status: partial; upload/extract/history/price/save are native, review editing/preview/plan context are browser-only.**

Website `W/app/dashboard/_components/commercial-painting/CommercialPaintingTab.tsx:109` supplies job name/site address, multiple documents, per-file classification, view/remove, takeoff extraction/retry, polling/history/reopen/new run, room/surface reconciliation flags, correction editor, per-quote labour override, confirm-and-price, detailed trace/rollups, customer name/mobile, save quote, repaint preview/refine and session-grounded assistant. Components `PaintTakeoffEditor`, `PaintPricedSummary`, `PaintPreviewPanel`, shared `PlanOverlay`, `EstimatorChatbot` are part of this workflow.

Native `CommercialPaintingScreen.tsx:90` implements multi-file signed upload, classification/removal, run extraction/polling, history/resume, price and save, with read-only takeoff rows and a browser handoff for editing. `api.ts:394` exports `usePreview` but no native preview control calls it; unused hooks are not parity.

**Exact correction controls:** group by room; surface text; system spray_matt/flat/low_sheen/semi_gloss; quantity; m²/item unit; coats; height; separate price; exclusion; add a surface to an existing room; bulk coats; reset to extracted rows; reconciliation-source/quantity-delta/confidence notices. Labour override is optional positive dollars/hour ≤1,000. Existing web editor does not make all raw room/substrate/provenance fields editable; preserve unknown fields when writing corrected items. Evidence: `PaintTakeoffEditor.tsx:75`, `:109`, `:122`, `:140`, `:273`, `:305`, `:413`.

**Contracts:**

- `GET /api/tenant/commercial-painting/runs`; `GET/PATCH /run/{id}`. PATCH metadata and `{extractionId,corrected_items}`; correcting clears `priced_bom`/`priced_at` and returns the run to ready (`W/app/api/tenant/commercial-painting/run/[id]/route.ts:93`, `:142`). Never continue to show the old price as current.
- Upload sequence `POST /upload/sign {files,paintRunId?,jobName?,siteAddress?}` → PUT each signed target → `POST /upload/complete`; PDF/JPEG/PNG/WebP, 32 MB per file, doc kinds plan_set/measurement_takeoff/services_layout/site_photo/other. Exactly one plan_set is required for extraction; preserve documented server file-count/storage limits and failed-file outcomes. Native has this sequence at `CommercialPaintingScreen.tsx:179`.
- `PATCH /upload/{id} {doc_type}`; `DELETE /upload/{id}` with already-extracted conflict; `GET /upload/{id}/file` supplies an expiring owned document URL. Native is missing the document viewer although the server can reopen stored files.
- `POST /extract {paintRunId}`; `POST /price {paintRunId,extractionId,labourRatePerHr?}`; `POST /save-quote {paintRunId,extractionId,customerName?,customerPhone?}`. Save is human review into a draft, not send. Customer fields exist on web at `CommercialPaintingTab.tsx:847` but not native.
- `POST /preview {paintRunId,colour?}` or `{paintRunId,refine:{image,instruction}}`; uses owned site_photo and returns before/after data URLs. 422 no_site_photo, 503 preview_unavailable, 502 preview_failed are nonblocking. Native needs explicit AI-concept copy and before/after/refine controls; no fake saved preview state.
- `POST /api/filestore/chat {estimator:'paint',sessionId:paintRunId,query}` supports the estimate assistant; complete contract in TRADE-011.

**Acceptance:** upload/reopen actual stored files; edit every listed correction, save and reload server values, then price those exact corrected items. Preserve excluded/separate items and reconciliation provenance. Add/remove/classify documents before extraction with conflict-aware errors. Keep job metadata changes on reopening the same run without leaking them to a new run. Show all main/separate/unmatched/excluded lines, labour/material/equipment/GST totals, material purchases, crew/time and per-line audit formulas matching web `PaintPricedSummary`. Add customer fields, direct saved-quote review, preview and session assistant. Pricing controls depend on TRADE-008/010; a green saved toast is insufficient.

### TRADE-010 — Commercial-paint fresh pricing and reload-safe Save

**Status: backend-shared + native safety blocker.**

Current positive protections: `W/app/api/tenant/commercial-painting/price/route.ts:64` loads current rate rows/book; authority failure clears persisted BOM and reads it back before returning 422 (`:81`). Save re-loads corrected items/rates, checks tenant ownership, authority, recomputes BOM and compares it to stored BOM before creating a quote (`save-quote/route.ts:69`, `:100`, `:127`, `:133`). It deduplicates saved quotes for the same priced_at at `:151`. GST is explicitly passed from the resolved book. Preserve these protections.

**Still-open defects, verified in current source:**

- **Stored labour masks changed tenant labour.** Save reads `storedBom.labour.ratePerHr` and applies it over the freshly loaded book (`save-quote/route.ts:113`–`:121`). There is no provenance distinguishing a deliberate per-quote override from the previous tenant-default rate. If the tenant labour rate changed, comparison can still pass using the old rate. Record explicit override intent and origin; otherwise reprice from the new tenant rate and reject stale Save.
- **Native proof is not durable.** `N/src/features/trades/commercial-painting/CommercialPaintingScreen.tsx:102` initialises `pricingVerified` true; `openRun` at `:310` resets true. A failed price/refetch can be bypassed by leaving/reopening/remounting while an old BOM remains. `pricing-freshness.ts:14` only requires matching extraction ID plus some nonnull BOM after refetch; it does not prove a new pricing revision, request epoch or current run identity.
- **Invalid override silently ignored.** `W/app/api/tenant/commercial-painting/price/route.ts:38` ignores a present invalid/out-of-bound override and falls back to default. Future native editing must not send invalid input; shared endpoint should return validation failure for an explicitly supplied invalid value rather than pricing a different request.

**Acceptance:** introduce server-returned pricing revision/hash carrying tenant/rate origin/current input revision, and compare it when saving. Client starts unverified until the current record's verified revision is loaded; correction, price failure, failed refetch, stale/foreign extraction response, run switch, tenant switch or app restart cannot enable Save on unproven data. A retry must await both pricing and validated readback of that revision. Test tenant labour 75→90 between price/save; explicit override 85 versus inherited 75; GST change; invalid-zero/negative/NaN rates; unmatched/excluded surfaces; failed clear/readback; slow old response arriving after switching runs; failed-price→unmount→reopen→Save. Verify the server rejects stale requests even if UI controls are bypassed. Never modify an already issued historical quote in place.

### TRADE-011 — Electrical plan-estimator workspace, visual review and assistant

**Status: partial; native PDF extraction/history/count correction/pricing exist; complete review tools missing.**

Website entry `W/app/dashboard/_components/EstimatorBetaTab.tsx:21` offers PDF drag/pick, sheet hint, extract, history and exact `/dashboard/estimator/{runId}` navigation. Workspace (`_components/estimator/RunWorkspace.tsx:40`) has stored extraction loading, takeoff review, editable item name/symbol/count, add/remove row, plan pin selection, source/page/confidence metadata, document reattachment for visual/refinement work, manual save of corrections, targeted refine, price, unmatched service adoption and detailed deterministic traces. Supporting components: TakeoffTable, PricedSummary, Methodology, StatStrip, badges, types and in-memory plan-file-store; shared PlanOverlay and EstimatorChatbot.

Native `N/src/features/trades/estimator/EstimatorScreen.tsx` offers PDF/sheet hint, extraction/history/reopen, count-only corrections, save and server price summary. It omits item renaming/symbol editing/add/remove, pin/PDF review, targeted refinement, methodology/details, inline unmatched-service adoption and assistant. Its browser exit at `:421` targets generic `/dashboard?tab=estimator`, losing the active run rather than opening `/dashboard/estimator/{runId}`. Native's exported `src/lib/ai.ts:34 useQuoteAssistant` is unreferenced and points to a nonexistent website `/ai/quote-assistant`; it is **not** this assistant.

**Contracts:**

- `POST /api/tenant/estimator/extract` multipart `pdf` ≤32 MB plus `sheet_hint` (server truncates to 200 characters); `GET /history`; `GET/PATCH /extract/{id}` scoped to current tenant and electrical trade. Corrections write corrected_items and clear old pricing. History/reopen is current server state, not just a local cache. Exact multipart keys: `W/app/api/tenant/estimator/extract/route.ts:34`, `:52`.
- `POST /api/tenant/estimator/refine` multipart PDF ≤32 MB, one-based positive page, JSON targets with type/symbol/hint; current endpoint returns refinement rather than itself committing a correction. Native must review/merge, then save corrected_items and reprice. No automatic visual inference becomes an accepted count.
- `POST /api/tenant/estimator/price {items:[{type,count,confidence?,note?}],extractionId?}` returns `{ok,bom,catalogueSize,pricingBookSource,persisted}`. Persisted=false is not equivalent to a saved result; readback must confirm success. This endpoint does not create or send a customer quote.
- Unmatched inline adoption is `POST /api/tenant/services` with tenant custom service fields, then reprice. Require user-supplied prices/labour and valid category; no guessed price. Web `RunWorkspace.tsx:159` / `PricedSummary.tsx` defines controls.
- `POST /api/filestore/chat {estimator:'electrical'|'paint',sessionId,query}`: session ID 1–200, question 1–2,000. Tenant owns the session row; absent session 404. Returns answer/citations and graceful unavailable/storeFound=false/degraded states. `W/lib/filestore/chat-request.ts:9`; `W/app/api/filestore/chat/route.ts:38`, `:57`, `:68`. UI open/close, suggested questions, compose/send, pending/retry and title/page/snippet citations must use exact current run context, resetting conversation on run switch. The assistant is explanatory, not a pricing or send authority.

**Acceptance:** provide native PDF page choice and selected pin↔row correspondence matching existing PlanOverlay; add native pan/zoom appropriate to the small screen (a native design requirement, not a claim that the website currently implements pinch zoom). Distinguish pinless document browsing from extraction pins. Test multi-page/zero-pin, file unavailable after restart, reattach mismatch, failed save, late refine, extraction/price service errors and app backgrounding. Add all listed editor operations and preserve provenance/unknown fields. Do not invent a dashboard estimator “Save as quote” or PDF-export API: inspected electrical workspace exposes saved takeoff/priced result, and the price route comment explicitly says this dashboard flow renders no result PDF (`price/route.ts:75`). Public `/q/plan` is a separate flow. Full monetary use depends on TRADE-012.

### TRADE-012 — Estimator pricing authority and invalid-rate handling

**Status: backend-shared blocker; current indicative price output is not tenant-only price authority.**

`W/lib/estimation/pricing-context.ts:14` defines a hardcoded fallback book (hourly 110, markup 28%, minimum two hours, GST true). It loads tenant custom assemblies plus shared assemblies, then selects tenant book→global trade book→hardcoded fallback (`:23`). `/api/tenant/estimator/price:51` prices and persists regardless of bookSource. `W/lib/estimation/price.ts:162` coerces rates with `Number(...) || 0` and treats any GST value except false as registered. Invalid/missing numbers can become zero rather than a blocking condition. Native shows server summaries/source metadata; that alone does not establish authorisation to quote.

**Required acceptance:** separate indicative setup/example data from tenant-authorised customer prices. Return explicit missing/adoption-required/invalid pricing states; require current tenant-approved assemblies/card and explicit GST before customer-price save/export/promotion. Validate every consumed rate, quantity, minimum/markup and material unit price with allowed-zero rules rather than blanket truthiness. No cross-tenant/global/hardcoded fallback may silently author a customer quote. Preserve historical version IDs and display the exact source and freshness. Test missing tenant book, malformed numeric strings/null/negative/nonfinite values, shared-only assembly, no matching assembly, zero count, changed pricing between correction and price, and failed persistence. This is a shared server repair; do not copy the estimator's fallback implementation into native.

### TRADE-013 — Full hourly pricing books, tier choice and honest save state

**Status: partial; native save-baseline defect.**

Website `PricingBookCard` (`W/app/dashboard/page.tsx:6878`) edits the following book fields. Native `N/src/features/menu/LabourRatesCard.tsx:65` edits only hourly, call-out and markup. Native `PricingSection.tsx:37` correctly hides inert hourly books for roofing/painting/signage/aircon; keep that distinction.

| Field/control | Wire bounds/meaning | Native source status |
|---|---|---|
| `hourly_rate` | Positive ex-GST dollars/hour | Present |
| `min_labour_hours` | 0–8 hours/job; display derived minimum as an explanation, not stored price | Missing |
| `default_markup_pct` | 0–100; materials markup | Present |
| Advanced: `apprentice_rate`, `senior_rate` | Nonnegative ex-GST dollars/hour | Missing |
| Advanced: `after_hours_multiplier` | 1–3 | Missing |
| Advanced: `call_out_minimum` | Nonnegative ex-GST dollars; electrical fault-finding use versus plumbing call-out rule is explained on web | Present value, missing the exact trade-specific explanation |
| Advanced: `risk_buffer_pct` | 0–100 | Missing |
| Advanced: `gst_registered` | Explicit boolean | Missing in this native hourly editor |
| Show/hide advanced, pending/save/error/saved indication | Preserve all values when collapsed; field validation is server-authoritative | Partial |
| Per-trade quote-tier mode | `good_better_best`, `single`, `good`, `better`, `best` | Present but local state not reset on trade switch |

**Contract:** `PATCH /api/tenant/me {pricing_by_trade:{[trade]:PricingFields}}`; legacy `{pricing:...}` fans the same fields to every tenant book and should not be used by a trade-scoped native editor. The schema is `W/lib/tenant/update-schema.ts:41`, `:104`. Per-trade mode uses `{quote_tier_mode_by_trade:{[trade]:mode}}`; modes apply to the tier-capable trades, not aircon/signage. The five-mode native selector already saves on tap: this is present (source-only), with state/freshness follow-up, also recorded in CORE-127. General quote policy/display controls are covered by the CORE requirements.

**Current defect:** native immutable `seed` at `LabourRatesCard.tsx:70` is never updated after successful save; dirty comparison at `:109` is against that original seed. Example: load 100 → save 110 → edit back to 100 → “Save” reports a no-op success while server remains 110. This is a concrete data-saving bug, not a cosmetic issue. Tier mode similarly initialises `useState(initialMode)` at `PricingSection.tsx:76` without keying the card by trade (`:151`).

**Acceptance:** add missing fields/bounds; save a changed value, read it back, change it back, save and prove the server received the reversal. A toast cannot claim saved when nothing changed from a stale baseline. New server versions update clean forms; dirty forms require conflict-aware merge/review. Switching between trades must display each trade's server mode/rates without carrying state. Test no book/legacy response, 401/400/partial backend errors, zero allowed versus forbidden values, failed write/refetch, concurrent website changes and app restart. Preserve authoritative historical quote prices and GST basis.

### TRADE-014 — Complete roofing rate-card editor

**Status: partial; native only seven material rates.**

Website `W/app/dashboard/_components/RoofRatesEditor.tsx:111`; native `N/src/features/menu/RoofRatesCard.tsx:14` wraps OverlayRatesCard for only `reroof_rate_per_m2`. Native already merges its known edits into the fetched overlay, preserving unexposed fields in the ordinary single-writer case; do not replace the whole card with seven fields.

| Website field | Allowed value / unit | Native gap |
|---|---|---|
| `reroof_rate_per_m2.{colorbond_corrugated,colorbond_trimdek,colorbond_spandek,colorbond_kliplok,concrete_tile,terracotta_tile,cement_sheet}` | Positive ≤500 ex-GST $/m² or clear override | Present |
| `multi_storey_loading_pct`, `asbestos_loading_pct`, `complexity_loading_pct` | Fractions 0–1 on wire, 0–100% in UI | Missing |
| `gutter_rate_per_lm`, `fascia_rate_per_lm`, `soffit_rate_per_lm` | Positive ≤500 ex-GST $/lm | Missing |
| `downpipe_rate_per_each` | Positive ≤2,000 ex-GST $/each | Missing |
| `ridge_hip_repoint_rate_per_lm`, `valley_flashing_rate_per_lm`, `box_gutter_rate_per_lm` | Positive ≤500 ex-GST $/lm | Missing |
| `price_edge_works` | Default/true/false; pricing controlled by approved edge quantities | Missing |
| `call_out_minimum_ex_gst` | 0–10,000, per-structure floor | Missing |
| `solar_detach_reinstate_base_ex_gst`, `solar_detach_reinstate_per_array_ex_gst` | 0–20,000 dollars each | Missing |
| `upgrade_material` | Default or one of the seven named material enum values | Missing |
| `gst_registered` | Default/true/false, not a mutable statutory GST percentage | Missing |
| Effective default hints; clear individual override; reset all; save/field errors | Blank/null means use effective default, not zero; unknown/cement-sheet default can remain non-quotable | Default hints/reset missing |

**Contract:** `GET/PATCH /api/tenant/roofing-rates`; GET `{ok,materials,defaults,overrides,has_pricing_book}`; PATCH overlay object. Bounds and null semantics are `W/lib/roofing/rate-card-overlay.ts:36`, `:89`. Current storage is `pricing_book.overlays.roofing_rate_card` on the primary/any owned book, not necessarily the roofing book (`W/app/api/tenant/roofing-rates/route.ts:43`). PATCH errors: 401, 400 invalid_request/validation_failed with `{field,message}` issues, 404 no_pricing_book, 500 update_failed. GET currently turns an invalid stored overlay into empty overrides (`:84`); that must not silently license default pricing for bad stored data.

**Acceptance:** expose every row above; show inherited versus overridden value and exact unit; percent↔fraction conversion round-trips; clear/reset intentionally restores defaults; 0 allowed only on floors/allowances/loadings. Save/read/reopen must preserve every other overlay sibling and unknown supported field, including web changes made while native is open. Add revision/CAS or a shared field-merge API for multi-client updates: current full-overlay replacement can overwrite concurrent edits. Reprice/new quote reads must use the same book-selection and validation logic as the editor. Bad stored values must produce a repair state rather than silently presenting a clean default book. Coordinate edge approval with TRADE-030.

### TRADE-015 — Complete residential painting rate-card editor

**Status: partial; native four rates and call-out only.**

Website `W/app/dashboard/_components/PaintRatesEditor.tsx`; exact schema `W/lib/painting/rate-card-overlay.ts:102`. Native `N/src/features/menu/PaintRatesCard.tsx:14` exposes rate_per_unit for four scopes and call-out minimum. The schema header saying coats/condition remain read-only is stale: the current schema and web controls make them editable.

| Field group | Exact keys/modes and bounds | Native |
|---|---|---|
| Base rates | `rate_per_unit.{walls,ceilings,trim,exterior}`, positive ≤200 ex-GST $/unit; trim uses lm, other scopes m² | Present |
| Price model | `pricing_model` default/sqm/hourly; `hourly_rate` positive ≤2,000 | Missing |
| Throughput | `production_rate_per_unit.{walls,ceilings,trim,exterior}` positive ≤200 units/hour | Missing |
| Loadings/tiers | `double_storey_loading_pct`, `premium_uplift_pct`, `colour_change_extra`: 0–2 fractions; `good_refresh_fraction`: >0 to1 | Missing |
| Coats | `coats_multiplier.{1,2,3}`, each 0.1–3 | Missing |
| Surface condition | `condition_multiplier.{sound,minor,bare}`, 0.1–3; poor condition is not a quotable multiplier | Missing |
| Floor | `call_out_minimum_ex_gst`, 0–5,000 | Present |
| Tax/deposit | `gst_registered` default/true/false; `deposit_pct` 1–50% of inc-GST tier | Missing |
| Takeoff products | `takeoff.coverage_per_litre` and `takeoff.price_per_litre` each keyed by wall_paint, ceiling_paint, trim_enamel, exterior_paint, primer_sealer; positive coverage ≤200, price/L ≤500 | Missing |
| Takeoff extras | `takeoff.premium_price_uplift_pct` 0–2; `takeoff.sundries_pct` 0–0.5; crew_size integer1–10; hours_per_day positive≤12 | Missing |
| Default hints, clear/reset, save/error/confirmation | Null/blank inherits, field issues remain attached to the correct control | Partial |

**Contract:** `GET/PATCH /api/tenant/painting-rates`, overlay payload, current primary/any tenant-book storage. Takeoff knobs are **display levers**, explicitly not read by `calculatePaintingPrice`; changing paint litres/crew hints must not silently change tier pricing. Expose that distinction in UI. GST/deposit are money-touching. Same 401/400 issue list/404 no book/500 update errors and versioned-save requirements as TRADE-014.

**Acceptance:** implement all fields with conditional model sections that retain inactive values; verify sqm→hourly→sqm and readback; percent/fraction and money units round-trip; reset supports each nested map without deleting unrelated overlays. Changed coats/condition affects the server's next estimate as intended; changed takeoff-only fields affects takeoff display without altering quote tier totals. Test null/default, forbidden zero/negative/nonfinite/out-of-range rates, poor-condition routing, missing book, stale update and both GST states. No arbitrary price calculation moves to the client.

### TRADE-016 — Solar rate-card completeness and defaults

**Status: substantially present (source-only), with default/reset/freshness gaps.**

Native `N/src/features/menu/SolarRatesCard.tsx:79` implements all main scalar fields that website `W/app/dashboard/_components/SolarRatesEditor.tsx:71` edits: `install_rate_per_kw.standard_panels` and `.premium_panels` (positive≤5,000 ex-GST $/kW), `multi_storey_loading_pct` and `complex_roof_loading_pct` (0–1 fractions), `call_out_minimum_ex_gst` (0–20,000), `stc_price_aud` (1–60), `deposit_pct` (1–50), `gst_registered` (default/true/false). Current native UI correctly uses percent display and null to clear. Do not report those fields as missing.

**Contract:** `GET/PATCH /api/tenant/solar-rates` returns defaults/overrides/has_pricing_book; stores solar_rate_card on the solar book, else first owned book. Evidence `W/app/api/tenant/solar-rates/route.ts:37`, `:57`, `:93`; `W/lib/solar/rate-card-overlay.ts:69`. Statutory GST rate, deeming schedule, STC zone tables, export limits, derate/guardrails and tier sizing fractions are not tenant editor knobs; do not add them as a parity requirement.

**Acceptance:** add effective-default hints and reset-all equivalent to web `SolarRatesEditor.tsx:351`; refresh the editor's acknowledged baseline after save/return; current seed-once effect (`SolarRatesCard.tsx:92`) must not retain stale values after a remote edit or tenant switch. Verify every field save/clear/reopen and round-trip fractions; both registered/unregistered GST; wrong trade book absent versus fallback chosen; invalid stored overlay; partial/failed save; concurrent web changes. Invalidate dependent solar lists/calculation state or explicitly mark an existing quote historical; do not silently overwrite historical prices.

### TRADE-017 — Services, custom assemblies and preferred brands

**Status: partial; native create/edit/delete/toggle and brand preference exist.**

Website `ServicesTab` (`W/app/dashboard/page.tsx:7093`) provides trade-scoped search/pagination, shared/custom service toggles, expandable quote calculation/provenance, inspection warnings and custom create/edit/delete; `PreferredBrandsCard:7859` provides category brand choice, SKU/count context and save. Native `ServicesSection.tsx:39` includes toggles, custom forms/delete confirmation and per-category brand preference, but omits search/pagination, expanded pricing breakdown and custom grounding-category selection.

**Field/action contract:**

- Shared service toggle: `PATCH /api/tenant/me {services:{[assembly_id]:boolean}}`; custom toggle uses `custom_services` (never shared FK IDs). Preferred brand uses `material_preferences:{[category]:brand|null}`; null/blank clears. Preserve trade/category scoping and soft preference semantics; a brand preference is not a locked SKU.
- Custom create `POST /api/tenant/services`; update/delete `/api/tenant/services/{id}`. Create requires supported trade electrical/plumbing. Fields: name2–120, description≤500, unit1–30, unit_price_ex_gst0–100,000, labour_hours0–80, exclusions≤500, always_inspection boolean, optional grounding `category` from `W/lib/estimate/categories.ts`. Website `CustomServiceForm:8064` exposes category; native form `ServicesSection.tsx:271`/services-api deliberately omits it. Add the selector so service classification/inspection routing is not guessed from a label.
- API also accepts inspection_triggers (up to10 strings1–80) and enabled; they are API-supported metadata, not inspected web form controls. Preserve them on update; do not claim a web trigger-rule editor exists.
- 409 duplicate, 404 not owned, 400 invalid bounds, 401/no tenant, plus mutation/refetch errors must be row-specific. Native currently invalidates tenant/me for success and failure, which should be retained.

**Acceptance:** add grounded category and exact explanatory breakdown (material sell price, unit labour hours/current hourly rate, minimum/callout context, exclusions, inspection triggers/provenance where the website displays them); enable search/scalable list rendering. Create service with category, toggle, edit, delete and re-open on web/native; changes must affect subsequent drafting, never historical quotes. When a service is inspection-only, label it consistently and do not offer a priced workflow just because it has an amount. Verify successful reversible edits are based on readback, not stale local row state. Keep unsupported trade writers gated at both layers.

### TRADE-018 — Catalogue, stock selection, coverage and G/B/B ladder

**Status: largely present (source-only), with image-preview/CSV and linked-readiness gaps.**

Native `N/src/features/trades/hub/sections/CatalogueSection.tsx:79` has **My catalogue, Browse supplier catalogue and G/B/B ladder**. It already implements search/category filters, more rows, create/edit/delete/active, stock essentials, coverage gaps, supplier selection/bulk add, ladder pick/clear and camera/library image upload. The old comment suggesting URL-only photos is stale. Web equivalents: `CatalogueTab:11314`, `CoveragePanel:10352`, `BrowseSupplierPanel:10558`, `TierLadderPanel:11117` in `W/app/dashboard/page.tsx`.

**Exact product editor fields:** trade (locked to current hub on create); category from real material vocabulary, not coarse service grounding category; name; brand; range_series; supplier; unit each/m/pack/set/pair/hr; unit_price_ex_gst; optional customer_supply_price_ex_gst and cost_price_ex_gst; description; image_path; preferred; smart/dimmable/integrated_driver booleans; tier hint auto/good/better/best; active control. Native form is at `CatalogueSection.tsx:484`. Prices are ex-GST; cost is margin-only and must never become a sell price. Client must not turn blank optional money into zero. Property updates merge known booleans into existing stored properties (`W/app/api/tenant/catalogue/[id]/route.ts:111`), preserving provider metadata.

**Contracts and limits:**

| Capability | Existing contract |
|---|---|
| Mine | `GET/POST /api/tenant/catalogue`; `PATCH/DELETE /api/tenant/catalogue/{id}`. `MaterialCatalogueSchema` at `W/lib/tenant/update-schema.ts:234`: trade electrical/plumbing, category1–40, name2–120, brand/range/supplier≤60, unit≤30, money0–100,000, description≤500, image_path≤300; typed boolean properties only. |
| Photo | `POST /api/tenant/catalogue/upload` multipart `file`, JPEG/PNG/WebP≤8 MB → `{ok,url,path}`. Not CSV. Native current camera/library upload is `CatalogueSection.tsx:538`; website preview/clear controls `page.tsx:12099`. |
| Supplier library | `GET /api/supplier-catalogue`; scoped trade/category/brand/search and already-stocked markers. Native consumer `catalogue-api.ts:243`. |
| Adopt selected | `POST /api/tenant/catalogue/bulk-add {supplier_catalogue_ids:[...]}` up to100 IDs, returning per-ID added/already_stocked/failure. Idempotent for already-linked stock; price is a supplier default to be explicitly adopted, not copied over an existing custom price. Native `catalogue-api.ts:398`. |
| Stock essentials | `POST /api/tenant/catalogue/stock-essentials`, server-curated good-tier SKU/category, idempotent skipped results. No client-generated SKU/price. |
| Coverage | `GET /api/tenant/catalogue/gaps`; totals, missing categories, browse jump, detected read failure state. |
| Tier ladder | `GET /api/tenant/tier-ladder`; `POST {category,tier,catalogue_id}`; `DELETE ?category=&tier=` restores inference fallback. Selected product must belong to tenant and intended category; preserve server validation, no arbitrary cross-trade assignment. |

**Required acceptance:** preserve all existing controls while completing native photo preview and explicit clear/replacement feedback; website previews the selected image, native currently only shows image URL/upload actions. Cover revoked camera/library permission, cancel, unsupported MIME, oversized upload, invalid URL, upload success but product-save failure and retry. Include full selected-product name/brand/range/tier and price basis without hiding long content. Show partial bulk results per failure rather than a misleading all-success toast. On product price/active/category change, refresh catalogue, gaps, recipe readiness, estimating and ladder consumers; current ROW_CHANGE_KEYS only catalogue/ladder is not itself proof that all linked caches refresh. Test disable→required recipe unpriced, re-enable/reprice, unknown properties retained, optional price cleared, zero sell-price policy consistently applied, duplicate adoption and another client's update. Full CSV parity is TRADE-019; unsupported trade catalogues remain explicit placeholders rather than silently writing into another trade.

### TRADE-019 — Supplier CSV dry-run, review and commit

**Status: missing natively; existing authenticated website/API.**

Website `SupplierCsvUpload` (`W/app/dashboard/page.tsx:10093`) expands/collapses, downloads the CSV template, picks/replaces a CSV, runs a preview, displays valid/new/existing/invalid counts and row errors, toggles “also stock my catalogue”, then explicitly commits. Native's photo-upload route is not this import capability.

**Contract:** `POST /api/supplier-catalogue/import {csvText,dryRun,alsoStockMine}`; csvText1–2,000,000 chars; default dryRun=true, alsoStockMine=false. Parser `W/lib/catalogue/csv-import.ts:22` accepts columns `trade,category,brand,name,default_unit_price_ex_gst,range_series,supplier_label,default_unit,tier_hint,image_url,description`; first five required; ≤2,000 rows; supported/owned trade electrical/plumbing; known granular category; brand≤120/name≤200; positive price≤1,000,000; default unit each≤40; tier blank/good/better/best. It understands quoted CSV and normalised numbers. Endpoint deduplicates trade+brand+name, inserts shared supplier rows only, **never updates someone else's existing supplier price**; optionally stocks both newly added and existing selected supplier rows into this tenant's catalogue. Evidence `W/app/api/supplier-catalogue/import/route.ts:42`, `:133`, `:190`, `:254`.

**Acceptance:** native file picker/text read with bounded memory and filename/size; show template and exact required columns; validate at preview without side effects; report row/column/reason and skipped duplicates; enable commit only for reviewable valid rows or requested stock of existing ones; require a distinct explicit commit action. Keep preview tied to exact file/text and tenant, revalidate at commit, handle newly colliding concurrent inserts and partial stock results, preserve retry safety and refresh both supplier/mine/coverage views. No “import succeeded” until server acknowledges/readback agrees. If malformed/empty/foreign-trade CSV or platform request limit intervenes, retain the file/report with actionable errors. Never treat an import preview as authorisation to replace prices or send quotes.

### TRADE-020 — Recipe steps and parts editor

**Status: present core CRUD (source-only), partial discovery/provenance; semantic blocker in TRADE-021.**

Website `RecipesTab` (`W/app/dashboard/page.tsx:12470`) has job search/selection, independent Tasks/Parts loading/errors, current custom versus standard baseline, “Use standard” fork, step title/notes/required/sort, part category/description/quantity/required/sort, add/delete/reorder, catalogue gap explanation and direct catalogue jump. Native `RecipesSection.tsx:79` has job selection without the website search, baseline forks and separate StepsPanel (`:255`) / PartsPanel (`:552`); tasks save title/note on blur, optionality and order; parts save quantity/required/add/delete. Preserve all controls and errors rather than replacing them with a read-only summary.

**Contracts:** `GET/POST /api/tenant/bom`; `PATCH/DELETE /api/tenant/bom/{id}`; `POST /api/tenant/bom/fork {assembly_id}`. The equivalent `/api/tenant/tasks` and `/tasks/fork` family manages checklist rows. BOM row create fields: assembly UUID, trade electrical/plumbing, material_category normalised to real trade material vocabulary1–40, quantity positive≤10,000, description≤200, required boolean, sort integer0–999. Task row fields: assembly UUID, trade, title1–120, notes≤500, required, sort0–999. Create/fork respects owned trade; 409 already_customised must never overwrite custom rows; 404 no_baseline should offer manual creation; invalid category/mismatched trade errors remain visible. Evidence `W/lib/tenant/update-schema.ts:299`, `:349`; `N/src/features/trades/hub/sections/recipes-api.ts:111`, `:125`.

**Acceptance:** add search/scalable selection and visible recipe provenance; confirm deletion; preserve text on failed blur-save; ensure reorder and rapid field edits cannot lose a previous update; no unacknowledged “saved” state. Fork/modify/delete/reopen across clients must reproduce exact checklist and parts. Unknown/conditional metadata must survive editing. Non-supported trade sections must accurately distinguish read-only/API absent; hiding create controls is not an excuse to claim recipes are implemented for all eight trades. Any source comment saying estimator does not read tasks is stale: current `W/lib/estimate/assembly-tasks.ts:65` evaluates conditions.

### TRADE-021 — Conditional BOM/task semantics and price-readiness truth

**Status: native correctness defect and backend-shared fork defect. Highest priority before recipe parity is accepted.**

Current native readiness helper `N/src/features/trades/hub/sections/bom-readiness.ts:29` skips every line with any nonempty include_when (`:39`), even required lines whose condition cannot be evaluated. The warning UI `RecipePricingAuthority.tsx:7` then asserts whether a recipe can become quote-ready. That is not equivalent to the estimator.

The actual estimator predicate `W/lib/estimate/catalogue.ts:110` includes unconditional/empty conditions; requires all known property comparisons to match; **retains required lines on unknown/missing properties** and excludes optional unknown lines; known mismatches are excluded. Equality at `:135` normalises boolean/numeric/yes-no strings and case. Conditions evaluate against the resolved headline product's properties (`:631`), not the conditional accessory's own properties. Unconditional optional lines require includeOptional; conditional lines and ratio/sundry logic are separate. Required lines without resolvable valid quantity/price remain missing/unpriced, not quietly skipped. `quantity_per` ratio semantics exist at `:75`, `:591`, `:871`; tasks use the same condition predicate.

**Shared fork defect:** `W/app/api/tenant/bom/fork/route.ts:99` reads only material_category, description, quantity, required, sort and copies those fields at `:117`; it omits `include_when` and any baseline quantity_per metadata. `tasks/fork/route.ts:104` similarly selects only title/notes/required/sort and copies at `:123`, omitting conditions. Thus “Use standard” can turn conditional baseline content into unconditional custom content. Normal BOM/task create/PATCH schemas also do not expose condition editing; adding include_when to a native body today does not implement a supported condition editor because unknown fields are stripped.

**Required acceptance:**

- Prefer a server-resolved readiness/provenance contract using the same resolver as quoting. A native no-context preview must say “conditional / needs product context” conservatively, not assert readiness by skipping the line.
- Preserve all semantically consumed BOM/task fields when forking and updating, including include_when and quantity_per where stored. Review migrations/storage contract before adding a field; do not fabricate support. If authoring conditions is desired, design and validate the actual API/schema extension in both clients; website UI currently does not offer a general condition-authoring panel.
- Test null/empty condition, known match, known mismatch, required unknown, optional unknown, numeric/string boolean variants, multiple keys, resolved headline versus accessory properties, optional inclusion, ratio quantities and invalid required price. Readiness, priced line set, checklist and inspection outcome must agree across native preview, fork, saved recipe, job-quote estimator and website.
- Fork the same conditional standard recipe; compare resolved before/after line sets under every test context; they must be identical before deliberate user edits. Verify quantity_per ratios retain rounding semantics, no parts disappear or multiply after fork.
- Price coverage must be based on valid active tenant catalogue prices and correct trade/category, not just an active category row. The fork gap query at `bom/fork/route.ts:143` currently selects active category only; the GET readiness query has different price checks. Unify authority/error semantics; if coverage lookup fails, show unknown rather than zero missing.
- Refresh readiness after catalogue edits and remote rate changes. Any failure must fail closed for customer quoting while leaving read-only recipe editing available. Preserve no-guessed-price and human approval requirements.

### TRADE-022 — Estimating explanation, overrides and reset

**Status: partial; native override edit/reset present, full BOM explanation absent.**

Website `EstimatingTab` (`W/app/dashboard/page.tsx:13491`) displays every job's parts, quantities/descriptions/optional markers, tenant versus standard recipe badge, catalogue-versus-generic badges, effective labour/markup, local/global source and hourly rate. It offers inline labour/markup edits, warning for ≥2× or ≤0.5× the global value, cancel/save/reset and pagination. Native `N/src/features/trades/hub/sections/EstimatingSection.tsx:114` displays job name and part **count**, labour/markup/source/hourly rate, edit/reset and extreme-change warning. It omits the actual BOM lines, recipe-source badge and per-part price-source explanation despite receiving the data.

**Contract:** `GET /api/tenant/estimation` returns `{ok,jobs,catalogue_categories}`, each job's BOM/effective values/provenance; client scopes by trade. `PATCH /api/tenant/estimation/{assemblyId} {labour_hours_override?,markup_pct_override?}` requires at least one value; nullable clears individual field; labour positive≤40; markup0–200. `DELETE` removes override row. Server validates assembly belongs to a tenant-owned trade for PATCH, not merely the two-trade writer enum. `W/app/api/tenant/estimation/[assemblyId]/route.ts:46`, `:90`; native `estimating-api.ts` implements those operations and invalidates ESTIMATION_KEY.

**Acceptance:** render full parts/provenance/readiness explanation and scalable list, without claiming a generic fallback is a tenant-authorised price. Reuse TRADE-021 semantics for badges. Save both current edited fields, show errors on that row, preserve inputs on failure, cancel without mutation, confirm reset, read back effective global values after reset and handle disappearing/disabled jobs. Test local override→reset→reopen, trade switch during mutation, server returning null/invalid rate and simultaneous edits. Do not turn a nonblocking extreme-change warning into an undocumented hard rule.

### TRADE-023 — Guided pricing wizard

**Status: browser-only; underlying individual native editors do not equal the guided workflow.**

Website `/dashboard/pricing-wizard` (`W/app/dashboard/pricing-wizard/page.tsx:77`) is a three-step sequence: rate card (hourly, call-out, markup%, after-hours multiplier), services (shared/custom toggles), brands (one category preference, common-brand fill-all and clear-all), with back/continue/cancel, progress rail and final save. Optional `?trade=` scopes the book, services and material categories and returns to that trade hub. Native `PricingBookScreen.tsx:47` and `PricingSection.tsx:166` only open the browser.

**Contract:** load `/api/tenant/me`, prefill only matching trade's pricing row; never substitute another trade's book when scope has none (`PricingWizardPage:151`). Finish PATCH uses pricing_by_trade for a scoped wizard, separates custom_services from shared services, filters categories/IDs to scope, preserves unrelated trades and surfaces partial-save errors (`:338`, `:355`, `:380`, `:415`). Fields: hourly>0, callout≥0, markup0–100, afterhours1–3. Brand quick fill is a soft preference for visible categories, not catalogue adoption or exact SKU allocation.

**Acceptance:** implement an in-app guided route sharing contracts with the standalone editors, retain unsaved steps/back navigation, explicitly review scope before final save, preserve selected custom IDs/category mapping, prevent double completion and only leave after successful readback. If the backend permits partial updates, display each failed group and retry safely rather than report atomic success. Test no matching book, one/two trades, custom+shared services, null brand clear, unknown brand input, auth expiry midway, network failure and app restart. Keep the browser link labelled as such until native flow is implemented.

### TRADE-024 — Brand Studio carousel editor and export

**Status: missing native; website exists; backend hardening dependency.**

Website `/dashboard/studio` is distinct from the core Flyer Designer and signage studio management. `W/app/dashboard/studio/page.tsx:43` opens a five-slide preset carousel and selects slides by numbered rail. The current UI fixes format to `li-carousel` (1080×1350); it does **not** expose the full format enum as a selector, nor slide add/delete/reorder. Renderer types support additional LinkedIn single, Instagram square/story, A4 flyer and 16:9 deck formats (`W/lib/studio/types.ts:6`); classify those as backend-supported latent formats, not current visible editor controls.

**Exact visible controls:**

- All kinds: newline-separated eyebrow, photo none/from STUDIO_PHOTOS, scrim top/left/faint when photo selected, newline-separated marquee; curly-brace accent syntax in supported copy.
- Stat: fixed list of value+label tuples, subhead and proof lines.
- List: headline, fixed label+body card tuples, closing line.
- Steps: headline, fixed number+title+body tuples.
- Quote: quote and attribution lines, plus explicit warning to replace placeholder testimony with a real approved quote before publishing.
- CTA: headline, subhead, button label, footer lines.
- Debounced live preview/rendering indicator, reset to preset, current slide PNG, whole carousel PDF, return to Dashboard. PNG export fetches server image; PDF is assembled client-side with jsPDF from each slide image. There is no inspected server carousel-PDF or persistent-project save API. Evidence `StudioPage:51`, `:76`, `:90`, `:121`, `:167`–`:266`; `W/lib/studio/presets.ts:7`.

**Contract:** `GET /api/studio/render?format=...&d=base64(UTF8(JSON Slide))`, or preset `slide=index`, returns PNG. Server `W/app/api/studio/render/route.ts:26` uses FORMATS fallback and currently casts decoded JSON to Slide without full schema validation. `inlinePhoto:14` reads a path derived from client photo.src under public; no strict asset allowlist or route-level tenant auth is present in that handler. Do not extend this renderer to arbitrary local paths/URLs in native.

**Acceptance:** implement native slide selection/form and image preview preserving the five kinds and text semantics, reset confirmation, current-image and ordered-carousel export through native share/save. Name exports predictably and handle render/PDF/file-sharing failure without losing the draft. Do not claim device PDF capability from web jsPDF; choose and verify an approved native/server export implementation. Fix shared renderer schema, payload bounds, photo allowlist/path containment and access/rate-limit policy first. Keep marketing templates editable but do not present their sample quotes, prices or claims as verified business facts. Native draft persistence is an explicit implementation decision, not an existing web backend capability. No posting to social networks is implied or authorised by export.

### TRADE-025 — Signage brands, fleet and compliance sweeps

**Status: partial summary native; complete workflow browser-only/gated by HQ org access.**

Native `N/src/features/trades/tools/SignageTools.tsx:124` displays fleet rollup counts and flattened recent requests; assessed rows open `/dashboard/signage/queue?a={assessment_id}` in browser, with links to sweeps/queue. It does not select brands, create/delete sweeps, open/copy unassessed request links or show the full per-sweep roster/progress. Its query schemas/hooks in `tools-api.ts:31` consume sweeps and queue rollup only; extra returned brand/studio/fleet fields are not native functionality.

Website `/dashboard/signage` (`W/app/dashboard/signage/page.tsx:76`) has brand tabs, current brand terms/shot definitions, fleet rollup, nav to all signage sections, sweep name, optional region selector/all regions, requested-shot checkboxes, computed target/shot count, create, previous sweeps with response progress, request upload links, assessment links and confirmed sweep deletion. Brand switch updates URL, clears shot/region selections and reloads. `BrandTabs.tsx:13` and `withBrand:49` preserve brand context across child routes.

**Contracts:** `GET /api/signage/sweeps?brand=slug` returns studios/sweeps/requests/current brand/brands/selected; `GET /api/signage/queue?status=all&brand=slug` returns rollup/fleet/queue; `GET /api/signage/brands` returns allowed selection data. `POST /api/signage/sweeps?brand=slug {name,region?,required_shots?}`: name1–120, region≤60, shot slots validated against brand, no matching studios400. Optional studio_status prospect/open/closed is API-supported but not currently exposed by the web sweep form. `DELETE /api/signage/sweeps/{id}` is org-owned and returns404 for foreign ID. Evidence `W/app/api/signage/sweeps/route.ts:29`, `:40`, `:132`; `sweeps/[id]/route.ts:15`.

**Sending distinction:** current POST creates requests/tokenised upload links and returns them; it does **not** dispatch SMS (`sweeps/route.ts:125`). Do not convert native “Create sweep” into automatic studio contact or imply delivery. User-initiated copy/share needs an explicit action; sending infrastructure is a separately approved capability. Public `/studio/{token}/upload` and report remain public-browser flows covered by the PUBLIC requirements.

**Acceptance:** build a native brand-scoped fleet/sweeps workspace; create→readback→reopen preserves region/required shots and target roster; show actual generated links and response states, not a “sent” claim. Context stays selected on every list/detail/browser return; include brand in query/mutation cache identities. Confirm destructive cascade before deletion. Distinguish signed-out, authenticated-with-no-HQ-org, network and provider failures. Native currently presents generic query errors for org absence. A normal tradie tenant is not automatically HQ. `W/lib/signage/org.ts:57` currently auto-adopts a single unclaimed seeded org; root's authentication/security requirement must replace or explicitly gate that convenience before broader native access. Do not add an imaginary org-create API or run seed scripts for parity verification.

### TRADE-026 — Signage studio/location management

**Status: browser-only; no native manager.**

Website `/dashboard/signage/studios`, `W/app/dashboard/signage/studios/page.tsx:44`, has brand selection, Places search by name/area, debounced result list with selection, typed address fallback/geocode, live Street View and static-map preview/lightbox, location name/address/state/postcode/region, add, CSV roster import, current roster with thumbnails and confirmed delete. Places choice records location/place ID/coordinates; editing address must invalidate stale geocoding. Supporting `useAuthedImage:451`, Preview, StreetThumb, StaticMapThumb and Thumb are real nested controls, not cosmetic decorations.

**Contracts:**

- `GET/POST /api/signage/studios?brand=slug`. Create `{name,address?,region?,state?,postcode?,lat?,lng?,place_id?}`; name1–120,address≤240,region≤60,state≤20,postcode≤12,place_id≤300. API additionally supports contact_phone≤40/contact_email≤120; those are not current visible create-form fields. `W/app/api/signage/studios/route.ts:36`.
- `DELETE /api/signage/studios/{id}` requires org ownership and may remove associated sweep photos/results; website confirmation discloses this. No PATCH/edit endpoint was found in the current route inventory; do not promise a nonexistent update contract.
- `POST /api/signage/studios/import?brand=slug` multipart `csv` (also text ingress in handler); parser maps flexible aliases for name,address,region,state,postcode,phone/email, quoted commas/newlines. It skips blank/duplicate rows, reports errors, and skips existing names. `lib/signage/studios-csv.ts:65`, `app/api/signage/studios/import/route.ts:18`.
- `GET /api/signage/places/search?q=...` (query<3 returns empty); `/geocode?address=...`; `/street-view?address=&postcode=&state=`; `/static-map?lat=&lng=&maptype=`. They use HQ bearer and return image bytes or JSON failure; maps-key-missing/provider_error can be HTTP200 with ok:false. Native image loading must inspect content type/status, not render a JSON body as an image. Keys remain on server.

**Acceptance:** native form, Places results, address fallback, accessible image viewer, roster and CSV review outcomes; native platform file permissions and cancellation. Server must revalidate lat/lng and identity, not infer location from stale text. Add/import/delete readback updates sweep target counts. Confirm deletion with affected scope; retained row on failure has an explicit error, not silent success. Preserve original postal strings and en-AU defaults without rejecting legitimate international roster values that the current schema supports. Backend limits/partial import semantics must be made bounded and explicit before large native imports. Test brand switch, wrong org ID, no imagery/key, geocode timeout, empty/quoted/duplicate/missing-name CSV and stale cached roster.

### TRADE-027 — Signage photo-shot definition editor

**Status: browser-only.**

Website `/dashboard/signage/shots` (`page.tsx:27`) lets HQ select brand; edit slot ID, label and instruction for each shot; add/remove; save and show the server-normalised list. `POST` is not used: `GET/PATCH /api/signage/brand?brand=slug` with `{shots:[{slot,label,instruction?}]}`. `W/lib/signage/shots.ts:46` normalises slot to snake_case, trims labels/instructions, drops empty/duplicate slots; zero valid shots returns400 no_valid_shots. PATCH returns updated brand so UI uses canonical saved values (`W/app/api/signage/brand/route.ts:27`, `:52`).

API also accepts vision_persona≤200, location_noun/plural≤40 and hq_name≤80; inspected shots UI does not expose those brand metadata editors. Preserve them unchanged, document them as API-only rather than silently add broad administrative controls.

**Acceptance:** native editable repeatable shot rows with stable keys, labels and delete confirmation where removing required data affects future requests; preview normalised slot collisions before save; show which entries would be rejected/dropped; read back exact server result. Brand switch must resolve dirty edits rather than save them to another brand. Newly created sweeps use the new definition; historical request requirements remain immutable or explicitly migrated, never silently reinterpreted. Confirm minimum one valid shot, no accidental empty-list save, network/401/400/500 errors, duplicate normalised IDs and long text. HQ ownership/brand scope follows the X/G gates.

### TRADE-028 — Signage assessment queue and human HQ decision

**Status: browser-only except native fleet counts/request links.**

Website `/dashboard/signage/queue` (`W/app/dashboard/signage/queue/page.tsx:85`) has brand tabs, review queue and whole-fleet list, selected assessment via query `a=`, detail loading, latest overall/status and submitted photo lightbox. `DetailPanel:350` groups rule verdicts with rule text, evidence, status glyph, stage/provenance badge, knowledge-base notes/citations, source citations, applicability downgrades, other observations and degraded-stage warning. It shows previous HQ decision and explicit Approve / Needs changes / Escalate. No native detail or decision control currently exists.

**Contracts:** `GET /api/signage/queue?status=hq_review|all&brand=slug`; `GET /api/signage/assessment/{id}` returns org-owned assessment/verdicts/advisory/photos and stage metadata; `PATCH /api/signage/assessment/{id} {hq_decision:'approved'|'needs_changes'|'escalated',hq_note?}`. Note≤2,000 is API-supported, not exposed in current web decision form. Approved/needs_changes set resolved; escalated stays hq_review; caller ID is recorded (`W/app/api/signage/assessment/[id]/route.ts:107`). Decisions do **not** automatically notify the studio; website says so at `queue/page.tsx:518`.

**Acceptance:** implement native queue→detail→photo/rule review→explicit decision with unchanged evidence/provenance; preserve review-only/scaled-reference rules as such, never convert AI confidence into certification. Show stage2 failure prominently without suppressing stage1 results. Prevent repeated decisions while pending, refresh both selected detail and fleet/queue after success, preserve previous data but show errors on failed reload, and guard late responses on brand/assessment change. Test deep link to resolved/foreign/deleted assessment, signed image expiry, no photos/verdicts, long citations, degraded KB, each decision transition and no outbound messaging. Server remains final org/brand/decision authority even if native controls are bypassed.

### TRADE-029 — Signage standards ingestion, ad-hoc audit and report export

**Status: browser-only; existing APIs plus review-integrity/backend limitations.**

Website `/dashboard/signage/audit` has brand selection and two independent panels. IngestCard (`page.tsx:137`) picks a standards PDF, extracts text in-browser when possible, runs “Decipher PDF”, previews shot/rule counts, AI-scorable count, verdict-mode groups and extracted rule list, then offers explicit “Save rules”. AuditCard (`:268`) accepts multiple photos per defined shot slot, runs an ad-hoc audit and shows report verdict counts/grouped actions/citations plus PDF download. These are not the tracked sweep flow; ad-hoc audit result is not persisted.

**Contracts / limits:**

- `POST /api/signage/ingest?brand=slug` defaults to dry-run; `?apply=1` mutates brand shots/rules. Body JSON `{text}` or multipart `pdf`. Text must contain at least200 chars; multipart PDF≤60 MB at handler, but current web avoids the platform body cap by sending extracted text, falls back to multipart only≤4 MB and rejects a large unreadable/scanned PDF. Success carries applied,brand,chars,scored,tiers,shots,rules; no_text_extracted/pdf_parse_failed/no_rules_extracted can be HTTP200 ok:false. `W/app/api/signage/ingest/route.ts:29`, `:36`, `:89`, `:104`.
- Current apply re-runs AI extraction from the same file/text, rather than committing a previously returned immutable proposal. Therefore the clicked count/preview may differ from the rules saved. Add proposal hash/revision and reviewed-payload commit to the shared backend before treating native preview→apply as a guaranteed human review boundary. Do not merely replay `apply=1` and assume it saved exactly what was reviewed.
- `POST /api/signage/audit?brand=slug` multipart fields named by brand shot slots; 1–12 JPEG/PNG/WebP photos, each≤5 MB. No persistence. AI pass1 plus optional KB pass2 (`SIGNAGE_TWO_STAGE !== '0'`) produce report/overall/counts/provenance and optional degradation metadata. Rules requiring metadata/reference/human review are not auto-certified. `W/app/api/signage/audit/route.ts:28`, `:37`, `:91`.
- `POST /api/signage/audit/pdf {brandName,report}` streams PDF, org-authenticated, configured PDF service required; invalid report400, service/render failure503. Current light structural validation checks counts/groups only (`audit/pdf/route.ts:26`); it is a rendering endpoint, not proof the caller's report is an authoritative saved assessment. Do not reuse the old code comment claiming aircon also accepts arbitrary report payloads: aircon now uses owned saved IDs.

**Acceptance:** native pick/read PDF and photo slots with visible bounds, progress, cancellation, errors and replacing/removing chosen files; preflight total request size. Explicit staged review/commit for standards, immutable review proof, correct brand scope and duplicate-rule/upsert results. Ad-hoc report labelled unsaved/non-certifying, distinct from tracked requests; source images, rule counts, conclusions and citations remain coherent. PDF share/save gets correct file type and name and handles server/service failures. Add either approved native PDF text extraction or a safe signed-upload/text-extraction contract for large files; the website's browser `unpdf` cannot be assumed to run unchanged in Expo. No unconfigured provider or a second-stage failure may silently imply an all-clear result. User-requested export must not email or SMS anyone.

### TRADE-030 — Maps, topology, roof layouts, 3D models and showcase renders

**Status: browser-only/missing native; some website capabilities are explicitly gated or fixture-only.**

The X requirements own licensing/source approval, private-token security, provider configuration, approved data boundaries and live-generation authorisation. This trade section requires native presentation parity only after those gates pass. Inventory must include these surfaces instead of excluding them as former mobile non-goals:

| Surface and source | What exists / native requirement |
|---|---|
| Roofing multi-structure `RoofMap`, `GoogleStaticMap`, `StreetView` (`W/app/dashboard/roofing/_components`) | Map/pan/structure pick, selected/excluded legend, address/centre lookup and imagery; manual fallback and provenance. No native equivalents in RoofMeasureScreen. |
| Roof photo verification, solar detection and insight (`PhotoVerify.tsx:46`, `SolarCheck.tsx:31`, `SolarRoofInsight.tsx:52`) | Distinct tools with loading/error/confidence/result sections; do not claim plain measurement means these are native. |
| `RoofTilesViewer.tsx:26`, `Paint3DTilesViewer.tsx`, shared `loadCesium.ts` | Provider-key/source-gated tiles views and orbit controls. A native solution needs approved platform renderer or secure, explicitly labelled web surface; a link is browser-only. |
| `/dashboard/roofing/measurements/{id}/topology`, `TopologyEvidencePanel.tsx` | Private tenant-owned evidence/fixture preview with measurements/candidates/provenance/gates, not a production editing engine. `GET /api/dashboard/roofing/measurements/{id}/topology` returns fixturePreview=true; source_approval_recorded is explicitly non-authorising. Preserve that label. Native preview screen is missing. |
| `/m/{token}` `RoofLayoutSection`, `Roof3DModelSection` | Reviewed roof layout and model/showcase controls; X + PUBLIC-020 inventory exact gate states/actions and approval. Native saved links do not implement these controls. |
| `/api/roofing/model3d/{token}` | Current private measure-token capability, required provider key, input validation and concurrent-generation claim are visible at `W/app/api/roofing/model3d/[token]/route.ts:69`, `:74`, `:86`, `:91`; these do not by themselves prove owner entitlement or licensed-source/human approval. Preserve those existing guards and satisfy root's remaining source/authority prerequisites before native generation. |
| `/api/roofing/showcase-renders/{token}` | Current handler resolves a private measure token and a saved address, filters supported cosmetic materials and queues work (`W/app/api/roofing/showcase-renders/[token]/route.ts:55`, `:70`, `:86`); its started response is not a completed render or proof of source approval. Preserve the private-token boundary and add/verify required owner/entitlement/source/operation gates before native generation. |
| `/api/roofing/q/{token}/layout-plan` | GET returns cached state by public token. POST ignores its request argument and invokes generation with the public token only (`W/app/api/roofing/q/[token]/layout-plan/route.ts:46`, `:51`); the handler does not prove owner, measurement approval or approved source merely because its button appears on `/m`. **Shared-backend prerequisite:** retain public cached reads, but require the approved owner/entitlement/source and reviewed-measurement authority for generation, plus durable operation/deduplication state, before exposing a native generation action. PUBLIC-020 and the X/G gates own the final contract. Do not auto-trigger provider work or invent “create 3D from any satellite image”. |
| Solar `/q/solar/{token}` BuildingPicker/BuildingPickerSection/SunShadeMap/SunShadeOverlay/HeatmapAutoRefresh and `/solar/{tenantSlug}/SolarRoofMap` | Public calculator/quote maps, building selection, panel-plan/heatmap and provider integrations; PUBLIC-022 owns public controls. Native solar workspace currently opens browser/Felt. |
| Aircon `FloorPlanOverlay`, estimator `PlanOverlay` / `ZoomableImage` | Native plan viewer required by TRADE-007/009/011. Geometry/diagram is advisory and not automatically accepted installation design. |

**Acceptance:** feature/config-disabled, licensed-source-disabled, unapproved, queued/running/failed/ready, unavailable imagery and cross-tenant states all have distinct UX; only documented available operations run. Preserve attribution and uncertainty, and never use synthetic preview geometry as measured pricing input. Reopening a saved record must retain the exact approved geometry/proposal/source revision. Human changes to included buildings/roof metrics/plan quantities must invalidate dependent prices and require review. Production enablement is a separate explicit approval, not completion of this spec or UI task.

#### Supplemental existing media contracts and safety dependency

These subcomponents are not covered by merely returning a measurement JSON object:

- `POST /api/roofing/verify-photo {photoPath,address}` returns verdict match/reason/material/material_confidence/red_flags plus hadReference. Website PhotoVerify uploads a file first, then requests classification; render the uploaded image/verdict and leave confirmation with the tradie. **Backend prerequisite:** `W/app/api/roofing/verify-photo/route.ts:36` authenticates identity only, then service-role downloads caller-supplied intake-photos path at `:65` without an owner check in that handler. Define and enforce owned upload/path access before adding native support; never invent a permissive direct-storage workaround.
- `POST /api/roofing/detect-solar {address,center?,intent?,photos?}` accepts up to six base64+mime photos and returns best-effort detection/allowance using the shared server rate loader (`W/app/api/roofing/detect-solar/route.ts:37`, `:75`). Missing maps/model config and unavailable imagery can be HTTP200 ok:false codes. Do not treat those as zero panels, or price an allowance in native.
- `GET /api/roofing/solar-insight` is a separate insight request, not panel-design authorisation. Street-view/static-map APIs must distinguish JSON no-imagery errors from image bytes; do not display blank successes or silently drop attribution.
- Residential preview `/api/painting/preview` and `/preview/refine`, material detection `/api/painting/detect-material`, and `/api/painting/3d-location` are different operations. Source-gated Google/Cesium tiles and recolouring do not establish new licensed mesh reconstruction rights. Their failure is independent of saved quote validity; no live generation was performed in this audit.

### Dynamic job-type control inventory for TRADE-002

Definitions: `W/lib/quote/job-fields.ts`, `W/lib/intake/schema.ts:10`; native mirror `N/src/features/trades/jobquote/job-fields.ts:33`. Preserve exact field codes and select option strings from those files: the server incorporates human-readable answers into its drafting transcript. The table names every offered type and all its dynamic fields; all also have the shared address/suburb/customer/notes controls described above.

| Trade / job_type | Dynamic fields | Product category in current form registry | Native status |
|---|---|---|---|
| electrical / downlights | count; room; ceiling_type (flat plaster/raked/cathedral/sheet metal/not sure); replace_or_new (replacing/new); colour (warm/cool/tri-colour/dimmable/smart/standard) | downlight | Present, TRADE-002 gaps apply |
| electrical / power_points | count; room; replace_or_new (replace/near existing power/new switchboard run inspection); optional numeric distance_to_existing_power; circuit_required (10A/20A/three-phase) | gpo | Present |
| electrical / ceiling_fans | count; room; supplied_by (customer supplies/we supply) | fan | Present |
| electrical / smoke_alarms | smoke_class (like-for-like/full-property compliance hardwire); count (alarm/bedroom interpretation) | smoke_alarm | Present |
| electrical / outdoor_lighting | count; room; sensor (sensor/always-on/switched) | outdoor_light | Present |
| electrical / switchboard | generic room; usuallyInspection | None | Present |
| electrical / oven_cooktop | appliance (oven/cooktop/induction/oven+top); replace_or_new (existing/new-circuit inspection/not sure) | oven_cooktop | Present |
| electrical / ev_charger | room; phase (single/three-phase inspection/not sure) | ev_charger | Present |
| electrical / fault_finding | room; fault_symptom (breaker/no power/flicker/burning smell/other) | fault_find | Present |
| electrical / renovation | generic room; usuallyInspection | None | Present |
| electrical / other | generic room; usuallyInspection | None | Present, never silently filed as plumbing |
| plumbing / blocked_drain | room (kitchen/basin/shower/toilet/laundry/external-stormwater); blockage_severity (slow/completely blocked) | drain | Present |
| plumbing / hot_water | energy_source (electric/gas/heatpump/solar inspection/unknown inspection); litres (125/160/250/315/400 L/not sure); room (laundry/outside/garage/roof/other) | hot_water | Present |
| plumbing / tap_repair | room (kitchen/basin/laundry/outdoor/shower); tap_symptom (drip/body leak/stuck) | tap | Present |
| plumbing / tap_replace | room (kitchen mixer/basin/laundry/outdoor/shower); supplied_by | tap | Present |
| plumbing / toilet_repair | room (main/ensuite/second); toilet_symptom (running/leaking/no flush) | toilet | Present |
| plumbing / toilet_replace | room; toilet_style (close-coupled/wall-faced/back-to-wall/in-wall/not sure); supplied_by | toilet | Present |
| plumbing / gas_fitting | room; appliance (cooktop/oven/hotwater/heater/BBQ/other) | gas | Present |
| plumbing / burst_pipe | generic room; usuallyInspection | None | Present |
| plumbing / bathroom_renovation | generic room; usuallyInspection | None | Present |
| plumbing / cctv_inspection | room (sewer/stormwater/kitchen waste/not sure) | cctv | Present |
| plumbing / prv_install | room (water-main/meter location) | prv | Present |

**Shared product-picker integration issue to verify/fix:** both current forms filter `catalogue.category === spec.catalogueCategory` and identify selection by product name, not ID (`W/app/dashboard/job/_components/JobQuoteForm.tsx:191`; `N/src/features/trades/jobquote/JobQuoteScreen.tsx:63`). Registry values such as fan/hot_water/tap are not the granular vocabulary names used by every current catalogue row. Acceptance must include real catalogue categories/aliases and two products with identical names: the chosen owned SKU must reach the draft without vanishing, being confused with a different trade or selecting the first duplicate. Resolve categories server-side/shared mapping and track the exact ID; do not “fix” only the mobile label while leaving backend material routing inconsistent.

### Trade route coverage

Appendix A contains 91 pages. These are all 13 standalone dashboard route patterns owned by this section, plus its embedded dashboard sections. Other dashboard routes and public/customer routes are explicitly delegated; a link to one is not counted as native implementation.

| Website route / entry | Source | Native equivalent/current state | Requirement |
|---|---|---|---|
| `/dashboard/job/[trade]` | `W/app/dashboard/job/[trade]/page.tsx:1` | Electrical/plumbing JobQuoteScreen inside Tools; partial | TRADE-002 |
| `/dashboard/roofing/measure` | `W/app/dashboard/roofing/measure/page.tsx:94` | RoofMeasureScreen basic inputs/result/save; partial | TRADE-003/004/030 |
| `/dashboard/roofing/measurements/[id]/topology` | `W/app/dashboard/roofing/measurements/[id]/topology/page.tsx:1` | No native evidence preview; gated fixture-only | TRADE-030 + X source gates |
| `/dashboard/painting` | `W/app/dashboard/painting/page.tsx:57` | PaintingSavedJobs links only; browser-only | TRADE-005/015/030 |
| `/dashboard/aircon` | `W/app/dashboard/aircon/page.tsx:117` | AirconToolScreen; partial | TRADE-007/008 |
| `/dashboard/estimator/[runId]` | `W/app/dashboard/estimator/[runId]/page.tsx:1` | EstimatorScreen saved run/counts/price; partial | TRADE-011/012 |
| `/dashboard/pricing-wizard` | `W/app/dashboard/pricing-wizard/page.tsx:77` | Browser link from pricing; browser-only | TRADE-023 |
| `/dashboard/studio` | `W/app/dashboard/studio/page.tsx:43` | No native Brand Studio route/link/editor found | TRADE-024 |
| `/dashboard/signage` | `W/app/dashboard/signage/page.tsx:68` | SignageTools summary + browser sweeps link; partial | TRADE-025 |
| `/dashboard/signage/studios` | `W/app/dashboard/signage/studios/page.tsx:44` | No native location manager | TRADE-026 |
| `/dashboard/signage/shots` | `W/app/dashboard/signage/shots/page.tsx:27` | No native shot editor | TRADE-027 |
| `/dashboard/signage/queue` | `W/app/dashboard/signage/queue/page.tsx:85` | Native request→browser detail only | TRADE-028 |
| `/dashboard/signage/audit` | `W/app/dashboard/signage/audit/page.tsx:33` | No native ingest/ad-hoc report | TRADE-029 |
| Dashboard hub `{electrical,plumbing,roofing,signage,painting,commercial_painting,aircon,solar}` × `{quotes,tools,pricing,services,catalogue,recipes,estimating}` | `W/app/dashboard/page.tsx:17053` | HubScreen selection present; per-section capability varies | TRADE-001 and all corresponding families |
| Legacy dashboard cross-trade pricing/services/catalogue/recipes/estimating deep links | `W/app/dashboard/page.tsx:5683`, `:7093`, `:11314`, `:12470`, `:13491` | Native trade-filtered sections; global policy delegated core | TRADE-013–023 |
| Embedded electrical estimator entry | `W/app/dashboard/_components/EstimatorBetaTab.tsx:21` | Native electrical Tools estimator | TRADE-011 |
| Embedded commercial painting Tools | `W/app/dashboard/_components/commercial-painting/CommercialPaintingTab.tsx:109` | Native CommercialPaintingScreen partial; no standalone `/dashboard/commercial-painting` page exists in census | TRADE-008/009/010 |
| Embedded solar Tools / Instant-Felt | `W/app/dashboard/_components/SolarTab.tsx:115` | Native SolarTools partial; no standalone `/dashboard/solar` page in census | TRADE-006/016 |
| Saved roofing/painting/signage hub panels | `W/app/dashboard/page.tsx:16245`, `:16491`, `:16702` | Native saved/history panels present, browser detail | TRADE-003/005/025 |
| Customer/tradie token continuation `/m/[token]`, `/p/[token]`, `/q/roof`, `/q/paint`, `/q/solar`, `/q/aircon`, `/q/commercial-paint`, `/q/plan`; `/solar/[tenantSlug]`; `/studio/[token]/upload` and `/studio/[token]/report` | The PUBLIC requirements cover all exact routes/controls | Browser-only continuation unless a separate native screen is explicitly documented there | PUBLIC-020/021/022 and public signage/quote requirements |

### Trade component census and implementation mapping

File-level rows include their internal functional components so small but important controls are not lost. Pure format/geometry helpers are attached to the same family, not counted as independent user features. Generic dashboard primitives (Card/Button/Pagination/FeatureGate/navigation), account/core tabs and public-token subcomponents are inventoried by root/core/public owners. In this table, `app/...` paths are relative to W; shorter `job/...`, `roofing/...`, `painting/...`, `signage/...` and `_components/...` paths are relative to `W/app/dashboard`.

| Website file(s)/embedded functions | Controls or dependent subcomponents accounted for | Native destination/status |
|---|---|---|
| `app/dashboard/job/[trade]/page.tsx`; `job/_components/JobQuoteForm.tsx` | Feature gate, job registry/options, product picker, address, form validation/submit/results | JobQuoteScreen + job-fields/schema/api; partial, TRADE-002 |
| `app/dashboard/roofing/measure/page.tsx` | RoofingMeasurePage/Inner, MultiResultBlock, StructureCard, PropertyContextStrip, RoutingStrip, PitchProvenance, GeoscapeAttributes, MiniStat, MeasureProgressModal, AuthBadge, Notice; inclusion and combined-total helpers; headings/breadcrumb/spinner | RoofMeasureScreen/StructureCard, RoofingSavedJobs; partial, TRADE-003/004 |
| `roofing/_components/AddressAutocomplete.tsx` | Suggestion list, select, typed fallback | Native missing across job/roof/paint tools; TRADE-002/003/005 |
| `roofing/_components/GoogleStaticMap.tsx` | Authenticated image loading/enlargement/error | Native missing; TRADE-003/030 |
| `roofing/_components/StreetView.tsx` | Authenticated facade image/enlargement/unavailable state | Native missing; TRADE-003/005/030 |
| `roofing/_components/RoofMap.tsx` | MapLibre polygons/bounds, building selection, selected/primary/secondary legend, map click, StatRow/Legend | Native missing; TRADE-003/030 |
| `roofing/_components/PhotoVerify.tsx` | Upload, preview, verify, VerdictPanel/StatusLine, match/material/red flags | Native missing; TRADE-030 + ownership prerequisite |
| `roofing/_components/SolarCheck.tsx` | Detect action, Stat, TotalCard, allowance/routing/confidence/error | Native missing; TRADE-030 |
| `roofing/_components/SolarRoofInsight.tsx` | Insight load, compass/pitch/plane metrics, Stat | Native missing; TRADE-030 |
| `roofing/_components/RoofTilesViewer.tsx` | Gated 3D tile viewer/orbit | Native missing/gated; TRADE-030 |
| `roofing/measurements/[id]/topology/page.tsx`; `TopologyEvidencePanel.tsx` | Required synthetic fixture, gate/approval disclaimer, candidate selection/detail, DetailMetric, TopologyEvidenceSvg, SyntheticFacetBadges, CandidateLine | Native missing/gated; TRADE-030 |
| `app/dashboard/painting/page.tsx` | PaintingEstimatePage/Inner, FrontOfHouse, PaintPreviewSection, ProvenanceNote, AuthBadge, PaintProgressModal and form/progress helpers | Native history/browser link only; TRADE-005 |
| `painting/_components/PaintResultView.tsx` | Complete scope/tier/takeoff result, RoutingStrip, ConfidenceBadge, Stat, source/product labels | Native missing; TRADE-005 |
| `painting/_components/MaterialCheck.tsx` | Detection action, substrate/material result, Stat/loading/error | Native missing; TRADE-005/030 |
| `painting/_components/Paint3DTilesViewer.tsx` | Gated Cesium tiles, masking/recolour/orbit | Native missing/gated; TRADE-030 |
| `_components/SolarTab.tsx` | Instant/Felt TabButton; lists, actions, selected building, Stat/StatWithHint | SolarTools/SolarEstimatesCard/EstimateRow partial; TRADE-006 |
| `_components/PylonHardwareCard.tsx` | Verified module/inverter/battery SKU setup | Native PylonHardwareSettingsCard present source-only; TRADE-006 |
| `app/dashboard/aircon/page.tsx` | AirconRecommendPage/Inner; headings; Result; AirconPdfButton; LocationPanel/Chip/AcStaticMap; PlanRoomsPanel; SizingPanel/Stat; OptionCard; SystemSchematic | AirconToolScreen + LocationCard/SizingCard/RoomMetrics/PlanCard/OptionCardView/PricingRequiredCard; partial, TRADE-007/008 |
| `_components/FloorPlanOverlay.tsx` | Selected ducted/split overlay, room polygons/markers/load annotations/plan image | Native missing; TRADE-007 |
| `_components/EstimatorBetaTab.tsx` | PDF/sheet hint/extract/loading/history entry | EstimatorScreen partially present; TRADE-011 |
| `app/dashboard/estimator/[runId]/page.tsx`; `_components/estimator/RunWorkspace.tsx` | Private run load, file reattach, selected rows, refine/save/price/adopt, WorkspaceShell/Spinner | EstimatorScreen partial; TRADE-011/012 |
| `_components/estimator/TakeoffTable.tsx` | Name/symbol/count/add/remove/selection | Native count-only; TRADE-011 |
| `_components/estimator/PricedSummary.tsx` | Priced rollup, UnmatchedItem adoption, TraceGrid/TraceStep | Native PricedSummaryCard totals/lines but not adoption/fulltrace; TRADE-011/012 |
| `_components/estimator/Methodology.tsx`; `StatStrip.tsx`; `badges.tsx`; `types.ts`; `plan-file-store.ts` | Model/runtime/source methodology, stats, confidence/run-state badges and same-tab file cache | Native partial metadata/history, file-reopen policy missing; TRADE-011 |
| `_components/PlanOverlay.tsx` | Page choice, pinned versus all pages, selectable pins, Show all, scrollable canvas/loading/error | Native missing; TRADE-009/011 |
| `_components/ZoomableImage.tsx` | Enlarge image/modal/caption/close/Escape/body-scroll lock | Native image viewer required with native back/accessibility semantics; TRADE-005/007/030 |
| `_components/EstimatorChatbot.tsx` | Expand/compose/send/suggestions, pending response, Bubble/citations | Native missing; unused AI hook not equivalent; TRADE-009/011 |
| `_components/commercial-painting/CommercialPaintingTab.tsx` | Run lifecycle/status, job/address, upload/classify/view/remove, recent/new run, extract/price/save/contact, preview/chat | CommercialPaintingScreen + DocRow/MetaChip/RunRow partial; TRADE-009/010 |
| `_components/commercial-painting/PaintTakeoffEditor.tsx` | SourceChip; room grouping; all correction/bulk/reset/override controls | Native read-only ItemRow; TRADE-009 |
| `_components/commercial-painting/PaintPricedSummary.tsx` | LinesTable/LineRows/expandable LineRow traces; main/separate/unmatched/excluded/material/crew/equipment/tax | Native PricedSummary/SumRow partial; TRADE-009/010 |
| `_components/commercial-painting/PaintPreviewPanel.tsx` | Colour before/after and refinement | Native hook unused; TRADE-009 |
| `_components/RoofRatesEditor.tsx` | All mapped scalar/nested fields, CurrencyInput/PctInput/Caption/defaults/errors/reset | RoofRatesCard + OverlayRatesCard partial; TRADE-014 |
| `_components/PaintRatesEditor.tsx` | Model/rates/nested takeoff/deposit controls, PlainInput/UnitInput/PctInput/Caption | PaintRatesCard + OverlayRatesCard partial; TRADE-015 |
| `_components/SolarRatesEditor.tsx` | Full solar card/defaults/reset | SolarRatesCard mostly present; TRADE-016 |
| `app/dashboard/page.tsx PricingTab/PricingBookCard` | Trade book selection, advanced fields, tier mode; general policy delegated core | PricingSection/LabourRatesCard partial; TRADE-013 |
| `page.tsx ServicesTab/PreferredBrandsCard/CustomServiceForm` | Search/expand/toggles/brand preference/custom fields | ServicesSection/ServiceToggleRow/CustomServiceForm partial; TRADE-017 |
| `page.tsx CatalogueTab/CoveragePanel/BrowseSupplierPanel/SupplierField/TierLadderPanel` | Mine/browse/ladder, full product fields, stock/coverage, image and active/preferred/property controls | CatalogueSection/MinePanel/CoverageCard/EssentialsBlock/ProductRow/ProductForm/BrowsePanel/SupplierRowItem/LadderPanel/PickerOption present or partial per TRADE-018 |
| `page.tsx SupplierCsvUpload` | Template, dry run/row errors/stock toggle/commit | Native missing; TRADE-019 |
| `page.tsx RecipesTab` | Baseline/custom Tasks+Parts, search/fork/edit/reorder/delete and category gaps | RecipesSection/StepsPanel/PartsPanel/RequiredPill/RecipePricingAuthority present or partial; TRADE-020/021 |
| `page.tsx EstimatingTab/SourceBadge` | Complete BOM/effective source/overrides/reset/pagination | EstimatingSection/SourceBadge/NumField partial; TRADE-022 |
| `app/dashboard/pricing-wizard/page.tsx` | PricingWizardPage/Layout/StepRail/StepCard/Banner/NumberInput, 3-step state and save | Browser only; TRADE-023 |
| `app/dashboard/studio/page.tsx`; `lib/studio/{types,presets,tokens,fonts,templates}` | StudioPage/Section, five template kinds, fixed visible format, render/PNG/client PDF | Native missing; TRADE-024 |
| `app/dashboard/signage/page.tsx` | SignageHubPage/Inner, SweepCard, RequestChip, AuthBadge, sweep creation/deletion and links | SignageTools/StatCell/RollupRow/ChipText/RequestRow summary only; TRADE-025 |
| `signage/studios/page.tsx` | Location form, search/import/delete, useAuthedImage/Preview/StreetThumb/StaticMapThumb/Thumb/lightbox | Native missing; TRADE-026 |
| `signage/shots/page.tsx` | Brand shot list editor/add/remove/save/readback | Native missing; TRADE-027 |
| `signage/queue/page.tsx` | Queue/fleet/detail, DetailPanel/StageBadge, photos/verdicts/decisions | Browser only; TRADE-028 |
| `signage/audit/page.tsx` | SignageAuditPage/IngestCard/AuditCard/humanIngestErr, staged rules and instant report/PDF | Native missing; TRADE-029 |
| `signage/_components/BrandTabs.tsx`; `_components/ui.tsx` | Brand context helpers; SignageNav/Crumbs; headings/labels; Chip/OverallChip/StateGlyph/Stat/Tally/ComplianceBar/FleetSnapshot; Lightbox; EmptyState/Notice; decorative TopoBackdrop/reveal | Native summary stats/chips only; full child screens missing, TRADE-025–029 |
| `page.tsx TradeHub/SignageHubTab/SgStat/SgChip/PaintingHubTab/RoofingHubTab`; `_components/saved-jobs-mode.ts` | Trade tabs, per-hub saved-job mode/filter, history/tap-through routing | HubScreen/SectionBody/QuoteQueueSection/SolarTools/SignageTools/PaintingSavedJobs/RoofingSavedJobs; partial, TRADE-001/003/005/006/025. Generic quote CRUD delegated core. |
| Native-only `src/features/trades/ui.tsx`, `hub/SectionsContent.tsx`, `hub/LinkOut.tsx` | Card/SectionLabel/PillOption/PillGroup/Notice/MultilineField, WebOnlyCard/ToolsWebOnly, LinkOutButton/openWebPath | Presentation/handoff infrastructure; not independent evidence of tool completion. All new controls follow native DESIGN.md, TRADE-001 and X UX/accessibility requirements. |

All catalogue/category/recipe/price loader modules referenced by these files are backend-shared contracts rather than additional screens. Appendix C records remaining route methods and source paths; the requirements above specify the contracts relevant to each actual control instead of marking all endpoints mobile-ready.

### Verification required before claiming trade parity

This audit made no runtime completion claims. Each implemented family must later attach evidence for the following applicable cases:

1. **Control parity:** select every mode/type, fill every conditional field, use every destructive/nondestructive action, confirm result/error/retry and return navigation at 320/390dp and large text. No clipped primary actions, inaccessible selected states or controls hidden by the keyboard/safe area. Native design tokens/fonts, 48dp minimum touch and 56dp primary controls remain the visual baseline.
2. **Read/write/reopen:** edit→save→GET readback→leave/reopen→cold start; repeat by reverting to the original value. Repeat with website writing while mobile is open; define conflict/refresh behaviour rather than silently overwriting.
3. **Pricing:** tenant-owned versus default/unadopted/invalid data; false/true GST; optional zero versus forbidden zero; required conditional unknown/mismatch/match; stale rate/input revisions; cross-trade/tenant IDs; server validation bypass attempt in isolated tests. Quote totals must match server-authorised snapshots exactly; no money formula fork in native.
4. **Async uncertainty:** slow/stalled JSON and PDF bodies, cancelled file picker, partial upload/commit, stale response after route switch, process killed during extraction/pricing, missing readback and lost mutation response. A previous result cannot silently regain Save eligibility.
5. **Permission/capability:** entitlement disabled, feature flag disabled, signed out/no tenant/no HQ org, denied media permission, expired signed URL, missing maps/model/PDF integration, unapproved source/fixture-only topology. Disabled is an explicit capability state, not a false empty success.
6. **Release policy and human decisions:** draft creation, estimate preview, rules dry-run, compliance assessment and export perform only their documented operations. Quote release and delivery must follow G-001's reconciled, approved policy for the trade, origin and state: preserve required visible human approval and existing authorised automatic-release exceptions without silently broadening or overriding either. HQ decisions, customer consent and provider/source-gated work retain their own action and server-authority requirements; a generic save or preview must not introduce additional sends or provider work beyond the approved policy. Test these using intercepted or isolated nonproduction business APIs; never send real SMS/email or execute live billed model/provider actions as a screenshot check.

**Audit completion criterion:** every route/component row above maps to a stable requirement, a verified native implementation or an explicit remaining backend/gated dependency. A browser link, unused hook, loose schema or passing style test cannot close a missing native workflow.

## Cross-cutting requirements and backend boundaries

These requirements apply to **every** feature matrix row, including native functionality already present. They close gaps that copying a page's JSX would miss. “Partial” here identifies incomplete coverage or an unverified lifecycle, not a claim that every existing call is broken.

| ID | Current comparison and source evidence | Required implementation and acceptance evidence |
| --- | --- | --- |
| X-001 | **Partial navigation coverage.** The app has five primary tabs and eleven section routes; the website additionally has nested workspaces, query-selected dashboard sections, owner editors and token pages. See the route appendix and `mobile/src/app/`. | Maintain a typed destination registry for every website capability, including current query parameters, quote/job/run IDs, trade and selected section. Every implemented destination must be reachable through app navigation and Back must return to the prior list, filter and scroll position. No label may promise a native screen while silently opening the generic dashboard. |
| X-002 | **Missing universal-link configuration in the inspected app config.** `mobile/app.json` defines the `quotemax` scheme, but no iOS associated domains or Android verified-link intent filters. Push routes use relative strings in `mobile/src/lib/notifications.ts:67`. | Add verified app-link/universal-link support for approved QuoteMax hosts and route families, retaining browser fallback. Handle installed/uninstalled, cold/warm, signed-out/signed-in, cancelled sign-in, expired token, wrong tenant and not-found cases. Validate host/path/parameter shapes and replay the intended destination only after auth/role resolution. Do not route arbitrary strings directly into a privileged workspace. Domain association deployment is an explicit release dependency. |
| X-003 | **Partial push journey.** Device registration, retirement and warm/cold tap handling exist in `mobile/src/lib/notifications.ts:110,175,194`; backend delivery is shared under `web/lib/push/`. Current handler pushes the relative path and does not establish complete feature-specific refresh/selection coverage. | Preserve denied-permission and physical-device checks, token rotation and sign-out retirement. Verify each backend event lands on the exact quote/chat/job, refreshes authoritative state, does not replay an old tap on every launch, and cannot disclose another account's record. Cover foreground, background, terminated, locked and logged-out states. Confirm accepted receipt vs carrier/store delivery semantics; never claim notification delivery from a queued request alone. |
| X-004 | **Partial return-to-app freshness.** Website quote and chat surfaces refresh on focus/visibility (`web/app/dashboard/page.tsx:664,15346`). Native queries use a 30-second stale time and disable window-focus refetch (`mobile/src/lib/query.ts:20,35`); no `onlineManager`/`focusManager`/NetInfo wiring was found in native source. | Connect native foreground and network recovery to bounded, deduplicated revalidation. Refresh affected quote, chat, payment, file, trade and entitlement records after browser/provider returns and push events. Do not overwrite dirty form edits. Tests must change a record from another client, return to the app and observe the new state without signing out. |
| X-005 | **Partial offline semantics.** Native persisted query reads exist (`mobile/src/lib/query.ts:15`, `mobile/src/app/_layout.tsx:120`); mutations have no automatic retry and no durable mutation queue was found. | Show last-updated and stale/offline state on cached data. Allow safe draft editing locally where appropriate. For writes, either require connection and preserve the draft, or implement an explicit idempotent queue with visible pending/failed state. Never show “saved”, “sent”, “paid” or “will sync” merely because the device accepted a tap. Do not add speculative background execution. |
| X-006 | **Partial persisted-state isolation.** Query persistence is app-wide with a 24-hour lifetime and app-version buster (`mobile/src/app/_layout.tsx:122`). Shared sign-out clears in-memory queries (`mobile/src/lib/sign-out.ts:11`) but does not directly remove the persister's stored client in that helper. | Partition or clear persisted data, uploads, drafts, chat state, purchases and pending navigation by verified user/tenant. Test account A → sign out → account B, Clerk account switch, expired sessions, offline logout, process death during cleanup and schema/version migration. No previous tenant's data may flash on hydration. Minimise sensitive local storage and remove temporary files according to an explicit retention policy. |
| X-007 | **Present typed transport; incomplete end-to-end failure proof.** `mobile/src/lib/api.ts:63` validates JSON with Zod and keeps the timeout around body parsing; `mobile/src/lib/useApi.ts:24` separately bounds token acquisition. | Reuse these clients rather than adding uncontrolled fetches. Each contract must distinguish null/zero/unavailable, `ok:false` on HTTP 200, validation fields, 401/403/404/409/422/429/5xx, malformed JSON and changed schemas. Test stalled headers **and stalled response bodies**, expired sessions and cancellation. A missing Clerk token must not silently execute a private operation as a legacy or anonymous user. |
| X-008 | **Partial mutation outcome handling across features.** Mutations are not retried automatically (`mobile/src/lib/query.ts:38`), but timeout/reconnect ambiguity still exists for long-running generation, upload, activation and delivery. | Add or reuse server operation IDs/idempotency where needed; distinguish not-started, pending, succeeded and unknown outcome. After an ambiguous timeout, reconcile by stable server ID before allowing another paid/generative/send mutation. Two taps or app remounts must not create duplicate quotes, payments, imports, uploads, messages or provisioned numbers. |
| X-009 | **Shared identity model.** Website routes use both verified Clerk and legacy Supabase identity paths (`web/lib/tenant/current.ts:72`, `web/lib/tenant/from-request.ts:43`). Native uses Clerk; `mobile/src/lib/supabase.ts:1` explicitly says it is not the production data path. | Keep Clerk as the app's credential authority and use the existing tenant-scoped backend. Never put service-role/provider secrets in `EXPO_PUBLIC_*`, decode an unverified JWT as authorisation, query privileged tables directly to avoid a missing API, or assume browser cookies accompany an app bearer request. Verify authentication, ownership and feature entitlement for every new read and write. |
| X-010 | **Backend entitlement checks vary by route.** `web/lib/features/guard.ts:31` resolves tenant identity and trade enablement; UI hiding alone does not enforce it. | For every feature, test allowed trade, disabled trade, multi-trade account, suspended account, expired plan and cross-tenant record IDs. Return non-enumerating errors for private IDs. Revalidate access when entitlements change during an open screen; disable stale write controls without losing safe draft data. |
| X-011 | **Native subscription UI exists, server reconciliation is not proven by it.** `mobile/src/lib/purchases.ts:131,154` uses RevenueCat state and Clerk identity; `mobile/src/features/sections/BillingScreen.tsx:115` presents the paywall. | Honour `G-006`: verify receipt/server entitlement reconciliation with website billing and `/api/tenant/features`. Test purchase, cancellation, restore, upgrade, downgrade, renewal, expiration, refund, unavailable SDK and another account's purchase. Render success only after the authoritative state agrees. Never sell or charge a duplicate subscription because the store and website disagree. |
| X-012 | **Present money boundary, broad preservation requirement.** Native dollars/cents conversion and formatting live in `mobile/src/lib/money.ts:56,69`; server trade pricing varies. | Keep integer cents in native money state, convert API dollars only at explicit boundaries and use the existing rounding functions. Render actual GST registration/basis, fees, credits, deposits and totals from the server. Tests must include zero, null, negative credit, decimal rates, registered/unregistered tenants, historical price versions and cent-edge values. A client sum is not an authoritative quote total. |
| X-013 | **Partial pricing freshness and save identity.** The trade audit identifies independent server/client save and pricing deltas; prior reviews cannot substitute for current evidence. | Bind every preview/save/release to the tenant, trade, run/extraction ID, current pricing-book version and inputs actually reviewed. Repricing, editing quantities, changing rates, navigating away or reopening a run must invalidate obsolete verification. Persist, refetch and reopen to prove the same data was saved. Missing/invalid current prices must remain explicitly unpriced or inspection-required, never silently zero or a stale fallback. |
| X-014 | **Shared quote lifecycle; policy conflict remains `G-001`.** Generic, roofing, painting, solar, commercial and plan quotes use different release, acceptance and booking rules. | Create a source-backed per-trade state/action table and use it for native affordances. Separate approval, release, customer visibility, queued sending, carrier acceptance, payment, booking, completion and cancellation. A successful save must not imply send; a return URL must not imply payment; an imported historical quote must not gain live actions. Repeated/reordered webhooks and concurrent users must not corrupt state. |
| X-015 | **Partial global recovery.** Website has `web/app/global-error.tsx` and `app/not-found.tsx`; native route census has no custom error/not-found route, and root startup ignores font-load errors (`mobile/src/app/_layout.tsx:90,103`). | Provide an app error boundary, unknown-route recovery and an honest splash/font failure fallback with retry. Preserve intended navigation and safe unsaved drafts. Test malformed links, missing/deleted records, render exceptions, offline startup and font failure; users must not remain on an endless splash or blank screen. |
| X-016 | **Partial observability parity.** Website reports errors through Sentry (`web/app/global-error.tsx:16`, `web/instrumentation-client.ts:13`); no native Sentry integration was found in the scanned dependencies/source. | Provide privacy-safe error reporting for native route, schema, upload, stream and failed background-return paths using the project's approved monitoring service. Include stable operation IDs, app/runtime version and route, not customer message bodies, tokens, provider credentials or complete quote documents. Respect consent requirements and do not add session recording by default. |
| X-017 | **Present native file foundations; per-feature coverage varies.** `mobile/src/lib/media.ts` uses camera/library selection and multipart files; several website upload/drop areas remain absent in feature matrices. | Implement equivalent picker/camera/library affordances for every web upload field. Preserve server-supported formats, caps, multiplicity, field names and purpose; validate MIME/content server-side, not extension only. Handle denied/limited permissions, unknown size, huge/corrupt/rotated images, cancelled picker, network loss and signed-URL expiry. Show progress and resumability only where actually supported. |
| X-018 | **Present authenticated download/share helper; timeout/cleanup coverage incomplete.** `mobile/src/lib/download.ts:49` uses bearer-authenticated downloads and sanitises names, but does not expose progress/cancellation/timeout or per-operation cache naming. | Use authenticated byte downloads for private files/PDFs rather than unauthenticated `Linking.openURL`. Validate response status/MIME, use unique safe cache names, provide retry/cancel, avoid concurrent same-name collisions and clean temporary files. Confirm Save to Files/share/print behaviour on both platforms and do not share a JSON/HTML error page as a document. |
| X-019 | **Partial first-party browser hand-offs.** `mobile/src/features/trades/hub/LinkOut.tsx:15` opens backend-origin paths without a browser-session exchange; quote detail, measurement results, calendars and editors rely on this. | Replace first-party editing/management hand-offs as specified. Retained provider/public links must be allowlisted, handle launch failure, retain context and refresh on return. Never append bearer/session tokens to URLs. Do not assume the external browser is signed in to the same account as Clerk in the app. |
| X-020 | **Present branding within screens; startup assets diverge.** Native tokens specify charcoal/paper/yellow and Manrope/JetBrains (`mobile/src/lib/theme.ts:79`), while `mobile/app.json` still contains blue primary/splash/notification values and pale-blue Android backgrounds. | Preserve the polished design system and reconcile launch/splash/system bars/notification tint/adaptive icon backgrounds with approved brand assets. Support System/Charcoal/Paper, persisted preference and legible transitions. Verify actual iOS/Android launch assets; web screenshots cannot prove native splash/icon behaviour. |
| X-021 | **Partial cross-platform accessibility verification.** Native shared controls were recently polished, but physical-device assistive-technology evidence is not part of this audit. | Every new control needs a useful label/role/state, minimum 48dp target, logical reading/focus order and announced validation/loading results. Test VoiceOver/TalkBack, large text, reduced motion, external keyboard where applicable, 320px/390px narrow layouts, both themes, safe areas, Android Back and keyboard-open actions. Keep destructive confirmation and return focus/context after dialogs. |
| X-022 | **AU formatting is a declared requirement; per-page handling varies.** Existing mobile money helpers use `en-AU`; website scheduling and date-based filters have their own semantics. | Preserve AU spelling, phone/address/state validation, metric units and explicit GST labels. Treat service-location timezone as data: test NSW daylight saving vs QLD, UTC/day boundaries, midnight, ambiguous dates and expired booking windows. Never infer a job's timezone from the device, which may be elsewhere. |
| X-023 | **Partial long-list and query parity.** Website tables have search, sort, status/date/trade filters, pagination and cross-source queue semantics; native deltas are listed in CORE/TRADE rows. | Preserve the order of filter, merge, sort and pagination operations, counts, empty-vs-filtered-empty states, page-size/next/previous controls and selected item context. Test datasets larger than one page, equal timestamps, diacritics, case, deleted records, newly added data and slow secondary sources. Do not append saved jobs outside filters/sort or drop them when one source errors. |
| X-024 | **Partial form persistence and baseline correctness.** Native forms often seed state once; the trade audit records save/switch/revert cases. | Maintain per-record dirty state and refresh the saved baseline after success. Changing trade/customer/run must not carry another record's values. Warn before destructive discard; preserve drafts on recoverable errors and keyboard navigation. Explicitly distinguish blank, zero, unset/default and unchanged fields according to the endpoint schema. Tests must save A→B, revert B→A, save again, then refetch/relaunch. |
| X-025 | **Missing/full parity depends on real streaming contracts, not helper presence.** `mobile/src/lib/ai.ts:27,34` points at `/ai/quote-assistant` and has no consumer in the scanned native source; no corresponding website route was found. | Do not count this dormant helper as a shipped assistant. Implement only the actual website assistants identified in CORE/TRADE requirements, using their real authenticated backend contracts. Preserve stream framing, partial tokens, cancellation, multi-byte text, source citations, refusal/unpriced states and bounded reconnect behaviour. Do not move pricing/model credentials or authoritative calculations into the device. |
| X-026 | **Partial media parity.** Website offers PDF/HTML viewers, videos, image lightboxes, maps, overlays and interactive 3D; native has a subset of these viewers. | Provide view/download/share/full-screen/zoom controls wherever the source exposes them, with loading/progress/error/retry and accessible non-visual summaries. For a specialised embedded renderer, restrict origin and bridge messages, keep auth outside page JavaScript and expose the complete same task inside native navigation. Wrapping the entire dashboard in a WebView is not completion. |
| X-027 | **Gated topology source access is deliberate.** `web/lib/roofing/edge-analysis-config.ts:48`, `edge-analysis-retention.ts:27` and `topology/google-solar-data-layers.server.ts:154` require separate flags, approved geometry source, durable commercial approval and valid retention. | Mirror disabled/setup-required/approval-required/expired/recorded states. Do not enable acquisition or retain licensed assets using client-supplied approval IDs. Keep keys/provider URLs server-side, source attribution visible, expired/revoked evidence hidden, and imagery retention consistent with server authorisation. Source licences and deployment flags are external enablement gates, not missing mobile buttons. |
| X-028 | **Existing topology is preview-only.** `web/app/api/dashboard/roofing/measurements/[id]/topology/route.ts:93,125,165` is tenant-gated, deliberately returns `fixturePreview: true`, and says a recorded source approval is non-authorising. | Add the same saved-measurement structure selector, evidence preview, disclaimer and reason states to native if entitled. Preserve 404 for missing/malformed/cross-tenant/tenantless IDs and 422 for unavailable measurement. Tests must prove fixture geometry never becomes measured metrics, price input, a customer-facing approval or a live provider request. |
| X-029 | **Shared map/render provider boundary.** `web/lib/roofing/google-tiles.ts:1,85` proxies server-keyed tiles and falls back when unavailable; other map/3D endpoints have distinct token/feature rules. | Reuse scoped proxy/asset contracts, validate coordinates and URLs, preserve attribution and graceful fallback, and show unavailable/low-confidence imagery rather than invented geometry. Do not treat a 3D/rendered “after” image as survey evidence or a customer-approved design. Confirm each capture/generation action's cost and permission before enabling it. |
| X-030 | **Backend-only route families already serve both platforms.** Cron, SMS/Vapi/Twilio intake, Stripe webhooks, push receipts and health routes appear in the handler census. | Do not add native buttons for privileged schedulers, webhook replay or provider secrets. Verify the visible outcome through authorised app APIs: a lead/quote arrives, delivery status updates, payment is reconciled, booking appears, entitlement changes and expired tokens are retired. Missing jobs/configuration are backend deployment dependencies and cannot be fixed with client polling that bypasses authority. |
| X-031 | **Additional public documents outside App Router.** Census found 41 HTML documents, seven PDFs and one CSV under `web/public/`; these are enumerated separately. | Include a read-only Help/Docs catalogue or approved role-specific document destination with titles, navigation, available downloads and accessible zoom/share. Preserve the four recipe-guide accordions and walkthrough theme control. Keep historical dates/limitations visible; documents do not prove their proposed architecture/features are live. |
| X-032 | **Missing illustrative painting calculator in native documentation.** `web/public/docs/paint-estimator-explained.html:483–525,741` contains a local educational calculator: m²/hourly modes; wall/ceiling/trim/exterior quantities and rates; hourly productivity; coats, prep, storeys and colour-change inputs. | If this document is exposed in mobile Help, preserve all 17 input/select controls, both mode buttons and live explanation/output. Label values illustrative and keep them isolated from real tenant pricing, saved quotes, deposits and customer totals. Verify switches and inputs explain the same example; never import example defaults into a production rate card. |
| X-033 | **Release/runtime assumptions require revalidation.** `mobile/package.json` and `app.json` currently use Expo SDK 54, RN 0.81.5, React 19.1.0 and app-version runtime policy. | Read installed/versioned framework docs before implementing. Add only dependencies required for identified gaps; update the stack record and app/runtime version when a new native module demands it. Typecheck, lint, meaningful contract tests, web smoke tests and iOS/Android exports must pass; native-only SDK/device checks remain separate. Do not publish or deploy merely because local builds pass. |
| X-034 | **Unverified configuration-generated controls.** Clerk account widgets, Stripe portals/checkouts, store paywalls and authorised external editors can expose controls based on service configuration; those controls are not fully enumerable from local JSX alone. | With authorised test accounts, inventory the controls actually enabled for each provider: account identifiers/profile/password/session/security methods, billing payment methods/invoices/subscription changes, store restoration and provider-editor return actions. Match the enabled capabilities through the correct SDK or legitimate provider hand-off. Treat optional MFA/passkeys/social providers as configuration to verify, not as invented enabled features. Record provider/version/configuration evidence and any inaccessible state; do not claim the static census exhausts remote widgets. |

## Implementation order and delivery contract

Work in runnable increments. Do not rewrite the app wholesale or discard the existing visual polish. A requirement can involve both repositories: a safe mobile client cannot compensate for an unauthorised or price-trusting backend.

| Phase | Work and deliverable | Dependencies | Exit evidence |
| --- | --- | --- | --- |
| 0 | Refresh the complete page/handler/control census; classify all requirements and resolve or register `G-*` decisions. Snapshot dirty files. Define authorised user/tenant/plan/trade fixtures and exact current contracts for every planned write. | None | Inventory has no unassigned routes or components; each blocking decision has an owner/reason; no original edits lost. |
| 1 | Complete routing, deep links, session boundaries, loading/error/offline states, shared field/upload/download/viewer primitives and authoritative feature access. Use existing theme and API abstractions. | 0 | `X-*` foundations pass on a real native runtime; signed-out/expired/cross-tenant navigation is safe; existing tabs still work. |
| 2 | Finish Clerk authentication and onboarding, resume/intent/plan handling, account/profile/licence/trade/schedule settings and billing/provider reconciliation contracts. | 1; applicable decisions | New and existing users can resume correctly; field validation matches server; plan/tenant access is authoritative after cold start. |
| 3 | Complete overview, unified queues, filters/counts, quote/job details, native document editing, layout/tier/branding settings, approval/send and contextual chat editing. | 1; stable quote read/write contracts; `G-001` for release behaviour | Each live and historical quote family renders the correct actions. Edit→save→refetch→reopen preserves the document and money; no duplicate sending or copied owner token. |
| 4 | Complete trade navigation, feature activation, labour/roof/paint/solar pricing, services/brands, catalogue, tier ladders, recipes, estimating and the pricing wizard. | 1–2; authoritative pricing contracts | Round-trip every editable field; changed pricing propagates without corrupting historical versions; write gates stay closed until endpoints truly support the trade. |
| 5 | Electrical/plumbing job forms and generic estimator: every job field, catalogue selection, plan upload, extraction/refinement, takeoff, price coverage, history/reopen, overlays and assistant controls. | 3–4 | Compare the same intake/plan against website output; ambiguous/unpriced items cannot become customer-priceable defaults; saved runs reopen. |
| 6 | Roofing measurement, saved jobs, multi-structure review, native map/edit/photo/edge/layout/model/report flows and topology preview states. | 3–4; safe promotion/reprice contracts; `G-007` | Measurement changes reprice on server; no client-trusted aggregate total; licensed/synthetic evidence remains correctly gated. |
| 7 | Residential/commercial painting: input/preview/building selection, material/photographic review, rate variants, plan/takeoff editing, price/save/release and historical run recovery. | 3–4; freshness guards; `G-001` | Current-rate and inspection gates survive edit/navigation/relaunch; no saved partial priceable BOM; real save/send outcomes shown separately. |
| 8 | Solar and air-con: all calculator/intake/model/hardware/result/assessment/document controls, building/layout/re-draft paths and authorised provider hand-offs. | 3–4; provider contracts/flags | Invalid rates remain unpriced; PDFs use persisted tenant-scoped IDs; every scenario/model selection survives save/refetch. |
| 9 | Chats/CRM, calendars/bookings, follow-ups/events/calls/messages, payouts, files/comments/resolve, historical imports/review/analytics/calibration. | 1–3; source-specific contracts | Each tab is usable without opening a first-party dashboard; messaging/calling remains explicitly confirmed; provider cancellation and retry preserve context. |
| 10 | Marketing/referral/invite codes, QR/slug, announcements, flyers/Canva, videos, studio and the complete signage workspaces. | 1–3; entitlement and upload primitives | Create/edit/share/export/import/reopen flows work; external provider editors return safely; generation/publishing/sending requires the correct explicit action. |
| 11 | Public marketing/help/legal, all token/customer document previews, native guest/customer journeys, server-authorised admin tools and static document controls. | 1–3; `G-002`; stronger role/capability adapters where required | Every page in the census has an explicit destination and proof. Native counterparts are required by the requested scope; customer links also work in a browser with no app installed. No tradie gains administrative or customer-consent authority. |
| 12 | Full regression, independent review, device verification and release-readiness report. Close every row or name the exact externally blocked dependency. | All implementation phases | No hidden first-party hand-offs, untested writes, stale pricing, cross-tenant access or unmatched inventory entries. Runtime/export/test results are recorded accurately; publication remains a separate authorised action. |

Phases 5–10 can proceed in parallel after their shared contracts/primitives are stable. Assign file ownership to avoid competing edits to `HubScreen`, `SectionsContent`, `tenant.ts`, shared API clients or the monolithic website dashboard. Do not split or replace the backend monolith just to perform this parity work; extract contracts/components only where necessary and covered by meaningful tests.

### Required task anatomy

For each matrix ID, the implementation agent must record: (1) the native destination and owning files, (2) the actual or explicitly **new** backend endpoint/method/schema, (3) identity/tenant/feature/capability guard, (4) loading/empty/error/retry/offline states, (5) save/refresh/reopen semantics, (6) dependencies/gates, and (7) acceptance evidence. For data currently available only to a server-rendered page, add a minimal authorised JSON/read contract that exposes the required view model; do not scrape HTML, copy database service keys or invent a supposedly existing endpoint.

For a proposed endpoint, specify request validation, response schema, money units, nullable fields, stale-version handling, idempotency/outcome reconciliation and explicit error codes. Derive authority from the authenticated request or valid capability, never from an arbitrary submitted tenant ID. Reuse the website's server pricing and formatting inputs, but validate any existing trust weakness before exposing it through another client.

Distinguish persisted records from temporary editor state. Server save/refetch/reopen requirements apply wherever the feature promises a saved object or setting. Brand Studio currently offers in-memory slide editing and exports, with no project-save API (CORE-234/B19 and TRADE-024); implement that complete editing/export capability without inventing an existing cloud-save contract. Any native local draft must be labelled local, isolated by account and cleared on sign-out; adding cloud project persistence is additional backend scope. Temporary filters, preview-only adjustments and unsaved proposals must not display a server Saved state.

### Preservation and done rules

- A **Present** row is a regression obligation. Do not replace a working native feature with a link or remove a control simply because another screen has a similar name.
- Native parity means the user can find and complete the feature's actual workflow: inspect, edit where authorised, submit or export, confirm the result, and reopen the same object wherever saving is supported. Matching a screenshot is not sufficient.
- Public browser compatibility, provider hand-offs and backend-only routes are distinct classifications; do not use these exceptions to hide a missing first-party native workflow.
- Do not treat implemented-but-disabled code as a functioning release feature, or a documented/fixture workflow as current production functionality.
- Any temporary unsupported/unpriced/setup-required state must explain the real reason and next action. No success toast on an ignored field, `ok:false`, cancelled picker, unverified mutation or queued-but-unsent message.
- Use existing en-AU copy, Manrope/JetBrains fonts and charcoal/paper/yellow tokens. Prefer familiar native interactions while preserving every action, field and state; the task is functional equivalence, not copying desktop column widths.
- Do not resolve an authority, legal-source, feature or store-policy gate by weakening it. Local implementation/testing can continue on independent work; production mutations, purchases, sends, migrations and publishing require their own authorisation.
- Do not rewrite model prompts to compensate for a missing UI or contract. If a required backend change actually changes prompting, follow the repository's hold-out evaluation and delta-measurement rule before treating the change as ready; money-touching model steps must retain tool-based pricing authority.

## Acceptance suite

### Fixture matrix

Use isolated fixtures or an explicitly authorised test environment, never production customer records. Include an electrical NSW tenant, a plumbing QLD tenant, all existing specialised trade families, a multi-trade tenant, GST registered and unregistered tenants, a tenant without current valid pricing, a disabled/suspended/expired-plan tenant, a second unrelated tenant, an invited/team identity if the server supports seats, a real administrator test role, a non-admin role and signed-out/public-token users. Names and prices in these fixtures are test data only.

Quote/run fixtures must include every website family: generic electrical/plumbing, roofing, residential painting, solar, air-con, commercial painting and plan/estimator; draft/review/held/released/sent/accepted/paid/booked/completed/error/expired states as supported by that family; historical-imported records; unlinked saved jobs; a failed or pending generation; deleted records; and multiple pages of data. Never force one generic lifecycle onto all families.

| Test class | Required proof |
| --- | --- |
| Route/control coverage | Every page, handler family, static interactive document and control group in the appendices is assigned to a numbered requirement and final destination. Every action has a native execution path or an explicit approved audience/provider/backend-only classification. |
| Contracts | Validate real successful and failed payloads at the Zod boundary. Exercise both accepted and rejected method/body shapes; unknown extra fields must not conceal missing required monetary/status fields. Prove proposed contracts exist before pointing mobile at them. |
| Tenant/role access | Attempt each private read and mutation as the owner, another tenant, signed out, expired session and a disallowed trade/role. Public tokens get only their intended capability; admin endpoints never rely on a client menu check. |
| Persisted writes | For each persisted editable field: load A, change to B, save, refetch, navigate away/back and relaunch. Revert B→A and save again. Exercise simultaneous web/mobile updates; preserve unrelated fields and reject stale versions where needed. For preview-only editors, verify draft/export fidelity and any explicitly implemented local recovery without claiming a server save. |
| Pricing authority | Change the tenant's active labour/material/rate card after extracting or loading a run. Reopen and try to save. Verify missing, inactive, non-finite and unsupported prices block customer pricing; historical quote versions remain unchanged; display and PDF totals agree to the cent. |
| Delivery/payment | Use mocks or approved test providers. Two taps, timeouts after server success, cancellation, delayed callbacks, repeated webhooks and cold return cannot send/charge twice. Display carrier/provider acknowledgement accurately; never equate URL navigation with settlement. |
| Connectivity | Offline cold start, dropped connection during read/write/upload/stream, stalled JSON body, permission denial, account switch during a request, retry after reconnection and device resume. Drafts survive; unknown outcomes reconcile before retry. |
| Files/media/maps | Corrupt/oversized/unsupported files, slow upload, expired signed URL, image rotation, limited library permission, authentication failure on download, same-name parallel downloads, no native share target, unavailable imagery and revoked source permission. |
| Device UX | Actual iOS and Android or appropriate native test runtimes: safe areas, keyboard, Android Back, accessibility, large text, reduce motion, portrait/narrow phones, System/Charcoal/Paper, permissions, deep links, push and native billing. Expo-web screenshots cover layout only. |
| End-to-end journeys | From an authenticated tradie: intake/plan→draft→review/edit→save→send confirmation→customer browser acceptance/payment→booking→app refresh/complete, for each supported trade policy. Also import→review→calibration, catalogue→recipe→estimator, file→comment→resolve, invitation→onboard, subscription→entitlement and generation→asset→share. |

### Commands and review

Run native `npm run typecheck`, `npm run lint`, `npm run test:ci -- --runInBand`, focused `npm run test:e2e -- <spec>` as appropriate, `npm run doctor`, and explicit iOS/Android export checks after relevant changes. Discover the website's current `package.json` commands and run its meaningful affected contract/domain tests plus build/type/lint checks where applicable. Do not install unneeded packages just to run a guessed command. Read the installed Next.js guides and the [Expo SDK 54 documentation](https://docs.expo.dev/versions/v54.0.0/) before framework changes.

Previously observed UI tests and mocked browser captures in this workspace are not comprehensive parity evidence. If a runner needs `--forceExit`, has retained handles, skips device SDKs, uses mocks or cannot reach authorised services, report that limit explicitly. A green subset cannot close unrelated matrix IDs.

Use an independent reviewer to check missed website controls, wrong payloads, tenant/role isolation, price freshness, mutation idempotency, paid-provider/notification behaviour and regressions to existing native features. Fix actionable findings and repeat the affected checks. An approved exclusion must identify the approver/reason and remain visible; do not quietly delete it from the specification.

## Implementation ledger

**Initial ledger state: NOT STARTED.** This audit did not implement missing features. Audit status in the comparison tables is not implementation status.

Every numbered requirement is listed below. Before coding, fill in the actual native files, contract and dependencies; update evidence and state as each requirement is implemented and verified. Keep this complete checklist in the same file so a new LLM can resume using the one command.

| Requirement ID | Native destination / files | Backend contract / dependency | Implementation state | Evidence and remaining blocker |
| --- | --- | --- | --- | --- |
| G-001 | `specs/web-mobile-completeness-spec.md`; all new save/release work retains human-review and separate send outcomes | Owner-approved per-trade/origin release policy is not represented by one reconciled source | Externally blocked; stricter guard retained | No automatic-send strategy change is made in this parity build. An owner decision and strategy review are required before any conflicting per-trade policy can be enabled. |
| G-002 | `PRODUCT.md`, `CLAUDE.md`, audience-aware `src/lib/destinations.ts` | Current request expands scope; public browser compatibility and server capability/role checks remain mandatory | In progress | Product docs now record tradie, guest/customer and admin separation. Native public/customer/admin destinations and full authority/device proof remain phase 11 work. |
| G-003 | See G-003; record changed native files | See G-003; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| G-004 | `PRODUCT.md`, `CLAUDE.md`, `src/features/sections/PayoutsScreen.tsx` | Fee/GST/deposit/site-visit values must come from current server records, not marketing constants | Partial; unsafe copy removed | Removed the hardcoded 2% payout claim and documented server authority. Per-trade quote/payment DTO and UI audit remains open. |
| G-005 | See G-005; record changed native files | See G-005; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| G-006 | `src/features/sections/BillingScreen.tsx`, `billing-state.ts`, `src/lib/purchases.ts` | Billing status remains the displayed authority; native store charging is disabled without a server receipt/webhook reconciliation contract | Externally blocked; client fail-closed | Existing Stripe customers use the allowlisted portal and cannot be sold a duplicate store subscription. New native purchases are not started until backend/provider reconciliation is implemented and verified. |
| G-007 | See G-007; record changed native files | See G-007; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| AUTH-001 | See AUTH-001; record changed native files | See AUTH-001; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| AUTH-002 | See AUTH-002; record changed native files | See AUTH-002; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| AUTH-003 | See AUTH-003; record changed native files | See AUTH-003; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| AUTH-004 | `src/features/auth/SignUpScreen.tsx`, `activation-session.ts` | Authenticated `POST /api/onboard/activate`; server-derived Clerk/legacy identity, one-use SMS intent and idempotent tenant reuse | Implemented; integration verification pending | 29 mobile and 89 affected web auth tests pass; forged/cross-provider identity and concurrent retry cases are covered with mocks. No live activation/provisioning was run. |
| AUTH-005 | `src/features/auth/onboard-fields.ts`, `SignUpScreen.tsx` | Shared activation schema; exact blank/zero/positive/bounded numeric parsing | Partial | Valid zero and invalid/junk semantics are covered; logo, readiness-driven trade selection, address suggestions, availability editor and full save/refetch/reopen evidence remain. |
| AUTH-006 | `src/features/auth/SignUpScreen.tsx`; acquisition envelope batch in progress | Intent/code/plan/source continuation through activation | In progress | Typed account-isolated continuation and remount tests are being implemented; full acquisition journey remains unverified. |
| AUTH-007 | `src/lib/destinations.ts`, `src/app/+native-intent.ts`, `resolve-link.tsx`, `invalid-link.tsx`, `SignInScreen.tsx` | Typed audience-aware destination registry; verified `/app` HTTPS namespace | Partial | Host/path/query rejection and auth-intent replay unit tests pass. Domain association deployment, public/admin token resolvers and cold/warm physical-device proof remain. |
| AUTH-008 | `src/features/sections/BillingScreen.tsx`, `PayoutsScreen.tsx`, `src/lib/provider-handoff.ts` | Mobile-return variants of billing portal and Connect start; verified `/app/sections/*` fallback routes | Partial | Provider hosts are allowlisted and state is refetched after return/cancel. Check-email and all success adapters plus device/provider verification remain. |
| AUTH-009 | See AUTH-009; record changed native files | See AUTH-009; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| PUBLIC-001 | See PUBLIC-001; record changed native files | See PUBLIC-001; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| PUBLIC-002 | See PUBLIC-002; record changed native files | See PUBLIC-002; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| PUBLIC-003 | See PUBLIC-003; record changed native files | See PUBLIC-003; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| PUBLIC-004 | See PUBLIC-004; record changed native files | See PUBLIC-004; verify actual contract | In progress | Focused unit coverage for contract, draft persistence, destinations and API response handling is complete; full end-to-end proof in release profile remains. |
| PUBLIC-005 | See PUBLIC-005; record changed native files | See PUBLIC-005; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| PUBLIC-006 | See PUBLIC-006; record changed native files | See PUBLIC-006; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| PUBLIC-007 | See PUBLIC-007; record changed native files | See PUBLIC-007; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| PUBLIC-008 | See PUBLIC-008; record changed native files | See PUBLIC-008; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| PUBLIC-009 | See PUBLIC-009; record changed native files | See PUBLIC-009; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| PUBLIC-010 | See PUBLIC-010; record changed native files | See PUBLIC-010; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| PUBLIC-011 | See PUBLIC-011; record changed native files | See PUBLIC-011; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| PUBLIC-012 | See PUBLIC-012; record changed native files | See PUBLIC-012; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| PUBLIC-013 | See PUBLIC-013; record changed native files | See PUBLIC-013; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| PUBLIC-014 | See PUBLIC-014; record changed native files | See PUBLIC-014; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| PUBLIC-015 | See PUBLIC-015; record changed native files | See PUBLIC-015; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| PUBLIC-016 | See PUBLIC-016; record changed native files | See PUBLIC-016; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| PUBLIC-017 | See PUBLIC-017; record changed native files | See PUBLIC-017; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| PUBLIC-018 | See PUBLIC-018; record changed native files | See PUBLIC-018; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| PUBLIC-019 | See PUBLIC-019; record changed native files | See PUBLIC-019; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| PUBLIC-020 | See PUBLIC-020; record changed native files | See PUBLIC-020; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| PUBLIC-021 | See PUBLIC-021; record changed native files | See PUBLIC-021; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| PUBLIC-022 | See PUBLIC-022; record changed native files | See PUBLIC-022; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| PUBLIC-023 | See PUBLIC-023; record changed native files | See PUBLIC-023; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| PUBLIC-024 | See PUBLIC-024; record changed native files | See PUBLIC-024; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| PUBLIC-025 | See PUBLIC-025; record changed native files | See PUBLIC-025; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| ADMIN-001 | See ADMIN-001; record changed native files | See ADMIN-001; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| ADMIN-002 | See ADMIN-002; record changed native files | See ADMIN-002; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| ADMIN-003 | See ADMIN-003; record changed native files | See ADMIN-003; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| ADMIN-004 | See ADMIN-004; record changed native files | See ADMIN-004; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| ADMIN-005 | See ADMIN-005; record changed native files | See ADMIN-005; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| ADMIN-006 | See ADMIN-006; record changed native files | See ADMIN-006; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| ADMIN-007 | See ADMIN-007; record changed native files | See ADMIN-007; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| ADMIN-008 | See ADMIN-008; record changed native files | See ADMIN-008; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| ADMIN-009 | See ADMIN-009; record changed native files | See ADMIN-009; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| ADMIN-010 | See ADMIN-010; record changed native files | See ADMIN-010; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| ADMIN-011 | See ADMIN-011; record changed native files | See ADMIN-011; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| ADMIN-012 | See ADMIN-012; record changed native files | See ADMIN-012; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| ADMIN-013 | `src/features/help/help-documents.ts`, `HelpScreen.tsx`, `/sections/help` | Complete 49-asset census with explicit tradie/gated audience; exact-path public viewer and PDF/CSV save/share | Partial; public catalogue implemented | Tradie-approved documents are discoverable and historical snapshots labelled; technical/investor/red-team/build material is counted but not promoted. Staff whoami/role-gated searchable directory and missing-document/native-reader device proof remain. |
| ADMIN-014 | See ADMIN-014; record changed native files | See ADMIN-014; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-001 | See CORE-001; record changed native files | See CORE-001; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-002 | See CORE-002; record changed native files | See CORE-002; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-003 | See CORE-003; record changed native files | See CORE-003; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-004 | See CORE-004; record changed native files | See CORE-004; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-005 | See CORE-005; record changed native files | See CORE-005; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-006 | See CORE-006; record changed native files | See CORE-006; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-007 | See CORE-007; record changed native files | See CORE-007; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-008 | See CORE-008; record changed native files | See CORE-008; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-009 | See CORE-009; record changed native files | See CORE-009; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-010 | See CORE-010; record changed native files | See CORE-010; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-011 | See CORE-011; record changed native files | See CORE-011; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-012 | See CORE-012; record changed native files | See CORE-012; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-013 | See CORE-013; record changed native files | See CORE-013; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-014 | See CORE-014; record changed native files | See CORE-014; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-015 | See CORE-015; record changed native files | See CORE-015; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-016 | See CORE-016; record changed native files | See CORE-016; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-017 | See CORE-017; record changed native files | See CORE-017; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-018 | See CORE-018; record changed native files | See CORE-018; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-019 | See CORE-019; record changed native files | See CORE-019; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-020 | See CORE-020; record changed native files | See CORE-020; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-021 | See CORE-021; record changed native files | See CORE-021; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-022 | See CORE-022; record changed native files | See CORE-022; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-023 | See CORE-023; record changed native files | See CORE-023; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-024 | See CORE-024; record changed native files | See CORE-024; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-025 | See CORE-025; record changed native files | See CORE-025; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-026 | See CORE-026; record changed native files | See CORE-026; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-027 | See CORE-027; record changed native files | See CORE-027; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-028 | See CORE-028; record changed native files | See CORE-028; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-029 | See CORE-029; record changed native files | See CORE-029; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-030 | See CORE-030; record changed native files | See CORE-030; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-031 | See CORE-031; record changed native files | See CORE-031; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-032 | See CORE-032; record changed native files | See CORE-032; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-033 | See CORE-033; record changed native files | See CORE-033; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-034 | See CORE-034; record changed native files | See CORE-034; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-035 | See CORE-035; record changed native files | See CORE-035; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-036 | See CORE-036; record changed native files | See CORE-036; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-037 | See CORE-037; record changed native files | See CORE-037; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-038 | See CORE-038; record changed native files | See CORE-038; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-039 | See CORE-039; record changed native files | See CORE-039; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-040 | See CORE-040; record changed native files | See CORE-040; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-041 | See CORE-041; record changed native files | See CORE-041; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-042 | See CORE-042; record changed native files | See CORE-042; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-043 | See CORE-043; record changed native files | See CORE-043; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-044 | See CORE-044; record changed native files | See CORE-044; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-045 | See CORE-045; record changed native files | See CORE-045; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-046 | See CORE-046; record changed native files | See CORE-046; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-047 | See CORE-047; record changed native files | See CORE-047; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-048 | See CORE-048; record changed native files | See CORE-048; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-049 | See CORE-049; record changed native files | See CORE-049; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-050 | See CORE-050; record changed native files | See CORE-050; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-051 | See CORE-051; record changed native files | See CORE-051; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-052 | See CORE-052; record changed native files | See CORE-052; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-053 | See CORE-053; record changed native files | See CORE-053; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-054 | See CORE-054; record changed native files | See CORE-054; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-055 | `src/features/quotes/api.ts`, `QuoteDetailModal.tsx` | Existing quote delivery mutation plus authoritative refetch | Implemented; integration verification pending | Optimistic Sent state was removed; sent/no-op/unknown/provider-error outcomes are tested. Carrier delivery and approved-provider integration remain unverified. |
| CORE-056 | See CORE-056; record changed native files | See CORE-056; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-057 | See CORE-057; record changed native files | See CORE-057; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-058 | See CORE-058; record changed native files | See CORE-058; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-059 | See CORE-059; record changed native files | See CORE-059; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-060 | See CORE-060; record changed native files | See CORE-060; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-061 | See CORE-061; record changed native files | See CORE-061; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-062 | See CORE-062; record changed native files | See CORE-062; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-063 | See CORE-063; record changed native files | See CORE-063; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-064 | See CORE-064; record changed native files | See CORE-064; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-065 | See CORE-065; record changed native files | See CORE-065; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-066 | See CORE-066; record changed native files | See CORE-066; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-067 | See CORE-067; record changed native files | See CORE-067; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-068 | See CORE-068; record changed native files | See CORE-068; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-069 | See CORE-069; record changed native files | See CORE-069; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-070 | See CORE-070; record changed native files | See CORE-070; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-071 | See CORE-071; record changed native files | See CORE-071; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-072 | See CORE-072; record changed native files | See CORE-072; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-073 | See CORE-073; record changed native files | See CORE-073; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-074 | See CORE-074; record changed native files | See CORE-074; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-075 | See CORE-075; record changed native files | See CORE-075; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-076 | See CORE-076; record changed native files | See CORE-076; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-077 | See CORE-077; record changed native files | See CORE-077; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-078 | See CORE-078; record changed native files | See CORE-078; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-079 | See CORE-079; record changed native files | See CORE-079; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-080 | See CORE-080; record changed native files | See CORE-080; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-081 | See CORE-081; record changed native files | See CORE-081; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-082 | See CORE-082; record changed native files | See CORE-082; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-083 | See CORE-083; record changed native files | See CORE-083; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-084 | See CORE-084; record changed native files | See CORE-084; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-085 | See CORE-085; record changed native files | See CORE-085; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-086 | See CORE-086; record changed native files | See CORE-086; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-087 | See CORE-087; record changed native files | See CORE-087; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-088 | See CORE-088; record changed native files | See CORE-088; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-089 | See CORE-089; record changed native files | See CORE-089; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-090 | See CORE-090; record changed native files | See CORE-090; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-091 | See CORE-091; record changed native files | See CORE-091; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-092 | See CORE-092; record changed native files | See CORE-092; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-093 | See CORE-093; record changed native files | See CORE-093; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-094 | See CORE-094; record changed native files | See CORE-094; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-095 | `src/features/sections/CalendarScreen.tsx` | Calendar response retains server `tenantTz` | Implemented; device verification pending | Perth/Sydney day-boundary and Sydney DST fallback tests pass; live service-location fixtures remain. |
| CORE-096 | See CORE-096; record changed native files | See CORE-096; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-097 | See CORE-097; record changed native files | See CORE-097; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-098 | See CORE-098; record changed native files | See CORE-098; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-099 | See CORE-099; record changed native files | See CORE-099; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-100 | See CORE-100; record changed native files | See CORE-100; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-101 | See CORE-101; record changed native files | See CORE-101; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-102 | See CORE-102; record changed native files | See CORE-102; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-103 | See CORE-103; record changed native files | See CORE-103; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-104 | See CORE-104; record changed native files | See CORE-104; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-105 | See CORE-105; record changed native files | See CORE-105; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-106 | See CORE-106; record changed native files | See CORE-106; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-107 | See CORE-107; record changed native files | See CORE-107; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-108 | See CORE-108; record changed native files | See CORE-108; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-109 | See CORE-109; record changed native files | See CORE-109; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-110 | See CORE-110; record changed native files | See CORE-110; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-111 | See CORE-111; record changed native files | See CORE-111; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-112 | See CORE-112; record changed native files | See CORE-112; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-113 | See CORE-113; record changed native files | See CORE-113; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-114 | See CORE-114; record changed native files | See CORE-114; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-115 | See CORE-115; record changed native files | See CORE-115; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-116 | See CORE-116; record changed native files | See CORE-116; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-117 | See CORE-117; record changed native files | See CORE-117; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-118 | See CORE-118; record changed native files | See CORE-118; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-119 | See CORE-119; record changed native files | See CORE-119; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-120 | See CORE-120; record changed native files | See CORE-120; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-121 | See CORE-121; record changed native files | See CORE-121; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-122 | See CORE-122; record changed native files | See CORE-122; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-123 | See CORE-123; record changed native files | See CORE-123; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-124 | See CORE-124; record changed native files | See CORE-124; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-125 | See CORE-125; record changed native files | See CORE-125; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-126 | See CORE-126; record changed native files | See CORE-126; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-127 | `src/features/menu/LabourRatesCard.tsx`, `labour-rates-state.ts` | Authoritative trade/mode key and existing pricing mutations | Implemented; integration verification pending | Trade/book changes reset stale selection/mutation state and A→B→A baseline tests pass. Persist/refetch/relaunch against a fixture tenant remains. |
| CORE-128 | See CORE-128; record changed native files | See CORE-128; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-129 | See CORE-129; record changed native files | See CORE-129; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-130 | See CORE-130; record changed native files | See CORE-130; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-131 | See CORE-131; record changed native files | See CORE-131; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-132 | See CORE-132; record changed native files | See CORE-132; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-133 | See CORE-133; record changed native files | See CORE-133; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-134 | See CORE-134; record changed native files | See CORE-134; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-135 | See CORE-135; record changed native files | See CORE-135; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-136 | See CORE-136; record changed native files | See CORE-136; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-137 | See CORE-137; record changed native files | See CORE-137; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-138 | `src/features/sections/PayoutsScreen.tsx` | `GET /api/tenant/payouts` | Partial | Null balance/bank values now render Unavailable, never `$0`; backend still collapses absent enrichment and provider lookup failure without a discriminator. |
| CORE-139 | See CORE-139; record changed native files | See CORE-139; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-140 | See CORE-140; record changed native files | See CORE-140; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-141 | See CORE-141; record changed native files | See CORE-141; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-142 | See CORE-142; record changed native files | See CORE-142; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-143 | `src/features/sections/PayoutsScreen.tsx` | `POST /api/quote/[id]/complete` | Implemented; provider verification pending | Completion, release, already, block and in-flight facts remain separate; every outcome refetches before retry. Live Stripe release was not run. |
| CORE-144 | `src/features/sections/PayoutsScreen.tsx`, `src/lib/provider-handoff.ts` | Mobile Connect start contract and `/app/sections/payouts` return | Partial | Completed-but-unreleased jobs retain retry and Stripe cancellation/return refreshes state; webhook/provider/device evidence remains. |
| CORE-145 | See CORE-145; record changed native files | See CORE-145; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-146 | See CORE-146; record changed native files | See CORE-146; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-147 | See CORE-147; record changed native files | See CORE-147; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-148 | See CORE-148; record changed native files | See CORE-148; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-149 | See CORE-149; record changed native files | See CORE-149; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-150 | See CORE-150; record changed native files | See CORE-150; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-151 | See CORE-151; record changed native files | See CORE-151; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-152 | See CORE-152; record changed native files | See CORE-152; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-153 | See CORE-153; record changed native files | See CORE-153; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-154 | See CORE-154; record changed native files | See CORE-154; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-155 | See CORE-155; record changed native files | See CORE-155; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-156 | See CORE-156; record changed native files | See CORE-156; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-157 | See CORE-157; record changed native files | See CORE-157; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-158 | See CORE-158; record changed native files | See CORE-158; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-159 | See CORE-159; record changed native files | See CORE-159; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-160 | See CORE-160; record changed native files | See CORE-160; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-161 | See CORE-161; record changed native files | See CORE-161; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-162 | See CORE-162; record changed native files | See CORE-162; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-163 | See CORE-163; record changed native files | See CORE-163; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-164 | See CORE-164; record changed native files | See CORE-164; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-165 | See CORE-165; record changed native files | See CORE-165; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-166 | See CORE-166; record changed native files | See CORE-166; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-167 | See CORE-167; record changed native files | See CORE-167; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-168 | See CORE-168; record changed native files | See CORE-168; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-169 | See CORE-169; record changed native files | See CORE-169; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-170 | See CORE-170; record changed native files | See CORE-170; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-171 | See CORE-171; record changed native files | See CORE-171; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-172 | See CORE-172; record changed native files | See CORE-172; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-173 | See CORE-173; record changed native files | See CORE-173; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-174 | See CORE-174; record changed native files | See CORE-174; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-175 | See CORE-175; record changed native files | See CORE-175; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-176 | See CORE-176; record changed native files | See CORE-176; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-177 | See CORE-177; record changed native files | See CORE-177; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-178 | See CORE-178; record changed native files | See CORE-178; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-179 | See CORE-179; record changed native files | See CORE-179; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-180 | See CORE-180; record changed native files | See CORE-180; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-181 | See CORE-181; record changed native files | See CORE-181; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-182 | See CORE-182; record changed native files | See CORE-182; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-183 | See CORE-183; record changed native files | See CORE-183; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-184 | See CORE-184; record changed native files | See CORE-184; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-185 | See CORE-185; record changed native files | See CORE-185; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-186 | See CORE-186; record changed native files | See CORE-186; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-187 | See CORE-187; record changed native files | See CORE-187; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-188 | See CORE-188; record changed native files | See CORE-188; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-189 | See CORE-189; record changed native files | See CORE-189; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-190 | See CORE-190; record changed native files | See CORE-190; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-191 | See CORE-191; record changed native files | See CORE-191; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-192 | See CORE-192; record changed native files | See CORE-192; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-193 | See CORE-193; record changed native files | See CORE-193; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-194 | See CORE-194; record changed native files | See CORE-194; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-195 | See CORE-195; record changed native files | See CORE-195; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-196 | See CORE-196; record changed native files | See CORE-196; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-197 | See CORE-197; record changed native files | See CORE-197; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-198 | See CORE-198; record changed native files | See CORE-198; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-199 | See CORE-199; record changed native files | See CORE-199; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-200 | See CORE-200; record changed native files | See CORE-200; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-201 | See CORE-201; record changed native files | See CORE-201; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-202 | See CORE-202; record changed native files | See CORE-202; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-203 | See CORE-203; record changed native files | See CORE-203; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-204 | See CORE-204; record changed native files | See CORE-204; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-205 | See CORE-205; record changed native files | See CORE-205; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-206 | See CORE-206; record changed native files | See CORE-206; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-207 | See CORE-207; record changed native files | See CORE-207; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-208 | See CORE-208; record changed native files | See CORE-208; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-209 | See CORE-209; record changed native files | See CORE-209; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-210 | See CORE-210; record changed native files | See CORE-210; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-211 | See CORE-211; record changed native files | See CORE-211; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-212 | See CORE-212; record changed native files | See CORE-212; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-213 | See CORE-213; record changed native files | See CORE-213; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-214 | See CORE-214; record changed native files | See CORE-214; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-215 | See CORE-215; record changed native files | See CORE-215; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-216 | See CORE-216; record changed native files | See CORE-216; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-217 | See CORE-217; record changed native files | See CORE-217; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-218 | See CORE-218; record changed native files | See CORE-218; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-219 | See CORE-219; record changed native files | See CORE-219; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-220 | See CORE-220; record changed native files | See CORE-220; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-221 | See CORE-221; record changed native files | See CORE-221; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-222 | See CORE-222; record changed native files | See CORE-222; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-223 | See CORE-223; record changed native files | See CORE-223; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-224 | See CORE-224; record changed native files | See CORE-224; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-225 | See CORE-225; record changed native files | See CORE-225; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-226 | See CORE-226; record changed native files | See CORE-226; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-227 | See CORE-227; record changed native files | See CORE-227; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-228 | See CORE-228; record changed native files | See CORE-228; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-229 | See CORE-229; record changed native files | See CORE-229; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-230 | See CORE-230; record changed native files | See CORE-230; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-231 | See CORE-231; record changed native files | See CORE-231; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-232 | See CORE-232; record changed native files | See CORE-232; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-233 | See CORE-233; record changed native files | See CORE-233; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-234 | See CORE-234; record changed native files | See CORE-234; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-235 | See CORE-235; record changed native files | See CORE-235; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-236 | See CORE-236; record changed native files | See CORE-236; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-237 | See CORE-237; record changed native files | See CORE-237; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-238 | See CORE-238; record changed native files | See CORE-238; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-239 | See CORE-239; record changed native files | See CORE-239; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-240 | See CORE-240; record changed native files | See CORE-240; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-241 | See CORE-241; record changed native files | See CORE-241; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-242 | `src/features/sections/VideosScreen.tsx`, `video-reference-images.ts` | Existing video multipart contract | Implemented; generation verification pending | State and multipart payload are capped at two supported images with explicit copy/tests. Real upload/generation/provider outcomes remain unverified. |
| CORE-243 | See CORE-243; record changed native files | See CORE-243; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-244 | See CORE-244; record changed native files | See CORE-244; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-245 | See CORE-245; record changed native files | See CORE-245; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| CORE-246 | See CORE-246; record changed native files | See CORE-246; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| TRADE-001 | See TRADE-001; record changed native files | See TRADE-001; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| TRADE-002 | See TRADE-002; record changed native files | See TRADE-002; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| TRADE-003 | See TRADE-003; record changed native files | See TRADE-003; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| TRADE-004 | See TRADE-004; record changed native files | See TRADE-004; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| TRADE-005 | See TRADE-005; record changed native files | See TRADE-005; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| TRADE-006 | See TRADE-006; record changed native files | See TRADE-006; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| TRADE-007 | See TRADE-007; record changed native files | See TRADE-007; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| TRADE-008 | See TRADE-008; record changed native files | See TRADE-008; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| TRADE-009 | See TRADE-009; record changed native files | See TRADE-009; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| TRADE-010 | `src/features/trades/commercial-painting/CommercialPaintingScreen.tsx`, `pricing-freshness.ts` | Existing commercial-paint preview lacks complete rate/input revision provenance | Partial; safety gate implemented | Verification starts/resets false, late responses are fenced and only persisted current preview data can pass. Save stays disabled until the backend exposes tenant-rate/input revision proof. |
| TRADE-011 | See TRADE-011; record changed native files | See TRADE-011; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| TRADE-012 | See TRADE-012; record changed native files | See TRADE-012; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| TRADE-013 | `src/features/menu/LabourRatesCard.tsx`, `labour-rates-state.ts` | Existing rate save/read contracts | Implemented; persistence verification pending | Remote/acknowledged baselines preserve dirty edits and A→B→A reversals, including blank/zero; fixture refetch/relaunch remains. |
| TRADE-014 | See TRADE-014; record changed native files | See TRADE-014; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| TRADE-015 | See TRADE-015; record changed native files | See TRADE-015; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| TRADE-016 | See TRADE-016; record changed native files | See TRADE-016; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| TRADE-017 | See TRADE-017; record changed native files | See TRADE-017; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| TRADE-018 | See TRADE-018; record changed native files | See TRADE-018; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| TRADE-019 | See TRADE-019; record changed native files | See TRADE-019; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| TRADE-020 | See TRADE-020; record changed native files | See TRADE-020; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| TRADE-021 | `src/features/trades/hub/sections/bom-readiness.ts`, `recipes-api.ts`, `RecipesSection.tsx` | Recipe/BOM reads preserve conditions; fork/create/PATCH endpoints remain lossy | Partial; unsafe fork blocked | Known/unknown/mismatch condition semantics, ratios and catalogue pins are tested and fail closed. Baseline fork remains disabled until shared endpoints preserve every condition/ratio field. |
| TRADE-022 | See TRADE-022; record changed native files | See TRADE-022; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| TRADE-023 | See TRADE-023; record changed native files | See TRADE-023; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| TRADE-024 | See TRADE-024; record changed native files | See TRADE-024; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| TRADE-025 | See TRADE-025; record changed native files | See TRADE-025; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| TRADE-026 | See TRADE-026; record changed native files | See TRADE-026; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| TRADE-027 | See TRADE-027; record changed native files | See TRADE-027; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| TRADE-028 | See TRADE-028; record changed native files | See TRADE-028; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| TRADE-029 | See TRADE-029; record changed native files | See TRADE-029; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| TRADE-030 | See TRADE-030; record changed native files | See TRADE-030; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| X-001 | `src/lib/destinations.ts`, route resolver/recovery screens | Typed route/audience/query registry | Partial | Current routes and `/app` returns are validated; later public/admin/editor destinations and list/filter/scroll restoration must be added as their screens ship. |
| X-002 | `app.json`, `src/app/+native-intent.ts`, destination resolver | iOS associated domains and Android verified `/app` filters | Partial; deployment blocked | Native config and resolver tests pass. Apple/Android association files, signing identities, installed/uninstalled fallback and device proof require deployment credentials/configuration. |
| X-003 | `src/lib/notifications.ts`, `destinations.ts` | Existing push register/retire APIs and typed payload destinations | Partial | Old responses are cleared, payloads are audience validated and active queries invalidate. Per-event exact-record, cross-account, physical-device and carrier/store proof remain. |
| X-004 | `src/lib/query.ts`, root runtime bridge | NetInfo/AppState wired to React Query focus/online managers | Implemented; device integration pending | Foreground/network recovery logic and unit tests pass; multi-client return-to-app proof on iOS/Android remains. |
| X-005 | `src/components/NetworkStatusBanner.tsx`, query persistence | Cached-data timestamp and explicit offline truth signal; mutations still never auto-retry | Partial | Offline copy never promises save/send/pay/sync and global cached age is tested. Per-form draft preservation/write fencing and offline cold-start device proof remain. |
| X-006 | `src/lib/query.ts`, `account-storage.ts`, `sign-out.ts`, root scoped provider | Clerk identity/version buster plus memory/persister/temp-state cleanup | Implemented; device lifecycle pending | Account-scoping and cleanup tests pass. Offline logout/process death/account-switch flash proof on native runtimes remains. |
| X-007 | `src/lib/auth-token.ts`, `useApi.ts`, existing typed API client | Clerk token is required for private operations | Partial | Missing token now fails closed; download/body timeout/schema tests pass. Every endpoint's full error matrix and account-switch cancellation still require coverage. |
| X-008 | See X-008; record changed native files | See X-008; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| X-009 | `.env.example`, `src/lib/auth-token.ts`, `useApi.ts`, `api.ts`, `supabase.ts` | Clerk token required for mobile private API calls; direct Supabase client is explicitly non-authoritative and uses only public client configuration | Partial; tracked server credentials removed | Tracked mobile example now contains placeholders only and no service-role/database credentials. Previously exposed credentials require owner-side rotation/history review; endpoint-by-endpoint tenant/role/entitlement fixtures remain open. |
| X-010 | See X-010; record changed native files | See X-010; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| X-011 | `src/features/sections/BillingScreen.tsx`, `billing-state.ts`, `src/lib/purchases.ts` | `GET /api/billing/status` is authoritative; RevenueCat SDK result is not an entitlement | Externally blocked; unsafe purchase path disabled | Unit tests prove Stripe customers and unreconciled accounts cannot enter a native charge. Receipt/webhook reconciliation plus purchase/restore/renew/refund/account-switch provider fixtures are required before enabling the paywall. |
| X-012 | See X-012; record changed native files | See X-012; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| X-013 | See X-013; record changed native files | See X-013; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| X-014 | See X-014; record changed native files | See X-014; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| X-015 | `src/app/_layout.tsx`, `+not-found.tsx`, `invalid-link.tsx`, `src/components/RouteRecovery.tsx` | Expo Router error boundary/retry and honest splash/auth/font timeout fallbacks | Implemented; native runtime pending | Unknown/malformed route and startup fallbacks exist; render/font/offline-start draft-preservation proof on iOS/Android remains. |
| X-016 | `src/lib/monitoring.ts`, `monitoring-safety.ts`, `src/app/_layout.tsx`, `src/lib/api.ts`, `ai.ts`, `provider-handoff.ts`, billing/payout return screens, commercial-painting signed upload, `metro.config.js`, `app.json` | Sentry SDK; no-op without valid HTTPS public DSN; route/schema/upload/stream/provider-return errors use stable operation tags; `beforeSend` strips request, user, messages, documents, extras, contexts and breadcrumbs; screenshots/view hierarchy/tracing/profiles/replay disabled | Implemented; deployment and native-runtime proof pending | `monitoring-safety.test.ts` proves secret/content stripping and dynamic-route redaction; focused tests/typecheck/Metro config pass. Production DSN, Sentry org/project/auth-token source-map upload, consent/legal approval and real iOS/Android captured-event/symbolication proof remain external release gates. |
| X-017 | See X-017; record changed native files | See X-017; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| X-018 | `src/lib/download.ts` | Authenticated byte download through existing API paths | Implemented; platform verification pending | 15 tests cover status/MIME/timeout/cancel/progress/collision/no-share/cleanup. Save/share/print on both physical platforms remains. |
| X-019 | `src/lib/provider-handoff.ts`, Billing/Payouts/Solar screens | Allowlisted Stripe/Felt launch plus mobile-return variants and browser fallback | Partial | Launch failure/cancel returns refresh authoritative state and no token is added to URLs. First-party dashboard/editor hand-offs remain open until replaced natively. |
| X-020 | `app.json`, existing theme provider | Brand-aligned splash/system/notification/adaptive-icon colours | Implemented; visual device verification pending | Expo config is reconciled to charcoal/paper/yellow; actual iOS/Android splash/icon/system transition evidence remains. |
| X-021 | See X-021; record changed native files | See X-021; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| X-022 | See X-022; record changed native files | See X-022; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| X-023 | See X-023; record changed native files | See X-023; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| X-024 | See X-024; record changed native files | See X-024; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| X-025 | See X-025; record changed native files | See X-025; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| X-026 | See X-026; record changed native files | See X-026; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| X-027 | See X-027; record changed native files | See X-027; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| X-028 | See X-028; record changed native files | See X-028; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| X-029 | See X-029; record changed native files | See X-029; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| X-030 | See X-030; record changed native files | See X-030; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |
| X-031 | `src/features/help/help-documents.ts`, `HelpScreen.tsx`, `open-help-document.ts`, `/sections/help`, menu/route registry | Exact 49-asset static census; approved public HTML opens without auth/query data; PDF/CSV use validated download/share with progress/cancel/cleanup | Partial; device/viewer verification pending | Census uniqueness/path/MIME tests pass. Historical limitations are visible and gated assets counted. Search, fully native readers/zoom, recipe accordion/theme regression and real-device browser/share proof remain. |
| X-032 | `src/features/help/help-documents.ts`, `HelpScreen.tsx` | Illustrative calculator document is catalogued but excluded from tradie Help until all native educational controls exist | Safety gate implemented; calculator pending | UI explains the gate and states the document is never tenant pricing. The 17-control native educational calculator and mode/output parity remain open. |
| X-033 | `AGENTS.md`, Expo SDK 54 official docs, `package.json`, `app.json`, `CLAUDE.md`, `metro.config.js` | SDK 54/RN 0.81.5/React 19.1; added NetInfo and Sentry only for identified X requirements; app-version runtime policy retained | In progress | Versioned Expo routing/linking/splash/network/updates/notifications/files/sharing and Sentry guidance read. Typecheck/lint/focused tests/Doctor pass at this checkpoint; final full suites and iOS/Android exports/device proof remain. No publish/deploy performed. |
| X-034 | See X-034; record changed native files | See X-034; verify actual contract | Not started | Source audit only; implementation and acceptance proof pending |

Allowed implementation states: **not started**, **in progress**, **implemented, verification pending**, **verified**, **blocked**, **explicitly approved exclusion**. A blocked or unverified required row prevents a claim of complete parity. Record test commands/results, reviewed revision and evidence paths against verified rows rather than a single undifferentiated “tests pass” statement.

## Appendix A — Complete website page census

All 91 App Router page files are listed. Page-level status is an index into the detailed feature matrices, not a substitute for their small controls and conditional states. Aliases, callbacks, customer journeys and internal pages remain visible. No route-count percentage is claimed.

| Website route | Source | Current mobile coverage / destination | Requirements |
| --- | --- | --- | --- |
| `/` | `web/app/page.tsx:1` | **Partial welcome / Missing public sections** — app/(auth)/welcome.tsx; no full public landing catalogue | PUBLIC |
| `/account` | `web/app/account/page.tsx:1` | **Partial / Account provider page** — app/sections/account.tsx is not equivalent to Clerk account management | AUTH + CORE |
| `/admin` | `web/app/admin/page.tsx:1` | **Missing / Admin role only** — No native administrator workspace | ADMIN / G-002 |
| `/admin/agents` | `web/app/admin/agents/page.tsx:1` | **Missing / Admin role only** — No native administrator workspace | ADMIN / G-002 |
| `/admin/agents/catalogue` | `web/app/admin/agents/catalogue/page.tsx:1` | **Missing / Admin role only** — No native administrator workspace | ADMIN / G-002 |
| `/admin/agents/eval` | `web/app/admin/agents/eval/page.tsx:1` | **Missing / Admin role only** — No native administrator workspace | ADMIN / G-002 |
| `/admin/agents/tradie-edits` | `web/app/admin/agents/tradie-edits/page.tsx:1` | **Missing / Admin role only** — No native administrator workspace | ADMIN / G-002 |
| `/admin/customers` | `web/app/admin/customers/page.tsx:1` | **Missing / Admin role only** — No native administrator workspace | ADMIN / G-002 |
| `/admin/customers/[id]` | `web/app/admin/customers/[id]/page.tsx:1` | **Missing / Admin role only** — No native administrator workspace | ADMIN / G-002 |
| `/admin/docs` | `web/app/admin/docs/page.tsx:1` | **Missing / Admin role only** — No native administrator workspace | ADMIN / G-002 |
| `/admin/files` | `web/app/admin/files/page.tsx:1` | **Missing / Admin role only** — No native administrator workspace | ADMIN / G-002 |
| `/admin/invites` | `web/app/admin/invites/page.tsx:1` | **Missing / Admin role only** — No native administrator workspace | ADMIN / G-002 |
| `/admin/loader` | `web/app/admin/loader/page.tsx:1` | **Missing / Admin role only** — No native administrator workspace | ADMIN / G-002 |
| `/admin/metrics` | `web/app/admin/metrics/page.tsx:1` | **Missing / Admin role only** — No native administrator workspace | ADMIN / G-002 |
| `/admin/tenants` | `web/app/admin/tenants/page.tsx:1` | **Missing / Admin role only** — No native administrator workspace | ADMIN / G-002 |
| `/auth/callback` | `web/app/auth/callback/page.tsx:1` | **Partial / Missing equivalent route** — OAuth/provisioning callbacks and email steps need explicit continuation | AUTH |
| `/auth/reset-password` | `web/app/auth/reset-password/page.tsx:1` | **Browser-only / Provider mismatch** — SignInScreen opens legacy website recovery; Clerk-native flow required | AUTH |
| `/book/[tenantId]` | `web/app/book/[tenantId]/page.tsx:1` | **Missing native route / Public web surface** — No equivalent native route; preserve public browser availability | PUBLIC |
| `/dashboard` | `web/app/dashboard/page.tsx:1` | **Partial** — Home/Tools trade hubs, Quotes, Chats, Menu and section routes | CORE + TRADE |
| `/dashboard/aircon` | `web/app/dashboard/aircon/page.tsx:1` | **Partial** — features/trades/aircon/AirconToolScreen.tsx | TRADE |
| `/dashboard/crm` | `web/app/dashboard/crm/page.tsx:1` | **Missing** — No native CRM workspace | CORE |
| `/dashboard/estimator/[runId]` | `web/app/dashboard/estimator/[runId]/page.tsx:1` | **Partial** — features/trades/estimator/EstimatorScreen.tsx; no matching run route | TRADE |
| `/dashboard/invites` | `web/app/dashboard/invites/page.tsx:1` | **Partial** — app/sections/invites.tsx; marketing/code coverage incomplete | CORE |
| `/dashboard/job/[trade]` | `web/app/dashboard/job/[trade]/page.tsx:1` | **Partial** — features/trades/jobquote/JobQuoteScreen.tsx | TRADE |
| `/dashboard/painting` | `web/app/dashboard/painting/page.tsx:1` | **Browser-only / Missing native tool** — Saved-job links; no equivalent measurement editor | TRADE |
| `/dashboard/pricing-wizard` | `web/app/dashboard/pricing-wizard/page.tsx:1` | **Browser-only** — Pricing rate cards exist; wizard opens web | TRADE |
| `/dashboard/quote/[token]` | `web/app/dashboard/quote/[token]/page.tsx:1` | **Browser-only editor / Partial detail** — features/quotes/QuoteDetailModal.tsx | CORE |
| `/dashboard/roofing/measure` | `web/app/dashboard/roofing/measure/page.tsx:1` | **Partial** — features/trades/roofing/RoofMeasureScreen.tsx | TRADE |
| `/dashboard/roofing/measurements/[id]/topology` | `web/app/dashboard/roofing/measurements/[id]/topology/page.tsx:1` | **Missing / Gated** — No native topology evidence route | TRADE |
| `/dashboard/signage` | `web/app/dashboard/signage/page.tsx:1` | **Partial / Browser-only advanced actions** — features/trades/tools/SignageTools.tsx | TRADE |
| `/dashboard/signage/audit` | `web/app/dashboard/signage/audit/page.tsx:1` | **Missing** — No complete native ingestion/audit workspace | TRADE |
| `/dashboard/signage/queue` | `web/app/dashboard/signage/queue/page.tsx:1` | **Browser-only** — SignageTools links to website queue | TRADE |
| `/dashboard/signage/shots` | `web/app/dashboard/signage/shots/page.tsx:1` | **Missing** — No native shot composition workspace | TRADE |
| `/dashboard/signage/studios` | `web/app/dashboard/signage/studios/page.tsx:1` | **Missing** — No native studio library/import workspace | TRADE |
| `/dashboard/studio` | `web/app/dashboard/studio/page.tsx:1` | **Missing** — No native Brand Studio editor | TRADE |
| `/dev/doc-editor` | `web/app/dev/doc-editor/page.tsx:1` | **Missing / Documentation or restricted fixture** — No equivalent native documentation/demo route | PUBLIC / X-031 |
| `/docs/sms-onboarding-architecture` | `web/app/docs/sms-onboarding-architecture/page.tsx:1` | **Missing / Documentation or restricted fixture** — No equivalent native documentation/demo route | PUBLIC / X-031 |
| `/docs/sms-onboarding-flow` | `web/app/docs/sms-onboarding-flow/page.tsx:1` | **Missing / Documentation or restricted fixture** — No equivalent native documentation/demo route | PUBLIC / X-031 |
| `/docs/tradie-onboarding-architecture` | `web/app/docs/tradie-onboarding-architecture/page.tsx:1` | **Missing / Documentation or restricted fixture** — No equivalent native documentation/demo route | PUBLIC / X-031 |
| `/docs/tradie-onboarding-plan` | `web/app/docs/tradie-onboarding-plan/page.tsx:1` | **Missing / Documentation or restricted fixture** — No equivalent native documentation/demo route | PUBLIC / X-031 |
| `/docs/tradie-onboarding-plan-sms` | `web/app/docs/tradie-onboarding-plan-sms/page.tsx:1` | **Missing / Documentation or restricted fixture** — No equivalent native documentation/demo route | PUBLIC / X-031 |
| `/forgot-password` | `web/app/forgot-password/page.tsx:1` | **Browser-only / Provider mismatch** — SignInScreen opens legacy website recovery; Clerk-native flow required | AUTH |
| `/legal/cookies` | `web/app/legal/cookies/page.tsx:1` | **Missing native route / Public web surface** — No equivalent native route; preserve public browser availability | PUBLIC |
| `/legal/privacy` | `web/app/legal/privacy/page.tsx:1` | **Missing native route / Public web surface** — No equivalent native route; preserve public browser availability | PUBLIC |
| `/legal/terms` | `web/app/legal/terms/page.tsx:1` | **Missing native route / Public web surface** — No equivalent native route; preserve public browser availability | PUBLIC |
| `/m/[token]` | `web/app/m/[token]/page.tsx:1` | **Browser-only owner/capability review** — Saved measurement/painting links; no native full review page | PUBLIC + TRADE |
| `/onboard` | `web/app/onboard/page.tsx:1` | **Partial** — app/(auth)/sign-up.tsx; provider and flow differences apply | AUTH |
| `/onboard/check-email` | `web/app/onboard/check-email/page.tsx:1` | **Partial / Missing equivalent route** — OAuth/provisioning callbacks and email steps need explicit continuation | AUTH |
| `/onboard/stripe/refresh` | `web/app/onboard/stripe/refresh/page.tsx:1` | **Partial / Missing equivalent route** — OAuth/provisioning callbacks and email steps need explicit continuation | AUTH |
| `/onboard/stripe/return` | `web/app/onboard/stripe/return/page.tsx:1` | **Partial / Missing equivalent route** — OAuth/provisioning callbacks and email steps need explicit continuation | AUTH |
| `/onboard/success` | `web/app/onboard/success/page.tsx:1` | **Partial** — app/(auth)/success.tsx | AUTH |
| `/p/[token]` | `web/app/p/[token]/page.tsx:1` | **Browser-only owner/capability review** — Saved measurement/painting links; no native full review page | PUBLIC + TRADE |
| `/paint-request/[token]` | `web/app/paint-request/[token]/page.tsx:1` | **Missing native route / Public web surface** — No equivalent native route; preserve public browser availability | PUBLIC |
| `/pricing` | `web/app/pricing/page.tsx:1` | **Missing native route / Public web surface** — No equivalent native route; preserve public browser availability | PUBLIC |
| `/q/[token]` | `web/app/q/[token]/page.tsx:1` | **Browser-only / Public journey** — QuoteDetail and saved-job links; no native guest route | PUBLIC / G-002 |
| `/q/[token]/approve` | `web/app/q/[token]/approve/page.tsx:1` | **Partial / Owner-authenticated approval** — Native quote queue has approval actions; add equivalent protected review-link continuation. Public quote viewing does not grant approval authority. | PUBLIC-013 + CORE |
| `/q/[token]/book` | `web/app/q/[token]/book/page.tsx:1` | **Browser-only / Public journey** — QuoteDetail and saved-job links; no native guest route | PUBLIC / G-002 |
| `/q/[token]/cancelled` | `web/app/q/[token]/cancelled/page.tsx:1` | **Browser-only / Public journey** — QuoteDetail and saved-job links; no native guest route | PUBLIC / G-002 |
| `/q/[token]/paid` | `web/app/q/[token]/paid/page.tsx:1` | **Browser-only / Public journey** — QuoteDetail and saved-job links; no native guest route | PUBLIC / G-002 |
| `/q/[token]/thanks` | `web/app/q/[token]/thanks/page.tsx:1` | **Browser-only / Public journey** — QuoteDetail and saved-job links; no native guest route | PUBLIC / G-002 |
| `/q/aircon/[token]` | `web/app/q/aircon/[token]/page.tsx:1` | **Browser-only / Public journey** — QuoteDetail and saved-job links; no native guest route | PUBLIC / G-002 |
| `/q/choose/[token]` | `web/app/q/choose/[token]/page.tsx:1` | **Browser-only / Public journey** — QuoteDetail and saved-job links; no native guest route | PUBLIC / G-002 |
| `/q/commercial-paint/[token]` | `web/app/q/commercial-paint/[token]/page.tsx:1` | **Browser-only / Public journey** — QuoteDetail and saved-job links; no native guest route | PUBLIC / G-002 |
| `/q/paint/[token]` | `web/app/q/paint/[token]/page.tsx:1` | **Browser-only / Public journey** — QuoteDetail and saved-job links; no native guest route | PUBLIC / G-002 |
| `/q/paint/[token]/book` | `web/app/q/paint/[token]/book/page.tsx:1` | **Browser-only / Public journey** — QuoteDetail and saved-job links; no native guest route | PUBLIC / G-002 |
| `/q/paint/[token]/thanks` | `web/app/q/paint/[token]/thanks/page.tsx:1` | **Browser-only / Public journey** — QuoteDetail and saved-job links; no native guest route | PUBLIC / G-002 |
| `/q/plan/[token]` | `web/app/q/plan/[token]/page.tsx:1` | **Browser-only / Public journey** — QuoteDetail and saved-job links; no native guest route | PUBLIC / G-002 |
| `/q/roof/[token]` | `web/app/q/roof/[token]/page.tsx:1` | **Browser-only / Public journey** — QuoteDetail and saved-job links; no native guest route | PUBLIC / G-002 |
| `/q/roof/[token]/book` | `web/app/q/roof/[token]/book/page.tsx:1` | **Browser-only / Public journey** — QuoteDetail and saved-job links; no native guest route | PUBLIC / G-002 |
| `/q/roof/[token]/thanks` | `web/app/q/roof/[token]/thanks/page.tsx:1` | **Browser-only / Public journey** — QuoteDetail and saved-job links; no native guest route | PUBLIC / G-002 |
| `/q/solar/[token]` | `web/app/q/solar/[token]/page.tsx:1` | **Browser-only / Public journey** — QuoteDetail and saved-job links; no native guest route | PUBLIC / G-002 |
| `/quote-request/[token]` | `web/app/quote-request/[token]/page.tsx:1` | **Missing native route / Public web surface** — No equivalent native route; preserve public browser availability | PUBLIC |
| `/share/[token]` | `web/app/share/[token]/page.tsx:1` | **Browser-only / Public journey** — QuoteDetail and saved-job links; no native guest route | PUBLIC / G-002 |
| `/sign-in/[[...sign-in]]` | `web/app/sign-in/[[...sign-in]]/page.tsx:1` | **Partial / Legacy alias accounted** — app/(auth)/sign-in.tsx | AUTH |
| `/sign-up/[[...sign-up]]` | `web/app/sign-up/[[...sign-up]]/page.tsx:1` | **Partial** — app/(auth)/sign-up.tsx; provider and flow differences apply | AUTH |
| `/signin` | `web/app/signin/page.tsx:1` | **Partial / Legacy alias accounted** — app/(auth)/sign-in.tsx | AUTH |
| `/signup` | `web/app/signup/page.tsx:1` | **Partial** — app/(auth)/sign-up.tsx; provider and flow differences apply | AUTH |
| `/signup/verify` | `web/app/signup/verify/page.tsx:1` | **Partial** — app/(auth)/sign-up.tsx; provider and flow differences apply | AUTH |
| `/solar/[tenantSlug]` | `web/app/solar/[tenantSlug]/page.tsx:1` | **Missing native route / Public web surface** — No equivalent native route; preserve public browser availability | PUBLIC |
| `/start/[tenantId]` | `web/app/start/[tenantId]/page.tsx:1` | **Missing native route / Public web surface** — No equivalent native route; preserve public browser availability | PUBLIC |
| `/studio/[token]/report` | `web/app/studio/[token]/report/page.tsx:1` | **Missing native route / Public web surface** — No equivalent native route; preserve public browser availability | PUBLIC |
| `/studio/[token]/upload` | `web/app/studio/[token]/upload/page.tsx:1` | **Missing native route / Public web surface** — No equivalent native route; preserve public browser availability | PUBLIC |
| `/t/[slug]` | `web/app/t/[slug]/page.tsx:1` | **Missing native route / Public web surface** — No equivalent native route; preserve public browser availability | PUBLIC |
| `/trades/electrical` | `web/app/trades/electrical/page.tsx:1` | **Missing native route / Public web surface** — No equivalent native route; preserve public browser availability | PUBLIC |
| `/trades/painting` | `web/app/trades/painting/page.tsx:1` | **Missing native route / Public web surface** — No equivalent native route; preserve public browser availability | PUBLIC |
| `/trades/plumbing` | `web/app/trades/plumbing/page.tsx:1` | **Missing native route / Public web surface** — No equivalent native route; preserve public browser availability | PUBLIC |
| `/trades/roofing` | `web/app/trades/roofing/page.tsx:1` | **Missing native route / Public web surface** — No equivalent native route; preserve public browser availability | PUBLIC |
| `/trades/solar` | `web/app/trades/solar/page.tsx:1` | **Missing native route / Public web surface** — No equivalent native route; preserve public browser availability | PUBLIC |
| `/upload/[token]` | `web/app/upload/[token]/page.tsx:1` | **Missing native route / Public web surface** — No equivalent native route; preserve public browser availability | PUBLIC |
| `/upload/plan/[token]` | `web/app/upload/plan/[token]/page.tsx:1` | **Missing native route / Public web surface** — No equivalent native route; preserve public browser availability | PUBLIC |
| `/watch` | `web/app/watch/page.tsx:1` | **Missing native route / Public web surface** — No equivalent native route; preserve public browser availability | PUBLIC |

## Appendix B — Static pages and downloadable references

These URLs are served from `web/public/`, outside App Router. They are content/assets, not extra operational backend features. Historical architecture, demo scripts and embedded code examples must not be interpreted as instructions to create unapproved production behaviour. Interactive documentation controls are covered by X-031/X-032.

| URL | Title / file | Controls or format | Native disposition |
| --- | --- | --- | --- |
| `/docs/agent-architecture.html` | QuoteMax · Voice + SMS Agent Architecture | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/architecture.html` | QuoteMax · Architecture · Stages 01 → 10 · Voice + SMS | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/beginner-walkthrough.html` | QuoteMax · Beginner Walkthrough · Stages 01 → 05 | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/beginner-walkthrough.pdf` | beginner-walkthrough.pdf | PDF download/view/share | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/build-guide.html` | QuoteMax — Automation Build Guide (Stages 01 → 05) | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/commercial-paint-kb-supplement.html` | KB File-Store Supplement · Commercial Paint Estimator · QuoteMax | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/dashboard-capabilities.html` | QuoteMax — Investor Brief — 29 May 2026 | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/database-architecture.html` | QuoteMax · Database Architecture & Site Wiring Map | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/database-visual.html` | QuoteMax · How the data flows · Visual guide | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/estimating-recipes-guide.html` | QuoteMax &middot; Recipes &amp; Estimating &mdash; Beginner&rsquo;s Guide | 0 button(s), 0 input/select(s), 4 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/estimator-filestore-supplement.html` | QuoteMax · Electrical Estimator — the ephemeral file-store supplement node | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/ig-engine-flow.html` | QuoteMax · How the AI Picture Gets Made | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/investor-pack/agents.html` | QuoteMax · AI Agents | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/investor-pack/architecture.html` | QuoteMax · System Architecture | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/investor-pack/demo-script.html` | QuoteMax · Live Demo Script | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/investor-pack/index.html` | QuoteMax · Investor Overview | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/kb-verify-explainer.html` | QuoteMax · MT-QM-PRICING-KB Verification — the accuracy node | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/onboarding-bundle.html` | QuoteMax · Trade Onboarding Bundle Spec | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/paint-estimator-explained.html` | How the Paint Estimator prices a job | 2 button(s), 17 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 / X-032 |
| `/docs/platform-capabilities-walkthrough.html` | QuoteMax — Platform Walkthrough | 1 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/platform-capabilities-walkthrough.pdf` | platform-capabilities-walkthrough.pdf | PDF download/view/share | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/pricing-data-accuracy.html` | QuoteMax · How accurate is the price book — for Jon | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/pricing-flow.html` | QuoteMax · How the Receptionist Prices a Job | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/pricing-transparency.html` | QuoteMax · How the pricing works | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/pricing-transparency.pdf` | pricing-transparency.pdf | PDF download/view/share | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/quote-engine-explainer.html` | QuoteMax · Intake &amp; Estimation Engine — how a price is actually built | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/quote-engine-explainer.pdf` | quote-engine-explainer.pdf | PDF download/view/share | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/quoteMate-au-progress.html` | QuoteMax — Build Status | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/quotemate-feature-overview.html` | QuoteMax · How It Works | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/quotemate-feature-overview.pdf` | quotemate-feature-overview.pdf | PDF download/view/share | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/quotemax-onepager.html` | QuoteMax — How It Works · Go-to-Market &amp; Onboarding (One-Pager) | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/quotemax-onepager.pdf` | quotemax-onepager.pdf | PDF download/view/share | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/red-team-brief.html` | Red Team Brief &middot; QuoteMax Platform | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/sms-ai-receptionist-workflow.html` | QuoteMax SMS AI Receptionist — Canonical End-to-End Pipeline Specification | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/sms-before-after.html` | SMS AI Receptionist — Before &amp; After | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/sms-before-after.pdf` | sms-before-after.pdf | PDF download/view/share | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/sms-onboarding-architecture.html` | SMS Onboarding Architecture — QuoteMax | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/sms-onboarding-flow.html` | SMS Onboarding Flow — QuoteMax | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/sms-progress.html` | QuoteMax · Weekly Progress · 2026-05-06 | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/sms-sop.html` | QuoteMax · SMS Channel SOP · Build Guide | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/stage1-05-sop.html` | QuoteMax · Beginner Walkthrough · Stages 01 → 05 | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/stage6-10-sop.html` | QuoteMax · Beginner Walkthrough · Stages 06 → 10 | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/supplier-catalogue-template.csv` | supplier-catalogue-template.csv | CSV template download/import reference | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/trade-book-pipeline-spike.html` | QuoteMax · Trade-book to cookbook pipeline · 1-pager spike | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/tradie-onboarding-architecture.html` | Tradie Onboarding Architecture — QuoteMax | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/tradie-onboarding-plan-sms.html` | Tradie Onboarding via SMS — QuoteMax | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/tradie-onboarding-plan.html` | Tradie Onboarding Plan — QuoteMax | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/docs/wireframe.html` | QuoteMax — Architecture Wireframe | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |
| `/sms-ai-receptionist-workflow 1.html` | QuoteMate SMS AI Receptionist — Canonical End-to-End Pipeline Specification | 0 button(s), 0 input/select(s), 0 expandable section(s); links retained | Missing native docs destination; role-appropriate read-only view, X-031 |

## Appendix C — Complete route-handler and method census

All 273 handler files are listed, including 267 API routes and six non-API handlers. The source path is deterministic: `web/app<route>/route.ts` (replace <route> with the route column, without escaping bracket segments).

The final column is a **static code reference**, not a method/authorisation/runtime pass. A matching literal/template can occur in a helper or disabled branch. “No literal match” is not proof that a feature is absent: URLs may be composed dynamically, fetched server-side or represent backend-only work. The detailed feature requirements establish the real missing functionality. Method exports were scanned; inspect the cited route handler for validation and authority before using it.

| Method(s) | Route | Contract family / boundary | Matching native source (if found) |
| --- | --- | --- | --- |
| POST | `/api/admin/agents/eval-fixture/score` | Admin role / ADMIN | No literal match; use family requirements |
| GET | `/api/admin/agents/eval-runs/[id]` | Admin role / ADMIN | No literal match; use family requirements |
| PATCH | `/api/admin/agents/findings/[type]/[id]` | Admin role / ADMIN | No literal match; use family requirements |
| GET | `/api/admin/agents/queue` | Admin role / ADMIN | No literal match; use family requirements |
| POST | `/api/admin/agents/trigger/[agent]` | Admin role / ADMIN | No literal match; use family requirements |
| GET | `/api/admin/customers` | Admin role / ADMIN | No literal match; use family requirements |
| GET, PATCH | `/api/admin/customers/[id]` | Admin role / ADMIN | No literal match; use family requirements |
| POST | `/api/admin/customers/[id]/subscription` | Admin role / ADMIN | No literal match; use family requirements |
| GET | `/api/admin/files` | Admin role / ADMIN | No literal match; use family requirements |
| GET, POST | `/api/admin/files/[id]/comments` | Admin role / ADMIN | No literal match; use family requirements |
| PATCH, DELETE | `/api/admin/files/[id]/comments/[commentId]` | Admin role / ADMIN | No literal match; use family requirements |
| POST | `/api/admin/files/[id]/resolve` | Admin role / ADMIN | No literal match; use family requirements |
| GET | `/api/admin/loader/batch/[id]` | Admin role / ADMIN | No literal match; use family requirements |
| POST | `/api/admin/loader/batch/[id]/approve` | Admin role / ADMIN | No literal match; use family requirements |
| POST | `/api/admin/loader/batch/[id]/rollback` | Admin role / ADMIN | No literal match; use family requirements |
| GET | `/api/admin/loader/template` | Admin role / ADMIN | No literal match; use family requirements |
| POST | `/api/admin/loader/trade-book/extract` | Admin role / ADMIN | No literal match; use family requirements |
| GET, POST | `/api/admin/loader/trade-book/stores` | Admin role / ADMIN | No literal match; use family requirements |
| GET | `/api/admin/loader/trade-book/stores/[storeId]/documents` | Admin role / ADMIN | No literal match; use family requirements |
| POST | `/api/admin/loader/trade-book/upload` | Admin role / ADMIN | No literal match; use family requirements |
| POST | `/api/admin/loader/upload` | Admin role / ADMIN | No literal match; use family requirements |
| GET | `/api/admin/metrics` | Admin role / ADMIN | No literal match; use family requirements |
| GET | `/api/admin/tenant-health` | Admin role / ADMIN | No literal match; use family requirements |
| GET | `/api/admin/tenants` | Admin role / ADMIN | No literal match; use family requirements |
| GET | `/api/admin/whoami` | Admin role / ADMIN | No literal match; use family requirements |
| POST | `/api/aircon/pdf` | Trade or token contract / TRADE + PUBLIC | `mobile/src/features/trades/aircon/api.ts:60` |
| POST | `/api/aircon/plan` | Trade or token contract / TRADE + PUBLIC | `mobile/src/features/trades/aircon/api.ts:46` |
| POST | `/api/aircon/recommend` | Trade or token contract / TRADE + PUBLIC | `mobile/src/features/trades/aircon/api.ts:39` |
| GET | `/api/aircon/static-map` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| POST | `/api/auth/signup` | Authentication/onboarding / AUTH | No literal match; use family requirements |
| POST | `/api/billing/checkout` | Billing/provider return / CORE + X-011 | No literal match; use family requirements |
| POST | `/api/billing/portal` | Billing/provider return / CORE + X-011 | `mobile/src/features/sections/BillingScreen.tsx:104` |
| GET | `/api/billing/status` | Billing/provider return / CORE + X-011 | `mobile/src/features/sections/BillingScreen.tsx:102` |
| POST | `/api/book/[tenantId]` | Public capability / PUBLIC | No literal match; use family requirements |
| GET | `/api/captions` | Media/docs shared contract / CORE | No literal match; use family requirements |
| GET | `/api/commercial-paint/q/[token]/static-map` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| POST | `/api/contact` | Public capability / PUBLIC | No literal match; use family requirements |
| GET | `/api/cron/agents/[agent]` | Backend-only / X-030 | No literal match; use family requirements |
| GET | `/api/cron/followup-2h` | Backend-only / X-030 | No literal match; use family requirements |
| GET | `/api/cron/kb-sync` | Backend-only / X-030 | No literal match; use family requirements |
| GET | `/api/cron/push-receipts` | Backend-only / X-030 | No literal match; use family requirements |
| GET | `/api/cron/sms-cleanup` | Backend-only / X-030 | No literal match; use family requirements |
| GET | `/api/cron/tenant-filestore-reconcile` | Backend-only / X-030 | No literal match; use family requirements |
| GET, POST | `/api/dashboard/flyer` | Tenant marketing / CORE | No literal match; use family requirements |
| GET, PATCH, DELETE | `/api/dashboard/flyer/[id]` | Tenant marketing / CORE | No literal match; use family requirements |
| POST | `/api/dashboard/flyer/[id]/export` | Tenant marketing / CORE | No literal match; use family requirements |
| GET | `/api/dashboard/flyer/canva/callback` | Tenant marketing / CORE | No literal match; use family requirements |
| GET | `/api/dashboard/flyer/canva/connect` | Tenant marketing / CORE | No literal match; use family requirements |
| POST | `/api/dashboard/flyer/canva/designs` | Tenant marketing / CORE | No literal match; use family requirements |
| DELETE | `/api/dashboard/flyer/canva/designs/[id]` | Tenant marketing / CORE | No literal match; use family requirements |
| POST | `/api/dashboard/flyer/canva/designs/[id]/import` | Tenant marketing / CORE | No literal match; use family requirements |
| POST | `/api/dashboard/flyer/canva/disconnect` | Tenant marketing / CORE | No literal match; use family requirements |
| GET | `/api/dashboard/flyer/canva/status` | Tenant marketing / CORE | No literal match; use family requirements |
| POST | `/api/dashboard/flyer/upload` | Tenant marketing / CORE | No literal match; use family requirements |
| GET, POST | `/api/dashboard/invites/codes` | Tenant marketing / CORE | `mobile/src/features/sections/InvitesScreen.tsx:226`; `mobile/src/features/sections/InvitesScreen.tsx:245` |
| PATCH | `/api/dashboard/invites/codes/[id]` | Tenant marketing / CORE | No literal match; use family requirements |
| POST | `/api/dashboard/invites/codes/[id]/send` | Tenant marketing / CORE | `mobile/src/features/sections/InvitesScreen.tsx:113` |
| GET, POST | `/api/dashboard/marketing/qr` | Tenant marketing / CORE | `mobile/src/features/sections/InvitesScreen.tsx:225`; `mobile/src/features/sections/InvitesScreen.tsx:231` |
| PATCH | `/api/dashboard/marketing/qr/[id]` | Tenant marketing / CORE | `mobile/src/features/sections/InvitesScreen.tsx:63` |
| GET | `/api/dashboard/marketing/qr/[id]/image` | Tenant marketing / CORE | `mobile/src/features/sections/InvitesScreen.tsx:91` |
| GET, PATCH | `/api/dashboard/marketing/slug` | Tenant marketing / CORE | No literal match; use family requirements |
| GET | `/api/dashboard/roofing/measurements/[id]/topology` | Tenant feature gate / TRADE + X-028 | No literal match; use family requirements |
| GET | `/api/email/unsubscribe/[token]` | Public capability / PUBLIC | No literal match; use family requirements |
| POST | `/api/estimate/draft` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| POST | `/api/filestore/chat` | Media/docs shared contract / CORE | No literal match; use family requirements |
| GET | `/api/health` | Backend-only / X-030 | No literal match; use family requirements |
| GET | `/api/health/deep` | Backend-only / X-030 | No literal match; use family requirements |
| POST | `/api/intake/structure` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| POST | `/api/onboard/activate` | Authentication/onboarding / AUTH | `mobile/src/features/auth/SignUpScreen.tsx:284` |
| GET | `/api/onboard/intent/[token]` | Authentication/onboarding / AUTH | No literal match; use family requirements |
| POST | `/api/onboard/logo` | Authentication/onboarding / AUTH | No literal match; use family requirements |
| GET | `/api/onboard/preflight` | Authentication/onboarding / AUTH | No literal match; use family requirements |
| POST | `/api/onboard/retry-provision` | Authentication/onboarding / AUTH | `mobile/src/features/auth/SuccessScreen.tsx:88` |
| GET | `/api/onboard/trades` | Authentication/onboarding / AUTH | No literal match; use family requirements |
| POST | `/api/onboard/validate-code` | Authentication/onboarding / AUTH | `mobile/src/features/auth/SignUpScreen.tsx:265` |
| GET, POST | `/api/paint-request/[token]` | Public capability / PUBLIC | No literal match; use family requirements |
| POST | `/api/paint-request/[token]/suggest-address` | Public capability / PUBLIC | No literal match; use family requirements |
| POST | `/api/painting/3d-location` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| POST | `/api/painting/detect-material` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| POST | `/api/painting/edit/[token]` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| POST | `/api/painting/estimate` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| POST | `/api/painting/preview` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| POST | `/api/painting/preview/refine` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| GET, POST | `/api/painting/q/[token]/after-image` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| GET | `/api/painting/q/[token]/static-map` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| GET | `/api/painting/q/[token]/street-view` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| POST | `/api/painting/release/[token]` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| POST, GET | `/api/painting/save` | Trade or token contract / TRADE + PUBLIC | `mobile/src/features/trades/tools/tools-api.ts:110` |
| GET | `/api/painting/street-view` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| POST | `/api/painting/structures` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| POST | `/api/q/[token]/accept` | Public capability / PUBLIC | No literal match; use family requirements |
| POST | `/api/q/[token]/book` | Public capability / PUBLIC | No literal match; use family requirements |
| GET | `/api/q/[token]/html` | Public capability / PUBLIC | No literal match; use family requirements |
| GET | `/api/q/[token]/ics` | Public capability / PUBLIC | No literal match; use family requirements |
| GET | `/api/q/[token]/pdf` | Public capability / PUBLIC | `mobile/src/features/quotes/QuoteDetailModal.tsx:383` |
| GET | `/api/q/[token]/preview-status` | Public capability / PUBLIC | No literal match; use family requirements |
| GET | `/api/q/[token]/static-map` | Public capability / PUBLIC | No literal match; use family requirements |
| POST | `/api/q/book/[trade]/[token]` | Public capability / PUBLIC | No literal match; use family requirements |
| GET, POST | `/api/q/choose/[token]` | Public capability / PUBLIC | No literal match; use family requirements |
| GET | `/api/q/download` | Public capability / PUBLIC | No literal match; use family requirements |
| GET | `/api/q/paint/[token]/pdf` | Public capability / PUBLIC | No literal match; use family requirements |
| GET | `/api/q/plan/[token]/pdf` | Public capability / PUBLIC | No literal match; use family requirements |
| GET | `/api/q/roof/[token]/pdf` | Public capability / PUBLIC | No literal match; use family requirements |
| GET | `/api/q/roof/[token]/showcase` | Public capability / PUBLIC | No literal match; use family requirements |
| GET | `/api/q/solar/[token]/pdf` | Public capability / PUBLIC | No literal match; use family requirements |
| POST | `/api/quote-request/[token]` | Public capability / PUBLIC | No literal match; use family requirements |
| POST | `/api/quote-request/[token]/photos` | Public capability / PUBLIC | No literal match; use family requirements |
| POST | `/api/quote-request/[token]/suggest-address` | Public capability / PUBLIC | No literal match; use family requirements |
| DELETE | `/api/quote/[id]` | Quote owner actions / CORE | No literal match; use family requirements |
| POST | `/api/quote/[id]/approve` | Quote owner actions / CORE | `mobile/src/features/quotes/api.ts:59` |
| POST | `/api/quote/[id]/chat-edit` | Quote owner actions / CORE | No literal match; use family requirements |
| GET | `/api/quote/[id]/check-owner` | Quote owner actions / CORE | No literal match; use family requirements |
| POST | `/api/quote/[id]/complete` | Quote owner actions / CORE | `mobile/src/features/sections/PayoutsScreen.tsx:64` |
| PATCH | `/api/quote/[id]/display-mode` | Quote owner actions / CORE | `mobile/src/features/quotes/api.ts:120` |
| POST | `/api/quote/[id]/document` | Quote owner actions / CORE | No literal match; use family requirements |
| POST | `/api/quote/[id]/edit` | Quote owner actions / CORE | No literal match; use family requirements |
| POST | `/api/quote/[id]/send` | Quote owner actions / CORE | `mobile/src/features/quotes/api.ts:98` |
| PATCH | `/api/quote/[id]/tier` | Quote owner actions / CORE | No literal match; use family requirements |
| POST | `/api/roofing/detect-solar` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| GET | `/api/roofing/map-tiles/[z]/[x]/[y]` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| GET | `/api/roofing/map-tiles/session` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| POST | `/api/roofing/measure` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| POST | `/api/roofing/measure-all` | Trade or token contract / TRADE + PUBLIC | `mobile/src/features/trades/roofing/api.ts:22` |
| PATCH, POST | `/api/roofing/measurement/[token]` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| GET, POST | `/api/roofing/model3d/[token]` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| GET | `/api/roofing/q/[token]/after-image` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| GET, POST | `/api/roofing/q/[token]/layout-plan` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| GET | `/api/roofing/q/[token]/static-map` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| POST | `/api/roofing/reverse-geocode` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| POST, GET | `/api/roofing/save` | Trade or token contract / TRADE + PUBLIC | `mobile/src/features/trades/roofing/api.ts:32`; `mobile/src/features/trades/tools/tools-api.ts:138` |
| POST | `/api/roofing/save-as-quote` | Trade or token contract / TRADE + PUBLIC | `mobile/src/features/trades/roofing/api.ts:39` |
| POST | `/api/roofing/showcase-renders/[token]` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| GET | `/api/roofing/solar-insight` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| GET | `/api/roofing/static-map` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| GET | `/api/roofing/street-view` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| POST | `/api/roofing/suggest-address` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| POST | `/api/roofing/verify-photo` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| POST | `/api/signage/assess` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| GET, PATCH | `/api/signage/assessment/[id]` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| POST | `/api/signage/audit` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| POST | `/api/signage/audit/pdf` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| GET, PATCH | `/api/signage/brand` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| GET | `/api/signage/brands` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| GET | `/api/signage/geocode` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| POST | `/api/signage/ingest` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| GET | `/api/signage/places/search` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| GET | `/api/signage/queue` | Trade or token contract / TRADE + PUBLIC | `mobile/src/features/trades/tools/tools-api.ts:79` |
| GET, POST | `/api/signage/request/[token]` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| GET | `/api/signage/static-map` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| GET | `/api/signage/street-view` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| GET, POST | `/api/signage/studios` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| DELETE | `/api/signage/studios/[id]` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| POST | `/api/signage/studios/import` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| POST, GET | `/api/signage/sweeps` | Trade or token contract / TRADE + PUBLIC | `mobile/src/features/trades/tools/tools-api.ts:57` |
| DELETE | `/api/signage/sweeps/[id]` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| POST | `/api/sms/inbound` | Backend-only / X-030 | No literal match; use family requirements |
| POST | `/api/solar/[tenantSlug]/detect` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| POST | `/api/solar/[tenantSlug]/estimate` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| GET | `/api/solar/[tenantSlug]/static-map` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| POST | `/api/solar/confirm/[token]` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| GET | `/api/solar/places` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| GET | `/api/solar/q/[token]/buildings` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| GET | `/api/solar/q/[token]/flux-heatmap` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| GET | `/api/solar/q/[token]/panels-after` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| POST | `/api/solar/q/[token]/select-building` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| GET | `/api/solar/q/[token]/static-map` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| POST | `/api/solar/redraft/[token]` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| POST | `/api/stripe/connect-webhook` | Backend-only / X-030 | No literal match; use family requirements |
| POST | `/api/stripe/connect/refresh` | Billing/provider return / CORE + X-011 | No literal match; use family requirements |
| POST | `/api/stripe/connect/start` | Billing/provider return / CORE + X-011 | `mobile/src/features/sections/PayoutsScreen.tsx:129` |
| POST | `/api/stripe/webhook` | Backend-only / X-030 | No literal match; use family requirements |
| GET | `/api/studio/render` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| GET | `/api/supplier-catalogue` | Trade or token contract / TRADE + PUBLIC | `mobile/src/features/trades/catalogue-api.ts:243` |
| POST | `/api/supplier-catalogue/import` | Trade or token contract / TRADE + PUBLIC | No literal match; use family requirements |
| POST | `/api/t/[slug]/lead` | Public capability / PUBLIC | No literal match; use family requirements |
| GET | `/api/tenant/analytics` | Tenant business contract / CORE | `mobile/src/features/home/analytics.ts:97` |
| GET, POST | `/api/tenant/bom` | Tenant trade contract / TRADE | `mobile/src/features/trades/hub/sections/recipes-api.ts:102`; `mobile/src/features/trades/hub/sections/recipes-api.ts:153` |
| PATCH, DELETE | `/api/tenant/bom/[id]` | Tenant trade contract / TRADE | `mobile/src/features/trades/hub/sections/recipes-api.ts:170`; `mobile/src/features/trades/hub/sections/recipes-api.ts:178` (+1) |
| POST | `/api/tenant/bom/fork` | Tenant trade contract / TRADE | `mobile/src/features/trades/hub/sections/recipes-api.ts:199` |
| GET | `/api/tenant/calendar` | Tenant business contract / CORE | `mobile/src/features/sections/CalendarScreen.tsx:145` |
| POST | `/api/tenant/calendar/[quoteId]/confirm` | Tenant business contract / CORE | `mobile/src/features/sections/CalendarScreen.tsx:70` |
| GET | `/api/tenant/calibration` | Tenant business contract / CORE | No literal match; use family requirements |
| POST | `/api/tenant/calibration/accept` | Tenant business contract / CORE | No literal match; use family requirements |
| POST | `/api/tenant/calibration/upload` | Tenant business contract / CORE | No literal match; use family requirements |
| GET, POST | `/api/tenant/campaigns/announcement` | Tenant business contract / CORE | No literal match; use family requirements |
| GET, POST | `/api/tenant/catalogue` | Tenant trade contract / TRADE | `mobile/src/features/trades/catalogue-api.ts:73`; `mobile/src/features/trades/catalogue-api.ts:320` |
| PATCH, DELETE | `/api/tenant/catalogue/[id]` | Tenant trade contract / TRADE | `mobile/src/features/trades/catalogue-api.ts:330`; `mobile/src/features/trades/catalogue-api.ts:338` (+5) |
| POST | `/api/tenant/catalogue/bulk-add` | Tenant trade contract / TRADE | `mobile/src/features/trades/catalogue-api.ts:400` |
| GET | `/api/tenant/catalogue/gaps` | Tenant trade contract / TRADE | `mobile/src/features/trades/catalogue-api.ts:489` |
| POST | `/api/tenant/catalogue/stock-essentials` | Tenant trade contract / TRADE | `mobile/src/features/trades/catalogue-api.ts:437` |
| POST | `/api/tenant/catalogue/upload` | Tenant trade contract / TRADE | `mobile/src/features/trades/catalogue-api.ts:457` |
| GET | `/api/tenant/chats` | Tenant business contract / CORE | `mobile/src/features/chats/chats-api.ts:54` |
| POST | `/api/tenant/chats/[id]/reply` | Tenant business contract / CORE | `mobile/src/features/chats/chats-api.ts:68` |
| POST | `/api/tenant/commercial-painting/extract` | Tenant trade contract / TRADE | No literal match; use family requirements |
| POST | `/api/tenant/commercial-painting/preview` | Tenant trade contract / TRADE | No literal match; use family requirements |
| POST | `/api/tenant/commercial-painting/price` | Tenant trade contract / TRADE | No literal match; use family requirements |
| GET, PATCH | `/api/tenant/commercial-painting/run/[id]` | Tenant trade contract / TRADE | No literal match; use family requirements |
| GET | `/api/tenant/commercial-painting/runs` | Tenant trade contract / TRADE | No literal match; use family requirements |
| POST | `/api/tenant/commercial-painting/save-quote` | Tenant trade contract / TRADE | No literal match; use family requirements |
| PATCH, DELETE | `/api/tenant/commercial-painting/upload/[id]` | Tenant trade contract / TRADE | No literal match; use family requirements |
| GET | `/api/tenant/commercial-painting/upload/[id]/file` | Tenant trade contract / TRADE | No literal match; use family requirements |
| POST | `/api/tenant/commercial-painting/upload/complete` | Tenant trade contract / TRADE | No literal match; use family requirements |
| POST | `/api/tenant/commercial-painting/upload/sign` | Tenant trade contract / TRADE | No literal match; use family requirements |
| GET | `/api/tenant/crm/callback` | Tenant business contract / CORE | No literal match; use family requirements |
| GET | `/api/tenant/crm/connect/[provider]` | Tenant business contract / CORE | No literal match; use family requirements |
| POST | `/api/tenant/crm/disconnect` | Tenant business contract / CORE | No literal match; use family requirements |
| GET | `/api/tenant/crm/status` | Tenant business contract / CORE | No literal match; use family requirements |
| POST | `/api/tenant/crm/sync` | Tenant business contract / CORE | No literal match; use family requirements |
| GET | `/api/tenant/estimation` | Tenant trade contract / TRADE | `mobile/src/features/trades/hub/sections/estimating-api.ts:69` |
| PATCH, DELETE | `/api/tenant/estimation/[assemblyId]` | Tenant trade contract / TRADE | `mobile/src/features/trades/hub/sections/estimating-api.ts:133`; `mobile/src/features/trades/hub/sections/estimating-api.ts:143` |
| POST | `/api/tenant/estimator/extract` | Tenant trade contract / TRADE | `mobile/src/features/trades/estimator/estimator-api.ts:205` |
| GET, PATCH | `/api/tenant/estimator/extract/[id]` | Tenant trade contract / TRADE | `mobile/src/features/trades/estimator/estimator-api.ts:222`; `mobile/src/features/trades/estimator/estimator-api.ts:249` |
| GET | `/api/tenant/estimator/history` | Tenant trade contract / TRADE | `mobile/src/features/trades/estimator/estimator-api.ts:234` |
| POST | `/api/tenant/estimator/price` | Tenant trade contract / TRADE | `mobile/src/features/trades/estimator/estimator-api.ts:240` |
| POST | `/api/tenant/estimator/refine` | Tenant trade contract / TRADE | No literal match; use family requirements |
| GET | `/api/tenant/features` | Entitlement gate / X-010 | No literal match; use family requirements |
| GET | `/api/tenant/files` | Tenant business contract / CORE | `mobile/src/features/sections/FilesScreen.tsx:106` |
| GET, POST | `/api/tenant/files/[id]/comments` | Tenant business contract / CORE | No literal match; use family requirements |
| PATCH, DELETE | `/api/tenant/files/[id]/comments/[commentId]` | Tenant business contract / CORE | No literal match; use family requirements |
| GET | `/api/tenant/files/[id]/download` | Tenant business contract / CORE | `mobile/src/features/sections/FilesScreen.tsx:119` |
| POST | `/api/tenant/files/[id]/resolve` | Tenant business contract / CORE | No literal match; use family requirements |
| POST | `/api/tenant/files/chat` | Tenant business contract / CORE | `mobile/src/features/sections/FilesScreen.tsx:107` |
| GET, POST | `/api/tenant/followups` | Tenant business contract / CORE | `mobile/src/features/sections/FollowupsScreen.tsx:121`; `mobile/src/features/sections/FollowupsScreen.tsx:338` |
| POST | `/api/tenant/followups/call` | Tenant business contract / CORE | `mobile/src/features/sections/FollowupsScreen.tsx:106` |
| GET, POST | `/api/tenant/followups/events` | Tenant business contract / CORE | `mobile/src/features/sections/FollowupsScreen.tsx:127` |
| GET | `/api/tenant/followups/messages` | Tenant business contract / CORE | `mobile/src/features/sections/FollowupThread.tsx:60` |
| POST | `/api/tenant/followups/text` | Tenant business contract / CORE | `mobile/src/features/sections/FollowupsScreen.tsx:111` |
| GET | `/api/tenant/historical-quotes` | Tenant business contract / CORE | `mobile/src/features/sections/HistoryScreen.tsx:232`; `mobile/src/features/sections/HistoryScreen.tsx:233` |
| GET | `/api/tenant/historical-quotes/analytics` | Tenant business contract / CORE | `mobile/src/features/sections/HistoryScreen.tsx:226` |
| GET | `/api/tenant/historical-quotes/batches/[batchId]` | Tenant business contract / CORE | No literal match; use family requirements |
| POST | `/api/tenant/historical-quotes/calibration/apply` | Tenant business contract / CORE | `mobile/src/features/sections/HistoryScreen.tsx:102` |
| POST | `/api/tenant/historical-quotes/calibration/preview` | Tenant business contract / CORE | `mobile/src/features/sections/HistoryScreen.tsx:84` |
| GET | `/api/tenant/historical-quotes/hint` | Tenant business contract / CORE | `mobile/src/features/quotes/QuoteDetailModal.tsx:180` |
| POST | `/api/tenant/historical-quotes/import` | Tenant business contract / CORE | No literal match; use family requirements |
| POST | `/api/tenant/historical-quotes/review` | Tenant business contract / CORE | No literal match; use family requirements |
| POST | `/api/tenant/job-quote` | Tenant trade contract / TRADE | `mobile/src/features/trades/jobquote/api.ts:16` |
| POST | `/api/tenant/logo` | Tenant business contract / CORE | No literal match; use family requirements |
| GET, PATCH | `/api/tenant/me` | Tenant business contract / CORE | `mobile/src/features/auth/SignUpScreen.tsx:204`; `mobile/src/features/auth/SignUpScreen.tsx:371` (+4) |
| GET, PATCH | `/api/tenant/painting-rates` | Tenant trade contract / TRADE | `mobile/src/features/menu/api.ts:108`; `mobile/src/features/menu/api.ts:113` |
| POST | `/api/tenant/password` | Tenant business contract / CORE | No literal match; use family requirements |
| GET | `/api/tenant/payouts` | Tenant business contract / CORE | `mobile/src/features/sections/PayoutsScreen.tsx:127` |
| POST | `/api/tenant/photo` | Tenant business contract / CORE | No literal match; use family requirements |
| POST, DELETE | `/api/tenant/push-token` | Device lifecycle / X-003 | `mobile/src/lib/notifications.ts:21` |
| GET, PUT | `/api/tenant/pylon/settings` | Tenant trade contract / TRADE | `mobile/src/features/trades/tools/solar-api.ts:233`; `mobile/src/features/trades/tools/solar-api.ts:240` |
| GET, PATCH | `/api/tenant/roofing-rates` | Tenant trade contract / TRADE | `mobile/src/features/menu/api.ts:83`; `mobile/src/features/menu/api.ts:90` |
| GET, POST | `/api/tenant/services` | Tenant trade contract / TRADE | `mobile/src/features/trades/hub/sections/services-api.ts:96` |
| PATCH, DELETE | `/api/tenant/services/[id]` | Tenant trade contract / TRADE | `mobile/src/features/trades/hub/sections/services-api.ts:105`; `mobile/src/features/trades/hub/sections/services-api.ts:113` |
| GET | `/api/tenant/solar` | Tenant trade contract / TRADE | `mobile/src/features/trades/tools/solar-api.ts:74` |
| GET, PATCH | `/api/tenant/solar-rates` | Tenant trade contract / TRADE | `mobile/src/features/menu/api.ts:125`; `mobile/src/features/menu/api.ts:137` |
| GET, POST | `/api/tenant/tasks` | Tenant trade contract / TRADE | `mobile/src/features/trades/hub/sections/recipes-api.ts:131`; `mobile/src/features/trades/hub/sections/recipes-api.ts:216` |
| PATCH, DELETE | `/api/tenant/tasks/[id]` | Tenant trade contract / TRADE | `mobile/src/features/trades/hub/sections/recipes-api.ts:231`; `mobile/src/features/trades/hub/sections/recipes-api.ts:239` (+1) |
| POST | `/api/tenant/tasks/fork` | Tenant trade contract / TRADE | `mobile/src/features/trades/hub/sections/recipes-api.ts:247` |
| GET, POST, DELETE | `/api/tenant/tier-ladder` | Tenant trade contract / TRADE | `mobile/src/features/trades/catalogue-api.ts:535`; `mobile/src/features/trades/catalogue-api.ts:544` (+1) |
| GET, DELETE | `/api/tenant/trade-jobs` | Tenant trade contract / TRADE | `mobile/src/features/trades/hub/QuoteQueueSection.tsx:141` |
| GET | `/api/tenant/trade-jobs/owner-link` | Tenant trade contract / TRADE | No literal match; use family requirements |
| POST | `/api/tenant/trades` | Tenant trade contract / TRADE | No literal match; use family requirements |
| POST | `/api/tenant/trades/activate` | Tenant trade contract / TRADE | No literal match; use family requirements |
| GET | `/api/tenant/trades/available` | Tenant trade contract / TRADE | No literal match; use family requirements |
| POST | `/api/tenant/trades/reconcile` | Tenant trade contract / TRADE | No literal match; use family requirements |
| GET | `/api/tenant/videos` | Tenant business contract / CORE | `mobile/src/features/sections/VideosScreen.tsx:349`; `mobile/src/features/sections/VideosScreen.tsx:350` |
| POST | `/api/tenant/videos/generate` | Tenant business contract / CORE | `mobile/src/features/sections/VideosScreen.tsx:120` |
| POST | `/api/tenant/welcome-email` | Tenant business contract / CORE | No literal match; use family requirements |
| POST, GET | `/api/twilio/voice/followup-bridge` | Backend-only / X-030 | No literal match; use family requirements |
| POST | `/api/upload/[token]` | Public capability / PUBLIC | No literal match; use family requirements |
| POST | `/api/upload/plan/[token]` | Public capability / PUBLIC | No literal match; use family requirements |
| POST | `/api/vapi/tools/send-sms-photo-link` | Backend-only / X-030 | No literal match; use family requirements |
| POST | `/api/vapi/webhook` | Backend-only / X-030 | No literal match; use family requirements |
| GET | `/q/paint/[token]/visit.ics` | Public capability / PUBLIC | No literal match; use family requirements |
| GET | `/q/roof/[token]/visit.ics` | Public capability / PUBLIC | No literal match; use family requirements |
| GET | `/r/[token]/[tier]` | Public capability / PUBLIC | No literal match; use family requirements |
| GET | `/r/paint/[token]/[tier]` | Public capability / PUBLIC | No literal match; use family requirements |
| GET | `/r/roof/[token]/[tier]` | Public capability / PUBLIC | No literal match; use family requirements |
| GET | `/s/[shortCode]` | Public capability / PUBLIC | No literal match; use family requirements |

## Appendix D — Website control completeness index

This mechanical index records 1377 JSX control instances from the current website: links, buttons, inputs, selectors, toggles and elements with relevant event handlers. It is **not a count of distinct product features**, a semantic proof, or a statement that all controls are missing. Rendered loops can create more controls; dynamic labels/options, keyboard shortcuts and canvas gestures require the component/state review described in the matrices.

Use each source location with its family matrix to ensure small affordances are not lost. Labels/props are identifying excerpts, not full contracts. Each control group must be assigned to a concrete numbered requirement in the implementation ledger before it is considered verified. Reused/conditional components still need all supported states tested. The app must not simply recreate these tags without their behaviour.

### `web/app/account/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0001 / 40 | AccountPage / AUTH | `UserButton`  |
| C-0002 / 62 | AccountPage / AUTH | `Link` Home; href="/" |

### `web/app/admin/agents/catalogue/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0003 / 119 | CatalogueAgentPage / ADMIN | `Link` QuoteMax &rarr; Admin &rarr; Quality Agents; href="/admin/agents" |
| C-0004 / 128 | CatalogueAgentPage / ADMIN | `button` type="button"; onClick={triggerRun}; disabled={busyRun \|\| !token} |
| C-0005 / 148 | CatalogueAgentPage / ADMIN | `button` type="button"; onClick={() =&gt; setStatus(s)} |
| C-0006 / 214 | CatalogueAgentPage / ADMIN | `button` Approve; type="button"; onClick={() =&gt; review(r.id, 'approved')}; disabled={busyRow === r.id} |
| C-0007 / 223 | CatalogueAgentPage / ADMIN | `button` Reject; type="button"; onClick={() =&gt; review(r.id, 'rejected')}; disabled={busyRow === r.id} |

### `web/app/admin/agents/eval/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0008 / 153 | EvalAgentPage / ADMIN | `Link` QuoteMax &rarr; Admin &rarr; Quality Agents; href="/admin/agents" |
| C-0009 / 162 | EvalAgentPage / ADMIN | `button` type="button"; onClick={triggerRun}; disabled={busy \|\| !token} |
| C-0010 / 245 | EvalAgentPage / ADMIN | `li` onClick={() =&gt; selectRun(r.id)} |

### `web/app/admin/agents/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0011 / 149 | AgentsOverviewPage / ADMIN | `NavPill` Overview; href="/admin/agents" |
| C-0012 / 152 | AgentsOverviewPage / ADMIN | `NavPill` Eval scoreboard; href="/admin/agents/eval" |
| C-0013 / 153 | AgentsOverviewPage / ADMIN | `NavPill` Catalogue queue; href="/admin/agents/catalogue" |
| C-0014 / 159 | AgentsOverviewPage / ADMIN | `NavPill` Tradie edits; href="/admin/agents/tradie-edits" |
| C-0015 / 189 | AgentsOverviewPage / ADMIN | `AgentCard` name="Eval"; href="/admin/agents/eval" |
| C-0016 / 201 | AgentsOverviewPage / ADMIN | `AgentCard` name="Catalogue QA"; href="/admin/agents/catalogue" |
| C-0017 / 219 | AgentsOverviewPage / ADMIN | `AgentCard` name="Tradie-Learn"; href="/admin/agents/tradie-edits" |
| C-0018 / 250 | AgentsOverviewPage / ADMIN | `Link` href={\`/admin/agents/eval?run=${r.id}\`} |
| C-0019 / 307 | Breadcrumb / ADMIN | `Link` QuoteMax Admin; href="/admin" |
| C-0020 / 341 | NavPill / ADMIN | `Link` href={href} |
| C-0021 / 458 | AgentCard / ADMIN | `button` type="button"; onClick={onRun}; disabled={running} |
| C-0022 / 475 | AgentCard / ADMIN | `Link` Open; href={href} |

### `web/app/admin/agents/tradie-edits/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0023 / 117 | TradieEditsAgentPage / ADMIN | `Link` QuoteMax &rarr; Admin &rarr; Quality Agents; href="/admin/agents" |
| C-0024 / 130 | TradieEditsAgentPage / ADMIN | `input` type="number"; onChange={(e) =&gt; setLookbackHours(Math.max(1, parseInt(e.target.value, 10) \|\| 168))} |
| C-0025 / 138 | TradieEditsAgentPage / ADMIN | `button` type="button"; onClick={triggerRun}; disabled={busyRun \|\| !token} |
| C-0026 / 159 | TradieEditsAgentPage / ADMIN | `button` type="button"; onClick={() =&gt; setStatus(s)} |
| C-0027 / 232 | TradieEditsAgentPage / ADMIN | `button` Approve; type="button"; onClick={() =&gt; review(r.id, 'approved')}; disabled={busyRow === r.id} |
| C-0028 / 241 | TradieEditsAgentPage / ADMIN | `button` Reject; type="button"; onClick={() =&gt; review(r.id, 'rejected')}; disabled={busyRow === r.id} |

### `web/app/admin/customers/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0029 / 98 | AdminCustomersPage / ADMIN | `Link` QuoteMax / Admin; href="/admin" |
| C-0030 / 132 | AdminCustomersPage / ADMIN | `input` type="text"; onChange={(e) =&gt; setQ(e.target.value)}; placeholder="Search business name…" |
| C-0031 / 139 | AdminCustomersPage / ADMIN | `FilterSelect` onChange={setStatusFilter}; label="Status" |
| C-0032 / 145 | AdminCustomersPage / ADMIN | `FilterSelect` onChange={setTradeFilter}; label="Trade" |
| C-0033 / 153 | AdminCustomersPage / ADMIN | `FilterSelect` onChange={setPlanFilter}; label="Plan" |
| C-0034 / 222 | AdminCustomersPage / ADMIN | `Link` Manage →; href={\`/admin/customers/${c.id}\`} |
| C-0035 / 304 | FilterSelect / ADMIN | `select` onChange={(e) =&gt; onChange(e.target.value)} |

### `web/app/admin/customers/[id]/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0036 / 356 | AdminCustomerDetailPage / ADMIN | `ActionButton` Reactivate account; disabled={busy}; onClick={() =&gt; openConfirm({ title: 'Reactivate account', description: \`Set ${customer.business_name \|\| 'this tenant'} back to active?\`, confirmLabel: 'Reactivate', run: () =&gt; runPatch({ action: 'set_status', status: 'active' }, 'Account reactivated.'), }) } |
| C-0037 / 370 | AdminCustomerDetailPage / ADMIN | `ActionButton` Suspend account; disabled={busy}; onClick={() =&gt; openConfirm({ title: 'Suspend account', description: \`Suspend ${customer.business_name \|\| 'this tenant'}? Type the business name to confirm.\`, confirmLabel: 'Suspend', requireTyped: true, run: () =&gt; runPatch({ action: 'set_status', status: 'suspended' |
| C-0038 / 395 | AdminCustomerDetailPage / ADMIN | `ActionButton` disabled={busy}; onClick={() =&gt; openConfirm({ title: customer.billing_exempt ? 'Remove comp' : 'Comp tenant', description: customer.billing_exempt ? 'Remove billing exemption from this tenant?' : 'Mark this tenant billing-exempt (comped)?', confirmLabel: customer.billing_exempt ? 'Remove comp' : 'Co |
| C-0039 / 431 | AdminCustomerDetailPage / ADMIN | `input` type="checkbox"; onChange={(e) =&gt; { setTradesDraft((prev) =&gt; e.target.checked ? Array.from(new Set([...prev, t.slug])) : prev.filter((s) =&gt; s !== t.slug), ) }} |
| C-0040 / 457 | AdminCustomerDetailPage / ADMIN | `ActionButton` disabled={busy \|\| !tradesChanged}; onClick={() =&gt; openConfirm({ title: 'Update trades', description: \`Save the selected trades for ${customer.business_name \|\| 'this tenant'}? This changes which tools appear on their dashboard.\`, confirmLabel: 'Save trades', run: () =&gt; runPatch({ action: 'update_trad |
| C-0041 / 480 | AdminCustomerDetailPage / ADMIN | `select` onChange={(e) =&gt; setPlan(e.target.value as 'starter' \| 'pro' \| 'crew')} |
| C-0042 / 489 | AdminCustomerDetailPage / ADMIN | `select` onChange={(e) =&gt; setIntervalState(e.target.value as 'month' \| 'year')} |
| C-0043 / 498 | AdminCustomerDetailPage / ADMIN | `ActionButton` disabled={busy}; onClick={() =&gt; openConfirm({ title: hasSubscription ? 'Change plan' : 'Start subscription', description: \`${hasSubscription ? 'Change' : 'Start'} ${customer.business_name \|\| 'this tenant'} on ${capitalize(plan)} (${interval === 'year' ? 'annual' : 'monthly'})? This calls Stripe. Typ |
| C-0044 / 557 | AdminCustomerDetailPage / ADMIN | `input` type="text"; onChange={(e) =&gt; setTyped(e.target.value)}; placeholder={confirmPhrase} |
| C-0045 / 566 | AdminCustomerDetailPage / ADMIN | `button` Cancel; onClick={closeConfirm} |
| C-0046 / 572 | AdminCustomerDetailPage / ADMIN | `button` onClick={() =&gt; void confirmAndRun()}; disabled={pending.requireTyped ? typed !== confirmPhrase : false} |
| C-0047 / 592 | Breadcrumb / ADMIN | `Link` QuoteMax / Admin; href="/admin" |
| C-0048 / 596 | Breadcrumb / ADMIN | `Link` Customers; href="/admin/customers" |
| C-0049 / 655 | ActionButton / ADMIN | `button` onClick={onClick}; disabled={disabled} |

### `web/app/admin/docs/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0050 / 134 | AdminDocsPage / ADMIN | `Link` QuoteMax / Admin; href="/admin" |
| C-0051 / 162 | AdminDocsPage / ADMIN | `input` type="search"; onChange={(e) =&gt; setQ(e.target.value)}; placeholder="Search docs — e.g. pricing, SMS, onboarding…"; aria-label="Search documents" |
| C-0052 / 224 | DocCard / ADMIN | `a` href={\`/docs/${doc.file}\`} |
| C-0053 / 272 | Gate / ADMIN | `Link` Sign in; href="/signin" |

### `web/app/admin/files/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0054 / 123 | AdminFilesPage / ADMIN | `Link` QuoteMax / Admin; href="/admin" |
| C-0055 / 159 | AdminFilesPage / ADMIN | `select` onChange={(e) =&gt; { setSelected(e.target.value) setCommentsDoc(null) }} |
| C-0056 / 224 | AdminFilesPage / ADMIN | `button` Comments →; type="button"; onClick={() =&gt; setCommentsDoc(d)} |
| C-0057 / 246 | AdminFilesPage / ADMIN | `div` role="dialog"; aria-label={commentsDoc.display_name ?? 'Document comments'}; onClick={() =&gt; setCommentsDoc(null)} |
| C-0058 / 253 | AdminFilesPage / ADMIN | `div` onClick={(e) =&gt; e.stopPropagation()} |
| C-0059 / 261 | AdminFilesPage / ADMIN | `button` ✕; type="button"; onClick={() =&gt; { setCommentsDoc(null) if (selected) void loadDocs(selected) }}; aria-label="Close" |

### `web/app/admin/invites/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0060 / 219 | AdminInvitesPage / ADMIN | `input` onChange={(e) =&gt; setCampaign(e.target.value)}; placeholder="june_flyers" |
| C-0061 / 220 | AdminInvitesPage / ADMIN | `input` aria-label="Sign-up quota"; type="number"; onChange={(e) =&gt; setQuota(e.target.value)} |
| C-0062 / 223 | AdminInvitesPage / ADMIN | `select` aria-label="Invitation code scope"; onChange={(e) =&gt; setScope(e.target.value as 'tenant' \| 'platform')} |
| C-0063 / 230 | AdminInvitesPage / ADMIN | `input` onChange={(e) =&gt; setCustomCode(e.target.value)}; placeholder="MATE2026" |
| C-0064 / 234 | AdminInvitesPage / ADMIN | `button` type="button"; onClick={generate}; disabled={generating} |
| C-0065 / 240 | AdminInvitesPage / ADMIN | `ActionBtn` Copy; onClick={() =&gt; navigator.clipboard.writeText(justMade)} |
| C-0066 / 262 | AdminInvitesPage / ADMIN | `ActionBtn` Copy; onClick={() =&gt; navigator.clipboard.writeText(c.code)} |
| C-0067 / 263 | AdminInvitesPage / ADMIN | `ActionBtn` Email; onClick={() =&gt; { setSendFor({ id: c.id, channel: 'email' }); setSendTo(''); setSendMsg(null); setError(null) }} |
| C-0068 / 264 | AdminInvitesPage / ADMIN | `ActionBtn` SMS; onClick={() =&gt; { setSendFor({ id: c.id, channel: 'sms' }); setSendTo(''); setSendMsg(null); setError(null) }} |
| C-0069 / 265 | AdminInvitesPage / ADMIN | `ActionBtn` Pause; onClick={() =&gt; patchCode(c.id, { status: 'paused' })} |
| C-0070 / 266 | AdminInvitesPage / ADMIN | `ActionBtn` Resume; onClick={() =&gt; patchCode(c.id, { status: 'active' })} |
| C-0071 / 267 | AdminInvitesPage / ADMIN | `ActionBtn` Revoke; onClick={() =&gt; patchCode(c.id, { status: 'revoked' })} |
| C-0072 / 276 | AdminInvitesPage / ADMIN | `input` type={sendFor.channel === 'email' ? 'email' : 'tel'}; aria-label={sendFor.channel === 'email' ? 'Recipient email' : 'Recipient mobile'}; onChange={(e) =&gt; setSendTo(e.target.value)}; placeholder={sendFor.channel === 'email' ? 'tradie@example.com' : '0400 000 000'} |
| C-0073 / 284 | AdminInvitesPage / ADMIN | `button` type="button"; disabled={sendBusy}; onClick={() =&gt; sendCode(c.id, sendFor.channel, sendTo)} |
| C-0074 / 287 | AdminInvitesPage / ADMIN | `ActionBtn` Cancel; onClick={() =&gt; { setSendFor(null); setSendTo('') }} |
| C-0075 / 303 | AdminInvitesPage / ADMIN | `input` onChange={(e) =&gt; setSignupLabel(e.target.value)}; placeholder="Van decal · QR" |
| C-0076 / 306 | AdminInvitesPage / ADMIN | `button` type="button"; onClick={generateSignupQr}; disabled={signupGenerating} |
| C-0077 / 325 | AdminInvitesPage / ADMIN | `a` PNG; href={\`/api/dashboard/marketing/qr/${q.id}/image?format=png\`} |
| C-0078 / 326 | AdminInvitesPage / ADMIN | `a` SVG; href={\`/api/dashboard/marketing/qr/${q.id}/image?format=svg\`} |
| C-0079 / 327 | AdminInvitesPage / ADMIN | `ActionBtn` Copy link; onClick={() =&gt; navigator.clipboard.writeText(\`${origin}/s/${q.short_code}\`)} |
| C-0080 / 328 | AdminInvitesPage / ADMIN | `ActionBtn` Pause; onClick={() =&gt; patchQr(q.id, { status: 'paused' })} |
| C-0081 / 329 | AdminInvitesPage / ADMIN | `ActionBtn` Resume; onClick={() =&gt; patchQr(q.id, { status: 'active' })} |
| C-0082 / 330 | AdminInvitesPage / ADMIN | `ActionBtn` Archive; onClick={() =&gt; patchQr(q.id, { status: 'archived' })} |

### `web/app/admin/layout.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0083 / 118 | AdminNav / ADMIN | `Link` href="/dashboard" |
| C-0084 / 131 | AdminNav / ADMIN | `Link` Admin; href="/admin" |
| C-0085 / 140 | AdminNav / ADMIN | `Link` href="/dashboard" |
| C-0086 / 153 | AdminNav / ADMIN | `button` type="button"; onClick={onSignOut}; aria-label="Sign out" |

### `web/app/admin/loader/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0087 / 906 | AdminLoaderPage / ADMIN | `input` type="checkbox"; onChange={(e) =&gt; setNewTradeOpen(e.target.checked)} |
| C-0088 / 921 | AdminLoaderPage / ADMIN | `input` type="text"; onChange={(e) =&gt; setTradeName(e.target.value)}; placeholder="carpentry" |
| C-0089 / 931 | AdminLoaderPage / ADMIN | `input` type="text"; onChange={(e) =&gt; setTradeDisplay(e.target.value)}; placeholder="Carpentry" |
| C-0090 / 941 | AdminLoaderPage / ADMIN | `input` type="checkbox"; onChange={(e) =&gt; setTradeJobBased(e.target.checked)} |
| C-0091 / 975 | AdminLoaderPage / ADMIN | `input` type="number"; onChange={(e) =&gt; setTradeDefaults((d) =&gt; ({ ...d, [f.key]: e.target.value, })) } |
| C-0092 / 996 | AdminLoaderPage / ADMIN | `input` type="text"; onChange={(e) =&gt; setTradeDefaults((d) =&gt; ({ ...d, licenceLabel: e.target.value, })) }; placeholder="e.g. Carpenter licence" |
| C-0093 / 1011 | AdminLoaderPage / ADMIN | `input` type="checkbox"; onChange={(e) =&gt; setTradeGstRegistered(e.target.checked)} |
| C-0094 / 1024 | AdminLoaderPage / ADMIN | `input` type="checkbox"; onChange={(e) =&gt; setPromptPackOpen(e.target.checked)} |
| C-0095 / 1046 | AdminLoaderPage / ADMIN | `textarea` onChange={(e) =&gt; setTradePrompts((p) =&gt; ({ ...p, [f.key]: e.target.value, })) }; placeholder={f.hint} |
| C-0096 / 1073 | AdminLoaderPage / ADMIN | `a` href={\`/api/admin/loader/template?csv=${t}\`} |
| C-0097 / 1100 | AdminLoaderPage / ADMIN | `input` type="file"; onChange={(e) =&gt; setFile(e.target.files?.[0] ?? null)} |
| C-0098 / 1115 | AdminLoaderPage / ADMIN | `button` type="button"; disabled={busy}; onClick={handleUpload} |
| C-0099 / 1151 | AdminLoaderPage / ADMIN | `button` type="button"; onClick={() =&gt; { setTbNewStoreOpen((v) =&gt; !v) setError(null) }}; disabled={tbCreatingStore \|\| tbExtracting \|\| tbUploading} |
| C-0100 / 1162 | AdminLoaderPage / ADMIN | `button` type="button"; onClick={loadTbStores}; disabled={tbLoadingStores \|\| tbExtracting \|\| tbUploading} |
| C-0101 / 1178 | AdminLoaderPage / ADMIN | `input` type="text"; onChange={(e) =&gt; setTbNewStoreName(e.target.value)}; placeholder="e.g. Sparky trade books 2024"; disabled={tbCreatingStore}; aria-label="New store display name" |
| C-0102 / 1187 | AdminLoaderPage / ADMIN | `button` type="button"; onClick={handleCreateStore}; disabled={tbCreatingStore \|\| !tbNewStoreName.trim()} |
| C-0103 / 1206 | AdminLoaderPage / ADMIN | `select` onChange={(e) =&gt; { setTbStoreId(e.target.value) if (e.target.value) loadTbDocs(e.target.value) else { setTbDocuments(null); setTbDocumentName('') } }}; disabled={tbExtracting}; aria-label="Knowledge-base store"; title="Knowledge-base store" |
| C-0104 / 1247 | AdminLoaderPage / ADMIN | `select` onChange={(e) =&gt; setTbDocumentName(e.target.value)}; disabled={tbExtracting}; aria-label="Document within store"; title="Document within store" |
| C-0105 / 1289 | AdminLoaderPage / ADMIN | `input` type="file"; disabled={tbUploading \|\| tbExtracting}; onChange={(e) =&gt; { const f = e.target.files?.[0] if (f) void handleUploadPdf(f) e.target.value = '' }} |
| C-0106 / 1315 | AdminLoaderPage / ADMIN | `select` onChange={(e) =&gt; setTbTrade(e.target.value)}; disabled={tbExtracting} |
| C-0107 / 1335 | AdminLoaderPage / ADMIN | `input` type="text"; onChange={(e) =&gt; setTbSourceLabel(e.target.value)}; placeholder="e.g. Sparky pricing guide 2024"; disabled={tbExtracting} |
| C-0108 / 1349 | AdminLoaderPage / ADMIN | `button` type="button"; disabled={tbExtracting \|\| !tbStoreId}; onClick={handleExtract} |
| C-0109 / 1529 | AdminLoaderPage / ADMIN | `button` type="button"; disabled={busy \|\| totalStaged === 0}; onClick={handleApprove} |
| C-0110 / 1540 | AdminLoaderPage / ADMIN | `button` type="button"; disabled={busy}; onClick={handleRollback} |
| C-0111 / 1550 | AdminLoaderPage / ADMIN | `button` type="button"; disabled={busy}; onClick={resetAll} |

### `web/app/admin/metrics/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0112 / 85 | AdminMetricsPage / ADMIN | `Link` QuoteMax; href="/admin" |
| C-0113 / 89 | AdminMetricsPage / ADMIN | `Link` Admin; href="/admin" |
| C-0114 / 122 | AdminMetricsPage / ADMIN | `Link` Sign in; href="/signin" |
| C-0115 / 293 | Controls / ADMIN | `button` w; type="button"; onClick={() =&gt; onWeeks(w)} |
| C-0116 / 309 | Controls / ADMIN | `button` type="button"; onClick={() =&gt; onIncludeTest(!includeTest)}; title="Show seed/pilot tenants and test traffic" |
| C-0117 / 323 | Controls / ADMIN | `button` type="button"; onClick={onRefresh}; disabled={refreshing} |

### `web/app/admin/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0118 / 249 | DestinationTile / ADMIN | `Link` href={tile.href} |

### `web/app/admin/tenants/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0119 / 93 | AdminTenantsPage / ADMIN | `Link` QuoteMax / Admin; href="/admin" |
| C-0120 / 104 | AdminTenantsPage / ADMIN | `button` Refresh; type="button"; onClick={() =&gt; void load()} |

### `web/app/auth/callback/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0121 / 206 | AuthCallbackInner / AUTH | `Link` Sign in; href="/signin" |
| C-0122 / 212 | AuthCallbackInner / AUTH | `Link` Try again; href="/signup" |

### `web/app/auth/reset-password/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0123 / 149 | ResetPasswordInner / AUTH | `Link` Sign in; href="/signin" |
| C-0124 / 157 | ResetPasswordInner / AUTH | `Link` Request a new link; href="/forgot-password" |
| C-0125 / 181 | ResetPasswordInner / AUTH | `Link` go to your dashboard; href="/dashboard" |
| C-0126 / 200 | ResetPasswordInner / AUTH | `form` onSubmit={handleSubmit} |
| C-0127 / 202 | ResetPasswordInner / AUTH | `input` type="password"; onChange={(e) =&gt; setPassword(e.target.value)} |
| C-0128 / 213 | ResetPasswordInner / AUTH | `input` type="password"; onChange={(e) =&gt; setConfirm(e.target.value)} |
| C-0129 / 226 | ResetPasswordInner / AUTH | `button` type="submit"; disabled={phase === 'saving'} |

### `web/app/AuthNav.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0130 / 102 | AuthNav / PUBLIC | `Link` Dashboard; href="/dashboard" |
| C-0131 / 106 | AuthNav / PUBLIC | `Link` Sign in; href="/sign-in" |
| C-0132 / 122 | AuthNav / PUBLIC | `Link` Open my dashboard; href="/dashboard" |
| C-0133 / 129 | AuthNav / PUBLIC | `Link` Get my QuoteMax; href="/signup" |
| C-0134 / 141 | AuthNav / PUBLIC | `Link` Dashboard; href="/dashboard" |
| C-0135 / 148 | AuthNav / PUBLIC | `button` type="button"; onClick={handleSignOut}; disabled={signingOut} |
| C-0136 / 159 | AuthNav / PUBLIC | `Link` Sign in; href="/sign-in" |
| C-0137 / 165 | AuthNav / PUBLIC | `Link` Get my QuoteMax; href="/signup" |

### `web/app/book/[tenantId]/BookingForm.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0138 / 120 | BookingForm / PUBLIC | `form` onSubmit={onSubmit} |
| C-0139 / 123 | BookingForm / PUBLIC | `input` id="bk-name"; onChange={(e) =&gt; setName(e.target.value)} |
| C-0140 / 129 | BookingForm / PUBLIC | `input` id="bk-phone"; onChange={(e) =&gt; setPhone(e.target.value)}; placeholder="04xx xxx xxx" |
| C-0141 / 136 | BookingForm / PUBLIC | `input` id="bk-email"; type="email"; onChange={(e) =&gt; setEmail(e.target.value)} |
| C-0142 / 143 | BookingForm / PUBLIC | `input` id="bk-suburb"; onChange={(e) =&gt; setSuburb(e.target.value)} |
| C-0143 / 148 | BookingForm / PUBLIC | `input` id="bk-address"; onChange={(e) =&gt; setAddress(e.target.value)} |
| C-0144 / 155 | BookingForm / PUBLIC | `textarea` id="bk-desc"; onChange={(e) =&gt; setDescription(e.target.value)}; placeholder="e.g. 4 downlights in the kitchen" |
| C-0145 / 162 | BookingForm / PUBLIC | `select` id="bk-slot"; onChange={(e) =&gt; setSlot(e.target.value)} |
| C-0146 / 177 | BookingForm / PUBLIC | `button` type="submit"; disabled={submitting} |

### `web/app/dashboard/aircon/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0147 / 245 | AirconRecommendPageInner / TRADE | `form` onSubmit={run} |
| C-0148 / 250 | AirconRecommendPageInner / TRADE | `AddressAutocomplete` onChange={setAddress}; placeholder="Start typing — e.g. 27 Smith Street, Penrith" |
| C-0149 / 266 | AirconRecommendPageInner / TRADE | `input` onChange={(e) =&gt; setPostcode(e.target.value)} |
| C-0150 / 270 | AirconRecommendPageInner / TRADE | `select` onChange={(e) =&gt; setStateCode(e.target.value as AusState)} |
| C-0151 / 280 | AirconRecommendPageInner / TRADE | `input` type="number"; onChange={(e) =&gt; setBedrooms(Number(e.target.value))} |
| C-0152 / 284 | AirconRecommendPageInner / TRADE | `input` type="number"; onChange={(e) =&gt; setBathrooms(Number(e.target.value))} |
| C-0153 / 288 | AirconRecommendPageInner / TRADE | `input` type="number"; onChange={(e) =&gt; setLivingSpaces(Number(e.target.value))} |
| C-0154 / 292 | AirconRecommendPageInner / TRADE | `select` onChange={(e) =&gt; setStoreys(Number(e.target.value))} |
| C-0155 / 298 | AirconRecommendPageInner / TRADE | `input` type="number"; onChange={(e) =&gt; setFloorArea(e.target.value)}; placeholder="blank = satellite" |
| C-0156 / 302 | AirconRecommendPageInner / TRADE | `select` onChange={(e) =&gt; setCeiling(e.target.value as CeilingHeight)} |
| C-0157 / 312 | AirconRecommendPageInner / TRADE | `select` onChange={(e) =&gt; setInsulation(e.target.value as Insulation)} |
| C-0158 / 318 | AirconRecommendPageInner / TRADE | `select` onChange={(e) =&gt; setSituation(e.target.value as CurrentSituation)} |
| C-0159 / 324 | AirconRecommendPageInner / TRADE | `input` type="number"; onChange={(e) =&gt; setBudget(e.target.value)} |
| C-0160 / 339 | AirconRecommendPageInner / TRADE | `input` type="file"; onChange={(e) =&gt; setPlanFile(e.target.files?.[0] ?? null)} |
| C-0161 / 350 | AirconRecommendPageInner / TRADE | `button` Remove; type="button"; onClick={() =&gt; setPlanFile(null)} |
| C-0162 / 366 | AirconRecommendPageInner / TRADE | `button` type="submit"; disabled={busy} |
| C-0163 / 493 | Result / TRADE | `AirconPdfButton`  |
| C-0164 / 548 | AirconPdfButton / TRADE | `button` type="button"; onClick={() =&gt; void download()}; disabled={busy} |
| C-0165 / 792 | SizingPanel / TRADE | `details`  |
| C-0166 / 793 | SizingPanel / TRADE | `summary` Per-room volumetric working |
| C-0167 / 861 | OptionCard / TRADE | `details`  |
| C-0168 / 862 | OptionCard / TRADE | `summary` How this price was calculated |
| C-0169 / 909 | OptionCard / TRADE | `details`  |
| C-0170 / 910 | OptionCard / TRADE | `summary` Indicative layout |

### `web/app/dashboard/crm/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0171 / 229 | CrmPage / CORE | `Link` Dashboard; href="/dashboard" |
| C-0172 / 302 | CrmPage / CORE | `button` type="button"; disabled={busy === \`sync:${c.provider}\`}; onClick={() =&gt; sync(c.provider)} |
| C-0173 / 305 | CrmPage / CORE | `button` Disconnect; type="button"; disabled={busy === \`disconnect:${c.provider}\`}; onClick={() =&gt; disconnect(c.provider)} |
| C-0174 / 322 | CrmPage / CORE | `button` type="button"; disabled={busy === \`connect:${p}\`}; onClick={() =&gt; connect(p)} |
| C-0175 / 348 | CrmPage / CORE | `select` aria-label="Recipient mode"; onChange={(e) =&gt; { setMode(e.target.value as 'unsent' \| 'all') setPreview(null) }} |
| C-0176 / 361 | CrmPage / CORE | `button` type="button"; disabled={busy === 'preview'}; onClick={runPreview} |
| C-0177 / 381 | CrmPage / CORE | `button` type="button"; disabled={busy === 'send' \|\| preview.recipient_count === 0}; onClick={send} |
| C-0178 / 437 | CrmPage / CORE | `button` Retry; type="button"; onClick={() =&gt; { setError(null) setLoading(true) void load() }} |
| C-0179 / 448 | CrmPage / CORE | `Link` Sign in again; href="/signin" |
| C-0180 / 479 | CrmPage / CORE | `button` type="button"; disabled={busy === \`connect:${p}\`}; onClick={() =&gt; connect(p)} |

### `web/app/dashboard/flyer/_components/CanvaStudio.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0181 / 204 | CanvaStudio / CORE | `button` &larr; Back to flyers; onClick={onBack} |
| C-0182 / 252 | CanvaStudio / CORE | `button` Disconnect; onClick={disconnect}; disabled={busy} |
| C-0183 / 262 | CanvaStudio / CORE | `button` onClick={connect}; disabled={busy} |
| C-0184 / 279 | CanvaStudio / CORE | `a` href={t.canvaUrl} |
| C-0185 / 316 | CanvaStudio / CORE | `button` onClick={createDesign}; disabled={busy} |
| C-0186 / 331 | CanvaStudio / CORE | `a` Open in Canva; href={d.edit_url} |
| C-0187 / 334 | CanvaStudio / CORE | `button` onClick={() =&gt; importDesign(d.id)}; disabled={importingId === d.id} |
| C-0188 / 337 | CanvaStudio / CORE | `button` Delete; onClick={() =&gt; deleteDesign(d.id)}; disabled={busy}; aria-label={\`Delete ${d.title \|\| 'flyer'}\`} |
| C-0189 / 351 | CanvaStudio / CORE | `a` PNG ↓; href={d.png_url} |
| C-0190 / 356 | CanvaStudio / CORE | `a` PDF ↓; href={d.pdf_url} |

### `web/app/dashboard/flyer/_components/FlyerCanvasEditor.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0191 / 63 | CanvasImage / CORE | `Rect` onClick={onSelect} |
| C-0192 / 82 | CanvasImage / CORE | `KonvaImage` onClick={onSelect} |
| C-0193 / 198 | FlyerCanvasEditor / CORE | `Rect` onClick={() =&gt; onSelect(el.id)} |
| C-0194 / 231 | FlyerCanvasEditor / CORE | `Text` onClick={() =&gt; onSelect(el.id)} |
| C-0195 / 264 | FlyerCanvasEditor / CORE | `CanvasImage` onChange={(patch) =&gt; patchEl(el.id, patch)} |

### `web/app/dashboard/invites/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0196 / 135 | MarketingPage / CORE | `Link` Dashboard; href="/dashboard" |
| C-0197 / 169 | MarketingPage / CORE | `input` onChange={(e) =&gt; setSlugInput(e.target.value)}; placeholder="atomic-electrical" |
| C-0198 / 171 | MarketingPage / CORE | `button` type="button"; onClick={saveSlug}; disabled={slugSaving} |
| C-0199 / 184 | MarketingPage / CORE | `input` onChange={(e) =&gt; setQrLabel(e.target.value)}; placeholder="June letterbox drop" |
| C-0200 / 187 | MarketingPage / CORE | `select` aria-label="Where the QR sends customers"; onChange={(e) =&gt; setQrDest(e.target.value as 'sms' \| 'landing')} |
| C-0201 / 194 | MarketingPage / CORE | `input` aria-label="Pre-filled SMS text"; onChange={(e) =&gt; setQrPrefill(e.target.value)} |
| C-0202 / 198 | MarketingPage / CORE | `button` type="button"; onClick={generateQr}; disabled={qrGenerating} |
| C-0203 / 218 | MarketingPage / CORE | `a` PNG; href={\`/api/dashboard/marketing/qr/${q.id}/image?format=png\`} |
| C-0204 / 219 | MarketingPage / CORE | `a` SVG; href={\`/api/dashboard/marketing/qr/${q.id}/image?format=svg\`} |
| C-0205 / 220 | MarketingPage / CORE | `ActionBtn` Copy link; onClick={() =&gt; navigator.clipboard.writeText(\`${origin}/s/${q.short_code}\`)} |
| C-0206 / 221 | MarketingPage / CORE | `ActionBtn` Repoint→; onClick={() =&gt; patchQr(q.id, { destination_type: q.destination_type === 'sms' ? 'landing' : 'sms' })} |
| C-0207 / 222 | MarketingPage / CORE | `ActionBtn` Pause; onClick={() =&gt; patchQr(q.id, { status: 'paused' })} |
| C-0208 / 223 | MarketingPage / CORE | `ActionBtn` Resume; onClick={() =&gt; patchQr(q.id, { status: 'active' })} |
| C-0209 / 224 | MarketingPage / CORE | `ActionBtn` Archive; onClick={() =&gt; patchQr(q.id, { status: 'archived' })} |

### `web/app/dashboard/job/_components/JobQuoteForm.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0210 / 310 | JobQuoteForm / TRADE | `Link` Dashboard; href="/dashboard" |
| C-0211 / 325 | JobQuoteForm / TRADE | `form` onSubmit={submit} |
| C-0212 / 331 | JobQuoteForm / TRADE | `select` id="job-type"; onChange={(e) =&gt; pickJobType(e.target.value)} |
| C-0213 / 357 | JobQuoteForm / TRADE | `select` id={\`f-${f.code}\`}; onChange={(e) =&gt; setAnswers((a) =&gt; ({ ...a, [f.code]: e.target.value }))} |
| C-0214 / 371 | JobQuoteForm / TRADE | `input` id={\`f-${f.code}\`}; type={f.type === 'number' ? 'number' : 'text'}; onChange={(e) =&gt; setAnswers((a) =&gt; ({ ...a, [f.code]: e.target.value }))} |
| C-0215 / 388 | JobQuoteForm / TRADE | `select` id="product"; onChange={(e) =&gt; setProductName(e.target.value)} |
| C-0216 / 444 | JobQuoteForm / TRADE | `AddressAutocomplete` id="address"; onChange={setAddress}; placeholder="12 Smith St" |
| C-0217 / 476 | JobQuoteForm / TRADE | `input` id="suburb"; onChange={(e) =&gt; setSuburb(e.target.value)}; placeholder="Newtown" |
| C-0218 / 490 | JobQuoteForm / TRADE | `textarea` id="notes"; onChange={(e) =&gt; setNotes(e.target.value)}; placeholder="Access, existing wiring, age of the property, anything that changes the price." |
| C-0219 / 511 | JobQuoteForm / TRADE | `input` id="cname"; onChange={(e) =&gt; setCustomerName(e.target.value)} |
| C-0220 / 522 | JobQuoteForm / TRADE | `input` id="cmobile"; type="tel"; onChange={(e) =&gt; setCustomerMobile(e.target.value)}; placeholder="04.." |
| C-0221 / 535 | JobQuoteForm / TRADE | `input` id="cemail"; type="email"; onChange={(e) =&gt; setCustomerEmail(e.target.value)} |
| C-0222 / 560 | JobQuoteForm / TRADE | `button` type="submit" |

### `web/app/dashboard/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0223 / 949 | DashboardPage / CORE | `button` Try again; onClick={() =&gt; accessToken && refresh(accessToken)} |
| C-0224 / 1137 | DashboardPage / CORE | `Link` href="/dashboard/aircon" |
| C-0225 / 1169 | DashboardPage / CORE | `Link` href="/dashboard/invites" |
| C-0226 / 1188 | DashboardPage / CORE | `Link` href="/dashboard/crm" |
| C-0227 / 1207 | DashboardPage / CORE | `Link` href="/dashboard/studio" |
| C-0228 / 1335 | Shell / CORE | `Link` href="/dashboard" |
| C-0229 / 1354 | Shell / CORE | `button` type="button"; onClick={() =&gt; setPaletteOpen(true)}; aria-label="Search quotes, customers, jobs" |
| C-0230 / 1377 | Shell / CORE | `button` type="button"; onClick={() =&gt; setPaletteOpen(true)}; aria-label="Search quotes, customers, jobs" |
| C-0231 / 1400 | Shell / CORE | `button` type="button"; onClick={() =&gt; topbar.setTab('quotes')}; aria-label="Review queue" |
| C-0232 / 1421 | Shell / CORE | `ThemeToggle`  |
| C-0233 / 1441 | Shell / CORE | `button` type="button"; onClick={onSignOut}; aria-label="Sign out" |
| C-0234 / 1531 | ProfileChip / CORE | `button` type="button"; onClick={() =&gt; setOpen((v) =&gt; !v)}; aria-label="Account menu" |
| C-0235 / 1597 | ProfileChip / CORE | `button` Account settings; type="button"; onClick={() =&gt; { setOpen(false) onAccount() }} |
| C-0236 / 1609 | ProfileChip / CORE | `button` Sign out; type="button"; onClick={() =&gt; { setOpen(false) onSignOut() }} |
| C-0237 / 1682 | NotificationsBell / CORE | `button` type="button"; onClick={() =&gt; setOpen((v) =&gt; !v)}; aria-label={ pending.length &gt; 0 ? \`Notifications, ${pending.length} quotes to review\` : 'Notifications' } |
| C-0238 / 1719 | NotificationsBell / CORE | `button` type="button"; onClick={() =&gt; { setOpen(false) onOpenQuotes() }} |
| C-0239 / 1746 | NotificationsBell / CORE | `button` View all quotes →; type="button"; onClick={() =&gt; { setOpen(false) onOpenQuotes() }} |
| C-0240 / 1844 | CommandPalette / CORE | `div` onClick={onClose}; role="dialog"; aria-label="Search quotes, customers, jobs" |
| C-0241 / 1851 | CommandPalette / CORE | `div` onClick={(e) =&gt; e.stopPropagation()} |
| C-0242 / 1862 | CommandPalette / CORE | `input` onChange={(e) =&gt; setQuery(e.target.value)}; placeholder="Search quotes, customers, jobs"; aria-label="Search quotes, customers, jobs" |
| C-0243 / 1891 | CommandPalette / CORE | `button` type="button"; onClick={() =&gt; go(item.tab)} |
| C-0244 / 1915 | CommandPalette / CORE | `Link` href="/dashboard/pricing-wizard"; onClick={onClose} |
| C-0245 / 1945 | CommandPalette / CORE | `button` type="button"; onClick={() =&gt; go('quotes')} |
| C-0246 / 2170 | Sidebar / CORE | `button` type="button"; onClick={onToggleCollapse}; aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}; title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} |
| C-0247 / 2209 | Sidebar / CORE | `button` type="button"; onClick={() =&gt; setTab(item.tab)}; title={item.label}; aria-label={collapsed ? item.label : undefined} |
| C-0248 / 2278 | Sidebar / CORE | `Link` href="/dashboard/pricing-wizard"; title="Pricing wizard"; aria-label={collapsed ? 'Pricing wizard' : undefined} |
| C-0249 / 2318 | Sidebar / CORE | `a` href="/admin"; title="Admin command centre"; aria-label={collapsed ? 'Admin command centre' : undefined} |
| C-0250 / 2386 | MobileTabBar / CORE | `button` type="button"; onClick={() =&gt; setTab(item.tab)} |
| C-0251 / 2419 | MobileTabBar / CORE | `Link` href="/dashboard/pricing-wizard" |
| C-0252 / 2607 | FilterSelect / CORE | `select` onChange={(e) =&gt; onChange(e.target.value)} |
| C-0253 / 2723 | SectionTabs / CORE | `button` type="button"; role="tab"; id={\`section-tab-${s.id}\`}; onClick={() =&gt; onChange(s.id)} |
| C-0254 / 3012 | OverviewTab / CORE | `SectionTabs` onChange={setSection} |
| C-0255 / 3106 | OverviewTab / CORE | `button` View all →; type="button"; onClick={() =&gt; setTab('quotes')} |
| C-0256 / 3119 | OverviewTab / CORE | `button` Retry; type="button"; onClick={() =&gt; setJobsReload((n) =&gt; n + 1)} |
| C-0257 / 3205 | OverviewTab / CORE | `a` href={v.href} |
| C-0258 / 3215 | OverviewTab / CORE | `button` type="button"; onClick={() =&gt; setTab('quotes')} |
| C-0259 / 3232 | OverviewTab / CORE | `button` type="button"; onClick={() =&gt; openQuote(q)} |
| C-0260 / 3289 | OverviewTab / CORE | `button` Add your photo →; type="button"; onClick={() =&gt; setTab('account')} |
| C-0261 / 3325 | OverviewTab / CORE | `button` Review quote →; type="button"; onClick={() =&gt; openQuote(attnQuote)} |
| C-0262 / 3360 | OverviewTab / CORE | `a` Review job →; href={attnJob.href} |
| C-0263 / 3369 | OverviewTab / CORE | `button` Review job →; type="button"; onClick={() =&gt; setTab('quotes')} |
| C-0264 / 3405 | OverviewTab / CORE | `CopyNumberButton`  |
| C-0265 / 3414 | OverviewTab / CORE | `RetryProvisionButton`  |
| C-0266 / 3422 | OverviewTab / CORE | `RetryProvisionButton`  |
| C-0267 / 3433 | OverviewTab / CORE | `button` Open →; type="button"; onClick={() =&gt; setTab('chats')} |
| C-0268 / 3457 | OverviewTab / CORE | `button` Retry; type="button"; onClick={() =&gt; setChatsReload((n) =&gt; n + 1)} |
| C-0269 / 3540 | OverviewHeader / CORE | `PeriodPicker` onChange={onPeriod} |
| C-0270 / 3545 | OverviewHeader / CORE | `button` Review queue; type="button"; onClick={onNewQuote} |
| C-0271 / 3595 | PeriodPicker / CORE | `button` type="button"; onClick={() =&gt; setOpen((v) =&gt; !v)}; aria-label={\`Reporting period: ${periodLabel(period)}\`} |
| C-0272 / 3626 | PeriodPicker / CORE | `button` type="button"; role="menuitemradio"; onClick={() =&gt; { onChange(p.key) setOpen(false) btnRef.current?.focus() }} |
| C-0273 / 3667 | CopyNumberButton / CORE | `button` type="button"; onClick={copy}; aria-label={copied ? 'Number copied' : 'Copy number'} |
| C-0274 / 3752 | RetryProvisionButton / CORE | `button` type="button"; onClick={handleClick}; disabled={busy} |
| C-0275 / 3922 | LatestQuoteRow / CORE | `button` type="button"; onClick={onOpen} |
| C-0276 / 3964 | LatestChatRow / CORE | `button` type="button"; onClick={onOpen} |
| C-0277 / 4042 | SmsEstimatorCard / CORE | `button` type="button"; role="switch"; onClick={toggle}; disabled={busy} |
| C-0278 / 4137 | BrandImageCard / CORE | `input` type="file"; onChange={(e) =&gt; handleFile(e.target.files?.[0] ?? null)}; disabled={uploading} |
| C-0279 / 4210 | DefaultScheduleCard / CORE | `AvailabilityEditor` onChange={setValue}; disabled={busy} |
| C-0280 / 4212 | DefaultScheduleCard / CORE | `button` type="button"; onClick={save}; disabled={busy \|\| !valid} |
| C-0281 / 4333 | AccountTab / CORE | `form` onSubmit={handleSubmit} |
| C-0282 / 4336 | AccountTab / CORE | `input` type="text"; onChange={(e) =&gt; setForm({ ...form, business_name: e.target.value })} |
| C-0283 / 4345 | AccountTab / CORE | `input` type="text"; onChange={(e) =&gt; setForm({ ...form, owner_first_name: e.target.value })} |
| C-0284 / 4353 | AccountTab / CORE | `input` type="email"; onChange={(e) =&gt; setForm({ ...form, owner_email: e.target.value })} |
| C-0285 / 4361 | AccountTab / CORE | `input` type="tel"; onChange={(e) =&gt; setForm({ ...form, owner_mobile: e.target.value })} |
| C-0286 / 4369 | AccountTab / CORE | `select` onChange={(e) =&gt; setForm({ ...form, state: e.target.value })} |
| C-0287 / 4383 | AccountTab / CORE | `input` type="text"; onChange={(e) =&gt; setForm({ ...form, abn: e.target.value })} |
| C-0288 / 4401 | AccountTab / CORE | `button` type="submit"; disabled={submitting} |
| C-0289 / 4608 | PayoutsTab / CORE | `button` type="button"; onClick={startOnboarding}; disabled={busy} |
| C-0290 / 4618 | PayoutsTab / CORE | `button` type="button"; onClick={startOnboarding}; disabled={busy} |
| C-0291 / 4636 | PayoutsTab / CORE | `button` type="button"; onClick={() =&gt; void syncStatus(false)}; disabled={syncing} |
| C-0292 / 4931 | PayoutJobsSection / CORE | `button` type="button"; onClick={() =&gt; releaseJob(j.quote_id)}; disabled={busyId !== null \|\| j.release_state === 'in_flight'} |
| C-0293 / 5224 | LicencesCard / CORE | `form` onSubmit={handleSubmit} |
| C-0294 / 5237 | LicencesCard / CORE | `input` type="text"; onChange={(e) =&gt; update(l.trade, 'licence_type', e.target.value)}; placeholder={l.trade === 'electrical' ? 'e.g. NECA NSW' : 'e.g. NSW Fair Trading'} |
| C-0295 / 5247 | LicencesCard / CORE | `input` type="text"; onChange={(e) =&gt; update(l.trade, 'licence_number', e.target.value)} |
| C-0296 / 5256 | LicencesCard / CORE | `select` onChange={(e) =&gt; update(l.trade, 'licence_state', e.target.value)} |
| C-0297 / 5270 | LicencesCard / CORE | `input` type="date"; onChange={(e) =&gt; update(l.trade, 'licence_expiry', e.target.value)} |
| C-0298 / 5286 | LicencesCard / CORE | `button` type="submit"; disabled={submitting} |
| C-0299 / 5433 | TradesCard / CORE | `button` type="button"; onClick={() =&gt; toggle(t.name)}; disabled={busy} |
| C-0300 / 5466 | TradesCard / CORE | `button` type="button"; onClick={handleSave}; disabled={!dirty \|\| busy} |
| C-0301 / 5527 | ConfirmRemoveTrade / CORE | `button` Cancel; type="button"; onClick={onCancel}; disabled={busy} |
| C-0302 / 5536 | ConfirmRemoveTrade / CORE | `button` type="button"; onClick={onConfirm}; disabled={busy} |
| C-0303 / 5654 | ActivateTradeCard / CORE | `button` type="button"; onClick={() =&gt; activate(t)}; disabled={busyTrade !== null} |
| C-0304 / 5919 | ReviewPolicyCard / CORE | `form` onSubmit={handleSubmit} |
| C-0305 / 5923 | ReviewPolicyCard / CORE | `input` type="radio"; name="review_policy"; onChange={() =&gt; setPolicy('auto_send')} |
| C-0306 / 5939 | ReviewPolicyCard / CORE | `input` type="radio"; name="review_policy"; onChange={() =&gt; setPolicy('always_review')} |
| C-0307 / 5955 | ReviewPolicyCard / CORE | `input` type="radio"; name="review_policy"; onChange={() =&gt; setPolicy('review_over_threshold')} |
| C-0308 / 5965 | ReviewPolicyCard / CORE | `input` type="number"; onChange={(e) =&gt; setThreshold(e.target.value)}; disabled={policy !== 'review_over_threshold'}; aria-label="Review threshold in dollars inc-GST" |
| C-0309 / 5991 | ReviewPolicyCard / CORE | `button` type="submit"; disabled={submitting \|\| !dirty} |
| C-0310 / 6061 | Followup2hCard / CORE | `form` onSubmit={handleSubmit} |
| C-0311 / 6064 | Followup2hCard / CORE | `input` type="checkbox"; onChange={(e) =&gt; setEnabled(e.target.checked)} |
| C-0312 / 6090 | Followup2hCard / CORE | `button` type="submit"; disabled={submitting \|\| !dirty} |
| C-0313 / 6207 | QuoteTierModeCard / CORE | `form` onSubmit={handleSubmit} |
| C-0314 / 6216 | QuoteTierModeCard / CORE | `input` type="radio"; name={\`quote_tier_mode_${trade}\`}; onChange={() =&gt; setModes((m) =&gt; ({ ...m, [trade]: opt.value }))} |
| C-0315 / 6242 | QuoteTierModeCard / CORE | `button` type="submit"; disabled={submitting \|\| !dirty} |
| C-0316 / 6311 | QuoteDisplayCard / CORE | `form` onSubmit={handleSubmit} |
| C-0317 / 6315 | QuoteDisplayCard / CORE | `input` type="radio"; name="quote_display"; onChange={() =&gt; setMode('itemised')} |
| C-0318 / 6331 | QuoteDisplayCard / CORE | `input` type="radio"; name="quote_display"; onChange={() =&gt; setMode('summary')} |
| C-0319 / 6356 | QuoteDisplayCard / CORE | `button` type="submit"; disabled={submitting \|\| mode === current} |
| C-0320 / 6618 | CalibrationCard / CORE | `input` type="file"; disabled={uploading}; onChange={(e) =&gt; { const f = e.target.files?.[0] if (f) void onFile(f) e.target.value = '' }} |
| C-0321 / 6686 | CalibrationCard / CORE | `button` type="button"; disabled={busyAction === trade}; onClick={() =&gt; void actOnSuggestion(trade, true)} |
| C-0322 / 6694 | CalibrationCard / CORE | `button` Reject; type="button"; disabled={busyAction === trade}; onClick={() =&gt; void actOnSuggestion(trade, false)} |
| C-0323 / 6711 | CalibrationCard / CORE | `details`  |
| C-0324 / 6712 | CalibrationCard / CORE | `summary` ▸ Uploaded invoices ( ) |
| C-0325 / 6812 | EarlyBirdCard / CORE | `form` onSubmit={handleSubmit} |
| C-0326 / 6815 | EarlyBirdCard / CORE | `input` type="checkbox"; onChange={(e) =&gt; setForm({ ...form, enabled: e.target.checked })} |
| C-0327 / 6829 | EarlyBirdCard / CORE | `input` type="number"; onChange={(e) =&gt; setForm({ ...form, discount_pct: e.target.value })}; disabled={!form.enabled} |
| C-0328 / 6841 | EarlyBirdCard / CORE | `input` type="number"; onChange={(e) =&gt; setForm({ ...form, window_hours: e.target.value })}; disabled={!form.enabled} |
| C-0329 / 6864 | EarlyBirdCard / CORE | `button` type="submit"; disabled={submitting} |
| C-0330 / 6949 | PricingBookCard / CORE | `form` onSubmit={handleSubmit} |
| C-0331 / 6952 | PricingBookCard / CORE | `input` type="number"; onChange={(e) =&gt; setForm({ ...form, hourly_rate: e.target.value })} |
| C-0332 / 6963 | PricingBookCard / CORE | `input` type="number"; onChange={(e) =&gt; setForm({ ...form, min_labour_hours: e.target.value })} |
| C-0333 / 6979 | PricingBookCard / CORE | `input` type="number"; onChange={(e) =&gt; setForm({ ...form, default_markup_pct: e.target.value })} |
| C-0334 / 6991 | PricingBookCard / CORE | `button` type="button"; onClick={() =&gt; setShowAdvanced((v) =&gt; !v)} |
| C-0335 / 7002 | PricingBookCard / CORE | `input` type="number"; onChange={(e) =&gt; setForm({ ...form, apprentice_rate: e.target.value })} |
| C-0336 / 7012 | PricingBookCard / CORE | `input` type="number"; onChange={(e) =&gt; setForm({ ...form, senior_rate: e.target.value })} |
| C-0337 / 7022 | PricingBookCard / CORE | `input` type="number"; onChange={(e) =&gt; setForm({ ...form, after_hours_multiplier: e.target.value })} |
| C-0338 / 7033 | PricingBookCard / CORE | `input` type="number"; aria-label="Callout minimum"; onChange={(e) =&gt; setForm({ ...form, call_out_minimum: e.target.value })} |
| C-0339 / 7049 | PricingBookCard / CORE | `input` type="number"; onChange={(e) =&gt; setForm({ ...form, risk_buffer_pct: e.target.value })} |
| C-0340 / 7061 | PricingBookCard / CORE | `input` type="checkbox"; onChange={(e) =&gt; setForm({ ...form, gst_registered: e.target.checked })} |
| C-0341 / 7077 | PricingBookCard / CORE | `button` type="submit"; disabled={submitting} |
| C-0342 / 7314 | ServicesTab / TRADE | `button` type="button"; onClick={() =&gt; setFormState( formState ? null : { mode: 'create', trade: tenantTrades[0] ?? 'electrical' }, ) } |
| C-0343 / 7331 | ServicesTab / TRADE | `CustomServiceForm` onSubmit={async (payload) =&gt; { if (formState.mode === 'edit') { await onUpdateCustom(formState.id, payload) } else { await onCreateCustom(payload) } setFormState(null) }} |
| C-0344 / 7366 | ServicesTab / TRADE | `input` type="search"; onChange={(e) =&gt; setQuery(e.target.value)}; placeholder="Search services by name…"; aria-label="Search services" |
| C-0345 / 7445 | ServicesTab / TRADE | `button` type="button"; onClick={() =&gt; toggleExpand(svc.assembly_id)} |
| C-0346 / 7534 | ServicesTab / TRADE | `span` role="switch"; aria-label={\`${svc.name} — ${live ? 'enabled, click to turn off' : 'disabled, click to turn on'}\`}; onClick={(e) =&gt; { e.stopPropagation() toggle(svc.assembly_id) }} |
| C-0347 / 7704 | ServicesTab / TRADE | `button` ✎ Edit; type="button"; onClick={() =&gt; setFormState({ mode: 'edit', id: svc.assembly_id, trade: svc.trade, name: svc.name, description: svc.description ?? '', default_unit: svc.default_unit ?? 'each', default_unit_price_ex_gst: toNum(svc.default_unit_price_ex_gst) ?? 0, default_labour_hours: toNum(sv |
| C-0348 / 7728 | ServicesTab / TRADE | `button` ⌫ Delete; type="button"; onClick={async () =&gt; { if ( !window.confirm( \`Delete "${svc.name}"? Customers asking about this service will no longer get an auto-quote — they'll fall back to your $99 paid inspection.\`, ) ) { return } try { await onDeleteCustom(svc.assembly_id) } catch (err: any) { setErro |
| C-0349 / 7774 | ServicesTab / TRADE | `button` type="button"; onClick={saveAll}; disabled={busy \|\| !dirty} |
| C-0350 / 7977 | PreferredBrandsCard / TRADE | `select` onChange={(e) =&gt; change(row.category, e.target.value)} |
| C-0351 / 8008 | PreferredBrandsCard / TRADE | `button` type="button"; onClick={saveAll}; disabled={busy \|\| !dirty} |
| C-0352 / 8148 | CustomServiceForm / TRADE | `form` onSubmit={handleSubmit} |
| C-0353 / 8157 | CustomServiceForm / TRADE | `select` onChange={(e) =&gt; setTrade(e.target.value)}; aria-label="Trade for this service" |
| C-0354 / 8177 | CustomServiceForm / TRADE | `input` type="text"; onChange={(e) =&gt; setName(e.target.value)}; placeholder="e.g. Install pool light" |
| C-0355 / 8189 | CustomServiceForm / TRADE | `textarea` onChange={(e) =&gt; setDescription(e.target.value)}; placeholder="Mount, terminate, test on existing circuit" |
| C-0356 / 8203 | CustomServiceForm / TRADE | `select` onChange={(e) =&gt; setCategory(e.target.value)}; aria-label="Grounding category for this service" |
| C-0357 / 8220 | CustomServiceForm / TRADE | `input` type="text"; onChange={(e) =&gt; setDefaultUnit(e.target.value)}; placeholder="each" |
| C-0358 / 8230 | CustomServiceForm / TRADE | `input` type="number"; onChange={(e) =&gt; setPriceStr(e.target.value)}; placeholder="80.00" |
| C-0359 / 8243 | CustomServiceForm / TRADE | `input` type="number"; onChange={(e) =&gt; setHoursStr(e.target.value)}; placeholder="2.0" |
| C-0360 / 8257 | CustomServiceForm / TRADE | `textarea` onChange={(e) =&gt; setExclusions(e.target.value)}; placeholder="Excludes new wiring runs and ceiling repair" |
| C-0361 / 8268 | CustomServiceForm / TRADE | `input` type="checkbox"; onChange={(e) =&gt; setAlwaysInspection(e.target.checked)} |
| C-0362 / 8287 | CustomServiceForm / TRADE | `button` Cancel; type="button"; onClick={onCancel} |
| C-0363 / 8294 | CustomServiceForm / TRADE | `button` type="submit"; disabled={busy} |
| C-0364 / 8632 | QuotesTab / CORE | `input` type="search"; onChange={(e) =&gt; setSearch(e.target.value)}; placeholder="Search name, suburb, job, code…" |
| C-0365 / 8643 | QuotesTab / CORE | `FilterSelect` label="Status"; onChange={(v) =&gt; setFilter(v as QuoteFilter)} |
| C-0366 / 8665 | QuotesTab / CORE | `FilterSelect` label="Trade"; onChange={setTradeSel} |
| C-0367 / 8681 | QuotesTab / CORE | `FilterSelect` label="Sort"; onChange={(v) =&gt; setSort(v as QuoteSort)} |
| C-0368 / 8705 | QuotesTab / CORE | `input` type="date"; onChange={(e) =&gt; setDateFrom(e.target.value)} |
| C-0369 / 8715 | QuotesTab / CORE | `input` type="date"; onChange={(e) =&gt; setDateTo(e.target.value)} |
| C-0370 / 8725 | QuotesTab / CORE | `button` Clear filters; type="button"; onClick={clearFilters} |
| C-0371 / 8748 | QuotesTab / CORE | `button` Retry; type="button"; onClick={() =&gt; setJobsTick((n) =&gt; n + 1)} |
| C-0372 / 8773 | QuotesTab / CORE | `button` Clear filters; type="button"; onClick={clearFilters} |
| C-0373 / 8834 | QuotesTab / CORE | `button` ← Back to queue; type="button"; onClick={() =&gt; setMobileDetailOpen(false)} |
| C-0374 / 8938 | DeleteQuoteButton / CORE | `button` type="button"; onClick={() =&gt; void doDelete()}; disabled={busy} |
| C-0375 / 8948 | DeleteQuoteButton / CORE | `button` Cancel; type="button"; onClick={() =&gt; setConfirming(false)}; disabled={busy} |
| C-0376 / 8970 | DeleteQuoteButton / CORE | `button` Delete; type="button"; onClick={() =&gt; setConfirming(true)}; aria-label="Delete quote" |
| C-0377 / 9080 | QuoteQueueRow / CORE | `button` type="button"; onClick={onSelect} |
| C-0378 / 9161 | JobQueueRow / CORE | `button` type="button"; onClick={onSelect} |
| C-0379 / 9268 | JobQueueDetail / CORE | `a` Customer page →; href={job.href} |
| C-0380 / 9309 | JobQueueDetail / CORE | `Link` →; href={job.tradieHref} |
| C-0381 / 9319 | JobQueueDetail / CORE | `Link` View customer page →; href={job.href} |
| C-0382 / 9338 | JobQueueDetail / CORE | `button` type="button"; onClick={() =&gt; void doDelete()}; disabled={busy} |
| C-0383 / 9348 | JobQueueDetail / CORE | `button` Cancel; type="button"; onClick={() =&gt; setConfirming(false)}; disabled={busy} |
| C-0384 / 9359 | JobQueueDetail / CORE | `button` Delete; type="button"; onClick={() =&gt; { setConfirming(true) setErr(null) }}; aria-label="Delete job" |
| C-0385 / 9486 | QuoteDetail / CORE | `a` Customer page →; href={url} |
| C-0386 / 9519 | QuoteDetail / CORE | `button` type="button"; onClick={() =&gt; setActiveTier(t)} |
| C-0387 / 9610 | QuoteDetail / CORE | `QuoteDisplayModeToggle`  |
| C-0388 / 9674 | QuoteDetail / CORE | `Link` View customer page →; href={url} |
| C-0389 / 9693 | QuoteDetail / CORE | `Link` Measurement results →; href={q.measure_href} |
| C-0390 / 9709 | QuoteDetail / CORE | `Link` View PDF · Edit; href={\`/dashboard/quote/${q.share_token}\`} |
| C-0391 / 9718 | QuoteDetail / CORE | `a` Download PDF ↓; href={\`/api/q/${q.share_token}/pdf\`} |
| C-0392 / 9731 | QuoteDetail / CORE | `DeleteQuoteButton`  |
| C-0393 / 9760 | CopyDepositLink / CORE | `button` type="button"; onClick={onCopy} |
| C-0394 / 9856 | Btn / CORE | `button` type="button"; title={title}; disabled={submitting}; onClick={() =&gt; void save(mode)} |
| C-0395 / 10190 | SupplierCsvUpload / TRADE | `button` Upload products via CSV; type="button"; onClick={() =&gt; setOpen((v) =&gt; !v)} |
| C-0396 / 10197 | SupplierCsvUpload / TRADE | `a` ↓ Download CSV template; href="/docs/supplier-catalogue-template.csv" |
| C-0397 / 10221 | SupplierCsvUpload / TRADE | `input` type="file"; onChange={(e) =&gt; void onPickFile(e)}; disabled={busy} |
| C-0398 / 10284 | SupplierCsvUpload / TRADE | `input` type="checkbox"; onChange={(e) =&gt; setAlsoStock(e.target.checked)} |
| C-0399 / 10294 | SupplierCsvUpload / TRADE | `button` type="button"; disabled={!canCommit}; onClick={() =&gt; void onCommit()} |
| C-0400 / 10302 | SupplierCsvUpload / TRADE | `button` Cancel; type="button"; disabled={busy}; onClick={reset} |
| C-0401 / 10462 | CoveragePanel / TRADE | `button` type="button"; onClick={() =&gt; toggleTrade(t.trade)} |
| C-0402 / 10532 | CoveragePanel / TRADE | `button` + Browse supplier catalogue; type="button"; onClick={onJumpToBrowse} |
| C-0403 / 10781 | BrowseSupplierPanel / TRADE | `button` type="button"; onClick={() =&gt; { setTradeFilter(t) setCategoryFilter('all') setBrandFilter('all') }} |
| C-0404 / 10803 | BrowseSupplierPanel / TRADE | `button` type="button"; onClick={() =&gt; { setCategoryFilter(c) setBrandFilter('all') }} |
| C-0405 / 10824 | BrowseSupplierPanel / TRADE | `button` type="button"; onClick={() =&gt; setBrandFilter(b)} |
| C-0406 / 10862 | BrowseSupplierPanel / TRADE | `input` type="text"; onChange={(e) =&gt; setSearch(e.target.value)}; placeholder="Search materials…"; aria-label="Search supplier catalogue" |
| C-0407 / 10872 | BrowseSupplierPanel / TRADE | `button` ✕; type="button"; onClick={() =&gt; setSearch('')}; aria-label="Clear search" |
| C-0408 / 10889 | BrowseSupplierPanel / TRADE | `button` type="button"; disabled={selected.size === 0 \|\| adding}; onClick={() =&gt; void addSelected()} |
| C-0409 / 10914 | BrowseSupplierPanel / TRADE | `button` Clear filters; type="button"; onClick={() =&gt; { setSearch('') setTradeFilter('all') setCategoryFilter('all') setBrandFilter('all') }} |
| C-0410 / 10952 | BrowseSupplierPanel / TRADE | `input` type="checkbox"; disabled={stocked}; onChange={() =&gt; toggleSelect(r.id)}; aria-label={\`Select ${r.name}\`} |
| C-0411 / 10982 | BrowseSupplierPanel / TRADE | `button` type="button"; onClick={() =&gt; toggleExpand(r.id)}; aria-label={isExpanded ? \`Hide details for ${r.name}\` : \`Show details for ${r.name}\`} |
| C-0412 / 11286 | TierLadderPanel / TRADE | `select` disabled={busyKey === key}; aria-label={\`${cat} ${tier} product\`}; onChange={(e) =&gt; void setSlot(cat, tier, e.target.value)} |
| C-0413 / 11790 | CatalogueTab / TRADE | `button` type="button"; onClick={() =&gt; { if (showForm) { closeForm() } else { // Hub mode: a new product always belongs to the hub's // trade, otherwise it would vanish from the scoped list. setForm({ ...blankForm, trade: tradeFilter ?? form.trade }) setEditingId(null) setShowForm(true) setFormErr(null) } }} |
| C-0414 / 11815 | CatalogueTab / TRADE | `button` My catalogue ( ); type="button"; onClick={() =&gt; setViewMode('mine')} |
| C-0415 / 11826 | CatalogueTab / TRADE | `button` + Browse supplier catalogue; type="button"; onClick={() =&gt; setViewMode('browse')} |
| C-0416 / 11837 | CatalogueTab / TRADE | `button` G/B/B ladder; type="button"; onClick={() =&gt; setViewMode('ladder')} |
| C-0417 / 11895 | CatalogueTab / TRADE | `button` type="button"; onClick={() =&gt; void stockEssentials()}; disabled={essentialsBusy} |
| C-0418 / 11908 | CatalogueTab / TRADE | `form` onSubmit={(e) =&gt; { e.preventDefault() void (editingId ? update() : create()) }} |
| C-0419 / 11922 | CatalogueTab / TRADE | `select` onChange={(e) =&gt; set('trade', e.target.value)}; disabled={!!tradeFilter} |
| C-0420 / 11942 | CatalogueTab / TRADE | `select` onChange={(e) =&gt; set('category', e.target.value)} |
| C-0421 / 11967 | CatalogueTab / TRADE | `input` onChange={(e) =&gt; set('name', e.target.value)}; placeholder="e.g. Clipsal Iconic GPO" |
| C-0422 / 11976 | CatalogueTab / TRADE | `input` onChange={(e) =&gt; set('brand', e.target.value)}; placeholder="Clipsal" |
| C-0423 / 11985 | CatalogueTab / TRADE | `input` onChange={(e) =&gt; set('range_series', e.target.value)}; placeholder="Iconic / 2000" |
| C-0424 / 11994 | CatalogueTab / TRADE | `input` onChange={(e) =&gt; set('supplier', e.target.value)}; placeholder="Reece / Bunnings" |
| C-0425 / 12003 | CatalogueTab / TRADE | `select` onChange={(e) =&gt; set('unit', e.target.value)} |
| C-0426 / 12021 | CatalogueTab / TRADE | `input` onChange={(e) =&gt; set('unit_price_ex_gst', e.target.value)}; placeholder="42" |
| C-0427 / 12033 | CatalogueTab / TRADE | `input` onChange={(e) =&gt; set('customer_supply_price_ex_gst', e.target.value)}; placeholder="Price if the customer buys this part themselves" |
| C-0428 / 12045 | CatalogueTab / TRADE | `input` onChange={(e) =&gt; set('cost_price_ex_gst', e.target.value)}; placeholder="What you pay for it — for your margin only, never quoted" |
| C-0429 / 12057 | CatalogueTab / TRADE | `input` onChange={(e) =&gt; set('description', e.target.value)}; placeholder="e.g. Modern square matte-black finish" |
| C-0430 / 12065 | CatalogueTab / TRADE | `input` type="checkbox"; onChange={(e) =&gt; set('is_preferred', e.target.checked ? 'yes' : '')} |
| C-0431 / 12077 | CatalogueTab / TRADE | `input` type="checkbox"; onChange={(e) =&gt; set('smart', e.target.checked ? 'yes' : '')} |
| C-0432 / 12085 | CatalogueTab / TRADE | `input` type="checkbox"; onChange={(e) =&gt; set('dimmable', e.target.checked ? 'yes' : '')} |
| C-0433 / 12093 | CatalogueTab / TRADE | `input` type="checkbox"; onChange={(e) =&gt; set('integrated_driver', e.target.checked ? 'yes' : '')} |
| C-0434 / 12119 | CatalogueTab / TRADE | `input` onChange={(e) =&gt; set('image_path', e.target.value)}; placeholder="Paste an image URL (https://…)" |
| C-0435 / 12128 | CatalogueTab / TRADE | `input` type="file"; disabled={uploading}; onChange={(e) =&gt; { const f = e.target.files?.[0] e.target.value = '' // allow re-selecting the same file if (f) void uploadImage(f) }} |
| C-0436 / 12141 | CatalogueTab / TRADE | `button` Clear; type="button"; onClick={() =&gt; set('image_path', '')} |
| C-0437 / 12159 | CatalogueTab / TRADE | `select` onChange={(e) =&gt; set('tier_hint', e.target.value)} |
| C-0438 / 12174 | CatalogueTab / TRADE | `button` type="submit"; disabled={saving} |
| C-0439 / 12206 | CatalogueTab / TRADE | `input` type="search"; onChange={(e) =&gt; setSearch(e.target.value)}; placeholder="Search by product, brand, range or supplier…"; aria-label="Search catalogue" |
| C-0440 / 12222 | CatalogueTab / TRADE | `button` All ( ); type="button"; onClick={() =&gt; setCategoryFilter('all')} |
| C-0441 / 12234 | CatalogueTab / TRADE | `button` ( ); type="button"; onClick={() =&gt; setCategoryFilter(c.value)} |
| C-0442 / 12273 | CatalogueTab / TRADE | `button` type="button"; onClick={() =&gt; { setCategoryFilter('all') setSearch('') }} |
| C-0443 / 12355 | CatalogueTab / TRADE | `span` role="switch"; aria-label={\`${r.name} — ${r.active ? 'active, click to turn off' : 'off, click to turn on'}\`}; onClick={() =&gt; busyId !== r.id && toggleActive(r)} |
| C-0444 / 12385 | CatalogueTab / TRADE | `button` Edit; type="button"; onClick={() =&gt; beginEdit(r)}; disabled={busyId === r.id} |
| C-0445 / 12394 | CatalogueTab / TRADE | `button` Delete; type="button"; onClick={() =&gt; remove(r)}; disabled={busyId === r.id} |
| C-0446 / 12912 | RecipesTab / TRADE | `input` type="search"; onChange={(e) =&gt; setJobQuery(e.target.value)}; placeholder="Search jobs…"; aria-label="Search jobs" |
| C-0447 / 12921 | RecipesTab / TRADE | `select` onChange={(e) =&gt; setSelectedId(e.target.value)}; aria-label="Select a job to edit its recipe" |
| C-0448 / 13006 | RecipesTab / TRADE | `button` type="button"; onClick={() =&gt; void forkTaskBaseline()}; disabled={taskForking} |
| C-0449 / 13042 | RecipesTab / TRADE | `input` aria-label={\`Step ${idx + 1} title\`}; onChange={(e) =&gt; setDraftTitle((d) =&gt; ({ ...d, [t.id]: e.target.value })) } |
| C-0450 / 13060 | RecipesTab / TRADE | `input` aria-label={\`Step ${idx + 1} note\`}; placeholder="Note (optional)"; onChange={(e) =&gt; setDraftNotes((d) =&gt; ({ ...d, [t.id]: e.target.value })) } |
| C-0451 / 13077 | RecipesTab / TRADE | `button` ▲; type="button"; onClick={() =&gt; void moveTask(t.id, -1)}; disabled={idx === 0 \|\| taskBusyId !== null}; aria-label={\`Move step ${idx + 1} up\`} |
| C-0452 / 13086 | RecipesTab / TRADE | `button` ▼; type="button"; onClick={() =&gt; void moveTask(t.id, 1)}; disabled={idx === jobTasks.length - 1 \|\| taskBusyId !== null}; aria-label={\`Move step ${idx + 1} down\`} |
| C-0453 / 13096 | RecipesTab / TRADE | `button` type="button"; onClick={() =&gt; patchTask(t.id, { required: !t.required })}; disabled={taskBusyId === t.id} |
| C-0454 / 13108 | RecipesTab / TRADE | `button` Remove; type="button"; onClick={() =&gt; deleteTask(t.id)}; disabled={taskBusyId === t.id} |
| C-0455 / 13123 | RecipesTab / TRADE | `form` onSubmit={(e) =&gt; { e.preventDefault() void addTask() }} |
| C-0456 / 13134 | RecipesTab / TRADE | `input` onChange={(e) =&gt; setTaskForm((f) =&gt; ({ ...f, title: e.target.value }))}; placeholder="e.g. Isolate the circuit at the switchboard" |
| C-0457 / 13145 | RecipesTab / TRADE | `input` onChange={(e) =&gt; setTaskForm((f) =&gt; ({ ...f, notes: e.target.value }))}; placeholder="e.g. test and tag before touching anything" |
| C-0458 / 13153 | RecipesTab / TRADE | `input` type="checkbox"; onChange={(e) =&gt; setTaskForm((f) =&gt; ({ ...f, required: e.target.checked }))} |
| C-0459 / 13162 | RecipesTab / TRADE | `button` type="submit"; disabled={taskSaving \|\| !taskForm.title.trim()} |
| C-0460 / 13243 | RecipesTab / TRADE | `button` type="button"; onClick={() =&gt; void forkBaseline()}; disabled={forking} |
| C-0461 / 13325 | RecipesTab / TRADE | `input` onChange={(e) =&gt; setDraftQty((d) =&gt; ({ ...d, [l.id]: e.target.value }))} |
| C-0462 / 13338 | RecipesTab / TRADE | `button` type="button"; onClick={() =&gt; patchLine(l.id, { required: !l.required })}; disabled={busyId === l.id} |
| C-0463 / 13351 | RecipesTab / TRADE | `button` Remove; type="button"; onClick={() =&gt; deleteLine(l.id)}; disabled={busyId === l.id} |
| C-0464 / 13367 | RecipesTab / TRADE | `form` onSubmit={(e) =&gt; { e.preventDefault() void addLine() }} |
| C-0465 / 13376 | RecipesTab / TRADE | `select` onChange={(e) =&gt; setForm((f) =&gt; ({ ...f, material_category: e.target.value }))} |
| C-0466 / 13402 | RecipesTab / TRADE | `input` onChange={(e) =&gt; setForm((f) =&gt; ({ ...f, quantity: e.target.value }))} |
| C-0467 / 13411 | RecipesTab / TRADE | `input` onChange={(e) =&gt; setForm((f) =&gt; ({ ...f, description: e.target.value }))}; placeholder="e.g. clips + connectors" |
| C-0468 / 13419 | RecipesTab / TRADE | `input` type="checkbox"; onChange={(e) =&gt; setForm((f) =&gt; ({ ...f, required: e.target.checked }))} |
| C-0469 / 13428 | RecipesTab / TRADE | `button` type="submit"; disabled={saving} |
| C-0470 / 13779 | EstimatingTab / TRADE | `button` Edit overrides; type="button"; onClick={() =&gt; startEdit(j)} |
| C-0471 / 13789 | EstimatingTab / TRADE | `button` Reset to default; type="button"; onClick={() =&gt; void resetOverride(j)}; disabled={savingId === j.assembly_id} |
| C-0472 / 13808 | EstimatingTab / TRADE | `input` type="number"; onChange={(e) =&gt; setEditForm((f) =&gt; ({ ...f, labour: e.target.value })) }; aria-label="Labour hours override" |
| C-0473 / 13825 | EstimatingTab / TRADE | `input` type="number"; onChange={(e) =&gt; setEditForm((f) =&gt; ({ ...f, markup: e.target.value })) }; aria-label="Markup % override" |
| C-0474 / 13864 | EstimatingTab / TRADE | `button` type="button"; disabled={savingId === j.assembly_id}; onClick={() =&gt; void saveEdit(j)} |
| C-0475 / 13873 | EstimatingTab / TRADE | `button` Cancel; type="button"; onClick={cancelEdit} |
| C-0476 / 14179 | FollowupsTab / CORE | `button` Retry; type="button"; onClick={() =&gt; void load()} |
| C-0477 / 14213 | bookedBanner / CORE | `button` type="button"; onClick={onGoToCalendar} |
| C-0478 / 14269 | FollowupsTab / CORE | `input` type="search"; onChange={(e) =&gt; setQuery(e.target.value)}; placeholder="Search name, suburb, phone or follow-up code…"; aria-label="Search follow-ups" |
| C-0479 / 14278 | FollowupsTab / CORE | `select` onChange={(e) =&gt; setCategory(e.target.value)}; aria-label="Filter by job category" |
| C-0480 / 14294 | FollowupsTab / CORE | `button` Clear; type="button"; onClick={clearFilters} |
| C-0481 / 14307 | FollowupsTab / CORE | `button` Clear filters; type="button"; onClick={clearFilters} |
| C-0482 / 14404 | FollowupsTab / CORE | `button` type="button"; disabled={!hasPhone \|\| calling}; onClick={() =&gt; void startCall(f)} |
| C-0483 / 14412 | FollowupsTab / CORE | `button` Text; type="button"; disabled={!hasPhone}; onClick={() =&gt; { clearRowMsg(rowId) setComposeFor(f) }} |
| C-0484 / 14449 | FollowupsTab / CORE | `Link` Open quote ↗; href={\`/q/${f.share_token}\`} |
| C-0485 / 14457 | FollowupsTab / CORE | `button` type="button"; onClick={() =&gt; setThreadOpen((s) =&gt; ({ ...s, [rowId]: !s[rowId], })) } |
| C-0486 / 14470 | FollowupsTab / CORE | `button` type="button"; onClick={() =&gt; setHistoryOpen((s) =&gt; ({ ...s, [rowId]: !s[rowId], })) } |
| C-0487 / 14484 | FollowupsTab / CORE | `button` type="button"; disabled={busyId === rowId}; onClick={() =&gt; void reopen(f.quote_id as string)} |
| C-0488 / 14495 | FollowupsTab / CORE | `button` type="button"; onClick={() =&gt; setLogFor((s) =&gt; ({ ...s, [rowId]: !s[rowId], })) } |
| C-0489 / 14715 | FollowupLogForm / CORE | `input` type="radio"; name={\`outcome-${quoteId}\`}; onChange={() =&gt; setOutcome(o.value)} |
| C-0490 / 14731 | FollowupLogForm / CORE | `textarea` onChange={(e) =&gt; setNote(e.target.value.slice(0, 500))}; placeholder="e.g. Wants to decide by Friday — call back after 3pm" |
| C-0491 / 14741 | FollowupLogForm / CORE | `button` type="button"; disabled={saving}; onClick={() =&gt; void save()} |
| C-0492 / 14750 | FollowupLogForm / CORE | `button` Cancel; type="button"; onClick={onCancel}; disabled={saving} |
| C-0493 / 14974 | overlay / CORE | `div` onClick={onClose} |
| C-0494 / 14978 | overlay / CORE | `div` role="dialog"; onClick={(e) =&gt; e.stopPropagation()} |
| C-0495 / 14994 | overlay / CORE | `button` ✕; type="button"; onClick={onClose}; aria-label="Close" |
| C-0496 / 15030 | overlay / CORE | `textarea` onChange={(e) =&gt; setText(e.target.value)}; disabled={sending}; aria-label="Follow-up message to the customer"; placeholder="Type your follow-up message…" |
| C-0497 / 15046 | overlay / CORE | `button` Cancel; type="button"; onClick={onClose}; disabled={sending} |
| C-0498 / 15055 | overlay / CORE | `button` type="button"; onClick={() =&gt; void send()}; disabled={sending \|\| trimmed.length === 0} |
| C-0499 / 15401 | ChatsTab / CORE | `button` Retry; type="button"; onClick={() =&gt; setChatsTick((n) =&gt; n + 1)} |
| C-0500 / 15512 | ChatsSplitView / CORE | `RailFilterButton` onClick={() =&gt; onFilterChange('all')}; label="All" |
| C-0501 / 15518 | ChatsSplitView / CORE | `RailFilterButton` onClick={() =&gt; onFilterChange('cold')}; label="Went cold" |
| C-0502 / 15612 | RailFilterButton / CORE | `button` type="button"; onClick={onClick} |
| C-0503 / 15667 | ChatRailRow / CORE | `button` type="button"; onClick={onSelect} |
| C-0504 / 15818 | ChatThread / CORE | `button` type="button"; onClick={onBack}; aria-label="Back to conversations" |
| C-0505 / 15846 | ChatThread / CORE | `button` Open quote →; type="button"; onClick={onGoToQuotes} |
| C-0506 / 15898 | ChatThread / CORE | `form` onSubmit={submitReply} |
| C-0507 / 15899 | ChatThread / CORE | `input` onChange={(e) =&gt; onDraft(e.target.value)}; placeholder="Reply by SMS"; aria-label="Reply by SMS"; disabled={sending} |
| C-0508 / 15907 | ChatThread / CORE | `button` type="submit"; disabled={sending \|\| !draft.trim()} |
| C-0509 / 16000 | Pagination / CORE | `button` ← Prev; type="button"; onClick={() =&gt; onPage(page - 1)}; disabled={page &lt;= 0}; aria-label="Previous page" |
| C-0510 / 16012 | Pagination / CORE | `button` Next →; type="button"; onClick={() =&gt; onPage(page + 1)}; disabled={page &gt;= pageCount - 1}; aria-label="Next page" |
| C-0511 / 16327 | SignageHubTab / TRADE | `Link` href="/dashboard/signage" |
| C-0512 / 16349 | SignageHubTab / TRADE | `Link` href="/dashboard/signage/queue" |
| C-0513 / 16380 | SignageHubTab / TRADE | `button` Refresh; type="button"; onClick={() =&gt; void load()} |
| C-0514 / 16415 | SignageHubTab / TRADE | `a` Open; href={r.link} |
| C-0515 / 16424 | SignageHubTab / TRADE | `Link` Review; href={\`/dashboard/signage/queue?a=${r.assessment_id}\`} |
| C-0516 / 16551 | PaintingHubTab / TRADE | `Link` href="/dashboard/painting" |
| C-0517 / 16582 | PaintingHubTab / TRADE | `button` Refresh; type="button"; onClick={() =&gt; void loadJobs()} |
| C-0518 / 16631 | PaintingHubTab / TRADE | `Link` Estimate results →; href={\`/p/${j.estimate_token}\`} |
| C-0519 / 16639 | PaintingHubTab / TRADE | `Link` Customer page →; href={\`/q/paint/${j.public_token}\`} |
| C-0520 / 16648 | PaintingHubTab / TRADE | `a` PDF ↓; href={\`/api/q/paint/${j.public_token}/pdf\`} |
| C-0521 / 16763 | RoofingHubTab / TRADE | `Link` href="/dashboard/roofing/measure" |
| C-0522 / 16797 | RoofingHubTab / TRADE | `button` Refresh; type="button"; onClick={() =&gt; void loadJobs()} |
| C-0523 / 16853 | RoofingHubTab / TRADE | `a` View &rarr;; href={\`/q/roof/${j.public_token}?full=1\`} |
| C-0524 / 16869 | RoofingHubTab / TRADE | `a` PDF ↓; href={\`/api/q/roof/${j.public_token}/pdf\`} |
| C-0525 / 16892 | RoofingHubTab / TRADE | `a` Open &rarr;; href={\`/m/${j.measure_token}\`} |
| C-0526 / 16914 | RoofingHubTab / TRADE | `Link` Open evidence &rarr;; href={\`/dashboard/roofing/measurements/${j.id}/topology\`} |
| C-0527 / 17030 | JobQuoterCard / CORE | `Link` href={\`/dashboard/job/${trade}\`} |
| C-0528 / 17150 | TradeHub / TRADE | `button` type="button"; onClick={() =&gt; setSection(s)} |
| C-0529 / 17244 | TradeHub / TRADE | `Link` href="/dashboard/aircon" |
| C-0530 / 17277 | TradeHub / TRADE | `Link` href={\`/dashboard/pricing-wizard?trade=${trade}\`} |

### `web/app/dashboard/painting/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0531 / 336 | PaintingEstimatePageInner / TRADE | `form` onSubmit={runEstimate} |
| C-0532 / 339 | PaintingEstimatePageInner / TRADE | `AddressAutocomplete` onChange={setAddress}; placeholder="Start typing — e.g. 28 Greens Rd, Coorparoo" |
| C-0533 / 362 | PaintingEstimatePageInner / TRADE | `input` onChange={(e) =&gt; setPostcode(e.target.value.trim())}; placeholder="4151" |
| C-0534 / 367 | PaintingEstimatePageInner / TRADE | `select` aria-label="State"; onChange={(e) =&gt; setStateCode(e.target.value as (typeof STATES)[number])} |
| C-0535 / 377 | PaintingEstimatePageInner / TRADE | `input` type="checkbox"; onChange={() =&gt; toggleScope(v)} |
| C-0536 / 386 | PaintingEstimatePageInner / TRADE | `select` aria-label="Coats"; onChange={(e) =&gt; setCoats(Number(e.target.value) as 1 \| 2 \| 3)} |
| C-0537 / 395 | PaintingEstimatePageInner / TRADE | `select` aria-label="Condition"; onChange={(e) =&gt; setCondition(e.target.value as (typeof CONDITIONS)[number][0])} |
| C-0538 / 402 | PaintingEstimatePageInner / TRADE | `select` aria-label="Ceiling height"; onChange={(e) =&gt; setCeiling(e.target.value as (typeof CEILINGS)[number][0])} |
| C-0539 / 409 | PaintingEstimatePageInner / TRADE | `select` aria-label="Storeys"; onChange={(e) =&gt; setStoreys(Number(e.target.value) as 1 \| 2 \| 3)} |
| C-0540 / 418 | PaintingEstimatePageInner / TRADE | `input` type="number"; onChange={(e) =&gt; setManualArea(e.target.value)}; placeholder="from the floor plan" |
| C-0541 / 424 | PaintingEstimatePageInner / TRADE | `input` type="checkbox"; onChange={(e) =&gt; setColourChange(e.target.checked)} |
| C-0542 / 428 | PaintingEstimatePageInner / TRADE | `button` type="submit"; disabled={busy \|\| authState !== 'ready'} |
| C-0543 / 460 | PaintingEstimatePageInner / TRADE | `input` type="radio"; name="paint-structure"; onChange={() =&gt; setStructureId(s.building_id)} |
| C-0544 / 500 | PaintingEstimatePageInner / TRADE | `button` type="button"; onClick={() =&gt; void runEstimateCore()}; disabled={busy}; title="Re-run this estimate with your current saved rates" |
| C-0545 / 529 | PaintingEstimatePageInner / TRADE | `button` type="button"; onClick={onSave}; disabled={saveState === 'saving'} |
| C-0546 / 543 | PaintingEstimatePageInner / TRADE | `a` Download PDF; href={\`/api/q/paint/${savedToken}/pdf\`} |
| C-0547 / 848 | PaintPreviewSection / TRADE | `input` onChange={(e) =&gt; setColour(e.target.value)}; placeholder="e.g. Monument charcoal — or pick a colour →" |
| C-0548 / 854 | PaintPreviewSection / TRADE | `input` type="color"; aria-label="Pick a custom colour"; title="Custom colour"; onChange={(e) =&gt; setColour(e.target.value)} |
| C-0549 / 865 | PaintPreviewSection / TRADE | `button` type="button"; onClick={() =&gt; setColour(c)} |
| C-0550 / 877 | PaintPreviewSection / TRADE | `button` type="button"; onClick={generate}; disabled={busy \|\| !token \|\| beforeState === 'none'} |
| C-0551 / 933 | PaintPreviewSection / TRADE | `input` onChange={(e) =&gt; setRefineInput(e.target.value)}; placeholder="paint the fence grey too…"; disabled={refining} |
| C-0552 / 946 | PaintPreviewSection / TRADE | `button` type="button"; onClick={() =&gt; void refine()}; disabled={refining \|\| refineInput.trim().length &lt; 2} |
| C-0553 / 956 | PaintPreviewSection / TRADE | `button` Undo; type="button"; onClick={undo}; disabled={refining} |
| C-0554 / 989 | PaintPreviewSection / TRADE | `button` type="button"; onClick={() =&gt; setShow3D((v) =&gt; !v)}; disabled={address.trim().length &lt; 3} |
| C-0555 / 1026 | Breadcrumb / TRADE | `Link` Dashboard; href="/dashboard" |

### `web/app/dashboard/painting/_components/MaterialCheck.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0556 / 74 | MaterialCheck / TRADE | `button` type="button"; onClick={scan}; disabled={stage === 'scanning' \|\| !token} |

### `web/app/dashboard/painting/_components/PaintResultView.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0557 / 219 | PaintResultView / TRADE | `details`  |
| C-0558 / 220 | PaintResultView / TRADE | `summary` How these numbers were built |

### `web/app/dashboard/pricing-wizard/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0559 / 500 | PricingWizardPage / TRADE | `NumberInput` label="Hourly rate ($)"; onChange={setHourly}; placeholder="120" |
| C-0560 / 507 | PricingWizardPage / TRADE | `NumberInput` label="Call-out minimum ($)"; onChange={setCallOut}; placeholder="150" |
| C-0561 / 514 | PricingWizardPage / TRADE | `NumberInput` label="Default markup on materials (%)"; onChange={setMarkup}; placeholder="30" |
| C-0562 / 521 | PricingWizardPage / TRADE | `NumberInput` label="After-hours multiplier"; onChange={setAfterHours}; placeholder="1.5" |
| C-0563 / 531 | PricingWizardPage / TRADE | `button` Continue →; type="button"; onClick={() =&gt; setStep(1)} |
| C-0564 / 534 | PricingWizardPage / TRADE | `a` Skip the wizard; href="/dashboard" |
| C-0565 / 560 | PricingWizardPage / TRADE | `input` type="checkbox"; onChange={(e) =&gt; setServices((s) =&gt; ({ ...s, [a.id]: e.target.checked })) } |
| C-0566 / 582 | PricingWizardPage / TRADE | `button` ← Back; type="button"; onClick={() =&gt; setStep(0)} |
| C-0567 / 585 | PricingWizardPage / TRADE | `button` Continue →; type="button"; onClick={() =&gt; setStep(2)} |
| C-0568 / 616 | PricingWizardPage / TRADE | `button` type="button"; onClick={() =&gt; fillAllBrands(brand)} |
| C-0569 / 625 | PricingWizardPage / TRADE | `button` Clear; type="button"; onClick={clearAllBrands} |
| C-0570 / 638 | PricingWizardPage / TRADE | `input` type="text"; onChange={(e) =&gt; setBrands((b) =&gt; ({ ...b, [c.slug]: e.target.value })) }; placeholder="e.g. Clipsal" |
| C-0571 / 654 | PricingWizardPage / TRADE | `button` ← Back; type="button"; onClick={() =&gt; setStep(1)} |
| C-0572 / 657 | PricingWizardPage / TRADE | `button` type="button"; onClick={handleFinish}; disabled={saving} |
| C-0573 / 674 | Layout / TRADE | `a` href="/dashboard" |
| C-0574 / 682 | Layout / TRADE | `a` ← Dashboard; href="/dashboard" |
| C-0575 / 785 | NumberInput / TRADE | `input` type="number"; onChange={(e) =&gt; onChange(e.target.value)}; placeholder={placeholder} |

### `web/app/dashboard/quote/[token]/BrandingControl.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0576 / 27 | BrandingControl / CORE | `select` onChange={(e) =&gt; set({ fontFamily: e.target.value as ReportStyle['fontFamily'] })} |
| C-0577 / 43 | BrandingControl / CORE | `button` type="button"; title={c}; aria-label={\`Accent ${c}\`}; onClick={() =&gt; set({ accentColor: c })} |
| C-0578 / 58 | BrandingControl / CORE | `select` onChange={(e) =&gt; set({ headingStyle: e.target.value as ReportStyle['headingStyle'] })} |

### `web/app/dashboard/quote/[token]/QuoteDocumentEditor.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0579 / 51 | PricingNodeView / CORE | `button` Edit prices; type="button"; onClick={onEditPrices} |
| C-0580 / 165 | QuoteDocumentEditor / CORE | `button` type="button"; title={b.title}; onClick={() =&gt; b.run(editor)} |

### `web/app/dashboard/quote/[token]/QuoteDocumentWorkspace.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0581 / 92 | QuoteDocumentWorkspace / CORE | `BrandingControl` onChange={onStyle} |
| C-0582 / 93 | QuoteDocumentWorkspace / CORE | `QuoteDocumentEditor` onChange={onDoc} |
| C-0583 / 106 | QuoteDocumentWorkspace / CORE | `button` Save &amp; Apply Edits; type="button"; disabled={!dirty \|\| save === 'saving'}; onClick={onSave} |

### `web/app/dashboard/quote/[token]/QuoteReportViewerClient.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0584 / 164 | QuoteReportViewerClient / CORE | `button` ✎ Edit Report; type="button"; onClick={() =&gt; api?.openEditor()}; disabled={!canEdit}; title={!canEdit ? disabledReason ?? undefined : undefined} |
| C-0585 / 178 | QuoteReportViewerClient / CORE | `a` ↓ Download PDF; href={pdfUrl} |
| C-0586 / 187 | QuoteReportViewerClient / CORE | `button` ⚡ Edit with AI; type="button"; onClick={() =&gt; api?.openEditor({ chat: true })}; disabled={!canAi}; title={!canAi ? disabledReason ?? undefined : undefined} |
| C-0587 / 294 | QuoteReportViewerClient / CORE | `a` ↓ Download PDF; href={pdfUrl} |

### `web/app/dashboard/quote/[token]/SendQuotePanel.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0588 / 92 | SendQuotePanel / CORE | `button` type="button"; onClick={() =&gt; setOpen((o) =&gt; !o)}; disabled={props.paid}; title={props.paid ? 'This quote is paid — nothing further to send.' : undefined} |
| C-0589 / 119 | SendQuotePanel / CORE | `input` type="tel"; onChange={(e) =&gt; setPhone(e.target.value)}; placeholder="Customer mobile, e.g. +61 4xx xxx xxx" |
| C-0590 / 127 | SendQuotePanel / CORE | `button` type="button"; onClick={() =&gt; send('sms')}; disabled={!smsReady} |
| C-0591 / 144 | SendQuotePanel / CORE | `input` type="email"; onChange={(e) =&gt; setEmail(e.target.value)}; placeholder="customer@example.com" |
| C-0592 / 151 | SendQuotePanel / CORE | `button` type="button"; onClick={() =&gt; send('email')}; disabled={!mailReady} |

### `web/app/dashboard/quote/[token]/TierSelect.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0593 / 91 | TierSelect / CORE | `button` type="button"; onClick={() =&gt; pick(k)}; disabled={props.disabled \|\| pending !== null}; title={props.tiers[k]?.label ?? k} |

### `web/app/dashboard/roofing/measure/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0594 / 447 | RoofingMeasurePageInner / TRADE | `form` onSubmit={onMeasure} |
| C-0595 / 450 | RoofingMeasurePageInner / TRADE | `AddressAutocomplete` onChange={setAddress} |
| C-0596 / 467 | RoofingMeasurePageInner / TRADE | `input` onChange={(e) =&gt; setPostcode(e.target.value.trim())}; placeholder="2750" |
| C-0597 / 480 | RoofingMeasurePageInner / TRADE | `select` aria-label="State"; onChange={(e) =&gt; setState(e.target.value as (typeof STATES)[number])} |
| C-0598 / 489 | RoofingMeasurePageInner / TRADE | `select` aria-label="Roof material"; onChange={(e) =&gt; setMaterial(e.target.value as (typeof MATERIALS)[number][0])} |
| C-0599 / 498 | RoofingMeasurePageInner / TRADE | `select` aria-label="Roof pitch"; onChange={(e) =&gt; setPitch(e.target.value as (typeof PITCHES)[number][0])} |
| C-0600 / 507 | RoofingMeasurePageInner / TRADE | `select` aria-label="Job intent"; onChange={(e) =&gt; setIntent(e.target.value as (typeof INTENTS)[number][0])} |
| C-0601 / 516 | RoofingMeasurePageInner / TRADE | `input` type="number"; onChange={(e) =&gt; setYearBuilt(e.target.value)}; placeholder="1985" |
| C-0602 / 520 | RoofingMeasurePageInner / TRADE | `button` type="submit"; disabled={busy \|\| authState !== 'ready'} |
| C-0603 / 755 | MultiResultBlock / TRADE | `button` type="button"; onClick={onSave}; disabled={saveState === 'saving' \|\| combined.count === 0} |
| C-0604 / 768 | MultiResultBlock / TRADE | `button` type="button"; onClick={onSendAsQuote}; disabled={quoteState === 'saving' \|\| combined.count === 0} |
| C-0605 / 790 | MultiResultBlock / TRADE | `a` href={quoteShareUrl} |
| C-0606 / 798 | MultiResultBlock / TRADE | `button` Copy; type="button"; onClick={() =&gt; { void navigator.clipboard.writeText(quoteShareUrl) }} |
| C-0607 / 807 | MultiResultBlock / TRADE | `a` Open; href={quoteShareUrl} |
| C-0608 / 816 | MultiResultBlock / TRADE | `a` Download PDF; href={\`/api/q/${quoteShareToken}/pdf\`} |
| C-0609 / 877 | StructureCard / TRADE | `article` onClick={onSelect} |
| C-0610 / 890 | StructureCard / TRADE | `label` onClick={(e) =&gt; e.stopPropagation()} |
| C-0611 / 891 | StructureCard / TRADE | `input` type="checkbox"; onChange={onToggleInclude} |
| C-0612 / 907 | StructureCard / TRADE | `div` onClick={(e) =&gt; e.stopPropagation()} |
| C-0613 / 911 | StructureCard / TRADE | `select` aria-label={\`Material for ${structure.label}\`}; disabled={busy \|\| structure.buildingId == null}; onChange={(e) =&gt; void onMaterialChange(e.target.value as RoofMaterial)} |
| C-0614 / 998 | Breadcrumb / TRADE | `Link` Dashboard; href="/dashboard" |
| C-0615 / 1000 | Breadcrumb / TRADE | `Link` Roof; href="/dashboard?tab=roofing" |

### `web/app/dashboard/roofing/measurements/[id]/topology/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0616 / 61 | RoofingTopologyEvidencePageInner / TRADE | `Link` Dashboard; href="/dashboard" |
| C-0617 / 63 | RoofingTopologyEvidencePageInner / TRADE | `Link` Roofing; href="/dashboard?tab=roofing" |
| C-0618 / 117 | ErrorState / TRADE | `Link` Back to roofing &rarr;; href="/dashboard?tab=roofing" |

### `web/app/dashboard/roofing/measurements/[id]/topology/TopologyEvidencePanel.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0619 / 142 | TopologyEvidencePanel / TRADE | `input` type="radio"; name="topology-main-dwelling"; disabled={unavailable}; onChange={() =&gt; chooseStructure(structure.structureIndex)} |
| C-0620 / 167 | TopologyEvidencePanel / TRADE | `input` type="checkbox"; disabled={!canConfirm}; onChange={(event) =&gt; setConfirmed(event.target.checked)} |
| C-0621 / 228 | TopologyEvidencePanel / TRADE | `button` type="button"; onClick={() =&gt; toggleKind(summary.kind)} |
| C-0622 / 258 | TopologyEvidencePanel / TRADE | `button` type="button"; onClick={() =&gt; { setActiveCandidateId(candidate.id) setVisibleKind(candidate.kind) }} |

### `web/app/dashboard/roofing/_components/AddressAutocomplete.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0623 / 177 | AddressAutocomplete / TRADE | `input` id={id}; type="text"; onChange={(e) =&gt; onChange(e.target.value)}; placeholder={placeholder} |

### `web/app/dashboard/roofing/_components/PhotoVerify.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0624 / 164 | PhotoVerify / TRADE | `button` Replace photo; type="button"; onClick={reset} |
| C-0625 / 182 | PhotoVerify / TRADE | `div` onClick={() =&gt; fileRef.current?.click()} |
| C-0626 / 188 | PhotoVerify / TRADE | `input` type="file"; onChange={onPick} |

### `web/app/dashboard/roofing/_components/RoofTilesViewer.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0627 / 190 | RoofTilesViewer / TRADE | `button` type="button"; onClick={toggleOrbit} |
| C-0628 / 194 | RoofTilesViewer / TRADE | `button` type="button"; onClick={() =&gt; setActive((v) =&gt; !v)}; disabled={address.trim().length &lt; 3} |

### `web/app/dashboard/roofing/_components/SolarCheck.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0629 / 89 | SolarCheck / TRADE | `button` type="button"; onClick={scan}; disabled={stage === 'scanning' \|\| !accessToken} |

### `web/app/dashboard/signage/audit/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0630 / 215 | IngestCard / TRADE | `input` type="file"; aria-label="Standards PDF to decipher"; onChange={(e) =&gt; { setFile(e.target.files?.[0] ?? null); setResult(null) }} |
| C-0631 / 228 | IngestCard / TRADE | `button` type="button"; onClick={() =&gt; run(false)}; disabled={!file \|\| busy !== 'idle'} |
| C-0632 / 232 | IngestCard / TRADE | `button` type="button"; onClick={() =&gt; run(true)}; disabled={busy !== 'idle'} |
| C-0633 / 353 | AuditCard / TRADE | `input` type="file"; aria-label={\`Photos for ${s.label}\`}; onChange={(e) =&gt; setFiles((p) =&gt; ({ ...p, [s.slot]: e.target.files ? Array.from(e.target.files) : [] }))} |
| C-0634 / 364 | AuditCard / TRADE | `button` type="button"; onClick={run}; disabled={busy \|\| total === 0} |
| C-0635 / 381 | AuditCard / TRADE | `button` type="button"; onClick={() =&gt; void downloadPdf()}; disabled={pdfBusy} |

### `web/app/dashboard/signage/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0636 / 245 | SignageHubPageInner / TRADE | `Link` Open review queue; href={withBrand('/dashboard/signage/queue', brandSlug)} |
| C-0637 / 248 | SignageHubPageInner / TRADE | `Link` Instant audit; href={withBrand('/dashboard/signage/audit', brandSlug)} |
| C-0638 / 262 | SignageHubPageInner / TRADE | `form` onSubmit={createSweep} |
| C-0639 / 265 | SignageHubPageInner / TRADE | `input` id="sweep-name"; onChange={(e) =&gt; setName(e.target.value)}; placeholder="APAC Q3 storefront audit" |
| C-0640 / 276 | SignageHubPageInner / TRADE | `select` id="sweep-region"; onChange={(e) =&gt; setRegion(e.target.value)} |
| C-0641 / 297 | SignageHubPageInner / TRADE | `input` type="checkbox"; onChange={() =&gt; toggleShot(s.slot)} |
| C-0642 / 310 | SignageHubPageInner / TRADE | `button` type="submit"; disabled={busy \|\| shots.size === 0 \|\| targetCount === 0} |
| C-0643 / 400 | SweepCard / TRADE | `button` type="button"; onClick={onDelete}; disabled={deleting} |
| C-0644 / 423 | SweepCard / TRADE | `a` Open; href={r.link} |
| C-0645 / 427 | SweepCard / TRADE | `Link` Review; href={withBrand(\`/dashboard/signage/queue?a=${r.assessment_id}\`, brandSlug)} |

### `web/app/dashboard/signage/queue/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0646 / 269 | SignageQueuePage / TRADE | `button` type="button"; onClick={() =&gt; token && openDetail(q.id, token)} |
| C-0647 / 302 | SignageQueuePage / TRADE | `button` type="button"; disabled={!f.assessment_id}; onClick={() =&gt; f.assessment_id && token && openDetail(f.assessment_id, token)} |
| C-0648 / 404 | DetailPanel / TRADE | `button` type="button"; onClick={() =&gt; onView({ src: p.url as string, alt: prettyGroup(p.shot_slot) })} |
| C-0649 / 489 | DetailPanel / TRADE | `button` Approve; type="button"; disabled={busy}; onClick={() =&gt; onDecide('approved')} |
| C-0650 / 498 | DetailPanel / TRADE | `button` Needs changes; type="button"; disabled={busy}; onClick={() =&gt; onDecide('needs_changes')} |
| C-0651 / 507 | DetailPanel / TRADE | `button` Escalate; type="button"; disabled={busy}; onClick={() =&gt; onDecide('escalated')} |

### `web/app/dashboard/signage/shots/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0652 / 173 | SignageShotsPage / TRADE | `input` id={\`shot-slot-${i}\`}; onChange={(e) =&gt; setShot(i, { slot: e.target.value })}; placeholder="window_wrap" |
| C-0653 / 177 | SignageShotsPage / TRADE | `input` id={\`shot-label-${i}\`}; onChange={(e) =&gt; setShot(i, { label: e.target.value })}; placeholder="Window wrap" |
| C-0654 / 181 | SignageShotsPage / TRADE | `input` id={\`shot-instruction-${i}\`}; onChange={(e) =&gt; setShot(i, { instruction: e.target.value })}; placeholder="What to capture" |
| C-0655 / 183 | SignageShotsPage / TRADE | `button` Remove; type="button"; onClick={() =&gt; removeShot(i)}; aria-label={\`Remove shot ${s.label \|\| i + 1}\`} |
| C-0656 / 197 | SignageShotsPage / TRADE | `button` + Add shot; type="button"; onClick={addShot} |
| C-0657 / 200 | SignageShotsPage / TRADE | `button` type="button"; onClick={save}; disabled={busy \|\| shots.length === 0} |

### `web/app/dashboard/signage/studios/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0658 / 310 | SignageStudiosPage / TRADE | `input` id="place-query"; onChange={(e) =&gt; { const v = e.target.value setPlaceQuery(v) if (v.trim().length &lt; 3) setPlaces([]) }}; placeholder="e.g. F45 Bondi Beach" |
| C-0659 / 330 | SignageStudiosPage / TRADE | `button` type="button"; onClick={() =&gt; pickPlace(p)} |
| C-0660 / 351 | SignageStudiosPage / TRADE | `form` onSubmit={addStudio} |
| C-0661 / 356 | SignageStudiosPage / TRADE | `input` id="studio-name"; onChange={(e) =&gt; setName(e.target.value)}; placeholder="F45 Bondi" |
| C-0662 / 360 | SignageStudiosPage / TRADE | `AddressAutocomplete` onChange={(v) =&gt; { setAddress(v); setLat(null); setLng(null) }} |
| C-0663 / 389 | SignageStudiosPage / TRADE | `input` id="studio-region"; onChange={(e) =&gt; setRegion(e.target.value)}; placeholder="AU-NSW" |
| C-0664 / 392 | SignageStudiosPage / TRADE | `button` type="submit"; disabled={busy \|\| !name.trim()} |
| C-0665 / 406 | SignageStudiosPage / TRADE | `input` type="file"; aria-label="Studio roster CSV"; onChange={(e) =&gt; { const f = e.target.files?.[0]; if (f) void importCsv(f) }} |
| C-0666 / 436 | SignageStudiosPage / TRADE | `button` Delete; type="button"; onClick={() =&gt; void deleteStudio(s)}; aria-label={\`Delete ${s.name}\`} |
| C-0667 / 487 | Preview / TRADE | `button` type="button"; disabled={!src}; onClick={() =&gt; src && onView(src)} |
| C-0668 / 522 | Thumb / TRADE | `button` type="button"; disabled={!src}; onClick={() =&gt; src && onView(src)} |

### `web/app/dashboard/signage/_components/BrandTabs.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0669 / 28 | BrandTabs / TRADE | `button` type="button"; onClick={() =&gt; !active && onSelect(b.slug)} |

### `web/app/dashboard/signage/_components/ui.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0670 / 66 | SignageNav / TRADE | `Link` href={withBrand(item.href, brandSlug)} |
| C-0671 / 92 | Crumbs / TRADE | `Link` href={c.href} |
| C-0672 / 349 | Lightbox / TRADE | `div` role="dialog"; aria-label={alt ?? 'Image preview'}; onClick={onClose} |
| C-0673 / 358 | Lightbox / TRADE | `button` Close ✕; type="button"; onClick={onClose} |

### `web/app/dashboard/studio/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0674 / 122 | StudioPage / TRADE | `button` Reset; onClick={() =&gt; setSlides(DEFAULT_CAROUSEL)} |
| C-0675 / 123 | StudioPage / TRADE | `button` onClick={downloadPNG}; disabled={!!busy} |
| C-0676 / 124 | StudioPage / TRADE | `button` onClick={downloadPDF}; disabled={!!busy} |
| C-0677 / 125 | StudioPage / TRADE | `Link` Dashboard; href="/dashboard" |
| C-0678 / 134 | StudioPage / TRADE | `button` onClick={() =&gt; setSel(i)} |
| C-0679 / 166 | StudioPage / TRADE | `textarea` onChange={(e) =&gt; setArr('eyebrow', e.target.value)} |
| C-0680 / 175 | StudioPage / TRADE | `input` onChange={(e) =&gt; setTuple('lines', i, 0, e.target.value)} |
| C-0681 / 176 | StudioPage / TRADE | `input` onChange={(e) =&gt; setTuple('lines', i, 1, e.target.value)} |
| C-0682 / 181 | StudioPage / TRADE | `textarea` onChange={(e) =&gt; patch({ sub: e.target.value })} |
| C-0683 / 182 | StudioPage / TRADE | `textarea` onChange={(e) =&gt; setArr('proof', e.target.value)} |
| C-0684 / 188 | StudioPage / TRADE | `textarea` onChange={(e) =&gt; patch({ h: e.target.value })} |
| C-0685 / 193 | StudioPage / TRADE | `input` onChange={(e) =&gt; setTuple('cards', i, 0, e.target.value)} |
| C-0686 / 194 | StudioPage / TRADE | `input` onChange={(e) =&gt; setTuple('cards', i, 1, e.target.value)} |
| C-0687 / 199 | StudioPage / TRADE | `textarea` onChange={(e) =&gt; patch({ sub: e.target.value })} |
| C-0688 / 205 | StudioPage / TRADE | `textarea` onChange={(e) =&gt; patch({ h: e.target.value })} |
| C-0689 / 210 | StudioPage / TRADE | `input` onChange={(e) =&gt; setTuple('steps', i, 0, e.target.value)} |
| C-0690 / 212 | StudioPage / TRADE | `input` onChange={(e) =&gt; setTuple('steps', i, 1, e.target.value)} |
| C-0691 / 213 | StudioPage / TRADE | `input` onChange={(e) =&gt; setTuple('steps', i, 2, e.target.value)} |
| C-0692 / 224 | StudioPage / TRADE | `textarea` onChange={(e) =&gt; patch({ quote: e.target.value })} |
| C-0693 / 225 | StudioPage / TRADE | `textarea` onChange={(e) =&gt; setArr('attrib', e.target.value)} |
| C-0694 / 232 | StudioPage / TRADE | `textarea` onChange={(e) =&gt; patch({ h: e.target.value })} |
| C-0695 / 233 | StudioPage / TRADE | `textarea` onChange={(e) =&gt; patch({ sub: e.target.value })} |
| C-0696 / 234 | StudioPage / TRADE | `input` onChange={(e) =&gt; patch({ btn: e.target.value })} |
| C-0697 / 235 | StudioPage / TRADE | `textarea` onChange={(e) =&gt; setArr('foot', e.target.value)} |
| C-0698 / 241 | StudioPage / TRADE | `select` onChange={(e) =&gt; { const v = e.target.value if (v === 'none') patch({ photo: null }) else patch({ photo: { src: \`/studio/photos/${v}.png\`, scrim: cur.photo?.scrim ?? 'top', pos: cur.photo?.pos } }) }} |
| C-0699 / 256 | StudioPage / TRADE | `select` onChange={(e) =&gt; patch({ photo: { ...cur.photo!, scrim: e.target.value as 'top' \| 'left' \| 'faint' } })} |
| C-0700 / 265 | StudioPage / TRADE | `textarea` onChange={(e) =&gt; setArr('bar', e.target.value)} |

### `web/app/dashboard/_components/BillingTab.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0701 / 281 | BillingTab / CORE | `button` type="button"; onClick={openPortal}; disabled={busy === 'portal'} |
| C-0702 / 303 | BillingTab / CORE | `button` type="button"; onClick={openPortal}; disabled={busy === 'portal'} |
| C-0703 / 343 | BillingTab / CORE | `ToggleButton` Monthly; onClick={() =&gt; setAnnual(false)} |
| C-0704 / 346 | BillingTab / CORE | `ToggleButton` Annual; onClick={() =&gt; setAnnual(true)} |
| C-0705 / 400 | BillingTab / CORE | `button` type="button"; onClick={() =&gt; startCheckout(plan)}; disabled={busy === plan.id \|\| isCurrent} |
| C-0706 / 527 | ToggleButton / CORE | `button` type="button"; onClick={onClick} |

### `web/app/dashboard/_components/CalendarTab.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0707 / 425 | CalendarTab / CORE | `button` type="button"; onClick={() =&gt; void load()}; disabled={loading}; title="Refresh bookings" |
| C-0708 / 435 | CalendarTab / CORE | `a` New booking; href={tenantId ? \`/book/${tenantId}\` : undefined} |
| C-0709 / 541 | CalendarTab / CORE | `button` type="button"; onClick={() =&gt; selectDay(k)}; aria-label={\`${weekdayAbbrev(k)} ${dayNum(k)}${eventDays.has(k) ? ' — has bookings' : ''}\`} |
| C-0710 / 596 | CalendarTab / CORE | `button` type="button"; onClick={onGoToQuotes} |
| C-0711 / 637 | CalendarTab / CORE | `AgendaRow` title={\`${ev.needsInspection \|\| ev.paidTier === 'inspection' ? 'Site visit — ' : ''}${jobLabel(ev.jobType)}\`}; href={ev.href} |
| C-0712 / 674 | CalendarTab / CORE | `AgendaRow` title={\`Site visit — ${jobLabel(ev.jobType)}\`}; href={ev.href} |
| C-0713 / 730 | CalendarTab / CORE | `AgendaRow` title={eventTitle(ev)}; href={ev.href} |
| C-0714 / 758 | CalendarTab / CORE | `AgendaRow` title={eventTitle(ev)}; href={ev.href} |
| C-0715 / 808 | AgendaRow / CORE | `div` role={open ? 'link' : undefined}; onClick={open} |
| C-0716 / 866 | AgendaRow / CORE | `button` type="button"; onClick={(e) =&gt; { e.stopPropagation() confirm.onConfirm() }}; disabled={confirm.pending} |

### `web/app/dashboard/_components/ChangePasswordCard.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0717 / 93 | ChangePasswordCard / CORE | `form` onSubmit={handleSubmit} |
| C-0718 / 95 | ChangePasswordCard / CORE | `input` type="password"; onChange={(e) =&gt; setCurrent(e.target.value)} |
| C-0719 / 106 | ChangePasswordCard / CORE | `input` type="password"; onChange={(e) =&gt; setNext(e.target.value)} |
| C-0720 / 117 | ChangePasswordCard / CORE | `input` type="password"; onChange={(e) =&gt; setConfirm(e.target.value)} |
| C-0721 / 139 | ChangePasswordCard / CORE | `button` type="submit"; disabled={submitting} |

### `web/app/dashboard/_components/commercial-painting/CommercialPaintingTab.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0722 / 600 | CommercialPaintingTab / TRADE | `button` Check now; type="button"; onClick={() =&gt; { if (runId) void loadRun(runId) }} |
| C-0723 / 625 | CommercialPaintingTab / TRADE | `input` onChange={(e) =&gt; setJobName(e.target.value)}; placeholder="IGA Swan Street fit-out" |
| C-0724 / 629 | CommercialPaintingTab / TRADE | `input` onChange={(e) =&gt; setSiteAddress(e.target.value)}; placeholder="480 Swan St, Richmond VIC" |
| C-0725 / 648 | CommercialPaintingTab / TRADE | `input` type="file"; onChange={(e) =&gt; { if (e.target.files) void uploadFiles(e.target.files); e.target.value = '' }} |
| C-0726 / 666 | CommercialPaintingTab / TRADE | `select` onChange={(e) =&gt; void setDocType(u.id, e.target.value as PaintDocType)}; aria-label={\`Document type for ${u.filename}\`} |
| C-0727 / 676 | CommercialPaintingTab / TRADE | `button` type="button"; onClick={() =&gt; void openViewer(u)}; aria-label={\`View ${u.filename}\`} |
| C-0728 / 689 | CommercialPaintingTab / TRADE | `button` type="button"; onClick={() =&gt; void removeUpload(u.id)}; aria-label={\`Remove ${u.filename}\`} |
| C-0729 / 710 | CommercialPaintingTab / TRADE | `button` type="button"; onClick={() =&gt; setViewer(null)}; aria-label="Close viewer" |
| C-0730 / 733 | CommercialPaintingTab / TRADE | `button` type="button"; onClick={() =&gt; void runTakeoff()}; disabled={!hasPlanSet \|\| uploading \|\| extracting} |
| C-0731 / 761 | CommercialPaintingTab / TRADE | `button` New run; type="button"; onClick={resetRun} |
| C-0732 / 779 | CommercialPaintingTab / TRADE | `button` type="button"; onClick={() =&gt; { const planSet = uploads.find((u) =&gt; u.doc_type === 'plan_set') if (planSet) void openViewer(planSet) }} |
| C-0733 / 844 | CommercialPaintingTab / TRADE | `input` type="text"; onChange={(e) =&gt; setCustomerName(e.target.value)}; placeholder="Customer name (optional)" |
| C-0734 / 851 | CommercialPaintingTab / TRADE | `input` type="tel"; onChange={(e) =&gt; setCustomerPhone(e.target.value)}; placeholder="Customer mobile e.g. 0412 345 678" |
| C-0735 / 867 | CommercialPaintingTab / TRADE | `button` type="button"; disabled={saving}; onClick={() =&gt; void saveAsQuote()} |
| C-0736 / 889 | CommercialPaintingTab / TRADE | `a` Open quote ↗; href={savedQuote.quoteViewUrl} |
| C-0737 / 893 | CommercialPaintingTab / TRADE | `a` Tender PDF ↗; href={savedQuote.pdfUrl} |
| C-0738 / 951 | CommercialPaintingTab / TRADE | `button` type="button"; disabled={extracting \|\| pricing \|\| saving}; onClick={() =&gt; void loadRun(r.id)} |
| C-0739 / 1009 | CommercialPaintingTab / TRADE | `a` Customer →; href={\`/q/commercial-paint/${r.public_token}\`} |

### `web/app/dashboard/_components/commercial-painting/PaintPreviewPanel.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0740 / 85 | PaintPreviewPanel / TRADE | `input` onChange={(e) =&gt; setColour(e.target.value)}; placeholder="Colour scheme, e.g. Dulux Lexicon Quarter walls"; aria-label="Colour scheme" |
| C-0741 / 92 | PaintPreviewPanel / TRADE | `button` type="button"; disabled={busy}; onClick={() =&gt; void call({ colour })} |
| C-0742 / 136 | PaintPreviewPanel / TRADE | `input` onChange={(e) =&gt; setInstruction(e.target.value)}; placeholder="Refine, e.g. make the fascia charcoal"; aria-label="Refinement instruction" |
| C-0743 / 143 | PaintPreviewPanel / TRADE | `button` Refine; type="button"; disabled={busy \|\| !instruction.trim()}; onClick={() =&gt; void call({ refine: { image: after, instruction } })} |

### `web/app/dashboard/_components/commercial-painting/PaintPricedSummary.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0744 / 100 | LineRow / TRADE | `button` how?; type="button"; onClick={toggle} |

### `web/app/dashboard/_components/commercial-painting/PaintTakeoffEditor.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0745 / 181 | PaintTakeoffEditor / TRADE | `button` type="button"; onClick={() =&gt; setShowFlags((v) =&gt; !v)} |
| C-0746 / 210 | PaintTakeoffEditor / TRADE | `details`  |
| C-0747 / 211 | PaintTakeoffEditor / TRADE | `summary` Finishes schedule from the plans · entries |
| C-0748 / 238 | PaintTakeoffEditor / TRADE | `input` type="number"; onChange={(e) =&gt; setBulkCoats(e.target.value)}; placeholder="3"; aria-label="Set all coats to" |
| C-0749 / 251 | PaintTakeoffEditor / TRADE | `button` Apply to all lines; type="button"; onClick={applyBulkCoats}; disabled={bulkCoats.trim() === ''} |
| C-0750 / 271 | PaintTakeoffEditor / TRADE | `button` Line; type="button"; onClick={() =&gt; addRow(room)} |
| C-0751 / 303 | PaintTakeoffEditor / TRADE | `input` onChange={(e) =&gt; patch(r.uid, { surface: e.target.value })}; placeholder="Surface"; aria-label="Surface"; title={r.note} |
| C-0752 / 313 | PaintTakeoffEditor / TRADE | `select` onChange={(e) =&gt; patch(r.uid, { system: e.target.value as PaintSystem })}; aria-label="Paint system" |
| C-0753 / 325 | PaintTakeoffEditor / TRADE | `input` type="number"; onChange={(e) =&gt; patch(r.uid, { quantity: Number(e.target.value) })}; aria-label="Quantity" |
| C-0754 / 336 | PaintTakeoffEditor / TRADE | `select` onChange={(e) =&gt; patch(r.uid, { unit: e.target.value as 'm2' \| 'item' })}; aria-label="Unit" |
| C-0755 / 347 | PaintTakeoffEditor / TRADE | `input` type="number"; onChange={(e) =&gt; patch(r.uid, { coats: Number(e.target.value) })}; aria-label="Coats" |
| C-0756 / 359 | PaintTakeoffEditor / TRADE | `input` type="number"; placeholder="—"; onChange={(e) =&gt; patch(r.uid, { height_m: e.target.value === '' ? undefined : Number(e.target.value) }) }; aria-label="Height in metres" |
| C-0757 / 374 | PaintTakeoffEditor / TRADE | `input` type="checkbox"; onChange={(e) =&gt; patch(r.uid, { separate_price: e.target.checked })}; aria-label="Price separately" |
| C-0758 / 383 | PaintTakeoffEditor / TRADE | `input` type="checkbox"; onChange={(e) =&gt; patch(r.uid, { excluded: e.target.checked })}; aria-label="Exclude from the quote" |
| C-0759 / 408 | PaintTakeoffEditor / TRADE | `input` type="number"; onChange={(e) =&gt; { setLabourRate(e.target.value) if (labourRateError) setLabourRateError(null) }}; placeholder={defaultLabourRate != null ? String(defaultLabourRate) : '75'}; aria-label="Labour rate in dollars per hour"; title="Per-quote override. Leave blank to use your saved rate." |
| C-0760 / 426 | PaintTakeoffEditor / TRADE | `button` type="button"; disabled={pricing}; onClick={handleConfirm} |
| C-0761 / 445 | PaintTakeoffEditor / TRADE | `button` Reset edits; type="button"; onClick={() =&gt; setRows(toRows(initialItems))} |

### `web/app/dashboard/_components/DashboardTopNav.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0762 / 25 | DashboardTopNav / CORE | `Link` Dashboard; href="/dashboard" |

### `web/app/dashboard/_components/estimator/PricedSummary.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0763 / 137 | PricedSummary / TRADE | `button` how?; type="button"; onClick={() =&gt; setOpenTrace((s) =&gt; (s === i ? null : i))} |
| C-0764 / 290 | UnmatchedItem / TRADE | `button` type="button"; onClick={() =&gt; { setOpen((s) =&gt; !s) setError(null) }} |
| C-0765 / 306 | UnmatchedItem / TRADE | `form` id={\`${fid}-form\`}; onSubmit={submit} |
| C-0766 / 314 | UnmatchedItem / TRADE | `input` type="number"; onChange={(e) =&gt; setPrice(e.target.value)}; placeholder="0.00"; aria-label={\`Unit price ex GST for ${item.type}\`} |
| C-0767 / 332 | UnmatchedItem / TRADE | `input` type="number"; onChange={(e) =&gt; setLabour(e.target.value)}; placeholder="0"; aria-label={\`Labour hours per unit for ${item.type}\`} |
| C-0768 / 348 | UnmatchedItem / TRADE | `select` onChange={(e) =&gt; setCategory(e.target.value)}; aria-label={\`Catalogue category for ${item.type}\`} |
| C-0769 / 371 | UnmatchedItem / TRADE | `button` type="submit"; disabled={!canSubmit} |

### `web/app/dashboard/_components/estimator/RunWorkspace.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0770 / 311 | RunWorkspace / TRADE | `Link` ← Back to the Estimator; href="/dashboard?tab=estimator" |
| C-0771 / 364 | RunWorkspace / TRADE | `Link` QuoteMax · Estimator; href="/dashboard?tab=estimator" |
| C-0772 / 466 | RunWorkspace / TRADE | `input` type="file"; aria-label={\`Re-attach ${filename}\`}; onChange={(e) =&gt; attachFile(e.target.files?.[0] ?? null)} |
| C-0773 / 518 | RunWorkspace / TRADE | `button` type="button"; onClick={refine}; disabled={refining \|\| saving \|\| !file \|\| dominantPage === null}; title={ dominantPage === null ? 'No pin locations on this run — run a fresh analysis to enable recounts' : !file ? 'Re-attach the plan PDF to enable recounts' : \`Tiled high-DPI recount of the low-confid |
| C-0774 / 540 | RunWorkspace / TRADE | `button` type="button"; onClick={() =&gt; accessToken && void price(accessToken)}; disabled={pricing \|\| saving \|\| rows.length === 0} |
| C-0775 / 557 | RunWorkspace / TRADE | `button` type="button"; onClick={save}; disabled={saving \|\| refining} |

### `web/app/dashboard/_components/estimator/TakeoffTable.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0776 / 79 | TakeoffTable / TRADE | `input` type="text"; onChange={(e) =&gt; patch(r.uid, { type: e.target.value })}; disabled={disabled}; aria-label={\`Item ${idx + 1} name\`}; placeholder={r.manual ? 'e.g. Double GPO' : undefined} |
| C-0777 / 91 | TakeoffTable / TRADE | `input` type="text"; onChange={(e) =&gt; patch(r.uid, { symbol: e.target.value })}; disabled={disabled}; aria-label={\`Item ${idx + 1} legend symbol\`} |
| C-0778 / 101 | TakeoffTable / TRADE | `input` type="number"; onChange={(e) =&gt; patch(r.uid, { count: e.target.value })}; disabled={disabled}; aria-label={\`${r.type \|\| \`item ${idx + 1}\`} count\`} |
| C-0779 / 118 | TakeoffTable / TRADE | `button` pins; type="button"; onClick={() =&gt; onSelect(selected ? null : idx)}; disabled={disabled}; title={\`Highlight ${r.locations.length} pin${r.locations.length === 1 ? '' : 's'} on the plan\`} |
| C-0780 / 135 | TakeoffTable / TRADE | `button` ×; type="button"; onClick={() =&gt; remove(r.uid)}; disabled={disabled}; aria-label={\`Remove ${r.type \|\| \`item ${idx + 1}\`}\`}; title="Remove this line (false positive)" |
| C-0781 / 170 | TakeoffTable / TRADE | `button` + Add missed item; type="button"; onClick={add}; disabled={disabled} |

### `web/app/dashboard/_components/EstimatorBetaTab.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0782 / 108 | EstimatorBetaTab / TRADE | `form` onSubmit={analyse} |
| C-0783 / 144 | EstimatorBetaTab / TRADE | `input` type="file"; onChange={(e) =&gt; acceptFile(e.target.files?.[0])}; disabled={analysing}; aria-label="Plan PDF" |
| C-0784 / 177 | EstimatorBetaTab / TRADE | `input` type="text"; onChange={(e) =&gt; setSheetHint(e.target.value)}; placeholder="ELECTRICAL / POWER & DATA"; disabled={analysing}; aria-label="Sheet hint" |
| C-0785 / 191 | EstimatorBetaTab / TRADE | `button` type="submit"; disabled={analysing \|\| !file \|\| !accessToken} |
| C-0786 / 285 | EstimatorBetaTab / TRADE | `button` type="button"; onClick={() =&gt; router.push(\`/dashboard/estimator/${ex.id}\`)} |

### `web/app/dashboard/_components/EstimatorChatbot.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0787 / 140 | EstimatorChatbot / TRADE | `button` type="button"; onClick={() =&gt; setOpen((o) =&gt; !o)} |
| C-0788 / 203 | EstimatorChatbot / TRADE | `button` type="button"; onClick={() =&gt; void send(s)}; disabled={loading} |
| C-0789 / 225 | EstimatorChatbot / TRADE | `form` onSubmit={(e) =&gt; { e.preventDefault() void send(input) }} |
| C-0790 / 238 | EstimatorChatbot / TRADE | `input` onChange={(e) =&gt; setInput(e.target.value)}; placeholder="Ask about this estimate…"; aria-label="Ask about this estimate" |
| C-0791 / 254 | EstimatorChatbot / TRADE | `button` type="submit"; disabled={loading \|\| !input.trim()} |

### `web/app/dashboard/_components/FeatureGate.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0792 / 70 | FeatureGate / CORE | `Link` Sign in; href="/signin" |
| C-0793 / 81 | FeatureGate / CORE | `Link` dashboard; href="/dashboard" |
| C-0794 / 95 | GateNotice / CORE | `Link` Dashboard; href="/dashboard" |

### `web/app/dashboard/_components/FilesTab.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0795 / 331 | FilesTab / CORE | `form` onSubmit={ask} |
| C-0796 / 338 | FilesTab / CORE | `input` type="text"; onChange={(e) =&gt; setQuery(e.target.value)}; placeholder="e.g. What did I charge for a hot water system?" |
| C-0797 / 346 | FilesTab / CORE | `button` type="submit"; disabled={asking \|\| !query.trim()} |
| C-0798 / 382 | FilesTab / CORE | `button` type="button"; onClick={() =&gt; download(doc)}; disabled={downloading === doc.id} |
| C-0799 / 478 | FilesTab / CORE | `button` View; type="button"; onClick={() =&gt; view(doc)} |
| C-0800 / 486 | FilesTab / CORE | `button` type="button"; onClick={() =&gt; download(doc)}; disabled={downloading === doc.id} |
| C-0801 / 500 | FilesTab / CORE | `button` Comments; type="button"; onClick={() =&gt; setCommentsDoc(doc)} |
| C-0802 / 535 | FilesTab / CORE | `div` role="dialog"; aria-label={viewerDoc.display_name ?? 'Document'}; onClick={closeViewer} |
| C-0803 / 542 | FilesTab / CORE | `div` onClick={(e) =&gt; e.stopPropagation()} |
| C-0804 / 559 | FilesTab / CORE | `button` Download; type="button"; onClick={() =&gt; download(viewerDoc)}; disabled={downloading === viewerDoc.id} |
| C-0805 / 573 | FilesTab / CORE | `button` type="button"; onClick={closeViewer}; aria-label="Close" |
| C-0806 / 606 | FilesTab / CORE | `button` Download instead; type="button"; onClick={() =&gt; download(viewerDoc)} |
| C-0807 / 643 | FilesTab / CORE | `button` Download instead; type="button"; onClick={() =&gt; download(viewerDoc)} |
| C-0808 / 660 | FilesTab / CORE | `div` role="dialog"; aria-label={\`Comments — ${commentsDoc.display_name ?? 'document'}\`}; onClick={closeComments} |
| C-0809 / 671 | FilesTab / CORE | `div` onClick={(e) =&gt; e.stopPropagation()} |
| C-0810 / 679 | FilesTab / CORE | `button` type="button"; onClick={closeComments}; aria-label="Close" |

### `web/app/dashboard/_components/FloorPlanOverlay.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0811 / 160 | FloorPlanOverlay / TRADE | `button` type="button"; onClick={() =&gt; setSystem(s)} |

### `web/app/dashboard/_components/FlyerDesignerTab.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0812 / 374 | FlyerDesignerTab / CORE | `button` Open Canva; onClick={() =&gt; setView('canva')} |
| C-0813 / 383 | FlyerDesignerTab / CORE | `button` disabled={busy}; onClick={() =&gt; createFromTemplate(t.id)} |
| C-0814 / 415 | FlyerDesignerTab / CORE | `button` Edit; onClick={() =&gt; openFlyer(f.id)} |
| C-0815 / 416 | FlyerDesignerTab / CORE | `button` Delete; onClick={() =&gt; deleteFlyer(f.id)} |
| C-0816 / 446 | FlyerDesignerTab / CORE | `button` &larr; Back; onClick={() =&gt; { setView('list'); setSelectedId(null) }} |
| C-0817 / 447 | FlyerDesignerTab / CORE | `input` onChange={(e) =&gt; setName(e.target.value)}; placeholder="Flyer name" |
| C-0818 / 453 | FlyerDesignerTab / CORE | `button` onClick={saveFlyer}; disabled={saving} |
| C-0819 / 454 | FlyerDesignerTab / CORE | `button` onClick={exportFlyer}; disabled={exporting} |
| C-0820 / 461 | FlyerDesignerTab / CORE | `FlyerCanvasEditor` onChange={updateElements} |
| C-0821 / 476 | FlyerDesignerTab / CORE | `button` + Text; onClick={addText} |
| C-0822 / 479 | FlyerDesignerTab / CORE | `input` type="file"; onChange={(e) =&gt; { const f = e.target.files?.[0] if (f) void addUploadedImage(f) e.target.value = '' }} |
| C-0823 / 499 | FlyerDesignerTab / CORE | `button` onClick={generateQr}; disabled={qrBusy} |
| C-0824 / 508 | FlyerDesignerTab / CORE | `button` onClick={() =&gt; setQrSrc(q.url)}; title={q.label} |
| C-0825 / 532 | FlyerDesignerTab / CORE | `textarea` onChange={(e) =&gt; patchSelected({ text: e.target.value })} |
| C-0826 / 540 | FlyerDesignerTab / CORE | `select` onChange={(e) =&gt; patchSelected({ fontFamily: e.target.value })} |
| C-0827 / 550 | FlyerDesignerTab / CORE | `input` type="number"; onChange={(e) =&gt; patchSelected({ fontSize: Number(e.target.value) \|\| 12 })} |
| C-0828 / 560 | FlyerDesignerTab / CORE | `input` type="color"; onChange={(e) =&gt; patchSelected({ fill: e.target.value })} |
| C-0829 / 569 | FlyerDesignerTab / CORE | `select` onChange={(e) =&gt; patchSelected({ align: e.target.value as 'left' \| 'center' \| 'right' })} |
| C-0830 / 583 | FlyerDesignerTab / CORE | `input` type="color"; onChange={(e) =&gt; patchSelected({ fill: e.target.value })} |
| C-0831 / 594 | FlyerDesignerTab / CORE | `input` type="file"; onChange={(e) =&gt; { const f = e.target.files?.[0] if (f) void replaceSelectedImage(f) e.target.value = '' }} |
| C-0832 / 606 | FlyerDesignerTab / CORE | `button` Delete element; onClick={deleteSelected} |

### `web/app/dashboard/_components/HistoricalQuotesTab.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0833 / 323 | HistoricalQuotesTab / CORE | `form` onSubmit={onUpload} |
| C-0834 / 324 | HistoricalQuotesTab / CORE | `input` type="file" |
| C-0835 / 330 | HistoricalQuotesTab / CORE | `button` type="submit"; disabled={uploading} |
| C-0836 / 362 | HistoricalQuotesTab / CORE | `button` Confirm all; type="button"; onClick={() =&gt; setAllStatus('confirmed')} |
| C-0837 / 369 | HistoricalQuotesTab / CORE | `button` Save review; type="button"; onClick={saveReview}; disabled={savingReview} |
| C-0838 / 399 | HistoricalQuotesTab / CORE | `select` onChange={(e) =&gt; setRowJobType(r.id, e.target.value)} |
| C-0839 / 411 | HistoricalQuotesTab / CORE | `button` type="button"; aria-label="Confirm"; onClick={() =&gt; setRowStatus(r.id, 'confirmed')} |
| C-0840 / 423 | HistoricalQuotesTab / CORE | `button` type="button"; aria-label="Reject"; onClick={() =&gt; setRowStatus(r.id, 'rejected')} |
| C-0841 / 492 | HistoricalQuotesTab / CORE | `button` Preview; type="button"; onClick={previewCalibration}; disabled={calibrating} |
| C-0842 / 498 | HistoricalQuotesTab / CORE | `SlidersHorizontal`  |
| C-0843 / 521 | HistoricalQuotesTab / CORE | `input` type="checkbox"; onChange={(e) =&gt; setSelectedJobTypes((prev) =&gt; { const next = new Set(prev) if (e.target.checked) next.add(p.job_type) else next.delete(p.job_type) return next }) } |
| C-0844 / 547 | HistoricalQuotesTab / CORE | `button` Apply to pricing book; type="button"; onClick={applyCalibration}; disabled={calibrating \|\| selectedJobTypes.size === 0} |
| C-0845 / 566 | HistoricalQuotesTab / CORE | `select` onChange={(e) =&gt; setFilterJobType(e.target.value)} |
| C-0846 / 578 | HistoricalQuotesTab / CORE | `input` type="text"; onChange={(e) =&gt; setSearch(e.target.value)}; placeholder="Search descriptions…" |

### `web/app/dashboard/_components/OverviewAnalytics.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0847 / 279 | NeedsAttention / CORE | `button` type="button"; onClick={a.onClick} |

### `web/app/dashboard/_components/Pagination.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0848 / 166 | PaginationControls / CORE | `button` Prev; type="button"; onClick={() =&gt; onPageChange(page - 1)}; disabled={page &lt;= 1}; aria-label="Previous page" |
| C-0849 / 185 | PaginationControls / CORE | `button` type="button"; onClick={() =&gt; onPageChange(p)}; disabled={p === page} |
| C-0850 / 197 | PaginationControls / CORE | `button` Next; type="button"; onClick={() =&gt; onPageChange(page + 1)}; disabled={page &gt;= totalPages}; aria-label="Next page" |

### `web/app/dashboard/_components/PaintRatesEditor.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0851 / 299 | PaintRatesEditor / TRADE | `form` onSubmit={save} |
| C-0852 / 327 | PaintRatesEditor / TRADE | `UnitInput` onChange={(v) =&gt; setRates((r) =&gt; ({ ...r, [key]: v }))}; placeholder={def !== undefined ? String(def) : ''}; disabled={loading \|\| saving} |
| C-0853 / 338 | PaintRatesEditor / TRADE | `select` aria-label="Pricing model"; onChange={(e) =&gt; setPricingModel(e.target.value as '' \| 'sqm' \| 'hourly')}; disabled={loading \|\| saving} |
| C-0854 / 347 | PaintRatesEditor / TRADE | `UnitInput` onChange={setHourlyRate}; placeholder={String(DEFAULT_PAINTING_HOURLY_RATE)}; disabled={loading \|\| saving} |
| C-0855 / 357 | PaintRatesEditor / TRADE | `PlainInput` onChange={(v) =&gt; setCoatsMult((m) =&gt; ({ ...m, [k]: v }))}; placeholder={String(DEFAULT_PAINTING_RATE_CARD.coats_multiplier[Number(k) as 1 \| 2 \| 3])}; disabled={loading \|\| saving} |
| C-0856 / 364 | PaintRatesEditor / TRADE | `PlainInput` onChange={(v) =&gt; setCondMult((m) =&gt; ({ ...m, [k]: v }))}; placeholder={String(DEFAULT_PAINTING_RATE_CARD.condition_multiplier[k])}; disabled={loading \|\| saving} |
| C-0857 / 372 | PaintRatesEditor / TRADE | `PctInput` label="Good tier (% of Better)"; onChange={setGoodFrac}; disabled={loading \|\| saving} |
| C-0858 / 373 | PaintRatesEditor / TRADE | `PctInput` label="Best uplift over Better"; onChange={setPremium}; disabled={loading \|\| saving} |
| C-0859 / 378 | PaintRatesEditor / TRADE | `PctInput` label="Double-storey exterior"; onChange={setDoubleStorey}; disabled={loading \|\| saving} |
| C-0860 / 379 | PaintRatesEditor / TRADE | `PctInput` label="Colour change"; onChange={setColourExtra}; disabled={loading \|\| saving} |
| C-0861 / 393 | PaintRatesEditor / TRADE | `PlainInput` onChange={(v) =&gt; setCoverage((c) =&gt; ({ ...c, [key]: v }))}; placeholder={covDef !== undefined ? String(covDef) : ''}; disabled={loading \|\| saving} |
| C-0862 / 398 | PaintRatesEditor / TRADE | `UnitInput` onChange={(v) =&gt; setLitrePrice((c) =&gt; ({ ...c, [key]: v }))}; placeholder={priceDef !== undefined ? String(priceDef) : ''}; disabled={loading \|\| saving} |
| C-0863 / 414 | PaintRatesEditor / TRADE | `PlainInput` onChange={(v) =&gt; setProduction((p) =&gt; ({ ...p, [key]: v }))}; placeholder={String(def)}; disabled={loading \|\| saving} |
| C-0864 / 421 | PaintRatesEditor / TRADE | `PlainInput` onChange={setCrew}; placeholder={String(DEFAULT_PAINTING_TAKEOFF_CARD.crew_size)}; disabled={loading \|\| saving} |
| C-0865 / 424 | PaintRatesEditor / TRADE | `PctInput` label="Prep & sundries"; onChange={setSundries}; disabled={loading \|\| saving} |
| C-0866 / 427 | PaintRatesEditor / TRADE | `PlainInput` onChange={setHoursPerDay}; placeholder={String(DEFAULT_PAINTING_TAKEOFF_CARD.hours_per_day)}; disabled={loading \|\| saving} |
| C-0867 / 430 | PaintRatesEditor / TRADE | `PctInput` label="Premium paint uplift"; onChange={setPremiumMaterialUplift}; disabled={loading \|\| saving} |
| C-0868 / 437 | PaintRatesEditor / TRADE | `UnitInput` onChange={setCallOut}; placeholder={defaults ? String(defaults.call_out_minimum_ex_gst) : ''}; disabled={loading \|\| saving} |
| C-0869 / 442 | PaintRatesEditor / TRADE | `select` aria-label="GST registered"; onChange={(e) =&gt; setGstMode(e.target.value as '' \| 'true' \| 'false')}; disabled={loading \|\| saving} |
| C-0870 / 452 | PaintRatesEditor / TRADE | `input` type="number"; onChange={(e) =&gt; setDepositPct(e.target.value)}; placeholder={String(DEFAULT_DEPOSIT_PCT)}; disabled={loading \|\| saving}; aria-label="Deposit percentage" |
| C-0871 / 460 | PaintRatesEditor / TRADE | `button` type="submit"; disabled={loading \|\| saving \|\| !accessToken} |
| C-0872 / 463 | PaintRatesEditor / TRADE | `button` Reset all to default; type="button"; onClick={() =&gt; { setRates({ walls: '', ceilings: '', trim: '', exterior: '' }); setDoubleStorey(''); setPremium(''); setGoodFrac(''); setColourExtra(''); setCallOut(''); setGstMode(''); setCoverage(EMPTY_PRODUCTS); setLitrePrice(EMPTY_PRODUCTS); setProduction({ w |
| C-0873 / 502 | PlainInput / TRADE | `input` type="number"; onChange={(e) =&gt; onChange(e.target.value)}; placeholder={placeholder}; disabled={disabled}; aria-label={ariaLabel} |
| C-0874 / 512 | UnitInput / TRADE | `input` type="number"; onChange={(e) =&gt; onChange(e.target.value)}; placeholder={placeholder}; disabled={disabled}; aria-label={ariaLabel} |
| C-0875 / 523 | PctInput / TRADE | `input` type="number"; onChange={(e) =&gt; onChange(e.target.value)}; placeholder={defaultValue !== null ? String(Math.round(defaultValue)) : ''}; disabled={disabled}; aria-label={label} |

### `web/app/dashboard/_components/PlanOverlay.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0876 / 132 | PlanOverlay / TRADE | `select` onChange={(e) =&gt; setPage(Number(e.target.value))}; aria-label="PDF page" |
| C-0877 / 152 | PlanOverlay / TRADE | `button` Show all; type="button"; onClick={() =&gt; onSelect?.(null)} |
| C-0878 / 169 | PlanOverlay / TRADE | `button` type="button"; title={pin.type}; onClick={() =&gt; onSelect?.(pin.idx)} |

### `web/app/dashboard/_components/PylonHardwareCard.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0879 / 111 | PylonHardwareCard / TRADE | `input` type="text"; onChange={(e) =&gt; setValues((v) =&gt; ({ ...v, [f.key]: e.target.value \|\| null })) }; placeholder={f.hint} |
| C-0880 / 128 | PylonHardwareCard / TRADE | `button` type="button"; onClick={() =&gt; void save()}; disabled={saving} |

### `web/app/dashboard/_components/RoofRatesEditor.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0881 / 297 | RoofRatesEditor / TRADE | `form` onSubmit={save} |
| C-0882 / 341 | RoofRatesEditor / TRADE | `CurrencyInput` onChange={(v) =&gt; setRates((r) =&gt; ({ ...r, [key]: v }))}; placeholder={def !== undefined ? String(def) : ''}; disabled={loading \|\| saving} |
| C-0883 / 361 | RoofRatesEditor / TRADE | `PctInput` label="Multi-storey access"; onChange={setMultiStorey}; disabled={loading \|\| saving} |
| C-0884 / 370 | RoofRatesEditor / TRADE | `PctInput` label="Asbestos handling"; onChange={setAsbestos}; disabled={loading \|\| saving} |
| C-0885 / 379 | RoofRatesEditor / TRADE | `PctInput` label="Complexity (always on)"; onChange={setComplexity}; disabled={loading \|\| saving} |
| C-0886 / 402 | RoofRatesEditor / TRADE | `CurrencyInput` onChange={(v) =&gt; setAccessories((a) =&gt; ({ ...a, [key]: v }))}; placeholder={def !== undefined ? String(def) : ''}; disabled={loading \|\| saving} |
| C-0887 / 428 | RoofRatesEditor / TRADE | `CurrencyInput` onChange={(v) =&gt; setEdgeRates((r) =&gt; ({ ...r, [key]: v }))}; placeholder={def !== undefined ? String(def) : ''}; disabled={loading \|\| saving} |
| C-0888 / 442 | RoofRatesEditor / TRADE | `select` aria-label="Itemise edge works"; onChange={(e) =&gt; setEdgeWorksMode(e.target.value as '' \| 'true' \| 'false')}; disabled={loading \|\| saving} |
| C-0889 / 469 | RoofRatesEditor / TRADE | `CurrencyInput` onChange={(v) =&gt; setDollars((d) =&gt; ({ ...d, [key]: v }))}; placeholder={def !== undefined ? String(def) : ''}; disabled={loading \|\| saving} |
| C-0890 / 491 | RoofRatesEditor / TRADE | `select` aria-label="Upgrade material"; onChange={(e) =&gt; setUpgradeMat(e.target.value as MaterialKey \| '')}; disabled={loading \|\| saving} |
| C-0891 / 511 | RoofRatesEditor / TRADE | `select` aria-label="GST registered"; onChange={(e) =&gt; setGstMode(e.target.value as '' \| 'true' \| 'false')}; disabled={loading \|\| saving} |
| C-0892 / 528 | RoofRatesEditor / TRADE | `button` type="submit"; disabled={loading \|\| saving \|\| !accessToken} |
| C-0893 / 548 | RoofRatesEditor / TRADE | `button` Reset all to default; type="button"; onClick={() =&gt; { setRates({ colorbond_corrugated: '', colorbond_trimdek: '', colorbond_spandek: '', colorbond_kliplok: '', concrete_tile: '', terracotta_tile: '', cement_sheet: '', }) setMultiStorey('') setAsbestos('') setComplexity('') setAccessories({ gutter_ra |
| C-0894 / 647 | CurrencyInput / TRADE | `input` type="number"; onChange={(e) =&gt; onChange(e.target.value)}; placeholder={placeholder}; disabled={disabled}; aria-label={ariaLabel} |
| C-0895 / 690 | PctInput / TRADE | `input` type="number"; onChange={(e) =&gt; onChange(e.target.value)}; placeholder={defaultValue !== null ? String(Math.round(defaultValue)) : ''}; disabled={disabled}; aria-label={label} |

### `web/app/dashboard/_components/SolarRatesEditor.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0896 / 163 | field / TRADE | `input` type="number"; placeholder={args.placeholder}; disabled={loading \|\| saving}; onChange={(e) =&gt; args.onChange(e.target.value)}; aria-label={args.label} |
| C-0897 / 182 | SolarRatesEditor / TRADE | `form` onSubmit={save} |
| C-0898 / 312 | SolarRatesEditor / TRADE | `select` aria-label="GST registered"; onChange={(e) =&gt; setGstMode(e.target.value as '' \| 'true' \| 'false')}; disabled={loading \|\| saving} |
| C-0899 / 327 | SolarRatesEditor / TRADE | `button` type="submit"; disabled={loading \|\| saving \|\| !accessToken \|\| !hasPricingBook} |
| C-0900 / 335 | SolarRatesEditor / TRADE | `button` Reset all to default; type="button"; onClick={() =&gt; { setStandard('') setPremium('') setMultiStorey('') setComplexRoof('') setCallOut('') setStcPrice('') setDepositPct('') setGstMode('') }}; disabled={loading \|\| saving} |

### `web/app/dashboard/_components/SolarTab.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0901 / 100 | TabButton / TRADE | `button` type="button"; onClick={onClick} |
| C-0902 / 396 | SolarTab / TRADE | `TabButton` onClick={() =&gt; setSub('instant')}; label="Instant estimate" |
| C-0903 / 402 | SolarTab / TRADE | `TabButton` onClick={() =&gt; setSub('felt')}; label="Felt" |
| C-0904 / 445 | SolarTab / TRADE | `button` type="button"; onClick={() =&gt; void copyLink()} |
| C-0905 / 474 | SolarTab / TRADE | `button` Refresh; type="button"; onClick={() =&gt; void load()} |
| C-0906 / 540 | SolarTab / TRADE | `a` Pylon:; href={e.pylonLeadUrl} |
| C-0907 / 556 | SolarTab / TRADE | `a` OpenSolar project; href={e.openSolarProjectUrl} |
| C-0908 / 620 | SolarTab / TRADE | `BuildingPicker` disabled={!!switchingBuilding[e.token]} |
| C-0909 / 684 | SolarTab / TRADE | `a` View; href={e.quoteUrl} |
| C-0910 / 697 | SolarTab / TRADE | `a` PDF; href={\`/api/q/solar/${e.token}/pdf\`} |
| C-0911 / 710 | SolarTab / TRADE | `a` Open in Felt; href={e.feltMapUrl} |
| C-0912 / 721 | SolarTab / TRADE | `button` type="button"; onClick={() =&gt; void confirmEstimate(e.token)}; disabled={busy} |
| C-0913 / 741 | SolarTab / TRADE | `button` type="button"; role="radio"; onClick={() =&gt; setOverrideDraft((m) =&gt; ({ ...m, [e.token]: { ...draftFor(e), phase: p }, })) } |
| C-0914 / 765 | SolarTab / TRADE | `input` type="number"; aria-label="Preferred size (kW)"; placeholder="Size kW"; onChange={(ev) =&gt; setOverrideDraft((m) =&gt; ({ ...m, [e.token]: { ...draftFor(e), desiredKw: ev.target.value }, })) } |
| C-0915 / 782 | SolarTab / TRADE | `button` type="button"; onClick={() =&gt; { const d = draftFor(e) const kw = Number.parseFloat(d.desiredKw) void redraftEstimate(e.token, { phase: d.phase, desired_kw: Number.isFinite(kw) && kw &gt; 0 ? kw : null, }) }}; disabled={!!redrafting[e.token]} |

### `web/app/dashboard/_components/VideosTab.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0916 / 323 | VideosTab / CORE | `button` Retry; type="button"; onClick={retryLoad}; disabled={!accessToken} |
| C-0917 / 385 | VideosTab / CORE | `button` type="button"; onClick={() =&gt; void generate('both')}; disabled={studioBusy \|\| !accessToken} |
| C-0918 / 432 | VideosTab / CORE | `button` type="button"; role="tab"; disabled={studioBusy && !active}; onClick={() =&gt; { if (t.slug === trade) return setTrade(t.slug) setLoading(true) }} |
| C-0919 / 492 | VideosTab / CORE | `input` id="video-contact-name"; name="contact_name"; type="text"; onChange={(event) =&gt; setContactName(event.target.value)}; placeholder="e.g. Bob…" |
| C-0920 / 513 | VideosTab / CORE | `input` id="video-business-details"; name="video_details"; type="text"; onChange={(event) =&gt; setDetails(event.target.value)}; placeholder="e.g. Family business, 20 years in Brisbane…" |
| C-0921 / 535 | VideosTab / CORE | `input` id="video-owner-photo"; name="owner_photo"; type="file"; onChange={(event) =&gt; setOwnerPhotoName(event.currentTarget.files?.[0]?.name ?? null)} |
| C-0922 / 571 | VideosTab / CORE | `input` id="video-extra-images"; name="extra_image"; type="file"; onChange={(event) =&gt; setExtraImageNames(Array.from(event.currentTarget.files ?? []).map((file) =&gt; file.name)) } |
| C-0923 / 696 | VideosTab / CORE | `details`  |
| C-0924 / 697 | VideosTab / CORE | `summary` Script used for this generation |
| C-0925 / 738 | VideosTab / CORE | `textarea` id={\`${key}-video-script\`}; name={\`script_${key}\`}; onChange={(event) =&gt; setScripts((previous) =&gt; ({ ...previous, [key]: event.target.value })) }; placeholder="Write the spoken line for this scene…" |
| C-0926 / 767 | VideosTab / CORE | `button` type="button"; onClick={() =&gt; void generate(key)}; disabled={studioBusy \|\| !accessToken}; title={studioBusy && !sceneBusy ? 'Wait for the current generation to finish' : undefined} |

### `web/app/dashboard/_components/ZoomableImage.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0927 / 38 | ZoomableImage / CORE | `img` onClick={() =&gt; setOpen(true)}; title="Click to enlarge" |
| C-0928 / 46 | ZoomableImage / CORE | `div` role="dialog"; aria-label={alt}; onClick={() =&gt; setOpen(false)} |
| C-0929 / 56 | ZoomableImage / CORE | `button` ✕; type="button"; onClick={(e) =&gt; { e.stopPropagation() setOpen(false) }}; aria-label="Close" |

### `web/app/docs/sms-onboarding-architecture/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0930 / 334 | SmsOnboardingArchitecture / PUBLIC | `Link` web onboarding architecture; href="/docs/tradie-onboarding-architecture" |
| C-0931 / 338 | SmsOnboardingArchitecture / PUBLIC | `Link` SMS flow scenario; href="/docs/sms-onboarding-flow" |
| C-0932 / 342 | SmsOnboardingArchitecture / PUBLIC | `Link` SMS plan summary; href="/docs/tradie-onboarding-plan-sms" |
| C-0933 / 346 | SmsOnboardingArchitecture / PUBLIC | `Link` home; href="/" |

### `web/app/docs/sms-onboarding-flow/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0934 / 167 | SmsOnboardingFlowDoc / PUBLIC | `Link` full SMS architecture; href="/docs/sms-onboarding-architecture" |
| C-0935 / 171 | SmsOnboardingFlowDoc / PUBLIC | `Link` web architecture; href="/docs/tradie-onboarding-architecture" |
| C-0936 / 175 | SmsOnboardingFlowDoc / PUBLIC | `Link` high-level plan; href="/docs/tradie-onboarding-plan" |
| C-0937 / 179 | SmsOnboardingFlowDoc / PUBLIC | `Link` home; href="/" |

### `web/app/docs/tradie-onboarding-architecture/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0938 / 282 | TradieOnboardingArchitecture / PUBLIC | `Link` high-level plan; href="/docs/tradie-onboarding-plan" |
| C-0939 / 286 | TradieOnboardingArchitecture / PUBLIC | `Link` SMS architecture; href="/docs/sms-onboarding-architecture" |
| C-0940 / 290 | TradieOnboardingArchitecture / PUBLIC | `Link` back to home; href="/" |

### `web/app/docs/tradie-onboarding-plan/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0941 / 143 | TradieOnboardingPlan / PUBLIC | `Link` ← Back to QuoteMax home; href="/" |

### `web/app/docs/tradie-onboarding-plan-sms/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0942 / 145 | TradieOnboardingPlanSms / PUBLIC | `Link` web plan; href="/docs/tradie-onboarding-plan" |
| C-0943 / 149 | TradieOnboardingPlanSms / PUBLIC | `Link` SMS flow scenario; href="/docs/sms-onboarding-flow" |
| C-0944 / 153 | TradieOnboardingPlanSms / PUBLIC | `Link` full SMS architecture; href="/docs/sms-onboarding-architecture" |
| C-0945 / 157 | TradieOnboardingPlanSms / PUBLIC | `Link` home; href="/" |

### `web/app/forgot-password/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0946 / 62 | ForgotPasswordPage / AUTH | `Link` Sign in; href="/signin" |
| C-0947 / 82 | ForgotPasswordPage / AUTH | `button` try a different email; type="button"; onClick={() =&gt; { setSent(false) setError(null) }} |
| C-0948 / 96 | ForgotPasswordPage / AUTH | `form` onSubmit={handleSubmit} |
| C-0949 / 98 | ForgotPasswordPage / AUTH | `input` type="email"; onChange={(e) =&gt; setEmail(e.target.value)}; placeholder="you@business.com.au" |
| C-0950 / 111 | ForgotPasswordPage / AUTH | `button` type="submit"; disabled={submitting} |

### `web/app/global-error.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0951 / 40 | GlobalError / X / PUBLIC | `button` Reload; type="button"; onClick={() =&gt; window.location.reload()} |

### `web/app/legal/cookies/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0952 / 98 | CookiePolicyPage / PUBLIC | `a` href={\`mailto:${COMPANY.privacyEmail}\`} |

### `web/app/legal/privacy/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0953 / 39 | PrivacyPolicyPage / PUBLIC | `a` href={\`mailto:${COMPANY.privacyEmail}\`} |
| C-0954 / 68 | PrivacyPolicyPage / PUBLIC | `a` Cookie policy; href="/legal/cookies" |
| C-0955 / 149 | PrivacyPolicyPage / PUBLIC | `a` href={\`mailto:${COMPANY.privacyEmail}\`} |
| C-0956 / 159 | PrivacyPolicyPage / PUBLIC | `a` href={\`mailto:${COMPANY.privacyEmail}\`} |
| C-0957 / 162 | PrivacyPolicyPage / PUBLIC | `a` oaic.gov.au; href="https://www.oaic.gov.au" |

### `web/app/legal/terms/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0958 / 35 | TermsPage / PUBLIC | `a` Privacy policy; href="/legal/privacy" |
| C-0959 / 63 | TermsPage / PUBLIC | `a` href={\`mailto:${COMPANY.supportEmail}\`} |

### `web/app/legal/_components/LegalShell.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0960 / 79 | LegalShell / PUBLIC | `a` href={\`#${item.id}\`} |
| C-0961 / 107 | LegalShell / PUBLIC | `Link` href={p.href} |
| C-0962 / 120 | LegalShell / PUBLIC | `a` href={\`mailto:${COMPANY.privacyEmail}\`} |

### `web/app/m/[token]/MeasurementReview.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0963 / 359 | MeasurementReview / PUBLIC | `a` Open customer quote; href={\`/q/roof/${publicToken}\`} |
| C-0964 / 368 | MeasurementReview / PUBLIC | `a` Download PDF; href={\`/api/q/roof/${publicToken}/pdf\`} |
| C-0965 / 380 | MeasurementReview / PUBLIC | `a` Edit &amp; send quote; href={\`/dashboard/quote/${quoteShareToken}${inspection ? '' : '?edit=1'}\`} |
| C-0966 / 387 | MeasurementReview / PUBLIC | `button` type="button"; onClick={() =&gt; void promote()}; disabled={promoteState === 'working'} |
| C-0967 / 541 | MeasurementReview / PUBLIC | `input` type="file"; aria-label="Attach roof photos"; onChange={(e) =&gt; setPhotos(Array.from(e.target.files ?? []).slice(0, 6))} |
| C-0968 / 549 | MeasurementReview / PUBLIC | `button` type="button"; onClick={rescan}; disabled={rescanState === 'scanning' \|\| photos.length === 0} |
| C-0969 / 684 | StructureCard / PUBLIC | `input` type="checkbox"; disabled={disabled}; onChange={onToggle} |
| C-0970 / 719 | StructureCard / PUBLIC | `EditField` label="Hips"; onChange={setHips}; disabled={disabled} |
| C-0971 / 720 | StructureCard / PUBLIC | `EditField` label="Valleys"; onChange={setValleys}; disabled={disabled} |
| C-0972 / 721 | StructureCard / PUBLIC | `EditField` label="Box gutter (lm)"; onChange={setBoxGutter}; disabled={disabled} |
| C-0973 / 730 | StructureCard / PUBLIC | `EditField` label="Pitch (°)"; onChange={setPitchDeg}; disabled={disabled}; placeholder={structure.inputs.pitch} |
| C-0974 / 734 | StructureCard / PUBLIC | `EditField` label="Sloped area (m²)"; onChange={setAreaM2}; disabled={disabled}; placeholder={m.footprint_m2 ? \`fp ${Math.round(m.footprint_m2)}\` : undefined} |
| C-0975 / 740 | StructureCard / PUBLIC | `select` disabled={disabled}; onChange={(e) =&gt; setForm(e.target.value as RoofMetrics['form'])} |
| C-0976 / 753 | StructureCard / PUBLIC | `EditField` label="Storeys"; onChange={setStoreys}; disabled={disabled} |
| C-0977 / 767 | StructureCard / PUBLIC | `EditField` label="Gutter (lm)"; onChange={setGutterLm}; disabled={disabled}; placeholder={perimeter != null ? \`≈${perimeter}\` : undefined} |
| C-0978 / 771 | StructureCard / PUBLIC | `EditField` label="Downpipes"; onChange={setDownpipes}; disabled={disabled}; placeholder={suggestedDownpipes != null ? \`≈${suggestedDownpipes}\` : undefined} |
| C-0979 / 775 | StructureCard / PUBLIC | `EditField` label="Fascia (lm)"; onChange={setFasciaLm}; disabled={disabled}; placeholder={perimeter != null ? \`≈${perimeter}\` : undefined} |
| C-0980 / 779 | StructureCard / PUBLIC | `EditField` label="Soffits (lm)"; onChange={setSoffitLm}; disabled={disabled}; placeholder={perimeter != null ? \`≈${perimeter}\` : undefined} |
| C-0981 / 790 | StructureCard / PUBLIC | `button` type="button"; onClick={submitEdges}; disabled={disabled} |
| C-0982 / 840 | EditField / PUBLIC | `input` type="number"; disabled={disabled}; placeholder={placeholder}; onChange={(e) =&gt; onChange(e.target.value)} |

### `web/app/m/[token]/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0983 / 130 | MeasureShell / PUBLIC | `Link` ← Dashboard; href="/dashboard" |
| C-0984 / 232 | MeasurementResultsPage / PUBLIC | `a` Call; href={\`tel:${phone}\`} |
| C-0985 / 239 | MeasurementResultsPage / PUBLIC | `Link` Measure it manually →; href="/dashboard/roofing/measure" |

### `web/app/m/[token]/Roof3DModelSection.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-0986 / 502 | Roof3DModelSection / PUBLIC | `button` type="button"; onClick={() =&gt; void generate()}; disabled={busy} |
| C-0987 / 511 | Roof3DModelSection / PUBLIC | `button` Manual capture; type="button"; onClick={() =&gt; void openManual()}; disabled={busy} |
| C-0988 / 520 | Roof3DModelSection / PUBLIC | `button` Upload photos; type="button"; onClick={() =&gt; { setError(null) setUploadShots({}) setPhase('upload') }}; disabled={busy} |
| C-0989 / 553 | Roof3DModelSection / PUBLIC | `input` type="file"; onChange={(e) =&gt; void pickUploadFile(v, e.target.files?.[0] ?? null)} |
| C-0990 / 583 | Roof3DModelSection / PUBLIC | `button` Build 3D model ( /5 views); type="button"; onClick={() =&gt; void buildFromUpload()}; disabled={ !uploadShots.front \|\| !(uploadShots.left \|\| uploadShots.right \|\| uploadShots.back) } |
| C-0991 / 594 | Roof3DModelSection / PUBLIC | `button` Cancel; type="button"; onClick={() =&gt; { setUploadShots({}) setPhase('idle') }} |
| C-0992 / 618 | Roof3DModelSection / PUBLIC | `button` type="button"; onClick={() =&gt; captureManualShot(v)} |
| C-0993 / 634 | Roof3DModelSection / PUBLIC | `button` Build 3D model ( /5 views); type="button"; onClick={() =&gt; void buildFromManual()}; disabled={ !manualShots.front \|\| !(manualShots.left \|\| manualShots.right \|\| manualShots.back) } |
| C-0994 / 645 | Roof3DModelSection / PUBLIC | `button` Cancel; type="button"; onClick={cancelManual} |
| C-0995 / 704 | Roof3DModelSection / PUBLIC | `button` View 3D model; type="button"; onClick={() =&gt; void fetchStateOnce()} |
| C-0996 / 717 | Roof3DModelSection / PUBLIC | `input` type="color"; onChange={(e) =&gt; { setRoofColor(e.target.value) setTinting((t) =&gt; ({ ...t, roof: true })) }} |
| C-0997 / 729 | Roof3DModelSection / PUBLIC | `input` type="color"; onChange={(e) =&gt; { setWallColor(e.target.value) setTinting((t) =&gt; ({ ...t, walls: true })) }} |
| C-0998 / 739 | Roof3DModelSection / PUBLIC | `button` Reset colours; type="button"; onClick={() =&gt; setTinting({ roof: false, walls: false })} |
| C-0999 / 746 | Roof3DModelSection / PUBLIC | `button` Regenerate; type="button"; onClick={() =&gt; setPhase('idle')} |

### `web/app/m/[token]/RoofLayoutSection.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1000 / 136 | RoofLayoutSection / PUBLIC | `button` type="button"; onClick={generate}; disabled={busy} |

### `web/app/not-found.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1001 / 37 | NotFound / X / PUBLIC | `PrimaryCTA` Back to home; href="/" |
| C-1002 / 38 | NotFound / X / PUBLIC | `SecondaryCTA` Go to dashboard; href="/dashboard" |
| C-1003 / 43 | NotFound / X / PUBLIC | `Link` See plans; href="/pricing" |
| C-1004 / 47 | NotFound / X / PUBLIC | `Link` Sign in; href="/signin" |

### `web/app/onboard/check-email/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1005 / 64 | CheckEmailInner / AUTH | `Link` href="/" |
| C-1006 / 70 | CheckEmailInner / AUTH | `Link` Already verified? Sign in; href="/signin" |
| C-1007 / 109 | CheckEmailInner / AUTH | `button` type="button"; onClick={handleResend}; disabled={!email \|\| resending \|\| secondsLeft &gt; 0} |

### `web/app/onboard/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1008 / 586 | OnboardWizardInner / AUTH | `input` type="text"; onChange={(e) =&gt; setInvitationCode(e.target.value.toUpperCase())}; placeholder="e.g. JON-JUNE-FLYERS-7K2P" |
| C-1009 / 598 | OnboardWizardInner / AUTH | `PrimaryButton` disabled={codeChecking}; onClick={checkCode} |
| C-1010 / 641 | OnboardWizardInner / AUTH | `SecondaryButton` Back; onClick={() =&gt; setStep((s) =&gt; (s - 1) as 1 \| 2)} |
| C-1011 / 646 | OnboardWizardInner / AUTH | `PrimaryButton` Continue; disabled={!canContinueStep1}; onClick={() =&gt; setStep(2)} |
| C-1012 / 651 | OnboardWizardInner / AUTH | `PrimaryButton` Continue; disabled={!canContinueStep2}; onClick={() =&gt; setStep(3)} |
| C-1013 / 656 | OnboardWizardInner / AUTH | `form` onSubmit={handleActivate} |
| C-1014 / 657 | OnboardWizardInner / AUTH | `button` type="submit"; disabled={submitting} |
| C-1015 / 725 | Step1 / AUTH | `input` type="text"; onChange={(e) =&gt; update('contact_name', e.target.value)} |
| C-1016 / 735 | Step1 / AUTH | `input` type="text"; onChange={(e) =&gt; update('website_url', e.target.value)} |
| C-1017 / 746 | Step1 / AUTH | `AddressAutocomplete` onChange={(v) =&gt; update('business_address', v)}; aria-label="Business address" |
| C-1018 / 799 | Step1 / AUTH | `input` type="tel"; onChange={(e) =&gt; update('owner_mobile', e.target.value)} |
| C-1019 / 810 | Step1 / AUTH | `select` onChange={(e) =&gt; update('state', e.target.value as FormState['state'])} |
| C-1020 / 821 | Step1 / AUTH | `input` type="text"; onChange={(e) =&gt; update('abn', e.target.value)} |
| C-1021 / 839 | Step1 / AUTH | `button` Add licence details; type="button"; onClick={() =&gt; setShowLicence(true)} |
| C-1022 / 857 | Step1 / AUTH | `button` Skip; type="button"; onClick={() =&gt; setShowLicence(false)} |
| C-1023 / 875 | Step1 / AUTH | `input` type="text"; onChange={(e) =&gt; update('licence_type', e.target.value)} |
| C-1024 / 885 | Step1 / AUTH | `input` type="text"; onChange={(e) =&gt; update('licence_number', e.target.value)} |
| C-1025 / 894 | Step1 / AUTH | `input` type="date"; onChange={(e) =&gt; update('licence_expiry', e.target.value)} |
| C-1026 / 946 | Step2 / AUTH | `PrefixedInput` type="number"; onChange={(v) =&gt; update('hourly_rate', v)} |
| C-1027 / 957 | Step2 / AUTH | `PrefixedInput` type="number"; onChange={(v) =&gt; update('call_out_minimum', v)} |
| C-1028 / 968 | Step2 / AUTH | `SuffixedInput` type="number"; onChange={(v) =&gt; update('default_markup_pct', v)} |
| C-1029 / 980 | Step2 / AUTH | `button` type="button"; onClick={() =&gt; setShowAdvanced(!showAdvanced)} |
| C-1030 / 991 | Step2 / AUTH | `PrefixedInput` type="number"; onChange={(v) =&gt; update('apprentice_rate', v)} |
| C-1031 / 994 | Step2 / AUTH | `PrefixedInput` type="number"; onChange={(v) =&gt; update('senior_rate', v)} |
| C-1032 / 997 | Step2 / AUTH | `input` type="number"; onChange={(e) =&gt; update('after_hours_multiplier', e.target.value)} |
| C-1033 / 1005 | Step2 / AUTH | `input` type="number"; onChange={(e) =&gt; update('min_labour_hours', e.target.value)} |
| C-1034 / 1013 | Step2 / AUTH | `SuffixedInput` type="number"; onChange={(v) =&gt; update('risk_buffer_pct', v)} |
| C-1035 / 1039 | Step2 / AUTH | `PricingModelButton` label="Per m²"; onClick={() =&gt; update('painting_pricing_model', 'sqm')} |
| C-1036 / 1045 | Step2 / AUTH | `PricingModelButton` label="Hourly"; onClick={() =&gt; update('painting_pricing_model', 'hourly')} |
| C-1037 / 1057 | Step2 / AUTH | `PrefixedInput` type="number"; onChange={(v) =&gt; update('painting_walls_rate', v)} |
| C-1038 / 1060 | Step2 / AUTH | `PrefixedInput` type="number"; onChange={(v) =&gt; update('painting_ceilings_rate', v)} |
| C-1039 / 1063 | Step2 / AUTH | `PrefixedInput` type="number"; onChange={(v) =&gt; update('painting_trim_rate', v)} |
| C-1040 / 1066 | Step2 / AUTH | `PrefixedInput` type="number"; onChange={(v) =&gt; update('painting_exterior_rate', v)} |
| C-1041 / 1069 | Step2 / AUTH | `PrefixedInput` type="number"; onChange={(v) =&gt; update('painting_call_out_minimum', v)} |
| C-1042 / 1075 | Step2 / AUTH | `PrefixedInput` type="number"; onChange={(v) =&gt; update('painting_hourly_rate', v)} |
| C-1043 / 1078 | Step2 / AUTH | `PrefixedInput` type="number"; onChange={(v) =&gt; update('painting_call_out_minimum', v)} |
| C-1044 / 1116 | Step2 / AUTH | `PrefixedInput` type="number"; onChange={(v) =&gt; update(key, v)} |
| C-1045 / 1132 | Step2 / AUTH | `input` type="checkbox"; onChange={(e) =&gt; update('gst_registered', e.target.checked)} |
| C-1046 / 1154 | Step2 / AUTH | `AvailabilityEditor` onChange={(next) =&gt; update('default_availability', next)} |
| C-1047 / 1281 | TradePill / AUTH | `button` type="button"; onClick={() =&gt; onToggle(value)} |
| C-1048 / 1308 | PricingModelButton / AUTH | `button` type="button"; onClick={onClick} |
| C-1049 / 1342 | PrefixedInput / AUTH | `input` onChange={(e) =&gt; onChange(e.target.value)} |
| C-1050 / 1360 | SuffixedInput / AUTH | `input` onChange={(e) =&gt; onChange(e.target.value)} |
| C-1051 / 1383 | PrimaryButton / AUTH | `button` type="button"; disabled={disabled}; onClick={onClick} |
| C-1052 / 1403 | SecondaryButton / AUTH | `button` type="button"; onClick={onClick} |
| C-1053 / 1523 | LogoUpload / AUTH | `input` type="file"; onChange={(e) =&gt; handleFile(e.target.files?.[0] ?? null)}; disabled={uploading} |
| C-1054 / 1533 | LogoUpload / AUTH | `button` Remove; type="button"; onClick={onCleared} |

### `web/app/onboard/stripe/refresh/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1055 / 87 | StripeConnectRefresh / AUTH | `Link` Sign in; href="/signin" |
| C-1056 / 103 | StripeConnectRefresh / AUTH | `Link` Back to dashboard; href="/dashboard" |

### `web/app/onboard/stripe/return/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1057 / 22 | StripeConnectReturn / AUTH | `Link` href="/" |
| C-1058 / 54 | StripeConnectReturn / AUTH | `Link` Back to dashboard; href="/dashboard?tab=payouts" |

### `web/app/onboard/success/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1059 / 34 | OnboardSuccess / AUTH | `Link` href="/" |
| C-1060 / 93 | OnboardSuccess / AUTH | `Link` Open my dashboard; href="/dashboard" |
| C-1061 / 101 | OnboardSuccess / AUTH | `a` Or send yourself a test text &rarr;; href={smsHref} |
| C-1062 / 141 | OnboardSuccess / AUTH | `Link` ← Go home; href="/" |

### `web/app/onboard/success/RetryPanel.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1063 / 60 | RetryPanel / AUTH | `button` type="button"; onClick={handleRetry}; disabled={busy} |

### `web/app/p/[token]/EditQuotePanel.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1064 / 98 | EditQuotePanel / PUBLIC | `button` Edit quote; type="button"; onClick={() =&gt; { reset() setOpen(true) }} |
| C-1065 / 136 | EditQuotePanel / PUBLIC | `input` id={\`${t.tier}-label\`}; type="text"; onChange={(e) =&gt; setField(t.tier, 'label', e.target.value)} |
| C-1066 / 152 | EditQuotePanel / PUBLIC | `input` id={\`${t.tier}-price\`}; type="text"; onChange={(e) =&gt; setField(t.tier, 'inc_gst', e.target.value)} |
| C-1067 / 168 | EditQuotePanel / PUBLIC | `textarea` id={\`${t.tier}-scope\`}; onChange={(e) =&gt; setField(t.tier, 'scope', e.target.value)} |
| C-1068 / 183 | EditQuotePanel / PUBLIC | `button` type="button"; onClick={save}; disabled={state === 'saving'} |
| C-1069 / 191 | EditQuotePanel / PUBLIC | `button` Cancel; type="button"; onClick={() =&gt; { setOpen(false) reset() }}; disabled={state === 'saving'} |

### `web/app/p/[token]/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1070 / 191 | PaintEstimateResultsPage / PUBLIC | `Link` ← Dashboard; href="/dashboard" |
| C-1071 / 298 | PaintEstimateResultsPage / PUBLIC | `SendToCustomerButton`  |
| C-1072 / 302 | PaintEstimateResultsPage / PUBLIC | `Link` Open customer quote; href={customerPath} |
| C-1073 / 311 | PaintEstimateResultsPage / PUBLIC | `a` Download PDF; href={pdfPath} |
| C-1074 / 320 | PaintEstimateResultsPage / PUBLIC | `Link` New estimate; href="/dashboard/painting" |

### `web/app/p/[token]/SendToCustomerButton.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1075 / 97 | SendToCustomerButton / PUBLIC | `button` type="button"; onClick={resend}; disabled={resendState === 'sending'} |
| C-1076 / 115 | SendToCustomerButton / PUBLIC | `button` type="button"; onClick={() =&gt; send(state === 'error')}; disabled={state === 'sending'} |

### `web/app/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1077 / 190 | Hero / PUBLIC | `a` See how it works; href="#how" |
| C-1078 / 225 | Hero / PUBLIC | `HeroTile` href="/trades/electrical" |
| C-1079 / 237 | Hero / PUBLIC | `HeroTile` href="/trades/plumbing" |
| C-1080 / 244 | Hero / PUBLIC | `HeroTile` href="/trades/solar" |
| C-1081 / 282 | HeroTile / PUBLIC | `Link` href={href} |
| C-1082 / 552 | Trades / PUBLIC | `SecondaryCTA` Request your trade; href="/signup" |
| C-1083 / 752 | ClosingCta / PUBLIC | `PrimaryCTA` Get my QuoteMax; href="/signup" |
| C-1084 / 753 | ClosingCta / PUBLIC | `SecondaryCTA` See how it works; href="#how" |
| C-1085 / 799 | AppDownload / PUBLIC | `Link` Get notified at launch &rarr;; href="/signup" |
| C-1086 / 1185 | CoveredTrades / PUBLIC | `Link` href={t.href} |
| C-1087 / 1238 | BuiltForAustralia / PUBLIC | `PrimaryCTA` Get my QuoteMax; href="/signup" |

### `web/app/paint-request/[token]/PaintRequestForm.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1088 / 122 | PaintRequestForm / PUBLIC | `form` onSubmit={submit} |
| C-1089 / 125 | PaintRequestForm / PUBLIC | `AddressAutocomplete` onChange={setAddress}; placeholder="28 Greens Rd, Coorparoo" |
| C-1090 / 146 | PaintRequestForm / PUBLIC | `input` onChange={(e) =&gt; setPostcode(e.target.value.trim())}; placeholder="4151" |
| C-1091 / 150 | PaintRequestForm / PUBLIC | `select` aria-label="State"; onChange={(e) =&gt; setStateCode(e.target.value as (typeof STATES)[number])} |
| C-1092 / 159 | PaintRequestForm / PUBLIC | `input` type="checkbox"; onChange={() =&gt; toggleScope(v)} |
| C-1093 / 167 | PaintRequestForm / PUBLIC | `select` aria-label="Coats"; onChange={(e) =&gt; setCoats(Number(e.target.value) as 1 \| 2 \| 3)} |
| C-1094 / 175 | PaintRequestForm / PUBLIC | `select` aria-label="Condition"; onChange={(e) =&gt; setCondition(e.target.value as (typeof CONDITIONS)[number][0])} |
| C-1095 / 181 | PaintRequestForm / PUBLIC | `select` aria-label="Ceiling height"; onChange={(e) =&gt; setCeiling(e.target.value as (typeof CEILINGS)[number][0])} |
| C-1096 / 187 | PaintRequestForm / PUBLIC | `select` aria-label="Storeys"; onChange={(e) =&gt; setStoreys(Number(e.target.value) as 1 \| 2 \| 3)} |
| C-1097 / 195 | PaintRequestForm / PUBLIC | `input` type="number"; onChange={(e) =&gt; setManualArea(e.target.value)}; placeholder="from the floor plan" |
| C-1098 / 199 | PaintRequestForm / PUBLIC | `input` type="checkbox"; onChange={(e) =&gt; setColourChange(e.target.checked)} |
| C-1099 / 202 | PaintRequestForm / PUBLIC | `button` type="submit"; disabled={busy} |

### `web/app/pricing/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1100 / 409 | ClosingCta / PUBLIC | `PrimaryCTA` Get started; href="/signup" |
| C-1101 / 410 | ClosingCta / PUBLIC | `SecondaryCTA` See how it works; href="/#how" |

### `web/app/q/choose/[token]/ChoiceCards.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1102 / 108 | ChoiceCards / PUBLIC | `button` type="button"; disabled={declined \|\| !!chosenId \|\| busy === o.catalogue_id}; onClick={() =&gt; choose(o.catalogue_id)} |
| C-1103 / 163 | ChoiceCards / PUBLIC | `button` type="button"; disabled={!!busy}; onClick={chooseDefer} |

### `web/app/q/choose/[token]/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1104 / 37 | ChoosePage / PUBLIC | `Link` QuoteMax; href="/" |
| C-1105 / 92 | ChoosePage / PUBLIC | `Link` QuoteMax; href="/" |

### `web/app/q/paint/[token]/book/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1106 / 189 | PaintBookingPage / PUBLIC | `a` ← Back to your quote; href={\`/q/paint/${token}\`} |

### `web/app/q/paint/[token]/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1107 / 840 | paintSections / PUBLIC | `a` Visit their website; href={websiteUrl} |
| C-1108 / 954 | paintSections / PUBLIC | `a` View your booking →; href={\`/q/paint/${token}/thanks\`} |
| C-1109 / 963 | paintSections / PUBLIC | `a` Pick your visit time →; href={\`/q/paint/${token}/book\`} |
| C-1110 / 1161 | PaintingQuotePage / PUBLIC | `a` View your booking →; href={\`/q/paint/${token}/thanks\`} |
| C-1111 / 1170 | PaintingQuotePage / PUBLIC | `a` Pick your visit time →; href={\`/q/paint/${token}/book\`} |

### `web/app/q/paint/[token]/thanks/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1112 / 231 | PaintThanksPage / PUBLIC | `a` Download quote (PDF); href={\`/api/q/paint/${token}/pdf\`} |
| C-1113 / 235 | PaintThanksPage / PUBLIC | `a` ← Back to your quote; href={\`/q/paint/${token}\`} |

### `web/app/q/plan/[token]/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1114 / 229 | PlanResultsPage / PUBLIC | `a` Download PDF report ↓; href={pdfHref} |

### `web/app/q/roof/[token]/book/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1115 / 159 | RoofBookingPage / PUBLIC | `a` ← Back to your quote; href={\`/q/roof/${token}\`} |

### `web/app/q/roof/[token]/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1116 / 791 | roofSections / PUBLIC | `a` Visit their website; href={websiteUrl} |
| C-1117 / 859 | roofSections / PUBLIC | `a` View your site visit →; href={\`/q/roof/${token}/book\`} |
| C-1118 / 890 | roofSections / PUBLIC | `a` Pick your visit time →; href={\`/q/roof/${token}/book\`} |
| C-1119 / 900 | roofSections / PUBLIC | `a` Book a site inspection · $; href={\`/r/roof/${token}/inspection\`} |
| C-1120 / 1218 | RoofingQuotePage / PUBLIC | `a` Pick your visit time →; href={\`/q/roof/${token}/book\`} |

### `web/app/q/roof/[token]/thanks/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1121 / 323 | RoofThanksPage / PUBLIC | `a` Download quote (PDF); href={\`/api/q/roof/${token}/pdf\`} |
| C-1122 / 326 | RoofThanksPage / PUBLIC | `a` ← Back to your quote; href={\`/q/roof/${token}\`} |

### `web/app/q/solar/[token]/BuildingPicker.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1123 / 121 | BuildingPicker / PUBLIC | `div` onClick={freeClickEnabled ? handleFreeClick : undefined} |
| C-1124 / 147 | BuildingPicker / PUBLIC | `polygon` onClick={tappable ? (e) =&gt; { e.stopPropagation(); void handleSelect(b) } : undefined} |
| C-1125 / 181 | BuildingPicker / PUBLIC | `button` type="button"; disabled={!tappable}; onClick={tappable ? (e) =&gt; { e.stopPropagation(); void handleSelect(b) } : undefined}; aria-label={ isSelected ? \`${b.label} — selected, this estimate is for this building\` : isNoCoverage ? \`${b.label} — no solar data available\` : \`${b.label} — tap to estimate th |

### `web/app/q/solar/[token]/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1126 / 599 | SolarQuotePage / PUBLIC | `BuildingPickerSection`  |
| C-1127 / 711 | SolarQuotePage / PUBLIC | `a` Manufacturer datasheet; href={c.datasheetUrl} |
| C-1128 / 908 | ExplainerCard / PUBLIC | `details`  |
| C-1129 / 909 | ExplainerCard / PUBLIC | `summary`  |

### `web/app/q/solar/[token]/SunShadeOverlay.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1130 / 39 | SunShadeOverlay / PUBLIC | `div` onClick={() =&gt; setOpenIdx(null)} |
| C-1131 / 114 | Dot / PUBLIC | `button` type="button"; onClick={(e) =&gt; { e.stopPropagation() onToggle() }}; aria-label={\`${m.is_best ? 'Best spot. ' : ''}${m.orientation} face — ${m.score_copy}, ${m.area_m2.toLocaleString('en-AU')} square metres, ${m.relative_pct}% of the best face\`} |
| C-1132 / 152 | Popover / PUBLIC | `div` role="dialog"; aria-label={\`${m.orientation} face sun score\`}; onClick={(e) =&gt; e.stopPropagation()} |

### `web/app/q/[token]/approve/ApproveAction.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1133 / 89 | ApproveAction / PUBLIC | `button` type="button"; onClick={approve}; disabled={busy \|\| !sessionReady} |
| C-1134 / 107 | ApproveAction / PUBLIC | `a` Sign in to send; href={\`/signin?next=${encodeURIComponent(\`/q/${shareToken}/approve\`)}\`} |

### `web/app/q/[token]/approve/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1135 / 71 | ApprovePage / PUBLIC | `Link` QuoteMax; href="/" |
| C-1136 / 136 | ApprovePage / PUBLIC | `Link` Edit first →; href={\`/q/${token}?edit=1\`} |
| C-1137 / 144 | ApprovePage / PUBLIC | `Link` Open quote →; href={\`/q/${token}\`} |
| C-1138 / 155 | ApprovePage / PUBLIC | `Link` QuoteMax; href="/" |

### `web/app/q/[token]/book/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1139 / 130 | BookingPage / PUBLIC | `Link` ← Back to quote; href={\`/q/${token}\`} |
| C-1140 / 210 | Shell / PUBLIC | `Link` href="/" |
| C-1141 / 214 | Shell / PUBLIC | `Link` ← Back to quote; href={\`/q/${token}\`} |

### `web/app/q/[token]/cancelled/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1142 / 24 | CancelledPage / PUBLIC | `a` Back to your quote; href={\`/q/${token}\`} |

### `web/app/q/[token]/CommercialPaintDetails.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1143 / 128 | CommercialPaintDetails / PUBLIC | `a` View the full measured takeoff →; href={tenderUrl} |

### `web/app/q/[token]/CustomerPhotosBlock.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1144 / 208 | EmptyState / PUBLIC | `input` type="file"; onChange={(e) =&gt; onFiles(e.target.files)} |
| C-1145 / 216 | EmptyState / PUBLIC | `button` type="button"; onClick={onPickClick}; disabled={!canUpload} |
| C-1146 / 245 | EmptyState / PUBLIC | `a` /upload/ …; href={\`/upload/${uploadToken}\`} |
| C-1147 / 271 | PhotoGrid / PUBLIC | `a` href={url} |

### `web/app/q/[token]/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1148 / 962 | roofSections / PUBLIC | `a` Visit their website; href={websiteUrl} |
| C-1149 / 1020 | roofSections / PUBLIC | `a` Book a site inspection · $; href={\`/r/${token}/inspection\`} |
| C-1150 / 1043 | roofSections / PUBLIC | `a` href={\`/r/${token}/${featuredKey ?? 'better'}\`} |
| C-1151 / 1537 | sections / PUBLIC | `a` Visit their website; href={websiteUrl} |
| C-1152 / 1677 | sections / PUBLIC | `details`  |
| C-1153 / 1681 | sections / PUBLIC | `summary` Full cost breakdown |
| C-1154 / 1802 | sections / PUBLIC | `a` href={\`/r/${token}/${k}\`} |
| C-1155 / 1833 | sections / PUBLIC | `a` View your booking →; href={\`/q/${token}/thanks\`} |
| C-1156 / 1862 | sections / PUBLIC | `a` Pick your visit time →; href={\`/q/${token}/book\`} |
| C-1157 / 2453 | RoofingIndicativeBanner / PUBLIC | `a` Pay $99 · site visit →; href={\`/r/${shareToken}/inspection\`} |
| C-1158 / 2511 | InspectionBlock / PUBLIC | `a` Pay $99 · site visit →; href={\`/r/${shareToken}/inspection\`} |

### `web/app/q/[token]/paid/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1159 / 60 | PaidPage / PUBLIC | `Link` href="/" |

### `web/app/q/[token]/PreviewSection.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1160 / 264 | ClickableImage / PUBLIC | `a` href={src}; aria-label={\`${alt} — tap to view full size\`} |

### `web/app/q/[token]/QuoteEditChat.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1161 / 222 | QuoteEditChat / PUBLIC | `button` type="button"; onClick={() =&gt; setOpen((o) =&gt; !o)} |
| C-1162 / 267 | QuoteEditChat / PUBLIC | `button` type="button"; onClick={() =&gt; void send(s)}; disabled={loading} |
| C-1163 / 289 | QuoteEditChat / PUBLIC | `form` onSubmit={(e) =&gt; { e.preventDefault() void send(input) }} |
| C-1164 / 296 | QuoteEditChat / PUBLIC | `input` onChange={(e) =&gt; setInput(e.target.value)}; placeholder="e.g. add a second downlight to Better"; aria-label="Describe a change to this quote" |
| C-1165 / 312 | QuoteEditChat / PUBLIC | `button` type="submit"; disabled={loading \|\| !input.trim()} |
| C-1166 / 412 | ProposalCard / PUBLIC | `button` Apply to editor; type="button"; onClick={onApply}; disabled={loading} |

### `web/app/q/[token]/thanks/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1167 / 74 | Shell / PUBLIC | `Link` href="/" |
| C-1168 / 78 | Shell / PUBLIC | `Link` ← Back to quote; href={\`/q/${token}\`} |
| C-1169 / 296 | ThanksPage / PUBLIC | `a` Download quote (PDF); href={\`/api/q/${token}/pdf\`} |

### `web/app/q/[token]/TierBreakdownToggle.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1170 / 45 | TierBreakdownToggle / PUBLIC | `button` type="button"; onClick={() =&gt; setOpen((v) =&gt; !v)} |

### `web/app/q/[token]/TradeTiers.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1171 / 157 | TradeTiers / PUBLIC | `Link` Pay deposit; href={href} |

### `web/app/q/[token]/TradieEditor.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1172 / 243 | TradieEditor / PUBLIC | `Link` Sign in →; href={\`/signin?redirectTo=${encodeURIComponent(returnTo)}\`} |
| C-1173 / 469 | TradieEditor / PUBLIC | `Link` ← Dashboard; href="/dashboard" |
| C-1174 / 480 | TradieEditor / PUBLIC | `button` Edit pricing; type="button"; onClick={() =&gt; setOpen(true)} |
| C-1175 / 509 | TradieEditor / PUBLIC | `button` Close; type="button"; onClick={() =&gt; setOpen(false)} |
| C-1176 / 562 | TradieEditor / PUBLIC | `input` type="text"; onChange={(e) =&gt; updateTierMeta(key, { label: e.target.value })}; aria-label={\`${key} tier label\`} |
| C-1177 / 598 | TradieEditor / PUBLIC | `input` type="text"; onChange={(e) =&gt; updateLine(key, idx, { description: e.target.value })}; aria-label="Line description" |
| C-1178 / 610 | TradieEditor / PUBLIC | `input` type="number"; onChange={(e) =&gt; updateLine(key, idx, { quantity: e.target.value })}; aria-label="Quantity" |
| C-1179 / 624 | TradieEditor / PUBLIC | `input` type="number"; onChange={(e) =&gt; updateLine(key, idx, { unit_price_ex_gst: e.target.value })}; aria-label="Unit price ex GST" |
| C-1180 / 643 | TradieEditor / PUBLIC | `button` ×; type="button"; onClick={() =&gt; removeLine(key, idx)}; disabled={t.lines.length &lt;= 1}; aria-label="Remove line" |
| C-1181 / 659 | TradieEditor / PUBLIC | `button` + Add custom line; type="button"; onClick={() =&gt; addLine(key)} |
| C-1182 / 679 | TradieEditor / PUBLIC | `button` Cancel; type="button"; onClick={() =&gt; setOpen(false)}; disabled={submitting} |
| C-1183 / 688 | TradieEditor / PUBLIC | `button` type="button"; onClick={openSaveConfirm}; disabled={submitting} |
| C-1184 / 737 | TradieEditor / PUBLIC | `button` type="button"; onClick={() =&gt; handleSave(pendingNotify, true)}; disabled={submitting} |
| C-1185 / 746 | TradieEditor / PUBLIC | `button` Back to fix the prices; type="button"; onClick={() =&gt; setGroundingFailures(null)}; disabled={submitting} |
| C-1186 / 779 | TradieEditor / PUBLIC | `button` type="button"; onClick={() =&gt; handleSave(true)}; disabled={submitting} |
| C-1187 / 788 | TradieEditor / PUBLIC | `button` Save quietly · no SMS; type="button"; onClick={() =&gt; handleSave(false)}; disabled={submitting} |
| C-1188 / 797 | TradieEditor / PUBLIC | `button` Back to edits; type="button"; onClick={() =&gt; setConfirmOpen(false)}; disabled={submitting} |

### `web/app/q/_chrome/AcceptBlock.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1189 / 108 | AcceptBlock / PUBLIC | `button` type="button"; onClick={accept}; disabled={busy} |

### `web/app/q/_chrome/BookingCalendar.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1190 / 173 | BookingCalendar / PUBLIC | `button` ‹; type="button"; onClick={() =&gt; setViewIdx((i) =&gt; Math.max(0, i - 1))}; disabled={viewIdx === 0 \|\| locked}; aria-label="Previous month" |
| C-1191 / 182 | BookingCalendar / PUBLIC | `button` ›; type="button"; onClick={() =&gt; setViewIdx((i) =&gt; Math.min(months.length - 1, i + 1))}; disabled={viewIdx &gt;= months.length - 1 \|\| locked}; aria-label="Next month" |
| C-1192 / 229 | BookingCalendar / PUBLIC | `button` type="button"; onClick={() =&gt; { setSelectedKey(cell.key) setPicked(null) }}; disabled={locked}; aria-label={cell.label} |
| C-1193 / 261 | BookingCalendar / PUBLIC | `button` type="button"; onClick={() =&gt; setPicked(iso)}; disabled={locked} |
| C-1194 / 349 | BookingCalendar / PUBLIC | `button` type="button"; onClick={onConfirm}; disabled={locked} |

### `web/app/q/_chrome/HouseShowcase.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1195 / 78 | SwatchRow / PUBLIC | `button` type="button"; role="radio"; aria-label={s.name}; title={s.name}; onClick={() =&gt; onSelect(s)} |
| C-1196 / 162 | HouseShowcase / PUBLIC | `button` type="button"; onClick={() =&gt; setMat(m)} |

### `web/app/q/_chrome/HouseViewer.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1197 / 311 | HouseViewer / PUBLIC | `button` type="button"; onClick={() =&gt; void start()} |

### `web/app/q/_chrome/parts.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1198 / 83 | Letterhead / PUBLIC | `a` href={telHref} |
| C-1199 / 89 | Letterhead / PUBLIC | `a` href={\`mailto:${email}\`} |
| C-1200 / 431 | TierCards / PUBLIC | `a` href={t.ctaHref} |
| C-1201 / 684 | AddToCalendar / PUBLIC | `a` Add to calendar; href={icsHref} |
| C-1202 / 693 | AddToCalendar / PUBLIC | `a` Google; href={google} |
| C-1203 / 695 | AddToCalendar / PUBLIC | `a` Outlook; href={outlook} |
| C-1204 / 697 | AddToCalendar / PUBLIC | `a` Outlook (work); href={outlookOffice} |

### `web/app/q/_chrome/QuoteChrome.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1205 / 135 | QuoteChrome / PUBLIC | `button` type="button"; aria-label="Toggle theme"; onClick={toggle} |
| C-1206 / 138 | QuoteChrome / PUBLIC | `button` type="button"; onClick={downloadPdf}; disabled={pdfBusy}; aria-label="Download quote as PDF" |
| C-1207 / 176 | QuoteChrome / PUBLIC | `a` href={sticky.ctaHref} |

### `web/app/q/_chrome/RepaintPreviewFigure.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1208 / 136 | RepaintPreviewFigure / PUBLIC | `button` type="button"; disabled={busy \|\| !released}; onClick={() =&gt; void repaint(c)} |

### `web/app/q/_chrome/ShareHouse.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1209 / 94 | ShareHouse / PUBLIC | `select` id="share-recipient"; onChange={(e) =&gt; setRecipient(e.target.value as ShareRecipientId)} |
| C-1210 / 107 | ShareHouse / PUBLIC | `button` Share it →; type="button"; onClick={onShare} |

### `web/app/q/_chrome/TradieDashboardPill.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1211 / 64 | TradieDashboardPill / PUBLIC | `Link` ← Dashboard; href="/dashboard" |
| C-1212 / 75 | TradieDashboardPill / PUBLIC | `Link` →; href={editHref} |

### `web/app/q/_chrome/TradieJobBanner.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1213 / 65 | TradieJobBanner / PUBLIC | `a` &larr; Dashboard; href="/dashboard" |
| C-1214 / 72 | TradieJobBanner / PUBLIC | `a` &rarr;; href={check.tradieHref} |

### `web/app/quote-request/[token]/QuoteRequestForm.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1215 / 241 | QuoteRequestForm / PUBLIC | `form` onSubmit={submit} |
| C-1216 / 244 | QuoteRequestForm / PUBLIC | `AddressAutocomplete` onChange={setAddress}; placeholder="28 Greens Rd, Coorparoo" |
| C-1217 / 263 | QuoteRequestForm / PUBLIC | `input` onChange={(e) =&gt; setPostcode(e.target.value.trim())}; placeholder="4151" |
| C-1218 / 267 | QuoteRequestForm / PUBLIC | `select` aria-label="State"; onChange={(e) =&gt; setStateCode(e.target.value as AuState)} |
| C-1219 / 273 | QuoteRequestForm / PUBLIC | `input` onChange={(e) =&gt; setFirstName(e.target.value)}; placeholder="Sam" |
| C-1220 / 296 | QuoteRequestForm / PUBLIC | `input` type="checkbox"; onChange={() =&gt; toggleScope(v)} |
| C-1221 / 308 | QuoteRequestForm / PUBLIC | `input` type="number"; onChange={(e) =&gt; setManualArea(e.target.value)}; placeholder="from the floor plan" |
| C-1222 / 311 | QuoteRequestForm / PUBLIC | `input` type="checkbox"; onChange={(e) =&gt; setColourChange(e.target.checked)} |
| C-1223 / 322 | QuoteRequestForm / PUBLIC | `input` type="number"; onChange={(e) =&gt; setQuantity(e.target.value)}; placeholder="e.g. 12" |
| C-1224 / 338 | QuoteRequestForm / PUBLIC | `input` type="number"; onChange={(e) =&gt; setHwCapacity(e.target.value)}; placeholder="e.g. 250" |
| C-1225 / 353 | QuoteRequestForm / PUBLIC | `input` type="file"; onChange={uploadPhotos} |
| C-1226 / 359 | QuoteRequestForm / PUBLIC | `textarea` onChange={(e) =&gt; setNotes(e.target.value)}; placeholder="Access, timing, anything unusual" |
| C-1227 / 363 | QuoteRequestForm / PUBLIC | `button` type="submit"; disabled={busy} |
| C-1228 / 392 | Select / PUBLIC | `select` aria-label={label}; onChange={(e) =&gt; onPick((numeric ? Number(e.target.value) : e.target.value) as T)} |

### `web/app/sign-in/[[...sign-in]]/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1229 / 34 | ClerkSignInPage / AUTH | `Link` Create an account; href="/sign-up" |

### `web/app/sign-up/[[...sign-up]]/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1230 / 353 | SignUpInner / AUTH | `form` onSubmit={handleVerify} |
| C-1231 / 355 | SignUpInner / AUTH | `input` type="text"; onChange={(e) =&gt; setCode(e.target.value)} |
| C-1232 / 367 | SignUpInner / AUTH | `button` type="submit"; disabled={submitting} |
| C-1233 / 371 | SignUpInner / AUTH | `button` ← Back; type="button"; onClick={() =&gt; { setPendingVerification(false) setError(null) }} |
| C-1234 / 395 | SignUpInner / AUTH | `form` onSubmit={handleSubmit} |
| C-1235 / 411 | SignUpInner / AUTH | `input` type="text"; onChange={(e) =&gt; setBusinessName(e.target.value)} |
| C-1236 / 423 | SignUpInner / AUTH | `input` type="text"; onChange={(e) =&gt; setFirstName(e.target.value)} |
| C-1237 / 435 | SignUpInner / AUTH | `input` type="email"; onChange={(e) =&gt; setEmail(e.target.value)} |
| C-1238 / 446 | SignUpInner / AUTH | `input` type="tel"; onChange={(e) =&gt; setMobile(e.target.value)} |
| C-1239 / 460 | SignUpInner / AUTH | `input` type="password"; onChange={(e) =&gt; setPassword(e.target.value)} |
| C-1240 / 475 | SignUpInner / AUTH | `Link` Sign in instead; href="/sign-in" |
| C-1241 / 480 | SignUpInner / AUTH | `Link` Open your dashboard; href="/dashboard" |
| C-1242 / 491 | SignUpInner / AUTH | `button` type="submit"; disabled={submitting \|\| !signUp} |
| C-1243 / 504 | SignUpInner / AUTH | `Link` Sign in; href="/sign-in" |

### `web/app/signup/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1244 / 167 | SignUpInner / AUTH | `form` onSubmit={handleSubmit} |
| C-1245 / 187 | SignUpInner / AUTH | `input` type="text"; onChange={(e) =&gt; setBusinessName(e.target.value)} |
| C-1246 / 199 | SignUpInner / AUTH | `input` type="text"; onChange={(e) =&gt; setFirstName(e.target.value)} |
| C-1247 / 211 | SignUpInner / AUTH | `input` type="email"; onChange={(e) =&gt; setEmail(e.target.value)} |
| C-1248 / 226 | SignUpInner / AUTH | `input` type="tel"; onChange={(e) =&gt; setMobile(e.target.value)} |
| C-1249 / 244 | SignUpInner / AUTH | `input` type="password"; onChange={(e) =&gt; setPassword(e.target.value)} |
| C-1250 / 257 | SignUpInner / AUTH | `button` type="submit"; disabled={submitting} |
| C-1251 / 275 | SignUpInner / AUTH | `Link` Sign in; href="/signin" |
| C-1252 / 302 | AuthShell / AUTH | `Link` href="/" |

### `web/app/signup/verify/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1253 / 82 | VerifyOtpInner / AUTH | `Link` Back to signup; href="/signup" |
| C-1254 / 228 | VerifyOtpInner / AUTH | `Link` Start over; href="/signup" |
| C-1255 / 234 | VerifyOtpInner / AUTH | `form` onSubmit={handleSubmit} |
| C-1256 / 241 | VerifyOtpInner / AUTH | `input` type="text"; onChange={(e) =&gt; setDigit(idx, e.target.value)}; disabled={submitting}; aria-label={\`Digit ${idx + 1} of 6\`} |
| C-1257 / 275 | VerifyOtpInner / AUTH | `button` type="submit"; disabled={submitting \|\| digits.join('').length !== 6} |
| C-1258 / 286 | VerifyOtpInner / AUTH | `button` type="button"; onClick={handleResend}; disabled={resending \|\| secondsLeft &gt; 0} |

### `web/app/solar/[tenantSlug]/_components/SolarAddressForm.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1259 / 320 | SolarAddressForm / PUBLIC | `form` onSubmit={onSubmit} |
| C-1260 / 331 | SolarAddressForm / PUBLIC | `input` id="solar-address-input"; onChange={(e) =&gt; { setAddress(e.target.value) setAutoFilled(false) }}; placeholder="Start typing your address…"; role="combobox" |
| C-1261 / 370 | SolarAddressForm / PUBLIC | `button` type="button"; role="option"; onClick={() =&gt; void selectSuggestion(s)} |
| C-1262 / 407 | SolarAddressForm / PUBLIC | `input` id="solar-postcode-input"; onChange={(e) =&gt; setPostcode(e.target.value)}; title="Australian postcodes are 4 digits"; placeholder="0000" |
| C-1263 / 423 | SolarAddressForm / PUBLIC | `select` id="solar-state-input"; onChange={(e) =&gt; setStateCode(e.target.value)} |
| C-1264 / 440 | SolarAddressForm / PUBLIC | `button` type="button"; onClick={() =&gt; void detectBuildings()}; disabled={detectBusy \|\| address.trim().length &lt; 3 \|\| postcode.trim().length &lt; 3} |
| C-1265 / 471 | SolarAddressForm / PUBLIC | `input` id="solar-name-input"; onChange={(e) =&gt; setCustomerName(e.target.value)}; placeholder="First name" |
| C-1266 / 486 | SolarAddressForm / PUBLIC | `input` id="solar-mobile-input"; onChange={(e) =&gt; setCustomerMobile(e.target.value)}; placeholder="04xx xxx xxx" |
| C-1267 / 515 | SolarAddressForm / PUBLIC | `input` id="solar-bill-input"; onChange={(e) =&gt; setQuarterlyBill(e.target.value)}; placeholder="850" |
| C-1268 / 533 | SolarAddressForm / PUBLIC | `button` type="button"; role="radio"; onClick={() =&gt; setPanelType(g.value)} |
| C-1269 / 562 | SolarAddressForm / PUBLIC | `button` type="button"; role="radio"; onClick={() =&gt; setPhase(p.value)} |
| C-1270 / 599 | SolarAddressForm / PUBLIC | `button` kW; type="button"; onClick={() =&gt; setRequestedSizeKw((prev) =&gt; prev.trim() === String(kw) ? '' : String(kw), ) } |
| C-1271 / 620 | SolarAddressForm / PUBLIC | `input` id="solar-size-input"; onChange={(e) =&gt; setRequestedSizeKw(e.target.value)}; placeholder="or type kW"; aria-label="Preferred system size in kilowatts" |
| C-1272 / 646 | SolarAddressForm / PUBLIC | `button` type="button"; onClick={() =&gt; setManualOpen((v) =&gt; !v)} |
| C-1273 / 664 | SolarAddressForm / PUBLIC | `select` id="solar-orientation-input"; onChange={(e) =&gt; setOrientation(e.target.value)} |
| C-1274 / 678 | SolarAddressForm / PUBLIC | `select` id="solar-roof-size-input"; onChange={(e) =&gt; setRoofSize(e.target.value as typeof roofSize)} |
| C-1275 / 693 | SolarAddressForm / PUBLIC | `button` type="button"; role="radio"; onClick={() =&gt; setStoreys(n)} |
| C-1276 / 725 | SolarAddressForm / PUBLIC | `button` type="submit"; disabled={busy} |

### `web/app/start/[tenantId]/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1277 / 69 | StartPage / PUBLIC | `a` Text us for a quote; href={smsHref} |

### `web/app/studio/[token]/upload/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1278 / 205 | StudioUploadPage / PUBLIC | `input` type="file"; aria-label={\`Upload photo for ${s.label}\`}; onChange={(e) =&gt; onPick(s.slot, e.target.files)} |
| C-1279 / 219 | StudioUploadPage / PUBLIC | `button` type="button"; onClick={submit}; disabled={busy \|\| totalFiles === 0} |

### `web/app/t/[slug]/LeadForm.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1280 / 103 | LeadForm / PUBLIC | `form` onSubmit={handleSubmit} |
| C-1281 / 111 | LeadForm / PUBLIC | `button` type="button"; onClick={() =&gt; setService(selected ? '' : s.label)} |
| C-1282 / 133 | LeadForm / PUBLIC | `input` id="lf-photos"; type="file"; onChange={(e) =&gt; setPhotos(Array.from(e.target.files ?? []).slice(0, 5))} |
| C-1283 / 151 | LeadForm / PUBLIC | `textarea` id="lf-desc"; onChange={(e) =&gt; setDescription(e.target.value)}; placeholder="e.g. install 6 downlights, hot water not working, roof leaking after the storm…" |
| C-1284 / 164 | LeadForm / PUBLIC | `input` id="lf-name"; onChange={(e) =&gt; setName(e.target.value)} |
| C-1285 / 168 | LeadForm / PUBLIC | `input` id="lf-suburb"; onChange={(e) =&gt; setSuburb(e.target.value)} |
| C-1286 / 174 | LeadForm / PUBLIC | `input` id="lf-mobile"; type="tel"; onChange={(e) =&gt; setMobile(e.target.value)}; placeholder="04xx xxx xxx" |
| C-1287 / 187 | LeadForm / PUBLIC | `input` type="text"; onChange={(e) =&gt; setCompany(e.target.value)} |
| C-1288 / 199 | LeadForm / PUBLIC | `button` type="submit"; disabled={submitting} |

### `web/app/t/[slug]/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1289 / 128 | TenantLandingPage / PUBLIC | `a` Get my quote; href="#quote" |
| C-1290 / 270 | TenantLandingPage / PUBLIC | `a` Snap a photo · Get a quote from; href="#quote" |

### `web/app/trades/_template.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1291 / 66 | TradePage / PUBLIC | `PrimaryCTA` Get started; href="/signup" |
| C-1292 / 67 | TradePage / PUBLIC | `SecondaryCTA` See how it works; href="/#how" |
| C-1293 / 204 | TradePage / PUBLIC | `Link` href={\`/trades/${t.slug}\`} |
| C-1294 / 242 | TradePage / PUBLIC | `PrimaryCTA` Get started; href="/signup" |
| C-1295 / 243 | TradePage / PUBLIC | `SecondaryCTA` See pricing; href="/pricing" |

### `web/app/upload/plan/[token]/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1296 / 155 | Shell / PUBLIC | `Link` Quote; href="/"; aria-label="QuoteMax" |
| C-1297 / 167 | Shell / PUBLIC | `Link` QuoteMax; href="/" |

### `web/app/upload/plan/[token]/PlanUploadForm.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1298 / 68 | PlanUploadForm / PUBLIC | `form` onSubmit={onSubmit} |
| C-1299 / 84 | PlanUploadForm / PUBLIC | `input` id="plan-pdf"; type="file"; onChange={onPick} |
| C-1300 / 99 | PlanUploadForm / PUBLIC | `button` type="submit"; disabled={buttonDisabled} |

### `web/app/upload/[token]/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1301 / 160 | Shell / PUBLIC | `Link` href="/"; aria-label="Maintain Technology" |
| C-1302 / 173 | Shell / PUBLIC | `Link` QuoteMax; href="/" |

### `web/app/upload/[token]/UploadForm.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1303 / 83 | UploadForm / PUBLIC | `form` onSubmit={onSubmit} |
| C-1304 / 99 | UploadForm / PUBLIC | `input` id="photos-camera"; type="file"; onChange={onPick} |
| C-1305 / 122 | UploadForm / PUBLIC | `input` id="photos-gallery"; type="file"; onChange={onPick} |
| C-1306 / 144 | UploadForm / PUBLIC | `input` id="photos-replace"; type="file"; onChange={onPick} |
| C-1307 / 185 | UploadForm / PUBLIC | `button` type="submit"; disabled={buttonDisabled} |

### `web/app/watch/page.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1308 / 111 | Hero / PUBLIC | `PrimaryCTA` Book the 20-minute assessment; href={BOOKING_HREF} |
| C-1309 / 114 | Hero / PUBLIC | `SecondaryCTA` See pricing; href="/pricing" |
| C-1310 / 461 | ClosingCta / PUBLIC | `PrimaryCTA` Book the 20-minute assessment; href={BOOKING_HREF} |
| C-1311 / 464 | ClosingCta / PUBLIC | `SecondaryCTA` See pricing; href="/pricing" |
| C-1312 / 492 | StickyCta / PUBLIC | `PrimaryCTA` Book a call; href={BOOKING_HREF} |

### `web/app/_components/AddressAutocomplete.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1313 / 140 | AddressAutocomplete / PUBLIC | `input` id={id}; type="text"; onChange={(e) =&gt; onChange(e.target.value)}; placeholder={placeholder}; role="combobox"; aria-label={ariaLabel} |
| C-1314 / 171 | AddressAutocomplete / PUBLIC | `button` type="button"; role="option"; onClick={() =&gt; void select(s)} |

### `web/app/_components/AvailabilityEditor.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1315 / 55 | AvailabilityEditor / PUBLIC | `input` type="checkbox"; disabled={disabled}; onChange={(e) =&gt; setDay(day, { enabled: e.target.checked, start: e.target.checked ? d.start ?? '07:00' : null, end: e.target.checked ? d.end ?? '15:00' : null, }) } |
| C-1316 / 73 | AvailabilityEditor / PUBLIC | `input` type="time"; disabled={disabled}; onChange={(e) =&gt; setDay(day, { start: e.target.value })}; aria-label={\`${DAY_LABELS[day]} start time\`} |
| C-1317 / 82 | AvailabilityEditor / PUBLIC | `input` type="time"; disabled={disabled}; onChange={(e) =&gt; setDay(day, { end: e.target.value })}; aria-label={\`${DAY_LABELS[day]} end time\`} |

### `web/app/_components/ClerkAuthShell.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1318 / 58 | ClerkAuthShell / PUBLIC | `Link` href="/" |
| C-1319 / 108 | ClerkAuthShell / PUBLIC | `Link` href="/" |
| C-1320 / 115 | ClerkAuthShell / PUBLIC | `ThemeToggle`  |

### `web/app/_components/CommentsThread.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1321 / 195 | CommentsThread / PUBLIC | `button` type="button"; onClick={toggleResolved}; disabled={busy} |
| C-1322 / 238 | CommentsThread / PUBLIC | `button` type="button"; aria-label="Edit comment"; onClick={() =&gt; { setEditingId(c.id) setEditDraft(c.body) }} |
| C-1323 / 249 | CommentsThread / PUBLIC | `button` type="button"; aria-label="Delete comment"; onClick={() =&gt; remove(c.id)}; disabled={busy} |
| C-1324 / 265 | CommentsThread / PUBLIC | `textarea` onChange={(e) =&gt; setEditDraft(e.target.value)} |
| C-1325 / 272 | CommentsThread / PUBLIC | `button` Save; type="button"; onClick={() =&gt; saveEdit(c.id)}; disabled={busy \|\| !editDraft.trim()} |
| C-1326 / 282 | CommentsThread / PUBLIC | `button` Cancel; type="button"; onClick={() =&gt; { setEditingId(null) setEditDraft('') }} |
| C-1327 / 308 | CommentsThread / PUBLIC | `form` onSubmit={post} |
| C-1328 / 309 | CommentsThread / PUBLIC | `textarea` onChange={(e) =&gt; setDraft(e.target.value)}; placeholder="Add a comment…" |
| C-1329 / 317 | CommentsThread / PUBLIC | `button` type="submit"; disabled={posting \|\| !draft.trim()} |

### `web/app/_components/console-ui.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1330 / 100 | ActionBtn / PUBLIC | `button` type="button"; onClick={onClick} |

### `web/app/_components/ContactForm.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1331 / 109 | ContactForm / PUBLIC | `form` onSubmit={handleSubmit} |
| C-1332 / 125 | ContactForm / PUBLIC | `input` id="cf-name"; name="name"; type="text"; placeholder="Dave Roberts" |
| C-1333 / 137 | ContactForm / PUBLIC | `input` id="cf-email"; name="email"; type="email"; placeholder="you@yourtrade.com.au" |
| C-1334 / 152 | ContactForm / PUBLIC | `input` id="cf-phone"; name="phone"; type="tel"; placeholder="04xx xxx xxx" |
| C-1335 / 164 | ContactForm / PUBLIC | `select` id="cf-topic"; name="topic"; onChange={(e) =&gt; setTopic(e.target.value)} |
| C-1336 / 181 | ContactForm / PUBLIC | `textarea` id="cf-message"; name="message"; placeholder="Tell us what you are after. If you are a tradie, your trade and where you work helps us answer properly." |
| C-1337 / 198 | ContactForm / PUBLIC | `input` id="cf-company"; name="company"; type="text"; onChange={(e) =&gt; setCompany(e.target.value)} |
| C-1338 / 225 | ContactForm / PUBLIC | `a` href={\`mailto:${fallbackEmail}\`} |
| C-1339 / 239 | ContactForm / PUBLIC | `button` type="submit"; disabled={submitting} |

### `web/app/_components/ContactSection.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1340 / 46 | ContactSection / PUBLIC | `a` href={\`mailto:${supportEmail}\`} |
| C-1341 / 69 | ContactSection / PUBLIC | `SecondaryCTA` Start the setup; href="/signup" |

### `web/app/_components/CookieConsent.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1342 / 66 | CookieConsent / PUBLIC | `button` type="button"; onClick={() =&gt; setDetailsOpen((open) =&gt; !open)} |
| C-1343 / 91 | CookieConsent / PUBLIC | `button` Reject all; type="button"; onClick={() =&gt; choose("rejected")} |
| C-1344 / 98 | CookieConsent / PUBLIC | `button` Accept all; type="button"; onClick={() =&gt; choose("accepted")} |

### `web/app/_components/funnel-shell.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1345 / 59 | FunnelShell / PUBLIC | `Link` href="/" |

### `web/app/_components/MobileNav.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1346 / 57 | MobileNav / PUBLIC | `button` type="button"; aria-label={open ? "Close menu" : "Open menu"}; onClick={() =&gt; setOpen((o) =&gt; !o)} |
| C-1347 / 88 | MobileNav / PUBLIC | `div` onClick={close} |
| C-1348 / 109 | MobileNav / PUBLIC | `Link` href={l.href}; onClick={close} |
| C-1349 / 127 | MobileNav / PUBLIC | `Link` href={t.href}; onClick={close} |
| C-1350 / 140 | MobileNav / PUBLIC | `div` onClick={close} |
| C-1351 / 143 | MobileNav / PUBLIC | `ThemeToggle`  |

### `web/app/_components/PricingTiers.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1352 / 32 | PricingTiers / PUBLIC | `BillingToggle`  |
| C-1353 / 47 | PricingTiers / PUBLIC | `Link` See full pricing &amp; feature comparison →; href="/pricing" |
| C-1354 / 73 | BillingToggle / PUBLIC | `ToggleButton` Monthly; onClick={() =&gt; setAnnual(false)} |
| C-1355 / 76 | BillingToggle / PUBLIC | `ToggleButton` Annual; onClick={() =&gt; setAnnual(true)} |
| C-1356 / 97 | ToggleButton / PUBLIC | `button` type="button"; onClick={onClick} |
| C-1357 / 177 | CheckoutButton / PUBLIC | `button` type="button"; onClick={start}; disabled={loading} |
| C-1358 / 262 | PlanCard / PUBLIC | `CheckoutButton`  |

### `web/app/_components/site.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1359 / 22 | Nav / PUBLIC | `Link` href="/" |
| C-1360 / 26 | Nav / PUBLIC | `Link` How; href="/#how" |
| C-1361 / 33 | Nav / PUBLIC | `Link` Pricing; href="/pricing" |
| C-1362 / 39 | Nav / PUBLIC | `Link` FAQ; href="/#faq" |
| C-1363 / 45 | Nav / PUBLIC | `Link` Contact; href="/#contact" |
| C-1364 / 53 | Nav / PUBLIC | `ThemeToggle`  |
| C-1365 / 72 | Footer / PUBLIC | `Link` href="/" |
| C-1366 / 145 | FooterCol / PUBLIC | `Link` href={l.href} |
| C-1367 / 210 | PrimaryCTA / PUBLIC | `Link` href={href} |
| C-1368 / 230 | SecondaryCTA / PUBLIC | `Link` href={href} |

### `web/app/_components/ThemeToggle.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1369 / 52 | ThemeToggle / PUBLIC | `button` type="button"; onClick={toggle}; aria-label={\`Switch to ${target} mode\`}; title={\`Switch to ${target} mode\`} |

### `web/app/_components/TradeCarousel.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1370 / 161 | TradeCarousel / PUBLIC | `Link` View; href={\`/trades/${s.slug}\`} |
| C-1371 / 180 | TradeCarousel / PUBLIC | `CarouselButton` onClick={() =&gt; goTo(index - 1)}; label="Previous slide" |
| C-1372 / 187 | TradeCarousel / PUBLIC | `CarouselButton` onClick={() =&gt; goTo(index + 1)}; label="Next slide" |
| C-1373 / 199 | TradeCarousel / PUBLIC | `button` type="button"; onClick={() =&gt; goTo(i)}; aria-label={\`Show slide ${i + 1} of ${count}: ${s.name}\`} |
| C-1374 / 212 | TradeCarousel / PUBLIC | `button` type="button"; onClick={() =&gt; setPlaying((p) =&gt; !p)}; aria-label={ playing ? "Pause automatic slide rotation" : "Resume automatic slide rotation" } |
| C-1375 / 242 | CarouselButton / PUBLIC | `button` type="button"; onClick={onClick}; aria-label={label} |

### `web/app/_components/TradesMenu.tsx`

| Control ID / line | Component / family | Control and identifying label or binding |
| --- | --- | --- |
| C-1376 / 49 | TradesMenu / PUBLIC | `button` Trades; type="button"; onClick={() =&gt; setOpen((o) =&gt; !o)} |
| C-1377 / 82 | TradesMenu / PUBLIC | `Link` href={t.href}; role="menuitem"; onClick={() =&gt; setOpen(false)} |

## Appendix E — Native-to-website comparison and preservation index

These route files and component controls already exist in the dirty native working tree. Preserve their useful functionality while completing the deltas; 20 route screens do not describe all nested feature screens. This reverse mapping complements the website-to-mobile page census.

| Native route file | Website counterpart | Current coverage / obligation |
| --- | --- | --- |
| `mobile/src/app/_layout.tsx:1` | Global auth/session/navigation shell | Preserve; AUTH and X requirements, including native-only biometric protection |
| `mobile/src/app/(auth)/_layout.tsx:1` | Global auth/session/navigation shell | Preserve; AUTH and X requirements, including native-only biometric protection |
| `mobile/src/app/(auth)/sign-in.tsx:1` | Clerk /sign-in plus legacy sign-in continuity | Partial; AUTH-001/002 and X-002 |
| `mobile/src/app/(auth)/sign-up.tsx:1` | /sign-up, /onboard and verification/resume flows | Partial; AUTH-003 through AUTH-008 |
| `mobile/src/app/(auth)/success.tsx:1` | /onboard/success and provisioning retry | Partial; AUTH-004 and related onboarding states |
| `mobile/src/app/(auth)/welcome.tsx:1` | Public homepage acquisition/welcome | Partial; PUBLIC marketing/help/legal requirements |
| `mobile/src/app/(tabs)/_layout.tsx:1` | Global auth/session/navigation shell | Preserve; AUTH and X requirements, including native-only biometric protection |
| `mobile/src/app/(tabs)/chats.tsx:1` | /dashboard ChatsTab and thread/reply flow | Partial; CORE chat requirements |
| `mobile/src/app/(tabs)/index.tsx:1` | /dashboard trade hub, Quotes section | Partial; CORE queue and TRADE-001 |
| `mobile/src/app/(tabs)/menu.tsx:1` | Dashboard sidebar, profile menu and navigation | Partial; CORE navigation and X requirements |
| `mobile/src/app/(tabs)/quotes.tsx:1` | /dashboard QuotesTab and owner detail/editor | Partial; CORE queues/details and PUBLIC owner editors |
| `mobile/src/app/(tabs)/tools.tsx:1` | /dashboard trade hub, Tools section and tool routes | Partial; TRADE-001 through TRADE-030 |
| `mobile/src/app/sections/account.tsx:1` | Dashboard AccountTab and /account provider controls | Partial; CORE account and AUTH-009 |
| `mobile/src/app/sections/billing.tsx:1` | Dashboard BillingTab; Stripe/store provider flows | Partial; CORE billing, G-006 and X-011 |
| `mobile/src/app/sections/calendar.tsx:1` | Dashboard CalendarTab and paid booking pages | Partial; CORE calendar and PUBLIC booking requirements |
| `mobile/src/app/sections/files.tsx:1` | Dashboard FilesTab, viewer/comments/resolve/chat | Partial; CORE file requirements and X-017/018 |
| `mobile/src/app/sections/followups.tsx:1` | Dashboard FollowupsTab and message/call/event controls | Partial; CORE follow-up requirements |
| `mobile/src/app/sections/history.tsx:1` | Dashboard HistoricalQuotesTab and import/review/calibration | Partial; CORE historical-data requirements |
| `mobile/src/app/sections/invites.tsx:1` | /dashboard/invites marketing/QR/slug; not /admin/invites | Partial; CORE marketing; administrator invitations remain separate |
| `mobile/src/app/sections/overview.tsx:1` | Dashboard OverviewTab and analytics sections | Partial; CORE overview/analytics |
| `mobile/src/app/sections/payouts.tsx:1` | Dashboard PayoutsTab, Connect and release recovery | Partial; CORE payouts and G-004 |
| `mobile/src/app/sections/pricing-book.tsx:1` | Dashboard rate cards and /dashboard/pricing-wizard | Partial; TRADE-013 through TRADE-016/023 and CORE policies |
| `mobile/src/app/sections/videos.tsx:1` | Dashboard VideosTab and generation/playback | Partial; CORE video requirements and X-026 |

| Existing native control source | Instances | Owning components |
| --- | --- | --- |
| `mobile/src/app/(auth)/_layout.tsx` | 1 | AuthLayout |
| `mobile/src/app/(tabs)/quotes.tsx` | 5 | QuotesRoute |
| `mobile/src/app/(tabs)/_layout.tsx` | 2 | TabsLayout |
| `mobile/src/components/ThemedSwitch.tsx` | 1 | ThemedSwitch |
| `mobile/src/features/auth/BiometricGate.tsx` | 2 | BiometricGate |
| `mobile/src/features/auth/SignInScreen.tsx` | 6 | SignInScreen |
| `mobile/src/features/auth/SignUpScreen.tsx` | 12 | SignUpScreen |
| `mobile/src/features/auth/SuccessScreen.tsx` | 3 | SuccessScreen |
| `mobile/src/features/auth/ui.tsx` | 6 | PrimaryCta, GhostButton, BackButton, Field |
| `mobile/src/features/auth/WelcomeScreen.tsx` | 2 | WelcomeScreen |
| `mobile/src/features/chats/ChatsScreen.tsx` | 4 | ChatsScreen, ChatListRow |
| `mobile/src/features/chats/ChatThread.tsx` | 3 | ChatThread |
| `mobile/src/features/home/ActivityAnalytics.tsx` | 1 | NeedsAttention |
| `mobile/src/features/home/HomeScreen.tsx` | 10 | HomeScreen |
| `mobile/src/features/menu/CardChrome.tsx` | 2 | RetryLine, RateCard |
| `mobile/src/features/menu/MenuScreen.tsx` | 5 | SectionRowItem, MenuScreen |
| `mobile/src/features/menu/SolarRatesCard.tsx` | 1 | SolarRatesCard |
| `mobile/src/features/quotes/QuoteDetailModal.tsx` | 12 | DetailsBlock, LinksBlock, QuoteDetailModal |
| `mobile/src/features/quotes/QuoteRow.tsx` | 1 | QuoteRow |
| `mobile/src/features/sections/AccountScreen.tsx` | 1 | SecurityCard |
| `mobile/src/features/sections/BillingScreen.tsx` | 2 | BillingScreen |
| `mobile/src/features/sections/CalendarScreen.tsx` | 4 | EventRow, CalendarScreen |
| `mobile/src/features/sections/FilesScreen.tsx` | 4 | FilesScreen |
| `mobile/src/features/sections/FollowupsScreen.tsx` | 13 | FollowupRow, ActionBtn, FollowupsScreen |
| `mobile/src/features/sections/HistoryScreen.tsx` | 5 | CalibrationCard, HistoryScreen |
| `mobile/src/features/sections/InvitesScreen.tsx` | 13 | QrRow, CodeRow, SmallBtn, InvitesScreen |
| `mobile/src/features/sections/PayoutsScreen.tsx` | 2 | JobRow, PayoutsScreen |
| `mobile/src/features/sections/SectionScreen.tsx` | 1 | SectionScreen |
| `mobile/src/features/sections/VideosScreen.tsx` | 11 | PhotoAction, SlotCard, VideosScreen |
| `mobile/src/features/shell/TabBar.tsx` | 1 | TabBar |
| `mobile/src/features/trades/aircon/AirconToolScreen.tsx` | 11 | AirconToolScreen, OptionCardView |
| `mobile/src/features/trades/commercial-painting/CommercialPaintingScreen.tsx` | 11 | CommercialPaintingScreen, DocRow, PaintPricingGate, RunRow |
| `mobile/src/features/trades/estimator/EstimatorScreen.tsx` | 9 | EstimatorScreen, HistoryRow |
| `mobile/src/features/trades/hub/HubScreen.tsx` | 2 | HubScreen |
| `mobile/src/features/trades/hub/LinkOut.tsx` | 1 | LinkOutButton |
| `mobile/src/features/trades/hub/QuoteQueueSection.tsx` | 7 | JobRow, QuoteQueueSection |
| `mobile/src/features/trades/hub/sections/CatalogueSection.tsx` | 34 | CatalogueSection, MinePanel, EssentialsBlock, ProductRow, ProductForm, BrowsePanel, SupplierRowItem, LadderPanel, PickerOption, Field, SwitchRow, ActionButton |
| `mobile/src/features/trades/hub/sections/EstimatingSection.tsx` | 6 | NumField, EstimatingSection |
| `mobile/src/features/trades/hub/sections/PricingSection.tsx` | 2 | QuoteTierModeCard, PricingSection |
| `mobile/src/features/trades/hub/sections/RecipePricingAuthority.tsx` | 1 | RecipePricingAuthority |
| `mobile/src/features/trades/hub/sections/RecipesSection.tsx` | 23 | RecipesSection, StepsPanel, PartsPanel, RequiredPill, SwitchRow, Field, ActionButton |
| `mobile/src/features/trades/hub/sections/ServicesSection.tsx` | 13 | ServicesSection, ServiceToggleRow, CustomServiceForm, Field, ActionButton |
| `mobile/src/features/trades/hub/SectionsContent.tsx` | 1 | WebOnlyCard |
| `mobile/src/features/trades/jobquote/JobQuoteScreen.tsx` | 5 | JobQuoteScreen |
| `mobile/src/features/trades/roofing/RoofMeasureScreen.tsx` | 9 | RoofMeasureScreen, StructureCard |
| `mobile/src/features/trades/tools/PaintingSavedJobs.tsx` | 2 | JobRow, PaintingSavedJobs |
| `mobile/src/features/trades/tools/RoofingSavedJobs.tsx` | 2 | JobRow, RoofingSavedJobs |
| `mobile/src/features/trades/tools/SignageTools.tsx` | 4 | RequestRow, SignageTools |
| `mobile/src/features/trades/tools/SolarTools.tsx` | 6 | EstimateRow, SolarEstimatesCard, PylonHardwareSettingsCard |
| `mobile/src/features/trades/ui.tsx` | 4 | PillOption, PillGroup, Notice, MultilineField |

## Audit completeness and limits

The specification inventories the scanned source snapshot, not a frozen deployment or every possible future feature-flag combination. Public homepage access and the supplied URL failure were checked live; authenticated workflows, provider configuration, store purchases, production data and native devices were not exercised as part of this documentation task. Implementation must revalidate those conditions and maintain this inventory as source changes. No gap may be silently marked complete because a page, helper, endpoint, mock or historical test report exists.

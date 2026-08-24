# Spec: Web parity — qm-mobile replicates the QuoteMax website flows

Source of truth: the website repo at `C:\Users\dalig\Downloads\QuoteMate\quoteMate\quotemate-automation`
(Next.js 16 App Router). The mobile app is a **client of the same backend** — same Clerk instance,
same `/api/*` routes, same redirect semantics — rendered as native screens in this app's existing
design language (see `src/lib/theme.ts`, `src/features/auth/ui.tsx`).

Every requirement below is numbered and checkable. `/review` passes only when all P-requirements
are met. Non-goals are binding: building them is a spec violation.

## Context the builder must know

- All `/api/tenant/*` routes require a **Clerk Bearer token**: `useAuth().getToken()` per request,
  passed as `token` to `apiRequest`. `/api/onboard/*` validate-code/activate/trades are public.
- Money stays integer cents in mobile state (`src/lib/money.ts`); API dollar values are converted at
  the parse boundary, never mid-UI.
- Assume poor signal: every fetch surface needs loading, error + retry affordances (react-query
  defaults in `src/lib/query.ts`).
- en-AU copy. AU mobile regex and state list already exist in `SignUpScreen.tsx`.

---

## A. Auth semantics (parity with web)

- **A1.** After sign-in completes: navigate to the dashboard (`/`). Already true — keep.
- **A2.** After sign-in (and on any cold start of `(tabs)`), call `GET /api/tenant/me` with the Clerk
  token. On **404** (signed in, no tenant), redirect to the onboarding wizard — web behaviour:
  `router.replace('/onboard')`. On mobile: `router.replace('/sign-up')` with the wizard resuming at
  its invitation-code step, skipping account creation (the Clerk user exists; `clerk_user_id` comes
  from the live session).
- **A3.** Sign-up duplicate email (`form_identifier_exists`): prove ownership with the typed
  password via `signIn.create`; if it completes, call `GET /api/tenant/me`:
  - tenant 404 → resume onboarding (A2 path) with the session's `clerk_user_id`;
  - tenant exists → `setActive` and go to dashboard;
  - password sign-in fails → keep the current "Sign in instead" error.
- **A4.** Derived usernames use the web convention: `qm_<email local part>_<random>` lowercased,
  `[a-z0-9_]` only, ≤ 64 chars (web: `deriveUsername`, sign-up page.tsx:54). Update
  `usernameFromEmail` + tests.
- **A5.** Sign-out (from Menu tab, M2) lands on the welcome screen, mirroring web
  `afterSignOutUrl="/sign-in"`.

## B. Onboarding wizard (Get My QuoteMax)

The wizard keeps its current 4-step shell but gains the web's gate and fields.

- **B1. Invitation-code gate.** Before step 1, a code pane (web step-0 parity): uppercase-forced
  text field, placeholder `e.g. JON-JUNE-FLYERS-7K2P`. Submit → `POST /api/onboard/validate-code`
  `{ code, channel: 'web' }`. 200 accepts (surface `last_slot: true` as a "last sign-up slot"
  notice); 422 shows the server's `message`; network error keeps the pane with retry. The accepted
  code is carried into activation as `invitation_code` — the `EXPO_PUBLIC_ONBOARD_INVITE_CODE` env
  fallback is deleted.
- **B2. Step 2 (Trade & licence) gains optional fields** (same labels/hints as web Step1):
  contact name, website, business address (plain text — no autocomplete), ABN, licence body
  (pre-filled from state+trade where the web's `LICENCE_BODIES` mapping applies — hardcode the
  mapping subset for electrical/plumbing/roofing/painting), licence expiry (ISO date string).
  Trade pills stay the existing four. Mobile field unchanged.
- **B3. Step 3 (Pricing) reaches web coverage:**
  - Labour block (electrical/plumbing): hourly rate, call-out minimum, materials markup % —
    required iff a labour trade selected (unchanged);
  - Advanced (collapsed by default): apprentice rate, senior rate, after-hours multiplier,
    minimum charge hours, risk buffer % — optional, defaults blank;
  - Painting (iff painting selected): pricing-model toggle `Per m² / Hourly`; per-m² shows walls,
    ceilings, trim, exterior rates + call-out minimum; hourly shows hourly rate + call-out minimum;
  - Roofing (iff roofing selected): the web's 7 material rates — Colorbond Corrugated, Trimdek,
    Spandek, Klip-Lok 700, Concrete tile, Terracotta tile, Cement sheet. Cement sheet defaults
    blank and its helper text says blank = never auto-quoted;
  - GST registered toggle, default on.
- **B4. Activation payload** matches `OnboardActivateSchema` exactly: everything collected above,
  the accepted `invitation_code`, `clerk_user_id`, and blanks omitted (never `0` for empty
  numerics — mirror the web's `optionalNumber` semantics client-side).
- **B5. Activation response handling** (web parity):
  - 400 `validation_failed` → map `fieldErrors` to inline field errors and jump to the earliest
    offending step;
  - 422 → show the server `message` (code errors return to the code pane);
  - 200 with `warning`/`setupComplete:false` → success screen (B6) showing the warning + retry;
  - 200 clean → success screen.
- **B6. Success screen** (new route `/(auth)/success` or wizard phase): "G'day {first name}. You're
  on the line." + the provisioned `phoneNumber` prominently (or a no-number state), warning banner
  with a **Retry** button posting `POST /api/onboard/retry-provision` (Clerk token) when present,
  and a CTA that calls `setActive` with the stored `createdSessionId` then `router.replace('/')`.
  The session becomes active only here — preserving the existing invariant that a failed
  activation never strands a session.

## C. Dashboard (Home tab)

- **C1.** `GET /api/tenant/me` (Clerk token, zod-parsed subset) replaces every mock in
  `HomeScreen`: business name, tenant status, SMS/voice number, quotes.
- **C2.** Overview stats parity (same definitions as web `OverviewTab`): quoted value, accepted
  value (a quote is accepted when `deposit_paid` or `status === 'accepted'`), conversion %, average
  quote value, and the "In review" backlog count (`drafted | awaiting_review | review`).
- **C3.** Recent quotes list (newest first) — each row: customer/job label, amount, status chip;
  rows navigate to the Quotes tab detail (D2).
- **C4.** Loading skeleton + error state with retry; pull-to-refresh.

## D. Quotes tab

- **D1.** Quote list from tenant/me data (FlashList): status chip, amount, customer, age;
  filter chips: All / In review / Sent / Accepted.
- **D2.** Quote detail (modal or push route): line items if present, totals verbatim from API
  (no client price math), status history if present.
- **D3.** Actions with web endpoint parity: Approve (`POST /api/quote/[id]/approve`) and Send
  (`POST /api/quote/[id]/send`) for quotes in review states; optimistic update + invalidate.

## E. Chats tab (leads)

- **E1.** `GET /api/tenant/chats` list: contact, channel, last message preview, timestamp.
- **E2.** Chat detail: message thread; reply box posting `POST /api/tenant/chats/[id]/reply`.
- **E3.** Empty state copy explains the AI line answers here ("Your AI line answers here…").

## F. Trade tools (Roof tab + job quoter)

- **F1. Roofing measure** (Roof tab, roofing tenants): address text input →
  `POST /api/roofing/measure-all`; render each returned structure as an include/exclude card with
  area + priced value; combined total sums included structures; actions **Save**
  (`POST /api/roofing/save`) and **Save as quote** (`POST /api/roofing/save-as-quote`).
  No maps/3D/street-view — numbers and cards only.
- **F2. Job quoter** (electrical/plumbing tenants): job type picker → typed field set per job type
  (port the field definitions for the job types in web `lib/quote/job-fields.ts` for electrical +
  plumbing) → `POST /api/tenant/job-quote` → show priced result; catalogue selection via
  `GET /api/tenant/catalogue` when a job type calls for items.
- **F3.** The Roof tab shows the tool for roofing tenants, the job quoter entry for
  electrical/plumbing tenants, and both (sectioned) when trades overlap; painting-only tenants see
  a "use the web dashboard" pointer for the painting tool this round.

## G. Menu tab

- **G1.** Account card: business name, owner, email, trades, state, AI line number.
- **G2.** Pricing book editors, each hitting the endpoint the web dashboard actually uses: labour
  rates via PATCH `/api/tenant/me` (`pricing_by_trade`, only changed fields), roofing rates
  (7 materials) via PATCH `/api/tenant/roofing-rates`, painting rates via PATCH
  `/api/tenant/painting-rates` — the tenant/me UpdateSchema has no rate-card fields, so the
  dedicated overlay routes are the correct parity target. Same validation bounds as the
  activation schema.
- **G3.** Sign out (A5). App version + support link footer.

## H. Cross-cutting

- **H1.** A shared `useApi()` hook wraps react-query + Clerk `getToken()` so every tenant call is
  authed and cached consistently; all new screens use it.
- **H2.** Every new zod response schema tolerates unknown extra fields (`looseObject`) — the web
  API is larger than the mobile subset.
- **H3.** `npm run check` green, expo-doctor green, iOS + Android export green.
- **H4.** No new dependencies without a table update in CLAUDE.md.

## Non-goals (binding, this round)

Solar, aircon, signage, commercial painting, estimator/takeoff, flyer/video/marketing studio, CRM,
files, calendar, follow-ups, billing/payouts/Stripe, admin, logo upload, availability editor,
address autocomplete, maps/street-view/3D anywhere, SMS intent path, Face ID, password reset,
push notifications. The painting _tool_ (estimator) is out; painting _rates_ are in.

## Definition of done

1. Every P-requirement above verified by `/review` against this file.
2. `quotemax-domain-reviewer` pass on all money/lifecycle code; `field-ux-reviewer` pass on new
   screens; findings addressed or explicitly waived in the review notes.
3. Full check suite + exports green (H3).

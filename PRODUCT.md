# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

_Inferred: React Native + Expo shipping to both iOS and Android (bundle id `au.com.quotemax.mobile` on both). One brand design language; structure and controls follow each platform's conventions (HIG on Apple hardware, Material 3 on Android)._

## Users

Australian tradies. Pilots live for electrical (NSW) and plumbing (QLD). The situation is the ute or the job site: gloves on, phone in one hand, full sun on the screen, patchy signal. Their job in this app is to approve a drafted quote in seconds, see leads as they arrive, keep their pricing book current, and know which jobs are booked and paid, without getting off the tools.

Secondary: extra seats on Pro/Crew plans (an office partner or second licensed tradie) doing the same jobs from a different phone.

## Product Purpose

The primary experience is the tradie's QuoteMax command centre: review and approve drafts, watch leads arrive, maintain the pricing book, and track booked and paid work from the job site.

The current completeness scope also includes audience-correct installed-app counterparts for public/customer capability links and a separately server-authorised administrator workspace. Public/customer journeys must continue to work in a normal browser without an install. A signed-in owner preview never grants customer consent, and a tradie account never gains administrator authority from client navigation.

## Positioning

QuoteMax quotes from the tradie's own pricing book, never from a model's guess. Pricing, fees, GST, deposits, site visits and remaining balances must come from the current authoritative server contract for that tenant and trade; old marketing claims are not client constants. The app's claim on the phone: the quote is already drafted, the price is already yours, you just say yes.

## Operating Context

- The app is a client only. The QuoteMax backend owns the pricing book, the quote lifecycle, and every LLM provider credential.
- Channels: each tradie gets a dedicated AU number; SMS/WhatsApp on all plans, voice on Pro/Crew.
- Plans and limits are rendered from current store/server entitlement contracts. Historical marketing values must be re-checked before display.
- Estimator modules: solar, roof, paint.
- Quote lifecycle vocabulary: Lead → Draft → (approve) → Sent → Deposit paid / booked, with the A$99 Site visit as the complex-job branch.
- Usage scene: outdoors, one-handed, gloves, sunlight, dropped connections mid-task.

## Capabilities and Constraints

- Money is integer cents everywhere in state; `src/lib/money.ts` is the only rounding site (half-away-from-zero); GST is 1/11 of a GST-inclusive amount; display via `formatAud` (A$, en-AU, two decimals).
- The pricing book is the only source of a price. Nothing in the app may invent, estimate, or interpolate a price the tradie did not set.
- Every API response is zod-parsed before use; shape mismatches throw rather than render a wrong number.
- Offline tolerance is mandatory: any on-site screen must survive a dropped connection (react-query offline-tolerant defaults in `src/lib/query.ts`).
- Stack is decided and recorded in CLAUDE.md (Expo SDK 54, RN 0.81.5, React 19.1.0, TypeScript strict, expo-router, FlashList for anything longer than a screen).
- en-AU spelling in all user-facing copy (organise, licence, colour).

## Brand Commitments

The QuoteMax "Command Centre" identity, defined by the website's design authority (source of visual truth: `C:\Users\dalig\Downloads\QuoteMate\quoteMate\DESIGN.md` and `quotemate-automation/app/globals.css`). Binding per the user's brief: the mobile design system is tailored to the website's.

- Warm near-black charcoal canvas (`#16120F`), never blue-black; one accent only, Caterpillar yellow (`#FFC400`).
- Manrope (display and body) + JetBrains Mono (labels, prices, refs); ALL-CAPS left-aligned display.
- Depth from 1px warm hairline borders and lit edges, not drop shadows on resting surfaces.
- The two-tone brand mark carries its own gold `#E3C13C` (never "corrected" to `#FFC400`); body flips white/charcoal with theme.
- Dark is the primary brand; a "warm paper" light theme ships for device preference.
- Voice: Australian English, direct, a little dry; zero emoji; no exclamation marks; no em-dashes in customer-visible copy.
- Retired and forbidden: the old navy `#0E1622` + orange `#FF5A1F` "Maintain" identity.

## Evidence on Hand

- Website design authority: `C:\Users\dalig\Downloads\QuoteMate\quoteMate\DESIGN.md` (+ `.impeccable/design.json`, `app/globals.css` tokens).
- Brand mark vector paths: `quotemate-automation/app/_components/BrandMark.tsx` (cropped viewBox `151 214 397 270`, 1.47:1 landscape).
- Trade photo library: `C:\Users\dalig\Downloads\QuoteMate\imageSources\quotemax_images` (hero shots per trade, duotone-pass candidates).
- Brand-kit page format reference: `C:\Users\dalig\Desktop\MaintainTech\MaintainOrg\maintain-ai\design-system\index.html`.
- No testimonials, case studies, or customer metrics exist in this repo; do not fabricate any.

## Product Principles

1. Approval in seconds. The quote-approval moment is the product; everything on that screen either speeds the yes or gets out of the way.
2. Design for gloves, sun, and no signal. Big targets, high contrast, offline-safe state on every on-site screen.
3. The number is sacred. Prices come from the pricing book, render in mono with tabular figures, and are never invented or reflowed into ambiguity.
4. Trust reads as restraint. One yellow signal per screen marking the next action; honest numbers do the persuading.
5. Native structure, brand skin. Platform navigation, controls, and gestures stay stock; the brand lives in tint, type, surfaces, and content.

## Accessibility & Inclusion

WCAG AA contrast minimum on both themes (the dim-label value is tuned to ≥4.5:1 on cards). Touch targets 48dp minimum, larger for primary on-site actions (gloves). Respect the system font-size setting (sp / Dynamic Type) and Reduce Motion. Sunlight legibility is a product requirement, not a nicety: the warm-paper light theme must hold hierarchy outdoors.

# QuoteMax Mobile

@AGENTS.md

React Native + Expo app for **QuoteMax** — the tradie-facing companion to https://quotemax.com.au.

## Product context

QuoteMax answers a tradie's calls and texts, applies _their own_ pricing book, and drafts a clean
quote in under a minute. The tradie approves it, the customer pays a deposit, the job is booked.
The tradie stays on the tools.

Facts below are from the marketing site as of Aug 2026 — re-check before treating any as current.

- **Users:** Australian tradies. Pilots live for electrical (NSW) and plumbing (QLD).
- **Channels:** each tradie gets a dedicated AU number. SMS/WhatsApp on all plans; voice on Pro/Crew.
- **Plans:** Starter from A$49/mo (~40 quotes, 1 trade, 1 seat, 14-day trial) → Pro (+voice, 300 min,
  ~150 quotes, 2 trades, 2 seats, 1 estimator module) → Crew A$249/mo (1,000 min, ~400 quotes,
  4 trades, 5 seats, 3 numbers, all estimators, custom domain). All AUD, **ex-GST**.
- **Estimator modules:** solar, roof, paint.
- **Complex jobs are never auto-quoted.** They route to a paid A$99 site visit, which is credited
  back to the final invoice. This is a product guarantee — do not build flows that guess a price.
- **QuoteMax never takes a cut of a job.** Only voice minutes are metered.

## What this app is

The tradie's phone. Review and approve drafted quotes, watch leads arrive in real time, edit the
pricing book, and track deposits and booked jobs.

It is **not** the customer-facing quote page — that stays on web. The customer never installs this.

## Status

Scaffolded and verified: typecheck, lint, tests and `expo-doctor` (18/18) all pass, and the app
bundles for both iOS and Android. No product screens yet — `src/app/index.tsx` is a placeholder
that exists to prove the wiring and is meant to be deleted when the design system arrives.

## Stack

| Layer        | Choice                                                | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------ | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime      | Expo SDK 54 · React Native 0.81.5 · React 19.1.0      | new architecture, Hermes. React must exactly match RN's bundled renderer (19.1.0); the `@ai-sdk/react` peer range that excludes it is bypassed via npm `overrides` — the exclusion targets a React SSR advisory that does not apply to this native client                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Routing      | `expo-router` 6, file-based                           | routes in `src/app/`, typed routes on                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Language     | TypeScript 5.9, `strict` + `noUncheckedIndexedAccess` | `any` is an ESLint error                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Server state | `@tanstack/react-query`                               | offline-tolerant defaults in `src/lib/query.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Validation   | `zod`                                                 | every API response is parsed before use                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| LLM          | `ai` + `@ai-sdk/react`, streaming over `expo/fetch`   | model runs on the backend, never here                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Lists        | `@shopify/flash-list`                                 | for anything longer than a screen                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Auth         | `@clerk/expo` (Core 3)                                | same Clerk instance as the web app; sessions restored from the keychain token cache; every `/api/tenant/*` call carries a per-request `getToken()` Bearer. `publishableKey` must be passed to `ClerkProvider` explicitly. The auth wizard imports `useSignIn`/`useSignUp` from `@clerk/expo/legacy` — Core 3's default hooks are signal-based and have no `setActive`/`isLoaded`. The `@clerk/expo` config plugin must stay registered in `app.json` — without it the ClerkExpo pod is skipped by autolinking and iOS pod install crashes in RN's SPM hook (clerk/javascript#9150); it raises the iOS minimum to 17.0. `appleSignIn` is `false` because the provisioning profile lacks the capability — Apple sign-in still works via Clerk's browser OAuth flow. To go native: run `eas credentials --platform ios` interactively (Apple login) to regenerate the profile, then flip the flag |
| Secrets      | `expo-secure-store`                                   | Clerk token cache + legacy session token only                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| IAP          | `react-native-purchases` (+`-ui`) — RevenueCat        | native-only; wired in `src/lib/purchases.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Tests        | `jest-expo` + `@testing-library/react-native`         |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Builds       | EAS Build + EAS Update (`eas.json`)                   | native dirs are generated, not committed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

Change this table first, then the code — it is the source of truth for stack decisions.

## Commands

```
npm start               # dev server (press j for React Native DevTools)
npm run ios             # dev server targeting iOS
npm run android         # dev server targeting Android
npm run check           # typecheck + lint + tests — run before every commit
npm run test            # jest in watch mode
npm run format          # prettier
npm run doctor          # expo-doctor
```

## Architecture

The app is a **client only**. The QuoteMax backend owns the pricing book, the quote lifecycle, and
every LLM provider credential. This app renders and acts on what that API returns.

- `src/lib/env.ts` — `EXPO_PUBLIC_API_URL`. Everything `EXPO_PUBLIC_*` is readable from a shipped
  binary, so it is configuration, never a secret.
- `src/lib/api.ts` — typed fetch. Responses are zod-parsed; a shape mismatch throws rather than
  rendering a wrong number.
- `src/lib/ai.ts` — `useQuoteAssistant()` streams from the backend. There is deliberately no
  provider package (`@ai-sdk/anthropic` etc.) in `package.json`; those belong server-side.
- `src/lib/money.ts` — the only place money rounding is allowed. Fully unit-tested.
- `src/lib/purchases.ts` — the whole RevenueCat integration: plan entitlements, the paywall,
  restore, and Clerk identity sync. This is the tradie's **subscription** only; it never touches
  a job price. The `PLANS` tuple must match the entitlement identifiers in the RevenueCat
  dashboard. Expo Go needs a `test_…` Test Store key — real purchases need a development build.

## Conventions

- `src/app/` — expo-router routes only. Everything else lives elsewhere under `src/`.
- `src/components/` shared UI · `src/features/<domain>/` feature code · `src/lib/` clients and utils.
- `@/` resolves to `src/`.
- Components in `PascalCase.tsx`, hooks as `useThing.ts`, everything else `kebab-case.ts`.
- Colocate a component's styles and tests with the component.
- Prefer Expo's own modules over third-party equivalents before adding a dependency.

## Rules

- **Money is integer cents.** Never a float, never a formatted string in state. See the
  `au-conventions` skill — it covers GST, rounding, AU phone/date formats, and the NSW/QLD
  timezone trap.
- **The pricing book is the only source of a price.** Nothing in the app may invent, estimate, or
  interpolate a price the tradie did not set.
- Never commit secrets, keystores, `google-services.json`, or `GoogleService-Info.plist` —
  `.gitignore` blocks them and `.claude/settings.json` denies reading them.
- Never run `eas submit` or otherwise publish to the App Store / Play Store. That is the user's call.
- Assume poor signal. Any screen a tradie uses on site must survive a dropped connection.
- en-AU spelling in all user-facing copy (organise, licence, colour).

## Domain glossary

| Term             | Meaning                                                                              |
| ---------------- | ------------------------------------------------------------------------------------ |
| **Pricing book** | The tradie's own rates. The only legitimate source of a price.                       |
| **Lead**         | An inbound text or call before it becomes a quote.                                   |
| **Draft**        | A quote QuoteMax generated, waiting on tradie approval.                              |
| **Site visit**   | The A$99 paid visit a complex job routes to instead of an auto-quote. Credited back. |
| **Deposit**      | Paid by the customer on the quote page; booking the job.                             |
| **Estimator**    | A trade-specific module (solar / roof / paint) for specialised quoting.              |
| **Trade**        | An occupation the account quotes for. Plans cap how many.                            |
| **Seat**         | A dashboard login.                                                                   |

## Claude assets in this repo

- `.claude/agents/` — `quotemax-domain-reviewer` (money, GST, quote lifecycle correctness) and
  `field-ux-reviewer` (usability for a tradie on site).
- `.claude/skills/` — `au-conventions` (money/GST/phone/date/timezone) and `new-screen`
  (scaffolding a route to project conventions).
- `.claude/hooks/post-edit-check.mjs` — lints each edited file and feeds errors straight back, so
  they get fixed in the same turn rather than at commit time.
- `.claude/settings.json` — shared permissions and hooks, and enables the official Expo Claude
  plugin. Personal overrides go in `settings.local.json`, which is gitignored.
- `AGENTS.md` — Expo's own note that the SDK has changed and that the versioned docs at
  https://docs.expo.dev/versions/v54.0.0/ are the authority. Read it before writing Expo code;
  training data for newer Expo SDKs is thin and confidently wrong.

For generic React Native and Expo work, use the globally installed `expo-react-native-expert`
agent rather than adding a duplicate here.

Claude Code itself needs no project-level npm packages — it runs as a globally installed CLI.

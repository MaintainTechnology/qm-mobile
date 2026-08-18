---
name: new-screen
description: Use when adding a new screen, route, tab, or modal to the QuoteMax mobile app. Covers the expo-router file layout under src/app, where route code stops and feature code starts, and the loading/empty/error states every screen must ship with. Read before creating anything under src/app.
---

# Adding a screen

## Where files go

Routes live in `src/app/` and nothing else does. A route file wires params and layout, then hands
off. Feature logic, data fetching, and non-trivial UI live in `src/features/<domain>/`.

The `@/` alias maps to `src/`, so `@/features/quotes/QuoteDetail` resolves from anywhere.

```
src/
  app/
    _layout.tsx               # root: polyfills, providers, theme (already wired)
    index.tsx                 # Leads
    quotes.tsx
    quote/[id].tsx            # quote detail
  features/quotes/            # QuoteDetail.tsx, useQuote.ts, quote-state.ts
  components/                 # shared UI
  lib/                        # api.ts, money.ts, query.ts, ai.ts, session.ts, env.ts
```

Keep the route file thin — params in, a feature component out:

```tsx
// src/app/quote/[id].tsx
import { useLocalSearchParams } from 'expo-router';
import { QuoteDetail } from '@/features/quotes/QuoteDetail';

export default function QuoteRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <QuoteDetail quoteId={id} />;
}
```

Routes are typed — `experiments.typedRoutes` is on, so `router.push('/quote/123')` is checked
against the files that actually exist. A type error on a `href` means the route is missing.

## Naming

- Route files follow expo-router: `kebab-case.tsx`, `[param].tsx`, `(group)/`, `_layout.tsx`.
- Components `PascalCase.tsx`. Hooks `useThing.ts`. Everything else `kebab-case.ts`.
- The default export of a route is a component named after the route, suffixed `Route`.

## Every screen ships with four states

Not three. A screen with only a success path is unfinished, and on a roof with two bars the other
three are what the tradie actually sees.

1. **Loading** — a skeleton, not a spinner, wherever the shape is known in advance.
2. **Empty** — says what will appear here and what to do about it. Never a blank screen.
3. **Error** — plain language, and a retry the user can actually tap. Never a raw error string.
4. **Success.**

`queryClient` is already configured to stop retrying 4xx and schema errors, so an error state
reached that way is final — say so rather than offering a retry that cannot help.

## Lists

Use `FlashList` from `@shopify/flash-list` for anything that can exceed a screenful — leads,
quotes, pricing-book lines. Plain `ScrollView` is fine for short fixed content. `FlatList` has no
reason to appear in new code here.

## Before you call it done

- Run the `field-ux-reviewer` agent against the screen. It checks one-handed reach, tap targets,
  sunlight contrast, and dropped-connection behaviour.
- If the screen shows a price, total, GST, deposit, date, or phone number, read the
  `au-conventions` skill and run the `quotemax-domain-reviewer` agent.
- `npm run check` must pass — typecheck, lint, and tests in one go.

## Don't

- Don't fetch in a route file. Fetch in the feature's hook so the screen stays testable.
- Don't add a navigation library. expo-router is the router; it handles deep links and tabs.
- Don't reach for a new dependency before checking whether Expo ships the module already.
- Don't format money by hand. `formatAud` from `@/lib/money` is the only correct way.

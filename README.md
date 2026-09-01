# QuoteMax Mobile

The tradie-facing mobile app for [QuoteMax](https://quotemax.com.au) — review and approve drafted
quotes, watch leads arrive, edit the pricing book, and track deposits and booked jobs.

Built with Expo SDK 54 and React Native 0.81.

## Getting started

```bash
npm install
```

```bash
cp .env.example .env.local
```

Point `EXPO_PUBLIC_API_URL` at the QuoteMax API, then:

```bash
npm start
```

Press `i` for iOS, `a` for Android, `w` for web, or `j` to open React Native DevTools.

### iOS and Android

Native projects are generated, not committed (Continuous Native Generation). You do not need Xcode
or Android Studio to develop against Expo Go or a development build. For a device build:

```bash
npx eas build --profile development --platform ios
```

`eas.json` defines `development`, `preview` and `production` profiles. Run `npx eas init` once to
link the project, and set `EXPO_PUBLIC_API_URL` per profile as an EAS environment variable.

## Checks

```bash
npm run check
```

Runs typecheck, lint and tests together. Run it before every commit. Individually:

| Command             | What it does                 |
| ------------------- | ---------------------------- |
| `npm run typecheck` | `tsc --noEmit`, strict       |
| `npm run lint`      | ESLint via `expo lint`       |
| `npm run test`      | Jest in watch mode           |
| `npm run test:ci`   | Jest once, for CI            |
| `npm run format`    | Prettier                     |
| `npm run doctor`    | `expo-doctor` project health |

## Layout

```
src/
  app/            expo-router routes — file-based, typed
  lib/            API, money, query/session, routing, media and monitoring boundaries
  types/          ambient declarations
assets/           icons and splash (Expo placeholders — replace with QuoteMax branding)
```

`@/` resolves to `src/`.

## Architecture

This app is a **client only**. The QuoteMax backend owns the pricing book, the quote lifecycle and
every LLM provider credential.

**No API keys belong in this repo.** A React Native bundle is a zip file — anything shipped inside
it, including every `EXPO_PUBLIC_*` value, can be read off a device. `src/lib/ai.ts` streams model
output from the backend rather than calling a provider directly, which is why there is no
`@ai-sdk/anthropic` (or any provider package) in `package.json`.

Money is always an integer number of cents. `src/lib/money.ts` is the only place rounding happens,
and it is unit-tested. See `.claude/skills/au-conventions/SKILL.md` for the GST, phone, date and
timezone rules — including the one where NSW observes daylight saving and Queensland does not.

## Release boundaries

Local tests and exports do not prove provider configuration, cross-tenant authority, native deep
links, push, purchases, accessibility or device lifecycle behaviour. Track those gates in
`specs/web-mobile-completeness-spec.md`; publishing remains a separate authorised action.

# QuoteMax Mobile design system

The brand kit and token set for the QuoteMax mobile app, tailored from the quotemax.com.au
website system ("The Command Centre"). The written authority is [`../DESIGN.md`](../DESIGN.md);
change that first, then keep the files here in step.

Open [`index.html`](index.html) in a browser for the visual kit: colours, type, logo, depth,
shape, mobile components in both themes, motion, and the do/don't list. It is fully
self-contained (fonts embedded) and works offline.

## Files

| File                  | What it is                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `index.html`          | The brand kit, human-readable.                                                                                                  |
| `tokens.css`          | Tokens as CSS custom properties, for this page and any web embeds.                                                              |
| `tokens.json`         | Platform-neutral token data.                                                                                                    |
| `../src/lib/theme.ts` | **The app consumes this.** Typed tokens: colours (both themes), type scale, spacing, radii, touch floors, motion.               |
| `assets/logo/`        | The two-tone M mark, both colourways. In-app, port the inline-SVG component instead of referencing these files (it must theme). |
| `assets/fonts/`       | Manrope + JetBrains Mono variable woff2 (latin) and the embedding CSS.                                                          |
| `assets/photos/`      | Brand photography samples; ship through the duotone pass shown in the kit.                                                      |

## Using it in the app

- Import from `@/lib/theme`: `themes.dark` / `themes.light`, `type`, `spacing`, `radius`, `touch`, `motion`, `hairline`.
- Fonts load via `@expo-google-fonts/manrope` and `@expo-google-fonts/jetbrains-mono`
  (not yet installed; add them with the first themed screen and update the CLAUDE.md stack
  table). Only the weights named in `theme.ts` are sanctioned.
- Money renders through `formatAud` from integer cents, in mono with tabular figures. Always.
- Resting surfaces: 1px `inkLine` border + the lit edge, elevation 0. Shadows only on true overlays.

## Next steps (not done here)

- Replace the Expo default icon/splash in `../assets/` with QuoteMax-branded art derived from
  `assets/logo/` (app icon wants the mark on `#16120F`, notch gold intact).
- Port `BrandMark` / `BrandLockup` from the website repo as a React Native SVG component.
- Delete the scaffold placeholder `src/app/index.tsx` when the first real screen lands.

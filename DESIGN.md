---
name: QuoteMax Mobile
description: The website's warm-charcoal command centre, tailored to a native app in a tradie's gloved hand — one Caterpillar-yellow signal, borders not shadows, 48dp floors.
colors:
  ink-deep: '#16120F'
  ink: '#1E1813'
  ink-card: '#2B2422'
  ink-line: '#3A322C'
  ctl-line: '#7A6E5E'
  accent: '#FFC400'
  accent-press: '#E6AC00'
  accent-soft: '#FFD23D'
  accent-ink: '#1C1812'
  logo-body: '#FFFFFF'
  logo-notch: '#E3C13C'
  text-pri: '#F6F1EA'
  text-sec: '#C3B8AC'
  text-dim: '#A2968A'
  edge-glow: '#6E6354'
  edge-deep: '#4A4136'
  success: '#15803D'
  success-bright: '#34D27B'
  warning: '#B45309'
  warning-bright: '#F59E0B'
  danger: '#B91C1C'
  danger-bright: '#F0816B'
  paper-canvas: '#FAF8F4'
  paper-sunken: '#F3EEE7'
  paper-card: '#FFFFFF'
  paper-line: '#CFC2B0'
  paper-ctl-line: '#8A7D6A'
  paper-accent-soft: '#2B2422'
  paper-ink: '#241E1B'
  paper-ink-sec: '#5E544E'
  paper-ink-dim: '#6E645C'
  paper-accent-ink: '#2B2422'
  paper-logo-body: '#16120F'
typography:
  display:
    fontFamily: 'Manrope 800 (Manrope_800ExtraBold)'
    fontSize: 34
    lineHeight: 36
    letterSpacing: -1.36
    transform: uppercase
  headline:
    fontFamily: 'Manrope 800 (Manrope_800ExtraBold)'
    fontSize: 26
    lineHeight: 28
    letterSpacing: -1.04
    transform: uppercase
  title:
    fontFamily: 'Manrope 700 (Manrope_700Bold)'
    fontSize: 18
    lineHeight: 24
    letterSpacing: -0.36
  body:
    fontFamily: 'Manrope 400 (Manrope_400Regular)'
    fontSize: 16
    lineHeight: 24
    letterSpacing: 0
  body-sm:
    fontFamily: 'Manrope 400 (Manrope_400Regular)'
    fontSize: 14
    lineHeight: 20
    letterSpacing: 0
  label:
    fontFamily: 'JetBrains Mono 600 (JetBrainsMono_600SemiBold)'
    fontSize: 12
    lineHeight: 16
    letterSpacing: 2.16
    transform: uppercase
  price:
    fontFamily: 'JetBrains Mono 700 (JetBrainsMono_700Bold)'
    fontSize: 28
    lineHeight: 32
    letterSpacing: 0
    fontVariant: tabular-nums
rounded:
  card: 14
  control: 9
  chip: 6
  sheet: 16
  pill: 9999
spacing:
  '1': 4
  '2': 8
  '3': 12
  '4': 16
  '5': 20
  '6': 24
  '8': 32
  '12': 48
  '16': 64
touch:
  minimum: 48
  listRow: 56
  primaryCta: 56
motion:
  fast: 120
  base: 180
  slow: 240
  easeOut: 'cubic-bezier(0.23, 1, 0.32, 1)'
  pressScale: 0.97
components:
  button-primary:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.accent-ink}'
    rounded: '{rounded.control}'
    height: 56
    padding: '0 24'
  button-primary-pressed:
    backgroundColor: '{colors.accent-press}'
    scale: 0.97
  button-ghost:
    backgroundColor: 'transparent'
    borderColor: '{colors.ink-line}'
    textColor: '{colors.text-pri}'
    rounded: '{rounded.control}'
    height: 48
    padding: '0 20'
  card:
    backgroundColor: '{colors.ink-card}'
    borderColor: '{colors.ink-line}'
    rounded: '{rounded.card}'
    padding: 20
  input:
    backgroundColor: '{colors.ink}'
    borderColor: '{colors.ink-line}'
    textColor: '{colors.text-pri}'
    rounded: '{rounded.control}'
    height: 48
    padding: '0 16'
  status-chip:
    backgroundColor: 'transparent'
    borderWidth: 1
    rounded: '{rounded.chip}'
    height: 24
    padding: '0 8'
---

# Design System: QuoteMax Mobile

## 1. Overview

**Creative North Star: "The Command Centre, one-handed."**

This is the website's design world (`quoteMate/DESIGN.md`) carried onto a phone that lives in a ute. The canvas is the same warm near-black charcoal (`#16120F`), lit by the same single hot signal, Caterpillar yellow (`#FFC400`). Depth still comes from 1px warm hairlines and lit panel edges, never drop shadows on resting surfaces. Type is still heavy ALL-CAPS Manrope against instrumented JetBrains Mono. What changes is the register: this is the tradie's cockpit, an Operate surface used in sunlight with gloves on, so the product radii (14dp cards, 9dp controls), 48dp touch floors, and platform-native structure govern every screen.

The mood is unchanged: a licensed Australian tradie who respects your time. On mobile that means the yellow marks exactly one thing per screen, the next action, and the biggest honest number on screen is the quote total in mono. Trust is the job; the approval screen is the product.

This system rejects the same things the website rejects (generic SaaS gradients, pill buttons, purple accents, glassmorphism, emoji, the retired navy + orange identity) plus the mobile-specific slop: web-shaped custom navigation, reinvented platform controls, hover-dependent affordances, and any tap target a gloved thumb can miss.

**Key Characteristics:**

- Warm near-black charcoal canvas; one accent only, hi-vis Caterpillar yellow, dark ink on every yellow fill.
- Product radii throughout: cards 14dp, controls 9dp, sheets 16dp top corners; only status dots and avatars are circles. No pill buttons.
- Depth from hairline borders + a lit top edge; cast shadows only on true overlays, warm-tinted.
- ALL-CAPS Manrope display, left-aligned; JetBrains Mono for labels, prices, refs, timestamps, always `tabular-nums` on figures.
- 48dp minimum touch targets, 56dp for list rows and the primary CTA. Gloves are the baseline, not the edge case.
- Platform structure is stock: iOS tab bar / large titles / sheets, Android navigation bar / predictive back / edge-to-edge insets. Brand expresses through tint, type, surfaces, and motion, never through reinvented controls.
- Dark is the primary brand. The warm-paper light theme is the sunlight workhorse: it follows the device setting by default and can be pinned in-app (Menu → Appearance: System / Charcoal / Paper, persisted), mirroring the website's manual `[data-theme]` pin. Both themes ship on every screen from day one.

## 2. Colours

Identical palette to the website; the roles below are the mobile mapping. Semantic tokens live in `src/lib/theme.ts` and resolve per theme; components consume roles, never raw hex.

### Primary

- **Caterpillar Yellow** (`#FFC400`): the one accent. The approve CTA, the active tab indicator, the one highlighted display word, the big mono number when it is the point of the screen. Pressed state darkens to **Signal Amber** (`#E6AC00`); **Soft Yellow** (`#FFD23D`) carries focus rings and selection ticks on the dark theme only. On warm paper the focus ring and ticks are ink (`#2B2422`); soft yellow sits at ~1.4:1 on cream and vanishes. Text and icons on yellow are always **Accent Ink** (`#1C1812` dark theme, `#2B2422` light).

### Neutral (dark theme, the brand primary)

- **Command Charcoal** (`#16120F`): screen canvas.
- **Sunken Charcoal** (`#1E1813`): inputs, insets, grouped-list backgrounds.
- **Palette Charcoal** (`#2B2422`): cards, sheets, the tab bar.
- **Warm Hairline** (`#3A322C`): the 1px border that draws every structural edge.
- **Control Hairline** (`#7A6E5E` dark, `#8A7D6A` paper): the input and interactive-control boundary. A declared mobile deviation from the web's single hairline: a field edge must hold ~3:1 in full sun, which the decorative hairline cannot.
- **Bone** (`#F6F1EA`) / **Warm Grey** (`#C3B8AC`) / **Dim Warm Grey** (`#A2968A`): primary, secondary, and label text (dim is tuned to ≥4.5:1 on cards).
- **Ridge Glow** (`#6E6354`) / **Ridge Deep** (`#4A4136`): reserved for the topographic hero texture; neutrals, never accents.

### Light theme, "warm paper" (device preference or in-app pin; the sunlight theme)

- Cream canvas (`#FAF8F4`), white cards, sunken paper (`#F3EEE7`), warm taupe hairline (`#CFC2B0`), ink text (`#241E1B` / `#5E544E` / `#6E645C`). Yellow stays a fill; it is never used as text on cream. Highlighted display words on paper carry a yellow underline instead of yellow glyphs.

### State (quote lifecycle, chips and rules only, never large fills)

- **Success** (`#15803D`, on-dark text `#34D27B`): deposit paid, job booked.
- **Warning** (`#B45309`, on-dark text `#F59E0B`): draft waiting on approval, expiring quote.
- **Danger** (`#B91C1C`, on-dark text `#F0816B`): failed send, declined payment, destructive confirm.
- On light theme the `-bright` text shades fall back to the base fills, which pass on paper.

### Brand mark

The two-tone "M" mark keeps its own gold, **Mark Gold** (`#E3C13C`), the literal source-art value, never "corrected" to `#FFC400`. Body is pure white on charcoal and `#16120F` on paper; the notch is `#E3C13C` in both themes. Ship it as an inline SVG component (a port of the website's `BrandMark`), cropped viewBox `151 214 397 270`, sized by height with width auto; a square container letterboxes the 1.47:1 mark.

### Named Rules

**The One Signal Rule.** Yellow is the only accent. On any screen it marks the single thing that matters next. If two elements are yellow, one of them is wrong. Keep it under ~10% of the screen.

**The Dark-on-Yellow Rule.** Text and icons on a yellow fill are always dark charcoal. White on yellow fails WCAG (~1.4:1) and is forbidden.

**The Warm-Not-Blue Rule.** Canvas, borders, and neutrals all lean warm. A cool grey or blue-black anywhere breaks the brand, including default platform greys; theme them out.

## 3. Typography

**Display + body:** Manrope, loaded via `@expo-google-fonts/manrope`, weights 400 / 500 / 600 / 700 / 800 only.
**Labels, prices, refs:** JetBrains Mono via `@expo-google-fonts/jetbrains-mono`, weights 400 / 600 / 700 only.
Anything outside those weights synthesises badly; add the weight to the loader rather than faking it.

Sizes are dp and scale with the OS font-size setting (sp on Android, Dynamic Type factor on iOS). Never opt out of font scaling on body or control text; cap scaling only on the display style (`maxFontSizeMultiplier` ~1.4) so headlines cannot shatter layouts.

### Hierarchy

- **Display** (Manrope 800, 34/36, tracking -1.36, ALL CAPS): screen-opening statements, the quote total moment. Left-aligned, one word in accent at most.
- **Headline** (Manrope 800, 26/28, tracking -1.04, ALL CAPS): section heads on long screens.
- **Title** (Manrope 700, 18/24): card titles, list-row primaries.
- **Body** (Manrope 400, 16/24): prose, descriptions. Sentence case.
- **Body-sm** (Manrope 400, 14/20): secondary rows, captions that must stay readable in sun; 14 is the sans floor.
- **Label** (JetBrains Mono 600, 12/16, +2.16 tracking, UPPERCASE): field labels, KPI labels, "QUOTE REF", timestamps. 12 is the absolute floor and only for mono labels.
- **Price** (JetBrains Mono 700, 28/32, `tabular-nums`): money. Line-item prices drop to 16/24 mono; totals get 28.

### Named Rules

**The All-Caps Display Rule.** Display and headline are ALL CAPS Manrope 800, left-aligned, never centred. Line height is tight (1.05–1.08); RN clips glyphs below that, so never reuse the web's 0.95.

**The Mono-Money Rule.** Every price, ref, and timestamp is JetBrains Mono with `tabular-nums`, formatted by `formatAud` from integer cents. A price in Manrope is a defect. Numbers that change (totals during edits) must not reflow their container: reserve width from the widest expected figure.

## 4. Elevation & Depth

Flat by intent, exactly like the website: **no drop shadows on resting surfaces**. RN's default `elevation`/`shadowColor` props on cards are forbidden.

- **Hairline border**: every card, input, and bar edge is 1px `ink-line` (`StyleSheet.hairlineWidth` is too thin on 3x devices; use 1).
- **Lit edge**: the "lifted plate" top highlight, `boxShadow: inset 0 1 0 rgba(255,255,255,0.06)` (RN new-architecture `boxShadow` style; this repo ships new arch). On light theme it becomes the whisper cast `0 1 2 rgba(43,36,34,0.06)`.
- **Film grain**: a static noise texture at 4.5% opacity (3% light) reserved for hero surfaces only (dashboard header, quote-total panel), implemented as one small tiling image, never a per-frame effect. Ordinary screens skip it; battery and scroll perf outrank texture.
- **True overlays** (sheets, dialogs, menus) may cast: menu `0 16 40 -12 rgba(11,9,7,0.55)`, overlay `0 24 60 -12 rgba(11,9,7,0.7)`, always warm-tinted, never neutral black. The negative spread matches the website's shadow vocabulary; dropping it makes every overlay visibly heavier.
- Android tonal elevation: keep Material surfaces on the charcoal scale (`ink` → `ink-card`), not Material's blue-grey tonal tints.

### Named Rules

**The Borders-Not-Shadows Rule.** Structure is drawn, not cast. If a surface rests on the canvas, its edge is a hairline and a lit top, full stop.

**The One-Texture Rule.** Grain earns its battery cost only where the brand does its trust work: the screen-opening hero panel. Never on list rows, never animated.

## 5. Components

### Buttons

- **Primary** ("Approve quote", "Send"): yellow fill, accent-ink text, Manrope 700 uppercase with +0.8 tracking, height 56, radius 9. Pressed: fill darkens to `#E6AC00` and the button scales to 0.97 over 120ms; both, not either. Disabled: 40% opacity, no pointer feedback.
- **Ghost** (secondary actions): transparent, 1px hairline border, primary text, height 48, radius 9. Pressed: border and label shift to accent.
- **Destructive confirm** ("Decline"): ghost with danger border/text; never a red fill button.
- One primary button per screen (One Signal Rule). Loading state swaps the label for an inline spinner in accent-ink and keeps the width.

### Cards

- Palette charcoal (`#2B2422`) / white on paper, radius 14, 1px hairline, lit edge, padding 20. Pressed (when tappable): background lightens one step and scales 0.98; no ripple colour other than warm white at 6%.

### Inputs

- Sunken charcoal (`#1E1813`) / paper-sunken fill, 1px **control hairline** (`ctlLine`, see Colours; the stronger boundary is what makes an empty field findable in sun), radius 9, height 48, mono uppercase label above (Label style), 16dp horizontal padding.
- Focus: border shifts to accent plus a 2px focus ring in `accentSoft` (soft yellow on dark, ink `#2B2422` on paper). Error: danger-bright border and a body-sm danger message below.
- Money inputs: mono, right-aligned, integer-cents backed, numeric keypad only (`keyboardType="decimal-pad"`). The `A$` prefix is a non-editable adornment rendered by the field; the editable value is digits and one decimal point only. State holds integer cents and displays through `formatAud`, never a formatted string.

### List rows (leads, quotes, line items)

- Height ≥56, hairline separators (never full-bleed through the leading icon column), Title primary + Body-sm secondary, mono price right-aligned. Built on FlashList. Swipe actions use platform conventions; the revealed action gets a state colour rule, not a fill.
- Row amounts are always GST-inclusive totals; the row's compact layout stands in for the approve bar's INC GST label, which the quote screen must still show. The A$99 site visit is a customer-facing price and therefore GST-inclusive (GST component A$9.00); confirm with product before rendering any other treatment.

### Status chips (quote lifecycle)

- 24dp tall, radius 6, 1px border in the state's bright shade with matching mono 12 UPPERCASE text, transparent fill: DRAFT (warning), SENT (neutral warm grey), PAID (success), FAILED (danger), SITE VISIT (accent border, accent text on dark). Never a filled chip; colour is never the only signal, the word is always present.

### Navigation

- **Tab bar** (both platforms, 3–5 sections): palette-charcoal bar, hairline top border, inactive icons warm grey, active icon + label in accent. Android may use the Material active-indicator pill in accent with accent-ink icon. No floating custom bars, no centre FAB cutouts.
- **Headers**: iOS large titles (Manrope 800 caps via header options) collapsing to inline; Android top app bar. Both stay on canvas colour with a hairline bottom edge, no elevation shadow.
- **Sheets**: self-contained tasks (edit a line item, filter leads). 16dp top radius, grab handle in `ink-line`, sheet surface `ink-card`. Respect swipe-to-dismiss unless data loss guards it.

### Approve Bar (signature)

The mobile descendant of the website's yellow marquee: a safe-area-aware bottom bar on the quote screen, canvas-coloured with hairline top, holding the mono total on the left ("A$1,842.50 · INC GST") and the primary Approve button on the right. It is the one place yellow always lives on that screen. Sticky, above the home indicator, 56dp button height.

### Quote Draft Card (signature)

The product's money shot: mono "QUOTE REF · QM-2418" label, customer name in Title, line items as mono figures with dotted leaders, hairline above the totals block, GST line ("GST INCLUDED · A$167.50" in mono 12), total in Price 28. Numbers from the pricing book only; the card never renders an estimated or placeholder price.

### SMS Thread (signature)

Lead detail: the conversation QuoteMax had. Dark bubbles on `ink` (inbound) and `ink-card` with hairline (QuoteMax replies), mono timestamps, typing indicator with the 3-dot bounce. It is the product proving itself; keep it verbatim, never paraphrased.

### Offline, errors & empty

Poor signal is the default scene, so every on-site screen specs these four states with existing tokens:

- **Skeleton**: a sunken-surface block (`ink` dark / paper-sunken light) with the radius of the content it replaces, pulsing opacity at base 180ms (static under Reduce Motion). Money skeletons reserve the width of the widest expected figure so the layout cannot shift when the number lands. Never `A$0.00`, never a spinner for content.
- **Status banner**: a persistent full-width bar under the header (not a toast), canvas background, 1px hairline, mono 12 UPPERCASE label plus a body-sm detail line. Offline: warning border and text, "OFFLINE · CHANGES WILL SYNC". Failed refresh: danger, with a ghost Retry inline.
- **Queued actions**: approving a quote offline queues it. The Approve button confirms instantly (pressed state, then "QUEUED · SENDS WHEN BACK ONLINE" in the approve-bar sub-label, mono, warning-bright); the row shows the DRAFT chip until the send is confirmed by the backend. Never fake a SENT state.
- **Empty states**: a Title line, one body sentence, and at most one ghost action, set on the canvas with no illustration. Example, Leads: "No leads yet. Your QuoteMax number is live; new calls and texts land here."

## 6. Motion

- Tokens: fast 120ms (press feedback), base 180ms (chips, toggles, reveals), slow 240ms (sheets, screen-level). Nothing over 300ms in-app.
- Easing: strong ease-out `cubic-bezier(0.23, 1, 0.32, 1)` for entries; ease-in-out for on-screen moves; never ease-in.
- Press feedback everywhere: scale 0.97 + colour step, 120ms. Keyboard/system-initiated changes do not animate.
- Screen transitions are the platform's own (push, sheet rise, predictive back). Do not restyle them.
- Honour Reduce Motion / Remove animations: crossfade or instant, and the typing-dots indicator degrades to a static label.

## 7. Do's and Don'ts

### Do:

- **Do** consume tokens from `src/lib/theme.ts`; both themes on every screen from the first commit.
- **Do** keep one yellow signal per screen and dark ink on every yellow fill.
- **Do** draw structure with hairlines and the lit edge; keep RN `elevation` at 0 on resting surfaces.
- **Do** set every price in JetBrains Mono `tabular-nums` via `formatAud`, from integer cents.
- **Do** keep every target ≥48dp, rows ≥56dp, primary CTA 56dp; test with gloves in sun, both themes.
- **Do** use stock platform navigation and controls, themed warm; SF Symbols on iOS may sit alongside the app icon set if weights match.
- **Do** run trade photography through the duotone pass before it ships in-app.

### Don't:

- **Don't** reintroduce navy + orange, add a second accent, gradient, or any neon.
- **Don't** use pill buttons, glassmorphism, purple, centred display type, or emoji, ever.
- **Don't** put white text on yellow, yellow text on cream, or state colours as large fills.
- **Don't** cast shadows from resting cards or let Material tonal tints cool the charcoal.
- **Don't** animate anything the user triggers dozens of times a day, or exceed 300ms in-app.
- **Don't** render a price the pricing book did not produce, a placeholder price included; loading states show skeletons, never `A$0.00`.
- **Don't** use exclamation marks or em-dashes in user-facing copy; full stop, comma, or middot.

## 8. Sources

- Visual authority inherited from: `C:\Users\dalig\Downloads\QuoteMate\quoteMate\DESIGN.md` (web) and its `globals.css` tokens.
- Mobile tokens: `src/lib/theme.ts` (app), `design-system/tokens.css` + `design-system/tokens.json` (docs/web).
- Brand kit: `design-system/index.html`. Logo assets: `design-system/assets/logo/`.

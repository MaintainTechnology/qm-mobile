# Handoff: QuoteMax Mobile App (React Native / Expo)

## Overview

A complete mobile app design for **QuoteMax** — AI-powered quoting for Australian
trade businesses. The app ports the full QuoteMax web feature set to a phone:
the AI receptionist line, quote drafting and review, SMS threads, the roof
measure tool, the price book, marketing tools, records, and account/billing —
plus the customer-facing quote page with deposit payment.

The design is grounded in the existing Next.js web app (local repo
`QuoteMate/quoteMate/quotemate-automation/`). Colours, type, copy voice, field
names and business logic were lifted from that source, not invented. See
`../github.md` in the project root for the screen→source-file map.

Target stack per the brief: **React Native with Expo**.

## About the Design Files

The files in this bundle are **design references created in HTML** — working
prototypes that show intended look, layout, state and behaviour. They are **not
production code to port line-by-line**.

Your task is to **recreate these designs in React Native / Expo** using that
platform's idioms and the project's established patterns:

| HTML in the prototype                    | React Native equivalent                                           |
| ---------------------------------------- | ----------------------------------------------------------------- |
| `div` / `section`                        | `View`                                                            |
| `span` / `p` / `h1`–`h3`                 | `Text`                                                            |
| `button`                                 | `Pressable` (or `TouchableOpacity`)                               |
| `.qm-scroll` (vertical)                  | `ScrollView` / `FlatList`                                         |
| `.qm-x` (horizontal chips, cards)        | `ScrollView horizontal`                                           |
| CSS custom properties (`--bg`, `--acc`…) | theme object + context, or `useColorScheme()`                     |
| `sc-for` loops                           | `.map()` / `FlatList`                                             |
| `sc-if` conditionals                     | conditional render                                                |
| Bottom tab bar                           | `expo-router` tabs or React Navigation `createBottomTabNavigator` |
| Bottom sheets (send, fix, deposit)       | `@gorhom/bottom-sheet` or a `Modal` with slide-up                 |
| `image-slot` (aerial placeholder)        | `Image` fed by the Google Static Maps API                         |
| Inline `svg` icons                       | `react-native-svg` (all icon paths are 24×24 viewBox)             |
| `@keyframes` (pulse, dots, drop)         | `react-native-reanimated`                                         |
| `font-variant-numeric: tabular-nums`     | `fontVariant: ['tabular-nums']`                                   |

Everything is one file (`QuoteMax Mobile App.dc.html`) with a `screen` prop that
switches between 18 screens — that is a prototyping convenience, **not** the
intended app architecture. In the real app each screen is its own route.

## Fidelity

**High-fidelity (hifi).** Final colours, typography, spacing, copy and
interaction states. Recreate pixel-accurately. Every value in the Design Tokens
section below is exact. Canvas is **390 × 844** (iPhone 14/15 logical size);
the design is fluid and should stretch to other widths.

Two live behaviours are load-bearing and must be implemented as real logic, not
static screens:

1. **Roof measure recalculation** — toggling a structure in/out changes the
   included area, which re-derives all three tier prices.
2. **Theme switching** — dark and light are both fully designed; the accent
   token behaves differently in each (see Design Tokens).

---

## Design Tokens

### Colour — dark theme (primary)

| Token      | Value                                   | Use                                       |
| ---------- | --------------------------------------- | ----------------------------------------- |
| `bg`       | `#16120F`                               | Screen background (warm charcoal)         |
| `card`     | `#2B2422`                               | Cards, panels, sheets                     |
| `sunk`     | `#1E1813`                               | Inputs, wells, inactive chips             |
| `line`     | `#3A322C`                               | All borders and dividers                  |
| `pri`      | `#F6F1EA`                               | Primary text                              |
| `sec`      | `#C3B8AC`                               | Secondary text, body copy                 |
| `dim`      | `#A2968A`                               | Meta text, labels, placeholders           |
| `acc`      | `#FFC400`                               | Accent **fills** (buttons, toggles, bars) |
| `accTx`    | `#FFC400`                               | Accent **text and icons**                 |
| `accUnder` | `transparent`                           | Highlighter underline (off in dark)       |
| `accPress` | `#E6AC00`                               | Accent pressed state                      |
| `accInk`   | `#1C1812`                               | Text/icons **on** an accent fill          |
| `ok`       | `#34D27B`                               | Success / paid / accepted                 |
| `warn`     | `#F59E0B`                               | Needs attention / awaiting you            |
| `bad`      | `#F0816B`                               | Declined / error / destructive            |
| `logo`     | `#FFFFFF`                               | Brand mark body                           |
| `lift`     | `inset 0 1px 0 0 rgba(255,255,255,.06)` | Card top-edge highlight                   |
| `grain`    | `.045`                                  | Film-grain overlay opacity                |

### Colour — light theme ("warm paper")

| Token      | Value                              |
| ---------- | ---------------------------------- |
| `bg`       | `#FAF8F4`                          |
| `card`     | `#FFFFFF`                          |
| `sunk`     | `#F3EEE7`                          |
| `line`     | `#CFC2B0`                          |
| `pri`      | `#241E1B`                          |
| `sec`      | `#5E544E`                          |
| `dim`      | `#6E645C`                          |
| `acc`      | `#FFC400` (unchanged — fills only) |
| `accTx`    | `#2B2422`                          |
| `accUnder` | `#FFC400`                          |
| `accPress` | `#E6AC00`                          |
| `accInk`   | `#2B2422`                          |
| `ok`       | `#15803D`                          |
| `warn`     | `#B45309`                          |
| `bad`      | `#B91C1C`                          |
| `logo`     | `#16120F`                          |
| `lift`     | `0 1px 2px rgba(43,36,34,.06)`     |
| `grain`    | `.03`                              |

### ⚠ The accent rule — do not collapse `acc` and `accTx`

This is the single most important token rule, taken from the web app's
`globals.css` (`:root[data-theme="light"] .text-accent`):

> **Yellow is a FILL, never a text colour on paper.**

- `--acc` (#FFC400) is for **fills** in both themes: button backgrounds, toggle
  tracks, progress bars, active-tab indicator, borders.
- `--accTx` is for **text and icons**: yellow in dark, charcoal `#2B2422` in
  light. Yellow text on cream is ~1.3:1 contrast and unreadable.
- Display words that were yellow in dark (e.g. "Jeph", "measure", "Sunday
  night") keep their emphasis in light via a **yellow highlighter underline**:
  `textDecorationLine: 'underline'`, colour `--accUnder`, thickness `0.09em`,
  offset `0.12em`.
- Text sitting on a yellow fill uses `--accInk`, never white.

The three status tokens (`ok`/`warn`/`bad`) also differ per theme — the dark
brights fail on white. Always read them from the theme, never hard-code.

### Typography

Two families, both on Google Fonts (`expo-font` / `@expo-google-fonts`):

- **Manrope** — UI and display. Weights 400, 500, 600, 700, 800.
- **JetBrains Mono** — numbers, labels, metadata, codes. Weights 400, 500, 600, 700.

Named rules from the design system:

- **All-caps display rule.** Display and section headlines are ALL CAPS,
  Manrope 800, tight tracking (`-0.02em` to `-0.045em`), line-height 0.93–1.05.
- **Mono for data.** Every number, rate, area, phone number, timestamp, status
  chip and eyebrow label is JetBrains Mono with wide tracking
  (`0.08em`–`0.16em`) and uppercase. Money and areas use tabular nums.
- **Sentence case for body.** Body copy is Manrope 400, sentence case,
  line-height 1.45–1.6.

Scale as used (fontSize / lineHeight / weight / tracking):

| Role                    | Value                                              |
| ----------------------- | -------------------------------------------------- |
| Hero display (welcome)  | 40 / 0.93 / 800 / −0.04em / uppercase              |
| Screen H1 (greeting)    | 28 / 0.95 / 800 / −0.04em / uppercase              |
| Sheet + card H2         | 19–27 / 1.0–1.15 / 800 / −0.025em / uppercase      |
| Screen title (header)   | 16–17 / 1.0 / 800 / −0.02em / uppercase            |
| Card title              | 14–16 / 1.15–1.25 / 700                            |
| Body                    | 12.5–15.5 / 1.45–1.6 / 400                         |
| Section label (mono)    | 10–11.5 / 1.0 / 700 / 0.1–0.14em / uppercase       |
| Eyebrow / kicker (mono) | 9–10 / 1.0 / 600 / 0.14–0.16em / uppercase         |
| Meta (mono)             | 8.5–9.5 / 1.0–1.35 / 500 / 0.08–0.12em / uppercase |
| Big number (mono)       | 20–38 / 1.0 / 800 / −0.02 to −0.03em / tabular     |

**Minimum tap target is 44 px** throughout — tradies use this one-handed, on
site, with gloves. Primary CTAs are 52–58 px tall.

### Spacing, radius, elevation

- Spacing scale: 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 22, 26 px.
  Screen gutter is **14–16 px**; the welcome/auth screens use **26 px**.
- Radius: `5–6` chips/badges, `8` inputs & auth buttons, `9–10` icon buttons and
  primary CTAs, `11` small tiles, `13–14` cards, `16` hero cards,
  `20 20 0 0` bottom sheets, `50%` avatars.
- Elevation: no drop shadows in dark — cards are separated by `1px solid line`
  plus the `lift` inset top highlight. Light theme uses the soft `lift` shadow.
  Bottom sheets/banners get `0 18px 40px -12px rgba(0,0,0,.75)`.
- Layout is flex + `gap` everywhere; no margin-based spacing between siblings.

### Motion

| Name        | Spec                                                                  | Where                           |
| ----------- | --------------------------------------------------------------------- | ------------------------------- |
| `qmPulse`   | opacity 1→0.4→1, 2.2–2.4 s, ease-in-out, infinite                     | live-status dots, warn dots     |
| `qmDot`     | translateY 0→−4, 1.1 s, staggered 0 / 0.16 / 0.32 s                   | AI typing indicator             |
| `qmDrop`    | translateY −120%→0 + fade, 0.42 s `cubic-bezier(.2,.9,.25,1)`         | push notification banner        |
| `qmPop`     | translateY 10→0, scale .97→1, fade, 0.3 s `cubic-bezier(.22,1,.36,1)` | bottom sheets, new message card |
| `qmUp`      | translateY 8→0 + fade, 0.32 s                                         | screen content entrance         |
| `qmHeart`   | scale 1→1.07→1→1.05→1, 2.6 s                                          | boot logo heartbeat (welcome)   |
| `qmBreathe` | opacity .35→1→.35, 2.6 s                                              | wordmark on welcome             |

---

## Navigation

**Bottom tab bar** (trade-first, 5 slots), 62 px tall + safe-area inset:

| Tab | Label  | Routes it owns                                                |
| --- | ------ | ------------------------------------------------------------- |
| 1   | Home   | `home`, `calendar`                                            |
| 2   | Roof   | `hub`, `measure`                                              |
| 3   | Quotes | `quotes`, `quote`                                             |
| 4   | Chats  | `chats`, `chat`                                               |
| 5   | Menu   | `menu`, `pricing`, `marketing`, `files`, `account`, `billing` |

Active tab: 2 px `acc` bar across the top inset (22%–78%), icon + label in
`accTx`. Inactive: `dim`.

Tabs are **hidden** on: `welcome`, `signin`, `onboard`, `chat` (composer owns the
bottom), `measure` (action bar owns the bottom), `customer` (external view).

The ~20 web sidebar tabs collapse as: Daily band → tabs 1/3/4, Trades band →
tab 2, Price book + Business bands → tab 5 (Menu).

---

## Screens

18 screens. In the prototype, switch via the `screen` prop.

### 1. `welcome`

Boot/marketing screen. Brand mark + stacked wordmark top-left with the heartbeat
animation. Bottom-anchored: an "AU tradies" pill (mono, `ok` dot), hero display
"NEVER QUOTE ON A **SUNDAY NIGHT** AGAIN." (accent word), body paragraph, primary
CTA "Get my QuoteMax" (58 px, `acc` fill), secondary "I already have an account"
(52 px, outline), and a Face ID hint row. A soft radial `acc` glow at 10%
opacity sits behind the headline.

### 2. `signin`

Back button + "SIGN IN" kicker header. "WELCOME BACK" H1, body line. Email field
(filled) and password field in **focus state** (`acc` border + 2 px
`rgba(255,210,61,.35)` ring) with an eye toggle. Primary "Sign in" CTA, an "or"
divider, "Unlock with Face ID" outline button, then "Forgot your password?" and a
sign-up link.

### 3. `onboard`

4-step wizard mirroring the web funnel. Header: back, brand mark, "STEP 0N / 04".
Progress = 4 equal bars, filled `acc` up to the current step. Then step label
pair, ALL-CAPS H2, sub-line, `* Required` legend, fields, and a 58 px CTA
("Continue" ×3, then "Activate my AI line"). Footer: "No card needed · about 3
minutes".

Steps: **01 Account** (business name, first name, email, password) ·
**02 Trade & licence** (2-col trade multi-select with tick boxes, state chips,
mobile, licence number) · **03 Your pricing** (hourly rate, call-out minimum,
markup, reroof rate, risk buffer) · **04 Review & activate** (read-only summary
rows).

Field anatomy: mono uppercase label with a `#F43F5E` asterisk when required, an
optional right-aligned hint, then a 52–54 px `sunk` input with `line` border,
radius 8. Selected multi-select options: `rgba(255,196,0,0.10)` fill, `acc`
border, `acc` tick with `accInk` glyph.

### 4. `home` — Today first

Header: brand mark + "Hartley Electrical", bell (badge "3", tapping fires the
push banner demo), theme toggle, avatar. Below it a full-width live strip:
`ok` pulsing dot, "AI LINE LIVE · ANSWERING", and the QuoteMax number.

Then, in order:

1. **Greeting** — "GOOD MORNING, **JEPH**" + "Two visits booked today. One quote
   needs your review."
2. **`01` Today · 2 site visits** — horizontal cards, 274 px wide: big mono time,
   duration, name, address, a tone-coded kind chip ("PAID SITE VISIT · $99 PAID"
   in `ok`; "REROOF INSPECTION" in `warn`), then 48 px **Call** (`acc`) + **Drive**
   (outline) buttons and a "12 min · 6.4 km from here" line.
3. **Needs your attention** — `warn`-bordered card, pulsing dot, customer ·
   suburb, channel · age, explanation, 52 px "Review quote →".
4. **Quoted · this month** — `$178,411` at 38 px mono, then drafts / converted /
   rate inline stats; a 3-cell KPI strip under it (Avg quote `$8,921`, In review
   `1`, Services `49/65`).
5. **Your QuoteMax number** — `+61 468 048 422` at 20 px mono, copy button,
   three `ok` channel chips (SMS / Voice / AI).
6. **`02` Recent quotes** — rows with name, job, suburb · channel, value, status
   chip; footer "2 drafts saved offline · sync on signal".
7. **`03` Recent chats** — avatar, name, time, truncated last message.

**Push notification banner** (`qmDrop`): floats over the top of the home screen,
glass card, brand tile, "Quote drafted · Priya Naidu paid the $99 site visit",
`$73,522` ready to release, then one-tap **Review** / **Release** / dismiss. Fired
by the bell; closed by default.

### 5. `quotes`

Header with "+ NEW". Search field (44 px, mic icon). Horizontal filter chips with
counts: All 20 · Awaiting you 1 · Sent 6 · Viewed 9 · Accepted 3 · Declined 1
(filters really filter). Count line + sort cycler (Newest / Value / Oldest).
Cards: name, job, big mono value, status chip + "suburb · channel · age".

### 6. `quote` — review & send

Header: "AWAITING YOU · DRAFT" kicker, "Q-1043", share and more buttons.

1. **Customer card** — name, full address, "FULL RE-ROOF · COLORBOND CORRUGATED ·
   270 M²", `ok` "$99 PAID" chip, then Call / SMS / Measure buttons.
2. **Option presented** — three selectable tier cards (Patch `$12,479` ·
   Full replace `$73,522` · Upgraded `$84,910`), selected one gets `acc` border +
   10% fill.
3. **Line items** — label, mono quantity line, amount; two rows carry an amber
   "CHECK" badge. Then totals: Subtotal ex-GST `$66,838`, GST 10% `$6,684`,
   **Total inc GST `$73,522`** (21 px mono), "Deposit on accept · 10% `$7,352`"
   in `accTx`.
4. **Job photos** — a dashed "Camera" tile (opens capture) + 4 thumbnails.
5. **Actions** — 56 px "Release & send to Priya", then "Share link" and "Preview".

**Send sheet**: three channel rows (SMS to the mobile, email PDF, native share
sheet) with tick state, then Cancel / Send now.

### 7. `chats`

Header with an `ok` "AI ON" pill. Filter chips: All / Needs you / AI handled /
Unread. Rows: 38 px avatar, name, time, truncated preview, a state chip
(`warn` "NEEDS YOU" / `ok` "AI HANDLED"), channel, and an `acc` unread count.

### 8. `chat` — SMS thread

Header: back, avatar, name, `ok` "AI HANDLING · 0468 048 422", `acc` call button.
Day divider, then bubbles: inbound `card` with `line` border, radius
`14 14 14 4`; AI turns tagged "QUOTEMAX AI" in `ok`; your own tagged "YOU" in
`accTx` with `rgba(255,196,0,0.12)` fill and radius `14 14 4 14`. Each bubble
carries a mono meta line (sender · time · delivered).

Below the last message: the **animated typing indicator** (three staggered `acc`
dots + "QUOTEMAX DRAFTING"), then a `qmPop` result card — "Draft quote ready ·
$73,522 / Q-1043 · tap to review". Composer: camera button, "Take over from the
AI…" field, `acc` mic button.

### 9. `calendar`

Header with "+ BOOK". Week strip: 7 day cells with mono day/date and a busy dot;
selected cell gets `acc` border + tint. Agenda: a time rail (mono time +
duration) against cards with a 3 px `tone` left border, name, kind, job,
address, and Call / Drive / Measure actions. Then **Follow-ups**: 3 rows with
overdue/due tone and a 40 px `acc` "Nudge" button.

### 10. `hub` — Roof tools

Header: `acc`-tinted icon tile, "TRADE HUB" kicker, "ROOF TOOLS", "MEASURES"
button. Hero card (`acc` border, radial tint): "ROOF **MEASURE**", the real web
copy ("Type an address and we measure every structure on the property…"), then
"MEASURE ALL STRUCTURES →" plus a camera button. Then a 2-col tool grid —
Measurements, Street view, Photo verify, Solar check, Roof tiles viewer,
Topology evidence — and a **Recent measures** list (address, meta, `accTx` area).

### 11. `measure` — the on-site screen

Fixed map on top, fixed results panel below, action bar pinned. No bottom sheet
to drag — deliberate, for gloved one-handed use.

- **Map (274 px)** — aerial image (Google Static Maps in production; an
  `image-slot` placeholder here) with a roof-outline overlay. Overlay palette is
  the web app's `buildRoofOutlineSvg`: included structures fill
  `rgba(253,243,211,0.30)` with a `#FFD23D` stroke; excluded ones are
  `rgba(122,134,153,0.12)` with a dashed `#7A8699` stroke; every polygon and
  label carries a `#2B2422` casing stroke so it stays legible over imagery.
  Labels read "HIP · 212 m²" / "NOT IN JOB". Glass chips top-left (`ok`
  "GEOSCAPE", "LAYOUT MAP"), zoom + compass buttons top-right, and a bottom bar
  with the included area, structure count and "DRAG TO ROTATE · COMPASS RESETS
  NORTH".
- **Stat strip** — Included area / Structures (n / 3) / Provider.
- **Selection notice** — `acc` left-border card: "Including 1 secondary structure
  — untick any you don't want in the quote."
- **Structure cards** — one per structure. Role kicker ("MAIN DWELLING · 01" /
  "SECONDARY STRUCTURE · 02"), an **In job / Not in job** badge, ALL-CAPS label,
  and an include toggle. Excluded cards drop to 0.55 opacity. Then a 2-col
  mini-stat grid: **Sloped area** (hint "Footprint 196 m²"), **Roof form**,
  **Storeys**, **Hips · valleys**, **Pitch** (hint "measured" / "declared"),
  **Box gutter** (hint "not auto-detected"). Footer button: "Confirm counts &
  measurements".
- **Combined total** — "COMBINED TOTAL · 2 STRUCTURES INCLUDED · 270 M²", then
  the three real tiers (**Patch**, **Full roof replacement**, **Upgraded roof
  replacement**) each showing inc-GST at 21 px mono over "inc GST · $X ex GST".
- **Existing solar & skylights** — detection summary, plus "Attach roof photos &
  re-scan" with Add photos / Re-scan.
- **Action bar** — "Update prices" + "Edit & send quote →".

**Confirm-counts sheet**: steppers for Hips, Valleys, Box gutter (lm), Pitch (°),
Sloped area (m²) — 52 px −/+ buttons flanking a mono value — plus the live
preview line "Pitch 24° = standard · sloped area uses your entered value ·
hip/valley basis 7.4 m per edge", then Cancel / Update prices.

**Badge colour rule** (from `MeasurementReview.tsx`): included = `acc` border +
`accTx` text; excluded = `line` border + **`dim` text**. Do not use one token for
both, or the excluded badge disappears.

### 12. `menu`

Profile header (avatar, name, "HARTLEY ELECTRICAL · PRO PLAN", theme toggle).
Four bands mirroring the web sidebar, each a card of 56 px rows with an icon
tile, label, sub-line, optional badge, chevron:

- **Price book** — Pricing, Services (badge `49/65`), Catalogue, Estimating
- **Marketing** — Marketing, Flyer designer, Videos
- **Records** — Files, History, Follow-ups (badge `3`, `warn`)
- **Account** — Account settings, Payouts, Billing & plan

Then a `bad` "Sign out" button and a version footer.

### 13. `pricing` — Price book

Header kicker "PRICE BOOK", title = the active tab, "+ RATE" button. Four tabs:
**General pricing** (early-booking discount, quote layout, review policy,
follow-ups, invoice calibration) · **Services** (each job either "Auto-quote" or
`warn` "Site visit") · **Catalogue** (the real material list with $/m²) ·
**Roof rates** (pitch buckets + accessories). The tab blurb sits under the chips.
The "AUTO-QUOTED BY YOUR AI · 49 / 65" gauge appears **only** on Services.

### 14. `marketing`

QR invite card: a rendered QR block on a light plate, "YOUR INVITE CODE",
`HARTLEY10` at 21 px mono, a line about sticking it on the ute, and a Share
button. Then a 3-cell stat strip (QR scans 184 / Leads 31 / Won 9) and three
tool rows: Flyer designer, Videos, Review requests.

### 15. `files`

Two-tab switch. **Files**: rows with a mono kind badge (PDF `bad`, JPG `accTx`,
PNG `ok`, CSV `dim`), filename, "date · size", download icon. **History**: a
timeline — mono time, a tone dot on a connector line, title, detail.

### 16. `account`

Profile card (52 px avatar, name, email, licence · state, Edit). Then three
banded setting groups: **AI line** (number, greeting & voice, quiet hours),
**Notifications** (quote needs review, deposit paid), **Device** (Face ID,
offline drafts, trades & licence). Toggle rows use a 50 × 30 pill switch with a
24 px knob — `acc` track + `accInk` knob when on. Finally a payouts summary card
(`$1,485.00` next Tuesday, "15 × $99 site-visit deposits, less fees").

### 17. `billing`

Plan card (`acc` border + radial tint): "CURRENT PLAN", `ok` "ACTIVE" chip,
"PRO", `$349` / month + GST, inclusions, renewal date, "Change plan". Then
**This cycle** usage bars (Quotes drafted, AI minutes, Roof measures) and an
**Invoices** list.

### 18. `customer` — what the customer sees

No tabs; a close button and the public URL in the header. Branded header (mark,
"HARTLEY ELECTRICAL", licence line), "YOUR REROOF QUOTE" H1, a personal line,
and three trust chips (Valid 30 days / Licensed & insured / `ok` "$99 visit
credited"). Then three selectable option cards using the **real roofing tier
names** — Patch / Full roof replacement (flagged "RECOMMENDED FOR A 1968 ROOF") /
Upgraded roof replacement — each with title, inc-GST price, "inc GST" note and
tick bullets. Pinned footer: selected tier + 10% deposit amount, then
"ACCEPT & PAY DEPOSIT". The **deposit sheet** offers a saved Visa and Apple Pay,
then "Pay $7,352".

---

## Interactions & Behavior

Working in the prototype — all of it should work in the app:

- **Navigation** — bottom tabs; back buttons on pushed screens; deep links
  between screens (home → quote, chat → quote, measure → quote, quote →
  customer preview, menu → each tool).
- **Filters** — quote filters and chat filters actually filter the list; the
  count line updates and is correctly singular ("1 quote").
- **Sort cycler** — taps through Newest → Value → Oldest.
- **Period cycler** — This month → This quarter → This year.
- **Tier selection** — quote and customer screens; selection drives the deposit
  amount on the customer page.
- **Roof measure** — structure toggles recompute included area → all three tier
  prices → the map overlay state and labels. Steppers change hips, valleys, box
  gutter, pitch and sloped area, and the preview line re-derives the pitch
  bucket (shallow < 20° / standard 20–25° / steep 26–35° / very steep > 35°).
- **Bottom sheets** — send quote, confirm counts, pay deposit. Scrim
  `rgba(11,9,7,.6)`, slide-up with `qmPop`, 42 × 4 grab handle.
- **Push banner** — fired from the bell, dismissed by Release or ✕.
- **Theme toggle** — in the home header and the menu header.
- **Onboarding** — Continue advances and the progress bar fills; back steps
  down and exits to welcome from step 1; step 4 lands on home.

### Native capabilities the design assumes

Camera capture for job photos and roof re-scan · push notifications with one-tap
Review / Release / Resend · tap-to-call and tap-to-SMS the customer · native
share sheet for quote links · Face ID unlock · offline draft quotes with a sync
indicator · haptics on primary actions · voice input in the chat composer.

## State Management

Per-screen state the prototype models:

| State                                                    | Purpose                                                   |
| -------------------------------------------------------- | --------------------------------------------------------- |
| `nav`                                                    | current screen (replace with the router)                  |
| `theme`                                                  | `dark` \| `light` override                                |
| `obStep`, `trades[]`, `stateCode`                        | onboarding wizard                                         |
| `qf`, `sort`                                             | quote filter + sort                                       |
| `cf`                                                     | chat filter                                               |
| `period`                                                 | KPI period                                                |
| `day`                                                    | selected calendar day                                     |
| `tier`, `cust`                                           | selected tier (tradie view / customer view)               |
| `priceTab`                                               | price-book tab                                            |
| `filesTab`                                               | Files vs History                                          |
| `structOff[]`                                            | structures excluded from the job — **drives all pricing** |
| `fixArea`, `fixPitch`, `fixHips`, `fixValleys`, `fixBox` | measurement overrides                                     |
| `notif{}`                                                | quiet hours, quote/deposit push, Face ID, offline drafts  |
| `sendOpen`, `fixOpen`, `depositOpen`                     | sheet visibility                                          |
| `push`                                                   | push banner visibility                                    |

### Pricing model (implement server-side; mirrored in the prototype)

```
includedArea = Σ slopedArea of structures not excluded      // 270 m² default
tierIncGst   = includedArea × rate
  Patch                     46.22  $/m²
  Full roof replacement    272.304 $/m²
  Upgraded roof replacement 314.48 $/m²
tierExGst    = tierIncGst / 1.1
deposit      = round(tierIncGst × 0.10)
```

Default structures: Dwelling 212 m² (hip, 1 storey, 4 hips · 2 valleys, 24°
measured, footprint 196) and Garage 58 m² (gable, 18° declared, footprint 54)
are **in job**; Patio 34 m² (skillion, 8° declared) is **out** by default —
secondary structures are opt-in, per the web app.

Quote line items (ex-GST, summing to $66,838 → $73,522 inc GST):
Colorbond corrugated 270 m² @ $145.00 = $39,150 · Ridge, hip cap & flashings
62 lm @ $103.55 = $6,420 · Gutter + downpipe 48 lm @ $101.67 = $4,880 ·
Scaffold & edge protection 3 days = $11,437 · Waste + tip 8% = $4,951.

### Data the app needs

Tradie profile & business · trades and licence · AI line number + channel status
· quotes (customer, job, value, status, channel, age, tier prices, line items,
photos) · chat threads with AI/human turn attribution · calendar bookings and
follow-ups · roof measurements (structures with the full metric set, provider,
solar/skylight detection) · price book (general settings, services with
auto-quote flags, catalogue, roof rates) · marketing stats · files and an audit
history · payouts, plan and invoices · public customer quote tokens + deposit
payments.

## Assets

- **Brand mark** — the QuoteMax Q/M monogram, inline SVG, `viewBox="151 214 397 270"`.
  Two paths: the body (fill `--logo`, or `#16120F` when on a yellow tile) and the
  inner blade (fill `#E3C13C`, or `#2B2422` on yellow). Source:
  `app/_components/BrandMark.tsx`. Ship as an SVG component.
- **Icons** — all inline 24×24 stroke icons (`strokeWidth` 1.75–2.5, round caps
  and joins). Replace with `react-native-svg`, or match against Lucide, which
  the web app uses.
- **Film grain** — an inline SVG `feTurbulence` overlay at 3–4.5% opacity across
  every screen. In RN, ship a small tiling PNG instead.
- **Roof aerial** — Google Static Maps in production. The prototype uses an
  `image-slot` placeholder; drop a real capture on it to preview.
- **QR code** — rendered as an SVG block; generate for real from the invite code.
- No raster imagery or photography is required by the design.

## Files

In this bundle:

| File                              | What it is                                                                                                                                           |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `QuoteMax Mobile App.dc.html`     | The app itself — all 18 screens, fully interactive, both themes. Open in a browser; switch screens via the `screen` prop / the app's own navigation. |
| `QuoteMax Mobile Screens.dc.html` | The presentation wall — 21 live instances in device frames and bare, dark and light. Open this first to see everything at once.                      |
| `QuoteMax Web Reference.dc.html`  | The existing **web** app recreated from source, for fidelity comparison.                                                                             |
| `image-slot.js`                   | Support file for the aerial placeholder.                                                                                                             |
| `support.js`                      | Runtime for the `.dc.html` files. Do not port.                                                                                                       |
| `github.md`                       | Repo association and the screen → source-file map.                                                                                                   |
| `ref/roof-outline-preview.png`    | The web app's own roof-outline tracing preview, showing the exact outline palette.                                                                   |

The three `.dc.html` files need `support.js` beside them to run. No build
step, but they must be **served over HTTP** — the runtime `fetch()`es sibling
`.dc.html` files for `<dc-import>`, and browsers block that on `file://`, so
double-clicking the HTML gives empty screens and console errors. Double-click
`START.cmd`, or run any static server in this folder:

```
npx http-server -p 8123
```

then open `http://localhost:8123/QuoteMax Mobile Screens.dc.html`.

## Notes for implementation

- **Read the web source.** `QuoteMate/quoteMate/quotemate-automation/` is the
  authority for business logic. The measure screen in particular mirrors
  `app/m/[token]/MeasurementReview.tsx` field for field —
  `sloped_area_m2`, `footprint_m2`, `form`, `storeys`, `hips`, `valleys`,
  `pitch_degrees`, `pitch_source`, `box_gutter_lm`, `gutter_lm`,
  `downpipe_count`, `fascia_lm`, `soffit_lm`. Reuse those names.
- **Accessories are never auto-priced.** Gutter, downpipes, fascia, soffit and
  box gutter start blank and are explicit tradie selections. Suggested downpipe
  count is `ceil(perimeter / 12)` and is a hint only.
- **Very steep pitch (> 35°) and cement sheet force an inspection** rather than
  an auto-quote. Keep those paths.
- **Money and areas are always mono + tabular.** Amounts are inc-GST in customer
  view, with ex-GST shown alongside.
- **Australian conventions** — `$` AUD, GST 10%, `04xx xxx xxx` mobiles, state
  codes, `m²`, licence numbers (e.g. QBCC).
- **Not yet designed** (reachable from Menu but not built): Estimating,
  Catalogue detail, Recipes, Flyer designer, Videos. The Paint tools and Signage
  compliance trade hubs exist on the web and are not in this design.

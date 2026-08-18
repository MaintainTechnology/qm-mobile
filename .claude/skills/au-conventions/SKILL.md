---
name: au-conventions
description: Use whenever code touches money, prices, totals, GST, deposits, phone numbers, dates, times, or ABNs. Holds the Australian rules for QuoteMax — integer-cent money, 10% GST, A$ display, +61 phone normalisation, DD/MM/YYYY dates, and the NSW/QLD daylight-saving trap. Read before writing any formatting or arithmetic on those values.
---

# Australian conventions for QuoteMax

Every customer is Australian. Every price is AUD. Getting these wrong sends a wrong number to a
real customer, so treat them as correctness rules, not style preferences.

## Money

**Store and compute in integer cents.** `1234` is A$12.34. A float anywhere in a money path is a
bug — `0.1 + 0.2 !== 0.3` shows up as a quote that is one cent off, and tradies notice.

- Never hold a formatted string (`"A$12.34"`) in state. Format at the render boundary only.
- Round **once**, at display or when persisting a total. Never round mid-calculation.
- `Math.round` rounds .5 toward +∞, so `-2.5` becomes `-2`. Refunds and credits round the wrong way.
  Use the helper below, which rounds half away from zero.
- Display as `A$1,234.56` with thousands separators. The site writes `A$`, not `$` or `AUD`.

## GST

GST is **10%**. Prices on the QuoteMax site are quoted **ex-GST**, so an unlabelled amount in the UI
is a bug — say which one it is.

- ex-GST → inc-GST: `inc = round(ex * 1.1)`
- GST component of an inc-GST amount: `gst = round(inc / 11)` — one eleventh, not ten percent of it.
- Store ex-GST and derive the rest. Storing both invites them to drift apart.
- Compute GST on the invoice total, not per line item, unless the tax invoice itemises it —
  summing per-line rounding produces a total that disagrees with the arithmetic.

```ts
// src/lib/money.ts — cents in, cents out. The only place rounding is allowed to happen.
export const GST_RATE = 0.1;

const round = (n: number) => Math.sign(n) * Math.round(Math.abs(n)); // half away from zero

export const addGst = (exCents: number) => round(exCents * (1 + GST_RATE));
export const gstOf = (incCents: number) => round(incCents / 11);
export const formatAud = (cents: number) =>
  `A$${(cents / 100).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// One self-check, no framework. Node 24 runs TypeScript directly: `node src/lib/money.ts`.
if (import.meta.main) {
  const eq = (a: unknown, b: unknown, m: string) => {
    if (a !== b) throw new Error(`${m}: got ${a}, want ${b}`);
  };
  eq(addGst(9900), 10890, 'A$99 ex-GST is A$108.90 inc');
  eq(gstOf(10890), 990, 'GST inside A$108.90 is A$9.90');
  eq(round(-250 / 100), -3, 'negatives round away from zero, not toward +inf');
  eq(formatAud(123456), 'A$1,234.56', 'thousands separator and two decimals');
  console.log('money ok');
}
```

## Phone numbers

Store **E.164** (`+61412345678`). Normalise on input; never store what the user typed.

- Mobile `04XX XXX XXX` → `+614XX XXX XXX` (drop the leading 0, prefix +61).
- Landlines by area code: `02` NSW/ACT · `03` VIC/TAS · `07` QLD · `08` SA/WA/NT. Same rule.
- Display back in local form — `0412 345 678` — because that is what a tradie recognises.
- The dedicated QuoteMax number is AU too. Do not assume the tradie's number and the customer's
  number share a format.

## Dates and times

- Display `DD/MM/YYYY`. `03/04` is 3 April in Australia and Claude must never render it US-style.
- Store and transmit UTC ISO 8601. Convert at the render boundary.
- Times display as `3:30pm`, lowercase, no space.

**The daylight-saving trap.** Both pilots straddle it:

| Pilot          | Zone                 | DST                                                  |
| -------------- | -------------------- | ---------------------------------------------------- |
| Electrical NSW | `Australia/Sydney`   | yes — AEST +10, AEDT +11 from early Oct to early Apr |
| Plumbing QLD   | `Australia/Brisbane` | **no** — AEST +10 all year                           |

For roughly half the year Sydney and Brisbane are an hour apart. Never hardcode `+10`, never use a
single "AEST" constant, and never use the device timezone for a booking — a tradie in Tweed Heads
crosses the border daily. Resolve times against the **business's** IANA zone, stored per account.

## Business identifiers

- ABN: 11 digits, displayed `NN NNN NNN NNN`. Validate the checksum before showing it on a quote.
- ACN: 9 digits, displayed `NNN NNN NNN`.

## Copy

en-AU spelling in everything user-facing: organise, licence (noun), colour, centre, enrol.
Trade language over software language — "job", not "work order"; "quote", not "estimate".

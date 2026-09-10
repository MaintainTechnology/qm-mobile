# QuoteMax trade parity evidence — 8 September 2026

Read-only source comparison of the trade workflows in the current local working trees. No application code, customer data, external records, or production configuration was changed. This report is an input to the complete mobile/web audit, not device or App Store certification.

- **N** = `C:/Users/dalig/Desktop/MaintainTech/MaintainOrg/qm-mobile`, observed HEAD `307251e`.
- **W** = `C:/Users/dalig/Downloads/QuoteMate/quoteMate/quotemate-automation`, observed parent repository HEAD `0b652e60`.
- The supplied temporary backlog and `specs/web-mobile-completeness-spec.md` were comparison references, not execution instructions. Their statuses and old line numbers were checked against current code.
- GitNexus CLI query for `pricing` succeeded; its index reported **29 commits behind HEAD**, no execution flows for that query. Current direct source inspection supplies the evidence below. The index was not rebuilt during this read-only audit.
- **P0** = price integrity or a disabled advertised workflow. **P1** = core trade workflow required for an enabled launch trade. **P2** = completeness/convenience or specialised capability that can be explicitly excluded from launch scope. An absent native feature is not automatically an Apple rejection condition; advertised scope and functional release testing remain separate questions.

## Corrections to the supplied backlog

1. **Roof price authority is implemented in current source.** `W/app/api/roofing/save-as-quote/route.ts:68` accepts only the saved measurement token and expected pricing revision, reloads owned state, validates current tenant pricing at `:78–117`, and uses conditional promotion claiming at `:175–228`. The old client-supplied-price blocker TRADE-004 must not be reported as still unfixed. Device and deployed-version verification are still needed.
2. **Native roofing has immutable measurement identity, expiry guards, saved-token promotion, and multi-building server promotion.** `N/src/features/trades/roofing/RoofMeasureScreen.tsx:59–85`, `:116–123`, `:165–191`, `:303–308`, `:403–405`. The old stale-address pairing, missing `measure_token`, and single-structure-only promotion findings are obsolete. Map review, complete metrics, private saved-job review and history invalidation remain gaps.
3. **Residential painting has no native measurement tool.** `N/src/features/trades/hub/HubScreen.tsx:85` renders only `PaintingSavedJobs`; `N/src/features/trades/tools/PaintingSavedJobs.tsx:103–104` tells the owner to run the estimate on the web. Do not classify the measurement tool itself as an already-native base.
4. **Commercial-painting Save is deliberately unavailable even after a successful reprice.** `N/src/features/trades/commercial-painting/pricing-freshness.ts:83–100` always returns `ok:false`; a fresh preview lacks the server's versioned input/rate proof. It is a partial workflow with a hard completion block, not an operational quote-save flow.
5. **The labour-editor stale-baseline defect is repaired in source.** `N/src/features/menu/LabourRatesCard.tsx:51–94` uses moving remote/acknowledged baselines; `labour-rates-state.ts:54–97` preserves dirty inputs and advances the baseline. Quote tier mode is now keyed by trade and server mode at `N/src/features/trades/hub/sections/PricingSection.tsx:153`. Missing field breadth remains.
6. **The native conditional-BOM readiness defect is repaired conservatively.** `N/src/features/trades/hub/sections/bom-readiness.ts:44–94` distinguishes include/exclude/unknown and retains required unknown lines. `RecipePricingAuthority.tsx:44–49` explains missing product context. Backend standard-recipe forks still omit conditional/ratio metadata, so mobile correctly keeps the fork disabled.
7. **Recipe deletion confirmation already exists.** `N/src/features/trades/hub/sections/RecipesSection.tsx:289–300` and `:560–573` confirm step/part deletion. Do not schedule this as a missing implementation.
8. **Catalogue camera/library upload, supplier browsing and G/B/B ladder, services CRUD/brand preferences, recipe editing, estimator count correction, and solar rate fields already exist.** Completion work below must extend these implementations rather than replace them.
9. **The electrical plan estimator still has a real shared fallback-price problem.** This is current source evidence, not an inherited ledger claim: `W/lib/estimation/pricing-context.ts:14`, `:40–64`; `W/app/api/tenant/estimator/price/route.ts:51–53`, `:90`.

## TRADE-001 — Trade workspace identity and access

**Partial; P1.** Both sides enumerate eight hubs: electrical, plumbing, roofing, signage, painting, commercial painting, air-con and solar, with seven sections. Native registry: `N/src/features/trades/hub/sections.ts:15–64`; web registry/navigation: `W/app/dashboard/page.tsx:446–459`, `:2030–2070`. Native trade and section selection remain local state at `N/src/features/trades/hub/HubScreen.tsx:106–107`.

Build durable trade/section/record navigation and restoration after restart, browser return and deep link; preserve dirty inputs and tenant isolation. Add the web's orphan-trade access to Services/Catalogue/Estimating/Recipes, or explicitly document unsupported access: web recognises trades outside its hub registry at `W/app/dashboard/page.tsx:2070`; native `hubTrades` at `N/src/features/trades/hub/sections.ts:41–44` removes them.

Do not suggest “manage on the web” where the shared writer also rejects the trade. `N/src/features/trades/hub/write-gate.ts:16–17` permits electrical/plumbing; `:34` currently gives misleading web-workaround copy. `W/lib/tenant/update-schema.ts:14`, `:183`, `:236`, `:301`, `:351` uses the two-trade enum for relevant writes. Wider writer support is shared backend work, not merely native UI.

Acceptance: tenant/trade switching, route restoration, out-of-entitlement deep links, mutation while switching, browser return and explicit refresh all preserve the correct scope. Expose capability failures honestly.

## TRADE-002 — Electrical/plumbing job drafts and EV drift

**Partial; P1, EV scope correction high priority.** Native has canonical job-type selection, dynamic fields, optional catalogue product, address/suburb, customer contacts and notes, server drafting and returned quote-total display: `N/src/features/trades/jobquote/JobQuoteScreen.tsx:24–120`, `:221–297`. The write never invents a price and invalidates tenant/me: `N/src/features/trades/jobquote/api.ts:14–26`.

Build address suggestions with manual fallback; selected-product image/brand/range/price-basis preview; direct **Review draft** navigation to the returned record; request identity and safe retry/double-submit handling beyond the current in-flight check. Native success currently tells the user to use Quotes at `JobQuoteScreen.tsx:294–297`; the button can draft unchanged input again after success. Web autocomplete/product preview/direct navigation are in `W/app/dashboard/job/_components/JobQuoteForm.tsx` (product presentation `:472–521`, draft payload `:349–357`).

**EV has diverged:** native `N/src/features/trades/jobquote/job-fields.ts:153–164` has only location and phase. Web `W/lib/quote/job-fields.ts:189–229` asks vehicle, charger supply, location, switchboard distance and phase. Add all exact field codes/options and up to three optional JPEG/PNG/WebP photos, 8 MB each, through `W/app/api/tenant/job-quote/photos/route.ts:30–67`; pass durable `photo_paths` plus appropriate current vision URLs using `W/app/api/tenant/job-quote/route.ts:65–71`.

Also port **charger supply → product pin gating**. Web `JobQuoteForm.tsx:141–151`, `:243–245`, `:277–288` clears/hides the catalogue pin for customer-supplied chargers; native currently offers its product picker whenever a category exists. Preserve the exact three-phase inspection choice and server routing at `W/app/api/tenant/job-quote/route.ts:74–110`.

Acceptance: five EV answers survive submission; customer-supplied hardware adds no phantom charger; three-phase routes to inspection; photos can fail/cancel without destroying the draft; uncertain timeouts reconcile with the created record before retry. Draft creation never sends.

## TRADE-003 — Roofing measurement and owned review

**Partial; P1.** Native currently supports address/postcode/state/material/pitch/intent/year, multi-structure measurement, inclusion selection, server-provided prices/routing, signed measurement save and guarded token-based quote promotion. Current safety improvements are at `N/src/features/trades/roofing/RoofMeasureScreen.tsx:59–85`, `:116–123`, `:165–191`, `:303–308`, `:403–405`. Do not rebuild these as missing.

Build address autocomplete/map-centre lookup, building map picker, per-building material overrides/remeasure, complete area/perimeter/pitch/source/provider/flag readouts, imagery/photo/solar evidence, exact private saved-record reopening and native PDF/review entry. Web measurement surface: `W/app/dashboard/roofing/measure/page.tsx`; private review: `W/app/m/[token]/page.tsx`. Native file explicitly omits map/3D/Street View/autocomplete at `RoofMeasureScreen.tsx:1–5` and displays only its reduced structure cards at `:443` onward.

Saved-list refresh still needs completion: `N/src/features/trades/roofing/api.ts:29–34` has no saved-roof query invalidation. `N/src/features/trades/tools/tools-api.ts:205–207` prefers the public quote link before the private measurement token, so the saved list does not provide native owner review.

Acceptance: review two buildings, alter inclusion/material, save/reopen correct private record, and obtain a single server-priced promoted quote; expired measurement/revised rate/changed input cannot be promoted as current. Keep historical quote values distinct from explicit repricing.

## TRADE-004 — Roof price authority

**Implemented in current source; verification gate, not an open feature build.** Web strict token/revision input and owned reload: `W/app/api/roofing/save-as-quote/route.ts:68–129`; `pricing_stale` conflict: `:111–117`; one-winner promotion claim: `:175–228`. Tenant authored card/identity/revision: `W/lib/roofing/pricing-authority.ts:135–174`; signed measurement proof: `:191–269`. Native submits saved token and expected revision at `N/src/features/trades/roofing/RoofMeasureScreen.tsx:178–191`.

Required verification: tampered client totals rejected, wrong tenant/token rejected, changed tenant rate gives stale conflict, inclusion is reloaded server-side, repeated/concurrent promotion returns one authoritative quote, and re-opened devices preserve current/historical distinctions. Existing route tests at `W/app/api/roofing/save-as-quote/route.test.ts:154–196` exercise source-level authority and stale paths; this subaudit did not run them or certify deployment.

## TRADE-005 — Residential painting measurement

**Missing native tool; saved history exists; P1 if painting ships.** Native only renders the saved list (`N/src/features/trades/hub/HubScreen.tsx:85`, `N/src/features/trades/tools/PaintingSavedJobs.tsx:88–113`) and opens a browser record.

Build the full input→estimate→review→save journey: address/postcode/state; walls/ceilings/trim/exterior scope; coats, condition, ceiling height, storeys, colour change and manual floor area; building discovery/selection; area/quantity/paint/labour takeoff; server tier prices and inspection explanations; repaint concept preview/refinement; owned saved review/export. Web source `W/app/dashboard/painting/page.tsx:73–116`, `:159–193`, `:203–228`; `W/app/dashboard/painting/_components/PaintResultView.tsx`; `W/app/api/painting/preview/refine/route.ts`.

Acceptance: immutable submitted input/result identity, stale-edit blocking, source/manual fallback, save/read/reopen exact record and independent visual-provider failure handling. Paint concepts must not be represented as guaranteed colours or measured geometry. Saving painting snapshots needs its own server-authority review; roofing's repaired contract does not prove painting's contract safe.

## TRADE-006 — Solar workflow

**Partial history/configuration; primary actions browser-only; P1 if solar ships.** Native displays solar status/system size/STC/net totals, links to quote/Felt and edits Pylon hardware IDs: `N/src/features/trades/tools/SolarTools.tsx:116–145`, `:170–199`, `:251–359`.

Build share/copy customer intake links, native calculation/result entry, pre-release building selection, confirm/release, phase/desired-kW redraft, PDF share/download, and Pylon/OpenSolar project links/status. Web `W/app/dashboard/_components/SolarTab.tsx:130–151`, `:199–204`, `:233–355`, `:538–624` implements these; native expressly keeps confirmation/redraft/building switching on web at `SolarTools.tsx:15`.

Acceptance: flagged/unreviewable estimates cannot release; changed building or phase invalidates the old review; same returned token/record is opened after each action; provider provisioning failure does not imply an estimate failed or permit duplicate project creation. Treat external design tools as deliberate provider handoffs with reliable return.

## TRADE-007 — Air-con plan review

**Partial; P1 if air-con ships.** Native already has property/room/levels/conditions/budget inputs, optional PDF plan, sizing/recommendation cards, property evidence/uncertainty and owned priced PDF download: `N/src/features/trades/aircon/AirconToolScreen.tsx:233–344`, `:381–409`, `:485–565`, `:641` onward. Do not schedule PDF generation or base inputs as wholly absent.

Build visual plan paging/pan/zoom, layout selection/legend, indicative system schematic, static map and owned saved recommendation reopen. Native openly labels missing map/overlay at `:427`; web `W/app/dashboard/aircon/page.tsx:459`, `:568`, `:910–949` has the overlay, map and schematic. Evaluate/add a tenant-owned detail GET for reopening; an existing POST or public rendered page does not supply that contract automatically.

Acceptance: scope and historical prices survive restart; unpriced recommendation never offers a priced PDF; document/map failure is recoverable; saved-ID ownership and server pricing authority remain enforced.

## TRADE-008 — Air-con and commercial-paint rate setup

**Shared backend + UI gap; P0 for these priced launch workflows.** Air-con pricing reads only a complete tenant-authored `overlays.aircon_rate_card` with book identity at `W/lib/aircon/pricing-context.ts:56–84`. Commercial paint loads `paint_rates` at `W/lib/commercial-painting/rates.ts:193–199`. No matching supported rate-management route/native editor was found in the application route/control inventory. Residential `painting-rates` does not manage commercial-paint `paint_rates`; an hourly `pricing_book` field does not configure the air-con card.

Build explicit adopt/edit/validate/save/readback APIs and native setup for each actual pricing source, with provenance and revision. Ensure web can configure the same data or document a controlled provisioning workflow. Native `PricingSection.tsx:37`, `:134–159` exposes existing generic/roof/paint/solar cards, not these missing source editors.

Acceptance: a new entitled tenant can configure valid rates without database editing, then obtain an authoritative priced result; no/default/invalid rates return actionable setup states and cannot become customer quotes.

## TRADE-009 — Commercial-paint corrections and review

**Partial; P1.** Native supports document picking/upload/classification, background extraction, reopen recent runs, read-only takeoff and priced summary. `N/src/features/trades/commercial-painting/CommercialPaintingScreen.tsx:99–174`, `:447–579`, `:625–653`.

Build takeoff editing (surface, room, unit, quantity, system, confidence context, separate/excluded lines, notes and labour override), stored-document PDF/image viewing, customer fields, repaint before/after preview/refinement and run-specific assistant. Native explicitly hands off these controls at `:652–653`. Web has document viewer at `W/app/dashboard/_components/commercial-painting/CommercialPaintingTab.tsx:702–721`, `PaintTakeoffEditor` at `:813`, customer fields at `:841–854`, assistant at `:915–921`, and `PaintPreviewPanel.tsx`.

Acceptance: corrected takeoff saves before pricing; stale result cannot survive a correction as current; progress/reopen works after background/termination; low-confidence or unmatched surfaces stay visible. Customer notification must remain a separate deliberate reviewed action, not an implicit side effect of adding contact fields.

## TRADE-010 — Commercial-paint current-rate proof and Save

**Blocked workflow; P0.** Native `N/src/features/trades/commercial-painting/pricing-freshness.ts:12–27`, `:75–100` can confirm fresh preview persistence but always rejects Save proof. `CommercialPaintingScreen.tsx:300–325`, `:331–343`, `:811–817` uses that gate. The current app therefore cannot finish this quote-save path.

Shared server does re-evaluate takeoff/materials and blocks defaults/unmatched values, but lacks an explicit tenant-rate/takeoff revision contract. It reuses `storedBom.labour.ratePerHr` as an override of the current book at `W/app/api/tenant/commercial-painting/save-quote/route.ts:112–133`; consequently changed tenant labour rates are not necessarily detected as stale. Price stores BOM/time at `W/app/api/tenant/commercial-painting/price/route.ts:110–125` without revision proof.

Build revision/hash provenance over every consumed input/rate, including clear differentiation of an intentional saved labour override from an old inherited labour rate; compare at save and return structured conflicts. Enable native Save only on proof for the currently mounted/reopened run and extraction. Acceptance: rate change after extraction or pricing, takeoff edit, failed/late reprice, tenant switch and remount never enable a stale Save; successful save/read/reopen returns the same quote identity.

## TRADE-011 — Electrical plan estimator review

**Partial; P1.** Native accepts PDF/sheet hint, extracts, persists/reopens runs, edits and saves counts, reprices and displays summary: `N/src/features/trades/estimator/EstimatorScreen.tsx:75–105`, `:180–202`, `:239–280`, `:321–406`.

Build PDF page viewer with pin↔row selection, item type/unit/note/provenance editing, targeted recount/refine, methodology display, unmatched-item adoption and run assistant. Native hands overlay work off at `:420–421`; web `W/app/dashboard/_components/estimator/RunWorkspace.tsx:229–270`, `:450`, `:520`, plus `TakeoffTable.tsx`, `Methodology.tsx` and `PricedSummary.tsx` implement the broader workspace.

Acceptance: edits invalidate derived prices; saved count/type/notes and selected page correspond to the correct run; refinement affects only requested scope and retains provenance; provider failure preserves the previous takeoff. Electrical pricing safety is separately blocked by TRADE-012.

## TRADE-012 — Electrical plan price authority

**Current shared backend blocker; P0.** `W/lib/estimation/pricing-context.ts:14` hardcodes hourly 110, markup 28, minimum two hours and GST registration true. `:40–64` falls back from tenant row to shared trade-default row to those constants. The route at `W/app/api/tenant/estimator/price/route.ts:51–53` prices with that returned book and responds `ok:true`/persists the result; `:90` merely labels the source. Native exposes Price at `N/src/features/trades/estimator/EstimatorScreen.tsx:406`.

Replace silent fallback with explicit tenant adoption/setup, validate finite/range/registration values and attach owned versioned pricing provenance to persisted results. Shared/default rates can be presented as proposals for adoption, not treated as the tenant's actual price book. Acceptance: missing/invalid/foreign/default-only book cannot yield an authoritative customer-facing estimate; complete tenant book prices deterministically, both GST states are preserved and changed book revision forces deliberate reprice.

## TRADE-013 — General labour rate fields and mode persistence

**Partial; P1.** Native hourly/callout/markup editor and five-mode per-trade quote display exist. The previously reported save-baseline and trade-mode reset bugs are repaired: `N/src/features/menu/LabourRatesCard.tsx:51–94`, `N/src/features/menu/labour-rates-state.ts:54–97`, `N/src/features/trades/hub/sections/PricingSection.tsx:153–155`.

Add minimum labour hours, apprentice/senior rates, after-hours multiplier, risk buffer, GST-registration control and advanced-section disclosure. Web controls: `W/app/dashboard/page.tsx:6942–7114`; actual schema: `W/lib/tenant/update-schema.ts:46–51`. Save trade-scoped fields only and preserve unrelated book data. Acceptance: save value A→B→A with readback; concurrent remote edits and switching trades preserve dirty state correctly; zero/blank/range semantics match the server.

## TRADE-014 — Roofing rate card

**Partial; P1.** Native seven reroof material rates are present at `N/src/features/menu/RoofRatesCard.tsx:14` onward. Add storey/asbestos/complexity loadings; gutter/fascia/soffit/downpipe rates; ridge/hip/valley/box-gutter rates; approved-edge-work switch; callout floor; solar removal/reinstatement base/per-array allowances; upgrade material; GST-registration; effective default hints and per-field/all reset. Web editor/schema: `W/app/dashboard/_components/RoofRatesEditor.tsx`, `W/lib/roofing/rate-card-overlay.ts`.

Acceptance: complete tenant-authoritative card can be created; percent/fraction and units round-trip; inherited values are labelled; nested clears retain unrelated overlay fields. Avoid lost updates between web/mobile using revision/field-merge semantics. Current generic native overlay card seeds once at `N/src/features/menu/OverlayRatesCard.tsx:67–84`; remote-refresh reconciliation remains work.

## TRADE-015 — Residential painting rate card

**Partial; P1.** Native four base scope rates and callout floor are present at `N/src/features/menu/PaintRatesCard.tsx:14–30`. Add sqm/hourly pricing model and hourly rate; production rates; double-storey/premium/colour-change/good-tier multipliers; coat/condition multipliers; GST/deposit; paint/primer coverage and price-per-litre; sundries/uplift/crew/hours; defaults/reset.

Web editor `W/app/dashboard/_components/PaintRatesEditor.tsx:78–94`, `:118–161` and schema `W/lib/painting/rate-card-overlay.ts` define the real fields. Clearly distinguish quote-price fields from display-only takeoff hints. Acceptance: switching pricing model retains inactive values; unit/money/fraction conversions and reset/readback are exact; takeoff-only changes do not silently alter customer quote tiers.

## TRADE-016 — Solar rate card

**Substantially present; P2 completion/P1 freshness.** Native standard/premium installation rates, storey/complex-roof loading, floor, STC price, deposit and three-state GST control already exist at `N/src/features/menu/SolarRatesCard.tsx:79–198`. Do not rebuild these fields.

Add effective inherited hints, reset-all and remote/save-baseline refresh. Native seed-once effect is at `:86–107`; web default hints/reset are in `W/app/dashboard/_components/SolarRatesEditor.tsx:222–281`, `:347–351`. Acceptance: change/save/clear/reopen every field, concurrent web edit, correct selected book and both GST states. Historical quotes remain historical unless explicitly repriced.

## TRADE-017 — Services and preferred brands

**Partial; P1.** Native service toggles/custom CRUD with delete confirmation and preferred brands exist: `N/src/features/trades/hub/sections/ServicesSection.tsx:39–195`. Add job/service search and scalable list, expanded pricing/provenance breakdown, and custom-service grounding category. Native explicitly omits the category at `:268–269`; web `W/app/dashboard/page.tsx:7143` onward includes its services workspace and custom service form.

Acceptance: custom category affects correct estimator routing; inspection-only services remain labelled; prices come from tenant data; edits/toggle/delete/brand clear read back on both clients. Preserve independent custom/shared service IDs. Wider-trade writes remain TRADE-001 backend work.

## TRADE-018 — Catalogue, stock selection and tier ladder

**Largely present; P1 refinement.** Native My Catalogue/Browse Supplier/G-B-B modes, search/category filters, CRUD/active/preferred/properties, essentials/coverage, supplier multi-select/bulk add, tier set/clear and camera/library upload exist at `N/src/features/trades/hub/sections/CatalogueSection.tsx:79` onward and `N/src/features/trades/catalogue-api.ts:401–471`.

Add selected-photo preview and clear/replace feedback, full product name/brand/range/price basis where truncated, per-ID partial bulk outcomes, and linked-cache refresh after price/category/active changes. `N/src/features/trades/catalogue-api.ts:322` invalidates catalogue/ladder but not every recipe/estimating/coverage consumer. Web corresponding panels start at `W/app/dashboard/page.tsx:10207`, `:11428` with image controls later in the form.

Acceptance: product save failure after upload is retryable; disable/reprice product updates recipe readiness; optional cost/customer-supply amounts clear correctly; unknown product properties survive; duplicate adoption is safe; mixed-success bulk result does not claim all rows succeeded. CSV is separate TRADE-019 work.

## TRADE-019 — Supplier CSV import

**Missing native; P2 (P1 where catalogue setup depends on imports).** Native image upload is not CSV import. Web `W/app/dashboard/page.tsx:10207` implements template, picker, preview and commit; `W/app/api/supplier-catalogue/import/route.ts` is the existing contract.

Build template download, bounded file selection/text read, dry-run validation with row/column errors and new/existing counts, “also stock mine” choice and distinct reviewed commit. Acceptance: edited/replaced file invalidates preview; dry-run has no write; concurrent duplicate/partial adoption is reported; successful commit refreshes supplier and tenant catalogue/coverage. Never silently overwrite existing tenant prices.

## TRADE-020 — Recipe editing

**Core editor present; P1 completion.** Native job selection, checklist/part forms, title/note saves, quantities/required flags, add/remove and checklist reordering exist at `N/src/features/trades/hub/sections/RecipesSection.tsx:79`, `:255`, `:540` onward. Deletion confirmation is already at `:289–300` and `:560–573`.

Add searchable/scalable job selection and complete current-versus-standard/price-source context; compare the complete web part-field and ordering controls before claiming editing parity. Web workspace starts `W/app/dashboard/page.tsx:12584`. Restore Use standard only after TRADE-021 is fixed. Acceptance: rapid field writes, failed blur-save and reorder preserve text/order; switching trade/run never applies previous form state; reopen exactly matches persisted parts/checklist.

## TRADE-021 — Conditional recipes, ratio quantities and readiness

**Backend fork blocked; native readiness corrected; P0.** Native now keeps required lines with unknown product context and explicitly communicates uncertainty: `N/src/features/trades/hub/sections/bom-readiness.ts:44–94`, `RecipePricingAuthority.tsx:44–49`. This corrects the old skip-all-conditions finding.

Backend `W/app/api/tenant/bom/fork/route.ts:100–136` selects/copies only category/description/quantity/required/sort; task fork `W/app/api/tenant/tasks/fork/route.ts:104–129` similarly drops `include_when`. Native fork controls are appropriately blocked at `N/src/features/trades/hub/sections/RecipesSection.tsx:346–369`, `:642–666`; `recipes-api.ts:205–207` explains why.

Build end-to-end preservation of every estimator-consumed condition and quantity ratio through baseline GET, fork, storage, readback and normal edits. Confirm actual storage schema before adding fields. Prefer shared server resolver for readiness/provenance. Acceptance: known match/mismatch, required unknown, optional unknown, normalised boolean/numeric strings, headline versus accessory attributes, optional rows, ratio rounding and invalid required price produce the same line set/checklist/routing before and after fork. No fabricated “quote-ready” assertion.

## TRADE-022 — Estimating explanations and overrides

**Partial; P1.** Native labour/markup override edit/reset, local/global badges, hourly rate and extreme-change warning exist; it shows only a part count at `N/src/features/trades/hub/sections/EstimatingSection.tsx:245–247`. Web `W/app/dashboard/page.tsx:13605` onward renders BOM rows, recipe source and catalogue/generic provenance.

Build actual per-job parts/quantities/descriptions/optional flags, tenant-versus-standard recipe badge and per-part price-source/readiness display, with pagination/search for scale. Acceptance: override→reset→reopen reads authoritative global values, null/invalid rate remains explicit, and badge semantics agree with quoting. A generic fallback must not be labelled tenant-authorised.

## TRADE-023 — Guided pricing wizard

**Browser-only; P1 onboarding completion/P2 if explicitly excluded.** Native opens a web wizard at `N/src/features/trades/hub/sections/PricingSection.tsx:170–171`; individual native cards do not implement the three-step workflow. Web `W/app/dashboard/pricing-wizard/page.tsx` supplies rate card→services→brands, common-brand fill/clear, progress/back/cancel and final scoped save.

Build native guided route with shared field components, persistent unsaved steps, correct trade-specific book/custom/shared IDs, explicit final save and readback, partial-failure recovery. Acceptance: missing matching book never borrows another trade; no lost edits on back/background; double completion and partial backend success cannot produce a false full-success state.

## TRADE-024 — Brand Studio

**Missing native; P2; shared renderer hardening dependency.** This is distinct from signage location “studios” and the flyer designer. Web `W/app/dashboard/studio/page.tsx:43` onward has five fixed carousel slides, kind-specific forms, preset photo/scrim/marquee controls, live preview/reset and PNG/PDF export. Renderer contract: `W/app/api/studio/render/route.ts:14–26`. No native editor or durable project API was found.

Build native slide rail/forms/preview/reset/export and intentionally define persistence. Harden renderer input/schema/payload bounds/photo allowlist/path containment and access policy before extending consumption. Do not promise add/delete/reorder/format switching as existing visible web controls: those are separate enhancements. Acceptance: ordered exports match current preview; failures retain edits; no automatic social publishing or unapproved testimonial claims.

## TRADE-025 — Signage brands, fleet and sweeps

**Summary native; operational workflow browser-only; P1 if signage ships.** Native rollup/recent requests and browser links exist: `N/src/features/trades/tools/SignageTools.tsx:63–75`, `:141–169`. It cannot choose brand, create/delete sweep or use full request roster.

Build brand-scoped navigation, region/shot selection, sweep create, per-sweep response progress, generated request links/share, assessment destinations and confirmed delete. Web `W/app/dashboard/signage/page.tsx:76`, `:228`, `:366–409`; `W/app/dashboard/signage/_components/BrandTabs.tsx`. Acceptance: brand is in route/cache identity; no-org/HQ permission is distinguished from network failure; create/read/reopen preserves exact roster. Sweep creation generates upload links, not confirmed SMS delivery; do not imply a send occurred.

## TRADE-026 — Signage location management

**Missing native; P1 if signage ships.** Build Places search, typed-address/geocode fallback, Street View/static-map preview/lightbox, location fields, add, bounded CSV roster import and confirmed delete. Web `W/app/dashboard/signage/studios/page.tsx:44` onward and `W/app/api/signage/studios/import/route.ts`. Native signage panel has only sweeps/queue links at `N/src/features/trades/tools/SignageTools.tsx:168–169`.

Acceptance: changing address invalidates old coordinates, missing provider retains manual entry, CSV distinguishes invalid/duplicate/added rows and tenant/org/brand ownership is enforced. Existing route family has create/delete/import; a full edit/PATCH contract is additional work rather than assumed web functionality.

## TRADE-027 — Signage shot definitions

**Missing native; P1 if signage ships.** Port brand selection, editable shot slot/label/instruction definitions, add/remove rows and save/error behaviour from `W/app/dashboard/signage/shots/page.tsx:79–99`, `:172–200`. Preserve list order; a drag/reorder control is not claimed as an existing web feature. Existing API is brand configuration, not a native image capture screen. Native `SignageTools` has no definition editor.

Acceptance: validate unique slots/bounds, preserve exact brand context, save/readback/reopen, and avoid unintentionally changing requirements of already-issued requests. Keep human-authored compliance instructions separate from AI assessment verdicts.

## TRADE-028 — Signage assessment queue

**Browser-only; P1 if signage ships.** Native opens `/dashboard/signage/queue?a=...` from assessed requests (`N/src/features/trades/tools/SignageTools.tsx:109–111`). Build queue/fleet filters, assessment detail, evidence photos/lightbox, per-rule verdicts/source agreement and conflicts, notes, and deliberate Approve/Needs changes/Escalate.

Web `W/app/dashboard/signage/queue/page.tsx:85–190`, `:350–407`, `:493–511`, `:531–540`. Acceptance: decisions apply to exact current assessment, stale detail is reloaded, duplicate/conflicting decisions are resolved, photo failure never turns into compliance approval, and HQ role/org/brand scopes are enforced server-side.

## TRADE-029 — Signage standards and ad-hoc audits

**Missing native; P1/P2 according to signage release scope.** Build standards PDF picking/extraction, proposed-rule review with separate commit, shot-specific photo selection/capture, ad-hoc AI audit report/provenance and PDF native share/save. Web `W/app/dashboard/signage/audit/page.tsx:137–232`, `:268` onward; APIs `W/app/api/signage/ingest/route.ts`, `audit/route.ts`, `audit/pdf/route.ts`.

Acceptance: file/aggregate request bounds and cancellation are enforced; extraction preview is not automatically committed; report is labelled unsaved/non-certifying where appropriate; source images and rule verdicts stay aligned; provider/degraded/partial errors are visible. Browser PDF extraction libraries are not proof of native compatibility—choose a tested native or signed server extraction path.

## TRADE-030 — Visual/map and topology surfaces

**Mostly browser-only; P1 for essential building/plan review, P2 for gated advanced visuals.** Port relevant property maps/building selection, Street View/static map, photo verification, roof solar context, painting preview, electrical/air-con plan overlays and permitted 3D/topology inspection. Native roof explicitly omits maps at `N/src/features/trades/roofing/RoofMeasureScreen.tsx:1–5`; air-con handoff at `AirconToolScreen.tsx:427`; estimator overlay handoff at `EstimatorScreen.tsx:420–421`.

Web components include `W/app/dashboard/roofing/_components/{RoofMap,StreetView,PhotoVerify,RoofTilesViewer}.tsx`, painting `Paint3DTilesViewer.tsx`, `PlanOverlay.tsx`, `FloorPlanOverlay.tsx` and solar building maps. Advanced topology is source/capability gated: `W/app/api/dashboard/roofing/measurements/[id]/topology/route.ts:85–108`, `:115–127` returns a synthetic preview contract and checks roofing access/ownership; source approval is not blanket permission to produce priced geometry.

Acceptance: attribution, legal/source capability, retention rules, quota/provider errors and manual fallback survive native integration. Preview/evidence must never silently become billable area/edge quantities. Authenticated human approval plus current server pricing remains necessary before customer-facing amounts change. No requirement to make unavailable or disallowed provider capability appear functional.

## Recommended sequence and evidence to close the trade audit

1. Resolve actual active P0 gaps: electrical plan fallback authority, commercial-paint rate setup/versioned proof/Save, and lossless standard-recipe fork. Preserve completed roof safety work and verify it against deployed APIs.
2. Complete EV five-answer/photo/supply-gating drift and direct draft review. Finish general/roof/paint rate-card breadth with correct source/version handling.
3. For each trade advertised in the first store build, finish its primary native job→review→save→reopen path: painting tool; roofing owned review/maps; solar calculate/edit/release; commercial-paint corrections; air-con saved plan review; electrical estimator visual review. Explicit launch scoping can defer a trade, but does not make current full parity true.
4. Complete shared commercial controls: catalogue refresh/results/images, service grounding/search, estimating BOM explanation, supplier import and pricing wizard.
5. Complete signage operational work and Brand Studio according to the selected product audience. Existing browser handoffs must be described honestly while native work remains.

Source evidence is insufficient to call any whole trade end-to-end verified. Run paired web/iOS/Android tests using the same tenant and data for create→correct→price→save→reload→reviewed send where available, with separate tests for old prices after rate changes, missing rates, tenant switching, background/termination, offline/timeouts, repeated submission, file permissions, shared links and provider failures. Never use live sends/payments or production mutations merely to fill an audit checklist without explicit authorisation.

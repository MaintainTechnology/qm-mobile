# Full-scope evidence score — 9 September checkpoint

**Latest closed checkpoint: 24.1 / 100. Full specification review: FAIL / incomplete. Deployment: not approved.**

Checkpoint2 adds independently verified phone-readiness work and completed local narrative/appearance rendering, plus the current paired backend gate. It is not a final score: roofing, Studio and follow-up work continues after this snapshot.

| Checkpoint2 dimension | Award | Calculation / evidence |
|---|---:|---|
| Specification delivery | 5.0526 /60 | Package fractions now sum8.0: AUTH03 and C02 each gain0.25 for reviewed partial work; C07 rises from0.25 to0.75 for complete local editor/renderer verification. Other package fractions below are unchanged. |
| Critical invariants | 9 /20 | Focused proof strengthened; complete route-family/environment acceptance still open. |
| Reproducible verification | 10 /10 | Mobile TypeScript and canonical lint passed; complete87 suites/837 tests passed in77.795s. Latest generic PDF/recipient/release fixes independently passed232 tests and scopedlint; full web TypeScript passed after the PDF binding fix. Final214, balance213, snapshot215 and credit217 have independent actual SQL/route evidence. |
| Release evidence | 0 /10 | R01–R10 still require complete manifest/environment acceptance. |
| Total | **24.1 /100** | 5.0526316 +9 +10 =24.0526316. Improvement from checkpoint1 is3.1316 points. |

The weakest areas still cost54.95 delivery points,11 invariant points and10 release points. Required work continues; the plateau rule cannot stop an incomplete build. The historical checkpoint1 detail follows unchanged so the trajectory remains auditable.

This applies the rubric written before implementation in `specs/mobile-parity-build-progress.md`. It scores demonstrated acceptance across all95 packages, including existing features that have not yet been verified against this specification. It is not a claim that79.1% of the app is missing. This is the first numerical checkpoint; earlier runs had no complete current evidence inventory and were left unscored.

| Dimension | Award | Evidence / calculation |
|---|---:|---|
| Specification delivery | 4.4211 / 60 | Sum of package evidence fractions7.0, divided by95, multiplied by60. Exact fractions below. |
| Critical invariants | 9 / 20 | Nine invariants have passing focused local evidence; none has complete route-family/environment proof. Provider-return reconciliation is unverified. |
| Reproducible verification | 7.5 / 10 | Current mobile typecheck, canonical lint and full unit suite pass. Latest paired backend additions are still being independently reviewed and tested, so no current complete-backend gate credit. |
| Release evidence | 0 / 10 | None of R01–R10 is fully satisfied against an actual signed release manifest. |
| Total, rounded once | **20.9 / 100** | 4.4210526 +9 +7.5 +0 =20.9210526. P0/device ceilings do not change this lower score. |

## Exact package fractions

| Fraction | Packages |
|---|---|
| 0.75 | AUTH02, BE09 |
| 0.25 | AUTH05, BE01, BE02, BE03, BE06, BE11, C03, C04, C05, C06, C07, C08, C09, C10, T02, X02, X03, X04, X05, REL01, REL02, REL04 |
| 0 | The other71 package IDs retained in `specs/mobile-parity-package-evidence.md`. Unverified acceptance earns no inferred credit. |

The native document/quote, EV, home, transport and delivery additions have substantial local evidence. They remain conservatively partial at package level because wider rendering, route-family, lifecycle, consent or release dependencies are open. Decisions DEC01–DEC04 are not scored work packages and remain explicit dependencies.

## Verification at this checkpoint

- `npm run typecheck`: passed.
- `npm run lint`: passed, zero warnings.
- `npm run test:ci -- --runInBand`: **79 suites /762 tests passed**,72.196seconds, default five-second test deadline unchanged.
- Two earlier broad runs did not pass: one hit transient Windows dependency-file `stat` errors, and another timed out on the first delivery UI test under load. The unchanged suite passed after reducing concurrent heavy checks; no assertion, test deadline or application guard was weakened.
- Independent scoped review passed native C06/C07/storage/model41 tests, C09 read-only summary/navigation17 tests, AUTH05 privacy/sign-out28 tests and C08 receipt/hook/modal/API41 tests. These overlapping counts must not be added to762.
- Paired backend earlier checkpoint: owned GET/deletion/checkout176 builder tests and138 independent tests, plus226 editor/version/document tests. Later renderer, recipient and final-payment changes require their own fresh final checks; these historical counts are not a current full-backend PASS.

## Weakest parts and next corrections

1. **Unverified or partial full-spec coverage costs54.58 of60 delivery points.** The ledger retains every package; next work must implement or verify missing acceptance rather than infer parity from existing screens or test counts.
2. **Incomplete invariant coverage costs11 of20 points.** Highest-impact corrections underway are historical tax/discount authority in every customer renderer and send path, server-bound reviewed recipients, and atomic/durable final-payment creation and delivery. Local tests cannot certify all enabled trade/provider paths.
3. **Release evidence costs all10 release points.** Signed installed iOS/Android flows, provider returns, deployed migrations/associations, store/legal decisions and the release manifest remain unproven.
4. **Current paired-backend verification costs2.5 points.** Finish independent review and post-fix checks of the shared tax, recipient and final-payment additions.

## Refinement trajectory

| Snapshot | Score | Outcome |
|---|---:|---|
| Before this checkpoint | Unscored | Rubric existed, but no complete current verification snapshot. |
| Local checkpoint1 | **20.9** | Native build/review fixes pass; complete specification remains incomplete. |
| Local checkpoint2 | **24.1** | Phone readiness reviewed; native final/balance/credit controls reviewed; renderer appearance and immutable reviewed PDF delivery fixed and independently reviewed; complete mobile87/837, TypeScript/lint and current paired backend checks pass. Full specification remains incomplete. |

The next snapshot will retain these rules and update only evidence that changed. The two-point optional-refinement plateau rule applies only after all required acceptance passes; it cannot terminate this unfinished build.

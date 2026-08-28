# Task 01 corrective pass 01 — implementer report

## Review status

Implementation is ready for independent review. This report does not assign a PASS verdict.

## Commits

- Backend corrective pass: `4a003564ed8df3278bdd216c19589d877755588e` — `fix(push): close receipt and event race gaps`
- Mobile Task 01 implementation under review: `8b213f1329c95fc8b1c343d7139c4deaf0818725` — `fix(auth): share push cleanup sign-out flow`
- No mobile runtime code changed in corrective pass 01; the mobile repository change is this review report only.

## Changed behaviour

1. Receipt-level `DeviceNotRegistered` handling deletes the exact tenant/user/token row before terminalising its ticket. A failed delete leaves `checked_at` null and reports the ticket retryable.
2. Quote acceptance now claims the first acceptance with a conditional `customer_accepted_at IS NULL` update. Only its returned row can enqueue “Quote accepted”; a lost claimant still updates the latest valid tier without sending.
3. Migration 191 now upgrades a pre-existing token table: it guardedly adds `user_id`, retires ownerless and exact-duplicate legacy registrations, sets the column non-null, removes the legacy tenant/token constraint, adds the exact tenant/user/token constraint, and validates the final shape.
4. Dialog-first lead deduplication now uses a durable `push_events` outbox with a unique business-event key and lease-token claim/complete/release functions. Failed inserts cannot send, concurrent duplicate enqueues cannot both send, and the protected push-receipts cron retries events left pending before delivery.
5. The standard intake and public lead routes now use route-owned injectable push seams. Standard intake gates tenantless, pre-marked, and failed-insert cases; public dialog-first and legacy branches enqueue exact Australian copy and relative destinations. Push enqueue failures remain non-fatal to lead/quote processing.

## Files changed

### Backend — `C:/Users/dalig/Downloads/QuoteMate/quoteMate`

- `quotemate-automation/app/api/cron/push-receipts/route.ts`
- `quotemate-automation/app/api/cron/push-receipts/route.test.ts`
- `quotemate-automation/app/api/intake/structure/route.ts`
- `quotemate-automation/app/api/intake/structure/route.push.test.ts`
- `quotemate-automation/app/api/q/[token]/accept/route.ts`
- `quotemate-automation/app/api/q/[token]/accept/route.test.ts`
- `quotemate-automation/app/api/t/[slug]/lead/route.ts`
- `quotemate-automation/app/api/t/[slug]/lead/route.push.test.ts`
- `quotemate-automation/app/api/tenant/push-token/route.ts` (comment corrected to the actual seat-scoped key)
- `quotemate-automation/lib/push/events.ts`
- `quotemate-automation/lib/push/events.test.ts`
- `quotemate-automation/lib/push/receipts.ts`
- `quotemate-automation/lib/push/receipts.test.ts`
- `quotemate-automation/lib/push/send.ts`
- `quotemate-automation/lib/push/send.test.ts`
- `quotemate-automation/lib/sms/start-web-lead-conversation.ts`
- `quotemate-automation/lib/sms/start-web-lead-conversation.test.ts`
- `quotemate-automation/sql/migrations/191_push_tokens.sql`
- `quotemate-automation/sql/migrations/191_push_tokens_down.sql`
- `quotemate-automation/tests/push-tokens-migration.test.ts`

### Mobile — `C:/Users/dalig/Desktop/MaintainTech/MaintainOrg/qm-mobile`

- `.superpowers/sdd/task-01-fix-01-implementer-report.md`

The pre-existing `package-lock.json` version-only modification was preserved and not staged.

## RED evidence

- Receipt deletion failure: `npm test -- lib/push/receipts.test.ts` failed because the old sweep returned `checked: 1, retryable: 0` after an exact-token delete error; required was `checked: 0, retryable: 1`.
- Acceptance race: `npm test -- app/api/q/[token]/accept/route.test.ts` failed because no `customer_accepted_at IS NULL` filter existed and the concurrent loser still scheduled a push.
- Migration upgrade: `npm test -- tests/push-tokens-migration.test.ts` failed both fresh validation and pre-existing-schema upgrade assertions before guarded `ALTER`, retirement, exact constraint replacement, and validation were added. A later RED cycle also proved exact duplicate legacy rows were not retired.
- Durable event transition: `npm test -- lib/push/events.test.ts` first failed because the outbox seam did not exist. Sender retry signalling separately failed with `undefined` instead of `false` on Expo HTTP 503.
- Cron outbox retry: `npm test -- app/api/cron/push-receipts/route.test.ts` failed because the protected route did not sweep pending business events.
- Dialog marker: `npm test -- lib/sms/start-web-lead-conversation.test.ts` failed because `lead_push_sent_at` was still written before external delivery.
- Standard intake route: `npm test -- app/api/intake/structure/route.push.test.ts` failed all four route-import cases because the injectable hook did not exist.
- Public lead route: `npm test -- app/api/t/[slug]/lead/route.push.test.ts` failed dialog/legacy branch coverage because its route-owned seams did not exist; the fail-soft test then failed because an injected enqueue error rejected instead of resolving non-fatally.

## GREEN evidence and exact commands

- Backend focused regression suite:

  `npm test -- lib/push/send.test.ts lib/push/receipts.test.ts lib/push/events.test.ts app/api/tenant/push-token/route.test.ts app/api/cron/push-receipts/route.test.ts app/api/q/[token]/accept/route.test.ts lib/sms/start-web-lead-conversation.test.ts app/api/intake/structure/route.push.test.ts app/api/t/[slug]/lead/route.push.test.ts lib/quote/paid-confirm.test.ts app/api/quote/[id]/send/route.test.ts tests/push-tokens-migration.test.ts`

  Result: 12 files passed, 64 tests passed, exit 0.

- Backend typecheck: `npm run typecheck` — exit 0, no diagnostics.
- Focused backend ESLint over all new/corrective modules and tests — exit 0, no diagnostics.
- Supplemental lint over the two large touched routes reported only the five pre-existing `no-explicit-any` errors already documented by Task 01 (intake route lines 526/596/888; public lead route lines 147/273 after this diff). None are corrective-pass lines.
- Backend `git diff --check` — exit 0.
- Mobile typecheck: `npm run typecheck` — exit 0.
- Mobile lint: `npm run lint` — exit 0.
- Mobile focused tests:

  `npm run test:ci -- src/lib/sign-out.test.ts src/lib/notifications.test.ts --runInBand`

  Result: 2 suites passed, 11 tests passed. Jest then remained alive on the existing `expo-notifications` open handle and was interrupted after completed results; no `forceExit` or skipped assertion was used.

## Remaining risks and user-owned work

- No migration was applied and no live/local Postgres was available. Migration verification is a focused structural Vitest contract for fresh and pre-existing shapes, plus TypeScript/tests; applying migration 191 remains user-owned.
- The outbox prevents duplicate application claims and retries work interrupted before delivery. Expo has no idempotency key, so a process death after Expo accepts a request but before `complete_push_event` persists can still cause an at-least-once retry. Ticket persistence narrows observability but cannot make the external boundary transactional.
- The existing cron-job.org scheduler must be running for interrupted pending events and delayed receipts to retry. The setup script was not executed.
- Physical-device Expo delivery, APNs/FCM credentials, deployment, and store acceptance remain user-owned.

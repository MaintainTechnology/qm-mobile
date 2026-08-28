# Task 01 corrective pass 02 — implementer report

## Review status

Implementation is ready for independent review. This report does not assign a PASS verdict.

## Commits

- Backend corrective pass: `01ffcf6ee3e2ac2d86d511f4e0713968c4bdadd4` — `fix(push): persist fan-out progress per recipient`
- Mobile runtime remains at Task 01 commit `8b213f1329c95fc8b1c343d7139c4deaf0818725`; corrective pass 02 changes no mobile runtime files.
- This report is committed separately in the mobile repository; its hash is reported in the parent handoff because a commit cannot contain its own final hash.

## Changed behaviour

1. Durable outbox events now snapshot one `push_event_deliveries` row per intended recipient. A retry selects only `status = 'pending'`, so an accepted first batch is not blindly replayed when a later batch gets HTTP 429/5xx.
2. Expo tickets and their exact tenant/user/token receipt identity are persisted in the same PostgreSQL transaction that terminalises the matching delivery. Exact ticket-level `DeviceNotRegistered` pruning is in that atomic transition too. A failed transition leaves the delivery pending and prevents event completion.
3. Migration 191 discovers obsolete uniqueness through `pg_index`/`pg_attribute` column semantics. It removes arbitrary-named legacy constraints or standalone indexes in either tenant/token order, while preserving only the required `(tenant_id, user_id, token)` constraint.
4. The standard-intake and public-lead suites now call the exported `POST` handlers. They drive actual handler branches through persisted insert results before asserting the outbox event.

## Files changed

### Backend — `C:/Users/dalig/Downloads/QuoteMate/quoteMate`

- `quotemate-automation/lib/push/send.ts`
- `quotemate-automation/lib/push/send.test.ts`
- `quotemate-automation/lib/push/events.ts`
- `quotemate-automation/lib/push/events.test.ts`
- `quotemate-automation/sql/migrations/191_push_tokens.sql`
- `quotemate-automation/sql/migrations/191_push_tokens_down.sql`
- `quotemate-automation/tests/push-tokens-migration.test.ts`
- `quotemate-automation/app/api/intake/structure/route.post.push.test.ts`
- deleted helper-only `quotemate-automation/app/api/intake/structure/route.push.test.ts`
- `quotemate-automation/app/api/t/[slug]/lead/route.post.push.test.ts`
- deleted helper-only `quotemate-automation/app/api/t/[slug]/lead/route.push.test.ts`
- `quotemate-automation/package.json`
- `quotemate-automation/pnpm-lock.yaml`

The package change adds `@electric-sql/pglite@0.5.8` as a dev dependency so migration SQL is executed by an ephemeral in-process PostgreSQL WASM database in tests.

### Mobile — `C:/Users/dalig/Desktop/MaintainTech/MaintainOrg/qm-mobile`

- `.superpowers/sdd/task-01-fix-02-implementer-report.md`

The pre-existing `package-lock.json` modification was preserved and not staged.

## RED evidence

- Fan-out: `pnpm exec vitest run lib/push/send.test.ts --testTimeout=20000` failed 2/5. A 101-recipient first-batch success plus second-batch HTTP 503 returned `true`; accepted tickets whose persistence failed also returned `true`. After adding the retry-unit assertion, the suite failed 3/6 because event-mode delivery still queried all `push_tokens` instead of pending durable recipients.
- Migration runtime: `pnpm exec vitest run tests/push-tokens-migration.test.ts --testTimeout=30000` executed five disposable PostgreSQL shapes. Fresh/rerun and the forward-order constraint passed; reversed constraint, standalone index, and reversed standalone index failed because the legacy two-column unique remained beside the new key.
- Route coverage deficiency was test-only: the replaced suites imported helpers and never called `POST`. Their replacements import and invoke the exported handlers; no production route behaviour needed changing.

## GREEN evidence and exact commands

- Fan-out and event orchestration:

  `pnpm exec vitest run lib/push/send.test.ts lib/push/events.test.ts --testTimeout=20000`

  Result: 2 files, 9 tests passed, exit 0. The mixed 101-recipient test observes request sizes `[100, 1, 1]`; the retry contains only recipient 101.

- Executable migration contract:

  `pnpm exec vitest run tests/push-tokens-migration.test.ts --testTimeout=60000 --maxWorkers=1`

  Result: 1 file, 6 tests passed, exit 0. Covered fresh install, rerun, arbitrary legacy constraint, reversed constraint, standalone index, reversed standalone index, two-seat shared-token insertion, and atomic ticket identity plus exact DNR pruning.

- Actual route handlers:

  `pnpm exec vitest run app/api/intake/structure/route.post.push.test.ts --testTimeout=20000`

  Result: 1 file, 4 tests passed, exit 0. Covered persisted voice intake exact event/deep link, tenantless intake, pre-marked SMS dialog lead, and failed insert.

  `pnpm exec vitest run app/api/t/[slug]/lead/route.post.push.test.ts --testTimeout=20000`

  Result: 1 file, 4 tests passed, exit 0. Covered dialog-first persisted conversation ID, legacy persisted intake ID, failed legacy insert, and fail-soft enqueue failure.

- Combined backend Task 01 regression:

  `pnpm exec vitest run lib/push/send.test.ts lib/push/receipts.test.ts lib/push/events.test.ts app/api/tenant/push-token/route.test.ts app/api/cron/push-receipts/route.test.ts app/api/q/[token]/accept/route.test.ts lib/sms/start-web-lead-conversation.test.ts app/api/intake/structure/route.post.push.test.ts app/api/t/[slug]/lead/route.post.push.test.ts lib/quote/paid-confirm.test.ts app/api/quote/[id]/send/route.test.ts tests/push-tokens-migration.test.ts --testTimeout=60000 --maxWorkers=1`

  Result: 12 files, 71 tests passed, exit 0.

- Backend typecheck: `pnpm run typecheck` — exit 0.
- Focused backend ESLint over every changed TypeScript/test file — exit 0.
- Backend staged `git diff --check` — exit 0.
- Mobile typecheck: `npm run typecheck` — exit 0.
- Mobile lint: `npm run lint` — exit 0.
- Mobile focused assertions:

  `npm run test:ci -- src/lib/sign-out.test.ts src/lib/notifications.test.ts --runInBand`

  Jest reported 2 suites and 11 tests passed. It then retained the already documented `expo-notifications` open handle and was interrupted after the completed assertion summary; the shell exit was therefore 1. No `--forceExit`, skipped assertion, or hidden failure was used.

## Local PostgreSQL investigation

No `psql`, `pg_isready`, `postgres`, `initdb`, Docker, Podman, Supabase CLI, PostgreSQL service, or listener on ports 5432/54321/54322 was available. No user credentials were read and no remote database was mutated.

PGlite 0.5.8 successfully executed the complete migration in bounded ephemeral databases, including PL/pgSQL functions, catalogue queries, roles/grants, and RLS. This removed the earlier local-PostgreSQL blocker and provides runtime SQL evidence rather than a regex contract.

## Remaining external delivery limitations

- Expo offers no idempotency key. A process termination after Expo accepts a notification but before the atomic result RPC commits can still produce an at-least-once resend on retry. The durable ledger prevents replay of every batch already committed locally, but cannot make the external Expo boundary transactional.
- Migration 191 and scheduler setup were not applied to any live database or external cron service.
- Physical-device delivery, APNs/FCM credentials, deployment, and store acceptance remain user-owned.

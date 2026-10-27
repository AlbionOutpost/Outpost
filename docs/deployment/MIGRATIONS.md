# Migration deployment and safe recovery

Current next-milestone read-back: the local application database has **17 completed migrations**, no unfinished migration, and the MarketWatchItem table. A private local backup preceded the authorized additive `20261026110000_market_watch_items` deployment; no reset/destructive SQL was used. This changes local development only, not an external staging/production target. The read-back is retained in the QA evidence snapshot and `.qa/next-milestone/watchlist-migration.log`.

Disposable PostgreSQL QA exercises fresh/repeat deployment, constraints, uniqueness, failed-write preservation, backup/restore and cascade behavior. Results come from [QA_REPORT.md](../../QA_REPORT.md) and [the migration evidence snapshot](../qa-evidence.json). The next milestone adds operational private watchlist API/UI with reload, removal, region/quality identity, cap/concurrency and denied-action tests. Local implementation does not imply staging rollout.

## Controlled deployment

From an authorized terminal using the intended target configuration:

```bash
nvm use
npm ci
npm run db:diagnose
npx prisma migrate status
# Review additive SQL, target, backup and compatible rollout before applying.
npm run db:deploy
npx prisma migrate status
npm run qa:phase
```

Do not expose DB/cache ports publicly or alter authentication to bypass a tool failure. Never use migrate reset, db push or edited migration checksums as a connectivity repair. Host development typically uses loopback; containers require the private service hostname. The pending SQL is in [the immutable migration](../../prisma/migrations/20261026110000_market_watch_items/migration.sql).

## Non-destructive failure and rollback

If deployment fails, stop dependent rollout, retain Prisma status/error and inspect actual schema/indexes. Do not blindly replay CREATE statements, mark partial DDL applied, drop data or rewrite checksums. Choose a reviewed forward repair/resolve only after the schema evidence supports it.

After successful additive migration, an earlier compatible application may be restored while leaving the unused table/index intact. Dropping the table would discard records and requires a separate data decision. Disposable failed-write rollback is not proof that every DDL statement is transactional. Owned staging image/schema rollback remains untested. [Original diagnostics](../history/2026-10-26-before-reconciliation/docs/deployment/MIGRATIONS.md) retain the earlier restricted-context failures and safe-recovery reasoning.

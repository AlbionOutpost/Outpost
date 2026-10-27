# Migration diagnostics and safe deployment

2026-10-26: the direct execution context has DATABASE_URL set, credentials present and a loopback5432 target. A direct TCP probe fails **EPERM**, while Prisma reports P1001. Docker reports PostgreSQL healthy. An independently permitted socket query confirmed CONNECT/public-schema CREATE privileges,16 completed migrations and0 unfinished migrations. The approved QA execution connects and authenticates successfully. This isolates an execution-context network restriction; it is not evidence that credentials should be changed or database security weakened.

Run `npm run db:diagnose`. It writes `.qa/db-direct-diagnostics.json`, prints no connection URL/password and makes no database writes. QA writes a separate `.qa/db-qa-diagnostics.json`; do not replace the blocked direct result with the successful QA result. TCP success alone is not an authentication check.

The additive17th migration `20261026110000_market_watch_items` creates an empty future watchlist table, unique owner/region/item/quality identity, item/region/quality constraints and account-delete cascade. No existing rows/tables are dropped or rewritten. The watchlist feature/API is not shipped. The application database remains at its observed16-migration baseline until normal migration access is available. Fresh disposable QA databases test the new migration, invalid rows, duplicates, backup/restore and cascading deletion; exact results are in `.qa/database-final.json`. Do not claim main/staging deployment from those checks.

From a normal authorized host terminal with network access to the intended database:

```bash
nvm use
npm ci
npm run db:diagnose
npx prisma migrate status
# Verify target/backup and review the additive SQL before deployment.
npm run db:deploy
npx prisma migrate status
npm run qa:phase
```

Use the existing correct secret-store configuration. Host development normally uses localhost5432; an application container uses the private database service hostname, not its own localhost. Do not expose5432 publicly, disable authentication or use production credentials in disposable QA. Do not use migrate reset, db push or destructive history edits to fix connectivity. A shared/production target needs an operator backup/restore plan and staged migration rehearsal; the above disposable tests do not certify those operations.

## Failure and non-destructive rollback

Migration17 is unchanged in this milestone. The unique `(userId,region,itemId,quality)` index also supports owner/region lookup; no redundant index was added. Two additional disposable checks confirm an invalid watch write aborts its transaction and leaves the preexisting watch record intact. This tests data-write rollback, not blanket transactional atomicity for all migration DDL.

If deployment fails, stop dependent rollout; record Prisma status/error code and inspect the exact existing schema/indexes from an authorized terminal. Preserve existing records and the failed migration log. Do not blindly rerun CREATE statements, drop the table, edit historical checksums or mark a failed migration applied. An operator must review partial DDL and choose an explicit forward repair or Prisma resolve procedure only after schema evidence supports it. No automatic repair/reset is included.

For application rollback after successful additive migration, deploy the previously verified application image and leave the unused table/index intact. Dropping the new table would discard watchlist records and requires a separate reviewed destructive-data decision. Existing application data and migration history are retained. Main/staging execution remains unverified; current disposable results are in .qa/database-final.json.

# Release-blocker checkpoint — 2026-10-26

**Release: NO-GO.** Test passes apply to implemented scope, not complete Albion coverage or real deployment.

## Completed this checkpoint

- Diagnosed direct migration failure: TCP EPERM in the restricted execution context, with configuration present, healthy Docker PostgreSQL and a successful approved QA connection. Observed16 completed/zero unfinished application migrations; no credentials/security changes.
- Prepared additive watchlist-table migration17. Disposable PostgreSQL verifies fresh/repeat deployment, constraints, uniqueness, backup/restore and delete cascade. Existing application deployment is not performed; watchlist API/UI remains unfinished.
- Added reproducible `db:diagnose` and `data:audit`, plus separate direct/QA connectivity evidence. No secrets in reports.
- Added manual trade break-even/minimum whole-silver prices with exact decimal boundary arithmetic, private save/reload/static sharing and existing export support. Verified independent examples and account isolation. Supplied fees remain manual assumptions, not current game defaults.
- Fixed saved-scenario queries so other calculator records cannot hide an older production/trade/transport scenario behind the50-record limit.
- Reproduced a composition P2034 serialization failure, added bounded database-only retries and retained genuine optimistic-version conflict protection. Failed evidence retained; no tests/workers disabled.
- Reviewed populated trade desktop/mobile captures, refined paired phone inputs and retained all existing primary-page screenshot/permission tests.

- Added pinned source synchronization/preparation, checksum and reuse gates, separate schema/manual/patch evidence, recipe integrity checks and bounded real-PNG validation. Offline deterministic CLI and tampering tests pass. Template intentionally unapproved/unpinned; no bulk source or current-patch facts imported. See GAME_DATA_VERIFICATION.md.
- Added supplied purchase-order setup fees to manual trade cost, profit and exact minimum-price calculations; private save/reload and legacy scenarios tested. Fixed false idempotent catalog success and region loss through item navigation; disclosure no longer calls starter ability mappings verified.
- Preserved prepared watchlist migration17 and added failed-transaction preservation tests. Main application migration remains unexecuted; no watchlist operational claim.

## Evidence and coverage

Final checkpoint: **117 unit tests,53 production browser tests,15 database checks and all ten phase checks PASS**; production build passes. Formatting and scoped source/static scans pass (308 source text files/43 static files); these are not maintained full-history scans. Latest executed statuses/counts are authoritative in QA_REPORT.md and `.qa/phase-summary.json`; raw final evidence is under `.qa/game-verification/final/` and `.qa/release-blockers/`. Database test results: `.qa/database-final.json` (15 scoped checks). Source/secret scans are limited pattern/configured-value scans, not Git-history certification. Synthetic database-session browser fixtures are not OAuth.

Game data: [coverage report](GAME_DATA_COVERAGE.md) records181 equipment variants,221 combined original factual IDs,8 ability names,0 structurally invalid mappings and0 current-patch verified records/unlock requirements/statistics. Food/potion metadata and full economic categories are missing. Three starter recipes need current source verification; the steel source applicability is flagged. No complete-game denominator, outdated-record count or bulk redistribution license is verified.

Calculators: [parity report](CALCULATOR_PARITY.md) remains PARTIAL/MISSING/BLOCKED. Crafting/refining/enchanting cover starter recipes/manual assumptions; transport/flipping and replacement-cost workflows remain limited. Farming, animals, cooking, alchemy, laborers, fishing, IP and automatic focus/spec require verified mechanics/datasets and implementations. The trade improvements do not close full calculator parity.

Performance: `.qa/release-blockers/trade/arithmetic-benchmark.json` records5000 warmed local arithmetic calls; this is not a browser, network, load, field-vitals or throttled-mobile benchmark. No production SLA is claimed.

## Remaining owner/operator actions

1. From a normal authorized terminal with database network access, follow [migration instructions](../deployment/MIGRATIONS.md), review additive SQL, verify the intended target/backup, then run `npm run db:diagnose`, `npx prisma migrate status`, `npm run db:deploy`, and status again. Never reset an existing database or weaken authentication to bypass EPERM.
2. Provision an owned HTTPS staging hostname/host and private database/cache. Supply runtime Discord client ID/secret, a strong session secret and the exact HTTPS NEXTAUTH_URL. Register the matching Discord callback and execute [real OAuth/TLS verification](../deployment/DISCORD_HTTPS_VERIFICATION.md). No live credentials are requested in chat or reports.
3. Resolve current game metadata/recipe/ability and scene-media sources, patch applicability and reuse rights. No fabricated data or screenshot crops are used to fill these gaps.
4. Provide legal/operator identity/contact details, select the original-code license and establish hosted CI/Git access, backups, alerting and rollback ownership. These cannot be invented by the application.

No production deployment, main database reset, remote push, real OAuth verification or full-product completion is claimed.

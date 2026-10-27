# Outpost deployment runbook

There is no verified owned hosted deployment. [RELEASE_READINESS.md](../RELEASE_READINESS.md) is the authoritative release-gate list. Current local standalone/session tests and the fresh homepage-phase container smoke do not prove production operation.

## Runtime and controlled rollout

Use Node22, PostgreSQL and Redis, canonical HTTPS NEXTAUTH_URL and paired Discord credentials. Supply stable random session secrets through the runtime secret store. Keep DB/cache private; local Compose binds their ports to loopback and starts data services only.

Install with `npm ci`, generate Prisma, build standalone, review the target and migration SQL, apply committed migrations as a controlled release step, then run `npm start`. Never run development/reset migration commands against production. [Migration state and failure recovery](deployment/MIGRATIONS.md); [real Discord/HTTPS verification](deployment/DISCORD_HTTPS_VERIFICATION.md).

The Dockerfile is multi-stage/nonroot with a health check and excluded environment files. A fresh local homepage-phase image build and nonroot/health smoke now have evidence; container OS vulnerability scanning and hosted operation remain unverified. The existing local QA helper expects the historical image tag `albion-atlas:qa` and recorded container names; retain these technical identifiers until a separate compatibility change. `scripts/qa-container.mjs` operates only its owned local QA container and is not a production operator.

## Operations and failure boundaries

`npm run test:integration` creates/drops only owned disposable QA databases, tests migration constraints and synthetic backup/restore/cascades. This was exercised; the earlier statement that no restore test occurred was stale. It does not configure scheduled encrypted production backups or rehearse deployed application/schema rollback.

Before shared operation establish verified backup encryption/retention/restore, monitoring/alerts, incident ownership, staff provisioning, supported dependency maintenance and controlled image/schema rollback. Follow the linked release gates rather than marking these complete from health200. Cache failures may fall back to bounded process storage; budget failures deny requests. Missing prices are not synthesized; sanitized service errors still need operator investigation.

[GitHub setup](deployment/GITHUB_SETUP.md) records existing private repository policies and remaining owner actions. No application upload, hosting purchase or deployment is part of documentation reconciliation. [Historical deployment notes](history/2026-10-26-before-reconciliation/docs/DEPLOYMENT.md) preserve prior successful and blocked attempts.

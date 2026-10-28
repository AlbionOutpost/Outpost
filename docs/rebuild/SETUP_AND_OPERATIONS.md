# Setup, deployment and recovery

Cloudflare deployment addendum (28 October2026): production is public Workers hosting with a private data service, EU D1 public catalog/archive and SQLite Durable Object account transactions. Next SSR runs in signed, expiring browser-session objects with request budgets; no private HTML/role cache. PostgreSQL/Redis below remains the supported local runtime. Cloudflare Access is removed. Only server-verified persisted Discord account303585687460904970 receives owner ADMIN. See [current runtime and verification](../deployment/CLOUDFLARE_PORT_PROGRESS.md); fixture sessions are not real OAuth, and production recovery is not certified.

## Reproducible runtime

Use the committed `package-lock.json` with `npm ci`, not floating dependency upgrades. [Inventory JSON](inventory.json) records both requested ranges and the exact installed lockfile versions; for example, the installed React API includes `ViewTransition` even though the package range began earlier. Node must satisfy `>=22.12.0`; `.nvmrc` selects22. The documented local execution uses Node22.22.2. PostgreSQL17 and Redis7 are the Compose service families. This is a Node server application, not a static HTML export.

Read the relevant guides in `node_modules/next/dist/docs/` before writing Next.js code. This implementation uses async `cookies()`, promised route/search parameters, `connection()`, the App Router, `src/proxy.ts`, React19.3 transitions and Next16 image behavior. Do not translate it mechanically to older Next.js examples.

## Private configuration

Only names and purposes are documented here. Copy `.env.example` into an ignored local `.env` in a fresh environment, then populate it privately.

| Variable                                              | Purpose                            | Rebuild behavior                                                                                     |
| ----------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                        | PostgreSQL connection              | Required for catalog, accounts and persisted product features; example is loopback development only  |
| `REDIS_URL`                                           | Redis connection                   | Used for cache/budgets; missing/unavailable budget storage fails closed in production                |
| `NEXTAUTH_URL`                                        | Canonical application origin       | Must match the actual browser/Discord origin; public production requires HTTPS                       |
| `NEXTAUTH_SECRET`                                     | Session/authentication secret      | Generate at least32 random bytes, keep stable for an environment, never write its value to docs/logs |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`          | Real Discord provider              | Configure both together; neither means provider is deliberately unavailable                          |
| `OPERATOR_NAME`, `OPERATOR_ADDRESS`, `OPERATOR_EMAIL` | Legal/operator disclosure          | Real owner-supplied values; placeholders do not close release gates                                  |
| `PORT`                                                | Local/standalone listening port    | Defaults3000; documented review server may use3001                                                   |
| `NODE_ENV`                                            | Runtime mode                       | Production changes security/budget behavior                                                          |
| `NEXT_TELEMETRY_DISABLED`                             | Build/runtime telemetry preference | Used in container/CI                                                                                 |

`src/lib/env.ts` validates URL schemes, secret length, paired provider credentials and HTTPS public origins. `scripts/db-diagnose.mjs` is the intended read-only diagnostic entry point. Do not print connection strings or secret values while troubleshooting.

Generate a secret locally with a cryptographic random generator, then place it in `.env`; do not paste generated values into a rebuild guide or commit. Port changes must be reflected in `NEXTAUTH_URL` and the registered Discord callback when testing authentication. A browser running3001 against a canonical3000 origin can correctly receive403 from mutation origin checks.

## Fresh development install

Run from an authorized writable checkout. The commands below create and initialize the intended development database; review target/SQL before adapting them to any existing database.

```bash
nvm use
npm ci
# Populate ignored .env from .env.example before continuing.
docker compose up -d
npm run db:diagnose
npm run db:deploy
npm run db:seed
npm run data:sync
npx playwright install chromium
npm run dev
```

Open `http://localhost:3000`. Compose binds PostgreSQL5432 and Redis6379 to loopback, persists their named volumes and enables Redis append-only storage. Its fixed example database credentials are development defaults, not production credentials. The database seed deliberately creates **no synthetic users, builds, prices or community activity**.

`data:sync` mutates the runtime catalog by activating the committed reviewed July snapshot. It is an explicit activation step for this fresh rebuild, not a harmless read-only command to run against an unknown target. It must not overwrite an operator’s unrelated catalog or production DB without that target’s authorization. See [game data](GAME_DATA.md).

When Docker is unavailable, use separately provisioned PostgreSQL/Redis and private connection URLs. Diagnose permissions rather than using sudo or weakening filesystem/socket policies. A read-only Prisma cache can use a scoped writable `XDG_CACHE_HOME` under an authorized temporary directory. Do not repurpose the user’s home or global agent directories.

## Production-mode local run

```bash
npm run build
npm start
# Optional separate review port:
PORT=3001 npm start
```

The build runs Prisma generation, `next build` and `scripts/prepare-standalone.mjs`. The last step copies `.next/static` and `public` into the standalone output. `npm start` loads local `.env` when available and launches `.next/standalone/server.js`; it forwards termination signals. Stop an existing production review server before rebuilding its `.next` directory. Restart it afterward. Do not measure loading performance during builds or browser suites.

The Dockerfile builds in Node22 Debian with OpenSSL/CA certificates, copies the standalone runtime/static/public assets, runs as the `node` user and exposes3000. Inject configuration privately at runtime; the image must not contain `.env`, OAuth secrets, backups or database dumps. `/api/health` checks PostgreSQL and Redis; its provider state is `configured-unverified` or `not-configured`. HTTP200 is not a release certificate.

## Database lifecycle

Apply the **17 ordered committed migrations** using `prisma migrate deploy` on the intended target. Do not substitute `db push`, recreate tables from a shortened schema or reset an existing database. The SQL includes invariants beyond ORM types. Review migration status and take an authorized private backup before changing a populated environment. Local17-migration/watchlist evidence does not prove an HTTPS staging target is migrated.

The QA integration runner creates/drops only disposable owned `atlas_qa_*` and `atlas_restore_*` databases. It verifies constraints, repeat deployment and synthetic backup/restore. It must never be pointed at a shared production database for destructive test setup.

To restore a real installation: provision compatible services; recover the separately protected database backup under operator control; preserve or deliberately rotate auth secrets with a session-expiry plan; apply only reviewed forward migrations; verify owners/memberships/private reads; run read-only health and application journeys; check backups/monitoring before reopening access. Do not overwrite current user data simply to reproduce a screenshot.

## Hosting and CI

The committed `.github/workflows/quality.yml` pins checkout/setup actions, uses the Node version file, runs installation/formatting, creates fresh local services, deploys migrations/imports catalog, installs Chromium and runs source checks/full QA/browser-bundle secret checks. `playwright.config.ts` limits concurrency to two because local services and public budgets are shared. Hosted Actions status must be read from the actual run; a workflow file or historical local pass is not hosted success.

The source repository is private `AlbionOutpost/Outpost`; the implementation baseline is in `baseline.json`. In the original restricted environment `.git` was unusable, so publication used a clone of the actual remote in writable `/tmp`, preserving protected metadata and existing history. A normal new developer should work directly in a legitimate writable clone. Never initialize a replacement history over an existing project or force-push to solve a sandbox problem.

HTTPS staging, credentialed OAuth, monitoring/alerts, encrypted scheduled backups, real restore rehearsal, deployment/rollback operation, operator disclosures and rights review remain governed by [release readiness](../../RELEASE_READINESS.md) and the [deployment runbook](../DEPLOYMENT.md). This handbook does not supply those private external inputs or authorize deployment.

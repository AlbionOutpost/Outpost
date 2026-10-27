# Deployment and operations — unfinished readiness checklist

This application is verified locally, not deployed. Complete product/security/legal gates before public operation.

## Runtime

Node 22, PostgreSQL and Redis are required for the tested configuration. Keep session secrets stable across app instances and supply them through your deployment secret manager/environment. Set NEXTAUTH_URL to the canonical HTTPS origin and register the exact Discord callback `/api/auth/callback/discord`. Terminate TLS at a trusted reverse proxy; restrict database and Redis network access. Local Compose deliberately binds data-service ports to loopback.

Use `npm ci`, `npx prisma generate`, `npm run build`, `npm run db:deploy`, then `npm start`. Apply committed migrations as a controlled release step before serving dependent application code. Do not run migrate dev against production. Test restore/rollback strategies separately; no backup/restore drill was performed here.

The included Dockerfile and ignore rules prevent copying local secrets and generated local dependencies into the build context. The multi-stage standalone application image has been built and locally smoke-tested as UID1000, with health checks and without a copied .env. Container OS vulnerability scanning and public deployment remain unverified. Compose currently manages PostgreSQL and Redis only.

## Verification required before public operation

- Verify actual Discord OAuth login/logout and database-backed account creation with production redirect/cookie settings.
- Complete operator identity/address/contact, lawful basis, retention schedule, service-provider disclosures and privacy review. The included legal page is a marked draft.
- Finish moderation/report handling, spam controls, per-identity abuse policy, safe operational logging/monitoring and admin permission enforcement before enabling broad user-generated publishing.
- Review full metadata/asset licensing and attribution before synchronizing or rendering artwork.
- Build/test the app image, run migrations against a fresh staging database, verify backups/restores, resource limits, readiness probes and graceful failure behavior.
- Audit dependencies and replace the compatibility-pinned deprecated ESLint toolchain when plugin support permits. Maintain verified Prisma dependency override compatibility.
- Run full keyboard/screen-reader, contrast, load and security audits. Existing targeted browser/authorization tests do not cover the entire future platform.

## Failure behavior

Redis cache errors do not invent observations; cache reads may fall back to bounded process memory. Redis request-budget errors deny requests. Upstream 429 honors reset headers and shares a cooldown by region. Missing market prices remain unavailable. Database/OAuth failures must be investigated server-side without returning secrets. Structured operational logging/data-source health dashboards are still planned.

No external Discord messages/webhooks, paid resources, hosted deployment or account permissions were created by this implementation.

## Verified local QA update

The current Dockerfile is a tested multi-stage standalone build using `npm ci`, nonroot UID1000, health check and no copied `.env`. Build `docker build -t albion-atlas:qa .`. The local audit helper `node scripts/qa-container.mjs` smoke-tests that image on loopback3102 with the default Compose network; `node scripts/qa-container.mjs stop` removes only its recorded owned container. It is a local QA helper, not production secret management.

`npm run test:integration` creates two fresh owned databases, deploys migrations, verifies constraints, writes a synthetic dump, restores it, verifies relationships/cascades and drops only those databases. It does not back up production or configure scheduled backups. For a real release, first take a controlled encrypted database backup; use `prisma migrate deploy`, never reset; retain a schema-compatible prior image. Revert to that image only if migrations remain backward compatible; otherwise stop writes, plan a forward fix or reviewed database restore. Full application/schema rollback rehearsal remains BLOCKED.

The startup environment validator requires PostgreSQL/Redis URLs, a >=32-character secret and a canonical origin; remote production origins require HTTPS, and Discord credentials must be configured together. Missing OAuth credentials are reported rather than replaced by a mock login. `/api/health` checks dependencies, not complete product readiness.

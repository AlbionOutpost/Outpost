---
name: outpost-deploy
description: Ship Outpost safely — GitHub PRs and CI, the Cloudflare deploy workflow, Worker rollbacks, schema migrations across Postgres/SQLite/Durable Objects, D1 data pushes, runtime secrets, Discord and DNS operations, and post-deploy checks. Use for releases, CI failures, migrations or any production change.
---

# Outpost deploy

Merging to `main` deploys to albionoutpost.com. Keep `main` green and every deploy reversible.

Read [docs/OPERATIONS.md](../../../docs/OPERATIONS.md) (pipeline, config, rollback, zone, Discord) and [docs/ARCHITECTURE.md § Schemas](../../../docs/ARCHITECTURE.md#schemas-and-migrations).

## Shipping a change

1. Branch, commit, push, open a PR. Commits are authored as the repo owner with plain imperative messages — no co-author or tool trailers.
2. Wait for `Quality gates` (and `Documentation checks` for docs) to pass. If CI fails, read the failing step's log (`gh run view <id> --log-failed`), reproduce locally, fix on the branch.
3. **Ask the owner before merging** — merging is a production deploy.
4. After merge, watch the `Cloudflare deployment` run to the end. The live-site probe from GitHub is challenged by Bot Fight Mode (reported as BLOCKED); smoke-test from an unchallenged machine: `node scripts/qa-cloudflare-hosted.mjs` and `node scripts/qa-cloudflare-auth.mjs`.
5. Update [ROADMAP.md](../../../docs/ROADMAP.md) if the change closes or opens an item.

## Schema changes

All four must land together:

1. Prisma migration in `prisma/migrations` (additive; never edit an applied migration).
2. `npm run cloudflare:d1:schema` and `node scripts/cloudflare-domain-constraints.mjs`; commit the regenerated `cloudflare/d1/*`.
3. A new numbered SQL file in `cloudflare/d1/migrations` plus a matching upgrade step (and new version number) in the `OutpostDatabase` constructor in `cloudflare/database/worker.ts`, so the private store migrates itself on first start.
4. Tests: `npm run test:integration` (disposable Postgres), `python3 scripts/qa-d1-schema.py`, `node scripts/qa-cloudflare-database.mjs`.

The private DO migrates one way. After a schema bump you cannot roll the data Worker back to an older build — roll forward with a fix.

## Production operations

- Use `npm run cloudflare -- <wrangler args>` (redacted, token from `.env.cloudflare`). Never print or copy credential files.
- Secrets: `node scripts/cloudflare-runtime-upload.mjs` (dry run) then `--apply`.
- D1 data: `cloudflare-stage-catalog.mjs` / `cloudflare-stage-library.mjs` with `--apply`, after `npm run data:sync` locally.
- Web Worker rollback: `npm run cloudflare -- rollback --name albionoutpost-web`.
- Discord profile: `npm run discord:setup -- --apply`. DNS/zone: `npm run cloudflare:security|mail|dnssec`.

## Ask first

Merging to `main`, rolling back the data Worker, any `--apply` that writes to production data, deleting anything (branches, data, Workers, DNS records), changing DNS/registrar/Discord settings, rotating tokens, or anything that could cost money. Never force-push `main` or rewrite shared history.

## Report

What shipped (commit, PR, run link) → checks and their results → post-deploy smoke result → anything rolled back or pending → follow-ups added to the roadmap.

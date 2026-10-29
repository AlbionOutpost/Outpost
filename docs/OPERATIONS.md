# Operations

Production is https://albionoutpost.com on Cloudflare Free. Source is `AlbionOutpost/Outpost` on GitHub. **Merging to `main` deploys.**

## Deploying

`.github/workflows/cloudflare-preview.yml` ("Cloudflare deployment") runs on every push to `main` that touches more than docs/Markdown, on manual dispatch, and on published releases tagged `v*` (other tags skip both quality and deploy).

1. **Quality** — reuses `quality.yml`: format, docs check, local Postgres/Redis, Playwright sandbox check, source secret scan, `npm run qa:phase`, bundle secret scan.
2. **Deploy** (environment `cloudflare-production`, one at a time):
   1. Generate and verify the SQLite runtime (Prisma wasm client, domain constraints, D1 schema check), stage catalog + library into a local D1, run `qa-cloudflare-database.mjs`.
   2. Cloudflare build, Cloudflare-mode Playwright run, secret scans.
   3. Production build with the Turnstile site key, `cloudflare-release-config.mjs` writes the real configs.
   4. `cloudflare-free-check.mjs` (each bundle ≤3 MiB gzip, no paid features), then `wrangler deploy` **data Worker first, then web Worker**.
   5. `cloudflare-deployment-check.mjs` probes the live site.

What CI does **not** do: upload runtime secrets, push catalog/library data to D1, or prove the live site works — GitHub runners are challenged by Bot Fight Mode, so the probe reports `BLOCKED` as a warning. After a deploy, smoke-test from your own machine:

```bash
node scripts/qa-cloudflare-hosted.mjs
node scripts/qa-cloudflare-auth.mjs
```

Every PR runs `quality.yml`; PRs and pushes that touch docs or Markdown also run `documentation.yml` (format, docs check, secret scan). A push to `main` deploys unless **every** changed file is under `docs/` or is `*.md`.

### Rolling back

- **Web Worker:** `npm run cloudflare -- rollback --name albionoutpost-web` (or pick a version in the Cloudflare dashboard → Workers → Deployments). Safe at any time.
- **Data Worker:** only roll back to a version built for the **same private schema version**. After a schema bump the DO has already migrated; roll forward with a fix instead.
- **D1 catalog:** D1 Time Travel can restore to any point in the last 7 days (30 on paid plans).

### Data pushes (manual)

| Task                             | Command                                                  |
| -------------------------------- | -------------------------------------------------------- |
| Push item catalog to D1          | `node scripts/cloudflare-stage-catalog.mjs --apply`      |
| Push archived builds/comps to D1 | `node scripts/cloudflare-stage-library.mjs --apply`      |
| Validate/install D1 invariants   | `node scripts/cloudflare-stage-invariants.mjs [--apply]` |
| Create/verify the D1 database    | `npm run cloudflare:d1:provision -- --apply`             |

The catalog push reads your local Postgres catalog (run `npm run data:sync` first); the library push reads `public/library/grind-*.json`.

## Runtime configuration

| Kind          | Values                                                                                                                                                                        | Where set                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Vars (web)    | `OUTPOST_RUNTIME`, `NEXTAUTH_URL`, `DISCORD_CLIENT_ID`, `OUTPOST_OWNER_DISCORD_ID`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_HOSTNAMES`                                   | `wrangler.jsonc` + `cloudflare-release-config.mjs`                                          |
| Secrets (web) | `NEXTAUTH_SECRET`, `DISCORD_CLIENT_SECRET`, `TURNSTILE_SECRET`, `OUTPOST_RENDER_SESSION_SECRET`                                                                               | `node scripts/cloudflare-runtime-upload.mjs --apply` (from `.env.cloudflare-runtime`)       |
| GitHub        | secret `CLOUDFLARE_API_TOKEN` (Workers deploy only, **expires 2027-01-26**); vars `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_CATALOG_DATABASE_ID`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Repo settings → environment `cloudflare-production` (`scripts/cloudflare-github-setup.mjs`) |

### Local credential files (git-ignored, mode 0600, never print or commit)

| File                      | Holds                                                                 |
| ------------------------- | --------------------------------------------------------------------- |
| `.env`                    | Local Node runtime: database, Redis, NextAuth, Discord                |
| `.env.cloudflare`         | Management token, account and zone IDs (used by `npm run cloudflare`) |
| `.env.cloudflare-runtime` | App secrets/config to upload to the web Worker                        |
| `.env.cloudflare-ci`      | The GitHub deploy token and its expiry                                |
| `.env.discord`            | Discord bot token for profile management                              |

`npm run cloudflare -- <wrangler args>` wraps wrangler with the management token, redacts output and refuses `login`/`logout`. `npm run cloudflare:status` checks the token and zone.

## Cloudflare zone

| Area          | State                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------- |
| DNS / domains | Zone active; apex and `www` are Workers custom domains; `www` redirects to apex                |
| TLS           | Full (strict), min TLS 1.2, TLS 1.3, always HTTPS (`npm run cloudflare:security`)              |
| WAF / bots    | Managed Free rules, custom rule blocking `/.env*` and repo/internal paths, Bot Fight Mode      |
| Mail          | No mail: null MX, `v=spf1 -all`, DMARC reject (`npm run cloudflare:mail`)                      |
| DNSSEC        | Signed at Cloudflare; **DS record not yet published at the registrar** (Namecheap) — see below |
| Access        | None; the site is public                                                                       |

**Publish DNSSEC:** in Namecheap → Domain → Advanced DNS → DNSSEC, add the DS that `npm run cloudflare:dnssec` prints (currently key tag 2371, algorithm 13, digest type 2). Re-read it before submitting; then run `npm run cloudflare:dnssec` again to confirm. To roll back, remove the DS at the registrar first and keep signing on until its TTL expires.

## Discord

- OAuth app `1564994799722045560`, scopes `identify email`, callback `https://albionoutpost.com/api/auth/callback/discord`. Public Bot off, no install link.
- `npm run discord:status` shows the bot/app profile; `npm run discord:setup -- --apply` applies avatar, icon, description and tags (backs up to `.qa/discord/`). The helper only touches `/users/@me` and `/applications/@me`.
- Still to do in the Developer Portal: real Terms and Privacy URLs (after the legal page is completed).

## Free-tier budgets

| Budget             | Limit / setting                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------- |
| Worker bundle      | 3 MiB gzip each (web ≈1.98 MB, data ≈1.02 MB)                                            |
| Session DO         | 240 requests/min per browser session                                                     |
| AODP upstream      | 50/min and 250/5 min per region (AODP publishes 100/min, 300/5 min)                      |
| Game Info upstream | 12/min per region                                                                        |
| D1                 | Imports and index updates count as row writes; there is no scheduled ingestion by design |

Check current Free plan quotas on Cloudflare's limits pages before adding any background job, cron or ingestion.

## Not set up yet

- Backups of the private Durable Object (users, builds, Teams) and a tested restore.
- Uptime/error alerting to the owner.
- Deploy token rotation reminder (expires 2027-01-26).
- GitHub org MFA requirement; branch protection (needs a paid plan on private repos).

These are tracked in [ROADMAP.md](ROADMAP.md#owner-actions).

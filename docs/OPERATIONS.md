# Operations

Production is https://albionoutpost.com on Cloudflare Workers Paid (zone on the Free plan). Source is `AlbionOutpost/Outpost` on GitHub. **Merging to `main` deploys.**

## Deploying

`.github/workflows/cloudflare-preview.yml` ("Cloudflare deployment") runs on every push to `main` that touches more than docs/Markdown, on manual dispatch, and on published releases tagged `v*` (other tags skip both quality and deploy).

1. **Quality** — reuses `quality.yml` (`checks` job only): format, docs check, local Postgres/Redis (`scripts/ci-local-services.mjs`), SQLite runtime check, source secret scan, `npm run qa:phase` (skipping the Node browser run, which the verify job replaces with the Cloudflare-mode run, and the live AODP check), bundle secret scan.
2. **Verify** — generate and verify the SQLite runtime (Prisma wasm client, domain constraints, D1 schema check), stage catalog + library into a local D1, run `qa-cloudflare-database.mjs`, build Cloudflare, typecheck both Workers, then run `test:e2e:core` in Cloudflare mode. The separate full-suite workflow runs all browser tests.
3. **Deploy** (environment `cloudflare-production`, one at a time, after both Quality and Verify pass):
   1. Regenerate the SQLite runtime.
   2. Production build with the Turnstile site key, `cloudflare-release-config.mjs` writes the real configs, secret scans.
   3. `cloudflare-free-check.mjs` (each bundle ≤10 MiB gzip, the Workers Paid limit; no unreviewed routes or extra paid services), then `wrangler deploy` **data Worker first, then web Worker**.
   4. `cloudflare-deployment-check.mjs` probes the live site.

What CI does **not** do: upload runtime secrets, push catalog/library data to D1, or prove the live site works — GitHub runners are challenged by Bot Fight Mode, so the probe reports `BLOCKED` as a warning. After a deploy, smoke-test from your own machine:

```bash
node scripts/qa-cloudflare-hosted.mjs
node scripts/qa-cloudflare-auth.mjs
```

Every PR runs `quality.yml`; PRs and pushes that touch docs or Markdown also run `documentation.yml` (format, docs check, secret scan). A push to `main` deploys unless **every** changed file is under `docs/` or is `*.md`.

The live AODP check (`npm run test:live`) is not part of CI because it spends real upstream budget; run the **Live data check** workflow manually (Actions → Live data check → Run workflow) when you need it.

### Repository security controls

The owner-authorized 2 November repair applied and read back the `Outpost security quality gates`
ruleset on the default branch: pull requests, no force pushes/deletion, linear history, and
required GitHub Actions `checks` and `browser` checks. No extra approving reviewer is required
for the solo-owner workflow. Secret push protection is enabled. The bounded helper
`node scripts/github-security-remediation.mjs` is read-only by default; `--apply` changes only
that owned ruleset and secret push protection, preserving unrelated/inherited settings.
It does not publish code or change repository visibility. Application deployment remains a
separate action; local repair evidence does not prove that the live site contains the repair.

### Rolling back

- **Web Worker:** `npm run cloudflare -- rollback --name albionoutpost-web` (or pick a compatible version in the dashboard). Check both schema compatibility and security behavior: pre-admin web code does not enforce schema 7 bans. Retain matching enforcement or roll forward; a database-readable build alone is not a safe rollback.
- **Data Worker:** only roll back to a version built for the **same private schema version**. After a schema bump the DO has already migrated; roll forward with a fix instead.
- **D1 catalog:** D1 Time Travel can restore to any point in the last 7 days (30 on paid plans).
- **Private data:** see [Backups and recovery](#backups-and-recovery).

### Data pushes (manual)

| Task                                           | Command                                                                                                                                                                                                                                                          |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Push item catalog to D1                        | `node scripts/cloudflare-stage-catalog.mjs --apply`                                                                                                                                                                                                              |
| Push archived builds/comps to D1               | `node scripts/cloudflare-stage-library.mjs --apply`                                                                                                                                                                                                              |
| Carry like counts and the listed total into D1 | `node scripts/cloudflare-library-upvotes.mjs --apply` locally, or the manual **Library data** workflow (production environment; idempotent). The workflow currently fails with 401: `CLOUDFLARE_API_TOKEN` is Workers-deploy only and needs D1 Edit for this job |
| Validate/install D1 invariants                 | `node scripts/cloudflare-stage-invariants.mjs [--apply]`                                                                                                                                                                                                         |
| Create/verify the D1 database                  | `npm run cloudflare:d1:provision -- --apply`                                                                                                                                                                                                                     |

The catalog push reads your local Postgres catalog (run `npm run data:sync` first); the library push reads `public/library/grind-*.json`. The library push also (re)creates the archive indexes in `cloudflare/d1/migrations/0002_owned_library.sql`; all statements are `IF NOT EXISTS`, so rerunning it on an already-staged archive only adds missing indexes.

## Runtime configuration

| Kind          | Values                                                                                                                                                                                                                                                                                                                                  | Where set                                                                                   |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Vars (web)    | `OUTPOST_RUNTIME`, `NEXTAUTH_URL`, `DISCORD_CLIENT_ID`, `OUTPOST_OWNER_DISCORD_ID`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_HOSTNAMES`, optional `NEXT_PUBLIC_ADSENSE_CLIENT` (AdSense `ca-pub-…`; unset = no ad units, strict CSP) with `NEXT_PUBLIC_ADSENSE_SLOT_HUB` / `NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE` (the two ad unit ids) | `wrangler.jsonc` + `cloudflare-release-config.mjs`                                          |
| Secrets (web) | `NEXTAUTH_SECRET`, `DISCORD_CLIENT_SECRET`, `TURNSTILE_SECRET`, `OUTPOST_RENDER_SESSION_SECRET`; Supporter billing: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_SUPPORTER` (all three or none)                                                                                                                          | `node scripts/cloudflare-runtime-upload.mjs --apply` (from `.env.cloudflare-runtime`)       |
| GitHub        | secret `CLOUDFLARE_API_TOKEN` (Workers deploy only, **expires 2027-01-26**); vars `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_CATALOG_DATABASE_ID`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`                                                                                                                                                           | Repo settings → environment `cloudflare-production` (`scripts/cloudflare-github-setup.mjs`) |

### Local credential files (git-ignored, mode 0600, never print or commit)

| File                      | Holds                                                                 |
| ------------------------- | --------------------------------------------------------------------- |
| `.env`                    | Local Node runtime: database, Redis, NextAuth, Discord                |
| `.env.cloudflare`         | Management token, account and zone IDs (used by `npm run cloudflare`) |
| `.env.cloudflare-runtime` | App secrets/config to upload to the web Worker                        |
| `.env.cloudflare-ci`      | The GitHub deploy token and its expiry                                |
| `.env.discord`            | Discord bot token for profile management                              |

`npm run cloudflare -- <wrangler args>` wraps wrangler with the management token, redacts output and refuses `login`/`logout`. `npm run cloudflare:status` checks the token and zone.

## Supporter billing (Stripe)

**Off for now (owner, 6 Nov 2026): everything is free.** With no Stripe keys, `billingEnabled()` is false: Teams are open to everyone, `/supporter` and `/premium` show the 404 page, the landing band and Teams window name no plan, and the sitemap leaves `/supporter` out (re-add it in `scripts/build-sitemap.ts` when billing returns).

The Supporter plan is a monthly subscription sold through Stripe Checkout; Outpost never sees a card. To switch it on:

1. In the Stripe dashboard create a product "Outpost Supporter" with one recurring monthly price; note the `price_…` id.
2. Add a webhook endpoint `https://albionoutpost.com/api/billing/webhook` with the events `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`; note the signing secret `whsec_…`.
3. Enable the customer portal (Settings → Billing → Customer portal) so Supporters can change cards, download invoices and cancel.
4. Upload `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and `STRIPE_PRICE_SUPPORTER` as web secrets (step above) and deploy. The env validator refuses a partial set.

Until all three are set the Supporter page says nothing is for sale and no gate is enforced. Once set: creating a Team workspace and managing one (profile, events, announcements, invites, roles, shared builds, loot splits) need the team **owner** on the plan; members keep reading, RSVPs and leaving. The plan on the account is written only by the webhook (signature verified, subscription re-read from Stripe on every event); `past_due` keeps the benefits until Stripe gives up. Test with Stripe's test keys and `stripe listen --forward-to localhost:3000/api/billing/webhook`.

## Advertising (AdSense)

Two placements and never more than one unit on a page: `hub` after a hub's main list (Build Library, Group Builds, Guides, landing) and `article` after a guide or library build. Never inside calculators, editors, Team workspaces, account pages or dialogs; never sticky or interstitial; height is reserved so nothing jumps. Supporters see none (checked on the server). The deploy workflow passes the client id and the two unit ids into the Worker vars from repository variables (`NEXT_PUBLIC_ADSENSE_CLIENT`, `NEXT_PUBLIC_ADSENSE_SLOT_HUB`, `NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE`); they default to the owner's `ca-pub-3003146014371070`, hub `8311745950` and article `2411572079`. A valid client id adds the passive `google-adsense-account` meta tag to every page (what Google's site verification looks for) and serves `/ads.txt`. Ads run only once `OPERATOR_NAME`, `OPERATOR_ADDRESS` and `OPERATOR_EMAIL` are set too (a commercial site needs the full imprint): then the head loads Google's ad script, which first shows the certified consent message configured in AdSense (EEA/UK/CH) or the US-state opt-out link, and each placement renders a labelled unit. Supporters load neither.

Switch-on order (done 6 Nov 2026 up to the imprint): client id → deploy → confirm the site in AdSense → publish the EU and US consent messages in AdSense (Privacy & messaging) → create the `hub` and `article` units → set the `OPERATOR_*` Worker vars.

## Cloudflare zone

| Area          | State                                                                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DNS / domains | Zone active; apex and `www` are Workers custom domains; `www` redirects to apex                                                                                                 |
| TLS           | Full (strict), min TLS 1.2, TLS 1.3, always HTTPS (`npm run cloudflare:security`)                                                                                               |
| WAF / bots    | Managed Free rules, custom rule blocking `/.env*` and repo/internal paths, Bot Fight Mode; rate-limit rule: 60 `/api/` requests per 10 s per IP and colo, then blocked for 10 s |
| Mail          | No mail: null MX, `v=spf1 -all`, DMARC reject (`npm run cloudflare:mail`)                                                                                                       |
| DNSSEC        | Signed at Cloudflare; **DS record not yet published at the registrar** (Namecheap) — see below                                                                                  |
| Access        | None; the site is public                                                                                                                                                        |

**Publish DNSSEC:** in Namecheap → Domain → Advanced DNS → DNSSEC, add the DS that `npm run cloudflare:dnssec` prints (currently key tag 2371, algorithm 13, digest type 2). Re-read it before submitting; then run `npm run cloudflare:dnssec` again to confirm. To roll back, remove the DS at the registrar first and keep signing on until its TTL expires.

## Discord

- OAuth app `1564994799722045560`, scopes `identify email`, callback `https://albionoutpost.com/api/auth/callback/discord`. Public Bot off, no install link.
- `npm run discord:status` shows the bot/app profile; `npm run discord:setup -- --apply` applies avatar, icon, description and tags (backs up to `.qa/discord/`). The helper only touches `/users/@me` and `/applications/@me`.
- Still to do in the Developer Portal: real Terms and Privacy URLs (after the legal page is completed). The page is unpublished for now (`src/lib/legal.ts`), so `/legal` returns 404 until then.

## Free-tier budgets

| Budget             | Limit / setting                                                                                                                                                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Worker bundle      | 10 MiB gzip each on Workers Paid (web ≈2.96 MiB, data ≈1.02 MB)                                                                                                                                                                                              |
| Daily requests     | 100 k Worker and 100 k Durable Object requests per day; static assets are free                                                                                                                                                                               |
| DO duration        | 13,000 GB-s per day (≈ 28 h of one session object at 128 MB); over it every page answers Error 1101 until 00:00 UTC. Renders are capped at 30 s and `waitUntil` work at 10 s (`cloudflare/web/worker.ts`); Workers Paid raises the allowance to 400,000 GB-s |
| Session DO         | 240 requests/min per browser session, in memory (no storage writes)                                                                                                                                                                                          |
| AODP upstream      | 50/min and 250/5 min per region (AODP publishes 100/min, 300/5 min)                                                                                                                                                                                          |
| Game Info upstream | 12/min per region                                                                                                                                                                                                                                            |
| D1                 | Imports and index updates count as row writes; there is no scheduled ingestion by design                                                                                                                                                                     |

Measure with the account GraphQL analytics (`workersInvocationsAdaptive`, `durableObjectsInvocationsAdaptiveGroups`, zone `httpRequestsAdaptiveGroups` by path and user agent). Check current Free plan quotas on Cloudflare's limits pages before adding any background job, cron or ingestion.

## Backups and recovery

- **Private data** (`accounts-v1-eu`: users, sessions, builds, Comps, Teams, scenarios, timers, watchlists) uses Cloudflare's built-in **point-in-time recovery**: any moment in the last 30 days can be restored. `scripts/cloudflare-recovery.mjs` deploys a short-lived private helper Worker, runs one action and deletes it again:

  ```bash
  node scripts/cloudflare-recovery.mjs bookmark                          # check recovery works (read-only)
  node scripts/cloudflare-recovery.mjs restore --at 2026-11-02T18:00:00Z  # dry run
  node scripts/cloudflare-recovery.mjs restore --at 2026-11-02T18:00:00Z --apply
  ```

  A restore rewinds **everything** in the private store to that moment; it prints an undo command (`restore --bookmark <b> --apply`) that returns to the state just before the restore. Results are saved to `.qa/recovery/`. Get the owner's OK before any `--apply`.

- **Catalog** (D1): Time Travel, 7 days on Free (`npm run cloudflare -- d1 time-travel restore albionoutpost-staging --timestamp <ISO>`). The catalog can also be rebuilt from the repo with the data-push scripts.
- **Library and static content** are in the repository.
- Not covered: deleting a whole Durable Object namespace or the account. There is no off-Cloudflare copy.

## Alerts

Cloudflare Notifications email the owner (account email) on: Worker errors (real-time issues in the web and data Workers), HTTP DDoS attacks, Universal SSL certificate events and abuse reports. Manage them in the dashboard under Notifications. There is no free uptime probe — Health Checks need a paid plan, and GitHub runners are challenged by Bot Fight Mode.

## Not set up yet

- Off-Cloudflare backup copy.
- Uptime probe (see Alerts).
- GitHub org MFA requirement; branch protection (needs a paid plan on private repos).

These are tracked in [ROADMAP.md](ROADMAP.md#owner-actions).

## Administration operations

Use `/admin` with the configured owner's verified Discord account. A global MODERATOR has reports only. No public endpoint assigns global roles. Gift Supporter access, revoke sessions and manage Outpost identity bans through the reasoned/versioned controls rather than direct database edits. Gifts do not alter paid subscriptions; bans do not cancel them or remove Team ownership. Review reported activity before acting; the queue is a triage aid, not a verdict. Minimal ban/audit identifiers survive account deletion and currently have no automated retention purge.

Private database schema 7 requires the matching data Worker and additive migration 0008. Do not roll back to schema 6. Preserve ban enforcement during any web rollback. [Administrative runbook](ADMINISTRATION.md) covers permissions, expiries, sign-in races, retained data and verification limits.

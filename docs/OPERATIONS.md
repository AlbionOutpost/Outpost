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

The catalog push reads your local Postgres catalog (run `npm run data:sync` first); the library push reads `public/library/grind-*.json`. The library push creates the archive tables from `cloudflare/d1/migrations/0002_owned_library.sql`, then applies the catalog read indexes in `0017_catalog_reads.sql` (it drops `0002`'s order indexes, creates the partial and item indexes, then runs `PRAGMA optimize`). Every statement is `IF [NOT] EXISTS`, so reruns are safe. `cloudflare-library-upvotes.mjs` applies `0017` too: that is how an existing database gets it. **Order:** deploy the data Worker that writes the listed-build terms as literals first, then apply `0017`; an older data Worker without those literals would read every stored build once the old indexes are gone. Applying it writes about 17 k index rows once.

## Runtime configuration

| Kind          | Values                                                                                                                                                                                                                                                                                                                                                                                            | Where set                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Vars (web)    | `OUTPOST_RUNTIME`, optional `OUTPOST_SAVE_MODE=1` ([Save mode](#save-mode)), `NEXTAUTH_URL`, `DISCORD_CLIENT_ID`, `OUTPOST_OWNER_DISCORD_ID`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_HOSTNAMES`, optional `NEXT_PUBLIC_ADSENSE_CLIENT` (AdSense `ca-pub-…`; unset = no ad units, strict CSP) with `NEXT_PUBLIC_ADSENSE_SLOT_HUB` / `NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE` (the two ad unit ids) | `wrangler.jsonc` + `cloudflare-release-config.mjs`                                          |
| Secrets (web) | `NEXTAUTH_SECRET`, `DISCORD_CLIENT_SECRET`, `TURNSTILE_SECRET`; Supporter billing: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_SUPPORTER` (all three or none)                                                                                                                                                                                                                     | `node scripts/cloudflare-runtime-upload.mjs --apply` (from `.env.cloudflare-runtime`)       |
| GitHub        | secret `CLOUDFLARE_API_TOKEN` (Workers deploy only, **expires 2027-01-26**); vars `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_CATALOG_DATABASE_ID`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; cost check: secrets `CLOUDFLARE_ANALYTICS_TOKEN` (Account Analytics Read), `DISCORD_COST_WEBHOOK_URL`, var `OUTPOST_BILLING_DAY`; optional var `OUTPOST_SAVE_MODE` ([Save mode](#save-mode))                       | Repo settings → environment `cloudflare-production` (`scripts/cloudflare-github-setup.mjs`) |

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

**Off for now (owner, 6 Nov 2026): everything is free.** With no Stripe keys, `billingEnabled()` is false. Since 8 Nov the launch grant (`launchGrant` in `src/lib/billing/plan.ts`) makes every account a lifetime Supporter, so the Team gates are on but lock nobody; `/supporter` explains the grant (no price, no checkout) and `/premium` redirects there; the landing band and Teams window name no plan, and the sitemap leaves `/supporter` out. To end the launch, set `launchGrant.closedAt` to the date: accounts created before it keep Supporter. With the launch closed and billing off, newer accounts can create and run a Team only with an admin gift.

The Supporter plan is a monthly subscription sold through Stripe Checkout; Outpost never sees a card. To switch it on:

1. In the Stripe dashboard create a product "Outpost Supporter" with one recurring monthly price; note the `price_…` id.
2. Add a webhook endpoint `https://albionoutpost.com/api/billing/webhook` with the events `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`; note the signing secret `whsec_…`.
3. Enable the customer portal (Settings → Billing → Customer portal) so Supporters can change cards, download invoices and cancel.
4. Upload `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and `STRIPE_PRICE_SUPPORTER` as web secrets (step above) and deploy. The env validator refuses a partial set.

While the launch grant is open nothing is offered for sale even with keys set. After it closes: creating a Team workspace and managing one (profile, events, announcements, invites, roles, shared builds, loot splits, wallet, games, giveaways) need the team **owner** on the plan; members keep reading, RSVPs and leaving. The plan on the account is written only by the webhook (signature verified, subscription re-read from Stripe on every event); `past_due` keeps the benefits until Stripe gives up. Test with Stripe's test keys and `stripe listen --forward-to localhost:3000/api/billing/webhook`.

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

## Cost guardrails

The bill must stay at the **$5 Workers Paid base**. Treat every included monthly allowance as a ceiling, and check usage after any change that adds requests, polling, cron work or Durable Object traffic.

| Allowance (per month)   | Included   | Last 31 days (to 9 Nov 2026)                                                                               |
| ----------------------- | ---------- | ---------------------------------------------------------------------------------------------------------- |
| Worker requests         | 10 million | 277 k                                                                                                      |
| Worker CPU time         | 30 M ms    | ≈ 430 M ms a month at the 9 Nov rate once renders moved here; see below for the cuts                       |
| Durable Object requests | 1 million  | 657 k: 500 k to `albionoutpost-data`, 157 k to the retired `OutpostSession`                                |
| Durable Object duration | 400 k GB-s | ≈ 840 k GB-s, almost all `OutpostSession` (6.7 M s); `AbuseBudget` 7.4 k s and `KillBoard` 28 k s are tiny |
| D1 rows read            | 25 billion | 1.1 billion (387 k queries, ≈ 2.8 k rows each; 582 writes, 113 k rows)                                     |

Overage is billed per started unit: Durable Object duration costs $12.50 per million GB-s, Worker CPU $0.02 per million ms, Durable Object requests $0.15 per million.

**What keeps usage inside the allowances:**

- **No Durable Object renders pages.** Durable Objects bill wall-clock time while anything keeps them in memory (a request, a timer, a `waitUntil` promise, a pending service-binding call, each for up to 15 minutes); `OutpostSession` billed 43–250 s of duration per request against 0.6 s of CPU and cost about $7 a day by 9 Nov 2026. Pages now render in the web Worker, which bills CPU only. Never put request handling, polling or rendering in a Durable Object.
- **Worker CPU is the one to watch.** After rendering moved into the Worker (9 Nov 2026) it was the only allowance over its limit: in the 3 h to 15:00 UTC on 9 Nov the web Worker served 5,600 requests with 1.89 M ms of CPU (≈ 340 ms each, ≈ 430–450 M ms a month against 30 M included). Workers Observability showed where it went: crawlers made ≈ 90 % of requests and CPU (Amazonbot 34 %, AhrefsBot 24 %, SemrushBot 23 %, Googlebot 7 %, MJ12bot 3 %), almost all on archived builds (`/builds/library/*`, half of them `?region=` copies) and the build list's search, layout and filter variants. Each request on a cold isolate cost ≈ 0.9 s (P50 ≈ 0.1 s warm); at this traffic most requests wake a cold isolate.
- **What cut it (Nov 2026):** the Next server is evaluated at isolate startup, which is not billed, instead of inside the first request (≈ 0.3 s off every cold request; startup ≈ 0.3 s locally against the 1 s limit, check with `node node_modules/wrangler/bin/wrangler.js check startup --config wrangler.jsonc`); `robots.txt` keeps crawlers off duplicate URLs (search results, the grid/list switch, queries on archived build, comp and item pages) and disallows the backlink crawlers; `robots.txt` and the web manifest are static files; probe paths (`/wp-*`, `*.php`) get a bare 404; the archive pages stay in the page cache for a day; library JSON is parsed once per isolate. Projected from that sample: ≈ 25–35 M CPU-ms a month once crawlers re-read robots.txt (usually within a day), from ≈ 430 M; the startup change alone gives ≈ 230–300 M. Check after a deploy with the query below and Workers Observability (`$workers.cpuTimeMs` by `$workers.event.request.url` and user agent). If a backlink crawler should be let back in, drop it from the list in `scripts/build-sitemap.ts`. `limits.cpu_ms` (10 s) stops a runaway request.
- **Edge budgets cost no Durable Object request.** The web Worker's per-address limits are Workers Rate Limiting bindings (`ratelimits` in `wrangler.jsonc`), not `AbuseBudget` objects. `AbuseBudget` is reached only for writes, sign-in, exports and AODP/Game Info upstream misses.
- **Static assets and edge-cache hits are free of app work.** Assets never invoke the Worker; signed-out reads of the public APIs in `cloudflare/web/edge-cache.ts` are answered from the edge cache before the rate limit and the app.
- **Signed-out public pages are edge-cached** (`cloudflare/web/page-cache.ts`, [ARCHITECTURE.md § Page cache](ARCHITECTURE.md#page-cache)): 60 s for the landing, live tools, market data and the build, comp and Team lists (a player's own build, comp or Team page always renders), 2 min for item pages, 5 min for tools, a day for the archive (library builds and comps, guides). A hit costs a Worker request, one Cache API read and a few ms of CPU to renew the nonce, instead of a render (≈ 0.1 s warm, up to ≈ 0.9 s on a cold isolate). The saving is renders × the signed-out share on allowlisted routes × the hit rate; the cache is per Cloudflare location, so quiet pages in quiet locations still miss. Hits carry `X-Outpost-Edge: hit`; after a deploy, compare the web Worker's CPU (`workersInvocationsAdaptive`, P50 should fall) with the week before.
- **Purge or disable the page cache.** Every deploy or rollback starts it empty (the key holds the version id), so a redeploy purges it; Caching → Purge Everything on the zone also clears it. To turn it off, make `pageCacheEntry` return `null` (or drop a route from `pageRoutes`) and deploy, or roll back. Remove a route at once if it ever shows anything viewer-specific signed out.
- **Log sampling.** Workers Logs include 20M log events a month. The web Worker samples 20 % of requests (`head_sampling_rate` 0.2 in `wrangler.jsonc`) and the data Worker 10 %, which is plenty for debugging and keeps logs inside the allowance as traffic grows. Errors still show in Observability; raise the rate for a short investigation, then lower it again.
- **Kill collector every two minutes.** The data Worker's cron runs `*/2 * * * *`, half the invocations, Game Info reads and `KillBoard` writes of a per-minute schedule. Albion publishes kills 6–7 minutes late, so the feed loses at most a minute; the window counts as fresh for 5 minutes.
- **Zone settings (dashboard).** Early Hints and Smart Tiered Cache are on (free); Bot Fight Mode and AI Crawl Control blocks for AI training crawlers are on; search engines, AI search and link-preview bots stay allowed.
- **Polling hits the edge cache.** The kill feed's "Update every minute" (`/api/combat-events`, 30 s), the homepage pulse and Market Explorer (`/api/market`, 60 s) and item database prices (`/api/items/prices`, 2 min) are edge-cached for signed-out visitors, and every poll waits while the tab is hidden. A Team's open loot roll polls every 20 s while visible and stops when the roll closes.
- **D1 reads stay on indexes.** Measured locally on the real catalog and archive (`meta.rows_read`, 9 Nov 2026), rows read per query fell from ≈ 2,700 to ≈ 530 on average across 39 page and search paths; an item page from 13 k to ≈ 100, a library build page's weapon list from 5.5 k to 5, `/api/search` from 14 k to 2.4–3.8 k, the comps page's member lookup from 32 k to ≈ 360, the landing's featured builds from 10.8 k to 23. What still reads thousands: the item database's tier-band counts (≈ 7.3 k, a `COUNT` has to read every match; the data Worker keeps them 5 min), free-text library searches (≤ 1.4 k, the listed builds) and Market Explorer's grouped item search. Keep new catalog queries on an index (check `EXPLAIN QUERY PLAN`): no `active` next to an `id IN` list, no OR across columns, literal partial-index terms.
- **Fixed background work:** the data Worker's cron makes 3 `KillBoard` requests a minute (≈ 134 k a month). A signed-out page view makes no Durable Object request; a signed-in one reads its session from `accounts-v1-eu`.

**Expected after 9 Nov 2026:** Durable Object duration falls from ≈ 840 k GB-s to roughly 15–20 k GB-s a month (the data Worker's objects); Durable Object requests drop by the 157 k session requests plus the edge-budget `AbuseBudget` calls; Worker CPU rises as above.

### Daily cost check

`.github/workflows/cost-check.yml` ("Cloudflare cost check") runs `scripts/cloudflare-cost-check.mjs` every day at 06:23 UTC (and on demand: Actions → Cloudflare cost check → Run workflow). It reads the GraphQL Analytics API for the billing period so far and the last full UTC day, projects each line to the end of the period and prints a table (also in the run's summary):

| Line                    | Dataset                                                             | Included (Workers Paid)                                                                              |
| ----------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Worker requests, CPU    | `workersInvocationsAdaptive` (`requests`, `cpuTimeUs`), per script  | 10 M requests, 30 M CPU-ms ([pricing](https://developers.cloudflare.com/workers/platform/pricing/))  |
| DO requests             | `durableObjectsInvocationsAdaptiveGroups`                           | 1 M ([DO pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/))              |
| DO duration             | `durableObjectsPeriodicGroups.activeTime` × 0.125 GB, per namespace | 400 k GB-s                                                                                           |
| DO SQLite rows, storage | `durableObjectsPeriodicGroups` rows, `durableObjectsStorageGroups`  | 25 B read, 50 M written, 5 GB                                                                        |
| D1 rows, storage        | `d1AnalyticsAdaptiveGroups`, `d1StorageAdaptiveGroups`              | 25 B read, 50 M written, 5 GB ([D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)) |
| KV, R2                  | `kvOperationsAdaptiveGroups`, `r2OperationsAdaptiveGroups`          | Only when a Worker binds them (none does today)                                                      |

Allowances were checked against Cloudflare's pricing pages on 9 Nov 2026; they live in `ALLOWANCES` in the script. It **alerts** when a period projection reaches 80 % of an allowance, when the last day's rate would pass 100 % over a whole period, or when storage passes 80 %. The alert goes to Discord when the webhook secret is set, and always shows as a warning on the run. An alert never fails the run; a Cloudflare or Discord API error does (GitHub then emails the owner). The DO SQLite row and storage lines are best effort: if the API does not answer them they show "Unavailable", never zero. Worker requests include service-binding calls, which are not billed, so that line runs high. Early in a period the projection counts at least one elapsed day.

**What the owner adds** (repository → Settings → Environments → `cloudflare-production`; the job runs in that environment to read `CLOUDFLARE_ACCOUNT_ID`, so each run is listed there as a deployment):

1. **Secret `CLOUDFLARE_ANALYTICS_TOKEN`.** Cloudflare dashboard → My Profile → API Tokens → Create Token → Custom token: permission **Account → Account Analytics → Read**, account resources: the Outpost account only, an expiry (set a reminder). Nothing else. The deploy token (`CLOUDFLARE_API_TOKEN`) is Workers Scripts Write only and is not used here.
2. **Secret `DISCORD_COST_WEBHOOK_URL`** (optional but recommended). In the Discord server: channel → Edit Channel → Integrations → Webhooks → New Webhook → Copy Webhook URL. Outpost's bot cannot post messages by design, so the alert uses a webhook. The message mentions nobody.
3. **Variable `OUTPOST_BILLING_DAY`** (optional): the day of the month the Workers Paid subscription renews (Manage Account → Billing → Subscriptions). Monthly allowances reset on that day, not on the 1st. Default 1.

Until the token exists, the run ends with a notice and does nothing. Run it by hand once after adding the secrets.

### Cost budget on pull requests

Every pull request fails when a change makes the site measurably dearer to run. The budgets live in `scripts/cloudflare-cost-budget.json`; change one only on purpose, with the reason in the PR.

| Check                                                                                                                          | Where                                                                                    | Why this signal                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web Worker ≤ 3,840 KiB gzip, data Worker ≤ 1,280 KiB (9 Nov: 3,206 and 1,028; about 20 % headroom)                             | `quality.yml` "Cost budget": Cloudflare build, then `scripts/cloudflare-cost-budget.mjs` | Deterministic; a bigger bundle starts slower on every cold isolate and nears the 10 MiB limit; catches a large JSON or library pulled into the Worker |
| The prerendered routes (icons, favicon, `security.txt`) stay prerendered; `robots.txt` and the manifest are files in `public/` | same step, from `.next/prerender-manifest.json`                                          | A static route turned dynamic costs a Worker request and render per hit                                                                               |
| Every page-cache route keeps its TTL, and the route count matches                                                              | `tests/cost-budget.test.ts` (in `npm test`)                                              | Dropping a route or shortening a TTL silently turns cached views back into ≈ 0.6 s renders                                                            |
| Every edge-cached API route keeps its TTL                                                                                      | same test                                                                                | Polling endpoints stay cache hits                                                                                                                     |
| No new Durable Object binding, class migration, cron, rate-limit binding or paid service (KV, R2, Queues, Workflows, AI …)     | same test; every DO class must be named in [ARCHITECTURE.md](ARCHITECTURE.md)            | Durable Objects bill wall-clock time and requests; crons run forever on their schedule                                                                |

No CPU benchmarks run in CI: runner timings are too noisy to gate on. Watch CPU with the daily check instead.

### Save mode

An emergency switch that keeps signed-out pages and API answers in the edge cache ten times longer (at most an hour): 60 s pages for 10 minutes, the kill feed's 30 s for 5 minutes, 5 min reference pages for 50 minutes. More visits are answered from a cached copy instead of a render. Nothing else changes: the same routes are cached, signed-in visitors always render, and every price still shows its own observation age. Client polling intervals stay as they are, but each poll is more often a cache hit. Code: `cloudflare/web/save-mode.ts`.

- **On, at once:** Cloudflare dashboard → Workers & Pages → `albionoutpost-web` → Settings → Variables and Secrets → Add → Type **Text**, name `OUTPOST_SAVE_MODE`, value `1` → Deploy. This creates a new version, so the page cache starts empty and fills with the longer lives.
- **Keep it on across deploys:** a deploy replaces dashboard variables, so also set the GitHub variable `OUTPOST_SAVE_MODE` = `1` (Settings → Environments → `cloudflare-production` → Variables). `cloudflare-release-config.mjs` passes it to the web Worker.
- **Off:** delete the dashboard variable (or set it to `0`) and deploy, and delete the GitHub variable. Entries stored while it was on keep their longer life until they expire (at most an hour) or the next deploy.

### Owner: set Cloudflare billing notifications

These email the account address and need no code. Check them once:

1. **Budget alert:** dashboard → Manage Account → Billing → Billable Usage → **Set Budget Alert** → amount **$1** → Create (or Notifications → Add → Budget Alert). It counts usage charges only, not the $5 plan fee, so $1 means "anything over the base". Cloudflare may already have created a default $10 alert; keep it or lower it. Budget alerts are worked out once a day, so they fire the day after.
2. **Watch it:** Manage Account → Billing → Billable Usage shows each product's usage and cost for the current billing period, matching the invoice; the Workers & Pages, D1 and Durable Objects pages show the same in their sidebar.
3. **Notifications:** dashboard → Notifications → Add; keep the Worker error and DDoS alerts listed under [Alerts](#alerts).

**Check usage** with the account GraphQL API (`https://api.cloudflare.com/client/v4/graphql`, a token with Account Analytics read):

```graphql
query Usage($account: string!, $since: Date!, $until: Date!) {
  viewer {
    accounts(filter: { accountTag: $account }) {
      durableObjectsPeriodicGroups(limit: 1000, filter: { date_geq: $since, date_leq: $until }) {
        dimensions {
          namespaceId
          datetimeHour
        }
        sum {
          activeTime
          cpuTime
        }
      }
      durableObjectsInvocationsAdaptiveGroups(
        limit: 1000
        filter: { date_geq: $since, date_leq: $until }
      ) {
        dimensions {
          namespaceId
          scriptName
        }
        sum {
          requests
        }
      }
      workersInvocationsAdaptive(limit: 1000, filter: { date_geq: $since, date_leq: $until }) {
        dimensions {
          scriptName
        }
        sum {
          requests
          subrequests
        }
        quantiles {
          cpuTimeP50
          cpuTimeP99
        }
      }
      d1AnalyticsAdaptiveGroups(limit: 1000, filter: { date_geq: $since, date_leq: $until }) {
        dimensions {
          databaseId
        }
        sum {
          rowsRead
          rowsWritten
        }
      }
    }
  }
}
```

`activeTime` is in microseconds; GB-s = seconds × 0.125. Zone `httpRequestsAdaptiveGroups` by path and user agent shows who is calling. Check Cloudflare's pricing and limits pages before adding any background job, cron, ingestion or Durable Object.

**After the deploy that moved rendering into the Worker** (and after any deploy touching `cloudflare/web`): an hour later, `durableObjectsPeriodicGroups` for the `OutpostSession` namespace should show no new `activeTime`, and the web Worker's `workersInvocationsAdaptive` CPU (P50 and P99) should stay well under the 10 s cap. If 429s climb, compare the Rate Limiting counts with the zone analytics before raising a limit.

### Retiring the session object

Deleting a Durable Object class needs a `deleted_classes` migration, which cannot be undone and blocks `wrangler rollback` to any version before it. So it happens in two releases:

1. **9 Nov 2026 (this release):** pages render in the Worker; the `SESSIONS` binding is gone; the class stays exported as an inert stub (answers 410, stores nothing) and the `v1-sessions` migration is unchanged. No migration runs, so `npm run cloudflare -- rollback --name albionoutpost-web` still works.
2. **The next release, once the post-deploy check above is clean for a few days:** delete the class from `cloudflare/web/worker.ts` and from the local QA entry in `scripts/cloudflare-local-server.mjs`, and add `{ "tag": "v2-retire-sessions", "deleted_classes": ["OutpostSession"] }` to `migrations` in `wrangler.jsonc`. The objects hold no data. Deploy it on its own (no other change), through the normal workflow.

After step 1 the web Worker's `OUTPOST_RENDER_SESSION_SECRET` is unused; the owner can delete it (`npm run cloudflare -- secret delete OUTPOST_RENDER_SESSION_SECRET --name albionoutpost-web`) and drop it from `.env.cloudflare-runtime`.

## Limits and budgets

| Budget             | Limit / setting                                                                                                                                                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Worker bundle      | 10 MiB gzip each on Workers Paid; PR budget 3,840 KiB web, 1,280 KiB data (9 Nov: 3,206 and 1,028; [Cost budget](#cost-budget-on-pull-requests))                                                                                                    |
| Render             | 30 s wall-clock deadline (streamed body included; 504 if nothing was sent), 10 s for `waitUntil` work, both cleared when their work settles; 10 s CPU per request (`limits.cpu_ms`)                                                                 |
| Edge budgets       | Per address (IPv6 per /64), per Cloudflare location: 240 requests/min, 30 uncached searches/min, 20 item-price pages/min per server, 20 market reads/min per server (`cloudflare/web/request-budget.ts`, `ratelimits` in `wrangler.jsonc`)          |
| AODP upstream      | 50/min and 250/5 min per region (AODP publishes 100/min, 300/5 min)                                                                                                                                                                                 |
| Game Info upstream | 12/min per region                                                                                                                                                                                                                                   |
| D1                 | Imports and index updates count as row writes; there is no scheduled ingestion by design                                                                                                                                                            |
| Kill collector     | The data Worker's two-minute cron (`cloudflare/database/wrangler.jsonc`) makes 3 Game Info reads per server and one `KillBoard` write per server; the kill feed adds one `killWatermark` read per upstream page fetch (at most every 45 s per page) |

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

The [daily cost check](#daily-cost-check) posts to Discord when usage nears an allowance, and the [budget alert](#owner-set-cloudflare-billing-notifications) emails on any usage charge. Cloudflare Notifications email the owner (account email) on: Worker errors (real-time issues in the web and data Workers), HTTP DDoS attacks, Universal SSL certificate events and abuse reports. Manage them in the dashboard under Notifications. There is no free uptime probe — Health Checks need a paid plan, and GitHub runners are challenged by Bot Fight Mode.

## Not set up yet

- Off-Cloudflare backup copy.
- Uptime probe (see Alerts).
- GitHub org MFA requirement; branch protection (needs a paid plan on private repos).

These are tracked in [ROADMAP.md](ROADMAP.md#owner-actions).

## Administration operations

Use `/admin` with the configured owner's verified Discord account. A global MODERATOR has reports only. No public endpoint assigns global roles. Gift Supporter access, revoke sessions and manage Outpost identity bans through the reasoned/versioned controls rather than direct database edits. Gifts do not alter paid subscriptions; bans do not cancel them or remove Team ownership. Review reported activity before acting; the queue is a triage aid, not a verdict. Minimal ban/audit identifiers survive account deletion and currently have no automated retention purge.

Private database schema 7 requires the matching data Worker and additive migration 0008. Do not roll back to schema 6. Preserve ban enforcement during any web rollback. [Administrative runbook](ADMINISTRATION.md) covers permissions, expiries, sign-in races, retained data and verification limits.

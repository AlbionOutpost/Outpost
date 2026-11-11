# Operations

Production is https://albionoutpost.com on Cloudflare Workers Paid (zone on the Free plan). Source is `AlbionOutpost/Outpost` on GitHub. **Merging to `main` deploys.**

## Deploying

`.github/workflows/cloudflare-preview.yml` ("Cloudflare deployment") runs on every push to `main` that touches more than docs/Markdown, on manual dispatch, and on published releases tagged `v*` (other tags skip both quality and deploy).

1. **Quality** — reuses `quality.yml` (`checks` job only): format, docs check, local Postgres/Redis (`scripts/ci-local-services.mjs`), SQLite runtime check, source secret scan, `npm run qa:phase` (skipping the Node browser run, which the verify job replaces with the Cloudflare-mode run, and the live AODP check), bundle secret scan.
2. **Verify** — generate and verify the SQLite runtime (Prisma wasm client, domain constraints, D1 schema check), stage catalog + library into a local D1, run `qa-cloudflare-database.mjs`, build Cloudflare, typecheck both Workers, then run `test:e2e:core` in Cloudflare mode. The separate full-suite workflow runs all browser tests.
3. **Deploy** (environment `cloudflare-production`, one at a time, after both Quality and Verify pass):
   1. Regenerate the SQLite runtime.
   2. Production build with the Turnstile site key (`cloudflare-build-check.mjs` then checks that `robots.txt`, the manifest and the sitemap are static assets and that `robots.txt` has the crawler rules), `cloudflare-release-config.mjs` writes the real configs, secret scans.
   3. `cloudflare-free-check.mjs` (each bundle ≤10 MiB gzip, the Workers Paid limit; no unreviewed routes or extra paid services), then `wrangler deploy` **data Worker first, then web Worker**. The web Worker's version id goes to `.qa/cloudflare-release/web-version`.
   4. `cloudflare-deployment-check.mjs` probes the live site and waits up to 5 minutes for `/wp-admin` to answer with that version in `X-Outpost-Version`; it fails if the edge keeps serving another one. A challenged runner skips this, so run it from your own machine (below).

What CI does **not** do: upload runtime secrets, push catalog/library data to D1, or prove the live site works — GitHub runners are challenged by Bot Fight Mode, so the probe reports `BLOCKED` as a warning. After a deploy, smoke-test from your own machine:

```bash
OUTPOST_EXPECTED_VERSION=<web "Current Version ID" from the deploy log> node scripts/cloudflare-deployment-check.mjs
node scripts/qa-cloudflare-hosted.mjs
node scripts/qa-cloudflare-auth.mjs
```

**"Deployed" is not "served."** On 9 Nov 2026 the API listed each new version of both Workers as deployed at 100 % (15:48, 15:57, 16:06 UTC) while every request was still answered by the 15:41 versions (Workers Observability `$workers.scriptVersion.id`) until 16:09, when the 16:06 versions took over, so #142's robots.txt, manifest and probe 404 never reached the site. Wrangler and the deployments API cannot show this; the served version can. If the check fails, compare `$workers.scriptVersion.id` in Workers Observability with `wrangler deployments list`, and open a Cloudflare support case (redeploying did not help on 9 Nov).

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

| Kind          | Values                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Where set                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Vars (web)    | `OUTPOST_RUNTIME`, optional `OUTPOST_SAVE_MODE=1` ([Save mode](#save-mode)), `NEXTAUTH_URL`, `DISCORD_CLIENT_ID`, `OUTPOST_OWNER_DISCORD_ID`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_HOSTNAMES`, optional `NEXT_PUBLIC_ADSENSE_CLIENT` (AdSense `ca-pub-…`; unset = no ad units, strict CSP) with `NEXT_PUBLIC_ADSENSE_SLOT_HUB` / `NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE` (the two ad unit ids); the Impressum `OPERATOR_NAME`, `OPERATOR_ADDRESS` (rows separated by `\n`), `OPERATOR_EMAIL`, `OPERATOR_EDITOR` (constants in the release config: public by law, and a dashboard var would be overwritten on deploy; `OPERATOR_SMALL_BUSINESS` stays unset until the tax registration is done). Binding: `send_email` `CONTACT_EMAIL` → `support@albionoutpost.com` (contact form) | `wrangler.jsonc` + `cloudflare-release-config.mjs`                                          |
| Secrets (web) | `NEXTAUTH_SECRET`, `DISCORD_CLIENT_SECRET`, `TURNSTILE_SECRET`; Supporter billing: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_SUPPORTER`, `STRIPE_PUBLISHABLE_KEY` (all four or none; the publishable key is not secret but is read at runtime)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `node scripts/cloudflare-runtime-upload.mjs --apply` (from `.env.cloudflare-runtime`)       |
| GitHub        | secret `CLOUDFLARE_API_TOKEN` (Workers deploy only, **expires 2027-01-26**); vars `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_CATALOG_DATABASE_ID`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; cost check: secrets `CLOUDFLARE_ANALYTICS_TOKEN` (Account Analytics Read), `DISCORD_COST_WEBHOOK_URL`, var `OUTPOST_BILLING_DAY`; optional var `OUTPOST_SAVE_MODE` ([Save mode](#save-mode))                                                                                                                                                                                                                                                                                                                                                                                                           | Repo settings → environment `cloudflare-production` (`scripts/cloudflare-github-setup.mjs`) |

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

**Off for now: nothing is for sale.** With no Stripe keys, `billingEnabled()` is false. Since 8 Nov the launch grant (`launchGrant` in `src/lib/billing/plan.ts`) makes every account a lifetime Supporter, so the Team gates are on but lock nobody; `/supporter` explains the grant (no price, no checkout) and `/premium` redirects there; the sitemap leaves `/supporter` out.

**The plan (owner, 9 Nov 2026):** Supporter is €4.99 a month (the amount always comes from the Stripe price; no copy hard-codes it). It gives no ads, the public Supporter badge and the right to create Teams. Joining Teams stays free. Accounts created before the launch closes keep Team creation (and running their Teams) for life, but still see ads and get no badge unless they buy the plan. The plan is **on sale** only when `salesOpen()` is true: Stripe keys set, the launch closed and the legal page published. Cancelling only needs the keys.

**After the launch closes**, the gates in `src/lib/billing/gate.ts` work as before: creating a Team needs a Supporter (plan, gift or launch account); managing one (profile, events, announcements, invites, roles, shared builds, loot, wallet, games, giveaways) needs the **owner** to be one, so a paid owner who lapses can still remove members, transfer and delete but not run the Team until they renew. Launch accounts never lapse. Members keep reading, RSVPs and leaving. The plan on the account is written only by the webhook (signature verified, subscription re-read from Stripe on every event); `past_due` keeps the benefits until Stripe gives up.

**Payment form (owner, 9 Nov 2026, "option 3"):** no redirect to Stripe Checkout. The order box on `/supporter` shows the facts and the terms box; "Continue to payment" / "Weiter zur Zahlung" creates one unpaid (`incomplete`) subscription and only then loads Stripe.js and its Payment Element, styled with Outpost's tokens; Outpost's own button "Zahlungspflichtig bestellen" / "Subscribe and pay" confirms the payment. Card data goes only to Stripe's iframes. The payment methods are whatever the Stripe dashboard's default payment method configuration enables (card, Apple Pay, Google Pay, Link on the live account). An order that is never paid expires on Stripe's side after 23 hours (`incomplete_expired`); nothing to clean up.

**Consumer-law pieces in the code** (published with `/legal` on 11 Nov 2026; billing stays off, so the terms say the plan is not offered yet): the order box on `/supporter` (price, term, cancellation, VAT line, one unticked terms box, "Zahlungspflichtig bestellen" / "Subscribe and pay"); the server refuses an order without the terms box and stores the time as `outpostConsentAt` metadata on the subscription (no schema change). No waiver of the right of withdrawal is asked for (owner, 9 Nov 2026): a withdrawal within 14 days is always refunded in full. The § 312k cancellation page `/supporter/cancel` is linked from the footer of every page and from Settings while billing is configured; `POST /api/billing/cancel` sets `cancel_at_period_end` on the account's own subscription and records the kind and reason in Stripe (`cancellation_details`, `metadata[outpostCancelKind]`). Outpost sends no email: Stripe's cancellation email is the confirmation. The § 356a withdrawal page `/supporter/withdraw` ("Vertrag widerrufen", linked beside it in the footer and in Settings) lists the account's contracts still inside the 14 days from the subscription start; `POST /api/billing/withdraw` ends them at once and refunds every paid charge in full (idempotency key per charge). Stripe's refund email is the receipt; the page shows the time received. Withdrawals by email to contact@ must be honoured too: refund the subscription's charges in full in the dashboard and cancel it immediately. Terms (AGB), the cancellation policy and the model withdrawal form are sections of `/legal` (`src/app/legal/supporter-legal.tsx`). Set `OPERATOR_SMALL_BUSINESS=true` (Worker var) only if the operator is a Kleinunternehmer; otherwise prices are described neutrally.

### Go-live checklist

1. **Impressum and legal review.** Done 11 Nov 2026: the operator details are in `scripts/cloudflare-release-config.mjs` and `/legal` is published (`legalPublished`), with the contact form as the second contact channel. Before selling, set `OPERATOR_SMALL_BUSINESS` there if the operator is a Kleinunternehmer, and have the terms, cancellation policy and form reviewed (the full-refund wording, confirmation of receipt on a durable medium).
2. **Stripe dashboard (test mode first, then live):**
   - Product "Outpost Supporter" with one recurring price: €4.99, monthly, tax-inclusive. Note the `price_…` id. Created on the live account 9 Nov 2026 as `price_1Ua0XuFyTQQfhCUMEisJ6Oz6` (product `prod_VbCl7S9w4tymv6`); the customer portal configuration `bpc_1Ua0ZGFyTQQfhCUMVPGmqe1S` (cancel at period end, invoices, card and address updates, no plan switching) is the default.
   - Webhook endpoint `https://albionoutpost.com/api/billing/webhook` with `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed` (no invoice or Checkout events are needed: a paid order arrives as `customer.subscription.updated` → `active`). Note the signing secret `whsec_…`.
   - Publishable key: Developers → API keys → `pk_live_…` (`pk_test_…` in test mode).
   - Payment method domains (Settings → Payment methods → Payment method domains): add `albionoutpost.com` so Apple Pay and Google Pay show in the Payment Element; Link and cards need nothing more.
   - Customer portal (Settings → Billing → Customer portal): allow updating payment methods, invoice history and **cancel subscriptions at the end of the billing period**.
   - Customer emails (Settings → Billing → Subscriptions and emails / Customer emails): turn on emails for successful payments, receipts and **canceled subscriptions**. In test mode, cancel through `/supporter/cancel` and confirm an email arrives (it is the § 312k confirmation; if Stripe sends none for API cancellations, stop and tell the owner).
   - Customer emails: also turn on **refunds** (Settings → Customer emails → "Refunds"). In test mode, buy the plan, withdraw at `/supporter/withdraw`, and confirm that the subscription is canceled at once, the charge is fully refunded, the refund email arrives and the webhook sets the plan back to Free. If no refund email arrives, stop and tell the owner (it is the confirmation of receipt).
   - Payment form: in test mode with `?lang=de`, check the form, a 3-D Secure test card (`4000 0027 6000 3184`), a declined card (`4000 0000 0000 0002`) and the theme switch; the final button is Outpost's "Zahlungspflichtig bestellen".
3. **Secrets.** Upload `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_SUPPORTER` and `STRIPE_PUBLISHABLE_KEY` to the web Worker (see Runtime configuration; `cloudflare-runtime-upload.mjs` uploads only the three app secrets, so set these with `npm run cloudflare -- secret put <NAME>` or as Worker vars); the env validator refuses a partial set, and the CSP opens Stripe's origins only once all four are there.
4. **Code, in one PR:** set `launchGrant.closedAt` in `src/lib/billing/plan.ts` to the go-live date (`legalPublished` is already on); update PRODUCT.md. Deploy.
5. **After deploy:** with a live card, buy the plan on a test account (one real €4.99 purchase through the on-site form), see the badge and no ads, cancel at `/supporter/cancel` and confirm the end date and the Stripe email, then withdraw at `/supporter/withdraw` and confirm the full €4.99 refund, its email and that the plan returns to Free. Test locally with Stripe's test keys and `stripe listen --forward-to localhost:3000/api/billing/webhook`.

## Advertising (AdSense)

Two placements and never more than one unit on a page: `hub` after a hub's main list (Build Library, Group Builds, Guides, landing) and `article` after a guide or library build. Never inside calculators, editors, Team workspaces, account pages or dialogs; never sticky or interstitial; height is reserved so nothing jumps. Supporters see none (checked on the server). The deploy workflow passes the client id and the two unit ids into the Worker vars from repository variables (`NEXT_PUBLIC_ADSENSE_CLIENT`, `NEXT_PUBLIC_ADSENSE_SLOT_HUB`, `NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE`); they default to the owner's `ca-pub-3003146014371070`, hub `8311745950` and article `2411572079`. A valid client id adds the passive `google-adsense-account` meta tag to every page (what Google's site verification looks for) and serves `/ads.txt`. Ads run only once `OPERATOR_NAME`, `OPERATOR_ADDRESS` and `OPERATOR_EMAIL` are set too (a commercial site needs the full imprint; the release config sets them since 11 Nov 2026, so the next deploy switches ads on): then the head loads Google's ad script, which first shows the certified consent message configured in AdSense (EEA/UK/CH) or the US-state opt-out link, and each placement renders a labelled unit. Supporters load neither.

Switch-on order (done 6 Nov 2026 up to the imprint; the imprint step ships with the PR that published `/legal`): client id → deploy → confirm the site in AdSense → publish the EU and US consent messages in AdSense (Privacy & messaging) → create the `hub` and `article` units → `OPERATOR_*` in the release config and `/legal` published → deploy → request AdSense review again. Each ad unit's label links to `/legal#advertising`.

## Cloudflare zone

| Area          | State                                                                                                                                                                                                                                                                                                                                                             |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DNS / domains | Zone active; apex and `www` are Workers custom domains; `www` redirects to apex                                                                                                                                                                                                                                                                                   |
| TLS           | Full (strict), min TLS 1.2, TLS 1.3, always HTTPS (`npm run cloudflare:security`)                                                                                                                                                                                                                                                                                 |
| WAF / bots    | Managed Free rules, custom rule blocking `/.env*` and repo/internal paths, Bot Fight Mode; rate-limit rule: 60 `/api/` requests per 10 s per IP and colo, then blocked for 10 s                                                                                                                                                                                   |
| Mail          | Zoho Mail (EU, Mail Lite, 1 user): MX `mx.zoho.eu` 10 / `mx2` 20 / `mx3` 50, SPF `v=spf1 include:zohomail.eu ~all`, DKIM selector `zmail`, DMARC `p=quarantine` (tighten to `reject` once reports are clean). Mailbox admin@ with aliases contact@, support@, security@, privacy@; groups postmaster@ and abuse@. Records are managed in the Cloudflare dashboard |
| DNSSEC        | Signed at Cloudflare; **DS record not yet published at the registrar** (Namecheap) — see below                                                                                                                                                                                                                                                                    |
| Access        | None; the site is public                                                                                                                                                                                                                                                                                                                                          |

**Publish DNSSEC:** in Namecheap → Domain → Advanced DNS → DNSSEC, add the DS that `npm run cloudflare:dnssec` prints (currently key tag 2371, algorithm 13, digest type 2). Re-read it before submitting; then run `npm run cloudflare:dnssec` again to confirm. To roll back, remove the DS at the registrar first and keep signing on until its TTL expires.

## Discord

- OAuth app `1564994799722045560`, scopes `identify email`, callback `https://albionoutpost.com/api/auth/callback/discord`. Public Bot off, no install link.
- `npm run discord:status` shows the bot/app profile; `npm run discord:setup -- --apply` applies avatar, icon, description and tags (backs up to `.qa/discord/`). The helper only touches `/users/@me` and `/applications/@me`.
- Still to do in the Developer Portal: set the Terms URL to `https://albionoutpost.com/legal#terms` and the Privacy URL to `https://albionoutpost.com/legal#privacy` (published 11 Nov 2026).

## Contact form

`/contact` (German and English) mails `support@albionoutpost.com` through the web Worker's `send_email` binding `CONTACT_EMAIL` (`scripts/cloudflare-release-config.mjs`), sent as `noreply@albionoutpost.com` with Reply-To the visitor. Email Sending is onboarded for the domain (records on `cf-bounce` only; Zoho's apex MX is untouched) and `support@` must stay a **verified Email Routing destination**: until the owner confirms Cloudflare's verification email, every send fails and the form answers "could not be sent" (503). Sending to a verified destination is free. Budgets: 3 per 10 minutes and 20 a day per address, 200 a day in all. Nothing is stored; the mailbox is the record. Locally the route only logs `contact_would_send`.

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

| Check                                                                                                                                                       | Where                                                                                    | Why this signal                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web Worker ≤ 3,840 KiB gzip, data Worker ≤ 1,280 KiB (9 Nov: 3,206 and 1,028; about 20 % headroom)                                                          | `quality.yml` "Cost budget": Cloudflare build, then `scripts/cloudflare-cost-budget.mjs` | Deterministic; a bigger bundle starts slower on every cold isolate and nears the 10 MiB limit; catches a large JSON or library pulled into the Worker |
| The prerendered route (`security.txt`) stays prerendered; `robots.txt`, the manifest, `favicon.ico`, `icon.png` and `apple-icon.png` are files in `public/` | same step, from `.next/prerender-manifest.json`                                          | A static route turned dynamic costs a Worker request and render per hit                                                                               |
| Every page-cache route keeps its TTL, and the route count matches                                                                                           | `tests/cost-budget.test.ts` (in `npm test`)                                              | Dropping a route or shortening a TTL silently turns cached views back into ≈ 0.6 s renders                                                            |
| Every edge-cached API route keeps its TTL                                                                                                                   | same test                                                                                | Polling endpoints stay cache hits                                                                                                                     |
| No new Durable Object binding, class migration, cron, rate-limit binding or paid service (KV, R2, Queues, Workflows, AI …)                                  | same test; every DO class must be named in [ARCHITECTURE.md](ARCHITECTURE.md)            | Durable Objects bill wall-clock time and requests; crons run forever on their schedule                                                                |

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

What Cloudflare already keeps, at no extra cost and with nothing to switch on (checked against Cloudflare's docs on 9 Nov 2026):

| Data                                                                                                                                  | Built-in backup                                                                                                                                                                                                                         | Window  |
| ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| **Private data**: `OutpostDatabase` object `accounts-v1-eu` (users, sessions, builds, comps, Teams, scenarios, timers, watchlists, …) | [Point-in-time recovery](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/#pitr-point-in-time-recovery-api) of SQLite-backed Durable Objects: the whole database (SQL and key-value) to any moment, by bookmark | 30 days |
| **Catalog** (D1 `albionoutpost-staging`: items, releases, archive)                                                                    | [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/), to any minute (7 days on Workers Free)                                                                                                                   | 30 days |
| `KillBoard`, `AbuseBudget` objects                                                                                                    | Same point-in-time recovery; nothing to restore in practice (the kill feed refills in minutes, budgets reset)                                                                                                                           | 30 days |
| Library and static content, the catalog sources                                                                                       | The repository                                                                                                                                                                                                                          | Git     |

Not covered: deleting a whole Durable Object namespace (a `deleted_classes` migration), the Worker or the Cloudflare account; damage noticed after 30 days. There is no off-Cloudflare copy ([ROADMAP.md § Owner actions](ROADMAP.md#owner-actions) has the proposal).

### Restoring private data

`scripts/cloudflare-recovery.mjs` deploys a short-lived helper Worker (`albionoutpost-recovery`) bound to the data Worker's `OutpostDatabase` class, runs one action and deletes it again. The recovery methods (`recoveryBookmark`, `recoveryRestore`, `recoveryRestart` in `cloudflare/database/worker.ts`) live on the Durable Object only: the data Worker's RPC entrypoint does not expose them and the web Worker binds no `OutpostDatabase`, so no page, API route or admin session can reach them.

Who can run it:

- Only someone holding the owner's Cloudflare deploy credentials (`.env.cloudflare`, mode 0600, never in CI for this).
- `restore --apply` also needs the owner at an **interactive terminal** typing `restore accounts-v1-eu`. It refuses in CI (`CI` or `GITHUB_ACTIONS` set) and whenever input is not a terminal, so no workflow, script or agent can trigger it.
- The helper answers only requests carrying a random 256-bit token made for that run (compared in constant time, uploaded as a Worker secret, never a plain variable) and is deleted when the run ends, error or not.

Steps:

1. **Find the moment.** Pick a UTC time just before the damage (an audit row, a deploy time, a report). Note that everything written after it is undone too: every account, build, comp and Team.
2. **Check recovery works (read-only):** `node scripts/cloudflare-recovery.mjs bookmark` prints the current bookmark; `bookmark --at <ISO>` prints the one for that time.
3. **Dry run:** `node scripts/cloudflare-recovery.mjs restore --at 2026-11-02T18:00:00Z`. It checks the time is within 30 days and shows the target bookmark. Nothing changes.
4. **Owner's OK, then apply:** `node scripts/cloudflare-recovery.mjs restore --at 2026-11-02T18:00:00Z --apply`, and type the confirmation. The object restarts on the old state (it runs its schema upgrades again on start), the script checks it answers, and prints an **undo** command (`restore --bookmark <b> --apply`) that returns to the state just before the restore. Keep it.
5. **Check:** sign in, open a build and a Team. Every run writes its report (target, undo bookmark, health) to `.qa/recovery/`.

The restored state must be readable by the data Worker that is deployed now: a restore to before a schema upgrade is fine (the object upgrades itself again), but never roll the data Worker back past a schema version.

**Catalog (D1):** `npm run cloudflare -- d1 time-travel info albionoutpost-staging --timestamp <ISO>` shows the bookmark; `npm run cloudflare -- d1 time-travel restore albionoutpost-staging --timestamp <ISO>` restores it and prints an undo bookmark. The catalog can also be rebuilt from the repository with the data-push scripts.

## Alerts

Cloudflare Notifications email the owner (account email) on: Worker errors (real-time issues in the web and data Workers), HTTP DDoS attacks, Universal SSL certificate events and abuse reports. Manage them in the dashboard under Notifications. The [daily cost check](#daily-cost-check) posts to Discord when usage nears an allowance, and the [budget alert](#owner-set-cloudflare-billing-notifications) emails on any usage charge. Cloudflare Health Checks need a paid zone plan, and GitHub runners are challenged by Bot Fight Mode, so there is no HTTP probe of albionoutpost.com; the error alerts below read Cloudflare's own analytics instead.

### Error alerts

`.github/workflows/health-check.yml` ("Cloudflare health check") runs `scripts/cloudflare-health-check.mjs` every 15 minutes (at :04, :19, :34 and :49) and on demand. It makes one GraphQL Analytics request (`workersInvocationsAdaptive` and `durableObjectsInvocationsAdaptiveGroups`) for the 30 minutes ending five minutes ago (analytics arrive a few minutes late) and posts to Discord when:

| Problem                                 | Rule (`THRESHOLDS` in the script)                                                                                                                                                                               |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pages are failing                       | Web Worker requests that threw, ran out of CPU or memory, hit an internal error or answered 5xx are ≥ 5 % of at least 20 requests. Client disconnects and 4xx (404, 429) do not count.                          |
| The data Worker is erroring             | The same for the data Worker's RPC calls.                                                                                                                                                                       |
| A Durable Object is erroring            | Errors are ≥ 5 % of at least 20 calls to one namespace.                                                                                                                                                         |
| The kill collector stopped              | The data Worker's two-minute cron did not run at all.                                                                                                                                                           |
| The kill collector is failing           | At least half of its runs (and at least 3) failed. A run fails when any server's live Game Info feed was unreadable or its `KillBoard` write failed (`collectKillFeeds`), so stale Albion kill data shows here. |
| The site gets no traffic                | The web Worker had no requests, in an hour of day that had at least 40 requests on each of the last 7 days (a missing day counts as 0, so a quiet or new hour never alerts).                                    |
| The health check cannot read Cloudflare | Three analytics reads in a row failed (an expired token, an API outage).                                                                                                                                        |

**No alert storms.** The set of open problems is kept between runs in a small JSON file (`.qa/health/state.json`, restored and saved with `actions/cache`). A problem gets **one** message when it starts and one "recovered" message (with how long it lasted) after two clean checks in a row; a problem that comes back before then is the same incident. Several problems that start together share one message. A failed analytics read leaves open problems as they are. If Discord rejects a message the state is not saved, so the next run sends it again (and the failed run emails the owner through GitHub). Messages mention nobody. Should the cache ever be lost (GitHub evicts entries unused for 7 days), an ongoing problem is reported once more.

**Cost.** Nothing on Cloudflare: the GraphQL API is not billed and one request every 15 minutes is far inside its rate limit. The repository is public, so scheduled runs on GitHub-hosted runners use no billed minutes; if it ever goes private, 96 runs a day would be about 2,900 billed minutes a month, so drop the schedule to hourly first. GitHub pauses schedules in a public repository after 60 days without commits; re-enable it under Actions if that happens. The job runs in the `cloudflare-production` environment for its secrets with `deployment: false`, so it does not list a deployment every 15 minutes.

**What the owner adds:** nothing new if the [cost check](#daily-cost-check)'s `CLOUDFLARE_ANALYTICS_TOKEN` and `DISCORD_COST_WEBHOOK_URL` are set; alerts then go to the cost channel. Optionally add secret **`DISCORD_ALERTS_WEBHOOK_URL`** (same environment; a webhook in a separate channel, so outages stand apart from cost warnings). Then run it once by hand (Actions → Cloudflare health check → Run workflow) and check the log line with the half hour's counts.

**When it fires:** Workers & Pages → the Worker → Observability and Deployments (roll back with `npm run cloudflare -- rollback --name albionoutpost-web`; the data Worker only with care, see [Rolling back](#rolling-back)). For the kill collector, the data Worker's logs name the servers whose feed failed; a Game Info outage on Albion's side needs no action. For no traffic, check DNS, the zone and the Worker route first.

## Not set up yet

- Off-Cloudflare backup copy.
- An HTTP uptime probe from outside Cloudflare (see [Alerts](#alerts); the error alerts cover a Worker that stops answering).
- GitHub org MFA requirement; branch protection.

These are tracked in [ROADMAP.md](ROADMAP.md#owner-actions).

## Administration operations

Use `/admin` with the configured owner's verified Discord account. A global MODERATOR has reports only. No public endpoint assigns global roles. Gift Supporter access, revoke sessions and manage Outpost identity bans through the reasoned/versioned controls rather than direct database edits. Gifts do not alter paid subscriptions; bans do not cancel them or remove Team ownership. Review reported activity before acting; the queue is a triage aid, not a verdict. Minimal ban/audit identifiers survive account deletion and currently have no automated retention purge.

Private database schema 7 requires the matching data Worker and additive migration 0008. Do not roll back to schema 6. Preserve ban enforcement during any web rollback. [Administrative runbook](ADMINISTRATION.md) covers permissions, expiries, sign-in races, retained data and verification limits.

# Testing

Run what proves your change; let CI run the rest.

| Suite           | Command                                                           | What it covers                                                                                                                                                                                                                                                                                                                                                                     |
| --------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Types           | `npm run typecheck`                                               | App TypeScript (`npx tsc -p cloudflare/tsconfig.json` and `cloudflare/web/tsconfig.json` for the Workers)                                                                                                                                                                                                                                                                          |
| Lint / format   | `npm run lint`, `npm run format:check`                            | ESLint (Next config), Prettier                                                                                                                                                                                                                                                                                                                                                     |
| Unit            | `npm test`                                                        | Vitest, `tests/**/*.test.ts` (~76 files): calculators, market clients, cache, Turnstile, auth helpers, RPC protocol, Cloudflare scripts                                                                                                                                                                                                                                            |
| Browser         | `npm run test:e2e`                                                | Playwright, `e2e/*.spec.ts` (~71 specs): journeys, permissions, accessibility (axe), visual captures                                                                                                                                                                                                                                                                               |
| Core flows      | `npm run test:e2e:core`                                           | The 16 specs CI runs on every pull request and deploy: landing, sign-in, security and permissions, builds, comps, Teams, loot, market, production, controls, kill feed                                                                                                                                                                                                             |
| Database        | `npm run test:integration`                                        | Disposable Postgres databases: migrations, constraints, backup/restore, cascades                                                                                                                                                                                                                                                                                                   |
| Cloudflare data | `node scripts/qa-cloudflare-database.mjs` (after the setup below) | Real DO/D1 path under local workerd: transactions, rollback, denied access, archive parity, budgets                                                                                                                                                                                                                                                                                |
| Live upstream   | `npm run test:live`                                               | Real AODP regions — uses real budget; run sparingly                                                                                                                                                                                                                                                                                                                                |
| Docs            | `node scripts/docs-check.mjs`                                     | Markdown links/anchors, skill frontmatter                                                                                                                                                                                                                                                                                                                                          |
| Everything      | `npm run qa:phase`                                                | DB check → types → lint → unit → data audit → integration → local billing/authorization regressions → build → browser → `npm audit --omit=dev` (production tree, any severity; tooling advisories are reviewed on dependency updates) → live, logs in `.qa/`. `QA_SKIP=live-regions,browser` skips named checks; CI skips `live-regions` and runs the core flows in a separate job |

## What CI runs

Sized for a private repository's included Actions minutes (about 20 billed minutes per change):

- **Pull request** (`quality.yml`): `checks` (format, docs, types, lint, units, migrations, build, advisories, secret scans, and the cost budget: a Cloudflare build checked by `scripts/cloudflare-cost-budget.mjs`, see [OPERATIONS.md § Cost budget](OPERATIONS.md#cost-budget-on-pull-requests)) and `browser` (the core flows on the Node build).
- **Merge to `main`** (`cloudflare-preview.yml`): `verify` builds the Cloudflare bundle, typechecks both Workers and runs the core flows under local workerd, then `deploy`.
- **Daily** (`cost-check.yml`, 06:23 UTC): Cloudflare usage against the Workers Paid allowances ([OPERATIONS.md § Daily cost check](OPERATIONS.md#daily-cost-check)); no tests.
- **Every 15 minutes** (`health-check.yml`): Cloudflare analytics for page, data Worker, Durable Object and cron errors and missing traffic, with Discord alerts ([OPERATIONS.md § Error alerts](OPERATIONS.md#error-alerts)); thresholds and messages are unit-tested in `tests/cloudflare-health-check.test.ts`, the restore runbook's guards in `tests/cloudflare-recovery.test.ts`.
- **Weekly and on demand** (`full-suite.yml`, Mondays 03:17 UTC): every spec, including the slow audits and visual baselines, against the Cloudflare build in two shards. Run it by hand before a large release.

When a spec guards a new permission or a flow that broke production, add it to `test:e2e:core`.

## Running the Cloudflare data tests locally

```bash
node scripts/cloudflare-database-generate.mjs        # wasm Prisma client (git-ignored)
node scripts/cloudflare-stage-catalog.mjs --write-local
node scripts/cloudflare-stage-library.mjs --write-local
npx wrangler d1 execute CATALOG --local --config cloudflare/database/wrangler.jsonc \
  --file .qa/cloudflare-catalog/local-import.sql --persist-to .qa/cloudflare-database-test/state
npx wrangler d1 execute CATALOG --local --config cloudflare/database/wrangler.jsonc \
  --file .qa/cloudflare-library/local-import.sql --persist-to .qa/cloudflare-database-test/state
node scripts/qa-cloudflare-database.mjs
```

The catalog step needs local Postgres with `npm run data:sync` done. CI runs the same sequence in the deploy workflow.

## Lab speed (Lighthouse)

Measure against a production build, never `next dev`. The closest to production is local workerd: `node scripts/cloudflare-build.mjs`, then `E2E_CLOUDFLARE=1 node scripts/cloudflare-local-server.mjs` (port 3000). A Node build (`npm run build`, then `npm start`) inlines its CSS, so its numbers differ from Cloudflare's.

```bash
CHROME_PATH=/opt/pw-browsers/chromium node scripts/lighthouse.mjs --runs=3
node scripts/lighthouse.mjs --base=http://localhost:3000 --runs=3 /builds /guides/first-silver
```

It runs Lighthouse (fetched by `npx`) at the mobile and desktop presets on the main pages (or the paths given), keeps the reports in `.qa/lighthouse/` and prints the median performance and accessibility scores, LCP, TBT, CLS and script transfer per page. Compare medians of at least three runs on an otherwise idle machine; TBT swings with machine load. Local wrangler does not compress HTML, so large pages read heavier than in production. Last numbers: [outpost-performance skill](../.claude/skills/outpost-performance/SKILL.md).

## Playwright modes

| Env                | Server                                                                          |
| ------------------ | ------------------------------------------------------------------------------- |
| (default)          | `npm run dev`                                                                   |
| `E2E_PRODUCTION=1` | Standalone production build (`npm start`)                                       |
| `E2E_CLOUDFLARE=1` | Local workerd via `scripts/cloudflare-local-server.mjs` — closest to production |

Sessions in browser tests are fixture database sessions, not real Discord logins. Fixture prices are labelled; never let them look live in screenshots.

## Writing tests

- **Calculators:** independent expected values written by hand ([CALCULATORS.md](CALCULATORS.md#verifying-a-change)).
- **Permissions:** for every allowed path add a denied one — anonymous, unrelated user, wrong role, revoked member — and assert nothing changed in the database.
- **Caches:** warm as user A, request as B and anonymous; check headers and payload.
- **UI:** visual specs write captures under `.qa/` (e.g. `.qa/<area>-correction/current/`, `.qa/design-review/`); review them, don't just count passes. Cover populated, empty, loading, error and stale states.
- **Accessibility:** add every new page to `pages` (or `accountPages` when it needs a session) in `e2e/accessibility.spec.ts`. It runs axe (WCAG 2.0–2.2 A/AA) at 1440 and 390 and fails on serious or critical findings, and checks one `h1` and one `main`, heading levels that never skip, the skip link and focus ring, the header menus, the phone drawer's focus trap, the item picker by keyboard, and that nothing moves under reduced motion.
- **One screen:** tool and workspace pages are held to 1440×900 by `e2e/one-screen.spec.ts`; add a page there when it should fit.
- Keep tests fast and focused; don't add checks whose only purpose is a report.

## Not covered yet

Real Discord OAuth lifecycle, physical devices and screen readers, Firefox/WebKit, load tests, real-user performance metrics. The live-site probe in CI is blocked by Bot Fight Mode — smoke-test the deployed site manually ([OPERATIONS.md](OPERATIONS.md#deploying)).

## Visual baselines

`e2e/premium-visual.spec.ts` compares the build editor, the comps directory and the navigation drawer against committed screenshots. Font rasterization differs between machines, so after a deliberate visual change regenerate the baselines on the CI runner, against the same Cloudflare build the full suite checks, instead of locally: dispatch the manual **Visual baselines** workflow (`.github/workflows/visual-baselines.yml`) on your branch; it commits the refreshed images to that branch for review in the pull request.

## Security repair regressions

`node --env-file=.env --import tsx scripts/test-billing-security.ts` creates owned UUID fixtures only in local PostgreSQL and mocks every Stripe call. The phase gate runs it after database integration. Streamed auth/webhook bounds, real per-attempt source quotas, public combat cache namespaces and configured-price webhooks also have Vitest regressions. The Cloudflare fixture entry assigns synthetic loopback caller addresses to isolate fixture journeys; dedicated worker/guard tests cover stable-address budgets and routing-cookie renewal. Never deploy the local fixture harness.

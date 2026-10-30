# Testing

Run what proves your change; let CI run the rest.

| Suite           | Command                                                           | What it covers                                                                                                                                                                                                                                                                                     |
| --------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Types           | `npm run typecheck`                                               | App TypeScript (`npx tsc -p cloudflare/tsconfig.json` and `cloudflare/web/tsconfig.json` for the Workers)                                                                                                                                                                                          |
| Lint / format   | `npm run lint`, `npm run format:check`                            | ESLint (Next config), Prettier                                                                                                                                                                                                                                                                     |
| Unit            | `npm test`                                                        | Vitest, `tests/**/*.test.ts` (~76 files): calculators, market clients, cache, Turnstile, auth helpers, RPC protocol, Cloudflare scripts                                                                                                                                                            |
| Browser         | `npm run test:e2e`                                                | Playwright, `e2e/*.spec.ts` (~71 specs): journeys, permissions, accessibility (axe), visual captures                                                                                                                                                                                               |
| Database        | `npm run test:integration`                                        | Disposable Postgres databases: migrations, constraints, backup/restore, cascades                                                                                                                                                                                                                   |
| Cloudflare data | `node scripts/qa-cloudflare-database.mjs` (after the setup below) | Real DO/D1 path under local workerd: transactions, rollback, denied access, archive parity, budgets                                                                                                                                                                                                |
| Live upstream   | `npm run test:live`                                               | Real AODP regions — uses real budget; run sparingly                                                                                                                                                                                                                                                |
| Docs            | `node scripts/docs-check.mjs`                                     | Markdown links/anchors, skill frontmatter                                                                                                                                                                                                                                                          |
| Everything      | `npm run qa:phase`                                                | DB check → types → lint → unit → data audit → integration → build → browser → `npm audit` → live, logs in `.qa/`. `QA_SKIP=live-regions,browser` skips named checks; CI skips `live-regions` and runs the browser suite as three parallel shards (`playwright test --shard=N/3`) in a separate job |

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
- Keep tests fast and focused; don't add checks whose only purpose is a report.

## Not covered yet

Real Discord OAuth lifecycle, physical devices and screen readers, Firefox/WebKit, load tests, real-user performance metrics. The live-site probe in CI is blocked by Bot Fight Mode — smoke-test the deployed site manually ([OPERATIONS.md](OPERATIONS.md#deploying)).

## Visual baselines

`e2e/premium-visual.spec.ts` compares the build editor, the comps directory and the navigation drawer against committed screenshots. Font rasterization differs between machines, so after a deliberate visual change regenerate the baselines on the CI runner instead of locally: dispatch the **Quality gates** workflow on your branch with `refresh_baselines` enabled; its `baselines` job commits the refreshed images to that branch for review in the pull request.

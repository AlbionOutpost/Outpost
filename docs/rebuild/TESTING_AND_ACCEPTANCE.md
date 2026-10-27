# Testing, visual verification and rebuild acceptance

Use [QA_REPORT](../../QA_REPORT.md) and its evidence stamp for the latest executed results. A prior143-unit/71-browser run describes its specific source/environment; it is not a permanent promised test count. The source inventory counts files/routes, not dynamic test cases. Tests with seeded sessions are isolated application fixtures, never proof of real Discord OAuth or public community activity.

## Fast checks and phase gate

```bash
npm run typecheck
npm run lint
npm test
node scripts/rebuild-inventory.mjs --check
npm run qa:phase
```

Run Node22 with PostgreSQL/Redis configured for the intended local development environment. `qa:phase` checks database connectivity, types, lint, units, game-data structure, disposable database integration, production build/browser suite, dependency advisories and bounded regional reads. It records each command’s actual PASS/FAIL and blocks browser execution if build fails. Never report a failed gate as passed because a targeted subset later passed; retain both scopes and rerun the required failed scope/gate.

The browser suite launches its own production server on3000 when `E2E_PRODUCTION=1`; an existing review server must use a separate port and be stopped during builds. Concurrency is capped at two because real local budgets/services are shared. Do not weaken request limits or suppress console errors merely to increase parallelism. Keep screenshots and Lighthouse runs sequential with respect to full suites/builds.

Required postchecks:

```bash
npm run data:audit
node scripts/qa-source-secrets.mjs
node scripts/qa-secret-scan.mjs
python3 scripts/test-docs-validation.py
python3 scripts/qa-reports.py --refresh-evidence
python3 scripts/qa-reports.py --check
python3 scripts/docs-validate.py --require-local-evidence
node scripts/rebuild-inventory.mjs --check
npm run format:check
```

Refresh evidence only after inspecting actual logs, inventory changes and screenshots. The five root QA reports/implementation status/score are generated, not manually rewritten. Default docs validation can warn about missing ignored artifacts in a fresh checkout; strict validation requires legitimate local evidence. Do not manufacture `.qa` files to satisfy it. Regenerate the rebuild inventory after all source/config/asset changes, including scripts it fingerprints.

## Functional regression map

| Contract                                                      | Main source tests and browser journeys                                                                             |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Exact trade profit/fees/thresholds/denominators               | `tests/calculations.test.ts`, trade-scenario tests, `e2e/trade-scenarios.spec.ts`, `public.spec.ts`                |
| Recipe/production/focus/manual-observed identity              | Production/reviewed-recipe tests; `production.spec.ts`, `production-modes.spec.ts`, `production-freshness.spec.ts` |
| Cargo/direction/missing prices/scanner                        | Transport tests; `e2e/transport.spec.ts`, `qa-regressions.spec.ts`                                                 |
| Catalog normalization, releases and field/patch separation    | Catalog/snapshot/source/verification/equipment tests; `catalog.spec.ts`, `verified-builds.spec.ts`                 |
| Source budget/cache/cooldown/bytes/identity                   | Source-client/history/icon/backoff tests; public/history/production/source-failure journeys                        |
| Build versions/ownership/copy/restore                         | `builds.spec.ts`, `verified-builds.spec.ts`, `dashboard-loadouts.spec.ts`                                          |
| Comp roles/source-copy/revisions/export                       | `compositions.spec.ts`, `composition-visual.spec.ts`, `player-workflows.spec.ts`, `reference-ui.spec.ts`           |
| Guild current roles/invites/profile/events/ownership/calendar | `groups.spec.ts`, `group-editing.spec.ts`, `guild-visual.spec.ts` and calendar/permission unit tests               |
| Community private targets/comments/votes/moderation           | `community.spec.ts`, account/security/private-cache regressions                                                    |
| Timers/account/settings recovery                              | `personal-tools.spec.ts`, `account.spec.ts`, `settings-recovery.spec.ts`, timer-engine tests                       |
| Private watchlist persistence/cap/concurrency                 | `market-watchlist.spec.ts` and watchlist schema tests                                                              |
| Homepage actual source/error/region/cancellation              | `homepage-polish.spec.ts`, `home-market-terminal.spec.ts`, `home-market-pulse.spec.ts`                             |
| Search/menus/equipment selector/region/theme                  | `playful-ui.spec.ts`, `public.spec.ts`, `outpost.spec.ts`                                                          |
| Broad rendered layouts/themes/focus                           | `design-review.spec.ts`, `qa-audit.spec.ts`, `qa-light.spec.ts`, per-page visual files and premium goldens         |
| Migration/cascade/backup/restore/health                       | `scripts/qa-database.mjs`, database diagnostics, environment/boundary tests                                        |

The [machine file inventory](inventory.json) lists actual current test paths and hashes. If a category’s filename changes, follow current source imports rather than creating a duplicate test that only mirrors a documentation sentence. Expected formula values must come from independent arithmetic, not the function being tested.

## Actual browser protocol

Prefer a discovered Playwright MCP only after a harmless real call succeeds. A registered tool that says approval policy never or browser launch failed is unavailable. Use the permitted installed local Playwright library/Chromium or CDP fallback and label evidence accurately. Neither source assertions nor generated-but-unopened screenshots count as visual inspection.

At minimum open homepage and main market/build/equipment/calculator/comp/guild/discovery/personal surfaces in their applicable anonymous and isolated authenticated states. Inspect1440×900,1920×1080,768px tablet,390×844,375px and320px. Wait for actual fonts, relevant visible images and the intended loaded/failed data state, return scroll to top, capture both viewport/full-page and open them. Compare the same viewport/theme/session/fixture identity before and after.

Exercise keyboard focus, search result arrows/Enter/Escape, drawer Tab/Escape/focus return, theme/region reload, menus, item/ability selection, dialog cancel/save, preserved unsaved draft, source refresh/manual override, saved scenario reload and actual export downloads. Check label/readability/alignment, clipped controls, broken words, stale values and unintended document overflow. A table’s deliberate scroll region is different from whole-page horizontal overflow.

Run unrestricted axe checks where appropriate and preserve incomplete/manual-review scope. Sampled axe/Lighthouse100 is not full WCAG conformance, voice-control/screen-reader validation or physical touch evidence. Reduced motion must disable nonessential route/theme/hover effects; do not infer this only from a CSS media-query existing in source.

## Goldens and real artwork

`e2e/premium-visual.spec.ts-snapshots` holds reviewed deterministic equipment/comp/mobile navigation images. Deliberate visual changes may be updated with:

```bash
E2E_PRODUCTION=1 npx playwright test e2e/premium-visual.spec.ts --update-snapshots
```

Open every changed golden, explain intentional changes and rerun without updating. These tests mask variable renderer pixels; inspect separate unmasked actual equipment captures to establish artwork identity/clarity. Do not use a concept image or fake fixture price as evidence of real game/source data.

## Performance and operation

Identify actual LCP element and waterfall before changing delivery. For a claimed improvement use at least three comparable baseline and three post-change production samples with the same route/mobile profile/cache description, sequential runs and median/range. Distinguish cold browser from warm application/image/source caches. Record actual CLS/TBT/other lab values and leave field INP/p75 unverified without actual field evidence. The documented hero comparison5.222→2.862s median is a scoped lab result and still misses2.5s.

Current UI/runtime/deployment phases also require actual applicable Docker/Lighthouse attempts and precise permission failures, not stale inherited evidence. An image build, health200 or synthetic restore does not establish real credentialed HTTPS, scheduled encrypted backups, production restore or incident operation. Keep release NO-GO until essential gates actually close.

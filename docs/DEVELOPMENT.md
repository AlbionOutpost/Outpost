# Developing Outpost

How we work on this codebase. Read this before changing anything; read [PRODUCT.md](../PRODUCT.md) and [DESIGN.md](../DESIGN.md) before changing anything a player sees.

## The bar

Outpost aims to be the best Albion Online site there is. Every change should leave the product **more correct, more coherent and more polished** than it was. "It works" is the floor, not the finish line: a feature is done when its numbers are trustworthy, its states are all designed, and it looks intentional on desktop and phone.

## Ground rules

1. **Data truth.** Never fabricate prices, stats, activity, abilities or patch status. Missing stays missing (em dash + "Unavailable"), manual values are labelled, every observation keeps its own city, quality, side and timestamp. See [DATA.md](DATA.md).
2. **Server-side authority.** Every read and mutation of private data re-checks ownership, membership and role against current database rows on the server. Client state, hidden buttons and cached roles are never authority. See [ARCHITECTURE.md § Security model](ARCHITECTURE.md#security-model).
3. **One design system.** Use the tokens, components and page archetypes in [DESIGN.md](../DESIGN.md). Don't add another global stylesheet "pass"; fix the owning rule or consolidate. Never reintroduce a rejected direction.
4. **Albion vocabulary.** Comps, builds, loadout, swaps, IP, spec, focus, RRR, buy/sell order, Teams.
5. **Free-tier aware.** Each page view costs Worker, Durable Object and D1 requests; the web bundle must stay under 3 MiB gzip. Measure before and after anything heavy.
6. **Secrets stay secret.** Never print, commit or copy `.env*` values. Use the wrapper scripts, which redact.
7. **Next.js 16 is newer than you think.** APIs and conventions differ from older versions. Check `node_modules/next/dist/docs/` for the installed version before using an API you are unsure of, and heed deprecation notices.

## How to work

- **Work autonomously.** Build, test, fix and push to a branch without asking. Make sensible technical and design decisions within this doc and DESIGN.md.
- **Check in first on big calls:** a new design direction or a change that contradicts DESIGN.md, deleting user data or content, merging to `main` (merging **deploys to production**), changes to auth/permissions semantics, anything that costs money or touches DNS/registrar/Discord settings.
- **Branch → PR → merge.** Work on a short-lived branch, open a PR, keep `main` deployable. Commits are authored as the repo owner; write clear imperative messages and don't add co-author or tool trailers.
- **Leave it better.** When you touch a page, also fix the small things in reach: a 10px label, a hard-coded colour that should be a token, a missing empty state.
- **Update the docs in the same PR** when behaviour changes (see the table at the end).

## Commands

Requires Node 22.12+ (`nvm use`), npm and Docker.

| Task                                                  | Command                                                                                                |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Install                                               | `npm ci`                                                                                               |
| Local services (Postgres 17 + Redis 7, loopback only) | `docker compose up -d`                                                                                 |
| Database schema / seed / catalog                      | `npm run db:deploy`, `npm run db:seed`, `npm run data:sync`                                            |
| Dev server (http://localhost:3000)                    | `npm run dev`                                                                                          |
| Types / lint / format                                 | `npm run typecheck`, `npm run lint`, `npm run format:check`                                            |
| Unit tests (Vitest)                                   | `npm test`                                                                                             |
| Browser tests (Playwright)                            | `npm run test:e2e` (`E2E_PRODUCTION=1` for the standalone build, `E2E_CLOUDFLARE=1` for local workerd) |
| Database integration (disposable Postgres)            | `npm run test:integration`                                                                             |
| Full local gate                                       | `npm run qa:phase`                                                                                     |
| Cloudflare build                                      | `node scripts/cloudflare-build.mjs`                                                                    |
| Docs links + skills check                             | `node scripts/docs-check.mjs`                                                                          |

First-time setup: copy `.env.example` to `.env` and set `NEXTAUTH_SECRET` to ≥32 random bytes. Discord sign-in locally needs your own Discord app with callback `http://localhost:3000/api/auth/callback/discord`. More in [TESTING.md](TESTING.md) and [OPERATIONS.md](OPERATIONS.md).

## Code map

| Path                                                            | What lives there                                                                                                                   |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `src/app`                                                       | App Router pages (45) and API routes (37), root `layout.tsx`, global stylesheets                                                   |
| `src/components`                                                | Shared and feature components (flat) — shell, search, item/spell icons, editors, calculators                                       |
| `src/lib/albion`                                                | AODP clients, region config, calculators (`calculations`, `production`, `transport`, `farming`, `fishing`…), recipes and game JSON |
| `src/lib/{builds,compositions,groups,community,catalog,timers}` | Domain validation, permissions and transactional services                                                                          |
| `src/lib/*.ts`                                                  | Infrastructure: auth, http guards, env, db driver, cache/rate limit, logging                                                       |
| `src/proxy.ts`                                                  | Middleware: CSP nonce, security and cache headers                                                                                  |
| `cloudflare/web`                                                | Edge Worker + per-session Durable Object that runs the app                                                                         |
| `cloudflare/database`                                           | Data Worker: private SQLite Durable Object, D1 catalog, rate-limit objects, RPC protocol                                           |
| `cloudflare/d1`                                                 | Generated SQLite schema and SQL migrations                                                                                         |
| `prisma`                                                        | Source schema (Postgres) and migrations, seed                                                                                      |
| `scripts`                                                       | Data import, Cloudflare/Discord operations, QA helpers                                                                             |
| `tests`, `e2e`                                                  | Vitest units, Playwright specs                                                                                                     |
| `data`, `public/library`, `docs/data`                           | Pinned game data, archived library content, source manifests                                                                       |

Domain services follow one pattern: `export const x = (args) => databaseService("x", args) ?? localX(args)`. Locally it runs against Postgres; on Cloudflare the same code runs inside the data Durable Object's transaction. Add new private mutations as services, and register them in `cloudflare/database/services.ts`. Details in [ARCHITECTURE.md](ARCHITECTURE.md).

## Definition of done

- [ ] `npm run typecheck`, `npm run lint`, `npm test` pass.
- [ ] Affected Playwright specs pass; new behaviour has a test (denied cases too, for anything permissioned).
- [ ] Calculator changes have independent expected values ([CALCULATORS.md](CALCULATORS.md)).
- [ ] UI changes inspected in a real browser at 1440 and 390 (plus 320 for overflow), compared to the matching reference in DESIGN.md; empty/loading/error/stale states checked.
- [ ] No new hard-coded colours, sub-12px text or global stylesheet passes.
- [ ] Docs updated.

## Skills

Project skills live in `.claude/skills` and load automatically when relevant:

| Skill                         | Use for                                                                                                                            |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `outpost-frontend`            | Any page, component, layout, style or copy change                                                                                  |
| `outpost-visual-qa`           | Rendered screenshots, reference comparison, responsive checks                                                                      |
| `outpost-albion-data`         | Item IDs, recipes, abilities, icons, data imports and provenance                                                                   |
| `outpost-calculators`         | Economy formulas, returns, focus, fees, scenarios                                                                                  |
| `outpost-security`            | Auth, sessions, permissions, APIs, private data, secrets                                                                           |
| `outpost-performance`         | Load time, bundle size, rendering, caching, free-tier budgets                                                                      |
| `outpost-deploy`              | CI, Cloudflare deploys, migrations, data pushes, rollbacks                                                                         |
| `impeccable`                  | Design critique, polish, hierarchy, typography, motion (vendored; set `IMPECCABLE_NO_TELEMETRY=1`, `IMPECCABLE_NO_UPDATE_CHECK=1`) |
| `vercel-react-best-practices` | React/Next performance patterns (vendored)                                                                                         |

## Which doc to update

| You changed…                                 | Update                             |
| -------------------------------------------- | ---------------------------------- |
| Product scope, users, principles             | [PRODUCT.md](../PRODUCT.md)        |
| Tokens, components, layouts, design rules    | [DESIGN.md](../DESIGN.md)          |
| Runtime, bindings, data flow, security model | [ARCHITECTURE.md](ARCHITECTURE.md) |
| An API route                                 | [API.md](API.md)                   |
| Data sources, imports, coverage, media       | [DATA.md](DATA.md)                 |
| A formula                                    | [CALCULATORS.md](CALCULATORS.md)   |
| CI, deploy, secrets, DNS, Discord            | [OPERATIONS.md](OPERATIONS.md)     |
| Test suites or commands                      | [TESTING.md](TESTING.md)           |
| Something shipped, broke or got planned      | [ROADMAP.md](ROADMAP.md)           |

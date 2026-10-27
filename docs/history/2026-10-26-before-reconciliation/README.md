# Outpost

A free, independent Albion Online companion platform under active implementation. **A tested application foundation with working market tools and build persistence; not the complete requested platform and not yet ready for public deployment.** Exact status and evidence: [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).

## Run locally

Requires Node 22.12+ (recommended Node 22), npm, Docker and Docker Compose.

```bash
nvm use
# On a fresh checkout only: copy .env.example to .env and generate NEXTAUTH_SECRET.
npm ci
docker compose up -d
npm run db:diagnose # Reports connectivity only; does not change credentials or apply migrations.
npm run db:deploy
npm run db:seed
npm run data:sync # Import the reviewed starter metadata; not a complete game catalog.
npm run dev
```

Open http://localhost:3000. Keep local configuration in an ignored `.env`. Never commit or bake `.env` into images. The `.env.example` database password is for loopback-only local development; replace it for any shared environment.

For a new environment, generate NEXTAUTH_SECRET with a cryptographically secure password generator (at least 32 random bytes). No paid service is needed. `npm run db:deploy` applies the committed migration history; use `npm run db:migrate -- --name descriptive_change` only when authoring a new schema migration.

Public tools work without login. For account/build editing, register a Discord OAuth app, set DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET and use `http://localhost:3000/api/auth/callback/discord` as local redirect. Production must use its matching HTTPS URL and NEXTAUTH_URL. No Discord guild permissions are requested. Without credentials the sign-in screen explains the configuration gap. Do not use a test-session fixture as a public authentication substitute.

## Working routes

- `/`: landing page, public build discovery and market entry; game-scene asset acceptance remains incomplete.
- `/tools`, `/tools/market`, `/tools/gold`, `/tools/flipping`: market observations/history, gold and manual trade calculations.
- `/items`: versioned imported metadata merged with a local factual starter index; not a full catalog.
- `/builds`, `/builds/new`, `/builds/[id]`, `/builds/[id]/edit`: persisted loadouts, publishing/visibility and conflict-safe revision saving.
- `/compositions`: persisted small-party boards and large rosters, revisions, sharing and PNG export.
- `/groups`: guild discovery, role-protected workspace, announcements, events and calendar export.
- `/tools/crafting`, `/tools/refining`, `/tools/enchanting`, `/tools/transporting`: tested starter economy models and private saved scenarios; incomplete game coverage.
- `/dashboard`, `/timers`, `/favorites`, `/guides`: personal overview, manual timers, saved content and original guide notes; no complete CMS/island/mastery platform.
- `/signin`, `/settings`, `/legal`: account access, preferences/data controls and legal draft.

Planned modules are labeled; missing features are not linked as working tools.

## Validation

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
npx playwright install chromium
E2E_PRODUCTION=1 npm run test:e2e
# Optional: bounded real public API reads, not used by offline unit tests:
npm run test:live
```

Browser tests require local PostgreSQL/Redis and use temporary database users/sessions/builds that are cleaned up. They do not verify Discord's actual OAuth exchange. Use a disposable local database, never production. Do not run a separate server on port 3000 during Playwright; it starts/stops its own server. Nonproduction browser runs use `npm run test:e2e`.

Latest executed test counts and any blocked checks are recorded in QA_REPORT.md and .qa/phase-summary.json. Browser tests assert persistence, authorization, calculations, source failures, responsive layout and sampled axe rules; screenshots are reviewed separately.

## API

See [docs/API.md](docs/API.md). Source/assumption provenance: [DATA_SOURCES.md](DATA_SOURCES.md). System boundaries: [ARCHITECTURE.md](ARCHITECTURE.md). Prioritized remaining work: [PROJECT_PLAN.md](PROJECT_PLAN.md).

## Deployment boundary

Native Next.js on Node 22 with PostgreSQL/Redis. The multi-stage standalone Docker image has been built and smoke-tested locally as a nonroot user. `docker compose up -d` currently starts local data services only. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) before operating outside a local development environment. There is no hosted deployment or CI run to claim.

Albion Atlas is not affiliated with or endorsed by Sandbox Interactive. No proprietary guide content, invented market data or unsupported combat rankings are bundled.

## Mandatory QA gate after each major phase

Run `npm run qa:phase` with Node22 and local services. Read [QA_REPORT.md](QA_REPORT.md), [QA_CHECKLIST.md](QA_CHECKLIST.md), [BUG_TRACKER.md](BUG_TRACKER.md), [PRODUCT_IMPROVEMENTS.md](PRODUCT_IMPROVEMENTS.md) and [RELEASE_READINESS.md](RELEASE_READINESS.md). Workflow: [docs/QA_WORKFLOW.md](docs/QA_WORKFLOW.md). The test runner never automatically approves a public release.

The production build now prepares standalone assets; `npm start` runs the prepared standalone server. The Docker image is multi-stage/nonroot and has been built and smoke-tested locally. Committed migrations include database domain constraints. `/api/health` checks PostgreSQL/Redis and reports authentication configuration separately. Synthetic backup/restore verification: `npm run test:integration`. These local checks do not establish public OAuth, TLS, legal or full product readiness. The current QA reports are the source of truth for verification counts and remaining release gates.

## Interface system

Typography, tokens, layouts, motion and verification are documented in [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md). The application bundles Barlow Condensed, Inter and Geist Mono through next/font/local; no browser request to an external font provider is needed. Run the full production QA gate after shared design changes.

Current visual brief and partial acceptance: [Outpost acceptance](docs/OUTPOST_ACCEPTANCE.md). The reference image and permitted hero/feature scene media remain unavailable; the implementation uses the requested typography-first fallback.

## Engineering status and contributing

The master-prompt audit is tracked in [docs/engineering/STACK_AUDIT.md](docs/engineering/STACK_AUDIT.md), [SECURITY_AUDIT.md](docs/engineering/SECURITY_AUDIT.md), [CALCULATOR_PARITY.md](docs/engineering/CALCULATOR_PARITY.md) and [REPOSITORY_READINESS.md](docs/engineering/REPOSITORY_READINESS.md). No competitor-parity or production-readiness claim. Full permitted metadata, ability unlocks, recipes and authentic scene media remain incomplete. Current homepage illustrations are disclosed provisional generated assets, not actual gameplay captures.

Original application-code license has not been selected by the owner; no open-source grant is implied. Font licenses are retained in public/licenses. Albion artwork/data rights remain separate. Read [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md) before submitting changes or vulnerability details.

Release-blocker diagnostics, current data coverage and exact remaining operator actions: [release checkpoint](docs/engineering/RELEASE_BLOCKERS.md). Real Discord/HTTPS verification remains unexecuted; see [staging instructions](docs/deployment/DISCORD_HTTPS_VERIFICATION.md).

Game-data verification preparation: `npm run data:source -- --source docs/data/ao-source.example.json` intentionally fails until a reviewed pinned source and checksum are configured. Read [verification stages and source workflow](docs/engineering/GAME_DATA_VERIFICATION.md). Prepared artifacts never activate a catalog automatically; current-patch coverage remains separate from downloads and schema validation.

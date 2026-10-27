# OUTPOST

Outpost is an independent Albion Online companion under active development. Working market tools, starter calculators, builds, compositions, guild collaboration and personal tools coexist with substantial missing data and product scope. [Current implementation](IMPLEMENTATION_STATUS.md), [executed QA](QA_REPORT.md) and [release readiness](RELEASE_READINESS.md) are the authoritative status documents.

## Rebuild or hand off to another AI

Start with the [complete single-file rebuild handbook](docs/rebuild/HANDBOOK.md) or the [chapter index and copyable AI instruction](docs/rebuild/README.md). It covers every route/API, exact schema/migrations, setup, security, data, formulas, design, components, assets, tests and known limits. The generated source inventory is checked with `node scripts/rebuild-inventory.mjs --check`. Original assets, the pinned dataset and private configuration remain separate required inputs.

## Run locally

Requires Node 22.12+ (use Node22), npm, Docker and Docker Compose.

```bash
nvm use
# Fresh environment only: copy .env.example to .env and generate NEXTAUTH_SECRET.
npm ci
docker compose up -d
npm run db:diagnose
# Review the target and committed migration SQL before applying it.
npm run db:deploy
npm run db:seed
npm run data:sync
npm run dev
```

Open http://localhost:3000. Keep private configuration in ignored `.env` files; never commit credentials or database dumps. The example database credentials are for loopback development. Generate a session secret with at least 32 random bytes. `data:sync` imports reviewed starter metadata, not a complete or current-patch-verified game catalog. Read [migration state and safe rollout](docs/deployment/MIGRATIONS.md) before using an existing database.

Public tools work without login. Editing account content requires a Discord developer application with `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` and the matching callback, locally `http://localhost:3000/api/auth/callback/discord`. [Real OAuth/HTTPS verification](docs/deployment/DISCORD_HTTPS_VERIFICATION.md) is still required; test database sessions do not prove provider login.

## Implemented surfaces

- The homepage includes actual saved-loadout cards and an on-request city-price preview; it does not seed community activity or market values.
- `/tools/market`, `/tools/gold`, `/items`: regional observations/history and a limited local/imported item catalog.
- `/tools/flipping`, `/tools/transporting`: manual trade, bounded direct/Black Market scan and cargo planning.
- `/tools/crafting`, `/tools/refining`, `/tools/enchanting`: starter manual/source-price production models and private scenarios.
- `/builds`, `/compositions`: persisted equipment/loadouts, revisions, sharing, duplication and local composition PNG export.
- `/groups`: discovery, fixed roles/invitations, shared resources, announcements, events/RSVP and calendar snapshots.
- `/favorites`, `/dashboard`, `/timers`, `/guides`, `/settings`: accessible saved content, bounded account summaries, manual timers, original guide notes and account controls.

These routes do not establish full catalog, recipe, mechanic or CMS coverage. [Acceptance scopes and evidence](QA_CHECKLIST.md) distinguish partial features from complete supported operations.

## Quality and documentation

```bash
npm run qa:phase
# Then follow docs/QA_WORKFLOW.md for data audit, scans and reviewed supplemental evidence.
python3 scripts/qa-reports.py --refresh-evidence
python3 scripts/docs-validate.py --require-local-evidence
npm run format:check
```

Follow [the phase workflow](docs/QA_WORKFLOW.md): review supported scopes and screenshots before updating evidence. Counts come from recorded logs; reports never approve a public release automatically. [Documentation ownership and score methodology](docs/DOCUMENTATION.md) explain the generated reports and historical archive.

## Architecture, sources and operation

The app uses Next.js/React/TypeScript, PostgreSQL/Prisma and Redis with a standalone Node runtime. [Architecture](ARCHITECTURE.md), [API](docs/API.md), [source/formula provenance](DATA_SOURCES.md), [deployment runbook](docs/DEPLOYMENT.md), [private GitHub setup](docs/deployment/GITHUB_SETUP.md) and [prioritized plan](PROJECT_PLAN.md) provide implementation detail.

The current homepage uses genuine source-pinned equipment artwork and an interactive selector; all generated scenery is archived. General equipment icons use the official renderer with bounded fallback. Authentic gameplay-scene permission remains a separate open requirement. Font notices are retained under [public/licenses](public/licenses). Original application-code licensing remains an owner decision; no open-source license grant is implied. See [contributing](CONTRIBUTING.md) and [security reporting](SECURITY.md).

Outpost is not affiliated with or endorsed by Sandbox Interactive. Game artwork/data rights remain separate from original application code. Historical technical identifiers retain their existing names for compatibility; the product name is Outpost.

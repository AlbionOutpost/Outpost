# Outpost architecture

For the complete reproducible implementation specification, read [the rebuild handoff](docs/rebuild/README.md) or its [single-file handbook](docs/rebuild/HANDBOOK.md).

## Runtime and boundaries

Next.js App Router/React on Node22 is a modular monolith using strict TypeScript, PostgreSQL/Prisma and Redis. Installed versions are recorded in [stack audit](docs/engineering/STACK_AUDIT.md); current executed results belong in [QA_REPORT.md](QA_REPORT.md).

- `src/app`: server-rendered routes, protected actions and API handlers.
- `src/components`: focused interactive editors, market/history, navigation and account views.
- `src/lib/albion`: fixed-host source clients, validation, caching/budgets, icons and pure manual accounting.
- `src/lib/builds`, `src/lib/compositions`, `src/lib/groups`, `src/lib/community`, `src/lib/catalog`: domain validation, access and transactional persistence.
- `prisma`: schema and immutable additive migration history. Prepared schema does not prove deployment.

## Accounts and persisted collaboration

NextAuth Discord registration uses identify/email and state+PKCE when credentials exist; database sessions authorize protected operations. Actual remote OAuth/HTTPS is separately unverified. Same-origin mutations authenticate, bound/validate input and recheck database authorization. Builds store normalized gear and immutable revisions; duplicate/restore operations preserve access semantics and create independent copies/new revisions. Group-only reads require current membership. Expected versions protect competing edits.

Groups have fixed OWNER/ADMIN/OFFICER/MEMBER roles, hashed expiring/revocable invitation tokens, transactional ownership transfer, events/RSVP/calendar and saved resource snapshots. Community storage includes favorites, votes, comment revisions, reports and audited moderation. `/admin/reports` exists and requires current staff permissions; there is no public staff-role assignment endpoint. Ownership transfer or group deletion is required before deleting an owning account.

Compositions store validated roster JSON plus revisions. Pointer/keyboard reorder and local JSON/PNG exports use actual state. PNG uses the bounded same-origin artwork service and labels missing images; no export is sent to Discord. Saved economic scenarios belong to one user; kind filtering precedes pagination. Private exports omit OAuth/session tokens.

## Data and accounting

Regional HTTPS hosts and paths are fixed, redirects denied, responses compressed/time/byte/URL bounded and schema checked before cache insertion. Keys include source identity; observations retain their source dates. Same-key requests share process work. Redis and bounded process caches have TTL/entry/byte controls; cache failure may fall back to process memory while request-budget failures deny requests. Cooldowns honor source reset headers. These are local safeguards, not cross-instance load certification.

Pure trade/production/transport models distinguish supplied assumptions, observed prices, missing values and retained-resource value. Unsupported mechanics remain outside the model. Starter metadata and reviewed imports are intentionally limited; source preparation never automatically confers patch verification. [Sources](DATA_SOURCES.md), [game-data workflow](docs/engineering/GAME_DATA_VERIFICATION.md) and [calculator scope](docs/engineering/CALCULATOR_PARITY.md) define the boundary.

## Browser, artwork and compatibility

Nonce CSP and private no-store behavior, origin checks, sanitized errors and validation have scoped regressions. HTTPS HSTS/cookie logic requires deployed verification. React renders author prose as text; there is no general untrusted-HTML or uploaded-asset pipeline. Scoped tests cannot certify the absence of injection or authorization vulnerabilities.

Fonts are served locally through next/font. Official renderer item requests have bounded neutral fallback; the current homepage uses source-pinned real equipment artwork and all generated scenes are archived. Current UI uses Inter, Barlow Condensed and Geist Mono with shared dark/light/reduced-motion tokens. Historical cookie/cache keys, npm identity, export formats/filenames and calendar identifiers are preserved for compatibility; they do not set the product brand.

The standalone nonroot container has historical local smoke evidence. Production monitoring, backup scheduling, rollback and public deployment require independent execution. [Deployment runbook](docs/DEPLOYMENT.md), [release gates](RELEASE_READINESS.md) and [architecture decisions](docs/engineering/ARCHITECTURE_DECISIONS.md) carry those details. Earlier implementation checkpoints are preserved in [history](docs/history/README.md).

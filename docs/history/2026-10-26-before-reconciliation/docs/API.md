# Current API

All responses are JSON unless indicated. No CORS permission is granted to other origins. Authentication uses the HTTP-only NextAuth session cookie. Mutation origins must match NEXTAUTH_URL. Error messages deliberately avoid source payloads/secrets. No unimplemented API is documented as available.

## Market

`GET /api/market?region=europe&item=T4_BAG&quality=1`

- Region: americas/europe/asia; exact item identifier: uppercase letters, digits, underscore and @, length 3–100; quality: 1–5.
- Returns region, fetchedAt, source and prices. Price observations include item_id, city, quality, sell_price_min/date, buy_price_max/date.
- Zero price means missing observation. Do not use fetchedAt as observation freshness.
- 400 invalid input; 429 shared endpoint budget exhausted; 503 data source unavailable/cooldown. Responses never substitute generated values.

## History and gold

`GET /api/history?kind=history&region=europe&item=T4_BAG&quality=1&city=Lymhurst`

Daily source aggregates for the previous 30 days, including item_count, avg_price and timestamp. City must match the enumerated public markets.

`GET /api/history?kind=gold&region=europe`

Up to 168 recent price/timestamp observations. Both endpoints return source/fetchedAt/region/data, validate source schemas and use a five-minute shared application cache. Same 400/429/503 error categories as market.

## Builds

`POST /api/builds`: authenticated, matching Origin, application/json up to 64 KiB. Request uses the shared buildInput schema from `src/lib/builds/validation.ts`. Required fields: title, description, contentType, region, visibility (PUBLIC/PRIVATE/UNLISTED), playerCount, recommendedIP, strategy, patchNotes, equipment array. Each equipment entry has slot, itemId, quality, abilities, alternatives; main hand is required and slot names must be unique. Item/ability existence is not yet game-catalog validated.

Returns 201 `{id,version}` only after database persistence. Ownership comes from the server session, never the request body.

`GET /api/builds/[id]`: public/unlisted read or private-author read. Returns build/equipment; unavailable or private-without-access is 404. No-store response.

`PUT /api/builds/[id]`: authenticated author, matching Origin, body `{version,build}`. Updates only if expected version matches, transactionally replaces equipment and adds a snapshot. Returns updated id/version. Conflict or non-author write is 409 and does not mutate data. Invalid input is 400.

`DELETE /api/builds/[id]`: authenticated author, matching Origin. Returns 204 on deletion, 404 when missing/not owned. Cascades equipment/revisions.

Public and personal build listing/search are server-rendered at `/builds?q=...&mine=0&page=1`; pages contain 24 builds. `mine=1` requires a session for actual results; anonymous users see no private results.

## Account

`GET /api/account/export`: requires session; returns a JSON attachment containing profile, linked provider identifiers and owned builds/revisions. OAuth access/refresh tokens and session tokens are excluded. 401 unauthenticated, 429 when export budget is exhausted. No-store.

Profile save and account deletion are authenticated Next.js Server Actions from `/settings` with framework origin/CSRF controls. Deletion requires literal DELETE and removes database sessions/accounts/owned builds by cascade. Signout is handled by NextAuth's CSRF-protected flow.

Discord login/callback endpoints are provided by NextAuth under `/api/auth/*`, with provider state/PKCE checks. Actual remote exchange has not yet been verified.

## QA hardening update

Build/account APIs now use a shared sanitized service-error boundary and `private, no-store` responses. Unexpected database/service failures return503. Bounded JSON rejects unsupported content type415, oversized body413 and invalid syntax/schema400; conflicts remain409. Startup validates canonical origin/secrets/service URLs. `GET /api/health` returns dependency health and an explicit authentication configuration state without exposing URLs or secrets; unavailable dependencies yield503.

## Composition and group endpoints

POST /api/compositions; GET/PUT/DELETE /api/compositions/[id]; POST /api/compositions/[id]/duplicate. PUT requires expected `version` plus validated `composition`. Composition JSON bodies are capped at1MiB; old build endpoints remain64KiB. Group-only reads/writes require current membership/editor roles. `/api/compositions/loadout?id=...` checks build read permission and returns supported equipment as an explicit copy.

POST /api/groups creates an owner membership transactionally. GET /api/groups/[id] returns member-only dashboard resources only for members; public outsiders get metadata only. POST /api/groups/[id]/actions validates an action union and rechecks PostgreSQL permissions. Actions include invitations/revocation, membership request/review, role/removal/leave/transfer/delete, announcements, events/cancellation/RSVP and shared build snapshots. POST /api/invitations/[token] atomically accepts an unexpired unused unrevoked invitation as Member. Authentication/origin/rate checks apply to all mutations.

## Build revisions and economy scenarios

- `POST /api/builds/:id/duplicate`: copy an accessible build into an independent private build.
- `POST /api/builds/:id/restore`: owner-only historical snapshot restoration with expected current version, producing a new revision and retaining current visibility.
- `GET /api/builds/:id/cost?region=&city=&sets=`: respects build visibility; batches selected equipment qualities, returns missing prices without a fabricated full total.
- `GET /api/economy/prices`: validated starter recipe query with kind, region, recipeId, materialCity, outputCity, quality and enchantment fields. Batches by quality; prices include region, city, source timestamp and manual=false. Missing observations are null. Existing upstream cache/backoff applies; endpoint adds a bounded request budget.
- `GET /api/scenarios`: authenticated user's newest50 private production scenarios.
- `POST /api/scenarios`: authenticated origin-checked/rate-limited save of title and validated production configuration. Returns201 only after PostgreSQL creation.
- `DELETE /api/scenarios/:id`: owner-only deletion; unauthenticated401, inaccessible/not-owned404.

Share links use schema-validated URL fragments containing static assumptions. They do not make saved account records public or promise current market data.

## Community and guild editing

`GET/POST /api/community/{build|composition}/:id`: visibility-checked stats, paginated comments and authenticated favorite/vote/comment/edit/delete/report operations. Comment edits require expected version. `GET ?history=:commentId` is author/moderator only and still requires current target access. No private-content counts are returned to outsiders.

`GET/POST /api/admin/reports`: current PostgreSQL ADMIN/MODERATOR role required; paginated report queue and expected-version review actions, audit entries and hidden-content enforcement. Public clients cannot assign staff roles. Operator provisioning requires a controlled database operation after identity review.

Group actions now support `profile` with expectedUpdatedAt and owner/admin permissions, and `edit-event` with eventId/version and officer-or-higher permissions. Calendar: `GET /api/groups/:id/events/:eventId/calendar`, current membership required, private no-store response. Native calendars handle UTC conversion; export is a snapshot, not a subscription or external reminder.

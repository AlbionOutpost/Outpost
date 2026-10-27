# Outpost API contracts

The [rebuild HTTP specification](rebuild/HTTP_API.md) documents actual query/body shapes, errors and all exported operations; [generated route inventory](rebuild/INVENTORY.md) is checked against source.

Source schemas and access predicates are authoritative. Responses are JSON unless noted; private data uses no-store behavior. Mutations authenticate, enforce the configured same-origin boundary, apply budgets and parse bounded JSON. These source/test controls are scoped evidence, not comprehensive security certification.

## Market, metadata and accounting inputs

| Endpoint                    | Implemented contract                                                                                                                                                                                  |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/market`           | Region americas/europe/asia, validated uppercase item ID and quality1–5; actual buy/sell observation values and independent source dates. Zero means missing, fetchedAt is not observation freshness. |
| `GET /api/history`          | Selected item/city/quality daily aggregates or regional gold observations; source dates preserved. Aggregates are not a confirmed-trades feed.                                                        |
| `GET /api/items`            | Bounded metadata search/filter results. Imported/local name merging occurs in the shared search helper; no full-catalog claim.                                                                        |
| `GET /api/item-icon`        | Validated fixed-host artwork proxy with timeout/byte/budget/cache limits and neutral fallback; no arbitrary remote URLs.                                                                              |
| `GET /api/economy/prices`   | Supported starter recipe/variant/quality/region/material-city/output-city observations; missing remains null and source identity is retained.                                                         |
| `GET /api/transport/prices` | Supported cargo item/order-direction observations; no verified mount/weight dataset.                                                                                                                  |
| `GET /api/opportunities`    | Bounded direct/Black Market observation scan; no executable-liquidity guarantee.                                                                                                                      |

Relevant schemas/clients: [market](../src/lib/albion/market-client.ts), [production](../src/lib/albion/production.ts), [transport](../src/lib/albion/transport.ts) and [metadata](../src/lib/catalog/validation.ts). Invalid input, budget exhaustion and upstream outage are distinct errors; sources are not replaced with invented prices. [Source/formula provenance](../DATA_SOURCES.md).

## Builds and compositions

| Endpoint                                | Access and behavior                                                                                                               |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/builds`                      | Session/origin required; persists author from session and validated gear, then returns201.                                        |
| `GET/PUT/DELETE /api/builds/[id]`       | Public/unlisted or private-author read; author mutation with expected version for update. Hidden-content checks apply.            |
| `POST /api/builds/[id]/duplicate`       | Copy readable content into an independent private record.                                                                         |
| `POST /api/builds/[id]/restore`         | Owner historical restoration with expected version; new snapshot and current visibility retained.                                 |
| `GET /api/builds/[id]/cost`             | Read permission, selected region/city/sets and quality-batched observations; missing costs do not become a fabricated full total. |
| `POST /api/compositions`                | Authenticated validated roster persistence.                                                                                       |
| `GET/PUT/DELETE /api/compositions/[id]` | Author/current group access as appropriate; expected version, editor-role checks and visibility/destination restrictions.         |
| `POST /api/compositions/[id]/duplicate` | Independent private draft with new roster identities.                                                                             |
| `GET /api/compositions/loadout`         | Permission-checked build snapshot copied into a roster.                                                                           |

Build gear includes legacy prose plus structured `abilitySelections` and `alternativeItemIds`. Known starter selections/alternatives are validated against supported equipment; arbitrary legacy IDs/notes do not imply valid current-game metadata. Main hand and unique slots are required; full catalog/unlocks remain incomplete. [Build schema](../src/lib/builds/validation.ts), [build service](../src/lib/builds/service.ts), [composition schema](../src/lib/compositions/validation.ts), [composition service](../src/lib/compositions/service.ts).

Build JSON uses the default64KiB boundary; composition roster operations explicitly allow bounded larger bodies. [Boundary implementation](../src/lib/http.ts). Concurrent stale revisions do not silently overwrite. Local composition JSON/PNG downloads are browser operations, not remote export/upload endpoints.

## Guild and community operations

| Endpoint                                         | Access and behavior                                                                                                                                                                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/groups`                               | Creates guild and owner membership transactionally.                                                                                                                                                                             |
| `GET /api/groups/[id]`                           | Current member resources; permitted public outsiders receive metadata without private dashboard content.                                                                                                                        |
| `POST /api/groups/[id]/actions`                  | Validated action union: invitation/revoke, request/review, role/remove/leave/transfer/delete, announcements/events/RSVP, shared builds and profile/event edits. Current PostgreSQL roles and optimistic versions are rechecked. |
| `POST /api/invitations/[token]`                  | Accept unexpired unused unrevoked hashed invitation; authenticated membership creation.                                                                                                                                         |
| `GET /api/groups/[id]/events/[eventId]/calendar` | Member-only private calendar attachment; escaped/folded UTC snapshot with stable UID/revision, not a subscription.                                                                                                              |
| `GET/POST /api/community/[kind]/[id]`            | Readable build/composition stats/comments and authenticated favorites, build votes, comments/revisions/deletion or reports. History additionally requires author/moderator permission.                                          |
| `GET/POST /api/admin/reports`                    | Current ADMIN/MODERATOR role, paged review and expected versions, audit and hide/restore/resolve/dismiss. No public staff-role assignment.                                                                                      |

[Guild action schema](../src/lib/groups/validation.ts), [role predicates](../src/lib/groups/permissions.ts), [community schema](../src/lib/community/validation.ts), [service/access](../src/lib/community/service.ts). Fixed-role collaboration exists; configurable roles/uploads and comprehensive abuse/appeals operations do not.

## Personal account and scenarios

| Endpoint                        | Access and behavior                                                                                                                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/scenarios?kind=...`   | Current user's newest50 records, with validated optional kind filtering before pagination.                                                                                                                    |
| `POST /api/scenarios`           | Private validated production, transporting or flipping assumptions.                                                                                                                                           |
| `DELETE /api/scenarios/[id]`    | Owner deletion; outsiders receive unavailable/not-owned response.                                                                                                                                             |
| `GET/POST /api/timers`          | Owner-scoped bounded listing/create of manual timers.                                                                                                                                                         |
| `PATCH/DELETE /api/timers/[id]` | Owner transitions/rename/delete with optimistic revision checks.                                                                                                                                              |
| `GET /api/search`               | Bounded permission-filtered items/builds/compositions/groups/tools; immediate membership/hidden-content filtering.                                                                                            |
| `GET /api/account/export`       | Session and export budget required; selected profile/provider IDs, builds/compositions/revisions, scenarios, timers, favorites/votes/comments/reports and membership metadata. OAuth/session tokens excluded. |
| `/api/auth/[...nextauth]`       | NextAuth provider/session/signout handlers; actual Discord exchange remains unverified.                                                                                                                       |
| `GET /api/health`               | Database/cache checks and separate provider-configuration state; no secrets/connection URLs or complete readiness certification.                                                                              |

Profile save/account deletion are authenticated Server Actions in [settings actions](../src/app/settings/actions.ts), with deletion confirmation and group-ownership protection. Static scenario-share fragments hold validated assumptions and do not publish private saved records. Legacy export/calendar identifiers are retained for compatibility. The private watchlist is implemented locally through `GET/POST /api/market-watch` and `DELETE /api/market-watch/[id]`, with migration17, per-user100-item cap, region/item/quality uniqueness, serializable duplicate/cap checks, reload persistence and owner-only deletion. Controlled staging rollout and recovery remain separate.

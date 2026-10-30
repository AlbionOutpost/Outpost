# HTTP API

All routes live under `src/app/api`. JSON in and out. Mutations (`POST`/`PUT`/`PATCH`/`DELETE` on private data) go through `mutationUser`: same-origin `Origin`, a session, and the `content:<userId>` budget (30/min). Bodies must be `application/json` (64 KiB default, 1 MiB for comps). Errors are `{ error }` with non-disclosing messages; private responses are `Cache-Control: private, no-store`.

**Auth:** pub = public · sess = requires session · owner/member = checked against current DB rows.

**Limits** on public routes are site-wide counters shared by everyone (the three `/api/market*` routes share one 120/min bucket); per-user budgets apply to signed-in mutations.

## Market and economy

| Route                                                           | Auth | Purpose                                                | Limit                |
| --------------------------------------------------------------- | ---- | ------------------------------------------------------ | -------------------- |
| `GET /api/market`                                               | pub  | One item, one quality, all cities in a region          | 120/min              |
| `GET /api/market/batch`                                         | pub  | 1–12 items, one quality                                | 120/min              |
| `GET /api/market/qualities`                                     | pub  | All 5 qualities (optional city)                        | 120/min, cached 30 s |
| `GET /api/history`                                              | pub  | Gold (168 points) or 30-day daily item history         | 60/min               |
| `GET /api/economy/prices`                                       | pub  | All ingredient + output quotes for a production recipe | 60/min               |
| `GET /api/transport/prices`                                     | pub  | Buy/sell pair for one route direction                  | 60/min               |
| `GET /api/laborers/prices`                                      | pub  | Full/empty journal and loot quotes for one laborer run | 60/min               |
| `GET /api/recipes`                                              | pub  | Recipe search (kind, category, tier, enchantment, q)   | —                    |
| `GET /api/recipes/[id]`                                         | pub  | One game recipe plus its alternatives                  | —                    |
| `GET /api/items/game`                                           | pub  | Name, weight and item value for ≤50 IDs (static data)  | —                    |
| `GET /api/opportunities`                                        | pub  | Flip/transport scanner, ≤25 items                      | 30/min               |
| `GET /api/combat-events`                                        | pub  | Kill/death feed (offset 0–200, step 20)                | 120/min, cached 15 s |
| `GET /api/items`                                                | pub  | Catalog search, 30 per page                            | —                    |
| `GET /api/item-icon`                                            | pub  | Renderer proxy with validated fallback                 | 240/min/process      |
| `GET /api/search`                                               | pub  | Global search, permission-filtered                     | 120/min              |
| `GET, POST /api/market-watch` · `DELETE /api/market-watch/[id]` | sess | Private watchlist                                      | content budget       |

## Builds

| Route                             | Auth               | Purpose                                                 |
| --------------------------------- | ------------------ | ------------------------------------------------------- |
| `POST /api/builds`                | sess               | Create (revision 1)                                     |
| `GET /api/builds/[id]`            | visibility         | Read                                                    |
| `PUT /api/builds/[id]`            | owner              | New revision (expected-version conflict check)          |
| `DELETE /api/builds/[id]`         | owner              | Delete                                                  |
| `POST /api/builds/[id]/duplicate` | sess + read access | Independent copy                                        |
| `POST /api/builds/[id]/restore`   | owner              | Restore an earlier revision as a new one                |
| `GET /api/builds/[id]/cost`       | pub (visibility)   | Replacement cost for a region/city, ≤1000 sets (60/min) |

## Comps

| Route                                   | Auth                         | Purpose                       |
| --------------------------------------- | ---------------------------- | ----------------------------- |
| `POST /api/compositions`                | sess                         | Create                        |
| `GET /api/compositions/[id]`            | visibility / Team membership | Read                          |
| `PUT, DELETE /api/compositions/[id]`    | owner / Team officer+        | Update (revisioned) or delete |
| `POST /api/compositions/[id]/duplicate` | sess + read access           | Copy                          |
| `GET /api/compositions/loadout`         | visibility                   | Resolve a member's loadout    |

## Teams

| Route                                            | Auth                         | Purpose                                                                                                                              |
| ------------------------------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `POST /api/groups`                               | sess                         | Create a Team (caller becomes OWNER)                                                                                                 |
| `GET /api/groups/[id]`                           | public Team or member        | Read                                                                                                                                 |
| `POST /api/groups/[id]/actions`                  | role-checked per action      | All Team mutations via `mutateGroup` (members, roles, invitations, announcements, events/RSVP, shared resources, ownership transfer) |
| `GET, POST /api/groups/[id]/loot`                | read member · write officer+ | Loot ledger and splits                                                                                                               |
| `GET /api/groups/[id]/events/[eventId]/calendar` | member                       | ICS export                                                                                                                           |
| `POST /api/invitations/[token]`                  | sess                         | Accept an invitation (hashed, expiring, revocable)                                                                                   |

## Community, account and personal

| Route                                                      | Auth                  | Purpose                                                                 |
| ---------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------- |
| `GET, POST /api/community/[kind]/[id]`                     | read pub · write sess | Favorites, votes, comments, reports (Turnstile on writes in production) |
| `GET, POST /api/admin/reports`                             | ADMIN/MODERATOR       | Moderation queue, hide/restore                                          |
| `GET, POST /api/scenarios` · `DELETE /api/scenarios/[id]`  | sess (owner)          | Saved calculator scenarios                                              |
| `GET, POST /api/timers` · `PATCH, DELETE /api/timers/[id]` | sess (owner)          | Personal timers                                                         |
| `GET /api/account/export`                                  | sess                  | Account data export (5/h)                                               |
| `GET, POST /api/auth/[...nextauth]`                        | —                     | NextAuth (Discord), 240/min                                             |
| `GET /api/health`                                          | pub                   | Health check                                                            |

Settings changes and account deletion are Server Actions in `src/app/settings/actions.ts` (20/min and 3/h).

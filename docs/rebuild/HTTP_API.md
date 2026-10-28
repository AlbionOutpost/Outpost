# HTTP and Server Action contracts

**October27 implementation update:** `GET /api/market/batch?region=europe&items=T4_BAG,T4_CAPE&quality=1` validates1–12 distinct IDs plus region/quality, shares the existing market public budget, and returns AODP rows with source/request identity. Missing quotes are not substituted. Research/watchlist refresh groups by quality and makes bounded sequential chunks; the private saved-selection API retains its existing authentication/ownership/no-store boundaries.

[Generated HTTP inventory](INVENTORY.md) lists every current handler, exported HTTP operation and exact source path. Query/body field names below are implementation contracts. User/session IDs come from server authentication, never from a trusted browser author field. All examples are **illustrative request shapes**, not real saved records, users, game recommendations or market observations.

## Current market recovery

`GET /api/market/qualities?region=europe&item=T8_MAIN_AXE&city=Martlock` validates server/item and optional city, requests qualities1–5 once, and returns exact alternatives with source city/date plus nullable buy/sell sides. Black Market asks are not purchase options. This explicit lookup never changes the selected quality automatically. The shared public budget remains; handler max-age30 is overridden by hosted gateway private,no-store. Exact source slices are reused for60seconds with bounded storage. Every network attempt reserves50/minute and250/five-minute regional quotas and observes cooldowns.

`GET /api/builds/[id]/cost` performs read permission checks first, batches exact equipped qualities once, excludes Black Market purchase origins and retains individual observations. Unsafe whole-silver aggregates return nullable knownCost/total and unsupportedRange=true. Source zero remains missing, not free.

## Common behavior

Successful reads/updates generally return200; creation routes use201; build/comp deletion uses204. Timer/scenario/watch deletion may return JSON instead; follow individual handlers. Error JSON is `{error: string}`. Important statuses:400 invalid data,401 missing session,403 origin/permission,404 unavailable/not-owned resource,409 revision/cap/state conflict,413 oversized body,415 wrong content type,422 readable but unsupported copied equipment,429 exhausted budget and503 service unavailable. Do not rewrite every failure to200 with an empty list.

For JSON mutations send `Content-Type: application/json`, the exact canonical `Origin` and real auth cookies. Browser same-origin fetch normally supplies the Origin; examples must not invent permanent test cookies. `boundedJson` defaults64KiB; comp roster create/update allows1MiB and watch creation2KiB. `apiHandler` gives private/no-store; plain market/history handlers set their own response semantics. Dynamic route params are awaited promises in this Next version.

## Observations and metadata

| GET route               | Required/optional query                                                                                   | Response and limits                                                                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/market`           | `region`, `item`, `quality`                                                                               | `{region,fetchedAt,source,prices}`; uppercase ID syntax3–100 chars, quality1–5; public120/minute; source zero is not a free item                |
| `/api/history`          | `kind=gold,region` **or** `kind=history,region,item,city,quality`                                         | `{region,fetchedAt,source,data}`; public60/minute; gold168 observations; item daily aggregates for bounded30-day range                          |
| `/api/items`            | `search` default empty/max100; optional exact equipment `slot`, `tier`1–8, `enchantment`0–4; `page`1–1000 | `{items,total,page,pageSize:30}`; active metadata only, stable ID order                                                                         |
| `/api/item-icon`        | `id`, optional `quality=1`                                                                                | PNG or neutral SVG fallback, `X-Icon-Status`, bounded public cache age; fixed renderer only                                                     |
| `/api/economy/prices`   | `kind,region,recipeId,materialCity,outputCity,quality,enchantFamily,tier,fromEnchant,toEnchant`           | `{region,source,prices}`; supported recipe only; material/output quality identity and source sell observations;60/minute                        |
| `/api/transport/prices` | `region,itemId,quality,fromCity,toCity,saleMode`                                                          | Source buy/sell observation pair for the selected direction;60/minute; Black Market purchase origins denied; sell-listing targets remain manual |
| `/api/opportunities`    | `region,fromCity,toCity,saleMode,quality,tax,fee,items` comma-separated                                   | `{region,observedAt,rows,methodology}`;1–25 input IDs/deduplicated batches;30/minute; bounded observation estimates, not executable fills       |
| `/api/search`           | `q` trimmed2–100                                                                                          | `{results:[{category,title,url}]}`; server-access-filtered active items/tools/builds/comps/guilds; up to8 each DB category;120/minute           |
| `/api/health`           | none                                                                                                      | PostgreSQL/Redis health plus independent provider configuration state; dependency failure503; no connection strings                             |

Example: `/api/market?region=europe&item=T4_BAG&quality=1`. Prices retain source `item_id`, `city`, `quality`, `sell_price_min`, `sell_price_min_date`, `buy_price_max`, `buy_price_max_date`. `fetchedAt` means the application response time, not when that city/side was observed. `/api/opportunities.observedAt` likewise does not turn stale source rows into new observations.

All data hosts, supported city strings, quality/tier/enchant bounds, TTLs and null/freshness rules are in [game data](GAME_DATA.md). The optional icon endpoint returns a usable fallback instead of blocking the whole page.

## Builds

| Operation                         | Body/query                             | Result and important semantics                                                                                                                                          |
| --------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/builds`                | Full `BuildInput`                      | 201 `{id,version}`; session author; version1 equipment/snapshot                                                                                                         |
| `GET /api/builds/[id]`            | none                                   | Readable record plus equipment ordered by slot; private/hidden access enforced                                                                                          |
| `PUT /api/builds/[id]`            | `{version,build:BuildInput}`           | `{id,version}`; atomic expected-version save/revision; denied or stale update409                                                                                        |
| `DELETE /api/builds/[id]`         | none                                   | 204, owner predicate or404                                                                                                                                              |
| `POST /api/builds/[id]/duplicate` | none                                   | Independent private copy/revision1, verified readable source                                                                                                            |
| `POST /api/builds/[id]/restore`   | `{revision,version}` positive integers | New revision from validated historical snapshot, current visibility retained                                                                                            |
| `GET /api/builds/[id]/cost`       | `region,city,sets`1–1000               | `{region,city,sets,source,fetchedAt,rows,knownCost,total,stale}`; groups requests by quality; missing row makes total null, not partial knownCost presented as complete |

`BuildInput` includes title3–100, description≤4000, enumerated contentType, region, PUBLIC/PRIVATE/UNLISTED visibility, playerCount1–400, recommendedIP0–4000, strategy≤12000, patchNotes≤2000 and1–10 unique equipment slots including Main hand. A gear row includes `slot,itemId,quality,abilities,alternatives,abilitySelections,alternativeItemIds`; prose limits1000, structured ability keys20/name100 and at most4 alternatives. See the exact schema in `src/lib/builds/validation.ts`.

```json
{
  "title": "Example private build",
  "description": "Illustrative request shape only",
  "contentType": "Other",
  "region": "europe",
  "visibility": "PRIVATE",
  "playerCount": 1,
  "recommendedIP": 0,
  "strategy": "",
  "patchNotes": "",
  "equipment": [
    {
      "slot": "Main hand",
      "itemId": "T4_MAIN_AXE",
      "quality": 1,
      "abilities": "",
      "alternatives": "",
      "abilitySelections": {},
      "alternativeItemIds": []
    }
  ]
}
```

## Comps

| Operation                               | Body/query                               | Result                                                                                                               |
| --------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `POST /api/compositions`                | Full `CompositionInput`                  | 201 `{id,version}`                                                                                                   |
| `GET /api/compositions/[id]`            | none                                     | Permission-checked record/roster                                                                                     |
| `PUT /api/compositions/[id]`            | `{version,composition:CompositionInput}` | New current version plus snapshot; current group/destination checks                                                  |
| `DELETE /api/compositions/[id]`         | none                                     | 204 after the exact group/non-group deletion policy                                                                  |
| `POST /api/compositions/[id]/duplicate` | none                                     | Independent private copy with fresh member UUIDs and no sourceBuildId ties                                           |
| `GET /api/compositions/loadout`         | `id` of an accessible build              | `{sourceBuildId,equipment,notes}`; requires sign-in;422 if gear cannot be represented by supported equipment choices |

`CompositionInput`: title3–100, description≤4000, region, contentType1–80, PUBLIC/PRIVATE/GROUP, groupId nullable, notes≤12000 and1–100 unique member slots. GROUP requires groupId; other visibility requires null. Each slot: UUID id, playerName≤60, one of the supported roles, customRole≤60, mandatory boolean, substitute≤60, notes≤2000, sourceBuildId nullable/max100, up to10 unique equipment choices. Roles include Tank, Healer, Melee DPS, Ranged DPS, Support, Defensive support, Engage, Pierce, Caller, Scout, Custom. Equipment choices preserve actual family/item/ability compatibility.

PNG/JSON comp exports are local browser operations. There is no remote PNG upload, “send comp to Discord” endpoint or automatic recommended comp generator.

## Guilds, invitations and calendar

`POST /api/groups` accepts `{name,slug,description,region,visibility}`. Name3–80, slug3–60 lowercase alphanumeric/hyphen segments, description≤4000, region enum and PUBLIC/PRIVATE. It creates owner membership and returns201 `{id,slug}`; duplicate slug409. `GET /api/groups/[id]` returns current-member dashboard or allowed public metadata; it is not a public roster leak.

`POST /api/groups/[id]/actions` accepts the validated discriminated action union. Field details are in `src/lib/groups/validation.ts`:

| Action                                 | Additional fields                                                                  |
| -------------------------------------- | ---------------------------------------------------------------------------------- |
| `profile`                              | `expectedUpdatedAt,name,description,region,visibility`                             |
| `event`                                | `title,description,startsAt,timezone,expectedParticipants,voiceInfo,compositionId` |
| `edit-event`                           | Event fields plus `eventId,version`                                                |
| `cancel-event`                         | `eventId`                                                                          |
| `rsvp`                                 | `eventId,status,role`; status AVAILABLE/MAYBE/UNAVAILABLE                          |
| `invite` / `revoke`                    | `hours`1–168 / `invitationId`                                                      |
| `request` / `decide`                   | `message` / `userId,approve`                                                       |
| `role` / `remove` / `transfer`         | `userId` and, for role, ADMIN/OFFICER/MEMBER                                       |
| `leave` / `delete`                     | No additional action fields                                                        |
| `announcement` / `remove-announcement` | `title,body` / `id`                                                                |
| `share-build` / `remove-build`         | `buildId` / `id`                                                                   |

Event start is an ISO datetime; timezone is validated with Intl, not a guessed UTC offset. Participant count1–400; voice text≤200; linked comp access is checked. A guild OWNER is assigned through creation/transfer, not through the ordinary role field.

`POST /api/invitations/[token]` accepts a real current invitation into the authenticated user’s membership. `GET /api/groups/[id]/events/[eventId]/calendar` is a member-only `text/calendar` attachment with escaped text, UTF-8 folding, UTC dates, stable UID/SEQUENCE and cancelled status. It is a private exported snapshot, not a public subscription feed.

## Community and moderation

`GET /api/community/[kind]/[id]` reads permitted target stats/comments. Kind is `build` or `composition`; optional history has additional author/moderator protection. `POST` takes one of:

- `{action:"favorite",active:boolean}` or `{action:"vote",active:boolean}`; preserve build-only voting rules.
- `{action:"comment",body}` with3–3000 trimmed characters.
- `{action:"edit-comment",commentId,version,body}` or `{action:"delete-comment",commentId,version}`.
- `{action:"report",reason,commentId?}` with reason10–2000.

`GET /api/admin/reports?page=1&status=OPEN` requires current staff; page size20 plus a next-row probe and status OPEN/RESOLVED/DISMISSED/ALL. `POST` takes `{reportId,version,action,note}`; action hide/restore/resolve/dismiss, note10–2000. Staff access, target availability, expected version and audit writes are checked inside the transaction. There is no public staff-grant endpoint.

## Personal records and settings

| Operation                       | Contract                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `GET /api/scenarios?kind=...`   | Current user’s newest50, kind-filtered before limit; kind crafting/refining/enchanting/transporting/flipping        |
| `POST /api/scenarios`           | `{title,configuration}`; title3–100; configuration must parse the appropriate calculator schema;201 `{id}`          |
| `DELETE /api/scenarios/[id]`    | Owner-only deletion; do not expose another user’s row                                                               |
| `GET /api/timers`               | Current user’s newest100                                                                                            |
| `POST /api/timers`              | `{title,category,durationMinutes}`; title1–100, supported category,1–30000 minutes;201 persisted timer              |
| `PATCH /api/timers/[id]`        | `{action,version}` for pause/resume/reset/complete or `{action:"rename",version,title}`; state/version409, owner404 |
| `DELETE /api/timers/[id]`       | Owner-only `{deleted:true}`                                                                                         |
| `GET /api/market-watch`         | Current user’s≤100 `{id,region,itemId,quality}` rows, newest first                                                  |
| `POST /api/market-watch`        | Strict `{region,itemId,quality}`; duplicate-safe and100-cap serializable check;201 row                              |
| `DELETE /api/market-watch/[id]` | Owner-only `{deleted:true}` or404                                                                                   |
| `GET /api/account/export`       | Authenticated selected profile/owned data attachment;5/hour; excludes OAuth/session tokens                          |
| `/api/auth/[...nextauth]`       | GET/POST NextAuth handlers; use provider/session/signout contracts, never custom fabricated auth endpoints          |

Settings Server Actions are `saveSettings(previous,FormData)` and `deleteAccount(previous,FormData)` in `src/app/settings/actions.ts`. Save fields are name,region,characterName; deletion needs confirmation DELETE and no owned group. Failed changes return an error while retaining the draft; successful save revalidates layout/redirects, deletion redirects to sign-in. Preserve the framework’s action boundary rather than exposing an unchecked new REST profile endpoint.

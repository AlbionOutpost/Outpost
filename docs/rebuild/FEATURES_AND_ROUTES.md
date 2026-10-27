# Pages, workflows and state contracts

The [generated page table](INVENTORY.md#page-routes-32) is the exhaustive32-route list. Every route must render inside the shared shell with a primary heading, correct access state and functional links/actions. `/loading`, `/error` and `/not-found` are not extra content routes: Next loading/error/not-found files provide boundary states.

## Homepage and global navigation

`/` renders the latest real-equipment composition, not the archived panoramic scene. Keep the exact heading “Plan. Trade. Build.” / “Play smarter.”, original logo, short description and Explore market/Create a build actions. The right showcase switches Battleaxe/Broadsword/Bow, shows genuine artwork and links to real T4 item references; Scholar Cowl and Mercenary Jacket are named browse links, not a claimed recommended set.

Four entry cards use original left-of-title emblems and explicit destination actions: Market tools, Build creator, Calculators, Guild tools. Do not restore the13-item decorative strips that were removed at the owner’s request. Follow with actual four-item market snapshot, historical market terminal, searchable city-price lookup and up to five actual public saved builds. The homepage excludes reserved `atlas-test-*` authors; missing community data is an honest empty state rather than invented active players/popularity/builds.

The header has bold horizontal Market/Tools/Builds/Comps/Guides/Guilds tabs. Tools is the explanatory two-column menu; the search trigger opens the compact command palette, Ctrl/Cmd+K works, query requests debounce/cancel and result URLs retain region. Empty search offers task shortcuts and example item names. Arrow keys move result focus, Enter opens, Escape closes/reset, and closing returns to the prior focus context. Preserve the accessible input label, actual item images and distinct searching/empty/error states.

Region changes preserve current pathname/query settings while updating the region URL/cookie. Theme persists to the cookie and uses a supported native snapshot crossfade or immediate fallback. Header appearance varies appropriately for anonymous homepage Discord login versus account dropdown on product pages. Mobile replaces the desktop tabs with the focus-managed drawer; see [frontend behavior](FRONTEND_DESIGN.md).

## Markets and item discovery

| Route           | Primary workflow                                                                          | Required states and details                                                                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/tools`        | Browse grouped economy/build/comp/guild tools                                             | Original glyphs and genuine relevant equipment; explain actual supported/manual/limited states, not unsupported decorative calculators                        |
| `/tools/market` | Choose item, quality, region; request city quotes; sort/filter; inspect history/watchlist | Name picker with local/remote catalog fallback, advanced exact ID, city/date/side identity, unavailable/stale/source failure, private watchlist sign-in state |
| `/tools/gold`   | Inspect selected-region gold observations                                                 | Source dates and missing/error states; no invented trading signal or fill graph                                                                               |
| `/items`        | Browse active metadata by search/category/slot/tier/enchant and page                      | Source imported coverage note, stable30-row API paging, local starter fallback where used; complete-game/patch claims prohibited                              |
| `/items/[id]`   | Inspect existing item metadata and open a matching market lookup                          | Actual name/ID/tier/enchant/power/available abilities/recipe provenance; absent or unverified fields remain absent/labelled rather than guessed               |

On market entry, show instructions or available loaded data instead of pretending an empty price table contains a zero-cost item. “Compare prices” requests the selected identity; a later region/item/quality change clears or cancels old quotes. City filtering/sorting must not switch sell/buy columns. Current market APIs may return old source observations even after a successful HTTP response; freshness is per side, not a green “live” badge based on fetch time.

The homepage terminal uses the actual T4 Bag/daily-history example with7/30-day controls, selectable history city, city quotes and an inspectable source disclosure. Gaps>36hours stay disconnected. The quick lookup uses real selectable Bag/Battleaxe/Cape names and source rows. Snapshot pause/manual refresh/visibility behavior is independent from the terminal’s history cache.

## Calculators

| Route                 | Component/engine                        | User journey                                                                                                                                               |
| --------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/tools/flipping`     | `TradeCalculator`, `OpportunityScanner` | Enter manual prices/fees, inspect profit/threshold/ROI, save/load/share assumptions; optionally request bounded direct/Black Market observations           |
| `/tools/transporting` | `TransportCalculator`                   | Choose item/direction/order mode, manual weight/capacity/trip/risk, explicit source load or manual prices, inspect trips/cash/profit and private scenarios |
| `/tools/crafting`     | `ProductionCalculator` crafting mode    | Select supported recipe/batches/quality, material/output cities, manual/source prices, actual supplied fee/return/focus assumptions and result breakdown   |
| `/tools/refining`     | Same component in refining mode         | Retain Normal output identity, supported starter recipe limits and plain/pristine source warning                                                           |
| `/tools/enchanting`   | Same component in enchanting mode       | Supported family/tier/.0–.3 path/materials, chosen item quality, no unsupported focus/return model                                                         |

Desktop production is assumptions/materials/results in distinct working columns; phone ordering preserves assumptions, editable material rows and visible result summary. Blank numeric inputs must stay editable without React NaN warnings. Source refresh cannot overwrite intentional manual edits. Static share fragments preserve old source timestamps. All unsupported kinds and recipe/metadata gaps are in [calculator contracts](CALCULATORS.md).

## Builds

| Route               | Access and behavior                                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `/builds`           | Public discovery or session-owned collection; q/content/weapon/sort/mine/page filters; actual favorites/recent dates and image-led cards |
| `/builds/new`       | Sign-in redirect if unauthenticated; create full draft through equipment workbench and save real version1                                |
| `/builds/[id]`      | Read policy, loadout/abilities/notes, source cost, actual author/revision and supported community actions; unavailable404                |
| `/builds/[id]/edit` | Owner editing, expected-version save, independent swaps, restore/duplicate/delete according to actual actions                            |

Discovery supports actual content-type enums, three supported weapon-family filters and saved/recent sorting. It fetches one additional row to page24 results; do not label a bounded page as global totals. Mine while anonymous is empty rather than someone else’s content. Readable unlisted records are not public discovery entries.

The editor separates browser, anatomical equipment arrangement and details/abilities. Mobile uses Equipment/Browse items/Item details tabs so forms do not bury the selected gear. Main hand is required and slot identities unique. Use actual item families/IDs/quality; show unsupported/missing ability metadata instead of invented spell icons. Preserve legacy author notes separately from structured validated abilities and independent alternatives.

## Comps

| Route                     | Access and behavior                                                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `/compositions`           | Search available public/private-owned/current-group comps, optional mine and24-row paging; show actual roster weapon/role previews |
| `/compositions/new`       | Authenticated creation with permitted group/build options                                                                          |
| `/compositions/[id]`      | Permission-checked read, roster/board, actual assignments/gear and discussion/export where allowed                                 |
| `/compositions/[id]/edit` | Current eligible editor, full roster draft, member dialog, reorder/copy/import/export and expected-version save                    |

Use the player term **comp**, while internal compatibility paths/schema still say composition. Each member has UUID, role/custom role, player/substitute, mandatory state, notes, gear and optional copied build provenance. Auto layout uses a simultaneous board for2–7 slots; larger groups use the compact roster plus one focused member dialog. Manual board/roster controls remain. Do not render100 permanently expanded member forms.

Pointer and keyboard movement must preserve actual order in saved JSON. Duplicating a member or comp creates new UUIDs; imported data is validated and bounded. Copying a build must pass server read/gear compatibility checks; editing the copied gear does not mutate the source build. Browser JSON/PNG exports use actual draft/saved state and label unavailable artwork. There is no automatic Discord post or fabricated recommended party template.

## Guilds

| Route                  | Access and behavior                                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| `/groups`              | Public/current-member discovery with bounded q/region/visibility/page filters and actual member counts     |
| `/groups/new`          | Authenticated creation of workspace+owner membership                                                       |
| `/groups/[slug]`       | Current membership determines dashboard versus allowed public metadata/request state; private outsiders404 |
| `/invitations/[token]` | Actual sign-in/availability/acceptance flow for hashed expiring/revocable invite                           |

Dashboard emphasizes actual upcoming events, announcements/shared plans and members/roles. Tabs separate daily coordination from management. Profile/event editors are focused dialogs with existing update timestamps/versions. Fixed roles control member management, invitations, shared builds, events and announcements; ownership transfer/deletion remain distinct guarded actions. Event RSVP/status/role and calendar download must work through real persistence. An Albion guild workspace is not proof of in-game guild/character ownership.

## Personal, community and legal

| Route            | Contract                                                                                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/dashboard`     | Session required; selected current profile plus up to eight recent builds/comps/memberships/noncompleted timers/scenarios in each bounded section; counts are bounded summaries |
| `/favorites`     | Session required; up to100 accessible saved builds and100 comps; revoked/private-hidden access is filtered immediately                                                          |
| `/timers`        | Session required; newest100 actual manual timers, create/rename/pause/resume/reset/complete/delete with expected versions                                                       |
| `/settings`      | Session required; profile/character label/region, data export, logout, guarded account deletion and retained failed drafts                                                      |
| `/players/[id]`  | Public selected profile name/join date and up to25 recent public nonhidden builds/comps; no private email/session or verified character ownership                               |
| `/guides`        | Original static Outpost workflow notes, searchable/category-filtered expandable articles in the same page; no hidden external CMS/article API                                   |
| `/admin/reports` | Current moderator/admin only; actual report queue, versions, target hide/restore and review audit                                                                               |
| `/signin`        | Real provider availability/login/error state; no fixture login fallback                                                                                                         |
| `/legal`         | Real source/media/operator/privacy status, with incomplete disclosures explicitly marked; archived generated scenes described as archived                                       |

Timers are manual reminders, not verified automatic game cooldowns. Paused state retains remaining milliseconds, resume rebuilds dueAt, reset uses durationMs, complete sets zero. The first client countdown avoids a false hydration-time number and synchronizes from persisted timestamps. No notification/email/push delivery service is implied.

## Universal state acceptance

Every rebuild must retain initial/loading, complete/partial data, valid empty, source failure, validation failure, auth redirect/404/403, stale version409 and retained-draft recovery as appropriate. Distinguish real anonymous pages from isolated authenticated browser fixtures. Use actual screenshots for desktop/tablet/phone and verify navigation after state changes; a route existing in the file tree is not sufficient acceptance.

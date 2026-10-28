# Pages, workflows and state contracts

The [generated page table](INVENTORY.md) is the exhaustive current route list. Every route must render inside the shared shell with a primary heading, correct access state and functional links/actions. `/loading`, `/error` and `/not-found` are not extra content routes: Next loading/error/not-found files provide boundary states.

## Homepage and global navigation

`/` is a short task-led entry point. “Better trades. Better prepared.” explains the planning value; three labelled rows open build creation, crafting and comps. A quieter guild link follows. One `HomeMarketTerminal` demonstrates actual source prices/history and includes a functional catalog picker. Its market link carries selected item and region. No decorative equipment showcase, repeated market snapshot/lookup, community strip or public-build database query runs on the homepage. Existing component sources remain available but are not mounted there.

On phones, task navigation comes first. The preview keeps search, selected item and the market action visible; city/history details expand on demand instead of stacking the desktop dashboard. The six-viewport implementation evidence is in [the task-led UX review](../design-review/ux-transformation/README.md).

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
| `/builds/new`       | Guest editor with browser-local save/restore/import/export/preview; authenticated visitors save real version1                            |
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

## Aggregate production and farming

Crafting/refining/enchanting embed a30-recipe production planner with item/quality/city shopping aggregation, preserved per-recipe prices, upfront/cash/economic accounting, bounded manual-preserving observation refresh, private plans and static share/export. `/tools/farming` adds15 historical crops/herbs, user-supplied yield and partial watering, seed asset value, supplied fees, observations and private scenarios. Dashboard links resolve a production plan to its first recipe kind and saved region. These are declared subsets, not full old-site/current-patch parity; [source/formula/evidence ledger](../engineering/ALBION_GRIND_PARITY_2026-10-28.md).

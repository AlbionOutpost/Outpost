# Albion data, observations and artwork

## Three independent data systems

| System                       | Source of truth                                                                             | Purpose                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Runtime imported metadata    | `CatalogRelease`/active `ItemMetadata` seeded by the pinned normalized bundle               | Name/slot/tier/enchant/power/spell-name browsing; not automatic current-patch certification   |
| Authored supported workbench | `equipment-catalog.ts`, `equipment-validation.ts`, `item-database.ts`, reviewed recipe JSON | Deliberately narrower editable families, compatibility and accounting inputs                  |
| Market/history observations  | Fixed regional AODP endpoints with source timestamps                                        | Observed city prices/daily averages/gold; not game metadata or confirmed executable liquidity |

Do not merge these denominators into a claim that every imported item can be fully equipped/crafted or that a fresh response proves the latest game patch. The full item browser and the structured equipment workbench intentionally support different amounts of data.

## Committed metadata snapshot

The imported factual subset is pinned to `muutmoku/ao-item-snapshot` revision `d72a159ed01ee4645b60d18633cd683779b9adc6`, source date2026-07-12T03:26:10Z. The source manifest records declaredGameBuild/targetPatch as null. The repository MIT notice is retained at `public/licenses/ao-item-snapshot.txt`; it does not grant Sandbox Interactive artwork/trademark rights or prove October compatibility.

Rebuild inputs are `data/catalog/ao-snapshot-20260712.json`, `docs/data/item-snapshot-source.json`, `docs/data/item-snapshot-coverage.json`, the normalization/validation modules and `scripts/prepare-item-snapshot.ts`/`sync-catalog.ts`. Preserve normalized and original checksums from those ledgers rather than changing serialization by hand.

Documented source coverage:7510 schema-valid normalized records,1772 raw base rows with55 excluded identities,1576 ability/passive mappings on604 base records and6309 explicit item-power values. **Full manual verification, unlock coverage and current-patch verification remain zero.** These are committed snapshot counts, not a complete-game denominator or an assertion about an operator’s live DB. A runtime-active count requires an actual DB query after migration/import.

The authored workbench audit separately has205 equipment variants,100 local search names and245 combined unique IDs. It has eight distinct ability names with no verified unlock/statistics/current-patch coverage. Stew/potion variants are not automatically enchantable. Do not quietly expand every editable dropdown from all imported rows without supplying compatibility/ability/recipe support.

## Import and activation sequence

1. Preserve the source revision, date, license reference and hashes.
2. Normalize only explicit factual fields. Validate ID/tier/enchantment/slot agreement, English naming, finite power values and bounded spell lists. Exclude unsupported identities or absent English names explicitly.
3. Keep recipes/unlocks null where absent; do not infer them from a weapon name or reuse another weapon’s spells.
4. Run `npm run data:audit` and relevant catalog/snapshot/reviewed-recipe tests.
5. On the intended authorized development DB, run `npm run data:sync`. The default imports the pinned bundle; `--starter` chooses the narrower original starter release. An explicit bundle path is supported but is not permission to import unreviewed data.
6. Verify the actual release checksum/active item counts in that database. Existing release-version/checksum mismatch must fail rather than silently rewrite a release.

`data:source` and the verification modules are an additional reviewed source/field/patch pipeline. Its example config intentionally fails closed until actual revision/rights/reviewer/target evidence exists. Preparation is not activation; schema-valid, imported, source-reviewed, manually verified and current-patch-verified are separate stages. Bind review evidence to the exact dataset/item/image hashes.

## ID, quality, region and city contracts

Structured catalog/renderer IDs use `^T[1-8]_[A-Z0-9_]+(?:@[1-4])?$`, max100 characters. Market/build legacy paths accept a broader bounded uppercase ID syntax where their schemas say so. A valid string is not proof that the item exists or is editable. Tier is1–8 in metadata, supported workbench tiers are family-specific and enchanting paths are narrower. Plain enchant is no suffix; .1–.4 use `@1`–`@4`.

Qualities are integer1–5: Normal, Good, Outstanding, Excellent, Masterpiece. Quality belongs in query/cache/observation identity. Refining output identity is forced to Normal while crafting/enchanting preserve their supported selected-quality behavior. Do not load quality1 quotes and label them as Masterpiece.

| Region key | Label    | Fixed data host                         |
| ---------- | -------- | --------------------------------------- |
| `europe`   | Europe   | `https://europe.albion-online-data.com` |
| `americas` | Americas | `https://west.albion-online-data.com`   |
| `asia`     | Asia     | `https://east.albion-online-data.com`   |

Supported city strings are Bridgewatch, Martlock, Lymhurst, Fort Sterling, Thetford, Caerleon, Brecilien, Black Market. These strings are identifiers; arbitrary spelling/case changes can break source matching. Guild region filtering and market server selection are related UI concepts, not a permission boundary for private content.

## Source-client safeguards

`requestData` only allows bounded `/api/v2/stats/prices`, `history`, `gold` paths on those fixed hosts; no `..`, max path3900 characters, redirects error,12-second timeout, compressed responses and2,000,000-byte decoded stream cap. Parse with the requested schema before returning or caching. Price batches contain1–50 validated items, deduplicated/sorted, one quality; returned rows must match those IDs/quality.

Normal price TTL is60seconds. Item/gold history TTL is300seconds. The process cache is bounded to128entries/8MiB, expires/evicts entries and shares in-flight requests. Redis keys use the existing `atlas:data:` namespace plus region/path. AODP upstream budget is20 requests/minute/region.429 responses use reset/backoff data and shared/local cooldown; only a short delay≤1000ms may be retried once. Do not bypass budgets to make tests or a loading badge green. Public request budgets are separately listed in the HTTP contracts.

Cache-storage failure can fall back to bounded process storage; request-budget failure denies in production. This distinction is intentional. Process-level in-flight deduplication is not a proven cross-instance global concurrency guarantee.

## Observation identity and truthfulness

A usable price is item+region+city+quality+side+source timestamp. `sell_price_min` is a minimum observed sell listing; `buy_price_max` is a maximum observed buy order. Instant purchase uses sell minimum, instant sale uses buy maximum, listing estimates use sell minimum at the destination. Black Market transport only supports instant observed buy-order sale. Do not flip these columns or infer liquidity, volumes, actual fills or opportunity safety.

Source zero means unavailable, not free. Manual zero is an explicit supported assumption and remains distinct. Missing/stale prices must not produce an invented complete total. Staleness is source age>one hour, invalid timestamp or more than five minutes in the future. Timezone-less source timestamps are interpreted as UTC by the freshness helper. Never use HTTP fetch time as the side’s observed time.

History uses actual daily sell-order averages over a bounded30-day query. The homepage terminal exposes7/30-day views; source gaps greater than36hours are disconnected rather than interpolated. Preserve actual source rows/full precision in inspectable tables. Daily item_count is an aggregate input, not permission to invent a live activity stream.

The homepage snapshot checks four exact items in Lymhurst/Normal and the selected region every60seconds only when visible/online; pause/resume/manual refresh and cancellation exist. Last observations are explicitly retained on refresh failure; changing region cannot display another region’s retained values. These checks do not guarantee new source uploads every minute.

## Artwork and licensing boundary

The original Outpost logo is `public/brand/outpost-logo.png`,2172×724, unchanged bytes and checksum recorded in `docs/assets/OUTPOST_LOGO.json`. Preserve its source permission and CSS crop; do not redraw it from a screenshot. The unmodified black Discord symbol has its official source/checksum/usage limitation in the brand interaction review. Local font license notices remain in `public/licenses`.

General gear icons use the fixed official item renderer and bounded same-origin96px fallback. Renderer requests validate ID/quality/size16–217. The icon service has240/minute application budget, four concurrent requests,32 pending,8MiB/512-entry cache,2.5-second timeout and200,000-byte cap; validate PNG content type/signature. Successful proxy art caches six hours, ordinary missing art five minutes, saturation briefly. Fallback is a neutral original SVG, not a fake item.

Five current hero PNGs are unchanged official renderer bytes at `public/albion/equipment/`, recorded with URLs/quality/size/SHA256 in `docs/assets/HOMEPAGE_EQUIPMENT.json`. Next Image optimizes local delivery; the main weapon is eager/high priority. Original task glyphs and feature emblems are UI symbols, not claimed game spell/currency artwork.

All four generated scenery images are archived. No approved authentic scene replacement or complete ability-art catalog exists. The presskit request was blocked; do not bypass it or extract art from supplied concept screenshots. Public image access, schema-valid IDs and a repository dataset license are not blanket rights for game media. Preserve attribution and [media review](../assets/OUTPOST_MEDIA_INVENTORY.md) when rebuilding or publishing.

# Data

Where Outpost's game and market data comes from, how it is loaded, what we may use it for, and the rules that keep it honest.

## Truth rules

These are enforced in code; keep them that way.

1. **No invented numbers.** An observed `0` or missing price is _unavailable_, never free. A manual `0` is allowed and labelled manual. Any missing input makes a calculator result `complete:false` with null totals.
2. **Identity matches exactly.** An observation is used only if item, region, city, quality, side (buy/sell order) and execution all match. Quality alternatives are shown separately with their own city and date, never substituted.
3. **Every observation keeps its own time.** Buy and sell sides carry their own source timestamps (`sell_price_min_date`, `buy_price_max_date`); fetch time is never shown as observation time. Data older than 1 h (or >5 min in the future) is **stale**. Plans keep the oldest timestamp that fed them.
4. **Unknown stays unknown.** Missing IP shows "Not verified"; unlocks, return eligibility and spell inheritance stay null. Don't derive abilities or recipes from names.
5. **Provenance has stages**: imported → schema-valid → reviewed → verified → current-patch verified (`src/lib/catalog/verification.ts`). A new download or a passing parser never promotes a record. Today every dataset is at **imported/schema-valid; zero records are reviewed, verified or current-patch verified.**
6. **No fee presets.** Taxes, setup and station fees are user assumptions; defaults are 0.

## Market data — Albion Online Data Project (AODP)

|                                           |                                                                                                           |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Hosts (`src/lib/albion/region-config.ts`) | Americas `west.albion-online-data.com`, Europe `europe.…`, Asia `east.…`                                  |
| Cities                                    | Bridgewatch, Martlock, Lymhurst, Fort Sterling, Thetford, Caerleon, Brecilien, Black Market               |
| Endpoints                                 | `/api/v2/stats/prices`, `/history`, `/gold` only (`data-client.ts`)                                       |
| Limits                                    | 12 s timeout, no redirects, 2 MB body cap, URLs ≤3,900 chars                                              |
| Budgets                                   | 50/min and 250/5 min per region, every attempt counted; 429 → regional cooldown from reset headers (≤1 h) |
| Cache                                     | Prices 60 s, history/gold 300 s; process cache + shared cache (Cache API on Cloudflare, Redis locally)    |

Coverage depends on what players upload: exact-quality gaps are common, especially on Asia and for T8. AODP data is crowd-sourced and has no warranty — the UI must say so where it matters.

**Game Info** (`combat-events.ts`): `gameinfo.albiononline.com` (+ `-ams`, `-sgp`) events feed, 20 per page, 12/min per region, 45 s cache. Powers the kill/death feed.

## Game data

| Data                         | Files                                                                                                            | Source                                                                                                                                              | Size                                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Item metadata (DB)           | `data/catalog/ao-snapshot-20260712.json` → `ItemMetadata` / `CatalogRelease`                                     | [muutmoku/ao-item-snapshot](https://github.com/muutmoku/ao-item-snapshot) @ `d72a159e`, 2026-07-12, MIT ([notice](../public/licenses))              | 7,510 records; 6,309 with IP; 1,576 ability mappings on 604 base items; 55 inconsistent base rows quarantined |
| Equipment workbench          | `src/lib/albion/source-equipment.json`, `source-abilities.json`                                                  | Same snapshot                                                                                                                                       | 377 families / 7,510 variants                                                                                 |
| Equipment + refining recipes | `src/lib/albion/expanded-recipes.json` (read by `recipes.ts`); ledger `docs/data/production-recipes-source.json` | 61 rows transcribed from [ao-data/ao-bin-dumps](https://github.com/ao-data/ao-bin-dumps) `items.xml` @ `1a469e53` (2026-10-12); 9 from the snapshot | 45 crafting (9 families × T4–T8) + 25 refining (5 resources × T4–T8). Standard path only                      |
| Enchanting materials         | generated in `recipes.ts` (`recipeFor`)                                                                          | Albion wiki (rune/soul/relic counts)                                                                                                                | 7 families, .0–.3                                                                                             |
| Return rates                 | `production-profile.ts` (`wiki-84429`)                                                                           | Albion wiki                                                                                                                                         | City bonus profiles                                                                                           |
| Cooking / alchemy            | `archived-production-recipes.json`                                                                               | Owner's albiononlinegrind.com archive                                                                                                               | 399 recipes (227 / 172), historical                                                                           |
| Build spells                 | `archived-item-spells.json`, `archived-spell-options.json`                                                       | Same archive                                                                                                                                        | 1,195 items / 11,873 options                                                                                  |
| Farming                      | `farming-crops.json`; ledger `docs/data/farming-source.json`                                                     | Same archive                                                                                                                                        | 15 crops/herbs                                                                                                |
| Fishing                      | `public/library/grind-fishing.json`                                                                              | Same archive                                                                                                                                        | 41 fish chop recipes                                                                                          |
| Journal                      | `public/library/grind-journal.json`                                                                              | Same archive                                                                                                                                        | 1,784 objectives                                                                                              |
| Library                      | `public/library/grind-{builds,compositions,guides,traits,spell-names}.json` + `media/`                           | Same archive                                                                                                                                        | 10,770 builds, 682 comps, 8 guides                                                                            |

Source manifests with commit pins and SHA-256 hashes live in [`docs/data/`](data). `src/lib/albion/reviewed-crafting.json` is no longer used by code.

### Loading pipeline

1. `npm run data:prepare-snapshot <dir>` — verifies each slot file's hash against `docs/data/item-snapshot-source.json`, normalizes (`src/lib/catalog/item-snapshot.ts`) and writes the bundle.
2. `npm run data:sync` — loads the bundle into Postgres (`imported` / `already-active`; refuses version or checksum mismatches).
3. `npm run data:source -- --source <config>` — optional reviewed-source pipeline: pinned 40-char commit + SHA-256, raw.githubusercontent only, writes immutable output to `.qa/game-sources/`. Never activates data by itself. `docs/data/ao-source.example.json` intentionally fails closed.
4. `npm run data:audit` — structural audit (duplicates, invalid mappings, bundle hash); writes `.qa/game-data-coverage.json`.
5. Cloudflare: `cloudflare-stage-catalog.mjs` / `cloudflare-stage-library.mjs` export to D1 (see [OPERATIONS.md](OPERATIONS.md#data-pushes-manual)).

The `scripts/import-grind-*` scripts rebuild the archive files from a local `Scrape/` capture that is not in the repository.

### Patch updates

On an Albion patch: confirm the official patch name/date, diff the pinned old/new source records, list affected IDs, recipes, icons and calculators, mark them stale, and re-run calculator fixtures before activating. Keep the previous revision until the new one is reviewed.

## Rights and licensing

- **Item snapshot:** MIT — fine to use with the retained notice.
- **ao-bin-dumps:** public, but **no declared license**; we use only minimal factual recipe fields (materials and quantities). Redistribution rights and patch compatibility are unconfirmed — an owner decision is open.
- **albiononlinegrind.com archive:** the owner's own capture; treat as historical content and label it so.
- **AODP:** community data, used live with attribution.
- Never copy competitor code, prose or artwork; never scrape authenticated content.

## Media

| Asset                | Delivery                                                                                                                                                                                                       | Provenance                                                                                                                                                                                                                                                                                                              |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Item and spell icons | Official renderer `render.albiononline.com/v1/item/{id}.png` / `/v1/spell/{id}.png` via `item-icon.tsx`, `spell-icon.tsx`; same-origin fallback `/api/item-icon` (validated PNG, 96px, neutral SVG on failure) | © Sandbox Interactive; used only to identify real items. No blanket licence                                                                                                                                                                                                                                             |
| Homepage equipment   | Pre-fetched PNGs in `public/albion/equipment`                                                                                                                                                                  | Hashes in [`docs/assets/HOMEPAGE_EQUIPMENT.json`](assets/HOMEPAGE_EQUIPMENT.json)                                                                                                                                                                                                                                       |
| Logo, Discord avatar | `public/brand/`                                                                                                                                                                                                | [`OUTPOST_LOGO.json`](assets/OUTPOST_LOGO.json), [`OUTPOST_DISCORD_AVATAR.json`](assets/OUTPOST_DISCORD_AVATAR.json); Discord symbol is the official unmodified mark                                                                                                                                                    |
| Illustrations        | `public/albion/illustrations` (city-overlook-v2 = homepage hero; market-v1 = destination vignette; build-v1 = Builds masthead)                                                                                 | Generated, owner-authorised, **decorative only — never presented as gameplay**. Ledger with hashes in [`docs/assets/GENERATED_ILLUSTRATIONS.json`](assets/GENERATED_ILLUSTRATIONS.json), prompts in [`docs/assets/prompts`](assets/prompts), originals in `assets/source/`, runtime manifest `src/lib/albion/assets.ts` |
| Fonts                | Local Inter, Barlow Condensed, Geist Mono                                                                                                                                                                      | Notices in `public/licenses`                                                                                                                                                                                                                                                                                            |

Authentic game screenshots/scenes are **not** used: no permission is recorded. To add one, record source, creator, licence or permission, attribution and allowed edits first.

`assets.ts` still marks ability art as "missing" although `spell-icon.tsx` renders renderer spell images — reconcile when next touching abilities.

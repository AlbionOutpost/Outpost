# Game-data coverage

Generated 2026-10-26T11:49:33.576Z. Repository-defined starter data, not a live database audit or complete game denominator.

- Equipment variants: 181; local search names: 100; combined unique IDs: 221. These are not counts of fully verified current-game records.
- Structurally invalid mappings: 0; duplicate equipment IDs: 0.
- Unique ability names: 8; verified unlock requirements/statistics/current-patch entries: **0**.
- Renderer-compatible IDs: 181; HTTP availability and universal reuse permission are not certified.

| Slot      | Families | Variants |
| --------- | -------: | -------: |
| Main hand |        1 |       25 |
| Off hand  |        1 |       25 |
| Helmet    |        1 |       25 |
| Chest     |        1 |       25 |
| Boots     |        1 |       25 |
| Cape      |        1 |       25 |
| Bag       |        1 |       25 |
| Mount     |        1 |        6 |
| Food      |        0 |        0 |
| Potion    |        0 |        0 |

## Recipe verification

- battleaxe-t4: T4_MAIN_AXE; [source](https://wiki.albiononline.com/wiki/Property:Ingredient). Current source/patch recheck required.
- broadsword-t4: T4_MAIN_SWORD; [source](https://wiki.albiononline.com/wiki/Property:Ingredient). Current source/patch recheck required.
- steel-bar-t4: T4_METALBAR; [source](https://wiki.albiononline.com/wiki/Pristine_Steel_Bar). Source points to Pristine Steel Bar while output is plain Steel Bar; source applicability needs verification.

## Missing and patch status

- Full weapon/offhand/armor families
- Food and potion metadata
- Full mounts and economic item categories
- Ability descriptions, passives and unlock levels
- Item statistics and patch compatibility
- Full crafting/refining/cooking/alchemy recipes

Unknown: no current patch reference baseline is verified; zero confirmed-current entries. Do not infer zero outdated entries.

## Verification stages

Authored equipment: 181; schema-validated: 181; manually/patch verified:0. Live database external-import counts are not measured by this repository audit. The source pipeline reports separate stages against immutable artifacts; see [verification system](GAME_DATA_VERIFICATION.md). Test fixtures and recent downloads never increase real patch coverage.

## Sources and rights

- [Original source lead](https://albiononline.com/news/basic-builds-battleaxe)

Original factual starter index only; full bulk dataset redistribution rights unresolved. Renderer URL compatibility does not certify asset existence/rights or full icon coverage. Official/wiki source rechecks returned403 on2026-10-26. [Public dump discovery lead](https://github.com/ao-data/ao-bin-dumps) is accessible but current redistribution license/patch compatibility remains unresolved; no bulk data was imported. Raw machine-readable report: .qa/game-data-coverage.json.

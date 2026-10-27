# Game-data coverage

Generated 2026-10-27T01:10:05.501Z. Repository-defined starter data, not a live database audit or complete game denominator.

- Equipment variants: 205; local search names: 100; combined unique IDs: 245. These are not counts of fully verified current-game records.
- Structurally invalid mappings: 0; duplicate equipment IDs: 0.
- Unique ability names: 8; verified unlock requirements/statistics/current-patch entries: **0**.
- Renderer-compatible IDs: 205; HTTP availability and universal reuse permission are not certified.

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
| Food      |        1 |       12 |
| Potion    |        1 |       12 |

## Recipe verification

- broadsword-t4: T4_MAIN_SWORD; [source](https://raw.githubusercontent.com/muutmoku/ao-item-snapshot/d72a159ed01ee4645b60d18633cd683779b9adc6/docs/data/latest/mainhand.json). Current source/patch recheck required.
- battleaxe-t4: T4_MAIN_AXE; [source](https://raw.githubusercontent.com/muutmoku/ao-item-snapshot/d72a159ed01ee4645b60d18633cd683779b9adc6/docs/data/latest/mainhand.json). Current source/patch recheck required.
- bow-t4: T4_2H_BOW; [source](https://raw.githubusercontent.com/muutmoku/ao-item-snapshot/d72a159ed01ee4645b60d18633cd683779b9adc6/docs/data/latest/mainhand.json). Current source/patch recheck required.
- shield-t4: T4_OFF_SHIELD; [source](https://raw.githubusercontent.com/muutmoku/ao-item-snapshot/d72a159ed01ee4645b60d18633cd683779b9adc6/docs/data/latest/offhand.json). Current source/patch recheck required.
- scholar-cowl-t4: T4_HEAD_CLOTH_SET1; [source](https://raw.githubusercontent.com/muutmoku/ao-item-snapshot/d72a159ed01ee4645b60d18633cd683779b9adc6/docs/data/latest/head.json). Current source/patch recheck required.
- mercenary-jacket-t4: T4_ARMOR_LEATHER_SET1; [source](https://raw.githubusercontent.com/muutmoku/ao-item-snapshot/d72a159ed01ee4645b60d18633cd683779b9adc6/docs/data/latest/armor.json). Current source/patch recheck required.
- mercenary-shoes-t4: T4_SHOES_LEATHER_SET1; [source](https://raw.githubusercontent.com/muutmoku/ao-item-snapshot/d72a159ed01ee4645b60d18633cd683779b9adc6/docs/data/latest/shoes.json). Current source/patch recheck required.
- cape-t4: T4_CAPE; [source](https://raw.githubusercontent.com/muutmoku/ao-item-snapshot/d72a159ed01ee4645b60d18633cd683779b9adc6/docs/data/latest/cape.json). Current source/patch recheck required.
- bag-t4: T4_BAG; [source](https://raw.githubusercontent.com/muutmoku/ao-item-snapshot/d72a159ed01ee4645b60d18633cd683779b9adc6/docs/data/latest/bag.json). Current source/patch recheck required.
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

Authored equipment: 205; schema-validated: 205; manually/patch verified:0. Live database external-import counts are not measured by this repository audit. The source pipeline reports separate stages against immutable artifacts; see [verification system](GAME_DATA_VERIFICATION.md). Test fixtures and recent downloads never increase real patch coverage.

## Imported external snapshot (separate denominator)

The pinned MIT snapshot contains 7510 schema-valid records, 1576 ability/passive mappings on 604 base records and 6309 explicit item-power values. Its 1772 raw base rows include 55 excluded identities; explicit nested variants supply the remaining records. Source date: 2026-07-12T03:26:10Z. Full manual verification/unlocks/current-patch verification remain **0**. This is not a complete game denominator. See [source manifest](../data/item-snapshot-source.json), [coverage](../data/item-snapshot-coverage.json) and [activation evidence and limitations](NEXT_MILESTONE_2026-10-26.md). Runtime active counts require an actual database query.

## Sources and rights

- [Original source lead](https://raw.githubusercontent.com/muutmoku/ao-item-snapshot/d72a159ed01ee4645b60d18633cd683779b9adc6/docs/data/latest/food.json)
- [Original source lead](https://raw.githubusercontent.com/muutmoku/ao-item-snapshot/d72a159ed01ee4645b60d18633cd683779b9adc6/docs/data/latest/potion.json)
- [Original source lead](https://albiononline.com/news/basic-builds-battleaxe)

Original factual starter index only; full bulk dataset redistribution rights unresolved. Renderer URL compatibility does not certify asset existence/rights or full icon coverage. Official/wiki source rechecks returned403 on2026-10-26. [Public dump discovery lead](https://github.com/ao-data/ao-bin-dumps) is accessible but current redistribution license/patch compatibility remains unresolved; that dump was not imported. The separately pinned licensed July snapshot was processed and activated locally during the next milestone; it is not October patch verified. Raw machine-readable report: .qa/game-data-coverage.json.

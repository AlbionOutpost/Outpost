# Reproducible game-data verification

Implemented2026-10-26. Real current-patch verification remains0; this system provides evidence controls, not fabricated metadata or licensing.

## Source synchronization

`npm run data:source -- --source CONFIG.json` downloads a raw.githubusercontent.com file pinned to a full40-character Git commit and checks an independently configured SHA-256. `docs/data/ao-source.example.json` intentionally has no revision/hash or reuse approval; it fails closed before network access. The Data Project identifies [ao-bin-dumps](https://www.albion-online-data.com/items) as its item-list source. A public repository/readme does not establish bulk redistribution permission.

The source config records repository/path, source revision, payload checksum, declared game build (nullable), reuse reference/reviewer and optional target patch with its source-revision confirmation. Mutable branch names, traversal paths, credential-bearing references and unapproved sources are rejected. Download size64MiB, timeout15s, redirects disabled. Offline repeat runs can use `--input FILE`; the same checksum/approval checks still apply. This prepares artifacts; it never silently changes the live database.

- `ao-formatted-items-v1` reads UniqueName/English name from the public formatted-items shape. It derives tier/enchantment from the identifier, records excluded unsupported/missing-name rows, and leaves categories, families, abilities, recipes and stats unknown. It never infers spells or recipes from an item name.
- `outpost-reviewed-v1` accepts normalized source-reviewed equipment/economic records: category, weapon family, equippable/craftable applicability, ability/passive/unlock mappings, material quantities/return eligibility and optional image checksum. It rejects duplicate IDs/abilities/materials, self-recipes, missing ingredients and recipe dependency cycles.

Immutable output lives in `.qa/game-sources/SOURCE-FINGERPRINT/`: original source bytes, normalized snapshot, source/review/image evidence and integrity manifest. A temporary directory is renamed only after all checks pass. Identical input/evidence produces the same normalized hash; existing corrupt snapshot output is rejected. `--output .qa/NAME` permits isolated test artifacts. No source bytes or reviews are committed/uploaded automatically.

## Verification states

| State                                  | Required evidence                                                                                                                                            |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Source-imported                        | Checksum-matched bytes from a pinned source or exact offline copy                                                                                            |
| Schema-validated                       | Identity/variant, relationship and bounded-field checks pass                                                                                                 |
| Manually reviewed                      | Item/source hashes match a named, dated operator review                                                                                                      |
| Manually verified                      | Every applicable identity/category/family/ability/recipe/image check is covered; missing data cannot be marked not-applicable without explicit applicability |
| Patch-verified against declared target | Complete manual verification plus a declared game build, matching target patch/review and source revision; image bytes must also have been checked           |

Reviews use `--reviews FILE` and include item/source SHA-256, reviewer/date, field verdict/reference/notes and optional patch ID. A record or source change invalidates bound reviews. Changed target patch/revision invalidates patch status. A new download timestamp never confers verification. Target patch is explicitly declared, **not proof that it is the latest live patch**. Review/reference claims are operator attestations; automation cannot certify honesty, legal permission or game-client correctness.

`--images` sequentially samples at most10 normal-quality96px icons from the fixed official renderer, with2.5s timeout/200KB body bound. Validation checks PNG signature/CRC/dimensions, complete bounded RGB/RGBA scanline data and SHA-256. Unsupported encoding/outage remains unverified, not an invented replacement. It does not prove what the image depicts or verify all qualities. Manual matching remains required. Reference: [PNG specification](https://www.w3.org/TR/png-3/).

## Activation and actual coverage

Prepared snapshots are deliberately separate from database activation. The existing `data:sync` imports reviewed compatible bundles; it now reports `imported`/`already-active` and refuses immutable-version mismatches or inactive/incomplete re-imports. It does not automatically roll back the active catalog. Economic/pipeline-only fields are not silently flattened into unsupported runtime metadata. Database provenance expansion/runtime integration and complete permitted data still need completion.

Actual authored coverage is in GAME_DATA_COVERAGE.md. This milestone imports no bulk game dump and creates no real patch-verification evidence. Sixteen new unit/CLI tests include isolated QA snapshots and synthetic PNGs; those are not live game assets/patch evidence. Final gate117 units/53 browsers and15 database checks passes. The first direct CLI-test attempt was blocked by restricted subprocess permissions; the approved QA execution runs the real child-process test successfully. No test was skipped.

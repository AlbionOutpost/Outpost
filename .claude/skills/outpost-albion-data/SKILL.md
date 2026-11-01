---
name: outpost-albion-data
description: Work on Outpost's Albion game data — item IDs, tiers/enchantments/qualities, equipment families, abilities, recipes, icons, catalog imports, AODP market data handling, provenance, licensing and patch updates. Use whenever data is added, imported, corrected or displayed as fact.
---

# Outpost Albion data

Players make in-game decisions from this data. Being right matters more than being complete — and saying "unknown" is always allowed.

Read [docs/DATA.md](../../../docs/DATA.md) first: truth rules, sources, pipeline, rights, media.

## Changing or adding data

1. **Find the consumers.** Which pages, calculators, builds or APIs read it? (`src/lib/catalog`, `src/lib/albion/equipment-catalog.ts`, `recipes.ts`, `source-equipment.json`, `source-abilities.json`, the D1 catalog.)
2. **Find a real source.** Primary game files (ao-bin-dumps at a pinned commit), the pinned MIT item snapshot, the official renderer, or official Game Info. Record URL, commit/revision, date, SHA-256 and the licence situation. A public URL is not permission; a 403 is a blocker to record, not a reason to guess.
3. **Check each field you touch:** ID format (`T4_…@1`), name, category/family, tier, enchantment, quality, icon, abilities/passives, recipe materials and quantities, return eligibility, patch. Never derive abilities or recipes from names.
4. **Pin and stage.** Use the existing pipeline (`data:prepare-snapshot`, `data:source` with a reviewed config, `data:sync`), with checksums in `docs/data/*.json`. Preparation is not activation; activation is a separate step.
5. **Track provenance stages** per record: imported → schema-valid → reviewed → verified → current-patch verified. A passing parser or a newer download never promotes a stage.
6. **Validate:** `npm run data:audit`; catalog/source/verification unit tests; duplicates, cycles, missing ingredients, unresolved IDs. If icons or item display change, check them rendered (`outpost-visual-qa`).
7. **Update DATA.md** (sources, counts, rights) in the same change.

## Market data (AODP)

- Keep fixed hosts, path allowlist, timeouts, byte caps and per-region budgets in `data-client.ts`. Don't raise budgets without checking AODP's published limits.
- Batch item requests, cache by full identity (region · item · quality · city · side), dedupe in flight, honour 429 reset headers.
- Each side keeps its own timestamp; stale after 1 h; observed 0 = unavailable. Never backfill a gap with another quality, city or estimate unless it is clearly labelled as such.

## Patch updates

Confirm the official patch name/date → diff pinned old vs new source → list affected IDs, recipes, icons and dependent calculators/builds → mark them stale → re-run calculator fixtures → activate only after review. Keep the previous revision until then.

## Never

Invent stats, IP, unlocks, abilities, recipes or "meta"; present archived/historical content as current; copy competitor data, prose or art; scrape authenticated content; download whole datasets repeatedly when a checksum-verified local copy exists.

## Report

Scope (records/fields/patch) → sources with revision, hash and rights → stage counts with denominators → commands and results → what changed, what's stale or still unknown → activation done or pending.

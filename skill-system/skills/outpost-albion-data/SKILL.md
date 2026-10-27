---
name: outpost-albion-data
description: Verify Outpost Albion item IDs, equipment families, abilities, passives, recipes, icons, metadata imports, provenance and game patch compatibility. Compose with calculators for mechanics and security for external input or activation boundaries.
---

# Outpost Albion data

Keep unknown game facts unknown. Read [DATA_SOURCES](../../../DATA_SOURCES.md), [verification pipeline](../../../docs/engineering/GAME_DATA_VERIFICATION.md), [coverage](../../../docs/engineering/GAME_DATA_COVERAGE.md) and the [shared execution contract](../../../docs/engineering/SKILL_SYSTEM.md). Starter coverage is not a full catalog; take current counts from the audit rather than copying them into skills.

## Verify a change

1. Identify affected runtime consumers, records and target patch/build. Inspect [catalog code](../../../src/lib/catalog), [equipment catalog](../../../src/lib/albion/equipment-catalog.ts) and [recipes](../../../src/lib/albion/recipes.ts). Separate authored repository counts, imported source records and live database counts.
2. Consult primary game sources and legitimate documented datasets. Verify actual access, revision/date, declared game build and reuse terms before import/redistribution. A public URL, accessible dump or compatible renderer URL proves neither licensing nor current-patch correctness. Record blocked access (including 403) instead of substituting guesses.
3. Check each applicable field: ID/name/category/weapon family, tier/enchantment/quality, actual icon, abilities/passives/unlocks, recipe materials/quantities/return eligibility and patch applicability. Mark unavailable/unknown separately from justified not-applicable. Do not derive spells/recipes from names.
4. Prepare an immutable source artifact using the existing data:source workflow only with a legitimately reviewed config: pinned commit, independently checked SHA-256, reviewer/rights reference and target patch. The example config intentionally fails closed. Inspect outputs before any separately authorized data:sync activation; preparation is not activation.
5. Track imported, schema-valid, source-reviewed, manually verified and current-patch verified independently, per record/field where supported. Bind reviews to exact source/item/image hashes and patch evidence. A passing parser/test or new download timestamp cannot promote later stages.
6. Validate duplicates, relationship/recipe cycles, missing ingredients, unsupported variants, source bounds and malformed image fallback. Run data:audit and focused catalog/source/verification tests; inspect actual representative icons using the browser workflow if UI changes. Preserve historical provenance and source failures.

## Patch maintenance

On a relevant Albion update, verify the official patch identifier/date; compare pinned old/new records and hashes. List impacted IDs, mechanics, recipes/icons and dependent calculators/builds. Mark affected evidence stale/pending, keep previous verified revision, and rerun field reviews plus independent formula regressions before promotion. The declared target is not automatically the latest live patch. Maintain a reviewed manifest/diff and explicit revalidation queue; do not silently change critical mechanics.

Batch supported bounded requests, cache by identity/revision and respect documented rate limits/backoff. Reuse checksum-validated local bytes for repeat audit; do not repeatedly download entire datasets. Preserve existing fixed-host, timeout and size protections.

## Tools, acceptance and report

Use available web/source retrieval for current primary evidence and inspect actual responses/terms. Discover MCP schemas first; browser MCP can verify rendered icon/state, not prove a recipe or license. If unavailable, record it and use the shared permitted fallback. Never scrape authenticated content or bypass access restrictions.

Acceptance requires schema-valid affected records, explicit provenance/rights/access results, correct supported relationships, independent verification stages, no invented fields, reproducible source/patch diff and unchanged unknowns where evidence is missing. Full/current catalog claims require actual coverage denominators and complete applicable reviews.

Report **records/fields/patch scope → sources/revisions/checksums/rights → stage counts with denominator → commands/results → changed/stale/unknown records and affected consumers → activation performed or pending → remaining blockers/revalidation**. Update source/coverage ledgers when evidence changes; run the [phase gate](../../../docs/QA_WORKFLOW.md). Do not equate arithmetic tests with recipe or current-game verification.

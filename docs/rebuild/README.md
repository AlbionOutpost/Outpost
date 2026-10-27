# Outpost rebuild and AI handoff

This is the entry point for another AI or engineer to reproduce the entire **implemented** Outpost website. It documents the application at the [implementation baseline](baseline.json), including the latest real-equipment homepage, search palette and animated top navigation. It is an implementation specification, not a proposal for another redesign or a claim that every planned Albion feature is finished.

For an exact recreation, use the commit containing this handoff (or a reviewed later descendant), its versioned source, lockfile, migrations, dataset and original assets. The feature baseline identifies the preceding UI implementation; that earlier publication alone omitted unit tests, which this handoff restores. Prose cannot recover a missing logo, licensed dataset, OAuth credential or private production database. Those inputs are explicitly separated. Never invent their replacements and present them as authentic.

For a single-file AI handoff, use [the complete handbook](HANDBOOK.md); it contains all chapters and the generated database/component references. The separate chapters remain the maintained source.

## Start here

1. Read [rebuild sequence](REBUILD_SEQUENCE.md) and [setup/operations](SETUP_AND_OPERATIONS.md).
2. Read [architecture](ARCHITECTURE.md), [database/persistence](DATABASE_AND_PERSISTENCE.md) and [security/authentication](SECURITY_AND_AUTH.md) before implementing mutations.
3. Implement [page/workflow contracts](FEATURES_AND_ROUTES.md), [frontend/design](FRONTEND_DESIGN.md) and [component map](COMPONENT_GUIDE.md).
4. Preserve [HTTP contracts](HTTP_API.md), [game-data rules](GAME_DATA.md) and [calculator formulas](CALCULATORS.md).
5. Run [testing and acceptance](TESTING_AND_ACCEPTANCE.md). Keep [incomplete/blocked scope](DECISIONS_AND_LIMITS.md) explicit.
6. Use the generated [inventory](INVENTORY.md), [exact database reference](DATABASE_REFERENCE.md) and [machine inventory](inventory.json) to check completeness.

The current inventory has **32 page routes, 33 API route files exposing 44 HTTP operations, 55 component modules, 50 library modules, 29 database models, three enums and 17 SQL migrations**. These are source inventory counts, not test results or a completeness score for Albion mechanics. The generator captures locked dependency versions, exported symbols/imports and hashes of the rebuild inputs.

```bash
node scripts/rebuild-inventory.mjs
node scripts/rebuild-inventory.mjs --check
```

Regenerate after changes to source/configuration/assets/migrations, then inspect the difference. The `--check` command fails on stale generated documentation. It does not verify gameplay truth, legal rights or runtime security. Do not hand-edit generated inventory/schema references.

## Authority and conflict resolution

| Question                                       | Authoritative input                                                                                                                                                   |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What code and behavior should be recreated?    | Versioned implementation, this handbook and its source links; executable schemas/services settle ambiguous prose                                                      |
| Which fields, indexes and cascades must exist? | `prisma/schema.prisma` **and all committed SQL migrations**, reproduced in the database reference                                                                     |
| What was actually tested most recently?        | [QA_REPORT](../../QA_REPORT.md) and [QA evidence](../qa-evidence.json), not a hard-coded historical test count here                                                   |
| What is incomplete or blocks release?          | [Implementation status](../../IMPLEMENTATION_STATUS.md), [release readiness](../../RELEASE_READINESS.md), [project plan](../../PROJECT_PLAN.md)                       |
| Which game data/formulas/media can be trusted? | [Source ledger](../../DATA_SOURCES.md), item manifests, field/patch reviews and media ledgers                                                                         |
| Which design is current?                       | The real-equipment/search/top-navigation implementation and [latest visual evidence](../design-review/playful-ui/README.md); older scene/sidebar concepts are history |
| How should an AI work in this repository?      | [AGENTS.md](../../AGENTS.md), installed applicable project skills and [skill-system contract](../engineering/SKILL_SYSTEM.md)                                         |

When old documents conflict, trace the relevant source and update the stale statement. Do not restore a rejected sidebar, generated panorama, earlier green palette or fabricated market display because an archived screenshot contains it. Preserve compatibility identifiers even where they still contain the historical internal name.

## Copyable instruction for the next AI

> Rebuild Outpost from the source baseline and `docs/rebuild/README.md`. Read every linked handbook chapter and the generated inventories before changing architecture. Preserve the existing Next.js App Router/React/Prisma/Redis boundaries, 17 SQL migrations, server authorization, version conflicts, exact item/region/quality/source identities, pure accounting formulas and explicit unsupported states. Recreate the current top navigation, compact search palette, genuine-equipment hero, desktop workspaces and mobile drawer; use the original assets and local fonts. Follow the installed Next.js documentation rather than assuming older APIs. Build in dependency order from `REBUILD_SEQUENCE.md`; verify each supported journey with the existing tests and actual screenshots. Do not fabricate prices, community activity, abilities, current-patch evidence, provider verification or missing licenses. Run the mandatory phase gate and required postchecks, update the handoff inventory and current reports, and state actual blockers. Credentials/private records must be supplied securely outside source control. Do not deploy or publish anything beyond the user’s authorization.

[Verification of this handoff](VERIFICATION.md) records the actual source extraction, clean-publication checks, negative drift probe, local phase and hosted limits.

## Deliverables a faithful rebuild must retain

- A running website with every listed route and its populated, empty, loading, failure and denied states.
- The actual save/reload/revision/duplicate/export behavior, not decorative buttons.
- Correct database ownership, privacy, group-role and current-membership checks at the server boundary.
- Matching assets, responsive composition, keyboard flows, light/dark states and reduced motion.
- Real observation timestamps and unavailable values; no source failure converted to a plausible number.
- Independently checked formulas and explicit partial recipe/mechanic coverage.
- Reproducible setup, clean build, test commands, source/rights records and remaining release blockers.

No private environment values, credentials, session records, user exports or database backups belong in this handbook. Restoring private account content requires a separately authorized backup/recovery process; rebuilding the code does not recreate that data.

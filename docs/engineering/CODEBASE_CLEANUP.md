# Code organization and cleanup

Current architecture keeps pure accounting/validation and domain services separate, with some remaining Prisma reads in server-page presentation. This is maintainability debt, not a demonstrated persistence failure. The code has strict types, scoped lint rules, reusable boundaries and preserved migration history.

Whole-project dynamic-route/dead-code/dependency completeness and fresh-checkout/history verification are incomplete. Passing lint does not prove all code is reachable or every dependency required. Latest format/type/lint results belong in [QA_REPORT.md](../../QA_REPORT.md).

The earlier documentation reconciliation changed only documentation/tooling; its preservation result applies to that phase. The subsequent focused homepage change is tracked in [the polish review](../design-review/homepage/POLISH.md). Protected application, test, schema/migration, asset, lockfile and runtime/config files are compared byte-for-byte with the pre-audit hash manifest; no Git-diff cleanliness is claimed because the workspace has no recognized repository. [Correction report](../DOCUMENTATION_CORRECTIONS.md). Previous cleanup evidence remains [archived](../history/2026-10-26-before-reconciliation/docs/engineering/CODEBASE_CLEANUP.md).

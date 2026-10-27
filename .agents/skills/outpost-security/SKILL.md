---
name: outpost-security
description: Review or change Outpost Discord authentication, sessions, CSRF, ownership, guild permissions, private caches, user data, database mutations, file handling, APIs, secrets and external integration trust boundaries. Use negative authorization tests alongside permitted journeys.
---

# Outpost security

Read [SECURITY](../../../SECURITY.md), [scoped audit](../../../docs/engineering/SECURITY_AUDIT.md), [API](../../../docs/API.md), relevant [OAuth/HTTPS](../../../docs/deployment/DISCORD_HTTPS_VERIFICATION.md) or [migration](../../../docs/deployment/MIGRATIONS.md) runbooks and the [shared execution contract](../../../docs/engineering/SKILL_SYSTEM.md). Treat Outpost as public-facing real-account software.

## Threat model and implement

1. Trace attacker input across browser → API/server action → session → current database ownership/membership → persistence/cache → external service. List sensitive resources, trust boundaries, actor/action decisions and abuse cases. Read the relevant handlers and service, not only UI guards.
2. Build the [authorization matrix](references/authorization-matrix.md) before changing a boundary. Derive identity from the server session and roles/current membership from the database. Recheck authorization inside the relevant transaction; client roles, IDs, cached membership and hidden controls are not authority.
3. Check read/list/search/export/version/duplicate and mutation paths independently. Enforce visibility and attached-resource access, immutable ownership, permitted destination groups and optimistic revisions. Return non-disclosing errors. Check revoked members and role changes after a session/cache has warmed.
4. Validate all untrusted fields and body/quantity/file bounds before persistence; use existing schemas and parameterized database APIs. For uploads, define actual content validation, size limits, safe naming/storage, ownership and delivery policy before exposing a flow. Review redirects, fixed upstream hosts, OAuth state/CSRF, origin/content-type and rate/abuse bounds at integrations.
5. Check session expiry/logout, account export/deletion and actual cookie attributes. Fixture HTTP sessions test app boundaries only; real Discord exchange, repeat login and Secure-cookie behavior need an owned HTTPS target and genuine evidence.
6. Inspect private response Cache-Control and every shared application/Redis/cache key. Prevent cross-user reuse, hidden records in public lists and stale role decisions; preserve region/item/quality identities on public market caches. Never capture tokens/private bodies in artifacts.

## Verify

Run allowed controls and denied actor/action cases; the matrix links relevant e2e/unit tests. Verify returned status/body, unchanged database after denial, cache isolation and revoked/expired sessions. Rerun authorization/cache/migration regressions after related changes and the mandatory phase gate. Browser MCP can exercise UI/direct requests only after capability discovery and successful calls; local fallback is labelled. Source checks and dependency scans alone cannot certify security.

Review dependency advisories and maintenance separately. Investigate reachable impact and peer compatibility; controlled upgrades need regression evidence. Never blindly upgrade or run audit fix --force. Use additive migrations, preserving data, and disposable owned database migration/backup/restore tests. Do not reset an existing database or apply destructive production changes automatically.

## Acceptance and report

Acceptance requires documented trust boundaries, server-enforced current authorization, allowed and denied tests for changed paths, private-cache isolation, validated persistence inputs, sanitized errors and explicit unresolved production checks. No user may access another user's private content without permission. Missing evidence remains BLOCKED/NOT TESTED.

Report **scope/threat model → actor/action matrix → source paths → command/results and database/cache effects → findings with severity/reproduction → fixes/retest → untested integrations/security limitations**. Preserve real OAuth/HTTPS and broader audit limitations; never claim complete security from a handful of passing checks.

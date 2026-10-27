# Scoped security evidence

This is a local source/test review plus a limited GitHub policy read-back, not a penetration test or comprehensive security certification. Latest execution and scan counts come from [QA_REPORT.md](../../QA_REPORT.md) and [recorded evidence](../qa-evidence.json).

| Boundary                | Evidence                                                                                              | Limit                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Account/private content | Owner/outsider sessions, logout/expiry, hidden content, current membership and expected-version tests | Fixtures do not verify Discord exchange or all authorization paths               |
| Mutations and errors    | Origin/JSON bounds, schema checks, sanitized service failures and hostile literal text                | No blanket SQL injection/XSS/CSRF absence claim                                  |
| Community/guild roles   | Database roles/revocation, invitations, transfer, moderation revisions/audit                          | Full spam/appeals/staff operations unverified                                    |
| Cache/source safety     | Fixed hosts, identity validation, byte/TTL bounds, cooldown/queue and malformed-response retry        | No production-scale distributed coordination or upstream capacity certification  |
| Secret handling         | Ignore rules and configured-secret/token/private-key pattern scans                                    | No maintained full-history audit; missing credentials cannot be checked by value |
| GitHub                  | Private repos and enforced automatic Actions policy read back                                         | Website MFA/member controls, private branch rules and hosted CI remain open      |
| Cookie/TLS/provider     | Source configuration and local HTTP session behavior                                                  | Actual OAuth and deployed Secure cookies unverified                              |

Security-sensitive unresolved gates live in [release readiness](../../RELEASE_READINESS.md); current findings/reproductions live in [BUG_TRACKER.md](../../BUG_TRACKER.md). [Private reporting policy](../../SECURITY.md) is explicit about the missing monitored contact. Historical fixed findings and failures remain in [the archive](../history/2026-10-26-before-reconciliation/docs/engineering/SECURITY_AUDIT.md).

## Frontend data-boundary regression

Dashboard equipment previews retain the authenticated user relation; a two-user browser test warms the owner view, checks the saved icon, then verifies an outsider sees neither the title nor preview and receives 404 from the private-build endpoint. Gallery teardown concurrency exposed a separate required-author read failure; a bounded RepeatableRead transaction keeps that public discovery read internally consistent. Mutation authorization and visibility filters are unchanged. Full phase negative authorization/cache/disposable-migration checks pass; this remains scoped local evidence, not a comprehensive security audit. [Review](../design-review/frontend-pass/README.md).

## Next milestone: private watchlists and catalog boundaries

The watchlist actor/action boundary uses database-session identity, strict item/region/quality bodies, bounded JSON, expected-origin mutations and owner-filtered queries. Reads expose no user IDs and remain private/no-store. Serializable creation with bounded retries enforces 100 items under concurrency; duplicate identity is idempotent. `e2e/market-watchlist.spec.ts` checks two-user warmed-cache isolation, denied foreign deletion, bad origin, spoofed owner field, malformed ID/quality, duplicate requests, concurrent cap, anonymous denial and owner export. Deletion retains the existing database cascade. The local additive migration was applied only after a private backup; disposable migration/constraint/restore checks pass. These fixture sessions are not real Discord OAuth.

Catalog source parsing checks slot/file agreement, bounded source shapes, exact tier/enchantment identity, duplicates and pinned checksums. Fifty-five inconsistent/unsupported base records are quarantined, with no inferred correction. Only factual fields are activated; source rights/current-patch/image/unlock acceptance remain independently limited. Full API pagination retains the existing public metadata boundary. Composition card previews retain the existing server membership/visibility predicates and use a RepeatableRead related query; no membership data is cached publicly.

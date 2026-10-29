# Team loot accounting

This is manual whole-silver accounting, not an Albion market observation or an in-game transfer. A team officer enters the actual gross pool, agreed expenses and participant share weights. No game tax, repair coefficient or silver balance is inferred.

The schema accepts pool/expense amounts from0 through9,007,199,254,740,991 whole silver, at most50 named expenses,1–400 distinct current team members, and integer share weights1–1,000. Expenses must total no more than the pool. All sums/products/divisions use BigInt before conversion of bounded output values to Number.

Let `N = pool − expenses` and `W = sum(weights)`. Each participant receives `floor(N × weight / W)` silver first. Remaining whole silver is awarded one at a time by descending fractional remainder `(N × weight) % W`; equal remainders use ascending stable user ID. The result records the base payout, extra rounding silver, total payout and zero unallocated silver. `expenses + sum(payouts) = pool` exactly, including the maximum supported amount. This policy is visible before saving.

Independent expectations:

|  Pool | Expenses | Shares             | Expected payouts                   |
| ----: | -------: | ------------------ | ---------------------------------- |
| 1,000 |      100 | 1 /2 /3            | 150 /300 /450                      |
|   100 |        1 | 1 /1, IDs a then b | 50 /49, with1 rounding silver to a |
|     5 |        0 | 1 /2               | 2 /3                               |
|    20 |       20 | 1 /1               | 0 /0                               |

The pure tests also cover unsafe/fractional/negative values, duplicate members, empty participants, expense overflow and maximum-integer conservation. UI validation is advisory; the same schema runs in the database service before any write.

## Actor/action boundary

| Actor/current state                          | Read saved team splits          | Create/update                                      |
| -------------------------------------------- | ------------------------------- | -------------------------------------------------- |
| Anonymous                                    | 401                             | 401 after origin validation                        |
| Nonmember, including a public team's visitor | 404                             | 404                                                |
| Current member                               | Allowed                         | 403                                                |
| Current owner/admin/officer                  | Allowed                         | Allowed, current participants and version required |
| Revoked member/author                        | 404                             | 404                                                |
| Role downgraded to member                    | Allowed                         | 403                                                |
| Stale version or other team's record ID      | No mutation through supplied ID | 409                                                |
| Participant no longer in team                | Existing saved ledger retained  | 409                                                |

`teamLoot` executes as a named private database service. It derives the actor from the server session and rechecks membership/role, all participants and optimistic version within a Serializable transaction. Server-side `groupId` scopes every record lookup/update. Creator identity is server-assigned and never changed by edits. API responses are `private, no-store`; there is no automatic private device storage. JSON export requires an explicit user action. A failed save/conflict retains the active form. Switching team tabs retains that form; ordinary navigation and sign-out confirm before discarding dirty input.

## Additive storage and verification

`GroupLootSplit` is an additive PostgreSQL model with a JSON configuration, version and team/creator foreign keys. The reviewed migration adds only its table/index/constraints. SQLite migration0004 creates the same table/index idempotently and applies JSON/title/version checks to both new and existing candidate schemas. The coordination Durable Object upgrades schema versions1/2 to3 without rebuilding existing tables or deleting rows. The isolated SQLite QA checks a second application retains the exact ledger row, malformed updates are denied and deleting a team cascades its splits. Creator deletion sets its attribution to null.

The parent reviewed and applied the sole pending migration to the owned local database and regenerated the Node client. Production migration/publication remain the parent's explicit release boundary. Cloudflare generation order is `node scripts/cloudflare-d1-schema.mjs` then `node scripts/cloudflare-database-generate.mjs`; no migration/generation command was run by this workstream.

Focused unit/type/lint checks passed during implementation;39 unit cases include the existing build-copy suite and the new loot/group-copy cases. The new browser test exercises a real UI save, simulated503→retained draft→real retry, real concurrent revision→UI409, permitted member reads, denied nonmember/member writes, cross-team IDs, role downgrade/revocation and departed participants. Exact execution of these browser cases and the migration/runtime checks is pending the parent's coordinated phase; fixture sessions do not certify real OAuth or deployed authorization.

## Account export, revocation and deletion follow-up

The final account integration review found the new ledger relation was missing from account export. Export now includes only the actor's authored ledger metadata (ID, team ID, title, version and timestamps) while they remain a current team member. It excludes the shared configuration entirely, because a later officer may have edited its financial notes or participants. A revoked author receives no metadata for that team's ledger through account export, just as the team API denies their access.

That review also confirmed an older adjacent authorization defect: the authored-compositions export relation included GROUP compositions after membership revocation, even though normal composition reads denied them. The export now requires current membership for GROUP entries while retaining the actor's own PRIVATE/PUBLIC compositions. The functional account fixture verifies allowed-member inclusion, revoked GROUP/ledger exclusion and preservation of an ordinary private authored composition.

Account deletion intentionally preserves shared team loot history. Its creator foreign key becomes null; the team's configuration, notes and saved participant references remain intact. This is not a complete purge of shared financial records or an in-game transfer. The functional test deletes only an isolated non-owner fixture account through the real settings action and checks that attribution is cleared while the original ledger/version survives. Existing owned-team transfer/deletion requirements remain in force.

The SQLite QA now also uses a separate, fresh in-memory29-table/v2 database with old user/team/build/equipment rows. It removes only that disposable schema's empty new table before seeding, applies migration0004 plus the metadata version3 update, then compares all old rows byte-for-byte and checks foreign keys. This proves the old-schema additive SQL path separately from the new-candidate/idempotent-row test; it does not claim a deployed Durable Object restore rehearsal. Exact final browser/SQLite execution remains owned by the parent's coordinated phase.

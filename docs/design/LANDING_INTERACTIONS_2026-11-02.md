# Landing interactions and quieter card backgrounds

Owner scope: Team Management wording; a different PvP build; actual signed-in likes on both landing teasers; animated tool values without a blank refresh; history hover; simpler section links; more space before the footer; slightly stronger background blur on all illustrated cards.

## Implementation

- Featured the existing Battleaxe Mist Build (`MISTS_SOLO`, PVP tag in the imported snapshot). No item facts, abilities, source artifacts or current-patch status promoted or invented.
- Header/footer of the centre window say Team Management.
- AccountLikeChip is separate from existing device favourites. The server validates an existing public entry, canonicalizes build IDs/slugs, derives the actor from the current session and persists only that account's like. Counts identify archived votes and new Outpost likes separately in the tooltip. Requests use private/no-store responses, existing mutation quotas, matching Origin and a strict1KiB JSON body. PostgreSQL/SQLite unique identities, cascade ownership and bounded conflict retries protect duplicates and deletion.
- AnimatedNumber interpolates visual values with a stable accessible target, without React rendering every animation frame. Reduced motion is immediate. Same-region crafting refreshes retain the last confirmed quote with an updating/error notice; a new region clears it. No formula changed. Chart hover amounts remain exact rather than interpolating between observed prices.
- Market history selects actual daily observations through pointer, touch and keyboard; gaps use timestamp spacing,7D/30D are calendar windows ending at the last observation, and a single observation renders as a point. Dates use UTC. No synthetic prices fill missing observations.
- Shared section links have8px corners and plain arrows, without the circular badge or hover halo. The closing band has72–112px bottom padding. Shared illustrated-background blur changes4px to6px, leaving foregrounds sharp. The window grid has a minmax track so longer PvP metadata cannot stretch its contents past phone card edges.

## Authorization matrix

| Actor/action                                      | Result                                         |
| ------------------------------------------------- | ---------------------------------------------- |
| Anonymous public-count read                       | Allowed; no account flags or identities leaked |
| Anonymous or expired-session write                | 401; no mutation                               |
| Signed-in own like/unlike, repeated write, reload | Allowed and persistent; one row per target     |
| Forged actor field or malformed JSON              | 400; no impersonation                          |
| Cross-origin write                                | 403; no mutation                               |
| Unknown entry                                     | 404; no orphan target written through HTTP     |
| Build ID versus slug alias                        | Same canonical target/count                    |
| Another signed-in account reads                   | Its own liked flag; shared aggregate count     |
| Account export/deletion                           | Own like rows exported; cascade cleanup        |

The client disables signed-out hearts, but the API is the authority. Fixture sessions are not genuine Discord verification.

## Evidence and limits

Raw artifacts are in ignored `.qa/landing-interactions-2026-11-02`. References are the owner's supplied screenshots and the previous deployed5ef908f design. Final capture matrices cover both themes and six landing/calculator widths; representative other pages cover the shared link/background treatment. Current reviewed command outcomes are recorded in `docs/security-remediation.json` and its generated root reports. Final preview captures are local; observed game prices may be missing/stale and are not asserted to be live complete observations.

Historical failures are retained: duplicate concurrent upsert handling, stale fixture schema table/index totals, a migration-test comment parser, a missing async declaration in a held-response fixture, a missing source field in the isolated animation fixture, four full-suite accessibility failures in new labels, and an initial320px window clipping capture. They are separate from later corrected checks. No release verdict is promoted by this record.

Local migration/rollback/backup tests and local workerd are not production restore or real OAuth evidence. Genuine Discord and Stripe remain owner-deferred. These changes are not pushed, merged or deployed by this design review; publication requires a separately recorded authorized release. Existing legal/data/field-performance/full-conformance limits remain independent.

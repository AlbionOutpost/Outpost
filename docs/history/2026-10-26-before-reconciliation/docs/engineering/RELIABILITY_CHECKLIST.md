# Reliability checklist

2026-10-26. PASS is scoped to local evidence.

| Gate                                         | Status          | Evidence / remaining work                                       |
| -------------------------------------------- | --------------- | --------------------------------------------------------------- |
| Fresh migrations and repeat deploy           | PASS locally    | `qa:phase` disposable database integration                      |
| Synthetic backup/restore and relationships   | PASS locally    | Owned disposable databases, not production recovery             |
| Source timeout/cache/budget failure behavior | PARTIAL         | Existing unit/browser regressions; no sustained failover drill  |
| Nonroot standalone container                 | HISTORICAL PASS | Latest rebuild blocked; do not imply current image verification |
| Health checks and safe logs                  | IMPLEMENTED     | DB/Redis health and sanitized errors; deployed alerting absent  |
| Scheduled encrypted backups/retention        | MISSING         | Requires deployed storage/operator policy                       |
| Real Discord login                           | BLOCKED         | Real credentials and browser exchange required                  |
| HTTPS/cookies and rollback rehearsal         | BLOCKED         | No owned deployed staging target configured                     |
| Monitoring/incident contacts                 | MISSING         | Do not invent operator contacts                                 |
| Full catalog/calculator correctness          | INCOMPLETE      | Starter subset only; parity matrix records gaps                 |
| Current production readiness                 | NO-GO           | Essential gates remain open                                     |

2026-10-26 artwork reliability checkpoint: fixed20-icon ceiling for varied group exports, with four concurrent requests, bounded queue,8MiB payload cache and deduplication. Five mocked unit tests cover25 variants, queue/budget recovery, PNG/body rejection and byte eviction. No external bulk load was performed;240/min is an internal per-process policy. Full phase gate78 units/50 browsers all passes in `.qa/icon-reliability/final`. A restricted combined-shell attempt could not reach Docker/local sockets; its failure is preserved in `restricted-run`. The separately executed approved gate succeeds. Latest calculator screenshot recapture uses shared Geist Mono data token. Source/metadata and full-product acceptance remain incomplete; release NO-GO.

Direct migration access: BLOCKED in this restricted command context, P1001 to localhost5432; Docker reports the owned DB healthy. Approved qa:phase migration/restore/browser gates pass in their own execution context. These are distinct facts; do not infer normal deployment/hosted migration readiness. No pending watchlist schema or feature was shipped.

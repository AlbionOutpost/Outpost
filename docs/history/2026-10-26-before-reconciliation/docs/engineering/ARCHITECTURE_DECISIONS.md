# Architecture decisions

## 2026-10-26 — Retain current runtime

Keep Next App Router, React, PostgreSQL/Prisma and Redis. Existing persistence and authorization have regression evidence; no measured limitation warrants a framework migration. Reconsider only against a reproducible limitation and rollback plan.

## Preserve source identity and user intent

Production source identity includes recipe, variant, quality, region and both cities. Pending requests are cancelled when identity changes. A response cannot overwrite a newer manual edit even when overwrite was selected before the edit. Quantity and fee changes remain local arithmetic. Tests independently assert expected accounting values.

## Catalog imports are reviewed inputs, not automatic proof

Validate IDs, slot mappings for known families, recipe quantities/uniqueness and meaningful ability choices before transactions. Source links and rights statements remain operator evidence, not machine-verified redistribution permission. Full metadata/ability unlock coverage stays blocked until appropriate data can be verified. Do not infer game data from concept images.

## Search stays local/PostgreSQL

Merge the authored local starter index with bounded imported results. Do not remove local factual names on an empty database result. No external search service until measured PostgreSQL bottlenecks justify one.

## Bounded artwork proxy for composition export

The previous20-uncached-icons/minute budget and64-entry cache could silently drop artwork for a varied20-player loadout. The proxy now allows240 new identities/minute per process, four concurrent requests,32 queued requests,512 entries capped at8MiB of artwork payload. These are application safeguards, not a statement of the upstream operator’s published rate/usage policy. Fixed HTTPS renderer host, strict item/quality validation, redirect denial,2.5s timeout,200KB body limit, PNG signature checks and in-flight deduplication remain. Success caches6h; genuine source failure5min; local congestion/budget fallback gets a short truthful max-age and is not inserted into the long negative cache. A distributed deployment needs explicit upstream usage review and shared coordination/monitoring; this is not load-test certification.

## Guild event window and private overview projections

The previous earliest50 event query could suppress all future activities once50 historical records existed. Reserve30 active future events and20 recent past/cancelled events in parallel using the existing groupId/startsAt index, then merge chronologically. Permissions are checked before either query. This remains a bounded window, not full archive pagination. Discovery uses a parameterized,80-character search, allowlisted filters and25-result pages, always intersected with PUBLIC or current membership access. Counts are database aggregates, not capped list lengths. Four overview composition snapshots are projected to names/counts/first-five primary weapons; full equipment is not loaded for every directory entry. Current database execution plans on realistic production volumes remain unmeasured.

## Server-rendered discovery with focused favorite controls

Keep build cards/queries server-rendered; only save controls hydrate. Fetch viewer favorite membership and aggregate counts with the bounded build query, not one read per card. A separate confirmed POST reuses existing community authorization/idempotent favorite storage; errors retain state and timeout bounds waiting. Public versus own-private filtering remains server-enforced; anonymous own collection matches an empty set rather than a fabricated author ID. Runtime query values are narrowed from string/array shapes before filters reach Prisma. Factual display names do not imply verified abilities or patch compatibility.

## Bounded rolled-back serialization retries

A concurrent browser run reproduced PostgreSQL P2034 during a composition save without an actual revision change. Retry only confirmed rolled-back P2034 transactions, at most three attempts with10/20ms delays. Re-read permissions and enforce the original optimistic version on every attempt. Genuine revision errors and ambiguous failures such as transaction timeouts are never retried. Transaction callbacks contain database-only work, with no external side effects. Exhaustion returns a truthful temporary-busy error and retains the draft instead of inventing a revision conflict. Existing competing-editor conflict tests remain required; no concurrency/test-worker reduction was used.

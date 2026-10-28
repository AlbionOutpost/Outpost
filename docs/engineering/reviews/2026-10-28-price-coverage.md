# Price coverage and request pipeline correction

The owner reported widespread missing quotes. This review separates missing source observations from application errors, selected-quality gaps and stale observations. It does not certify full game-market coverage or replace unavailable data with estimates.

## Current primary sources

The [Albion Online Data Project](https://www.albion-online-data.com/) explains that its client uploads orders loaded by users in game. [Client documentation](https://www.albion-online-data.com/client) and [FAQ](https://www.albion-online-data.com/client-faq) describe contribution and account-specific encrypted live-market limitations. Website access does not collect every market automatically. Client uploads can help coverage; running it does not guarantee every account can upload live orders.

The [regional API docs](https://east.albion-online-data.com/api-docs) and its machine-readable [Swagger document](https://east.albion-online-data.com/api/v2/swagger_doc), read28 October2026, advertise compressed requests, explicit item/location/quality filters,4096-character URLs and rate-limit backoff. Outpost already requests compression and preserves regional cooldown. Its former20/minute regional upstream allowance was shared across all users/endpoints, so21 uncached requests could exhaust the application budget despite available source capacity. It now reserves conservative50/minute and250/five-minute windows for every actual attempt, including the one eligible short retry. These are application safeguards below the published100/minute and300/five-minute compressed limits. They cannot guarantee capacity when other traffic shares the upstream IP/NAT. Any429 still applies the shared regional cooldown.

## Bounded live baseline

Six total compressed read-only source requests: three initial exact-quality batches and three five-quality batches. Same three item IDs across Europe, Asia and Americas. Raw summaries: `.qa/quote-audit/live-coverage.json` and `live-quality-coverage.json`. These are point-in-time observations, not market-liquidity, current-patch or availability guarantees.

| Exact selection               | Positive sell-city observations, Normal | Good | Other observed qualities                       |
| ----------------------------- | --------------------------------------: | ---: | ---------------------------------------------- |
| Europe,T4_BAG                 |                                       8 |    8 | Outstanding5; Excellent6; Masterpiece0         |
| Europe,T8_MAIN_AXE            |                                       2 |    6 | Outstanding4; Excellent4; Masterpiece1         |
| Asia,T8_MAIN_AXE              |                                       0 |    1 | No other positive asks in this sample          |
| Asia,T8_ARMOR_LEATHER_MORGANA |                                       0 |    0 | No positive asks at any quality in this sample |

All regional calls returned200. Missing sides were genuine upstream zero sentinels. Existing market/batch quote views retain positive stale observations; they do not suppress every observation older than one hour. A different quality can have data, but it must be offered as an explicit selection rather than silently valued as the requested item quality. No source zero was converted into a free item.

## Confirmed corrections

- Batch URLs were the only cache identity. Overlapping build/city/recipe requests repeated otherwise reusable exact item/quality observations. Added bounded public item slices keyed by server/item/quality,60-second TTL,512 memory entries and2MiB payload ceiling. Shared cache fan-out is bounded to12 reads and12 writes per call; remaining pairs retain batch caching. This avoids unbounded Cache API calls on [Cloudflare Free](https://developers.cloudflare.com/workers/platform/limits/#cache-api-limits). Shared hits are not copied into memory with a fresh TTL.
- `getPrices` accepts explicit distinct quality sets1–5 for on-demand quality discovery. Existing scalar-quality callers preserve their exact identity. Partial cache coverage uses a bounded union request; omitted extra pairs cannot erase existing valid slices or extend their lifetime.
- Fifty valid100-character IDs passed input validation but exceeded the transport's3900-character path budget. Requests now split by actual path length, preserving the documented4096 total URL ceiling. The largest supported50-item/five-quality test uses two upstream chunks.
- Unread429/503 bodies are cancelled before cooldown/retry or failure to release outbound connection slots. Existing fixed hosts, no redirects, payload limits and backoff remain.
- Build-cost purchases at the Black Market return400 before upstream requests; unreadable private builds remain404 before validation. Raw Black Market source asks remain available for factual inspection, but quote summaries do not suggest them as player purchase options. Its buy orders remain valid sale targets.

## Verification and limits

Focused market/source/cache/summary/build-cost/budget suite:44 tests passed. Typecheck and affected-file ESLint passed. Independent cases cover overlap, region/quality separation, malformed cached identity, expiry, sparse union omissions, URL chunking, cache fan-out, failed-body cancellation and private denial ordering.

Three comparable deterministic mocked-source samples each ran the same three sequential overlapping requests. Upstream calls fell from3 to2 in each sample (`cache-before.json`/`cache-after.json`). This is request-count evidence, not a network latency, production throughput, field performance or upstream-capacity claim. Full phase, browser/native Cloudflare and hosted checks are parent release work. No database migration, private data cache or invented price was added.

## Regional budget follow-up

Reviewed Node Redis atomic counters and Cloudflare AbuseBudget persistent transactions. The existing regional minute identity is retained so source cooldowns continue to block all endpoints. A distinct five-minute identity avoids mixing different window lengths in the same counter. Cache hits do not spend source quotas; all actual retry attempts do. A refused quota fails closed before network access. No backend rate-storage API or schema changes were needed.

The maximum supported50-item/five-quality long-ID request uses two URL chunks. Tests conservatively count item/URL cache reads and writes, source fetches, cooldown RPCs and both quota RPCs against the external/cache ceiling:36 operations normally,44 with one eligible429 retry per chunk; adding the public endpoint budget gives37/45, below50. Internal RPCs actually have their separate documented allowance; this accounting intentionally overcounts them. Build cost now gathers explicit item/quality sets in one batch, then selects each row's exact requested quality, avoiding five independent cache/budget pipelines for a mixed-quality loadout.

Independent budget regressions permit exactly50 concurrent regional uncached attempts, reject the next three, isolate another server, deny a five-minute refusal before fetching, count both retry quotas and prove cached reads spend none. These are deterministic contract tests, not a production multiuser/NAT capacity certification. The parent runs native Cloudflare coordination and full phase checks.

Parent release verification:286unit/107production-browser/15disposableDB/nine regional reads pass across ten Node22 gates.107Cloudflarebrowser and19nativeSQLite pass before the final timestamp-wrapping correction; seven affected Cloudflare browser journeys pass afterward. Public real-source quality API and selection/guide/loadout flows pass on intermediate web4949048d; its live timestamp overlap was found and corrected, so final visual publication is recorded separately.

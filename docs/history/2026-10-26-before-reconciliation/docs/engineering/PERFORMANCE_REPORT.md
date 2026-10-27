# Performance report

2026-10-26. No field p75 LCP/INP/CLS measurements exist. Historical local timings are not a current production benchmark.

Existing `.qa/api-timings.json` records20 warm loopback requests per endpoint: health p95 ~3.26ms, cached market p95 ~1.85ms. This predates the current pass and has no throttling or realistic concurrency. Historical Lighthouse/container artifacts do not close the latest blocked rebuild/measurement gates.

Current improvements: bounded30-result catalog response validation,180ms picker debounce with cancellation, deduplicated local/imported results, production refresh cancellation and preserving newer input. Quantity changes perform local arithmetic without fetching prices. API source requests remain batched by quality, not per table row. No speculative memoization, virtualization or new search service was added.

Images: current generated homepage scenes total approximately564KiB WebP, preoptimized; authentic licensed scene replacement remains outstanding. Item icons use the fixed official renderer and bounded fallback. Local next/font loading prevents external font waterfall.

Not yet measured: current per-route JS/hydration cost, throttled desktop/mobile CWV, editor interaction latency/memory, PostgreSQL EXPLAIN on realistic records, sustained API/cache failure latency. No before/after performance gain or90+ score is claimed. Next measurement should preserve viewport, CPU/network profile and data fixture across both runs.

2026-10-26 artwork reliability checkpoint: fixed20-icon ceiling for varied group exports, with four concurrent requests, bounded queue,8MiB payload cache and deduplication. Five mocked unit tests cover25 variants, queue/budget recovery, PNG/body rejection and byte eviction. No external bulk load was performed;240/min is an internal per-process policy. Full phase gate78 units/50 browsers all passes in `.qa/icon-reliability/final`. A restricted combined-shell attempt could not reach Docker/local sockets; its failure is preserved in `restricted-run`. The separately executed approved gate succeeds. Latest calculator screenshot recapture uses shared Geist Mono data token. Source/metadata and full-product acceptance remain incomplete; release NO-GO.

Market source checkpoint: source item IDs≤100 chars, nonempty city≤100, timestamps≤64 and price magnitude≤Number.MAX_SAFE_INTEGER. Missing timestamps/zero markers stay intact for explicit freshness/availability handling. Invalid source records are rejected before caching and valid retry succeeds. Canonical deduplicated batches use one fetch rather than two in a controlled concurrency test; this is not a measured production throughput improvement. Final89-unit/52-browser phase passes all eight gates; no deployed or full security guarantee. Direct migrations remain environment-blocked (P1001 despite healthy Docker services); watchlist persistence was not implemented or claimed.

Manual-trade threshold microbenchmark:5000 warmed local pure-arithmetic calls, p50≈0.00202ms, p95≈0.00283ms, p99≈0.00401ms in `.qa/release-blockers/trade/arithmetic-benchmark.json`. No browser/network/CPU throttling, realistic load or field-vitals claim. BigInt is used only for exact decimal whole-silver boundary calculations; quantity/fee edits still require no network price requests.

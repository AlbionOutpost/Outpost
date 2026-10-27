---
name: outpost-performance
description: Measure and optimize Outpost loading, rendering, bundles, fonts/images, search, caching, database queries, network waterfalls, memory and interaction responsiveness. Establish comparable baselines before changing performance-sensitive code.
---

# Outpost performance

Read [performance evidence](../../../docs/engineering/PERFORMANCE_REPORT.md), [load-test limits](../../../docs/engineering/LOAD_TEST_RESULTS.md), [architecture](../../../ARCHITECTURE.md), relevant installed Next.js guides and the [shared tool/QA contract](../../../docs/engineering/SKILL_SYSTEM.md). Preserve visual quality, calculator correctness and private cache boundaries.

## Measure first

1. Define route/action and representative data: item search/grid, city/chart load, calculator input, equipment selection, large composition edit/export or query. Record production/development build, viewport/device, fixture versus source, network/CPU, service/cache state, timestamp and sample count. Never mix dev and production samples into one comparison.
2. Discover Chrome DevTools MCP capabilities and confirm actual success. Navigate before tracing; use supported performance_start_trace/stop/analyze and network/console tools with their current schema (pageId if required). Use Playwright MCP for UX timing and screenshots. Use Lighthouse for reproducible lab audits when available; do not run both servers for trivial checks.
3. If MCP is unavailable, record the error and use an installed local Playwright/CDP or Lighthouse fallback when permitted. A Performance API timing is a labelled proxy, not a DevTools trace or field INP. If measurement is unavailable, leave optimization effectiveness NOT VERIFIED and continue independent inspection.
4. Capture at least three comparable baseline samples for a claimed speed improvement; separate cold and warm cache runs. Retain raw timing/trace/audit artifacts. Report medians/ranges and explain any chosen different sampling strategy. Do not benchmark third-party load without authorization.
5. Diagnose actual bottlenecks: JS transfer/hydration, image dimensions/bytes, font loading, server/client boundaries, React rerenders, query counts/latency, cache hit/miss, request waterfall/duplicates, chart cost and list size. Connect each proposed change to measured evidence.

## Optimize and retest

Prefer stable local changes: appropriate server boundaries, lazy heavy charts/export, bounded/virtualized genuinely large lists, deduplication/cancellation, indexed/batched queries, identity-safe TTL caches and suitably sized images/fonts. Keep calculator keystrokes local when appropriate. Use purposeful transform/opacity transitions and reduced-motion support; avoid expensive filters/decorative motion or framework rewrites without need.

Repeat the same baseline protocol after changes, recording size/time deltas and correctness/visual regressions. Compare identical fixture size/build/profile/cache conditions. Run relevant cache/search/formula/authorization tests and phase QA; inspect responsive captures for UI-affecting optimization. Do not claim a speedup from source changes or unmatched runs.

## Targets and acceptance

Targets: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1; Lighthouse Performance ≥90 and Accessibility ≥95 where realistic. Report measured values, exceptions and missing metrics independently. Lab LCP/CLS, Lighthouse TBT and synthetic interaction timings do not establish production p75 field INP or full accessibility conformance.

Acceptance requires reproducible actual baseline, evidence-linked diagnosis, comparable benchmark for any claimed improvement, preserved player journeys/visuals and no cache isolation regression. A review may identify a bottleneck without implementing unrelated optimization. List targets still unmet or unmeasured.

## Report

Record **route/action/build/data → tool success or fallback → viewport/profile/cache/samples → baseline/results table → diagnosed causes → change and comparable rerun if any → regression commands/artifacts → lab/field and device limitations → next measurement**. Update the performance report with durable evidence, not universal scores or an unsupported SLA.

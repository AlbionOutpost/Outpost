---
name: outpost-performance
description: Measure and improve Outpost speed and efficiency — LCP/INP/CLS, bundle and CSS size, fonts and images, React rendering, data waterfalls, caching, Durable Object and D1 request costs, AODP budgets and Cloudflare Free-tier limits. Use when something feels slow, before adding heavy code, or when asked to optimize.
---

# Outpost performance

Fast on a mid-range phone on mobile data, and cheap enough to stay on Cloudflare's free tier. Measure first, change one thing, measure again.

## Targets

| Metric                 | Target                                                      | Last known (lab, mobile, 29 Oct)                        |
| ---------------------- | ----------------------------------------------------------- | ------------------------------------------------------- |
| LCP                    | ≤ 2.5 s                                                     | 3.6–5.3 s on home, library, detail, market, crafting    |
| INP                    | ≤ 200 ms                                                    | not measured in the field                               |
| CLS                    | ≤ 0.1                                                       | library once 0.06                                       |
| Lighthouse perf / a11y | ≥ 90 / ≥ 95                                                 | 78–89                                                   |
| Web Worker bundle      | under 10 MiB gzip (Workers Paid); keep it lean for start-up | ≈ 3.13 MiB                                              |
| Global CSS             | as small as possible                                        | homepage 308 KB inlined (7 Nov, Node build; was 405 KB) |

## Measure

1. Fix the conditions: route, production build (never compare dev with prod), viewport/device profile, network/CPU throttle, cold vs warm cache, fixture vs live data, sample count (≥3 for any claimed improvement; report median and range).
2. Tools: Lighthouse (`npx lighthouse` — not a project dependency) against a production build, Chrome DevTools performance traces, `performance` API timings as labelled proxies, `node scripts/cloudflare-free-check.mjs` for bundle size, `.open-next` output for chunk sizes.
3. Find the real bottleneck: critical-path CSS and fonts, the LCP element and how it loads, JS transfer and hydration, client/server component boundaries, re-renders, request waterfalls and duplicate fetches, DB/RPC round trips per page, cache hit rate, chart and list cost.

## Usual wins here

- **Cut global CSS** — 16 stylesheets load on every route; move page styles to the route (the build/comp/guide sheets already load through `src/app/build-styles.ts`), delete dead passes and rules for classes no source file uses any more (coordinate with `outpost-frontend`). Webpack's default CSS chunking also merges other routes' CSS modules into the homepage's sheets (≈ 120 KB raw on 6 Nov); `experimental.cssChunking: "strict"` would split them but reorders the cascade everywhere, so measure every route before trying it. A moved sheet loads after every global one, so compare the rendered cascade before and after.
- Preload only the fonts used above the fold; keep `display: swap`; size the hero image correctly with explicit dimensions.
- Large local images get width variants from `node scripts/image-variants.mjs` and a `srcset` from `variantSrcSet()` ([DATA.md](../../../docs/DATA.md)); lazy-load below the fold, eager + `fetchPriority="high"` for the LCP image only.
- Keep data fetching on the server and parallel; avoid per-item client fetches; batch market requests (`/api/market/batch`).
- Lazy-load heavy, below-the-fold or interaction-only code (charts, PNG export, editors' secondary panels).
- Every page view costs a Worker request and its CPU (pages render in the web Worker), plus data RPC; edge budgets are Rate Limiting bindings, not Durable Objects. Never render, poll or hold timers in a Durable Object: it bills wall-clock time while anything keeps it in memory. Keep every allowance in [OPERATIONS.md § Cost guardrails](../../../docs/OPERATIONS.md#cost-guardrails); avoid extra round trips, keep prefetch off unless measured safe.
- Use the `vercel-react-best-practices` skill for React/Next patterns. Caching must never mix users (see `outpost-security`).

## Verify

Re-run the same protocol after the change; report before/after table, plus correctness and visual regressions (run affected specs, capture screenshots). Don't claim a speed-up from code reading or unmatched runs. Lab numbers are not field data.

## Report

Route/action and conditions → tools used → baseline → diagnosis tied to evidence → change → comparable rerun → regressions checked → what's still unmeasured. Update the numbers in this skill's table and in [ROADMAP.md](../../../docs/ROADMAP.md) when they move.

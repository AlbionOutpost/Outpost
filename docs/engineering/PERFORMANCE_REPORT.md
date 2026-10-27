# Performance evidence and limits

Current result: bounded caching/deduplication/artwork queues have unit regressions, and the focused homepage phase adds a fresh local simulated-mobile Lighthouse run plus an actual source-price browser preview. The complete representative route matrix and field vitals remain NOT TESTED. Latest functional build/browser gates in [QA_REPORT.md](../../QA_REPORT.md) are not performance certification.

Historical artifacts remain under local `.qa`: Lighthouse, sequential loopback API timings and a warmed arithmetic microbenchmark. Their dataset/date/configuration do not represent current full-route performance, realistic concurrency, network throttling or field p75 LCP/INP. Earlier Docker/socket/server-bind permission failures describe those historical attempts. The subsequent homepage phase successfully rebuilt/smoke-tested a local image and measured its homepage; it does not certify every route or production operation.

The source has local fonts, preoptimized disclosed illustrations, bounded name-search/cancellation, identity-aware caches and local recalculation without price refetch on every input. No measured current speedup, universal 90+ Lighthouse result or SLA is claimed.

Next measurement: preserve route, fixture, viewport, network/CPU profile, build/image and timestamps; record route JS/hydration, interactions, LCP/CLS/INP proxies and request/failure latency. Test only owned environments. [Load test requirements](LOAD_TEST_RESULTS.md), [original measurements/history](../history/2026-10-26-before-reconciliation/docs/engineering/PERFORMANCE_REPORT.md), [current release gates](../../RELEASE_READINESS.md).

Current homepage initial/rerun Lighthouse files, geometry comparison, real-observation preview and limits are documented in [the focused review](../design-review/homepage/POLISH.md). Latest values are generated in [QA_REPORT.md](../../QA_REPORT.md), not manually maintained here.

## Targeted Market measurement — 2026-10-26

Local production route, Lighthouse 13.5.0 mobile simulation (one initial-state audit): Performance 96, Accessibility 100, LCP 2.818s, CLS 0, TBT 24.5ms. **LCP misses the 2.5s target.** Estimated unused JavaScript 53KiB, unused CSS 16KiB and render-blocking 300ms are diagnostic leads, not measured savings. Three separate warm unthrottled loopback fixture interactions reached eight city rows in 59.7–63.8ms (median 61.4ms, automation wall-time proxy), with 191,000 script resource transfer bytes. No field INP, cross-device/load assurance or optimized before/after comparison. Chrome DevTools MCP failed on missing Chrome; installed local Chromium/Lighthouse fallback succeeded. Fresh Docker build failed on a protected buildx activity file, so these are host-production measurements. [Review and portable manifest](../design-review/skill-system-review/README.md).

## Historical frontend-pass evidence

Three sequential Lighthouse 13.5.0 simulated-mobile samples per page before/after CSS extraction. Market uses fresh contexts; editor uses an isolated persistent authenticated fixture profile with storage reset disabled. Protocols are not pooled. At that checkpoint Market performance was 94–97, accessibility 100, LCP 2.658–3.104s (median 3.101s), CLS 0. The 2.5s target remains missed. Warm editor fixture scores 100/100, LCP about 0.621s, CLS 0. These are local host lab results, not current container, field INP or production p75 evidence.

134 homepage-only rules moved to a homepage route stylesheet; AST comparison preserves declarations and relative order in both sets. Market stylesheet transfer falls 25,146→21,595 bytes (3,551 bytes/14.12%). Before/after LCP ranges overlap, so no reliable load-time improvement is claimed. Homepage viewport pixels are identical at 1440/390px and production navigation/visual regressions pass. Renderer/network/console and CDP trace samples retain their own cache/mode limitations. Fresh Docker build is BLOCKED by a protected buildx activity file. [Portable measurements and review](../design-review/frontend-pass/README.md).

## Current skill-setup audit — 26 October 2026

The audit-only checkpoint reran the same fresh-process Market protocol: Lighthouse 13.5.0, production localhost:3001, anonymous initial route, 412×823/DPR 1.75, simulated 150ms RTT and 4× CPU. LCP 3.083/2.704/2.706 seconds, **median 2.706 seconds**, performance 94/96/96, accessibility 100, CLS 0. The LCP element remains `small.market-source-note`. The 2.5-second target is still missed; no new application change was made during this audit.

The last pre-audit display-face candidate fetches the same Barlow 800 bytes twice: two generated URLs each transfer 22,932 bytes with identical SHA-256 `2515494e8cc2ca07c86ea78766cfa104b796aa6ed5d66821c01d51dbb0b52bce`. Consolidating this delivery is the next measured experiment, not an implemented fix. The preceding candidate measured median 2.554 seconds under the same protocol, but sample ranges overlap. The 3.101-second frontend checkpoint remains historical.

Earlier authorized work extracted 187 equipment and 77 production stylesheet rules with AST preservation checks. Experimental global CSS inlining removes a request but the current Market document transfers about 64.5KB (344.8KB resource size); cold/warm caching tradeoffs still require comparison. Fresh Docker verification remains blocked by the protected buildx activity directory; no field p75/INP claim is made. [Audit evidence and next acceptance](UI_UX_CODE_AUDIT_2026-10-26.md), [portable screenshots/measurements](../design-review/skills-audit/README.md).

## Implemented font delivery and comparative CSS experiment

The subsequent authorized refinement removes the duplicate Barlow 800 declaration in the supporting family, binds existing 800 heading roles to the single display face and leaves only the UI font preloaded. The 600/700 supporting faces remain available. Network records verify three font requests become two, eliminating one 22,932-byte transfer without replacing the typography. Source-note text remains the actual Market LCP element.

Three fresh Chromium processes per candidate under the same Lighthouse 13.5.0 protocol (412×823/DPR1.75,150ms RTT,4×CPU, production localhost:3001, anonymous initial route): direct pre-font median 2.705s (2.704–3.079); deduplicated/preloaded display 2.629s (2.629–3.080); external-CSS trial 2.927s (2.924–2.993), reverted; final UI-only preload 2.628s (2.628–2.952). Final performance95–97,accessibility100,CLS0. Ranges overlap; the small median difference is not a general speedup claim. **2.5s target still missed.** The retained configuration continues global CSS inlining; warm-cache/HTML tradeoffs and field p75/INP remain open. Fresh Docker build again fails at the protected buildx activity file. [Portable protocol/network samples](../design-review/refinement/performance.json), [rendered before/after and test evidence](../design-review/refinement/README.md).

## Equipment artwork loading — 2026-10-27

The rebuilt homepage’s large weapon was the LCP element. Three comparable Lighthouse13.5 mobile runs measured median5.222s (range5.210–5.224s) with lazy external delivery. Local source-pinned PNGs, Next Image optimization and eager/high-priority lead delivery measured median2.862s (range2.633–3.399s) across three sequential runs. Browser profiles were fresh, application/services warm and code/browsers/benchmarks sequential; this is lab evidence with external observations, not field performance. Accessibility100 and CLS0 in all six. The2.5s target remains open. [Audits and image provenance](../design-review/playful-ui/README.md#artwork-loading).

## Task-led UX sample — October27

The production homepage was measured once with local Chromium/CDP and Lighthouse13.5.0 mobile defaults after the task-led redesign: LCP2554ms, CLS0, Performance97, Accessibility100. Raw report: `.qa/ux-transform/lighthouse.json`; compact result: `.qa/ux-transform/lighthouse-summary.json`. There is no comparable before measurement for this architecture, so no speedup or field-performance claim is made. This sample is slightly above2.5s; the earlier Market Explorer target remains a separate requirement.

# Performance evidence and limits

Latest search-palette checkpoint: [fresh container samples and limits](../design-review/search-palette/README.md#final-verification). One initial-route mobile lab sample per home/Market/crafting route scores85/95/95, accessibility100, LCP4.314/2.857/2.858s and CLS0. This does not measure open-dialog physical-device performance or establish a loading improvement. All LCP targets remain missed.

Latest shared-motion checkpoint: [measurements and limitations](../design-review/motion-system/README.md#final-gate-and-measurement-limits). Three small desktop synthetic-pointer samples per version retain median16.7ms/p95about16.7–16.8ms, with no >50ms intervals; this is not field INP/device or loading assurance. One container/mobile sample each for home/Market/crafting scores86/95/95, accessibility100, LCP4.119/2.855/2.858s and CLS0. All LCP targets remain missed; no speedup claimed.

Latest compact region-selector checkpoint: [current samples and limits](../design-review/region-picker/README.md#verification). One container/mobile lab sample per home/Market/crafting route reports performance86/95/95, accessibility100, LCP4.164/2.856/2.864s and CLS0. All LCP targets remain missed. This is a single-sample smoke checkpoint, not a reliable comparison or field result.

Latest card/layout checkpoint: [current container samples and limits](../design-review/loadout-cards/README.md#final-results). One mobile lab sample each for home/Market/crafting scores89/95/95 performance and100 accessibility, LCP3.774/2.856/2.860s and CLS0. All LCP targets still missed; no reliable speedup or field claim. Fresh non-root/env-absent/DB-Redis smoke passes. Earlier measurements are historical.

Latest shared-control/workspace checkpoint: [current container samples and limits](../design-review/workspace-depth/README.md#final-commands-and-limitations). One simulated-mobile sample each: homepage89/100 performance/accessibility, LCP3.774s; Market91/100, LCP3.475s; crafting95/100, LCP2.861s; CLS0 in all three. All LCP targets remain missed and homepage performance misses90. No reliable speedup, field INP or full conformance claim. Fresh non-root container/env-absent/DB-Redis smoke passes; actual OAuth remains unconfigured. Earlier samples below are historical.

Latest UI-fidelity checkpoint: [production container measurements and loading diagnosis](../design-review/home-fidelity/README.md#verification-record). One simulated-mobile sample per route after font/image delivery correction: homepage88/100 performance/accessibility, LCP3.930s, CLS0; Market95/100, LCP2.856s, CLS0; crafting95/100, LCP2.858s, CLS0. All LCP targets remain missed; homepage performance also misses90. The initial homepage sample had late display-font layout shift and a lazy LCP image; the display font is now preloaded and hero image eager/high priority. Single samples per revision are diagnostic, not a reliable performance comparison or field evidence. Fresh non-root container/DB/Redis smoke passes, with actual OAuth unconfigured. Earlier measurements below are historical.

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

## October27 functionality milestone — repeatable production comparison

Three Lighthouse13.5 mobile samples per homepage and Market, before and after; a separate warmed after-series confirms the initial result. Exact settings, samples and caveats are in the [portable performance record](../design-review/product-milestone/performance.json). Local production Node22/Chromium/CDP, fresh Lighthouse profiles, warm services, sequential runs; no builds/browser suites alongside. This is lab simulation, not field p75 or INP.

| Route    | Before median (range), ms | Warm after median (range), ms |
| -------- | ------------------------- | ----------------------------- |
| Homepage | 2554 (2554–2557)          | 2556 (2555–2556)              |
| Market   | 2553 (2553–2554)          | 2553 (2553–2555)              |

CLS0, Accessibility100 and Performance97 in these comparison samples. The initial after-series is retained, including a3073ms first-home sample; it is not concealed or used as an improvement baseline. Both medians still miss2500ms. No meaningful LCP speedup is established.

The actual LCP elements are the homepage introductory paragraph and Market introductory paragraph. There is no external render-blocking stylesheet in these captures. A separate performance-only Lantern graph diagnosis places initial HTML, the Next runtime chunk and the preloaded UI font on the modeled critical path; its single2256ms result is **not** a comparable end-to-end success claim. The Market document was about92KB transferred /505KB decoded, including152KB inline CSS; runtime transfer remains material. Inter was safely trimmed from48256 to36992bytes, retaining all230 mapped glyphs and the used400–800 variable weights. Correctness/golden tests pass, but the unchanged measured LCP means font transfer alone does not resolve the remaining bottleneck. Root trace/graph artifact: `.qa/product-next/lcp-diagnosis.json`; raw before/after audits stay under `.qa/product-next`.

The fresh Docker build again fails while writing `/home/bttw/.docker/buildx/activity` on a read-only mount. No permission weakening or alternate Docker-security bypass was attempted. Owned staging/field measurements, fuller rendering/load profiling and sub2.5s acceptance remain open.

## October28 functional-parity checkpoint

[Production planner/farming evidence](../design-review/production-planning/README.md). Fresh hardened container smoke passes. One initial-route mobile Lighthouse sample each home/farming/crafting: performance87/94/95, accessibility100, LCP4.065/3.007/2.858s, CLS0. All LCP targets missed; these do not measure populated30-recipe interactions, prove a speedup, establish device/field performance or close release gates.

## Guest build checkpoint — October28

[Current UI and measurement evidence](../design-review/guest-build/README.md). One production-container mobile initial-route sample each home/guest-builder/crafting: performance85/94/95, accessibility100, LCP4.306/3.080/2.855s and CLS0. All LCP targets missed. No populated-editor speedup, sustained load, device or field claim. Fresh non-root/env-absent/DB-Redis smoke passes; real OAuth and release gates remain open.

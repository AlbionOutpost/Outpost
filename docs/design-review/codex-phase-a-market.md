# Phase A — Market Explorer

Implemented the bounded Market task from the owner's Codex-ready package. The supplied captures were treated as current-state evidence, not a target to reproduce. The master brief, deep audit and route matrix were read alongside the current source and rendered route.

## Observed problems and changes

The actual Node production baseline at `http://localhost:3003/tools/market?region=europe` confirmed a selected Bag alongside instructions to choose an item, two separate selected-item panels, and a permanently narrow comparison table. The updated query panel owns the single selected-item identity. Its main action remains an explicit **Compare prices**; no market quote loads automatically. Ready, loading, failed-source and genuinely absent-observation states now give the relevant next action.

The comparison table uses the working area; city details appear only after choosing a returned market. Individual buy/sell timestamps, stale-side markers, missing values and Black Market direction remain intact. Aggregate extremes are explicitly scoped to all returned cities and retain their source dates. History remains separately available. Research and Watchlist use keyboard-operable secondary tabs whose mounted components retain their independent state. Existing account permissions and storage semantics are unchanged.

The first focused run exposed an SSR click before its handler attached; the second exposed the same gap for a native Quality change. Query controls now stay disabled until hydration, with a regression that deliberately pauses the actual client chunks. No data request is added by that guard.

## Verification and measured scope

- Before: `.qa/phase-a-market/before.json`, `before-1440-{initial,results}.png`, `before-390-{initial,results}.png`; original viewport and full-page captures were inspected.
- After: `.qa/phase-a-market/after-dev.json` and `after-dev-*` captures, local development on the library agent's shared port 3006. Initial and result states were captured at 320,375,390,768,1024,1440 and 1920px. The 1440/390 and narrow 320 rendered images were inspected.
- All 14 final captured states returned 200 with no document overflow. An earlier 320px aggregate-timestamp overflow is preserved in `after-dev-before-wrapping-fix.json` and its screenshot; wrapping was corrected and recaptured.
- At 390px, Compare moves from approximately 478px to 414px from the viewport top. The result table moves from 872px to 769px. Initial document height changes 1724→1613px; the three-city fixture result changes 2888→2516px. Desktop initial height is almost unchanged, while the table now uses the full working width. These are geometry measurements from different production/development modes, not performance benchmarks.
- Selected-item information panels change 2→1. Initial `/api/market` request count remains zero; one explicit comparison produces one request.
- Seven focused browser journeys pass in `.qa/phase-a-market/focused-third.log`: hydration readiness, loading/failure/missing states, explicit other-quality coverage, research retention, preference-region identity, sort/city filtering and city detail/region invalidation. Original failures remain in `focused-first.log` and `focused-second.log`.
- Four sampled desktop/mobile initial/city-inspector states have zero axe violations in `.qa/phase-a-market/axe.json`. The first ad hoc axe invocation used the wrong context constructor and was corrected; it was a harness error, not an application failure.
- Affected ESLint and global typecheck pass. The watchlist browser test was updated only to select its new tab; its actual persistence and negative permission journey remains part of the parent's mandatory phase gate.

MCP navigation returned an approval-policy error. All browser evidence here uses the permitted sandboxed local Playwright library fallback. Observed result captures use isolated, intercepted fixture responses and are not live market data. The attempted private dev server 3005 exited on the existing Next dev lock; no child-owned server remains. Shared 3006 is owned and cleaned up by the library agent/parent.

## Limits and handoff

No backend, schema, authentication, formula, source freshness threshold or market ingestion logic changed. CPU, field performance, production Cloudflare behavior and owner visual acceptance are not established by these captures. The parent owns the rebuilt production before/after comparison, full phase gate, current release evidence and any later phase. Market source was frozen before that coordinated build.

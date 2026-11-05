# Market and Tools working surfaces — 4 November 2026

## Direction and boundary

The owner asked to extend the accepted landing page style to other pages, starting with Market, after restoring PR83. These routes use **Operate** mode: real item selection and city comparison lead; the existing painted masthead, copper working frames and task emblems provide continuity. The rejected PR84 one-preview tool switcher is not introduced.

Market preserves Search → select item → automatically load city quotes → sort/filter → inspect a city → history → research/watchlist. Fetching, quote summaries, source freshness, missing/partial/error distinctions, URL/region/quality synchronization and private watchlist authorization are unchanged. Tools retains all 23 catalogue records, their existing descriptions/scope labels, category/search controls, region links and bounded device-local pins. No formulas, APIs, permissions, global navigation, fonts or new media were changed.

## Baseline and implementation

Before edits, actual local Chromium desktop and phone captures were inspected in both themes. Explicitly labelled price/history fixtures isolate layout from changing source coverage. Baselines are `.qa/market-operate/baseline/` and `.qa/tools-operate/baseline/` (1440×900 and 390×844).

The baseline Market masthead had seven equal links, separate framed selected-item and city-order blocks, and city orders began at approximately 685px on desktop. The new compact masthead has three task landmarks; other calculators/guides remain in a secondary navigation group after research. Item identity, financial context and city orders now share one copper working frame. Tablet search and filter disclosures sit beside each other; phone controls remain in reading order. The fixture desktop city-order section now begins at 538.8px, approximately 146px earlier.

Tools keeps its dense three-column catalogue, uses the existing `toolEmblem` mapping for painted task symbols, shortens its masthead and improves the category/count hierarchy. Two columns at tablet and one at phone retain readable descriptions and pin controls. Symbols remain decorative beside the actual tool names; no tool/game facts are inferred from them.

The work uses route/component CSS Modules. The installed Next CSS guide was read; production CSS ordering still needs the integration build gate. The shared masthead, catalogue, item renderer, order table, history, research and watchlist components remain the functional authorities. No essential information or action depends on hover.

## Verification

Local-library Playwright with normal Chromium sandbox was used; it is not Browser MCP evidence. The MCP restriction from the current session remains unchanged. Final screenshot matrix: both themes at 1440×900, 1920×1080, 768×1024, 390×844, 375×812 and 320×844 for each route (24 route/theme/width cases), with no document overflow. Actual viewport contact sheets and representative full-page images were inspected at `.qa/market-operate/final/` and `.qa/tools-operate/final/`.

Commands completed on Node22:

- `npm run typecheck` — PASS.
- ESLint on both pages, Market and ToolDirectory — PASS.
- Existing `market-visual`, `market-research`, `market-watchlist`, `tool-directory` Playwright specs — 4 PASS. The existing device-local shortcuts regression also passed (5 targeted cases total). This includes foreign-delete/origin/watchlist denial checks, retained research observations on source failure, filtering/table/chart and region-aware discovery.

Additional actual UI checks in both themes passed: keyboard city details and matching history city, quality in URL, partial/stale/missing buy side, empty observations, refresh failure retaining quality, disabled loading action, keyboard catalogue item selection, keyboard pin and reload, empty catalogue/reset. Scoped axe found no violations on the tested Market/Tools states; this is not a full conformance claim. Evidence: `.qa/market-operate/states/report.json` and `tests.log`.

An initial ad hoc harness used exact label-text lookup for the history select and failed despite the accessible combobox being present in its snapshot. The ignored checker was corrected to use the actual combobox role/name; its initial log is retained at `.qa/market-operate/interactions-initial.log`. Application behavior did not change for that harness failure.

Native Firefox159 at 100% uses a fresh task-owned profile, normal sandbox and loopback BiDi. Both routes/themes at1323,390,320 are checked independently of Chromium; source availability remains actual rather than fixture-controlled. The first native light-phone Tools capture exposed a default bright scrollbar track; the route-scoped scrollbar colors were corrected to copper/transparent and the initial evidence retained at `.qa/market-operate/native-initial/`. Final native verification passed all 12 route/theme/width cases. Both contact sheets and critical full-size images were inspected; the corrected track is copper/transparent. Final native evidence is `.qa/market-operate/native-local/`; owned Firefox/profile processes were cleaned after the runner exited0.

## Limits and handoff

Fixtures do not establish live pricing or current-patch game verification. Native captured observations can contain fresh, stale and missing sides; they do not establish complete city coverage. Existing long control text can truncate inside its labelled input, and narrow task/category navigation intentionally scrolls horizontally while keyboard focus can reach its links. No provider OAuth/payment consent or real saved-account mutation was performed by these design checks.

The parent integration agent owns mandatory `qa:phase`, production-build checks, independent final review and any authorized release. This note is rendered implementation evidence, not owner acceptance or a whole-product release approval.

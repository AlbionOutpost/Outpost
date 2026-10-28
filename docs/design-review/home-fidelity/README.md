# Reference fidelity correction — 2026-10-27

The owner rejected the first professional redesign because its homepage composition did not resemble the supplied images. That rejection is preserved. This correction changes the actual layout rather than treating a palette update as completion. [Five source references](../professional-redesign/references/homepage.png), [previous implementation](../professional-redesign/README.md).

## Implemented layout

- Homepage: larger two-line headline, balanced two-column hero, compact functional market table with tool rail, three distinct short feature previews, guide entry and a separate horizontal research terminal. Header/footer/content gutters align. The hero and lower research panel share selection, region, source observations and request cancellation; there is no second observation fetch for the duplicate view.
- Market: search/quality/city and expandable item/multiple-city filters above the results/context columns, selected-city summary and full-width history below. Existing source timestamps, sort, missing observations and watchlist remain.
- Crafting: recipe/city/quantity configuration, auditable materials alongside four primary result cards, then separate accounting and assumptions panels. The semantic total-profit output remains independently tested. Zero outcomes are neutral; green means a positive result. At320px result cards become one column so currency figures do not split across lines. No engine formulas changed.
- Build Creator: equipment left, contextual ability/variant/swap editing center, actual completeness summary right, item selection in the existing focus-managed drawer. Copy saved link respects existing visibility; it does not publish a private build. Effective IP/combat attributes remain explicitly uncalculated.
- Composition Planner: activity exposed in the main toolbar, role-led party workspace and searchable available-build assignment. Existing save/ownership/import/export behavior remains.

Shared controls and remaining routes inherit the prior centralized system. Inter remains UI type, Barlow remains display type, Geist Mono remains numeric type. Homepage warm neutral surfaces and accessible copper actions follow the reference; workspaces retain the centralized charcoal/orange system. No UI library was introduced.

## Before and after

| Surface     | Before                                                                       | After desktop                                         | After phone                            |
| ----------- | ---------------------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------- |
| Homepage    | [Owner-rejected implementation](before/home-1440.png)                        | [1440px](after/home-1440.png)                         | [390px](after/home-390.png)            |
| Market      | [Previous workspace](../professional-redesign/market-after-1440.png)         | [Actual observations](after/market-observed-1440.png) | [390px](after/market-observed-390.png) |
| Crafting    | [Previous manual scenario](../professional-redesign/crafting-after-1440.png) | [Manual scenario](after/crafting-manual-1440.png)     | [390px](after/crafting-manual-390.png) |
| Build       | [Previous fixture editor](../professional-redesign/build-after-1440.png)     | [Fixture editor](after/build-editor-1440.png)         | [390px](after/build-editor-390.png)    |
| Composition | [Previous fixture editor](../professional-redesign/party-after-1440.png)     | [Fixture party](after/party-editor-1440.png)          | [390px](after/party-editor-390.png)    |

Local Playwright is the permitted browser fallback: the earlier actual MCP navigation was rejected by the never-approval policy. Captures cover320/390/768/1024/1440/1920px. Anonymous editor/settings redirects are recorded as redirects, not working-editor screenshots. Authenticated editor/account captures use ephemeral local sessions and are not Discord OAuth evidence. Real AODP observations and manual calculator inputs are separately identified. Raw manifests/logs remain in `.qa/home-fidelity`.

Desktop and phone images were opened and inspected. Automated manifests found no document overflow in54 public,24 authenticated and12 observed/manual states. Twelve observed/manual market/calculator axe scans found zero violations. Keyboard/dialog, source-state, persistence, authorization and mobile workflow regressions remain in the ordinary production suite. Light-theme emphasis contrast and duplicate preview labels were corrected after an initial failed run. A sticky build toolbar overlap was caught by opening the updated desktop golden and removed before final verification. The first expanded-workspace gate retained75 passing browser checks/five failures (four deliberate equipment image changes and the old inline-browser paging journey); the journey now opens the drawer. Downloaded third-party reference-site archives under `Scrape` are excluded from lint, formatting and container build context while preserving their upstream bytes; no downloaded code is imported into Outpost. Sampled axe/Lighthouse are not full WCAG2.2 conformance or physical-device evidence.

## Deliberate reference differences and remaining limits

The concept contains unsupported live-margin/volume/trust metrics, character/ability artwork and combat attributes. Runtime uses actual observed buy/sell city quotes, source timestamps, named supported abilities and explicit unknown attributes. The lower chart shows available daily sell-order averages, without inventing a buy-price series. The market card uses the existing previously authorized generated courtyard illustration, with legal disclosure; it is not genuine gameplay or official artwork. Other three generated scenes remain archived. [Media provenance](../../assets/OUTPOST_MEDIA_INVENTORY.md).

Broader guide/guild/account functionality remains as previously implemented; this correction concentrates on the homepage and four principal workspaces. Owner visual acceptance, complete patch-verified mechanics, full accessibility/device acceptance, genuine scene rights and real OAuth remain open. Release remains NO-GO. Current automated command results are maintained in [QA_REPORT.md](../../../QA_REPORT.md); container/lab findings and this phase summary are recorded below after completion.

## Verification record

The expanded workspace gate initially failed the archived reference-site lint boundary and five browser checks; these results are retained. After fixes, all10 phase commands passed with156 unit,80 production browser,15 disposable database and9 regional source checks. The final loading adjustment is verified by another ordinary no-update phase gate, rather than treating updated goldens as proof. Current exact timestamps/counts belong to the generated root QA report.

A first local container Lighthouse mobile smoke sample identified homepage LCP4.611s and CLS0.114. Its audit attributed the shift to late Barlow800 loading and identified the large hero image as lazy-loaded. The display font is now preloaded and that above-fold image loads eagerly with high fetch priority, following installed Next docs. This is a narrow delivery change with no intended visual change. Initial artifacts are retained in `.qa/home-fidelity/lighthouse-before-loading`; final samples are recorded below. One sample per build is diagnostic evidence, not a reliable before/after performance comparison or field-vitals claim.

Final production-container checks: non-root UID1000, no copied `.env`, homepage HTTP200 and PostgreSQL/Redis healthy. Owned QA container removed afterward; the separate local preview remains running at `http://localhost:3100`. Actual Discord OAuth remains unconfigured.

| Final single mobile lab sample | Performance | Accessibility | LCP    | CLS   |
| ------------------------------ | ----------- | ------------- | ------ | ----- |
| home                           | 88          | 100           | 3.930s | 0.000 |
| market                         | 95          | 100           | 2.856s | 0.000 |
| crafting                       | 95          | 100           | 2.858s | 0.000 |

All three sampled LCP values miss2.5s; homepage performance88 misses90. The latest samples show CLS0, but do not establish field stability or a statistically supported speed improvement. No field INP, load test, full accessibility conformance or release approval is implied. [320px results review](after/crafting-manual-320.png). All10 final phase gates pass, including156 unit tests,80 browser tests,15 disposable database checks and9 regional endpoint reads. Initial failures remain in the local phase logs.

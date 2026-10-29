# Codex-ready Phase A — Market and Builds

29 October 2026. Local implementation only; no deployment or GitHub push is authorized for this phase. The original brief, full audit, 45-template CSV and all eleven supplied contact sheets were reviewed from `Outpost_Codex_Ready.zip`, safely extracted into `.qa/codex-ready-2026-10-29`. The historical screenshots describe the starting application; they are not the desired redesign. Current executable behavior and verified records remain authoritative. The package's hosted-CI status is dated; current root release reports govern acceptance.

## Implemented behavior

- Market has one selected-item identity and a precise next action. Compare remains explicit. The full-width results table precedes optional city details; Research and Watchlist remain available without becoming the page's main structure. Real source failures, missing quotes, different qualities and independently timestamped buy/sell sides remain distinct. A disabled-until-hydrated fieldset prevents apparent first clicks from being lost before handlers exist.
- Build Library keeps search visible on phones, uses compact weapon-led rows, makes Library/Community/My Builds/device favorites clearer, and collapses secondary filters. Real taxonomy counts, sorting, page/region URLs and save/reload behavior remain. The same 24 source records remain on a page; no invented popularity, account state or statistics.
- Library and account Build Detail share one ten-slot anatomical inventory and one contextual inspector. The duplicate ten-row rail and oversized completeness summary are removed. Gear selection updates authentic abilities, quality and exact-region market links. On phones it focuses the inspector and provides a return to equipment. Other equipment abilities, configured alternatives, author traits, facts and strategy use explicit disclosures. Fragment navigation opens the right disclosure and selects the right slot; direct links, history and re-opening the current anchor have browser regressions. Cost remains on demand; private reads, revisions, independent copies and composition actions retain existing services.

The navy/copper tokens, established typography, source gear/spell renderer, account sessions and databases remain. No schema, formula, authentication or backend-market policy change is part of this milestone.

## Before and after

| Route           | Desktop before                  | Desktop after                  | Phone before                  | Phone after                  |
| --------------- | ------------------------------- | ------------------------------ | ----------------------------- | ---------------------------- |
| Market Explorer | [1440](before-market-1440.png)  | [1440](after-market-1440.png)  | [390](before-market-390.png)  | [390](after-market-390.png)  |
| Build Library   | [1440](before-library-1440.png) | [1440](after-library-1440.png) | [390](before-library-390.png) | [390](after-library-390.png) |
| Build Detail    | [1440](before-detail-1440.png)  | [1440](after-detail-1440.png)  | [390](before-detail-390.png)  | [390](after-detail-390.png)  |

Initial measured geometry used the unchanged compiled Node production baseline (`Qe82Z52BhnKYP2B1h-o3S`, source baseline `a154d88`) and a development preview. These are render measurements, not Worker CPU, loading or field-performance improvements. Final production outcomes are recorded below; source comparison fixtures remain separate from the real-source screenshots.

| Initial measured phone outcome                    | Before |                    Development preview |
| ------------------------------------------------- | -----: | -------------------------------------: |
| Compare button top                                |  478px |                                  414px |
| Market table top, same three fixture observations |  872px |                                  769px |
| Library document, same 24 records                 | 6840px |                                 4203px |
| Library card height                               |  239px |                                  135px |
| Library first card top                            |  508px |                                  449px |
| Detail document                                   | 6372px |                                 3185px |
| Detail inspector top                              | 1172px | 923px, before explicit selection focus |

The library's desktop first card moves from394px to450px because visible search occupies the main workspace. Shorter cards reduce the overall page; a faster desktop first result is not claimed. Compact cards intentionally preview primary armor/spells; complete gear remains in detail. Deeper read-only content is collapsed, never deleted.

## Verification and retained failures

Targeted development journeys passed: seven Market checks, four library/save/filter journeys plus a light-theme follow-up, and two detail anatomy/navigation journeys. The detail journey checks all ten slot coordinates at320/375/390/768/1024/1440/1920 and exact item-quality-region links. Sampled axe reports are separate from full accessibility conformance. The final production run includes inspector-focus, alternative icon geometry and direct-fragment viewport regressions.

Two early Market runs exposed pre-hydration submit/select gaps; the real-chunk-pause test now covers the fieldset guard. The first full gate was intentionally interrupted after successful type/lint/unit/data/database/build checks when independent browser review found an alternative-slot fragment below the viewport. The original `toBeVisible` assertion correctly described visibility but missed position; an added `toBeInViewport` assertion now checks the actual user outcome. The second completed run passed127/129 browser journeys: source metadata needed the new disclosure-open actions, and the active item’s ability text was still duplicated in the secondary overview. The overview now excludes the selected item and the fidelity test opens recommendations/strategy before checking the same three traits, creator URL and independent copy. Both the evidence and interrupted run remain under `.qa/codex-phase-a` and `.qa/phase-a-market`.

Browser MCP is unavailable in this environment (approval restriction / missing installed Chrome). Actual captures and interactions use the permitted installed sandboxed Playwright fallback. No disabled browser sandbox, mocked production records, synthetic OAuth consent or cloud deployment is claimed.

Production Node gate: all10 checks PASS (396 unit,129 browser,15 disposable database,nine regional reads). Final production matrix covers27 public states across320/375/390/768/1024/1440/1920: all routes200, no logged runtime errors, document overflow, missing visible renderer artwork or sampled axe violations. Actual real-source comparison returned8 city rows, preserving stale timestamps and Black Market purchase-side rules. [Desktop source comparison](market-1440-real-source-comparison.png), [phone source comparison](market-390-real-source-comparison.png), [focused phone inspector](detail-390-helmet.png), [alternative deep link](detail-390-alternative-deep-link.png).

A final CSS review corrected an inherited one-third-width alternative panel and wrapped its two spell icons into one readable row. The exact final source passes all ten phase checks again, including the added geometry regression. A fresh isolated-config Docker image is healthy/nonroot and contains no `.env`. Initial Docker/CLI defaults could not write their read-only global config locations; task-local config paths resolved those restrictions without changing global settings. The current three initial mobile Lighthouse lab samples score90/91/90 with LCP3.460/3.351/3.462seconds and CLS0; all remain above the2.5second LCP target. They are single samples, not a measured improvement, field p75, INP, conformance or Worker CPU proof. The Cloudflare build succeeds; all129 local Cloudflare browser journeys and20 native database/service checks PASS. This is not deployed-Free CPU/D1-load evidence or hosted CI.

## Changed responsibilities and evidence

- Market: `src/components/market.tsx`, its locally imported `market-explorer.css`; Market first-use/research/watchlist e2e coverage. [Focused evidence](../codex-phase-a-market.md).
- Discovery: library/community route composition, discovery header/search, family select, mobile filter panel, compact library cards, `builds-discovery.css`; new compact-library journeys. [Focused review and deliberate tradeoff](../phase-a-library/README.md).
- Detail: `build-detail-workspace.tsx`, `build-detail-navigation.tsx`, `build-detail-header.tsx`, optional inventory anchor prefix, `builds-detail.css`, library/account detail routes; detail/verified-builds/ownership journey selectors preserve exact behavior assertions.
- Full exact changed-source list: `.qa/codex-phase-a/changed-source.json`. Before/after geometry and screenshot manifests remain under `.qa/codex-phase-a`, `.qa/phase-a-library` and `.qa/phase-a-market`.

## Remaining phases and acceptance

[Route matrix](route-matrix.csv) retains all 45 original tasks and distinguishes this bounded milestone from work not yet performed. Phase B covers editor/abilities/spares and compositions; C covers calculator readiness and independent accounting; D covers page-specific Teams/account/guides/items/journal/feeds/timers/shopping/admin/legal; E covers genuine OAuth, patch/rights, recovery, operations and controlled Cloudflare load/cost evidence.

Owner visual acceptance, physical devices, complete assistive-technology/zoom testing, full current-patch data, real multi-account Discord consent/admin/expiry, legal operator decisions, production restore/rollback and measured Worker CPU/D1 budgets remain open. The existing whole-product NO-GO remains authoritative. No blanket “perfect”, complete redesign or production-readiness claim follows from these changes.

Final matched production documents are1230/1613px for Market (desktop/phone),2292/4203px for Library and2187/3213px for Detail. Library phone height falls38.6%; Detail phone height falls49.6% with its deeper content collapsed rather than removed. First-use inspection becomes explicit; page length alone is not a performance or owner-acceptance metric.

Six settled production-container light-theme states have zero sampled axe violations/overflow and were inspected. [Phone library](library-390-light.png), [Market](market-390-light.png), [Detail](detail-390-light.png). The owned/private fixture demonstrates all ten genuine item slots and owner actions at [1440](account-detail-1440-fixture.png) and [390](account-detail-390-fixture.png); it is explicitly labeled QA and removed after capture. Exact Asia/Outstanding-quality main-hand links are checked. The outsider API returns404 and streamed HTML omits the private title and includes `noindex`. Installed Next documentation explains streamed not-found UI can retain HTTP200; the initial capture harness wrongly demanded404 HTML, and its failed assertion is retained. The corrected check verifies actual privacy plus the API status. An initial desktop capture taken before item images finished is also rejected; the final capture explicitly waits for artwork. All owned preview/test servers and the container are stopped after review.

The Impeccable mechanical detector returned no findings on the initial detail changes; subsequent source changes were behavior/geometry corrections verified in production. Its context tool notes legacy PRODUCT.md schema, which is documentation drift and was left outside this task; no hooks, telemetry, global config or upstream skill installation was enabled.

An exploratory guest-preview shortcut script timed out looking for an inline Fiend Cowl alternative that the copied draft stores as a named spare set instead. This is a rejected test assumption, not a proven record-loss regression; the full guest copy/spare-set/export journeys pass. Preview-specific action context, including its inherited cost anchor without an in-dialog cost panel, remains Phase B work; it is not counted as accepted by this milestone.

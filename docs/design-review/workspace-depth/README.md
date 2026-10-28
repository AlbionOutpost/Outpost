# Shared controls and workspace depth — 2026-10-27

Owner feedback: the landing page is acceptable directionally, but header controls, hover motion and the rest of the product need deliberate work. This implementation preserves that landing composition and works on real tool/editor/content surfaces. [Five visual references](../professional-redesign/README.md), [preceding homepage correction](../home-fidelity/README.md).

## Concrete changes

| Surface                          | Implemented change                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Shared header                    | Custom select-only region combobox/listbox, current selection/check, keyboard arrows/Home/End/type-ahead/Enter/Escape/Tab, outside dismissal; existing query/cookie persistence preserved. Compact search trigger, single sun/moon control, Sign in label, neutral menu surfaces. Removed inherited button/card hover scaling and press movement at their sources. |
| Crafting / refining / enchanting | Real supported recipe/equipment browser, tier choices, authentic equipment identity, central settings/material accounting, right results with primary total profit, upfront silver/cash profit/retained-return value. Mobile item drawer preserves focus and existing three-step task flow.                                                                        |
| Transport                        | Existing item-search infrastructure, authentic selected cargo, route summary, named quality choices, explicit capacity/weight/trips, neutral unavailable/zero results. Existing manual weight/fees/risk and persistence retained.                                                                                                                                  |
| Manual trade                     | Clear result heading and semantic positive/negative/zero treatment; removed value-triggered decorative animation.                                                                                                                                                                                                                                                  |
| Market                           | Recent sell-observation count, plain buy/sell order explanation and UTC context above the comparison table. Actual timestamps and missing/stale states retained.                                                                                                                                                                                                   |
| Build editor                     | Activity moved into primary command bar, preserving saved content type, visibility, revision and share actions.                                                                                                                                                                                                                                                    |
| Composition                      | Explicit Edit loadout affordance on editable party slots, alongside existing role/assignment/gear/saved-build workflows.                                                                                                                                                                                                                                           |
| Guides                           | Distinct page title, editorial list with dividers, readable article width/type and progressive disclosure instead of repeated dashboard cards.                                                                                                                                                                                                                     |
| Guild discovery                  | Compact roster-style entries, readable descriptions, consistent footer actions and membership context.                                                                                                                                                                                                                                                             |
| Account settings                 | Section navigation and stacked profile/data sections with bounded forms; existing authentication/export/deletion rules retained.                                                                                                                                                                                                                                   |

Other routes inherit the shared header/control changes; this is not a claim that every feature has been rebuilt. No schema, permissions, migration, game dataset or formula engine was changed. No source code, community content, marketing figures or imagery from the scraped sites was imported into runtime.

## How the Scrape archives informed the implementation

Reviewed `Scrape/albionutil.com/report/HANDOFF.txt`, its live selected-Broadsword and mobile calculator screenshots, and `Scrape/albiononlinegrind.com/report/HANDOFF.txt`, craft-planner/build/price screenshots and named dataset/API inventories. These are dated captured evidence, not a new live crawl. Archive counts were checked directly:234 Util families;11,383 Grind catalog entries;10,770 public builds;682 group builds;23/34 described HTTP operations. Private/backend schemas are proposed, and account planning screens include explicitly marked fixtures.

AlbionUtil establishes a useful browse/settings/materials/journals/profit/plan journey; Grind establishes multiple recipes, consolidated materials, cargo capacity and separate character mastery state. Outpost now uses the useful recipe/result/cargo anatomy. Full journals, multi-recipe planning, character mastery sheets, nutrition-based station charges and broader recipe coverage remain separate missing work. The current recipe browser exposes only the existing supported45 crafting/25 refining records and supported enchantment families.

Calculation differences are material: Util ceilings returned-material consumption and rounds item fees per unit; Grind has caller-specific fee arithmetic and nutrition-based crafting fees. Outpost currently buys gross recipe materials, separately values retained returns, applies supplied transaction percentages, and uses manually entered silver-per-craft fees. We preserve that declared model and show gross quantity/upfront cash/cash profit/return credit explicitly. Neither archive is silently promoted to current-patch verification or substituted into existing engines.

Independent new drawer journey: one Broadsword craft at Bar100/Leather200/output5000, zero supplied fees/returns gives16×100+8×200=3200 upfront and1800 profit. Existing formula, source-identity, stale/missing/manual override, saved-scenario and negative authorization regressions remain required.

## Browser and QA evidence

An actual Playwright MCP navigation returned “MCP tool call requires approval, but approval policy is never.” Installed local-library Playwright is the permitted fallback. Development inspection uses the configured localhost origin; an initial127.0.0.1 dev capture was rejected by Next dev-origin protection and was not accepted as functional evidence. No browser or origin restriction was disabled.

Baseline public screenshots were captured from the preceding running production build. Final captures distinguish anonymous redirects, ephemeral authenticated fixtures, actual observations and manually priced calculator examples. Fixture sessions are not Discord OAuth. Images and command results below are completed after the final gate; owner acceptance, full screen-reader/device conformance and performance targets remain independent.

## Review corrections retained

The first full gate had74 browser passes/nine failures: shared search accessible-name mismatch appeared across multiple route audits, recipe-tier accessible labels did not include visible T4–T8 text, light selected-tier contrast failed, and one320px equipment golden had264 changed text pixels. Visible labels/accessibility names now agree, selected tiers use a contrasting light-mode foreground, and the equipment image was opened before accepting its small text-raster update. Existing assertions and axe rules were retained. A final transport initial-state correction replaces a large Unavailable result/table with an actionable Price your cargo state; calculations still require complete inputs.

The Impeccable mechanical detector returned no findings for the reviewed changed targets. Its context loader reported a legacy PRODUCT.md schema; that optional metadata migration was not performed. This does not replace rendered acceptance or full source review.

The second ordinary production run passed82/83 browser checks. The remaining custom-menu scan caught transient contrast during its fade-in; menus now appear at full opacity immediately, while controls retain surface/color hover feedback. This failure is retained rather than weakening the contrast assertion. Final ordinary no-update results are recorded below.

## Before and after captures

| Surface         | Before                                                           | After desktop                                                                               | After phone                                     |
| --------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Header controls | [Previous header](before/home-1440.png)                          | [Custom region menu open](after/region-open-1440.png)                                       | [390px menu](after/region-open-390.png)         |
| Crafting        | [Previous setup](before/crafting-1440.png)                       | [New setup](after/crafting-1440.png), [manual result](after/crafting-manual-1440.png)       | [Manual result](after/crafting-manual-390.png)  |
| Refining        | Existing production layout                                       | [Supported resource browser](after/refining-initial-1440.png)                               | [390px](after/refining-initial-390.png)         |
| Enchanting      | Existing production layout                                       | [Equipment/path workspace](after/enchanting-initial-1440.png)                               | [390px](after/enchanting-initial-390.png)       |
| Transport       | [Previous form](before/transport-1440.png)                       | [Initial state](after/transport-1440.png), [manual result](after/transport-manual-1440.png) | [Manual result](after/transport-manual-390.png) |
| Build editor    | [Previous fixture](../home-fidelity/after/build-editor-1440.png) | [Visible activity](after/build-editor-1440.png)                                             | [390px](after/build-editor-390.png)             |
| Composition     | [Previous fixture](../home-fidelity/after/party-editor-1440.png) | [Party editing](after/party-editor-1440.png)                                                | [390px](after/party-editor-390.png)             |
| Guides          | [Previous cards](before/guides-1440.png)                         | [Editorial index](after/guides-1440.png)                                                    | [390px](after/guides-390.png)                   |
| Settings        | [Previous fixture](before/settings-auth-1440.png)                | [Section navigation](after/settings-auth-1440.png)                                          | [390px](after/settings-auth-390.png)            |

Manual result captures use supplied prices, not live quotes. Authenticated captures use ephemeral local QA records. Initial captures taken during smooth-scroll/focus changes were replaced after waiting for the target to focus and resetting the scroll instantly; they were not accepted as settled layouts. Desktop/phone images and six-width contact sheets were opened and inspected.

Final production capture manifests record78 public route/viewport combinations,24 authenticated item/editor/settings combinations,18 production-calculator states and6 manual-transport states at320/390/768/1024/1440/1920. All have zero document overflow. The18 calculator,6 transport and2 light-search states have no sampled axe violations; ordinary production tests add broader route/theme/keyboard/authorization coverage. Anonymous redirects remain redirects. No physical device, full screen-reader or WCAG conformance claim.

## Final commands and limitations

`npm run qa:phase` on Node22/local services passes all10 commands:156 unit tests,83 production browser tests without updating snapshots,15 disposable database checks and9 regional endpoint reads. Types, lint, build and advisory checks pass. Two pre-existing unused-variable lint warnings remain. `python3 scripts/test-docs-validation.py` passes17 checks; current source/bundle scans have zero configured-secret matches within their declared scope. Generated root reports, strict documentation validation and rebuild inventory are reconciled with this phase.

Fresh Docker image runs as UID1000, contains no copied `.env`, serves homepage HTTP200 and reports PostgreSQL/Redis healthy. OAuth is not configured. The owned QA container is removed after measurement; the separate local preview remains at `http://localhost:3100`.

| One final container/mobile lab sample | Performance | Accessibility | LCP    | CLS   |
| ------------------------------------- | ----------- | ------------- | ------ | ----- |
| home                                  | 89          | 100           | 3.774s | 0.000 |
| market                                | 91          | 100           | 3.475s | 0.000 |
| crafting                              | 95          | 100           | 2.861s | 0.000 |

All sampled LCP values still miss2.5s and homepage performance89 misses90. These are single local lab samples, not a controlled before/after speed comparison, field INP or conformance certification. The remaining full planner/journal/mastery/game-data, OAuth, genuine-scene rights and owner acceptance gates stay open. Release remains NO-GO.

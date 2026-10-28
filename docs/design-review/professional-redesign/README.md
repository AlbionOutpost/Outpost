# Supplied five-reference redesign — 27 October 2026

The five owner-supplied reference images are the visual authority for this implementation: [homepage](references/homepage.png), [market](references/market.png), [build and composition](references/build-composition.png), [crafting](references/crafting.png), [UI system](references/ui-system.png). They are review artifacts, not runtime game artwork.

## Implementation

Shared `reference-system.css` centralizes cool charcoal surfaces, orange actions, readable Inter workspace headings, Barlow display personality on the homepage, Geist Mono numbers, 6px controls, 8px panels, visible focus and separate semantic states. Existing light mode remains supported. The header orders Tools, Builds, Comps, Guides, Guilds and Market, with search, region, theme and Discord/account access. No UI library or dependency was introduced.

Market has a desktop tool rail, comparison workspace, selected-city details, multi-city checkboxes and removable chips, reset, existing item/quality/category/tier/enchantment controls, and a separate full-width history area with readable price-axis labels, a series legend and 7/30-day controls. Historical windows explicitly end at the latest returned observation, rather than implying fresh coverage. Existing regional watchlists, research lists, source dates and stale/missing data remain. Selected-city buy and sell timestamps stay independent.

Crafting, refining and enchanting retain the existing engine and price identity. Recipe, city/assumptions and quantity are separate setup panels. Recipe search filters the existing supported list. Materials use an auditable table with quantity, unit price, total, price source and return eligibility. Complete results expose actual profit/output, total profit, cost/output and revenue-based margin, plus expandable whole-run accounting. Advanced station/focus/source assumptions remain available. Mobile retains the existing recipe/pricing/results steps and scenario controls. No new game coefficients were inferred.

Build editing places equipment left, item browser center, and equipment abilities/swaps right. Selecting a slot opens the searchable contextual equipment drawer; native dialog focus trapping, Escape dismissal and focus return are retained. On phones the picker fills the screen. Existing templates, spare sets, revisions, manual IDs and save flows remain. Compositions use a horizontal five-player board, explicit role counts and assignment readiness. Larger groups retain their roster and contextual member dialog. A searchable available-build rail assigns an accessible saved loadout to a chosen party slot through the existing API. Asynchronous copies remain bound to the original slot even if selection changes. Role counts do not claim game-specific activity validation.

Homepage uses a compact two-column introduction with a real searchable market preview, prioritized Explore Tools/Browse Builds actions, and three distinct entry cards. Mobile puts core destinations before the optional product preview. No invented live figures, popularity, scene artwork or fake ability icons are added. Guides, guilds, item reference, account, settings and other tools inherit shared controls/tokens while keeping their existing page-specific workflows.

## Environment and evidence

The actual Playwright MCP navigation call returned `MCP tool call requires approval, but approval policy is never`. All new browser artifacts use the permitted **local-library Playwright fallback**. Initial captures used Next dev on `127.0.0.1:3100`; final production verification is recorded below. Node is v22.23.4; local PostgreSQL and Redis were available.

Raw before captures: `.qa/professional-redesign/before` (1440×900 and 390×844). Raw after matrix: `.qa/professional-redesign/after`, at widths 320,390,768,1024,1440,1920. Heights: 844 on phones,900 on tablet/desktop; authenticated 1920 captures use1080. Manifests retain route redirects. The anonymous before captures of `/builds/new`, `/compositions/new` and `/settings` are sign-in screens and **are not editor baselines**. Authenticated after captures use isolated temporary fixture records deleted after capture; these sessions are not Discord OAuth evidence. Existing historical editor goldens remain separate baseline evidence.

Representative portable images and final command results are added after the final rendered review. Raw captures are not themselves acceptance; inspected viewport/state evidence and limitations must remain explicit.

## Reference differences and outstanding scope

- Background scenery and ability artwork in the concepts are omitted because no permitted, verified equivalent is established. Real approved item assets remain.
- Observations are dated AODP reports, not streaming executable offers. Missing volume, history or combat statistics remain unavailable; no concept numbers are copied.
- The market compares one selected item's cities, with the existing multi-item shortlist available separately. It does not claim the concept's unsupported multi-item analytic grid.
- Build browsing is available inline and in a contextual drawer. Build statistics remain limited to supported metadata, not fabricated DPS/IP/health.
- Available builds expose actual titles and assignment controls; unverified role/IP/combat recommendations are omitted.
- Calculator nutrition/quality probabilities and unverified focus/specialization coefficients are not invented. Sensitivity analysis is not implemented. Recipe/current-patch verification remains separate from accounting correctness.
- Global owner visual acceptance, all browser engines/physical devices, full screen-reader/zoom evaluation and real OAuth remain open. Release stays NO-GO while essential gates remain open.

## Final verification and screenshot index

The final source passes all ten Node22 `npm run qa:phase` gates:156 unit tests,79 production browser tests,15 disposable database checks, structural game-data audit, production build, dependency audit and nine bounded regional endpoint reads. Lint exits successfully with two existing unused-variable warnings in unrelated scripts. Rebuild inventory drift checks and17 documentation-validator tests pass. Source/config and built-artifact scans found no configured-secret matches. The Impeccable mechanical detector returned an empty finding list; it does not establish design acceptance.

Production localhost captures use the final standalone build, real AODP observations and deliberately manual calculator prices as separately identified states. The calculator manual fixture is10 crafts,16 bars at100 plus8 planks at50 per craft, output3000, no supplied fees or returns: total profit10,000 silver, profit/output1000, cost/output2000 and margin33.33%. This verifies accounting/display, not current recipe or game-patch correctness. Twelve selected-market/manual-result captures additionally report zero document overflow and zero sampled axe violations across all six widths. Broader screen-reader/physical-device/zoom acceptance remains open.

| Page         | Before                                                                   | Final desktop                                      | Final mobile                               |
| ------------ | ------------------------------------------------------------------------ | -------------------------------------------------- | ------------------------------------------ |
| Homepage     | [1440px](home-before-1440.png)                                           | [1440px](home-after-1440.png)                      | [390px](home-after-390.png)                |
| Market       | [1440px setup](market-before-1440.png)                                   | [Actual dated observations](market-after-1440.png) | [390px observations](market-after-390.png) |
| Crafting     | [1440px setup](crafting-before-1440.png)                                 | [Manual-input result](crafting-after-1440.png)     | [390px result](crafting-after-390.png)     |
| Build editor | Anonymous before route redirected to sign-in; no claimed editor baseline | [Isolated fixture](build-after-1440.png)           | [390px fixture](build-after-390.png)       |
| Composition  | Anonymous before route redirected to sign-in; no claimed editor baseline | [Isolated fixture](party-after-1440.png)           | [390px fixture](party-after-390.png)       |

[Equipment drawer on phone](drawer-after-390.png). Other captured routes: Guides, guild discovery, item catalog/reference and account settings; anonymous and authenticated manifests retain their actual destinations. The populated guild/event journeys are additionally exercised by the existing production suite, rather than claiming the empty public directory capture proves them.

The final visual loop found two defects missed by overflow and axe: inherited tablet styles split the market summary into narrow columns, and an inherited nested phone grid squeezed party labels. Corrected both and added geometry checks before recapturing. This is why automated passes are reported independently from actual screenshot inspection. Earlier failed phase logs remain under `.qa/professional-redesign/initial-phase` and `second-phase`; current logs and final manifests remain under `.qa/professional-redesign`.

Container smoke verifies HTTP200, non-root UID1000, no bundled `.env`, and PostgreSQL/Redis health; auth is explicitly not configured in that smoke environment. Lighthouse results are one bounded mobile lab sample per route, not a performance comparison or field evidence; raw reports and the current summary are `.qa/professional-redesign/lighthouse-*.json`. The2.5s LCP target remains open. No deployment, publication or real OAuth verification was performed.

| Final container mobile lab sample | Performance | Accessibility | LCP    | CLS    |
| --------------------------------- | ----------- | ------------- | ------ | ------ |
| home                              | 96          | 100           | 2.714s | 0.0061 |
| market                            | 96          | 100           | 2.705s | 0.0000 |
| crafting                          | 96          | 100           | 2.707s | 0.0000 |

These are single lab samples with no claimed speed improvement; all three LCP samples exceed2.5s. The final source-frozen phase passes79 production browser tests,156 unit tests and15 database checks. All five root QA reports and project progress records have been regenerated, with the release verdict still NO-GO.

Impeccable context also reported a legacy PRODUCT.md record schema. That record was preserved; its separate `init` workflow was not added to this implementation task.

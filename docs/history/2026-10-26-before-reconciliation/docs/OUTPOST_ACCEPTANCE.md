# Outpost product UI acceptance — 2026-10-26

> Current status: the user rejected the multi-page visual design. Prior scoped PASS entries below describe functionality/history and do not constitute current visual acceptance. The active visual specification and sequential acceptance process are in [docs/design-review](design-review/README.md). Only the homepage is being corrected; later pages remain gated.

Verification applies to implemented workflows, not the complete requested Albion catalog or public release. Screenshots use temporary test records and explicitly labeled equipment examples.

| Requirement                                | Status          | Evidence / limit                                                                                                                                              |
| ------------------------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Slot-first build editor                    | PASS (scoped)   | Three-region item browser / anatomical equipment / selected-item abilities; mobile view switching; saved structured abilities and manual fallback preserved   |
| Inspectable 20-player composition          | PASS (scoped)   | Compact equipment rows, role grouping/density, pointer and keyboard movement, single member dialog; save/reload/import/share/conflicts/permissions tested     |
| Actual equipment artwork                   | PASS (scoped)   | Official renderer images visible in final captures; item names and neutral fallback survive unavailable art                                                   |
| Complete Albion weapon/ability catalog     | NOT IMPLEMENTED | Existing factual starter families only; no invented spells or power values                                                                                    |
| Name-based market selection                | PASS (scoped)   | Keyboard listbox, visual options, category/tier/enchantment filters, city quotes and separate history/details panel; exact IDs remain advanced                |
| Calculator inputs/results layout           | PASS (scoped)   | Distinct assumptions / materials / results on wide screens, with item icons and quantities; responsive single column; unchanged engines and persistence tests |
| Guild activity before administration       | PASS (scoped)   | Overview/Events/Members/Compositions/Builds/Announcements/Settings; event dialogs; member/role/RSVP/share/revision tests                                      |
| Homepage visual discovery                  | PASS (scoped)   | Barlow800 hero, Inter descriptions, interactive labeled starter gear, item-name search, actual item-thumbnail entry points                                    |
| Balanced fonts and shared copper tokens    | PASS (scoped)   | Barlow display; Inter application headings/UI; Geist Mono figures; actual computed-family assertions                                                          |
| Mobile layouts and keyboard interactions   | PASS (scoped)   | 375/768/1440/1920 dark/light matrix; additional320/430/1024 overflow audit; mobile gear/modal/Escape/focus/reorder tests                                      |
| Restrained motion                          | PASS (scoped)   | 160–280ms interactions, selection/reorder feedback and reduced-motion assertion; no infinite decorative effects                                               |
| Behavior and persistence                   | PASS (scoped)   | Node22 qa:phase:57 unit/39 production browser tests, types/lint/build, disposable database/restore, audit and regional checks                                 |
| Authentic environment/feature scene media  | BLOCKED         | No supplied or repository scene assets with verified reuse permission; no generated fantasy images imported                                                   |
| Supplied concept layout guidance           | PASS (scoped)   | Eight-panel concept now supplied and reviewed against actual pages; illustrative artwork is not reused                                                        |
| Physical devices and full WCAG conformance | UNVERIFIED      | Responsive Chromium and tagged axe checks are scoped evidence only                                                                                            |
| Real Discord OAuth                         | BLOCKED         | Missing credentialed verification; test fixture sessions are not OAuth                                                                                        |
| Fresh container / Lighthouse               | BLOCKED         | Docker socket permissions and dedicated-server bind EPERM; `.qa/reference-extra-gates.json`                                                                   |

Before: `.qa/product-ui-before`. After: `.qa/design-review`, `.qa/player-workflows`. Comparison gallery: `.qa/product-ui-previews/index.html`. Research and implementation: [PRODUCT_UI_WORKFLOWS.md](PRODUCT_UI_WORKFLOWS.md). Overall public release remains **NO-GO** for the existing essential product/legal/authentication/operations gates.

## Numbered-reference additions

Small2–7-player parties have simultaneous equipment boards and larger groups retain compact rosters. PNG download, real save/reload, filtered discovery/private exclusion and guide search pass new production browser tests. Community cards show actual equipment, authors and revision dates; favorites/moderation remain existing protected workflows. Guild identity uses original typography/monogram; no false scene banner. PNG download uploads nowhere. Composition discussion follows the loadout. Mobile build filters collapse before results.

Reference comparison gallery: `.qa/reference-review/index.html`; actual download: `.qa/reference-review/composition-export.png`; screenshot before: `.qa/reference-before`. The earlier missing-reference gate is closed by the new attachment. Licensed environment/ability scene assets, full game-data coverage, actual OAuth and existing release gates remain open. Public release stays NO-GO.

# Grind recovery and equipment-led redesign

Owner request,28 October2026: inspect the supplied Grind/AlbionUtil captures, restore paid/public features and owned content, and replace the oversized form-led build editor with an immersive equipment/ability workspace. Preserve the accepted homepage, Outpost typography/palette and actual game/source identities.

The owner confirmed ownership and authorized old-page republication. [Feature ledger, sources and remaining scope](../../engineering/GRIND_FEATURE_RECOVERY_2026-10-28.md).

## Baseline and direction

The actual supplied empty editor and populated Battleaxe reference were opened. Local-library baseline captures are `.qa/grind-rebuild/before/builds-new.png`, `builds-new-mobile.png`, `builds.png`, `guides.png` and `tools-crafting.png`.

Observed baseline: ten repeated select rows consumed most of the page, ability editing lived in a separate lower panel, import controls dominated the header, and an empty grid conveyed little of the selected gear. The direction keeps authentic equipment/spell artwork prominent, uses compact recommended/alternative rows, reserves detailed controls for intentional editing and makes recovered articles/builds directly browsable.

Implemented surfaces: equipment editor and saved/recovered loadout detail; server-filtered build/composition libraries; guide discovery/reading; cooking/alchemy recipe destinations; shared tool/menu additions. Existing account mutation, origin, revision, membership and no-store rules are unchanged.

## Browser environment

Playwright MCP navigation returned `MCP tool call requires approval, but approval policy is never`. Browser evidence uses the project's permitted installed local Playwright library, without weakening the sandbox. Initial captures were dev-mode; final phase/acceptance evidence must be labelled production. Tool exposure is not an MCP success.

The first focused run exposed actual320px import-control overflow, insufficient alternative-label contrast, mismatched visible/accessibility names and missing modal search focus. These were corrected in the component/layout. Existing selectors were updated to follow the new visible item browser while retaining persistence, spare-set, authorization, revision and screenshot assertions.

The first full phase passed all checks except browser:88 browser cases passed; six failed (four intentional equipment visual-baseline differences, an old spare-set swap selector and the tool-directory count after adding cooking/alchemy). Evidence is preserved under `.qa/grind-rebuild/phase-one-failed`. The six deliberately changed equipment/navigation goldens were opened and inspected before an ordinary no-update rerun. No failing authorization or formula assertion was removed.

## Acceptance and remaining work

Representative first captures `.qa/grind-rebuild/detail-fixed.png`, `editor-imported.png`, `guides.png` and `guides-fishing-leveling-guide.png` were inspected. A legacy high-specificity detail rule had inverted the intended equipment/overview widths; it was corrected and recaptured. Images in early dev captures were still loading and do not establish complete artwork availability.

Final viewport/state, contrast, image readiness, actual interactions and production container/Lighthouse results are recorded in the current phase evidence after capture. The narrow overview disclosure remains a tracked visual discrepancy until its responsive selectors are corrected and inspected. All historical content remains labelled, journal/fishing widgets are not implied by static article import, and current-patch/owner acceptance remains open. Release remains NO-GO.

## First functional milestone verification

Final ordinary phase passes all ten gates:173 unit tests,95 browser cases,15 disposable database checks and nine regional reads. Final production standalone capture at `.qa/grind-rebuild/phase-one-final-visual/manifest.json` contains66 cases across the eight affected route states and six widths, with zero document overflow, page exceptions or sampled axe violations. The previous66-case capture retains ten automated failures; corrections are recorded above. Eight six-viewport sheets were opened and inspected with actual equipment/spell art. Deliberate deterministic goldens use masks only for pixel stability.

Manual inspection additionally found the generic global60px header height clipping the reading title/meta on phones, and duplicated production navigation. These are next-phase corrections, so visual acceptance stays PARTIAL even after the automated checks pass. Mobile editor metadata also needs a denser first viewport. No owner acceptance or full conformance claim.

Current Docker image builds with a task-local config because the default buildx activity directory is read-only. No global configuration was overwritten. The image runs as UID1000 without an embedded `.env`; PostgreSQL/Redis health and home return successfully. Lab samples are recorded separately under `.qa/grind-rebuild/lighthouse-phase-one-summary.json` and are single initial-route mobile observations, not field metrics or claimed speedups.

## Journal, fishing and editorial follow-up

The next phase restores32 actual local cover/instructional images, a featured guide story, a working journal and dedicated fish conversion/fame tools. The inherited60px article header now grows naturally. Phones use a collapsible contents menu, production tabs are shared once, and copied builds skip the generic setup banner. Draft status reflects equipped items instead of claiming the copied loadout is empty. The mobile overview/source details are more compact; current typography/palette and the accepted homepage remain intact.

Journal progress is browser-local and regional, with search/reward text/category/hide-completed filters, pagination and validated backups. Other-region/forged/duplicate/oversize/extra-field backups are rejected before replacement. Downloaded backups retain only version/region/objective IDs. Import cancellation preserves existing progress. Fishermen can compare whole-fish and chopped proceeds, net cash profit and opportunity difference, or enter a target-fame budget. The independent arithmetic/source assumptions are in the [ledger](../../engineering/GRIND_FEATURE_RECOVERY_2026-10-28.md); mock prices and manual numbers are explicitly fixtures, never live observations.

First ordinary phase retained two changed navigation-golden failures. Deliberate three equipment/two navigation changes were opened and inspected before updating the corresponding baselines. A subsequent run was interrupted; another exposed test isolation problems from its two owned fixture accounts and globally counted saved-build list items. Those exact fixture accounts were fingerprint-checked and cleaned without touching user data. Discovery now uses a unique per-run label, and roster assertions target the named Comp roster. All authorization/persistence assertions remain. The focused isolation retest passes4 cases; complete ordinary rerun results are in the generated root reports. Failure logs remain under `.qa/grind-recovery-two/first-phase-failures` and `fixture-isolation-failure`.

One standalone capture overlapped a build and included blank/loading pages despite clean geometry/axe output. It remains under `visual-final` as incomplete evidence. Retaken captures use the isolated current production Docker image and require the route heading before collecting fonts/images. The final `.qa/grind-recovery-two/visual-complete/manifest.json` contains96 cases across10 routes/states at1440×900,1920×1080,768×1024,390×844,375×844 and320×844, including selected light themes. No document overflow, page exceptions, failed visible images or sampled axe violations were observed. All ten six-viewport sheets and representative actual desktop/mobile/light images were opened; real art is unmasked. This is a local-library fallback, not MCP evidence, field performance or complete accessibility conformance.

Manual review found the journal introduction too tall before the objectives. Source/progress explanation now lives in a disclosure; objectives enter the initial phone viewport. Light-theme full-page review additionally found inherited global definition-list flex rules squeezing labels beside monetary values. Fishing result cells now stack labels and values, preserving readable totals and units; recaptured in both themes. Long guide prose and mobile calculator accounting still require scrolling. Full owner visual acceptance and untouched older page bodies remain open; no subjective whole-site completion claim.

The current container is UID1000, excludes `.env` and passes dependency/home checks. Single initial mobile Lighthouse samples are `.qa/grind-recovery-two/lighthouse-phase-two-summary.json`: guides88/journal92/fish93/reading93 performance,100 sampled accessibility each, CLS0 and LCP3.15–3.83s. Every sample still misses the2.5s LCP target; there is no measured speedup or field claim. Genuine Discord OAuth remains unconfigured. Release stays NO-GO.

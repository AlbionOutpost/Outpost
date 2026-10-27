# Composition reference correction

Status: IN PROGRESS. Reference03 QA-only panel [reference.png](reference.png),364×576 from supplied montage. This is design guidance, not actual game artwork.

Regions: compact top nav around32px; title/save/export controls y85–149; five loadout cards in the middle, each a3×3 grid, roles above, central composition title; compact player-assignment strip near bottom. At real desktop size use readable Inter labels, genuine item icons and dedicated member editing. For20 players keep compact grouped roster, not20 permanent forms.

Baseline fixture: `.qa/composition-correction/00-baseline/`, with populated5-player and20-player private records at1440×900 and390×844. All participants are explicitly named QA players and repeat supported starter equipment to test layout, not recommend a real combat meta. Food/Potion remain unsupported and empty; no invented game facts.

Five baseline differences to inspect: excessive configuration before loadouts; generic equal columns without central party identity; large margins/padding inside every member; mobile tiny two-column boards; save control remote from main editor actions. Existing reorder/permissions/persistence must remain passing.

The PNG export now has a tested1920×1080 option for up to20 players; larger groups retain full-height mode to preserve readability. Offhand and mount added to nine-slot exports. Bitmap resources close even if export fails. Actual image review and20-player download regression are required; no full export acceptance based only on file dimensions.

## Iteration01 — rendered review

Viewed actual populated five-player desktop/mobile boards and the20-player1920×1080 PNG. Five complete3×3 grids now surround a central title; mobile retains all nine cells beside role/assignment rather than silently hiding offhand/cape/mount. Top Save remains reachable; former sticky bar no longer obscures equipment. Existing20-player roster remains functional.

Five differences to correct: board starts aroundy385; duplicate settings padding and export label add vertical slack; two rows of player cards are still about615px high; small captioning/large blank areas waste space in20-player PNG cards;320px populated states need separate verification. Iteration02 compacts these without fabricating unsupported consumables or changing roles/permissions. The first baseline test failed because the new test looked for create-save text on an edit route; corrected to the actual revision action. Failed logs remain under00-baseline/gate-failed. Full iteration01 gate passes68 units/45 production browser tests.

## Iteration02 — rendered review

Viewed5-players-1440.png, board-320.png and actual20-player-export-1080.png under `.qa/composition-correction/02-density-and-export/`. Desktop five-player workspace now begins aroundy335 and endsy897, so all loadouts fit900px. The320px fixture has readable role/player labels and all nine equipment cells; no document overflow. Twenty-player PNG uses two equipment rows per card instead of a tiny one-row strip, improving actual item recognition. Full gate passes68 units/45 browser tests.

Five remaining differences/risks: layout switching is buried in settings; mobile completeness fix initially covers only five players;7-player board needs populated verification; unsupported consumables remain empty; no verified role-specific template catalog, central game crest or authentic ability assets. Third pass brings view switching directly beside export and tests populated7-player/mobile states. Source-dependent missing elements remain explicit, not invented.

## Iteration03 — review found a capture defect despite passing tests

Viewed five-player desktop, populated seven-player320px and20-player390px captures. Five/seven-player boards retain nine visible cells and the view switch is directly available. However,20-player screenshots captured the route loading skeleton: assertions for values/counts matched server-streamed hidden HTML before the boundary became visible. The later PNG interaction waited for visibility and exported real content, so this was not evidence of a broken roster, but those screenshots are NOT accepted rendered-page evidence.

Corrected the capture test to require the composition title and actual roster to be visible. Keep iteration03 artifacts as evidence of the review defect; iteration04 recaptures the same deterministic fixtures. This is why test PASS alone cannot establish visual acceptance.

## Iteration04 — actual visible roster recapture and final scoped gate

Inspected `20-players-1440.png` and `20-players-390.png` under `.qa/composition-correction/04-visible-streaming-captures/`: they now contain the actual20-member equipment roster, not a skeleton. Also retained board-5/board-7 captures at1440/390/320 and the actual20-player1920×1080 image. Side-by-side reference/viewports are comparison-1440.png and comparison-390.png in the same folder; original aspect ratios are preserved.

Final full gate passes68 unit/45 production browser tests plus types/lint, migrations/restore, production build, dependency audit and bounded regional checks. Five-player edit/save/reload, direct board/roster switching, populated seven-player completeness and twenty-player wide PNG dimensions/download are verified. Existing ownership/group revocation,20-player pointer/keyboard reordering, conflict handling and JSON regressions remain passing.

Remaining differences: small-party card geometry follows a balanced two-row arrangement rather than the concept’s exact radial positions; no central fantasy crest is fabricated; full role-specific templates/catalog/consumables and ability artwork remain unavailable; mobile uses stacked nine-cell cards rather than a cropped miniature desktop board; more than20 players use full-height export. These are explicit full-feature/asset gaps, not complete visual/product acceptance. Backend persistence and authorization were retained.

# Profit calculator workspace correction

Status: three rendered correction iterations reviewed for the implemented starter modes; full-product acceptance remains OPEN. Reference05 QA-only crop [reference.png](reference.png),419×381. The concept prioritizes item configuration, material quantities/costs and a distinct profit breakdown. The latest master prompt explicitly asks for left inputs / center materials / right results, so the desktop uses that three-region hierarchy rather than literally copying the concept’s two-column/result-below arrangement.

Historical default screenshot `.qa/design-review/_tools_crafting-1440.png` shows nested material cards and long explanation blocks. New matched populated baseline00-baseline uses isolated manual-price scenarios for crafting/refining/enchanting with the same inputs preserved through each review. Initial new-test failures were incorrect accessible-name assumptions (Sales versus Sale tax, and Next’s additional route-announcer alert); corrected the selectors, with failed logs retained. No application validation or test assertion was weakened.

Deterministic accounting fixtures: crafting600 silver (2,000 materials +100 station,3,000 revenue and300 tax); refining2,125 (2,250 materials +100 station,5,000 revenue and525 fees); enchanting1,372 for two quality2 upgrades (5,728 inputs +100 station,8,000 revenue and800 tax). These are manual assumptions, not live prices or verified current game fee presets. Dedicated tests validate zero quantity rejection and private save/reload for each implemented mode.

Five layout differences to correct: enormous nested material forms; repeated technical identifiers instead of clear requirements; returns/focus explanations occupy more space than main inputs; cost totals/fees are difficult to reconcile; oversized unavailable/focus results create noise. First pass compacts material rows, exposes actual per-row/gross/station/profit-per-output accounting, collapses advanced return/model explanations and keeps full saved configuration behavior.

Full recipe/current-patch mechanics, automatic city/focus/spec coefficients and remaining calculator categories stay incomplete. A polished starter engine is not full feature parity. Source and mechanic gaps remain in docs/engineering/CALCULATOR_PARITY.md.

## Iteration01 — rendered review

Viewed populated crafting1440/390 screenshots. Material rows replace nested bordered cards, actual input/station cost and profit-per-output are explicit, and advanced returns/model notes collapse. The fixture values and saved calculations remain identical to the baseline. Full gate passes73 unit/50 browser tests.

Five remaining issues: phone assumptions still use one input per row; unit/requirement/source descriptions repeat and make material rows too tall; output ID repeats known item context; sticky result and focused skip-link reflect the restored-scenario scroll state in full-page captures; source/game mechanic coverage remains a starter subset. Second pass reduces duplicate metadata, pairs phone fields and normalizes scroll/focus before screenshots. The focus/scroll artifact remains retained in iteration01; it is not asserted as the normal viewport. A new return-rate/eligibility save-and-restore scenario verifies the revised checkbox controls actually change the estimate.

## Iteration02 — material density and returns

Inspected crafting desktop/mobile and the shared material hierarchy. Requirements now sit next to item names, manual/source labels share the row cost footer, phone configuration pairs related inputs, and full captures reset restored focus/scroll. Gate passes73 unit/50 browser tests, including return eligibility/rate save-and-restore. Five remaining differences: the reference includes activity tabs; phone results require excessive scrolling; the starter catalog is smaller than the concept; missing permitted source data prevents automatic game presets; the screenshot’s compact illustrative breakdown cannot represent all actual assumptions. Iteration03 adds real production-mode navigation and a mobile result shortcut, retaining the full auditable breakdown and honest coverage boundaries. Full data parity remains open.

## Iteration03 — reviewed result and remaining differences

Actually inspected crafting1440, enchanting1440 and the paired390 viewport comparison. Direct crafting/refining/enchanting tabs preserve region. The mobile summary links to the existing full result; browser assertions verify its amount and jump target. The dense material rows, explicit station/material totals, profit per output, two-column phone inputs and private scenario controls remain functional. All eight phase checks pass:73 unit tests and50 production browser tests.

Matched before/after images: `.qa/calculator-correction/comparison-1440.png` and `comparison-390.png`. Full latest captures: `.qa/calculator-correction/03-mode-navigation-and-mobile-results/{crafting,refining,enchanting}-{1440,390}.png`; logs in its `gate/`. Reference is [reference.png](reference.png). No prices in these captures are live observations; all values come from isolated manual test scenarios.

Remaining differences: full catalog and automatic verified city/focus/spec assumptions missing; the actual auditable breakdown is longer than the illustrative screenshot; save/share controls remain below the workspace; only existing production modes appear in navigation, not unsupported categories; genuine data and asset gaps prevent full parity. Current model UI has improved, not been certified a complete Albion economy system. A following reliability pass corrects the mobile summary’s numeric font token to the shared Geist Mono data token.

## Release-blocker manual-trade extension

The trade tool now shows break-even and exact minimum whole-silver sale, with persisted private manual scenarios and calculator-specific scenario queries. Inspected `.qa/release-blockers/trade/manual-1440.png` and `manual-390.png`;320 also has an overflow assertion. Phone assumptions are paired and all results remain readable. Independent fixture292.5 profit,117.32 displayed break-even and118 whole-silver minimum matches tests; these are manual inputs, not live quotes. The saved-trade test verifies account export, anonymous/outsider isolation and an older record surviving51 newer other-mode records. Full remaining calculators and reference/game-scene acceptance stay open.

## Purchase-order fee review — 2026-10-26

Inspected final `.qa/release-blockers/trade/purchase-order-1440.png` and `purchase-order-390.png`;320 capture also retained. Desktop keeps side-by-side assumptions/results; phone pairs inputs and places readable results immediately afterward. Dedicated25-silver purchase setup row separates purchase cost from157.5 sale fees; profit267.5 and minimum121 agree with independent accounting. Saved mode/rate restores through reload. These are manual fixture prices, not observed prices. No new imagery or full-reference visual acceptance claimed. Remaining gaps: technical-ID scanner selection, broad economy catalog, real fee/mechanics sources, repeated listing assumptions and full calculator parity.117 units/53 browsers/15 DB checks pass.

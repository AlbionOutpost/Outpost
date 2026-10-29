# Product rebuild: economy and item research

29 October 2026. Implemented locally; no deployment, Git publication, billing, credential or security-policy changes. The parent phase owns the mandatory production/Cloudflare gate and root QA reports. Owner visual acceptance remains open.

## Authority and baseline

- Exact new reference: `.qa/product-rebuild-2026-10-29/reference-package/references/05-crafting.png` and its `PROMPT.md`, read after the package arrived during implementation. The old professional-redesign concept was inspected initially and superseded by the new three-column target.
- Source authority remains the existing calculation engines, recipe collection and observation identity/freshness helpers. Historical, source-reviewed and current-patch-verified are separate statuses.
- Current working source was snapshotted before edits: `.qa/product-rebuild-economy/before-source.json` and `before-source/` (29 files). This is the preceding Phase A workspace, not a clone of a154.
- Before: root-owned Node production on `localhost:3003`, 13 routes at 1440×900 and 390×844. After: root-owned shared dev on `localhost:3006`; final production verification is separate. Initial captures used 390×900; the retained final before/after set uses 390×844.
- Browser tooling: sandboxed local Playwright fallback. Chrome DevTools MCP is unavailable in this environment. Fixture data is explicitly identified below; no personal OAuth consent was automated.

## Implemented behavior

The production calculators now place configuration, true materials and results in three aligned columns on wide desktop. At tablet width configuration sits beside materials/results, and the existing phone stepper presents one task at a time. Recipe selection opens the existing focus-managed picker. Exact missing prices appear immediately, including an output sale price, with an explicit next action; missing inputs never manufacture profit.

The summary retains the existing per-output/total/cost/margin values. Cash needed, cash profit and retained-return value are separate, readable rows. Detailed accounting and assumptions are expandable; Saved runs now obeys its expanded state. The mobile stepper was observed covering the result title; its sticky offset now matches the actual scrolling mobile header, with a bounding-box regression.

Sale-price sensitivity re-runs the existing production engine at 80/90/100/110/120 percent of the entered sale price. It is an accessible table of hypothetical unit prices, economic profit and cash profit, not a forecast. Incomplete/invalid configurations produce no sensitivity section; hypothetical prices that exceed engine bounds stay unavailable. No accounting formulas were copied into React. Cooking/Alchemy display their actual category and the existing historical-recipe status.

Manual flipping starts with blank purchase/sale prices instead of a misleading zero-profit default. An intentional entered zero remains valid; negative profit stays negative. Transport, farming, fishing and shopping name missing prerequisites. Farming and fishing avoid repeated blank result metrics before a calculable result exists. Scanner purchases exclude the Black Market while destination behavior is preserved. Domain arithmetic and server-side schemas were not changed.

Gold history has distinct initial/loading/empty/failed states and a summary of actual returned latest price, timestamp and count. Source requests remain explicit. Market history still uses its original domain and request behavior.

The item browser supports bounded 30-item List/Grid views, actual result counts, Clear filters and useful empty recovery. The detail page has section links and supported recipes only when an exact recipe output matches the item ID. Calculate this recipe opens the actual calculator/category with a validated recipe ID. Back, market and recipe links preserve the current server. Unavailable abilities/IP/patch status remain unknown.

All styling is in locally imported `src/components/economy-workspaces.css`; it uses shared theme variables. Global palette, shell, schema, APIs, authentication, permissions and source data remain outside this change.

## Evidence

- Before/after 26-capture manifests: `.qa/product-rebuild-economy/before.json`, `after.json`; all 200, no captured page errors, no document overflow. Cooking/Alchemy's four captures were refreshed after the final category-copy correction.
- Inspected overview sheets: `overview-1440.jpg`, `overview-390.jpg`; inspected full desktop/mobile crafting, farming, flipping, item detail, grid and gold captures in the same directory.
- Populated crafting at 320/375/390/768/1024/1440/1920: `populated-crafting-*.png`, manifest `populated.json`. Manual fixture: Steel Bar100, Pine Planks50, output3000 →1000 profit. No market observation was substituted.
- Gold populated captures use three API response fixtures (1500/1600/1550 silver), explicitly not live-source evidence. Six axe checks (crafting, item grid, gold × desktop/mobile) returned zero violations; this is not full accessibility conformance.
- Screenshot-driven result positioning: at390 the stepper bottom is about84px and results begin about96px; the previous stepper bottom139px obscured a result beginning96px. A real browser assertion now preserves separation.

## Commands and results

All commands used Node22 and existing tools; no owned server was started or stopped by this child.

- `npx vitest run tests/production*.test.ts tests/calculations.test.ts tests/farming.test.ts tests/transport.test.ts tests/shopping.test.ts tests/fishing-journal.test.ts`: **75 PASS**, 11 files (`unit-final.log`). New independent sensitivity cases cover retained-return vs cash accounting, negative results, quantity scaling, wrong-server/missing input, invalid configuration and hypothetical bounds.
- `npx playwright test ... --config=.qa/product-rebuild-economy/playwright.config.ts`: final sets **12 PASS**, **11 PASS**, **9 PASS**, **6 PASS**, with overlapping cases, not additive totals. See `browser-final.log`, `browser-last-changes.log`, `scroll-accounting-final.log`, `category-copy-final.log`.
- Preserved permitted and denied scenario saves/deletes, private caches, device/account shopping, recipe/quality/region identity, manual overrides, zero source sentinels, stale/undated prices, asynchronous refresh races, restored plans and fishing modes.
- Scoped ESLint: PASS (`lint-final.log`, `lint-copy-final.log`). Earlier global TypeScript runs passed; the last run temporarily found only the supporting agent's in-progress test fixture omissions (`typecheck-final.log`), reported for correction before the parent gate. Prettier ran on all touched source/tests.

Failures are retained: initial two new-test selector assertions were corrected without app changes (`browser-first.log`); the initial legacy run failed because root's dev3006 still trusted3000 as its configured origin. Root restarted it with matching `NEXTAUTH_URL` and the guard stayed intact. Direct API test Origin headers now derive the configured test base URL, preserving correct guards on both3000 and3006. One dashboard resume regression was fixed by the supporting agent and the original journey passes. Capture-script failures involved a missing mobile-step transition, an axe explicit-context requirement and a hidden observation-table selector; these were harness errors, recorded in tool output/failed logs and corrected before retained final evidence.

## Intentional differences and remaining limits

- No unlicensed forge art, fictional focus efficiency, invented game coefficients or unsupported break-even metric from the image was added.
- Sensitivity is a legible scenario table rather than a decorative chart; source observations stay separate from hypothetical prices.
- At narrower desktop widths material row totals sit beneath the resource name to keep unit-price and source/return controls readable; the total column returns on wider screens.
- Existing compact gold/history axis formatting can round close prices to the same abbreviated label; exact values and timestamps remain inspectable. This pre-existing chart limitation was reported to the parent after source freeze.
- The new economic UI is implemented and focused local checks pass; the full mandatory phase gate, native runtime, performance budget and complete production responsive matrix belong to the parent and are not claimed here. No production release approval is implied. Real Discord OAuth, current-patch mechanics, licensing/legal and operational release gaps remain separate.

Changed source hashes: `.qa/product-rebuild-economy/changed-source.json`. No further application edits after final freeze except a separately coordinated concrete QA failure.

## Final bounded polish after production review

The parent authorized a final correction for the long phone form stacks visible in the first production matrix. Trade fees/extra costs, transport risk/fees, and farming historical seed-return/fees are now native disclosures. Their applied values remain visible in compact readouts, essential inputs stay available, and saved-scenario/transport-plan controls are separately disclosed. No state is reset when a disclosure closes. Historical cooking/alchemy recipe status remains visible on phone; the selected production mode scrolls within its horizontal rail without moving the page.

`polish-browser-final.log`: ten focused cases pass on root-owned dev3006 with one worker. The new mobile regression independently checks35 trade profit,40 transport profit and−1800 farming economic profit after editing then collapsing assumptions. Existing private save/reload/denied access and whole-silver threshold assertions remain. Category cases require visible historical status and eventually contained active-tab geometry. The first polish run retained two test failures: an immediate geometry assertion raced the post-hydration animation frame, and a saved-harvest reload needed its new disclosure opened. Both were corrected while retaining their original intents. Scoped ESLint and global TypeScript pass (`polish-lint.log`, `polish-type-final.log`).

The parent owns fresh final production screenshots after these changes; earlier full-height farming/transport/flipping captures describe the pre-polish state and are not post-polish visual proof. Source/test freeze was sent before the parent's final major-phase gate. The sibling readiness-letterspacing correction is parent-owned. Updated exact source/test hashes are in `changed-source.json`.

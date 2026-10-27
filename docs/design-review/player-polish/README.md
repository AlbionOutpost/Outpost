# Player-facing polish — October 26

Kept the restored charcoal/copper identity and working layouts. Used the staged Impeccable polish/clarify/animate guidance and Outpost frontend/visual-QA skills. The launcher was not executable; Playwright MCP required unavailable approval and Chrome DevTools lacked Chrome. All browser evidence here uses the permitted local Playwright Chromium fallback.

Implemented readable labelled desktop navigation from 1280px, consistent “Comps” terminology, task-based headings, shorter player-facing copy, named item qualities, grouped imported abilities, visible verification limits, useful collection/comp empty states, a recoverable unavailable page, and fewer primary comp actions. The mobile actions menu stays within 320px and closes with Escape. JSON formats, URLs, APIs, authorization, recipes and game data remain unchanged. A checksum comparison of 104 API/domain/data/Prisma files found no differences; the UI tool directory descriptions are intentionally excluded.

## Before / after

Same viewport and equivalent isolated fixture states; different capture times and temporary IDs are expected. Private QA fixtures are labelled and removed after capture. They are not live community activity or actual Discord OAuth.

| Surface                | Before                              | After                             |
| ---------------------- | ----------------------------------- | --------------------------------- |
| Tool directory, 1440px | [Before](tools-before-1440.webp)    | [After](tools-final-1440.webp)    |
| Item details, 1440px   | [Before](item-before-1440.webp)     | [After](item-final-1440.webp)     |
| New comp, 390px        | [Before](comp-new-before-390.webp)  | [After](comp-new-final-390.webp)  |
| Comp view, 390px       | [Before](comp-view-before-390.webp) | [After](comp-view-final-390.webp) |

[Actual market response, desktop](market-source-1440.webp) · [Actual market response, mobile](market-source-390.webp) · [Anonymous sign-in](signin-390.webp) · [Mobile navigation](navigation-320.webp).

## Browser verification

- Visited all 32 page route patterns with owned local fixture records where needed. Captured full-page and viewport images for 192 route/width configurations: 320/375/390/768/1440/1920px. The signed-in `/signin` visit redirects to settings by design; separate anonymous captures cover the actual sign-in page at 320/390/1440px.
- Opened before/final desktop/mobile screenshot sheets for every route, individual detailed captures and representative additional responsive sheets. No document overflow, failed images, page errors, console errors or failed requests in the final matrix.
- 64 axe scans of the application DOM at 1440/390px found zero violations. Three additional anonymous sign-in scans and one actual-price-state scan also found zero. Incomplete/manual checks remain recorded. The first pass found an empty-state heading skip, which was corrected; the QA watermark was moved after scanning so instrumentation is not treated as application content.
- A real unmocked Europe `T4_BAG`, Normal-quality request returned HTTP 200 from the Albion Online Data Project with eight city records. The UI preserved missing sell/buy values and stale timestamps. These are observations, not guaranteed executable prices or inventory. Raw response/evidence: `.qa/player-polish/journeys/evidence.json`.
- Drawer motion is a 220ms edge entrance; reduced motion computes to no animation. Keyboard focus is inside the open drawer and returns to its trigger. Existing selection/filter feedback stays short; no animation dependency or decorative loop was added.
- Main final matrix: `.qa/player-polish/final/measurements.json` and screenshots/contact sheets. The last mobile menu anchoring correction is separately exercised and captured in `.qa/player-polish/comp-menu-320.png`; it does not change closed-menu appearance.
- `npm run qa:phase` passed all 10 checks on Node22, including 143 unit tests, 66 browser tests, 15 database integration checks and nine bounded regional reads. Existing focused item, comp, guild and navigation regressions passed. Seven intentionally changed pixel baselines were opened and reviewed; renderer masks are confined to deterministic goldens, while unmasked real artwork is visible in the review captures.

## Loading smoke check

One post-change Lighthouse 13.5 mobile lab sample on the anonymous homepage returned performance 89, accessibility 100, LCP 3.761s and CLS 0. The LCP element was the existing hero illustration. This single unpaired sample is not a controlled before/after benchmark, so no loading-speed improvement or regression is claimed. The 2.5s target remains open. Raw report: `.qa/player-polish/lighthouse.json`.

## Limits

This is a verified refinement pass, not a claim of visual perfection, full accessibility conformance or exhaustive testing of every private role/state/browser. Real Discord OAuth, physical devices and owner visual acceptance remain open. The existing 7,510 imported item records were not newly patch-verified; no new recipes, abilities or market observations were invented. Existing disclosed generated homepage scenery remains; authentic scene licensing/replacement is unresolved. Docker build remains blocked by the read-only Docker buildx activity path; security permissions were not changed. The working tree has no Git repository metadata, so no commit/PR is claimed.

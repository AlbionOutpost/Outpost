# Header, brand and interaction refinement — 2026-10-27

Implemented the owner’s header/card request in the actual Next.js application. Used the installed Outpost frontend and visual QA skills; Impeccable is not installed in this environment. No backend, calculator, source-price, account or authorization behavior changed.

The old logo was reduced inside an already offset crop, leaving it undersized and misaligned. Restored the original crop geometry and centered the 148px wordmark within the desktop header. Light mode retains a dark logo plate so the original cream letters remain readable. The original logo file is unchanged.

The palette now follows the logo’s copper, cream and warm dark metal. The header has clearer navigation states, a globe-labelled region control, a sun/moon theme switch, and a Discord button with its recognizable symbol. The region control remains a native select with existing persistence. The Tools dropdown uses two columns of labelled icon tiles with entry/exit motion; search also gains entry/exit motion. Authentication still uses the existing Discord provider and callback.

The four homepage destinations now have original vector emblems to the left of their titles: market chart, crossed weapons/shield, abacus and guild standard. Removed thirteen decorative equipment thumbnails from those cards. Genuine equipment imagery remains where it identifies actual items and observed prices. Each card has a clear task description and destination action. Browser tab title is now “Outpost | Albion tools”; removed prose em dashes in comp visibility and the legal heading without changing their meaning or underlying values.

Shared buttons/cards gain short hover growth, press compression and icon tilt. Color changes stay instantaneous to preserve contrast during transitions. Reduced motion disables nonessential motion. The mobile drawer now explicitly hides the inert background from assistive technology, preventing duplicate theme controls.

| Same viewport    | Before                    | After                   |
| ---------------- | ------------------------- | ----------------------- |
| Desktop 1440×900 | [Before](before-1440.png) | [After](after-1440.png) |
| Mobile 390×844   | [Before](before-390.png)  | [After](after-390.png)  |

Additional states: [Tools dropdown](dropdown-1440.png), [hover](hover-1440.png), [pressed](pressed-1440.png), [light mode](light-1440.png). Full-size screenshots supplement viewport captures. Raw local evidence is under `.qa/brand-interaction`.

Browser measurements confirm card width grows from 336px to 342.72px on hover and compresses to 329.28px while pressed; the emblem rotates and scales. Logo vertical center is 39.5px within an 80px header. Screenshots were opened for visual inspection, not merely generated. Native select option appearance remains platform-specific.

Verification results are recorded below after the final phase run. The first broad run exposed 4.38:1 hover-button contrast and request-limit responses from concurrent captures/tests. The hover color was corrected and browser work was rerun sequentially. Original failed logs are retained; rate limits were not weakened. No full accessibility, physical-device, real OAuth or owner visual approval claim is made. Release remains NO-GO for the existing external gates. Current Docker build is blocked by a read-only builder activity directory; no permissions were changed.

## Media provenance

The four emblems are original inline SVG interface artwork in `src/components/feature-emblem.tsx`, not Albion equipment or abilities. Discord’s unmodified black symbol comes from the [official branding page](https://discord.com/branding), linked [SVG](https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/66e3d8014ea898f3a4b2156c_Symbol.svg); retrieved 2026-10-27. SHA256: `3efc001289994d74fa3f919397259d1e7b8e77188c9161880243965ee284466e`. It is used to identify Discord sign-in and remains Discord’s trademark; no open-source or blanket artwork license is claimed. Existing courtyard imagery remains a disclosed illustration, not gameplay.

## Final verification

Node22 `npm run qa:phase` passed all ten checks: 143 unit tests, 69 production browser tests, typecheck, lint, game-data structure, disposable migration/backup/restore checks, production build, dependency audit and bounded regional reads. Lint retains two pre-existing unused-variable warnings. The 176-configuration design regression and 84-route/width audit pass. Five deliberate golden-image tests passed; all ten equipment/comp/drawer images were inspected. Thirteen focused homepage/navigation/source-price tests also passed after the mobile accessibility fix.

Actual production/source captures were reopened at 1440/1920/768/390/375/320px. No document overflow, page errors, console errors or failed requests occurred in the final sequential capture. Six dark homepage axe scans and the desktop light scan have zero reported violations; incomplete contrast checks and untested assistive-device journeys remain limitations. Hover/press and reduced-motion geometry/styles are recorded in [interactions.json](interactions.json); full source-state checks are in [measurements.json](measurements.json). Browser MCP returned “MCP tool call requires approval, but approval policy is never”; all these screenshots and interactions used the permitted local Playwright Chromium library fallback.

One sequential post-change Lighthouse 13.5 mobile lab sample: performance 96, accessibility 100, LCP 2.706s, CLS 0. This is not a controlled before/after performance result. The 2.5-second target is not established. Current Docker attempt failed before building because `/home/bttw/.docker/buildx/activity/` is read-only. Raw logs, including the initial failed gate, are preserved under `.qa/brand-interaction`. No credentials, deployed staging, current-patch verification or media clearance gates were promoted.

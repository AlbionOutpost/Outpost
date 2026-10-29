# Cinematic homepage correction — 29 October 2026

The owner explicitly rejected the preceding isometric market banner and plain-card landing composition. The new city/adventurer reference controls this local homepage correction. This is real application work, not a generated UI mockup. Owner visual approval remains open.

## Implemented

- Full-width scenic hero with an original sunset city/adventurer illustration, readable left-side HTML headline and existing region-aware Market/Builds actions.
- Distinct market, loadout and party destinations using genuine equipment icons and the established interface icon set. No fictional party membership, prices or activity.
- Compact city quote tiles showing both observed order directions and independent freshness/missing states. The existing market controller, source schema validation, cancellation, history gaps and region isolation remain.
- Keyboard-accessible quick item selection for Battleaxe, Bag and Cape shares that controller; choosing the same item does not cause a second market request.
- Compact real featured builds with author, activity, authentic weapon/selected-ability art, source detail links and existing device-save actions. No hypothetical view/vote totals from the reference.
- Local homepage blue-black surfaces and orange actions follow the supplied scene-led reference; other tools retain their current theme and functionality. Light controls remain supported.

Changed application components: `src/app/page.tsx`, `src/app/homepage.css`, `src/components/home-market-terminal.tsx`, `src/lib/albion/assets.ts`. The existing homepage heading expectation is updated and quick-selection coverage is added to the existing Playwright suite. No database, session, permission or calculation changes.

## Artwork

The built-in image-generation tool created original decorative fantasy scenery. [Exact production prompt](prompts/city-overlook-v2.txt), [original](../../../assets/source/homepage-cinematic-v2/city-overlook.png), [runtime WebP](../../../public/albion/illustrations/city-overlook-v2.webp), and [hash/provenance ledger](../homepage/generated-assets.json). This is not official Albion gameplay. Real equipment/skills remain genuine existing renderer assets. No scene or interface art was cut out of the supplied website concept.

## Rendered review

Browser MCP returned `MCP tool call requires approval, but approval policy is never`. The permitted fallback is sandboxed local Playwright with actual browser-rendered screenshots. Before screenshots are from the previous optimized Node preview. Iterations are retained under `.qa/home-cinematic-2026-10-29`; initial loading/harness failures are not represented as final results.

The first implementation exposed oversized tablet cards, duplicate padding inherited by home builds and excessive vertical space. These were corrected after opening the actual images. Final production captures, commands and limits are recorded below after the phase gate.

## Reference differences

The original scene differs from the concept image while retaining its sunset-city overlook, cloaked adventurer and left-copy/right-scene composition. Existing Outpost branding/navigation is preserved. Actual city observations replace the concept's invented multi-item prices, trend lines and blanket live-data label. Featured builds use genuine equipment icons and real author/activity records rather than invented illustrations and favorite counts. Existing contextual source dates/history are retained for honesty. Market Explorer, Build Library, Build Detail and crafting references are context for the shared product; their separate layouts were not redesigned again in this focused landing correction.

No production deployment, Git push, billing or security-policy mutation. Broad release gates, current-patch game-data acceptance, real Discord consent, field performance, full accessibility conformance and owner design approval remain independent.

## Before and after

| View                                   | Before                                     | After                                                  |
| -------------------------------------- | ------------------------------------------ | ------------------------------------------------------ |
| Desktop 1440×900, full-page supplement | [Before](screenshots/before-home-1440.png) | [After](screenshots/after-home-1440.png)               |
| Phone 390×844, full-page supplement    | [Before](screenshots/before-home-390.png)  | [After](screenshots/after-home-390.png)                |
| Wide desktop viewport, 1920×1080       | —                                          | [Actual viewport](screenshots/after-viewport-1920.png) |

Final raw production viewport/full-page evidence is under `.qa/home-cinematic-2026-10-29/production`. Widths320/375/390/768/1024/1440/1920 were captured and opened directly or in the rendered contact sheet. All seven final states have no document overflow, missing visible images or page errors. Three unrestricted axe scans at320/390/1440 and a fourth on the light state report no violations. These are sampled automated accessibility checks, not full conformance. The 1440 hero measures344px with142px destination cards; the wide view displays the real featured builds in its initial viewport. Mobile deliberately preserves the recognizable scene and stacks the destinations and city tiles.

Additional actual-source Cape selection returns four city records and preserves the region in the Market link. Light theme is captured and inspected. Inter and Barlow bindings are read back from computed styles. Existing tests cover optional history/gaps, request failure/retry, independent timestamps, item search, region isolation and device saves; the new keyboard quick-selection test verifies one request per changed item and no extra request on repeat selection.

## Verified commands and limits

- `npm run qa:phase`: all10 stages PASS,405 unit,142 production browser,15 disposable database checks and nine bounded regional checks. Final timestamp2026-10-29T20:55:27.894Z. Includes the unmodified ownership/formula/cache/migration regressions; fixture sessions do not prove real Discord OAuth.
- Fresh Docker build and smoke PASS: uid1000, no copied runtime `.env`, DB/Redis healthy, homepage HTTP200. Owned temporary QA container removed afterward.
- One initial simulated-mobile homepage Lighthouse sample on that final container: Performance81, Accessibility100, LCP4958ms, CLS0. LCP/Performance targets remain unmet. No controlled baseline/speedup, field INP, Worker CPU or production capacity claim. Other routes were not rebenchmarked for this homepage change.
- `npm run data:audit`, source/bundle configured-secret scans and17 documentation validator unit tests PASS. Rebuild inventory and generated phase reports are regenerated from the actual artifacts.
- Browser MCP approval refusal, initial explicit-context axe harness failure and initial loading capture remain retained under the raw task directory; they are not reported as accepted screenshots.

The optimized local preview remains at `http://localhost:3000`. No production deployment or push. Owner visual acceptance remains open.

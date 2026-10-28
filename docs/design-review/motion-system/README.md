# Shared motion: grow and hold

**Current hover direction:** grow once, hold while hovered, and return on pointer leave. The latest owner correction removes cursor tilt, vertical lift, independent icon movement and the delegated pointer component. Click/disclosure feedback remains. [Current verification](#grow-only-hover-follow-up). Earlier tilt captures and measurements below are historical.

The owner requested animation throughout Outpost, citing [RocketClient](https://rocketclient.net/) and explicitly asking for hover growth, click animation and tilt. This supersedes the previous no-growth/stable-hover direction. Existing layouts, palette, data, formulas, route behavior and permissions remain authoritative.

## Initial reference and motion design (superseded hover behavior)

Inspected the live RocketClient page using the installed local Playwright fallback after an actual browser MCP navigation returned “MCP tool call requires approval, but approval policy is never.” Measured primary-button hover scale about1.045, navigation1.07, generic press controls1.06, short icon rotations and a2px card lift. Raw reference screenshot/computed observations and public CSS inspection remain in ignored `.qa/motion-system`. Rocket code, logos, art, text and product statistics are not imported into Outpost.

Outpost's focal interaction is cursor-following depth on homepage destinations, tool cards, build previews, compositions, guides and guild discovery. Ordinary controls use4.5% hover growth,4% press compression and a180ms decelerating return. Cards lift4px/grow1.8%, with pointer-driven rotation capped at3° per axis. Equipment tiles and existing SVG action icons respond as well. Menus open with a short fully opaque reveal; contextual drawers and mobile navigation enter from their corresponding side. Data remains visible before scripts run.

A small delegated client component schedules at most one update per pointer frame, caches the entered card's bounds, and avoids React pointer state, per-card listeners and idle loops. It resets on pointer leave/cancel, scrolling, resize, visibility, route or media-preference changes. Discovery-card tilt excludes form/dialog editing and nested input/button targets. All existing calculation/observation/ownership code stays intact.

Coarse pointers use press feedback without sticky hover/tilt. Reduced motion removes spatial animation immediately while retaining selection, focus and semantic color feedback. No new motion library, page-load sequence or route-transition wrapper was introduced.

## Verification record

Focused tests exercise growth/press geometry with real pointer input, regional navigation, bounded tilt and cleanup, live reduced-motion changes, keyboard region selection and touch navigation at320px. The earlier header stability assertion is retained under reduced motion; normal-preference growth has a separate explicit regression. An early focused assertion compared CSS serialization rather than geometry; the final test checks matrix identity and absence of running animation. Pointer tests wait for fonts and actual hydration readiness before acting.

Initial ad hoc capture also encountered a hidden desktop step button. The capture selector now targets visible controls; the failed capture remains recorded. Capture fixtures are ephemeral and cleaned in finally blocks, with actual Albion renderer icons. They do not establish real OAuth, current-patch verification or combat recommendations.

Final production captures, command results and limitations follow. Local browser/frame-cadence diagnostics are not field INP or physical-device certification. Owner visual acceptance and existing release gates remain independent.

The first full gate passed86 browser checks and failed the broad rendered audit: animated foreground/background changes briefly reduced contrast when a composition action changed from primary to secondary, and growth of the wide roster-selection button obscured adjacent drag/move targets. Color/background changes now apply immediately while transforms remain animated. Dense roster rows keep stable bounds and animate their internal equipment strip instead. The audit retains its axe checks and adds explicit non-overlap geometry assertions; no contrast or target-size rule was disabled. Original failure logs remain in `.qa/motion-system/browser-first.log` and `phase-first.log`.

## Production review

[Desktop motion demo](motion-demo.webm) · [Mobile viewport demo](mobile-motion-demo.webm). These are actual anonymous production recordings. The first recording attempt targeted a mobile-only recipe action at desktop width and timed out; it is retained in ignored raw evidence and replaced by the successful separate desktop/mobile recordings. The bundled minimal FFmpeg could not export review frames, so local-file browser media playback was used to seek/capture actual recorded frames at1/3/5seconds. This does not establish physical-device or full-video performance certification.

| Surface      | Before                                  | After                                                                       | Motion/state evidence                                                                        |
| ------------ | --------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Homepage     | [Desktop](before-home-1440.png)         | [Desktop](after-home-1440.png), [phone](after-home-390.png)                 | [Pointer tilt](home-tilt.png), [press](home-press.png)                                       |
| Tools        | [Desktop](before-tools-1440.png)        | [Desktop](after-tools-1440.png), [phone](after-tools-390.png)               | [Card tilt](tools-tilt.png), [light](tools-light-390.png), [reduced](tools-reduced-1440.png) |
| Builds       | [Desktop](before-builds-1440.png)       | [Desktop](after-builds-1440.png), [phone](after-builds-390.png)             | [Pointer tilt](builds-tilt.png)                                                              |
| Compositions | [Desktop](before-compositions-1440.png) | [Desktop](after-compositions-1440.png), [phone](after-compositions-390.png) | [Pointer tilt](compositions-tilt.png)                                                        |
| Crafting     | [Desktop](before-crafting-1440.png)     | [Desktop](after-crafting-1440.png), [phone](after-crafting-390.png)         | Recipe drawer in mobile demo                                                                 |
| Build editor | [Desktop](before-build-editor-1440.png) | [Desktop](after-build-editor-1440.png), [phone](after-build-editor-390.png) | [Seven widths](build-editor-widths.jpg)                                                      |
| Party editor | [Desktop](before-party-editor-1440.png) | [Desktop](after-party-editor-1440.png), [phone](after-party-editor-390.png) | [Seven widths](party-editor-widths.jpg)                                                      |
| Guides       | [Desktop](before-guides-1440.png)       | [Desktop](after-guides-1440.png), [phone](after-guides-390.png)             | [Pointer tilt](guides-tilt.png)                                                              |

Final production manifests contain74 route/width/preference states across320/375/390/768/1024/1440/1920, including four light/reduced-motion samples. All have zero document overflow.24 sampled axe scans report no violations. Hover/press captures include computed matrices, with five discovery card types actually exercising bounded tilt. Authentic equipment images were inspected in unmasked captures. Anonymous/public observations, authenticated QA fixtures and missing prices remain distinct. Fixtures are removed; they are not real OAuth or recommended game builds. Screenshots and seven-width sheets were opened; physical touch/screen-reader/owner acceptance remain independent.

## Final gate and measurement limits

`npm run qa:phase` on Node22/local PostgreSQL/Redis passes all10 commands:156 unit tests,87 ordinary production browser tests without snapshot updates,15 disposable database checks and9 bounded regional reads. Types, lint, build and advisories pass. Two pre-existing unused-variable lint warnings remain. The focused five-test design/motion retest also passes. Source/bundle configured-secret scans,17 documentation-validator tests, current report checks and rebuild inventory are reconciled.

Three local production synthetic-pointer diagnostics per version sampled90 requestAnimationFrame callbacks each. Before median16.7ms/p95about16.8ms; after median16.7ms/p9516.7–16.8ms, with zero intervals above50ms in either small set. The after samples confirm the real tilt handler was active. These are narrow desktop frame-cadence proxies, not controlled loading improvements, device smoothness, sustained load or field INP. No speedup is claimed.

Fresh Docker smoke passes: homepage HTTP200, UID1000, no copied `.env`, PostgreSQL/Redis healthy. Actual OAuth remains unconfigured. The owned QA container is removed after measurement; the separate local production preview remains at `http://localhost:3100`.

| One container/mobile Lighthouse sample | Performance | Accessibility | LCP    | CLS |
| -------------------------------------- | ----------- | ------------- | ------ | --- |
| home                                   | 86          | 100           | 4.119s | 0   |
| market                                 | 95          | 100           | 2.855s | 0   |
| crafting                               | 95          | 100           | 2.858s | 0   |

All sampled LCP values miss2.5s and homepage performance misses90. Single lab samples are not a reliable before/after loading comparison or conformance certification. Full product/game-patch coverage, real OAuth, owner acceptance and prior release gates remain open. Release remains NO-GO.

## Navigation hover follow-up

Removed the owner-rejected filled navigation hover box. A legacy dropdown selector was winning over the newer generic navigation rule; the header now explicitly keeps link/Tools hover and open states transparent, with no border or shadow. Growth/press feedback and keyboard focus outlines remain. [Dark hover](nav-dark-hover.png), [open menu](nav-dark-open.png), [light hover](nav-light-hover.png).

Actual local-library production checks cover dark/light hover/open states: computed background remains rgba(0,0,0,0), hover scale remains1.045 and the dropdown still opens. The current full phase again passes all10 commands:156 unit/87 browser/15 database tests and nine regional reads. This small CSS follow-up does not claim new container/Lighthouse measurements; the preceding major-motion measurements and limitations above remain historical evidence. Source/bundle scans, documentation checks and rebuild inventory are refreshed.

## Grow-only hover follow-up

Latest owner request: hover should simply grow, rather than feel like a pulse. Shared buttons/navigation now use a160ms ease-out scale and hold; discovery cards and equipment tiles also scale without rotation or translation. Removed cursor-following tilt, the delegated pointer listener component, independent hover icon movement and the roster equipment nudge. Press feedback, transparent navigation backgrounds, stable roster hit areas, reduced motion and coarse-pointer handling remain.

Actual production sampling checks five navigation/button/card states on homepage/Tools at200/800/2000ms: scale remains constant at1.045 for controls and1.018 for cards, with no rotation/translation or running animation after arrival. [Navigation](grow-only-home-navigation.png), [button](grow-only-home-button.png), [card](grow-only-tools-card.png). The updated regression samples a card for more than two seconds and verifies held size, pure2D scale, return on pointer leave and navigation. Live reduced motion and320px touch tests remain.

The seven focused tests pass; all10 full phase checks pass again (156 unit/87 ordinary browser/15 database tests; nine regional reads), without snapshot updates. Current source/bundle scans, documentation checks and rebuild inventory are refreshed. No fresh loading/container benchmark or reuse of historical tilt-frame timing as current evidence is claimed for this follow-up. Prior release/performance/owner acceptance limitations remain open.

The grow-only follow-up also clears the legacy filled background on the active Tools summary, so hover/open/current navigation labels remain unboxed. Current production timed samples confirm transparent navigation backgrounds on both homepage and Tools. The final full phase remains all10 PASS with156 unit/87 browser/15 database checks and nine regional reads.

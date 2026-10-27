# Homepage tool hub — 2026-10-26

The previous reference pass changed tools, builds and comps; it did not rebuild the homepage. This correction changes the actual homepage and restarts the production server on port 3001.

| Viewport       | Before                      | After                         |
| -------------- | --------------------------- | ----------------------------- |
| Desktop 1440px | [Original](before-1440.png) | [Implemented](after-1440.png) |
| Mobile 390px   | [Original](before-390.png)  | [Implemented](after-390.png)  |

Replaced the oversized scenic hero and three illustration cards with a restrained headline, interactive equipment example, working item lookup and a grouped tools panel. Moved price lookup before community builds; preserved region selection, public-build filtering, source dates, missing-price handling and existing navigation destinations. No formulas, authentication or game records changed. Retained charcoal/copper branding. Generated scenes remain archived and are absent from this homepage.

Opened actual Playwright screenshots at 1440/390 and viewport captures at 1920/768/375/320. All six fit their viewport with zero page errors, failed requests or sampled axe violations ([measurements](measurements.json)). The first draft exposed a wrapped mobile login button and equipment-button label mismatch; both were fixed and recaptured. Desktop gear preview is deliberately hidden below the tablet breakpoint; the build creator remains linked. Five focused homepage regressions pass. Full phase results are authoritative in [QA_REPORT](../../../QA_REPORT.md).

These are local Chromium screenshots, not physical-device or owner visual acceptance. The empty community state is actual local data, and prices load only on request; no fake activity or meta endorsement is displayed.

Full phase: all ten checks passed, including 143 unit and 66 browser tests. Local production responds HTTP 200. One sequential post-change Lighthouse mobile lab sample: performance 96/100, accessibility 100/100, LCP 2.706s, CLS 0. This is not a controlled before/after speedup measurement. Docker image verification is blocked by the read-only builder activity directory (`/home/bttw/.docker/buildx/activity`); no permissions were bypassed.

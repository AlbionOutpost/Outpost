# Immersive reference with top navigation — 2026-10-27

Latest owner clarification: preserve the supplied reference’s scene-led composition and visual tool panels, with bold top tabs instead of a sidebar. Removed the isolated gear-example hero and reinstated the existing disclosed courtyard artwork at a bounded display size, alongside the headline and clear primary actions. Four short illustrated tool panels lead into an actual observed-price snapshot. Main navigation stays horizontal and gains a direct Market link. The courtyard is an existing authorised illustration, not authentic gameplay; item icons remain genuine renderer assets.

| Viewport        | Before                       | After                       |
| --------------- | ---------------------------- | --------------------------- |
| Desktop1440×900 | [Full page](before-1440.png) | [Full page](after-1440.png) |
| Mobile390×844   | [Full page](before-390.png)  | [Full page](after-390.png)  |

The Lymhurst T4/Normal snapshot requests four existing item IDs from the existing market endpoint. It checks every60seconds while visible and online, supports pause/resume and manual refresh, aborts superseded requests and retains explicitly labeled last observations if refreshing fails. Region changes never reuse another region’s observations. Missing or zero quotes remain unavailable. Source observation dates and the existing one-minute price cache are explicit; checks do not promise new observations or executable prices. No invented popularity, player counts, trade volume, percentage trends or mechanics were copied from the concept.

A slow ambient image drift and short card/gear hover responses add restrained motion. Reduced-motion disables these effects. Mobile keeps the same content order and uses the existing accessible drawer. Eight focused browser tests passed, including timed refresh/pause, source failure retention and region isolation. Final responsive and phase results are recorded below after verification; the root [QA_REPORT](../../../QA_REPORT.md) remains authoritative.

The major phase gate passed all ten checks, including143 unit tests and69 production browser tests. The final cache-label clarification was verified against the existing price client’s60-second TTL, rebuilt and rechecked with the eight focused browser tests. No API, formula or authorization behavior changed. The wider176-configuration layout/theme regression also passed.

Opened final desktop/mobile full pages and viewports at1440/1920/768/390/375/320. Source-state captures have no document overflow, failed requests, console/page errors or sampled axe violations ([measurements](measurements.json)). The first browser pass informed tighter mobile card proportions and reserved quote space. Final captures wait for actual visible game images and snapshot completion. Playwright uses the permitted local-library fallback; MCP remains restricted. Physical-device, full accessibility and owner visual acceptance are not implied. Docker verification remains blocked by the read-only builder activity directory.

One sequential post-change Lighthouse mobile lab sample: performance 97/100, accessibility 100/100, LCP 2.554s, CLS 0. This is one lab sample, not a controlled before/after improvement claim or field result.

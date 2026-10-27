# Top navigation correction — 2026-10-26

The user rejected the sidebar/courtyard layout ([supplied rejection screenshot](rejected-sidebar.png)) and explicitly requested bold top tabs. Removed the sidebar from the rendered shell, moved the existing navigation back into the header and aligned header/content widths. Removed generated scenery from the homepage. Replaced it with an interactive equipment example and selected-item artwork. Renderer requests now match the intended display resolution, bounded by the existing217px limit; the existing same-origin fallback remains.

| Viewport        | Before                       | After                       |
| --------------- | ---------------------------- | --------------------------- |
| Desktop1440×900 | [Full page](before-1440.png) | [Full page](after-1440.png) |
| Mobile390×844   | [Full page](before-390.png)  | [Full page](after-390.png)  |

Shorter tool previews use actual equipment images instead of repeated category icons. The observation chart keeps the actual source line with hover markers rather than permanent dots; axis precision avoids repeated compact tick labels. Bag/Battleaxe/Cape shortcuts use the existing item/region/cancellation path. No fabricated prices, activity, game facts or mechanics were added; example equipment is not a meta claim.

Opened actual final1440/1920/768/390/375/320 viewport screenshots, plus desktop/mobile full-page captures. The first cold-image capture was rejected because new high-resolution images were still loading; later captures explicitly wait for visible images to finish and show genuine loaded renderer pixels. Initial overlapping public layout fixtures were not used for final source-state evidence. All six final configurations have zero document overflow, failed requests, console/page errors or sampled axe violations ([measurements](measurements.json)). Background-art contrast uncertainty is removed from the current homepage; this remains local browser evidence, not full accessibility or physical-device acceptance.

Six focused homepage tests and five visual-regression tests passed before the major gate. Two deliberate desktop equipment/comp goldens changed because the sidebar was removed and usable content width increased; both were opened. Final phase results are authoritative in [QA_REPORT](../../../QA_REPORT.md). The external release gates remain open; visual owner acceptance is not inferred from test results.

The first full gate exposed hard-coded hero accent text that was too light on the optional light theme after the background illustration was removed. It now uses the semantic accent-ink token. Earlier failure logs remain under the local review evidence; no accessibility checks were weakened.

Final gate: all ten checks PASS, including143 unit tests and68 production browser tests, with the new quick-lookup region/quote-reset regression. The176-configuration layout/theme regression also completed without overflow or sampled axe violations. Local production is running on port3001. Docker image verification remains blocked by the read-only builder activity directory; no permissions were bypassed.

One sequential post-change Lighthouse mobile lab sample: performance 97/100, accessibility 100/100, LCP 2.554s, CLS 0. This is one sample, not a controlled before/after speedup claim.

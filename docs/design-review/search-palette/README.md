# Search palette spacing and scrolling

The owner reported a clipped, unfinished search dialog. The rendered baseline confirmed that the generic form rule was adding a second border and smaller font to the input, inside the palette's existing focus border. The dialog also scrolled as one box and had a separate nested results scroller.

The palette now owns one52px field with16px interface text and one visible focus outline. Header/field/footer remain fixed while the body scrolls. Desktop width is640px with12px outer corners and aligned padding. Shortcut icons and rows are more compact, redundant initial status copy remains screen-reader accessible, and optional example chips are omitted on short screens. Short landscape views use12px outer gutters so all initial shortcuts fit. The search entrance uses a small translation without clipping/masking content.

Added an accessible Clear search action, hid the duplicate native cancel button and aligned the search label with the player-facing comp/guild terminology. Clearing preserves input focus and cancels the previous query. Clicking internal panel spacing stays inside the dialog; backdrop clicks and Escape dismiss it. A rapid close/reopen regression exposed an existing native-close-event race after the previous close transition was removed. Reset is now synchronous and queued old close events are ignored if the dialog has reopened. Search URLs, region selection, API permissions and server query logic are unchanged.

The ordinary hover correction remains: shortcut hover grows and holds, with no lift. Existing click feedback and reduced motion remain. No UI library, game data, formula, authentication or schema change.

## Evidence

Actual MCP navigation had already failed with the never-approval policy in this session; used the permitted installed local-library Playwright fallback. Inspected the supplied image, baseline, desktop/phone/landscape captures and current focus/scroll states. Earlier failed rapid-reopen logs remain in `.qa/search-polish/focused-final.log`; the six-test focused retest passes. The callback cleanup eliminates the new effect-dependency warning; only the two pre-existing script warnings remain.

Final production captures, command results and remaining acceptance follow below. Loading/no-match/error route stubs are explicitly QA fixtures, while the populated search uses the actual local API and real item renderer. These are not live market prices, OAuth or full screen-reader/device conformance evidence.

## Before and after

[Before desktop](before-desktop.png) · [After desktop](after-desktop.png) · [Before phone](before-phone.png) · [After phone](after-phone.png) · [Small phone](after-small-phone.png) · [Landscape](after-landscape.png) · [Light theme](after-light.png) · [Viewport/theme sheet](widths.jpg).

[Actual item results](results-390.png) · [Desktop results](results-1440.png) · [No matches fixture](empty-390.png) · [Unavailable fixture](error-1440.png) · [Loading fixture](loading-390.png). Populated results use the actual local search API; all8 rendered item images were loaded in each accepted results capture. Early images taken before the first low-tier thumbnails finished loading were replaced. The renderer and item data were preserved.

## Final verification

Production review covers14 empty-palette viewport/theme states at320×568,390×844,768×900,1024×768,1440×900,1920×1080 and844×390, plus8 populated/no-match/error/loading states. All22 captures have no document overflow and no sampled axe violations. The field has0px internal border and no internal outline, with one focus treatment on its outer group. The body alone scrolls; header/input/footer and the close action remain reachable. Actual desktop/mobile/landscape/light and populated-state images and the theme/viewport sheet were opened.

The new regression uses25 repeated real item identities as an explicit UI fixture to exercise long-list scrolling. It checks ArrowUp-to-last-result focus/visibility, pinned search/close/footer, clear focus, internal-spacing clicks, Escape and actual backdrop dismissal at three viewport sizes. Existing real search/region/private-query tests remain. The focused six-test retest passes. `npm run qa:phase` on Node22/local PostgreSQL/Redis passes all10 commands:156 unit tests,88 ordinary production browser tests without snapshot updates,15 disposable database checks and9 bounded regional reads. Types, lint, build and advisories pass. Only two pre-existing unused-variable script warnings remain.17 documentation-validator tests, source/bundle configured-secret scans, rebuild inventory and current root reports are reconciled.

Fresh container smoke passes: homepage HTTP200, UID1000, no copied `.env`, PostgreSQL/Redis healthy; actual OAuth remains unconfigured. The owned QA container is removed after measurements. The separate local production preview remains at `http://localhost:3100`.

| One initial-route container/mobile lab sample | Performance | Accessibility | LCP    | CLS |
| --------------------------------------------- | ----------- | ------------- | ------ | --- |
| home                                          | 85          | 100           | 4.314s | 0   |
| market                                        | 95          | 100           | 2.857s | 0   |
| crafting                                      | 95          | 100           | 2.858s | 0   |

These initial-route single lab samples do not measure open-dialog device performance or establish a loading improvement. All sampled LCP values miss2.5s and homepage performance misses90. Full physical-device/screen-reader/WCAG acceptance, real OAuth, current-patch verification and owner approval remain independent. Earlier full-product gaps and release NO-GO remain open.

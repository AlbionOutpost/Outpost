# Market Explorer reference correction

Status: IN PROGRESS. Reference04: supplied327×576 QA-only crop [reference.png](reference.png). Structure: compact heading/filter strip, dense icon/name/variant/market/price observations table, selected item analysis below with city comparisons and a real observation chart. Do not invent24h changes or source coverage to populate the concept.

Historical pre-correction screenshot: `.qa/design-review/_tools_market-1440.png`. Controlled baseline00-before-layout uses eight-city fixture observations and three history points at1440×900/390×844/320×844, with a visible QA watermark. Fixture values are not live and are never shipped in product code. Source chart is requested explicitly; no implied continuous live feed.

Five baseline discrepancies: table begins too far below multiple configuration rows; narrow side panel squeezes the data; timestamps with milliseconds waste column width; normal table text inherits monospace; selected-item history sits beside configuration rather than below the table. First pass compacts filters and uses the reference’s table-first/detail-below arrangement, while preserving independent buy/sell timestamps and no-data/error structure.

Correctness changes: zero-valued missing sides no longer make a valid opposite-side observation look stale; actual cheapest sell order/highest buy order summaries carry source cities and do not imply arbitrage execution. Changing item/quality/region cancels pending market/history work and allows immediate reload. Full item catalog/watchlists and exact multi-item discovery are still incomplete.

## Iteration01 — rendered review

Viewed actual market-1440.png and viewport-390.png under `.qa/market-correction/01-data-first-layout/`. Desktop table now startsy352 rather thany582 and spans1280px rather than1012px; lower selected-item/chart region follows reference hierarchy. Mobile table startsy581 rather thany715, with no document overflow. Source/history values are explicitly watermarked fixtures.

Five visible corrections for next pass: table city names still inherit an old monospace td rule; quote summary inherits generic flex definition-list layout and wraps city names poorly; mobile shows redundant item names before any prices; long buy/sell headings prevent immediate comparison; Sort and Compare use separate mobile rows. Iteration02 explicitly fixes font roles/definition layout, adds selected-item context in a table caption, prioritizes city+prices on mobile with sticky city labels and compacts controls. Exact independent timestamps remain horizontally available.

The first baseline gate caught invalid definition-list children in the new quote summary. City descriptions now sit inside dd; the failure logs remain under00-before-layout/gate-failed. No axe rule was suppressed.

## Iteration02 — rendered review

Viewed viewport-1440.png and viewport-390.png. Mobile now shows selected-item context plus city/sell/buy immediately, with a sticky city column while scrolling to independent timestamps; table startsy525 instead of581. Desktop city names use Inter and prices use Geist Mono. Quote summaries no longer wrap source cities into broken fragments. Full gate passes71 units/46 browser tests.

Five remaining differences/limits: desktop caption uses two rows unnecessarily; row artwork/padding push selected-item analysis below the initial viewport; disclosure/table margins repeat vertical space; reference multi-item browsing remains narrower in scope than our single-item city comparison; no verified optional scene thumbnail or real24h-change metric is available. Iteration03 compacts caption/rows/margins and retains those honest scope/data gaps. A held-request regression also checks changing quality permits immediate historical reload.

## Iteration03 — final scoped rendered review

Inspected final1440×900 and390×844 captures. Desktop table startsy328 versus baseline582; width1280 versus1012; all eight fixture markets fit before the selected-item analysis begins at~805. Mobile starts at~496 versus baseline715; item caption retains context while city and buy/sell prices are immediately visible, with remaining timestamps available through labeled keyboard-focusable horizontal scrolling. Actual chart points remain source responses (isolated QA fixture values), not decorative fabricated history.

Final gate passes73 unit/47 production browser tests and all eight checks. Held history-request regression verifies a quality change permits a new request before the old one finishes. Added independent refining and quality-preserving enchanting arithmetic cases. Source-summary tests ignore missing sides and preserve real source cities. First markup failure remains retained; no accessibility assertions were weakened. Side-by-side comparisons are comparison-1440.png/comparison-390.png alongside source captures.

Remaining differences: this is a single-item city comparison rather than a broad multi-item watchlist; full catalog/favorites/watchlists remain incomplete; historical data loads explicitly and may be unavailable; no verified24h-change metric or permitted game-scene thumbnail is invented; region remains the shared navigation selector rather than a second conflicting selector. This closes the measured layout correction within existing functionality, not full market feature parity.

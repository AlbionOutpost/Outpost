# Market reliability: observations users can act on

[Implementation plan](../../engineering/MARKET_RELIABILITY_PLAN_2026-10-28.md) and [source review](../../engineering/reviews/2026-10-28-price-coverage.md) define this pass. Preserve the established charcoal/copper theme, Barlow display, Inter controls, numeric mono and functional item artwork. No award, global owner acceptance or full game-data certification is implied.

## Corrected workflows

- [Phone quality recovery](quality-390.png) / [desktop table](quality-1440.png): explicit other-quality lookup, selected state, source city/date, old-vs-recent label and keyboard return. Phone cards collapse empty observations; tablet uses two columns; desktop keeps dense columns. No automatic price substitution.
- [Dated selected-city loadout estimate](loadout-390.png): old observations are useful historical/unverified estimates, missing slots remain incomplete, purchase details follow the chosen city, and each item opens city/quality comparison. One of each equipped item; no inferred consumable stack size.
- [Contribution guide phone](help-390.png) / [desktop](help-1440.png): primary client setup links, exact scanning steps, current selection and return action. Query/cookie/account region priority matches the shell. The client is optional.
- [Extreme aggregate state](range-375.png): safe-range guard preserves individual source rows and refuses an unsupported total. This capture is an isolated extreme-price fixture, not a real market figure.

## Review and corrections

Sandboxed installed local Playwright library fallback was used. Previously unavailable Chrome/Playwright MCP access was not relabelled as successful browser MCP execution. No global browser setting or sandbox restriction was weakened.

Initial review rejected inherited fixed header height, hidden quality-table columns and cramped tablet actions. [Rejected desktop columns](rejected-quality-columns.png) are retained where available. Scoped CSS restores layout; phone/tablet cards keep selection visible. The final density pass removes repeated empty-card labels and resale quotes from purchase-only loadout details. Positive source timestamps stay unchanged; fixture numbers are not production observations.

Twenty final production-container states span320/375/390/768/1440/1920: twelve quality/loadout views, two explicit range states, six guide views. `.qa/market-reliability/manifest.json` and `help-manifest.json` record status, scroll position, geometry, source/fixture identity, page errors, axe and overflow. All return200, no unintended page overflow, browser errors or sampled axe violations; actual images were inspected at all six widths. Source guide-header overlap is explicitly measured; screenshots supplement keyboard/action regressions.

Node22 exact final phase passes286unit/107browser/15disposableDB/nine regional reads across ten gates. The earlier108browser commentary was a manual count error; logs are authoritative. First two full runs each failed one stale copy assertion and are preserved. Later repeated complete passes and exact final guard tests are separate records. Cloudflare107-case runtime suite and19nativeSQLite checks pass before the final CSS correction; seven affected runtime cases and the final real-source hosted check pass afterward.

Single initial mobile lab samples after regression/captures, with warm app caches: Market94performance/100accessibility, LCP3004ms/CLS0; guide95/100, LCP2854ms/CLS0. These are not controlled comparisons, field data, populated-state performance or full accessibility conformance. Main performance targets, physical-device and owner acceptance remain separate.

## Full live-data correction

The first public check returned all five quality alternatives and a dated partial loadout subtotal, but [live timestamp text overlapped](rejected-live-timestamps.png) when both sides had full city/date labels. Earlier sparse fixtures had no buy-side observation. Explicit normal whitespace/word wrapping on source timestamps fixes the inherited nowrap rule. The regression fixture now fills both sides and checks the rendered timestamp bounds. Final six-width fixture recaptures and real-source hosted recapture pass: both source-side timestamps wrap inside their cells. Seven affected Cloudflare journeys pass after the full107-case runtime suite. The intermediate live version is not recorded as visual completion.

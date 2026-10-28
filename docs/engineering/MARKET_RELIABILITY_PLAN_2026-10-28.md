# Market reliability and product quality plan

The owner requests fixes, implementation and parallel review, with particular concern about widespread “No quote” results. Success means useful, truthful prices and complete workflows; an award or perfection cannot be established by a test score.

## Work and acceptance

| Priority | Work                                                             | Acceptance                                                                                                                                                                                                                                                |
| -------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1       | Diagnose real source coverage across three servers and qualities | Record bounded primary-source observations, exact identity and missing-side counts; distinguish API gaps, stale observations and application failures.                                                                                                    |
| P1       | Fix request/cache defects                                        | Bound upstream URL sizes, reuse overlapping public item/quality caches, preserve server/city/item/quality and source times, respect compression/rate cooldowns. No paid ingestion or invented prices.                                                     |
| P1       | Make missing-price recovery useful                               | Show known subtotals and labelled historical estimates; distinguish unrequested/missing/stale/error states. Offer explicit other-quality discovery and correct city choices, never silent substitutions.                                                  |
| P1       | Close confirmed remaining calculation defects                    | Independent expected-value regressions, invalid/missing/source identity handling, server validation and private persistence regressions. Unknown game coefficients stay unknown.                                                                          |
| P2       | Provide an effective market-data guide                           | Explain the optional Data Project client, exact in-game scanning workflow, server/quality/city checks and cache delay; provide primary-source links and return to selected item.                                                                          |
| P2       | Review actual UI and interactions                                | Inspect six widths, populated/missing/error states, keyboard actions, readable source ages, no page overflow, actual item art. Preserve Outpost theme.                                                                                                    |
| Gate     | Validate and publish                                             | Node22 mandatory phase, native Cloudflare/database/cache checks, runtime browser regression, production container/lab sample, secret/docs/inventory checks, authorized Free deployment/GitHub, strict public checks. Preserve pending or failed evidence. |

## Parallel scope

The parent coordinates product scope, quality-discovery API, client guide, integration, rendered acceptance, evidence and publication. Dedicated agents audit public quote infrastructure, independent calculation logic and quote-state UI. They do not independently deploy, run overlapping full phases or change game facts without primary evidence.

## Initial evidence

Primary: https://www.albion-online-data.com/ and https://www.albion-online-data.com/client/ explain that players run a client which uploads orders they actually open in-game. No browser refresh can create unobserved orders. Current regional API docs describe compression, bounded URLs, rate limits and cooldowns. The site's existing source feed is already integrated; adding the client guide complements, rather than replaces, debugging.

A bounded direct-source baseline in `.qa/quote-audit/live-coverage.json` shows some real regional gaps: Europe Normal T4 bag asks8/8 cities versus T8 axe2/8 and T8 Mistwalker chest4/8; Asia Normal T8 axe/chest0/8. This sample is neither a complete game denominator nor proof that every missing quote is unavoidable. Five-quality follow-up and application diagnostics are in progress.

## Outstanding boundaries

All current-patch mechanics, every catalog family, liquidity/order execution, actual personal OAuth/admin lifecycle, operator/legal/recovery and owner visual acceptance remain independently assessed. A fallback estimate never becomes a current executable quote. Cross-city/cross-quality alternatives remain explicit actions with their own identities.

Implementation and acceptance: IN PROGRESS. Final evidence will be recorded here and in the generated QA reports.

## Implementation evidence

- [Price pipeline/source review](reviews/2026-10-28-price-coverage.md): exact reuse, URL and cache-operation bounds,50/minute+250/five-minute guard, retry reservation and one multi-quality build-cost batch.
- [Calculator follow-up](reviews/2026-10-28-calculator-followup.md): decimal ceilings, exact enchanting quality, usable share links and safe observed-cost aggregates.
- `/api/market/qualities` and `/market-data`: explicit five-quality discovery and optional client workflow. Help follows query/cookie/account region preference; source times are never replaced by request time.
- Actual production captures cover six widths for populated quality alternatives, dated loadout cost and the client guide. Review rejected inherited hidden columns, cramped tablet cells and global fixed header height. All20 production states (14 quote/range and six guide captures) fit with no page errors or sampled axe violations; actual images inspected.
- Both initial production browser failures were stale text assertions after intentional copy corrections. Later107-browser runs passed before the final bounded aggregate guard; the exact final release phase passes286 unit and107 browser tests,15 disposable database checks and nine regional reads across all ten gates. Cloudflare runtime/publication checks remain in progress.

No award, perfection, complete source coverage or full current-patch mechanics certification is claimed. Publication and remaining validation are recorded below after actual checks.

## Published result

LIVE on Cloudflare Free web93975c07-f835-48a1-ab5e-744fb227d58e after the real-source timestamp correction. Final Node22 phase286unit/107browser/15DB/nine regional reads passes all ten gates. Full Cloudflare107browser/native19 pass before the final CSS-only wrap; seven affected runtime journeys pass afterward. Final Free bundle checks and source/browser secret scans pass with no paid services.25 strict public checks, real quality API, invalid-city400, quality selection, contextual guide return and actual partial loadout estimate pass. OAuth-start/PKCE/cookieflags pass; this is not personal consent/admin/logout evidence.

Source/GitHub synchronization and independent CI are recorded in project progress. Full game-mechanics/current-patch data, personal account lifecycle, operator/legal/recovery, field performance and owner acceptance remain open; tests cannot certify perfection or create unobserved market prices.

GitHub source94665c4 is pushed. Deployment CI [40787444103](https://github.com/AlbionOutpost/Outpost/actions/runs/40787444103) is in progress; prior40781352764 completed successfully. Manual final publication is already verified independently.

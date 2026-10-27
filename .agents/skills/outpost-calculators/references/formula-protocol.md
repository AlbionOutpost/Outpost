# Formula review and independent oracles

The [source ledger](../../../../DATA_SOURCES.md) owns game-specific provenance. These examples validate manual accounting under stated inputs, not current tax, recipe or return mechanics.

## Ledger fields

For each formula record input/output units (silver/item, items/batch, percent versus fraction, silver/trip, focus/batch), source URL and exact applicability/revision, target patch if known, equation, precision/rounding boundary, invalid range, zero denominator result, excluded mechanics and independent fixture location. Distinguish expected fractional returned materials from an actually executed inventory path. Setup/relisting/order execution must state its base and number of charges.

## Independent reference scenarios

| Scenario                | Hand calculation and expected outputs                                                                                                                                                                                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trade                   | Buy 10 at 100, sell at 150; manually supplied tax 8% + sale setup 2.5%, one transport 50. Initial cost=1,050; gross=1,500; fees=157.5; profit=292.5; margin=19.5%; ROI=292.5/1,050×100. These rates are assumptions.                                                                         |
| Crafting accounting     | One supplied output 3,000; gross materials 2,000; eligible retained return 20%; station 100; supplied sale tax 10%. Upfront=2,100; retained credit 400; effective cost 1,700; sale fee 300; cash profit 600; economic profit 1,000; ROI=1,000/1,700×100. This proves no ingredient quantity. |
| Focus comparison        | Same crafting scenario with supplied 40% eligible return and 100 focus: economic profit 1,400; total profit/focus 14; incremental focus value=(1,400−1,000)/100=4. Do not call 14 the incremental benefit.                                                                                   |
| Strictly positive trade | Buy 10 at 100 plus 50 transport, no fees: break-even 105 per item; minimum strictly profitable whole-silver sale 106. Test near-integer floating-point boundaries separately.                                                                                                                |

Use explicit constants/rational calculations independently of imports from the implementation. Tests using recipeFor or returnRateFromBonus to generate their expected fixture cannot independently verify that same recipe/bonus.

## Regression map

- Accounting/precision: [production tests](../../../../tests/production.test.ts), [trade tests](../../../../tests/calculations.test.ts), [transport tests](../../../../tests/transport.test.ts).
- Source identity/freshness: [observations](../../../../tests/production-observations.test.ts), [market integration](../../../../tests/production-market.test.ts), [freshness e2e](../../../../e2e/production-freshness.spec.ts).
- Persistence/region/modes: [production e2e](../../../../e2e/production.spec.ts), [modes](../../../../e2e/production-modes.spec.ts), [trade scenarios](../../../../e2e/trade-scenarios.spec.ts), [transport](../../../../e2e/transport.spec.ts).

Run only relevant focused tests during iteration; the phase gate supplies broad regression. Do not add duplicate tests just to mirror the ledger. If a listed case lacks independent coverage, document the gap and add a meaningful test when implementing that mechanic.

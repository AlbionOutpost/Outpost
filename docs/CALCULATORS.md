# Calculators

Every calculator is a pure function in `src/lib/albion` with a Zod schema, used by the UI; saved scenarios are schema-checked on the server, and production, plan, transport and farming results are re-run there. Units are **silver**; percentages are entered 0–100. Totals are capped at 1e12 silver, quantities at 1e6, batches at 1e5. Missing or mismatched prices make the result incomplete (null totals) — see [DATA.md](DATA.md#truth-rules).

**Price sides.** Instant buy uses `sell_price_min`; instant sale uses `buy_price_max`; listing uses the destination `sell_price_min`. A Black Market price is never a purchase source.

## Trade / flipping — `calculations.ts` → `trade()`

Inputs: buy price, buy mode (instant / buy order), buy-order fee %, sell price, quantity Q, tax %, setup fee %, transport.

```
purchaseFees = buy·Q·buyFee/100            (buy-order mode only)
cost         = buy·Q + purchaseFees + transport
revenue      = sell·Q
fees         = revenue·(tax + fee)/100
profit       = revenue − cost − fees
margin, roi  = null when the denominator is 0
```

`breakEven` and `minimumProfitableSale` use exact BigInt rationals (`decimal.ts`). Example: buy 100, sell 150, Q 10, tax 8, fee 2.5, transport 50 → profit **292.5**, minimum profitable sale **118**.

**Opportunity scanner** (`/api/opportunities`): 1–25 items, one quality; origin can't be Black Market; Black Market destination only for instant sale; rows run through `transport()` and sort by profit. No liquidity model yet.

## Production — `production.ts` → `production()`

Crafting, refining, enchanting, cooking and alchemy all use this engine.

Inputs: recipe, batches, quality, material/output city, region, per-ingredient prices and return eligibility, return % and focus return %, use focus, focus used, station fee (silver/batch), tax %, setup %.

```
r                = (useFocus ? focusReturnRate : returnRate) / 100
gross            = Σ qty·unitPrice
returnCredit     = Σ (eligible) gross·r
stationCost      = stationFee·batches
revenue          = outputPrice·outputCount·batches
fees             = revenue·(tax + setupFee)/100
cost             = gross − returnCredit + stationCost
profit           = revenue − fees − cost            (economic, values returns)
cashProfit       = revenue − fees − gross − stationCost
profitPerFocus   = profit / focusUsed
incrementalFocus = (returnCredit − baseReturnCredit) / focusUsed
```

- Output quality is fixed at 1 for refining, cooking and alchemy.
- Enchanting rejects focus and return flags.
- `estimatedFocusCost(base, efficiency, batches) = base·2^(−efficiency/10000)·batches` (no per-operation rounding yet).
- `returnRateFromBonus(b) = 1 − 1/(1 + b/100)`.

**Return profile** (`production-profile.ts` → `sourcedReturnRates`):

```
bonus           = 18 + (city specialty ? refining 40 | crafting 15 : 0) + daily (0/10/20)
returnRate      = 100·b/(100 + b)
focusReturnRate = 100·(b + 59)/(159 + b)
```

Refining cities: metal bar Thetford, planks Fort Sterling, cloth Lymhurst, leather Martlock, stone Bridgewatch. Crafting: axe/shield Martlock; sword/bow/shoes Lymhurst; cowl/jacket Thetford; bag/cape none. `refiningEfficiency(tier, levels) = 30·Σlevels + 250·levels[tier−4]`.

**Plan** (`production-plan.ts`): ≤30 runs in one region; materials aggregate by city/item/quality; any incomplete run nulls the total. **Sensitivity** (`production-sensitivity.ts`): output price at 80–120%.

## Transport — `transport.ts` → `transport()`

```
trips         = max(1, ceil(Q·weight / capacity))
transportCost = trips·costPerTrip + risk
→ trade(), with setup fee only in listing mode
```

`transportPriceMatches()` enforces item/quality/region/city/execution identity. Weight and capacity are manual until item weights and mounts are in the data.

## Farming — `farming.ts` → `farming()`

```
expectedSeeds      = ((plants − watered)·baseYield% + watered·wateredYield%) / 100
upfront            = plants·seedPrice·(1 + buyFee/100) + operatingCost
revenue            = plants·harvestPerPlant·productPrice
cashProfit         = revenue·(1 − sellFee/100) − upfront
profit             = cashProfit + expectedSeeds·seedPrice
focusBenefit       = watered·(wateredYield − baseYield)/100·seedPrice
```

## Fishing — `fishing.ts`

- `fishConversion()`: chops = Q·choppedPerFish; compare chopped revenue − chopping cost vs raw revenue, both after sell fee; break-even per chop.
- `fishFame()`: fish needed = ⌈target / famePerFish⌉ (exact), cost, silver per 1,000 fame. Example: 10,000 fame at 210/fish → 48 fish.

## Build cost, shopping, loot

- **Build cost** (`/api/builds/[id]/cost`): `sell_price_min` per slot at the build's quality in the chosen city, × sets (≤1000); null total if any slot is missing (`observed-costs.ts`, `loadout-quotes.ts`).
- **Shopping** (`shopping.ts`): buy = max(0, required − owned); a source 0 is unavailable, a manual 0 is valid; lists merge only within one server.
- **Loot split** (`lib/groups/loot.ts`): net = pool − expenses (BigInt); integer shares by weight; leftover silver goes 1 each to the largest remainders, ties by user ID.

## Saved scenarios

`/api/scenarios` kinds: crafting, refining, enchanting, transporting, flipping, production-plan, farming, shopping-list. The server validates every kind against its schema and re-runs the engine for crafting/refining/enchanting, production-plan, transporting and farming (flipping and shopping lists are schema-checked only). Fishing can't be saved yet.

## Verifying a change

Write the expected value **by hand** (or with exact rationals) before running the code — never generate a fixture with the function under test. Cover: normal and negative profit, zero quantities and denominators, invalid/fractional input, very large values, missing/stale/mismatched prices, region switch, focus on/off, save/reload. Reference cases:

| Scenario                                                                           | Expected                                                                                           |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Trade: buy 10 @100, sell 150, tax 8%, setup 2.5%, transport 50                     | cost 1,050 · gross 1,500 · fees 157.5 · profit 292.5 · margin 19.5%                                |
| Crafting: output 3,000, materials 2,000, eligible return 20%, station 100, tax 10% | upfront 2,100 · return credit 400 · cost 1,700 · fee 300 · cash profit 600 · economic profit 1,000 |
| Same with 40% return and 100 focus                                                 | profit 1,400 · profit/focus 14 · incremental focus value 4                                         |
| Buy 10 @100 + 50 transport, no fees                                                | break-even 105 · minimum profitable whole sale 106                                                 |
| Return profile, refining specialist city, no daily                                 | 58/158 = 36.709% · with focus 117/217 = 53.917%                                                    |

Tests: `tests/calculations`, `production`, `production-profile`, `production-plan`, `production-sensitivity`, `production-observations`, `production-market`, `reviewed-recipes`, `transport`, `opportunities`, `farming`, `fishing-journal`, `build-cost*`, `loadout-quotes`, `observed-costs`, `shopping`, `team-loot` (`*.test.ts`); browser flows in `e2e/production*.spec.ts`, `trade-scenarios`, `transport`.

## Known gaps

No enchanted (.1–.4), artifact, royal/Avalonian, heart or transmutation recipes; enchanting stops at .3 for 7 families; no crafting specialization/mastery-derived focus or IP; no station focus rounding; no tax/setup presets; cooking/alchemy have no category-specific mechanics; no item weights or mount capacity; no laborers, animals or islands. See [ROADMAP.md](ROADMAP.md).

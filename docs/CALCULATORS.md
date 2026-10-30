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
- Enchanting rejects focus and return flags. Upgrades come from `game/upgrades.json`: each step from `.n−1` to `.n` costs the listed rune/soul/relic count (96 helmet/boots/cape/off-hand, 192 chest/bag, 288 one-handed, 384 two-handed).
- Ingredients flagged `returnable: false` (artifacts, tokens, enchanting inputs) never earn return credit, whatever the saved flags say.
- Recipes resolve by ID: bundled legacy IDs (`battleaxe-t4`) or game IDs (`T4_MAIN_AXE`, `T4_MAIN_AXE@2`, `T8_2H_BOW_HELL~2` for the second alternative). The client fetches game recipes from `/api/recipes`; server routes import `game/server-recipes.ts`.
- `estimatedFocusCost(base, efficiency, batches) = base·2^(−efficiency/10000)·batches` (no per-operation rounding yet).
- **Focus from specs** (`focus.ts`): `efficiency = Σ level × perLevel` over every spec whose item patterns and tier range match the item (mastery 30/level, specialist 30 + 250 on its own item); `focusPerCraft = base / 2^(efficiency/10000)`. Levels are saved on the device (`/tools/mastery`).
- `returnRateFromBonus(b) = 1 − 1/(1 + b/100)`.

**Return profile** (`production-profile.ts` → `sourcedReturnRates`):

```
bonus           = 18 + (city specialty ? refining 40 | crafting 15 | butchering 10 : 0) + daily (0/10/20)
returnRate      = 100·b/(100 + b)
focusReturnRate = 100·(b + 59)/(159 + b)
```

Specialty cities come from `game/production-bonuses.json`, keyed by the recipe's crafting category:

| City          | Refining | Crafting                                                    |
| ------------- | -------- | ----------------------------------------------------------- |
| Fort Sterling | Wood     | Hammer, spear, holy staff, plate helmet, cloth armor        |
| Lymhurst      | Fiber    | Sword, bow, arcane staff, leather helmet, leather shoes     |
| Bridgewatch   | Stone    | Crossbow, dagger, cursed staff, plate armor, cloth shoes    |
| Martlock      | Hide     | Axe, quarterstaff, frost staff, plate shoes, off-hands      |
| Thetford      | Ore      | Mace, nature staff, fire staff, leather armor, cloth helmet |
| Caerleon      | —        | Gathering gear, tools, food, war gloves, shapeshifter staff |
| Brecilien     | —        | Cape, bag, potion                                           |

`refiningEfficiency(tier, levels) = 30·Σlevels + 250·levels[tier−4]` (kept for saved profiles; the same numbers come out of `focus.ts`).

**Plan** (`production-plan.ts`): ≤30 runs in one region; materials aggregate by city/item/quality; any incomplete run nulls the total. **Sensitivity** (`production-sensitivity.ts`): output price at 80–120%.

## Transport — `transport.ts` → `transport()`

```
trips         = max(1, ceil(Q·weight / capacity))
transportCost = trips·costPerTrip + risk
→ trade(), with setup fee only in listing mode
```

`transportPriceMatches()` enforces item/quality/region/city/execution identity. The UI fills weight per item from `/api/items/game` (only replacing an empty or previously auto-filled value) and offers mount presets from `mounts.ts` (carry weight bonus per quality, without the character's own load).

## Laborers — `laborers.ts` → `laborers()`

```
factor        = returnFactor[houseTier][journalTier − houseTier]   (null → not allowed)
unitsPerJrnl  = lootAmount[type][journalTier] · factor
valuePerUnit  = Σ share_i · price_i            share_i = weight_i / Σ weight (unpriced → 0)
lootNet       = valuePerUnit · units · journals · (1 − (tax + listing setup)/100)
emptyNet      = sellEmpty ? emptyPrice · journals · same rate : 0
cost          = fullPrice · journals · (1 + buyOrder setup/100)
profit        = lootNet + emptyNet − cost        complete only when coverage = 100 %
```

Fees are subtracted from the sale like every other calculator (the archived site divided by 1.065/1.105 here, which understates tax). Unpriced loot gives a labelled lower bound. Reference case: T4 blacksmith, T4 house → 17.2 units; bars 100, planks 50, cloth 20 → 82/unit, 1,410.4 gross; 8 % tax, full 1,000, empty 100 → profit **389.568**.

## Roads of Avalon — `avalon-map.ts`

Portals live in the browser (`outpost:avalon-map-v1`); one link per zone pair; `findRoute` is breadth-first over links that are still open.

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

Tests: `tests/game-data`, `laborers`, `avalon-map`, `calculations`, `production`, `production-profile`, `production-plan`, `production-sensitivity`, `production-observations`, `production-market`, `reviewed-recipes`, `transport`, `opportunities`, `farming`, `fishing-journal`, `build-cost*`, `loadout-quotes`, `observed-costs`, `shopping`, `team-loot` (`*.test.ts`); browser flows in `e2e/production*.spec.ts`, `trade-scenarios`, `transport`.

## Known gaps

No heart or transmutation recipes and no cheapest-path refining planner yet; enchanting stops at .3 (the game has no .3 → .4 foundry upgrade); no station focus rounding or IP; no tax/setup presets; cooking/alchemy have no category-specific mechanics; no nutrition-based station fees; no animals or islands. Laborers and Avalon portals can't be saved as server scenarios yet. See [ROADMAP.md](ROADMAP.md).

# Calculator mechanics and independent examples

Reproduce **the declared accounting models**, not guessed Albion mechanics. Pure engines live in `src/lib/albion/calculations.ts`, `production.ts`, `transport.ts` and `recipes.ts`; UI lives in the corresponding calculator components. All prices/costs are silver unless explicitly labelled otherwise. Percentages enter as0–100-style percentage inputs, then divide by100; `returnedMaterialCost` alone takes a fraction0≤r<1. Keep these units distinct.

## Manual trade

Let B=unit buy price, S=unit sale price, Q=positive integer quantity, U=buy-order setup percent when buyMode is buy-order (otherwise0), T=tax percent, F=sale listing fee percent and X=one-time transport/cargo cost.

```text
purchaseFees = B × Q × U / 100
cost = B × Q + purchaseFees + X
revenue = S × Q
fees = revenue × (T + F) / 100
profit = revenue - cost - fees
marginPercent = profit / revenue × 100, or null when revenue = 0
roiPercent = profit / cost × 100, or null when cost = 0
sale break-even = cost / (Q × (1 - (T+F)/100)), if feasible
minimum profitable whole-silver sale = strictly greater than exact break-even
```

Break-even output is an approximate displayed decimal; strict whole-silver profitability uses exact decimal-to-BigInt ratios so near-integer floating error does not suggest the wrong extra silver. If retained revenue is≤0 or the feasible model revenue/cost bound is exceeded, thresholds are null. Zero profit is not positive profit.

Bounds: buy/sell/transport nonnegative≤1e12, quantity integer1–1,000,000, rates0–100; cost and revenue each≤1e12. No automatic current tax/premium presets, repeated-listing costs, partial fills or execution probability is implied.

Independent example: B100, S150, Q10, tax8, fee2.5, transport50, instant purchase gives cost1050, revenue1500, fees157.5, profit292.5, margin19.5%, ROI27.857142857%. Break-even≈117.318435754 and the first profitable whole-silver unit price is118. At117 profit is−2.85; at118 it is6.10. With zero fees the exact105 break-even needs106 for positive whole-silver profit. With100% retained-sales fees no feasible profitable threshold exists.

## Production: crafting/refining/enchanting

`productionSchema` stores kind, region, material/output city, recipe, batches, quality, a price map, per-material return eligibility, ordinary/focus return percentage, useFocus/focusUsed, stationFee, tax/setupFee and enchanting family/tier/path. Batches1–100000; stationFee is silver per batch; focusUsed is **total supplied focus**, not a specialization level or silently calculated cost. Using focus requires a positive total focus input. Enchanting rejects focus or return flags in this model.

For ingredient i let qi=recipe quantity×batches, pi=validated unit price, ei=selected return-eligibility flag, r=chosen ordinary/focus return percentage/100, N=outputCount×batches, P=output unit price and K=station fee per batch.

```text
grossMaterials = sum(qi × pi)
returnCredit = sum(qi × pi × r for selected eligible ingredients)
stationCost = K × batches
upfront = grossMaterials + stationCost
revenue = P × N
fees = revenue × (tax + setupFee) / 100
effectiveCost = grossMaterials - returnCredit + stationCost
economicProfit = revenue - fees - effectiveCost
cashProfit = revenue - fees - grossMaterials - stationCost
profitPerItem = economicProfit / N
profitPerFocus = economicProfit / totalFocusUsed, only with focus
incrementalPerFocus = (focus returnCredit - ordinary returnCredit) / totalFocusUsed
```

Returns are retained-resource value; they do not reduce the initial material purchase cash requirement or create extra sale output. Profit/focus and incremental focus value are different metrics. Do not subtract station fees twice or apply selected output quality to Normal raw ingredients. Refining output always matches Normal quality1. An ingredient can explicitly use the selected quality, notably the base item for enchanting.

Manual prices preserve intentional zero; observed zero/null/wrong quality/region/city becomes missing. Source timestamps can mark stale without inventing a replacement price. When required inputs/output are missing, `complete=false`, relevant material/upfront totals and profit metrics are null, known rows remain inspectable and missing IDs are listed. A partial known material subtotal is not a complete profitable scenario.

The schema validates recipe/path selection and caps scenario material+station cost and output revenue at1e12. Do not allow negative quantities, NaN/infinity, unsupported paths or a blank input converted to a trusted zero. The UI retains manual overrides during source refresh and saves actual assumptions, not a promise of fresh prices.

Independent Bow example: three T4 Bows require96 planks. At50 silver/plank,25 station/batch,2500 per output and supplied10.5% combined sale fees: materials4800, station75, upfront4875, revenue7500, fees787.5, economic and cash profit1837.5 with no returns. Select20% return on planks: retained credit960, effective cost3915, economic profit2797.5, cash profit still1837.5, upfront still4875. These arithmetic examples do not assert a current city bonus or tax rate.

## Recipe table and historical source scope

The nine crafting rows below are pinned July-source ingredient/base-focus records in `reviewed-crafting.json`; outputCount is1 and material quality is Normal. They are not certified as the current live patch. Preserve each exact source URL and recipe ID from the JSON.

| Recipe id/output                                | Ingredients per craft            | Historical base focus |
| ----------------------------------------------- | -------------------------------- | --------------------- |
| `broadsword-t4` / `T4_MAIN_SWORD`               | 16 `T4_METALBAR` +8 `T4_LEATHER` | 1286                  |
| `battleaxe-t4` / `T4_MAIN_AXE`                  | 16 `T4_METALBAR` +8 `T4_PLANKS`  | 1286                  |
| `bow-t4` / `T4_2H_BOW`                          | 32 `T4_PLANKS`                   | 1715                  |
| `shield-t4` / `T4_OFF_SHIELD`                   | 4 `T4_PLANKS` +4 `T4_METALBAR`   | 429                   |
| `scholar-cowl-t4` / `T4_HEAD_CLOTH_SET1`        | 8 `T4_CLOTH`                     | 429                   |
| `mercenary-jacket-t4` / `T4_ARMOR_LEATHER_SET1` | 16 `T4_LEATHER`                  | 858                   |
| `mercenary-shoes-t4` / `T4_SHOES_LEATHER_SET1`  | 8 `T4_LEATHER`                   | 429                   |
| `cape-t4` / `T4_CAPE`                           | 4 `T4_CLOTH` +4 `T4_LEATHER`     | 429                   |
| `bag-t4` / `T4_BAG`                             | 8 `T4_CLOTH` +8 `T4_LEATHER`     | 858                   |

The retained standard T4 steel recipe is2 `T4_ORE` +1 `T3_METALBAR`→1 `T4_METALBAR`. Its old source URL points to **Pristine Steel Bar while output is plain Steel Bar**. That applicability mismatch remains a blocker, not a reason to claim the arithmetic engine verifies the game recipe.

Enchanting supports applicable starter equipment families, family-supported T4–T8 and .0→.1/.2/.3 paths. Mount/Food/Potion are excluded. The original item is quantity1 at selected quality; each step adds the tier’s RUNE, SOUL or RELIC. Current implemented counts are288 for Main hand,192 for Chest/Bag,96 otherwise. These are retained starter assumptions, not verified universal current two-hand/artifact counts. .4 Foundry upgrades are not implemented. Preserve the unsupported/error states rather than extrapolate counts.

`returnRateFromBonus(B)=1−1/(1+B/100)` for bounded supplied production bonus; this algebra is not an automatic current city lookup. Historical focus estimate is `base × 2^(−efficiency/10000) × batches`, with validated supplied total efficiency. At efficiency10000 it is half base,20000 quarter base. It is fractional and does not implement actual station rounding, current specialization-node coefficients or automatic focus usage.

## Cargo and scanner

```text
totalWeight = quantity × supplied unit weight
trips = max(1, ceil(totalWeight / supplied capacity))
transportCost = trips × costPerTrip + supplied risk
```

The complete validated buy/sell observation pair is passed into the same trade engine. Buy uses source minimum sell listing; instant destination sale uses maximum buy order, listing estimate uses minimum sell listing. Observed sell execution must match the chosen mode; Black Market only permits instant mode. Manual weight, mount capacity, travel cost and risk remain manual, not verified game metadata. Zero total weight still makes at least one trip in the declared model.

Example: Q10, weight2, capacity8→20 total weight/3 trips. At5 cost/trip plus7 risk, transportCost22. With B100/S150/no sale fees, total cost1022 and profit478. Wrong item/quality/city/region/side makes the observed pair incomplete. Missing/stale values must remain visible.

The scanner batches at most25 selected IDs and ranks complete one-item estimates using the same accounting. It is not the complete Albion market, an enchantment-upgrade scan or guaranteed executable profit. Preserve the methodology statement and no-liquidity assumption.

## Persistence, UI and missing categories

All five supported scenario kinds use validated private `SavedScenario` configuration and static `#scenario=` fragments. Reject fragments over65536 characters or the wrong calculator kind. Source dates survive save/share; reloading is not a refresh. Tables display inputs, cash/economic distinctions, fees, missing prices and manual/observed provenance beside results, with mobile ordering and readable number fonts.

Farming, animals, cooking, alchemy, laborers, fish processing, calculated IP, automatic current city/focus/spec and multi-recipe/journal planning are not dedicated complete engines. Build replacement cost is a separate observed gear sum with quality batching and incomplete-total propagation. Gold history is observation browsing, not a gold trading model. See [calculator parity](../engineering/CALCULATOR_PARITY.md) and preserve its supported/unsupported boundaries during a rebuild.

---
name: outpost-calculators
description: Build or verify Outpost's economy calculators — crafting, refining, enchanting, cooking, alchemy, farming, fishing, flipping, transport, build cost, shopping lists, loot splits — including returns, focus, specialization, city bonuses, taxes, fees, profit and saved scenarios. Use for any formula, input or result change.
---

# Outpost calculators

A calculator that is pretty but wrong costs players silver. Prove the math independently, keep every assumption visible, and make the result easy to act on.

Read [docs/CALCULATORS.md](../../../docs/CALCULATORS.md) (formulas, reference cases, gaps) and [docs/DATA.md § Truth rules](../../../docs/DATA.md#truth-rules).

## Workflow

1. **Trace the path:** UI input → Zod schema/defaults → recipe/mechanics → price identity (region · city · item · quality · side · execution) → engine in `src/lib/albion` → display → scenario save/reload (`/api/scenarios`).
2. **Write the formula down** before coding: units (silver, items/batch, % vs fraction, silver/trip, focus/batch), source and patch, rounding, caps, zero-denominator results and what is deliberately excluded. Unknown game coefficients stay manual inputs, labelled as assumptions.
3. **Compute expected values by hand** (or exact rationals) — never by calling the function under test or helpers it uses (`recipeFor`, `returnRateFromBonus`). Add them as fixtures.
4. **Keep the money concepts separate:** upfront cash, returned-resource value, effective cost, gross revenue, fees, cash profit, economic profit, ROI, margin, profit per focus, incremental focus value.
5. **Respect data truth:** a missing or mismatched price nulls the result (`complete:false`); a manual 0 is valid and labelled; refreshing prices keeps manual overrides; saved scenarios don't make old prices fresh.
6. **Design the result** with `outpost-frontend`: results before accounting detail, assumptions and source/freshness beside each price, mobile steps that keep input state.

## Test

Normal and negative profit · zero quantities and denominators · invalid and fractional input · very large values · missing / stale / wrong-identity prices · region switch · focus on/off · save, reload, delete · mobile layout. Run the focused unit tests listed in CALCULATORS.md, then the affected browser specs (`production*`, `trade-scenarios`, `transport`, `farming`, `fishing-journal`, `shopping`).

## Never

Invent recipes, return rates or fee presets; silently drop fees; use returns to understate the cash a player needs up front; label fixture or manual prices as live; accept a plausible number without a source for the mechanic.

## Report

Calculator and scope → formula with units and sources → hand-worked scenario (expected vs actual) → tests run → states checked in the UI → mechanics still unknown or unsupported. Update CALCULATORS.md when a formula or coverage changes.

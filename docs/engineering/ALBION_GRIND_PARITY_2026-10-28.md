# AlbionOnlineGrind functional parity — October 28

The owner requested functional reuse of their old site, not another visual-only pass. Reviewed the archive handoff, feature inventory and recovered farming expression under `Scrape/albiononlinegrind.com/report`. The archive is captured frontend/data and contracts, not the original private repository or a working backend. Its old ownership/premium checks are not transplanted.

## Implemented workflows

**Production planner:** embedded in crafting, refining and enchanting, with a top-of-workspace jump link. Add up to30 recipes, adjust non-focused quantities, edit and replace recipes, remove rows, consolidate gross shopping quantities by item/quality/purchase city, and inspect combined upfront cash, cash profit, returned-resource value, economic cost, revenue, fees, margin and entered focus. Per-recipe price differences remain additive. A plan uses one game server; stored plans preserve that server. Missing prices invalidate affected totals instead of silently becoming zero. Explicit observation refresh deduplicates requests, caps concurrency at3, retains manual prices, preserves observation timestamps and keeps previous inputs on request failure. JSON download and separate static share hashes preserve inputs. Private save/list/delete reuse existing session/origin/ownership/no-store boundaries; no migration or new owner-controlled field.

**Farming:** `/tools/farming`, available from Tools and global search. Fifteen real crops/herbs and historical seed-return defaults; search, partial watering, supplied harvest per plant, separate purchase/sale cities, manual or observed sell-listing prices, supplied purchase/sale fees and other expenses, upfront cash, expected fractional seeds/produce, seed asset credit, cash/economic profit and incremental watering value per entered focus. Private save/reload and static sharing use the existing scenario API. Unknown harvest yield and absent prices prevent profit calculation. Selecting another crop clears prices; refresh preserves manual edits and rejects mismatched identities. Region changes abort pending requests.

## Accounting and source boundaries

[Source/output checksums and verification stages](../data/farming-source.json) are recorded separately. The crop/seed IDs, names, tiers and historical seed-return percentages are minimal factual transcription from `report/data/static-tables/farm-profit-calculator-95bd4c2a744fc339.json`, source SHA256 `3163614d1f7aa20de18266f04c34ac594dd63d39a1c10bba2178736aa655592e`. The harvested data contains15 rows. The recovered arrow expression uses8.8/4.4 produce, optional10% bonus, fee divisors and rounded intermediate values. Outpost does **not** silently adopt those old yield/fee/rounding assumptions. Harvest yield is required user input including their actual premium/local effects; sales fees are explicit percentages of gross sales. Seed credits use entered seed unit price, excluding purchase fees. No current-patch certification or broad third-party rights finding is asserted.

[Official farming guide](https://albiononline.com/news/guide-farming) supports the planting/watering/harvesting workflow and returned seeds. It does not certify all15 historical coefficient rows. Game artwork uses the existing validated item renderer. Observed prices use the existing Albion Online Data Project integration; no observed figures are shipped as fixtures.

Independent accounting:10 plants,5 watered, base0%/watered200%, yield8 produce, seeds2000 silver, produce100, purchase fee1%, sale fees10%, other costs100, total focus500. Upfront20300;80 produce gives8000 revenue and800 fees; cash profit−13100. Ten retained seeds are valued20000, giving6900 economic profit. Watering adds20000 seed value versus unwatered, or40 silver/focus. These supplied inputs prove arithmetic, not game coefficients.

Two craft runs with32 bars at100 and16 planks at50 require4000 gross materials plus200 station costs. Revenue6000, fees600, return credit800: cash profit1200 versus economic profit2000. Gross shopping quantities remain32/16.

## Explicit remaining scope

Full old-site parity is **not complete**. Farming is a single-harvest expectation, with no automatic island/city/premium/spec coefficients, growth-cycle simulation, byproducts, animals or execution guarantee. Production planning does not automatically consume intermediate outputs, calculate journals/cargo weight, unify all recipe families, or round focus per station operation. Recipe catalog remains45 crafting/25 refining normal recipes plus the existing supported enchanting subset. Full enchanted/artifact/food/potion recipes, cooking, alchemy, laborers, fish and calculated IP remain unfinished. Saved assumptions do not establish current game mechanics. The archive's complete original backend/auth/database cannot be recovered from captured HTML.

## Verification

Unit fixtures: [production planning](../../tests/production-plan.test.ts), [farming](../../tests/farming.test.ts). Browser journeys: [planner](../../e2e/production-plan.spec.ts), [farming](../../e2e/farming.spec.ts). They cover aggregation, overrides, missing/stale/zero prices, limits, actual focus, save/reload/share/export, private no-store and cross-user denial. Test sessions are fixtures, not Discord OAuth.

[Rendered evidence and final phase record](../design-review/production-planning/README.md). Current counts/results are generated in [QA_REPORT](../../QA_REPORT.md). Full-product, current-patch, physical-device, field-performance and owner acceptance remain separate open gates; release stays NO-GO.

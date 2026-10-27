# Data sources and formula provenance

Reviewed and exercised 2026-10-25. Reference functionality is reimplemented independently; no premium access, proprietary code, guide text or distinctive visual assets were copied.

## Reference research

https://albiononlinegrind.com/ — reviewed public homepage/navigation and linked use cases: profit tools, market checking, islands/timers, resource pricing, Avalon planning, gold/mastery, builds and guides. Premium-gated functionality was not accessed. The Atlas product specification remains the implementation backlog.

## Market contract

- Overview: https://www.albion-online-data.com/api/
- Americas: https://west.albion-online-data.com/api-docs
- Europe: https://europe.albion-online-data.com/api-docs
- Asia: https://east.albion-online-data.com/api-docs
- Machine-readable schema verified: https://europe.albion-online-data.com/api/v2/swagger_doc

The schema documents per-IP budgets of 100 requests/minute and 300/five minutes, required compression, a 4096-character URL limit and epoch-second RateLimit-Reset on 429. Atlas uses a smaller shared upstream budget, cache/deduplication and reset-aware cooldowns. One uncompressed documentation request was throttled during research; further requests waited for reset and used compression. Application requests always request gzip/deflate.

Verified public read endpoints in all three regions via `scripts/verify-live.ts`:

- `/api/v2/stats/prices/T4_BAG.json?qualities=1`
- `/api/v2/stats/history/T4_BAG.json` with city, quality, date window and 24-hour timescale.
- `/api/v2/stats/gold.json?count=168`

Price schemas preserve item ID, city, quality, lowest sell/highest buy and their timestamps. History exposes sell-order aggregates, item_count, avg_price and timestamp; it is not a confirmed transaction feed. Gold exposes price/timestamp observations. Live integration checks passed for all nine region/endpoint combinations; this verifies access and shape at the test time, not continuous availability or blanket redistribution rights.

## Metadata and artwork

https://github.com/ao-data/ao-bin-dumps is a public metadata discovery lead linked from the Data Project; public accessibility is not assumed to grant redistribution rights. No bulk dataset was copied. Source licensing, provenance, patch freshness and permitted artwork use still need review before synchronizing full metadata or assets.

The current `item-database.ts` is an originally authored 100-record factual index generated from five basic equipment families (Bag, Cape, Broadsword, Battleaxe, Bow), tiers 4–8 and enchantments 0–3. Labels intentionally use generic family/tier descriptions rather than copied localized text. It contains no recipes, spells or claimed combat statistics. Historical baseline had no remote item artwork; later renderer integration is documented below. User-entered build IDs/abilities are not proof of valid in-game equipment combinations.

Gameinfo/killboard integration is absent pending verification of endpoints, availability, allowed use and attribution. No combat statistics, win rates or meta rankings are invented.

## Arithmetic methodology and tested examples

Trade calculation is ordinary accounting with manually supplied assumptions:

- Gross sale value = sell price × quantity.
- Cost basis = purchase price × quantity + total transport/risk cost.
- Taxes and setup fees = gross sale value × (tax% + fee%)/100.
- Net estimated profit = gross sale value − cost basis − taxes/fees.
- Profit margin = profit/gross sale value; ROI = profit/cost basis. Zero denominator yields null.

Test example: buy 100, sell 150, quantity 10, tax 8%, setup 2.5%, transport 50 yields cost 1050, fees 157.5, net 292.5 and margin 19.5%. The example rates are mathematical test inputs, **not claims of current game fees**. Repeated listings, unsold inventory and execution probability are outside this model.

A tested manual return-fraction helper computes cost × (1 − supplied return fraction); 1000 at 40% yields 600. It does not assert Albion city/focus bonuses, recrafting loops or recipe eligibility. The starter production engines described below extend this baseline. Automatic specialization/focus-cost, IP, breeding, seed and combat formulas remain unimplemented.

Freshness above one hour is an Atlas display policy, not an in-game mechanic. Five-minute history cache TTL is an application policy. No stale/missing observations are replaced by synthetic prices.

## Framework/security sources

https://nextjs.org/docs/app/getting-started/installation and installed `node_modules/next/dist/docs/` were consulted for current runtime and App Router behavior. CSP implementation follows the installed `01-app/02-guides/content-security-policy.md`; cookies/layout behavior follows the adjacent API guides. No source documentation is represented as an audit or legal opinion.

## QA evidence update

The audit compared all8 price records per region from the running application to separate compressed raw public requests, checking city/item/quality/buy/sell/timestamps. `.qa/live-comparison.json` stores sampled source observations and comparison results, not UI defaults. The three-region price/history/gold smoke tests were rerun. No third-party abuse/throttle or invasive security testing was performed. The manual trade model now rejects aggregate cost/revenue above one trillion silver to bound numeric precision; this is an application limit, not an Albion mechanic.

## Composition equipment catalog

Original factual starter index, verified against https://albiononline.com/news/basic-builds-battleaxe and https://wiki.albiononline.com/wiki/Battleaxe . Stores identifiers and names only, no copied guide descriptions or combat figures. Battleaxe Q/W/E and a conservative passive option, plus named Scholar Cowl/Mercenary Jacket/Mercenary Shoes actives. Higher-mastery ability options are deliberately omitted until verified. Catalog is a limited subset, not the complete equipment/ability database; food/potion choices and artwork remain pending. Imported old build ability prose is retained as author notes, not promoted to validated spell selections.

## Starter production recipes and mechanics

- Resource bonus conversion: https://wiki.albiononline.com/wiki/Resource_return_rate ; return fraction = 1 − 1/(1 + production bonus/100). Tests independently check bonus18 and58. UI accepts manual assumptions, not automatic current city/event/focus bonuses.
- Ingredient listings: https://wiki.albiononline.com/wiki/Property:Ingredient ; T4 Battleaxe16 Steel Bar +8 Pine Planks; T4 Broadsword16 Steel Bar +8 Worked Leather. The older Template:Recipe illustrative Battleaxe example disagrees and is not used.
- Steel refining reference: https://wiki.albiononline.com/wiki/Pristine_Steel_Bar ; two matching ore plus one Bronze Bar. The tool implements standard T4 Steel Bar using T4_ORE and T3_METALBAR, not the enchanted recipe. Recipe coverage is deliberately small and should be rechecked against future game patches.
- Tier-specific rune/soul/relic entries, including https://wiki.albiononline.com/wiki/Expert%27s_Rune : per step96 heads/shoes/offhands/capes,192 chest/bag,288 one-hand,384 two-hand. Current catalog contains one-hand families only. Generic Relic prose has conflicting chest counts; tier-specific192 is used. Artifact Foundry paths stop at .3; .4 is not simulated.

No wiki artwork or prose is bundled. Original factual identifiers/recipe records only; a full externally sourced dataset requires separate license review. Recipe source links are shown in the interface. Source availability can be limited by wiki HTTP403. No copied guide text, inferred win rates, invented default fee rates or fabricated market observations.

Independent arithmetic fixture: materials16×100 +8×50 =2000;20% eligible returns =400; station100; output3000;10% sale tax =300. Upfront2100, effective cost1700, economic profit1000, cash profit600. At40% returns and100 focus, economic profit1400 and additional material value4 silver/focus. These rates/prices are mathematical test inputs, not live observations or claimed game defaults.

## Equipment source verification and icons

Public render API announcement: https://forum.albiononline.com/index.php/Thread/131017-Update-on-API-New-Endpoints/ . A bounded request to render.albiononline.com/v1/item/T4_MAIN_AXE.png?size=64 returned200 image/png. Fixed-host renderer accepts validated item IDs only; no arbitrary remote URLs or redirects. Images are limited to200KB,2.5-second requests,240 new requests/minute/process, four concurrent requests,32 queued,512 entries with8MiB payload cap (internal safeguards, not published upstream limits); six-hour success/five-minute unavailable TTL. Official artwork is not claimed as original Atlas art. The product workflow phase loads fixed-host renderer URLs directly, with the existing bounded server-side cache as fallback. Legal discloses the render-host image requests and IP exposure. CSP permits only the specific renderer host in addition to local images.

2026-10-25: gameinfo.albiononline.com/api/gameinfo/items and /items/T4_MAIN_AXE/data both403; no bypass attempted. https://github.com/ao-data/ao-bin-dumps has a data-extraction README and https://api.github.com/repos/ao-data/ao-bin-dumps/license returned404. No verifiable blanket license was found, so no bulk dump is bundled or automatically fetched. Full source/rights review remains unresolved. The CLI accepts local operator-reviewed metadata, records rightsReference/source/checksum and keeps missing facts null. This is a synchronization interface, not proof that a complete permitted dataset is available.

## Economy continuation — verified transport/scanner subset

Added `/tools/transporting`, validated capacity/trip/risk arithmetic, region/city/quality/item/execution-specific source observations, manual overrides, private scenario save/load/delete and mobile layout. `/tools/flipping` now includes a bounded25-item batched cross-city/Black Market scanner, profit sorting, timestamps, explicit missing/stale observations and execution assumptions. Black Market player sell listings are rejected. Existing manual trade calculator is preserved.

Final economy milestone gate passed53 unit/28 production browser tests plus migration/restore, lint/types, build, audit and9 regional source checks. Initial transport browser test timed out because helper text changed price fields’ accessible names; explicit labels fixed the issue and the full gate reran. Independent fixture:10×100 purchase,10×150 sale,8% tax,2.5% fee,150kg cargo/100kg capacity,20/trip and10 risk =2 trips,1050 cost,157.5 fees,292.5 profit. All rates/weights are user inputs, not asserted game defaults. New scanner endpoints are unit-tested against controlled source responses; no independent live route/source comparison has yet been executed.

Full crafting/refining/cooking/alchemy recipe coverage, automatic city/focus/spec inputs, farming/animals/laborers/fish/IP/craft planning remain incomplete. Transport currently restores assumptions into the current selected header region and clearly invalidates mismatched source prices; shared transport URLs and volume/mount metadata are unfinished. Do not mark all Phase2 complete. Continuing with independently implementable community permissions and moderation.

## Outpost brand-media audit — 2026-10-26

The requested concept reference was not visible to the implementing session. No permitted game environment/card screenshots were found in the repository. The official press kit at https://albiononline.com/presskit is a discovery lead listing screenshots, but direct retrieval returned403; no specific image license was verified or acquired. Existing official-render item icons remain scoped to their documented integration. No generated fantasy scenes or unrelated stock art were added. Outpost uses the authorized typography-first fallback. Source/permission inventory: docs/assets/OUTPOST_MEDIA_INVENTORY.md. Archivo Black and Barlow Condensed join Inter/Geist Mono as locally bundled OFL fonts; their original notices are served in public/licenses.

## Supplied reference update — 2026-10-26

The numbered eight-panel UI concept is now visible and reviewed as design guidance. It is not authenticated game media and no concept artwork is imported into the application. Item artwork continues to use the official renderer; the new optional composition PNG export obtains the same bounded same-origin renderer responses and uses item-name labels when artwork is unavailable. No export is uploaded or sent to Discord. Existing scene-media permission gap remains. Current fonts are Barlow Condensed, Inter and Geist Mono; Archivo was removed in the product workflow phase.

## User-authorised generated scene illustration — 2026-10-26

The latest user steering permits generated Albion-like scenes after the authentic-source lookup. Homepage hero/feature scenes are now original generated illustrations from the built-in image_gen tool, clearly disclosed as such, not actual game captures. Item icons still use the official renderer, not generated substitutions. Provenance/prompt/hash ledger: docs/design-review/homepage/generated-assets.json. No market/game data, spell mechanics or item facts are generated.

## Manual trade sale thresholds and saved scenarios

Independent accounting,2026-10-26: C = buy price × quantity + supplied transport/risk; r = 1 − (supplied tax + supplied setup fee)/100. Break-even unit sale = C/(quantity×r) when r>0 and the threshold lies within the model's one-trillion revenue bound. Display is approximate to two decimals. Strictly profitable whole-silver sale = floor(exact threshold)+1; exact decimal ratios avoid rounding a near-integer boundary up/down incorrectly. No profitable threshold is advertised for r≤0 or beyond model limits. This is original arithmetic, not a claim of current game rates, repeated-listing behavior, liquidity or repeated buy-order listing behavior.

Independent fixture: buy100/sell150,10 units,8% supplied tax,2.5% supplied setup,50 transport → cost1050, revenue1500, fees157.5, profit292.5, break-even117.318435… and minimum118; sale117 loses2.85, sale118 gains6.10. Exact105 break-even requires106 for positive profit. High-value999999999999.9999 input and subnormal positive cost are regression-tested. Private flipping configurations reuse SavedScenario storage, account export/cascade and server authorization; manual inputs do not become live observations.

## Manual purchase-order setup accounting

2026-10-26: purchase setup = purchase unit price × quantity × supplied purchase setup percent /100 for buy-order mode; zero in instant mode. Cost now includes this fee once, plus purchase value and transport/risk. Break-even and exact whole-silver positive-profit threshold use that total. All rates are user assumptions, not independently verified current game defaults. Inventory not sold, partial fills and repeated order replacement fees are unsupported.

Independent test:100×10 purchase +25 purchase setup +50 transport =1075 cost;150×10 sale less157.5 supplied sale tax/setup less1075 =267.5 profit. Break-even120.111731…;120 loses1,121 profits7.95. Source: original accounting identities and explicit user-supplied assumptions, not a competitor dataset. Unit and production browser save/reload tests preserve these values; instant and legacy scenarios retain prior semantics.

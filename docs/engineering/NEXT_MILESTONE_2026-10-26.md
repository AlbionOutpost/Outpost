# Next development milestone — 26 October 2026

This continues the October 26 implementation checkpoint. Implementation and verification below have separate scopes. Release remains **NO-GO**; no external deployment or publication occurred.

## Tooling and environment

The project root is `/home/bttw/Desktop/Coding/AlbionHelper`. The `.git` directory is empty: `git status --short` fails, so history/diff verification remains blocked. No replacement repository was created.

All seven staged skills match the already installed `.agents/skills` copies (`diff -qr`), and both validators pass. All seven installed names/descriptions/paths appear in this session's available-skill catalog. Discovery is observed; future implicit activation is not certified. No protected mount or global settings were changed. [Skill evidence](SKILL_SYSTEM_VALIDATION.md).

Playwright MCP's actual list call requires approval unavailable under the session's `never` policy. Chrome DevTools MCP cannot find `/opt/google/chrome/chrome`. Installed local Playwright Chromium, CDP and Lighthouse fallbacks work. Node 22.22.2 and local PostgreSQL/Redis are used. The fresh Docker build still fails updating the protected buildx activity file; host evidence is not current container evidence.

## Actual metadata processed and activated

Source: [Muut Moku's item snapshot](https://github.com/muutmoku/ao-item-snapshot/tree/d72a159ed01ee4645b60d18633cd683779b9adc6), commit `d72a159ed01ee4645b60d18633cd683779b9adc6`, July 12, 2026. Its explicit MIT notice is retained at [the public notice](../../public/licenses/ao-item-snapshot.txt). Only factual identifiers, English names, equipment slots, explicit item power and spell names are adapted; descriptions and artwork are excluded. This repository license does not certify Sandbox Interactive artwork/trademark rights or current-patch correctness.

The [source manifest](../data/item-snapshot-source.json) pins ten file URLs and SHA-256 values plus the license checksum. [Coverage and exclusions](../data/item-snapshot-coverage.json) is portable. `npm run data:prepare-snapshot -- SOURCE_DIRECTORY` validates the pinned local bytes and produces the [runtime bundle](../../data/catalog/ao-snapshot-20260712.json). `npm run data:sync` defaults to that bundle; `--starter` retains explicit access to the historical starter import. Historical release records remain, with immutable versions/checksums enforced.

| Stage / field                                                                       | Actual count and denominator                                        |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Raw source base rows                                                                | 1,772 across ten slots                                              |
| Excluded base rows                                                                  | 55: 49 unsupported identifiers, six inconsistent mount enchantments |
| Supported base rows                                                                 | 1,717 / 1,772                                                       |
| Schema-valid records including explicit nested variants                             | 7,510                                                               |
| Local runtime active records after activation/read-back                             | 7,510 / 7,510 prepared records                                      |
| Base records containing named abilities/passives                                    | 604 / 1,717                                                         |
| Ability/passive mappings                                                            | 1,576                                                               |
| Explicit source item-power values                                                   | 6,309 / 7,510                                                       |
| Fully manually verified records / verified unlocks / current-patch verified records | **0 / 0 / 0**                                                       |

Normalized bundle SHA-256: `61756b210d662c03e26f17212a77d9af275c098cd8f4b23cef2cb840d0dd7a0f`. Raw source bytes, activation output and live read-back are local ignored artifacts under `.qa/next-milestone`. These counts do not establish a complete game denominator. Every supported authored equipment ID is present in the July bundle. Nested variant spell inheritance is not inferred. Recipe return eligibility and unlock requirements remain unknown; unsupported recipes are not silently promoted into runtime metadata.

Current patch lead: the [official update index](https://albiononline.com/update) and [Dragonfire Patch 3 announcement](https://albiononline.com/news/dragonfire-patch-3) identify October 12. The July snapshot predates Dragonfire and declares no matching game build. Official item-data requests for `T4_MAIN_AXE` and `T4_METALBAR` returned 403; the detailed changelog and wiki requests were also blocked. The accessible `ao-bin-dumps` repository has no license at its checked LICENSE URL, so it was not imported. No download date or schema pass is counted as patch evidence.

## Calculator and product changes

Crafting now has nine T4 recipes: Battleaxe, Broadsword, Bow, Shield, Scholar Cowl, Mercenary Jacket, Mercenary Shoes, Bag and Cape. Their ingredient quantities and base focus costs were checked directly against the pinned source and independent literal fixtures. One equipment output per craft remains the declared model. Current city coefficients, specialization-node coefficients and patch compatibility remain unverified.

The focus helper implements the historical fractional model `base focus × 2^(−total efficiency / 10000) × crafts`, with bounded inputs and independent half/quarter-cost fixtures. Its source is the [author's historical formula discussion](https://forum.albiononline.com/index.php/Thread/167434-Explaining-Crafting-Tax-and-more/). It takes the user's total efficiency rather than inventing node coefficients. It displays an estimate and requires station confirmation before the user enters the actual total; it does not assume station rounding. Helper efficiency is scratch state; accepted focus totals persist through the existing scenario model.

Refining now consistently requests, displays and calculates Normal-quality output prices, including legacy saved quality assumptions. The one plain-steel recipe remains unverified against its mismatched Pristine source. Other refining resources and specialized engines remain incomplete. [Parity matrix](CALCULATOR_PARITY.md).

The item reference now queries 30-row API pages across the active catalog instead of truncating to the first 2,000 records before filtering. Search, slot/tier/enchantment, cancellation, errors/retry and regional links are preserved. Original starter market shortcuts remain separately labelled. Only the first page is serialized into the initial page.

The structured workbench adds 24 source-enumerated stew/healing-potion variants, with actual tier-specific names and authentic renderer icons. Consumables cannot enter the rune-enchanting model. The complete runtime catalog is broader than the structured workbench; no full builder/ability/unlock claim is made. Composition cards show actual recorded roster size and up to three recorded main-hand icons. Existing membership/visibility predicates remain, with related reads in a RepeatableRead transaction. Existing brand/layouts and supplied comparison references are preserved.

## Watchlists and operations

A private local backup preceded deployment of the existing additive `20261026110000_market_watch_items` migration. Read-back confirms 17 completed migrations and the watchlist table. The backup is ignored/private and is not production backup evidence. The operational watchlist API/UI persists item, region and quality, caps each user at 100 items within a serializable transaction, and supports reload/removal. IDs/quality/region/body size are validated; client ownership fields are rejected. Every read/mutation is owner-scoped, mutations require the expected origin/session, and responses are private/no-store. Account export includes the owner's watchlist; account deletion uses the existing cascade.

Credentialed Discord verification is blocked because client ID/secret are absent. No owned HTTPS staging is configured. Hosted CI, monitoring/alert delivery, encrypted scheduled backups, staging recovery/rollback and legal/operator/media acceptance remain external gates. See [required owner actions](../deployment/NEXT_MILESTONE_OWNER_ACTIONS.md). Local fixtures do not verify OAuth.

## Verification and performance

Targeted parser/catalog tests, independent nine-recipe and accounting cases, Normal-quality market batching and watchlist allowed/denied journeys are implemented. The complete phase gate and generated root QA reports carry the latest actual results. Intermediate failures are retained locally: expanded Bag results exposed a broad test selector; the subsequent API pagination shortcut required scoping that selector to the visible table; a direct Node JSON import required the explicit `type: json` attribute. No expected price/profit assertion was weakened.

Market performance baseline: three fresh anonymous Lighthouse 13.5.0 simulated-mobile Chromium processes, 412×823, DPR 1.75, 150ms RTT and 4× CPU slowdown, production localhost:3001. LCP 2.779–3.094 seconds, median 3.088; CLS 0, accessibility 100. The actual LCP element is the source-note text (`small.market-source-note`); the shared stylesheet contributes a render-blocking request. The first CSS-inlining experiment removes that request and measures 2.406–2.705 seconds, median 2.704; it alone misses 2.5 seconds and increases HTML transfer. Subsequent final measurements and tradeoffs belong in [the performance report](PERFORMANCE_REPORT.md).

All screenshots are labelled local-library fallbacks; populated sessions and market observations used for UI QA are fixtures. Automated axe/Lighthouse and emulated viewports do not establish full accessibility, physical-device usability, owner design acceptance or field p75/INP.

## Subsequent skill-setup and audit-only request

The user subsequently requested reviewed development skills and an audit before application changes. The [skill collection](DEVELOPMENT_SKILLS.md) and [prioritized audit plan](UI_UX_CODE_AUDIT_2026-10-26.md) record that work. The original seven skills are installed/discovered; six additions are staged and manually exercised, with canonical installation blocked by the read-only destination. Runtime files were frozen at that request and remain unchanged. The latest Market median is 2.706 seconds with duplicate Barlow 800 delivery reproduced; accessible-name and narrow item-provenance failures remain open. Full local QA passes 143 unit/59 browser tests, independently of these broader acceptance failures. Earlier implementation described above is preserved, not attributed to this audit.

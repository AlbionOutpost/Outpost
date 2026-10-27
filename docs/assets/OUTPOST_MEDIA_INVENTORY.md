# Outpost media inventory

| Asset class                              | Current delivery                                                           | Provenance / limitation                                                                                                |
| ---------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Outpost logo                             | User-supplied transparent PNG in shared header, mobile drawer and footer   | [Source/hash ledger](OUTPOST_LOGO.json); original bytes preserved, transparent padding excluded by the display frame   |
| Equipment icons                          | Official fixed-host item renderer with bounded same-origin fallback/export | Validated IDs and sampled delivery; not all-item semantic availability or blanket artwork license                      |
| Homepage scene / retained feature scenes | All four scenes archived; no generated scene in the current homepage       | [Hash/path/prompt ledger](../design-review/homepage/generated-assets.json); explicitly disclosed, not genuine gameplay |
| Authentic game scenes                    | Missing approved replacements                                              | Historical press-kit lookup failed; scene-specific permission not recorded                                             |
| Ability artwork                          | Missing complete genuine catalog                                           | Named starter selects do not create artwork/unlock/stat evidence                                                       |
| Fonts                                    | Local Inter/Barlow Condensed/Geist Mono                                    | Individual notices under [public/licenses](../../public/licenses); no current Archivo binding                          |
| QA concept/crops                         | Design-comparison assets only                                              | Not extracted as runtime scenery or proof of game facts                                                                |

Generated originals are retained in [assets/source/homepage-illustrations-v1](../../assets/source/homepage-illustrations-v1); runtime derivatives are in [public/albion/illustrations](../../public/albion/illustrations). Prior user authorization and exact image hashes remain in the ledger. The current code manifest is [assets.ts](../../src/lib/albion/assets.ts).

For authentic replacements record original source/creator, permission or license, attribution, permitted edits and mobile/desktop focal crops. Preserve originals and create bounded derivatives. Generated artwork does not close the authentic-source requirement. [Source ledger](../../DATA_SOURCES.md), [current release gates](../../RELEASE_READINESS.md), [historical discovery and retired-asset notes](../history/2026-10-26-before-reconciliation/docs/assets/OUTPOST_MEDIA_INVENTORY.md).

Original interface emblems and the unmodified official Discord sign-in symbol are recorded in the [brand interaction review](../design-review/brand-interaction/README.md#media-provenance), with source, retrieval date, rights limitations and checksum. These interface marks do not add verified Albion game data or authentic scene rights.

The [interactive equipment composition](../design-review/playful-ui/README.md) uses existing validated renderer IDs and original task glyphs. No new game scene or currency-art license is claimed. Direct SILVER/GOLD renderer probes did not yield usable artwork; no substitute is presented as an authentic currency asset.

# Product UI workflow rebuild — 2026-10-26

The earlier design was visually consistent but still organized around long forms. This phase changes the interaction model. Existing API schemas, formula engines, membership permissions, optimistic versions, saved resources and database migrations remain in use.

## Research and original design decisions

Reviewed the accessible [Grind homepage](https://albiononlinegrind.com/), [weapon/build browser](https://albiononlinegrind.com/builds), [group builds](https://albiononlinegrind.com/group-builds/), [Battleaxe example](https://albiononlinegrind.com/build/battleaxe-mist-build), [20-player group example](https://albiononlinegrind.com/group-builds/20-man-small-scale-to-zvz) and [All Things Albion builder](https://allthingsalbion.com/en/builder/). Observed weapon/content filtering, recognizable item groups, equipment/spell decisions, swaps and party-size browsing. Examined indexed actual Albion inventory screenshots, including the official wiki InventoryUI reference. No third-party code, proprietary composition layout, screenshots or artwork was copied into the application.

Our implementation uses slot-first browsing and an original three-region workbench: browser, anatomical equipment arrangement, details/abilities. General metadata and exact-ID compatibility fields stay behind disclosures. Mobile uses separate equipment/browser/details views. The catalog remains the existing factual starter subset, not a claim of complete Albion coverage or current balance statistics.

Composition editing separates the inspectable whole-party roster from a single member dialog. Each row has equipment thumbnails, role, assignment and swaps. Role grouping and density controls affect presentation; pointer/keyboard reordering affects saved party order. Existing duplicate, saved-build copying, import/export and version checks remain. A 20-player party does not render 20 open editable forms.

Markets use a keyboard-operable name picker against the existing item catalog, category/tier/enchantment filters, the city quote table, and a selected-item/history panel. Exact identifiers remain an advanced fallback. No historical change or quote is manufactured. Production and transport assumptions plus price overrides sit beside the results; formula engines are unchanged.

Guilds open on actual next event, announcements and shared compositions. Tabs separate everyday activity from membership/settings. Event creation and editing are dialogs using existing validation/versioning. Overview counts describe only loaded guild records; they are not platform activity claims.

The homepage includes a clickable explicitly labeled starter loadout and name-based market entry. Barlow Condensed 800 is limited to display personality; Inter provides readable application headings, forms and descriptions. Geist Mono remains numeric. Warm charcoal/copper tokens, reduced-motion support and keyboard focus styling are shared.

## Assets and evidence

Item images originate from the validated official `render.albiononline.com` item renderer. Direct image requests have a bounded same-origin service fallback; renderer failure must leave item names and controls usable. No game environment art has verified bundled reuse permission. No synthetic fantasy artwork was generated. See [media inventory](assets/OUTPOST_MEDIA_INVENTORY.md).

Before screenshots: `.qa/product-ui-before`. After matrix: `.qa/design-review`, mobile interaction states: `.qa/player-workflows`. Browser fixture prices and guild records exist only during tests and are removed afterward. These are not live-data screenshots. Real Discord OAuth and existing external release gates remain open; fixture sessions do not verify OAuth.

## Supplied numbered concept — subsequent implementation

The actual eight-panel image is now provided and has been inspected. Small parties use a simultaneous flexible loadout board, with role labels, assignment states and actual equipped art; larger groups keep the compact roster. PNG export renders actual draft/saved data locally, requests only the existing bounded same-origin item service and labels unavailable art instead of inventing it. No export upload, notification, Discord post or permission change occurs. Community build browsing supports title, content, weapon and real favorite-count sorting with existing privacy constraints. Equipment preview cards show real author/revision dates. Original guides have category/text search. Production inputs, material quantities/prices and results occupy separate wide-screen columns. Mobile discovery filters collapse so results are not buried under a full form. Saved composition discussion follows the party plan.

The concept’s scenery and ability images are not authenticated game assets; none are extracted or shipped. Legal/source restrictions on environment art remain. QA-only before/after gallery and actual PNG download: `.qa/reference-review`. The supplied reference replaces the earlier unavailable-reference limitation; comparison is structural rather than pixel-perfect.

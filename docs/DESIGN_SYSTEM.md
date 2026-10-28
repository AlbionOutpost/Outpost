# Outpost interface system

Active owner implementation: [premium workspaces and connected planning](design-review/premium-workspaces/README.md). The five supplied UI-system/crafting/build-comp/market/homepage images are the current target. Use one coherent theme, real data and useful private workflows. Remove migration-history and competitor copy from the public UI while retaining truthful prices, assumptions, credits and internal provenance. Implementation and acceptance are in progress.

Latest work: [Grind recovery and equipment-led redesign](design-review/grind-recovery/README.md). Source content, current-patch verification and owner visual acceptance are independent.

Search refinement: [single field, contained scrolling and compact responsive palette](design-review/search-palette/README.md). Header/footer stay visible, results scroll, Clear preserves focus and rapid keyboard reopen remains usable.

Current hover behavior is grow-and-hold only. Cursor tilt, vertical lift and independent icon hover motion are removed; click/disclosure feedback and reduced-motion support remain. This supersedes the earlier tilt direction.

Navigation labels remain transparent on hover/open; growth feedback is retained without a filled box.

Initial motion direction (superseded hover behavior): [shared growth, press and pointer depth](design-review/motion-system/README.md), requested by the owner after reviewing RocketClient. Hover growth and bounded tilt supersede earlier stable/no-growth rules. Reduced motion, readable workspaces and existing route behavior remain required.

Region-menu refinement: [compact anchored selector](design-review/region-picker/README.md), preserving region/query persistence and distinct keyboard focus.

Latest build/card refinement: [Grind-informed loadout cards and panels](design-review/loadout-cards/README.md). Equipment-led previews, compact filter toolbar, distinct inventory/ability surfaces, ordered party previews and smaller tool destinations. Existing permissions, persistence, formulas and real assets remain authoritative. Owner acceptance remains open.

Latest owner-requested control/workspace correction: [custom header controls and workspace depth](design-review/workspace-depth/README.md). Custom region picker, stable hover feedback, compact search/theme/Sign in, source-backed recipe browser with separate cash/return accounting, transport cargo workflow, and task-specific editor/content/settings refinements. The accepted landing direction is retained. Full planner/journal/mechanics and owner acceptance remain separate.

Latest implementation authority: [reference fidelity correction](design-review/home-fidelity/README.md), following explicit owner rejection of the first five-reference pass. `home-fidelity.css` owns the compact homepage composition and warm neutral surfaces; `workspace-fidelity.css` owns market query/results anatomy, crafting summary/accounting and equipment/abilities/summary columns. Both extend centralized shared tokens. Hero and research terminal share item/region/source state and requests. Original generated market scenery is disclosed; no fictional game figures or character art is introduced.

Active visual authority: [the five supplied October 27 reference screens](design-review/professional-redesign/README.md). `src/app/reference-system.css` owns the shared cool charcoal/orange palette, 6px controls, 8px cards, Inter workspace headings and financial numerals. Earlier warm palettes and task-led layout notes below are historical where they conflict.

Current October27 UX: [task-led homepage, Market and crafting](design-review/ux-transformation/README.md). The homepage has one searchable observed-market preview and three compact planning links. Market setup precedes quote results; independent watchlist and optional history access remain available. Crafting uses persistent recipe/pricing/profit steps on phones. `task-ui.css` defines8px controls,12px panels and shared page-heading/surface rules; the terminal inherits dark/light tokens. Earlier composition notes below are historical where they conflict.

Current scope: implemented interface rules with sampled browser evidence; global owner visual acceptance is still open. [Current per-page reviews](design-review/README.md) replace the old homepage-only sequencing. [Original design history](history/2026-10-26-before-reconciliation/docs/DESIGN_SYSTEM.md) is preserved.

## Typography, surfaces and navigation

Actual bindings in [fonts.ts](../src/app/fonts.ts): Barlow Condensed600/700/800 for display, Inter for product UI/body and Geist Mono for numeric figures. Archivo Black is no longer bound. Font assets are local and retain their own notices.

The shared header, mobile drawer and footer use the user-supplied Outpost banner logo. The original PNG remains unchanged; a fixed-ratio display frame excludes transparent outer padding while preserving the banner, lettering and copper stop. A charcoal backplate keeps the cream lettering legible in light mode. Accessible home-link names remain intact. [Asset provenance](assets/OUTPOST_LOGO.json), [runtime original](../public/brand/outpost-logo.png).

Shared charcoal/copper tokens, separate readable light/dark foregrounds, compact borders and visible focus states govern navigation, editors and tables. The desktop header has real tool/content/account links; mobile navigation is a dismissible native modal with focus return and body-scroll control. Exact breakpoints/spacing belong to the source, not historical screenshot measurements.

Build editing uses browser/equipment/details panes, with mobile view selection. Small compositions use simultaneous loadout cards; large groups use a compact roster and member dialog. Markets prioritize city/price observations and source dates; production separates assumptions/materials/results; guild overview prioritizes upcoming activity/shared resources. Current source and tests preserve permissions/persistence.

## Media and motion

The current homepage uses authentic renderer equipment icons, a working market lookup and the disclosed existing courtyard illustration. The other three generated scenes remain archived. These retained scenes do not meet authentic permitted game-scene acceptance. Official renderer equipment icons and neutral fallback are independent of scene media. No full ability artwork or scene permission is implied. [Media ledger](assets/OUTPOST_MEDIA_INVENTORY.md).

Short interface transitions communicate selection, menus and ordering; reduced-motion disables nonessential animation/transition. Responsive, font, focus, overflow and sampled axe assertions exist. They do not certify physical touch, all screen-reader flows, full WCAG conformance or owner visual acceptance. Current counts/results live in [QA_REPORT.md](../QA_REPORT.md).

## Homepage and shared navigation — reverted expedition redesign

The green/ivory expedition redesign was rejected and reverted at the user’s request on October 26. The active homepage and shared navigation again use the previous charcoal-and-copper presentation. [Current direction](../DESIGN.md); [historical rejected screenshots](design-review/homepage-redesign/README.md).

## Player-facing refinement

Use “Comps,” named item qualities and buy/sell orders consistently. Workspace navigation keeps text labels at desktop widths from 1280px. Tool headings name the task; empty states lead to a useful next action. The left navigation drawer enters in 220ms and respects reduced motion. [Implemented changes and browser evidence](design-review/player-polish/README.md); [Albion language](engineering/ALBION_UI_LANGUAGE.md).

The market-led homepage follows the supplied user reference with a working daily-observation chart, 7/30-day controls, city quotes and equipment-led previews. Top navigation uses Inter bold. Dark market/product surfaces retain readable local tokens in both themes. History gaps are not filled; full precision and UTC source times remain inspectable.

The companion-app reference replaces the former landing composition: compact shared sidebar, expanded global-search trigger, full-width courtyard hero with Inter headline, and four compact gear-led entry points. Existing market/calculator/build/group behavior is preserved. Responsive navigation uses the existing keyboard-accessible drawer below 1100px.

The owner rejected the companion sidebar/courtyard composition. Current shell: bold horizontal top tabs, matched header/content widths and existing mobile drawer. The homepage uses higher-resolution genuine equipment art, shorter tool previews, explicit source-price observations and quick item lookups. Do not restore the rejected sidebar or scenery.

Latest owner clarification restores the reference’s immersive art/tool composition with horizontal top navigation. The source snapshot checks every60seconds only while visible/online, supports pause/manual refresh and preserves source timestamps and missing data. Ambient illustration drift and hover motion respect reduced motion. No fake market activity or concept prices enter the runtime.

## Logo-led controls and motion — 2026-10-27

Latest refinement uses logo-derived copper, cream and warm dark-metal tokens, corrected wordmark crop/alignment, improved region/theme/Discord controls, animated Tools/search popovers, shared hover/press feedback and reduced-motion support. Homepage destination cards use original purpose-specific emblems to the left of the title, replacing decorative item strips. Preserve real item imagery for actual equipment/price identification and use plain Albion task labels. [Browser evidence](design-review/brand-interaction/README.md).

## Search, motion and real equipment — 2026-10-27

Latest owner correction removes the panoramic generated scene. Use the real, named equipment showcase, larger shared type, neutral charcoal surfaces and original task glyphs. Search provides shortcuts and image-led results; Tools has explanatory destinations. Native region-picker styling progressively enhances supported browsers. Route/theme snapshot transitions and local hover/press feedback respect reduced motion. Preserve unchanged server permissions, real source data and persisted workflows. [Rendered evidence](design-review/playful-ui/README.md).

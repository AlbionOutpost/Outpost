# Outpost interface system

> Current status: the user rejected the multi-page visual design. Prior scoped PASS entries below describe functionality/history and do not constitute current visual acceptance. The active visual specification and sequential acceptance process are in [docs/design-review](design-review/README.md). Only the homepage is being corrected; later pages remain gated.

Outpost replaces the former Atlas field-desk direction with a compact top-navigation website, hard-edged type and warm, desaturated surfaces. The supplied numbered concept and current written brief guide layout hierarchy. The concept is illustrative guidance, not a pixel specification or an authenticated source of game art. See [the asset inventory](assets/OUTPOST_MEDIA_INVENTORY.md).

## Typography

`src/app/fonts.ts` loads local Fontsource WOFF2 subsets with `next/font/local`:

- Barlow Condensed800: hero/major marketing statements and OUTPOST wordmark; use personality sparingly. Application headings, equipment and feature titles use Inter.
- Inter variable: body400, navigation500, buttons600, forms, descriptions, tables and settings. This remains the dominant application font.
- Geist Mono variable: silver, prices, numeric inputs and calculator outputs. Numeric roles retain tabular numerals.

`--font-display`, `--font-heading`, `--font-ui` and `--font-data` centralize these roles in globals.css. The scale is shared. Hero type is approximately72–100px on common desktops and42–56px on mobile, reduced at320px to prevent clipping. Inter preloads; condensed faces and Mono load when used. Latin subsets are bundled, with no external font requests by browsers. Original OFL notices are served under `/licenses` and linked from Legal. Jakarta is removed from current dependencies and styles.

## Color and materials

Canvas `#101014`, navigation `#141317`, elevated `#19171B`, cards `#201C1E`, borders `#393033`, primary text `#F2EEE9`, secondary text `#A9A4A9`, muted decoration `#77727A`, brand copper `#C85A3B`, hover copper `#DF7050`, secondary metal `#D1A36A`, success `#48BA87` and error `#DB5B56` follow the written brief.

Small off-white button labels use a darker copper action fill (`#A7452D`), since off-white on the brand copper does not meet4.5:1 contrast. Small links/labels on dark cards use the lighter copper ink token; the exact brand copper remains for the large headline, borders and selection indicators. Light mode has its own accessible foregrounds. Muted decoration is not used for body copy. Corners are2–4px; ordinary working surfaces have1px borders and restrained shadows only for menus/dialogs.

## Navigation

A72px desktop header contains the OUTPOST wordmark, Tools, Builds, Compositions, Guides and Guilds, then search, region selection, theme and account controls. Tools and account menus use keyboard-operable native details/summary; Escape closes the menu and returns focus. Clicking outside dismisses it. Current sections retain indicators, with `aria-current` on destination links.

Below1100px the compact header opens a scrollable modal drawer containing every tool and workspace route. The drawer retains focus trapping, Escape, backdrop dismissal, focus return and body-scroll locking. Small-screen theme switching remains available inside the drawer. Internal cookie names, account sessions and JSON/export formats retain their historical names for compatibility; the user-facing product is Outpost.

## Landing layout and media fallback

The landing page has a full-width hero, left-aligned two-line Barlow800 headline, the requested supporting copy and EXPLORE TOOLS / BROWSE BUILDS actions. The builds destination remains the real player-authored collection; no ranking data is invented. The three highlighted features are Market Tools, Composition Builder and Build Creator, with Inter titles and real item previews, restrained icons, practical descriptions and action links. Mobile stacks them in document order.

No permitted environment images were supplied or found in the repository, and official press-kit access returned403. Therefore the current hero and features intentionally use the authorized typography-first fallback, without fake game imagery or synthetic scenes. The old cartographic illustration is removed. Image-based hero/card acceptance is **BLOCKED**, not complete. Missing media and source/permission requirements are recorded in the asset inventory. Do not replace these with scraped or generated fantasy art.

A compact existing item lookup, a guild entry point and source attribution complete the landing page. No user counts, market activity, meta scores or decorative statistics are shown. Guides contains original explanations of working tools; it is not a guide CMS or a verified current-game meta resource.

## Application layouts

Market pages retain compact filters, sticky city/sort controls, right-aligned prices, source timestamps and missing/stale states. Calculators keep assumptions separate from a numeric results ledger. Build and composition editors reuse inventory previews, official item-icon requests, silhouettes, tier/enchantment labels and the starter ability picker. The20-player roster keeps bounded scrolling, drag insertion feedback and keyboard/touch move controls. Guilds keep schedules/RSVP before administration; permissions and persistence are unchanged. Settings preserve draft/retry behavior. Data pages remain efficient, without decorative environment imagery.

## Motion and accessibility

Micro-interactions use160ms; menus/selection use180–280ms. Feedback is one-shot; no infinite decoration, glossy illustration effect or parallax is introduced. Native menus, hover/focus states, item borders, price highlights and insertion feedback carry the motion. Layout margins do not animate. Reduced motion disables animation and transitions, including pseudo-elements. Focus outlines remain visible; wide tables stay focusable scroll regions; missing/negative/stale states retain textual context.

## QA and remaining acceptance

`e2e/design-review.spec.ts` covers22 route types ×4 widths ×2 themes =176 records, with screenshots375/768/1440/1920 and WCAG-tagged axe checks375/1440. The baseline audit adds320/430/1024 overflow checks. Tests assert actual font families, header/content geometry, a populated market using browser-only observations, selected equipment, a20-player roster and a temporary guild event. `e2e/outpost.spec.ts` verifies the wordmark, headline, CTA destinations, Guides, account navigation and mobile theme persistence. Existing end-to-end ownership, formula, market/cache and migration gates remain required. Fixture sessions do not establish real Discord OAuth.

Before screenshots: `.qa/product-ui-before/`. After: `.qa/design-review/`. Structured results: `.qa/design-review.json`. Failed first-pass evidence: `.qa/outpost-first-pass/`. Current supplementary gates: `.qa/product-ui-extra-gates.json`.

Do not mark reference-image matching, licensed environment media, physical-device use, full WCAG conformance, actual OAuth or public release complete without evidence. Current comparisons include the supplied eight-panel concept, the written brief and before/after app captures; no pixel-perfect or scene-art authenticity claim is made.

## Player workflow layouts

See [workflow research and implementation](PRODUCT_UI_WORKFLOWS.md). Editors use shared equipment browser/anatomical slots/details; mobile switches between three views. Party editing uses compact equipment rows and one native modal member editor. Market name selection supports listbox keyboard navigation and existing catalog filters. Calculator observations/overrides remain beside results. Guild activity opens first with seven resource tabs; creation/editing use dialogs, permissions remain server-enforced. Inter body14–16px, card headings17–20px, application headings28–36px; Geist Mono only for figures.

## Numbered reference refinements

The user-supplied concept is now available in QA-only artifacts. Display titles explicitly use Barlow800; navigation, forms, cards and item details retain Inter. Elevated surfaces now use #292327. Anatomy-centered workbench and read-only build views share slot placement and actual item imagery. Small compositions default to a simultaneous loadout board;10+ members retain a full-width roster. Users can override layouts. PNG export uses the existing bounded renderer, same-origin canvas bitmaps, real draft/saved data and explicit fallback labels; no external export service or fabricated stats. Community discovery has a sticky filter rail, equipment cards, content/weapon filters and real author/revision dates; homepage loads only public/non-hidden community builds. Guides provide searchable original notes. Production calculators separate assumptions, material prices/quantities and results on wide screens; mobile collapses them in reading order. Guild banner is original typography with a monogram because no verified scene asset is available.

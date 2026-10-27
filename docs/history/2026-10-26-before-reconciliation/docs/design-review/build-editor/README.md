# Build Editor reference correction

Status: IN PROGRESS. Reference02 from supplied montage; original panel403×576. QA-only crop [reference.png](reference.png); never shipped as game artwork. Compare1440×900 and390×844 captures with consistent fixture gear.

Reference measurements in montage pixels: compact nav32px; heading/commands about70px; workspace beginsy161; left item category rail about86px, center gear/editor about177px, right details about120px. Equipment icons are the focus, with slots around44px at montage scale. Full panel proportional regions are approximately22%/45%/33%. Desktop implementation must keep readable14–16px Inter controls rather than literally shrinking the montage. Character layout, filters and selected-item details should appear together.

Baseline to capture: `.qa/build-editor-correction/00-baseline/{editor,viewport}-{1440,390}.png`, plus measurements.json. Fixture is a private eight-item Battleaxe loadout; Food/Potion remain honestly unsupported. No fabricated game/spell icons or metadata. Genuine item icons use the official renderer.

Five discrepancies to inspect: excessive center-slot height; tall settings/abilities pushing actions below the first viewport; duplicated category dropdown/list; unsupported tier filters silently falling back; alternatives UI showing only one of several persisted swaps. Full save/reload/auth regressions remain mandatory.

## Iteration01 — rendered review

Viewed `.qa/build-editor-correction/01-equipment-proportions/viewport-1440.png` and `viewport-390.png` against reference02. Measurements: desktop workspace1280px wide, y273/h841, browser240, center708, details330. Baseline was1376px wide, y314/h908. Mobile workspace y376/h721 (baseliney421/h850). All44 browser tests pass; full iteration01 gate passes after excluding environment-owned tool directories from ESLint traversal. An earlier baseline gate had a transient missing `.agents` directory traversal error, not an application lint defect.

Five largest remaining differences: browser preview buried under ten category rows; center takes55% rather than reference~45%; equipment names stretch slot rows unevenly; metadata uses unnecessary mobile rows; details/swaps exceed initial viewport. Next pass uses balanced panes, compact browser categories/preview, uniform icon-led slots and moves content-type metadata into settings. Authentic spell art and unsupported Food/Potion remain explicit gaps.

## Iteration02 — rendered review

Viewed desktop/mobile viewport captures in `.qa/build-editor-correction/02-inventory-density/`. Desktop workspace y273/h702; pane widths295/590/393 (~23%/46%/31%, close to reference region proportions). Complete inventory and browser preview are visible together. Mobile workspace y324/h629: consumables remain just below the initial844px viewport.

Five remaining visual differences: extra command-bar divider/padding pushes inventory down; redundant mobile Equipment heading consumes space; item tier labels overlap native icon-tier artwork; empty Food/Potion glyphs make their rows taller; selected-item swaps require panel scrolling. Third pass removes duplicated spacing/headings, moves tier text to a readable corner, compacts mobile rows while retaining56px icons and leaves right-panel scrolling as explicit responsive behavior. Source limitation: no genuine verified ability icons, food/potion catalog or full weapon-family data. These stay unresolved rather than being illustrated with fake data.

## Iteration03 — rendered and functional review

Viewed both actual viewport captures and reference02. Desktop workspace y256/h702; complete eight-item inventory and both unsupported consumable empty slots are visible. Mobile390×844 now shows all ten slots and equipment count inside the initial viewport. Native56px item icons remain touch-friendly; tier labels no longer overlap native tier emblems. Per-iteration `comparison-1440.png` and `comparison-390.png` retain the reference/source aspect ratios rather than stretching the montage into a purported original browser capture.

Five material remaining differences: (1) two-column readable slot-category navigation rather than the concept’s tiny single-column weapon tree; (2) missing full weapon/consumable metadata means a limited browser, not a fabricated populated catalog; (3) real ability artwork is unavailable, so explicit named selects remain; (4) alternatives are in a scrollable selected-item panel rather than a separate center equipment-set tray; (5) mastery unlocks/stats remain unverified and visibly labeled. These are real remaining scope/data differences, not silently accepted complete-product criteria.

Final gate:67 unit/44 production browser tests and all eight qa:phase checks pass. The new populated fixture test changes one of two alternatives, preserves the second, verifies unsupported tier filtering yields no substitute item, selects an ability with the keyboard, saves a new revision and reloads from PostgreSQL. Existing20-player composition, permissions and calculator regressions remain passing. Full44-test browser suite includes176 dark/light page states and additional narrow overflow checks. This is a completed three-iteration layout correction within the starter catalog; the entire build feature and product remain incomplete/NO-GO.

# Visual system, responsive layouts and motion

## Current direction and reference hierarchy

Recreate the **current implemented Outpost**, not a fresh theme. Its identity is the original copper/cream banner logo, neutral charcoal product surfaces, restrained warm accents, readable application type and real Albion equipment. The owner rejected the green/ivory expedition, left sidebar and generated panoramic hero. Historical screenshots are useful only with their dated rejection/context. The current homepage/Market/crafting reference is [the task-led UX implementation](../design-review/ux-transformation/README.md). Shared search/menus reference: [search/menus/real-equipment review](../design-review/playful-ui/README.md), with [desktop](../design-review/playful-ui/after-1440.png), [mobile](../design-review/playful-ui/after-390.png), [search](../design-review/playful-ui/search-empty-1440.png), [Tools](../design-review/playful-ui/tools-1440.png), [region](../design-review/playful-ui/region-1440.png) and [light theme](../design-review/playful-ui/light-1440.png).

The user-owned Albion Online Grind influenced readable controls, named task destinations and genuine game imagery. Do not copy its proprietary source, audience counts, example prices, premium claims or unrelated layout wholesale. The rebuild is Outpost, including its actual limited data states.

## Font roles

All fonts are local through `src/app/fonts.ts` and `next/font/local`; retain notices. Inter variable100–900 is UI/body/application headings. Barlow Condensed600/700 is secondary display personality and800 is major display. Geist Mono variable is numeric/financial data. The homepage’s current large headline uses Inter, not tiny condensed application controls. Body is15px in the current shell; desktop nav15px bold, ordinary buttons about14px, card titles19px desktop/16px phone, descriptive card text14px, hero description16px desktop/15px phone. The homepage heading is48px desktop,40px intermediate and34px phone; shared page titles are34px desktop/28px phone. Exact computed sizes depend on the existing layered selectors.

Inter is the prioritized UI font. Barlow variants and Geist use `preload:false`; never reintroduce duplicate Barlow loading declarations or an external Google Fonts waterfall. Preserve fallback fonts/font-display swap and actual font variables (`--font-ui`, `--font-display`, `--font-heading`, `--font-data`).

## Tokens and surfaces

| Token                                           | Current dark value    | Light value from brand overrides                           |
| ----------------------------------------------- | --------------------- | ---------------------------------------------------------- |
| `--bg`                                          | `#121416`             | `#f5f0e8`                                                  |
| `--sidebar` (header/surface compatibility name) | `#181b1e`             | `#fffaf3`                                                  |
| `--panel`                                       | `#202328`             | `#fffdf9`                                                  |
| `--elevated`                                    | `#292d32`             | `#eee4d8`                                                  |
| `--border`                                      | `#3a4047`             | `#d3c2b0`                                                  |
| `--text`                                        | `#f1eee9`             | `#30251f`                                                  |
| `--muted`                                       | `#b8bec7`             | `#6a594b`                                                  |
| `--accent-ink`                                  | `#edaa87`             | `#93442c`                                                  |
| `--action` / hover                              | `#a74a2c` / `#923e25` | `#93412b` / `#7f3421`                                      |
| `--error`                                       | `#f17c73`             | Existing light error token; check actual rendered contrast |
| `--metal`                                       | `#d0ad79`             | `#80582e`                                                  |

The market terminal inherits the shared dark/light tokens; the old brown local palette is removed. Controls use an8px radius and major panels12px through `task-ui.css`. Small range controls use6px and step markers are circular. The spacing scale is4/8/12/16/24/32px; preserve readable data/state hierarchy in both themes.

## CSS composition and source order

The root layout imports `globals.css`, `workspace.css`, `player-workspaces.css`, `product-shell.css`, `brand-interactions.css`, `playful-ui.css`, then `task-ui.css`. The home imports `homepage.css`, which includes `home-market-terminal.css`; specialized equipment/production styles are imported by affected routes/components. Specificity and import order matter: later explicit Outpost overrides intentionally replace older product defaults. Do not rebuild from the first color declaration found by grep.

Classes `.app.outpost`, `.light`, `.home-route`, `.workspace-route`, `.product-route` and main `data-page`/`data-width` select actual page patterns. Product max width is1536px, with matched header/content gutters. Desktop content generally uses24px gutters; phone becomes16px. Reading pages/boards/workspaces deliberately differ. Large tables own their horizontal scrolling; do not hide document overflow to conceal broken controls.

## Logo geometry

Use the unchanged `public/brand/outpost-logo.png` via `Wordmark`. The original2172×724 image contains transparent padding. Header display frame width148px and aspect1530/620 uses image width141.96%, left−22.22%, top−9.68%. The source image remains unchanged. A previously smaller image width inside that crop caused the visible offset; do not reintroduce it. Header is80px desktop,72px intermediate and66px phone. Light mode uses a dark backplate to keep cream letters legible. Verify actual vertical center/crop at each breakpoint, not only CSS numbers.

## Homepage composition

Desktop: a compact introduction and three task links beside one searchable observed-market preview. No equipment collage, redundant market panels or community feed. Genuine item imagery identifies the selected item. Chart points preserve actual dates, missing-day gaps and source identity. A refresh action remains inside source details.

At≤780px, introduction/tasks lead and the market preview initially shows search/selection/navigation only. A labelled button expands city prices/history and sets `aria-expanded`. Crafting uses three persistent mobile steps (recipe, materials, profit); only the chosen panel is visible. Switching steps preserves all fields and moves focus to the panel. Desktop retains simultaneous configuration/material/result access. Missing prices never become zero or a calculated profit.

## Shared interaction contracts

| Interaction                 | Implemented behavior                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Buttons                     | Short lift/growth on hover, compression on press, visible keyboard focus, no hover-only essential action                             |
| Task glyphs/emblems         | Original meaningful symbols with text labels; short tilt/scale on hover; decorative SVGs hidden from AT                              |
| Tools/account               | Native details/summary, explanatory tool menu, outside dismissal, Escape closes and focuses summary                                  |
| Search                      | Native modal dialog, compact single-focus field, shortcuts/examples, grouped image-led results, Ctrl/Cmd+K and Arrow/Enter/Escape    |
| Region                      | Native select with controlled URL/cookie value; CSS base-select/picker enhancement when supported; classic native fallback elsewhere |
| Theme                       | Snapshot crossfade when `document.startViewTransition` is supported; immediate update otherwise; persisted cookie and pressed state  |
| Route                       | React19.3 `ViewTransition` around main content keyed by pathname; persistent header stays outside it                                 |
| Editor/member/event dialogs | Focused modal workflows, correct close/Escape/focus return and validation/draft retention                                            |
| Source refresh              | Explicit source refresh in the single preview; no separate homepage polling snapshot or invented values                              |

Current shared button transform duration is about190ms; buttons hover up2px/scale1.025 and press down1px/scale.97. Feature cards have their own restrained lift/tilt. Tools move in/out around160ms and search around180ms, retaining full text opacity. Route arrival240ms/exit130ms and theme crossfade280ms communicate state changes. Preserve named CSS transitions and user feedback, not arbitrary duration claims if later source changes.

Reduced motion disables nonessential animations/transitions and native route/theme motion. The region picker has a no-transition fallback. Avoid a new animation dependency, route interception or remounting calculator fields on every query change. `ViewTransition` keys use pathname, not every keystroke or refresh revision.

## Mobile accessibility and interaction

Desktop navigation hides at≤1100px and the drawer takes over. The drawer locks body scrolling, focuses its close button, traps Tab, closes on Escape/resize/outside dismissal and returns focus to the trigger. The background is both inert and aria-hidden while the drawer is open; this prevents duplicate theme controls in the accessibility tree. Search and drawers must not expose competing background controls to keyboard/AT.

At phone/tablet widths the search trigger is icon-only, so hidden shortcut text cannot overflow. At≤360px the compact header theme control hides, but theme remains available in the drawer. Controls keep readable labels and correct accessible names; a visible descriptive subtitle must not be suppressed by an unrelated aria-label. Input focus uses one clear treatment rather than nested orange double borders.

Equipment editing has mobile Equipment/Browse items/Item details tabs. Comp editing keeps one member dialog and a readable board/roster. Discovery filters collapse on phone; selection stays persistent while moving between views. Production result summaries and market tables remain navigable with their own scroll regions where needed.

## Rendered acceptance

Inspect actual1440×900,1920×1080,768px tablet,390×844,375px and320px pages. Capture full-page and above-fold views after fonts/relevant images/source state settle, then **open** the images. Compare the same viewport/state against the baseline; source read, screenshot generation, zero overflow and axe alone cannot establish visual acceptance. Check selected, hover, pressed, focus, popup-open, light/dark, reduced-motion, empty/missing/failure and authenticated fixture states as applicable. Keep genuine artwork captures separate from deterministic goldens that mask variable image pixels.

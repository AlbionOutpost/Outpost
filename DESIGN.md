---
name: Outpost
description: The Albion Online companion — markets, builds, comps and crafting in one warm-charcoal, ember-lit, gear-first workspace.
colors:
  night: "#101014"
  night-chrome: "#141317"
  panel: "#201c1e"
  panel-sunk: "#19171b"
  panel-raised: "#2a2427"
  edge: "#393033"
  edge-strong: "#4a4044"
  parchment: "#f2eee9"
  mist: "#c9c3c3"
  dusk: "#a9a4a9"
  ember: "#c85a3b"
  ember-bright: "#df7050"
  ember-deep: "#a9472b"
  ember-wash: "#c85a3b12"
  gain: "#48ba87"
  loss: "#db5b56"
  caution: "#e0a94a"
typography:
  display:
    fontFamily: "Barlow Condensed, Arial Narrow, Arial, sans-serif"
    fontSize: "clamp(56px, 5.4vw, 84px)"
    fontWeight: 800
    lineHeight: 0.96
    letterSpacing: "0em"
  page-title:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.15
  section-title:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.35
  data:
    fontFamily: "Geist Mono, Courier New, monospace"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.3
rounded:
  control: "6px"
  panel: "8px"
  large: "12px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "10": "40px"
components:
  button-primary:
    backgroundColor: "{colors.ember}"
    textColor: "{colors.parchment}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.ember-bright}"
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.parchment}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 16px"
  input:
    backgroundColor: "{colors.panel-sunk}"
    textColor: "{colors.parchment}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 12px"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.parchment}"
    rounded: "{rounded.panel}"
    padding: "16px"
  chip-activity:
    backgroundColor: "{colors.ember-wash}"
    textColor: "{colors.ember-bright}"
    rounded: "{rounded.control}"
    padding: "2px 8px"
---

# Design System: Outpost

## Overview

Outpost should feel like a royal city at dusk: warm charcoal stone, ember-orange firelight, painted scenery behind every page, real gear on the table, and every number exactly where a player expects it. It is a **tool first** — players arrive with a job (check a price, find a build, plan a party, cost a craft) and the interface should make that job fast and certain. **Atmosphere is everywhere but never in the way**: each page opens with an illustrated masthead, destination cards carry their own art, and the working panels below stay calm, dense and legible.

The bar is **best-in-class, award-calibre craft**: one coherent visual language across every route, precise typography, deliberate hierarchy, real game art, honest data states and motion that explains rather than decorates. A page is not done until it looks intentional at 1440px and at 390px.

**Current-direction references** (owner-supplied targets — match their composition and polish, never their placeholder numbers, fake stats or vocabulary):

| Reference                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Use it for                                                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Current (30 Oct, evening):** [Full site sheet](docs/design/references/latest-06-site-sheet.png) — landing, tools, market, build creator, builds, guides, database, guilds, community and 404 in one charcoal + ember system                                                                                                                                                                                                                                         | **The look to hit**: warm charcoal panels, ember accents, a painted scene behind every page title, real item icons, compact cards. Its like counts, view counts, 24h % changes, member counts and ratings are placeholders — never show numbers we do not measure |
| 30 Oct (afternoon): [Landing page](docs/design/references/v3-landing.png) (product-style homepage: headline + live product window, feature cards, "everything in one place", call-to-action band), [Home](docs/design/references/v3-home.png), [Market](docs/design/references/v3-market.png), [Builds library](docs/design/references/v3-builds.png), [Build detail](docs/design/references/v3-build-detail.png), [Crafting](docs/design/references/v3-crafting.png) | Composition and polish of the product-style landing, mastheads, icon badges and charts. Palette superseded by the evening sheet. Names, prices, views, likes, trends and slogans are placeholders — use real data                                                 |
| 29 Oct: [Home](docs/design/references/latest-01-home.png), [Market](docs/design/references/latest-02-market.png), [Build library](docs/design/references/latest-03-build-library.png), [Build detail](docs/design/references/latest-04-build-detail.png), [Crafting](docs/design/references/latest-05-crafting.png)                                                                                                                                                   | Same direction, earlier round; use where the 30 Oct set has no page                                                                                                                                                                                               |
| [Full-site page sheet](docs/design/references/site-pages.png)                                                                                                                                                                                                                                                                                                                                                                                                         | Overall composition of all 19 page types, desktop and mobile                                                                                                                                                                                                      |
| [UI system / component guide](docs/design/references/ui-system.png)                                                                                                                                                                                                                                                                                                                                                                                                   | Buttons, inputs, tabs, cards, tables, states, item-art rules                                                                                                                                                                                                      |
| [Builds library + detail](docs/design/references/builds-library-detail.png)                                                                                                                                                                                                                                                                                                                                                                                           | Library grid, weapon rail, detail layout                                                                                                                                                                                                                          |
| [In-game inventory](docs/design/references/in-game-inventory.png)                                                                                                                                                                                                                                                                                                                                                                                                     | Anatomy of the equipment board (slot positions)                                                                                                                                                                                                                   |
| Earlier (27 Oct): [Homepage](docs/design/references/homepage.png), [Market](docs/design/references/market.png), [Crafting](docs/design/references/crafting.png), [Build + Comp](docs/design/references/build-composition.png)                                                                                                                                                                                                                                         | Secondary layout targets; Build + Comp is still the main Comp reference                                                                                                                                                                                           |

Current state for comparison: [homepage](docs/design/baseline/home-1440.png), [builds library](docs/design/baseline/builds-library-1440.png). Palette history: warm charcoal + copper (29 Oct) → deep navy + ember explored in mockups on 30 Oct → the owner's evening sheet settled on **warm charcoal + ember**, which is what ships. Flat panels without illustration were rejected as "lifeless" in every palette — the mastheads, card art and gear glow are part of the system, not decoration.

## Colors

Warm charcoal surfaces lit by a single ember accent. Warmth comes from the slightly red-shifted greys, the illustrations and the glow behind gear; depth comes from stepping surfaces (`night` → `panel` → `panel-raised`). The CSS custom properties live on `.app` in `src/app/globals.css` (`--bg`, `--panel`, `--elevated`, `--border`, `--muted`, `--text`, `--accent`, `--accent-hover`, `--accent-wash`, `--success`, `--error`).

### Primary

- **Ember** (`#c85a3b`, `--accent`): primary actions, active nav/tab, selected state, the second line of the hero headline, key links, icon-badge rings. Hover brightens to `ember-bright` (`--accent-hover`); press deepens to `ember-deep`. `ember-wash` (`--accent-wash`) tints selected rows, icon badges and activity chips. Primary buttons use parchment text on ember (≥4.5:1).

### Neutral

- **Night** (`#101014`, `--bg`): page background. **Night chrome** (`#141317`, `--sidebar`): header, footer, drawers.
- **Panel** (`#201c1e`, `--panel`): sections and cards. **Panel sunk** (`#19171b`, `--elevated`): inputs, wells, table headers and the inside of a panel. **Panel raised** (`#2a2427`): popovers, menus and hover rows.
- **Edge / edge strong** (`#393033` / `#4a4044`, `--border`): 1px borders and dividers; strong for inputs and interactive outlines.
- **Parchment** (`#f2eee9`, `--text`): primary text. **Mist** (`#c9c3c3`): secondary. **Dusk** (`#a9a4a9`, `--muted`): muted captions and timestamps (≥4.5:1 on `panel`).

### Semantic

- **Gain** `#48ba87` (`--success`: profit, rising), **Loss** `#db5b56` (`--error`: negative, falling, destructive), **Caution** `#e0a94a` (stale data, warnings). Focus rings use ember.
- Albion quality and tier colours are game facts; use them only on item badges, never as decoration.

### Named Rules

- **One accent.** Ember is the only brand hue; it never doubles as a semantic colour. Selected controls use `ember-wash` + an ember edge, gains and losses use green and red with a sign or label.
- **Charcoal needs light.** Never ship a page without its masthead art, glow or imagery — flat panels alone were rejected as "lifeless".
- **Profit is never colour-only.** Pair gain/loss colour with a sign or label.
- **Light theme** (`.light`) keeps the same roles with warm paper neutrals and a deeper ember (`#9c3f29`); test it separately.

## Typography

Three families, three jobs. All are self-hosted via `next/font/local` (`src/app/fonts.ts`); never load web fonts from a CDN.

- **Barlow Condensed 800** — display only: the homepage hero and rare brand moments. Uppercase, tight leading.
- **Inter** — everything else: page titles, section headings, body, controls, labels.
- **Geist Mono** — every number a player compares: prices, quantities, IP, profit, percentages, timers. Tabular alignment matters more than style.

### Hierarchy

| Role            | Size / weight        | Use                                                               |
| --------------- | -------------------- | ----------------------------------------------------------------- |
| Display         | 64–86px / 800 Barlow | Homepage hero                                                     |
| Page title      | 28px / 700           | One per page, names the task ("Crafting calculator", "Edit comp") |
| Section title   | 18px / 650           | Panels and major groups                                           |
| Card title      | 15–16px / 600        | Build cards, list items                                           |
| Body            | 14px / 400, 1.55     | Default text                                                      |
| Label / caption | 12px / 600 or 500    | Field labels, table headers, timestamps                           |

### Named Rules

- **12px floor.** No text below 12px. (The codebase still has ~190 uses of 9–11px; remove them when touching a page.)
- **Five sizes per page, not fifty.** Use the scale; do not invent one-off sizes.
- **Headings name the task.** No slogans or marketing taglines inside the app.

## Layout

- **Max content width** 1536px (frames up to 1664px), gutters 24px desktop / 16px phone.
- **Spacing** on the 4/8 scale in the frontmatter. Use the tokens (`--space-*`); do not hand-pick 5/7/14/18px gaps.
- **Breakpoints (target)**: 1280 (wide), 980 (tablet / editor split), 700 (phone layout), 390 (reference phone). The current CSS mostly uses 1100, 780 and 600 plus ~45 ad-hoc values; converge on the targets when touching a page. Design and verify at 1440, 1920, 768, 390, 375 and 320.
- **One page archetype per task** — never flatten every page into the same stacked panels:

| Archetype                       | Routes                                                                                                                      | Shape                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home                            | `/`                                                                                                                         | Header on its own bar → full-bleed painted hero (`city-overlook-v2`): copy + Explore Tools / Browse Builds left, four capability items on a rule inside the hero → "Powerful _tools_" with three framed product cards (copper corner marks, emblem, display-face title, one line, "Live data" tag with a green dot; the real software inside; one filled action with its tool icon): Market Explorer (search link, item row with tier · kind · region, "City prices" with 7d/30d tabs, five city quotes with city dots and source times, trend with y-axis ticks, x dates and a city select in the caption), Build Library (one public build per activity tab — Solo Mists / Small scale / ZvZ / PvE — on the loadout board with Q/W/E/D/R/F abilities and passives, author and recorded-piece count beneath), Crafting Calculator (Craft item / Refine material tabs, recipe and city selects, batch stepper, "Required materials" with unit × total, "Cost & profit" panel — materials, fees, total cost, market price, profit per item, margin — through `production()`, assumptions) → Group Compositions band on `build-v1` with a real library comp read as Tank / Healer / DPS / Support **by weapon type** → "Why choose Outpost?" four items → ad unit + "Go ad-free with Premium" → closing band on `market-v1` → structured footer. Previews load when in view; nothing is estimated |
| Market research                 | `/tools/market`, `/items/[id]`, `/market-data`                                                                              | Filter rail (item, quality, city, region) · table + history · selected-city context. Filters live in the URL. Research-first: a valid selection loads its prices and history on its own; the button only refreshes. Item pages show city prices, every tier/enchantment, consuming recipes and public builds                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Calculator                      | `/tools/crafting`, `refining`, `cooking`, `alchemy`, `enchanting`, `transporting`, `farming`, `fishing`, `flipping`, `gold` | Configure → materials → results; results before detailed accounting; three steps on phone. Observations load for the current selection (debounced) and manual prices are never replaced without the refresh button; flipping leads with the route scanner                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Build library / detail / editor | `/builds/**`                                                                                                                | Weapon-family rail + card grid; detail = context + equipment board + one inspector; editor = board + slot inspector + catalog with tabs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Comp planner                    | `/compositions/**`                                                                                                          | Title/activity/size → roles strip → roster with per-member loadouts; undo and PNG export                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Team hub                        | `/groups/**`                                                                                                                | Next event, announcements, shared builds/comps, members, loot ledger                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Supporting                      | dashboard, settings, timers, guides, favorites, shopping list, sign-in, legal                                               | Simple, sectioned, editorial where content-led (guides)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

- **Mobile is designed, not collapsed.** Deliberate order, drawers for filters, sticky primary action, tables scroll inside their own region, selection survives layout switches.

## Elevation & Depth

Mostly flat, separated by surface steps and 1px `edge` borders. Depth is reserved for things that float or deserve attention:

- Cards: border + `0 6px 18px #00000024` with a 1px inner top highlight (`inset 0 1px 0 #ffffff04`).
- Popovers, menus, dialogs: `panel-raised` + stronger shadow; dialogs dim the page.
- **Gear glow**: a warm ember radial behind featured equipment (item wells, build cards, selected item).
- **City colours** (`.city-dot[data-city]` in `homepage.css`): Bridgewatch gold `#e0a53c`, Martlock blue `#4f8fe0`, Thetford purple `#a569e0`, Lymhurst green `#58b764`, Fort Sterling silver `#e8eef5`, Caerleon red `#d9534f`, Brecilien teal `#4fb8c9` — the game's own faction colours, used only as an identity dot beside a city name, never as text colour.
- **Illustrated mastheads**: every hub page (Home, Market, Builds, Comps, Tools/calculators, Guides, Teams) opens with a painted scene behind the page title (`WorkspaceHeading` with `scene`, optional `actions` slot for the primary button), faded into the panel with a left-to-right scrim so text stays ≥4.5:1. Working panels and benefit cards below never get background art.
- **Icon badges**: section and feature icons sit in a 36–44px circle of `ember-wash` with a 1px ember ring.
- Never nest a padded card inside another padded card.

## Shapes

- Radii: **7px** controls, **8px** panels/cards, **12px** large hero blocks and dialogs. Nothing pill-shaped except toggles and avatar circles.
- Item wells are square with a 6–8px radius and a consistent frame; tier/enchant badges sit in a fixed corner.
- Icons: Lucide at 16/20px for UI; original task emblems (`feature-emblem.tsx`, `tool-icon.tsx`) for destinations. Never use item art as a UI icon.

## Components

Shared UI lives in `src/components`. Reuse before you restyle; if two pages need the same thing, it becomes one component.

### Buttons

Primary (ember, dark text) for the one main action per view; secondary (panel + edge-strong border) for the rest; tertiary (text + arrow) for navigation links; destructive uses `loss`. Height 40px (36px compact). Hover grows to 1.045 and holds; press compresses to 0.96.

### Inputs / Fields

Sunk `night-chrome` wells, 40px tall, label above, helper/validation below. Search fields carry a leading icon and a `Ctrl K` hint in the header. Numbers are typed in Geist Mono and right-aligned in tables.

### Cards / Containers

Panel surface, 8px radius, 16px padding. Build cards lead with the weapon well (92px on library cards), then title, activity chip, author, then the ability row (27px desktop / 23px narrow).

### Tables

Sticky header, 12px uppercase-free labels, Geist Mono numbers right-aligned, row hover on `panel-raised`, selected row in `ember-wash`. Every price cell shows its own freshness (Recent / Stale / Unavailable) — missing values are an em dash and "Unavailable", never 0.

### Navigation

One header on every route: logo · Market · Builds · Comps · Tools ▾ · Guides · Teams · More · search (Ctrl K) · region picker · theme toggle · Discord sign-in. Nav labels are transparent and only scale on hover — no filled hover boxes. Mobile uses a modal drawer.

### Equipment board (signature component)

The anatomical 10-slot inventory (`inventory-equipment-board.tsx`) mirrors the [in-game layout](docs/design/references/in-game-inventory.png): equal wells (72px, 14px gaps), head/chest/boots in the centre column over the owner's figure mark, main/off hand either side, bag, cape, potion, food and mount around it. Empty supply slots show the owner's slot marks (`public/albion/slots/*.svg`, neutral grey at 70% of the well); head, chest, boots and the hands stay as empty dashed wells. Slot names are kept for assistive tech, not shown.

The read-only counterpart is `LoadoutBoard` (`src/components/loadout-board.tsx`): the same arrangement with a faint silhouette behind, official renders for recorded pieces, the recorded active abilities on a strip under each piece, and original line glyphs (`loadout-glyphs.tsx`: bag, helmet, cape, main hand, chest, off hand, potion, boots, food, mount) for slots nothing was recorded for. Sizes `hero` (landing), `card` (windows) and `mini` (party strips, no abilities). Use it wherever a build is shown but not edited.

### Motion

Owned by `src/app/motion-system.css`, enabled only under `prefers-reduced-motion: no-preference`:

- Controls: hover scale 1.045, press 0.96 (90ms); cards 1.018 / 0.985; equipment 1.06 (180ms). Easing `ease-out`, 160ms.
- Menus/surfaces open in 180ms; drawers slide 20px in 220ms.
- Route view transitions and the theme cross-fade are the only page-level motion.
- Reduced motion removes all transforms; state changes stay visible.

## Do's and Don'ts

### Do:

- **Do** use real game art from the official renderer (`item-icon.tsx`, `spell-icon.tsx`) to identify actual items and abilities in tables, cards, calculators and loadouts.
- **Do** show where every number came from and how fresh it is; label manual inputs and estimates as such.
- **Do** use Albion vocabulary: **Comps** (not "compositions" in UI), builds, loadout, swaps, IP, spec, focus, RRR, buy order / sell order (never bid/ask), Teams (UI name for guilds/groups), tier notation T4.0 / T6.1.
- **Do** design empty, loading, error, stale and unavailable states for every data view.
- **Do** keep everything keyboard-reachable with visible focus, labelled controls, dismissible dialogs and focus return.
- **Do** compare your rendered page against the matching reference at desktop and phone width before calling it done.

### Don't:

These have all been tried and explicitly rejected — do not bring them back:

- **Don't** use the green/ivory "expedition" palette, or flat navy panels without illustration and glow ("worse and lifeless").
- **Don't** add a site-wide left sidebar, a per-route header, or a filled box behind nav items on hover. (A section rail inside a page — e.g. Market tools, build filters — is fine.)
- **Don't** use cursor tilt, vertical lift on hover, or independent icon hover motion. Grow-and-hold only.
- **Don't** put a chart in the hero, leave a section empty, or use plain boxes / an isometric banner on the homepage.
- **Don't** strip the homepage to an illustration-free equipment collage.
- **Don't** use uniform inventory slot boxes — use the anatomical board.
- **Don't** nest padded cards in padded cards, double-border inputs, or nest scroll regions.
- **Don't** use generic SaaS gradients, glassmorphism, random glow, oversized rounding or decorative item art.
- **Don't** show fabricated activity: votes, likes, view counts, "live" badges, damage/sustain bars, "Verified" labels, invented prices, trends or unsupported IP — even when a reference image shows them. Real equivalents exist: AODP history for trends and sparklines, traded volume, observation ages, library update dates.
- **Don't** put migration history, competitor names (including "Grind" taglines), slogans inside tools or engineering explanations in the public UI.
- **Don't** present generated illustrations as gameplay, use authentic game scenes without permission, or copy competitor code, art or copy.

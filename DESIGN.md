---
name: Outpost
description: The Albion Online companion — markets, builds, comps and crafting in one deep-navy, ember-lit, gear-first workspace.
colors:
  night: "#08111b"
  night-chrome: "#060d15"
  panel: "#0d1823"
  panel-raised: "#132232"
  panel-high: "#182a3d"
  edge: "#1d2f42"
  edge-strong: "#24384d"
  parchment: "#f1eee7"
  mist: "#b4bfcb"
  dusk: "#8592a0"
  ember: "#ff8644"
  ember-bright: "#ffa36d"
  ember-deep: "#e8702c"
  ember-wash: "#ff86441f"
  gain: "#3fcf8e"
  loss: "#f06a6a"
  caution: "#f0b955"
  focus-blue: "#82b9ff"
typography:
  display:
    fontFamily: "Barlow Condensed, Arial Narrow, Arial, sans-serif"
    fontSize: "clamp(64px, 5.4vw, 86px)"
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
  control: "7px"
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
    textColor: "{colors.night}"
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
    backgroundColor: "{colors.night-chrome}"
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

Outpost should feel like a royal city at night: deep blue dusk, ember-orange firelight, painted scenery behind every page, real gear on the table, and every number exactly where a player expects it. It is a **tool first** — players arrive with a job (check a price, find a build, plan a party, cost a craft) and the interface should make that job fast and certain. **Atmosphere is everywhere but never in the way**: each page opens with an illustrated masthead, destination cards carry their own art, and the working panels below stay calm, dense and legible.

The bar is **best-in-class, award-calibre craft**: one coherent visual language across every route, precise typography, deliberate hierarchy, real game art, honest data states and motion that explains rather than decorates. A page is not done until it looks intentional at 1440px and at 390px.

**Current-direction references** (owner-supplied targets — match their composition and polish, never their placeholder numbers, fake stats or vocabulary):

| Reference                                                                                                                                                                                                                                                                                                           | Use it for                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Current (30 Oct):** [Home](docs/design/references/v3-home.png), [Market](docs/design/references/v3-market.png), [Builds library](docs/design/references/v3-builds.png), [Build detail](docs/design/references/v3-build-detail.png), [Crafting](docs/design/references/v3-crafting.png)                            | **The look to hit**: navy panels, ember accents, illustrated mastheads and cards, icon badges, charts. Their names, prices, views, likes, trends and slogans are placeholders — use real data |
| 29 Oct: [Home](docs/design/references/latest-01-home.png), [Market](docs/design/references/latest-02-market.png), [Build library](docs/design/references/latest-03-build-library.png), [Build detail](docs/design/references/latest-04-build-detail.png), [Crafting](docs/design/references/latest-05-crafting.png) | Same direction, earlier round; use where the 30 Oct set has no page                                                                                                                           |
| [Full-site page sheet](docs/design/references/site-pages.png)                                                                                                                                                                                                                                                       | Overall composition of all 19 page types, desktop and mobile                                                                                                                                  |
| [UI system / component guide](docs/design/references/ui-system.png)                                                                                                                                                                                                                                                 | Buttons, inputs, tabs, cards, tables, states, item-art rules                                                                                                                                  |
| [Builds library + detail](docs/design/references/builds-library-detail.png)                                                                                                                                                                                                                                         | Library grid, weapon rail, detail layout                                                                                                                                                      |
| [In-game inventory](docs/design/references/in-game-inventory.png)                                                                                                                                                                                                                                                   | Anatomy of the equipment board (slot positions)                                                                                                                                               |
| Earlier (27 Oct): [Homepage](docs/design/references/homepage.png), [Market](docs/design/references/market.png), [Crafting](docs/design/references/crafting.png), [Build + Comp](docs/design/references/build-composition.png)                                                                                       | Secondary layout targets; Build + Comp is still the main Comp reference                                                                                                                       |

Current state for comparison: [homepage](docs/design/baseline/home-1440.png), [builds library](docs/design/baseline/builds-library-1440.png). Palette history: warm charcoal (`#101215`/`#191d22`, copper `#ee945a`) was used 29–30 Oct; on 30 Oct the owner chose navy with rich illustration. The earlier "lifeless" rejection was of flat navy panels **without** art — navy only works together with the mastheads, card art and glow described here.

## Colors

Deep night-blue surfaces lit by a single ember-orange accent. Warmth comes from the illustrations, the ember accent and the glow behind gear; depth comes from stepping surfaces (`night` → `panel` → `panel-raised`).

### Primary

- **Ember** (`#ff8644`): primary actions, active nav/tab, selected state, the second line of the hero headline, key links, icon-badge rings. Hover brightens to `ember-bright`; press deepens to `ember-deep`. `ember-wash` tints selected rows, icon badges and activity chips.

### Neutral

- **Night** (`#08111b`): page background. **Night chrome** (`#060d15`): header, footer, sunk wells and inputs.
- **Panel / raised / high** (`#0d1823` / `#132232` / `#182a3d`): sections, cards, popovers, hover rows.
- **Edge / edge strong** (`#1d2f42` / `#24384d`): 1px borders and dividers; strong for inputs and interactive outlines.
- **Parchment** (`#f1eee7`): primary text. **Mist** (`#b4bfcb`): secondary. **Dusk** (`#8592a0`): muted captions, timestamps (≥4.5:1 on `panel`).

### Semantic

- **Gain** `#3fcf8e` (profit, rising), **Loss** `#f06a6a` (negative, falling, destructive), **Caution** `#f0b955` (stale data, warnings), **Focus blue** `#82b9ff` (focus rings only).
- Albion quality and tier colours are game facts; use them only on item badges, never as decoration.

### Named Rules

- **One accent.** Ember is the only brand hue. Blue is the ground, never a second accent.
- **Navy needs light.** Never ship a navy page without its masthead art, glow or imagery — that is the "lifeless" look that was rejected.
- **Profit is never colour-only.** Pair gain/loss colour with a sign or label.
- **Light theme** keeps the same roles with cool paper neutrals and a deeper ember (`#c4511a`).

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

| Archetype                       | Routes                                                                                                                      | Shape                                                                                                                                   |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Home                            | `/`                                                                                                                         | Cinematic hero → three distinct destinations (Market, Builds, Comps) → market check + city quote tiles → featured builds                |
| Market research                 | `/tools/market`, `/items/[id]`, `/market-data`                                                                              | Filter rail (item, quality, city, region) · table + history · selected-city context. Filters live in the URL                            |
| Calculator                      | `/tools/crafting`, `refining`, `cooking`, `alchemy`, `enchanting`, `transporting`, `farming`, `fishing`, `flipping`, `gold` | Configure → materials → results; results before detailed accounting; three steps on phone                                               |
| Build library / detail / editor | `/builds/**`                                                                                                                | Weapon-family rail + card grid; detail = context + equipment board + one inspector; editor = board + slot inspector + catalog with tabs |
| Comp planner                    | `/compositions/**`                                                                                                          | Title/activity/size → roles strip → roster with per-member loadouts; undo and PNG export                                                |
| Team hub                        | `/groups/**`                                                                                                                | Next event, announcements, shared builds/comps, members, loot ledger                                                                    |
| Supporting                      | dashboard, settings, timers, guides, favorites, shopping list, sign-in, legal                                               | Simple, sectioned, editorial where content-led (guides)                                                                                 |

- **Mobile is designed, not collapsed.** Deliberate order, drawers for filters, sticky primary action, tables scroll inside their own region, selection survives layout switches.

## Elevation & Depth

Mostly flat, separated by surface steps and 1px `edge` borders. Depth is reserved for things that float or deserve attention:

- Cards: border + `0 6px 18px #00000024` with a 1px inner top highlight (`inset 0 1px 0 #ffffff04`).
- Popovers, menus, dialogs: `panel-raised` + stronger shadow; dialogs dim the page.
- **Gear glow**: a warm ember radial behind featured equipment (item wells, build cards, selected item).
- **Illustrated mastheads**: every hub page (Home, Market, Builds, Comps, Tools/calculators, Guides, Teams) opens with a painted scene behind the page title, faded into `night` with a left-to-right scrim so text stays ≥4.5:1. Destination cards carry their own scene. Working panels below never get background art.
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

The anatomical 10-slot inventory (`inventory-equipment-board.tsx`) mirrors the [in-game layout](docs/design/references/in-game-inventory.png): head/chest/shoes in the centre column, main/off hand either side, bag, cape, potion, food and mount around it. Empty slots may show faint catalog art marked "Empty" and never count as equipped.

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

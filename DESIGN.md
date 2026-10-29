---
name: Outpost
description: The Albion Online companion — markets, builds, comps and crafting in one warm, dark, gear-first workspace.
colors:
  forge-black: "#101215"
  chrome-black: "#0c0e11"
  iron-panel: "#191d22"
  iron-raised: "#24292f"
  iron-high: "#2c3239"
  iron-edge: "#353b43"
  parchment: "#f1eee7"
  ash: "#c5c3be"
  smoke: "#aaa9a5"
  copper: "#ee945a"
  copper-bright: "#ffb482"
  copper-deep: "#d47843"
  copper-wash: "#ee945a14"
  gain: "#38c88c"
  loss: "#ef6969"
  caution: "#e6b35b"
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
    fontWeight: 650
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
    backgroundColor: "{colors.copper}"
    textColor: "{colors.forge-black}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.copper-bright}"
  button-secondary:
    backgroundColor: "{colors.iron-panel}"
    textColor: "{colors.parchment}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 16px"
  input:
    backgroundColor: "{colors.chrome-black}"
    textColor: "{colors.parchment}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 12px"
  panel:
    backgroundColor: "{colors.iron-panel}"
    textColor: "{colors.parchment}"
    rounded: "{rounded.panel}"
    padding: "16px"
  chip-activity:
    backgroundColor: "{colors.copper-wash}"
    textColor: "{colors.copper-bright}"
    rounded: "{rounded.control}"
    padding: "2px 8px"
---

# Design System: Outpost

## Overview

Outpost should feel like walking into a well-run guild hall at night: warm metal, firelight copper, real gear on the table, and every number exactly where a player expects it. It is a **tool first** — players arrive with a job (check a price, find a build, plan a party, cost a craft) and the interface should get out of the way and make that job fast and certain. Atmosphere lives at the edges (the homepage hero, build mastheads, the glow behind gear); work surfaces stay calm, dense and legible.

The bar is **best-in-class, award-calibre craft**: one coherent visual language across every route, precise typography, deliberate hierarchy, real game art, honest data states and motion that explains rather than decorates. A page is not done until it looks intentional at 1440px and at 390px.

**Current-direction references** (owner-supplied targets — match their composition and polish, never their placeholder numbers, fake stats or vocabulary):

| Reference                                                                                                                                                                                                   | Use it for                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [Full-site page sheet](docs/design/references/site-pages.png)                                                                                                                                               | Overall composition of all 19 page types, desktop and mobile |
| [UI system / component guide](docs/design/references/ui-system.png)                                                                                                                                         | Buttons, inputs, tabs, cards, tables, states, item-art rules |
| [Builds library + detail](docs/design/references/builds-library-detail.png)                                                                                                                                 | Library grid, weapon rail, detail layout                     |
| [In-game inventory](docs/design/references/in-game-inventory.png)                                                                                                                                           | Anatomy of the equipment board (slot positions)              |
| [Homepage](docs/design/references/homepage.png), [Market](docs/design/references/market.png), [Crafting](docs/design/references/crafting.png), [Build + Comp](docs/design/references/build-composition.png) | Page-specific layout targets                                 |

Current state for comparison: [homepage](docs/design/baseline/home-1440.png), [builds library](docs/design/baseline/builds-library-1440.png). The palette in the older five references (orange `#F9733A` on cool charcoal/navy) is superseded by the warm palette below.

## Colors

Warm dark metal with a single copper accent. Depth comes from stepping surfaces (`forge-black` → `iron-panel` → `iron-raised`), not from many hues.

### Primary

- **Copper** (`#ee945a`): primary actions, active nav/tab, selected state, the second line of the hero headline, key links. Hover brightens to `copper-bright`; press deepens to `copper-deep`. `copper-wash` tints selected rows and activity chips.

### Neutral

- **Forge black** (`#101215`): page background. **Chrome black** (`#0c0e11`): header, inputs, sunk wells.
- **Iron panel / raised / high** (`#191d22` / `#24292f` / `#2c3239`): cards, popovers, hover rows.
- **Iron edge** (`#353b43`): 1px borders and dividers.
- **Parchment** (`#f1eee7`): primary text. **Ash** (`#c5c3be`): secondary. **Smoke** (`#aaa9a5`): muted captions, timestamps.

### Semantic

- **Gain** `#38c88c` (profit, positive deltas), **Loss** `#ef6969` (negative, destructive), **Caution** `#e6b35b` (stale data, warnings), **Focus blue** `#82b9ff` (focus rings only).
- Albion quality and tier colours are game facts; use them only on item badges, never as decoration.

### Named Rules

- **One accent.** Copper is the only brand hue. Do not introduce blues, purples or gradients as brand colour.
- **Profit is never colour-only.** Pair gain/loss colour with a sign or label.
- **Light theme** keeps the same roles with warm paper neutrals and a deeper copper (`#ae420f`). The current light theme is still the older cool tint and must be warmed (see [roadmap](docs/ROADMAP.md)).

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

- **12px floor.** No text below 12px. (The codebase still has ~50 uses of 9–11px; remove them when touching a page.)
- **Five sizes per page, not fifty.** Use the scale; do not invent one-off sizes.
- **Headings name the task.** No slogans or marketing taglines inside the app.

## Layout

- **Max content width** 1536px (frames up to 1664px), gutters 24px desktop / 16px phone.
- **Spacing** on the 4/8 scale in the frontmatter. Use the tokens (`--space-*`); do not hand-pick 5/7/14/18px gaps.
- **Breakpoints**: 1280 (wide), 980 (tablet / editor split), 700 (phone layout), 390 (reference phone). Design and verify at 1440, 1920, 768, 390, 375 and 320.
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

Mostly flat, separated by surface steps and 1px `iron-edge` borders. Depth is reserved for things that float or deserve attention:

- Cards: border + `0 6px 18px #00000024` with a 1px inner top highlight (`inset 0 1px 0 #ffffff04`).
- Popovers, menus, dialogs: `iron-raised` + stronger shadow; dialogs dim the page.
- **Gear glow**: a warm, low-opacity radial behind featured equipment is allowed on hero/masthead surfaces only.
- Never nest a padded card inside another padded card.

## Shapes

- Radii: **7px** controls, **8px** panels/cards, **12px** large hero blocks and dialogs. Nothing pill-shaped except toggles and avatar circles.
- Item wells are square with a 6–8px radius and a consistent frame; tier/enchant badges sit in a fixed corner.
- Icons: Lucide at 16/20px for UI; original task emblems (`feature-emblem.tsx`, `tool-icon.tsx`) for destinations. Never use item art as a UI icon.

## Components

Shared UI lives in `src/components`. Reuse before you restyle; if two pages need the same thing, it becomes one component.

### Buttons

Primary (copper, dark text) for the one main action per view; secondary (iron panel + border) for the rest; tertiary (text + arrow) for navigation links; destructive uses `loss`. Height 40px (36px compact). Hover grows to 1.045 and holds; press compresses to 0.96.

### Inputs / Fields

Sunk `chrome-black` wells, 40px tall, label above, helper/validation below. Search fields carry a leading icon and a `Ctrl K` hint in the header. Numbers are typed in Geist Mono and right-aligned in tables.

### Cards / Containers

Panel surface, 8px radius, 16px padding. Build cards lead with the weapon well (92px on library cards), then title, activity chip, author, then the ability row (27px desktop / 23px narrow).

### Tables

Sticky header, 12px uppercase-free labels, Geist Mono numbers right-aligned, row hover on `iron-raised`, selected row in `copper-wash`. Every price cell shows its own freshness (Recent / Stale / Unavailable) — missing values are an em dash and "Unavailable", never 0.

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

- **Don't** use the green/ivory "expedition" palette, or the navy/midnight palette (`#07121D`, `#0D1D2A`, `#08131c`, `#0e1a24`) — "worse and lifeless". The homepage still carries navy overrides in `homepage.css`; remove them.
- **Don't** add a left sidebar shell, a per-route header, or a filled box behind nav items on hover.
- **Don't** use cursor tilt, vertical lift on hover, or independent icon hover motion. Grow-and-hold only.
- **Don't** put a chart in the hero, leave a section empty, or use plain boxes / an isometric banner on the homepage.
- **Don't** strip the homepage to an illustration-free equipment collage.
- **Don't** use uniform inventory slot boxes — use the anatomical board.
- **Don't** nest padded cards in padded cards, double-border inputs, or nest scroll regions.
- **Don't** use generic SaaS gradients, glassmorphism, random glow, oversized rounding or decorative item art.
- **Don't** show fabricated activity: votes, view counts, "live" badges, damage/sustain bars, "Verified" labels, invented prices or unsupported IP — even when a reference image shows them.
- **Don't** put migration history, competitor names, slogans or engineering explanations in the public UI.
- **Don't** present generated illustrations as gameplay, use authentic game scenes without permission, or copy competitor code, art or copy.

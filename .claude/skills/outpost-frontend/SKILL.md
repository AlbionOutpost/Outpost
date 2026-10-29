---
name: outpost-frontend
description: Design and build Outpost pages, components, layouts, styles, copy and interactions to a best-in-class standard. Use for any change a player can see — new pages, redesigns, polish, responsive fixes, CSS cleanup, component work — on albionoutpost.com.
---

# Outpost frontend

You are shipping UI for what should be the best Albion Online site ever made. Work like a senior product designer who also writes the code: clear point of view, exact craft, no generic AI look. Polish is part of the feature, not a follow-up.

## Before you touch anything

1. Read [DESIGN.md](../../../DESIGN.md) (tokens, archetypes, components, rejected directions) and the relevant part of [PRODUCT.md](../../../PRODUCT.md).
2. Open the matching reference image in `docs/design/references/` and look at it. Match its **composition, density and polish** — never its placeholder numbers, fake stats or vocabulary.
3. Look at the current page rendered at 1440 and 390 (use `outpost-visual-qa`). Name what's wrong in one or two sentences before designing.
4. Find the page's archetype and regression specs in [page-patterns.md](references/page-patterns.md). Trace the primary journey and its empty / loading / error / stale / denied states.
5. For design judgement (hierarchy, typography, polish, motion, "make it bolder/quieter"), also use the `impeccable` skill — it reads PRODUCT.md and DESIGN.md at the repo root.

## Build

- **Tokens only.** Colours, radii, spacing, type sizes and shadows come from the design tokens (`--bg`, `--panel`, `--accent`, `--radius-*`, `--space-*`, `--font-*`). No new hex literals, no 5/7/14px one-offs, nothing under 12px.
- **One owner per rule.** Don't add another global stylesheet or append an override "pass". Edit the rule that owns the style, or move it into a component/route stylesheet. Delete dead rules you find on the way (rejected palettes, `home-fidelity.css`-style orphans).
- **Components before classes.** If two pages need the same thing (button, card, item well, table, tabs, chip, panel, dialog), make or reuse one component in `src/components`.
- **Type roles:** Barlow Condensed 800 only for display moments; Inter for all UI and headings; Geist Mono for every compared number, right-aligned in tables.
- **Real game art** via `item-icon.tsx` / `spell-icon.tsx` to identify actual items and abilities — never as decoration or as a UI icon. Equipment uses the anatomical board.
- **Honest data UI:** each price shows city, quality, side and its own freshness; missing is "—" + Unavailable; manual values are labelled; fixtures never look live.
- **Vocabulary:** Comps, builds, loadout, swaps, IP, spec, focus, RRR, buy/sell order, Teams. Headings name the task.
- **Mobile is designed:** deliberate order, filter drawers, sticky primary action, tables scroll in their own region, selection survives switching views.
- **Accessible by default:** semantic elements, labelled controls and landmarks, visible focus, keyboard paths, dialogs that trap and return focus, ≥4.5:1 contrast, colour never the only signal.
- **Motion** only through `motion-system.css` patterns (grow-and-hold, press, disclosure); everything respects reduced motion.
- **Next.js 16:** check `node_modules/next/dist/docs/` before using an unfamiliar API. Prefer server components; keep client components small and split big ones by responsibility.
- **Budget:** watch what you add to the client bundle and global CSS; the web Worker must stay under 3 MiB gzip.

## Finish

1. `npm run typecheck`, `npm run lint`, affected specs from page-patterns.
2. Screenshot 1440×900, 390×844 and 320 (overflow) with `outpost-visual-qa`; compare side by side with the reference; fix the biggest differences and recapture. Check light theme and reduced motion if touched.
3. Self-critique before calling it done: Is the hierarchy obvious in two seconds? Is anything misaligned, cramped, or floating? Would a top product designer be proud of this? If not, iterate.
4. Report what changed, what you compared against, screenshots inspected, and anything still off.

## Never

Anything in DESIGN.md's Don'ts — notably navy/green palettes, sidebars, tilt/lift hover, filled nav hover boxes, nested padded cards, generic SaaS gradients or glass, decorative item art, fake stats/badges/"live" labels, competitor names or copy in the UI.

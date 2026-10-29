---
name: outpost-visual-qa
description: Look at rendered Outpost pages — screenshots at desktop and phone widths, side-by-side comparison with the design references, overflow, console errors, interaction and state checks. Use after any UI change, for design reviews, or whenever someone asks how a page looks.
---

# Outpost visual QA

Source code can't tell you whether a page looks right. Render it, look at it, compare it, fix it.

## 1. Get the page running

- Local: `npm run dev` (or `E2E_PRODUCTION=1`-style production build for timing-sensitive checks). For production-faithful rendering use `node scripts/cloudflare-local-server.mjs` via `E2E_CLOUDFLARE=1`.
- Live site: https://albionoutpost.com (public pages only; never use real accounts' private data).
- Signed-in pages: reuse the Playwright fixture-session helpers in `e2e/support/` rather than real Discord logins.

## 2. Capture

```bash
node .claude/skills/outpost-visual-qa/scripts/capture.mjs --widths 1440,390,320 / /builds /tools/market
# options: --base <url>  --full  --light  --reduced-motion  --widths 1920,1440,768,390,375,320
```

Screens land in `.qa/screens/`; the script also reports horizontal overflow and console errors. Then **open every image with the Read tool and actually look at it**. A browser tool (built-in browser or Chrome) is fine for interactive checks when available; label which you used.

Standard widths: **1440×900** and **390×844** always; **320** for overflow; add 1920, 768 and 375 for layout changes.

## 3. Compare

Put the capture next to the matching reference in `docs/design/references/` (and the baseline in `docs/design/baseline/`). Judge, in order:

1. **Hierarchy** — is the primary job obvious within two seconds? One clear primary action?
2. **Composition** — does it follow the page archetype in DESIGN.md, or has it collapsed into stacked identical panels?
3. **Typography** — right families and roles, ≤5 sizes, nothing under 12px, numbers in Geist Mono and aligned.
4. **Spacing and alignment** — consistent 4/8 rhythm, edges line up, no cramped or floating elements, no nested padded cards.
5. **Colour** — warm palette only, copper used sparingly for action/selection, enough contrast, no navy leftovers.
6. **Real content** — genuine item art at consistent size and framing; no fake stats; every price shows source and freshness.
7. **States** — populated, empty, loading, error, stale/unavailable, denied. Note which ones you could not test.
8. **Interaction** — hover grows and holds, focus visible, keyboard path works, dialogs trap and return focus, menus close, tables scroll inside themselves, selection survives mobile view switches.
9. **Mobile** — deliberate order, readable without zoom, thumb-reachable primary action, no horizontal scroll.

Measure real discrepancies with page geometry (`page.evaluate` bounding boxes) when it matters; don't invent similarity scores.

## 4. Fix and repeat

Record each finding as _severity · expected vs actual · where_. If the task includes fixing, fix the biggest issues, recapture the **same** route/width/state and compare again until it holds up or a blocker is explicit.

Also run the affected Playwright specs (see `outpost-frontend/references/page-patterns.md`) and `e2e/qa-audit.spec.ts` for axe checks. Passing tests, zero overflow and a good Lighthouse score do not mean the design is good — only looking does.

## Report

Routes and widths captured → reference compared → findings by severity → what was fixed and re-checked → what's still off or untested. Keep raw captures in `.qa/` (ignored); only promote a new reference or baseline into `docs/design/` when the owner accepts it.

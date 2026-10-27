---
name: outpost-frontend
description: Design and implement Outpost pages, components, layouts, typography, branding, responsive styles and visual interactions. Compose with outpost-visual-qa for rendered acceptance; use domain skills when changing game facts or calculations.
---

# Outpost frontend

Create a compact, professional Albion companion whose layout serves the player's task. Use the [shared execution and browser contract](../../../docs/engineering/SKILL_SYSTEM.md); it owns Node22, service setup, major-phase QA and reporting rules.

## Prepare

1. Read the [design system](../../../docs/DESIGN_SYSTEM.md), [acceptance](../../../docs/OUTPOST_ACCEPTANCE.md), [workflow specification](../../../docs/PRODUCT_UI_WORKFLOWS.md) and the affected page in [design reviews](../../../docs/design-review/README.md). Search supplied images in that review directory and assets; open the actual reference image. A concept crop is layout guidance, not licensed game media.
2. Inspect the current rendered page at desktop and mobile widths before changing a major layout. Use outpost-visual-qa. If browser access is blocked, continue independent source work but withhold visual acceptance.
3. Trace the user's primary journey, current populated/empty/loading/error states and persistence. Locate shared components in [src/components](../../../src/components), tokens in [globals.css](../../../src/app/globals.css) and workspace rules in [workspace.css](../../../src/app/workspace.css). Read the relevant installed Next.js guide before code changes.
4. State the observed problem, intended hierarchy, component reuse and concrete acceptance checks. Select the [page pattern](references/page-patterns.md) matching the workflow. A review request produces findings; implement changes when that is part of the authorized task.

## Implement

1. Preserve Barlow Condensed ExtraBold for major display headings, Inter for body/controls and Geist Mono for financial/numeric values. Verify actual computed fonts after loading; never substitute tiny condensed text for readable controls.
2. Reuse charcoal/warm-black surfaces, muted copper, off-white and restrained gold tokens. Use existing borders, spacing, focus and navigation patterns. Keep body text readable in supported themes.
3. Separate components by player responsibility (browser, equipment layout, details, result breakdown), not arbitrary repeated form cards. Preserve selection, revisions, URLs, permissions, save/reload and export behavior.
4. Use authentic renderer equipment icons through [item-icon.tsx](../../../src/components/item-icon.tsx), with accessible fallback for unavailable images. Check [media provenance](../../../docs/assets/OUTPOST_MEDIA_INVENTORY.md). Unverified scenes/abilities require explicit missing status, not invented artwork.
5. Implement desktop density and deliberate mobile order/drawers; retain selected state across switches. Keep tables usable within their own scroll region. Keyboard users must reach controls, dismiss dialogs and regain focus. Respect reduced motion.

## Verify and accept

Use discovered Playwright MCP navigation, snapshot, resize, click/type/select and screenshot capabilities; inspect every result. Use Chrome DevTools only when console/network/layout diagnosis adds evidence. Tool exposure is not successful execution; follow the shared fallback policy.

Run the affected existing e2e tests (see the page pattern), typecheck/lint and the mandatory phase gate. Inspect final screenshots at 1440×900, 1920×1080, 768px, 390×844, 375px and 320px. Compare the same viewport/state with the reference and baseline; correct major differences and recapture. Check all state variants relevant to the change, keyboard focus and actual equipment images. Do not claim completion from source, build, zero overflow, axe or Lighthouse alone.

Acceptance requires a working primary journey, preserved persistence/permissions, readable typography, intentional page hierarchy, no unintended document overflow, inspectable desktop/mobile evidence and no unrecorded major discrepancy. Missing catalog/abilities or owner visual approval remain separate open requirements.

## Prohibited shortcuts

No generic SaaS gradients, excessive glass, random glow, oversized rounding, giant empty sections, meaningless decoration, repetitive form-only pages or unnecessary motion. Do not label fixtures/manual prices live, replace missing game facts with plausible guesses, or describe an unsupported starter workflow as complete.

## Report

Record: **scope and implementation → reference/baseline paths → observed problems and changes → commands/results → inspected final viewport/state artifacts → remaining differences/blockers → next action**. Link the affected design-review entry. Distinguish implemented behavior, browser verification and owner acceptance.

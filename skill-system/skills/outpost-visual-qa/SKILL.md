---
name: outpost-visual-qa
description: Review rendered Outpost pages, compare reference and current screenshots, test responsive interactions and verify visual changes. Use with outpost-frontend for page redesign or acceptance; source inspection alone cannot complete this workflow.
---

# Outpost visual QA

Require visible evidence before accepting a design. Read the [shared browser/QA contract](../../../docs/engineering/SKILL_SYSTEM.md), [design system](../../../docs/DESIGN_SYSTEM.md), [acceptance](../../../docs/OUTPOST_ACCEPTANCE.md) and affected [page review](../../../docs/design-review/README.md).

## Establish a real browser

1. Discover currently exposed Playwright and Chrome DevTools MCP tools and read the needed schemas. Make a harmless actual call, then examine text and isError. Registration or a non-throwing response does not establish availability.
2. Prefer Playwright MCP for navigation, snapshots, screenshots and interactions. Use snapshot references/selectors for actions, resize for viewports, click/type/fill/select for user input, keyboard/hover for focus, and evaluate only for readiness/geometry where useful.
3. Use DevTools console/network/CSS/trace tools for diagnosed errors, requests, layout or slowness. Avoid duplicating sufficient Playwright evidence. Never store session headers/private response bodies.
4. If unavailable, record the exact tool failure and use an already installed local Playwright browser if execution is permitted. Label all artifacts **local-library fallback**, not MCP. If neither works, mark visual acceptance BLOCKED; do not replace screenshots with source assertions or change global browser/security settings.

## Compare, correct, repeat

1. Open the supplied reference image and current website. Record route, build/mode, theme, session kind and fixture/source identity. Use isolated realistic populated fixtures; label them in captures. Keep empty/loading/error/unavailable cases distinct.
2. Match viewport dimensions: 1440×900; 1920×1080; 768px tablet; 390×844; 375px phone; 320px overflow. Record chosen heights for widths without a specified height. Full-page screenshots supplement viewport captures; they do not establish above-fold hierarchy.
3. Wait for expected content, fonts and relevant images. Record scroll position; return to the top before measuring above-fold geometry and capturing viewport comparisons. Clicking a below-fold chart control can scroll the page; a negative table coordinate then describes scroll, not layout. Capture the baseline. A streamed skeleton is loading-state evidence, not the final populated page.
4. Inspect both actual images. Measure useful discrepancies (content/table top, column width, clipped controls, line wrapping, icon dimensions) with browser geometry. Do not invent a numeric visual similarity score.
5. Record severity, expected/actual, reproduction and user impact. If implementing an authorized change, correct it, recapture the same state/viewport and compare again until acceptance or an explicit blocker. A review-only task does not require an unrelated redesign.
6. Exercise navigation, search/filtering, selected equipment/details, menus/dialogs, save/reload/export and other affected interactions. Test keyboard focus/return, hover, theme and reduced motion where relevant. Check populated, empty, loading, error and unavailable states; identify any not tested.

## Acceptance checklist

Inspect typography/computed fonts, text contrast, width/density, spacing/alignment, section hierarchy, authentic item icon identity/quality, images, button states, navigation and mobile order. Check focus visibility, labelled controls, dialog semantics and table scrolling. Run appropriate axe assertions but preserve manual accessibility limits.

Acceptance requires all six viewport checks, a usable primary journey, inspected reference/baseline/final evidence, no unresolved major visual defect within scope and recorded remaining differences. Zero horizontal overflow and Lighthouse 100 do not imply good design or conformance. Global owner acceptance remains open unless actually obtained.

## Evidence and report

Store the durable review in the affected docs/design-review page directory: baseline/final/reference paths, viewport/state matrix, findings, corrections, retest and remaining differences. Keep only representative necessary images there; use ignored .qa for repetitive raw captures and link their manifest. Preserve important accepted references and rejected-state explanations. Hash artifacts when included in phase evidence.

Report **environment/tool outcome → reviewed routes/references → viewport/state results → prioritized findings → changes/retest if performed → artifact links → remaining acceptance/blockers**. Run affected e2e regressions and [major-phase QA](../../../docs/QA_WORKFLOW.md). Never claim visual completion from a build, screenshots you did not inspect or automatic scores.

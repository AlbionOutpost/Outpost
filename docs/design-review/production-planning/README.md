# Production planning and farming

Functional parity implementation against the owner's AlbionOnlineGrind archive. [Scope, source hashes, formulas, independent expectations and missing features](../../engineering/ALBION_GRIND_PARITY_2026-10-28.md).

Browser MCP returned `MCP tool call requires approval, but approval policy is never`. Used the permitted installed local-library Playwright fallback. No browser/security settings were weakened. Before captures are the actual existing crafting workspace; farming had no previous route. Populated screenshots use explicitly supplied arithmetic-test inputs, **not live observations**. Item icons use the existing real Albion renderer.

Implementation is not full old-site parity or owner visual acceptance. Supplied redesign layouts guide shared proportions/controls; the new aggregate planner and farming workflow extend their scope, and historical recipe/seed facts remain current-patch unverified.

Portable production captures are linked below. Iteration logs and original failures remain under `.qa/production-plan`. Initial farm test failures exposed overly broad accessible names; labels now distinguish source/help descriptions. Another iteration exposed a too-broad alert test locator and an added navigation link overflowing320px; fixed and retained in logs. Early planner captures were rejected because context-level viewport options were ignored; corrected captures explicitly resize each page. A generic global header height caused a new planner heading collision; removed that inherited layout before acceptance. No early capture counts constitute final evidence.

## Production screenshots

- Crafting baseline: [desktop](before-desktop.png), [phone](before-mobile.png).
- Aggregate planner: [desktop](planner-desktop.png), [phone](planner-mobile.png), [light375px](planner-mobile-light.png), [six-width review](planner-widths.jpg).
- New farming workflow: [desktop](farming-desktop.png), [light phone](farming-mobile-light.png), [six-width review](farming-widths.jpg), [first use](farming-first-use.png), [unavailable response fixture](farming-unavailable-fixture.png).

Production captures cover320/390/768/1024/1440/1920px. Planner has six populated dark captures plus three light captures at320/375/1440px; farming has12 populated dark/light captures plus four first-use/unavailable fixture captures. Geometry/axe checks found no document overflow or violations in the checked states. Opened actual desktop/phone/light images and the two six-width sheets. Fixed inherited header geometry, theme token contrast, result-number wrapping and helper text labels. Wide shopping data scrolls within its labelled keyboard-focusable region; on mobile recipes become stacked rows and the crop library becomes horizontal selection. Automated axe is not full WCAG conformance or physical-device evidence.

The initial full phase failed deliberate mobile navigation golden differences plus the directory's obsolete13/7 tool counts. Inspected320/390 actual/diff images; updated only those two navigation goldens and14/8 expected counts. Existing equipment/composition baselines were retained. Final ordinary phase must pass without snapshot updates. Also reviewed dashboard integration so production-plan records open the correct first-recipe calculator and game server instead of a missing route.

Final ordinary Node22 phase: all10 checks PASS,166 unit tests,90 browser tests,15 disposable database checks and9 regional endpoint reads.18 migrations remain unchanged. No snapshot update flag in the final gate. The dashboard integration assertion is included in this final production rebuild.17 documentation-validator cases and source/bundle configured-secret scans pass. Fresh container smoke runs as UID1000, contains no `.env`, returns HTTP200, and connects to local PostgreSQL/Redis; actual Discord OAuth remains unconfigured.

One mobile Lighthouse lab sample per initial route, after the browser suite finished: homepage87, farming94, crafting95; accessibility100 for each; LCP4.065/3.007/2.858s and CLS0. All sampled LCP values miss2.5s. These are single lab readings, not speedup, populated-plan interaction, physical-device or field claims. Owned QA container was stopped and removed. Release remains NO-GO.

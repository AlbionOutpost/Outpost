# Product workflow correction review

[Logic/accounting review](../../engineering/reviews/2026-10-28-full-product-review.md) records the12 confirmed issues. The existing five owner concepts remain the design target; this pass preserves the charcoal/copper theme, typography and authentic item icons. It corrects feedback and alignment rather than claiming a new whole-site design acceptance.

Browser: permitted sandboxed local Playwright library fallback. Earlier Chrome MCP failed for missing browser; Playwright MCP execution was rejected by the environment. No sandbox or global security setting was weakened.

## Visible corrections

- Phone transport: [initial](initial-transport-390.png) / [final](final-transport-390.png). The final example uses explicitly entered fixture values and shows330 silver above the cargo form. Inputs/state differ; this is hierarchy evidence, not a pixel-matched profit comparison. Listing/instant switching and invalid capacity are exercised in the regression journey.
- Desktop shopping: [before](before-shopping-1440.png) / [final](final-shopping-1440.png). The shared panel heading was a flex row: text alignment alone did not centre it. Final justification aligns icon, heading, body and actions. The first attempted fix was rejected by rendered inspection.
- Tablet crafting: [before](before-crafting-768.png) / [final](final-crafting-768.png). A late panel margin reset removed the responsive gap; matching-specificity spacing restores12px separation without changing desktop columns.

## Matrix and limits

`.qa/full-review/final.json` records24 production-container initial/manual-fixture captures: four routes ×320/375/390/768/1440/1920, heights844/1024/900/1080. All return200 with no document overflow, browser errors or sampled axe violations. Actual six-width images were inspected, followed by final correction recaptures. Transport is populated with manual assumptions; farming/crafting/shopping initial states do not establish every populated or error-state design. Existing browser suites exercise supported calculations, save/reload, private authorization and connected shopping.

Remaining improvements include reducing form length, making crop-rail scrolling more obvious, broader page-specific hierarchy and owner acceptance. No automatic score proves visual quality or accessibility conformance. One initial transport mobile lab sample scored94 performance/100 accessibility, LCP3009ms/CLS0; no field or comparison claim. Final functional/build/publication evidence belongs in the linked audit and generated QA reports.

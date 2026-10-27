# Green design reverted — October 26

At the user’s explicit request, restored the pre-redesign charcoal-and-copper homepage, header, tool menu, mobile navigation and workspace styling. Removed the green navigation stylesheet. The homepage, route stylesheet, root layout and shell match their recorded pre-redesign source checksums. Data, calculators, authentication and prior accessibility refinements are preserved.

[Restored desktop, 1440px](restored-desktop.png) · [Restored mobile, 390px](restored-mobile.png). These real local Playwright Chromium screenshots were opened and inspected, alongside 320/375/768/1920px and mobile navigation. The original pre-green desktop screenshot was also opened for comparison. Captures show no document overflow or page/console/request errors. Raw captures: `.qa/visual-correction/restored/`.

The rejected green design remains documented as historical evidence in [the preceding review](../homepage-redesign/README.md). This rollback is not a new redesign or owner acceptance of future visual changes.

Verification: `npm run qa:phase` passed all 10 checks, including 143 unit tests and 66 browser tests. The separate reviewed visual baseline run passed 5 tests; only the two deliberately reverted navigation screenshots changed. Formatting and source/bundle secret checks passed. Existing external release gates remain open; this rollback does not establish real OAuth, current-patch data verification or deployment readiness.

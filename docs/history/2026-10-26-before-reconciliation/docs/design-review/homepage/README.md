# Homepage visual correction

**Status: NOT ACCEPTED.** The user rejected the earlier layout. This document distinguishes functional test evidence from visual acceptance. Only the homepage is being corrected; the Build Editor and all later pages remain gated.

## Reference and measurement method

- Supplied original: `/tmp/codex-clipboard-DETItW.png` (1536×1024).
- Homepage panel: x11–394, y31–607;383×576. Review-only crop: [reference.png](reference.png). No concept artwork is imported into public assets.
- Measurements: [reference-measurements.json](reference-measurements.json).
- Actual desktop screenshots: viewport1440×900. Mobile:390×844. Full-page and viewport captures are retained separately.
- The montage has no supplied original desktop browser resolution. Side-by-side sheets preserve each image’s aspect ratio and normalize widths; they do not stretch the reference into a false1440×900 screenshot. Layout regions/relative dimensions are compared; font/control sizes retain readable native CSS pixels.
- Reference order: compact navigation → scene-backed hero with left headline/CTAs → three media-over-text features (Market, Build, Composition) → compact five-build strip. Interactive market discovery follows those regions, as required by the written brief.

## Deterministic fixture

`e2e/homepage-visual-correction.spec.ts` creates five explicitly isolated Battleaxe QA loadouts, with the same names/equipment/author each run.2050 sort dates isolate the five test records from concurrent browser fixtures. Only this test’s owned user/records are deleted afterward. No fixture is shipped in production, no market prices are seeded, and no fixture build is claimed to be a current meta recommendation. Anonymous screenshots prevent account-state variation. Existing actual public/non-hidden build selection is used, not a fake route or mocked page.

## Baseline / iteration00

Actual images: `.qa/homepage-correction/00-baseline/home-1440.png`, `viewport-1440.png`, `home-390.png`, `viewport-390.png`. Geometry: `.qa/homepage-correction/00-baseline/measurements.json`.

Five most significant differences observed in the rendered baseline:

1. Hero contains a large equipment inventory absent from the reference, taking the place of gameplay imagery. Desktop hero653px and mobile hero1036px push real feature discovery far below the viewport.
2. Three features start at desktop y841/mobile y1276; the additional promotional section title and empty margins interrupt the hero-to-feature relationship. Cards lack the reference’s distinct image regions.
3. Feature order is Market / Composition / Build instead of Market / Build / Composition. Large software-style icon/text panels replace the reference’s game-media/card hierarchy.
4. Community builds are oversized full preview cards:515px-tall desktop section and1719px mobile section for the fixture; market search is inserted before them. Reference shows a compact equipment strip immediately after features.
5. Hero support copy is too wide and the disclosure adds another text row; navigation is72px and exposes a generic account dropdown to anonymous homepage visitors instead of the visible sign-in action. Desktop headline begins y214, leaving excessive pre-headline spacing.

Typography discrepancy: correct font names alone did not deliver the reference’s proportion/spacing. Asset discrepancy: all four genuine scene images are missing. Spacing discrepancy: large hero, extra headings and full build cards add many vertical screens. Missing element: authenticated game media across the entire hero and at each card top.

Baseline gate: production QA passes (40 browser tests including deterministic captures), which **does not approve its design**.

## Iteration01 — structure (in progress)

Changes: remove the off-reference hero inventory; reserve the actual scene region with an explicit missing-asset state; retain left text/overlay and two CTAs. Put the three features in reference order with dedicated media regions. Follow features with a compact five-build strip, move market discovery below, and remove the extra guild-marketing section. Keep all actual destinations, region context, privacy filtering and market selection. Add a homepage-only anonymous sign-in action and64px desktop navigation.

Pending evidence: `.qa/homepage-correction/01-structure/` and archived gate logs. Visual acceptance remains open until those actual screenshots are reviewed and subsequent discrepancies corrected.

## Asset-dependent work — stopped

Central manifest: `src/lib/albion/assets.ts`. Actual official item renderer integration remains available. Hero and three scene assets have `status: missing`; the manifest requires source and permission evidence before an approved local scene can be used. The template supports object-cover crops and a readability overlay, but a template is not a verified image composition.

Fresh checks:

- [Official press kit](https://albiononline.com/presskit): indexed screenshot listing, direct retrieval403.
- [Official forum fansite-package discussion](https://forum.albiononline.com/index.php/Thread/21216-Is-there-a-package-for-fansites-Images-banners-made-by-the-Albion-team/): points to `https://presskit.albiononline.com/en.zip`; direct retrieval fails DNS in this session. No archive/README/terms retrieved.
- [Official terms](https://albiononline.com/terms_and_conditions): not treated as blanket website screenshot redistribution permission. Terms for video/stream promotion are not silently extended to bundled website art.
- Other fansites’ usage, a generic wiki metadata license, and unrelated publishers’ content policies do not establish permission for these assets.

Needed: one wide authentic Albion city/market gameplay screenshot and three feature scenes (market, equipped characters, party/combat), each with source/creator, reuse permission, attribution and permitted crop/optimization terms. Ability artwork is separately missing. Do not fabricate a replacement or crop artwork from the supplied concept. No permission request is sent to any third party by the agent.

## Acceptance gate

- Homepage structure and native typography: in correction; needs rendered comparison.
- Authentic hero and three feature scene regions: **BLOCKED**, no approved assets.
- Honest market/public-build content and preserved interactions: verify each iteration.
- Desktop/mobile visual acceptance: **OPEN**, no claimed similarity score.
- Next page: **NOT STARTED**, as the user requires acceptance before continuing.

### Iteration01 rendered review (completed)

Actual images: `.qa/homepage-correction/01-structure/home-1440.png`, `viewport-1440.png`, `home-390.png`, `viewport-390.png`; measured rectangles in `measurements.json`. Viewed both desktop full-page and mobile viewport beside the reference.

Desktop: header64px; hero500px; headline y164; feature region y588/h319; community y930/h255; market y1186. Mobile: hero670px, features y758, community631px high. Functional gate passes57 unit/40 browser tests and production build/types/lint/database/source checks; this does not establish visual acceptance.

Five largest remaining differences and next correction:

1. Missing actual hero/card scenes dominate the appearance mismatch. **BLOCKED**; no permission/source evidence was retrieved. Keep the missing states explicit, not visually accepted.
2. Mobile hero media has zero width: the old hero flex alignment shrinks the absolutely positioned placeholder contents. It reserves190px of invisible empty space. Set an explicit mobile media width and review the actual screenshot again.
3. Hero padding plus native type/content still yields500px despite the intended460px envelope. Reduce top/bottom padding, retain headline readability and CTA size. The current top gap remains larger than the reference relationship.
4. Feature media remains140px against179px text body, whereas the reference’s image/body relationship is about68/109. Reduce native media height toward116px and align placeholder text above the real item-thumbnail row to avoid collision.
5. Community region remains255px tall, with66px icon boxes and roomy tile padding. Reduce the icon boxes and title/author gaps without deleting real authors or inventing build statistics; retain five simultaneous tiles on desktop.

Fixed from baseline: inventory hero substitution, feature order, missing media-region structure, oversized whole-build cards, market-before-build order, extra promotional headings and anonymous sign-in action. Remaining assets prevent the homepage acceptance gate from closing.

### Iteration02 rendered review (completed)

Actual images: `.qa/homepage-correction/02-proportions/home-1440.png`, `viewport-1440.png`, `home-390.png`, `viewport-390.png`; exact rectangles in `measurements.json`. Viewed the desktop viewport and mobile full page against the reference.

Desktop hero464px (baseline653), headline y142, features y552/h295, community y870/h214. Mobile media now has a visible350px-wide missing-scene frame; the accidental zero-width/190px empty region is fixed. Community shrank from631px to520px mobile. All40 browser tests,57 units, types/lint/production build/database/source gates pass; no document overflow or tagged axe findings in sampled checks. No visual acceptance is inferred.

Five largest remaining differences:

1. Four actual scene images remain missing. The placeholders only reserve the regions; the visual atmosphere and composition remain **BLOCKED**. This cannot be corrected through CSS or fabricated art.
2. The headline’s rendered ink occupies a smaller fraction of the page than the reference and starts lower than its hero relationship. Increase homepage display impact, shorten supporting copy and reduce top padding so increased type does not reintroduce a tall empty hero. Keep mobile type readable and unclipped.
3. Feature action arrows inherit `justify-content: space-between`, drifting to the far card edge. The reference puts the arrow beside the action wording; reset the inherited alignment.
4. Mobile community builds still form three rows/520px. Use a compact native horizontal strip with keyboard-scroll semantics and visible overflow guidance; preserve all five genuine fixture records, author labels and destinations.
5. Secondary category/author labels are11px and a duplicate source footer adds unnecessary vertical space after the market entry. Raise those labels to12px and keep attribution via the existing shared footer/Legal route rather than repeating the entire footer region.

Typography, spacing, empty-state structure and interactions are still being reviewed. The next iteration addresses the independent issues above; actual scene composition cannot be accepted without approved source art.

### Iteration03 rendered review (completed)

Viewed `.qa/homepage-correction/03-hierarchy/comparison-1440.png` with the actual reference on the left and implementation on the right, plus `viewport-390.png`. The comparison retains original aspect ratios; dimensions are not distorted to imply similarity. Source/full viewport screenshots and `measurements.json` remain in the same folder.

Desktop: hero488px, headline y122/h260, features y576/h304, community y903/h216. Mobile: hero637px, community254px instead of520, with all five links preserved in a keyboard-focusable native horizontal region. Feature arrows are inline; secondary labels are12px. Duplicate page attribution region is removed while the shared footer/Legal route remains. Production gate passes57 units/40 browser tests and the full automated check set.

Five largest remaining differences:

1. No actual hero screenshot: the reference’s scene-backed atmosphere and subject/text relationship cannot be reproduced or verified. **BLOCKED by media source/usage evidence**, not fixed with a painted replacement.
2. No three feature screenshots: media dimensions exist but placeholder labels plus real item thumbnails do not provide the reference’s game scene composition. **BLOCKED** for the same reason.
3. The stronger native headline is closer in hierarchy, but exact ink-width/scene overlap still differs at normalized reference width. No similarity or pixel-match claim is made; actual overlay/focal tuning must wait for real images.
4. An inherited mobile flex gap still separates reserved media and content by32px. Explicitly reset this homepage gap; inspect a further capture rather than assuming the new page-local rules overrode every legacy style.
5. Some below-fold item images were still pending in the early full-page capture. The screenshot runner waited for fonts but did not scroll/load the whole page. Scroll actual page regions, allow bounded artwork decoding, and record unresolved images. Never replace unavailable icons with fabricated fixture art or call unrendered images verified.

Additional confirmation pass04 is justified by the two concrete remaining rendering/capture problems. Structural progress does not close the hero/card asset gate. Other pages remain not started.

### User steering — generated artwork explicitly authorised

After the source/permission lookup failed to supply usable scene images, the user instructed: “find them yourself or generate some that actially look like albion online”. This changes the earlier prohibition for scene illustrations. Four original isometric scenes were generated with the built-in image_gen tool and visually inspected for matte low-poly materials, grounded town/party framing and usable text space. They are **not real gameplay screenshots or official game assets**. Genuine item art remains the official renderer integration.

Originals: `assets/source/homepage-illustrations-v1/{hero,market,build,composition}-v1.png`. Optimized runtime assets: `public/albion/illustrations/{hero,market,build,composition}-v1.webp` (about564KiB total). Full final prompts are retained under [prompts/](prompts/); [generated-assets.json](generated-assets.json) records origins, user authorisation, hashes and byte sizes. The central manifest uses `status: generated`, not `approved` genuine artwork. Site Legal and a visible scene-credit link identify the illustrated scenes. No images from the supplied concept were cropped into product assets.

Earlier blocked-image reviews remain historical and must not be rewritten as if real source screenshots had been found. Under the new instruction, the homepage can be reviewed with clearly identified generated illustration. Original game-scene reuse permission and ability artwork remain unresolved separately.

### Iteration04 — rendering evidence (completed)

Source images and exact viewport captures: `.qa/homepage-correction/04-spacing-and-artwork-evidence/`. It removes the inherited mobile gap and scrolls the actual page before bounded image decoding; artwork resolution/delivery are retained as JSON. Functional gate passes57 units/40 production browser tests plus types/lint/build/database/source checks. This pass still had missing scene placeholders, before the new generation authorisation.

### Iteration05 — generated scenes (in progress)

Full-hero imagery replaces the right-hand placeholder; the same illustration supplies a separately positioned mobile background. Hero gradients are now tested over real pixels, including light-theme contrast. Three media-over-text cards use the three distinct generated scenes; the extra official-item overlay row is removed so the card image regions follow the reference. A scene provenance link points to Legal. Pending actual rendered review: `.qa/homepage-correction/05-generated-scenes/`. No visual acceptance before inspecting these captures.

### Iteration05 rendered review (completed, corrections pending)

Viewed actual desktop/mobile viewport captures under `.qa/homepage-correction/05-generated-scenes/`. Generated scene images load locally; all five visible fixture weapon images report completed96px official-renderer delivery. Desktop hero488px; headline y122/h260; features y576/h328; community y927/h216. Full-background desktop scene and separately focused mobile crop replace the missing placeholders. Actual item icons remain genuine.

Five largest differences/review findings:

1. The major missing-scene regions are now present under explicit user authorisation, but they are generated illustration rather than genuine gameplay; provenance disclosure is mandatory and remains visible/linked.
2. Fixed140px desktop feature bands create a3:1 crop, cutting heads/equipment from the new16:9 scenes. Use a native image aspect ratio rather than treating important characters as expendable crop material.
3. Reference card image/body proportions and native readable text do not scale identically from the383px montage. Keep readable14px descriptions and inspect the revised full-image cards before judging section density.
4. Hero and mobile headline legibility are now assessed against actual illustrated pixels, not an empty background. Current dark/light sampled contrast passes, but future focal changes require fresh checks.
5. Functional browser suite passes40 tests, but overall gate fails an unescaped apostrophe in the new Legal disclosure (`react/no-unescaped-entities`). Corrected to a typographic apostrophe; the next gate must close the failure. Raw failed lint/gate evidence is retained in this iteration folder.

The homepage has not been marked accepted solely because images exist. Next pass verifies the corrected media crops and the full regression gate.

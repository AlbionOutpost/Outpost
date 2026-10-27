# Outpost media inventory — 2026-10-26

## Supplied reference

The user supplied a numbered eight-panel concept on2026-10-26: `/tmp/codex-clipboard-DETItW.png`. QA-only copy: `.qa/reference-review/supplied-reference.png`. It has been inspected for hierarchy, component proportions, equipment arrangement and mobile grouping. It is **illustrative design guidance**, not authenticated Albion media. No region of its artwork is cropped, repackaged or shipped in public assets. Exact pixel matching is not required by the current brief.

## Repository audit

| Asset                          | Available                       | Source / permission evidence                                                                                                  | Decision                                                                                                                             |
| ------------------------------ | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Hero environment screenshot    | No                              | No source image or recorded permission supplied                                                                               | Typography-first fallback; no synthetic scene                                                                                        |
| Market feature screenshot      | No                              | No permitted game screenshot in repository                                                                                    | Real item thumbnails; no fake market image                                                                                           |
| Composition feature screenshot | No                              | No permitted game screenshot in repository                                                                                    | Equipment strip preview; no fake battle                                                                                              |
| Build feature screenshot       | No                              | No permitted game screenshot in repository                                                                                    | Real equipment thumbnails; no invented character                                                                                     |
| Item icons                     | Existing live integration       | Official render API announcement recorded in DATA_SOURCES.md; validated IDs, cached fixed-host requests, unavailable fallback | Direct fixed-host images with existing bounded cache fallback; do not treat icon API access as rights to unrelated promotional media |
| Prior field-map SVG            | Code-native vector illustration | Originally authored for previous Atlas direction; not game geography                                                          | Removed from the landing page and retired styles                                                                                     |
| Outpost wordmark               | Implemented                     | Typography-only component; Barlow Condensed OFL notice included                                                               | No raster logo, shield, compass or copied game logo                                                                                  |
| Interface fonts                | Bundled                         | Fontsource package licenses in public/licenses; next/font/local                                                               | Barlow Condensed600/700/800, Inter variable, Geist Mono variable                                                                     |
| Browser screenshots in .qa     | Available                       | Temporary application/database fixtures, local test artifacts                                                                 | Before/after QA only; do not represent as in-game screenshots                                                                        |

## Official source checks

- [Official Albion Online press kit](https://albiononline.com/presskit): indexed page lists screenshots/game images. Direct web retrieval returned403 in this session. No image package or specific-image reuse terms were retrieved. The page being public does not establish a blanket redistribution license.
- [Official forum fansite-package discussion](https://forum.albiononline.com/index.php/Thread/21216-Is-there-a-package-for-fansites-Images-banners-made-by-the-Albion-team/): an older reply points readers to the press kit. This is a discovery lead, not proof of permission for arbitrary scraped images.
- No third-party screenshot gallery, unrelated fantasy art, generated environment or artificially upscaled illustration was imported.

## Asset handoff requirements

For each replacement, record the original file, source URL/creator, permission or applicable license, required attribution and permitted edits. Supply a wide real Albion environment for the hero plus three feature images. Keep originals unchanged; create responsive WebP/AVIF derivatives without artificial upscaling. Preserve recognizable game textures and use CSS overlays for readability. Define crop/focal position separately for mobile and desktop and fixed image aspect ratios to prevent layout shifts. The supplied concept has now been inspected; final scene-imagery acceptance remains open until permitted source assets can be inspected.

2026-10-26 workflow review: actual Albion item artwork is visible in the new rendered equipment/mobile screenshots through the official renderer. No icons or environment imagery were scraped from UX references. Scene imagery remains missing. Direct external image requests are disclosed on Legal; no new font host requests occur.

## Latest user-authorised generated scenes

The user subsequently expressly allowed generated Albion-like illustrations. Four original scene illustrations were produced with the built-in image_gen tool. They are not gameplay screenshots or official imagery, and do not replace genuine item art or verified data. See docs/design-review/homepage/generated-assets.json and prompts/ for exact provenance, saved paths, hashes, sizes and full final prompts. Runtime WebP files are in public/albion/illustrations/. Native originals are retained under assets/source/homepage-illustrations-v1/. A visible “Illustrated scenes” link and the Legal artwork section disclose their nature. This exception closes neither official-scene reuse permission nor missing genuine ability art.

2026-10-26 further source discovery: historical official-forum threads [fansite package](https://forum.albiononline.com/index.php/Thread/21216-Is-there-a-package-for-fansites-Images-banners-made-by-the-Albion-team/) and [guild graphics](https://forum.albiononline.com/index.php/Thread/45665-Albion-Online-fan-guild-sites-graphic-resources/) point to press kits. These are discovery leads, not verified current license terms; the latter includes an unanswered license question. No new screenshot was downloaded or imported on this basis. Current scene/source acceptance remains open.

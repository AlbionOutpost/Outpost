# Albion Online Grind — public frontend reconstruction

Inspected the live website directly at the user’s request: homepage plus 29 public routes, full-page/viewport captures at 1440×900 and 390×844. Opened every desktop/mobile screenshot sheet, plus individual work-area, menu and tooltip captures. Read the actual loaded CSS through the browser CSSOM, computed styles, font faces, DOM structure and image URLs. No source-repository access was required. [Route/token/stylesheet evidence](public-frontend.json).

## What gives the reference its identity

| Observed rule                                         | Evidence                                                                                                            | Outpost application                                                                                                                                            |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentic game art dominates the controls and content | [Builds](reference-builds.webp), [gear/abilities](reference-build-detail.webp)                                      | Tool tiles use real existing renderer artwork; build weapons are 80px desktop / 64px mobile, with larger gear strips. No unverified spell art was substituted. |
| Separate surfaces instead of a field of outlines      | Body `#161719`, cards `#202226`, subtle white borders and 6px radii measured in the live page                       | Task tiles and loadout/comp cards use distinct existing Outpost panel surfaces and 6px corners. Charcoal/copper branding is preserved.                         |
| Strong readable type                                  | Poppins 400/700; body 16px/24px; navigation 15px bold; homepage title 64px desktop / 40px mobile                    | Outpost keeps Barlow/Inter/Geist. Tool titles are 16px bold; build titles 18px; comp titles 20px, with clearer hierarchy.                                      |
| Cards expose useful game information immediately      | [Comp weapon lineups](reference-comps.webp), build activity badges and gear rows                                    | Comp cards show up to ten actual player slots, their weapon or explicit missing-weapon fallback, and role labels; larger rosters show remaining-player counts. |
| Navigation is grouped and image-assisted              | [Tool menu](reference-navigation.webp), mobile collapse, visible keyboard hints                                     | Captured as a reusable reference; this implementation round preserves the working Outpost header and mobile focus behavior.                                    |
| Motion is small and local                             | Loaded BuildCard CSS uses 200ms scale 1.01 on the card and 1.1 on the weapon; tooltips and accordions reveal detail | Existing reduced-motion-aware Outpost interaction feedback remains. No decorative loop or new animation dependency was added.                                  |

The public frontend uses Next.js, CSS Modules and Bootstrap classes/variables; observed typeahead DOM includes `rbt` listbox/combobox structures. These are frontend observations, not proof of the original server/database architecture. [Homepage source](https://albiononlinegrind.com/), [build gallery](https://albiononlinegrind.com/builds), [comp gallery](https://albiononlinegrind.com/group-builds).

## Outpost before / after

| Surface                     | Before                                         | After                                        |
| --------------------------- | ---------------------------------------------- | -------------------------------------------- |
| Tools, 1440px               | [Before](outpost-tools-before-1440.webp)       | [After](outpost-tools-after-1440.webp)       |
| Owned build gallery, 1440px | [Before](outpost-builds-before-1440.webp)      | [After](outpost-builds-after-1440.webp)      |
| Comps, 390px                | [Before](outpost-compositions-before-390.webp) | [After](outpost-compositions-after-390.webp) |

These comparisons use equivalent isolated, labelled local QA fixtures, which are removed after capture. They are not real community activity or OAuth evidence. The same filter/permission queries, favorites, source IDs, export formats and calculators are preserved. No Grind audience counts, popularity numbers, example market prices, premium assumptions or game-data claims were copied into Outpost.

## Interaction and verification scope

Opened the three desktop navigation groups and mobile navigation, typed weapon searches, selected the visible Small Scale typeahead option and waited for filtered results, and inspected item-hover tooltips. The committed comp filter retained a matching comp and excluded a known Tracking comp after loading. A typing-only attempt and the pending spinner capture are preserved separately rather than represented as successful filtering. Authenticated build/comp editor internals remain unobserved because their public routes show sign-in gates. Premium calculator screens were inspected only in their available public states.

Outpost: 18 configurations across the three changed surfaces at 320/375/390/768/1440/1920px, six axe scans, no document overflow, image failures or page/console/request errors. Actual unmasked artwork and all six widths were inspected. Four focused regressions passed, including private boundaries, filtering, favorites, comp save/reload and real PNG/JSON export. Four intentional comp golden updates were opened; equipment/navigation goldens remained unchanged. `npm run qa:phase` passed all ten checks, including 143 unit tests, 66 browser tests, 15 database integration checks and nine regional reads. Full phase results are recorded in the root QA reports.

A post-change mobile Lighthouse 13.5 smoke sample on `/tools` returned performance 99, accessibility 100, LCP 2.262s and CLS 0. This is a single unpaired sample, not a before/after speedup claim or evidence that homepage/Market performance gates closed. Raw report: `.qa/grind-reference/lighthouse.json`.

Raw capture/source inventory: `.qa/grind-reference/`. Build/page logic, current-patch verification, source licensing, real OAuth, full accessibility/physical-device acceptance and owner visual acceptance remain independent of these visual improvements. This is a first application of the measured patterns to three Outpost surfaces, not a claim that the entire application now reproduces Grind.

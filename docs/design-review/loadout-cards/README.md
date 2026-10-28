# Gear-led build cards and focused panels

The owner requested another implementation pass using the local albiononlinegrind.com scrape. Reviewed the archived builds and group-builds desktop captures in `Scrape/albiononlinegrind.com/report/evidence`, including the actual card rows. Grind puts equipment, a concise title and a small activity badge ahead of prose. Outpost now uses that structure with its own charcoal/copper palette, Inter typography, real item renderer and existing saved-build workflow.

## Implemented changes

- Build discovery: a full-width filter toolbar and weapon shortcuts above two-column desktop results. Cards show the complete recorded gear row, activity, author, revision/date and save action. Removed the duplicated large weapon preview, repeated description and redundant destination text. Mobile retains the expandable filter panel and one-column cards.
- Build details: one inventory frame alongside an equipment/ability list with dividers. Actual recorded abilities, notes and alternatives remain visible. Section links reach loadout, strategy, replacement cost and discussion. Market links now carry the selected item's quality.
- Composition discovery: compact title/activity header, ordered player weapons with role labels, short description and revision footer. Repeated weapons remain distinct party positions.
- Tool directory: smaller task-specific destination cards using the existing authentic assets and status labels. More distinct neutral surfaces, restrained borders, stable hover feedback and no card lift.

No dataset, formula, schema, permission or persistence engine was replaced. Unknown abilities remain unknown. No scraped community builds, voting totals, proprietary ability images or combat statistics were imported. Screenshots use ephemeral local QA builds/rosters clearly marked as fixtures; they are not recommendations or real OAuth evidence.

## Before and after

| Surface       | Before desktop                         | After desktop                        | After phone                         |
| ------------- | -------------------------------------- | ------------------------------------ | ----------------------------------- |
| Builds        | [Before](before/builds-1440.png)       | [After](after/builds-1440.png)       | [390px](after/builds-390.png)       |
| Build details | [Before](before/build-detail-1440.png) | [After](after/build-detail-1440.png) | [390px](after/build-detail-390.png) |
| Compositions  | [Before](before/compositions-1440.png) | [After](after/compositions-1440.png) | [390px](after/compositions-390.png) |
| Tools         | [Before](before/tools-1440.png)        | [After](after/tools-1440.png)        | [390px](after/tools-390.png)        |

The reference's tiny ability artwork and vote rails are not copied: Outpost shows its recorded text selections in the detail workspace and its real favorite action in discovery. Its reference palette/type remain intact. These changes do not claim owner acceptance of every page.

## Verification

Local-library Playwright is the permitted browser fallback after the earlier MCP approval-policy rejection. Actual desktop/phone screenshots and six-width contact sheets cover Builds, build details, the existing editor, Compositions and Tools at320/390/768/1024/1440/1920. Initial visual review caught and fixed a legacy mobile link height hiding card footers. Fixture records are removed in finally blocks. No browser-origin or security restriction was disabled.

Final command results and remaining gates are recorded below. Full physical-device/screen-reader conformance, actual Discord OAuth, current game-patch verification and owner visual acceptance remain independent gates. Release remains NO-GO.

## Final results

`npm run qa:phase` on Node22/local PostgreSQL/Redis passes all10 commands:156 unit tests,83 ordinary production browser tests without updating snapshots,15 disposable database checks and9 bounded regional endpoints. Types, lint, build and advisories pass. Two pre-existing unused-variable lint warnings remain. The updated ability assertion checks actual recorded ability chips; the selected-quality market link and weapon shortcuts retaining collection/search scope are covered. Four intentional composition goldens were opened before the ordinary no-update run.

Final production evidence contains38 route/theme/viewport captures, zero document overflow,18 sampled axe scans without violations, and six stable hover-geometry checks. The editor is included as a regression surface; it was not rebuilt again in this refinement. Dark six-width contact sheets: [builds](after/builds-widths.jpg), [details](after/build-detail-widths.jpg), [editor](after/build-editor-widths.jpg), [compositions](after/compositions-widths.jpg), [tools](after/tools-widths.jpg). Light samples: [builds](after/builds-light-390.png), [details](after/build-detail-light-1440.png), [compositions](after/compositions-light-1440.png), [tools](after/tools-light-390.png). [Production manifest](after/manifest.json). Actual renderer images were inspected separately from the masked deterministic goldens.

The Impeccable source detector returned no findings; this is not visual acceptance. Current source/bundle scans have no configured-secret matches in their stated scope. Documentation validator tests pass17 cases. Root reports and rebuild inventory are reconciled with the final source gate.

Fresh Docker smoke: homepage HTTP200, UID1000, no copied `.env`, PostgreSQL/Redis healthy, actual OAuth unconfigured. The owned audit container was removed after measurements; the separate production preview remains at `http://localhost:3100`.

| One final container/mobile lab sample | Performance | Accessibility | LCP    | CLS |
| ------------------------------------- | ----------- | ------------- | ------ | --- |
| Home                                  | 89          | 100           | 3.774s | 0   |
| Market                                | 95          | 100           | 2.856s | 0   |
| Crafting                              | 95          | 100           | 2.860s | 0   |

All sampled LCP values miss2.5s; homepage performance89 misses90. Single samples do not establish a reliable speedup, field vitals or full conformance. Complete game-patch/ability-unlock coverage, broader calculators, real OAuth and owner acceptance remain independent open scope. No claim that this card refinement closes the entire product's release gates. Release remains NO-GO.

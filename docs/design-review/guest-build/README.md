# Guest build editing and AlbionOnlineGrind comparison

Owner request: inspect the archived build documentation, make build testing possible without Discord and bring the editing structure closer to the old website. This is a scoped build-workflow correction; full data or pixel parity is not claimed.

## What changed

`/builds/new` renders the full editor for anonymous visitors. Guest Save writes a validated draft to browser-local storage; reload restores that draft. Load example equipment, recommended/alternative item selection, abilities, tiers/quality, spare sets, live preview, JSON import and JSON export work without an account. Restored/imported JSON is bounded and validated with the existing build schema; file imports are limited to64KB; malformed input preserves the current draft. Storage failures show an error; no account/session is fabricated. Authenticated new/edit paths retain server saves and revisions. New guest data is never automatically submitted to an account or a public collection.

The editor now follows the archived edit screen's main arrangement: recommended and alternative equipment in adjacent columns, separate consumable/travel groups, an anatomical loadout preview to the right, then contextual abilities and swap details. Existing item drawers, two-handed compatibility/undo, spare sets and account revisions remain. Explicit configure actions scroll to the selected item's controls. A seven-item Bloodmoon equipment template transcribes only the archived example's factual IDs; it intentionally has no guessed spells, off hand, author content, popularity or meta claim. Icons use the existing renderer.

## Data accuracy findings

Read `Scrape/albiononlinegrind.com/report/HANDOFF.txt`, the build fields in the public record export, `functional-review/FUNCTIONAL-REVIEW.txt`, the archived create/list/edit images, and the raw game-item definitions. The old functional report separately records private creation/API mutation versus unverified UI edit submission; screenshots and a public record do not establish every behavior or game fact.

[Reproducible snapshot comparison and hashes](data-comparison.json):10,770 archived public builds reference297 distinct recommended weapon/armor/cape/consumable IDs across the eight examined fields. Outpost's7510-variant selector recognizes292 of those IDs. This is a specific denominator of used item identities, not the whole game catalogue or proof of game accuracy. The missing IDs are:

- `T8_POTION_LIFEWARD`
- `T7_MEAL_OMELETTE_DRAGONAREA`
- `T8_HEAD_LEATHER_DRAGON`
- `T8_ARMOR_LEATHER_DRAGON`
- `T8_SHOES_LEATHER_DRAGON`

All five occur in the archived raw definitions; the three dragon armor records there have `unlockedtoequip=false`. These dated flags are not current-game certification. They are retained as explicit review gaps rather than silently activating potentially unavailable items. No broad catalog change occurred in this pass. The direct archived example comparison caught an actual display mismatch: T7 Roast Pork was labelled with its family base name Roast Chicken in the equipment overview, while item details already used the correct tier name. The overview, selected context and details heading now use the source tier name; the guest regression imports T7 roast and independently expects Roast Pork. July source-listed ability names remain incomplete for imagery, numerical effects, character unlocks and current patch; the archive's spell identifiers cannot automatically be equated to those names. Full data accuracy cannot be claimed for either site from these snapshots.

Source UI references: `report/evidence/build__bloodmoon-staff-group-dungeon-solo-build__edit-desktop.png`, `builds-desktop.png`, `build__create-desktop.png`. The Bloodmoon template uses the exact equipment fields of public record slug `bloodmoon-staff-group-dungeon-solo-build`; no textual strategy or personal record is imported.

## Security boundary

Guest → local storage/import/export only. Anonymous API POST/PUT/DELETE, private reads, revisions and ownership remain server-authenticated. Existing session/origin/JSON/rate/ownership checks were not weakened. Local drafts are browser data, not private server records or Discord OAuth evidence. Separate contexts cannot read each other's local storage. Existing account content is not replaced by guest storage.

[Guest browser journey](../../../e2e/guest-build.spec.ts) verifies local editing/alternatives/save/reload/preview/Escape/export/invalid import/context isolation and401 on anonymous build creation. [Existing account/revision journey](../../../e2e/build-editor-visual.spec.ts) passes. [Equipment template fixture](../../../tests/equipment-sets.test.ts) checks the archived equipment-only example. Browser MCP returned `MCP tool call requires approval, but approval policy is never`; use of installed local-library Playwright fallback is explicit. No browser restriction or server authentication was bypassed.

## Visual review and remaining scope

Actual before captures show the anonymous redirect/sign-in barrier. Populated captures use the declared editable equipment template, not a live recommended meta build. The archived structure guides the new layout while Outpost retains its existing typography, palette and controls. Complete spell-icon coverage, ability/unlock/statistical data and all old metadata fields and global owner visual approval remain open. Full current-patch/data, real OAuth, physical-device/screen-reader and release acceptance remain separate. Current root counts are generated in [QA_REPORT](../../../QA_REPORT.md); final local results and portable production captures are recorded below.

## Bloodmoon spell correction

The item existed in the selector but originally had zero selectable abilities. Resolved its explicit `craftingspelllist` reference to the base shapeshifter, applied `removespell` for Panther, and retained the Werewolf replacement. Transcribed13 short ID/name/category facts from the archived spell dictionary: four Q, four W, one E and four passive options. No scraped JavaScript was executed. [Input/output hashes and scope](../../data/archived-spell-options-source.json). This supplements only existing supported Bloodmoon T4–T8 variants, with no guessed effects, character/tier unlocks or current-patch guarantee. Independent expectations include Reality Fissure, Distortion, Werewolf Transformation and Altered Beast; Panther is not a valid Bloodmoon E choice. The equipment-only starting template still leaves selections to the user.

Selected options render authentic icons using the [official documented spell endpoint](https://forum.albiononline.com/index.php/Thread/131017-Update-on-API-New-Endpoints/), with a text-preserving unavailable fallback. A Werewolf icon probe returned200; browser captures separately inspect the actual chosen spell icons. Fixed-host, encoded and bounded spell identifiers cannot select arbitrary URLs. No spell-proxy/auth/cache boundary was introduced. Build preview and saved loadout presentation use the same reviewed mapping. General July source options and explicit remaining coverage gaps are retained.

## Production screenshot evidence

- Anonymous barrier before: [desktop](before-desktop.png), [phone](before-mobile.png).
- Guest editing after: [desktop](after-desktop.png), [phone](after-mobile.png), [light phone](after-mobile-light.png).
- Actual archived equipment example with selected source spells: [editor](bloodmoon-editor.png), [preview](build-preview.png).
- Seven-width reviews: [dark](dark-widths.jpg), [light](light-widths.jpg).

Fourteen production viewport/theme cases at320/375/390/768/1024/1440/1920 have no document overflow or axe violations. All visible equipment images loaded:20/20 per phone and21/21 at wider widths. Bloodmoon editor captured19/19 visible item/spell images, including four authentic selected spell icons. Source options and actual spell IDs, not generated artwork, supply the evidence. Actual desktop/phone/light and archived-example images and viewport sheets were opened. The preview now sorts equipment by declared slots, keeping the weapon first after edits.

The initial phase failed the four deliberate equipment-layout goldens; inspected the new desktop/phone/tablet layouts and updated only the four equipment images. Navigation/composition baselines remained. The new spell check initially assumed the first DOM icon would be Q; corrected it to assert exact Q/E spell identities and visible selections instead of unrelated element order. The corrected full guest journey passes. Initial source-extraction failure rejected a JavaScript-only escape; parsing was restricted to the needed factual dictionary pairs and no scraped JavaScript ran. Failure summaries and intermediate phase records remain under `.qa/guest-build`; they are not suppressed or counted as final passes.

## Final verification

Final ordinary Node22 phase: all10 checks PASS,168 unit tests,91 production browser tests,15 disposable database checks and9 regional endpoint reads. No snapshot-update flag in the final phase.17 documentation-validator cases and source/bundle configured-secret scans pass. Fresh production-container smoke passes with UID1000, no copied `.env`, local PostgreSQL/Redis health and HTTP200; real Discord OAuth remains unconfigured. Owned QA container removed.

One initial-route mobile Lighthouse sample per home/guest-builder/crafting route scored85/94/95 for performance and100 for accessibility, LCP4.306/3.080/2.855s, CLS0. All LCP values miss2.5s. These do not measure populated-editor interaction speed or establish a speedup, device/field performance or accessibility conformance. Full old-site/data/patch and owner visual acceptance remain open; release remains NO-GO.

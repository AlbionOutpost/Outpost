# Premium workspaces and connected planning

The owner requests implementation of the complete product roadmap and the five supplied reference sheets, with one coherent charcoal/copper theme. Public pages must use Outpost's identity and player-facing language; migration history and competitor branding do not belong in the product UI. Internal data provenance, historical sources, author attribution and verification stages remain intact. Mockup combat figures, non-Albion equipment slots and market activity are not game data.

Visual authority: the supplied [UI system](../professional-redesign/references/ui-system.png), [crafting](../professional-redesign/references/crafting.png), [builds/comps](../professional-redesign/references/build-composition.png), [market](../professional-redesign/references/market.png), and [homepage](../professional-redesign/references/homepage.png). Current public desktop/mobile baseline: `.qa/competitive-review-2026-10-28/`. Browser MCP cannot run under the current policy; Chrome MCP lacks its executable. Actual inspection uses sandboxed local Playwright, labelled fallback.

## Active implementation

- Shared theme, controls, compact build command bar and local draft autosave. Equipment remains real and editable; existing revisions/permissions and manual advanced fields are preserved.
- Three-panel calculator setup, material/results accounting, consistent step identity and a compact illustrated heading. Existing fees, focus and return mechanics remain unchanged.
- Device/server-specific shopping lists connect loadouts and gross production requirements. Owned inventory reduces purchases; stale or absent observations do not become zero. Manual and plan estimates retain separate labels. Private account snapshots use the existing owner-scoped saved-scenario API and new strict shopping configuration.
- Party role counts, player-assignment and required-weapon counts derive from actual planned members. They do not imply combat performance or automatic optimal composition.
- Public migration/competitor copy removed while source records and original author names remain maintained internally.

## Verification state

Implementation is IN PROGRESS. Focused shopping arithmetic/schema tests pass; typecheck initially passes. Current six-width visual, account/denial journeys, full Node22 phase, native Cloudflare regressions, current container/Lighthouse and deployment are PENDING. Development captures are not production acceptance. Screenshot review found and corrected inherited full-width recipe/header-height rules; final captures remain pending.

## Subsequent priorities

Complete the reference-led Market/comp interactions and page states; character/mastery profiles, material reuse and focus planning; dedicated animals/laborers and island cycles; selective notifications, curated content/editorial workflows and guild planning. Each requires the relevant schema, source/mechanics and current-authorization evidence. Unknown coefficients stay configurable/unavailable. The owner has authorized ongoing development and publication in the session; no paid provider activation, fabricated game stats or unrelated external messages are authorized.

## October28 implementation evidence

Focused shopping browser journeys pass (2/2): device reload/owned-stock arithmetic/region isolation and private account restore with outsider denial. Unit suite passes239 checks. The first full phase failed12 browser cases: intentional pixel changes, renamed/removed public copy, new tool counts, and genuine discovery-tab overflow/contrast. These failures are retained in `.qa/premium-workspaces/phase-run.log`; fixes are under retest. Source provenance remains in the database and internal documentation; tests now check it there rather than requiring it in public product copy.

The production-container fallback captured42 route/width states at320/375/390/768/1440/1920. Builder mobile toolbar overlap and calculator header clipping were corrected and visually rechecked. The first matrix exposed tablet shopping overflow, corrected with bounded grid children; that correction still needs final recapture. Actual equipment art is retained; a renderer image can be unavailable at capture time. Reviewed desktop/mobile builder, calculator, shopping and library captures show the shared theme. Owner approval remains open.

Current container is nonroot, healthy, without a baked environment file. One initial mobile Lighthouse sample each: home85 performance/100 accessibility, LCP4303ms; builder92/100, LCP3308ms; CLS0 both. These are lab samples, not field or full accessibility evidence. Current changes are local and have not yet been deployed.

Retest note: the second phase run was interrupted after an overlapping Cloudflare build began replacing the shared Next output. Its browser failures are not accepted as application evidence. The final clean Node phase runs sequentially; Cloudflare builds must wait for its browser server to stop. Native SQLite checks completed before interruption, but the incomplete Cloudflare bundle is not a release candidate.

Clean Node phase: ten gates PASS,239 unit/104 browser/15 database/nine regional checks. First responsive matrix still caught a6px tablet overflow from the unanchored screen-reader-only action heading inside the scroll table. Its positioning is corrected and a768px populated shopping regression added; final post-correction phase remains pending. All other41 route/viewport captures pass geometry.

Final post-correction Node phase: ten gates PASS,239 unit/104 browser/15 disposable database/nine regional reads. Final six-width production-container matrix:42/42 HTTP200 and no document overflow. Tablet shopping remains an explicitly scrollable table; phone rows are editable cards. Final captures at all six widths reviewed with actual equipment art; manual-price crafting result1,000 silver independently matches1600+400 material cost and3000 sale proceeds. Cloudflare full browser104 and native SQLite19 passed before the final isolated shopping scroll-position rule; hosted CI must retest the exact submitted revision before deployment. No schema migration or paid service activation.

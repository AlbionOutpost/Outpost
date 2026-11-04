# Development progress

## 2 November 2026 — security repair and independent retest

The 14 findings from the owner-requested assessment were traced to source and repaired or narrowly reassessed with evidence. Separate reviewers tested membership, billing, quotas, input bounds, caches, arithmetic, browser restoration and responsive artwork. Adversarial review also caught duplicate query-parameter budget evasion, checkout/deletion interleaving and late asynchronous draft overwrites; regressions were added. Existing migrations remain immutable; nullable checkout operation state is added through new PostgreSQL/SQLite migrations.

GitHub main protection and secret push protection were applied and read back. Application source remains on the local repair branch; there was no application merge, deployment, real OAuth exchange or payment operation. Full gate results, explicit failures/blocks, report fingerprints and outstanding provider/game/owner gates are maintained in the generated root reports and the reviewed security remediation record.

## Deeper-audit repair — 2 November 2026

Four additional findings were repaired on the same isolated branch: completed-checkout concurrency, stale composition loadout copies, unpaged timer/scenario histories and wrong-kind recipe URLs. Personal lists preserve their array API while adding stable authenticated cursor pages and visible older-entry controls. The new browser regression exercises tied timestamps, deletion of a cursor boundary, other-user denial and all affected list surfaces. Composition/recipe tests cover delayed responses and controlled recovery. Billing tests distinguish exact completed subscriptions from empty or stale provider histories. Final verification:515 unit tests,154/155 full browser tests (one existing region case passed unchanged on isolated and Cloudflare reruns),9 affected Cloudflare cases,14 PostgreSQL lifecycle checks and23 local workerd checks. Closure evidence is recorded separately from the original audit and its historical failures. No application deployment is part of this work.

## Repository synchronization — 2 November 2026

The owner authorized pushing the reviewed repair branch and explicitly left real OAuth and Stripe lifecycle verification blocked. Safe hosted OAuth-start, cookie/state/PKCE and malformed-callback checks passed; configured OAuth credentials were present, while Stripe remained unconfigured. No credentials were requested again or copied into the repair checkout. Cloudflare token verification remained401 and zone access403. Source and browser assets were checked against nine owner-configured secret values with no matches.

The region race was reproduced under repeated market requests and a delayed route response. The shell now invalidates region-scoped work immediately, while the market pauses background refresh and native URL synchronization until the router commits. Controlled tests verify old rows disappear, regional quotes remain distinct, browser history gains the new region, and Back restores the previous market. The development dependency graph remains compatible: the documented legacy advisory mechanism is absent, raw17 moderate tooling entries remain visible, and an automated exact-artifact guard with negative tests now checks that assessment on every phase. No unsupported peers or scanner suppression were introduced.

Final full-suite, repeated-region, Cloudflare and source-publication evidence is recorded in the reviewed QA reports. Historical failures are retained separately. A branch push does not merge main or deploy the application; provider, management-access and other release gates remain explicit.

Final branch validation passed all 12 automatic phase gates, including 519 unit tests, all 156 browser cases and the tooling-applicability guard. Final Cloudflare region/history/no-op controls passed 3/3, and the current browser/source boundary scan found no matches for nine owner-configured secret values. Production audit remains zero; the full tooling audit still has 17 explicitly assessed entries. These results do not close the owner-deferred real-provider or deployment gates.

## 4 November 2026 — homepage, server selection and compact previews

The owner-requested candidate refines the centered Supporter cutout, its reveal and following gap; features six larger activity cards including Crystal creatures; enlarges fanned weapon previews; and replaces transformed card hover with stable cutout geometry and lighting. Explore tools / Sign in hero actions, a clearer server menu without header search, content-sized tool previews and a minimal six-link footer complete the scope. The planner retains two example items and derives ownership from active rows; actual missing quotes stay unavailable and city-profit rows are no longer padded with unpriced cities. Full activity discovery, tool searches, regional query/persistence behavior and existing permission boundaries remain.

The latest Node22 mandatory phase passed11 of12 gates:524 units and162/166 browser cases. Three existing equipment goldens remain mismatched; one90-second aggregate editor timeout passed unchanged in an18.2-second isolated rerun. Eighteen focused changed journeys, all62 current Cloudflare core browser cases,24 local data/runtime cases, both Worker types, bundle limits and a fresh non-root container pass. Native Firefox159 at100% passes14 cutout/actual-hover cases in both themes. Responsive render, loading and final source/documentation checks are retained separately in the reviewed QA record; publication is pending the normal protected PR/pipeline, as explicitly authorized by the owner. Genuine provider consent, current-patch provenance, operator/legal, recovery, loading/field and full-product launch gates remain independent and open.

## 2026-11-04 — Homepage composition and motion corrections

Implemented wider single-scene Supporter, restored stable-artwork foreground motion, symmetric interruptible theme reveal, third planner item/readable remaining counts, natural preview headers/actions and feature-plus-two guide layout. Final320px crowding corrected with one wider column/48px weapons. Node22 mandatory phase11/12 (524units,163/167browser cases): three existing equipment goldens and stale planner digit assertion; corrected assertion passes with17focused cases. Final63Cloudflare core/24runtime/types/free/container pass;60scoped rendered/axe cases and72captures reviewed, nativeFirefox159100%14plus theme2/all-six320px2checks pass. Broader launch NO-GO and actual public verification remain separate. [Current evidence and reference review](design/HOMEPAGE_REFINEMENT_2026-11-04.md). Protected push/merge/deploy explicitly authorized; publication receipt follows successful deployment.

## 2026-11-04 — Card silhouettes and shared interaction feedback

Implemented outer native Supporter mask, uniform activity artwork/blur/border grow+press, shared control/card feedback and confirmed-success like/favorite/upvote pops, equal desktop tool tracks with72pxgraph/92pxprofit, reachable narrow financial columns and bottom-left guide copy. Source audit covers all52route patterns; private/manual coverage limits remain explicit. Node22phase11/12 (524units,167/170browsers, only3existinggoldens);66finalCloudflare core/24runtime/types/free/container pass;60scoped rendered/axe cases,12visualmotion, nativeFirefox14withmouse-emulation,16scrollregions and12touch cases reviewed. [Detailed current checkpoint](design/CARD_MOTION_POLISH_2026-11-04.md). Normal protected publication and public proof pending; full-product NO-GO remains independent.

## 2026-11-04 — Final Supporter contour correction

PR80 deployed through41763139142. Its live visual review found tiny black Supporter corner protrusions despite passing geometry. The derived mask now follows the supplied rounded edge farther down before joining the straight sides; its lower continuation starts below that curve. Only mask/CSS changed. Local Chromium8 and nativeFirefox14 inspected cases show clean desktop/phone corners in both themes. Current full-phase/protected publication and final public receipt remain separate; prior3equipment goldens and broader launch NO-GO are retained. [Evidence and boundaries](design/CARD_MOTION_POLISH_2026-11-04.md).

## 2026-11-04 — Landing density and footer refinement

Owner follow-up compacts profit/margin, selects a real multi-material recipe for the preview, moves guide categories upper-right, removes landing guide author/date lines and gives the minimal footer two coherent groups. All existing recipe facts, accounting and full-calculator choices remain. Both-theme desktop/phone captures and scoped keyboard/axe checks are inspected; current full-phase/protected/public delivery evidence remains separate. [Design and verification checkpoint](design/LANDING_DENSITY_FOOTER_2026-11-04.md).

## 2026-11-04 — Inline guide metadata clarification

PR82 shipped the landing density/footer refinement. The owner clarified that category belongs left of reading time in the same top-right row. Current two-file UI correction passes productionbuild/homepage7 and12responsive guide cases, including320px internal label wrapping. Parentfullphase and final newprotected/public evidence remain separate. [Checkpoint](design/LANDING_DENSITY_FOOTER_2026-11-04.md).

## 2026-11-04 — Homepage hierarchy and spacing

Paired public build/comp previews now lead to the actual creators; Team capabilities sit in a compact companion strip. Three persistent live tools share one accessible preview, with wider section/card rhythm and preserved inputs. Current full Node22 phase11/12:524units,167/170browsers; only three existing equipment goldens fail. Local rendered/state/keyboard/pointer review,24D1runtime and fresh container pass. [Design and evidence](design/HOMEPAGE_RHYTHM_2026-11-04.md). Protected publication and exact-head public/native proof remain pending at this committed checkpoint; broader launchNO-GO remains separate.

## 2026-11-04 — Revert PR84 after owner rejection

The owner explicitly requested the prior homepage. Application and e2e trees now match PR83 exactly: three planning windows and three simultaneous tools return, experimental selector/Team strip removed. Historical evidence is retained and the PR84 design marked withdrawn. Current Node22 phase524units/167of170browsers (only3existinggoldens),12render/axe cases,24D1runtime and fresh container pass. [Rollback checkpoint](design/HOMEPAGE_REVERT_2026-11-04.md). Normal protected publication/current public proof remain pending; broader launchNO-GO unchanged.

## 2026-11-04 — Market, legal draft and search/share integration

The owner-preferred PR83 layout restored in PR85 remains. Supporter copy is centered without resizing; guides precede weekly kills. Market/Tools working surfaces extend the landing brand while preserving task controls. Public-only search/share metadata, branded OG image,11519-URL sitemap and optional Google/Bing verification wiring are implemented. German legal information is an explicit draft; missing operator/consumer-rights/operational facts remain open. Google ad requests fail closed pending real consent/revocation; no payments enabled.

Final Node22 phase:614units and171/174browsers, only3existing equipment goldens fail. Current24D1runtime,70CFcore/types/dryruns, freshnon-rootcontainer,48productionroutecases/16scopedaxe and nativeFirefox14home+12Market/Tools pass. Production/lab/negative metadata details and first failures are preserved in [phase design/evidence](design/MARKET_LEGAL_SHARING_2026-11-04.md), [SEO](SEO_AND_SOCIAL_SHARING.md), [legal activation ledger](legal/GERMAN_LEGAL_DRAFT_2026-11-04.md) and [tooling reassessment](TOOLING_SECURITY.md). Protected publication/current public receipt pending at this checkpoint; full-product/commercial launch remains NO-GO.

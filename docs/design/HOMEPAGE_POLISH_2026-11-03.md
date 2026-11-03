# Homepage motion, activity depth and footer refinement

The owner rejected the earlier digit-swap feel, upright weapon previews, low placement of the free-access message, old footer layout and bright/glitching activity outlines. This refinement preserves Outpost's typography, charcoal/copper palette, supplied scenes, category data and navigation.

## Number motion

`AnimatedNumber` now wraps pinned `@number-flow/react`0.6.2 with its continuous plugin. Persistent digit strips, spring-shaped default timing, masked edges and width transitions replace per-update DOM reconstruction. Rapid reversals retain the same element; no count-up from a fabricated zero occurs. Current target values remain immediately available through the existing accessible label and `data-value`. A reduced-motion subscription explicitly finishes in-flight movement. Unsupported browsers retain a static formatted value.

Primary references: [NumberFlow documentation](https://number-flow.barvian.me/) and [source](https://github.com/barvian/number-flow). This adopts a proven interaction implementation without copying demo statistics, styling or branding. Three pinned production packages are introduced: React wrapper0.6.2, core0.6.2 and esm-env1.2.2. Their metadata, dist code, SSR/Shadow DOM, CSP and motion behavior were inspected; install lifecycle helpers were not run. No remote animation loader, telemetry or script-CSP change is added. Exact package integrity values remain in the lockfile. MIT notices from the exact installed packages are published under `public/third-party`; the separately fetched upstream notice matches the installed NumberFlow notice SHA256.

NumberFlow contains inert0–9 strips inside open Shadow DOM. Numeric browser assertions therefore read the accessible current number rather than concatenating hidden animation glyphs. Independent expected arithmetic is unchanged. Dedicated interaction tests additionally verify actual non-inert digits, native running animations, retained element identity through reversal, settled state, reduced motion and no additional price requests. Screenshots/animation frames provide separate visual evidence; target labels alone do not certify rendered glyphs.

## Page composition

The existing “Free for everyone” band moves immediately above activity discovery, after the tool previews. Its public-access/Supporter copy, pricing gate and links stay the same. A compact text/actions composition replaces the former centred closing band, stacking deliberately on phones. No new sales claim or billing activation is introduced.

Weapon previews use the former small fan: first and third rotate6degrees in opposite directions, with the middle raised4px and overlapping dark wells. Desktop previews are48px; compact phone previews28px. All icons retain recorded IDs/names and the whole category remains the single link. The phone arrow occupies the count row so long titles can use the caption width.

The bright border and competing inset bevel were removed. One dark inset2px rim fades near the protruding artwork. Scene, blur and shade layers share12px lower radii, eliminating the mismatched right/bottom corner treatment. Existing shadows and image contours remain; upper art is not boxed in. The earlier28/46/66% progressive blur is retained.

The footer keeps every existing navigation destination, account-aware sign-in filtering, source disclosure, legal link and reduced-motion-aware Back to top control. Its desktop composition uses a brand column beside horizontal grouped navigation rows; phones use two link columns within each group. The old four-column layout, gem divider and animated link dashes are removed. Region-aware links remain intact.

## Verification checkpoint

Initial affected Node browser batch:29 cases pass, including crafting arithmetic, interruption/reversal, reduced motion, callout order, footer navigation and category links. A controlled fixture stress run with20 rapid reversals makes one price request, records no page errors and has zero running animations after settling. This is not a live market observation.

Rendered Node previews at1440/390/320 were inspected for activity cards, the moved callout and footer, including four animation frames. Broader phase, Cloudflare, responsive/accessibility, container and loading evidence is recorded in the reviewed QA record before release. No new visual goldens are silently accepted.

Published-page baseline JS resource samples and local standalone samples use different transport/build conditions and are not a performance comparison. Bundle guards use the same actual Wrangler dry-run method; loading samples are labelled local lab evidence. No speed-up or field-performance claim follows from adopting the animation component.

Final local verification: Node22 phase11/12 gates pass,522 units and162/165 browser cases. Only the existing equipment goldens at320/390/768 fail; no baselines were rewritten. The first full run exposed three remaining assertions concatenating the new inert strips; all retain the same independent expected accounting and pass after using accessible result text.61 final Cloudflare core cases pass, along with24 actual workerd data cases and both Worker typechecks.

Cloudflare rendered review covers the callout, homepage cards, shared footer and32-category collection at1440/1920/768/390/375/320, plus all four light-mode surfaces and two tool-route footer checks:30 clean scoped axe scans, no document overflow or page errors, decoded artwork and manually inspected target captures. Standard viewport images are retained beside target-fit screenshots; temporarily fitting a tall target in the viewport avoids Chrome's off-viewport fixed-node screenshot artifact without hiding a control. Native animation frames and20 rapid reversals were also reviewed under workerd, with one quote request and no unsettled animation after the run.

The current container runs as UID1000, omits baked `.env`, reaches real isolated PostgreSQL/Redis and serves the collection/artwork; its owned acceptance container is removed. Actual Wrangler dry-runs: data1,023,980/web2,529,096 gzip bytes, both under3MiB. The web bundle increases8,264bytes from the prior measured2,520,832byte artifact across this entire refinement. Production audit0 advisories;17 raw moderate development propagation entries remain visible under the existing exact mechanism assessment. One initial-route local mobile Lighthouse sample74Performance/100Accessibility, LCP5950ms/CLS0.053; loading/field targets remain open. No controlled speed-up is claimed.

Review evidence: [activity depth/fan](homepage-activity-depth.png), [moved membership callout](homepage-membership.png), [desktop footer](homepage-footer.png), [phone footer](homepage-footer-mobile.png). These are implementation review captures, not newly accepted regression goldens. Raw viewport/target screenshots and the controlled counter video remain in ignored `.qa/homepage-polish/`.

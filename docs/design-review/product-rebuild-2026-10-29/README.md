# Outpost five-reference product rebuild — 29 October 2026

Implemented in the existing application. No deployment, publication, production mutation, billing or security-policy change was performed. The owner supplied `OUTPOST_CODEX_DESIGN_REFERENCES_AND_PROMPT.zip`; its five PNGs and prompt control the current visual direction. Existing domain data and authorization remain authoritative.

## What changed

The shared navy/orange palette, Inter interface, condensed home display, mono numeric values, controls and surfaces apply across all45 existing route patterns. Research, editing, reading, collaboration and calculation pages retain distinct layouts.

Market now uses a persistent filter column, table/history work area and contextual selected-city information on wide screens. Explicit comparison preserves validated item, quality, region, city and catalog filters in the URL. Existing cancellation, source timestamps, missing observations and private watchlists remain separate.

Build discovery restores the searchable weapon-family rail, real library counts and genuine family artwork. Cards lead with weapon and title, four armor previews and larger recorded abilities. Detail pages combine real build context, the anatomical ten-slot board and one selected-item inspector. Equipment effects are27px rather than19px, with23px narrow-screen icons. Bag/cape empty affordances use faint genuine renderer catalog art, visibly marked Empty; these are not recovered native game UI sprites or equipped records.

The production calculators use configuration/material/results columns, identify exact missing prerequisites and keep unknown totals unavailable. Hypothetical sensitivity reuses the existing engine. Item browsing adds real List/Grid and recipe links. Other economic workspaces retain their mechanics-specific models.

Editors show real save state and working preview costs. Compositions prioritize roles and independent assigned loadouts, include bags in all boards/PNG exports and recover unsaved private drafts across navigation without browser persistence. Revisions still reject stale saves.

The supporting pages include one homepage market workspace, real featured builds, focused sign-in, continue-working dashboard, sectioned settings, active-first timers, editorial guides, compact feeds, searchable Team membership/events, private invitations, authorized moderation and readable legal/source information.

## Verification and evidence

Before/after source snapshots and actual sandboxed Playwright captures are retained under `.qa/product-rebuild-2026-10-29`, `.qa/product-rebuild-economy`, `.qa/product-rebuild-editors` and `.qa/product-support-rebuild`. These are local-library browser evidence, not browser MCP, production OAuth, field performance or operator acceptance. Public records are real; private account/team records are isolated labelled QA fixtures and are removed after capture.

The first full gate is retained under `.qa/product-rebuild-2026-10-29/first-gate`:405 units passed;117 browser cases passed and22 failed. Real narrow-Market placement, contrast, timer semantics and profile alignment issues were corrected. Stale flow/selector tests were updated without dropping calculation, ownership or source assertions. Intentional equipment/composition pixel changes are separately reviewed before updating goldens. The final gate is recorded below when it actually completes.

## Related implementation reviews

- [Economy and item workspaces](../product-rebuild-economy.md)
- [Editors, recovery and compositions](../PRODUCT_REBUILD_EDITORS_2026_10_29.md)
- [Supporting pages and account/team workflows](../product-rebuild-support.md)

## Differences and limits

The supplied imagery is a composition reference, not licensed scene art or a source of game numbers. The homepage uses a restrained neutral atmosphere; generated scenes, fake popularity, damage/sustain bars and unsupported item power are omitted. Sensitivity is a transparent numerical table rather than a decorative forecast chart. Native empty-slot game sprites are unavailable. Broad calculator/catalog/current-patch completeness, real Discord consent, physical-device/screen-reader checks, field performance, production Worker CPU/load and owner visual acceptance remain independent open gates. No local fixture authenticates a real Discord user.

## Final visual correction pass

The126-state local production capture exposed a missing literal space between weapon-family labels and counts, despite passing the phone-only rail accessibility sample. It is corrected and the desktop rail now has its own axe regression. A separate read-only reviewer inspected the populated saved composition and found its old1000px five-player grid squeezed real ten-slot matrices past the cards. The readonly grid now uses bounded adaptive columns; its role/preparation strip uses the editor’s compact treatment. A browser journey checks the actual gear bounds and phone first-loadout position, then continues editing, undo and PNG export. The repeated guide synopsis was removed; all article content remains. Readiness headings reset inherited numerical letter spacing. The independent screenshots and first failed/interrupted commands remain retained.

Secondary fees, seed returns, risk assumptions and saved scenarios now use native disclosures in farming, transport and manual trading; essential prices, quantities and capacity remain visible. Compact readouts retain applied assumptions. Ten focused browser cases passed, including explicit arithmetic equality after collapsing secondary settings. All source-based domain calculations are unchanged. The historical recipe status remains readable on mobile, and the selected production mode scrolls its own tab rail into view.

A later full140-case run passed139 cases and exposed a screenshot-geometry test reading Results before the requested animation-frame focus/scroll had completed. The test now explicitly waits for the result panel to receive keyboard focus before measuring; all seven production economy cases pass with unchanged formulas and UI. The final full run is separately recorded, and the earlier139/140 log is retained. A previous139-case pass was interrupted with exit143 before its regional-read stage/summary; its completed checks are not represented as a complete gate.

## Final local production gate

`npm run qa:phase` completed on Node22 against local services:405 unit tests,140 browser tests,15 disposable-database checks, nine bounded regional endpoint reads, types, lint, structural data audit, build and dependency advisory checks all PASS. The fresh phase timestamp and raw per-stage results remain in `.qa/phase-summary.json`; retained failures are under the dated task folder. The reviewed pixel suite runs without update in the final gate. Local native workerd database/service checks also pass20 cases; Cloudflare web parity and final all-route captures are reported separately below. No real OAuth, field performance, production CPU/D1 capacity, hosted CI or owner visual acceptance is implied.

## Rendered coverage and measured limits

The final production matrix contains126 desktop/phone states plus180 additional states: every one of the45 existing route patterns at320/390/768/1024/1440/1920. All return200 with no recorded JavaScript errors or document overflow.36 targeted axe scans report no violations; the other states are visual/interaction evidence, not an automated accessibility audit. Independent reviewers opened all supporting, economy/item and editor/composition desktop/phone states. Representative narrow/tablet/wide core images were opened again after fixes. Source artwork was awaited; two initial feed-image queue frames were recaptured against the actual source after settling, with empty image-failure checks. Temporary fixture accounts/Teams were removed.

[Route matrix](route-matrix.csv), raw manifests under `.qa/product-rebuild-2026-10-29/final` and `responsive-final`, and the offline review package contain the screenshots. The primary reference pages have portable [selected screenshots](screenshots/after-build-library-1440.png).

Fresh container smoke passes: uid1000, PostgreSQL/Redis healthy, no `.env` baked into the image, and the owned container removed after checks. One mobile Lighthouse sample per reference page reports Performance84–89, Accessibility100, LCP3.611–4.307s and CLS0–0.0632. Loading targets remain missed. No speedup, field INP, production capacity or complete WCAG claim is made. See the [performance record](../../engineering/PERFORMANCE_REPORT.md).

Wrangler local dry-runs validate the two actual bundles at1,017,764 and1,992,500 compressed bytes, within the configured Free package-size checks, with no paid service enabled. This is not a deployed CPU/quota test. Production is intentionally unchanged.

## Cloudflare-only first-search correction

The first complete Cloudflare web run passed139/140 and caught a real search-start race: the favorites input could accept typing before its client handler hydrated, leaving24 old results. `BuildDiscoverySearch` now disables input until client readiness, using the existing Market hydration pattern. The new regression holds actual client chunks, proves the server-rendered input is disabled, then releases them and checks the first query, rendered results and regional/weapon identity. The original failed Cloudflare evidence is retained; final Node/Cloudflare reruns are recorded independently. No permission/cache/query-service rule is weakened.

The corrected discovery search passed the full Node gate:405 units and141 browser cases, all ten stages PASS. Library and account-favorites production images were refreshed after the guard; the visual treatment is unchanged. The source patch in the review package applies to this task’s pre-rebuild source snapshot, not directly to a clean historicala154 checkout. Existing records/migrations and root Git history are preserved; this environment’s root Git metadata is read-only/unusable, so no commit/push is claimed.

## Final delivery verification

The rebuilt local Cloudflare web runtime passes **141/141 browser cases**, including both the original failing favorites query and the forced delayed-script regression. Native workerd checks pass20/20. Final Node QA passes405 units,141 browser cases and all ten phase stages. Fresh package-size dry-runs pass for both Workers; current Lighthouse/container results and their unmet loading targets are recorded above. Source and client-bundle scans report no configured-secret matches. The offline review gallery covers every existing route with matched viewport comparisons and full-page links; historical-baseline exceptions are labelled.

No deployment, GitHub push, live security-policy/billing change or destructive data operation was performed. Private QA records are cleaned. Owner visual acceptance, genuine Discord consent/session lifecycle, current-patch coverage, physical-device/screen-reader checks, field performance and production CPU/load/recovery remain explicit release gates. **Release stays NO-GO.**

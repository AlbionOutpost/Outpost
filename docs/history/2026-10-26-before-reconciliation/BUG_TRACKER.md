# Bug tracker

Audit date: 2026-10-26. Missing essential capabilities are product release blockers. No P0 reproduced; absence of all P0 vulnerabilities is not certified.

## QA-001 — Header region and tool request disagree

- **Severity:** P1
- **Affected feature:** Market/history/items
- **Status:** FIXED
- **Reproduction:** Set atlas-region=asia; open market with no region URL; compare.
- **Expected:** Use Asia.
- **Actual before fix / current unresolved behavior:** Header Asia but Europe request.
- **Root cause:** Independent hardcoded defaults.
- **Files:** region-context.tsx; shell.tsx; market.tsx; history.tsx; item-catalog.tsx
- **Fix verification:** Failed pre-fix browser reproduction; shared-context regression passes.

## QA-002 — Old item/quality prices remain visible

- **Severity:** P1
- **Affected feature:** Market
- **Status:** FIXED
- **Reproduction:** Load Bag quality1 then change quality/item.
- **Expected:** Invalidate observations.
- **Actual before fix / current unresolved behavior:** Old rows remained until region changed.
- **Root cause:** Incomplete result identity.
- **Files:** market.tsx; tools/market/page.tsx
- **Fix verification:** Failed pre-fix reproduction; full selection-key invalidation test passes.

## QA-003 — Finite inputs overflow calculated outputs

- **Severity:** P1
- **Affected feature:** Trade math
- **Status:** FIXED
- **Reproduction:** Price1e308 with quantity1000000.
- **Expected:** Reject unrepresentable scenario.
- **Actual before fix / current unresolved behavior:** Schema accepted overflowing scenario.
- **Root cause:** No aggregate precision bound.
- **Files:** calculations.ts; qa-regressions.test.ts
- **Fix verification:** Pre-fix unit failed; bounded validation passes.

## QA-004 — Cleared numeric input renders NaN

- **Severity:** P2
- **Affected feature:** Trade input
- **Status:** FIXED
- **Reproduction:** Clear purchase-price field.
- **Expected:** Blank with validation and no React warning.
- **Actual before fix / current unresolved behavior:** NaN passed to controlled input.
- **Root cause:** No blank display adapter.
- **Files:** trade-calculator.tsx
- **Fix verification:** Clear-input browser test records no React errors.

## QA-005 — Fractional profit hidden by rounding

- **Severity:** P2
- **Affected feature:** Trade output
- **Status:** FIXED
- **Reproduction:** Buy1 sell1.5 quantity1.
- **Expected:** Show0.5.
- **Actual before fix / current unresolved behavior:** Rounded to whole silver.
- **Root cause:** Math.round at presentation.
- **Files:** trade-calculator.tsx
- **Fix verification:** Fractional-profit browser assertion.

## QA-006 — Invalid domain data accepted by database

- **Severity:** P1
- **Affected feature:** Persistence
- **Status:** FIXED
- **Reproduction:** Disposable DB: quality6, playerCount-1, invalid region.
- **Expected:** Reject invalid records.
- **Actual before fix / current unresolved behavior:** All three were accepted.
- **Root cause:** Only API validation.
- **Files:** 20261025213500_qa_invariants/migration.sql
- **Fix verification:** database-baseline.json shows failure; database-final.json records all scoped checks.

## QA-007 — Database failures mislabeled or unbounded

- **Severity:** P2
- **Affected feature:** API errors
- **Status:** FIXED
- **Reproduction:** Throw sensitive service error; send oversized JSON.
- **Expected:** Safe503; proper413/415/400 client errors.
- **Actual before fix / current unresolved behavior:** Broad400 catch or missing safe boundary.
- **Root cause:** Inconsistent handler policy.
- **Files:** api-errors.ts; http.ts; build/account routes
- **Fix verification:** Sanitized exception unit tests, oversized payload and conflict browser tests.

## QA-008 — Inline link and table accessibility failure

- **Severity:** P2
- **Affected feature:** Market accessibility
- **Status:** FIXED
- **Reproduction:** Run axe at375px.
- **Expected:** Non-color link cue and keyboard scroll.
- **Actual before fix / current unresolved behavior:** Color-only link; unfocusable scroll region.
- **Root cause:** Missing underline/tab semantics.
- **Files:** globals.css; market.tsx; history.tsx
- **Fix verification:** Initial axe nodes captured; final dark tagged-rule assertions pass.

## QA-009 — Light theme contrast failures

- **Severity:** P2
- **Affected feature:** Theme
- **Status:** FIXED
- **Reproduction:** Run light axe at375/1440.
- **Expected:** Readable contrast.
- **Actual before fix / current unresolved behavior:** 19 route/viewport color-contrast findings.
- **Root cause:** Dark gold/gray accents reused.
- **Files:** globals.css
- **Fix verification:** 20 light route/viewport cases assert no tagged violations.

## QA-010 — Mobile drawer lacks focus management

- **Severity:** P2
- **Affected feature:** Navigation
- **Status:** FIXED
- **Reproduction:** Open drawer, Tab and Escape.
- **Expected:** Modal focus, dismiss, return.
- **Actual before fix / current unresolved behavior:** Background focus/scroll not controlled.
- **Root cause:** Visual-only drawer.
- **Files:** shell.tsx; globals.css
- **Fix verification:** Dialog/Escape/focus-return test passes; actual screen reader remains blocked.

## QA-011 — Process cache has no byte budget

- **Severity:** P2
- **Affected feature:** Caching
- **Status:** FIXED
- **Reproduction:** Cache many near-limit responses.
- **Expected:** Bound memory.
- **Actual before fix / current unresolved behavior:** 500 entries could retain about1GB serialized payload.
- **Root cause:** Entry-only bound.
- **Files:** data-client.ts; cache-expiry.test.ts
- **Fix verification:** 8MiB serialized-payload/128-entry policy; eviction and TTL regressions.

## QA-012 — Wrong source identity cached before validation

- **Severity:** P2
- **Affected feature:** Source validation
- **Status:** FIXED
- **Reproduction:** Return valid-shaped wrong item; retry.
- **Expected:** Reject without cache poisoning.
- **Actual before fix / current unresolved behavior:** Identity check followed cache write.
- **Root cause:** Context check outside schema.
- **Files:** market-client.ts; cache-expiry.test.ts
- **Fix verification:** Repeated mismatch requests trigger repeated source validation, not poisoned hit.

## QA-013 — Untested root-running Docker scaffold

- **Severity:** P2
- **Affected feature:** Container
- **Status:** FIXED
- **Reproduction:** Build/inspect original Dockerfile.
- **Expected:** Reproducible nonroot health-checked runtime.
- **Actual before fix / current unresolved behavior:** Root, single stage, npm install, no app smoke.
- **Root cause:** Initial scaffold.
- **Files:** Dockerfile; next.config.ts; qa-container.mjs
- **Fix verification:** Image built; UID1000, env absent, home and DB/Redis health200.

## QA-014 — Deprecated lint toolchain

- **Severity:** P2
- **Affected feature:** Dependencies
- **Status:** OPEN
- **Reproduction:** Inspect npm deprecation and peer graph.
- **Expected:** Maintained compatible lint stack.
- **Actual before fix / current unresolved behavior:** ESLint9 deprecated;10 conflicts with Next plugin peers.
- **Root cause:** Ecosystem compatibility gap.
- **Files:** package.json; package-lock.json
- **Fix verification:** Zero audit advisories does not resolve deprecation.

## QA-015 — Prisma reads coupled to presentation

- **Severity:** P3
- **Affected feature:** Maintainability
- **Status:** OPEN
- **Reproduction:** Inspect build/settings server pages.
- **Expected:** Reusable query/repository helpers.
- **Actual before fix / current unresolved behavior:** Prisma reads remain inside markup modules.
- **Root cause:** Foundation coupling.
- **Files:** app/builds; settings/page.tsx; layout.tsx
- **Fix verification:** Source inspected; future behavior-preserving extraction.

## QA-016 — Settings action service-failure recovery

- **Severity:** P2
- **Affected feature:** Account UX
- **Status:** FIXED
- **Reproduction:** DB rejects profile save or account deletion.
- **Expected:** Clear retry preserving draft.
- **Actual before fix / current unresolved behavior:** Typed errors retain form state and both operations succeed on retry.
- **Root cause:** Missing action result/error model; overloaded session ReturnType also prevented build.
- **Files:** settings/actions.ts; settings-forms.tsx; settings-recovery.spec.ts
- **Fix verification:** Fixture-only PostgreSQL UPDATE and DELETE failure injection verifies preserved drafts/confirmation, unchanged records on failure and successful retry; real OAuth remains separate.

## QA-017 — Composition catalog and guild milestone incomplete

- **Severity:** P1
- **Affected feature:** Product
- **Status:** IN PROGRESS
- **Reproduction:** Attempt20-player comp/group invite workflow.
- **Expected:** Persisted authorized collaboration.
- **Actual before fix / current unresolved behavior:** Composition and group workflows pass phase gates; complete catalog and remaining guild workflows are incomplete.
- **Root cause:** Ongoing implementation.
- **Files:** PROJECT_PLAN.md; schema.prisma
- **Fix verification:** See docs/DEVELOPMENT_PROGRESS.md; no full-completion claim.

## QA-018 — Verified item/spell and build feature gaps

- **Severity:** P1
- **Affected feature:** Builds
- **Status:** OPEN
- **Reproduction:** Try legal spells, duplicate, favorites or build cost.
- **Expected:** Verified selectors and required interactions.
- **Actual before fix / current unresolved behavior:** Validated starter item/spell picker, duplication, version restoration and costs pass; complete catalog, unlocks/statistics and full swap workflow remain incomplete.
- **Root cause:** Incomplete data/build phase.
- **Files:** build-editor.tsx; item-database.ts
- **Fix verification:** e2e/verified-builds.spec.ts and tests/build-cost.test.ts pass within starter catalog scope; full catalog acceptance remains unresolved.

## QA-019 — Moderation hardening and spam coverage incomplete

- **Severity:** P1
- **Affected feature:** Community
- **Status:** OPEN
- **Reproduction:** Try reporting/reviewing abusive public content.
- **Expected:** Moderated reporting operations.
- **Actual before fix / current unresolved behavior:** Reports/queue/audited hide-restore and comment revisions implemented; advanced abuse controls remain.
- **Root cause:** Partial community phase.
- **Files:** build API; schema.prisma
- **Fix verification:** e2e/community.spec.ts passes core multi-account controls; comprehensive abuse/appeals/operations coverage remains unresolved.

## QA-020 — Specialized economy coverage incomplete

- **Severity:** P1
- **Affected feature:** Economy
- **Status:** OPEN
- **Reproduction:** Try focus/city crafting or reload saved scenario.
- **Expected:** Sourced production mechanics and persistence.
- **Actual before fix / current unresolved behavior:** Crafting/refining/enchanting starter engines and private saved scenarios are implemented; remaining economy scope is incomplete.
- **Root cause:** Calculator phase incomplete.
- **Files:** calculations.ts; PROJECT_PLAN.md
- **Fix verification:** tests/production.test.ts and e2e/production.spec.ts cover the implemented subset; automatic city/focus specialization and full recipes remain missing.

## QA-021 — Production monitoring/backups unconfigured

- **Severity:** P2
- **Affected feature:** Operations
- **Status:** OPEN
- **Reproduction:** Find alerts/scheduled backup jobs.
- **Expected:** Operational monitoring/retention.
- **Actual before fix / current unresolved behavior:** Local health/logs and synthetic restore only.
- **Root cause:** No deployed operations.
- **Files:** docs/DEPLOYMENT.md
- **Fix verification:** Local restore does not establish production backup service.

## QA-022 — Actual Discord OAuth unverified

- **Severity:** P1
- **Affected feature:** Authentication
- **Status:** BLOCKED
- **Reproduction:** Attempt real login without credentials.
- **Expected:** Verified redirect/state/login/repeat account.
- **Actual before fix / current unresolved behavior:** Provider unavailable; fixture sessions only.
- **Root cause:** Credentials missing.
- **Files:** auth.ts; signin/page.tsx
- **Fix verification:** Requires real credentialed verification; no exposed mock login.

## QA-023 — Legal/operator and retention incomplete

- **Severity:** P1
- **Affected feature:** Legal/release
- **Status:** BLOCKED
- **Reproduction:** Open legal page with missing operator data.
- **Expected:** Completed reviewed disclosures.
- **Actual before fix / current unresolved behavior:** Explicit draft/missing-data labels.
- **Root cause:** Operator/legal information unavailable.
- **Files:** legal/page.tsx; .env.example
- **Fix verification:** No legal compliance claim; NO-GO.

## QA-024 — Public TLS/cookies and field vitals unverified

- **Severity:** P2
- **Affected feature:** Deployment/performance
- **Status:** BLOCKED
- **Reproduction:** Inspect public TLS/field evidence.
- **Expected:** Secure-cookie and field verification.
- **Actual before fix / current unresolved behavior:** Local HTTP/lab evidence only.
- **Root cause:** No public staging deployment.
- **Files:** proxy.ts; env.ts; RELEASE_READINESS.md
- **Fix verification:** No local measurement promoted to HTTPS/field certification.

## QA-025 — Closed Redis singleton never recovers

- **Severity:** P2
- **Affected feature:** Resilience
- **Status:** FIXED
- **Reproduction:** Client status end, later request.
- **Expected:** Recreate client.
- **Actual before fix / current unresolved behavior:** Closed client retained.
- **Root cause:** No end-state recovery.
- **Files:** redis.ts; redis-recovery.test.ts
- **Fix verification:** Unit verifies new client; live restart drill remains unverified.

## QA-026 — History dates treated as local timezone

- **Severity:** P2
- **Affected feature:** Chart dates
- **Status:** FIXED
- **Reproduction:** Read timezone-less source near DST.
- **Expected:** Consistent UTC interpretation.
- **Actual before fix / current unresolved behavior:** Browser Date.parse timezone varies.
- **Root cause:** Missing UTC normalization.
- **Files:** freshness.ts; history.tsx
- **Fix verification:** Explicit UTC/future freshness unit test; chart uses shared parser.

## QA-027 — Standalone output uses incompatible start

- **Severity:** P2
- **Affected feature:** Startup
- **Status:** FIXED
- **Reproduction:** Build standalone then next start.
- **Expected:** Prepared standalone server.
- **Actual before fix / current unresolved behavior:** Next warning about unsupported start mode.
- **Root cause:** Scaffold command unchanged.
- **Files:** start.mjs; prepare-standalone.mjs; package.json
- **Fix verification:** Final production browser gate uses standalone startup.

## QA-028 — First design pass font and responsive geometry defects

- **Severity:** P2
- **Affected feature:** Shared design system
- **Status:** FIXED
- **Reproduction:** Load first design pass; resize desktop and inspect fonts/map/caption.
- **Expected:** Loaded typefaces and unobscured content.
- **Actual before fix / current unresolved behavior:** Fonts fell back; nested SVG expanded; margin animation temporarily covered content.
- **Root cause:** Font variables resolved above their definitions; broad SVG selector; breakpoint margin transition.
- **Files:** fonts.ts; globals.css; design-review.spec.ts
- **Fix verification:** Actual font-family and desktop geometry assertions plus dark/light168-state matrix; corrected selector and immediate responsive geometry.

## QA-029 — Settings failure fixture suppressed other test cleanup

- **Severity:** P2
- **Affected feature:** QA isolation
- **Status:** FIXED
- **Reproduction:** Run settings DELETE failure fixture alongside independent user cleanup.
- **Expected:** Only the selected test user fails.
- **Actual before fix / current unresolved behavior:** BEFORE DELETE returned NEW for other users, preventing unrelated deletion.
- **Root cause:** Trigger reused UPDATE return semantics for DELETE.
- **Files:** e2e/settings-recovery.spec.ts
- **Fix verification:** Return OLD for unrelated DELETE operations; full concurrent production browser gate rerun passes.

## QA-030 — Small copper legal links failed contrast

- **Severity:** P2
- **Affected feature:** Outpost visual system
- **Status:** FIXED
- **Reproduction:** Run dark375/1440 axe on Legal after switching to copper.
- **Expected:** Small links meet4.5:1.
- **Actual before fix / current unresolved behavior:** Brand copper on card surface measured3.99:1.
- **Root cause:** Prose selector retained brand color instead of accessible ink.
- **Files:** globals.css; legal/page.tsx
- **Fix verification:** Prose links use --accent-ink; full176-state dark/light review and phase gate pass.

## QA-031 — Outpost concept-image comparison was unavailable

- **Severity:** P2
- **Affected feature:** Design acceptance
- **Status:** FIXED
- **Reproduction:** Locate the supplied numbered concept screenshot.
- **Expected:** Inspect hierarchy and compare rendered layouts.
- **Actual before fix / current unresolved behavior:** Eight-panel reference is now supplied and reviewed; no pixel-perfect claim.
- **Root cause:** Earlier concept attachment was unavailable.
- **Files:** docs/OUTPOST_ACCEPTANCE.md; .qa/reference-review
- **Fix verification:** Actual image retained for QA-only comparison; no illustrative artwork cropped into application.

## QA-032 — Authentic hero and feature screenshots missing

- **Severity:** P2
- **Affected feature:** Design media
- **Status:** BLOCKED
- **Reproduction:** Find sourced permitted environment images for hero/cards.
- **Expected:** Use actual Albion media with recorded permission.
- **Actual before fix / current unresolved behavior:** No suitable supplied/repository assets; official press-kit retrieval403.
- **Root cause:** Missing source assets and verified usage evidence.
- **Files:** docs/assets/OUTPOST_MEDIA_INVENTORY.md
- **Fix verification:** Earlier generated scenes were user-authorised and disclosed, but do not close the latest genuine-media requirement.

## QA-033 — Composition native dragging stopped after roster rebuild

- **Severity:** P2
- **Affected feature:** Composition editor
- **Status:** FIXED
- **Reproduction:** Drag member1 to member2 in the full roster.
- **Expected:** Reorder and persist party order.
- **Actual before fix / current unresolved behavior:** Native drag never started on the new form-control handle.
- **Root cause:** Native drag interaction did not survive layout change.
- **Files:** composition-editor.tsx; globals.css
- **Fix verification:** Pointer capture movement passes dragTo and persistence assertions; keyboard ArrowDown and mobile focus pass separately.

## QA-034 — Starter gear preview overflowed320px homepage

- **Severity:** P2
- **Affected feature:** Responsive home
- **Status:** FIXED
- **Reproduction:** Open home at320px.
- **Expected:** No document overflow and usable equipment.
- **Actual before fix / current unresolved behavior:** 350px scroll width.
- **Root cause:** Intrinsic three-slot minimum width plus padding.
- **Files:** globals.css
- **Fix verification:** Minmax columns, shrinkable images and narrow padding; seven-width overflow audit passes.

## QA-035 — Guild overview text action inherited native gray button

- **Severity:** P2
- **Affected feature:** Guild overview
- **Status:** FIXED
- **Reproduction:** Run dark/light axe on new activity overview.
- **Expected:** Readable action contrast.
- **Actual before fix / current unresolved behavior:** Copper text on native gray button failed4.5:1.
- **Root cause:** Text-link style did not reset button background.
- **Files:** globals.css
- **Fix verification:** Explicit transparent button reset;176-state tagged axe matrix passes.

## QA-036 — Reference fidelity rejected despite passing functional QA

- **Severity:** P1
- **Affected feature:** Visual acceptance
- **Status:** OPEN
- **Reproduction:** Compare supplied reference with rendered implementation.
- **Expected:** Preserve reference hierarchy, imagery regions and density.
- **Actual before fix / current unresolved behavior:** Prior design rejected; measured build/composition corrections are starter-scoped and full acceptance remains open.
- **Root cause:** Prior phases prioritized general component treatment and tests over measured reference comparison.
- **Files:** docs/design-review; src/app/page.tsx; globals.css
- **Fix verification:** Three sequential rendered reviews required; actual image permissions remain blocking. No visual acceptance from QA alone.

## QA-037 — Undated production observations treated as fresh

- **Severity:** P1
- **Affected feature:** Calculator correctness
- **Status:** FIXED
- **Reproduction:** Use a source price with null timestamp.
- **Expected:** Warn about unknown freshness.
- **Actual before fix / current unresolved behavior:** Null timestamp bypassed stale check.
- **Root cause:** Truthiness guard skipped validation.
- **Files:** production.ts; production.test.ts; production-freshness.spec.ts
- **Fix verification:** Missing/invalid/past/future timestamp and manual-override regressions; final gate recorded below.

## QA-038 — Pending refresh overwrites newer manual prices

- **Severity:** P1
- **Affected feature:** Calculator state
- **Status:** FIXED
- **Reproduction:** Start overwrite refresh then edit a material price.
- **Expected:** Keep the newer input.
- **Actual before fix / current unresolved behavior:** Late source result replaced the edit.
- **Root cause:** No request cancellation or edit identity.
- **Files:** production-observations.ts; production-calculator.tsx
- **Fix verification:** Independent merge tests plus held-response production browser test.

## QA-039 — Imported search hides locally supported items

- **Severity:** P1
- **Affected feature:** Item search
- **Status:** FIXED
- **Reproduction:** Search Bow when imported catalog has no Bow.
- **Expected:** Keep selectable local names.
- **Actual before fix / current unresolved behavior:** Successful empty response removed fallback rows.
- **Root cause:** Database response replaced rather than merged catalog paths.
- **Files:** catalog/search.ts; catalog-item-picker.tsx; catalog.spec.ts
- **Fix verification:** Validated bounded merge and successful-empty-response browser regression.

## QA-040 — Long public build titles overflow mobile cards

- **Severity:** P2
- **Affected feature:** Responsive discovery
- **Status:** FIXED
- **Reproduction:** Browse a build with a long unbroken name at375px.
- **Expected:** Wrap without document overflow.
- **Actual before fix / current unresolved behavior:** Title escaped the card.
- **Root cause:** Missing overflow-wrap and shrinkable art column.
- **Files:** globals.css; design-review.spec.ts
- **Fix verification:** Reproduced actual375px screenshot; wrap correction and full matrix rerun.

## QA-041 — Historical events suppress upcoming guild activity

- **Severity:** P1
- **Affected feature:** Guilds
- **Status:** FIXED
- **Reproduction:** Create55 past events plus one future.
- **Expected:** Show scheduled next activity.
- **Actual before fix / current unresolved behavior:** Earliest50 excluded future event.
- **Root cause:** Ascending history consumed entire limit.
- **Files:** groups/dashboard.ts
- **Fix verification:** Bounded future/recent queries; populated PostgreSQL browser regression.

## QA-042 — Discovery semantic header/footer inherit site chrome

- **Severity:** P2
- **Affected feature:** Guilds
- **Status:** FIXED
- **Reproduction:** Open new discovery at375/390.
- **Expected:** Readable filters without overflow.
- **Actual before fix / current unresolved behavior:** Fixed header height overlaps content; footer padding bloats cards.
- **Root cause:** Legacy global element selectors.
- **Files:** globals.css
- **Fix verification:** Scoped resets;176-state matrix and320/390 screenshots.

## QA-043 — Repeated discovery query parameters can reach Prisma as arrays

- **Severity:** P2
- **Affected feature:** Build discovery
- **Status:** FIXED
- **Reproduction:** Request duplicate q/content parameters.
- **Expected:** Safe bounded parsing without500.
- **Actual before fix / current unresolved behavior:** String-only page type ignored actual array inputs.
- **Root cause:** Incorrect searchParams runtime assumption.
- **Files:** builds/page.tsx
- **Fix verification:** String narrowing, allowlisted filters and browser HTTP200 regression. Anonymous own collection explicitly empty.

## QA-044 — Source market records permit excessive field lengths and price magnitude

- **Severity:** P2
- **Affected feature:** Market integration
- **Status:** FIXED
- **Reproduction:** Receive oversized city/date or beyond-safe-number quote.
- **Expected:** Reject before cache/UI.
- **Actual before fix / current unresolved behavior:** Only whole-response bytes were bounded.
- **Root cause:** Missing per-field and numeric magnitude bounds.
- **Files:** market-client.ts
- **Fix verification:** Ten new source/cache tests preserve sentinel handling and valid retry; all regions rerun.

## QA-045 — Serialization rollback reported as composition revision conflict

- **Severity:** P1
- **Affected feature:** Composition persistence
- **Status:** FIXED
- **Reproduction:** Concurrent local activity producesP2034.
- **Expected:** Retry only known rollback, preserve revision guards.
- **Actual before fix / current unresolved behavior:** Spurious changed-composition error on own fixture.
- **Root cause:** Serialization failure conflated with stale revision.
- **Files:** compositions/service.ts;serialization-retry.ts
- **Fix verification:** Failed raw run retained; bounded retry tests and real competing-editor regression pass.

## QA-046 — Other calculator records crowd saved plans out of first page

- **Severity:** P2
- **Affected feature:** Scenario persistence
- **Status:** FIXED
- **Reproduction:** Save trade/transport then51 newer crafting records.
- **Expected:** Find saved plan for selected calculator.
- **Actual before fix / current unresolved behavior:** Client filtering followed global50-record limit.
- **Root cause:** Missing server kind filter.
- **Files:** scenarios/route.ts;scenario-controls.tsx;transport-calculator.tsx
- **Fix verification:** Trade and transport restored despite51 newer other-mode fixtures; private access and export tests.

## QA-047 — Inactive or partial catalog release reported synchronized

- **Severity:** P2
- **Affected feature:** Catalog import
- **Status:** FIXED
- **Reproduction:** Repeat import after deactivation or incomplete active records.
- **Expected:** Reject incomplete release state.
- **Actual before fix / current unresolved behavior:** Checksum match returned early without active-record checks.
- **Root cause:** Idempotency relied only on source identity.
- **Files:** catalog/release-state.ts;sync-catalog.ts
- **Fix verification:** Active-count and checksum regression tests; no main database import performed.

## QA-048 — Item navigation loses selected Albion region

- **Severity:** P2
- **Affected feature:** Item catalog
- **Status:** FIXED
- **Reproduction:** Open Asia catalog then item details and market.
- **Expected:** Retain Asia region.
- **Actual before fix / current unresolved behavior:** Navigation defaulted to Europe.
- **Root cause:** Region missing from links.
- **Files:** item-catalog.tsx;item-market-link.tsx
- **Fix verification:** Asia detail and market-link production browser regression passes.

## QA-049 — Starter ability names imply complete verified mappings

- **Severity:** P2
- **Affected feature:** Metadata disclosure
- **Status:** FIXED
- **Reproduction:** Open starter item details.
- **Expected:** Separate sourced names and current-patch verification.
- **Actual before fix / current unresolved behavior:** Verified wording exceeded available evidence.
- **Root cause:** No clear verification-stage labels.
- **Files:** items/page.tsx;items/[id]/page.tsx;composition-editor.tsx
- **Fix verification:** Labels now sourced/imported; manual and patch not recorded; actual patch coverage remains0.

## Current development audit — 2026-10-26

Master-prompt milestone: stricter catalog integrity, bounded merged item search, source-zero/missing-timestamp handling and pending-refresh/manual-edit preservation implemented; measured build/composition/market/calculator/guild corrections, wide PNG export with bounded artwork delivery and a locally prepared pinned-action CI workflow added. Full metadata/recipes, authentic scene/ability sources, visual acceptance and production gates remain incomplete. Engineering scope and calculator gaps: docs/engineering/. Release-blocker checkpoint: direct DB EPERM isolated; additive watchlist migration passes13 disposable DB checks but remains unapplied to the existing app DB. Repository data audit181 equipment/221 combined IDs, zero current-patch verification. Manual trade thresholds/private scenarios and rolled-back serialization recovery added. Real OAuth/HTTPS setup is documented, not executed. See docs/engineering/RELEASE_BLOCKERS.md. Latest command evidence above controls test status; no full-product or competitor-parity claim. Failed second-gate logs are retained in .qa/foundations/second-gate-failed.

## Live GitHub provisioning — 2026-10-26

AlbionOutpost/outpost and outpost-operations are private and empty. Organization/repository policies, selected-repository Actions with SHA-pinned checkout/setup-node only, read-only token defaults, fork isolation,14-day retention and Dependabot alerts/security fixes passed real API read-back. Ten fixture tests cover provisioning safety and API constraints. MFA and owner-only visibility/deletion/outsider invitations require website settings; private branch rules are blocked by the Free plan. No code upload, hosted CI, paid upgrade, full-history secret scan or deployment. See docs/deployment/GITHUB_SETUP.md and local .qa/github-live/provisioning.json. Final Node22 local phase: all ten gates PASS,127 unit/53 production browser/15 disposable DB checks; homepage screenshots inspected at375/768/1440/1920 without UI changes or acceptance upgrade. Local results do not establish hosted CI. Release NO-GO.

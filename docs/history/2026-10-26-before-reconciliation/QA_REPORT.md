# QA report

## Executive summary

**NO-GO for public release.** A functioning but incomplete foundation. Reproduced defects were fixed with regressions; attractive pages and a passing build do not close missing product, OAuth or legal gates. Evidence-coverage index **76.22/100**, computed in RELEASE_READINESS.md.

## Feature coverage

Working: transport planner and cross-city/Black Market observation scanner; starter crafting/refining/enchanting and private saved/shared scenarios; regional market observations/history/gold, curated item search, manual trade accounting, database sessions/settings/export/deletion, and private/public/unlisted builds with revisions. Composition core storage/editor/sharing is now tested; group collaboration has passed its full phase gate with five independent fixture accounts. Still missing: most calculators, complete item/spell catalog, full community moderation coverage, guide CMS, islands, background timer notifications, dashboard customization and operational admin tools. Persistent manual timers, bounded personal dashboard and permission-filtered Ctrl+K search are verified in e2e/personal-tools.spec.ts; settings save/delete failure retries are verified in e2e/settings-recovery.spec.ts. See docs/DEVELOPMENT_PROGRESS.md for the authoritative current milestone scope.

## Test results

- Baseline type/lint/unit/migrations/build/browser/advisories passed. New reproductions then genuinely failed for region mismatch, stale quality rows and overflow. Fixed tests subsequently pass; initial failures are not hidden.
- Latest unit log: **127 passed**. Latest production browser log: **53 passed**. Check command statuses below; successful counts must not hide an overall FAIL.
- Disposable database: all recorded fresh/upgrade/constraint/backup/restore/cascade checks pass. Baseline invalid quality/playerCount/region were accepted; new migration enforces them. No existing application DB reset or production backup used.
- Live price/history/gold: nine region/endpoint checks pass. Raw-versus-app comparison matches all 8 price rows per region, including IDs, city, quality, values and timestamps. Raw sample .qa/live-comparison.json is audit evidence, not UI seed data.
- Historical foundation container evidence (predates new collaboration/economy routes): build and local smoke pass, UID1000, no /app/.env, home200, Postgres/Redis health200. Auth availability is separately not-configured.
- Historical browser static secret-value scan:20 files, no configured NEXTAUTH_SECRET match. Discord secret absent, so cannot scan it by value. This is not a complete source/OS security audit.

- `database-connectivity`: **PASS** (0.03s).
- `typecheck`: **PASS** (1.84s).
- `lint`: **PASS** (5.47s).
- `unit`: **PASS** (2.41s).
- `game-data-structure`: **PASS** (0.15s).
- `database-integration`: **PASS** (4.34s).
- `build`: **PASS** (4.87s).
- `browser`: **PASS** (86.72s).
- `dependencies`: **PASS** (0.57s).
- `live-regions`: **PASS** (0.41s).

## Major problems and security findings

BUG_TRACKER.md records individually described findings, including reproduced fixed data/calculation/DB/accessibility/container defects and unresolved release gates. Existing authorization was retained and tested with separate users. Role/author spoofing is ignored, hostile text remains escaped, oversized JSON is rejected, concurrent version writes produce one success/one conflict, expired/logout sessions cannot export data and private responses are no-store. These are targeted checks, not a penetration-test guarantee.

Open: query/UI coupling, consistent recovery across remaining client mutations, moderation/anti-spam/monitoring/backups and missing core product phases. Actual OAuth, TLS cookies, legal/operator and field performance verification remain blocked.

## Rendered screenshots and accessibility

Baseline audit dark matrix: **84** route/viewport records; light matrix: **20**. Screenshots at375/768/1440/1920; overflow checks also320/430/1024. Final audit asserts no document overflow, browser errors or tagged axe violations in sampled states. It does not cover every content/state combination or establish WCAG conformance.

Actually reviewed: homepage375/768/1440/1920, market375, build-new375, settings375 and light-home1440; six final contact sheets cover all twelve implemented page types at375 and1440 (.qa/screenshots/review-375-0.png through review-1440-2.png). Raw evidence/screenshots are under .qa and ignored from source control; retain controlled artifacts separately. New milestone screenshots composition-editor-375.png, group-dashboard-375.png and production-375.png were also visually reviewed historically; the production result and forms remain within the mobile viewport. Personal-tool screenshot matrices at375/768/1440/1920 were reviewed in timers-review.png and dashboard-review.png; overflow checks also320/430/1024 and sampled axe assertions pass. Physical touch and screen-reader sessions are unverified.

## Current measured visual correction

The prior design was rejected; global visual acceptance remains open. Latest master-prompt sequencing prioritizes data foundations, Build Editor and Compositions. Build Editor has three inspected correction iterations; the composition board has three corrections plus a recapture after inspection caught a loading-skeleton capture defect. See docs/design-review/ for actual reference crops, screenshots, comparisons, discrepancies and remaining source gaps.

Current implementation uses real official-renderer item icons. Earlier expressly authorised generated homepage scenes remain disclosed provisional illustrations; they do NOT satisfy the latest genuine-game-scene criterion. No new generated scene or cropped concept art is introduced in this milestone. Full permitted metadata, consumables, ability artwork/unlocks, current game mechanics and remaining page corrections are incomplete.

Latest composition fixtures cover populated5/7/20-player states at1440/390/320, save/reload and1920×1080 PNG. Hidden streamed HTML is not sufficient capture evidence: the final test requires the actual title/roster to be visible. Existing large-party drag/keyboard/permission regressions remain required. Current all-page matrix includes176 dark/light states, but sampled checks are not WCAG certification or user acceptance.

Public release remains NO-GO. Homepage authentic media, real OAuth, legal/operator, complete calculators/data and deployment/operations remain unresolved. Historical functional passes are retained without promoting them to full-product acceptance.

## Performance

One standalone Lighthouse local simulated-mobile run: performance **100**, accessibility **100** on the 0–100 scale. LCP **1659.6851ms**, CLS **0**, TBT **48ms**. Measured on the baseline audit container, before these collaboration and production routes; no new-route performance claim. It is not a field percentile or multi-page performance audit. Exact Lighthouse version/config in .qa/lighthouse-home.json.

Local 20-sample API measurements: /api/health: warm p95 3.26ms, first request 24.45ms; /api/market: warm p95 1.85ms, first request 54.42ms. Exact sample definition in .qa/api-timings.json. Warm <500ms is a local regression target, not a public SLA. Field p75 and INP remain BLOCKED. The web-perf skill at /home/bttw/.agents/skills/web-perf/SKILL.md requires Chrome DevTools MCP; no such tools are configured, so that trace workflow was blocked. Standalone Lighthouse is separate evidence.

## Recommended improvements

Prioritize real OAuth/legal gates; complete equipment/ability coverage and remaining guild workflows; broader sourced recipes and calculators; moderation; action failures/dependencies/monitoring/backups; real TLS and manual accessibility. Full recommendations in PRODUCT_IMPROVEMENTS.md.

## Continuous quality / verdict

Run npm run qa:phase after every major phase, inspect new screenshots, review docs/qa-inventory.json and regenerate reports with python3 scripts/qa-reports.py. Relevant infrastructure/UI changes also require Docker/Lighthouse checks. The current container rebuild is BLOCKED by Docker socket permissions and fresh Lighthouse is BLOCKED by server bind permissions; historical measurements remain historical. See .qa/reference-extra-gates.json for current supplementary evidence. The gate retains failed/BLOCKED results and never auto-upgrades NO-GO. No public deployment recommended.

## Current development audit — 2026-10-26

Master-prompt milestone: stricter catalog integrity, bounded merged item search, source-zero/missing-timestamp handling and pending-refresh/manual-edit preservation implemented; measured build/composition/market/calculator/guild corrections, wide PNG export with bounded artwork delivery and a locally prepared pinned-action CI workflow added. Full metadata/recipes, authentic scene/ability sources, visual acceptance and production gates remain incomplete. Engineering scope and calculator gaps: docs/engineering/. Release-blocker checkpoint: direct DB EPERM isolated; additive watchlist migration passes13 disposable DB checks but remains unapplied to the existing app DB. Repository data audit181 equipment/221 combined IDs, zero current-patch verification. Manual trade thresholds/private scenarios and rolled-back serialization recovery added. Real OAuth/HTTPS setup is documented, not executed. See docs/engineering/RELEASE_BLOCKERS.md. Latest command evidence above controls test status; no full-product or competitor-parity claim. Failed second-gate logs are retained in .qa/foundations/second-gate-failed.

## Live GitHub provisioning — 2026-10-26

AlbionOutpost/outpost and outpost-operations are private and empty. Organization/repository policies, selected-repository Actions with SHA-pinned checkout/setup-node only, read-only token defaults, fork isolation,14-day retention and Dependabot alerts/security fixes passed real API read-back. Ten fixture tests cover provisioning safety and API constraints. MFA and owner-only visibility/deletion/outsider invitations require website settings; private branch rules are blocked by the Free plan. No code upload, hosted CI, paid upgrade, full-history secret scan or deployment. See docs/deployment/GITHUB_SETUP.md and local .qa/github-live/provisioning.json. Final Node22 local phase: all ten gates PASS,127 unit/53 production browser/15 disposable DB checks; homepage screenshots inspected at375/768/1440/1920 without UI changes or acceptance upgrade. Local results do not establish hosted CI. Release NO-GO.

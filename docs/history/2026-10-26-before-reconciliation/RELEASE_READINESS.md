# Release readiness

**NO-GO for public release. Overall evidence-coverage score: 76.22/100.**

## Score methodology

PASS earns1; FAIL/BLOCKED/NOT IMPLEMENTED earn0; NOT APPLICABLE is excluded. Requirements are equally weighted within their assigned category in docs/qa-inventory.json. Category weights are the requested product weights. This is a checklist coverage index, not a probability of safety or a certification; numerous small checks can overstate product completeness. Essential gates always override the score.

| Category                             | Weight | Verified/applicable |     Score |
| ------------------------------------ | -----: | ------------------: | --------: |
| Core functionality                   |    25% |             113/151 | 74.83/100 |
| Albion data and calculation accuracy |    20% |               57/85 | 67.06/100 |
| Security and authorization           |    20% |               46/58 | 79.31/100 |
| UI/UX quality                        |    15% |               50/60 | 83.33/100 |
| Performance and responsiveness       |    10% |               29/35 | 82.86/100 |
| Code quality and maintainability     |     5% |               62/71 | 87.32/100 |
| Deployment and operations            |     5% |               21/34 | 61.76/100 |

Weighted total = sum(category score × weight /100) = **76.22**.

## Release blockers

- No P0 was reproduced in the scoped checks; absence of all possible vulnerabilities is not certified.
- Open P1 capability gaps: full composition/build item and spell catalog, remaining guild assets/custom-permission workflows, most economy calculators and remaining moderation hardening.
- Actual Discord OAuth exchange, redirect/state and repeated-account handling remain BLOCKED by absent credentials. Database sessions cannot close that gate.
- Operator details, qualified privacy/legal review, retention and vendor disclosures remain incomplete.
- Journeys B/C/D/E have blocked or missing steps. Journey A has an automated complete regression with fixture responses plus separate live source comparisons.

## Latest automated gate

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

See raw logs for any FAIL; successful subsets must not conceal an overall failing command. Targeted ownership, privacy, origin/CSRF, concurrent version, expiry/logout, hostile-text, source/cache and migration tests have evidence. These are scoped checks, not full product certification.

## Missing verification

Current supplementary checks: Docker rebuild BLOCKED by socket permissions; fresh Lighthouse BLOCKED by standalone server bind EPERM. See `.qa/reference-extra-gates.json`. Historical artifacts do not close current checks.

Real HTTPS/Secure-cookie deployment; actual OAuth; screen-reader sessions; physical devices; field p75 LCP/INP; production-scale load; scheduled encrypted backups/alerts; compatible-schema rollback rehearsal. Chrome DevTools MCP is unavailable; standalone Lighthouse is separate lab evidence.

## Recommendation

Continue local development or protected staging. Do not recommend general public operation as the complete requested platform. Run npm run qa:phase after every major phase, review updated screenshots/checklist, and rerun Docker/Lighthouse after relevant changes. Automated test success must never automatically upgrade NO-GO to GO.

## Current development audit — 2026-10-26

Master-prompt milestone: stricter catalog integrity, bounded merged item search, source-zero/missing-timestamp handling and pending-refresh/manual-edit preservation implemented; measured build/composition/market/calculator/guild corrections, wide PNG export with bounded artwork delivery and a locally prepared pinned-action CI workflow added. Full metadata/recipes, authentic scene/ability sources, visual acceptance and production gates remain incomplete. Engineering scope and calculator gaps: docs/engineering/. Release-blocker checkpoint: direct DB EPERM isolated; additive watchlist migration passes13 disposable DB checks but remains unapplied to the existing app DB. Repository data audit181 equipment/221 combined IDs, zero current-patch verification. Manual trade thresholds/private scenarios and rolled-back serialization recovery added. Real OAuth/HTTPS setup is documented, not executed. See docs/engineering/RELEASE_BLOCKERS.md. Latest command evidence above controls test status; no full-product or competitor-parity claim. Failed second-gate logs are retained in .qa/foundations/second-gate-failed.

## Live GitHub provisioning — 2026-10-26

AlbionOutpost/outpost and outpost-operations are private and empty. Organization/repository policies, selected-repository Actions with SHA-pinned checkout/setup-node only, read-only token defaults, fork isolation,14-day retention and Dependabot alerts/security fixes passed real API read-back. Ten fixture tests cover provisioning safety and API constraints. MFA and owner-only visibility/deletion/outsider invitations require website settings; private branch rules are blocked by the Free plan. No code upload, hosted CI, paid upgrade, full-history secret scan or deployment. See docs/deployment/GITHUB_SETUP.md and local .qa/github-live/provisioning.json. Final Node22 local phase: all ten gates PASS,127 unit/53 production browser/15 disposable DB checks; homepage screenshots inspected at375/768/1440/1920 without UI changes or acceptance upgrade. Local results do not establish hosted CI. Release NO-GO.

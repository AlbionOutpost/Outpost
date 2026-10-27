# Documentation ownership and scoring

## Authoritative documents

| Question                                         | Authority                                                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| What works and what remains partial?             | [IMPLEMENTATION_STATUS.md](../IMPLEMENTATION_STATUS.md), generated from current acceptance scopes       |
| What was tested, when and with which limits?     | [QA_REPORT.md](../QA_REPORT.md) and [qa-evidence.json](qa-evidence.json)                                |
| What blocks release?                             | [RELEASE_READINESS.md](../RELEASE_READINESS.md), using [release-gate references](qa-release-gates.json) |
| What should be implemented next?                 | [PROJECT_PLAN.md](../PROJECT_PLAN.md)                                                                   |
| What are current or resolved findings?           | [BUG_TRACKER.md](../BUG_TRACKER.md), from [defect records](qa-bugs.json)                                |
| What sources/formulas/rights are actually known? | [DATA_SOURCES.md](../DATA_SOURCES.md)                                                                   |
| What is historical?                              | [Development log](DEVELOPMENT_PROGRESS.md) and [immutable original snapshots](history/README.md)        |

[QA_CHECKLIST.md](../QA_CHECKLIST.md) is the complete current acceptance view of [qa-inventory.json](qa-inventory.json). Engineering runbooks describe mechanisms and evidence boundaries; they link to current results and gates instead of repeating a release paragraph. Per-page design reviews link preserved iteration evidence and state the remaining acceptance.

## Rebuild specification

[Rebuild handoff](rebuild/README.md) and its generated [single-file handbook](rebuild/HANDBOOK.md) describe the complete implemented application. Domain chapters are maintained prose; `node scripts/rebuild-inventory.mjs` derives inventory/schema/reference/handbook outputs from source. `--check` detects drift and is part of hosted quality checks. This specification supplements executable source and the existing status authorities; it does not replace current QA/release/source-rights evidence or contain private credentials/data.

## Independent status dimensions

Implementation: COMPLETE for the declared scope; PARTIAL where supported behavior exists with material remaining scope; MISSING (displayed NOT IMPLEMENTED) where the operational feature is absent; NOT APPLICABLE only with a recorded rationale.

Verification: VERIFIED for the explicitly stated supported scope and referenced execution; PARTIALLY TESTED for narrower evidence; FAILED for an observed unmet check; BLOCKED for unavailable external inputs/permission/decision; NOT TESTED where execution was not performed. FAILED can be displayed as FAILING in an overall workflow discussion. BLOCKED and FAILED describe verification, not the amount of implementation.

A starter calculator can be PARTIAL / VERIFIED. Full current-patch data can be MISSING / BLOCKED. A configured provider can be PARTIAL / BLOCKED. A passing lint command can coexist with a FAILED dependency-support check. No pair implies complete product acceptance.

## Coverage rubric

Weights are fixed once: core25%, data20%, security20%, UI15%, performance10%, code5%, operations5%. Every scored scope belongs to exactly one of these categories. The former unweighted correctness category is merged into data/accounting or the corresponding functional scope.

Within a category each current acceptance scope has equal weight. COMPLETE=1, PARTIAL=0.5, MISSING=0. VERIFIED=1, PARTIALLY TESTED=0.5, FAILED/BLOCKED/NOT TESTED=0. NOT APPLICABLE is excluded with a reason. The joint credit is implementation coefficient multiplied by verification coefficient; PARTIAL / VERIFIED earns0.5, PARTIAL / PARTIALLY TESTED earns0.25. Separate implementation and verification indices are also shown. Calculate category means at full precision, apply category weights once and round the final result to two decimals.

The half-credit rule is a transparent rubric, not an estimate that half the work is finished. Scope decomposition is a human review decision and can affect the index. It is not a percentage of the original specification, an independent audit, a safety probability or a like-for-like continuation of the old PASS-count score. More minor checks must not be added merely to raise scores: tests reference existing acceptance scopes; process/report-existence checks and historical milestones are unscored. All legacy IDs remain mapped in [qa-legacy-map.json](qa-legacy-map.json).

Essential release gates override every numerical result. A gate requires COMPLETE and VERIFIED for its declared acceptance; current gates remain open. The report generator never emits automatic GO: even with no open gates, it can only request owner review. Subjective design, source rights and legal quality remain human decisions.

## Evidence and regeneration

Run the full Node22 phase gate and inspect appropriate captures first. Then:

```bash
npm run data:audit
node scripts/qa-source-secrets.mjs
node scripts/qa-secret-scan.mjs
python3 scripts/qa-reports.py --refresh-evidence
python3 scripts/qa-reports.py --check
python3 scripts/docs-validate.py --require-local-evidence
python3 scripts/test-docs-validation.py
npm run format:check
```

The refresh parses actual unit/browser/database/live counts, phase timestamps and statuses. It captures source/artifact hashes and bounded reviewed migration/remote/visual metadata; it does not modify reviewed implementation statuses or invent patch/legal/design evidence. The seven generated outputs are implementation status, the five root QA reports and qa-score.json. Edit inventory/defect/gate inputs, then regenerate; do not hand-edit generated counts/tables.

The deterministic report stamp binds the input fingerprints and evidence-run timestamp. Validation checks generated freshness, source drift, seven-day evidence age, IDs, weighted categories, conflicting structured statuses, evidence existence, Markdown links/anchors, path references, active obsolete branding and immutable archive hashes. Default validation warns when ignored local artifacts are absent in a fresh checkout; `--require-local-evidence` makes that absence a failure. The committed snapshot records results but is not a substitute for reexecution.

Current Markdown/source branding is Outpost. Historical logs/snapshots retain the old product name when necessary. Cookies/cache keys, npm identity, database/migration identifiers, export filenames/formats calendar PRODID/UID and the immutable starter-release version/provenance text are intentionally preserved pending compatibility assessment. QA fixture names are not user-facing product copy.

Validation cannot understand every prose contradiction, verify an external URL's truth, authenticate an image, certify legal rights or prove accessibility/security. Those limitations are explicit. [Correction summary and unresolved uncertainty](DOCUMENTATION_CORRECTIONS.md).

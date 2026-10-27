---
name: outpost-release
description: Review Outpost release readiness, migrations, CI/CD, Git operations, repository cleanup, deployment configuration and deployment decisions. Produce evidence-based GO/NO-GO without treating review as authorization to publish or deploy.
---

# Outpost release engineering

Read [RELEASE_READINESS](../../../RELEASE_READINESS.md), [QA_REPORT](../../../QA_REPORT.md), [QA_CHECKLIST](../../../QA_CHECKLIST.md), [BUG_TRACKER](../../../BUG_TRACKER.md), [IMPLEMENTATION_STATUS](../../../IMPLEMENTATION_STATUS.md) and [PROJECT_PLAN](../../../PROJECT_PLAN.md). Follow the [shared execution/report contract](../../../docs/engineering/SKILL_SYSTEM.md), [QA workflow](../../../docs/QA_WORKFLOW.md) and [documentation authority](../../../docs/DOCUMENTATION.md).

## Review and prepare

1. Inspect Git status/diffs and preserve unrelated changes/history. If metadata is unavailable, report repository/history verification BLOCKED; do not initialize a replacement repository. Read [repository readiness](../../../docs/engineering/REPOSITORY_READINESS.md), [deployment](../../../docs/DEPLOYMENT.md), [migration](../../../docs/deployment/MIGRATIONS.md) and applicable CI/config files.
2. Review dead code/callers, unused dependencies, ignored files, Docker context, environment template names, CI workflows, additive migration history, attribution and code/media licensing. Scan configured secret values/patterns using existing scanners without printing values. A source/artifact scan does not cover Git history or unknown credentials.
3. Match evidence to exact current code/build/config and timestamp. Check actual command exit/results, stale/missing artifacts and independent implementation/verification statuses. Preserve failed/blocked/not-tested scope; an older pass is not a current run.
4. Run npm run qa:phase with Node22/local services and all required postchecks. Inspect relevant rendered desktop/mobile captures. Rerun formulas, authorization, cache and disposable migrations after related changes. Runtime/UI/deployment changes also need applicable current container/Lighthouse evidence. Never hide a failed command behind passing counts.
5. Update reviewed inventory/defects/gates only from evidence, then regenerate all five root QA reports and implementation status using existing qa-reports.py. Preserve NO-GO and score rubric. If evidence refresh fails, document its actual failure; do not fabricate missing logs or hand-patch generated scores/tables.

## Essential release gates

Use RELEASE_READINESS as the authoritative blocker list. Keep at least these unresolved when evidence is missing: real Discord login/logout/expiry on owned HTTPS, Secure/HttpOnly/SameSite cookies, current-patch permitted data, accurate essential calculators, server permissions/private caches, intended watchlist migration/workflow, operator/legal disclosures and media rights, critical security defects, hosted CI and owned deployment rollback/backup/restore/monitoring.

Review migrations on disposable owned databases with constraints and backup/restore read-back. Preserve existing data; do not reset/apply destructive production changes. A repository migration file is not proof of deployment. Local backups are not production restore evidence.

Discover available GitHub integration schemas or use gh when authorized; inspect real responses. Review and read-only evidence do not authorize publishing, external messages or deployment. Do not force-push, rewrite history, publish repositories or expose secrets. Prepare a concrete reviewable artifact before seeking any genuinely required final authorization. Browser MCP instructions and labelled fallback follow the shared contract; registration alone proves nothing.

## Acceptance and report

A review is complete when evidence is assessed and missing gates are explicit; production is GO only when every essential requirement has actual evidence and required operator decisions. Never manipulate quality scores or imply full conformance/security from audits. Preserve supported workflows, migrations, fixtures and history throughout routine cleanup.

Report **scope/build/environment → actual command/status evidence → implementation and data verification coverage → security/performance/visual limits → remaining blockers with next action → GO/NO-GO verdict**. State whether any deployment was performed. Update project progress and [skill maintenance](../../../docs/engineering/SKILL_SYSTEM.md) after meaningful milestones; continue independent authorized work when one gate is blocked.

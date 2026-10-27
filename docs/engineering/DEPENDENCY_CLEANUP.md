# Dependency maintenance

No application dependency or lockfile was changed in this documentation audit. Installed package facts are in [STACK_AUDIT.md](STACK_AUDIT.md); actual phase advisory results are in [QA_REPORT.md](../../QA_REPORT.md).

The npm registry recheck of ESLint9.39.5 returns “This version is no longer supported.” The local lint gate passes; maintenance support and execution correctness are different checks. A supported major upgrade still needs compatibility proof against the installed Next lint plugins. No forced peer override or automatic audit fix was applied. Evidence is preserved in [the machine snapshot](../qa-evidence.json).

Optional extraneous image-runtime packages were observed historically; complete import/runtime/platform analysis and fresh-checkout reproducibility remain unverified. No package is deleted based only on an import scan or a clean advisory response. [Current finding QA-014](../../BUG_TRACKER.md); [historical review](../history/2026-10-26-before-reconciliation/docs/engineering/DEPENDENCY_CLEANUP.md).

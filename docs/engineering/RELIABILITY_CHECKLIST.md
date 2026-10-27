# Reliability acceptance

| Scope                                            | Implementation               | Verification boundary                                                                             |
| ------------------------------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------- |
| Disposable migrations/constraints/backup/restore | Complete supported QA helper | Latest local results in QA_REPORT.md; not production recovery                                     |
| Source/cache/error resilience                    | Implemented safeguards       | Unit/browser failure fixtures; no sustained distributed failover drill                            |
| Standalone/nonroot image                         | Foundation implemented       | Current standalone build and fresh local nonroot Docker smoke tested; hosted operation unverified |
| Application watchlist migration                  | Prepared, unapplied          | Current read-only DB state confirms table absent; connectivity now succeeds                       |
| Health and structured logs                       | Local foundation             | No deployed alerts/incident exercise                                                              |
| Scheduled encrypted backups/retention            | Incomplete                   | No operational schedule/restore evidence                                                          |
| Deployment rollback                              | Runbook prepared             | No owned staging rehearsal                                                                        |

[Executed results](../../QA_REPORT.md), [release gates](../../RELEASE_READINESS.md), [deployment](../DEPLOYMENT.md) and [migration instructions](../deployment/MIGRATIONS.md) are authoritative. Older EPERM/P1001 socket failures are preserved historical attempts, not evidence of current failed connectivity. Historical artwork/cache and fixture regressions are retained in [the original checklist](../history/2026-10-26-before-reconciliation/docs/engineering/RELIABILITY_CHECKLIST.md).

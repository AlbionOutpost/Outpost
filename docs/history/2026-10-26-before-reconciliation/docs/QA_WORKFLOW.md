# Major-phase QA gate

After **every major development phase**, run Node22 with local PostgreSQL/Redis:

```bash
npm run qa:phase
```

This runs types, lint, unit tests, disposable database migrations/constraints/backup/restore, production build, production Playwright including responsive/axe/security regressions, advisories and bounded live regional checks. Logs and PASS/FAIL/BLOCKED results are retained under `.qa`. Browser checks are BLOCKED if the build fails rather than accepting stale binaries. Fix failures and rerun affected/regression tests.

Database integration creates/drops only owned fresh `atlas_qa_*` and `atlas_restore_*` databases. Do not redirect these tests to production. Browser fixtures require a loopback database. No HTTP fixture/mock-login endpoints are shipped.

Inspect375/768/1440/1920 screenshots after UI work, plus320/430/1024 overflow checks. Axe assertions cover sampled states, not full conformance. Build/smoke Docker and rerun Lighthouse after relevant infrastructure/UI changes. Store artifacts securely; never upload secrets or production backups.

Review/update `docs/qa-inventory.json`; run `python3 scripts/qa-reports.py` and formatter; update the five root QA reports and existing progress files. New FAIL/BLOCKED/NOT IMPLEMENTED evidence must update inventory before generation. Automation never certifies real OAuth, legal review, HTTPS cookies, field vitals or missing product workflows and never upgrades NO-GO automatically.

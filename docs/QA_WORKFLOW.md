# Major-phase QA and documentation workflow

Run Node22 with local PostgreSQL/Redis after every major phase:

```bash
npm run qa:phase
```

The unchanged runner records types, lint, unit tests, game-data structural audit, disposable database migrations/constraints/backup/restore, production build/browser tests, dependency advisories and bounded regional reads. Raw PASS/FAIL/BLOCKED logs remain under ignored `.qa`. A failed build blocks browser execution; partial passing counts never conceal a failed command.

Review relevant functional source/tests, current inventory and actual captures before changing status. For visual changes inspect375/768/1440/1920 captures and additional narrow overflow checks. A documentation-only phase still inspects representative regression captures without inventing new visual acceptance. Related formula, authorization, cache and migration changes require their regressions. Relevant runtime/image/UI changes also require current Docker/Lighthouse evidence; older permission failures do not certify the present environment.

Database QA creates/drops only owned fresh `atlas_qa_*` and `atlas_restore_*` databases. It does not apply pending migrations to an existing user database. Fixtures create isolated database sessions; they are not Discord OAuth. Never upload secrets, sessions, private backups or QA user records.

Then run:

```bash
npm run data:audit
node scripts/qa-source-secrets.mjs
node scripts/qa-secret-scan.mjs
python3 scripts/test-docs-validation.py
python3 scripts/qa-reports.py --refresh-evidence
python3 scripts/qa-reports.py --check
python3 scripts/docs-validate.py --require-local-evidence
npm run format:check
```

The refresh requires actual phase logs plus the reviewed migration/remote/dependency/visual evidence listed in [qa-evidence.json](qa-evidence.json). Preserve these local records or deliberately obtain fresh read-only evidence; do not fabricate files to pass validation. A fresh checkout can run `python3 scripts/docs-validate.py` to check recorded portable reports with warnings for unavailable ignored artifacts; strict phase verification requires those artifacts. Refresh cannot automatically promote game-patch, operator/legal, real OAuth or subjective visual acceptance.

Edit [qa-inventory.json](qa-inventory.json), [qa-bugs.json](qa-bugs.json) and [qa-release-gates.json](qa-release-gates.json), then regenerate. Generated counts/status tables must not be manually patched. Update the human [project plan](../PROJECT_PLAN.md), supporting runbooks and dated [development log](DEVELOPMENT_PROGRESS.md) only where facts change. [Documentation contract and scoring](DOCUMENTATION.md) define authority, independent statuses and validator limitations. Automation never changes NO-GO to GO.

The reviewed pixel regressions live in `e2e/premium-visual.spec.ts-snapshots` and run with the ordinary production browser suite. Update only deliberate changed baselines with `E2E_PRODUCTION=1 npx playwright test e2e/premium-visual.spec.ts --update-snapshots`, inspect each changed image, then rerun without updating. Renderer pixels are masked only in these deterministic goldens; actual equipment artwork must also be inspected in unmasked review captures. Keep the production capture server stopped during builds, restart it afterward, and do not run loading benchmarks alongside browser suites/builds.
